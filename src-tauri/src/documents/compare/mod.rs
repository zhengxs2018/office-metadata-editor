pub mod align;
pub mod diff;
pub mod extract_hidden;
pub mod fields;
pub mod model;
pub mod normalize;
pub mod rules;

use std::collections::BTreeMap;

use model::{
    AlignedGroup, CompanySnapshot, CompareFileInput, CompareOptions, CompareResult, CompareStats,
    DiffState, FieldTier, RiskLevel, DISCLAIMER, SCHEMA_VERSION,
};

/// 对比内核入口：对齐 → 字段差异 → 规则判定 → 证据链聚合。
pub fn run_compare(files: &[CompareFileInput], options: &CompareOptions) -> CompareResult {
    let (raw_groups, unmatched) = align::align_files(files, options.fuzzy_match_floor());

    let mut group_of: BTreeMap<String, String> = BTreeMap::new();
    for (idx, group) in raw_groups.iter().enumerate() {
        let group_id = format!("g{:04}", idx + 1);
        for &file_idx in group.members.values() {
            group_of.insert(files[file_idx].id.clone(), group_id.clone());
        }
    }

    let (findings, pair_risks) = rules::evaluate(files, &group_of, options);

    let mut level_by_group: BTreeMap<String, RiskLevel> = BTreeMap::new();
    for finding in &findings {
        if let Some(gid) = &finding.group_id {
            level_by_group
                .entry(gid.clone())
                .and_modify(|cur| {
                    if finding.level > *cur {
                        *cur = finding.level;
                    }
                })
                .or_insert(finding.level);
        }
    }

    let mut groups = Vec::with_capacity(raw_groups.len());
    let mut diff_field_count = 0_u32;

    for (idx, raw) in raw_groups.iter().enumerate() {
        let group_id = format!("g{:04}", idx + 1);
        let diffs = diff::diff_group(files, &raw.members);

        let diff_count = diffs
            .iter()
            .filter(|d| matches!(d.state, DiffState::Conflict | DiffState::Similar))
            .count() as u32;
        let missing_count = diffs
            .iter()
            .filter(|d| d.state == DiffState::Missing)
            .count() as u32;
        diff_field_count += diff_count;

        let cells = raw
            .members
            .iter()
            .map(|(company_id, &file_idx)| model::GroupCell {
                company_id: company_id.clone(),
                doc_id: Some(files[file_idx].id.clone()),
                file_name: Some(files[file_idx].file_name.clone()),
            })
            .collect();

        groups.push(AlignedGroup {
            risk_level: level_by_group.get(&group_id).copied(),
            group_id,
            label: raw.label.clone(),
            cells,
            diffs,
            diff_count,
            missing_count,
            match_confidence: (raw.confidence * 1000.0).round() / 1000.0,
            match_source: raw.source,
        });
    }

    let mut companies: Vec<CompanySnapshot> = Vec::new();
    let mut seen: BTreeMap<&str, usize> = BTreeMap::new();
    for file in files {
        match seen.get(file.company_id.as_str()) {
            Some(&pos) => companies[pos].file_count += 1,
            None => {
                seen.insert(file.company_id.as_str(), companies.len());
                companies.push(CompanySnapshot {
                    company_id: file.company_id.clone(),
                    company_name: file.company_name.clone(),
                    file_count: 1,
                });
            }
        }
    }

    let stats = CompareStats {
        company_count: companies.len() as u32,
        file_count: files.len() as u32,
        group_count: groups.len() as u32,
        unmatched_count: unmatched.len() as u32,
        high_count: pair_risks.iter().filter(|p| p.level == RiskLevel::High).count() as u32,
        medium_count: pair_risks
            .iter()
            .filter(|p| p.level == RiskLevel::Medium)
            .count() as u32,
        low_count: pair_risks.iter().filter(|p| p.level == RiskLevel::Low).count() as u32,
        diff_field_count,
    };

    CompareResult {
        schema_version: SCHEMA_VERSION,
        dimension: "cross-company".to_string(),
        disclaimer: DISCLAIMER.to_string(),
        companies,
        groups,
        unmatched,
        findings,
        pair_risks,
        stats,
    }
}

/// 判定某字段是否参与风险规则，供前端着色策略使用。
pub fn is_risk_field(key: &str) -> bool {
    fields::spec(key).map(|s| s.tier == FieldTier::Risk).unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn file(id: &str, company: &str, name: &str, creator: &str) -> CompareFileInput {
        CompareFileInput {
            id: id.to_string(),
            company_id: company.to_string(),
            company_name: format!("{company}公司"),
            file_name: name.to_string(),
            creator: creator.to_string(),
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
    fn empty_input_is_safe() {
        let result = run_compare(&[], &CompareOptions::default());
        assert_eq!(result.stats.file_count, 0);
        assert!(result.groups.is_empty());
        assert!(!result.disclaimer.is_empty());
    }

    #[test]
    fn findings_link_back_to_their_group() {
        let files = vec![
            file("1", "A", "商务标.docx", "张三"),
            file("2", "B", "商务标.docx", "张三"),
        ];
        let result = run_compare(&files, &CompareOptions::default());
        assert_eq!(result.groups.len(), 1);
        let gid = &result.groups[0].group_id;
        assert_eq!(result.findings[0].group_id.as_ref(), Some(gid));
        assert!(result.groups[0].risk_level.is_some());
    }

    #[test]
    fn duplicate_file_names_do_not_cross_contaminate() {
        let files = vec![
            file("1", "A", "标书.docx", "张三"),
            file("2", "B", "标书.docx", "李四"),
            file("3", "C", "标书.docx", "张三"),
        ];
        let result = run_compare(&files, &CompareOptions::default());
        for finding in &result.findings {
            let companies: Vec<&str> =
                finding.refs.iter().map(|r| r.company_id.as_str()).collect();
            assert!(
                companies.contains(&"A") && companies.contains(&"C"),
                "线索应只落在真正同名作者的 A 与 C 之间"
            );
        }
        assert_eq!(result.findings.len(), 1);
    }

    #[test]
    fn refs_carry_stable_doc_ids() {
        let files = vec![
            file("doc-1", "A", "商务标.docx", "张三"),
            file("doc-2", "B", "商务标.docx", "张三"),
        ];
        let result = run_compare(&files, &CompareOptions::default());
        let ids: Vec<&str> = result.findings[0]
            .refs
            .iter()
            .map(|r| r.doc_id.as_str())
            .collect();
        assert!(ids.contains(&"doc-1") && ids.contains(&"doc-2"));
    }

    #[test]
    fn unmatched_files_are_reported() {
        let files = vec![
            file("1", "A", "商务标.docx", ""),
            file("2", "B", "商务标.docx", ""),
            file("3", "A", "只有A才有的附件说明.pdf", ""),
        ];
        let result = run_compare(&files, &CompareOptions::default());
        assert_eq!(result.stats.unmatched_count, 1);
        assert_eq!(result.unmatched[0].doc_id, "3");
    }

    #[test]
    fn stats_are_consistent() {
        let files = vec![
            file("1", "A", "商务标.docx", "张三"),
            file("2", "B", "商务标.docx", "张三"),
        ];
        let result = run_compare(&files, &CompareOptions::default());
        assert_eq!(result.stats.company_count, 2);
        assert_eq!(result.stats.file_count, 2);
        assert_eq!(result.stats.group_count, 1);
    }
}
