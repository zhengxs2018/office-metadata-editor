use std::fs;
use std::io::{Cursor, Read, Write};
use std::path::PathBuf;

use xmltree::{Element, XMLNode};
use zip::{write::SimpleFileOptions, ZipArchive, ZipWriter};

use crate::export::{BatchSaveRequestItem, BatchSaveResultItem, DocumentMetadata};

pub fn parse_ooxml_metadata(
    file_name: String,
    file_size: u64,
    file_bytes: Vec<u8>,
) -> Result<DocumentMetadata, String> {
    let mut metadata = DocumentMetadata::defaults(file_name, file_size);

    let mut archive = ZipArchive::new(Cursor::new(file_bytes)).map_err(|err| err.to_string())?;

    if let Some(core_xml) = read_zip_entry_as_string(&mut archive, "docProps/core.xml")? {
        apply_core_properties(&mut metadata, &core_xml)?;
    }

    if let Some(app_xml) = read_zip_entry_as_string(&mut archive, "docProps/app.xml")? {
        apply_app_properties(&mut metadata, &app_xml)?;
    }

    Ok(metadata)
}

pub fn build_updated_ooxml_bytes(
    file_bytes: Vec<u8>,
    metadata: &DocumentMetadata,
) -> Result<Vec<u8>, String> {
    let mut source_archive =
        ZipArchive::new(Cursor::new(file_bytes.clone())).map_err(|err| err.to_string())?;

    let source_core_xml = read_zip_entry_as_string(&mut source_archive, "docProps/core.xml")?;
    let source_app_xml = read_zip_entry_as_string(&mut source_archive, "docProps/app.xml")?;

    let updated_core_xml = write_core_properties(source_core_xml.as_deref(), metadata)?;
    let updated_app_xml = write_app_properties(source_app_xml.as_deref(), metadata)?;

    let mut output = Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(&mut output);

    let mut archive = ZipArchive::new(Cursor::new(file_bytes)).map_err(|err| err.to_string())?;

    let mut has_core = false;
    let mut has_app = false;

    for index in 0..archive.len() {
        let mut file = archive.by_index(index).map_err(|err| err.to_string())?;
        let entry_name = file.name().to_string();

        if file.is_dir() {
            writer
                .add_directory(entry_name, SimpleFileOptions::default())
                .map_err(|err| err.to_string())?;
            continue;
        }

        let options = SimpleFileOptions::default().compression_method(file.compression());
        writer
            .start_file(&entry_name, options)
            .map_err(|err| err.to_string())?;

        if entry_name == "docProps/core.xml" {
            writer
                .write_all(updated_core_xml.as_bytes())
                .map_err(|err| err.to_string())?;
            has_core = true;
        } else if entry_name == "docProps/app.xml" {
            writer
                .write_all(updated_app_xml.as_bytes())
                .map_err(|err| err.to_string())?;
            has_app = true;
        } else {
            std::io::copy(&mut file, &mut writer).map_err(|err| err.to_string())?;
        }
    }

    if !has_core {
        writer
            .start_file("docProps/core.xml", SimpleFileOptions::default())
            .map_err(|err| err.to_string())?;
        writer
            .write_all(updated_core_xml.as_bytes())
            .map_err(|err| err.to_string())?;
    }

    if !has_app {
        writer
            .start_file("docProps/app.xml", SimpleFileOptions::default())
            .map_err(|err| err.to_string())?;
        writer
            .write_all(updated_app_xml.as_bytes())
            .map_err(|err| err.to_string())?;
    }

    writer.finish().map_err(|err| err.to_string())?;
    Ok(output.into_inner())
}

