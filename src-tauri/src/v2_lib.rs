//! Office Meta Editor v2.0 - Rust 后端核心模块
//! 支持模板、目录扫描、MCP、批量操作等功能

mod documents;
mod files;
mod templates;
mod mcp;
mod export;

use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use tauri::command;

// ==================== 类型定义 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub id: String,
    pub path: String,
    pub name: String,
    pub extension: String,
    pub file_type: String,
    pub size: u64,
    pub status: String,
    pub error_message: Option<String>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentMetadata {
    pub title: Option<String>,
    pub subject: Option<String>,
    pub creator: Option<String>,
    pub keywords: Option<String>,
    pub description: Option<String>,
    pub last_modified_by: Option<String>,
    pub created: Option<String>,
    pub modified: Option<String>,
    pub category: Option<String>,
    pub manager: Option<String>,
    pub company: Option<String>,
    pub custom: Option<std::collections::HashMap<String, String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MetadataTemplate {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub organization: Option<String>,
    pub version: String,
    pub fields: Vec<TemplateField>,
    pub created_at: u64,
    pub updated_at: u64,
    pub author: Option<String>,
    pub tags: Option<Vec<String>>,
    pub is_builtin: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateField {
    pub key: String,
    pub label: String,
    pub default_value: Option<String>,
    pub required: bool,
    pub field_type: String,
    pub options: Option<Vec<String>>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryScanOptions {
    pub recursive: bool,
    pub extensions: Option<Vec<String>>,
    pub max_files: Option<usize>,
    pub exclude_patterns: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryInfo {
    pub path: String,
    pub name: String,
    pub extension: String,
    pub size: u64,
    pub modified_at: u64,
    pub selected: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DirectoryScanResult {
    pub path: String,
    pub files: Vec<DirectoryInfo>,
    pub total_found: usize,
    pub scanned_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    pub format: String,
    pub include_fields: Option<Vec<String>>,
    pub output_dir: Option<String>,
    pub file_name: Option<String>,
    pub pretty_print: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub exported_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchSaveRequestItem {
    pub path: String,
    pub metadata: DocumentMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchItemResult {
    pub file_id: String,
    pub path: String,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPConfig {
    pub enabled: bool,
    pub server_port: Option<u16>,
    pub allowed_operations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPRequest {
    pub jsonrpc: String,
    pub id: serde_json::Value,
    pub method: String,
    pub params: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPResponse {
    pub jsonrpc: String,
    pub id: serde_json::Value,
    pub result: Option<serde_json::Value>,
    pub error: Option<MCPError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MCPError {
    pub code: i32,
    pub message: String,
    pub data: Option<serde_json::Value>,
}

// ==================== Tauri 命令 ====================

/// 扫描目录中的文件
#[command]
pub async fn scan_directory(
    path: String,
    options: DirectoryScanOptions,
) -> Result<DirectoryScanResult, String> {
    files::scan_directory(&path, &options).await
}

/// 加载文件元数据
#[command]
pub async fn load_file_metadata(path: String) -> Result<DocumentMetadata, String> {
    documents::load_metadata(&path).await
}

/// 保存文件元数据
#[command]
pub async fn save_file_metadata(
    path: String,
    metadata: DocumentMetadata,
) -> Result<(), String> {
    documents::save_metadata(&path, &metadata).await
}

/// 清除文件元数据
#[command]
pub async fn clear_file_metadata(path: String) -> Result<(), String> {
    documents::clear_metadata(&path).await
}

/// 创建模板
#[command]
pub async fn create_template(
    template: serde_json::Value,
) -> Result<String, String> {
    templates::create_template(template).await
}

/// 保存模板
#[command]
pub async fn save_template(template: serde_json::Value) -> Result<(), String> {
    templates::save_template(template).await
}

/// 删除模板
#[command]
pub async fn delete_template(id: String) -> Result<(), String> {
    templates::delete_template(&id).await
}

/// 列出所有模板
#[command]
pub async fn list_templates() -> Result<Vec<MetadataTemplate>, String> {
    templates::list_templates().await
}

/// 导出模板到文件
#[command]
pub async fn export_template(id: String, output_path: String) -> Result<(), String> {
    templates::export_template(&id, &output_path).await
}

/// 从文件导入模板
#[command]
pub async fn import_template(input_path: String) -> Result<MetadataTemplate, String> {
    templates::import_template(&input_path).await
}

/// 应用模板到多个文件
#[command]
pub async fn apply_template_to_files(
    template_id: String,
    file_paths: Vec<String>,
    overwrite_existing: bool,
) -> Result<Vec<BatchItemResult>, String> {
    templates::apply_template(&template_id, &file_paths, overwrite_existing).await
}

/// 导出元数据
#[command]
pub async fn export_metadata(
    file_paths: Vec<String>,
    options: ExportOptions,
) -> Result<ExportResult, String> {
    export::export_metadata(&file_paths, &options).await
}

/// 批量保存元数据
#[command]
pub async fn batch_save_metadata(
    items: Vec<BatchSaveRequestItem>,
) -> Result<Vec<BatchItemResult>, String> {
    documents::batch_save_metadata(&items).await
}

/// 批量清除元数据
#[command]
pub async fn batch_clear_metadata(
    file_paths: Vec<String>,
) -> Result<Vec<BatchItemResult>, String> {
    documents::batch_clear_metadata(&file_paths).await
}

/// 启动 MCP 服务器
#[command]
pub async fn start_mcp_server(config: MCPConfig) -> Result<(), String> {
    mcp::start_server(config).await
}

/// 停止 MCP 服务器
#[command]
pub async fn stop_mcp_server() -> Result<(), String> {
    mcp::stop_server().await
}

/// 处理 MCP 请求
#[command]
pub async fn mcp_handle_request(request: MCPRequest) -> Result<MCPResponse, String> {
    mcp::handle_request(request).await
}

// ==================== 模块实现 ====================

mod files {
    use super::*;
    use tokio::fs;
    
    pub async fn scan_directory(
        path: &str,
        options: &DirectoryScanOptions,
    ) -> Result<DirectoryScanResult, String> {
        let dir_path = PathBuf::from(path);
        
        if !dir_path.exists() {
            return Err(format!("目录不存在：{}", path));
        }
        
        if !dir_path.is_dir() {
            return Err(format!("路径不是目录：{}", path));
        }
        
        let mut files = Vec::new();
        let mut entries = vec![dir_path.clone()];
        
        while let Some(entry_path) = entries.pop() {
            let mut read_dir = fs::read_dir(&entry_path)
                .await
                .map_err(|e| format!("读取目录失败：{}", e))?;
            
            while let Ok(Some(entry)) = read_dir.next_entry().await {
                let entry_path = entry.path();
                
                if entry_path.is_dir() {
                    if options.recursive {
                        entries.push(entry_path);
                    }
                    continue;
                }
                
                // 检查扩展名过滤
                if let Some(extensions) = &options.extensions {
                    if let Some(ext) = entry_path.extension() {
                        let ext_str = ext.to_string_lossy().to_lowercase();
                        if !extensions.contains(&ext_str) {
                            continue;
                        }
                    } else {
                        continue;
                    }
                }
                
                let metadata = entry.metadata().await.map_err(|e| e.to_string())?;
                let modified = metadata.modified()
                    .map(|m| m.duration_since(std::time::UNIX_EPOCH).unwrap().as_millis() as u64)
                    .unwrap_or(0);
                
                files.push(DirectoryInfo {
                    path: entry_path.to_string_lossy().to_string(),
                    name: entry_path.file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default(),
                    extension: entry_path.extension()
                        .map(|e| e.to_string_lossy().to_string())
                        .unwrap_or_default(),
                    size: metadata.len(),
                    modified_at: modified,
                    selected: false,
                });
                
                // 检查最大文件数限制
                if let Some(max) = options.max_files {
                    if files.len() >= max {
                        break;
                    }
                }
            }
        }
        
        Ok(DirectoryScanResult {
            path: path.to_string(),
            files,
            total_found: files.len(),
            scanned_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis() as u64,
        })
    }
}

mod documents {
    use super::*;
    use crate::documents::{docx, xlsx, pptx, pdf};
    use std::path::Path;
    
    pub async fn load_metadata(path: &str) -> Result<DocumentMetadata, String> {
        let path = Path::new(path);
        let ext = path.extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        
        match ext.as_str() {
            "docx" => docx::load_metadata(path),
            "xlsx" => xlsx::load_metadata(path),
            "pptx" => pptx::load_metadata(path),
            "pdf" => pdf::load_metadata(path),
            _ => Err(format!("不支持的文件类型：{}", ext)),
        }
    }
    
    pub async fn save_metadata(path: &str, metadata: &DocumentMetadata) -> Result<(), String> {
        let path = Path::new(path);
        let ext = path.extension()
            .map(|e| e.to_string_lossy().to_lowercase())
            .unwrap_or_default();
        
        match ext.as_str() {
            "docx" => docx::save_metadata(path, metadata),
            "xlsx" => xlsx::save_metadata(path, metadata),
            "pptx" => pptx::save_metadata(path, metadata),
            "pdf" => pdf::save_metadata(path, metadata),
            _ => Err(format!("不支持的文件类型：{}", ext)),
        }
    }
    
    pub async fn clear_metadata(path: &str) -> Result<(), String> {
        let empty_metadata = DocumentMetadata {
            title: None,
            subject: None,
            creator: None,
            keywords: None,
            description: None,
            last_modified_by: None,
            created: None,
            modified: None,
            category: None,
            manager: None,
            company: None,
            custom: None,
        };
        
        save_metadata(path, &empty_metadata).await
    }
    
    pub async fn batch_save_metadata(
        items: &[BatchSaveRequestItem],
    ) -> Result<Vec<BatchItemResult>, String> {
        let mut results = Vec::new();
        
        for item in items {
            let result = save_metadata(&item.path, &item.metadata).await;
            results.push(BatchItemResult {
                file_id: format!("file_{}", item.path),
                path: item.path.clone(),
                success: result.is_ok(),
                error: result.err(),
            });
        }
        
        Ok(results)
    }
    
    pub async fn batch_clear_metadata(
        file_paths: &[String],
    ) -> Result<Vec<BatchItemResult>, String> {
        let mut results = Vec::new();
        
        for path in file_paths {
            let result = clear_metadata(path).await;
            results.push(BatchItemResult {
                file_id: format!("file_{}", path),
                path: path.clone(),
                success: result.is_ok(),
                error: result.err(),
            });
        }
        
        Ok(results)
    }
}

mod templates {
    use super::*;
    use std::collections::HashMap;
    use tokio::sync::RwLock;
    use once_cell::sync::Lazy;
    
    static TEMPLATE_STORE: Lazy<RwLock<HashMap<String, MetadataTemplate>>> = 
        Lazy::new(|| RwLock::new(HashMap::new()));
    
    pub async fn create_template(
        template_data: serde_json::Value,
    ) -> Result<String, String> {
        let id = format!("tpl_{}", std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis());
        
        let mut template: MetadataTemplate = serde_json::from_value(template_data)
            .map_err(|e| format!("解析模板失败：{}", e))?;
        
        template.id = id.clone();
        template.created_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        template.updated_at = template.created_at;
        
        let mut store = TEMPLATE_STORE.write().await;
        store.insert(id.clone(), template);
        
        Ok(id)
    }
    
    pub async fn save_template(
        template_data: serde_json::Value,
    ) -> Result<(), String> {
        let template: MetadataTemplate = serde_json::from_value(template_data)
            .map_err(|e| format!("解析模板失败：{}", e))?;
        
        let mut store = TEMPLATE_STORE.write().await;
        if let Some(existing) = store.get_mut(&template.id) {
            *existing = template;
            Ok(())
        } else {
            Err("模板不存在".to_string())
        }
    }
    
    pub async fn delete_template(id: &str) -> Result<(), String> {
        let mut store = TEMPLATE_STORE.write().await;
        if store.remove(id).is_some() {
            Ok(())
        } else {
            Err("模板不存在".to_string())
        }
    }
    
    pub async fn list_templates() -> Result<Vec<MetadataTemplate>, String> {
        let store = TEMPLATE_STORE.read().await;
        Ok(store.values().cloned().collect())
    }
    
    pub async fn export_template(id: &str, output_path: &str) -> Result<(), String> {
        let store = TEMPLATE_STORE.read().await;
        let template = store.get(id)
            .ok_or_else(|| "模板不存在".to_string())?;
        
        let json = serde_json::to_string_pretty(template)
            .map_err(|e| format!("序列化失败：{}", e))?;
        
        tokio::fs::write(output_path, json)
            .await
            .map_err(|e| format!("写入文件失败：{}", e))
    }
    
    pub async fn import_template(input_path: &str) -> Result<MetadataTemplate, String> {
        let json = tokio::fs::read_to_string(input_path)
            .await
            .map_err(|e| format!("读取文件失败：{}", e))?;
        
        let mut template: MetadataTemplate = serde_json::from_str(&json)
            .map_err(|e| format!("解析模板失败：{}", e))?;
        
        // 生成新 ID
        template.id = format!("tpl_{}", std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis());
        template.created_at = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_millis() as u64;
        template.updated_at = template.created_at;
        
        let mut store = TEMPLATE_STORE.write().await;
        let id = template.id.clone();
        store.insert(id, template.clone());
        
        Ok(template)
    }
    
    pub async fn apply_template(
        template_id: &str,
        file_paths: &[String],
        overwrite_existing: bool,
    ) -> Result<Vec<BatchItemResult>, String> {
        let store = TEMPLATE_STORE.read().await;
        let template = store.get(template_id)
            .ok_or_else(|| "模板不存在".to_string())?;
        
        let mut results = Vec::new();
        
        for path in file_paths {
            // 加载现有元数据
            let existing = match documents::load_metadata(path).await {
                Ok(meta) => meta,
                Err(_) => DocumentMetadata {
                    title: None,
                    subject: None,
                    creator: None,
                    keywords: None,
                    description: None,
                    last_modified_by: None,
                    created: None,
                    modified: None,
                    category: None,
                    manager: None,
                    company: None,
                    custom: None,
                },
            };
            
            // 应用模板字段
            let mut new_metadata = existing.clone();
            for field in &template.fields {
                // 如果已有值且不允许覆盖，则跳过
                let current_value = match field.key.as_str() {
                    "title" => existing.title.clone(),
                    "subject" => existing.subject.clone(),
                    "creator" => existing.creator.clone(),
                    "keywords" => existing.keywords.clone(),
                    "description" => existing.description.clone(),
                    "lastModifiedBy" => existing.last_modified_by.clone(),
                    "created" => existing.created.clone(),
                    "modified" => existing.modified.clone(),
                    "category" => existing.category.clone(),
                    "manager" => existing.manager.clone(),
                    "company" => existing.company.clone(),
                    _ => existing.custom.as_ref().and_then(|c| c.get(&field.key).cloned()),
                };
                
                if current_value.is_some() && !overwrite_existing {
                    continue;
                }
                
                // 设置默认值或空值
                let value = field.default_value.clone();
                match field.key.as_str() {
                    "title" => new_metadata.title = value,
                    "subject" => new_metadata.subject = value,
                    "creator" => new_metadata.creator = value,
                    "keywords" => new_metadata.keywords = value,
                    "description" => new_metadata.description = value,
                    "lastModifiedBy" => new_metadata.last_modified_by = value,
                    "created" => new_metadata.created = value,
                    "modified" => new_metadata.modified = value,
                    "category" => new_metadata.category = value,
                    "manager" => new_metadata.manager = value,
                    "company" => new_metadata.company = value,
                    _ => {
                        if let Some(ref mut custom) = new_metadata.custom {
                            if let Some(v) = value {
                                custom.insert(field.key.clone(), v);
                            }
                        } else {
                            let mut custom = HashMap::new();
                            if let Some(v) = value {
                                custom.insert(field.key.clone(), v);
                            }
                            new_metadata.custom = Some(custom);
                        }
                    }
                }
            }
            
            // 保存元数据
            let result = documents::save_metadata(path, &new_metadata).await;
            results.push(BatchItemResult {
                file_id: format!("file_{}", path),
                path: path.clone(),
                success: result.is_ok(),
                error: result.err(),
            });
        }
        
        Ok(results)
    }
}

mod mcp {
    use super::*;
    use once_cell::sync::Lazy;
    use tokio::sync::RwLock;
    
    static MCP_ENABLED: Lazy<RwLock<bool>> = Lazy::new(|| RwLock::new(false));
    
    pub async fn start_server(config: MCPConfig) -> Result<(), String> {
        if !config.enabled {
            return Ok(());
        }
        
        let mut enabled = MCP_ENABLED.write().await;
        *enabled = true;
        
        // TODO: 实现实际的 MCP 服务器逻辑
        // 这里可以启动一个 HTTP/WebSocket 服务器来接收 AI 请求
        
        Ok(())
    }
    
    pub async fn stop_server() -> Result<(), String> {
        let mut enabled = MCP_ENABLED.write().await;
        *enabled = false;
        Ok(())
    }
    
    pub async fn handle_request(request: MCPRequest) -> Result<MCPResponse, String> {
        let enabled = MCP_ENABLED.read().await;
        if !*enabled {
            return Ok(MCPResponse {
                jsonrpc: "2.0".to_string(),
                id: request.id,
                result: None,
                error: Some(MCPError {
                    code: -32000,
                    message: "MCP 服务器未启用".to_string(),
                    data: None,
                }),
            });
        }
        
        // 根据 method 分发处理
        match request.method.as_str() {
            "list_files" => handle_list_files(request).await,
            "get_metadata" => handle_get_metadata(request).await,
            "set_metadata" => handle_set_metadata(request).await,
            "apply_template" => handle_apply_template(request).await,
            "export_data" => handle_export_data(request).await,
            _ => Ok(MCPResponse {
                jsonrpc: "2.0".to_string(),
                id: request.id,
                result: None,
                error: Some(MCPError {
                    code: -32601,
                    message: format!("方法未找到：{}", request.method),
                    data: None,
                }),
            }),
        }
    }
    
    async fn handle_list_files(request: MCPRequest) -> Result<MCPResponse, String> {
        // TODO: 实现文件列表查询
        Ok(MCPResponse {
            jsonrpc: "2.0".to_string(),
            id: request.id,
            result: Some(serde_json::json!({ "files": [] })),
            error: None,
        })
    }
    
    async fn handle_get_metadata(request: MCPRequest) -> Result<MCPResponse, String> {
        // TODO: 实现元数据获取
        Ok(MCPResponse {
            jsonrpc: "2.0".to_string(),
            id: request.id,
            result: Some(serde_json::json!({ "metadata": {} })),
            error: None,
        })
    }
    
    async fn handle_set_metadata(request: MCPRequest) -> Result<MCPResponse, String> {
        // TODO: 实现元数据设置
        Ok(MCPResponse {
            jsonrpc: "2.0".to_string(),
            id: request.id,
            result: Some(serde_json::json!({ "success": true })),
            error: None,
        })
    }
    
    async fn handle_apply_template(request: MCPRequest) -> Result<MCPResponse, String> {
        // TODO: 实现模板应用
        Ok(MCPResponse {
            jsonrpc: "2.0".to_string(),
            id: request.id,
            result: Some(serde_json::json!({ "success": true })),
            error: None,
        })
    }
    
    async fn handle_export_data(request: MCPRequest) -> Result<MCPResponse, String> {
        // TODO: 实现数据导出
        Ok(MCPResponse {
            jsonrpc: "2.0".to_string(),
            id: request.id,
            result: Some(serde_json::json!({ "success": true })),
            error: None,
        })
    }
}

mod export {
    use super::*;
    
    pub async fn export_metadata(
        file_paths: &[String],
        options: &ExportOptions,
    ) -> Result<ExportResult, String> {
        let mut all_metadata = Vec::new();
        
        for path in file_paths {
            match documents::load_metadata(path).await {
                Ok(meta) => {
                    all_metadata.push((path.clone(), meta));
                }
                Err(e) => {
                    // 继续处理其他文件
                    eprintln!("加载 {} 失败：{}", path, e);
                }
            }
        }
        
        match options.format.as_str() {
            "json" => export_to_json(&all_metadata, options).await,
            "excel" | "xlsx" => export_to_excel(&all_metadata, options).await,
            "csv" => export_to_csv(&all_metadata, options).await,
            "xml" => export_to_xml(&all_metadata, options).await,
            _ => Err(format!("不支持的导出格式：{}", options.format)),
        }
    }
    
    async fn export_to_json(
        data: &[(String, DocumentMetadata)],
        options: &ExportOptions,
    ) -> Result<ExportResult, String> {
        let output_dir = options.output_dir.as_deref().unwrap_or(".");
        let file_name = options.file_name.as_deref().unwrap_or("metadata.json");
        let output_path = format!("{}/{}", output_dir, file_name);
        
        let json_data: Vec<_> = data.iter().map(|(path, meta)| {
            serde_json::json!({
                "path": path,
                "metadata": meta,
            })
        }).collect();
        
        let json = if options.pretty_print.unwrap_or(true) {
            serde_json::to_string_pretty(&json_data)
        } else {
            serde_json::to_string(&json_data)
        }.map_err(|e| format!("序列化 JSON 失败：{}", e))?;
        
        tokio::fs::write(&output_path, json)
            .await
            .map_err(|e| format!("写入文件失败：{}", e))?;
        
        Ok(ExportResult {
            success: true,
            output_path: Some(output_path),
            error: None,
            exported_count: data.len(),
        })
    }
    
    async fn export_to_excel(
        _data: &[(String, DocumentMetadata)],
        _options: &ExportOptions,
    ) -> Result<ExportResult, String> {
        // TODO: 使用 calamine 或 rust_xlsxwriter 实现 Excel 导出
        Err("Excel 导出功能尚未实现".to_string())
    }
    
    async fn export_to_csv(
        _data: &[(String, DocumentMetadata)],
        _options: &ExportOptions,
    ) -> Result<ExportResult, String> {
        // TODO: 实现 CSV 导出
        Err("CSV 导出功能尚未实现".to_string())
    }
    
    async fn export_to_xml(
        _data: &[(String, DocumentMetadata)],
        _options: &ExportOptions,
    ) -> Result<ExportResult, String> {
        // TODO: 实现 XML 导出
        Err("XML 导出功能尚未实现".to_string())
    }
}
