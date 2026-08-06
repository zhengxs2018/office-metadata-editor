import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  Delete01Icon,
  Download01Icon,
  FileAddIcon,
  MoreHorizontalIcon,
  Search02Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useFileContext } from "@/contexts/file-context"
import { useMetadata } from "@/contexts/metadata-context"
import { HugeIcon } from "@/components/icons/huge-icon"
import { FileDropZone } from "@/components/base/file-drop-zone"
import { AddFilesDialog } from "@/components/om/om-add-files-dialog"
import { ExportView } from "./components/export-view"
import { BatchTableRow } from "./components/batch-table-row"
import { PageLayout } from "@/layouts/page-layout"
import type { BatchRow } from "./components/batch-types"

type CleanupResult = {
  status: "running" | "success" | "failure"
  total: number
  success: number
  failures: { id: string; fileName: string; error: string }[]
}

const CleanupResultPill: React.FC<{ result: CleanupResult }> = ({ result }) => {
  if (result.status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-0.5 text-blue-600">
        <HugeIcon icon={MoreHorizontalIcon} size={12} className="animate-pulse" />
        <span>清理中… {result.total} 个文件</span>
      </span>
    )
  }

  if (result.status === "success") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-600">
        <HugeIcon icon={CheckmarkCircle02Icon} size={12} />
        <span>清理成功 {result.success} 个文件</span>
      </span>
    )
  }

  // failure
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-red-500/10 px-2 py-0.5 text-red-600 hover:bg-red-500/15"
        >
          <HugeIcon icon={Alert02Icon} size={12} />
          <span>
            清理失败 {result.failures.length} 个，共 {result.total}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 p-3 text-fine-print">
        <p className="mb-2 font-semibold text-red-600">
          失败 {result.failures.length} / {result.total}
        </p>
        <ul className="max-h-60 space-y-1.5 overflow-auto">
          {result.failures.map(f => (
            <li key={f.id} className="rounded border border-border/40 bg-muted/30 p-2">
              <p className="truncate text-ink-soft font-medium" title={f.fileName}>
                {f.fileName}
              </p>
              <p className="mt-0.5 text-muted-foreground break-all">{f.error}</p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

export const BatchPage: React.FC = () => {
  const { addFilesByPaths, clearFiles } = useFileContext()
  const {
    documents,
    saveDocument,
    removeDocument,
    batchClearAndSave,
    cancelDocumentTask,
    batchTaskRequestId,
    documentTaskRequestIds,
  } = useMetadata()

  const [showExport, setShowExport] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null)

  const isBusy = !!batchTaskRequestId ||
    documents.some(doc => !!documentTaskRequestIds[doc.id])

  // ---- rows ----
  const rows = useMemo<BatchRow[]>(() =>
    documents.map(doc => {
      const props = doc.metadata.documentProperties
      const app = doc.metadata.appProperties
      const fileName = doc.metadata.fileName || doc.filePath.split(/[\\/]/).pop() || "未命名文件"
      return {
        id: doc.id,
        filePath: doc.filePath,
        fileName,
        fileType: doc.metadata.fileType || "",
        fileSize: doc.metadata.fileSize ?? 0,
        author: (props.creator ?? "").trim() || "-",
        lastModifiedBy: (props.lastModifiedBy ?? "").trim() || "-",
        appCompany: (app?.company ?? "").trim() || "-",
        application: (app?.application ?? "").trim() || "-",
        created: (props.created ?? "").trim() || "-",
        modified: (props.modified ?? "").trim() || "-",
        status: doc.status,
        progressMessage: doc.progressMessage,
        hasChanges: doc.hasChanges,
        error: doc.error ?? "",
        taskRequestId: documentTaskRequestIds[doc.id] ?? "",
        companyId: doc.companyId ?? "",
      }
    }),
    [documents, documentTaskRequestIds],
  )

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter(r =>
      r.fileName.toLowerCase().includes(q) ||
      r.author.toLowerCase().includes(q) ||
      r.lastModifiedBy.toLowerCase().includes(q) ||
      r.filePath.toLowerCase().includes(q),
    )
  }, [rows, search])

  const hasFiles = rows.length > 0
  const allSelected = hasFiles && selectedIds.size === rows.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < rows.length

  const exportFields = useMemo(() => [
    { key: "fileName", label: "文件名" },
    { key: "fileType", label: "类型" },
    { key: "fileSize", label: "大小" },
    { key: "author", label: "作者" },
    { key: "lastModifiedBy", label: "最后修改者" },
    { key: "appCompany", label: "组织名" },
    { key: "application", label: "创建器" },
    { key: "created", label: "创建时间" },
    { key: "modified", label: "修改时间" },
  ], [])

  // ---- auto-hide cleanup result on file count change ----
  useEffect(() => {
    setCleanupResult(null)
  }, [rows.length])

  // ---- track cleanup operation lifecycle ----
  useEffect(() => {
    if (batchTaskRequestId) {
      setCleanupResult({
        status: "running",
        total: rows.length,
        success: 0,
        failures: [],
      })
    } else if (cleanupResult?.status === "running") {
      const failures = rows
        .filter(r => r.status === "error")
        .map(r => ({ id: r.id, fileName: r.fileName, error: r.error || "未知错误" }))
      setCleanupResult({
        status: failures.length === 0 ? "success" : "failure",
        total: rows.length,
        success: rows.length - failures.length,
        failures,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [batchTaskRequestId])

  // ---- selection ----
  const toggleSelectAll = useCallback(() => {
    setSelectedIds(allSelected ? new Set() : new Set(rows.map(r => r.id)))
  }, [allSelected, rows])

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ---- handlers ----
  const handleSaveRow = useCallback(async (docId: string) => {
    await saveDocument(docId)
  }, [saveDocument])

  const handleRemoveRow = useCallback((docId: string) => {
    removeDocument(docId)
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.delete(docId)
      return next
    })
  }, [removeDocument])

  const handleBatchClearAndSave = useCallback(() => {
    void batchClearAndSave()
  }, [batchClearAndSave])

  const handleAddFilesConfirm = useCallback(
    (paths: string[], mode: "append" | "overwrite") => {
      if (mode === "overwrite") clearFiles()
      addFilesByPaths(paths)
      setShowAddDialog(false)
    },
    [addFilesByPaths, clearFiles],
  )

  const handleDropZoneFiles = useCallback(
    (paths: string[]) => {
      clearFiles()
      addFilesByPaths(paths)
    },
    [addFilesByPaths, clearFiles],
  )

  // ---- header ----
  const headerContent = (
    <div className="min-w-0">
      <p className="text-ink truncate font-heading text-base font-semibold">批量处理</p>
    </div>
  )

  const headerActions = hasFiles ? (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        onClick={() => setShowAddDialog(true)}
        disabled={isBusy}
        className="gap-1.5 rounded-lg"
      >
        <HugeIcon icon={FileAddIcon} size={14} />
        添加文件
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={handleBatchClearAndSave}
        disabled={isBusy}
        className="gap-1.5 rounded-lg"
      >
        <HugeIcon icon={Delete01Icon} size={14} />
        清理并保存
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowExport(true)}
        className="gap-1.5 rounded-lg"
      >
        <HugeIcon icon={Download01Icon} size={14} />
        导出
      </Button>
    </div>
  ) : undefined

  return (
    <TooltipProvider delayDuration={150}>
      <PageLayout header={headerContent} actions={headerActions}>
        <div className="flex min-h-0 flex-1 flex-col">
          {hasFiles ? (
            <>
              {/* Search bar */}
              <div className="mb-3 flex items-center justify-end gap-3">
                <div className="ml-auto flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-2.5 py-1.5">
                  <HugeIcon icon={Search02Icon} size={13} className="text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="搜索文件名或作者…"
                    className="text-fine-print w-40 bg-transparent text-ink-soft outline-none placeholder:text-muted-foreground/60 sm:w-52"
                  />
                  {search ? (
                    <button
                      onClick={() => setSearch("")}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  ) : null}
                </div>
              </div>

              {/* Table */}
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/60 bg-card">
                <div className="min-h-30 flex-1 overflow-auto">
                  <table className="border-separate border-spacing-0 text-sm" style={{ width: "max-content", minWidth: "100%" }}>
                    <thead className="sticky top-0 z-20 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="sticky left-0 z-30 w-10 shrink-0 rounded-tl-lg border-t border-b border-l border-r border-zinc-300 bg-muted py-2.5 pr-1 pl-3 font-medium whitespace-nowrap shadow-[2px_0_3px_-1px_rgba(0,0,0,0.08)]">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={el => { if (el) el.indeterminate = someSelected }}
                            onChange={toggleSelectAll}
                            className="size-3.5 cursor-pointer rounded border-border text-primary"
                          />
                        </th>
                        <th className="w-50 min-w-50 border-t border-b border-r border-zinc-300 bg-muted py-2.5 pr-3 pl-3 font-medium whitespace-nowrap">文件</th>
                        <th className="w-25 min-w-25 border-t border-b border-r border-zinc-300 bg-muted py-2.5 pr-2 pl-3 font-medium whitespace-nowrap">作者</th>
                        <th className="w-25 min-w-25 border-t border-b border-r border-zinc-300 bg-muted py-2.5 pr-2 pl-3 font-medium whitespace-nowrap">最后修改者</th>
                        <th className="w-30 min-w-30 border-t border-b border-r border-zinc-300 bg-muted py-2.5 pr-2 pl-3 font-medium whitespace-nowrap">修改时间</th>
                        <th className="w-25 min-w-25 border-t border-b border-r border-zinc-300 bg-muted py-2.5 pr-2 pl-3 font-medium whitespace-nowrap">组织名</th>
                        <th className="w-25 min-w-25 border-t border-b border-r border-zinc-300 bg-muted py-2.5 pr-2 pl-3 font-medium whitespace-nowrap">创建器</th>
                        <th className="w-27.5 min-w-27.5 border-t border-b border-r border-zinc-300 bg-muted py-2.5 pr-3 pl-3 font-medium whitespace-nowrap">创建时间</th>
                        <th className="sticky right-0 z-30 w-24 min-w-24 shrink-0 rounded-tr-lg border-t border-b border-l border-r border-zinc-300 bg-muted py-2.5 pr-3 pl-3 text-right font-medium whitespace-nowrap shadow-[-2px_0_3px_-1px_rgba(0,0,0,0.08)]">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.length > 0 ? (
                        filteredRows.map(row => (
                          <BatchTableRow
                            key={row.id}
                            row={row}
                            isSelected={selectedIds.has(row.id)}
                            onToggleSelect={toggleSelect}
                            onSave={handleSaveRow}
                            onRemove={handleRemoveRow}
                            onCancelTask={id => void cancelDocumentTask(id)}
                          />
                        ))
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-fine-print text-muted-foreground">
                            {search.trim() ? "无匹配结果" : "暂无文件"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer — inside table container, distinct background */}
                <div className="flex shrink-0 items-center justify-between border-t-2 border-border bg-muted/80 px-3 py-1.5 text-fine-print text-muted-foreground">
                  <span>
                    {selectedIds.size > 0
                      ? `已选 ${selectedIds.size} / ${rows.length} 个文件`
                      : `共 ${rows.length} 个文件`}
                  </span>
                  <div>
                    {cleanupResult ? <CleanupResultPill result={cleanupResult} /> : null}
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Empty state: drag-drop zone (overwrite mode) */
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-4">
              <FileDropZone
                onFilesSelected={handleDropZoneFiles}
                className="w-full max-w-lg"
              />
              <p className="mt-4 text-fine-print text-muted-foreground">
                首次导入将采用覆盖模式 · 支持拖拽文件夹批量导入
              </p>
            </div>
          )}
        </div>

        <AddFilesDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onConfirm={handleAddFilesConfirm}
          existingFileCount={rows.length}
        />

        <ExportView
          open={showExport}
          onClose={() => setShowExport(false)}
          documents={documents}
          availableFields={exportFields}
        />
      </PageLayout>
    </TooltipProvider>
  )
}

export default BatchPage
