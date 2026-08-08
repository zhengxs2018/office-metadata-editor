//! 元数据只读与保存的共享层。
//!
//! 供 `compare` / `hidden` / `edit` 三个功能统一读取与回写文档元数据，
//! 通过扩展名分发到对应格式实现（`documents::edit::{docx,pdf,xlsx}`），
//! 避免各功能各自实现解析/写回逻辑造成漂移。

use std::path::Path;

use crate::documents::edit::{docx, pdf, xlsx};
use crate::export::DocumentMetadata;

/// 按扩展名读取文档元数据（统一入口）。
pub fn read_metadata_from_path(file_path: String) -> Result<DocumentMetadata, String> {
    match format_of(file_path.as_str()) {
        Format::Docx => docx::parse_metadata_from_path(file_path),
        Format::Xlsx => xlsx::parse_metadata_from_path(file_path),
        Format::Pdf => pdf::parse_metadata_from_path(file_path),
        Format::Unsupported => Err(format!("不支持的文档类型: {file_path}")),
    }
}

/// 按扩展名将元数据写回文档源文件（原地保存）。
pub fn write_metadata_to_path(file_path: &str, metadata: &DocumentMetadata) -> Result<(), String> {
    match format_of(file_path) {
        Format::Docx => docx::write_metadata_to_path(file_path, metadata),
        Format::Xlsx => xlsx::write_metadata_to_path(file_path, metadata),
        Format::Pdf => pdf::write_metadata_to_path(file_path, metadata),
        Format::Unsupported => Err(format!("不支持的文档类型: {file_path}")),
    }
}

enum Format {
    Docx,
    Xlsx,
    Pdf,
    Unsupported,
}

fn format_of(file_path: &str) -> Format {
    let ext = Path::new(file_path)
        .extension()
        .map(|s| s.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "docx" | "docm" | "doc" => Format::Docx,
        "xlsx" | "xlsm" | "xls" => Format::Xlsx,
        "pdf" => Format::Pdf,
        _ => Format::Unsupported,
    }
}
