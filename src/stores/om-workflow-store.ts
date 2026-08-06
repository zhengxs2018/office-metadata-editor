/**
 * Zustand Store - 工作流状态管理
 */

import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import { invoke } from "@tauri-apps/api/core"
import type {
  FileEntry,
  LoadedDocument,
  DocumentMetadata,
  DirectoryScanResult,
  DirectoryInfo,
  BatchOperation,
  Workspace,
} from "../types/om-workflow"

// ==================== File Store ====================

interface FileState {
  files: FileEntry[]
  selectedFileIds: string[]
  documents: Map<string, LoadedDocument>
  activeDocumentId: string | null
  scanResults: DirectoryScanResult | null
  directoryFiles: DirectoryInfo[]
  isLoading: boolean
  error: string | null
}

interface FileActions {
  addFiles: (paths: string[]) => Promise<void>
  removeFile: (id: string) => void
  selectFile: (id: string) => void
  toggleFileSelection: (id: string) => void
  selectAllFiles: () => void
  clearSelection: () => void
  clearAllFiles: () => void
  loadDocument: (fileId: string) => Promise<LoadedDocument>
  updateDocumentMetadata: (documentId: string, metadata: Partial<DocumentMetadata>) => void
  saveDocument: (documentId: string) => Promise<void>
  discardChanges: (documentId: string) => void
  closeDocument: (documentId: string) => void
  scanDirectory: (path: string, options?: { recursive?: boolean }) => Promise<void>
  toggleDirectoryFileSelection: (index: number) => void
  selectAllDirectoryFiles: () => void
  clearDirectorySelection: () => void
  importSelectedFiles: () => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

type FileStore = FileState & FileActions

export const useFileStore = create<FileStore>()(
  subscribeWithSelector((set, get) => ({
    files: [],
    selectedFileIds: [],
    documents: new Map(),
    activeDocumentId: null,
    scanResults: null,
    directoryFiles: [],
    isLoading: false,
    error: null,

    addFiles: async (paths: string[]) => {
      set({ isLoading: true, error: null })
      try {
        const now = Date.now()
        const newFiles: FileEntry[] = paths.map(path => {
          const name = path.split("/").pop() || path
          const extension = name.split(".").pop()?.toLowerCase() || ""
          const type = ["docx", "xlsx", "pptx", "pdf"].includes(extension)
            ? (extension as any)
            : "unknown"

          return {
            id: `file_${now}_${Math.random().toString(36).substr(2, 9)}`,
            path,
            name,
            extension,
            type,
            size: 0,
            status: "ready" as const,
            createdAt: now,
            updatedAt: now,
          }
        })

        set(state => ({
          files: [...state.files, ...newFiles],
          isLoading: false,
        }))
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "添加文件失败",
          isLoading: false,
        })
        throw error
      }
    },

    removeFile: (id: string) => {
      set(state => ({
        files: state.files.filter(f => f.id !== id),
        selectedFileIds: state.selectedFileIds.filter(fid => fid !== id),
      }))

      const doc = get().documents.get(id)
      if (doc) {
        get().closeDocument(doc.id)
      }
    },

    selectFile: (id: string) => {
      set({ activeDocumentId: id })
    },

    toggleFileSelection: (id: string) => {
      set(state => {
        const isSelected = state.selectedFileIds.includes(id)
        return {
          selectedFileIds: isSelected
            ? state.selectedFileIds.filter(fid => fid !== id)
            : [...state.selectedFileIds, id],
        }
      })
    },

    selectAllFiles: () => {
      set(state => ({
        selectedFileIds: state.files.map(f => f.id),
      }))
    },

    clearSelection: () => {
      set({ selectedFileIds: [] })
    },

    clearAllFiles: () => {
      set({
        files: [],
        selectedFileIds: [],
        documents: new Map(),
        activeDocumentId: null,
      })
    },

    loadDocument: async (fileId: string) => {
      const file = get().files.find(f => f.id === fileId)
      if (!file) throw new Error("文件不存在")

      const existingDoc = get().documents.get(fileId)
      if (existingDoc) {
        set({ activeDocumentId: fileId })
        return existingDoc
      }

      set({ isLoading: true, error: null })
      try {
        const metadata: DocumentMetadata = {}

        const doc: LoadedDocument = {
          id: `doc_${fileId}`,
          fileId,
          path: file.path,
          metadata,
          originalMetadata: { ...metadata },
          isDirty: false,
          loadedAt: Date.now(),
        }

        set(state => ({
          documents: new Map(state.documents).set(fileId, doc),
          activeDocumentId: fileId,
          isLoading: false,
        }))

        return doc
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "加载文档失败",
          isLoading: false,
        })
        throw error
      }
    },

