use std::collections::BTreeMap;
use std::path::Path;

use walkdir::WalkDir;

use tauri_native_lib::documents::compare::model::{
    CompareFileInput, CompareOptions, CompareResult, RiskLevel,
};
use tauri_native_lib::documents::compare::run_compare;
use tauri_native_lib::documents::pdf::parse_metadata_from_path as parse_pdf;
use tauri_native_lib::documents::xlsx::parse_metadata_from_path as parse_xlsx;
use tauri_native_lib::export::DocumentMetadata;

const SAME_ENTITY_RULES: &[&str] = &[
    "SAME_PERSON",
    "SAME_MANAGER",
    "SAME_APP_COMPANY",
    "SIMILAR_APP_COMPANY",
];

fn load_dataset(root: &Path) -> CompareResult {
    let mut files: Vec<CompareFileInput> = Vec::new();
    let mut seq = 0u32;

    for company_entry in WalkDir::new(root)
        .min_depth(1)
        .max_depth(1)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_dir())
    {
        let company_name = company_entry.file_name().to_string_lossy().to_string();
        let company_id = format!("co-{}", company_name);

        for file_entry in WalkDir::new(company_entry.path())
            .min_depth(1)
            .max_depth(1)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
        {
            let path = file_entry.path();
            let ext = path
                .extension()
                .map(|s| s.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            if ext == "ds_store" {
                continue;
            }
            let meta: DocumentMetadata = match ext.as_str() {
                "pdf" => parse_pdf(path.to_string_lossy().to_string()).expect("pdf 解析失败"),
                "xlsx" | "xls" => {
                    parse_xlsx(path.to_string_lossy().to_string()).expect("xlsx 解析失败")
                }
                other => panic!("样本含未支持的扩展名: {other}"),
            };

            seq += 1;
            files.push(CompareFileInput {
                id: format!("doc-{seq}"),
                company_id: company_id.clone(),
                company_name: company_name.clone(),
                file_name: path.file_name().unwrap().to_string_lossy().to_string(),
                creator: meta.document_properties.creator.clone(),
                last_modified_by: meta.document_properties.last_modified_by.clone(),
                app_company: meta.app_properties.company.clone(),
                manager: meta.app_properties.manager.clone(),
                template: meta.app_properties.template.clone(),
                application: meta.app_properties.application.clone(),
                app_version: meta.app_properties.app_version.clone(),
                created: meta.document_properties.created.clone(),
                modified: meta.document_properties.modified.clone(),
                revision: meta.document_properties.revision.clone(),
                title: meta.document_properties.title.clone(),
                subject: meta.document_properties.subject.clone(),
                keywords: meta.document_properties.keywords.clone(),
                description: meta.document_properties.description.clone(),
                category: meta.document_properties.category.clone(),
                content_status: meta.document_properties.content_status.clone(),
                version: meta.document_properties.version.clone(),
                language: meta.document_properties.language.clone(),
                total_time: meta.app_properties.total_time.clone(),
                annotation_authors: meta.annotation_authors.clone(),
                revision_authors: meta.revision_authors.clone(),
                xmp_creators: meta.xmp_creators.clone(),
                has_hidden_markers: meta.has_hidden_markers,
            });
        }
    }

    run_compare(&files, &CompareOptions::default())
}

fn write_json(dataset: &str, result: &CompareResult) {
    let manifest = env!("CARGO_MANIFEST_DIR"); // src-tauri
    let root = Path::new(manifest).parent().unwrap();
    let out_dir = root.join(".crew").join("docs");
    std::fs::create_dir_all(&out_dir).expect("无法创建 .crew/docs");
    let out_path = out_dir.join(format!("sample-{dataset}.json"));
    let json = serde_json::to_string_pretty(result).expect("序列化失败");
    std::fs::write(&out_path, json).expect("写入失败");
    eprintln!("已写出 {out_path:?}");
}

fn samples_root() -> std::path::PathBuf {
    let manifest = env!("CARGO_MANIFEST_DIR"); // src-tauri
    Path::new(manifest).parent().unwrap().join("samples")
}

