// cspell:ignore cdtf
use std::collections::HashMap;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::{Cursor, Read, Write};
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::UNIX_EPOCH;

use serde::{Deserialize, Serialize};
use tauri::webview::PageLoadEvent;
use tauri::Manager;
use tauri_plugin_dialog::{DialogExt, FilePath};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_opener::OpenerExt;
use xmltree::{Element, XMLNode};
use zip::{write::SimpleFileOptions, ZipArchive, ZipWriter};

pub mod configuration;
pub mod documents;
pub mod export;

use configuration::Configuration;

use documents::{BatchSaveRequestItem, BatchSaveResultItem, DocumentMetadata};
use documents::image::model::ImageExif;

#[derive(Debug, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct BatchClearOptions {
    template_id: Option<String>,
    metadata_overrides: Option<DocumentMetadataOverrides>,
}

#[derive(Debug, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct DocumentMetadataOverrides {
    document_properties: Option<DocumentPropertiesOverrides>,
    core_properties: Option<CorePropertiesOverrides>,
    app_properties: Option<AppPropertiesOverrides>,
}

#[derive(Debug, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct DocumentPropertiesOverrides {
    title: Option<String>,
    subject: Option<String>,
    creator: Option<String>,
    keywords: Option<String>,
    description: Option<String>,
    last_modified_by: Option<String>,
    revision: Option<String>,
    created: Option<String>,
    modified: Option<String>,
    category: Option<String>,
    content_status: Option<String>,
    version: Option<String>,
    language: Option<String>,
    identifier: Option<String>,
    source: Option<String>,
}

#[derive(Debug, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct CorePropertiesOverrides {
    dc_title: Option<String>,
    dc_subject: Option<String>,
    dc_creator: Option<String>,
    dc_description: Option<String>,
    dc_keywords: Option<String>,
    dc_language: Option<String>,
    dc_identifier: Option<String>,
    dc_source: Option<String>,
}

