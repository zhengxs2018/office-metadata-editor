use std::collections::HashSet;
use std::sync::OnceLock;

use pinyin::ToPinyin;

pub const PERSON_THRESHOLD: f64 = 0.8;
pub const COMPANY_SIMILAR_THRESHOLD: f64 = 0.7;

fn stop_words() -> &'static HashSet<&'static str> {
    static CELL: OnceLock<HashSet<&'static str>> = OnceLock::new();
    CELL.get_or_init(|| super::rules::stop_words_for("compare.fields.stop_words").iter().copied().collect())
}

fn generic_templates() -> &'static HashSet<&'static str> {
    static CELL: OnceLock<HashSet<&'static str>> = OnceLock::new();
    CELL.get_or_init(|| super::rules::stop_words_for("compare.fields.template").iter().copied().collect())
}

/// 归一化文本用于比对：小写、去除标点与空白、命中停用词返回 None。
pub fn normalize(text: &str) -> Option<String> {
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

/// 模板值归一化：仅剥离路径与大小写，用于白名单判定。
pub fn normalize_template(text: &str) -> Option<String> {
    let base = text
        .trim()
        .rsplit(['/', '\\'])
        .next()
        .unwrap_or("")
        .to_lowercase();
    if base.is_empty() || generic_templates().contains(base.as_str()) {
        None
    } else {
        Some(base)
    }
}

pub(crate) fn to_pinyin_str(text: &str) -> String {
    text.to_pinyin()
        .flatten()
        .map(|py| py.plain())
        .collect::<String>()
}

pub fn levenshtein(a: &str, b: &str) -> usize {
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
            curr[j] = (prev[j] + 1).min(curr[j - 1] + 1).min(prev[j - 1] + cost);
        }
        std::mem::swap(&mut prev, &mut curr);
    }
    prev[n]
}

pub fn similarity(a: &str, b: &str) -> f64 {
    let max_len = a.chars().count().max(b.chars().count()) as f64;
    if max_len == 0.0 {
        return 0.0;
    }
    1.0 - (levenshtein(a, b) as f64 / max_len)
}

/// 把人名转成与顺序、空格无关的指纹，用于聚合同一人的不同写法。
/// 例如 "卓栋 高" / "高卓栋" / "卓栋高" 都会得到相同指纹。
fn name_fingerprint(s: &str) -> String {
    let mut chars: Vec<char> = s.chars().filter(|c| !c.is_whitespace()).collect();
    chars.sort_unstable();
    to_pinyin_str(&chars.iter().collect::<String>())
}

fn person_entity_key(s1: &str, s2: &str) -> String {
    let longer = if s1.chars().count() >= s2.chars().count() { s1 } else { s2 };
    name_fingerprint(longer)
}

/// 人名匹配：返回 (置信度, 匹配算法标签, 聚合实体键)。
pub fn check_person_match(v1: &str, v2: &str) -> Option<(f64, &'static str, String)> {
    let s1 = normalize(v1)?;
    let s2 = normalize(v2)?;
    let key = person_entity_key(&s1, &s2);

    if s1 == s2 {
        return Some((1.0, "EXACT", key));
    }

    // 中文姓名乱序/空格错位视为同一人（如 "卓栋 高" vs "高卓栋"）。
    // 用字符多重集排序生成指纹，避免顺序噪声导致同一主体被拆簇。
    let fingerprint1 = name_fingerprint(&s1);
    let fingerprint2 = name_fingerprint(&s2);
    if !fingerprint1.is_empty() && fingerprint1 == fingerprint2 {
        return Some((0.92, "NAME_ANAGRAM", fingerprint1));
    }

    if levenshtein(&s1, &s2) <= 1 && to_pinyin_str(&s1) == to_pinyin_str(&s2) {
        return Some((0.95, "PINYIN_EDIT", key));
    }

    if s1.chars().count() <= 3
        && s2.chars().count() <= 3
        && s1.chars().count() == s2.chars().count()
    {
        let chars1: Vec<char> = s1.chars().collect();
        let chars2: Vec<char> = s2.chars().collect();
        let anchor_ok = chars1.first() == chars2.first() || chars1.last() == chars2.last();
        if anchor_ok {
            let mut sorted1 = chars1.clone();
            let mut sorted2 = chars2.clone();
            sorted1.sort_unstable();
            sorted2.sort_unstable();
            if sorted1 == sorted2 {
                return Some((0.90, "ANAGRAM_ANCHORED", key));
            }
        }
    }

    let sim = similarity(&s1, &s2);
    if sim >= PERSON_THRESHOLD {
        return Some((sim, "EDIT_SIM", key));
    }

    let min_len = s1.chars().count().min(s2.chars().count());
    let max_len = s1.chars().count().max(s2.chars().count());
    if min_len >= 2 && (min_len as f64 / max_len as f64) >= 0.5 {
        let is_placeholder = |s: &str| {
            s.chars().count() <= 3 && s.chars().all(|c| c.is_ascii_alphabetic())
        };
        let short = if s1.chars().count() <= s2.chars().count() { &s1 } else { &s2 };
        if !is_placeholder(short) {
            if s1.len() <= s2.len() && s2.contains(&s1) {
                return Some((0.88, "SUBSET_NORM", key));
            }
            if s2.len() <= s1.len() && s1.contains(&s2) {
                return Some((0.88, "SUBSET_NORM", key));
            }
        }
        let p1 = to_pinyin_str(&s1);
        let p2 = to_pinyin_str(&s2);
        if !p1.is_empty() && !p2.is_empty() {
            if p1.len() <= p2.len() && p2.contains(&p1) {
                return Some((0.85, "SUBSET_PINYIN", key));
            }
            if p2.len() <= p1.len() && p1.contains(&p2) {
                return Some((0.85, "SUBSET_PINYIN", key));
            }
        }
    }

    None
}

