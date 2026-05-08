//! MCP (Model Context Protocol) 模块 - 为 AI 提供技能接口

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum MCPOperation {
    #[serde(rename = "list_files")]
    ListFiles,
    #[serde(rename = "get_metadata")]
    GetMetadata,
    #[serde(rename = "set_metadata")]
    SetMetadata,
    #[serde(rename = "apply_template")]
    ApplyTemplate,
    #[serde(rename = "export_data")]
    ExportData,
}

/// 处理 MCP 请求
pub fn handle_request(request: &MCPRequest) -> Result<MCPResponse, String> {
    match request.method.as_str() {
        "list_files" => handle_list_files(&request.id, &request.params),
        "get_metadata" => handle_get_metadata(&request.id, &request.params),
        "set_metadata" => handle_set_metadata(&request.id, &request.params),
        "apply_template" => handle_apply_template(&request.id, &request.params),
        "export_data" => handle_export_data(&request.id, &request.params),
        _ => Ok(MCPResponse {
            jsonrpc: "2.0".to_string(),
            id: request.id.clone(),
            result: None,
            error: Some(MCPError {
                code: -32601,
                message: format!("Method not found: {}", request.method),
                data: None,
            }),
        }),
    }
}

fn handle_list_files(
    id: &serde_json::Value,
    params: &Option<serde_json::Value>,
) -> Result<MCPResponse, String> {
    // 解析参数
    let dir_path = params
        .as_ref()
        .and_then(|p| p.get("path"))
        .and_then(|v| v.as_str())
        .unwrap_or(".");
    
    let recursive = params
        .as_ref()
        .and_then(|p| p.get("recursive"))
        .and_then(|v| v.as_bool())
        .unwrap_or(false);
    
    // 扫描目录 (简化实现)
    let files = scan_directory_impl(dir_path, recursive)?;
    
    Ok(MCPResponse {
        jsonrpc: "2.0".to_string(),
        id: id.clone(),
        result: Some(serde_json::json!({
            "files": files,
            "count": files.len(),
        })),
        error: None,
    })
}

fn handle_get_metadata(
    id: &serde_json::Value,
    params: &Option<serde_json::Value>,
) -> Result<MCPResponse, String> {
    let file_path = params
        .as_ref()
        .and_then(|p| p.get("path"))
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing 'path' parameter".to_string())?;
    
    // 获取元数据 (简化实现)
    let metadata = get_file_metadata_impl(file_path)?;
    
    Ok(MCPResponse {
        jsonrpc: "2.0".to_string(),
        id: id.clone(),
        result: Some(serde_json::json!({
            "path": file_path,
            "metadata": metadata,
        })),
        error: None,
    })
}

fn handle_set_metadata(
    id: &serde_json::Value,
    params: &Option<serde_json::Value>,
) -> Result<MCPResponse, String> {
    let file_path = params
        .as_ref()
        .and_then(|p| p.get("path"))
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing 'path' parameter".to_string())?;
    
    let metadata = params
        .as_ref()
        .and_then(|p| p.get("metadata"))
        .ok_or_else(|| "Missing 'metadata' parameter".to_string())?;
    
    // 设置元数据 (简化实现)
    set_file_metadata_impl(file_path, metadata)?;
    
    Ok(MCPResponse {
        jsonrpc: "2.0".to_string(),
        id: id.clone(),
        result: Some(serde_json::json!({
            "success": true,
            "path": file_path,
        })),
        error: None,
    })
}

fn handle_apply_template(
    id: &serde_json::Value,
    params: &Option<serde_json::Value>,
) -> Result<MCPResponse, String> {
    let template_id = params
        .as_ref()
        .and_then(|p| p.get("templateId"))
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing 'templateId' parameter".to_string())?;
    
    let file_paths = params
        .as_ref()
        .and_then(|p| p.get("filePaths"))
        .and_then(|v| v.as_array())
        .ok_or_else(|| "Missing 'filePaths' parameter".to_string())?;
    
    let paths: Vec<String> = file_paths
        .iter()
        .filter_map(|v| v.as_str().map(String::from))
        .collect();
    
    // 应用模板 (简化实现)
    let results = apply_template_impl(template_id, &paths)?;
    
    Ok(MCPResponse {
        jsonrpc: "2.0".to_string(),
        id: id.clone(),
        result: Some(serde_json::json!({
            "success": true,
            "results": results,
        })),
        error: None,
    })
}

fn handle_export_data(
    id: &serde_json::Value,
    params: &Option<serde_json::Value>,
) -> Result<MCPResponse, String> {
    let file_paths = params
        .as_ref()
        .and_then(|p| p.get("filePaths"))
        .and_then(|v| v.as_array())
        .ok_or_else(|| "Missing 'filePaths' parameter".to_string())?;
    
    let format = params
        .as_ref()
        .and_then(|p| p.get("format"))
        .and_then(|v| v.as_str())
        .unwrap_or("json");
    
    let paths: Vec<String> = file_paths
        .iter()
        .filter_map(|v| v.as_str().map(String::from))
        .collect();
    
    // 导出数据 (简化实现)
    let output_path = export_data_impl(&paths, format)?;
    
    Ok(MCPResponse {
        jsonrpc: "2.0".to_string(),
        id: id.clone(),
        result: Some(serde_json::json!({
            "success": true,
            "outputPath": output_path,
            "count": paths.len(),
        })),
        error: None,
    })
}

// ==================== 内部实现 (简化版) ====================

fn scan_directory_impl(_dir_path: &str, _recursive: bool) -> Result<Vec<HashMap<String, String>>, String> {
    // 实际实现应调用文件扫描模块
    Ok(vec![
        HashMap::from([
            ("path".to_string(), "/example/doc1.docx".to_string()),
            ("name".to_string(), "doc1.docx".to_string()),
            ("type".to_string(), "docx".to_string()),
        ]),
    ])
}

fn get_file_metadata_impl(_path: &str) -> Result<HashMap<String, String>, String> {
    // 实际实现应调用文档处理模块
    Ok(HashMap::from([
        ("title".to_string(), "示例文档".to_string()),
        ("creator".to_string(), "用户".to_string()),
        ("company".to_string(), "示例公司".to_string()),
    ]))
}

fn set_file_metadata_impl(_path: &str, _metadata: &serde_json::Value) -> Result<(), String> {
    // 实际实现应调用文档处理模块
    Ok(())
}

fn apply_template_impl(_template_id: &str, _file_paths: &[String]) -> Result<Vec<HashMap<String, String>>, String> {
    // 实际实现应调用模板模块
    Ok(vec![
        HashMap::from([
            ("path".to_string(), "/example/doc1.docx".to_string()),
            ("success".to_string(), "true".to_string()),
        ]),
    ])
}

fn export_data_impl(_file_paths: &[String], _format: &str) -> Result<String, String> {
    // 实际实现应调用导出模块
    Ok("/tmp/export.json".to_string())
}
