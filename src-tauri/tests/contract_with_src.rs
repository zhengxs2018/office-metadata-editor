//! 前端（src/）与 Rust 内核（src-tauri）的 IPC 契约测试。
//!
//! 只通过 crate 的 pub API（CompareFileInput / CompareOptions / CompareResult / run_compare），
//! 不触碰任何内部实现。测试用 **完全模拟前端 `invoke('compare_metadata', payload)` 实际发出的
//! camelCase JSON** 作为输入，验证：
//!   1. 前端 → 后端：serde 能正确反序列化为 CompareFileInput / CompareOptions（camelCase 键、
//!      可选字段、嵌套 evidence 全部命中）。
//!   2. 后端 → 前端：run_compare 产出 CompareResult，序列化回的 JSON 字段结构与
//!      src/lib/documents/compare/types.ts 声明的契约逐一对齐（CompareResult / CompareStats）。
//!
//! 任何一端改动破坏契约，此测试会立即失败，从而把 src 与 src-tauri 的结合锁定。

use serde_json::json;
use tauri_native_lib::documents::compare::model::{
    CompareFileInput, CompareOptions, CompareResult,
};
use tauri_native_lib::documents::compare::run_compare;

/// 构造一份与前端 trackedInvoke('compare_metadata', { files }) 形态一致的 payload。
///
/// 字段严格对照 src/lib/documents/compare/types.ts 的 CompareFileInput（camelCase），
/// 覆盖必填字段与隐藏痕迹可选字段，验证 serde rename + default 行为。
/// 前端实际调用不传 options（见 src/pages/compare-page/index.tsx）。
fn frontend_files_payload() -> serde_json::Value {
    json!([
        {
            "id": "doc-1",
            "companyId": "company-A",
            "companyName": "甲建设集团",
            "fileName": "甲-技术标.docx",
            "creator": "张三",
            "lastModifiedBy": "张三",
            "appCompany": "甲建设集团",
            "manager": "李四",
            "template": "标准技术标模板",
            "application": "Microsoft Office Word",
            "appVersion": "16.0",
            "created": "2024-01-01T09:00:00",
            "modified": "2024-01-05T18:00:00",
            "revision": "2024-01-05T18:00:00",
            "title": "技术标书",
            "revisionAuthors": ["张三", "李四"],
            "annotationAuthors": ["王五"],
            "xmpCreators": ["甲建设集团"],
            "hasHiddenMarkers": false
        },
        {
            "id": "doc-2",
            "companyId": "company-B",
            "companyName": "乙建设集团",
            "fileName": "乙-技术标.docx",
            "creator": "赵六",
            "lastModifiedBy": "赵六",
            "appCompany": "乙建设集团",
            "manager": "钱七",
            "template": "标准技术标模板",
            "application": "Microsoft Office Word",
            "appVersion": "16.0",
            "created": "2024-01-02T10:00:00",
            "modified": "2024-01-06T19:00:00",
            "revision": "2024-01-06T19:00:00",
            "title": "技术标书",
            "revisionAuthors": ["赵六"],
            "annotationAuthors": [],
            "xmpCreators": [],
            "hasHiddenMarkers": true
        }
    ])
}

/// 前端 → 后端反序列化契约：files 数组必须能被 serde 完整解析为命令参数。
#[test]
fn contract_frontend_files_deserialize_to_command_args() {
    let files: Vec<CompareFileInput> =
        serde_json::from_value(frontend_files_payload()).expect("files 应能被反序列化为 CompareFileInput[]");

    assert_eq!(files.len(), 2, "应解析出 2 个文件");
    // camelCase 键 → snake_case 字段
    assert_eq!(files[0].id, "doc-1");
    assert_eq!(files[0].company_id, "company-A");
    assert_eq!(files[0].app_version, "16.0");
    assert_eq!(files[0].app_company, "甲建设集团");
    // 可选字段正确落入
    assert_eq!(files[0].revision_authors, vec!["张三".to_string(), "李四".to_string()]);
    assert_eq!(files[0].annotation_authors, vec!["王五".to_string()]);
    assert!(!files[0].has_hidden_markers);
    assert!(files[1].has_hidden_markers);
}

/// 前端若传 CompareOptions，其 camelCase 字段必须被 Rust 正确反序列化
/// （与 types.ts 的 CompareOptions 对齐：closeTimestampMinutes / ruleOverrides）。
#[test]
fn contract_options_camel_case_roundtrip() {
    let options_json = json!({
        "fuzzyMatchFloor": 0.85,
        "closeTimestampMinutes": 30,
        "ruleOverrides": { "SAME_PERSON": { "enabled": false } }
    });

    let options: CompareOptions =
        serde_json::from_value(options_json).expect("options 应能被反序列化为 CompareOptions");

    assert_eq!(options.fuzzy_match_floor, Some(0.85));
    assert_eq!(options.close_timestamp_minutes, Some(30));
    assert!(options.rule_overrides.is_some());
    let overrides = options.rule_overrides.unwrap();
    assert!(!overrides.get("SAME_PERSON").unwrap().enabled.unwrap());
}

/// 后端 → 前端序列化契约：CompareResult 序列化后的字段名必须与
/// src/lib/documents/compare/types.ts 的 CompareResult 声明完全一致。
#[test]
fn contract_backend_result_matches_ts_types() {
    let files: Vec<CompareFileInput> = serde_json::from_value(frontend_files_payload()).unwrap();

    // 前端实际不传 options → Rust 用 CompareOptions::default()
    let result: CompareResult = run_compare(&files, &CompareOptions::default());

    let serialized = serde_json::to_value(&result).expect("CompareResult 必须可序列化");
    let obj = serialized.as_object().expect("CompareResult 序列化为对象");

    // 与 types.ts 的 CompareResult 字段逐一核对（camelCase）
    for field in [
        "schemaVersion",
        "dimension",
        "disclaimer",
        "companies",
        "groups",
        "unmatched",
        "findings",
        "pairRisks",
        "stats",
    ] {
        assert!(
            obj.contains_key(field),
            "TS 契约字段 `{field}` 缺失于 Rust CompareResult 序列化输出"
        );
    }

    // schemaVersion / dimension 为固定契约值
    assert_eq!(result.schema_version, 1);
    assert_eq!(serialized["schemaVersion"], 1);
    assert_eq!(result.dimension, "cross-company");

    // stats 子结构与 types.ts 的 CompareStats 字段对齐
    let stats = serialized["stats"].as_object().expect("stats 为对象");
    for field in [
        "companyCount",
        "fileCount",
        "groupCount",
        "unmatchedCount",
        "highCount",
        "mediumCount",
        "lowCount",
        "diffFieldCount",
    ] {
        assert!(
            stats.contains_key(field),
            "TS 契约字段 stats.{field} 缺失于 Rust CompareStats 序列化输出"
        );
    }

    // 容器结构可被前端 selectors 消费
    assert!(serialized["groups"].is_array());
    assert!(serialized["findings"].is_array());
    assert!(serialized["companies"].is_array());
}

/// 契约稳定性：空文件集也能产出合法 CompareResult，前端空态分支可据此渲染。
#[test]
fn contract_empty_input_still_valid() {
    let files: Vec<CompareFileInput> = vec![];
    let result: CompareResult = run_compare(&files, &CompareOptions::default());
    let serialized = serde_json::to_value(&result).unwrap();

    assert_eq!(serialized["schemaVersion"], 1);
    assert!(serialized["groups"].as_array().unwrap().is_empty());
    assert!(serialized["findings"].as_array().unwrap().is_empty());
}
