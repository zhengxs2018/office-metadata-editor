import { useCallback } from "react"
import { getDocumentResourceByPath, type BatchSaveRequestItem } from "@/lib/resources/documents"
import { resolveFileTypeFromPath } from "@/lib/documents/file-type"
import type { LoadedDocument, DocumentState } from "./metadata-types"
import type { FileStatus } from "./file-context"
import type { DocumentMetadata } from "@/types/metadata"

type SetState<T> = React.Dispatch<React.SetStateAction<T>>

interface SaveOpsDeps {
  documents: LoadedDocument[]
  activeDocument: LoadedDocument | null
  createRequest: (filePaths: string[], source: string) => Promise<string>
  finishRequest: (requestId: string, status: "running" | "completed" | "failed" | "cancelled") => Promise<void>
  normalizeMetadata: (parsed: DocumentMetadata, filePath: string) => DocumentMetadata
  updateFileStatus: (documentId: string, patch: { status?: FileStatus; progressMessage?: string; error?: string }) => void
  setDocumentsById: SetState<Record<string, DocumentState>>
  setDocumentTaskRequestIds: SetState<Record<string, string>>
  setBatchTaskRequestId: SetState<string | null>
  setRequestStatusMap: SetState<Record<string, "running" | "completed" | "failed" | "cancelled">>
}

export interface SaveOpsResult {
  saveDocument: (documentId: string) => Promise<void>
  saveCurrent: () => Promise<void>
  clearAndSaveDocument: (documentId: string) => Promise<void>
  saveCurrentAs: () => Promise<void>
  batchClearAndSave: () => Promise<void>
  batchSaveAll: () => Promise<void>
  downloadFile: () => Promise<void>
}

