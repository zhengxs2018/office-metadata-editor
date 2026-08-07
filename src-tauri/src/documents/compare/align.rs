use std::collections::{BTreeMap, HashMap, HashSet};

use super::model::{CompareFileInput, MatchSource, UnmatchedFile};
use super::normalize::similarity;

/// 对齐后的一组文件：每个公司最多一个文件。
pub struct RawGroup {
    pub label: String,
    /// company_id -> 文件在输入切片中的下标
    pub members: BTreeMap<String, usize>,
    pub confidence: f64,
    pub source: MatchSource,
}

/// 剥离扩展名与序号前缀，用于近似匹配的归一化文件名。
pub fn normalize_file_name(name: &str) -> String {
    let stem = name.rsplit_once('.').map(|(s, _)| s).unwrap_or(name);
    stem.to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric())
        .collect()
}

/// 文件对齐：精确名 → 归一化名 → 模糊匹配 → 未匹配。
///
/// 约束：同一公司在一组内至多出现一次；同公司重名文件顺次落入不同组。
pub fn align_files(
    files: &[CompareFileInput],
    fuzzy_floor: f64,
) -> (Vec<RawGroup>, Vec<UnmatchedFile>) {
    let mut groups: Vec<RawGroup> = Vec::new();
    let mut assigned: HashSet<usize> = HashSet::new();

    // 阶段一：按精确文件名分桶，同公司重名按出现序拆到不同组。
    let mut exact_buckets: BTreeMap<&str, Vec<usize>> = BTreeMap::new();
    for (idx, file) in files.iter().enumerate() {
        exact_buckets.entry(file.file_name.as_str()).or_default().push(idx);
    }

    for (name, indices) in exact_buckets {
        let mut slots: Vec<BTreeMap<String, usize>> = Vec::new();
        for idx in indices {
            let company = files[idx].company_id.clone();
            match slots.iter_mut().find(|s| !s.contains_key(&company)) {
                Some(slot) => {
                    slot.insert(company, idx);
                }
                None => {
                    let mut fresh = BTreeMap::new();
                    fresh.insert(company, idx);
                    slots.push(fresh);
                }
            }
        }
        for members in slots {
            if members.len() > 1 {
                for idx in members.values() {
                    assigned.insert(*idx);
                }
                groups.push(RawGroup {
                    label: name.to_string(),
                    members,
                    confidence: 1.0,
                    source: MatchSource::Exact,
                });
            }
        }
    }

    // 阶段二：归一化文件名（去扩展名/标点/大小写）。
    let mut norm_buckets: BTreeMap<String, Vec<usize>> = BTreeMap::new();
    for (idx, file) in files.iter().enumerate() {
        if assigned.contains(&idx) {
            continue;
        }
        norm_buckets
            .entry(normalize_file_name(&file.file_name))
            .or_default()
            .push(idx);
    }

    for (norm, indices) in norm_buckets {
        if norm.is_empty() || indices.len() < 2 {
            continue;
        }
        let mut members: BTreeMap<String, usize> = BTreeMap::new();
        for idx in indices {
            members.entry(files[idx].company_id.clone()).or_insert(idx);
        }
        if members.len() > 1 {
            for idx in members.values() {
                assigned.insert(*idx);
            }
            let label = files[*members.values().next().unwrap()].file_name.clone();
            groups.push(RawGroup {
                label,
                members,
                confidence: 0.9,
                source: MatchSource::Normalized,
            });
        }
    }

    // 阶段三：模糊匹配，贪心取最相似且置信度达标的配对。
    let remaining: Vec<usize> = (0..files.len()).filter(|i| !assigned.contains(i)).collect();
    let mut norm_cache: HashMap<usize, String> = HashMap::new();
    for idx in &remaining {
        norm_cache.insert(*idx, normalize_file_name(&files[*idx].file_name));
    }

    for &seed in &remaining {
        if assigned.contains(&seed) {
            continue;
        }
        let mut members: BTreeMap<String, usize> = BTreeMap::new();
        members.insert(files[seed].company_id.clone(), seed);
        let mut best_scores: Vec<f64> = Vec::new();

        for &cand in &remaining {
            if cand == seed || assigned.contains(&cand) {
                continue;
            }
            let company = &files[cand].company_id;
            if members.contains_key(company) {
                continue;
            }
            let score = similarity(&norm_cache[&seed], &norm_cache[&cand]);
            if score >= fuzzy_floor.max(f64::MIN_POSITIVE) {
                members.insert(company.clone(), cand);
                best_scores.push(score);
            }
        }

        if members.len() > 1 {
            for idx in members.values() {
                assigned.insert(*idx);
            }
            let confidence = best_scores.iter().copied().fold(f64::INFINITY, f64::min);
            groups.push(RawGroup {
                label: files[seed].file_name.clone(),
                members,
                confidence,
                source: MatchSource::Fuzzy,
            });
        }
    }

    let unmatched = (0..files.len())
        .filter(|i| !assigned.contains(i))
        .map(|i| UnmatchedFile {
            doc_id: files[i].id.clone(),
            company_id: files[i].company_id.clone(),
            file_name: files[i].file_name.clone(),
            reason: "未找到其他公司的对应文件".to_string(),
        })
        .collect();

    groups.sort_by(|a, b| a.label.cmp(&b.label));
    (groups, unmatched)
}

