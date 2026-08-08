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

/// 比对模块的分类停用词词典。
///
/// 词条本身已迁移到配置中心（`resources/settings.default.json` 的
/// `engine.compare.*.stopWords`），用户可通过 `settings.json` 覆盖。
/// 这里只保留「字典元信息 + 运行期缓存」，由 [`install_dictionaries`]
/// 在应用启动时从 [`Configuration`] 装载一次。
use std::sync::OnceLock;

use crate::configuration::Configuration;

/// 字典元信息：配置键 ↔ 展示名 ↔ 作用域。
pub struct StopWordDictMeta {
    /// 配置键（点分路径），设置页面直接复用
    pub id: &'static str,
    /// 展示名，设置页面用
    pub label: &'static str,
    /// 作用域：字段级归一化 / 目录级识别
    pub scope: &'static str,
}

/// 字典登记表。新增一类停用词：此处加一项 + 默认配置加一段。
pub const STOP_WORD_DICTS: &[StopWordDictMeta] = &[
    StopWordDictMeta {
        id: "engine.compare.fields.stopWords",
        label: "字段归一化停用词",
        scope: "field",
    },
    StopWordDictMeta {
        id: "engine.compare.fields.templateStopWords",
        label: "通用模板名",
        scope: "field",
    },
    StopWordDictMeta {
        id: "engine.compare.fields.genericAuthors",
        label: "通用作者名",
        scope: "field",
    },
    StopWordDictMeta {
        id: "engine.compare.labels.stopWords",
        label: "标签停用词",
        scope: "label",
    },
    StopWordDictMeta {
        id: "engine.compare.folders.stopWords",
        label: "目录识别停用词",
        scope: "folder",
    },
];

/// 运行期词典缓存：配置键 → 词条集合。
static DICTIONARIES: OnceLock<BTreeMap<String, Vec<String>>> = OnceLock::new();

/// 从配置中心装载全部停用词词典。应用启动时调用一次。
///
/// 重复调用会被忽略（[`OnceLock`] 语义），保证引擎在整个进程生命周期内
/// 看到一致的词典，避免比对过程中词典突变导致结果不可复现。
pub fn install_dictionaries(config: &Configuration) {
    let _ = DICTIONARIES.set(
        STOP_WORD_DICTS
            .iter()
            .map(|meta| {
                let words: Vec<String> = config
                    .get(meta.id, Vec::<String>::new())
                    .into_iter()
                    .map(|w| w.trim().to_lowercase())
                    .collect();
                (meta.id.to_string(), words)
            })
            .collect(),
    );
}

/// 读取指定字典的停用词列表（已转为小写）。
///
/// 若 [`install_dictionaries`] 尚未调用（如单元测试直接调用引擎），
/// 返回空表而非 panic，此时归一化退化为「不剔除停用词」。
pub fn stop_words_for(id: &str) -> &'static [String] {
    DICTIONARIES
        .get()
        .and_then(|dicts| dicts.get(id))
        .map(Vec::as_slice)
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

            for (fa, va) in [
                ("creator", &a.creator),
                ("lastModifiedBy", &a.last_modified_by),
            ] {
                for (fb, vb) in [
                    ("creator", &b.creator),
                    ("lastModifiedBy", &b.last_modified_by),
                ] {
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

            if let (Some(ta), Some(tb)) = (
                normalize_template(&a.template),
                normalize_template(&b.template),
            ) {
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
    sa.keys().filter(|k| sb.contains_key(*k)).cloned().collect()
}

/// 通用账户名不具鉴别力（仅用于痕迹作者），词条来自
/// `engine.compare.fields.genericAuthors`。
fn is_generic_author(name: &str) -> bool {
    let lowered = name.trim().to_lowercase();
    stop_words_for("engine.compare.fields.genericAuthors")
        .iter()
        .any(|w| w == &lowered)
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
        let name_a = name_of
            .get(a.as_str())
            .copied()
            .unwrap_or(a.as_str())
            .to_string();
        let name_b = name_of
            .get(b.as_str())
            .copied()
            .unwrap_or(b.as_str())
            .to_string();
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
