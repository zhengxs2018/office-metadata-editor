use std::collections::BTreeMap;

use super::fields::FIELDS;
use super::model::{CompareFileInput, DiffState, FieldDiff, FieldTier, FieldValue};
use super::normalize::{normalize, similarity};

const SIMILAR_THRESHOLD: f64 = 0.85;

/// 计算一个对齐组内各字段的差异态。
///
/// 注意：`identical` 只描述事实，不代表"安全"。多公司横向对比中，
/// 风险字段取值一致恰恰可能是疑点，级别由规则层单独给出。
pub fn diff_group(
    files: &[CompareFileInput],
    members: &BTreeMap<String, usize>,
) -> Vec<FieldDiff> {
    let mut diffs = Vec::with_capacity(FIELDS.len());

    for spec in FIELDS {
        if spec.tier == FieldTier::Ignored {
            continue;
        }

        let mut values = Vec::with_capacity(members.len());
        for (company_id, &idx) in members {
            let raw = (spec.extract)(&files[idx]).trim().to_string();
            let is_empty = raw.is_empty();
            values.push(FieldValue {
                company_id: company_id.clone(),
                doc_id: Some(files[idx].id.clone()),
                normalized: if is_empty { None } else { normalize(&raw) },
                raw: if is_empty { None } else { Some(raw) },
                is_empty,
            });
        }

        let present: Vec<&FieldValue> = values.iter().filter(|v| !v.is_empty).collect();
        let state = if present.is_empty() {
            DiffState::Ignored
        } else if present.len() < values.len() {
            DiffState::Missing
        } else {
            let keys: Vec<String> = present
                .iter()
                .map(|v| {
                    v.normalized
                        .clone()
                        .unwrap_or_else(|| v.raw.clone().unwrap_or_default().to_lowercase())
                })
                .collect();
            if keys.iter().all(|k| k == &keys[0]) {
                DiffState::Identical
            } else {
                let mut min_sim = 1.0_f64;
                for i in 0..keys.len() {
                    for j in (i + 1)..keys.len() {
                        min_sim = min_sim.min(similarity(&keys[i], &keys[j]));
                    }
                }
                if min_sim >= SIMILAR_THRESHOLD {
                    DiffState::Similar
                } else {
                    DiffState::Conflict
                }
            }
        };

        diffs.push(FieldDiff {
            field_key: spec.key.to_string(),
            field_label: spec.label.to_string(),
            tier: spec.tier,
            state,
            values,
        });
    }

    diffs
}

#[cfg(test)]
mod tests {
    use super::*;

    fn base(id: &str, company: &str) -> CompareFileInput {
        CompareFileInput {
            id: id.to_string(),
            company_id: company.to_string(),
            company_name: company.to_string(),
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

    fn members(n: usize) -> BTreeMap<String, usize> {
        (0..n).map(|i| (format!("C{i}"), i)).collect()
    }

    fn state_of(diffs: &[FieldDiff], key: &str) -> DiffState {
        diffs.iter().find(|d| d.field_key == key).unwrap().state
    }

    #[test]
    fn identical_values_marked_identical() {
        let mut a = base("1", "C0");
        let mut b = base("2", "C1");
        a.creator = "张三".to_string();
        b.creator = "张三".to_string();
        let diffs = diff_group(&[a, b], &members(2));
        assert_eq!(state_of(&diffs, "creator"), DiffState::Identical);
    }

    #[test]
    fn different_values_marked_conflict() {
        let mut a = base("1", "C0");
        let mut b = base("2", "C1");
        a.creator = "张三".to_string();
        b.creator = "王五五五".to_string();
        let diffs = diff_group(&[a, b], &members(2));
        assert_eq!(state_of(&diffs, "creator"), DiffState::Conflict);
    }

    #[test]
    fn one_sided_value_marked_missing() {
        let mut a = base("1", "C0");
        let b = base("2", "C1");
        a.creator = "张三".to_string();
        let diffs = diff_group(&[a, b], &members(2));
        assert_eq!(state_of(&diffs, "creator"), DiffState::Missing);
    }

    #[test]
    fn all_empty_marked_ignored() {
        let diffs = diff_group(&[base("1", "C0"), base("2", "C1")], &members(2));
        assert_eq!(state_of(&diffs, "creator"), DiffState::Ignored);
    }

    #[test]
    fn every_non_ignored_field_is_reported() {
        let diffs = diff_group(&[base("1", "C0"), base("2", "C1")], &members(2));
        let expected = FIELDS.iter().filter(|f| f.tier != FieldTier::Ignored).count();
        assert_eq!(diffs.len(), expected);
    }
}
