// cspell:ignore cdtf
use std::collections::HashMap;
use std::fs;
use std::hash::{Hash, Hasher};
use std::io::{Cursor, Read, Write};
use std::path::PathBuf;
use std::sync::{Mutex, OnceLock};
use std::time::UNIX_EPOCH;

use lopdf::{Dictionary as PdfDictionary, Document as PdfDocument, Object as PdfObject, ObjectId, StringFormat};
use serde::{Deserialize, Serialize};
use tauri::webview::PageLoadEvent;
use tauri_plugin_dialog::{DialogExt, FilePath};
use tauri_plugin_log::{Target, TargetKind};
use tauri_plugin_opener::OpenerExt;
use xmltree::{Element, XMLNode};
use zip::{write::SimpleFileOptions, ZipArchive, ZipWriter};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DocumentProperties {
    title: String,
    subject: String,
    creator: String,
    keywords: String,
    description: String,
    last_modified_by: String,
    revision: String,
    created: String,
    modified: String,
    category: String,
    content_status: String,
    version: String,
    language: String,
    identifier: String,
    source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CoreProperties {
    dc_title: String,
    dc_subject: String,
    dc_creator: String,
    dc_description: String,
    dc_keywords: String,
    dc_language: String,
    dc_identifier: String,
    dc_source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct AppProperties {
    application: String,
    app_version: String,
    company: String,
    manager: String,
    template: String,
    total_time: String,
    pages: u32,
    words: u32,
    characters: u32,
    characters_with_spaces: u32,
    paragraphs: u32,
    lines: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct DocumentMetadata {
    file_name: String,
    file_type: String,
    file_size: u64,
    document_properties: DocumentProperties,
    core_properties: CoreProperties,
    app_properties: AppProperties,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BatchSaveResultItem {
    file_path: String,
    success: bool,
    error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BatchSaveRequestItem {
    file_path: String,
    metadata: DocumentMetadata,
}

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

fn validate_request_for_paths(request_id: Option<&str>, file_paths: &[String]) -> Result<(), String> {
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
        return Err(format!("requestId {} 状态为 {}，无法继续", request_id, request.status));
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

    let conflict = normalized_paths
        .iter()
        .find_map(|path| registry.file_to_request.get(path).map(|rid| (path.clone(), rid.clone())));

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
fn scan_directory(path: String, options: DirectoryScanOptions) -> Result<DirectoryScanResult, String> {
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

            let metadata = fs::metadata(&entry_path).map_err(|err| format!("读取文件信息失败: {}", err))?;
            let modified_at = metadata
                .modified()
                .ok()
                .and_then(|time| time.duration_since(UNIX_EPOCH).ok())
                .map(|duration| duration.as_millis() as u64)
                .unwrap_or(0);

            files.push(DirectoryInfo {
                path: entry_path.to_string_lossy().to_string(),
                name: entry
                    .file_name()
                    .to_string_lossy()
                    .to_string(),
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

impl DocumentMetadata {
    fn defaults(file_name: String, file_size: u64) -> Self {
        Self {
            file_name,
            file_type: "docx".to_string(),
            file_size,
            document_properties: DocumentProperties {
                title: String::new(),
                subject: String::new(),
                creator: String::new(),
                keywords: String::new(),
                description: String::new(),
                last_modified_by: String::new(),
                revision: String::new(),
                created: String::new(),
                modified: String::new(),
                category: String::new(),
                content_status: String::new(),
                version: String::new(),
                language: "zh-CN".to_string(),
                identifier: String::new(),
                source: String::new(),
            },
            core_properties: CoreProperties {
                dc_title: String::new(),
                dc_subject: String::new(),
                dc_creator: String::new(),
                dc_description: String::new(),
                dc_keywords: String::new(),
                dc_language: "zh-CN".to_string(),
                dc_identifier: String::new(),
                dc_source: String::new(),
            },
            app_properties: AppProperties {
                application: "Microsoft Office Word".to_string(),
                app_version: String::new(),
                company: String::new(),
                manager: String::new(),
                template: String::new(),
                total_time: "0".to_string(),
                pages: 0,
                words: 0,
                characters: 0,
                characters_with_spaces: 0,
                paragraphs: 0,
                lines: 0,
            },
        }
    }
}

#[tauri::command]
fn parse_docx_metadata(file_name: String, file_size: u64, file_bytes: Vec<u8>) -> Result<DocumentMetadata, String> {
    let mut metadata = DocumentMetadata::defaults(file_name, file_size);

    let mut archive = ZipArchive::new(Cursor::new(file_bytes)).map_err(|err| err.to_string())?;

    if let Some(core_xml) = read_zip_entry_as_string(&mut archive, "docProps/core.xml")? {
        apply_core_properties(&mut metadata, &core_xml)?;
    }

    if let Some(app_xml) = read_zip_entry_as_string(&mut archive, "docProps/app.xml")? {
        apply_app_properties(&mut metadata, &app_xml)?;
    }

    Ok(metadata)
}

#[tauri::command]
fn parse_docx_metadata_from_path(file_path: String) -> Result<DocumentMetadata, String> {
    let path = PathBuf::from(&file_path);
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.docx")
        .to_string();

    let file_size = fs::metadata(&path)
        .map_err(|err| err.to_string())?
        .len();
    let file_bytes = fs::read(&path).map_err(|err| err.to_string())?;

    parse_docx_metadata(file_name, file_size, file_bytes)
}

#[tauri::command]
fn update_docx_metadata(file_bytes: Vec<u8>, metadata: DocumentMetadata) -> Result<Vec<u8>, String> {
    build_updated_docx_bytes(file_bytes, &metadata)
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
        .and_then(convert_file_path_to_pathbuf);

    let Some(path) = selected_path else {
        return Ok(None);
    };

    let updated_file_bytes = build_updated_docx_bytes(file_bytes, &metadata)?;
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
    let file_bytes = fs::read(&file_path).map_err(|err| err.to_string())?;
    let updated_file_bytes = build_updated_docx_bytes(file_bytes, &metadata)?;
    fs::write(&file_path, updated_file_bytes).map_err(|err| err.to_string())?;
    Ok(file_path)
}

#[tauri::command]
fn batch_save_docx_metadata_to_source(
    items: Vec<BatchSaveRequestItem>,
    request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    items
        .into_iter()
        .map(|item| {
            match save_docx_metadata_to_source(item.file_path.clone(), item.metadata, request_id.clone()) {
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
        .and_then(convert_file_path_to_pathbuf);

    let Some(path) = selected_path else {
        return Ok(None);
    };

    let file_bytes = fs::read(&source_path).map_err(|err| err.to_string())?;
    let updated_file_bytes = build_updated_docx_bytes(file_bytes, &metadata)?;
    fs::write(&path, updated_file_bytes).map_err(|err| err.to_string())?;

    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
fn batch_clear_and_save_docx_metadata(
    file_paths: Vec<String>,
    options: Option<BatchClearOptions>,
    request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    file_paths
        .into_iter()
        .map(|file_path| match process_single_batch_clear(&file_path, options.as_ref(), request_id.as_deref()) {
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
        })
        .collect()
}

#[tauri::command]
fn parse_xlsx_metadata_from_path(file_path: String) -> Result<DocumentMetadata, String> {
    let mut metadata = parse_docx_metadata_from_path(file_path)?;
    metadata.file_type = "xlsx".to_string();
    if metadata.app_properties.application.trim().is_empty() {
        metadata.app_properties.application = "Microsoft Excel".to_string();
    }
    if metadata.app_properties.template.trim().is_empty() {
        metadata.app_properties.template = "Book.xltx".to_string();
    }
    Ok(metadata)
}

#[tauri::command]
fn save_xlsx_metadata_to_source(
    file_path: String,
    metadata: DocumentMetadata,
    request_id: Option<String>,
) -> Result<String, String> {
    validate_request_for_paths(request_id.as_deref(), std::slice::from_ref(&file_path))?;
    let file_bytes = fs::read(&file_path).map_err(|err| err.to_string())?;
    let updated_file_bytes = build_updated_docx_bytes(file_bytes, &metadata)?;
    fs::write(&file_path, updated_file_bytes).map_err(|err| err.to_string())?;
    Ok(file_path)
}

#[tauri::command]
fn batch_save_xlsx_metadata_to_source(
    items: Vec<BatchSaveRequestItem>,
    request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    items
        .into_iter()
        .map(|item| match save_xlsx_metadata_to_source(item.file_path.clone(), item.metadata, request_id.clone()) {
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
        .and_then(convert_file_path_to_pathbuf);

    let Some(path) = selected_path else {
        return Ok(None);
    };

    let file_bytes = fs::read(&source_path).map_err(|err| err.to_string())?;
    let updated_file_bytes = build_updated_docx_bytes(file_bytes, &metadata)?;
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
        .map(|file_path| match process_single_batch_clear(&file_path, options.as_ref(), request_id.as_deref()) {
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
        })
        .collect()
}

#[tauri::command]
fn parse_pdf_metadata_from_path(file_path: String) -> Result<DocumentMetadata, String> {
    let path = PathBuf::from(&file_path);
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.pdf")
        .to_string();
    let file_size = fs::metadata(&path).map_err(|err| err.to_string())?.len();

    let mut metadata = DocumentMetadata::defaults(file_name, file_size);
    metadata.file_type = "pdf".to_string();
    metadata.app_properties.application = "PDF".to_string();

    let loaded = PdfDocument::load(&file_path).map_err(|err| err.to_string())?;
    if let Some(info) = get_pdf_info_dict(&loaded)? {
        metadata.document_properties.title = get_pdf_string(info, b"Title");
        metadata.document_properties.subject = get_pdf_string(info, b"Subject");
        metadata.document_properties.creator = get_pdf_string(info, b"Author");
        metadata.document_properties.keywords = get_pdf_string(info, b"Keywords");
        metadata.document_properties.description = get_pdf_string(info, b"Description");
        metadata.document_properties.last_modified_by = get_pdf_string(info, b"Producer");
        metadata.document_properties.created =
            normalize_pdf_date_for_display(&get_pdf_string(info, b"CreationDate"));
        metadata.document_properties.modified =
            normalize_pdf_date_for_display(&get_pdf_string(info, b"ModDate"));
    }

    Ok(metadata)
}

#[tauri::command]
fn save_pdf_metadata_to_source(
    file_path: String,
    metadata: DocumentMetadata,
    request_id: Option<String>,
) -> Result<String, String> {
    validate_request_for_paths(request_id.as_deref(), std::slice::from_ref(&file_path))?;
    let mut loaded = PdfDocument::load(&file_path).map_err(|err| err.to_string())?;
    let info = ensure_pdf_info_dict_mut(&mut loaded)?;

    set_pdf_string(info, b"Title", &metadata.document_properties.title);
    set_pdf_string(info, b"Subject", &metadata.document_properties.subject);
    set_pdf_string(info, b"Author", &metadata.document_properties.creator);
    set_pdf_string(info, b"Keywords", &metadata.document_properties.keywords);
    set_pdf_string(info, b"Description", &metadata.document_properties.description);
    set_pdf_string(info, b"Producer", &metadata.document_properties.last_modified_by);
    if !metadata.document_properties.created.trim().is_empty() {
        let created = normalize_pdf_date_for_write(&metadata.document_properties.created);
        set_pdf_string(info, b"CreationDate", &created);
    }
    if !metadata.document_properties.modified.trim().is_empty() {
        let modified = normalize_pdf_date_for_write(&metadata.document_properties.modified);
        set_pdf_string(info, b"ModDate", &modified);
    }

    loaded.save(&file_path).map_err(|err| err.to_string())?;
    Ok(file_path)
}

#[tauri::command]
fn batch_save_pdf_metadata_to_source(
    items: Vec<BatchSaveRequestItem>,
    request_id: Option<String>,
) -> Vec<BatchSaveResultItem> {
    items
        .into_iter()
        .map(|item| match save_pdf_metadata_to_source(item.file_path.clone(), item.metadata, request_id.clone()) {
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
        .and_then(convert_file_path_to_pathbuf);

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
            if let Err(err) = validate_request_for_paths(request_id.as_deref(), std::slice::from_ref(&file_path)) {
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
            apply_batch_metadata_options(&mut metadata, options.as_ref());

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
        .map(|item| match save_doc_metadata_to_source(item.file_path.clone(), item.metadata, request_id.clone()) {
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
        .and_then(convert_file_path_to_pathbuf);

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
            if let Err(err) = validate_request_for_paths(request_id.as_deref(), std::slice::from_ref(&file_path)) {
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
            apply_batch_metadata_options(&mut metadata, options.as_ref());

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

fn get_pdf_string(info: &PdfDictionary, key: &[u8]) -> String {
    let Ok(value) = info.get(key) else {
        return String::new();
    };

    match value {
        PdfObject::String(bytes, _) => String::from_utf8_lossy(bytes).to_string(),
        PdfObject::Name(name) => String::from_utf8_lossy(name).to_string(),
        _ => String::new(),
    }
}

fn set_pdf_string(info: &mut PdfDictionary, key: &[u8], value: &str) {
    if value.trim().is_empty() {
        info.remove(key);
        return;
    }

    info.set(
        key,
        PdfObject::String(value.as_bytes().to_vec(), StringFormat::Literal),
    );
}

fn normalize_pdf_date_for_display(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    parse_pdf_date_to_iso(trimmed).unwrap_or_else(|| trimmed.to_string())
}

fn normalize_pdf_date_for_write(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    if trimmed.starts_with("D:") {
        return trimmed.to_string();
    }

    iso_like_date_to_pdf(trimmed).unwrap_or_else(|| trimmed.to_string())
}

fn parse_pdf_date_to_iso(value: &str) -> Option<String> {
    let raw = value.strip_prefix("D:").unwrap_or(value);
    if raw.len() < 4 {
        return None;
    }

    let year = raw.get(0..4)?;
    if !year.chars().all(|ch| ch.is_ascii_digit()) {
        return None;
    }

    let month = extract_pdf_date_component(raw, 4, 2, "01")?;
    let day = extract_pdf_date_component(raw, 6, 2, "01")?;
    let hour = extract_pdf_date_component(raw, 8, 2, "00")?;
    let minute = extract_pdf_date_component(raw, 10, 2, "00")?;
    let second = extract_pdf_date_component(raw, 12, 2, "00")?;

    let mut result = format!("{}-{}-{}T{}:{}:{}", year, month, day, hour, minute, second);

    if let Some((sign, tz_hour, tz_minute)) = parse_pdf_offset(raw) {
        result.push(sign);
        result.push_str(&tz_hour);
        result.push(':');
        result.push_str(&tz_minute);
    }

    Some(result)
}

fn extract_pdf_date_component(raw: &str, start: usize, len: usize, default: &str) -> Option<String> {
    if let Some(chunk) = raw.get(start..start + len) {
        if chunk.chars().all(|ch| ch.is_ascii_digit()) {
            return Some(chunk.to_string());
        }
        return None;
    }

    Some(default.to_string())
}

fn parse_pdf_offset(raw: &str) -> Option<(char, String, String)> {
    let sign_index = raw
        .char_indices()
        .find(|(_, ch)| matches!(*ch, '+' | '-'))
        .map(|(idx, _)| idx)?;

    let sign = raw.get(sign_index..=sign_index)?.chars().next()?;
    let after_sign = raw.get(sign_index + 1..)?;
    let tz_hour = after_sign.get(0..2)?;
    if !tz_hour.chars().all(|ch| ch.is_ascii_digit()) {
        return None;
    }

    let mut tz_minute = "00".to_string();

    if let Some(minute_block) = after_sign.get(3..5) {
        if minute_block.chars().all(|ch| ch.is_ascii_digit()) {
            tz_minute = minute_block.to_string();
        }
    } else if let Some(minute_block) = after_sign.get(2..4) {
        if minute_block.chars().all(|ch| ch.is_ascii_digit()) {
            tz_minute = minute_block.to_string();
        }
    }

    Some((sign, tz_hour.to_string(), tz_minute))
}

fn iso_like_date_to_pdf(value: &str) -> Option<String> {
    let normalized = value.replace(' ', "T");
    let (date_part, time_part) = normalized.split_once('T')?;

    let mut date_iter = date_part.split('-');
    let year = date_iter.next()?;
    let month = date_iter.next()?;
    let day = date_iter.next()?;
    if year.len() != 4 || month.len() != 2 || day.len() != 2 {
        return None;
    }
    if !(year.chars().all(|ch| ch.is_ascii_digit())
        && month.chars().all(|ch| ch.is_ascii_digit())
        && day.chars().all(|ch| ch.is_ascii_digit()))
    {
        return None;
    }

    let (time_only, offset_part) = split_time_and_offset(time_part);
    let mut time_iter = time_only.split(':');
    let hour = time_iter.next()?;
    let minute = time_iter.next().unwrap_or("00");
    let second_raw = time_iter.next().unwrap_or("00");
    let second = second_raw.split('.').next().unwrap_or("00");

    if !(hour.len() == 2
        && minute.len() == 2
        && second.len() == 2
        && hour.chars().all(|ch| ch.is_ascii_digit())
        && minute.chars().all(|ch| ch.is_ascii_digit())
        && second.chars().all(|ch| ch.is_ascii_digit()))
    {
        return None;
    }

    let mut pdf = format!("D:{}{}{}{}{}{}", year, month, day, hour, minute, second);

    if let Some(offset) = offset_part {
        if offset == "Z" {
            pdf.push('Z');
        } else if let Some((sign, hour, minute)) = parse_iso_offset(offset) {
            pdf.push(sign);
            pdf.push_str(&hour);
            pdf.push('\'');
            pdf.push_str(&minute);
            pdf.push('\'');
        }
    }

    Some(pdf)
}

fn split_time_and_offset(time_part: &str) -> (&str, Option<&str>) {
    if let Some(index) = time_part.find('Z') {
        let head = &time_part[..index];
        return (head, Some("Z"));
    }

    if let Some(index) = time_part
        .char_indices()
        .skip(1)
        .find(|(_, ch)| matches!(*ch, '+' | '-'))
        .map(|(idx, _)| idx)
    {
        let head = &time_part[..index];
        let tail = &time_part[index..];
        return (head, Some(tail));
    }

    (time_part, None)
}

fn parse_iso_offset(offset: &str) -> Option<(char, String, String)> {
    let sign = offset.chars().next()?;
    if !matches!(sign, '+' | '-') {
        return None;
    }

    let digits = &offset[1..];
    if let Some((hour, minute)) = digits.split_once(':') {
        if hour.len() == 2
            && minute.len() == 2
            && hour.chars().all(|ch| ch.is_ascii_digit())
            && minute.chars().all(|ch| ch.is_ascii_digit())
        {
            return Some((sign, hour.to_string(), minute.to_string()));
        }
        return None;
    }

    if digits.len() == 4 && digits.chars().all(|ch| ch.is_ascii_digit()) {
        return Some((
            sign,
            digits[0..2].to_string(),
            digits[2..4].to_string(),
        ));
    }

    None
}

fn get_pdf_info_object_id(document: &PdfDocument) -> Option<ObjectId> {
    let info_object = document.trailer.get(b"Info").ok()?;
    info_object.as_reference().ok()
}

fn get_pdf_info_dict(document: &PdfDocument) -> Result<Option<&PdfDictionary>, String> {
    let Some(info_id) = get_pdf_info_object_id(document) else {
        return Ok(None);
    };

    let object = document.get_object(info_id).map_err(|err| err.to_string())?;
    let PdfObject::Dictionary(info) = object else {
        return Ok(None);
    };

    Ok(Some(info))
}

fn ensure_pdf_info_dict_mut(document: &mut PdfDocument) -> Result<&mut PdfDictionary, String> {
    let info_id = if let Some(existing_id) = get_pdf_info_object_id(document) {
        existing_id
    } else {
        let new_id = document.new_object_id();
        document
            .objects
            .insert(new_id, PdfObject::Dictionary(PdfDictionary::new()));
        document
            .trailer
            .set(b"Info", PdfObject::Reference(new_id));
        new_id
    };

    let object = document
        .get_object_mut(info_id)
        .map_err(|err| err.to_string())?;
    let PdfObject::Dictionary(info) = object else {
        return Err("无法创建 PDF 信息字典".to_string());
    };

    Ok(info)
}

fn build_updated_docx_bytes(file_bytes: Vec<u8>, metadata: &DocumentMetadata) -> Result<Vec<u8>, String> {
    let mut source_archive =
        ZipArchive::new(Cursor::new(file_bytes.clone())).map_err(|err| err.to_string())?;

    let source_core_xml = read_zip_entry_as_string(&mut source_archive, "docProps/core.xml")?;
    let source_app_xml = read_zip_entry_as_string(&mut source_archive, "docProps/app.xml")?;

    let updated_core_xml = write_core_properties(source_core_xml.as_deref(), metadata)?;
    let updated_app_xml = write_app_properties(source_app_xml.as_deref(), metadata)?;

    let mut output = Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(&mut output);

    let mut archive = ZipArchive::new(Cursor::new(file_bytes)).map_err(|err| err.to_string())?;

    let mut has_core = false;
    let mut has_app = false;

    for index in 0..archive.len() {
        let mut file = archive.by_index(index).map_err(|err| err.to_string())?;
        let entry_name = file.name().to_string();

        if file.is_dir() {
            writer
                .add_directory(entry_name, SimpleFileOptions::default())
                .map_err(|err| err.to_string())?;
            continue;
        }

        let options = SimpleFileOptions::default().compression_method(file.compression());
        writer
            .start_file(&entry_name, options)
            .map_err(|err| err.to_string())?;

        if entry_name == "docProps/core.xml" {
            writer.write_all(updated_core_xml.as_bytes()).map_err(|err| err.to_string())?;
            has_core = true;
        } else if entry_name == "docProps/app.xml" {
            writer.write_all(updated_app_xml.as_bytes()).map_err(|err| err.to_string())?;
            has_app = true;
        } else {
            std::io::copy(&mut file, &mut writer).map_err(|err| err.to_string())?;
        }
    }

    if !has_core {
        writer
            .start_file("docProps/core.xml", SimpleFileOptions::default())
            .map_err(|err| err.to_string())?;
        writer.write_all(updated_core_xml.as_bytes()).map_err(|err| err.to_string())?;
    }

    if !has_app {
        writer
            .start_file("docProps/app.xml", SimpleFileOptions::default())
            .map_err(|err| err.to_string())?;
        writer.write_all(updated_app_xml.as_bytes()).map_err(|err| err.to_string())?;
    }

    writer.finish().map_err(|err| err.to_string())?;
    Ok(output.into_inner())
}

fn process_single_batch_clear(
    file_path: &str,
    options: Option<&BatchClearOptions>,
    request_id: Option<&str>,
) -> Result<(), String> {
    validate_request_for_paths(request_id, &[file_path.to_string()])?;

    let path = PathBuf::from(file_path);
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.docx")
        .to_string();
    let file_size = fs::metadata(&path)
        .map_err(|err| err.to_string())?
        .len();
    let file_bytes = fs::read(&path).map_err(|err| err.to_string())?;

    let mut metadata = parse_docx_metadata(file_name, file_size, file_bytes.clone())?;
    clear_metadata_fields(&mut metadata);
    apply_batch_metadata_options(&mut metadata, options);

    let updated_file_bytes = build_updated_docx_bytes(file_bytes, &metadata)?;
    fs::write(&path, updated_file_bytes).map_err(|err| err.to_string())?;
    Ok(())
}

fn apply_batch_metadata_options(metadata: &mut DocumentMetadata, options: Option<&BatchClearOptions>) {
    let Some(options) = options else {
        return;
    };

    if let Some(template_id) = options.template_id.as_ref() {
        let trimmed = template_id.trim();
        if !trimmed.is_empty() && metadata.app_properties.template.trim().is_empty() {
            metadata.app_properties.template = trimmed.to_string();
        }
    }

    let Some(overrides) = options.metadata_overrides.as_ref() else {
        return;
    };

    if let Some(document) = overrides.document_properties.as_ref() {
        if let Some(value) = document.title.as_ref() {
            metadata.document_properties.title = value.clone();
        }
        if let Some(value) = document.subject.as_ref() {
            metadata.document_properties.subject = value.clone();
        }
        if let Some(value) = document.creator.as_ref() {
            metadata.document_properties.creator = value.clone();
        }
        if let Some(value) = document.keywords.as_ref() {
            metadata.document_properties.keywords = value.clone();
        }
        if let Some(value) = document.description.as_ref() {
            metadata.document_properties.description = value.clone();
        }
        if let Some(value) = document.last_modified_by.as_ref() {
            metadata.document_properties.last_modified_by = value.clone();
        }
        if let Some(value) = document.revision.as_ref() {
            metadata.document_properties.revision = value.clone();
        }
        if let Some(value) = document.created.as_ref() {
            metadata.document_properties.created = value.clone();
        }
        if let Some(value) = document.modified.as_ref() {
            metadata.document_properties.modified = value.clone();
        }
        if let Some(value) = document.category.as_ref() {
            metadata.document_properties.category = value.clone();
        }
        if let Some(value) = document.content_status.as_ref() {
            metadata.document_properties.content_status = value.clone();
        }
        if let Some(value) = document.version.as_ref() {
            metadata.document_properties.version = value.clone();
        }
        if let Some(value) = document.language.as_ref() {
            metadata.document_properties.language = value.clone();
        }
        if let Some(value) = document.identifier.as_ref() {
            metadata.document_properties.identifier = value.clone();
        }
        if let Some(value) = document.source.as_ref() {
            metadata.document_properties.source = value.clone();
        }
    }

    if let Some(core) = overrides.core_properties.as_ref() {
        if let Some(value) = core.dc_title.as_ref() {
            metadata.core_properties.dc_title = value.clone();
        }
        if let Some(value) = core.dc_subject.as_ref() {
            metadata.core_properties.dc_subject = value.clone();
        }
        if let Some(value) = core.dc_creator.as_ref() {
            metadata.core_properties.dc_creator = value.clone();
        }
        if let Some(value) = core.dc_description.as_ref() {
            metadata.core_properties.dc_description = value.clone();
        }
        if let Some(value) = core.dc_keywords.as_ref() {
            metadata.core_properties.dc_keywords = value.clone();
        }
        if let Some(value) = core.dc_language.as_ref() {
            metadata.core_properties.dc_language = value.clone();
        }
        if let Some(value) = core.dc_identifier.as_ref() {
            metadata.core_properties.dc_identifier = value.clone();
        }
        if let Some(value) = core.dc_source.as_ref() {
            metadata.core_properties.dc_source = value.clone();
        }
    }

    if let Some(app) = overrides.app_properties.as_ref() {
        if let Some(value) = app.application.as_ref() {
            metadata.app_properties.application = value.clone();
        }
        if let Some(value) = app.app_version.as_ref() {
            metadata.app_properties.app_version = value.clone();
        }
        if let Some(value) = app.company.as_ref() {
            metadata.app_properties.company = value.clone();
        }
        if let Some(value) = app.manager.as_ref() {
            metadata.app_properties.manager = value.clone();
        }
        if let Some(value) = app.template.as_ref() {
            metadata.app_properties.template = value.clone();
        }
        if let Some(value) = app.total_time.as_ref() {
            metadata.app_properties.total_time = value.clone();
        }
        if let Some(value) = app.pages {
            metadata.app_properties.pages = value;
        }
        if let Some(value) = app.words {
            metadata.app_properties.words = value;
        }
        if let Some(value) = app.characters {
            metadata.app_properties.characters = value;
        }
        if let Some(value) = app.characters_with_spaces {
            metadata.app_properties.characters_with_spaces = value;
        }
        if let Some(value) = app.paragraphs {
            metadata.app_properties.paragraphs = value;
        }
        if let Some(value) = app.lines {
            metadata.app_properties.lines = value;
        }
    }
}

fn clear_metadata_fields(metadata: &mut DocumentMetadata) {
    let original_created = metadata.document_properties.created.clone();
    let original_modified = metadata.document_properties.modified.clone();
    let original_revision = metadata.document_properties.revision.clone();

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
    metadata.document_properties.created = original_created;
    metadata.document_properties.modified = original_modified;
    metadata.document_properties.revision = original_revision;

    metadata.core_properties.dc_title.clear();
    metadata.core_properties.dc_subject.clear();
    metadata.core_properties.dc_creator.clear();
    metadata.core_properties.dc_description.clear();
    metadata.core_properties.dc_keywords.clear();
    metadata.core_properties.dc_identifier.clear();
    metadata.core_properties.dc_source.clear();

    metadata.app_properties.company.clear();
    metadata.app_properties.manager.clear();
}

fn convert_file_path_to_pathbuf(file_path: FilePath) -> Option<PathBuf> {
    match file_path {
        FilePath::Path(path) => Some(path),
        FilePath::Url(url) => url.to_file_path().ok(),
    }
}

fn read_zip_entry_as_string(
    archive: &mut ZipArchive<Cursor<Vec<u8>>>,
    path: &str,
) -> Result<Option<String>, String> {
    let mut file = match archive.by_name(path) {
        Ok(file) => file,
        Err(_) => return Ok(None),
    };

    let mut content = String::new();
    file.read_to_string(&mut content).map_err(|err| err.to_string())?;
    Ok(Some(content))
}

fn parse_xml_or_default(xml: Option<&str>, default_xml: &str) -> Result<Element, String> {
    let content = xml.unwrap_or(default_xml);
    Element::parse(content.as_bytes()).map_err(|err| err.to_string())
}

fn write_core_properties(source_xml: Option<&str>, metadata: &DocumentMetadata) -> Result<String, String> {
    let mut root = parse_xml_or_default(source_xml, DEFAULT_CORE_XML)?;

    set_child_text(&mut root, "dc:title", &metadata.core_properties.dc_title);
    set_child_text(&mut root, "dc:subject", &metadata.core_properties.dc_subject);
    set_child_text(&mut root, "dc:creator", &metadata.core_properties.dc_creator);
    set_child_text(&mut root, "cp:keywords", &metadata.core_properties.dc_keywords);
    set_child_text(&mut root, "dc:description", &metadata.core_properties.dc_description);
    set_child_text(&mut root, "cp:lastModifiedBy", &metadata.document_properties.last_modified_by);
    set_child_text(&mut root, "cp:category", &metadata.document_properties.category);
    set_child_text(&mut root, "cp:contentStatus", &metadata.document_properties.content_status);
    set_child_text(&mut root, "cp:version", &metadata.document_properties.version);
    set_child_text(&mut root, "dc:language", &metadata.core_properties.dc_language);
    set_child_text(&mut root, "dc:identifier", &metadata.core_properties.dc_identifier);
    set_child_text(&mut root, "dc:source", &metadata.core_properties.dc_source);

    if !metadata.document_properties.revision.is_empty() {
        set_child_text(&mut root, "cp:revision", &metadata.document_properties.revision);
    }

    if !metadata.document_properties.created.is_empty() {
        set_child_text(&mut root, "dcterms:created", &metadata.document_properties.created);
    }

    if !metadata.document_properties.modified.is_empty() {
        set_child_text(&mut root, "dcterms:modified", &metadata.document_properties.modified);
    }

    let mut out = Vec::new();
    root.write(&mut out).map_err(|err| err.to_string())?;
    String::from_utf8(out).map_err(|err| err.to_string())
}

fn write_app_properties(source_xml: Option<&str>, metadata: &DocumentMetadata) -> Result<String, String> {
    let mut root = parse_xml_or_default(source_xml, DEFAULT_APP_XML)?;

    set_child_text(&mut root, "Application", &metadata.app_properties.application);
    set_child_text(&mut root, "AppVersion", &metadata.app_properties.app_version);
    set_child_text(&mut root, "Company", &metadata.app_properties.company);
    set_child_text(&mut root, "Manager", &metadata.app_properties.manager);
    set_child_text(&mut root, "Template", &metadata.app_properties.template);
    set_child_text(&mut root, "TotalTime", &metadata.app_properties.total_time);
    set_child_text(&mut root, "Pages", &metadata.app_properties.pages.to_string());
    set_child_text(&mut root, "Words", &metadata.app_properties.words.to_string());
    set_child_text(&mut root, "Characters", &metadata.app_properties.characters.to_string());
    set_child_text(
        &mut root,
        "CharactersWithSpaces",
        &metadata.app_properties.characters_with_spaces.to_string(),
    );
    set_child_text(&mut root, "Paragraphs", &metadata.app_properties.paragraphs.to_string());
    set_child_text(&mut root, "Lines", &metadata.app_properties.lines.to_string());

    let mut out = Vec::new();
    root.write(&mut out).map_err(|err| err.to_string())?;
    String::from_utf8(out).map_err(|err| err.to_string())
}

fn apply_core_properties(metadata: &mut DocumentMetadata, core_xml: &str) -> Result<(), String> {
    let root = Element::parse(core_xml.as_bytes()).map_err(|err| err.to_string())?;

    let title = get_child_text(&root, &["dc:title", "title"]);
    let subject = get_child_text(&root, &["dc:subject", "subject"]);
    let creator = get_child_text(&root, &["dc:creator", "creator"]);
    let keywords = get_child_text(&root, &["cp:keywords", "keywords"]);
    let description = get_child_text(&root, &["dc:description", "description"]);
    let language = get_child_text(&root, &["dc:language", "language"]);
    let identifier = get_child_text(&root, &["dc:identifier", "identifier"]);
    let source = get_child_text(&root, &["dc:source", "source"]);

    metadata.document_properties.title = title.clone();
    metadata.document_properties.subject = subject.clone();
    metadata.document_properties.creator = creator.clone();
    metadata.document_properties.keywords = keywords.clone();
    metadata.document_properties.description = description.clone();
    metadata.document_properties.last_modified_by =
        get_child_text(&root, &["cp:lastModifiedBy", "lastModifiedBy"]);
    metadata.document_properties.revision = get_child_text(&root, &["cp:revision", "revision"]);
    metadata.document_properties.created = get_child_text(&root, &["dcterms:created", "created"]);
    metadata.document_properties.modified = get_child_text(&root, &["dcterms:modified", "modified"]);
    metadata.document_properties.category = get_child_text(&root, &["cp:category", "category"]);
    metadata.document_properties.content_status =
        get_child_text(&root, &["cp:contentStatus", "contentStatus"]);
    metadata.document_properties.version = get_child_text(&root, &["cp:version", "version"]);
    metadata.document_properties.language = language.clone();
    metadata.document_properties.identifier = identifier.clone();
    metadata.document_properties.source = source.clone();

    metadata.core_properties.dc_title = title;
    metadata.core_properties.dc_subject = subject;
    metadata.core_properties.dc_creator = creator;
    metadata.core_properties.dc_description = description;
    metadata.core_properties.dc_keywords = keywords;
    metadata.core_properties.dc_language = language;
    metadata.core_properties.dc_identifier = identifier;
    metadata.core_properties.dc_source = source;

    Ok(())
}

fn apply_app_properties(metadata: &mut DocumentMetadata, app_xml: &str) -> Result<(), String> {
    let root = Element::parse(app_xml.as_bytes()).map_err(|err| err.to_string())?;

    let application = get_child_text(&root, &["Application"]);
    let app_version = get_child_text(&root, &["AppVersion"]);
    let (normalized_application, normalized_version) =
        normalize_application_metadata(&application, &app_version);

    metadata.app_properties.application = normalized_application;
    metadata.app_properties.app_version = normalized_version;
    metadata.app_properties.company = get_child_text(&root, &["Company"]);
    metadata.app_properties.manager = get_child_text(&root, &["Manager"]);
    metadata.app_properties.template = get_child_text(&root, &["Template"]);
    metadata.app_properties.total_time = get_child_text(&root, &["TotalTime"]);

    metadata.app_properties.pages = parse_u32(&get_child_text(&root, &["Pages"]));
    metadata.app_properties.words = parse_u32(&get_child_text(&root, &["Words"]));
    metadata.app_properties.characters = parse_u32(&get_child_text(&root, &["Characters"]));
    metadata.app_properties.characters_with_spaces =
        parse_u32(&get_child_text(&root, &["CharactersWithSpaces"]));
    metadata.app_properties.paragraphs = parse_u32(&get_child_text(&root, &["Paragraphs"]));
    metadata.app_properties.lines = parse_u32(&get_child_text(&root, &["Lines"]));

    Ok(())
}

fn get_child_text(root: &Element, names: &[&str]) -> String {
    for node in &root.children {
        if let XMLNode::Element(child) = node {
            if names.iter().any(|name| child.name == *name) {
                return child.get_text().map(|value| value.to_string()).unwrap_or_default();
            }
        }
    }

    String::new()
}

fn element_name_matches(element_name: &str, target_name: &str) -> bool {
    if element_name == target_name {
        return true;
    }

    let target_local = target_name.rsplit(':').next().unwrap_or(target_name);
    let element_local = element_name.rsplit(':').next().unwrap_or(element_name);
    element_local == target_local
}

fn set_child_text(root: &mut Element, name: &str, value: &str) {
    let mut first_match_index: Option<usize> = None;

    for index in 0..root.children.len() {
        if let XMLNode::Element(child) = &mut root.children[index] {
            if element_name_matches(&child.name, name) {
                if first_match_index.is_none() {
                    child.children.clear();
                    child.children.push(XMLNode::Text(value.to_string()));
                    first_match_index = Some(index);
                }
            }
        }
    }

    if let Some(keep_index) = first_match_index {
        let mut index = root.children.len();
        while index > 0 {
            index -= 1;
            if index == keep_index {
                continue;
            }

            let should_remove = matches!(
                root.children.get(index),
                Some(XMLNode::Element(child)) if element_name_matches(&child.name, name)
            );

            if should_remove {
                root.children.remove(index);
            }
        }
        return;
    }

    let mut element = Element::new(name);
    element.children.push(XMLNode::Text(value.to_string()));
    root.children.push(XMLNode::Element(element));
}

fn parse_u32(input: &str) -> u32 {
    input.trim().parse::<u32>().unwrap_or(0)
}

fn normalize_application_metadata(application: &str, app_version: &str) -> (String, String) {
    let normalized_application = application.trim();
    let normalized_version = app_version.trim();

    if !normalized_version.is_empty() {
        return (
            normalized_application.to_string(),
            normalized_version.to_string(),
        );
    }

    let mut segments = normalized_application.split('_');
    let app_name = segments.next().unwrap_or("").trim();
    let embedded_version = segments.next().unwrap_or("").trim();

    if !app_name.is_empty()
        && !embedded_version.is_empty()
        && embedded_version
            .chars()
            .next()
            .is_some_and(|character| character.is_ascii_digit())
    {
        return (app_name.to_string(), embedded_version.to_string());
    }

    (normalized_application.to_string(), normalized_version.to_string())
}

const DEFAULT_CORE_XML: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title></dc:title>
  <dc:subject></dc:subject>
  <dc:creator></dc:creator>
  <cp:keywords></cp:keywords>
  <dc:description></dc:description>
  <cp:lastModifiedBy></cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF"></dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF"></dcterms:modified>
  <cp:category></cp:category>
  <cp:contentStatus></cp:contentStatus>
  <cp:version></cp:version>
  <dc:language>zh-CN</dc:language>
  <dc:identifier></dc:identifier>
  <dc:source></dc:source>
</cp:coreProperties>
"#;

const DEFAULT_APP_XML: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
  <AppVersion></AppVersion>
  <Company></Company>
  <Manager></Manager>
  <Template></Template>
  <TotalTime>0</TotalTime>
  <Pages>0</Pages>
  <Words>0</Words>
  <Characters>0</Characters>
  <CharactersWithSpaces>0</CharactersWithSpaces>
  <Paragraphs>0</Paragraphs>
  <Lines>0</Lines>
</Properties>
"#;

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
            set_window_theme
        ])
        .on_page_load(|webview, payload| {
            if webview.label() == "main" && matches!(payload.event(), PageLoadEvent::Finished) {
                log::info!("main webview finished loading");
                let _ = webview.window().show();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
