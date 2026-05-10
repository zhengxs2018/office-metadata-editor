import type { DocumentMetadata, MetadataSection } from "@/types/metadata"
import type { MetadataTemplate } from "@/types/om-workflow"

export const defaultMetadata: DocumentMetadata = {
  fileName: "",
  fileType: "",
  fileSize: 0,
  documentProperties: {
    title: "",
    subject: "",
    creator: "",
    keywords: "",
    description: "",
    lastModifiedBy: "",
    revision: "1",
    created: "",
    modified: "",
    category: "",
    contentStatus: "",
    version: "",
    language: "zh-CN",
    identifier: "",
    source: "",
  },
  coreProperties: {
    dcTitle: "",
    dcSubject: "",
    dcCreator: "",
    dcDescription: "",
    dcKeywords: "",
    dcLanguage: "zh-CN",
    dcIdentifier: "",
    dcSource: "",
  },
  appProperties: {
    application: "Microsoft Office Word",
    appVersion: "16.0",
    company: "",
    manager: "",
    template: "Normal.dotm",
    totalTime: "0",
    pages: 0,
    words: 0,
    characters: 0,
    charactersWithSpaces: 0,
    paragraphs: 0,
    lines: 0,
  },
}

export interface LoadedDocument {
  id: string
  filePath: string
  metadata: DocumentMetadata
  originalMetadata: DocumentMetadata
  hasChanges: boolean
  status: "idle" | "reading" | "ready" | "processing" | "error"
  progressMessage: string
  error?: string
}

export interface DocumentState {
  metadata: DocumentMetadata
  originalMetadata: DocumentMetadata
  hasChanges: boolean
}

export interface AutomationRequestStatus {
  requestId: string
  source: string
  status: "running" | "completed" | "failed" | "cancelled"
  filePaths: string[]
}

export interface MetadataContextValue {
  documents: LoadedDocument[]
  activeDocumentId: string | null
  metadata: DocumentMetadata
  isLoading: boolean
  hasChanges: boolean
  setMetadata: (metadata: DocumentMetadata) => void
  selectDocument: (documentId: string) => void
  removeDocument: (documentId: string) => void
  clearDocuments: () => void
  updateField: (category: MetadataSection["category"], field: string, value: string | number) => void
  openFiles: () => Promise<number>
  clearMetadata: () => void
  resetToOriginal: () => void
  saveCurrent: () => Promise<void>
  saveCurrentAs: () => Promise<void>
  saveDocument: (documentId: string) => Promise<void>
  clearAndSaveDocument: (documentId: string) => Promise<void>
  batchClearAndSave: () => Promise<void>
  batchSaveAll: () => Promise<void>
  downloadFile: () => Promise<void>
  applyTemplateToDocuments: (template: MetadataTemplate, documentIds: string[]) => void
  documentTaskRequestIds: Record<string, string>
  batchTaskRequestId: string | null
  requestStatusMap: Record<string, AutomationRequestStatus["status"]>
  cancelDocumentTask: (documentId: string) => Promise<void>
  cancelBatchTask: () => Promise<void>
}