/// 清空文档级自定义元数据后写回（抹除作者/公司等痕迹，仅对 docProps 生效）。
pub fn process_single_batch_clear(file_path: &str) -> Result<(), String> {
    let file_bytes = fs::read(file_path).map_err(|err| err.to_string())?;

    let mut archive =
        ZipArchive::new(Cursor::new(file_bytes.clone())).map_err(|err| err.to_string())?;
    let core_xml = read_zip_entry_as_string(&mut archive, "docProps/core.xml")?;
    let app_xml = read_zip_entry_as_string(&mut archive, "docProps/app.xml")?;

    let cleared = DocumentMetadata::defaults(String::new(), 0);
    let updated_core = write_core_properties(core_xml.as_deref(), &cleared)?;
    let updated_app = write_app_properties(app_xml.as_deref(), &cleared)?;

    let mut output = Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(&mut output);

    let mut src = ZipArchive::new(Cursor::new(file_bytes)).map_err(|err| err.to_string())?;
    for index in 0..src.len() {
        let mut file = src.by_index(index).map_err(|err| err.to_string())?;
        let entry_name = file.name().to_string();

        if file.is_dir() {
            writer
                .add_directory(entry_name, SimpleFileOptions::default())
                .map_err(|err| err.to_string())?;
            continue;
        }

        let options = SimpleFileOptions::default().compression_method(file.compression());
        writer
            .start_file(&entry_name, options)
            .map_err(|err| err.to_string())?;

        if entry_name == "docProps/core.xml" {
            writer
                .write_all(updated_core.as_bytes())
                .map_err(|err| err.to_string())?;
        } else if entry_name == "docProps/app.xml" {
            writer
                .write_all(updated_app.as_bytes())
                .map_err(|err| err.to_string())?;
        } else {
            std::io::copy(&mut file, &mut writer).map_err(|err| err.to_string())?;
        }
    }

    writer.finish().map_err(|err| err.to_string())?;
    fs::write(file_path, output.into_inner()).map_err(|err| err.to_string())
}

pub fn parse_metadata_from_path(file_path: String) -> Result<DocumentMetadata, String> {
    let path = PathBuf::from(&file_path);
    let file_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("document.docx")
        .to_string();
    let file_size = fs::metadata(&path).map_err(|err| err.to_string())?.len();
    let file_bytes = fs::read(&path).map_err(|err| err.to_string())?;
    parse_ooxml_metadata(file_name, file_size, file_bytes)
}

pub fn write_metadata_to_path(file_path: &str, metadata: &DocumentMetadata) -> Result<(), String> {
    let file_bytes = fs::read(file_path).map_err(|err| err.to_string())?;
    let updated = build_updated_ooxml_bytes(file_bytes, metadata)?;
    fs::write(file_path, updated).map_err(|err| err.to_string())
}

fn read_zip_entry_as_string(
    archive: &mut ZipArchive<Cursor<Vec<u8>>>,
    path: &str,
) -> Result<Option<String>, String> {
    let mut file = match archive.by_name(path) {
        Ok(file) => file,
        Err(_) => return Ok(None),
    };

    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e| e.to_string())?;

    let content = String::from_utf8(buffer.clone())
        .unwrap_or_else(|_| String::from_utf8_lossy(&buffer).to_string());

    Ok(Some(content))
}

fn parse_xml_or_default(xml: Option<&str>, default_xml: &str) -> Result<Element, String> {
    let content = xml.unwrap_or(default_xml);
    Element::parse(content.as_bytes()).map_err(|err| err.to_string())
}

fn write_core_properties(
    source_xml: Option<&str>,
    metadata: &DocumentMetadata,
) -> Result<String, String> {
    let mut root = parse_xml_or_default(source_xml, DEFAULT_CORE_XML)?;

    set_child_text(&mut root, "dc:title", &metadata.document_properties.title);
    set_child_text(
        &mut root,
        "dc:subject",
        &metadata.document_properties.subject,
    );
    set_child_text(
        &mut root,
        "dc:creator",
        &metadata.document_properties.creator,
    );
    set_child_text(
        &mut root,
        "cp:keywords",
        &metadata.document_properties.keywords,
    );
    set_child_text(
        &mut root,
        "dc:description",
        &metadata.document_properties.description,
    );
    set_child_text(
        &mut root,
        "cp:lastModifiedBy",
        &metadata.document_properties.last_modified_by,
    );
    set_child_text(
        &mut root,
        "cp:category",
        &metadata.document_properties.category,
    );
    set_child_text(
        &mut root,
        "cp:contentStatus",
        &metadata.document_properties.content_status,
    );
    set_child_text(
        &mut root,
        "cp:version",
        &metadata.document_properties.version,
    );
    set_child_text(
        &mut root,
        "dc:language",
        &metadata.document_properties.language,
    );
    set_child_text(
        &mut root,
        "dc:identifier",
        &metadata.document_properties.identifier,
    );
    set_child_text(&mut root, "dc:source", &metadata.document_properties.source);

    if !metadata.document_properties.revision.is_empty() {
        set_child_text(
            &mut root,
            "cp:revision",
            &metadata.document_properties.revision,
        );
    }

    if !metadata.document_properties.created.is_empty() {
        set_child_text(
            &mut root,
            "dcterms:created",
            &metadata.document_properties.created,
        );
    }

    if !metadata.document_properties.modified.is_empty() {
        set_child_text(
            &mut root,
            "dcterms:modified",
            &metadata.document_properties.modified,
        );
    }

    let mut out = Vec::new();
    root.write(&mut out).map_err(|err| err.to_string())?;
    String::from_utf8(out).map_err(|err| err.to_string())
}

