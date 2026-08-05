import type { MetadataSchema } from "@/types/metadata"
import {
  commonDocumentFieldSchemas,
  commonDublinCoreFieldSchemas,
  commonOrganizationFieldSchemas,
  defaultSyncRules,
} from "./base"

export const xlsxMetadataSchema: MetadataSchema = {
  fileType: "xlsx",
  sections: [
    {
      id: "xlsx-workbook-properties",
      title: "工作簿属性",
      description: "Excel 工作簿元数据",
      category: "documentProperties",
      fields: commonDocumentFieldSchemas,
    },
    {
      id: "xlsx-dublin-core",
      title: "Dublin Core",
      description: "跨系统兼容的核心元数据",
      category: "coreProperties",
      fields: commonDublinCoreFieldSchemas,
    },
    {
      id: "xlsx-organization",
      title: "组织信息",
      description: "公司与责任人信息",
      category: "appProperties",
      fields: commonOrganizationFieldSchemas,
    },
  ],
  previewGroups: [
    {
      id: "xlsx-workbook",
      title: "工作簿信息",
      properties: [
        { label: "公司", span: 2, source: { category: "appProperties", field: "company" } },
        { label: "管理者", span: 2, source: { category: "appProperties", field: "manager" } },
        { label: "模板", span: 2, source: { category: "appProperties", field: "template" } },
        { label: "应用程序", span: 2, source: { category: "appProperties", field: "application" } },
        { label: "应用版本", span: 2, source: { category: "appProperties", field: "appVersion" } },
      ],
    },
    {
      id: "xlsx-stats",
      title: "统计信息",
      properties: [
        {
          label: "工作表数",
          span: 2,
          format: "number",
          onlyPositive: true,
          source: { category: "appProperties", field: "pages" },
        },
        {
          label: "字数",
          span: 2,
          format: "number",
          onlyPositive: true,
          source: { category: "appProperties", field: "words" },
        },
        {
          label: "字符数",
          span: 2,
          format: "number",
          onlyPositive: true,
          source: { category: "appProperties", field: "characters" },
        },
        {
          label: "字符数（含空格）",
          span: 2,
          format: "number",
          onlyPositive: true,
          source: { category: "appProperties", field: "charactersWithSpaces" },
        },
        {
          label: "段落数",
          span: 2,
          format: "number",
          onlyPositive: true,
          source: { category: "appProperties", field: "paragraphs" },
        },
        {
          label: "行数",
          span: 2,
          format: "number",
          onlyPositive: true,
          source: { category: "appProperties", field: "lines" },
        },
      ],
    },
  ],
  syncRules: defaultSyncRules,
}
