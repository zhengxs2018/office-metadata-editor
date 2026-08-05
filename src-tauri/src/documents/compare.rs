use std::collections::HashSet;

use pinyin::ToPinyin;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatchReport {
    pub risk_level: String,
    pub issue: String,
    pub fields: Vec<String>,
    pub value: String,
    pub files: Vec<String>,
    pub companies: Vec<String>,
    pub score: f64,
    pub match_tag: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompareFileInput {
    pub id: String,
    pub file_name: String,
    pub company: String,
    pub author: String,
    pub last_modified_by: String,
    pub app_company: String,
}

const PERSON_THRESHOLD: f64 = 0.8;

fn stop_words() -> HashSet<&'static str> {
    ["admin", "null", "未知", "无", ""].into_iter().collect()
}

fn normalize(text: &str) -> Option<String> {
    let cleaned: String = text
        .to_lowercase()
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '@' || *c == '.' || *c == '_')
        .collect();
    if cleaned.is_empty() || stop_words().contains(cleaned.as_str()) {
        None
    } else {
        Some(cleaned)
    }
}

fn to_pinyin_str(text: &str) -> String {
    text.to_pinyin()
        .flatten()
        .map(|py| py.plain())
        .collect::<String>()
}

fn levenshtein(a: &str, b: &str) -> usize {
    let a_chars: Vec<char> = a.chars().collect();
    let b_chars: Vec<char> = b.chars().collect();
    let m = a_chars.len();
    let n = b_chars.len();

    if m == 0 {
        return n;
    }
    if n == 0 {
        return m;
    }

    let mut prev: Vec<usize> = (0..=n).collect();
    let mut curr = vec![0; n + 1];

    for i in 1..=m {
        curr[0] = i;
        for j in 1..=n {
            let cost = if a_chars[i - 1] == b_chars[j - 1] { 0 } else { 1 };
            curr[j] = (prev[j] + 1)
                .min(curr[j - 1] + 1)
                .min(prev[j - 1] + cost);
        }
        std::mem::swap(&mut prev, &mut curr);
    }
    prev[n]
}

fn check_person_match(v1: &str, v2: &str) -> Option<(f64, &'static str)> {
    let s1 = normalize(v1)?;
    let s2 = normalize(v2)?;

    if s1 == s2 {
        return Some((1.0, "EXACT"));
    }

    if levenshtein(&s1, &s2) <= 1 && to_pinyin_str(&s1) == to_pinyin_str(&s2) {
        return Some((0.95, "PINYIN_EDIT"));
    }

    if s1.chars().count() <= 3 && s2.chars().count() <= 3 && s1.chars().count() == s2.chars().count() {
        let chars1: Vec<char> = s1.chars().collect();
        let chars2: Vec<char> = s2.chars().collect();
        let anchor_ok = chars1.first() == chars2.first() || chars1.last() == chars2.last();
        if anchor_ok {
            let mut sorted1 = chars1.clone();
            let mut sorted2 = chars2.clone();
            sorted1.sort();
            sorted2.sort();
            if sorted1 == sorted2 {
                return Some((0.90, "ANAGRAM_ANCHORED"));
            }
        }
    }

    let max_len = s1.chars().count().max(s2.chars().count()) as f64;
    if max_len > 0.0 {
        let sim = 1.0 - (levenshtein(&s1, &s2) as f64 / max_len);
        if sim >= PERSON_THRESHOLD {
            return Some((sim, "EDIT_SIM"));
        }
    }

    None
}

/// 跨公司文件之间比对 app_company（文件 app.xml 的 `<Company>` 标准字段）：
/// 不同公司的文件使用了相同 / 高度相似的公司标识 → 非同一家单位（中风险）。
fn check_app_company_across(
    fa: &CompareFileInput,
    fb: &CompareFileInput,
    reports: &mut Vec<MatchReport>,
) {
    let a = fa.app_company.trim();
    let b = fb.app_company.trim();
    if a.is_empty() || b.is_empty() {
        return;
    }
    let na = match normalize(a) {
        Some(v) => v,
        None => return,
    };
    let nb = match normalize(b) {
        Some(v) => v,
        None => return,
    };

    if na == nb {
        reports.push(MatchReport {
            risk_level: "medium".to_string(),
            issue: "不同公司使用了相同的公司标识".to_string(),
            fields: vec!["公司标识".to_string(), "公司标识".to_string()],
            value: na,
            files: vec![fa.file_name.clone(), fb.file_name.clone()],
            companies: vec![fa.company.clone(), fb.company.clone()],
            score: 1.0,
            match_tag: "APP_COMPANY_MATCH".to_string(),
        });
        return;
    }

    let max_len = na.chars().count().max(nb.chars().count()) as f64;
    if max_len == 0.0 {
        return;
    }
    let sim = 1.0 - (levenshtein(&na, &nb) as f64 / max_len);
    if sim >= 0.7 {
        reports.push(MatchReport {
            risk_level: "medium".to_string(),
            issue: "不同公司使用的公司标识高度相似".to_string(),
            fields: vec!["公司标识".to_string(), "公司标识".to_string()],
            value: na,
            files: vec![fa.file_name.clone(), fb.file_name.clone()],
            companies: vec![fa.company.clone(), fb.company.clone()],
            score: sim,
            match_tag: "APP_COMPANY_SIMILAR".to_string(),
        });
    }
}