fn write_app_properties(
    source_xml: Option<&str>,
    metadata: &DocumentMetadata,
) -> Result<String, String> {
    let mut root = parse_xml_or_default(source_xml, DEFAULT_APP_XML)?;

    set_child_text(
        &mut root,
        "Application",
        &metadata.app_properties.application,
    );
    set_child_text(
        &mut root,
        "AppVersion",
        &metadata.app_properties.app_version,
    );
    set_child_text(&mut root, "Company", &metadata.app_properties.company);
    set_child_text(&mut root, "Manager", &metadata.app_properties.manager);
    set_child_text(&mut root, "Template", &metadata.app_properties.template);
    set_child_text(&mut root, "TotalTime", &metadata.app_properties.total_time);
    set_child_text(
        &mut root,
        "Pages",
        &metadata.app_properties.pages.to_string(),
    );
    set_child_text(
        &mut root,
        "Words",
        &metadata.app_properties.words.to_string(),
    );
    set_child_text(
        &mut root,
        "Characters",
        &metadata.app_properties.characters.to_string(),
    );
    set_child_text(
        &mut root,
        "CharactersWithSpaces",
        &metadata.app_properties.characters_with_spaces.to_string(),
    );
    set_child_text(
        &mut root,
        "Paragraphs",
        &metadata.app_properties.paragraphs.to_string(),
    );
    set_child_text(
        &mut root,
        "Lines",
        &metadata.app_properties.lines.to_string(),
    );

    let mut out = Vec::new();
    root.write(&mut out).map_err(|err| err.to_string())?;
    String::from_utf8(out).map_err(|err| err.to_string())
}

fn apply_core_properties(metadata: &mut DocumentMetadata, core_xml: &str) -> Result<(), String> {
    let root = Element::parse(core_xml.as_bytes()).map_err(|err| err.to_string())?;

    let title = get_child_text(&root, &["dc:title", "title"]);
    let subject = get_child_text(&root, &["dc:subject", "subject"]);
    let creator = get_child_text(&root, &["dc:creator", "creator"]);
    let keywords = get_child_text(&root, &["cp:keywords", "keywords"]);
    let description = get_child_text(&root, &["dc:description", "description"]);
    let language = get_child_text(&root, &["dc:language", "language"]);
    let identifier = get_child_text(&root, &["dc:identifier", "identifier"]);
    let source = get_child_text(&root, &["dc:source", "source"]);

    metadata.document_properties.title = title.clone();
    metadata.document_properties.subject = subject.clone();
    metadata.document_properties.creator = creator.clone();
    metadata.document_properties.keywords = keywords.clone();
    metadata.document_properties.description = description.clone();
    metadata.document_properties.last_modified_by =
        get_child_text(&root, &["cp:lastModifiedBy", "lastModifiedBy"]);
    metadata.document_properties.revision = get_child_text(&root, &["cp:revision", "revision"]);
    metadata.document_properties.created = get_child_text(&root, &["dcterms:created", "created"]);
    metadata.document_properties.modified =
        get_child_text(&root, &["dcterms:modified", "modified"]);
    metadata.document_properties.category = get_child_text(&root, &["cp:category", "category"]);
    metadata.document_properties.content_status =
        get_child_text(&root, &["cp:contentStatus", "contentStatus"]);
    metadata.document_properties.version = get_child_text(&root, &["cp:version", "version"]);
    metadata.document_properties.language = language.clone();
    metadata.document_properties.identifier = identifier.clone();
    metadata.document_properties.source = source.clone();

    metadata.core_properties.dc_title = title;
    metadata.core_properties.dc_subject = subject;
    metadata.core_properties.dc_creator = creator;
    metadata.core_properties.dc_description = description;
    metadata.core_properties.dc_keywords = keywords;
    metadata.core_properties.dc_language = language;
    metadata.core_properties.dc_identifier = identifier;
    metadata.core_properties.dc_source = source;

    Ok(())
}