#[derive(Debug, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
struct AppPropertiesOverrides {
    application: Option<String>,
    app_version: Option<String>,
    company: Option<String>,
    manager: Option<String>,
    template: Option<String>,
    total_time: Option<String>,
    pages: Option<u32>,
    words: Option<u32>,
    characters: Option<u32>,
    characters_with_spaces: Option<u32>,
    paragraphs: Option<u32>,
    lines: Option<u32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DirectoryScanOptions {
    recursive: bool,
    extensions: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectoryInfo {
    path: String,
    name: String,
    extension: String,
    size: u64,
    modified_at: u64,
    selected: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DirectoryScanResult {
    path: String,
    files: Vec<DirectoryInfo>,
    total_found: usize,
    scanned_at: u64,
}

#[derive(Debug, Clone)]
struct AutomationRequestState {
    file_paths: Vec<String>,
    source: String,
    status: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AutomationRequestStatus {
    request_id: String,
    source: String,
    status: String,
    file_paths: Vec<String>,
}

#[derive(Debug, Default)]
struct AutomationRequestRegistry {
    requests: HashMap<String, AutomationRequestState>,
    file_to_request: HashMap<String, String>,
}

static AUTOMATION_REQUEST_REGISTRY: OnceLock<Mutex<AutomationRequestRegistry>> = OnceLock::new();

fn automation_registry() -> &'static Mutex<AutomationRequestRegistry> {
    AUTOMATION_REQUEST_REGISTRY.get_or_init(|| Mutex::new(AutomationRequestRegistry::default()))
}

fn normalize_file_path_for_request(path: &str) -> Option<String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return None;
    }
    Some(PathBuf::from(trimmed).to_string_lossy().to_string())
}

fn create_request_id_by_paths(source: &str, file_paths: &[String]) -> String {
    let mut normalized = file_paths.to_vec();
    normalized.sort();

    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    source.hash(&mut hasher);
    normalized.iter().for_each(|path| path.hash(&mut hasher));
    format!("req_{:016x}", hasher.finish())
}

fn validate_request_for_paths(
    request_id: Option<&str>,
    file_paths: &[String],
) -> Result<(), String> {
    let Some(request_id) = request_id else {
        return Ok(());
    };

    let registry = automation_registry()
        .lock()
        .map_err(|_| "任务注册表被锁定".to_string())?;

    let request = registry
        .requests
        .get(request_id)
        .ok_or_else(|| format!("requestId 不存在: {}", request_id))?;

    if request.status != "running" {
        return Err(format!(
            "requestId {} 状态为 {}，无法继续",
            request_id, request.status
        ));
    }

    for file_path in file_paths {
        let Some(normalized) = normalize_file_path_for_request(file_path) else {
            return Err("存在空文件路径".to_string());
        };

        if !request.file_paths.contains(&normalized) {
            return Err(format!("文件不属于该任务: {}", normalized));
        }

        let occupied = registry
            .file_to_request
            .get(&normalized)
            .ok_or_else(|| format!("文件未被任务锁定: {}", normalized))?;

        if occupied != request_id {
            return Err(format!("文件由其他任务占用: {}", normalized));
        }
    }

    Ok(())
}

#[tauri::command]
fn create_automation_request(file_paths: Vec<String>, source: String) -> Result<String, String> {
    let source = source.trim().to_string();
    if source.is_empty() {
        return Err("source 为必填参数".to_string());
    }

    let mut normalized_paths = file_paths
        .iter()
        .filter_map(|path| normalize_file_path_for_request(path))
        .collect::<Vec<_>>();
    normalized_paths.sort();
    normalized_paths.dedup();

    if normalized_paths.is_empty() {
        return Err("filePaths 不能为空".to_string());
    }

    let request_id = create_request_id_by_paths(&source, &normalized_paths);
    let mut registry = automation_registry()
        .lock()
        .map_err(|_| "任务注册表被锁定".to_string())?;

    if let Some(existing) = registry.requests.get(&request_id) {
        if existing.status == "running" {
            return Err(format!(
                "请求 {} 正在执行中。请先 cancel 或等待完成",
                request_id
            ));
        }
    }

    let conflict = normalized_paths.iter().find_map(|path| {
        registry
            .file_to_request
            .get(path)
            .map(|rid| (path.clone(), rid.clone()))
    });

    if let Some((path, running_request)) = conflict {
        return Err(format!(
            "文件已被任务占用: {} (requestId: {})。请先取消或等待完成",
            path, running_request
        ));
    }

    normalized_paths.iter().for_each(|path| {
        registry
            .file_to_request
            .insert(path.clone(), request_id.clone());
    });

    registry.requests.insert(
        request_id.clone(),
        AutomationRequestState {
            file_paths: normalized_paths,
            source,
            status: "running".to_string(),
        },
    );

    Ok(request_id)
}

#[tauri::command]
fn cancel_automation_request(request_id: String) -> Result<(), String> {
    let mut registry = automation_registry()
        .lock()
        .map_err(|_| "任务注册表被锁定".to_string())?;

    let Some(existing) = registry.requests.get_mut(&request_id) else {
        return Err(format!("requestId 不存在: {}", request_id));
    };

    let file_paths = existing.file_paths.clone();
    existing.status = "cancelled".to_string();

    file_paths.into_iter().for_each(|path| {
        if registry
            .file_to_request
            .get(&path)
            .map(|rid| rid == &request_id)
            .unwrap_or(false)
        {
            registry.file_to_request.remove(&path);
        }
    });

    Ok(())
}

#[tauri::command]
fn finish_automation_request(request_id: String, status: String) -> Result<(), String> {
    let mut registry = automation_registry()
        .lock()
        .map_err(|_| "任务注册表被锁定".to_string())?;

    let Some(existing) = registry.requests.get_mut(&request_id) else {
        return Err(format!("requestId 不存在: {}", request_id));
    };

    let next_status = match status.as_str() {
        "completed" | "failed" | "cancelled" => status,
        _ => "failed".to_string(),
    };
    let file_paths = existing.file_paths.clone();
    existing.status = next_status;

    file_paths.into_iter().for_each(|path| {
        if registry
            .file_to_request
            .get(&path)
            .map(|rid| rid == &request_id)
            .unwrap_or(false)
        {
            registry.file_to_request.remove(&path);
        }
    });

    Ok(())
}

#[tauri::command]
fn get_automation_request_status(request_id: String) -> Result<AutomationRequestStatus, String> {
    let registry = automation_registry()
        .lock()
        .map_err(|_| "任务注册表被锁定".to_string())?;

    let state = registry
        .requests
        .get(&request_id)
        .ok_or_else(|| format!("requestId 不存在: {}", request_id))?;

    Ok(AutomationRequestStatus {
        request_id,
        source: state.source.clone(),
        status: state.status.clone(),
        file_paths: state.file_paths.clone(),
    })
}

#[tauri::command]
fn scan_directory(
    path: String,
    options: DirectoryScanOptions,
) -> Result<DirectoryScanResult, String> {
    let root = PathBuf::from(&path);
    if !root.exists() {
        return Err(format!("目录不存在: {}", path));
    }
    if !root.is_dir() {
        return Err(format!("不是有效目录: {}", path));
    }

    let mut files = Vec::new();
    let mut queue = vec![root.clone()];
    let extension_filter: Option<Vec<String>> = options.extensions.map(|exts| {
        exts.into_iter()
            .map(|ext| ext.trim_start_matches('.').to_ascii_lowercase())
            .collect()
    });

    while let Some(dir) = queue.pop() {
        let entries = fs::read_dir(&dir).map_err(|err| format!("读取目录失败: {}", err))?;
        for entry in entries.flatten() {
            let entry_path = entry.path();
            if entry_path.is_dir() {
                if options.recursive {
                    queue.push(entry_path);
                }
                continue;
            }

            let extension = entry_path
                .extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.to_ascii_lowercase())
                .unwrap_or_default();

            if extension.is_empty() {
                continue;
            }

            let is_allowed = extension_filter
                .as_ref()
                .map(|filters| filters.contains(&extension))
                .unwrap_or_else(|| matches!(extension.as_str(), "doc" | "docx" | "xlsx" | "pdf"));

            if !is_allowed {
                continue;
            }

            let metadata =
                fs::metadata(&entry_path).map_err(|err| format!("读取文件信息失败: {}", err))?;
            let modified_at = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|duration| duration.as_millis() as u64)
                .unwrap_or(0);

            files.push(DirectoryInfo {
                path: entry_path.to_string_lossy().to_string(),
                name: entry.file_name().to_string_lossy().to_string(),
                extension,
                size: metadata.len(),
                modified_at,
                selected: false,
            });
        }
    }

    Ok(DirectoryScanResult {
        path,
        total_found: files.len(),
        files,
        scanned_at: std::time::SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis() as u64)
            .unwrap_or(0),
    })
}

