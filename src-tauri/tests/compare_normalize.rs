use tauri_native_lib::documents::compare::normalize::{normalize, normalize_template, parse_timestamp};

#[test]
fn normalize_lowercases() {
  assert_eq!(normalize("Hello"), Some("hello".to_string()));
}

#[test]
fn normalize_collapses_whitespace() {
  assert_eq!(normalize("a b\tc"), Some("abc".to_string()));
}

#[test]
fn normalize_keeps_relevant_punctuation() {
  assert_eq!(normalize("a-b.c"), Some("ab.c".to_string()));
}

#[test]
fn normalize_empty_input_is_none() {
  assert_eq!(normalize("   "), None);
}

#[test]
fn normalize_template_basic() {
  assert_eq!(
    normalize_template("report.docx"),
    Some("report.docx".to_string())
  );
  assert_eq!(
    normalize_template("C:/templates/report.docx"),
    Some("report.docx".to_string())
  );
}

#[test]
fn parse_timestamp_ignores_timezone_and_space() {
  let a = parse_timestamp("2024-01-01T00:00:00Z").unwrap();
  let b = parse_timestamp("2024-01-01 00:00:00").unwrap();
  assert_eq!(a, b);
}

#[test]
fn parse_timestamp_space_separated() {
  assert!(parse_timestamp("2024-01-01 08:00").is_some());
}

#[test]
fn parse_timestamp_invalid() {
  assert!(parse_timestamp("not-a-date").is_none());
  assert!(parse_timestamp("2024-13-01").is_none());
}
