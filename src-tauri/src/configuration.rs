//! 应用配置中心
//!
//! 设计要点：
//! - **扁平点分键**：对外一律以 `ui.export.revealAfterExport`、`engine.compare.fields.stopWords`
//!   这类点分路径读写，避免 `ui.*` 与 `engine.*` 命名空间混淆。
//! - **多层级存储**：内部以 [`serde_json::Value`] 树保存，点分键在读写时自动展开为嵌套对象。
//! - **三层合并**：内置默认值（编译期打包的 `resources/settings.default.json`）
//!   ← 用户配置（`$APPCONFIG/settings.json`）。读取时用户值覆盖默认值。
//! - **按组读取**：[`Configuration::section`] ，返回带前缀的取值器。

use std::collections::BTreeMap;
use std::path::PathBuf;
use std::sync::RwLock;

use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

/// 内置默认配置。
/// 随二进制打包，保证离线可用且永远有兜底值。
const DEFAULT_SETTINGS: &str = include_str!("../resources/settings.default.json");

const SETTINGS_FILE_NAME: &str = "settings.json";

/// 配置读写错误。
#[derive(Debug)]
pub enum ConfigError {
    /// 配置文件所在目录无法解析或创建
    Io(String),
    /// JSON 解析或序列化失败
    Parse(String),
}

impl std::fmt::Display for ConfigError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ConfigError::Io(msg) => write!(f, "配置文件读写失败: {msg}"),
            ConfigError::Parse(msg) => write!(f, "配置解析失败: {msg}"),
        }
    }
}

impl std::error::Error for ConfigError {}

impl From<ConfigError> for String {
    fn from(err: ConfigError) -> Self {
        err.to_string()
    }
}

/// 把点分键展开写入嵌套对象树。
///
/// `set_deep(root, "ui.export.reveal", true)` 得到
/// `{"ui":{"export":{"reveal":true}}}`。中途遇到非对象节点会被覆盖为对象，
/// 保证写入总能成功而不是静默丢弃。
fn set_deep(root: &mut Map<String, Value>, key: &str, value: Value) {
    let segments: Vec<&str> = key.split('.').filter(|s| !s.is_empty()).collect();
    let Some((last, parents)) = segments.split_last() else {
        return;
    };

    let mut cursor = root;
    for segment in parents {
        let entry = cursor
            .entry((*segment).to_string())
            .or_insert_with(|| Value::Object(Map::new()));
        if !entry.is_object() {
            *entry = Value::Object(Map::new());
        }
        cursor = entry.as_object_mut().expect("已确保为对象");
    }
    cursor.insert((*last).to_string(), value);
}

/// 按点分键读取嵌套值。
///
/// 同时兼容两种书写形式：先尝试整键命中
/// 这让用户手写 `settings.json` 时两种风格都能生效。
fn get_deep<'a>(root: &'a Map<String, Value>, key: &str) -> Option<&'a Value> {
    if let Some(found) = root.get(key) {
        return Some(found);
    }

    let mut cursor: &Value = &Value::Null;
    let mut current_map = Some(root);
    let segments: Vec<&str> = key.split('.').filter(|s| !s.is_empty()).collect();

    for (index, segment) in segments.iter().enumerate() {
        let map = current_map?;
        // 允许「前缀扁平 + 剩余嵌套」的混合写法，例如
        // `{"engine.compare": {"fields": {...}}}`
        let remaining = segments[index..].join(".");
        if let Some(found) = map.get(&remaining) {
            return Some(found);
        }
        let next = map.get(*segment)?;
        cursor = next;
        current_map = next.as_object();
    }

    Some(cursor)
}

/// 深合并：`overlay` 覆盖 `base`，同为对象时递归合并，否则整体替换。
fn merge_deep(base: &mut Map<String, Value>, overlay: &Map<String, Value>) {
    for (key, overlay_value) in overlay {
        match (base.get_mut(key), overlay_value) {
            (Some(Value::Object(base_child)), Value::Object(overlay_child)) => {
                merge_deep(base_child, overlay_child);
            }
            _ => {
                base.insert(key.clone(), overlay_value.clone());
            }
        }
    }
}

