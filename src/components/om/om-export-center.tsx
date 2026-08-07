import React, { useState, useCallback } from "react"
import { toast } from "sonner"
import { useMetadata } from "@/contexts/metadata-context"
import type { ExportFormat, ExportOptions, ExportResult, ExportFieldOption } from "@/types/om-workflow"
import { open } from "@tauri-apps/plugin-dialog"
import { writeTextFile } from "@tauri-apps/plugin-fs"
import { invoke } from "@tauri-apps/api/core"

export type { ExportFieldOption } from "@/types/om-workflow"

interface OmExportCenterProps {
  fileIds?: string[]
  availableFields?: ExportFieldOption[]
}

const defaultFieldLabels: Record<string, string> = {
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

const resolveFieldLabel = (field: string): string => {
  if (defaultFieldLabels[field]) return defaultFieldLabels[field]
  return field
}

export const OmExportCenter: React.FC<OmExportCenterProps> = ({
  fileIds = [],
  availableFields,
}) => {
  const { documents } = useMetadata()

  const [format, setFormat] = useState<ExportFormat>("json")
  const [includeFields, setIncludeFields] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)

  const selectedDocs =
    fileIds.length > 0 ? documents.filter(d => fileIds.includes(d.id)) : documents

  const resolvedFields: ExportFieldOption[] = (() => {
    if (availableFields && availableFields.length > 0) return availableFields
    const fieldSet = new Set<string>()
    selectedDocs.forEach(doc => {
      Object.keys(doc.metadata.documentProperties).forEach(key => fieldSet.add(key))
      Object.keys(doc.metadata.appProperties).forEach(key => fieldSet.add(key))
    })
    return Array.from(fieldSet).map(key => ({ key, label: resolveFieldLabel(key) }))
  })()

  const toggleField = (field: string) => {
    setIncludeFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field],
    )
  }

  const handleExport = useCallback(async () => {
    if (documents.length === 0) {
      alert("没有可导出的文件")
      return
    }

    setIsExporting(true)
    setExportResult(null)

    try {
      const outputDir = await open({ title: "选择导出目录", directory: true, multiple: false })
      const extension = format === "excel" ? "csv" : format
      const filePath =
        typeof outputDir === "string"
          ? `${outputDir}/metadata-export-${Date.now()}.${extension}`
          : null

      if (!filePath) {
        setIsExporting(false)
        return
      }

      const options: ExportOptions = {
        format,
        includeFields: includeFields.length > 0 ? includeFields : undefined,
        outputDir: filePath.substring(0, filePath.lastIndexOf("/")),
        fileName: filePath.split("/").pop() || "export",
        prettyPrint: format === "json",
      }

      const normalizedData = selectedDocs.map(doc => {
        const base: Record<string, unknown> = {
          filePath: doc.filePath,
          fileName: doc.metadata.fileName,
          fileType: doc.metadata.fileType,
        }

        const source = doc.metadata.documentProperties as unknown as Record<string, unknown>
        const fields =
          options.includeFields && options.includeFields.length > 0
            ? options.includeFields
            : Object.keys(source)

        fields.forEach(field => {
          base[field] = source[field] ?? ""
        })

        return base
      })

      let content = ""
      if (format === "json") {
        content = JSON.stringify(normalizedData, null, options.prettyPrint ? 2 : 0)
      } else if (format === "xml") {
        const items = normalizedData
          .map(row => {
            const body = Object.entries(row)
              .map(
                ([k, v]) =>
                  `<${k}>${String(v ?? "")
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")}</${k}>`,
              )
              .join("")
            return `<item>${body}</item>`
          })
          .join("")
        content = `<?xml version="1.0" encoding="UTF-8"?><metadata>${items}</metadata>`
      } else {
        const headers = Object.keys(normalizedData[0] || {})
        const rows = normalizedData.map(row =>
          headers.map(h => `"${String(row[h] ?? "").replaceAll('"', '""')}"`).join(","),
        )
        content = [headers.join(","), ...rows].join("\n")
      }

      await writeTextFile(filePath, content)

      const result: ExportResult = {
        success: true,
        outputPath: filePath,
        exportedCount: selectedDocs.length,
      }

      setExportResult(result)

      if (result.success) {
        toast.success("导出成功", {
          description: `已导出 ${result.exportedCount} 个文件的元数据至 ${result.outputPath}`,
        })
        await invoke("open_export_folder", { filePath: result.outputPath }).catch(() => {})
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      toast.error("导出失败", { description: message })
    } finally {
      setIsExporting(false)
    }
  }, [documents, fileIds, format, includeFields])

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-xl font-semibold text-foreground">导出中心</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="min-h-0 space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-foreground">导出格式</label>
              <div className="grid grid-cols-2 gap-3">
                {(["json", "excel", "csv", "xml"] as ExportFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`rounded-lg border p-4 text-center transition-all ${
                      format === fmt
                        ? "border-primary bg-primary/8"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="text-lg font-semibold text-foreground uppercase">{fmt}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {fmt === "json" && "JSON 格式"}
                      {fmt === "excel" && "Excel 表格"}
                      {fmt === "csv" && "逗号分隔值"}
                      {fmt === "xml" && "XML 文档"}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-foreground">
                导出字段
                <span className="ml-2 text-xs text-muted-foreground">(不选则导出全部)</span>
              </label>
              <div className="max-h-65 overflow-y-auto rounded-lg border border-border p-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {resolvedFields.map(field => (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 rounded border border-border p-2 hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        checked={includeFields.includes(field.key)}
                        onChange={() => toggleField(field.key)}
                        className="rounded border-border text-primary"
                      />
                      <span className="text-sm text-foreground">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">导出范围</label>
              <div className="rounded-lg border border-border bg-background/60 p-3">
                <div className="text-sm text-muted-foreground">
                  {fileIds.length > 0
                    ? `已选择 ${fileIds.length} 个文件`
                    : `全部 ${documents.length} 个文件`}
                </div>
              </div>
            </div>

            <button
              onClick={handleExport}
              disabled={isExporting || documents.length === 0}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:bg-muted"
            >
              {isExporting ? (
                <>
                  <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  导出中...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  开始导出
                </>
              )}
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-medium text-foreground">待导出文件预览</h3>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="max-h-72 overflow-y-auto">
                  {selectedDocs.slice(0, 12).map(file => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 border-b border-border bg-background px-4 py-2 last:border-b-0"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-primary/12 text-xs font-bold text-primary uppercase">
                        {(file.metadata.fileType || "-").slice(0, 4)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {file.metadata.fileName}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {file.filePath}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedDocs.length > 12 && (
                  <div className="bg-muted/40 px-4 py-2 text-center text-xs text-muted-foreground">
                    还有 {selectedDocs.length - 12} 个文件...
                  </div>
                )}
                {documents.length === 0 && (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    暂无文件，请先导入文件
                  </div>
                )}
              </div>
            </div>

            {exportResult && (
              <div
                className={`rounded-lg p-4 ${
                  exportResult.success
                    ? "border border-emerald-300 bg-emerald-50"
                    : "border border-red-300 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {exportResult.success ? (
                    <svg
                      className="h-6 w-6 shrink-0 text-emerald-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="h-6 w-6 shrink-0 text-red-600 dark:text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  )}
                  <div className="flex-1">
                    <h4
                      className={`font-medium ${
                        exportResult.success ? "text-emerald-700" : "text-red-700"
                      }`}
                    >
                      {exportResult.success ? "导出成功" : "导出失败"}
                    </h4>
                    {exportResult.success && (
                      <>
                        <p className="mt-1 text-sm text-emerald-700">
                          成功导出 {exportResult.exportedCount} 个文件的元数据
                        </p>
                        {exportResult.outputPath && (
                          <p className="mt-2 text-xs break-all text-emerald-700">
                            {exportResult.outputPath}
                          </p>
                        )}
                      </>
                    )}
                    {!exportResult.success && (
                      <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                        请检查文件格式和权限后重试
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <h4 className="mb-2 text-sm font-medium text-foreground">使用提示</h4>
              <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                <li>JSON 格式适合程序处理和备份</li>
                <li>Excel 格式适合人工查看和编辑</li>
                <li>CSV 格式适合导入到其他系统</li>
                <li>XML 格式适合企业级数据交换</li>
                <li>可选择特定字段进行精简导出</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OmExportCenter
