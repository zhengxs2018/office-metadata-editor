use std::fs;
use std::path::{Path, PathBuf};

use exif::{Exif, In, Reader, Tag};
use log::warn;

use crate::documents::image::model::{
    CameraInfo, CaptureInfo, ExifField, GpsInfo, ImageExif,
};

pub mod model;

/// 支持的图片扩展名（小写）。
const IMAGE_EXTS: &[&str] = &["jpg", "jpeg", "heic", "heif", "png", "webp"];

pub fn is_image_path(file_path: &str) -> bool {
    let ext = Path::new(file_path)
        .extension()
        .map(|s| s.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    IMAGE_EXTS.contains(&ext.as_str())
}

/// 读取图片 EXIF 元信息；无 EXIF 段时返回空结构而非报错。
pub fn parse_exif_from_path(file_path: String) -> Result<ImageExif, String> {
    let path = PathBuf::from(&file_path);
    let file_name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("image")
        .to_string();
    let file_type = path
        .extension()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let file_size = fs::metadata(&path).map_err(|e| e.to_string())?.len();

    let file = fs::File::open(&path).map_err(|e| e.to_string())?;
    let exif = match Reader::new().read_from_container(&mut std::io::BufReader::new(file)) {
        Ok(exif) => exif,
        Err(_) => {
            return Ok(ImageExif {
                file_name,
                file_type,
                file_size,
                ..Default::default()
            });
        }
    };

    let mut exif_data = ImageExif {
        file_name,
        file_type,
        file_size,
        ..Default::default()
    };

    exif_data.camera = build_camera(&exif);
    exif_data.capture = build_capture(&exif);
    exif_data.gps = build_gps(&exif);
    exif_data.raw_fields = collect_raw_fields(&exif);

    Ok(exif_data)
}

fn build_camera(exif: &Exif) -> CameraInfo {
    CameraInfo {
        make: read_text(exif, Tag::Make),
        model: read_text(exif, Tag::Model),
        lens_model: read_text(exif, Tag::LensModel),
        software: read_text(exif, Tag::Software),
        serial_number: read_text(exif, Tag::BodySerialNumber),
    }
}

fn build_capture(exif: &Exif) -> CaptureInfo {
    CaptureInfo {
        date_time_original: read_text(exif, Tag::DateTimeOriginal),
        exposure_time: format_rational(exif, Tag::ExposureTime),
        f_number: format_rational(exif, Tag::FNumber),
        iso: read_text(exif, Tag::ISOSpeed),
        focal_length: format_rational(exif, Tag::FocalLength),
        orientation: read_text(exif, Tag::Orientation),
    }
}

fn build_gps(exif: &Exif) -> Option<GpsInfo> {
    let lat = read_gps_coord(exif, Tag::GPSLatitudeRef, Tag::GPSLatitude)?;
    let lon = read_gps_coord(exif, Tag::GPSLongitudeRef, Tag::GPSLongitude)?;
    let altitude = exif
        .get_field(Tag::GPSAltitude, In::PRIMARY)
        .and_then(|f| first_rational(&f.value));

    Some(GpsInfo {
        latitude: lat,
        longitude: lon,
        altitude,
        map_url: format!("https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=15/{lat}/{lon}"),
    })
}

fn read_gps_coord(exif: &Exif, ref_tag: Tag, val_tag: Tag) -> Option<f64> {
    let ref_dir = read_text(exif, ref_tag);
    let degrees = first_rational(
        &exif.get_field(val_tag, In::PRIMARY)?.value,
    )?;
    let mut coord = degrees;
    if ref_dir == "S" || ref_dir == "W" {
        coord = -coord;
    }
    Some(coord)
}

fn collect_raw_fields(exif: &Exif) -> Vec<ExifField> {
    exif.fields()
        .map(|f| ExifField {
            tag: f.tag.to_string(),
            value: f.display_value().to_string(),
        })
        .collect()
}

/// 提取 Rational/SRational 序列首值并换算为 f64。
fn first_rational(value: &exif::Value) -> Option<f64> {
    match value {
        exif::Value::Rational(r) => r
            .first()
            .map(|r| r.num as f64 / r.denom as f64),
        exif::Value::SRational(r) => r
            .first()
            .map(|r| r.num as f64 / r.denom as f64),
        _ => None,
    }
}

fn read_text(exif: &Exif, tag: Tag) -> String {
    exif.get_field(tag, In::PRIMARY)
        .map(|f| f.display_value().to_string())
        .unwrap_or_default()
        .trim()
        .to_string()
}

fn format_rational(exif: &Exif, tag: Tag) -> String {
    exif.get_field(tag, In::PRIMARY)
        .and_then(|f| first_rational(&f.value))
        .map(|v| v.to_string())
        .unwrap_or_default()
}

/// 原地清理 JPEG/HEIC 的元数据段（APP1/APP2/APP13/APP14 等），保留像素数据。
/// 段式结构无需解码图像，纯流式重写，安全快速。PNG/WebP 暂不支持清理，返回提示。
pub fn clear_exif_to_source(file_path: &str) -> Result<(), String> {
    if !is_image_path(file_path) {
        return Err(format!("不支持的图片类型: {file_path}"));
    }
    let ext = Path::new(file_path)
        .extension()
        .map(|s| s.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    if ext != "jpg" && ext != "jpeg" && ext != "heic" && ext != "heif" {
        return Err(format!("当前版本仅支持 JPEG/HEIC 的 EXIF 清理: {file_path}"));
    }

    let bytes = fs::read(file_path).map_err(|e| e.to_string())?;
    let stripped = strip_metadata_segments(&bytes)?;

    let tmp = format!("{file_path}.tmp");
    fs::write(&tmp, &stripped).map_err(|e| e.to_string())?;
    fs::rename(&tmp, file_path).map_err(|e| e.to_string())?;
    Ok(())
}

/// 内存态清理：返回剥离元数据段后的字节，不触碰原文件（供"另存为"使用）。
pub fn clear_exif_to_source_bytes(bytes: &[u8]) -> Result<Vec<u8>, String> {
    strip_metadata_segments(bytes)
}

/// JPEG 段:以 0xFFD8(SOI) 起,后续 0xFFE0..=0xFFEF(APPn/段)可被剥离。
/// 0xFFE0(JFIF) 通常保留以维持基线解码;其余元数据段(EXIF/ICC/Photoshop/XMP)移除。
fn strip_metadata_segments(bytes: &[u8]) -> Result<Vec<u8>, String> {
    if bytes.len() < 2 || bytes[0] != 0xFF || bytes[1] != 0xD8 {
        return Err("不是有效的 JPEG/HEIC 文件".to_string());
    }

    let mut out: Vec<u8> = Vec::with_capacity(bytes.len());
    out.extend_from_slice(&bytes[0..2]);
    let mut pos = 2;

    while pos < bytes.len() {
        if bytes[pos] != 0xFF {
            break;
        }
        let marker = bytes[pos + 1];

        if marker == 0xD9 || marker == 0xDA {
            out.extend_from_slice(&bytes[pos..]);
            break;
        }

        if pos + 4 > bytes.len() {
            return Err("JPEG 段长度字段越界".to_string());
        }
        let len = u16::from_be_bytes([bytes[pos + 2], bytes[pos + 3]]) as usize;
        if pos + 2 + len > bytes.len() {
            return Err("JPEG 段声明长度超出文件范围".to_string());
        }

        let keep = match marker {
            0xE0 => true, // JFIF:保留以维持解码基线
            0xE1..=0xEF => false, // APP1..APP15:EXIF/ICC/Photoshop/XMP 等元数据
            0xFE => false, // 注释段
            _ => true,
        };

        if keep {
            out.extend_from_slice(&bytes[pos..pos + 2 + len]);
        } else {
            warn!("strip exif segment 0xFF{:02X} len={}", marker, len);
        }
        pos += 2 + len;
    }

    Ok(out)
}