fn load_merged(root: &Path) -> CompareResult {
    let mut files: Vec<CompareFileInput> = Vec::new();
    let mut seq = 0u32;

    for company_entry in WalkDir::new(root)
        .min_depth(2)
        .max_depth(2)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_dir())
        .filter(|e| {
            e.path()
                .components()
                .any(|c| c.as_os_str().to_string_lossy() == "samples")
                && !e.path().components().any(|c| {
                    let s = c.as_os_str().to_string_lossy();
                    s == ".crew"
                })
        })
    {
        let company_name = company_entry.file_name().to_string_lossy().to_string();
        let company_id = format!("co-{}", company_name);

        for file_entry in WalkDir::new(company_entry.path())
            .min_depth(1)
            .max_depth(1)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
        {
            let path = file_entry.path();
            let ext = path
                .extension()
                .map(|s| s.to_string_lossy().to_lowercase())
                .unwrap_or_default();
            if ext == "ds_store" {
                continue;
            }
            let meta: DocumentMetadata = match ext.as_str() {
                "pdf" => parse_pdf(path.to_string_lossy().to_string()).expect("pdf 解析失败"),
                "xlsx" | "xls" => {
                    parse_xlsx(path.to_string_lossy().to_string()).expect("xlsx 解析失败")
                }
                other => panic!("样本含未支持的扩展名: {other}"),
            };

            seq += 1;
            files.push(CompareFileInput {
                id: format!("doc-{seq}"),
                company_id: company_id.clone(),
                company_name: company_name.clone(),
                file_name: path.file_name().unwrap().to_string_lossy().to_string(),
                creator: meta.document_properties.creator.clone(),
                last_modified_by: meta.document_properties.last_modified_by.clone(),
                app_company: meta.app_properties.company.clone(),
                manager: meta.app_properties.manager.clone(),
                template: meta.app_properties.template.clone(),
                application: meta.app_properties.application.clone(),
                app_version: meta.app_properties.app_version.clone(),
                created: meta.document_properties.created.clone(),
                modified: meta.document_properties.modified.clone(),
                revision: meta.document_properties.revision.clone(),
                title: meta.document_properties.title.clone(),
                subject: meta.document_properties.subject.clone(),
                keywords: meta.document_properties.keywords.clone(),
                description: meta.document_properties.description.clone(),
                category: meta.document_properties.category.clone(),
                content_status: meta.document_properties.content_status.clone(),
                version: meta.document_properties.version.clone(),
                language: meta.document_properties.language.clone(),
                total_time: meta.app_properties.total_time.clone(),
                annotation_authors: meta.annotation_authors.clone(),
                revision_authors: meta.revision_authors.clone(),
                xmp_creators: meta.xmp_creators.clone(),
                has_hidden_markers: meta.has_hidden_markers,
            });
        }
    }

    run_compare(&files, &CompareOptions::default())
}

#[test]
fn normal_data_has_no_high_same_entity_signal() {
    let root = samples_root().join("正常数据");
    assert!(root.exists(), "缺失样本目录: {root:?}");
    let result = load_dataset(&root);
    write_json("正常数据", &result);

    let high_entity: Vec<&String> = result
        .findings
        .iter()
        .filter(|f| SAME_ENTITY_RULES.contains(&f.rule_id.as_str()) && f.level == RiskLevel::High)
        .map(|f| &f.rule_id)
        .collect();
    assert!(
        high_entity.is_empty(),
        "正常数据不应出现 high 级「同一主体」跨公司线索，实际: {high_entity:?}"
    );

    let medium_entity: Vec<&String> = result
        .findings
        .iter()
        .filter(|f| SAME_ENTITY_RULES.contains(&f.rule_id.as_str()) && f.level == RiskLevel::Medium)
        .map(|f| &f.rule_id)
        .collect();
    assert!(
        medium_entity.is_empty(),
        "正常数据不应出现 medium 级「同一主体」跨公司线索，实际: {medium_entity:?}"
    );
}

#[test]
fn same_person_detected_as_high() {
    let root = samples_root().join("同一人");
    assert!(root.exists(), "缺失样本目录: {root:?}");
    let result = load_dataset(&root);
    write_json("同一人", &result);

    let person_high = result
        .findings
        .iter()
        .any(|f| f.rule_id == "SAME_PERSON" && f.level == RiskLevel::High);
    assert!(
        person_high,
        "同一人样本应命中 SAME_PERSON 且为 high，实际 findings: {:?}",
        result
            .findings
            .iter()
            .map(|f| (f.rule_id.as_str(), format!("{:?}", f.level)))
            .collect::<BTreeMap<_, _>>()
    );
}