    updateDocumentMetadata: (documentId: string, updates: Partial<DocumentMetadata>) => {
      set(state => {
        const newDocuments = new Map(state.documents)
        const doc = newDocuments.get(documentId)
        if (!doc) return state

        const updatedDoc: LoadedDocument = {
          ...doc,
          metadata: { ...doc.metadata, ...updates },
          isDirty: true,
        }
        newDocuments.set(documentId, updatedDoc)

        return { documents: newDocuments }
      })
    },

    saveDocument: async (documentId: string) => {
      const doc = get().documents.get(documentId)
      if (!doc) throw new Error("文档不存在")

      set({ isLoading: true, error: null })
      try {
        set(state => {
          const newDocuments = new Map(state.documents)
          const savedDoc = newDocuments.get(documentId)
          if (!savedDoc) return state

          savedDoc.isDirty = false
          savedDoc.lastSavedAt = Date.now()
          savedDoc.originalMetadata = { ...savedDoc.metadata }
          newDocuments.set(documentId, savedDoc)

          return { documents: newDocuments, isLoading: false }
        })
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "保存失败",
          isLoading: false,
        })
        throw error
      }
    },

    discardChanges: (documentId: string) => {
      set(state => {
        const newDocuments = new Map(state.documents)
        const doc = newDocuments.get(documentId)
        if (!doc) return state

        doc.metadata = { ...doc.originalMetadata }
        doc.isDirty = false
        newDocuments.set(documentId, doc)

        return { documents: newDocuments }
      })
    },

    closeDocument: (documentId: string) => {
      set(state => {
        const newDocuments = new Map(state.documents)
        newDocuments.delete(documentId)

        return {
          documents: newDocuments,
          activeDocumentId: state.activeDocumentId === documentId ? null : state.activeDocumentId,
        }
      })
    },

    scanDirectory: async (path: string, options?: { recursive?: boolean }) => {
      set({ isLoading: true, error: null })
      try {
        const result = await invoke<DirectoryScanResult>("scan_directory", {
          path,
          options: {
            recursive: options?.recursive ?? true,
            extensions: ["docx", "doc", "xlsx", "pdf"],
          },
        })
        const files = result.files.map(file => ({ ...file, selected: false })) as DirectoryInfo[]

        set({
          scanResults: {
            ...result,
            files,
          },
          directoryFiles: files,
          isLoading: false,
        })
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : "扫描目录失败",
          isLoading: false,
        })
        throw error
      }
    },

    toggleDirectoryFileSelection: (index: number) => {
      set(state => {
        const newFiles = [...state.directoryFiles]
        if (newFiles[index]) {
          newFiles[index].selected = !newFiles[index].selected
        }
        return { directoryFiles: newFiles }
      })
    },

    selectAllDirectoryFiles: () => {
      set(state => ({
        directoryFiles: state.directoryFiles.map(f => ({ ...f, selected: true })),
      }))
    },

    clearDirectorySelection: () => {
      set(state => ({
        directoryFiles: state.directoryFiles.map(f => ({ ...f, selected: false })),
      }))
    },

    importSelectedFiles: async () => {
      const selectedFiles = get().directoryFiles.filter(f => f.selected)
      if (selectedFiles.length === 0) return

      const paths = selectedFiles.map(f => f.path)
      await get().addFiles(paths)
      get().clearDirectorySelection()
    },

    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setError: (error: string | null) => set({ error }),
  })),
)

