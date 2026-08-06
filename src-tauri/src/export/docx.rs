use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DocumentProperties {
    pub title: String,
    pub subject: String,
    pub creator: String,
    pub keywords: String,
    pub description: String,
    pub last_modified_by: String,
    pub revision: String,
    pub created: String,
    pub modified: String,
    pub category: String,
    pub content_status: String,
    pub version: String,
    pub language: String,
    pub identifier: String,
    pub source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CoreProperties {
    pub dc_title: String,
    pub dc_subject: String,
    pub dc_creator: String,
    pub dc_description: String,
    pub dc_keywords: String,
    pub dc_language: String,
    pub dc_identifier: String,
    pub dc_source: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppProperties {
    pub application: String,
    pub app_version: String,
    pub company: String,
    pub manager: String,
    pub template: String,
    pub total_time: String,
    pub pages: u32,
    pub words: u32,
    pub characters: u32,
    pub characters_with_spaces: u32,
    pub paragraphs: u32,
    pub lines: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DocumentMetadata {
    pub file_name: String,
    pub file_type: String,
    pub file_size: u64,
    pub document_properties: DocumentProperties,
    pub core_properties: CoreProperties,
    pub app_properties: AppProperties,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSaveResultItem {
    pub file_path: String,
    pub success: bool,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchSaveRequestItem {
    pub file_path: String,
    pub metadata: DocumentMetadata,
}

impl DocumentProperties {
    pub fn empty() -> Self {
        Self {
            title: String::new(),
            subject: String::new(),
            creator: String::new(),
            keywords: String::new(),
            description: String::new(),
            last_modified_by: String::new(),
            revision: String::new(),
            created: String::new(),
            modified: String::new(),
            category: String::new(),
            content_status: String::new(),
            version: String::new(),
            language: "zh-CN".to_string(),
            identifier: String::new(),
            source: String::new(),
        }
    }
}

impl CoreProperties {
    pub fn empty() -> Self {
        Self {
            dc_title: String::new(),
            dc_subject: String::new(),
            dc_creator: String::new(),
            dc_description: String::new(),
            dc_keywords: String::new(),
            dc_language: "zh-CN".to_string(),
            dc_identifier: String::new(),
            dc_source: String::new(),
        }
    }
}

impl AppProperties {
    pub fn for_application(application: &str) -> Self {
        Self {
            application: application.to_string(),
            app_version: String::new(),
            company: String::new(),
            manager: String::new(),
            template: String::new(),
            total_time: "0".to_string(),
            pages: 0,
            words: 0,
            characters: 0,
            characters_with_spaces: 0,
            paragraphs: 0,
            lines: 0,
        }
    }
}

impl DocumentMetadata {
    pub fn new(file_name: String, file_size: u64, file_type: &str, application: &str) -> Self {
        Self {
            file_name,
            file_type: file_type.to_string(),
            file_size,
            document_properties: DocumentProperties::empty(),
            core_properties: CoreProperties::empty(),
            app_properties: AppProperties::for_application(application),
        }
    }

    pub fn defaults(file_name: String, file_size: u64) -> Self {
        Self::new(file_name, file_size, "docx", "Microsoft Office Word")
    }
}
