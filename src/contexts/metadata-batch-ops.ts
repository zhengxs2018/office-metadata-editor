import React from "react"
import type { FileEntry } from "@/contexts/file-context"
import type { DocumentState, LoadedDocument, AutomationRequestStatus } from "@/contexts/metadata-defaults"
import { normalizeMetadata } from "@/contexts/metadata-utils"
import { getDocumentResourceByPath } from "@/lib/resources/documents"
import { resolveFileTypeFromPath } from "@/lib/documents/file-type"
import type { BatchSaveRequestItem } from "@/lib/resources/documents"

export interface BatchOpsContext {
  documents: LoadedDocument[]
  createRequest: (filePaths: string[], source: string) => Promise<string>
  finishRequest: (requestId: string, status: AutomationRequestStatus["status"]) => Promise<void>
  updateFileStatus: (fileId: string, patch: Partial<Omit<FileEntry, "id" | "filePath">>) => void
  setDocumentsById: React.Dispatch<React.SetStateAction<Record<string, DocumentState>>>
  setDocumentTaskRequestIds: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setBatchTaskRequestId: React.Dispatch<React.SetStateAction<string | null>>
  setRequestStatusMap: React.Dispatch<
    React.SetStateAction<Record<string, AutomationRequestStatus["status"]>>
  >
}

export async function executeBatchClearAndSave(ctx: BatchOpsContext): Promise<void> {
  const {
    documents,
    createRequest,
    finishRequest,
    updateFileStatus,
    setDocumentsById,
    setDocumentTaskRequestIds,
    setBatchTaskRequestId,
    setRequestStatusMap,
  } = ctx

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
        return { id: item.id, metadata: normalizeMetadata(parsed, item.filePath) }
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
}

export async function executeBatchSaveAll(ctx: BatchOpsContext): Promise<void> {
  const {
    documents,
    createRequest,
    finishRequest,
    updateFileStatus,
    setDocumentsById,
    setDocumentTaskRequestIds,
    setBatchTaskRequestId,
    setRequestStatusMap,
  } = ctx

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
      if (item.hasChanges) {
        updateFileStatus(item.id, { status: "processing", progressMessage: "批量保存中..." })
      }
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
}