#[tauri::command]
fn parse_docx_metadata_from_path(file_path: String) -> Result<DocumentMetadata, String> {
    documents::edit::docx::parse_metadata_from_path(file_path)
}

#[tauri::command]
fn parse_docx_metadata(
    file_name: String,
    file_size: u64,
    file_bytes: Vec<u8>,
) -> Result<DocumentMetadata, String> {
    documents::edit::docx::parse_ooxml_metadata(file_name, file_size, file_bytes)
}

#[tauri::command]
fn update_docx_metadata(
    file_bytes: Vec<u8>,
    metadata: DocumentMetadata,
) -> Result<Vec<u8>, String> {
    documents::edit::docx::build_updated_ooxml_bytes(file_bytes, &metadata)
}

#[tauri::command]
fn save_docx_metadata(
    app_handle: tauri::AppHandle,
    file_bytes: Vec<u8>,
    metadata: DocumentMetadata,
) -> Result<Option<String>, String> {
    let suggested_name = if metadata.file_name.trim().is_empty() {
        "document.docx".to_string()
    } else {
        metadata.file_name.clone()
    };

    let selected_path = app_handle
        .dialog()
        .file()
        .set_title("保存文档")
        .set_file_name(&suggested_name)
        .add_filter("Word 文档", &["docx"])
        .blocking_save_file()
        .and_then(documents::fs::convert_file_path_to_pathbuf);

    let Some(path) = selected_path else {
        return Ok(None);
    };

    let updated_file_bytes =
        documents::edit::docx::build_updated_ooxml_bytes(file_bytes, &metadata)?;
    std::fs::write(&path, updated_file_bytes).map_err(|err| err.to_string())?;

    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn save_docx_metadata_to_source(
    file_path: String,
    metadata: DocumentMetadata,
    request_id: Option<String>,
) -> Result<String, String> {
    validate_request_for_paths(request_id.as_deref(), std::slice::from_ref(&file_path))?;
    documents::edit::docx::save_docx_metadata_to_source(file_path, metadata)
}

#[tauri::command]
fn batch_save_docx_metadata_to_source(
    items: Vec<BatchSaveRequestItem>,
    request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    items
        .into_iter()
        .map(|item| {
            match save_docx_metadata_to_source(
                item.file_path.clone(),
                item.metadata,
                request_id.clone(),
            ) {
                Ok(path) => BatchSaveResultItem {
                    file_path: path,
                    success: true,
                    error: None,
                },
                Err(err) => BatchSaveResultItem {
                    file_path: item.file_path,
                    success: false,
                    error: Some(err),
                },
            }
        })
        .collect()
}

#[tauri::command]
fn save_docx_metadata_as(
    app_handle: tauri::AppHandle,
    file_path: String,
    metadata: DocumentMetadata,
) -> Result<Option<String>, String> {
    let source_path = PathBuf::from(&file_path);
    let source_file_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.docx");
    let suggested_name = if metadata.file_name.trim().is_empty() {
        source_file_name.to_string()
    } else {
        metadata.file_name.clone()
    };

    let selected_path = app_handle
        .dialog()
        .file()
        .set_title("另存为")
        .set_file_name(&suggested_name)
        .add_filter("Word 文档", &["docx"])
        .blocking_save_file()
        .and_then(documents::fs::convert_file_path_to_pathbuf);

    let Some(path) = selected_path else {
        return Ok(None);
    };

    let file_bytes = fs::read(&source_path).map_err(|err| err.to_string())?;
    let updated_file_bytes =
        documents::edit::docx::build_updated_ooxml_bytes(file_bytes, &metadata)?;
    fs::write(&path, updated_file_bytes).map_err(|err| err.to_string())?;

    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn batch_clear_and_save_docx_metadata(
    file_paths: Vec<String>,
    _options: Option<BatchClearOptions>,
    _request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    file_paths
        .into_iter()
        .map(
            |file_path| match documents::edit::docx::process_single_batch_clear(&file_path) {
                Ok(()) => BatchSaveResultItem {
                    file_path,
                    success: true,
                    error: None,
                },
                Err(err) => BatchSaveResultItem {
                    file_path,
                    success: false,
                    error: Some(err),
                },
            },
        )
        .collect()
}

#[tauri::command]
fn parse_xlsx_metadata_from_path(file_path: String) -> Result<DocumentMetadata, String> {
    documents::edit::xlsx::parse_metadata_from_path(file_path)
}

#[tauri::command]
fn save_xlsx_metadata_to_source(
    file_path: String,
    metadata: DocumentMetadata,
    request_id: Option<String>,
) -> Result<String, String> {
    validate_request_for_paths(request_id.as_deref(), std::slice::from_ref(&file_path))?;
    documents::edit::xlsx::write_metadata_to_path(&file_path, &metadata)?;
    Ok(file_path)
}

#[tauri::command]
fn batch_save_xlsx_metadata_to_source(
    items: Vec<BatchSaveRequestItem>,
    request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    items
        .into_iter()
        .map(|item| {
            match save_xlsx_metadata_to_source(
                item.file_path.clone(),
                item.metadata,
                request_id.clone(),
            ) {
                Ok(path) => BatchSaveResultItem {
                    file_path: path,
                    success: true,
                    error: None,
                },
                Err(err) => BatchSaveResultItem {
                    file_path: item.file_path,
                    success: false,
                    error: Some(err),
                },
            }
        })
        .collect()
}

#[tauri::command]
fn save_xlsx_metadata_as(
    app_handle: tauri::AppHandle,
    file_path: String,
    metadata: DocumentMetadata,
) -> Result<Option<String>, String> {
    let source_path = PathBuf::from(&file_path);
    let source_file_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("workbook.xlsx");
    let suggested_name = if metadata.file_name.trim().is_empty() {
        source_file_name.to_string()
    } else {
        metadata.file_name.clone()
    };

    let selected_path = app_handle
        .dialog()
        .file()
        .set_title("另存为")
        .set_file_name(&suggested_name)
        .add_filter("Excel 工作簿", &["xlsx"])
        .blocking_save_file()
        .and_then(documents::fs::convert_file_path_to_pathbuf);

    let Some(path) = selected_path else {
        return Ok(None);
    };

    let file_bytes = fs::read(&source_path).map_err(|err| err.to_string())?;
    let updated_file_bytes =
        documents::edit::docx::build_updated_ooxml_bytes(file_bytes, &metadata)?;
    fs::write(&path, updated_file_bytes).map_err(|err| err.to_string())?;

    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn batch_clear_and_save_xlsx_metadata(
    file_paths: Vec<String>,
    options: Option<BatchClearOptions>,
    request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    file_paths
        .into_iter()
        .map(
            |file_path| match documents::edit::xlsx::process_single_batch_clear(&file_path) {
                Ok(()) => BatchSaveResultItem {
                    file_path,
                    success: true,
                    error: None,
                },
                Err(err) => BatchSaveResultItem {
                    file_path,
                    success: false,
                    error: Some(err),
                },
            },
        )
        .collect()
}

#[tauri::command]
fn parse_pdf_metadata_from_path(file_path: String) -> Result<DocumentMetadata, String> {
    documents::edit::pdf::parse_metadata_from_path(file_path)
}

#[tauri::command]
fn save_pdf_metadata_to_source(
    file_path: String,
    metadata: DocumentMetadata,
    request_id: Option<String>,
) -> Result<String, String> {
    validate_request_for_paths(request_id.as_deref(), std::slice::from_ref(&file_path))?;
    documents::edit::pdf::write_metadata_to_path(&file_path, &metadata)?;
    Ok(file_path)
}

#[tauri::command]
fn batch_save_pdf_metadata_to_source(
    items: Vec<BatchSaveRequestItem>,
    request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    items
        .into_iter()
        .map(|item| {
            match save_pdf_metadata_to_source(
                item.file_path.clone(),
                item.metadata,
                request_id.clone(),
            ) {
                Ok(path) => BatchSaveResultItem {
                    file_path: path,
                    success: true,
                    error: None,
                },
                Err(err) => BatchSaveResultItem {
                    file_path: item.file_path,
                    success: false,
                    error: Some(err),
                },
            }
        })
        .collect()
}

#[tauri::command]
fn save_pdf_metadata_as(
    app_handle: tauri::AppHandle,
    file_path: String,
    metadata: DocumentMetadata,
) -> Result<Option<String>, String> {
    let source_path = PathBuf::from(&file_path);
    let source_file_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.pdf");
    let suggested_name = if metadata.file_name.trim().is_empty() {
        source_file_name.to_string()
    } else {
        metadata.file_name.clone()
    };

    let selected_path = app_handle
        .dialog()
        .file()
        .set_title("另存为")
        .set_file_name(&suggested_name)
        .add_filter("PDF 文档", &["pdf"])
        .blocking_save_file()
        .and_then(documents::fs::convert_file_path_to_pathbuf);

    let Some(path) = selected_path else {
        return Ok(None);
    };

    fs::copy(&source_path, &path).map_err(|err| err.to_string())?;
    save_pdf_metadata_to_source(path.to_string_lossy().to_string(), metadata, None)?;
    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn batch_clear_and_save_pdf_metadata(
    file_paths: Vec<String>,
    options: Option<BatchClearOptions>,
    request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    file_paths
        .into_iter()
        .map(|file_path| {
            if let Err(err) =
                validate_request_for_paths(request_id.as_deref(), std::slice::from_ref(&file_path))
            {
                return BatchSaveResultItem {
                    file_path,
                    success: false,
                    error: Some(err),
                };
            }

            let mut metadata = match parse_pdf_metadata_from_path(file_path.clone()) {
                Ok(value) => value,
                Err(err) => {
                    return BatchSaveResultItem {
                        file_path,
                        success: false,
                        error: Some(err),
                    }
                }
            };

            metadata.document_properties.title.clear();
            metadata.document_properties.subject.clear();
            metadata.document_properties.creator.clear();
            metadata.document_properties.keywords.clear();
            metadata.document_properties.description.clear();
            metadata.document_properties.last_modified_by.clear();

            match save_pdf_metadata_to_source(file_path.clone(), metadata, request_id.clone()) {
                Ok(path) => BatchSaveResultItem {
                    file_path: path,
                    success: true,
                    error: None,
                },
                Err(err) => BatchSaveResultItem {
                    file_path,
                    success: false,
                    error: Some(err),
                },
            }
        })
        .collect()
}

#[tauri::command]
fn parse_doc_metadata_from_path(file_path: String) -> Result<DocumentMetadata, String> {
    let path = PathBuf::from(&file_path);
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.doc")
        .to_string();
    let file_size = fs::metadata(&path).map_err(|err| err.to_string())?.len();
    let sidecar_path = format!("{}.metadata.json", file_path);

    let mut metadata = DocumentMetadata::defaults(file_name, file_size);
    metadata.file_type = "doc".to_string();
    metadata.app_properties.application = "Microsoft Word (Legacy)".to_string();

    if let Ok(content) = fs::read_to_string(&sidecar_path) {
        if let Ok(parsed) = serde_json::from_str::<DocumentMetadata>(&content) {
            metadata.document_properties = parsed.document_properties;
            metadata.core_properties = parsed.core_properties;
            metadata.app_properties.company = parsed.app_properties.company;
            metadata.app_properties.manager = parsed.app_properties.manager;
        }
    }

    Ok(metadata)
}

#[tauri::command]
fn save_doc_metadata_to_source(
    file_path: String,
    metadata: DocumentMetadata,
    request_id: Option<String>,
) -> Result<String, String> {
    validate_request_for_paths(request_id.as_deref(), std::slice::from_ref(&file_path))?;
    let sidecar_path = format!("{}.metadata.json", file_path);
    let content = serde_json::to_string_pretty(&metadata).map_err(|err| err.to_string())?;
    fs::write(sidecar_path, content).map_err(|err| err.to_string())?;
    Ok(file_path)
}

#[tauri::command]
fn batch_save_doc_metadata_to_source(
    items: Vec<BatchSaveRequestItem>,
    request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    items
        .into_iter()
        .map(|item| {
            match save_doc_metadata_to_source(
                item.file_path.clone(),
                item.metadata,
                request_id.clone(),
            ) {
                Ok(path) => BatchSaveResultItem {
                    file_path: path,
                    success: true,
                    error: None,
                },
                Err(err) => BatchSaveResultItem {
                    file_path: item.file_path,
                    success: false,
                    error: Some(err),
                },
            }
        })
        .collect()
}

#[tauri::command]
fn save_doc_metadata_as(
    app_handle: tauri::AppHandle,
    file_path: String,
    metadata: DocumentMetadata,
) -> Result<Option<String>, String> {
    let source_path = PathBuf::from(&file_path);
    let source_file_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.doc");
    let suggested_name = if metadata.file_name.trim().is_empty() {
        source_file_name.to_string()
    } else {
        metadata.file_name.clone()
    };

    let selected_path = app_handle
        .dialog()
        .file()
        .set_title("另存为")
        .set_file_name(&suggested_name)
        .add_filter("Word 兼容文档", &["doc"])
        .blocking_save_file()
        .and_then(documents::fs::convert_file_path_to_pathbuf);

    let Some(path) = selected_path else {
        return Ok(None);
    };

    fs::copy(&source_path, &path).map_err(|err| err.to_string())?;
    save_doc_metadata_to_source(path.to_string_lossy().to_string(), metadata, None)?;
    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn batch_clear_and_save_doc_metadata(
    file_paths: Vec<String>,
    options: Option<BatchClearOptions>,
    request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    file_paths
        .into_iter()
        .map(|file_path| {
            if let Err(err) =
                validate_request_for_paths(request_id.as_deref(), std::slice::from_ref(&file_path))
            {
                return BatchSaveResultItem {
                    file_path,
                    success: false,
                    error: Some(err),
                };
            }

            let mut metadata = match parse_doc_metadata_from_path(file_path.clone()) {
                Ok(value) => value,
                Err(err) => {
                    return BatchSaveResultItem {
                        file_path,
                        success: false,
                        error: Some(err),
                    }
                }
            };

            metadata.document_properties.title.clear();
            metadata.document_properties.subject.clear();
            metadata.document_properties.creator.clear();
            metadata.document_properties.keywords.clear();
            metadata.document_properties.description.clear();
            metadata.document_properties.last_modified_by.clear();
            metadata.document_properties.category.clear();
            metadata.document_properties.content_status.clear();
            metadata.document_properties.version.clear();
            metadata.document_properties.identifier.clear();
            metadata.document_properties.source.clear();
            metadata.core_properties.dc_title.clear();
            metadata.core_properties.dc_subject.clear();
            metadata.core_properties.dc_creator.clear();
            metadata.core_properties.dc_description.clear();
            metadata.core_properties.dc_keywords.clear();
            metadata.core_properties.dc_identifier.clear();
            metadata.core_properties.dc_source.clear();
            metadata.app_properties.company.clear();
            metadata.app_properties.manager.clear();

            match save_doc_metadata_to_source(file_path.clone(), metadata, request_id.clone()) {
                Ok(path) => BatchSaveResultItem {
                    file_path: path,
                    success: true,
                    error: None,
                },
                Err(err) => BatchSaveResultItem {
                    file_path,
                    success: false,
                    error: Some(err),
                },
            }
        })
        .collect()
}

#[tauri::command]
fn compare_metadata(
    files: Vec<documents::compare::model::CompareFileInput>,
    options: Option<documents::compare::model::CompareOptions>,
) -> documents::compare::model::CompareResult {
    documents::compare::run_compare(&files, &options.unwrap_or_default())
}

#[tauri::command]
fn write_text_file(file_path: String, contents: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);

    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|err| err.to_string())?;
        }
    }

    fs::write(&path, contents).map_err(|err| err.to_string())
}

#[tauri::command]
fn write_binary_file(file_path: String, base64_data: String) -> Result<(), String> {
    use base64::Engine;
    let path = PathBuf::from(&file_path);
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|err| err.to_string())?;
        }
    }
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(&base64_data)
        .map_err(|err| format!("base64 解码失败: {}", err))?;
    fs::write(&path, bytes).map_err(|err| err.to_string())
}