/// 把可能含点分键的扁平对象标准化为纯嵌套树，便于统一合并与落盘。
fn normalize(raw: &Map<String, Value>) -> Map<String, Value> {
    let mut out = Map::new();
    for (key, value) in raw {
        let normalized_value = match value {
            Value::Object(child) => Value::Object(normalize(child)),
            other => other.clone(),
        };
        if key.contains('.') {
            set_deep(&mut out, key, normalized_value);
        } else {
            match (out.get_mut(key), &normalized_value) {
                (Some(Value::Object(existing)), Value::Object(incoming)) => {
                    merge_deep(existing, incoming);
                }
                _ => {
                    out.insert(key.clone(), normalized_value);
                }
            }
        }
    }
    out
}

/// 某个前缀分组下的取值器
pub struct ConfigSection {
    prefix: String,
    merged: Map<String, Value>,
}

impl ConfigSection {
    /// 读取分组内的键，缺失或类型不符时返回 `fallback`。
    ///
    /// 对应 `config.get<T>('apiKey', '')` 的语义。
    pub fn get<T: for<'de> Deserialize<'de>>(&self, key: &str, fallback: T) -> T {
        self.get_opt(key).unwrap_or(fallback)
    }

    /// 读取分组内的键，缺失或类型不符时返回 `None`。
    pub fn get_opt<T: for<'de> Deserialize<'de>>(&self, key: &str) -> Option<T> {
        let full_key = if self.prefix.is_empty() {
            key.to_string()
        } else if key.is_empty() {
            self.prefix.clone()
        } else {
            format!("{}.{}", self.prefix, key)
        };
        let value = get_deep(&self.merged, &full_key)?;
        if value.is_null() {
            return None;
        }
        serde_json::from_value(value.clone()).ok()
    }
}

/// 配置中心。持有默认值与用户值，提供合并读取与持久化写入。
pub struct Configuration {
    defaults: Map<String, Value>,
    user: RwLock<Map<String, Value>>,
    path: PathBuf,
}

impl Configuration {
    /// 从磁盘加载配置；用户文件缺失或损坏时退回内置默认值，不阻断启动。
    ///
    /// # Errors
    /// 内置默认配置无法解析时返回 [`ConfigError::Parse`]，这属于打包错误。
    pub fn load(config_dir: PathBuf) -> Result<Self, ConfigError> {
        let defaults: Map<String, Value> = serde_json::from_str::<Value>(DEFAULT_SETTINGS)
            .map_err(|err| ConfigError::Parse(err.to_string()))?
            .as_object()
            .map(normalize)
            .ok_or_else(|| ConfigError::Parse("内置默认配置必须是 JSON 对象".to_string()))?;

        let path = config_dir.join(SETTINGS_FILE_NAME);
        let user = std::fs::read_to_string(&path)
            .ok()
            .and_then(|text| serde_json::from_str::<Value>(&text).ok())
            .and_then(|value| value.as_object().map(normalize))
            .unwrap_or_default();

        Ok(Self {
            defaults,
            user: RwLock::new(user),
            path,
        })
    }

    /// 默认值与用户值的合并快照。
    fn merged(&self) -> Map<String, Value> {
        let mut merged = self.defaults.clone();
        if let Ok(user) = self.user.read() {
            merge_deep(&mut merged, &user);
        }
        merged
    }

    /// 取某个前缀分组
    pub fn section(&self, prefix: &str) -> ConfigSection {
        ConfigSection {
            prefix: prefix.to_string(),
            merged: self.merged(),
        }
    }

    /// 按完整点分键读取，缺失时返回 `fallback`。
    pub fn get<T: for<'de> Deserialize<'de>>(&self, key: &str, fallback: T) -> T {
        self.section("").get(key, fallback)
    }

