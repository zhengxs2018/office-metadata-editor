import type { MetadataSchema } from "@/types/metadata"

export const pdfMetadataSchema: MetadataSchema = {
  fileType: "pdf",
  sections: [
    {
      id: "pdf-info",
      title: "PDF 信息",
      description: "PDF 文档信息字典",
      category: "documentProperties",
      fields: [
        {
          key: "title",
          label: "标题",
          editable: true,
          type: "text",
          span: 2,
          source: { category: "documentProperties", field: "title" },
        },
        {
          key: "subject",
          label: "主题",
          editable: true,
          type: "text",
          span: 2,
          source: { category: "documentProperties", field: "subject" },
        },
        {
          key: "creator",
          label: "作者",
          editable: true,
          type: "text",
          source: { category: "documentProperties", field: "creator" },
        },
        {
          key: "lastModifiedBy",
          label: "工具/修改器",
          editable: true,
          type: "text",
          source: { category: "documentProperties", field: "lastModifiedBy" },
        },
        {
          key: "keywords",
          label: "关键词",
          editable: true,
          type: "text",
          source: { category: "documentProperties", field: "keywords" },
        },
        {
          key: "description",
          label: "描述",
          editable: true,
          type: "textarea",
          span: 2,
          source: { category: "documentProperties", field: "description" },
        },
        {
          key: "created",
          label: "创建时间",
          editable: false,
          type: "date",
          source: { category: "documentProperties", field: "created" },
        },
        {
          key: "modified",
          label: "修改时间",
          editable: false,
          type: "date",
          source: { category: "documentProperties", field: "modified" },
        },
      ],
    },
  ],
  previewGroups: [
    {
      id: "pdf-summary",
      title: "PDF 摘要",
      properties: [
        { label: "作者", span: 2, source: { category: "documentProperties", field: "creator" } },
        {
          label: "工具",
          span: 2,
          source: { category: "documentProperties", field: "lastModifiedBy" },
        },
        {
          label: "创建时间",
          span: 2,
          source: { category: "documentProperties", field: "created" },
        },
        {
          label: "修改时间",
          span: 2,
          source: { category: "documentProperties", field: "modified" },
        },
        {
          label: "页数",
          span: 2,
          format: "number",
          onlyPositive: true,
          source: { category: "appProperties", field: "pages" },
        },
        { label: "PDF 版本", span: 2, source: { category: "appProperties", field: "appVersion" } },
      ],
    },
  ],
}