fn is_leap(year: i64) -> bool {
    (year % 4 == 0 && year % 100 != 0) || year % 400 == 0
}

fn civil_from_days(days: i64) -> (i64, u8, u8) {
    let mut year = 1970_i64;
    let mut remaining = days;
    if remaining >= 0 {
        loop {
            let ydays = if is_leap(year) { 366 } else { 365 };
            if remaining < ydays {
                break;
            }
            remaining -= ydays;
            year += 1;
        }
    } else {
        loop {
            year -= 1;
            let ydays = if is_leap(year) { 366 } else { 365 };
            remaining += ydays;
            if remaining >= 0 {
                break;
            }
        }
    }
    const CUMULATIVE: [i64; 13] = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365];
    const DAYS_IN_MONTH: [i64; 12] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let leap = if is_leap(year) { 1 } else { 0 };
    let mut month = 1_u8;
    let mut day = 1_i64;
    for m in 0..12 {
        let start = CUMULATIVE[m] + if m >= 2 { leap } else { 0 };
        let end = start + DAYS_IN_MONTH[m] + if m == 1 { leap } else { 0 };
        if remaining < end {
            day = remaining - start + 1;
            month = (m + 1) as u8;
            break;
        }
    }
    (year, month, day as u8)
}

/// 将 Unix 秒格式化为可读时间串，用于时间线索聚合 key 与展示。
pub fn format_timestamp(seconds: i64) -> Option<String> {
    if seconds < 0 {
        return None;
    }
    let secs_of_day = seconds % 86_400;
    let days = seconds / 86_400;
    let (year, month, day) = civil_from_days(days);
    let hour = secs_of_day / 3_600;
    let minute = (secs_of_day % 3_600) / 60;
    Some(format!("{year:04}-{month:02}-{day:02}T{hour:02}:{minute:02}"))
}

/// 把两个时间归到同一个桶，桶大小与判定窗口一致。
pub fn timestamp_bucket_key(a: &str, b: &str, bucket_minutes: i64) -> Option<String> {
    let ca = parse_timestamp(a)?;
    let cb = parse_timestamp(b)?;
    let bucket = bucket_minutes.max(1) * 60;
    let start = ca.min(cb);
    let bucket_start = (start / bucket) * bucket;
    format_timestamp(bucket_start)
}

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    const CUMULATIVE: [i64; 12] = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    let mut days = 0_i64;
    if year >= 1970 {
        for y in 1970..year {
            days += if is_leap(y) { 366 } else { 365 };
        }
    } else {
        for y in year..1970 {
            days -= if is_leap(y) { 366 } else { 365 };
        }
    }
    days += CUMULATIVE[(month - 1) as usize];
    if month > 2 && is_leap(year) {
        days += 1;
    }
    days + day - 1
}

/// 解析 ISO8601 / 常见时间串为 Unix 秒（按 UTC，忽略时区偏移）。
/// 无外部依赖实现：只接受 `YYYY-MM-DD` 后跟可选的 `HH:MM[:SS]`。
pub fn parse_timestamp(text: &str) -> Option<i64> {
    let t = text.trim();
    if t.len() < 10 {
        return None;
    }
    let bytes = t.as_bytes();
    let num = |start: usize, len: usize| -> Option<i64> {
        let slice = t.get(start..start + len)?;
        if !slice.bytes().all(|b| b.is_ascii_digit()) {
            return None;
        }
        slice.parse::<i64>().ok()
    };

    if bytes[4] != b'-' || bytes[7] != b'-' {
        return None;
    }
    let year = num(0, 4)?;
    let month = num(5, 2)?;
    let day = num(8, 2)?;
    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return None;
    }

    let (mut hour, mut minute, mut second) = (0_i64, 0_i64, 0_i64);
    if t.len() >= 16 {
        let sep = bytes[10];
        if (sep == b'T' || sep == b' ') && bytes[13] == b':' {
            hour = num(11, 2)?;
            minute = num(14, 2)?;
            if t.len() >= 19 && bytes[16] == b':' {
                second = num(17, 2)?;
            }
        }
    }
    if hour > 23 || minute > 59 || second > 60 {
        return None;
    }

    Some(days_from_civil(year, month, day) * 86_400 + hour * 3_600 + minute * 60 + second)
}

