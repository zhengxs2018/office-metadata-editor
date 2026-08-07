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

