use std::fs;
use std::io::{Cursor, Read};
use std::path::PathBuf;

use tauri_plugin_dialog::FilePath;
use zip::ZipArchive;

/// 将 Tauri 对话框返回的 `FilePath` 归一为 `PathBuf`（URL 走 `to_file_path`）。
pub fn convert_file_path_to_pathbuf(file_path: FilePath) -> Option<PathBuf> {
    match file_path {
        FilePath::Path(path) => Some(path),
        FilePath::Url(url) => url.to_file_path().ok(),
    }
}

/// 从 zip（OOXML/OFD）归档中按条目名读取文本；条目不存在返回 `None`。
pub fn read_zip_entry_as_string(
    archive: &mut ZipArchive<Cursor<Vec<u8>>>,
    path: &str,
) -> Result<Option<String>, String> {
    let mut file = match archive.by_name(path) {
        Ok(file) => file,
        Err(_) => return Ok(None),
    };

    let mut content = String::new();
    file.read_to_string(&mut content)
        .map_err(|err| err.to_string())?;
    Ok(Some(content))
}

/// 读取 UTF-8 文本文件；失败转为 `String` 错误。
pub fn read_text_file(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|err| err.to_string())
}

/// 写入 UTF-8 文本文件，自动创建父目录；失败转为 `String` 错误。
pub fn write_text_file(path: &str, content: &str) -> Result<(), String> {
    ensure_parent_dir(path)?;
    fs::write(path, content).map_err(|err| err.to_string())
}

/// 写入二进制文件，自动创建父目录；失败转为 `String` 错误。
pub fn write_binary_file(path: &str, data: &[u8]) -> Result<(), String> {
    ensure_parent_dir(path)?;
    fs::write(path, data).map_err(|err| err.to_string())
}

/// 确保目标文件的父目录存在（递归创建）。
pub fn ensure_parent_dir(path: &str) -> Result<(), String> {
    if let Some(parent) = std::path::Path::new(path).parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent).map_err(|err| err.to_string())?;
        }
    }
    Ok(())
}

/// 递归扫描目录：返回全部文件（含子目录）的绝对路径。
pub fn scan_directory(path: &str) -> Result<Vec<String>, String> {
    let root = PathBuf::from(path);
    if !root.is_dir() {
        return Err(format!("路径不是目录: {path}"));
    }

    let mut result = Vec::new();
    let mut stack = vec![root];

    while let Some(current) = stack.pop() {
        let entries = fs::read_dir(&current).map_err(|err| err.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|err| err.to_string())?;
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else {
                result.push(path.to_string_lossy().to_string());
            }
        }
    }

    result.sort();
    Ok(result)
}
