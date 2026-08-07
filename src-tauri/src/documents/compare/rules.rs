use std::collections::BTreeMap;

use super::model::{
    CompanyPairRisk, CompareFileInput, CompareOptions, EvidenceKind, FindingRef, RiskFinding,
    RiskLevel,
};
use super::normalize::{
    check_person_match, normalize, normalize_template, parse_timestamp, similarity,
    timestamp_bucket_key, COMPANY_SIMILAR_THRESHOLD,
};

pub const HIGH_SCORE: f64 = 70.0;
pub const MEDIUM_SCORE: f64 = 35.0;

/// 比对模块的分类停用词词典（cspell 风格字典表）。
///
/// 把散落在各处的"遇到即忽略/排除"词组集中为可扩展的字典，
/// 配置键采用 vscode settings.json 风格（如 `compare.fields.stop_words`），
/// 便于后续在设置页面中以配置项形式呈现与编辑。
/// 新增一类停用词只需在此追加一项，引用方通过 [`stop_words_for`] 读取。
pub struct StopWordDict {
    /// 配置键，设置页面直接复用
    pub id: &'static str,
    /// 展示名，设置页面用
    pub label: &'static str,
    /// 作用域：字段级归一化 / 目录级识别
    pub scope: &'static str,
    /// 停用词词组（小写存储，匹配时忽略大小写）
    pub words: &'static [&'static str],
}

/// 分类停用词词典表。
pub const STOP_WORD_DICTS: &[StopWordDict] = &[
    StopWordDict {
        id: "compare.fields.stop_words",
        label: "字段归一化停用词",
        scope: "field",
        words: &[
            "",
            "admin",
            "administrator",
            "user",
            "users",
            "用户",
            "null",
            "none",
            "n/a",
            "na",
            "未知",
            "无",
            "office",
            "microsoftoffice",
            "wps",
            "wpsoffice",
            "microsoft",
            "windows",
            "lenovo",
            "dell",
            "hp",
            "asus",
            "acer",
            "pc",
            "test",
            "temp",
            "default",
            "owner",
            "guest",
            "author",
            "作者",
        ],
    },
    StopWordDict {
        id: "compare.fields.template",
        label: "通用模板名",
        scope: "field",
        words: &[
            "normal.dotm",
            "normal.dot",
            "normal.dotx",
            "normal",
            "book.xltx",
            "book.xlt",
            "",
        ],
    },
];

/// 读取指定字典的停用词列表（已转为小写）。
pub fn stop_words_for(id: &str) -> &'static [&'static str] {
    STOP_WORD_DICTS
        .iter()
        .find(|d| d.id == id)
        .map(|d| d.words)
        .unwrap_or(&[])
}

struct RuleMeta {
    id: &'static str,
    kind: EvidenceKind,
    weight: f64,
    /// 单条线索自身的强度上限。即便所属公司对整体升为 high，
    /// 该条线索展示级别也不会超过此上限，避免弱信号被"蹭"成强线索。
    max_level: RiskLevel,
}

const R_SAME_PERSON: RuleMeta = RuleMeta {
    id: "SAME_PERSON",
    kind: EvidenceKind::SameEntity,
    weight: 50.0,
    max_level: RiskLevel::High,
};
const R_SAME_MANAGER: RuleMeta = RuleMeta {
    id: "SAME_MANAGER",
    kind: EvidenceKind::SameEntity,
    weight: 40.0,
    max_level: RiskLevel::High,
};
const R_SAME_APP_COMPANY: RuleMeta = RuleMeta {
    id: "SAME_APP_COMPANY",
    kind: EvidenceKind::SameEntity,
    weight: 35.0,
    max_level: RiskLevel::High,
};
const R_SIMILAR_APP_COMPANY: RuleMeta = RuleMeta {
    id: "SIMILAR_APP_COMPANY",
    kind: EvidenceKind::SameEntity,
    weight: 20.0,
    max_level: RiskLevel::Medium,
};
const R_SAME_TEMPLATE: RuleMeta = RuleMeta {
    id: "SAME_TEMPLATE",
    kind: EvidenceKind::SameOrigin,
    weight: 30.0,
    max_level: RiskLevel::High,
};
const R_CLOSE_TIMESTAMP: RuleMeta = RuleMeta {
    id: "CLOSE_TIMESTAMP",
    kind: EvidenceKind::SameOrigin,
    weight: 25.0,
    max_level: RiskLevel::Medium,
};
/// 办公软件版本在同一时期高度趋同，同版本几乎是常态而非异常，
/// 鉴别力极弱：权重最低且**恒为弱线索**，仅作辅助参考。
const R_SAME_APP_FINGERPRINT: RuleMeta = RuleMeta {
    id: "SAME_APP_FINGERPRINT",
    kind: EvidenceKind::SameOrigin,
    weight: 5.0,
    max_level: RiskLevel::Low,
};
/// 隐藏信息 / 痕迹交叉：两文件的批注作者或修订作者集合有交集，
/// 指向同一人对多份文档做过编辑或批注，是「同一主体」的补充证据。
/// 属中等强度，需与其他线索交叉才能升为 high（受 max_level 约束）。
const R_REVISION_TRACES: RuleMeta = RuleMeta {
    id: "REVISION_TRACES",
    kind: EvidenceKind::SameEntity,
    weight: 40.0,
    max_level: RiskLevel::Medium,
};