/// 对比两家公司的文件（A 公司文件 × B 公司文件全面两两对比）。
/// 同公司文件之间不对比；空值 / stop words / 一致值不产出。
pub fn compare_files(files: &[CompareFileInput]) -> Vec<MatchReport> {
    let mut reports: Vec<MatchReport> = Vec::new();

    let unique_companies: HashSet<&str> = files
        .iter()
        .filter(|f| !f.company.trim().is_empty())
        .map(|f| f.company.as_str())
        .collect();
    if unique_companies.len() >= 2 {
        let company_a = unique_companies.iter().copied().next().unwrap_or_default();
        for fa in files {
            if fa.company != company_a {
                continue;
            }
            for fb in files {
                if fb.company == company_a {
                    continue;
                }
                compare_cross_company_pair(fa, fb, &mut reports);
                check_app_company_across(fa, fb, &mut reports);
            }
        }
    }

    reports.sort_by(|a, b| {
        b.score
            .partial_cmp(&a.score)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    reports
}

fn compare_cross_company_pair(fa: &CompareFileInput, fb: &CompareFileInput, reports: &mut Vec<MatchReport>) {
    const FIELD_GETTERS: [(&str, fn(&CompareFileInput) -> &str); 2] = [
        ("作者", |f| &f.author),
        ("最后一次修改者", |f| &f.last_modified_by),
    ];

    for (label_a, getter_a) in FIELD_GETTERS.iter() {
        for (label_b, getter_b) in FIELD_GETTERS.iter() {
            let va = getter_a(fa).trim();
            let vb = getter_b(fb).trim();
            if va.is_empty() || vb.is_empty() {
                continue;
            }

            if let Some((score, tag)) = check_person_match(va, vb) {
                reports.push(MatchReport {
                    risk_level: "high".to_string(),
                    issue: "疑似同一人".to_string(),
                    fields: vec![label_a.to_string(), label_b.to_string()],
                    value: if va.chars().count() >= vb.chars().count() {
                        va.to_string()
                    } else {
                        vb.to_string()
                    },
                    files: vec![fa.file_name.clone(), fb.file_name.clone()],
                    companies: vec![fa.company.clone(), fb.company.clone()],
                    score,
                    match_tag: tag.to_string(),
                });
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(
        id: &str,
        name: &str,
        company: &str,
        author: &str,
        last: &str,
        app_company: &str,
    ) -> CompareFileInput {
        CompareFileInput {
            id: id.to_string(),
            file_name: name.to_string(),
            company: company.to_string(),
            author: author.to_string(),
            last_modified_by: last.to_string(),
            app_company: app_company.to_string(),
        }
    }

    #[test]
    fn ignores_same_company_pairs() {
        let files = vec![
            input("a", "a.docx", "A公司", "高栋梁", "", ""),
            input("b", "b.docx", "A公司", "高栋梁", "", ""),
        ];
        assert!(compare_files(&files).is_empty());
    }

    #[test]
    fn detects_cross_company_same_person() {
        let files = vec![
            input("a", "a.docx", "A公司", "高栋梁", "", ""),
            input("b", "b.docx", "B公司", "高栋梁", "", ""),
        ];
        let reports = compare_files(&files);
        assert_eq!(reports.len(), 1);
        assert_eq!(reports[0].risk_level, "high");
        assert_eq!(reports[0].issue, "疑似同一人");
    }

    #[test]
    fn ignores_whitespace_reordered_name() {
        let files = vec![
            input("a", "a.docx", "A公司", "高栋梁", "", ""),
            input("b", "b.docx", "B公司", "栋梁 高", "", ""),
        ];
        assert!(compare_files(&files).is_empty());
    }

    #[test]
    fn detects_cross_company_app_company_match() {
        let files = vec![
            input(
                "a",
                "a.docx",
                "A公司",
                "高栋梁",
                "",
                "海康威视数字技术股份有限公司",
            ),
            input(
                "b",
                "b.docx",
                "B公司",
                "王小明",
                "",
                "海康威视数字技术股份有限公司",
            ),
        ];
        let reports = compare_files(&files);
        assert!(reports.iter().any(|r| {
            r.risk_level == "medium" && r.issue.contains("公司标识")
        }));
    }

    #[test]
    fn app_company_match_ignored_when_same_company() {
        let files = vec![
            input("a", "a.docx", "A公司", "高栋梁", "", "Microsoft"),
            input("b", "b.docx", "A公司", "高卓栋", "", "Microsoft"),
        ];
        assert!(compare_files(&files).is_empty());
    }
}
