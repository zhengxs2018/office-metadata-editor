use serde::{Deserialize, Serialize};

pub const SCHEMA_VERSION: u32 = 1;

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompareFileInput {
    pub id: String,
    pub company_id: String,
    pub company_name: String,
    pub file_name: String,
    #[serde(default)]
    pub creator: String,
    #[serde(default)]
    pub last_modified_by: String,
    #[serde(default)]
    pub app_company: String,
    #[serde(default)]
    pub manager: String,
    #[serde(default)]
    pub template: String,
    #[serde(default)]
    pub application: String,
    #[serde(default)]
    pub app_version: String,
    #[serde(default)]
    pub created: String,
    #[serde(default)]
    pub modified: String,
    #[serde(default)]
    pub revision: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub subject: String,
    #[serde(default)]
    pub keywords: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub category: String,
    #[serde(default)]
    pub content_status: String,
    #[serde(default)]
    pub version: String,
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub total_time: String,
    // 隐藏信息 / 痕迹提取（见 extract_hidden.rs），用于补充「同一主体」证据。
    #[serde(default)]
    pub annotation_authors: Vec<String>,
    #[serde(default)]
    pub revision_authors: Vec<String>,
    #[serde(default)]
    pub xmp_creators: Vec<String>,
    #[serde(default)]
    pub has_hidden_markers: bool,
}

/// 单条规则的运行时覆盖，供规则产品化（白名单 / 灵敏度）预留接口使用。
/// 当前仅由内核消费，UI 暂未暴露。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RuleOverride {
    #[serde(default)]
    pub enabled: Option<bool>,
    #[serde(default)]
    pub level: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompareOptions {
    pub close_timestamp_minutes: Option<i64>,
    pub fuzzy_match_floor: Option<f64>,
    // 规则产品化预留：rule_id -> 覆盖（启用状态 / 风险等级）。UI 后续可暴露。
    #[serde(default)]
    pub rule_overrides: Option<std::collections::BTreeMap<String, RuleOverride>>,
}

impl CompareOptions {
    pub fn close_timestamp_minutes(&self) -> i64 {
        self.close_timestamp_minutes.unwrap_or(10).max(0)
    }

    pub fn fuzzy_match_floor(&self) -> f64 {
        self.fuzzy_match_floor.unwrap_or(0.3).clamp(0.0, 1.0)
    }

    /// 返回规则是否启用（默认启用）。
    pub fn rule_enabled(&self, rule_id: &str) -> bool {
        self.rule_overrides
            .as_ref()
            .and_then(|m| m.get(rule_id))
            .and_then(|o| o.enabled)
            .unwrap_or(true)
    }

    /// 返回规则的覆盖等级（若有）。
    pub fn rule_level_override(&self, rule_id: &str) -> Option<RiskLevel> {
        self.rule_overrides
            .as_ref()
            .and_then(|m| m.get(rule_id))
            .and_then(|o| o.level.as_deref())
            .and_then(|s| match s {
                "high" => Some(RiskLevel::High),
                "medium" => Some(RiskLevel::Medium),
                "low" => Some(RiskLevel::Low),
                _ => None,
            })
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanySnapshot {
    pub company_id: String,
    pub company_name: String,
    pub file_count: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupCell {
    pub company_id: String,
    pub doc_id: Option<String>,
    pub file_name: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum DiffState {
    Identical,
    Similar,
    Conflict,
    Missing,
    Ignored,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum FieldTier {
    Risk,
    Display,
    Ignored,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldValue {
    pub company_id: String,
    pub doc_id: Option<String>,
    pub raw: Option<String>,
    pub normalized: Option<String>,
    pub is_empty: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FieldDiff {
    pub field_key: String,
    pub field_label: String,
    pub tier: FieldTier,
    pub state: DiffState,
    pub values: Vec<FieldValue>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum MatchSource {
    Exact,
    Normalized,
    Fuzzy,
    Manual,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AlignedGroup {
    pub group_id: String,
    pub label: String,
    pub cells: Vec<GroupCell>,
    pub diffs: Vec<FieldDiff>,
    pub risk_level: Option<RiskLevel>,
    pub diff_count: u32,
    pub missing_count: u32,
    pub match_confidence: f64,
    pub match_source: MatchSource,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UnmatchedFile {
    pub doc_id: String,
    pub company_id: String,
    pub file_name: String,
    pub reason: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RiskLevel {
    Low,
    Medium,
    High,
}

impl RiskLevel {
    pub fn as_str(self) -> &'static str {
        match self {
            RiskLevel::Low => "low",
            RiskLevel::Medium => "medium",
            RiskLevel::High => "high",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum EvidenceKind {
    SameEntity,
    SameOrigin,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FindingRef {
    pub company_id: String,
    pub doc_id: String,
    pub field_key: String,
    pub raw: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RiskFinding {
    pub finding_id: String,
    pub rule_id: String,
    pub level: RiskLevel,
    pub evidence_kind: EvidenceKind,
    pub weight: f64,
    pub problem: String,
    pub group_id: Option<String>,
    pub refs: Vec<FindingRef>,
    pub field_keys: Vec<String>,
    pub value: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entity_key: Option<String>,
    pub score: f64,
    pub match_tag: String,
    pub explain: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompanyPairRisk {
    pub pair_id: String,
    pub company_a: String,
    pub company_b: String,
    pub level: RiskLevel,
    pub pair_score: f64,
    pub rule_ids: Vec<String>,
    pub finding_ids: Vec<String>,
    pub summary: String,
}

#[derive(Debug, Clone, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompareStats {
    pub company_count: u32,
    pub file_count: u32,
    pub group_count: u32,
    pub unmatched_count: u32,
    pub high_count: u32,
    pub medium_count: u32,
    pub low_count: u32,
    pub diff_field_count: u32,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CompareResult {
    pub schema_version: u32,
    pub dimension: String,
    pub disclaimer: String,
    pub companies: Vec<CompanySnapshot>,
    pub groups: Vec<AlignedGroup>,
    pub unmatched: Vec<UnmatchedFile>,
    pub findings: Vec<RiskFinding>,
    pub pair_risks: Vec<CompanyPairRisk>,
    pub stats: CompareStats,
}

pub const DISCLAIMER: &str = "本报告基于文档元数据自动分析，所列项均为辅助线索，不构成串通投标的认定结论。\n\n元数据可能因模板复用、计算机名默认值、软件预填等原因产生偶然一致。\n\n依据《招标投标法实施条例》第四十条，认定串通投标需结合投标文件内容、报价规律、硬件信息（MAC/硬盘序列号/IP）等证据综合判断，并由有权机关作出。";
