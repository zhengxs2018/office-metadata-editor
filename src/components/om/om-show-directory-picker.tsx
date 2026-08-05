import React, { useCallback, useEffect } from "react"
import { open as showDirectoryPicker } from "@tauri-apps/plugin-dialog"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useFileStore } from "@/stores/om-workflow-store"

interface OmShowDirectoryPickerDialogProps {
  open: boolean
  existingFilePaths?: string[]
  initialDirectory?: string
  onOpenChange: (open: boolean) => void
  onImportComplete?: (paths: string[]) => void
}

export const OmShowDirectoryPickerDialog: React.FC<OmShowDirectoryPickerDialogProps> = ({
  open,
  onOpenChange,
  onImportComplete,
  existingFilePaths = [],
  initialDirectory,
}) => {
  const {
    scanResults,
    directoryFiles,
    isLoading,
    error,
    scanDirectory,
    toggleDirectoryFileSelection,
    importSelectedFiles,
  } = useFileStore()

  useEffect(() => {
    if (open && initialDirectory) {
      scanDirectory(initialDirectory, { recursive: true }).catch(err => {
        console.error("扫描初始目录失败:", err)
      })
    }
    // 依赖 open/initialDirectory：每次打开都重新扫描
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialDirectory])

  const handleSelectDirectory = useCallback(async () => {
    const selected = await showDirectoryPicker({ directory: true, multiple: false })
    if (typeof selected === "string") {
      try {
        await scanDirectory(selected, { recursive: true })
      } catch (err) {
        console.error("扫描目录失败:", err)
      }
    }
  }, [scanDirectory])

  const handleImport = useCallback(async () => {
    try {
      const selectedPaths = directoryFiles.filter(f => f.selected).map(f => f.path)
      await importSelectedFiles()
      onImportComplete?.(selectedPaths)
      onOpenChange(false)
    } catch (err) {
      console.error("导入失败:", err)
    }
  }, [directoryFiles, importSelectedFiles, onImportComplete])

  const existingPathSet = new Set(existingFilePaths)
  const filteredFiles = directoryFiles.filter(file => !existingPathSet.has(file.path))
  const selectedCount = filteredFiles.filter(f => f.selected).length
  const totalCount = filteredFiles.length

  const toggleFileSelectionByPath = (path: string) => {
    const targetIndex = directoryFiles.findIndex(item => item.path === path)
    if (targetIndex >= 0) {
      toggleDirectoryFileSelection(targetIndex)
    }
  }

  const selectAllFilteredFiles = () => {
    const selectedPathSet = new Set(filteredFiles.map(file => file.path))
    directoryFiles.forEach((file, index) => {
      const shouldSelect = selectedPathSet.has(file.path)
      if (file.selected !== shouldSelect) {
        toggleDirectoryFileSelection(index)
      }
    })
  }

  const clearFilteredSelection = () => {
    filteredFiles.forEach(file => {
      if (!file.selected) return
      const index = directoryFiles.findIndex(item => item.path === file.path)
      if (index >= 0) {
        toggleDirectoryFileSelection(index)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] min-w-200 flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="gap-2 border-b border-border px-6 py-4">
          <DialogTitle>选择目录</DialogTitle>
          <DialogDescription>将目录中文件导入到工作区。</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background">
          <div className="flex shrink-0 items-center border-b border-border px-6 pt-4 pb-4">
            <button
              onClick={handleSelectDirectory}
              className="rounded-sm bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              选择目录
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {error && <div className="p-4 text-sm text-red-600">{error}</div>}

            {!scanResults && !isLoading && (
              <div className="flex h-80 flex-col items-center justify-center text-muted-foreground">
                <svg
                  className="mb-4 h-16 w-16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                <p className="text-sm">请先选择一个目录，系统会自动扫描</p>
                <p className="mt-1 text-xs">支持 DOCX, DOC, XLSX, PDF 格式</p>
              </div>
            )}

            {isLoading && !scanResults && (
              <div className="flex h-80 flex-col items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
                <p className="mt-4 text-sm text-muted-foreground">正在扫描目录...</p>
              </div>
            )}

            {scanResults && totalCount === 0 && (
              <div className="flex h-80 flex-col items-center justify-center text-muted-foreground">
                <svg
                  className="mb-4 h-16 w-16"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-sm">该目录没有可导入文件，或全部已在列表中</p>
              </div>
            )}

            {totalCount > 0 && (
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/50">
                  <tr>
                    <th className="w-12 px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedCount === totalCount && totalCount > 0}
                        onChange={e => {
                          if (e.target.checked) {
                            selectAllFilteredFiles()
                          } else {
                            clearFilteredSelection()
                          }
                        }}
                        className="rounded border-border text-primary"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                      文件名
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                      类型
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                      大小
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">
                      修改时间
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredFiles.map(file => (
                    <tr
                      key={file.path}
                      className={cn(
                        "transition-colors hover:bg-accent/40",
                        file.selected && "bg-primary/10",
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={file.selected}
                          onChange={() => toggleFileSelectionByPath(file.path)}
                          className="rounded border-border text-primary"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FileIcon extension={file.extension} />
                          <span className="ml-3 max-w-md truncate text-sm text-foreground">
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground uppercase">
                          {file.extension}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {formatDate(file.modifiedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border px-5 py-4">
            <div className="text-xs text-muted-foreground">
              导入前会自动过滤已存在文件，避免重复导入。
            </div>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0 || isLoading}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-muted"
            >
              导入选择 ({selectedCount})
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

const FileIcon: React.FC<{ extension: string }> = ({ extension }) => {
  const colors: Record<string, string> = {
    docx: "text-blue-600",
    xlsx: "text-green-600",
    pptx: "text-orange-600",
    pdf: "text-red-600",
  }

  const color = colors[extension.toLowerCase()] || "text-gray-400"

  return (
    <svg className={cn("h-8 w-8", color)} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
