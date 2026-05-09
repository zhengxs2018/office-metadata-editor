import React from "react"
import { useState, useCallback } from "react"
import { Upload, FileText } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { SUPPORTED_FILE_EXTENSIONS } from "@/lib/documents/supported-formats"
import { cn } from "@/lib/utils"

export interface OmFileUploadZoneProps {
  className?: string
  isLoading: boolean
  onOpenFiles: () => void
  onDropFiles?: (paths: string[]) => void
}

export const OmFileUploadZone: React.FC<OmFileUploadZoneProps> = ({
  className,
  isLoading,
  onOpenFiles,
  onDropFiles,
}) => {
  const [isDragOver, setIsDragOver] = useState(false)
  const formatText = SUPPORTED_FILE_EXTENSIONS.map(ext => `.${ext}`).join(" / ")

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragOver(false)

      const droppedPaths = Array.from(e.dataTransfer.files)
        .map(file => (file as File & { path?: string }).path)
        .filter((path): path is string => Boolean(path))

      if (droppedPaths.length > 0) {
        onDropFiles?.(droppedPaths)
        return
      }

      void onOpenFiles()
    },
    [onDropFiles, onOpenFiles],
  )

  const handleClick = useCallback(() => {
    void onOpenFiles()
  }, [onOpenFiles])

  return (
    <button
      type="button"
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      disabled={isLoading}
      className={cn(
        `group relative flex min-h-44 w-full max-w-full flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed px-4 py-5 transition-all duration-200`,
        isDragOver
          ? "border-primary bg-primary/12"
          : "border-border bg-card/80 hover:border-primary/50 hover:bg-card",
        isLoading ? "cursor-wait opacity-70" : "cursor-pointer",
        className,
      )}
    >
      {isLoading ? (
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-10 w-10 text-primary" />
          <span className="text-sm text-muted-foreground">正在解析文件...</span>
        </div>
      ) : (
        <>
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full transition-colors ${
              isDragOver ? "bg-primary/20" : "bg-muted group-hover:bg-primary/10"
            }`}
          >
            {isDragOver ? (
              <FileText className="h-8 w-8 text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-sm font-medium text-foreground">
              {isDragOver ? "释放以选择文件" : "点击或拖拽文件到此处"}
            </span>
            <span className="text-xs text-muted-foreground">支持 {formatText}，支持多文件</span>
          </div>
        </>
      )}
    </button>
  )
}

export default OmFileUploadZone
