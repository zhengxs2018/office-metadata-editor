import React from "react"

import { OmFeatureDialog } from "@/components/om/om-feature-dialog"
import { OmExportCenter } from "@/components/om/om-export-center"
import type { ExportFieldOption } from "@/components/om/om-export-center"

interface OmExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileIds?: string[]
  availableFields?: ExportFieldOption[]
}

export const OmExportDialog: React.FC<OmExportDialogProps> = ({
  open,
  onOpenChange,
  fileIds = [],
  availableFields = [],
}) => {
  return (
    <OmFeatureDialog
      open={open}
      onOpenChange={onOpenChange}
      title="导出元数据"
      description="将当前工作区元数据导出为 JSON、CSV 或 XML。"
      size="xl"
    >
      <OmExportCenter fileIds={fileIds} availableFields={availableFields} />
    </OmFeatureDialog>
  )
}