#[test]
fn merged_four_companies_no_cross_contamination() {
    // 把「正常数据」与「同一人」两组全部公司（共 4 家）合并跑一次，
    // 验证混合场景下：同一人信号仍存在，且正常数据公司不被误报。
    let root = samples_root();
    assert!(root.exists(), "缺失样本根目录: {root:?}");
    let result = load_merged(&root);
    write_json("merged", &result);

    // 1. 同一人信号（耀浩 ↔ 云诺）在合并场景下仍应命中 SAME_PERSON high。
    let person_high = result
        .findings
        .iter()
        .any(|f| f.rule_id == "SAME_PERSON" && f.level == RiskLevel::High);
    assert!(person_high, "合并场景应仍能命中 SAME_PERSON(high)");

    // 2. 正常数据两家公司（禾通阳 / 研嘉）与另外两家之间不应出现 high/medium 级「同一主体」线索。
    let contaminated: Vec<String> = result
        .findings
        .iter()
        .filter(|f| {
            SAME_ENTITY_RULES.contains(&f.rule_id.as_str())
                && (f.level == RiskLevel::High || f.level == RiskLevel::Medium)
                && f.refs.len() == 2
                && involves_normal_company(&f.refs)
        })
        .map(|f| format!("{}@{:?}", f.rule_id, f.level))
        .collect();
    assert!(
        contaminated.is_empty(),
        "合并场景：正常数据公司不应被误报为「同一主体」跨公司线索，实际: {contaminated:?}"
    );

    // 3. 不应把同一人信号误判到正常数据公司身上（即 SAME_PERSON 的双方必属「同一人」组）。
    let person_wrong_target = result.findings.iter().any(|f| {
        f.rule_id == "SAME_PERSON" && f.refs.iter().any(|r| is_normal_company(&r.company_id))
    });
    assert!(
        !person_wrong_target,
        "合并场景：SAME_PERSON 不应牵连正常数据公司"
    );
}

fn is_normal_company(company_id: &str) -> bool {
    company_id.contains("禾通阳") || company_id.contains("研嘉")
}

fn involves_normal_company(
    refs: &[tauri_native_lib::documents::compare::model::FindingRef],
) -> bool {
    refs.iter().any(|r| is_normal_company(&r.company_id))
}

#[test]
fn revision_traces_detected_on_shared_annotation_author() {
    // 验证 REVISION_TRACES 规则：两不同公司文件批注/修订作者有交集 → 产出 medium 线索。
    // 真实样本可能无批注，故用构造输入单测规则逻辑。
    let files = vec![
        CompareFileInput {
            id: "a1".into(),
            company_id: "co-A".into(),
            company_name: "公司A".into(),
            file_name: "a.pdf".into(),
            creator: "张三".into(),
            annotation_authors: vec!["李四".into()],
            revision_authors: vec![],
            xmp_creators: vec![],
            has_hidden_markers: true,
            ..Default::default()
        },
        CompareFileInput {
            id: "b1".into(),
            company_id: "co-B".into(),
            company_name: "公司B".into(),
            file_name: "b.pdf".into(),
            creator: "王五".into(),
            annotation_authors: vec!["李四".into()],
            revision_authors: vec![],
            xmp_creators: vec![],
            has_hidden_markers: true,
            ..Default::default()
        },
    ];
    let result = run_compare(&files, &CompareOptions::default());
    let trace = result
        .findings
        .iter()
        .find(|f| f.rule_id == "REVISION_TRACES");
    assert!(
        trace.is_some(),
        "应产出 REVISION_TRACES，实际 findings: {:?}",
        result.findings
    );
    assert_eq!(trace.unwrap().level, RiskLevel::Medium);
}

#[test]
fn rule_override_can_disable_revision_traces() {
    // 验证规则产品化预留接口：禁用 REVISION_TRACES 后不再产出该线索。
    let files = vec![
        CompareFileInput {
            id: "a1".into(),
            company_id: "co-A".into(),
            company_name: "公司A".into(),
            file_name: "a.pdf".into(),
            creator: "张三".into(),
            annotation_authors: vec!["李四".into()],
            ..Default::default()
        },
        CompareFileInput {
            id: "b1".into(),
            company_id: "co-B".into(),
            company_name: "公司B".into(),
            file_name: "b.pdf".into(),
            creator: "王五".into(),
            annotation_authors: vec!["李四".into()],
            ..Default::default()
        },
    ];
    let mut overrides = BTreeMap::new();
    overrides.insert(
        "REVISION_TRACES".to_string(),
        tauri_native_lib::documents::compare::model::RuleOverride {
            enabled: Some(false),
            level: None,
        },
    );
    let options = CompareOptions {
        rule_overrides: Some(overrides),
        ..Default::default()
    };
    let result = run_compare(&files, &options);
    assert!(
        !result
            .findings
            .iter()
            .any(|f| f.rule_id == "REVISION_TRACES"),
        "禁用后不应产出 REVISION_TRACES"
    );
}
