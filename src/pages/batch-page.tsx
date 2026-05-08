import React, { useEffect, useMemo, useState } from "react"
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
import { type FileStatus, useFileContext } from "@/contexts/file-context"
import { useMetadata } from "@/contexts/metadata-context"
import { useFileStore } from "@/stores/v2-stores"
import { formatFileSize } from "@/lib/utils"
import { DirectoryFileBrowser } from "@/components/v2/directory-file-browser"
import { TemplateManager } from "@/components/v2/template-manager"
import { ExportCenter } from "@/components/v2/export-center"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { FolderOpen, Settings, FileSpreadsheet } from "lucide-react"

export const BatchPage: React.FC = () => {
  const { files, openFiles, removeFile, clearFiles } = useFileContext()
  const { documents, saveDocument, clearAndSaveDocument, batchSaveAll, batchClearAndSave } =
    useMetadata()
  const { importSelectedFiles } = useFileStore()

  const [actionStatus, setActionStatus] = useState<string | null>(null)
  const [showDirectoryBrowser, setShowDirectoryBrowser] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showExportCenter, setShowExportCenter] = useState(false)

  useEffect(() => {
    clearFiles()
  }, [clearFiles])

  const documentMap = useMemo(() => {
    return new Map(documents.map(item => [item.id, item]))
  }, [documents])

  const rows = useMemo(
    () =>
      files.map(item => {
        const doc = documentMap.get(item.id)!
        return {
          id: item.id,
          fileName: doc.metadata.fileName,
          filePath: item.filePath,
          author: doc.metadata.documentProperties.creator || "-",
          modified: doc.metadata.documentProperties.modified || "-",
          hasChanges: doc.hasChanges,
          fileType: doc.metadata.fileType || "-",
          fileSize: doc.metadata.fileSize || 0,
          status: item.status,
          progressMessage: item.progressMessage,
          error: item.error,
        }
      }),
    [files, documentMap],
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

  const handleDirectoryImportComplete = async () => {
    setShowDirectoryBrowser(false)
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
            onClick={() => setShowDirectoryBrowser(true)}
            className="gap-2"
          >
            <FolderOpen className="h-4 w-4" />
            目录导入
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTemplateManager(true)}
            className="gap-2"
          >
            <Settings className="h-4 w-4" />
            模板
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportCenter(true)}
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
        </div>
      }
    >
      <div className="flex h-full w-full flex-col gap-4 p-4">
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
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  暂无待处理文件，请先点击“添加文件”。
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => {
                const statusMessage =
                  row.error || row.progressMessage || (row.hasChanges ? "待处理" : "已同步")
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
                      <span className="block truncate text-muted-foreground" title={statusMessage}>
                        {statusMessage}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={disableActions}
                          onClick={() => handleRemoveFile(row.id)}
                        >
                          移除
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={disableActions}
                          onClick={() => void handleClearAndSaveOne(row.id)}
                        >
                          清空并保存
                        </Button>
                        <Button
                          size="sm"
                          disabled={disableActions}
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

      {/* 目录浏览器对话框 */}
      <Dialog open={showDirectoryBrowser} onOpenChange={setShowDirectoryBrowser}>
        <DialogContent className="max-w-5xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>选择目录批量导入</DialogTitle>
            <DialogDescription>
              扫描指定目录下的所有支持文档，勾选后批量导入到工作区
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 -mx-6 -mb-6">
            <DirectoryFileBrowser onImportComplete={handleDirectoryImportComplete} />
          </div>
        </DialogContent>
      </Dialog>

      {/* 模板管理器对话框 */}
      <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>元数据模板管理</DialogTitle>
            <DialogDescription>
              创建、编辑、导入导出元数据模板，一键应用到多个文件
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 -mx-6 -mb-6">
            <TemplateManager />
          </div>
        </DialogContent>
      </Dialog>

      {/* 导出中心对话框 */}
      <Dialog open={showExportCenter} onOpenChange={setShowExportCenter}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>导出元数据</DialogTitle>
            <DialogDescription>
              将当前工作区的元数据导出为 JSON、Excel、CSV 或 XML 格式
            </DialogDescription>
          </DialogHeader>
          <div className="-mx-6 -mb-6">
            <ExportCenter />
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

export default BatchPage