const ALL_RULES: [&RuleMeta; 8] = [
    &R_SAME_PERSON,
    &R_SAME_MANAGER,
    &R_SAME_APP_COMPANY,
    &R_SIMILAR_APP_COMPANY,
    &R_SAME_TEMPLATE,
    &R_CLOSE_TIMESTAMP,
    &R_SAME_APP_FINGERPRINT,
    &R_REVISION_TRACES,
];

/// 单条规则的强度上限；未知规则不设限。
fn rule_max_level(rule_id: &str) -> RiskLevel {
    ALL_RULES
        .iter()
        .find(|m| m.id == rule_id)
        .map(|m| m.max_level)
        .unwrap_or(RiskLevel::High)
}

fn pair_key(a: &str, b: &str) -> (String, String) {
    if a <= b {
        (a.to_string(), b.to_string())
    } else {
        (b.to_string(), a.to_string())
    }
}

struct Ctx<'a> {
    files: &'a [CompareFileInput],
    group_of: &'a BTreeMap<String, String>,
    options: &'a CompareOptions,
    findings: Vec<RiskFinding>,
    seq: usize,
}

impl<'a> Ctx<'a> {
    fn emit(
        &mut self,
        meta: &RuleMeta,
        i: usize,
        j: usize,
        field_a: &str,
        field_b: &str,
        value: String,
        entity_key: Option<String>,
        score: f64,
        match_tag: &str,
        problem: String,
        explain: String,
    ) {
        // 规则产品化预留：被禁用的规则不产出线索。
        if !self.options.rule_enabled(meta.id) {
            return;
        }
        self.seq += 1;
        let a = &self.files[i];
        let b = &self.files[j];
        let group_id = self
            .group_of
            .get(&a.id)
            .filter(|g| self.group_of.get(&b.id) == Some(*g))
            .cloned();
        let mut field_keys = vec![field_a.to_string()];
        if field_b != field_a {
            field_keys.push(field_b.to_string());
        }
        let mut level = meta.max_level;
        if let Some(ov) = self.options.rule_level_override(meta.id) {
            level = ov.min(meta.max_level);
        }
        self.findings.push(RiskFinding {
            finding_id: format!("f{:04}", self.seq),
            rule_id: meta.id.to_string(),
            level,
            evidence_kind: meta.kind,
            weight: meta.weight,
            problem,
            group_id,
            refs: vec![
                FindingRef {
                    company_id: a.company_id.clone(),
                    doc_id: a.id.clone(),
                    field_key: field_a.to_string(),
                    raw: raw_field(a, field_a),
                },
                FindingRef {
                    company_id: b.company_id.clone(),
                    doc_id: b.id.clone(),
                    field_key: field_b.to_string(),
                    raw: raw_field(b, field_b),
                },
            ],
            field_keys,
            value,
            entity_key,
            score,
            match_tag: match_tag.to_string(),
            explain,
        });
    }
}