fn apply_app_properties(metadata: &mut DocumentMetadata, app_xml: &str) -> Result<(), String> {
    let root = Element::parse(app_xml.as_bytes()).map_err(|err| err.to_string())?;

    metadata.app_properties.application = get_child_text(&root, &["Application"]);
    metadata.app_properties.app_version = get_child_text(&root, &["AppVersion"]);
    metadata.app_properties.company = get_child_text(&root, &["Company"]);
    metadata.app_properties.manager = get_child_text(&root, &["Manager"]);
    metadata.app_properties.template = get_child_text(&root, &["Template"]);
    metadata.app_properties.total_time = get_child_text(&root, &["TotalTime"]);

    metadata.app_properties.pages = parse_u32(&get_child_text(&root, &["Pages"]));
    metadata.app_properties.words = parse_u32(&get_child_text(&root, &["Words"]));
    metadata.app_properties.characters = parse_u32(&get_child_text(&root, &["Characters"]));
    metadata.app_properties.characters_with_spaces =
        parse_u32(&get_child_text(&root, &["CharactersWithSpaces"]));
    metadata.app_properties.paragraphs = parse_u32(&get_child_text(&root, &["Paragraphs"]));
    metadata.app_properties.lines = parse_u32(&get_child_text(&root, &["Lines"]));

    Ok(())
}

fn get_child_text(root: &Element, names: &[&str]) -> String {
    for node in &root.children {
        if let XMLNode::Element(child) = node {
            if names
                .iter()
                .any(|name| element_name_matches(&child.name, name))
            {
                return child
                    .get_text()
                    .map(|value| value.to_string())
                    .unwrap_or_default();
            }
        }
    }

    String::new()
}

fn element_name_matches(element_name: &str, target_name: &str) -> bool {
    if element_name == target_name {
        return true;
    }

    let target_local = target_name.rsplit(':').next().unwrap_or(target_name);
    let element_local = element_name.rsplit(':').next().unwrap_or(element_name);
    element_local == target_local
}

fn set_child_text(root: &mut Element, name: &str, value: &str) {
    let mut first_match_index: Option<usize> = None;

    for index in 0..root.children.len() {
        if let XMLNode::Element(child) = &mut root.children[index] {
            if element_name_matches(&child.name, name) && first_match_index.is_none() {
                child.children.clear();
                child.children.push(XMLNode::Text(value.to_string()));
                first_match_index = Some(index);
            }
        }
    }

    if let Some(keep_index) = first_match_index {
        let mut index = root.children.len();
        while index > 0 {
            index -= 1;
            if index == keep_index {
                continue;
            }

            let should_remove = matches!(
                root.children.get(index),
                Some(XMLNode::Element(child)) if element_name_matches(&child.name, name)
            );

            if should_remove {
                root.children.remove(index);
            }
        }
        return;
    }

    let mut element = Element::new(name);
    element.children.push(XMLNode::Text(value.to_string()));
    root.children.push(XMLNode::Element(element));
}

fn parse_u32(input: &str) -> u32 {
    input.trim().parse::<u32>().unwrap_or(0)
}

const DEFAULT_CORE_XML: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title></dc:title>
  <dc:subject></dc:subject>
  <dc:creator></dc:creator>
  <cp:keywords></cp:keywords>
  <dc:description></dc:description>
  <cp:lastModifiedBy></cp:lastModifiedBy>
  <cp:revision>1</cp:revision>
  <dcterms:created xsi:type="dcterms:W3CDTF"></dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF"></dcterms:modified>
  <cp:category></cp:category>
  <cp:contentStatus></cp:contentStatus>
  <cp:version></cp:version>
  <dc:language>zh-CN</dc:language>
  <dc:identifier></dc:identifier>
  <dc:source></dc:source>
</cp:coreProperties>
"#;

const DEFAULT_APP_XML: &str = r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>Microsoft Office Word</Application>
  <AppVersion></AppVersion>
  <Company></Company>
  <Manager></Manager>
  <Template></Template>
  <TotalTime>0</TotalTime>
  <Pages>0</Pages>
  <Words>0</Words>
  <Characters>0</Characters>
  <CharactersWithSpaces>0</CharactersWithSpaces>
  <Paragraphs>0</Paragraphs>
  <Lines>0</Lines>
</Properties>
"#;

/// 将元数据原地写回 docx 源文件（供 lib.rs 命令层调用；跨格式校验在命令层完成）。
pub fn save_docx_metadata_to_source(
    file_path: String,
    metadata: DocumentMetadata,
) -> Result<String, String> {
    let file_bytes = fs::read(&file_path).map_err(|err| err.to_string())?;
    let updated_file_bytes = build_updated_ooxml_bytes(file_bytes, &metadata)?;
    fs::write(&file_path, updated_file_bytes).map_err(|err| err.to_string())?;
    Ok(file_path)
}