#[tauri::command]
fn set_window_theme(window: tauri::Window, theme: String) -> Result<(), String> {
    let normalized = theme.trim().to_lowercase();

    let next_theme = match normalized.as_str() {
        "light" => Some(tauri::Theme::Light),
        "dark" => Some(tauri::Theme::Dark),
        "system" => None,
        _ => return Err(format!("unsupported theme: {}", theme)),
    };

    window.set_theme(next_theme).map_err(|err| err.to_string())
}

/// 读取图片 EXIF 元信息，供首页 / 编辑 / 隐私提取入口复用。
#[tauri::command]
fn parse_image_exif_from_path(file_path: String) -> Result<ImageExif, String> {
    validate_request_for_paths(None, std::slice::from_ref(&file_path))?;
    documents::image::parse_exif_from_path(file_path)
}

/// 原地清理图片 EXIF 元数据段（当前支持 JPEG/HEIC）。
#[tauri::command]
fn save_image_exif_to_source(
    file_path: String,
    request_id: Option<String>,
) -> Result<String, String> {
    validate_request_for_paths(request_id.as_deref(), std::slice::from_ref(&file_path))?;
    documents::image::clear_exif_to_source(&file_path)?;
    Ok(file_path)
}

/// 批量清理图片 EXIF 元数据段，逐条返回结果，失败项不影响成功项。
#[tauri::command]
fn batch_clear_and_save_image_exif(
    items: Vec<BatchSaveRequestItem>,
    request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    items
        .into_iter()
        .map(|item| match save_image_exif_to_source(item.file_path.clone(), request_id.clone()) {
            Ok(path) => BatchSaveResultItem {
                file_path: path,
                success: true,
                error: None,
            },
            Err(err) => BatchSaveResultItem {
                file_path: item.file_path,
                success: false,
                error: Some(err),
            },
        })
        .collect()
}

