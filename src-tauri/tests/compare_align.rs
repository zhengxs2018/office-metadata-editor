use tauri_native_lib::documents::compare::align::align_files;
use tauri_native_lib::documents::compare::model::{CompareFileInput, MatchSource};

fn file(id: &str, company: &str, name: &str) -> CompareFileInput {
    let mut f = CompareFileInput::default();
    f.id = id.into();
    f.company_id = company.into();
    f.company_name = company.into();
    f.file_name = name.into();
    f
}

#[test]
fn align_exact_name_groups() {
    let files = vec![
        file("a1", "甲", "报告.docx"),
        file("a2", "乙", "报告.docx"),
        file("b1", "甲", "清单.xlsx"),
    ];
    let (groups, _unmatched) = align_files(&files, 0.3);
    let report = groups.iter().find(|g| g.label == "报告.docx").unwrap();
    assert_eq!(report.members.len(), 2);
    assert_eq!(report.source, MatchSource::Exact);
}

#[test]
fn align_fuzzy_name_groups() {
    let files = vec![
        file("a1", "甲", "报告(1).docx"),
        file("a2", "乙", "报告（2）.docx"),
    ];
    let (groups, _unmatched) = align_files(&files, 0.3);
    let g = groups.iter().find(|g| g.label.contains("报告")).unwrap();
    assert!(g.members.len() >= 2);
    assert_eq!(g.source, MatchSource::Fuzzy);
}

#[test]
fn align_collects_unmatched() {
    let files = vec![
        file("a1", "甲", "报告.docx"),
        file("b1", "甲", "清单.xlsx"),
        file("c1", "甲", "说明.txt"),
    ];
    let (groups, unmatched) = align_files(&files, 0.3);
    let names: Vec<&str> = unmatched.iter().map(|u| u.file_name.as_str()).collect();
    assert!(names.contains(&"说明.txt"));
    assert!(groups.is_empty());
}

#[test]
fn align_empty_input() {
    let (groups, unmatched) = align_files(&[], 0.3);
    assert!(groups.is_empty());
    assert!(unmatched.is_empty());
}
