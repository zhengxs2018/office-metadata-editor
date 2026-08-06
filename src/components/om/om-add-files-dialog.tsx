import React, { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { FileDropZone } from "@/components/base/file-drop-zone"
import { HugeIcon } from "@/components/icons/huge-icon"
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  FileAddIcon,
} from "@hugeicons/core-free-icons"
import { cn } from "@/lib/utils"

type AddMode = "append" | "overwrite"

interface AddFilesDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (paths: string[], mode: AddMode) => void
  /** 已存在的文件数量（用于决定默认模式） */
  existingFileCount: number
}

export const AddFilesDialog: React.FC<AddFilesDialogProps> = ({
  open,
  onClose,
  onConfirm,
  existingFileCount,
}) => {
  const [mode, setMode] = useState<AddMode>(existingFileCount === 0 ? "overwrite" : "append")
  const [collected, setCollected] = useState<string[]>([])
  const [confirmed, setConfirmed] = useState(false)

  const handleFilesSelected = useCallback((paths: string[]) => {
    setCollected(paths)
  }, [])

  const handleConfirm = () => {
    if (collected.length === 0) {
      // no files selected yet → close
      onClose()
      return
    }
    onConfirm(collected, mode)
    setConfirmed(true)
    setTimeout(() => {
      setConfirmed(false)
      setCollected([])
      setMode(existingFileCount === 0 ? "overwrite" : "append")
      onClose()
    }, 600)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header
        data-tauri-drag-region
        className="app-drag flex shrink-0 items-center gap-2 border-b border-border bg-background/95 py-3 pr-4 backdrop-blur-md"
        style={{ paddingLeft: "calc(var(--chrome-traffic-light-inset, 0px) + 0.75rem)" }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="app-no-drag shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="返回"
            >
              <HugeIcon icon={ArrowLeft01Icon} size={14} />
            </Button>
          </div>
          <div className="h-4 w-px shrink-0 bg-hairline" />
          <div className="min-w-0">
            <p className="text-ink truncate font-heading text-base font-semibold">添加文件</p>
            <p className="truncate text-fine-print text-muted-foreground">
              {existingFileCount > 0
                ? `当前已有 ${existingFileCount} 个文件`
                : "首次导入"}
            </p>
          </div>
        </div>
        <div className="app-no-drag flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            onClick={handleConfirm}
            className={cn("gap-1.5 rounded-lg transition-all", confirmed && "bg-emerald-600")}
          >
            {confirmed ? (
              <HugeIcon icon={CheckmarkCircle02Icon} size={14} />
            ) : (
              <HugeIcon icon={FileAddIcon} size={14} />
            )}
            {confirmed ? "已添加" : collected.length > 0 ? `导入 (${collected.length})` : "关闭"}
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-8 pb-8 sm:px-6">
          <div className="space-y-3">
            <p className="text-caption font-medium text-muted-foreground">导入模式</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("append")}
                className={cn(
                  "flex-1 cursor-pointer rounded-lg border px-4 py-3 text-left transition-all",
                  mode === "append"
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/60 hover:border-primary/30",
                )}
              >
                <p className={cn("text-caption font-semibold", mode === "append" ? "text-primary" : "text-ink")}>
                  追加模式
                </p>
                <p className="text-fine-print mt-0.5 text-muted-foreground">
                  保留现有文件，将新文件追加到列表中
                </p>
              </button>
              <button
                type="button"
                onClick={() => setMode("overwrite")}
                className={cn(
                  "flex-1 cursor-pointer rounded-lg border px-4 py-3 text-left transition-all",
                  mode === "overwrite"
                    ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/60 hover:border-primary/30",
                )}
              >
                <p className={cn("text-caption font-semibold", mode === "overwrite" ? "text-primary" : "text-ink")}>
                  覆盖模式
                </p>
                <p className="text-fine-print mt-0.5 text-muted-foreground">
                  清空现有列表，仅保留本次添加的文件
                </p>
              </button>
            </div>
          </div>

          <FileDropZone
            onFilesSelected={handleFilesSelected}
            className="min-h-52"
          />

          {collected.length > 0 ? (
            <div className="rounded-lg border border-border/60 bg-card/50 p-3">
              <p className="text-fine-print font-medium text-muted-foreground">
                已选择 {collected.length} 个文件
              </p>
              <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-fine-print text-muted-foreground">
                {collected.slice(0, 20).map((p, i) => (
                  <li key={i} className="truncate">{p.split(/[\\/]/).pop()}</li>
                ))}
                {collected.length > 20 ? (
                  <li className="text-muted-foreground/60">… 还有 {collected.length - 20} 个文件</li>
                ) : null}
              </ul>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}

export default AddFilesDialog
