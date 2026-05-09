import React, { createContext, useCallback, useContext, useMemo, useState } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import { OPEN_FILE_DIALOG_FILTER } from "@/lib/documents/supported-formats"

export type FileStatus = "idle" | "reading" | "ready" | "processing" | "error"

export interface FileEntry {
  id: string
  filePath: string
  status: FileStatus
  progressMessage: string
  error?: string
}

export interface FileContextValue {
  files: FileEntry[]
  activeFileId: string | null
  isLoading: boolean
  openFiles: () => Promise<number>
  addFilesByPaths: (paths: string[]) => number
  selectFile: (fileId: string) => void
  removeFile: (fileId: string) => void
  clearFiles: () => void
  updateFileStatus: (fileId: string, patch: Partial<Omit<FileEntry, "id" | "filePath">>) => void
}

const FileContext = createContext<FileContextValue | null>(null)

export const FileProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [files, setFiles] = useState<FileEntry[]>([])
  const [activeFileId, setActiveFileId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const openFiles = useCallback(async (): Promise<number> => {
    setIsLoading(true)
    try {
      const selected = await open({
        multiple: true,
        filters: [OPEN_FILE_DIALOG_FILTER],
      })

      if (!selected) return 0
      const selectedPaths = Array.isArray(selected) ? selected : [selected]
      if (selectedPaths.length === 0) return 0

      const existingPathSet = new Set(files.map(item => item.filePath))
      const pathsToLoad = selectedPaths.filter(path => !existingPathSet.has(path))
      if (pathsToLoad.length === 0) {
        if (!activeFileId && files[0]) {
          setActiveFileId(files[0].id)
        }
        return 0
      }

      const addedFiles: FileEntry[] = pathsToLoad.map(filePath => ({
        id: crypto.randomUUID(),
        filePath,
        status: "idle",
        progressMessage: "待处理",
      }))

      setFiles(prev => [...prev, ...addedFiles])
      setActiveFileId(prev => prev ?? addedFiles[0]?.id ?? null)
      return addedFiles.length
    } catch (error) {
      console.error("选择文件失败:", error)
      return 0
    } finally {
      setIsLoading(false)
    }
  }, [activeFileId, files])

  const addFilesByPaths = useCallback((paths: string[]): number => {
    if (paths.length === 0) return 0

    const existingPathSet = new Set(files.map(item => item.filePath))
    const pathsToLoad = paths.filter(path => !existingPathSet.has(path))
    if (pathsToLoad.length === 0) return 0

    const addedFiles: FileEntry[] = pathsToLoad.map(filePath => ({
      id: crypto.randomUUID(),
      filePath,
      status: "idle",
      progressMessage: "待处理",
    }))

    setFiles(prev => [...prev, ...addedFiles])
    setActiveFileId(prev => prev ?? addedFiles[0]?.id ?? null)
    return addedFiles.length
  }, [files])

  const selectFile = useCallback((fileId: string) => {
    setActiveFileId(fileId)
  }, [])

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const removeIndex = prev.findIndex(item => item.id === fileId)
      if (removeIndex < 0) return prev

      const next = prev.filter(item => item.id !== fileId)

      setActiveFileId(currentActiveId => {
        if (currentActiveId !== fileId) return currentActiveId
        if (next.length === 0) return null
        const fallbackIndex = Math.min(removeIndex, next.length - 1)
        return next[fallbackIndex]?.id ?? null
      })

      return next
    })
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
    setActiveFileId(null)
  }, [])

  const updateFileStatus = useCallback(
    (fileId: string, patch: Partial<Omit<FileEntry, "id" | "filePath">>) => {
      setFiles(prev =>
        prev.map(item =>
          item.id === fileId
            ? {
                ...item,
                ...patch,
              }
            : item,
        ),
      )
    },
    [],
  )

  const value = useMemo<FileContextValue>(
    () => ({
      files,
      activeFileId,
      isLoading,
      openFiles,
      addFilesByPaths,
      selectFile,
      removeFile,
      clearFiles,
      updateFileStatus,
    }),
    [
      files,
      activeFileId,
      isLoading,
      openFiles,
      addFilesByPaths,
      selectFile,
      removeFile,
      clearFiles,
      updateFileStatus,
    ],
  )

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>
}

export function useFileContext(): FileContextValue {
  const context = useContext(FileContext)
  if (!context) {
    throw new Error("useFileContext must be used within a FileProvider")
  }
  return context
}

export default FileProvider
