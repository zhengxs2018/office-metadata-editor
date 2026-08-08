use std::collections::HashMap;

use tauri_native_lib::documents::compare::fields::{spec, FieldSpec, FIELDS};
use tauri_native_lib::documents::compare::model::{CompareFileInput, FieldTier};

fn doc() -> CompareFileInput {
    let mut d = CompareFileInput::default();
    d.company_name = "甲".into();
    d.file_name = "A.docx".into();
    d.creator = "张三".into();
    d.last_modified_by = "张三".into();
    d.application = "Word".into();
    d.app_company = "Microsoft".into();
    d.template = "模板1".into();
    d.modified = "2024-01-01T08:00:00Z".into();
    d.manager = "李四".into();
    d.title = "报告".into();
    d
}

#[test]
fn spec_resolves_creator_field() {
    let s = spec("creator").unwrap();
    assert_eq!(s.key, "creator");
    assert_eq!(s.label, "作者");
    assert_eq!(s.tier, FieldTier::Risk);
}

#[test]
fn spec_resolves_manager_as_risk() {
    let s = spec("manager").unwrap();
    assert_eq!(s.tier, FieldTier::Risk);
}

#[test]
fn spec_returns_none_for_unknown() {
    assert!(spec("no_such_key").is_none());
}

#[test]
fn fields_index_contains_core_keys() {
    let keys: Vec<&str> = FIELDS.iter().map(|f| f.key).collect();
    assert!(keys.contains(&"creator"));
    assert!(keys.contains(&"application"));
    assert!(keys.contains(&"template"));
}

#[test]
fn field_spec_tiers() {
    let by_key: HashMap<&str, &FieldSpec> = FIELDS.iter().map(|f| (f.key, f)).collect();
    assert_eq!(by_key["creator"].tier, FieldTier::Risk);
    assert_eq!(by_key["manager"].tier, FieldTier::Risk);
    assert_eq!(by_key["modified"].tier, FieldTier::Display);
}

#[test]
fn doc_roundtrip() {
    let d = doc();
    assert_eq!(d.company_name, "甲");
    assert_eq!(d.creator, "张三");
}
