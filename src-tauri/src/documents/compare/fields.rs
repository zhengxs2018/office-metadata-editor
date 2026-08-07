use super::model::{CompareFileInput, FieldTier};

pub struct FieldSpec {
    pub key: &'static str,
    pub label: &'static str,
    pub tier: FieldTier,
    pub extract: fn(&CompareFileInput) -> &str,
}

pub const FIELDS: &[FieldSpec] = &[
    FieldSpec {
        key: "creator",
        label: "作者",
        tier: FieldTier::Risk,
        extract: |f| &f.creator,
    },
    FieldSpec {
        key: "lastModifiedBy",
        label: "最后修改者",
        tier: FieldTier::Risk,
        extract: |f| &f.last_modified_by,
    },
    FieldSpec {
        key: "appCompany",
        label: "公司",
        tier: FieldTier::Risk,
        extract: |f| &f.app_company,
    },
    FieldSpec {
        key: "manager",
        label: "管理者",
        tier: FieldTier::Risk,
        extract: |f| &f.manager,
    },
    FieldSpec {
        key: "template",
        label: "模板",
        tier: FieldTier::Risk,
        extract: |f| &f.template,
    },
    FieldSpec {
        key: "created",
        label: "创建时间",
        tier: FieldTier::Risk,
        extract: |f| &f.created,
    },
    FieldSpec {
        key: "application",
        label: "应用程序",
        tier: FieldTier::Risk,
        extract: |f| &f.application,
    },
    FieldSpec {
        key: "appVersion",
        label: "应用版本",
        tier: FieldTier::Risk,
        extract: |f| &f.app_version,
    },
    FieldSpec {
        key: "revision",
        label: "修订次数",
        tier: FieldTier::Risk,
        extract: |f| &f.revision,
    },
    FieldSpec {
        key: "modified",
        label: "修改时间",
        tier: FieldTier::Display,
        extract: |f| &f.modified,
    },
    FieldSpec {
        key: "title",
        label: "标题",
        tier: FieldTier::Display,
        extract: |f| &f.title,
    },
    FieldSpec {
        key: "subject",
        label: "主题",
        tier: FieldTier::Display,
        extract: |f| &f.subject,
    },
    FieldSpec {
        key: "keywords",
        label: "关键词",
        tier: FieldTier::Display,
        extract: |f| &f.keywords,
    },
    FieldSpec {
        key: "description",
        label: "备注",
        tier: FieldTier::Display,
        extract: |f| &f.description,
    },
    FieldSpec {
        key: "category",
        label: "类别",
        tier: FieldTier::Display,
        extract: |f| &f.category,
    },
    FieldSpec {
        key: "contentStatus",
        label: "内容状态",
        tier: FieldTier::Display,
        extract: |f| &f.content_status,
    },
    FieldSpec {
        key: "version",
        label: "版本",
        tier: FieldTier::Display,
        extract: |f| &f.version,
    },
    FieldSpec {
        key: "language",
        label: "语言",
        tier: FieldTier::Display,
        extract: |f| &f.language,
    },
    FieldSpec {
        key: "totalTime",
        label: "编辑总时长",
        tier: FieldTier::Display,
        extract: |f| &f.total_time,
    },
];

pub fn spec(key: &str) -> Option<&'static FieldSpec> {
    FIELDS.iter().find(|f| f.key == key)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn field_keys_are_unique() {
        let mut keys: Vec<&str> = FIELDS.iter().map(|f| f.key).collect();
        let total = keys.len();
        keys.sort_unstable();
        keys.dedup();
        assert_eq!(keys.len(), total, "字段 key 必须唯一");
    }

    #[test]
    fn risk_fields_cover_rule_inputs() {
        for key in [
            "creator",
            "lastModifiedBy",
            "appCompany",
            "manager",
            "template",
            "created",
            "application",
            "appVersion",
            "revision",
        ] {
            let found = spec(key).unwrap_or_else(|| panic!("缺少字段 {key}"));
            assert_eq!(found.tier, FieldTier::Risk, "{key} 应为风险字段");
        }
    }
}
