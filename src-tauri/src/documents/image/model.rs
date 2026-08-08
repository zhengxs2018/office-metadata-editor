use serde::{Deserialize, Serialize};

/// 图片 EXIF 提取结果，独立于 `DocumentMetadata`，
/// 因相机参数、GPS、缩略图等数据形态与 Office 文档元数据差异显著。
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ImageExif {
    pub file_name: String,
    pub file_type: String,
    pub file_size: u64,
    #[serde(default)]
    pub camera: CameraInfo,
    #[serde(default)]
    pub capture: CaptureInfo,
    #[serde(default)]
    pub gps: Option<GpsInfo>,
    #[serde(default)]
    pub thumbnail_present: bool,
    /// 原始 tag 级清单，供取证审计与比对指纹使用。
    #[serde(default)]
    pub raw_fields: Vec<ExifField>,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct CameraInfo {
    pub make: String,
    pub model: String,
    pub lens_model: String,
    pub software: String,
    /// 机身序列号，鉴别力强于机型，比对时为高价值指纹。
    pub serial_number: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct CaptureInfo {
    pub date_time_original: String,
    pub exposure_time: String,
    pub f_number: String,
    pub iso: String,
    pub focal_length: String,
    pub orientation: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct GpsInfo {
    pub latitude: f64,
    pub longitude: f64,
    #[serde(default)]
    pub altitude: Option<f64>,
    /// 预生成地图链接，前端直接打开，不前端拼接避免逻辑漂移。
    pub map_url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ExifField {
    pub tag: String,
    pub value: String,
}