    /// 全量合并结果，供前端一次性拉取。
    pub fn snapshot(&self) -> Value {
        Value::Object(self.merged())
    }

    /// 仅用户覆盖项，供设置页面区分"已修改"与"默认"。
    pub fn user_overrides(&self) -> Value {
        self.user
            .read()
            .map(|user| Value::Object(user.clone()))
            .unwrap_or(Value::Object(Map::new()))
    }

    /// 写入单个点分键并落盘。传 `Value::Null` 表示恢复默认（移除用户覆盖）。
    ///
    /// # Errors
    /// 目录创建、序列化或写文件失败时返回对应错误。
    pub fn update(&self, key: &str, value: Value) -> Result<(), ConfigError> {
        {
            let mut user = self
                .user
                .write()
                .map_err(|_| ConfigError::Io("配置锁已中毒".to_string()))?;
            if value.is_null() {
                remove_deep(&mut user, key);
            } else {
                set_deep(&mut user, key, value);
            }
        }
        self.persist()
    }

    /// 批量写入点分键并一次性落盘，避免多次磁盘 IO。
    ///
    /// # Errors
    /// 同 [`Configuration::update`]。
    pub fn update_many(&self, entries: BTreeMap<String, Value>) -> Result<(), ConfigError> {
        {
            let mut user = self
                .user
                .write()
                .map_err(|_| ConfigError::Io("配置锁已中毒".to_string()))?;
            for (key, value) in entries {
                if value.is_null() {
                    remove_deep(&mut user, &key);
                } else {
                    set_deep(&mut user, &key, value);
                }
            }
        }
        self.persist()
    }

    /// 清空全部用户覆盖，回到内置默认。
    ///
    /// # Errors
    /// 同 [`Configuration::update`]。
    pub fn reset(&self) -> Result<(), ConfigError> {
        {
            let mut user = self
                .user
                .write()
                .map_err(|_| ConfigError::Io("配置锁已中毒".to_string()))?;
            user.clear();
        }
        self.persist()
    }

    /// 用户配置文件路径，供设置页面「在文件夹中显示」使用。
    pub fn file_path(&self) -> &PathBuf {
        &self.path
    }

    fn persist(&self) -> Result<(), ConfigError> {
        if let Some(parent) = self.path.parent() {
            std::fs::create_dir_all(parent).map_err(|err| ConfigError::Io(err.to_string()))?;
        }
        let user = self
            .user
            .read()
            .map_err(|_| ConfigError::Io("配置锁已中毒".to_string()))?;
        let text = serde_json::to_string_pretty(&Value::Object(user.clone()))
            .map_err(|err| ConfigError::Parse(err.to_string()))?;
        std::fs::write(&self.path, text).map_err(|err| ConfigError::Io(err.to_string()))
    }
}

/// 按点分键移除嵌套值，并清理因此变空的父对象。
fn remove_deep(root: &mut Map<String, Value>, key: &str) {
    // 兼容用户手写的扁平键
    root.remove(key);

    let segments: Vec<&str> = key.split('.').filter(|s| !s.is_empty()).collect();
    let Some((last, parents)) = segments.split_last() else {
        return;
    };

    fn walk(map: &mut Map<String, Value>, parents: &[&str], last: &str) -> bool {
        match parents.split_first() {
            None => {
                map.remove(last);
                map.is_empty()
            }
            Some((head, rest)) => {
                let Some(child) = map.get_mut(*head).and_then(Value::as_object_mut) else {
                    return false;
                };
                if walk(child, rest, last) {
                    map.remove(*head);
                }
                map.is_empty()
            }
        }
    }

    walk(root, parents, last);
}

/// 词典项：既可被引擎消费，也可在设置页面渲染成可编辑表单。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WordDict {
    /// 配置键（点分路径）
    pub id: String,
    /// 展示名
    pub label: String,
    /// 作用域标识
    pub scope: String,
    /// 词条（小写存储，匹配时忽略大小写）
    pub words: Vec<String>,
}
