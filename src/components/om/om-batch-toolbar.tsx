import React from "react"
import { Button } from "@/components/ui/button"
import { HugeIcon } from "@/components/icons/huge-icon"
import { FileAddIcon, SaveEnergy01Icon, Delete01Icon, Cancel01Icon } from "@hugeicons/core-free-icons"

export interface OmBatchToolbarProps {
  hasFiles: boolean
  isBusy?: boolean
  busyText?: string
  onAddFiles: () => Promise<void> | void
  onBatchSave: () => Promise<void> | void
  onBatchClearAndSave: () => Promise<void> | void
  onClearAll: () => void
}

export const OmBatchToolbar: React.FC<OmBatchToolbarProps> = ({
  hasFiles,
  isBusy = false,
  busyText,
  onAddFiles,
  onBatchSave,
  onBatchClearAndSave,
  onClearAll,
}) => {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => void onAddFiles()}
        disabled={isBusy}
        className="gap-2"
      >
        <HugeIcon icon={FileAddIcon} size={14} />
        <span>{isBusy ? "处理中..." : "添加文件"}</span>
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={() => void onBatchSave()}
        disabled={!hasFiles || isBusy}
        className="gap-2"
      >
        <HugeIcon icon={SaveEnergy01Icon} size={14} />
        <span>一键保存</span>
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => void onBatchClearAndSave()}
        disabled={!hasFiles || isBusy}
        className="gap-2"
      >
        <HugeIcon icon={Delete01Icon} size={14} />
        <span>一键清空并保存</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        disabled={!hasFiles || isBusy}
        className="gap-2"
      >
        <HugeIcon icon={Cancel01Icon} size={14} />
        <span>清空列表</span>
      </Button>
      {busyText && <span className="text-xs text-muted-foreground">{busyText}</span>}
    </div>
  )
}

export default OmBatchToolbar
