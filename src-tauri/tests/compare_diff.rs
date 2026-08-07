use std::collections::BTreeMap;

use tauri_native_lib::documents::compare::diff::diff_group;
use tauri_native_lib::documents::compare::fields::FIELDS;
use tauri_native_lib::documents::compare::model::{CompareFileInput, DiffState, FieldDiff, FieldTier};

fn file(id: &str, company: &str, name: &str) -> CompareFileInput {
  let mut f = CompareFileInput::default();
  f.id = id.into();
  f.company_id = company.into();
  f.file_name = name.into();
  f
}

fn members_map(entries: &[(&str, usize)]) -> BTreeMap<String, usize> {
  entries.iter().map(|(c, i)| (c.to_string(), *i)).collect()
}

fn diff_of(files: &[CompareFileInput], members: &BTreeMap<String, usize>, key: &str) -> FieldDiff {
  diff_group(files, members)
    .into_iter()
    .find(|d| d.field_key == key)
    .unwrap()
}

#[test]
fn identical_field_is_identical() {
  let mut a = file("a", "甲", "A.docx");
  a.title = "报告".into();
  let mut b = file("b", "乙", "A.docx");
  b.title = "报告".into();
  let files = vec![a, b];
  let m = members_map(&[("甲", 0), ("乙", 1)]);
  assert_eq!(diff_of(&files, &m, "title").state, DiffState::Identical);
}

#[test]
fn differing_field_is_conflict() {
  let mut a = file("a", "甲", "A.docx");
  a.title = "甲方报告".into();
  let mut b = file("b", "乙", "A.docx");
  b.title = "乙方报告".into();
  let files = vec![a, b];
  let m = members_map(&[("甲", 0), ("乙", 1)]);
  assert_eq!(diff_of(&files, &m, "title").state, DiffState::Conflict);
}

#[test]
fn missing_field_is_missing() {
  let mut a = file("a", "甲", "A.docx");
  a.title = "甲方报告".into();
  let b = file("b", "乙", "A.docx");
  let files = vec![a, b];
  let m = members_map(&[("甲", 0), ("乙", 1)]);
  assert_eq!(diff_of(&files, &m, "title").state, DiffState::Missing);
}

#[test]
fn similar_after_normalize_is_identical() {
  let mut a = file("a", "甲", "A.docx");
  a.created = "2024-01-01T08:00:00Z".into();
  let mut b = file("b", "乙", "A.docx");
  b.created = "2024-01-01T08:00:00z".into();
  let files = vec![a, b];
  let m = members_map(&[("甲", 0), ("乙", 1)]);
  assert_eq!(diff_of(&files, &m, "created").state, DiffState::Identical);
}

#[test]
fn whitespace_only_similarity_is_identical() {
  let mut a = file("a", "甲", "A.docx");
  a.title = "甲方报价单".into();
  let mut b = file("b", "乙", "A.docx");
  b.title = "甲方 报价单".into();
  let files = vec![a, b];
  let m = members_map(&[("甲", 0), ("乙", 1)]);
  assert_eq!(diff_of(&files, &m, "title").state, DiffState::Identical);
}

#[test]
fn field_tier_manager_is_risk() {
  let spec = FIELDS.iter().find(|f| f.key == "manager").unwrap();
  assert_eq!(spec.tier, FieldTier::Risk);
}

#[test]
fn diff_group_uses_risk_tier() {
  let mut a = file("a", "甲", "A.docx");
  a.application = "Word".into();
  let mut b = file("b", "乙", "A.docx");
  b.application = "Excel".into();
  let files = vec![a, b];
  let m = members_map(&[("甲", 0), ("乙", 1)]);
  let d = diff_of(&files, &m, "application");
  assert_eq!(d.tier, FieldTier::Risk);
  assert_eq!(d.state, DiffState::Conflict);
}
