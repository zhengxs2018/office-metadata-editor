use super::docx::DocumentMetadata;

pub const APPLICATION: &str = "PDF";

pub fn defaults(file_name: String, file_size: u64) -> DocumentMetadata {
    DocumentMetadata::new(file_name, file_size, "pdf", APPLICATION)
}