/// 跨公司两两比对，产出逐条线索 + 按公司对聚合的证据链评分。
pub fn evaluate(
    files: &[CompareFileInput],
    group_of: &BTreeMap<String, String>,
    options: &CompareOptions,
) -> (Vec<RiskFinding>, Vec<CompanyPairRisk>) {
    let mut ctx = Ctx {
        files,
        group_of,
        options,
        findings: Vec::new(),
        seq: 0,
    };
    let close_secs = options.close_timestamp_minutes() * 60;

    for i in 0..files.len() {
        for j in (i + 1)..files.len() {
            let (a, b) = (&files[i], &files[j]);
            if a.company_id == b.company_id {
                continue;
            }

            for (fa, va) in [("creator", &a.creator), ("lastModifiedBy", &a.last_modified_by)] {
                for (fb, vb) in [("creator", &b.creator), ("lastModifiedBy", &b.last_modified_by)] {
                    if let Some((score, tag, entity_key)) = check_person_match(va, vb) {
                        ctx.emit(
                            &R_SAME_PERSON,
                            i,
                            j,
                            fa,
                            fb,
                            va.clone(),
                            Some(entity_key),
                            score,
                            tag,
                            format!("疑似同一人：{} / {}", va.trim(), vb.trim()),
                            format!(
                                "{} 的{}与 {} 的{}指向同一人（{tag}）",
                                a.company_name,
                                field_label(fa),
                                b.company_name,
                                field_label(fb)
                            ),
                        );
                    }
                }
            }

            if let (Some(na), Some(nb)) = (normalize(&a.manager), normalize(&b.manager)) {
                if na == nb {
                    ctx.emit(
                        &R_SAME_MANAGER,
                        i,
                        j,
                        "manager",
                        "manager",
                        a.manager.clone(),
                        Some(na.clone()),
                        1.0,
                        "EXACT",
                        format!("管理者相同：{}", a.manager.trim()),
                        "两家公司文档的管理者字段一致".to_string(),
                    );
                }
            }

            if let (Some(na), Some(nb)) = (normalize(&a.app_company), normalize(&b.app_company)) {
                if na == nb {
                    ctx.emit(
                        &R_SAME_APP_COMPANY,
                        i,
                        j,
                        "appCompany",
                        "appCompany",
                        a.app_company.clone(),
                        Some(na.clone()),
                        1.0,
                        "EXACT",
                        format!("公司标识相同：{}", a.app_company.trim()),
                        "两家公司文档的公司标识完全一致".to_string(),
                    );
                } else {
                    let sim = similarity(&na, &nb);
                    if sim >= COMPANY_SIMILAR_THRESHOLD {
                        let pair_key = if na <= nb {
                            format!("{na}|{nb}")
                        } else {
                            format!("{nb}|{na}")
                        };
                        ctx.emit(
                            &R_SIMILAR_APP_COMPANY,
                            i,
                            j,
                            "appCompany",
                            "appCompany",
                            a.app_company.clone(),
                            Some(pair_key),
                            sim,
                            "EDIT_SIM",
                            format!(
                                "公司标识相似：{} / {}",
                                a.app_company.trim(),
                                b.app_company.trim()
                            ),
                            format!("公司标识相似度 {:.0}%", sim * 100.0),
                        );
                    }
                }
            }

            if let (Some(ta), Some(tb)) =
                (normalize_template(&a.template), normalize_template(&b.template))
            {
                if ta == tb {
                    ctx.emit(
                        &R_SAME_TEMPLATE,
                        i,
                        j,
                        "template",
                        "template",
                        a.template.clone(),
                        Some(ta.clone()),
                        1.0,
                        "EXACT",
                        format!("使用相同非通用模板：{ta}"),
                        "两家公司文档基于同一自定义模板生成".to_string(),
                    );
                }
            }

            if close_secs > 0 {
                if let (Some(ca), Some(cb)) =
                    (parse_timestamp(&a.created), parse_timestamp(&b.created))
                {
                    let delta = (ca - cb).abs();
                    if delta <= close_secs {
                        let bucket_minutes = close_secs / 60;
                        let entity_key =
                            timestamp_bucket_key(&a.created, &b.created, bucket_minutes)
                                .unwrap_or_else(|| a.created.clone());
                        ctx.emit(
                            &R_CLOSE_TIMESTAMP,
                            i,
                            j,
                            "created",
                            "created",
                            a.created.clone(),
                            Some(entity_key),
                            1.0 - (delta as f64 / close_secs.max(1) as f64),
                            "TIME_NEAR",
                            format!("创建时间接近：相差 {} 分钟", delta / 60),
                            "两家公司文档创建时间高度接近，疑似同批次制作".to_string(),
                        );
                    }
                }
            }

            if let (Some(aa), Some(ab)) = (normalize(&a.application), normalize(&b.application)) {
                if aa == ab && !a.app_version.trim().is_empty() && a.app_version == b.app_version {
                    let fingerprint = format!("{} {}", a.application.trim(), a.app_version.trim());
                    ctx.emit(
                        &R_SAME_APP_FINGERPRINT,
                        i,
                        j,
                        "application",
                        "appVersion",
                        fingerprint.clone(),
                        Some(fingerprint),
                        1.0,
                        "EXACT",
                        format!(
                            "应用程序与版本完全一致：{} {}",
                            a.application.trim(),
                            a.app_version.trim()
                        ),
                        "弱信号：同版本软件较常见，仅作辅助参考".to_string(),
                    );
                }
            }

            // 隐藏信息 / 痕迹交叉：批注作者或修订作者集合有交集，指向同一人参与多份文档。
            let shared = shared_trace_authors(a, b);
            if !shared.is_empty() {
                let key = shared
                    .iter()
                    .map(|s| normalize(s).unwrap_or_default())
                    .filter(|s| !s.is_empty())
                    .collect::<Vec<_>>()
                    .join("|");
                ctx.emit(
                    &R_REVISION_TRACES,
                    i,
                    j,
                    "annotationAuthors",
                    "revisionAuthors",
                    shared.join("、"),
                    Some(key),
                    1.0,
                    "TRACE_OVERLAP",
                    format!("编辑/批注痕迹交集：{}", shared.join("、")),
                    format!(
                        "{} 与 {} 的文档存在共同编辑者或批注者（{}），疑似由同一人制作或审阅",
                        a.company_name,
                        b.company_name,
                        shared.join("、")
                    ),
                );
            }
        }
    }

    let pair_risks = aggregate(&mut ctx.findings, files);
    (ctx.findings, pair_risks)
}

