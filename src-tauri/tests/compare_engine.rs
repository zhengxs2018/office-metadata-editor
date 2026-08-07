use tauri_native_lib::documents::compare::model::{CompareFileInput, CompareOptions};
use tauri_native_lib::documents::compare::is_risk_field;

fn file(id: &str, company: &str, name: &str) -> CompareFileInput {
  let mut d = CompareFileInput::default();
  d.id = id.into();
  d.company_id = company.into();
  d.company_name = company.into();
  d.file_name = name.into();
  d
}

#[test]
fn run_compare_baseline() {
  let doc = file("a", "甲", "报告.docx");
  let result = tauri_native_lib::documents::compare::run_compare(&[doc], &CompareOptions::default());
  assert_eq!(result.schema_version, 1);
  assert!(!result.disclaimer.is_empty());
}

#[test]
fn run_compare_findings() {
  let mut a = file("a", "甲", "报告.docx");
  a.creator = "张三".into();
  let mut b = file("b", "乙", "报告.docx");
  b.creator = "张三".into();
  let result = tauri_native_lib::documents::compare::run_compare(&[a, b], &CompareOptions::default());
  assert!(!result.findings.is_empty());
}

#[test]
fn run_compare_stats() {
  let docs = vec![
    file("a", "甲", "报告.docx"),
    file("b", "乙", "报告.docx"),
    file("c", "丙", "清单.xlsx"),
  ];
  let result = tauri_native_lib::documents::compare::run_compare(&docs, &CompareOptions::default());
  assert_eq!(result.stats.file_count, 3);
  assert!(result.stats.group_count >= 1);
}

#[test]
fn is_risk_field_manager_is_risk() {
  assert!(is_risk_field("creator"));
  assert!(is_risk_field("manager"));
  assert!(!is_risk_field("title"));
}
