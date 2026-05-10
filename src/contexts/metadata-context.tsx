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
import type { MetadataTemplate } from "@/types/om-workflow"
import { useFileContext } from "@/contexts/file-context"
import { getDocumentResourceByPath } from "@/lib/resources/documents"
import { normalizeDocumentFileType } from "@/lib/documents/file-type"
import {
  applyMetadataFieldUpdate,
  clearMetadataBySchema,
} from "@/lib/documents/metadata"
import {
  defaultMetadata,
  type LoadedDocument,
  type DocumentState,
  type AutomationRequestStatus,
  type MetadataContextValue,
} from "@/contexts/metadata-defaults"
import {
  normalizeMetadata,
  createPlaceholderDocumentState,
  createPlaceholderMetadata,
} from "@/contexts/metadata-utils"
import { executeBatchClearAndSave, executeBatchSaveAll } from "@/contexts/metadata-batch-ops"

// Re-export types used by other modules
export type { LoadedDocument, MetadataContextValue } from "@/contexts/metadata-defaults"

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
  const [requestStatusMap, setRequestStatusMap] = useState<Record<string, AutomationRequestStatus["status"]>>({})
  const loadingIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const fileIdSet = new Set(files.map(item => item.id))
    setDocumentsById(prev => {
      const next: Record<string, DocumentState> = {}
      Object.entries(prev).forEach(([id, doc]) => {
        if (fileIdSet.has(id)) {
          next[id] = doc
        }
      })
      return next
    })
  }, [files])

  useEffect(() => {
    files.forEach(file => {
      if (documentsById[file.id]) return
      if (loadingIdsRef.current.has(file.id)) return

      loadingIdsRef.current.add(file.id)
      updateFileStatus(file.id, {
        status: "reading",
        progressMessage: "读取中...",
        error: undefined,
      })

      const resource = getDocumentResourceByPath(file.filePath)

      void resource
        .show(file.filePath)
        .then(parsed => {
          const normalized = normalizeMetadata(parsed, file.filePath)
          setDocumentsById(prev => ({
            ...prev,
            [file.id]: {
              metadata: normalized,
              originalMetadata: normalized,
              hasChanges: false,
            },
          }))
          updateFileStatus(file.id, {
            status: "ready",
            progressMessage: "已就绪",
            error: undefined,
          })
        })
        .catch(error => {
          console.error("解析文件失败:", error)
          updateFileStatus(file.id, {
            status: "error",
            progressMessage: "读取失败",
            error: String(error),
          })
        })
        .finally(() => {
          loadingIdsRef.current.delete(file.id)
        })
    })
  }, [files, documentsById, updateFileStatus])

  const documents = useMemo<LoadedDocument[]>(() => {
    const loaded = files.map<LoadedDocument>(file => {
      const doc = documentsById[file.id] ?? createPlaceholderDocumentState(file.filePath)
      const item: LoadedDocument = {
        id: file.id,
        filePath: file.filePath,
        metadata: doc.metadata,
        originalMetadata: doc.originalMetadata,
        hasChanges: doc.hasChanges,
        status: file.status,
        progressMessage: file.progressMessage,
        ...(file.error ? { error: file.error } : {}),
      }
      return item
    })

    return loaded
  }, [files, documentsById])

  const activeDocument = activeFileId
    ? (documents.find(item => item.id === activeFileId) ?? documents[0] ?? null)
    : (documents[0] ?? null)
  const activeDocumentId = activeDocument?.id ?? null
  const metadata = activeDocument?.metadata ?? createPlaceholderMetadata("未选择文件")
  const hasChanges = activeDocument?.hasChanges ?? false
  const isLoading = isFileLoading || loadingIdsRef.current.size > 0

  const createRequest = useCallback(async (filePaths: string[], source: string) => {
    return invoke<string>("create_automation_request", { filePaths, source })
  }, [])

  const queryRequestStatus = useCallback(async (requestId: string) => {
    const status = await invoke<AutomationRequestStatus>("get_automation_request_status", {
      requestId,
    })
    setRequestStatusMap(prev => ({
      ...prev,
      [requestId]: status.status,
    }))
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
        return {
          ...prev,
          [activeDocumentId]: {
            ...target,
            metadata: newMetadata,
            hasChanges: true,
          },
        }
      })
    },
    [activeDocumentId],
  )

  const selectDocument = useCallback(
    (documentId: string) => {
      selectFile(documentId)
    },
    [selectFile],
  )

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

        const current = target.metadata
        const fileType = normalizeDocumentFileType(current.fileType)
        const nextMetadata = applyMetadataFieldUpdate(fileType, current, category, field, value)

        return {
          ...prev,
          [activeDocumentId]: {
            ...target,
            metadata: nextMetadata,
            hasChanges: true,
          },
        }
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

      return {
        ...prev,
        [activeDocumentId]: {
          ...target,
          metadata: nextMetadata,
          hasChanges: true,
        },
      }
    })
  }, [activeDocumentId])

  const resetToOriginal = useCallback(() => {
    if (!activeDocumentId) return
    setDocumentsById(prev => {
      const target = prev[activeDocumentId]
      if (!target) return prev
      return {
        ...prev,
        [activeDocumentId]: {
          ...target,
          metadata: target.originalMetadata,
          hasChanges: false,
        },
      }
    })
  }, [activeDocumentId])

  const saveDocument = useCallback(
    async (documentId: string) => {
      const target = documents.find(item => item.id === documentId)
      if (!target) return

      const requestId = await createRequest([target.filePath], "manual-single-save")
      setDocumentTaskRequestIds(prev => ({ ...prev, [documentId]: requestId }))
      setRequestStatusMap(prev => ({ ...prev, [requestId]: "running" }))

      updateFileStatus(documentId, { status: "processing", progressMessage: "保存中..." })

      const resource = getDocumentResourceByPath(target.filePath)
      try {
        await resource.replace(target.filePath, target.metadata, requestId)

        setDocumentsById(prev => {
          const current = prev[documentId]
          if (!current) return prev
          return {
            ...prev,
            [documentId]: {
              ...current,
              originalMetadata: current.metadata,
              hasChanges: false,
            },
          }
        })

        updateFileStatus(documentId, {
          status: "ready",
          progressMessage: "已同步",
          error: undefined,
        })
        await finishRequest(requestId, "completed")
      } catch (error) {
        updateFileStatus(documentId, {
          status: "error",
          progressMessage: "处理失败",
          error: String(error),
        })
        await finishRequest(requestId, "failed")
        throw error
      } finally {
        setDocumentTaskRequestIds(prev => {
          const next = { ...prev }
          delete next[documentId]
          return next
        })
      }
    },
    [createRequest, documents, finishRequest, updateFileStatus],
  )

  const saveCurrent = useCallback(async () => {
    if (!activeDocument) return
    await saveDocument(activeDocument.id)
  }, [activeDocument, saveDocument])

  const clearAndSaveDocument = useCallback(
    async (documentId: string) => {
      const target = documents.find(item => item.id === documentId)
      if (!target) return

      const requestId = await createRequest([target.filePath], "manual-single-clear")
      setDocumentTaskRequestIds(prev => ({ ...prev, [documentId]: requestId }))
      setRequestStatusMap(prev => ({ ...prev, [requestId]: "running" }))

      updateFileStatus(documentId, {
        status: "processing",
        progressMessage: "清理并保存中...",
      })

      const resource = getDocumentResourceByPath(target.filePath)
      try {
        const results = await resource.destroyMetadataMany([target.filePath], requestId)

        if (!results[0]?.success) {
          await finishRequest(requestId, "failed")
          updateFileStatus(documentId, { status: "error", progressMessage: "处理失败" })
          return
        }

        const parsed = await resource.show(target.filePath)
        const normalized = normalizeMetadata(parsed, target.filePath)

        setDocumentsById(prev => ({
          ...prev,
          [documentId]: {
            metadata: normalized,
            originalMetadata: normalized,
            hasChanges: false,
          },
        }))

        updateFileStatus(documentId, {
          status: "ready",
          progressMessage: "已同步",
          error: undefined,
        })
        await finishRequest(requestId, "completed")
      } catch (error) {
        await finishRequest(requestId, "failed")
        updateFileStatus(documentId, {
          status: "error",
          progressMessage: "处理失败",
          error: String(error),
        })
        throw error
      } finally {
        setDocumentTaskRequestIds(prev => {
          const next = { ...prev }
          delete next[documentId]
          return next
        })
      }
    },
    [createRequest, documents, finishRequest, updateFileStatus],
  )

  const saveCurrentAs = useCallback(async () => {
    if (!activeDocument) return

    const resource = getDocumentResourceByPath(activeDocument.filePath)

    const savedPath = await resource.createSavedCopy(
      activeDocument.filePath,
      activeDocument.metadata,
    )

    if (savedPath) {
      setDocumentsById(prev => {
        const target = prev[activeDocument.id]
        if (!target) return prev
        return {
          ...prev,
          [activeDocument.id]: {
            ...target,
            hasChanges: false,
          },
        }
      })
    }
  }, [activeDocument])

  const batchClearAndSave = useCallback(async () => {
    await executeBatchClearAndSave({
      documents,
      createRequest,
      finishRequest,
      updateFileStatus,
      setDocumentsById,
      setDocumentTaskRequestIds,
      setBatchTaskRequestId,
      setRequestStatusMap,
    })
  }, [createRequest, documents, finishRequest, updateFileStatus])

  const batchSaveAll = useCallback(async () => {
    await executeBatchSaveAll({
      documents,
      createRequest,
      finishRequest,
      updateFileStatus,
      setDocumentsById,
      setDocumentTaskRequestIds,
      setBatchTaskRequestId,
      setRequestStatusMap,
    })
  }, [createRequest, documents, finishRequest, updateFileStatus])

  const downloadFile = useCallback(async () => {
    await saveCurrentAs()
  }, [saveCurrentAs])

  const applyTemplateToDocuments = useCallback((template: MetadataTemplate, documentIds: string[]) => {
    if (documentIds.length === 0) return

    const normalizedAuthor = (template.author || "").trim()
    const normalizedOrganization = (template.organization || "").trim()
    const normalizedManager = (template.manager || "").trim()
    const normalizedLanguage = (template.language || "").trim()

    if (!normalizedAuthor && !normalizedOrganization && !normalizedManager && !normalizedLanguage) return

    setDocumentsById(prev => {
      const next = { ...prev }

      documentIds.forEach(documentId => {
        const current = next[documentId]
        if (!current) return

        const metadata: DocumentMetadata = {
          ...current.metadata,
          documentProperties: {
            ...current.metadata.documentProperties,
            ...(normalizedAuthor ? { creator: normalizedAuthor } : {}),
            ...(normalizedLanguage ? { language: normalizedLanguage } : {}),
          },
          coreProperties: {
            ...current.metadata.coreProperties,
            ...(normalizedAuthor ? { dcCreator: normalizedAuthor } : {}),
            ...(normalizedLanguage ? { dcLanguage: normalizedLanguage } : {}),
          },
          appProperties: {
            ...current.metadata.appProperties,
            ...(normalizedOrganization ? { company: normalizedOrganization } : {}),
            ...(normalizedManager ? { manager: normalizedManager } : {}),
          },
        }

        next[documentId] = {
          ...current,
          metadata,
          hasChanges: true,
        }
      })

      return next
    })
  }, [])

  const cancelDocumentTask = useCallback(
    async (documentId: string) => {
      const requestId = documentTaskRequestIds[documentId]
      if (!requestId) return

      await cancelRequest(requestId)
      updateFileStatus(documentId, {
        status: "error",
        progressMessage: "任务已取消",
        error: "任务已取消",
      })

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
        updateFileStatus(item.id, {
          status: "error",
          progressMessage: "批量任务已取消",
          error: "批量任务已取消",
        })
      }
    })

    setDocumentTaskRequestIds(prev => {
      const next = { ...prev }
      Object.entries(next).forEach(([docId, reqId]) => {
        if (reqId === batchTaskRequestId) {
          delete next[docId]
        }
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
    saveCurrent,
    saveCurrentAs,
    saveDocument,
    clearAndSaveDocument,
    batchClearAndSave,
    batchSaveAll,
    downloadFile,
    applyTemplateToDocuments,
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
  if (!context) {
    throw new Error("useMetadata must be used within a MetadataProvider")
  }
  return context
}
