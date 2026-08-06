import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { invoke } from "@tauri-apps/api/core"
import type { DocumentMetadata, MetadataSection } from "@/types/metadata"
import { useFileContext } from "@/contexts/file-context"
import { getDocumentResourceByPath } from "@/lib/resources/documents"
import { normalizeDocumentFileType, resolveFileTypeFromPath } from "@/lib/documents/file-type"
import { applyMetadataFieldUpdate, clearMetadataBySchema } from "@/lib/documents/metadata"
import { defaultMetadata } from "./metadata-defaults"
import { useMetadataSaveOps } from "./metadata-save-ops"
import type { LoadedDocument, DocumentState, AutomationRequestStatus, MetadataContextValue } from "./metadata-types"

export type { LoadedDocument, MetadataContextValue } from "./metadata-types"

const MetadataContext = createContext<MetadataContextValue | null>(null)

export const MetadataProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const {
    files,
    activeFileId,
    isLoading: isFileLoading,
    openFiles,
    selectFile,
    removeFile,
    clearFiles,
    updateFileStatus,
  } = useFileContext()

  const [documentsById, setDocumentsById] = useState<Record<string, DocumentState>>({})
  const [documentTaskRequestIds, setDocumentTaskRequestIds] = useState<Record<string, string>>({})
  const [batchTaskRequestId, setBatchTaskRequestId] = useState<string | null>(null)
  const [requestStatusMap, setRequestStatusMap] = useState<
    Record<string, AutomationRequestStatus["status"]>
  >({})
  const loadingIdsRef = useRef<Set<string>>(new Set())

  // sync documentsById with files list
  useEffect(() => {
    const fileIdSet = new Set(files.map(item => item.id))
    setDocumentsById(prev => {
      const next: Record<string, DocumentState> = {}
      Object.entries(prev).forEach(([id, doc]) => {
        if (fileIdSet.has(id)) next[id] = doc
      })
      return next
    })
  }, [files])

  // load document metadata
  useEffect(() => {
    files.forEach(file => {
      if (documentsById[file.id]) return
      if (loadingIdsRef.current.has(file.id)) return

      loadingIdsRef.current.add(file.id)
      updateFileStatus(file.id, { status: "reading", progressMessage: "读取中...", error: undefined })

      const resource = getDocumentResourceByPath(file.filePath)
      void resource
        .show(file.filePath)
        .then(parsed => {
          const normalized = normalizeMetadata(parsed, file.filePath)
          setDocumentsById(prev => ({
            ...prev,
            [file.id]: { metadata: normalized, originalMetadata: normalized, hasChanges: false },
          }))
          updateFileStatus(file.id, { status: "ready", progressMessage: "已就绪", error: undefined })
        })
        .catch(error => {
          console.error("解析文件失败:", error)
          updateFileStatus(file.id, { status: "error", progressMessage: "读取失败", error: String(error) })
        })
        .finally(() => { loadingIdsRef.current.delete(file.id) })
    })
  }, [files, documentsById, updateFileStatus])

  const documents = useMemo<LoadedDocument[]>(() => {
    return files.map<LoadedDocument>(file => {
      const doc = documentsById[file.id] ?? createPlaceholderDocumentState(file.filePath)
      return {
        id: file.id,
        filePath: file.filePath,
        metadata: doc.metadata,
        originalMetadata: doc.originalMetadata,
        hasChanges: doc.hasChanges,
        status: file.status,
        progressMessage: file.progressMessage,
        ...(file.companyId ? { companyId: file.companyId } : {}),
        ...(file.error ? { error: file.error } : {}),
      }
    })
  }, [files, documentsById])

  const activeDocument = activeFileId
    ? (documents.find(item => item.id === activeFileId) ?? documents[0] ?? null)
    : (documents[0] ?? null)
  const activeDocumentId = activeDocument?.id ?? null
  const metadata = activeDocument?.metadata ?? createPlaceholderMetadata("未选择文件")
  const hasChanges = activeDocument?.hasChanges ?? false
  const isLoading = isFileLoading || loadingIdsRef.current.size > 0

  const createRequest = useCallback(
    async (filePaths: string[], source: string) => invoke<string>("create_automation_request", { filePaths, source }),
    [],
  )

  const queryRequestStatus = useCallback(async (requestId: string) => {
    const status = await invoke<AutomationRequestStatus>("get_automation_request_status", { requestId })
    setRequestStatusMap(prev => ({ ...prev, [requestId]: status.status }))
    return status
  }, [])

  const finishRequest = useCallback(
    async (requestId: string, status: AutomationRequestStatus["status"]) => {
      await invoke("finish_automation_request", { requestId, status })
      await queryRequestStatus(requestId)
    },
    [queryRequestStatus],
  )

  const cancelRequest = useCallback(
    async (requestId: string) => {
      await invoke("cancel_automation_request", { requestId })
      await queryRequestStatus(requestId)
    },
    [queryRequestStatus],
  )

  const setMetadata = useCallback(
    (newMetadata: DocumentMetadata) => {
      if (!activeDocumentId) return
      setDocumentsById(prev => {
        const target = prev[activeDocumentId]
        if (!target) return prev
        return { ...prev, [activeDocumentId]: { ...target, metadata: newMetadata, hasChanges: true } }
      })
    },
    [activeDocumentId],
  )

  const selectDocument = useCallback((documentId: string) => selectFile(documentId), [selectFile])

  const removeDocument = useCallback(
    (documentId: string) => {
      removeFile(documentId)
      setDocumentsById(prev => {
        if (!prev[documentId]) return prev
        const next = { ...prev }
        delete next[documentId]
        return next
      })
    },
    [removeFile],
  )

  const clearDocuments = useCallback(() => {
    clearFiles()
    setDocumentsById({})
  }, [clearFiles])

  const updateField = useCallback(
    (category: MetadataSection["category"], field: string, value: string | number) => {
      if (!activeDocumentId) return
      setDocumentsById(prev => {
        const target = prev[activeDocumentId]
        if (!target) return prev
        const fileType = normalizeDocumentFileType(target.metadata.fileType)
        const nextMetadata = applyMetadataFieldUpdate(fileType, target.metadata, category, field, value)
        return { ...prev, [activeDocumentId]: { ...target, metadata: nextMetadata, hasChanges: true } }
      })
    },
    [activeDocumentId],
  )

  const clearMetadata = useCallback(() => {
    if (!activeDocumentId) return
    setDocumentsById(prev => {
      const target = prev[activeDocumentId]
      if (!target) return prev
      const fileType = normalizeDocumentFileType(target.metadata.fileType)
      const nextMetadata = clearMetadataBySchema(fileType, target.metadata, defaultMetadata)
      return { ...prev, [activeDocumentId]: { ...target, metadata: nextMetadata, hasChanges: true } }
    })
  }, [activeDocumentId])

  const resetToOriginal = useCallback(() => {
    if (!activeDocumentId) return
    setDocumentsById(prev => {
      const target = prev[activeDocumentId]
      if (!target) return prev
      return { ...prev, [activeDocumentId]: { ...target, metadata: target.originalMetadata, hasChanges: false } }
    })
  }, [activeDocumentId])

  const saveOps = useMetadataSaveOps({
    documents,
    activeDocument,
    createRequest,
    finishRequest,
    normalizeMetadata,
    updateFileStatus,
    setDocumentsById,
    setDocumentTaskRequestIds,
    setBatchTaskRequestId,
    setRequestStatusMap,
  })

  const cancelDocumentTask = useCallback(
    async (documentId: string) => {
      const requestId = documentTaskRequestIds[documentId]
      if (!requestId) return
      await cancelRequest(requestId)
      updateFileStatus(documentId, { status: "error", progressMessage: "任务已取消", error: "任务已取消" })
      setDocumentTaskRequestIds(prev => {
        const next = { ...prev }
        delete next[documentId]
        return next
      })
    },
    [cancelRequest, documentTaskRequestIds, updateFileStatus],
  )

  const cancelBatchTask = useCallback(async () => {
    if (!batchTaskRequestId) return
    await cancelRequest(batchTaskRequestId)
    documents.forEach(item => {
      if (documentTaskRequestIds[item.id] === batchTaskRequestId) {
        updateFileStatus(item.id, { status: "error", progressMessage: "批量任务已取消", error: "批量任务已取消" })
      }
    })
    setDocumentTaskRequestIds(prev => {
      const next = { ...prev }
      Object.entries(next).forEach(([docId, reqId]) => {
        if (reqId === batchTaskRequestId) delete next[docId]
      })
      return next
    })
    setBatchTaskRequestId(null)
  }, [batchTaskRequestId, cancelRequest, documentTaskRequestIds, documents, updateFileStatus])

  const value: MetadataContextValue = {
    documents,
    activeDocumentId,
    metadata,
    isLoading,
    hasChanges,
    setMetadata,
    selectDocument,
    removeDocument,
    clearDocuments,
    updateField,
    openFiles,
    clearMetadata,
    resetToOriginal,
    ...saveOps,
    documentTaskRequestIds,
    batchTaskRequestId,
    requestStatusMap,
    cancelDocumentTask,
    cancelBatchTask,
  }

  return <MetadataContext.Provider value={value}>{children}</MetadataContext.Provider>
}

