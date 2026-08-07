// Office 文档元数据类型定义

export type DocumentFileType = "docx" | "doc" | "xlsx" | "pdf" | "unknown"

export interface DocumentProperties {
  title: string
  subject: string
  creator: string
  keywords: string
  description: string
  lastModifiedBy: string
  revision: string
  created: string
  modified: string
  category: string
  contentStatus: string
  version: string
  language: string
  identifier: string
  source: string
}

export interface CoreProperties {
  dcTitle: string
  dcSubject: string
  dcCreator: string
  dcDescription: string
  dcKeywords: string
  dcLanguage: string
  dcIdentifier: string
  dcSource: string
}

export interface AppProperties {
  application: string
  appVersion: string
  company: string
  manager: string
  template: string
  totalTime: string
  pages: number
  words: number
  characters: number
  charactersWithSpaces: number
  paragraphs: number
  lines: number
}

export interface DocumentMetadata {
  fileName: string
  fileType: string
  fileSize: number
  documentProperties: DocumentProperties
  coreProperties: CoreProperties
  appProperties: AppProperties
  annotationAuthors?: string[]
  revisionAuthors?: string[]
  xmpCreators?: string[]
  hasHiddenMarkers?: boolean
}

export interface MetadataField {
  key: string
  label: string
  value: string
  editable: boolean
  type: "text" | "textarea" | "date"
  span?: 1 | 2
}

export interface MetadataCategory {
  id: string
  title: string
  description: string
  fields: MetadataField[]
}

export interface MetadataSection {
  id: string
  title: string
  description: string
  category: "documentProperties" | "coreProperties" | "appProperties"
  fields: MetadataField[]
}

export interface MetadataPreviewProperty {
  label: string
  value: string
  span?: 1 | 2
}

export interface MetadataPreviewGroup {
  id: string
  title: string
  properties: MetadataPreviewProperty[]
}

export interface MetadataFieldSchema {
  key: string
  label: string
  editable: boolean
  type: "text" | "textarea" | "date"
  span?: 1 | 2
  source: {
    category: MetadataSection["category"]
    field: string
  }
}

export interface MetadataSectionSchema {
  id: string
  title: string
  description: string
  category: MetadataSection["category"]
  fields: MetadataFieldSchema[]
}

export interface MetadataPreviewPropertySchema {
  label: string
  span?: 1 | 2
  source: {
    category: MetadataSection["category"]
    field: string
  }
  format?: "raw" | "number" | "minutes"
  onlyPositive?: boolean
}

export interface MetadataPreviewGroupSchema {
  id: string
  title: string
  properties: MetadataPreviewPropertySchema[]
}

export interface MetadataSyncRules {
  documentToCore?: Record<string, string>
  coreToDocument?: Record<string, string>
}

export interface MetadataClearStrategy {
  preserveDocumentFields?: string[]
  preserveCoreFields?: string[]
  clearAppFields?: string[]
}

export interface MetadataSchema {
  fileType: DocumentFileType
  sections: MetadataSectionSchema[]
  previewGroups: MetadataPreviewGroupSchema[]
  syncRules?: MetadataSyncRules
  clearStrategy?: MetadataClearStrategy
}
