use std::fs;
use std::io::{Cursor, Read};
use std::path::PathBuf;

use xmltree::Element;
use zip::ZipArchive;

use super::docx::{build_updated_ooxml_bytes, parse_ooxml_metadata};
use crate::documents::hidden::extract_hidden::extract_hidden_metadata;
use crate::export::{xlsx as xlsx_types, DocumentMetadata};

pub fn parse_metadata_from_path(file_path: String) -> Result<DocumentMetadata, String> {
    let path = PathBuf::from(&file_path);
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("workbook.xlsx")
        .to_string();
    let file_size = fs::metadata(&path).map_err(|err| err.to_string())?.len();
    let file_bytes = fs::read(&path).map_err(|err| err.to_string())?;

    let mut metadata = parse_ooxml_metadata(file_name, file_size, file_bytes.clone())?;
    metadata.file_type = "xlsx".to_string();

    if metadata.app_properties.application.trim().is_empty() {
        metadata.app_properties.application = xlsx_types::APPLICATION.to_string();
    }
    if metadata.app_properties.template.trim().is_empty() {
        metadata.app_properties.template = xlsx_types::TEMPLATE.to_string();
    }

    metadata.app_properties.pages = count_sheets(file_bytes)?;

    extract_hidden_metadata(&mut metadata, &file_path);
    Ok(metadata)
}

pub fn write_metadata_to_path(file_path: &str, metadata: &DocumentMetadata) -> Result<(), String> {
    let file_bytes = fs::read(file_path).map_err(|err| err.to_string())?;
    let updated = build_updated_ooxml_bytes(file_bytes, metadata)?;
    fs::write(file_path, updated).map_err(|err| err.to_string())
}

fn count_sheets(file_bytes: Vec<u8>) -> Result<u32, String> {
    let mut archive = ZipArchive::new(Cursor::new(file_bytes)).map_err(|err| err.to_string())?;

    let Ok(mut entry) = archive.by_name("xl/workbook.xml") else {
        return Ok(0);
    };

    let mut buffer = Vec::new();
    entry
        .read_to_end(&mut buffer)
        .map_err(|err| err.to_string())?;

    let root = Element::parse(buffer.as_slice()).map_err(|err| err.to_string())?;
    let Some(sheets) = root.get_child("sheets") else {
        return Ok(0);
    };

    let total = sheets
        .children
        .iter()
        .filter_map(|node| node.as_element())
        .filter(|element| element.name == "sheet")
        .count();

    Ok(total as u32)
}

/// xlsx 与 docx 同属 OOXML，清空逻辑一致，直接复用 docx 实现。
pub fn process_single_batch_clear(file_path: &str) -> Result<(), String> {
    super::docx::process_single_batch_clear(file_path)
}
