pub mod compare;
pub mod docx;
pub mod pdf;
pub mod xlsx;

pub use crate::export::{BatchSaveRequestItem, BatchSaveResultItem, DocumentMetadata};

/// 提取隐藏信息 / 编辑痕迹并回填到 metadata（供对比规则使用）。
pub use compare::extract_hidden::extract_hidden_metadata;
