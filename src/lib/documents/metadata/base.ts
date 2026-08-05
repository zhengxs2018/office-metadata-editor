import { formatNumber } from "@/lib/utils"
import type {
  DocumentMetadata,
  MetadataFieldSchema,
  MetadataPreviewGroup,
  MetadataPreviewPropertySchema,
  MetadataSchema,
  MetadataSection,
  MetadataSyncRules,
} from "@/types/metadata"

export const defaultSyncRules: MetadataSyncRules = {
  documentToCore: {
    title: "dcTitle",
    subject: "dcSubject",
    creator: "dcCreator",
    description: "dcDescription",
    keywords: "dcKeywords",
    language: "dcLanguage",
    identifier: "dcIdentifier",
    source: "dcSource",
  },
  coreToDocument: {
    dcTitle: "title",
    dcSubject: "subject",
    dcCreator: "creator",
    dcDescription: "description",
    dcKeywords: "keywords",
    dcLanguage: "language",
    dcIdentifier: "identifier",
    dcSource: "source",
  },
}

export const defaultClearStrategy = {
  preserveDocumentFields: ["created", "modified", "revision"],
  preserveCoreFields: [],
  clearAppFields: ["company", "manager"],
}

export const commonDocumentFieldSchemas: MetadataFieldSchema[] = [
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
    key: "language",
    label: "语言",
    editable: true,
    type: "text",
    source: { category: "documentProperties", field: "language" },
  },
  {
    key: "version",
    label: "版本",
    editable: true,
    type: "text",
    source: { category: "documentProperties", field: "version" },
  },
  {
    key: "category",
    label: "类别",
    editable: true,
    type: "text",
    source: { category: "documentProperties", field: "category" },
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
    key: "creator",
    label: "作者",
    editable: true,
    type: "text",
    source: { category: "documentProperties", field: "creator" },
  },
  {
    key: "lastModifiedBy",
    label: "最后修改者",
    editable: true,
    type: "text",
    source: { category: "documentProperties", field: "lastModifiedBy" },
  },
  {
    key: "contentStatus",
    label: "内容状态",
    editable: true,
    type: "text",
    source: { category: "documentProperties", field: "contentStatus" },
  },
  {
    key: "identifier",
    label: "标识符",
    editable: true,
    type: "text",
    source: { category: "documentProperties", field: "identifier" },
  },
  {
    key: "source",
    label: "来源",
    editable: true,
    type: "text",
    span: 2,
    source: { category: "documentProperties", field: "source" },
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
]

export const commonDublinCoreFieldSchemas: MetadataFieldSchema[] = [
  {
    key: "dcTitle",
    label: "标题",
    editable: true,
    type: "text",
    span: 2,
    source: { category: "coreProperties", field: "dcTitle" },
  },
  {
    key: "dcSubject",
    label: "主题",
    editable: true,
    type: "text",
    span: 2,
    source: { category: "coreProperties", field: "dcSubject" },
  },
  {
    key: "dcCreator",
    label: "创建者",
    editable: true,
    type: "text",
    source: { category: "coreProperties", field: "dcCreator" },
  },
  {
    key: "dcLanguage",
    label: "语言",
    editable: true,
    type: "text",
    source: { category: "coreProperties", field: "dcLanguage" },
  },
  {
    key: "dcKeywords",
    label: "关键词",
    editable: true,
    type: "text",
    span: 2,
    source: { category: "coreProperties", field: "dcKeywords" },
  },
  {
    key: "dcDescription",
    label: "描述",
    editable: true,
    type: "textarea",
    span: 2,
    source: { category: "coreProperties", field: "dcDescription" },
  },
  {
    key: "dcIdentifier",
    label: "标识符",
    editable: true,
    type: "text",
    source: { category: "coreProperties", field: "dcIdentifier" },
  },
  {
    key: "dcSource",
    label: "来源",
    editable: true,
    type: "text",
    source: { category: "coreProperties", field: "dcSource" },
  },
]

export const commonOrganizationFieldSchemas: MetadataFieldSchema[] = [
  {
    key: "company",
    label: "公司",
    editable: true,
    type: "text",
    source: { category: "appProperties", field: "company" },
  },
  {
    key: "manager",
    label: "管理者",
    editable: true,
    type: "text",
    source: { category: "appProperties", field: "manager" },
  },
]

