//! 导出模块 - 支持将元数据导出为 JSON、Excel、CSV、XML 等格式

pub mod docx;
pub mod pdf;
pub mod xlsx;

use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};

pub use docx::{
    AppProperties, BatchSaveRequestItem, BatchSaveResultItem, CoreProperties, DocumentMetadata,
    DocumentProperties,
};

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
#[serde(rename_all = "camelCase")]
pub struct ExportOptions {
    pub format: ExportFormat,
    pub include_fields: Option<Vec<String>>,
    pub output_dir: Option<String>,
    pub file_name: Option<String>,
    pub pretty_print: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResult {
    pub success: bool,
    pub output_path: Option<String>,
    pub error: Option<String>,
    pub exported_count: usize,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportRecord {
    pub file_path: String,
    pub file_name: String,
    pub file_type: String,
    pub fields: Vec<(String, String)>,
}

const DEFAULT_FIELDS: [&str; 9] = [
    "title",
    "subject",
    "creator",
    "keywords",
    "description",
    "lastModifiedBy",
    "created",
    "modified",
    "category",
];

pub fn export_metadata(
    documents: &[DocumentMetadata],
    file_paths: &[String],
    options: &ExportOptions,
) -> Result<ExportResult, String> {
    if documents.len() != file_paths.len() {
        return Err("文档数量与文件路径数量不一致".to_string());
    }

    let field_names = resolve_fields(&options.include_fields);

    let records: Vec<ExportRecord> = documents
        .iter()
        .zip(file_paths)
        .map(|(metadata, file_path)| ExportRecord {
            file_path: file_path.clone(),
            file_name: metadata.file_name.clone(),
            file_type: metadata.file_type.clone(),
            fields: field_names
                .iter()
                .map(|name| (name.clone(), read_field(metadata, name)))
                .collect(),
        })
        .collect();

    let output_path = match options.format {
        ExportFormat::Json => export_to_json(&records, options)?,
        ExportFormat::Csv | ExportFormat::Excel => export_to_csv(&records, options)?,
        ExportFormat::Xml => export_to_xml(&records, options)?,
    };

    Ok(ExportResult {
        success: true,
        output_path: Some(output_path),
        error: None,
        exported_count: records.len(),
    })
}

fn resolve_fields(include_fields: &Option<Vec<String>>) -> Vec<String> {
    match include_fields {
        Some(fields) if !fields.is_empty() => fields.clone(),
        _ => DEFAULT_FIELDS.iter().map(|name| name.to_string()).collect(),
    }
}

fn read_field(metadata: &DocumentMetadata, field: &str) -> String {
    let properties = &metadata.document_properties;
    let app = &metadata.app_properties;

    match field {
        "title" => properties.title.clone(),
        "subject" => properties.subject.clone(),
        "creator" => properties.creator.clone(),
        "keywords" => properties.keywords.clone(),
        "description" => properties.description.clone(),
        "lastModifiedBy" => properties.last_modified_by.clone(),
        "revision" => properties.revision.clone(),
        "created" => properties.created.clone(),
        "modified" => properties.modified.clone(),
        "category" => properties.category.clone(),
        "contentStatus" => properties.content_status.clone(),
        "version" => properties.version.clone(),
        "language" => properties.language.clone(),
        "identifier" => properties.identifier.clone(),
        "source" => properties.source.clone(),
        "application" => app.application.clone(),
        "appVersion" => app.app_version.clone(),
        "company" => app.company.clone(),
        "manager" => app.manager.clone(),
        "template" => app.template.clone(),
        "pages" => app.pages.to_string(),
        "words" => app.words.to_string(),
        "characters" => app.characters.to_string(),
        _ => String::new(),
    }
}

fn export_to_json(records: &[ExportRecord], options: &ExportOptions) -> Result<String, String> {
    let output_path = get_output_path(options, "json");

    let rows: Vec<serde_json::Map<String, serde_json::Value>> = records
        .iter()
        .map(|record| {
            let mut row = serde_json::Map::new();
            row.insert("filePath".to_string(), record.file_path.clone().into());
            row.insert("fileName".to_string(), record.file_name.clone().into());
            row.insert("fileType".to_string(), record.file_type.clone().into());
            for (name, value) in &record.fields {
                row.insert(name.clone(), value.clone().into());
            }
            row
        })
        .collect();

    let content = if options.pretty_print.unwrap_or(true) {
        serde_json::to_string_pretty(&rows)
    } else {
        serde_json::to_string(&rows)
    }
    .map_err(|err| format!("JSON 序列化失败：{}", err))?;

    fs::write(&output_path, content).map_err(|err| format!("写入文件失败：{}", err))?;

    Ok(output_path)
}

fn export_to_csv(records: &[ExportRecord], options: &ExportOptions) -> Result<String, String> {
    let extension = match options.format {
        ExportFormat::Excel => "xlsx",
        _ => "csv",
    };
    let output_path = get_output_path(options, extension);

    let mut headers = vec![
        "filePath".to_string(),
        "fileName".to_string(),
        "fileType".to_string(),
    ];
    if let Some(first) = records.first() {
        headers.extend(first.fields.iter().map(|(name, _)| name.clone()));
    }

    let mut content = String::new();
    content.push_str(&join_csv_row(&headers));

    for record in records {
        let mut row = vec![
            record.file_path.clone(),
            record.file_name.clone(),
            record.file_type.clone(),
        ];
        row.extend(record.fields.iter().map(|(_, value)| value.clone()));
        content.push_str(&join_csv_row(&row));
    }

    fs::write(&output_path, content).map_err(|err| format!("写入文件失败：{}", err))?;

    Ok(output_path)
}

fn join_csv_row(values: &[String]) -> String {
    let cells: Vec<String> = values
        .iter()
        .map(|value| format!("\"{}\"", value.replace('"', "\"\"")))
        .collect();
    format!("{}\n", cells.join(","))
}

fn export_to_xml(records: &[ExportRecord], options: &ExportOptions) -> Result<String, String> {
    let output_path = get_output_path(options, "xml");

    let mut content = String::new();
    content.push_str("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
    content.push_str("<metadataExport>\n");

    for record in records {
        content.push_str("  <record>\n");
        content.push_str(&format_xml_element("filePath", &record.file_path));
        content.push_str(&format_xml_element("fileName", &record.file_name));
        content.push_str(&format_xml_element("fileType", &record.file_type));
        for (name, value) in &record.fields {
            content.push_str(&format_xml_element(name, value));
        }
        content.push_str("  </record>\n");
    }

    content.push_str("</metadataExport>\n");

    fs::write(&output_path, content).map_err(|err| format!("写入文件失败：{}", err))?;

    Ok(output_path)
}

fn format_xml_element(name: &str, value: &str) -> String {
    format!("    <{0}>{1}</{0}>\n", name, escape_xml(value))
}

fn get_output_path(options: &ExportOptions, extension: &str) -> String {
    let dir = options.output_dir.clone().unwrap_or_else(|| ".".to_string());
    let name = options
        .file_name
        .clone()
        .unwrap_or_else(|| "export".to_string());
    let stem = Path::new(&name)
        .file_stem()
        .and_then(|value| value.to_str())
        .unwrap_or("export");

    Path::new(&dir)
        .join(format!("{}.{}", stem, extension))
        .to_string_lossy()
        .to_string()
}

fn escape_xml(value: &str) -> String {
    value
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&apos;")
}