/// 清理后另存图片副本，保留原图。
#[tauri::command]
fn save_image_exif_as(
    app_handle: tauri::AppHandle,
    file_path: String,
) -> Result<Option<String>, String> {
    let source_path = PathBuf::from(&file_path);
    let source_file_name = source_path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("image.jpg");

    let selected = app_handle
        .dialog()
        .file()
        .set_title("另存为（已清理 EXIF）")
        .set_file_name(source_file_name)
        .blocking_save_file();

    let target = match selected {
        Some(FilePath::Path(p)) => p.to_string_lossy().to_string(),
        Some(FilePath::Url(u)) => u.path().to_string(),
        None => return Ok(None),
    };

    let bytes = fs::read(&file_path).map_err(|e| e.to_string())?;
    let stripped = documents::image::clear_exif_to_source_bytes(&bytes)
        .map_err(|e| format!("清理失败: {e}"))?;
    fs::write(&target, &stripped).map_err(|e| e.to_string())?;
    Ok(Some(target))
}

/// 打开导出文件所在目录。
///
/// 受 `engine.export.revealCommandEnabled` 开关约束：关闭时静默跳过，
/// 返回 `Ok(false)` 让前端知道未执行，避免误报"已打开文件夹"。
#[tauri::command]
fn open_export_folder(
    app: tauri::AppHandle,
    config: tauri::State<'_, Configuration>,
    file_path: String,
) -> Result<bool, String> {
    if !config.get("engine.export.revealCommandEnabled", true) {
        return Ok(false);
    }

    let path = PathBuf::from(&file_path);
    let dir = path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .map(|p| p.to_path_buf())
        .unwrap_or(path);
    app.opener()
        .open_path(dir.to_string_lossy().to_string(), None::<&str>)
        .map_err(|err| err.to_string())?;
    Ok(true)
}

