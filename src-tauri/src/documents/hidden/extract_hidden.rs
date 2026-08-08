use std::fs;
use std::path::Path;

use crate::export::DocumentMetadata;

/// 从真实文件中提取「隐藏信息 / 编辑痕迹」，补充进 `DocumentMetadata`，
/// 供对比内核的 `REVISION_TRACES` 规则使用。
///
/// 提取范围（保持中立：仅识别、不清理）：
/// - PDF：批注作者（/T）、XMP 创作者、增量保存层数（修订痕迹标记）
/// - XLSX/DOCX：批注作者（comments xml 的 authors）
pub fn extract_hidden_metadata(meta: &mut DocumentMetadata, file_path: &str) {
    let path = Path::new(file_path);
    let ext = path
        .extension()
        .map(|s| s.to_string_lossy().to_lowercase())
        .unwrap_or_default();

    match ext.as_str() {
        "pdf" => extract_pdf_hidden(meta, file_path),
        "xlsx" | "xls" | "docx" | "doc" => extract_ooxml_hidden(meta, file_path),
        "jpg" | "jpeg" | "heic" | "heif" | "png" | "webp" => {
            extract_image_hidden(meta, file_path)
        }
        _ => {}
    }
}

/// 图片隐私提取：识别 GPS 定位、机身序列号、相机/软件指纹等高危痕迹。
/// 不清理，仅标记，供隐私页展示与比对内核使用。
fn extract_image_hidden(meta: &mut DocumentMetadata, file_path: &str) {
    let Ok(exif) = crate::documents::image::parse_exif_from_path(file_path.to_string()) else {
        return;
    };

    let has_gps = exif.gps.is_some();
    let has_serial = !exif.camera.serial_number.is_empty();
    let has_camera_id = !exif.camera.make.is_empty() || !exif.camera.model.is_empty();
    if has_gps || has_serial || has_camera_id {
        meta.has_hidden_markers = true;
    }

    meta.image_exif = Some(exif);
}

fn extract_pdf_hidden(meta: &mut DocumentMetadata, file_path: &str) {
    let Ok(bytes) = fs::read(file_path) else {
        return;
    };
    let Ok(doc) = lopdf::Document::load(file_path) else {
        return;
    };

    // 批注作者：遍历所有页面的 annotation 字典的 /T 字段。
    for (_page_num, page_id) in doc.get_pages() {
        if let Ok(page) = doc.get_dictionary(page_id) {
            if let Ok(annotations) = page.get(b"Annots").and_then(|a| a.as_array()) {
                for annot in annotations {
                    if let Ok(dict) = annot.as_dict() {
                        if let Ok(title) = dict.get(b"T").and_then(|t| t.as_str()) {
                            let author = String::from_utf8_lossy(title).trim().to_string();
                            if !author.is_empty() {
                                meta.annotation_authors.push(author);
                            }
                        }
                    }
                }
            }
        }
    }

    if let Ok(Ok(_meta_stream)) = doc
        .catalog()
        .and_then(|c| c.get(b"Metadata"))
        .map(|m| m.as_stream())
    {
        meta.has_hidden_markers = true;
    }

    let prev_marker: &[u8] = b"Prev ";
    let incremental = bytes
        .windows(prev_marker.len())
        .filter(|w| *w == prev_marker)
        .count();
    if incremental > 0 {
        meta.has_hidden_markers = true;
    }

    meta.annotation_authors.sort();
    meta.annotation_authors.dedup();
}

fn extract_ooxml_hidden(meta: &mut DocumentMetadata, file_path: &str) {
    let Ok(bytes) = fs::read(file_path) else {
        return;
    };
    let cursor = std::io::Cursor::new(bytes);
    let Ok(mut archive) = zip::ZipArchive::new(cursor) else {
        return;
    };

    let targets = ["xl/comments1.xml", "xl/comments2.xml", "word/comments.xml"];
    for name in targets {
        if let Ok(entry) = archive.by_name(name) {
            if let Ok(root) = xmltree::Element::parse(entry) {
                collect_comment_authors(&root, &mut meta.annotation_authors);
            }
        }
    }

    meta.annotation_authors.sort();
    meta.annotation_authors.dedup();
}

fn collect_comment_authors(el: &xmltree::Element, out: &mut Vec<String>) {
    if el.name == "author" {
        let text: String = el.children.iter().filter_map(|c| c.as_text()).collect();
        let author = text.trim().to_string();
        if !author.is_empty() {
            out.push(author);
        }
    }
    for child in &el.children {
        if let Some(child) = child.as_element() {
            collect_comment_authors(child, out);
        }
    }
}