function normalizeTextValue(value: string): string {
  return value.normalize("NFC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
}

function readSourceValue(
  metadata: DocumentMetadata,
  category: MetadataSection["category"],
  field: string,
): string | number {
  if (category === "documentProperties") {
    return metadata.documentProperties[field as keyof DocumentMetadata["documentProperties"]] ?? ""
  }

  if (category === "coreProperties") {
    return metadata.coreProperties[field as keyof DocumentMetadata["coreProperties"]] ?? ""
  }

  return metadata.appProperties[field as keyof DocumentMetadata["appProperties"]] ?? ""
}

function formatPreviewValue(raw: string | number, schema: MetadataPreviewPropertySchema): string {
  if (schema.format === "minutes") {
    const text = String(raw ?? "").trim()
    return text ? `${text} 分钟` : ""
  }

  if (schema.format === "number") {
    const value = typeof raw === "number" ? raw : Number(raw)
    if (!Number.isFinite(value)) return ""
    if (schema.onlyPositive && value <= 0) return ""
    return formatNumber(value)
  }

  return normalizeTextValue(String(raw ?? ""))
}

export function buildMetadataSections(
  schema: MetadataSchema,
  metadata: DocumentMetadata,
): MetadataSection[] {
  return schema.sections.map(section => ({
    id: section.id,
    title: section.title,
    description: section.description,
    category: section.category,
    fields: section.fields.map(field => ({
      key: field.key,
      label: field.label,
      value: normalizeTextValue(
        String(readSourceValue(metadata, field.source.category, field.source.field)),
      ),
      editable: field.editable,
      type: field.type,
      ...(field.span ? { span: field.span } : {}),
    })),
  }))
}

export function buildMetadataPreviewGroups(
  schema: MetadataSchema,
  metadata: DocumentMetadata,
): MetadataPreviewGroup[] {
  return schema.previewGroups
    .map(group => ({
      id: group.id,
      title: group.title,
      properties: group.properties
        .map(property => {
          const raw = readSourceValue(metadata, property.source.category, property.source.field)
          const value = formatPreviewValue(raw, property)
          return {
            label: property.label,
            value,
            ...(property.span ? { span: property.span } : {}),
          }
        })
        .filter(item => item.value.trim() !== ""),
    }))
    .filter(group => group.properties.length > 0)
}

export function applyMetadataFieldUpdateBySchema(
  schema: MetadataSchema,
  metadata: DocumentMetadata,
  category: MetadataSection["category"],
  field: string,
  value: string | number,
): DocumentMetadata {
  const normalizedValue = typeof value === "string" ? normalizeTextValue(value) : value

  const next = {
    ...metadata,
    [category]: {
      ...metadata[category],
      [field]: normalizedValue,
    },
  } as DocumentMetadata

  const syncRules = schema.syncRules ?? defaultSyncRules

  if (category === "documentProperties" && typeof normalizedValue === "string") {
    const coreField = syncRules.documentToCore?.[field]
    if (coreField) {
      next.coreProperties = {
        ...next.coreProperties,
        [coreField]: normalizedValue,
      }
    }
  }

  if (category === "coreProperties" && typeof normalizedValue === "string") {
    const documentField = syncRules.coreToDocument?.[field]
    if (documentField) {
      next.documentProperties = {
        ...next.documentProperties,
        [documentField]: normalizedValue,
      }
    }
  }

  return next
}

function pickFields<T extends object>(source: T, keys: string[]): Partial<T> {
  const result: Partial<T> = {}
  for (const key of keys) {
    if (key in source) {
      const typedKey = key as keyof T
      result[typedKey] = source[typedKey]
    }
  }
  return result
}

export function clearMetadataBySchemaConfig(
  schema: MetadataSchema,
  metadata: DocumentMetadata,
  defaultMetadata: DocumentMetadata,
): DocumentMetadata {
  const clearStrategy = {
    ...defaultClearStrategy,
    ...schema.clearStrategy,
  }

  const preservedDocument = pickFields(
    metadata.documentProperties,
    clearStrategy.preserveDocumentFields ?? [],
  )
  const preservedCore = pickFields(metadata.coreProperties, clearStrategy.preserveCoreFields ?? [])

  const appProperties = {
    ...metadata.appProperties,
  }

  for (const field of clearStrategy.clearAppFields ?? []) {
    appProperties[field as keyof typeof appProperties] = "" as never
  }

  return {
    ...metadata,
    documentProperties: {
      ...defaultMetadata.documentProperties,
      ...preservedDocument,
    },
    coreProperties: {
      ...defaultMetadata.coreProperties,
      ...preservedCore,
    },
    appProperties,
  }
}