/// 在系统文件管理器中定位并选中指定文件。
///
/// 与 `open_export_folder` 不同，本命令直接选中目标文件而非仅打开所在目录。
/// 同样受 `engine.export.revealCommandEnabled` 约束，关闭时返回 `Ok(false)`。
#[tauri::command]
fn reveal_file_in_folder(
    app: tauri::AppHandle,
    config: tauri::State<'_, Configuration>,
    file_path: String,
) -> Result<bool, String> {
    if !config.get("engine.export.revealCommandEnabled", true) {
        return Ok(false);
    }

    app.opener()
        .reveal_item_in_dir(PathBuf::from(&file_path))
        .map_err(|err| err.to_string())?;
    Ok(true)
}

/// 读取合并后的完整配置（内置默认 + 用户覆盖）。
#[tauri::command]
fn get_configuration(config: tauri::State<'_, Configuration>) -> serde_json::Value {
    config.snapshot()
}

/// 仅读取用户覆盖项，供设置页区分「已修改 / 默认」。
#[tauri::command]
fn get_configuration_overrides(config: tauri::State<'_, Configuration>) -> serde_json::Value {
    config.user_overrides()
}

/// 按点分键写入配置；传 `null` 表示恢复默认。
#[tauri::command]
fn update_configuration(
    config: tauri::State<'_, Configuration>,
    key: String,
    value: serde_json::Value,
) -> Result<serde_json::Value, String> {
    config.update(&key, value)?;
    Ok(config.snapshot())
}

