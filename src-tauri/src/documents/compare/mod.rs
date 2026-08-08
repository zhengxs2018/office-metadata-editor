pub mod align;
pub mod diff;
pub mod fields;
pub mod model;
pub mod normalize;
pub mod rules;

use std::collections::BTreeMap;

use model::{
    AlignedGroup, CompanySnapshot, CompareFileInput, CompareOptions, CompareResult, CompareStats,
    DiffState, FieldTier, RiskLevel, DISCLAIMER, SCHEMA_VERSION,
};

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
        high_count: pair_risks
            .iter()
            .filter(|p| p.level == RiskLevel::High)
            .count() as u32,
        medium_count: pair_risks
            .iter()
            .filter(|p| p.level == RiskLevel::Medium)
            .count() as u32,
        low_count: pair_risks
            .iter()
            .filter(|p| p.level == RiskLevel::Low)
            .count() as u32,
        diff_field_count,
    };

    let files = files
        .iter()
        .map(|f| model::FileMetaSnapshot {
            doc_id: f.id.clone(),
            company_id: f.company_id.clone(),
            company_name: f.company_name.clone(),
            file_name: f.file_name.clone(),
            creator: f.creator.clone(),
            last_modified_by: f.last_modified_by.clone(),
            app_company: f.app_company.clone(),
            manager: f.manager.clone(),
            application: f.application.clone(),
            has_hidden_markers: f.has_hidden_markers,
        })
        .collect();

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
        files,
    }
}

pub fn is_risk_field(key: &str) -> bool {
    fields::spec(key)
        .map(|s| s.tier == FieldTier::Risk)
        .unwrap_or(false)
}
