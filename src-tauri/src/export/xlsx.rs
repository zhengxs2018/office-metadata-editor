use super::docx::DocumentMetadata;

pub const APPLICATION: &str = "Microsoft Excel";
pub const TEMPLATE: &str = "Book.xltx";

pub fn defaults(file_name: String, file_size: u64) -> DocumentMetadata {
    let mut metadata = DocumentMetadata::new(file_name, file_size, "xlsx", APPLICATION);
    metadata.app_properties.template = TEMPLATE.to_string();
    metadata
}
