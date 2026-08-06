use std::fs;
use std::path::PathBuf;

use lopdf::{Dictionary, Document, Object, ObjectId, StringFormat};

use crate::export::{pdf as pdf_types, DocumentMetadata};

pub fn parse_metadata_from_path(file_path: String) -> Result<DocumentMetadata, String> {
    let path = PathBuf::from(&file_path);
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.pdf")
        .to_string();
    let file_size = fs::metadata(&path).map_err(|err| err.to_string())?.len();

    let mut metadata = pdf_types::defaults(file_name, file_size);

    let document = Document::load(&path).map_err(|err| err.to_string())?;
    metadata.app_properties.pages = document.get_pages().len() as u32;
    metadata.app_properties.app_version = document.version.clone();

    if let Some(info) = info_dict(&document)? {
        let properties = &mut metadata.document_properties;
        properties.title = read_text(info, b"Title");
        properties.subject = read_text(info, b"Subject");
        properties.creator = read_text(info, b"Author");
        properties.keywords = read_text(info, b"Keywords");
        properties.description = read_text(info, b"Description");
        properties.last_modified_by = read_text(info, b"Producer");
        properties.created = date_to_iso(&read_text(info, b"CreationDate"));
        properties.modified = date_to_iso(&read_text(info, b"ModDate"));

        metadata.core_properties.dc_title = properties.title.clone();
        metadata.core_properties.dc_subject = properties.subject.clone();
        metadata.core_properties.dc_creator = properties.creator.clone();
        metadata.core_properties.dc_keywords = properties.keywords.clone();
        metadata.core_properties.dc_description = properties.description.clone();

        let producer = read_text(info, b"Creator");
        if !producer.trim().is_empty() {
            metadata.app_properties.application = producer;
        }
    }

    Ok(metadata)
}

pub fn write_metadata_to_path(
    file_path: &str,
    metadata: &DocumentMetadata,
) -> Result<(), String> {
    let mut document = Document::load(file_path).map_err(|err| err.to_string())?;
    let properties = &metadata.document_properties;
    let info = info_dict_mut(&mut document)?;

    write_text(info, b"Title", &properties.title);
    write_text(info, b"Subject", &properties.subject);
    write_text(info, b"Author", &properties.creator);
    write_text(info, b"Keywords", &properties.keywords);
    write_text(info, b"Description", &properties.description);
    write_text(info, b"Producer", &properties.last_modified_by);
    write_text(info, b"CreationDate", &iso_to_date(&properties.created));
    write_text(info, b"ModDate", &iso_to_date(&properties.modified));

    document.save(file_path).map_err(|err| err.to_string())?;
    Ok(())
}

fn info_object_id(document: &Document) -> Option<ObjectId> {
    document.trailer.get(b"Info").ok()?.as_reference().ok()
}

fn info_dict(document: &Document) -> Result<Option<&Dictionary>, String> {
    let Some(info_id) = info_object_id(document) else {
        return Ok(None);
    };

    let object = document.get_object(info_id).map_err(|err| err.to_string())?;
    let Object::Dictionary(info) = object else {
        return Ok(None);
    };

    Ok(Some(info))
}

fn info_dict_mut(document: &mut Document) -> Result<&mut Dictionary, String> {
    let info_id = match info_object_id(document) {
        Some(existing) => existing,
        None => {
            let created = document.new_object_id();
            document
                .objects
                .insert(created, Object::Dictionary(Dictionary::new()));
            document.trailer.set(b"Info", Object::Reference(created));
            created
        }
    };

    let object = document
        .get_object_mut(info_id)
        .map_err(|err| err.to_string())?;
    let Object::Dictionary(info) = object else {
        return Err("无法创建 PDF 信息字典".to_string());
    };

    Ok(info)
}

fn read_text(info: &Dictionary, key: &[u8]) -> String {
    let Ok(value) = info.get(key) else {
        return String::new();
    };

    match value {
        Object::String(bytes, _) => decode_text(bytes),
        Object::Name(name) => String::from_utf8_lossy(name).to_string(),
        _ => String::new(),
    }
}

fn write_text(info: &mut Dictionary, key: &[u8], value: &str) {
    if value.trim().is_empty() {
        info.remove(key);
        return;
    }

    info.set(
        key,
        Object::String(value.as_bytes().to_vec(), StringFormat::Literal),
    );
}

fn decode_text(bytes: &[u8]) -> String {
    if bytes.starts_with(&[0xFE, 0xFF]) {
        let units: Vec<u16> = bytes[2..]
            .chunks_exact(2)
            .map(|pair| u16::from_be_bytes([pair[0], pair[1]]))
            .collect();
        return String::from_utf16_lossy(&units);
    }

    String::from_utf8_lossy(bytes).to_string()
}

fn date_to_iso(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    let raw = trimmed.strip_prefix("D:").unwrap_or(trimmed);
    let digits: String = raw.chars().take_while(|ch| ch.is_ascii_digit()).collect();
    if digits.len() < 4 {
        return String::new();
    }

    let part = |start: usize, fallback: &str| -> String {
        digits
            .get(start..start + 2)
            .map(str::to_string)
            .unwrap_or_else(|| fallback.to_string())
    };

    format!(
        "{}-{}-{}T{}:{}:{}",
        &digits[0..4],
        part(4, "01"),
        part(6, "01"),
        part(8, "00"),
        part(10, "00"),
        part(12, "00"),
    )
}

fn iso_to_date(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return String::new();
    }

    if trimmed.starts_with("D:") {
        return trimmed.to_string();
    }

    let digits: String = trimmed.chars().filter(|ch| ch.is_ascii_digit()).collect();
    if digits.len() < 8 {
        return String::new();
    }

    let padded = format!("{:0<14}", &digits[..digits.len().min(14)]);
    format!("D:{}", padded)
}
