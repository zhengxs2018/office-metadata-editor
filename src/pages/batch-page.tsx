import React, { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { PageLayout } from "@/layouts/page-layout"
import { OmBatchToolbar } from "@/components/om/om-batch-toolbar"
import { OmExportDialog } from "@/components/om/om-common-dialogs"
import type { ExportFieldOption } from "@/components/om/om-export-center"
import { type FileStatus, useFileContext } from "@/contexts/file-context"
import { useMetadata } from "@/contexts/metadata-context"
import { formatFileSize } from "@/lib/utils"
import { FolderOpen, Settings, FileSpreadsheet } from "lucide-react"
import { OmTemplateApplyDialog } from "@/components/om/om-template-apply-dialog"
import { OmShowDirectoryPickerDialog } from "@/components/om/om-show-directory-picker"

export const BatchPage: React.FC = () => {
  const { files, openFiles, addFilesByPaths, removeFile, clearFiles } = useFileContext()
  const {
    documents,
    saveDocument,
    clearAndSaveDocument,
    batchSaveAll,
    batchClearAndSave,
    documentTaskRequestIds,
    batchTaskRequestId,
    requestStatusMap,
    cancelDocumentTask,
    cancelBatchTask,
  } = useMetadata()

  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)

  const documentMap = useMemo(() => {
    return new Map(documents.map(item => [item.id, item]))
  }, [documents])

  const rows = useMemo(
    () =>
      files.map(item => {
        const doc = documentMap.get(item.id)
        const fileName = item.filePath.split("/").pop() || item.filePath
        return {
          id: item.id,
          fileName: doc?.metadata.fileName || fileName,
          filePath: item.filePath,
          author: doc?.metadata.documentProperties.creator || "-",
          modified: doc?.metadata.documentProperties.modified || "-",
          hasChanges: doc?.hasChanges || false,
          fileType: doc?.metadata.fileType || "-",
          fileSize: doc?.metadata.fileSize || 0,
          status: item.status,
          progressMessage: item.progressMessage,
          error: item.error,
          requestId: documentTaskRequestIds[item.id],
        }
      }),
    [files, documentMap, documentTaskRequestIds],
  )

  const statusCounts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc[row.status] += 1
        if (row.hasChanges) acc.pending += 1
        if (row.error) acc.error += 1
        return acc
      },
      {
        idle: 0,
        reading: 0,
        ready: 0,
        processing: 0,
        error: 0,
        pending: 0,
      } as Record<FileStatus | "pending", number>,
    )
  }, [rows])

  const isBusy = statusCounts.processing > 0 || statusCounts.reading > 0 || actionStatus !== null

  const exportFieldOptions = useMemo<ExportFieldOption[]>(() => {
    const selectedDocuments = rows
      .map(row => documentMap.get(row.id))
      .filter((doc): doc is NonNullable<typeof doc> => !!doc)

    const fieldSet = new Set<string>()
    selectedDocuments.forEach(doc => {
      Object.keys(doc.metadata.documentProperties).forEach(key => fieldSet.add(key))
      Object.keys(doc.metadata.appProperties).forEach(key => fieldSet.add(key))
    })

    const labels: Record<string, string> = {
      title: "标题",
      subject: "主题",
      creator: "作者",
      keywords: "关键词",
      description: "描述",
      lastModifiedBy: "最后修改者",
      created: "创建时间",
      modified: "修改时间",
      category: "分类",
      manager: "管理者",
      company: "组织机构",
    }

    return Array.from(fieldSet).map(key => ({
      key,
      label: labels[key] || key,
    }))
  }, [documentMap, rows])

  const runAction = async (statusText: string, action: () => Promise<void>) => {
    if (isBusy) return

    setActionStatus(statusText)
    try {
      await action()
    } finally {
      setActionStatus(null)
    }
  }

  const handleOpenFiles = async () => {
    await openFiles()
  }

  const handleSaveOne = async (id: string) => {
    await runAction("正在保存文件...", async () => {
      await saveDocument(id)
    })
  }

  const handleClearAndSaveOne = async (id: string) => {
    await runAction("正在清理并保存...", async () => {
      await clearAndSaveDocument(id)
    })
  }

  const handleBatchSave = async () => {
    if (rows.length === 0) return

    await runAction("批量保存中...", async () => {
      await batchSaveAll()
    })
  }

  const handleBatchClearAndSave = async () => {
    if (rows.length === 0) return

    await runAction("批量清理并保存中...", async () => {
      await batchClearAndSave()
    })
  }

  const handleRemoveFile = (id: string) => {
    removeFile(id)
  }

  const handleClearAll = () => {
    clearFiles()
  }

  return (
    <PageLayout
      backTo="/"
      header={
        <div className="flex flex-col leading-tight select-none">
          <span className="text-sm font-medium text-foreground">批量处理</span>
        </div>
      }
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportDialog(true)}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            目录导入
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateDialog(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            模板
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportDialog(true)}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            导出
          </Button>
          <OmBatchToolbar
            hasFiles={rows.length > 0}
            isBusy={isBusy}
            busyText={actionStatus ?? (isBusy ? "后台处理中..." : undefined)}
            onAddFiles={handleOpenFiles}
            onBatchSave={handleBatchSave}
            onBatchClearAndSave={handleBatchClearAndSave}
            onClearAll={handleClearAll}
          />
          <Button
            variant="outline"
            size="sm"
            disabled={!batchTaskRequestId}
            onClick={() => void cancelBatchTask()}
          >
            取消批量任务
          </Button>
        </div>
      }
    >
      <div className="h-full w-full p-4">
        <div className="h-full rounded-lg border border-border/55 bg-card/84 p-4 backdrop-blur-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>文件名</TableHead>
                <TableHead>作者</TableHead>
                <TableHead>修改时间</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    暂无待处理文件，请先点击“添加文件”。
                  </TableCell>
                </TableRow>
              ) : (
                rows.map(row => {
                  const statusMessage =
                    row.error ||
                    (row.requestId
                      ? `任务 ${row.requestId} / ${requestStatusMap[row.requestId] || "running"}`
                      : "") ||
                    row.progressMessage ||
                    (row.hasChanges ? "待处理" : "已同步")
                  const disableActions =
                    isBusy || row.status === "processing" || row.status === "reading"

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-[320px]">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="block cursor-help truncate font-medium">
                              {row.fileName}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="start" className="max-w-xs">
                            <div className="space-y-1 text-xs">
                              <div>路径：{row.filePath}</div>
                              <div>类型：{row.fileType}</div>
                              <div>大小：{formatFileSize(row.fileSize)}</div>
                              <div>作者：{row.author}</div>
                              <div>修改时间：{row.modified}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>{row.author}</TableCell>
                      <TableCell>{row.modified}</TableCell>
                      <TableCell className="max-w-55">
                        <span
                          className="block truncate text-muted-foreground"
                          title={statusMessage}
                        >
                          {statusMessage}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!row.requestId}
                            onClick={() => void cancelDocumentTask(row.id)}
                          >
                            取消
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={disableActions || !!row.requestId}
                            onClick={() => handleRemoveFile(row.id)}
                          >
                            移除
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={disableActions || !!row.requestId}
                            onClick={() => void handleClearAndSaveOne(row.id)}
                          >
                            清空并保存
                          </Button>
                          <Button
                            size="sm"
                            disabled={disableActions || !!row.requestId}
                            onClick={() => void handleSaveOne(row.id)}
                          >
                            保存
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <OmShowDirectoryPickerDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        existingFilePaths={files.map(item => item.filePath)}
        onImportComplete={paths => {
          addFilesByPaths(paths)
        }}
      />

      <OmExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        fileIds={rows.map(item => item.id)}
        availableFields={exportFieldOptions}
      />

      <OmTemplateApplyDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        documentIds={rows.map(item => item.id)}
      />
    </PageLayout>
  )
}

export default BatchPage
