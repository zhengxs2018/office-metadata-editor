use std::collections::BTreeMap;

use tauri_native_lib::documents::compare::model::{CompareFileInput, CompareOptions, RiskFinding, RiskLevel};
use tauri_native_lib::documents::compare::rules::{evaluate, MEDIUM_SCORE};

fn f(id: &str, company: &str, name: &str) -> CompareFileInput {
  let mut d = CompareFileInput::default();
  d.id = id.into();
  d.company_id = company.into();
  d.company_name = company.into();
  d.file_name = name.into();
  d
}

fn base() -> CompareFileInput {
  f("a", "甲", "报告.docx")
}

/// 两文件必须属于不同单位，否则 `evaluate` 直接跳过该对。
fn run(a: &CompareFileInput, b: &CompareFileInput) -> Vec<RiskFinding> {
  let (findings, _pairs) =
    evaluate(&[a.clone(), b.clone()], &BTreeMap::new(), &CompareOptions::default());
  findings
}

#[test]
fn same_application_fingerprint_is_low() {
  let mut a = base();
  a.app_company = "Microsoft".into();
  a.application = "Word".into();
  a.app_version = "16.0".into();
  let mut b = base();
  b.id = "b".into();
  b.company_id = "乙".into();
  b.company_name = "乙".into();
  b.app_company = "Microsoft".into();
  b.application = "Word".into();
  b.app_version = "16.0".into();
  let findings = run(&a, &b);
  let finding = findings
    .iter()
    .find(|x| x.rule_id == "SAME_APP_FINGERPRINT")
    .unwrap();
  assert!(finding.score >= 0.0);
  assert!(finding.score < MEDIUM_SCORE);
  assert_eq!(finding.level, RiskLevel::Low);
}

#[test]
fn app_fingerprint_cannot_alone_reach_medium() {
  let mut a = base();
  a.app_company = "Microsoft".into();
  a.app_version = "16.0".into();
  let mut b = base();
  b.id = "b".into();
  b.company_id = "乙".into();
  b.company_name = "乙".into();
  b.app_company = "Microsoft".into();
  b.app_version = "16.0".into();
  let findings = run(&a, &b);
  let total: f64 = findings.iter().map(|x| x.score).sum();
  assert!(total < MEDIUM_SCORE);
}

#[test]
fn identical_creator_emits_same_person() {
  let mut a = base();
  a.creator = "张三".into();
  let mut b = base();
  b.id = "b".into();
  b.company_id = "乙".into();
  b.company_name = "乙".into();
  b.creator = "张三".into();
  let findings = run(&a, &b);
  assert!(
    findings
      .iter()
      .any(|x| x.rule_id == "SAME_PERSON" && x.score > 0.0),
    "expected a SAME_PERSON finding for identical creators"
  );
}
