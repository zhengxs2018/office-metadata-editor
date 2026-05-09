import React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useTemplateStore } from "@/stores/om-workflow-store"
import { useMetadata } from "@/contexts/metadata-context"

interface OmTemplateApplyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  documentIds: string[]
}

export const OmTemplateApplyDialog: React.FC<OmTemplateApplyDialogProps> = ({
  open,
  documentIds,
  onOpenChange,
}) => {
  const { templates, loadTemplates } = useTemplateStore()
  const { applyTemplateToDocuments } = useMetadata()
  const [selectedTemplateId, setSelectedTemplateId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    void loadTemplates()
  }, [open, loadTemplates])

  const selectedTemplate = templates.find(item => item.id === selectedTemplateId) ?? null

  const handleApply = () => {
    if (!selectedTemplate) return
    applyTemplateToDocuments(selectedTemplate, documentIds)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>选择模板</DialogTitle>
          <DialogDescription>将默认值填充到当前文件中</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
              {templates.map(template => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`w-full border rounded-sm px-3 py-2 text-left ${selectedTemplateId === template.id ? "border-primary bg-primary/10" : "border-border bg-background"}`}
                >
                  <p className="text-sm font-medium text-foreground">{template.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {template.description || "无描述"}
                  </p>
                </button>
              ))}
              {templates.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  暂无模板，请先在模板中心创建。
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!selectedTemplate || documentIds.length === 0}
              >
                应用模板
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
