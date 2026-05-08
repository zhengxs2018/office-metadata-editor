//! 导出模块 - 支持将元数据导出为 JSON、Excel、CSV、XML 等格式

use std::fs;
use std::path::Path;
use serde::{Deserialize, Serialize};
use serde_json;

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
pub enum ExportFormat {
    #[serde(rename = "json")]
    Json,
    #[serde(rename = "excel")]
    Excel,
    #[serde(rename = "csv")]
    Csv,
    #[serde(rename = "xml")]
    Xml,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportOptions {
    pub format: ExportFormat,
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
struct ExportRecord {
    pub file_path: String,
    pub file_name: String,
    pub metadata: DocumentMetadata,
}

/// 导出元数据
pub fn export_metadata(
    file_paths: &[String],
    options: &ExportOptions,
) -> Result<ExportResult, String> {
    let mut records = Vec::new();
    
    // 收集所有文件的元数据 (简化版，实际应从文件读取)
    for path in file_paths {
        let metadata = read_metadata_from_file(path)?;
        let filtered_metadata = filter_metadata(&metadata, &options.include_fields);
        
        records.push(ExportRecord {
            file_path: path.clone(),
            file_name: Path::new(path)
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string(),
            metadata: filtered_metadata,
        });
    }
    
    // 根据格式导出
    let output_path = match options.format {
        ExportFormat::Json => export_to_json(&records, options)?,
        ExportFormat::Csv => export_to_csv(&records, options)?,
        ExportFormat::Xml => export_to_xml(&records, options)?,
        ExportFormat::Excel => export_to_excel(&records, options)?,
    };
    
    Ok(ExportResult {
        success: true,
        output_path: Some(output_path),
        error: None,
        exported_count: records.len(),
    })
}

/// 从文件读取元数据 (简化版)
fn read_metadata_from_file(_path: &str) -> Result<DocumentMetadata, String> {
    // 实际实现应调用文档处理模块
    Ok(DocumentMetadata {
        title: Some("示例文档".to_string()),
        subject: None,
        creator: Some("用户".to_string()),
        keywords: None,
        description: None,
        last_modified_by: None,
        created: None,
        modified: None,
        category: None,
        manager: None,
        company: Some("示例公司".to_string()),
        custom: None,
    })
}

/// 过滤元数据字段
fn filter_metadata(
    metadata: &DocumentMetadata,
    include_fields: &Option<Vec<String>>,
) -> DocumentMetadata {
    if let Some(fields) = include_fields {
        if fields.is_empty() {
            return metadata.clone();
        }
        
        // 只保留指定字段
        DocumentMetadata {
            title: if fields.contains(&"title".to_string()) { metadata.title.clone() } else { None },
            subject: if fields.contains(&"subject".to_string()) { metadata.subject.clone() } else { None },
            creator: if fields.contains(&"creator".to_string()) { metadata.creator.clone() } else { None },
            keywords: if fields.contains(&"keywords".to_string()) { metadata.keywords.clone() } else { None },
            description: if fields.contains(&"description".to_string()) { metadata.description.clone() } else { None },
            last_modified_by: if fields.contains(&"lastModifiedBy".to_string()) { metadata.last_modified_by.clone() } else { None },
            created: if fields.contains(&"created".to_string()) { metadata.created.clone() } else { None },
            modified: if fields.contains(&"modified".to_string()) { metadata.modified.clone() } else { None },
            category: if fields.contains(&"category".to_string()) { metadata.category.clone() } else { None },
            manager: if fields.contains(&"manager".to_string()) { metadata.manager.clone() } else { None },
            company: if fields.contains(&"company".to_string()) { metadata.company.clone() } else { None },
            custom: metadata.custom.clone(),
        }
    } else {
        metadata.clone()
    }
}

/// 导出为 JSON
fn export_to_json(records: &[ExportRecord], options: &ExportOptions) -> Result<String, String> {
    let output_path = get_output_path(options, "json");
    
    let content = if options.pretty_print.unwrap_or(true) {
        serde_json::to_string_pretty(&records)
    } else {
        serde_json::to_string(&records)
    }
    .map_err(|e| format!("JSON 序列化失败：{}", e))?;
    
    fs::write(&output_path, content)
        .map_err(|e| format!("写入文件失败：{}", e))?;
    
    Ok(output_path)
}

/// 导出为 CSV
fn export_to_csv(records: &[ExportRecord], options: &ExportOptions) -> Result<String, String> {
    let output_path = get_output_path(options, "csv");
    
    let mut csv_content = String::new();
    
    // 表头
    csv_content.push_str("file_path,file_name,title,subject,creator,keywords,company,created,modified\n");
    
    // 数据行
    for record in records {
        let escape_csv = |s: &Option<String>| -> String {
            match s {
                Some(val) => format!("\"{}\"", val.replace('"', "\"\"")),
                None => String::new(),
            }
        };
        
        csv_content.push_str(&format!(
            "\"{}\",\"{}\",{}\n",
            record.file_path.replace('"', "\"\""),
            record.file_name.replace('"', "\"\""),
            [
                &record.metadata.title,
                &record.metadata.subject,
                &record.metadata.creator,
                &record.metadata.keywords,
                &record.metadata.company,
                &record.metadata.created,
                &record.metadata.modified,
            ]
            .iter()
            .map(|f| escape_csv(f))
            .collect::<Vec<_>>()
            .join(",")
        ));
    }
    
    fs::write(&output_path, csv_content)
        .map_err(|e| format!("写入文件失败：{}", e))?;
    
    Ok(output_path)
}

/// 导出为 XML
fn export_to_xml(records: &[ExportRecord], options: &ExportOptions) -> Result<String, String> {
    let output_path = get_output_path(options, "xml");
    
    let mut xml_content = String::new();
    xml_content.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    xml_content.push_str("<metadata_export>\n");
    
    for record in records {
        xml_content.push_str("  <record>\n");
        xml_content.push_str(&format!("    <file_path>{}</file_path>\n", escape_xml(&record.file_path)));
        xml_content.push_str(&format!("    <file_name>{}</file_name>\n", escape_xml(&record.file_name)));
        
        if let Some(ref v) = record.metadata.title {
            xml_content.push_str(&format!("    <title>{}</title>\n", escape_xml(v)));
        }
        if let Some(ref v) = record.metadata.creator {
            xml_content.push_str(&format!("    <creator>{}</creator>\n", escape_xml(v)));
        }
        if let Some(ref v) = record.metadata.company {
            xml_content.push_str(&format!("    <company>{}</company>\n", escape_xml(v)));
        }
        
        xml_content.push_str("  </record>\n");
    }
    
    xml_content.push_str("</metadata_export>");
    
    fs::write(&output_path, xml_content)
        .map_err(|e| format!("写入文件失败：{}", e))?;
    
    Ok(output_path)
}

/// 导出为 Excel (简化版，生成 CSV 但使用.xlsx 扩展名)
/// 生产环境应使用 calamine 或类似库生成真正的 Excel 文件
fn export_to_excel(records: &[ExportRecord], options: &ExportOptions) -> Result<String, String> {
    // 临时实现：生成 CSV 但使用.xlsx 扩展名
    let mut excel_options = options.clone();
    excel_options.file_name = Some(
        options.file_name.clone().unwrap_or_else(|| "export".to_string())
    );
    
    let output_path = get_output_path(&excel_options, "xlsx");
    
    // 复用 CSV 导出逻辑
    export_to_csv(records, options)?;
    
    // 重命名为.xlsx
    let csv_path = output_path.replace(".xlsx", ".csv");
    if csv_path != output_path {
        fs::rename(&csv_path, &output_path).ok();
    }
    
    Ok(output_path)
}

/// 获取输出路径
fn get_output_path(options: &ExportOptions, extension: &str) -> String {
    let dir = options.output_dir.clone().unwrap_or_else(|| ".".to_string());
    let name = options.file_name.clone().unwrap_or_else(|| "export".to_string());
    
    Path::new(&dir)
        .join(format!("{}.{}", name, extension))
        .to_string_lossy()
        .to_string()
}

/// XML 转义
fn escape_xml(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