fn field_label(key: &str) -> &'static str {
    match key {
        "creator" => "作者",
        "lastModifiedBy" => "最后修改者",
        "manager" => "管理者",
        "appCompany" => "公司标识",
        "template" => "模板",
        "application" => "应用程序",
        "appVersion" => "版本",
        "created" => "创建时间",
        "modified" => "修改时间",
        "annotationAuthors" => "批注作者",
        "revisionAuthors" => "修订作者",
        _ => "字段",
    }
}

fn raw_field(file: &CompareFileInput, key: &str) -> String {
    match key {
        "creator" => file.creator.clone(),
        "lastModifiedBy" => file.last_modified_by.clone(),
        "manager" => file.manager.clone(),
        "appCompany" => file.app_company.clone(),
        "template" => file.template.clone(),
        "application" => file.application.clone(),
        "appVersion" => file.app_version.clone(),
        "created" => file.created.clone(),
        "modified" => file.modified.clone(),
        _ => String::new(),
    }
}

/// 取两文件「编辑/批注痕迹作者」集合的交集，作为同一人参与的补充证据。
fn shared_trace_authors(a: &CompareFileInput, b: &CompareFileInput) -> Vec<String> {
    let collect = |f: &CompareFileInput| -> BTreeMap<String, ()> {
        let mut m = BTreeMap::new();
        for s in f
            .annotation_authors
            .iter()
            .chain(f.revision_authors.iter())
            .chain(f.xmp_creators.iter())
        {
            let Some(key) = normalize(s) else {
                continue;
            };
            if key.is_empty() || is_generic_author(&key) {
                continue;
            }
            m.insert(key, ());
        }
        m
    };
    let sa = collect(a);
    let sb = collect(b);
    sa.keys()
        .filter(|k| sb.contains_key(*k))
        .cloned()
        .collect()
}

/// 通用账户名不具鉴别力（与 author 停用词一致，但此处仅用于痕迹作者）。
fn is_generic_author(name: &str) -> bool {
    matches!(
        name,
        "administrator" | "admin" | "root" | "guest" | "user" | "system" | "owner"
    )
}

