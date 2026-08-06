import type { DocumentMetadata, MetadataSection } from "@/types/metadata"

export interface LoadedDocument {
  id: string
  filePath: string
  metadata: DocumentMetadata
  originalMetadata: DocumentMetadata
  hasChanges: boolean
  status: "idle" | "reading" | "ready" | "processing" | "error"
  progressMessage: string
  error?: string
  companyId?: string
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
  updateField: (
    category: MetadataSection["category"],
    field: string,
    value: string | number,
  ) => void
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
  documentTaskRequestIds: Record<string, string>
  batchTaskRequestId: string | null
  requestStatusMap: Record<string, AutomationRequestStatus["status"]>
  cancelDocumentTask: (documentId: string) => Promise<void>
  cancelBatchTask: () => Promise<void>
}
