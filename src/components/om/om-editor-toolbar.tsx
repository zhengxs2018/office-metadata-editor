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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeIcon } from "@/components/icons/huge-icon"
import {
  ChevronDownIcon,
  Delete01Icon,
  FileAddIcon,
  FileExportIcon,
  FloppyDiskIcon,
  RotateLeft01Icon,
  SaveEnergy01Icon,
} from "@hugeicons/core-free-icons"

export const OmEditorToolbar: React.FC = () => {
  const { openFiles } = useFileContext()
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
      <div className="flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          onClick={() => void openFiles()}
          className="h-8 gap-1.5 rounded-lg"
        >
          <HugeIcon icon={FileAddIcon} size={14} />
          <span>添加文件</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={clearMetadata}
          className="ml-2 h-8 gap-1.5 rounded-lg"
        >
          <HugeIcon icon={Delete01Icon} size={14} />
          <span>清理</span>
        </Button>

        {/* Split button: 保存 | ▾ */}
        <div className="ml-2 flex rounded-lg">
          <Button
            variant="default"
            size="sm"
            onClick={() => void saveCurrent()}
            className="h-8 rounded-r-none rounded-l-lg border-r-0"
            disabled={!hasChanges || !!activeRequestId}
          >
            <HugeIcon icon={SaveEnergy01Icon} size={14} />
            <span>保存</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="h-8 w-7 shrink-0 rounded-l-none rounded-r-lg p-0 border-l-0"
              >
                <HugeIcon icon={ChevronDownIcon} size={12} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-fine-print font-normal text-muted-foreground">
                更多操作
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => void saveCurrentAs()}>
                <HugeIcon icon={FloppyDiskIcon} size={14} className="mr-2" />
                <span>另存为</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowExportDialog(true)}>
                <HugeIcon icon={FileExportIcon} size={14} className="mr-2" />
                <span>导出</span>
              </DropdownMenuItem>
              {hasChanges ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={resetToOriginal}>
                    <HugeIcon icon={RotateLeft01Icon} size={14} className="mr-2" />
                    <span>重置</span>
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

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