/// 批量写入配置，一次落盘。
#[tauri::command]
fn update_configurations(
    config: tauri::State<'_, Configuration>,
    entries: std::collections::BTreeMap<String, serde_json::Value>,
) -> Result<serde_json::Value, String> {
    config.update_many(entries)?;
    Ok(config.snapshot())
}

/// 清空全部用户覆盖，回到内置默认。
#[tauri::command]
fn reset_configuration(
    config: tauri::State<'_, Configuration>,
) -> Result<serde_json::Value, String> {
    config.reset()?;
    Ok(config.snapshot())
}

/// 返回 `settings.json` 的绝对路径，供设置页「在文件夹中显示」。
#[tauri::command]
fn get_configuration_path(config: tauri::State<'_, Configuration>) -> String {
    config.file_path().to_string_lossy().to_string()
}

fn external_navigation_plugin<R: tauri::Runtime>() -> tauri::plugin::TauriPlugin<R> {
    tauri::plugin::Builder::<R>::new("external-navigation")
        .on_navigation(|webview, url| {
            let is_internal_host = matches!(
                url.host_str(),
                Some("localhost") | Some("127.0.0.1") | Some("tauri.localhost") | Some("::1")
            );

            let is_internal = url.scheme() == "tauri" || is_internal_host;

            if is_internal {
                return true;
            }

            let is_external_link = matches!(url.scheme(), "http" | "https" | "mailto" | "tel");

            if is_external_link {
                log::info!("opening external link in system browser: {}", url);
                let _ = webview.opener().open_url(url.as_str(), None::<&str>);
                return false;
            }

            true
        })
        .build()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .targets([
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::LogDir { file_name: None }),
                    Target::new(TargetKind::Webview),
                ])
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(external_navigation_plugin())
        .invoke_handler(tauri::generate_handler![
            scan_directory,
            create_automation_request,
            cancel_automation_request,
            finish_automation_request,
            get_automation_request_status,
            parse_docx_metadata,
            parse_docx_metadata_from_path,
            update_docx_metadata,
            save_docx_metadata,
            save_docx_metadata_to_source,
            batch_save_docx_metadata_to_source,
            save_docx_metadata_as,
            batch_clear_and_save_docx_metadata,
            parse_xlsx_metadata_from_path,
            save_xlsx_metadata_to_source,
            batch_save_xlsx_metadata_to_source,
            save_xlsx_metadata_as,
            batch_clear_and_save_xlsx_metadata,
            parse_pdf_metadata_from_path,
            save_pdf_metadata_to_source,
            batch_save_pdf_metadata_to_source,
            save_pdf_metadata_as,
            batch_clear_and_save_pdf_metadata,
            parse_doc_metadata_from_path,
            save_doc_metadata_to_source,
            batch_save_doc_metadata_to_source,
            save_doc_metadata_as,
            batch_clear_and_save_doc_metadata,
            compare_metadata,
            write_text_file,
            write_binary_file,
            set_window_theme,
            open_export_folder,
            reveal_file_in_folder,
            get_configuration,
            get_configuration_overrides,
            update_configuration,
            update_configurations,
            reset_configuration,
            get_configuration_path,
            parse_image_exif_from_path,
            save_image_exif_to_source,
            batch_clear_and_save_image_exif,
            save_image_exif_as
        ])
        .setup(|app| {
            let config_dir = app
                .path()
                .app_config_dir()
                .unwrap_or_else(|_| PathBuf::from("."));
            let configuration = Configuration::load(config_dir).unwrap_or_else(|err| {
                log::error!("加载配置失败，回退到内置默认值: {err}");
                Configuration::load(PathBuf::from(".")).expect("内置默认配置必须可解析")
            });
            documents::compare::rules::install_dictionaries(&configuration);
            app.manage(configuration);
            Ok(())
        })
        .on_page_load(|webview, payload| {
            if webview.label() == "main" && matches!(payload.event(), PageLoadEvent::Finished) {
                log::info!("main webview finished loading");
                let _ = webview.window().show();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
