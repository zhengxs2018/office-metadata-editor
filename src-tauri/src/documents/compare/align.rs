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

#[cfg(test)]
mod tests {
    use super::*;

    fn file(id: &str, company: &str, name: &str) -> CompareFileInput {
        CompareFileInput {
            id: id.to_string(),
            company_id: company.to_string(),
            company_name: company.to_string(),
            file_name: name.to_string(),
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

    #[test]
    fn exact_names_across_companies_align() {
        let files = vec![
            file("1", "A", "商务标.docx"),
            file("2", "B", "商务标.docx"),
            file("3", "C", "商务标.docx"),
        ];
        let (groups, unmatched) = align_files(&files, 0.3);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].members.len(), 3);
        assert_eq!(groups[0].source, MatchSource::Exact);
        assert!(unmatched.is_empty());
    }

    #[test]
    fn duplicate_names_within_company_split_into_groups() {
        let files = vec![
            file("1", "A", "标书.docx"),
            file("2", "A", "标书.docx"),
            file("3", "B", "标书.docx"),
            file("4", "B", "标书.docx"),
        ];
        let (groups, _) = align_files(&files, 0.3);
        assert_eq!(groups.len(), 2, "同公司重名应拆成两组");
        for g in &groups {
            assert_eq!(g.members.len(), 2);
            assert!(g.members.contains_key("A") && g.members.contains_key("B"));
        }
    }

    #[test]
    fn a_group_never_holds_two_files_from_same_company() {
        let files = vec![
            file("1", "A", "技术标.docx"),
            file("2", "A", "技术标.docx"),
            file("3", "B", "技术标.docx"),
        ];
        let (groups, unmatched) = align_files(&files, 0.3);
        for g in &groups {
            let companies: HashSet<&String> = g.members.keys().collect();
            assert_eq!(companies.len(), g.members.len());
        }
        assert_eq!(unmatched.len(), 1, "A 多出的一份应进未匹配区");
    }

    #[test]
    fn normalized_names_align_when_extension_differs() {
        let files = vec![file("1", "A", "商务标.docx"), file("2", "B", "商务标.doc")];
        let (groups, _) = align_files(&files, 0.3);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].source, MatchSource::Normalized);
    }

    #[test]
    fn low_similarity_files_stay_unmatched() {
        let files = vec![
            file("1", "A", "商务标.docx"),
            file("2", "B", "完全不相干的另一个东西.xlsx"),
        ];
        let (groups, unmatched) = align_files(&files, 0.3);
        assert!(groups.is_empty());
        assert_eq!(unmatched.len(), 2);
    }

    #[test]
    fn single_company_yields_no_groups() {
        let files = vec![file("1", "A", "a.docx"), file("2", "A", "b.docx")];
        let (groups, unmatched) = align_files(&files, 0.3);
        assert!(groups.is_empty());
        assert_eq!(unmatched.len(), 2);
    }
}