// ==================== Batch Operation Store ====================

interface BatchState {
  operations: BatchOperation[]
  currentOperationId: string | null
}

interface BatchActions {
  createOperation: (type: BatchOperation["type"], totalItems: number) => string
  updateOperationProgress: (operationId: string, progress: Partial<BatchOperation>) => void
  completeOperation: (operationId: string, successfulItems: number, failedItems: number) => void
  failOperation: (operationId: string, error: string) => void
  setCurrentOperation: (id: string | null) => void
  clearCompletedOperations: () => void
}

type BatchStore = BatchState & BatchActions

export const useBatchStore = create<BatchStore>()(
  subscribeWithSelector(set => ({
    operations: [],
    currentOperationId: null,

    createOperation: (type, totalItems) => {
      const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const operation: BatchOperation = {
        id,
        type,
        status: "pending",
        totalItems,
        processedItems: 0,
        successfulItems: 0,
        failedItems: 0,
        progress: 0,
      }

      set(state => ({
        operations: [...state.operations, operation],
        currentOperationId: id,
      }))

      return id
    },

    updateOperationProgress: (operationId, progress) => {
      set(state => ({
        operations: state.operations.map(op =>
          op.id === operationId ? { ...op, ...progress, status: progress.status ?? op.status } : op,
        ),
      }))
    },

    completeOperation: (operationId, successfulItems, failedItems) => {
      set(state => ({
        operations: state.operations.map(op =>
          op.id === operationId
            ? {
                ...op,
                status: "completed",
                processedItems: op.totalItems,
                successfulItems,
                failedItems,
                progress: 100,
                completedAt: Date.now(),
              }
            : op,
        ),
      }))
    },

    failOperation: (operationId, error) => {
      set(state => ({
        operations: state.operations.map(op =>
          op.id === operationId ? { ...op, status: "failed", error, completedAt: Date.now() } : op,
        ),
      }))
    },

    setCurrentOperation: id => set({ currentOperationId: id }),

    clearCompletedOperations: () => {
      set(state => ({
        operations: state.operations.filter(op => op.status !== "completed"),
        currentOperationId:
          state.currentOperationId &&
          state.operations.find(op => op.id === state.currentOperationId)?.status !== "completed"
            ? state.currentOperationId
            : null,
      }))
    },
  })),
)

// ==================== Workspace Store ====================

interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
}

interface WorkspaceActions {
  createWorkspace: (name: string) => string
  updateWorkspace: (id: string, updates: Partial<Workspace>) => void
  deleteWorkspace: (id: string) => void
  setActiveWorkspace: (id: string) => void
  loadWorkspace: (id: string) => Promise<void>
}

type WorkspaceStore = WorkspaceState & WorkspaceActions

export const useWorkspaceStore = create<WorkspaceStore>()(
  subscribeWithSelector(set => ({
    workspaces: [],
    activeWorkspaceId: null,

    createWorkspace: (name: string) => {
      const id = `ws_${Date.now()}`
      const workspace: Workspace = {
        id,
        name,
        directories: [],
        lastOpenedAt: Date.now(),
      }

      set(state => ({
        workspaces: [...state.workspaces, workspace],
        activeWorkspaceId: id,
      }))

      return id
    },

    updateWorkspace: (id, updates) => {
      set(state => ({
        workspaces: state.workspaces.map(ws => (ws.id === id ? { ...ws, ...updates } : ws)),
      }))
    },

    deleteWorkspace: id => {
      set(state => ({
        workspaces: state.workspaces.filter(ws => ws.id !== id),
        activeWorkspaceId: state.activeWorkspaceId === id ? null : state.activeWorkspaceId,
      }))
    },

    setActiveWorkspace: id => set({ activeWorkspaceId: id }),

    loadWorkspace: async id => {
      set({ activeWorkspaceId: id })
    },
  })),
)
