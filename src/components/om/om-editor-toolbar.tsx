import React from "react"
import { useFileContext } from "@/contexts/file-context"
import { useMetadata } from "@/contexts/metadata-context"
import type { ExportFieldOption } from "@/components/om/om-export-center"
import { OmExportDialog } from "@/components/om/om-common-dialogs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeIcon } from "@/components/icons/huge-icon"
import {
  FileAddIcon,
  Download01Icon,
  MoreHorizontalIcon,
  RotateLeft01Icon,
  SaveEnergy01Icon,
  Delete01Icon,
  Settings01Icon,
  FolderOpenIcon,
} from "@hugeicons/core-free-icons"
import { OmShowDirectoryPickerDialog } from "./om-show-directory-picker"

export const OmEditorToolbar: React.FC = () => {
  const { files, openFiles, addFilesByPaths } = useFileContext()
  const {
    documents,
    activeDocumentId,
    hasChanges,
    clearMetadata,
    resetToOriginal,
    saveCurrent,
    saveCurrentAs,
    documentTaskRequestIds,
  } = useMetadata()

  const [showImportDialog, setShowImportDialog] = React.useState(false)
  const [showExportDialog, setShowExportDialog] = React.useState(false)

  const exportFieldOptions = React.useMemo<ExportFieldOption[]>(() => {
    const targetDocs = activeDocumentId
      ? documents.filter(doc => doc.id === activeDocumentId)
      : documents

    const fieldSet = new Set<string>()
    targetDocs.forEach(doc => {
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
  }, [activeDocumentId, documents])

  const activeRequestId = activeDocumentId ? documentTaskRequestIds[activeDocumentId] : undefined

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button
          variant="default"
          size="sm"
          onClick={() => void saveCurrent()}
          className="h-8 gap-1.5 rounded-lg"
          disabled={!hasChanges || !!activeRequestId}
        >
          <HugeIcon icon={SaveEnergy01Icon} size={14} />
          <span>保存</span>
        </Button>

        {hasChanges ? (
          <Button
            variant="outline"
            size="sm"
            onClick={resetToOriginal}
            className="h-8 gap-1.5 rounded-lg"
          >
            <HugeIcon icon={RotateLeft01Icon} size={14} />
            <span>重置</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={clearMetadata}
            className="h-8 gap-1.5 rounded-lg"
          >
            <HugeIcon icon={Delete01Icon} size={14} />
            <span>清理全部</span>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="rounded-lg">
              <HugeIcon icon={MoreHorizontalIcon} size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => void openFiles()}>
              <HugeIcon icon={FileAddIcon} size={14} className="mr-2" />
              <span>添加文件</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void setShowImportDialog(true)}>
              <HugeIcon icon={FolderOpenIcon} size={14} className="mr-2" />
              <span>添加目录</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void saveCurrentAs()}>
              <HugeIcon icon={Download01Icon} size={14} className="mr-2" />
              <span>另存为</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
              <HugeIcon icon={Settings01Icon} size={14} className="mr-2" />
              <span>导出</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
        fileIds={activeDocumentId ? [activeDocumentId] : []}
        availableFields={exportFieldOptions}
      />
    </>
  )
}

export default OmEditorToolbar