/// 证据链聚合：按公司对累加权重，多规则交叉才升到 high。
fn aggregate(findings: &mut [RiskFinding], files: &[CompareFileInput]) -> Vec<CompanyPairRisk> {
    let name_of: BTreeMap<&str, &str> = files
        .iter()
        .map(|f| (f.company_id.as_str(), f.company_name.as_str()))
        .collect();

    struct Acc {
        score: f64,
        rules: BTreeMap<String, ()>,
        findings: Vec<String>,
    }
    let mut acc: BTreeMap<(String, String), Acc> = BTreeMap::new();

    for f in findings.iter() {
        if f.refs.len() < 2 {
            continue;
        }
        let key = pair_key(&f.refs[0].company_id, &f.refs[1].company_id);
        let entry = acc.entry(key).or_insert_with(|| Acc {
            score: 0.0,
            rules: BTreeMap::new(),
            findings: Vec::new(),
        });
        entry.score += f.weight * f.score;
        entry.rules.insert(f.rule_id.clone(), ());
        entry.findings.push(f.finding_id.clone());
    }

    let mut pairs: Vec<CompanyPairRisk> = Vec::new();
    let mut level_of: BTreeMap<(String, String), RiskLevel> = BTreeMap::new();

    for ((a, b), data) in acc {
        let distinct = data.rules.len();
        let level = if data.score >= HIGH_SCORE && distinct >= 2 {
            RiskLevel::High
        } else if data.score >= MEDIUM_SCORE {
            RiskLevel::Medium
        } else {
            RiskLevel::Low
        };
        level_of.insert((a.clone(), b.clone()), level);

        let rule_ids: Vec<String> = data.rules.keys().cloned().collect();
        let name_a = name_of.get(a.as_str()).copied().unwrap_or(a.as_str()).to_string();
        let name_b = name_of.get(b.as_str()).copied().unwrap_or(b.as_str()).to_string();
        let summary = format!(
            "{name_a} 与 {name_b} 命中 {} 类线索，合计 {:.0} 分",
            rule_ids.len(),
            data.score
        );
        pairs.push(CompanyPairRisk {
            pair_id: format!("{a}__{b}"),
            company_a: a,
            company_b: b,
            level,
            pair_score: (data.score * 100.0).round() / 100.0,
            summary,
            rule_ids,
            finding_ids: data.findings,
        });
    }

    for f in findings.iter_mut() {
        if f.refs.len() < 2 {
            continue;
        }
        let key = pair_key(&f.refs[0].company_id, &f.refs[1].company_id);
        if let Some(level) = level_of.get(&key) {
            f.level = (*level).min(rule_max_level(&f.rule_id));
        }
    }

    pairs.sort_by(|x, y| {
        y.level
            .cmp(&x.level)
            .then(y.pair_score.total_cmp(&x.pair_score))
            .then(x.pair_id.cmp(&y.pair_id))
    });
    pairs
}

#[cfg(test)]
mod tests {
    use super::*;

    fn f(id: &str, company: &str, creator: &str) -> CompareFileInput {
        let mut file = base(id, company);
        file.creator = creator.to_string();
        file
    }

    fn base(id: &str, company: &str) -> CompareFileInput {
        CompareFileInput {
            id: id.to_string(),
            company_id: company.to_string(),
            company_name: format!("{company}公司"),
            file_name: "标书.docx".to_string(),
            creator: String::new(),
            last_modified_by: String::new(),
            app_company: String::new(),
            manager: String::new(),
            template: String::new(),
            application: String::new(),
            app_version: String::new(),
            created: String::new(),
            modified: String::new(),
            revision: String::new(),
            title: String::new(),
            subject: String::new(),
            keywords: String::new(),
            description: String::new(),
            category: String::new(),
            content_status: String::new(),
            version: String::new(),
            language: String::new(),
            total_time: String::new(),
            annotation_authors: Vec::new(),
            revision_authors: Vec::new(),
            xmp_creators: Vec::new(),
            has_hidden_markers: false,
        }
    }

    fn run(files: &[CompareFileInput]) -> (Vec<RiskFinding>, Vec<CompanyPairRisk>) {
        evaluate(files, &BTreeMap::new(), &CompareOptions::default())
    }

    #[test]
    fn same_author_alone_is_not_high() {
        let files = vec![f("1", "A", "张三"), f("2", "B", "张三")];
        let (findings, pairs) = run(&files);
        assert_eq!(findings.len(), 1);
        assert_eq!(pairs.len(), 1);
        assert_eq!(
            pairs[0].level,
            RiskLevel::Medium,
            "单一作者相同不得直接判为高风险（法规：不能仅凭作者相同认定串标）"
        );
    }

    #[test]
    fn crossed_evidence_escalates_to_high() {
        let mut a = f("1", "A", "张三");
        let mut b = f("2", "B", "张三");
        a.template = "投标专用.dotx".to_string();
        b.template = "投标专用.dotx".to_string();
        let (_, pairs) = run(&[a, b]);
        assert_eq!(pairs[0].level, RiskLevel::High);
        assert!(pairs[0].rule_ids.len() >= 2);
    }

