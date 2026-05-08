//! 模板管理模块 - 支持元数据模板的 CRUD 和导入导出

use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

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
    pub is_builtin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateField {
    pub key: String,
    pub label: String,
    pub default_value: Option<String>,
    pub required: bool,
    pub field_type: String, // text, date, number, select
    pub options: Option<Vec<String>>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemplateApplyOptions {
    pub overwrite_existing: bool,
    pub apply_to_selected_only: bool,
    pub file_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchItemResult {
    pub file_id: String,
    pub path: String,
    pub success: bool,
    pub error: Option<String>,
}

// 模板存储目录
fn get_templates_dir() -> PathBuf {
    let app_data = dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("OfficeMetaEditor")
        .join("templates");
    
    if !app_data.exists() {
        fs::create_dir_all(&app_data).ok();
    }
    
    app_data
}

/// 创建新模板
pub fn create_template(
    name: String,
    description: Option<String>,
    organization: Option<String>,
    version: String,
    fields: Vec<TemplateField>,
    author: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<String, String> {
    let id = Uuid::new_v4().to_string();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let template = MetadataTemplate {
        id: id.clone(),
        name,
        description,
        organization,
        version,
        fields,
        created_at: now,
        updated_at: now,
        author,
        tags,
        is_builtin: false,
    };
    
    save_template_internal(&template)?;
    Ok(id)
}

/// 保存模板
pub fn save_template(template: &MetadataTemplate) -> Result<(), String> {
    save_template_internal(template)
}

fn save_template_internal(template: &MetadataTemplate) -> Result<(), String> {
    let templates_dir = get_templates_dir();
    let file_path = templates_dir.join(format!("{}.json", template.id));
    
    let content = serde_json::to_string_pretty(template)
        .map_err(|e| format!("序列化失败：{}", e))?;
    
    fs::write(&file_path, content)
        .map_err(|e| format!("写入文件失败：{}", e))?;
    
    Ok(())
}

/// 删除模板
pub fn delete_template(id: &str) -> Result<(), String> {
    let templates_dir = get_templates_dir();
    let file_path = templates_dir.join(format!("{}.json", id));
    
    if file_path.exists() {
        fs::remove_file(&file_path)
            .map_err(|e| format!("删除失败：{}", e))?;
    }
    
    Ok(())
}

/// 列出所有模板
pub fn list_templates() -> Result<Vec<MetadataTemplate>, String> {
    let templates_dir = get_templates_dir();
    let mut templates = Vec::new();
    
    // 添加内置模板
    templates.push(get_builtin_template("general"));
    
    // 读取用户模板
    if templates_dir.exists() {
        for entry in fs::read_dir(&templates_dir)
            .map_err(|e| format!("读取目录失败：{}", e))?
        {
            let entry = entry.map_err(|e| format!("读取条目失败：{}", e))?;
            let path = entry.path();
            
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(template) = serde_json::from_str::<MetadataTemplate>(&content) {
                        templates.push(template);
                    }
                }
            }
        }
    }
    
    Ok(templates)
}

/// 导出模板到文件
pub fn export_template(id: &str, output_path: &str) -> Result<(), String> {
    let templates = list_templates()?;
    
    let template = templates
        .iter()
        .find(|t| t.id == id)
        .ok_or_else(|| format!("模板不存在：{}", id))?;
    
    let content = serde_json::to_string_pretty(template)
        .map_err(|e| format!("序列化失败：{}", e))?;
    
    // 修改扩展名为.omet
    let output_path = if output_path.ends_with(".omet") {
        output_path.to_string()
    } else {
        format!("{}.omet", output_path)
    };
    
    fs::write(&output_path, content)
        .map_err(|e| format!("写入文件失败：{}", e))?;
    
    Ok(())
}

/// 从文件导入模板
pub fn import_template(input_path: &str) -> Result<MetadataTemplate, String> {
    let content = fs::read_to_string(input_path)
        .map_err(|e| format!("读取文件失败：{}", e))?;
    
    let mut template: MetadataTemplate = serde_json::from_str(&content)
        .map_err(|e| format!("解析 JSON 失败：{}", e))?;
    
    // 生成新 ID
    template.id = Uuid::new_v4().to_string();
    template.created_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    template.updated_at = template.created_at;
    template.is_builtin = false;
    
    save_template_internal(&template)?;
    
    Ok(template)
}

/// 应用模板到文件 (简化版，实际需结合文档处理模块)
pub fn apply_template_to_files(
    template_id: &str,
    file_paths: &[String],
    _options: &TemplateApplyOptions,
) -> Result<Vec<BatchItemResult>, String> {
    let templates = list_templates()?;
    
    let template = templates
        .iter()
        .find(|t| t.id == template_id)
        .ok_or_else(|| format!("模板不存在：{}", template_id))?;
    
    let mut results = Vec::new();
    
    for path in file_paths {
        // 这里应该调用实际的文档处理逻辑
        // 暂时返回成功
        results.push(BatchItemResult {
            file_id: Uuid::new_v4().to_string(),
            path: path.clone(),
            success: true,
            error: None,
        });
    }
    
    Ok(results)
}

/// 获取内置模板
fn get_builtin_template(name: &str) -> MetadataTemplate {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    match name {
        "general" => MetadataTemplate {
            id: "builtin_general".to_string(),
            name: "通用办公模板".to_string(),
            description: Some("适用于大多数办公文档的基础元数据".to_string()),
            organization: Some("系统内置".to_string()),
            version: "1.0.0".to_string(),
            fields: vec![
                TemplateField {
                    key: "title".to_string(),
                    label: "标题".to_string(),
                    default_value: None,
                    required: true,
                    field_type: "text".to_string(),
                    options: None,
                    description: None,
                },
                TemplateField {
                    key: "creator".to_string(),
                    label: "作者".to_string(),
                    default_value: None,
                    required: false,
                    field_type: "text".to_string(),
                    options: None,
                    description: None,
                },
                TemplateField {
                    key: "company".to_string(),
                    label: "公司".to_string(),
                    default_value: None,
                    required: false,
                    field_type: "text".to_string(),
                    options: None,
                    description: None,
                },
            ],
            created_at: now,
            updated_at: now,
            author: Some("System".to_string()),
            tags: Some(vec!["通用".to_string()]),
            is_builtin: true,
        },
        _ => get_builtin_template("general"),
    }
}