export function useMetadata(): MetadataContextValue {
  const context = useContext(MetadataContext)
  if (!context) throw new Error("useMetadata must be used within a MetadataProvider")
  return context
}

function normalizeMetadata(parsedMetadata: DocumentMetadata, filePath: string): DocumentMetadata {
  const resolvedType = resolveFileTypeFromPath(filePath)
  return {
    ...defaultMetadata,
    ...parsedMetadata,
    fileName: parsedMetadata.fileName || basename(filePath),
    fileType: resolvedType,
    documentProperties: { ...defaultMetadata.documentProperties, ...parsedMetadata.documentProperties },
    coreProperties: { ...defaultMetadata.coreProperties, ...parsedMetadata.coreProperties },
    appProperties: { ...defaultMetadata.appProperties, ...parsedMetadata.appProperties },
  }
}

function createPlaceholderDocumentState(filePath: string): DocumentState {
  const placeholder = createPlaceholderMetadata(filePath)
  return { metadata: placeholder, originalMetadata: placeholder, hasChanges: false }
}

function createPlaceholderMetadata(filePath: string): DocumentMetadata {
  const fileName = basename(filePath)
  const fileType = resolveFileTypeFromPath(filePath)
  return {
    ...defaultMetadata,
    fileName,
    fileType,
    fileSize: 0,
    documentProperties: { ...defaultMetadata.documentProperties },
    coreProperties: { ...defaultMetadata.coreProperties },
    appProperties: { ...defaultMetadata.appProperties },
  }
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() ?? filePath
}