    #[test]
    fn app_fingerprint_alone_stays_low() {
        let mut a = base("1", "A");
        let mut b = base("2", "B");
        a.application = "Microsoft Office Word".to_string();
        b.application = "Microsoft Office Word".to_string();
        a.app_version = "16.0000".to_string();
        b.app_version = "16.0000".to_string();
        let (findings, pairs) = run(&[a, b]);
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].rule_id, "SAME_APP_FINGERPRINT");
        assert_eq!(
            findings[0].level,
            RiskLevel::Low,
            "办公软件版本趋同是常态，单独命中只能是弱线索"
        );
        assert_eq!(pairs[0].level, RiskLevel::Low);
    }

    #[test]
    fn app_fingerprint_never_inherits_high_from_pair() {
        let mut a = f("1", "A", "张三");
        let mut b = f("2", "B", "张三");
        a.template = "投标专用.dotx".to_string();
        b.template = "投标专用.dotx".to_string();
        a.application = "Microsoft Office Word".to_string();
        b.application = "Microsoft Office Word".to_string();
        a.app_version = "16.0000".to_string();
        b.app_version = "16.0000".to_string();

        let (findings, pairs) = run(&[a, b]);
        assert_eq!(pairs[0].level, RiskLevel::High, "公司对整体仍应为强线索");

        let fingerprint = findings
            .iter()
            .find(|x| x.rule_id == "SAME_APP_FINGERPRINT")
            .expect("应命中软件指纹规则");
        assert_eq!(
            fingerprint.level,
            RiskLevel::Low,
            "弱信号不得因同公司对存在强线索而被抬升"
        );

        let person = findings
            .iter()
            .find(|x| x.rule_id == "SAME_PERSON")
            .expect("应命中作者规则");
        assert_eq!(person.level, RiskLevel::High);
    }

    #[test]
    fn app_fingerprint_cannot_alone_reach_medium() {
        // 5 分权重远低于 MEDIUM_SCORE，确保阈值调整时该性质不被破坏。
        assert!(R_SAME_APP_FINGERPRINT.weight < MEDIUM_SCORE);
        assert_eq!(R_SAME_APP_FINGERPRINT.max_level, RiskLevel::Low);
    }

    #[test]
    fn same_company_files_are_never_compared() {
        let files = vec![f("1", "A", "张三"), f("2", "A", "张三")];
        let (findings, pairs) = run(&files);
        assert!(findings.is_empty());
        assert!(pairs.is_empty());
    }

    #[test]
    fn stop_word_authors_do_not_trigger() {
        let files = vec![f("1", "A", "Administrator"), f("2", "B", "Administrator")];
        let (findings, _) = run(&files);
        assert!(findings.is_empty(), "通用账户名不应触发线索");
    }

    #[test]
    fn generic_template_does_not_trigger() {
        let mut a = base("1", "A");
        let mut b = base("2", "B");
        a.template = "Normal.dotm".to_string();
        b.template = "Normal.dotm".to_string();
        let (findings, _) = run(&[a, b]);
        assert!(findings.is_empty(), "Office 默认模板无鉴别力");
    }

    #[test]
    fn close_timestamp_detected_within_window() {
        let mut a = base("1", "A");
        let mut b = base("2", "B");
        a.created = "2024-05-01T10:00:00Z".to_string();
        b.created = "2024-05-01T10:03:00Z".to_string();
        let (findings, _) = run(&[a, b]);
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].rule_id, "CLOSE_TIMESTAMP");
    }

    #[test]
    fn distant_timestamp_not_flagged() {
        let mut a = base("1", "A");
        let mut b = base("2", "B");
        a.created = "2024-05-01T10:00:00Z".to_string();
        b.created = "2024-05-02T18:00:00Z".to_string();
        let (findings, _) = run(&[a, b]);
        assert!(findings.is_empty());
    }

    #[test]
    fn pinyin_variant_names_match() {
        let files = vec![f("1", "A", "李雷"), f("2", "B", "李蕾")];
        let (findings, _) = run(&files);
        assert_eq!(findings.len(), 1);
        assert_eq!(findings[0].rule_id, "SAME_PERSON");
    }

    #[test]
    fn three_companies_produce_three_pairs() {
        let files = vec![f("1", "A", "张三"), f("2", "B", "张三"), f("3", "C", "张三")];
        let (_, pairs) = run(&files);
        assert_eq!(pairs.len(), 3, "A-B / A-C / B-C");
    }

    #[test]
    fn weak_signal_alone_stays_low() {
        let mut a = base("1", "A");
        let mut b = base("2", "B");
        a.application = "Microsoft Word".to_string();
        a.app_version = "16.0000".to_string();
        b.application = "Microsoft Word".to_string();
        b.app_version = "16.0000".to_string();
        let (_, pairs) = run(&[a, b]);
        assert_eq!(pairs[0].level, RiskLevel::Low);
    }
}