export function useMetadataSaveOps(deps: SaveOpsDeps): SaveOpsResult {
  const {
    documents,
    activeDocument,
    createRequest,
    finishRequest,
    normalizeMetadata: normalize,
    updateFileStatus,
    setDocumentsById,
    setDocumentTaskRequestIds,
    setBatchTaskRequestId,
    setRequestStatusMap,
  } = deps

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
          return { ...prev, [documentId]: { ...current, originalMetadata: current.metadata, hasChanges: false } }
        })
        updateFileStatus(documentId, { status: "ready", progressMessage: "已同步", error: undefined })
        await finishRequest(requestId, "completed")
      } catch (error) {
        updateFileStatus(documentId, { status: "error", progressMessage: "处理失败", error: String(error) })
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
    [createRequest, documents, finishRequest, updateFileStatus, setDocumentsById, setDocumentTaskRequestIds, setRequestStatusMap],
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
      updateFileStatus(documentId, { status: "processing", progressMessage: "清理并保存中..." })

      const resource = getDocumentResourceByPath(target.filePath)
      try {
        const results = await resource.destroyMetadataMany([target.filePath], requestId)
        if (!results[0]?.success) {
          await finishRequest(requestId, "failed")
          updateFileStatus(documentId, { status: "error", progressMessage: "处理失败" })
          return
        }
        const parsed = await resource.show(target.filePath)
        const normalized = normalize(parsed, target.filePath)
        setDocumentsById(prev => ({ ...prev, [documentId]: { metadata: normalized, originalMetadata: normalized, hasChanges: false } }))
        updateFileStatus(documentId, { status: "ready", progressMessage: "已同步", error: undefined })
        await finishRequest(requestId, "completed")
      } catch (error) {
        await finishRequest(requestId, "failed")
        updateFileStatus(documentId, { status: "error", progressMessage: "处理失败", error: String(error) })
        throw error
      } finally {
        setDocumentTaskRequestIds(prev => {
          const next = { ...prev }
          delete next[documentId]
          return next
        })
      }
    },
    [createRequest, documents, finishRequest, normalize, updateFileStatus, setDocumentsById, setDocumentTaskRequestIds, setRequestStatusMap],
  )

  const saveCurrentAs = useCallback(async () => {
    if (!activeDocument) return
    const resource = getDocumentResourceByPath(activeDocument.filePath)
    const savedPath = await resource.createSavedCopy(activeDocument.filePath, activeDocument.metadata)
    if (savedPath) {
      setDocumentsById(prev => {
        const target = prev[activeDocument.id]
        if (!target) return prev
        return { ...prev, [activeDocument.id]: { ...target, hasChanges: false } }
      })
    }
  }, [activeDocument, setDocumentsById])

  const batchClearAndSave = useCallback(async () => {
    if (documents.length === 0) return
    const filePaths = documents.map(item => item.filePath)
    const requestId = await createRequest(filePaths, "manual-batch-clear")
    setBatchTaskRequestId(requestId)
    setRequestStatusMap(prev => ({ ...prev, [requestId]: "running" }))
    setDocumentTaskRequestIds(prev => {
      const next = { ...prev }
      documents.forEach(item => { next[item.id] = requestId })
      return next
    })

    try {
      documents.forEach(item => {
        updateFileStatus(item.id, { status: "processing", progressMessage: "批量清理并保存中..." })
      })
      const groupedByType = new Map<string, string[]>()
      documents.forEach(item => {
        const key = resolveFileTypeFromPath(item.filePath)
        const existing = groupedByType.get(key) ?? []
        existing.push(item.filePath)
        groupedByType.set(key, existing)
      })
      const resultGroups = await Promise.all(
        Array.from(groupedByType.entries()).map(async ([, typedPaths]) => {
          const resource = getDocumentResourceByPath(typedPaths[0] ?? "")
          return resource.destroyMetadataMany(typedPaths, requestId)
        }),
      )
      const results = resultGroups.flat()
      const successPathSet = new Set(results.filter(item => item.success).map(item => item.filePath))
      if (successPathSet.size === 0) {
        await finishRequest(requestId, "failed")
        return
      }
      const refreshTargets = documents.filter(item => successPathSet.has(item.filePath))
      const refreshed = await Promise.all(
        refreshTargets.map(async item => {
          const resource = getDocumentResourceByPath(item.filePath)
          const parsed = await resource.show(item.filePath)
          return { id: item.id, metadata: normalize(parsed, item.filePath) }
        }),
      )
      setDocumentsById(prev => {
        const next = { ...prev }
        refreshed.forEach(item => {
          next[item.id] = { metadata: item.metadata, originalMetadata: item.metadata, hasChanges: false }
        })
        return next
      })
      refreshed.forEach(item => {
        updateFileStatus(item.id, { status: "ready", progressMessage: "已同步", error: undefined })
      })
      const hasFailures = results.some(item => !item.success)
      await finishRequest(requestId, hasFailures ? "failed" : "completed")
    } catch (error) {
      await finishRequest(requestId, "failed")
      throw error
    } finally {
      setBatchTaskRequestId(current => (current === requestId ? null : current))
      setDocumentTaskRequestIds(prev => {
        const next = { ...prev }
        documents.forEach(item => { if (next[item.id] === requestId) delete next[item.id] })
        return next
      })
    }
  }, [createRequest, documents, finishRequest, normalize, updateFileStatus, setDocumentsById, setBatchTaskRequestId, setDocumentTaskRequestIds, setRequestStatusMap])

  const batchSaveAll = useCallback(async () => {
    const items: BatchSaveRequestItem[] = documents
      .filter(item => item.hasChanges)
      .map(item => ({ filePath: item.filePath, metadata: item.metadata }))
    if (items.length === 0) return

    const requestId = await createRequest(items.map(item => item.filePath), "manual-batch-save")
    setBatchTaskRequestId(requestId)
    setRequestStatusMap(prev => ({ ...prev, [requestId]: "running" }))
    setDocumentTaskRequestIds(prev => {
      const next = { ...prev }
      documents.forEach(item => { if (item.hasChanges) next[item.id] = requestId })
      return next
    })

    try {
      documents.forEach(item => {
        if (item.hasChanges) updateFileStatus(item.id, { status: "processing", progressMessage: "批量保存中..." })
      })
      const itemsByType = new Map<string, BatchSaveRequestItem[]>()
      items.forEach(item => {
        const key = resolveFileTypeFromPath(item.filePath)
        const existing = itemsByType.get(key) ?? []
        existing.push(item)
        itemsByType.set(key, existing)
      })
      const resultGroups = await Promise.all(
        Array.from(itemsByType.entries()).map(async ([, typedItems]) => {
          const resource = getDocumentResourceByPath(typedItems[0]?.filePath ?? "")
          return resource.replaceMany(typedItems, requestId)
        }),
      )
      const results = resultGroups.flat()
      const successPathSet = new Set(results.filter(item => item.success).map(item => item.filePath))

      setDocumentsById(prev => {
        const next = { ...prev }
        documents.forEach(item => {
          if (!successPathSet.has(item.filePath)) return
          const current = next[item.id]
          if (!current) return
          next[item.id] = { ...current, originalMetadata: current.metadata, hasChanges: false }
        })
        return next
      })
      documents.forEach(item => {
        if (successPathSet.has(item.filePath)) {
          updateFileStatus(item.id, { status: "ready", progressMessage: "已同步", error: undefined })
        }
      })
      const hasFailures = results.some(item => !item.success)
      await finishRequest(requestId, hasFailures ? "failed" : "completed")
    } catch (error) {
      await finishRequest(requestId, "failed")
      throw error
    } finally {
      setBatchTaskRequestId(current => (current === requestId ? null : current))
      setDocumentTaskRequestIds(prev => {
        const next = { ...prev }
        documents.forEach(item => { if (next[item.id] === requestId) delete next[item.id] })
        return next
      })
    }
  }, [createRequest, documents, finishRequest, normalize, updateFileStatus, setDocumentsById, setBatchTaskRequestId, setDocumentTaskRequestIds, setRequestStatusMap])

  const downloadFile = useCallback(async () => {
    await saveCurrentAs()
  }, [saveCurrentAs])

  return { saveDocument, saveCurrent, clearAndSaveDocument, saveCurrentAs, batchClearAndSave, batchSaveAll, downloadFile }
}
