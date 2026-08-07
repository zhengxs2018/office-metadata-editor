import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  DatabaseIcon,
  Download01Icon,
  CodeFolderIcon,
  FileSpreadsheetIcon,
  Loading02Icon,
  Table01Icon,
  CancelCircleIcon,
} from "@hugeicons/core-free-icons"
import { invoke } from "@tauri-apps/api/core"
import { save } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import type { LoadedDocument } from "@/contexts/metadata-context"
import { HugeIcon } from "@/components/icons/huge-icon"
import { FORMAT_META, resolveFieldLabel, buildRecord, buildContent, buildExcelBase64, buildFileName } from "./export-utils"
import type { ExportFormat, ExportResult, ExportFieldOption } from "./export-types"

export type { ExportFormat, ExportResult, ExportFieldOption } from "./export-types"

interface ExportViewProps {
  open: boolean
  onClose: () => void
  documents: LoadedDocument[]
  availableFields: ExportFieldOption[]
}

export const ExportView: React.FC<ExportViewProps> = ({
  open,
  onClose,
  documents,
  availableFields,
}) => {
  const [format, setFormat] = useState<ExportFormat>("excel")
  const [includeFields, setIncludeFields] = useState<string[]>([])
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState<ExportResult | null>(null)

  useEffect(() => {
    if (!open) {
      setResult(null)
      setExporting(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !exporting) onClose()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, exporting, onClose])

  const allFields: ExportFieldOption[] = useMemo(() => {
    if (availableFields.length > 0) return availableFields
    const fieldSet = new Set<string>()
    documents.forEach(doc => {
      Object.keys(doc.metadata.documentProperties).forEach(k => fieldSet.add(k))
      Object.keys(doc.metadata.appProperties).forEach(k => fieldSet.add(k))
    })
    return Array.from(fieldSet).map(k => ({ key: k, label: resolveFieldLabel(k) }))
  }, [availableFields, documents])

  const activeFields = useMemo(() => {
    if (includeFields.length === 0) return allFields.map(f => f.key)
    return includeFields
  }, [includeFields, allFields])

  const previewDocs = useMemo(() => documents.slice(0, 24), [documents])

  const handleExport = useCallback(async () => {
    if (exporting || documents.length === 0) return
    setExporting(true)
    setResult(null)
    try {
      const records = documents.map(d => buildRecord(d, activeFields))
      const target = await save({
        defaultPath: buildFileName(format, new Date()),
        filters:
          format === "excel"
            ? [{ name: "Excel 工作簿", extensions: ["xlsx"] }]
            : format === "json"
              ? [{ name: "JSON 文件", extensions: ["json"] }]
              : format === "csv"
                ? [{ name: "CSV 文件", extensions: ["csv"] }]
                : [{ name: "XML 文件", extensions: ["xml"] }],
      })
      if (!target) {
        setExporting(false)
        return
      }
      if (format === "excel") {
        const base64 = buildExcelBase64(records)
        await invoke("write_binary_file", { filePath: target, base64Data: base64 })
      } else {
        const content = buildContent(format, records)
        await invoke("write_text_file", { filePath: target, content })
      }
      setResult({ success: true, outputPath: target, exportedCount: documents.length })
      toast.success("导出成功", {
        description: `已导出 ${documents.length} 个文件的元数据至 ${target}`,
      })
      await invoke("open_export_folder", { filePath: target }).catch(() => {})
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("导出失败:", error)
      setResult({ success: false, exportedCount: 0, error: message })
      toast.error("导出失败", { description: message })
    } finally {
      setExporting(false)
    }
  }, [exporting, documents, activeFields, format])

  const toggleField = (key: string) => {
    setIncludeFields(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }

  const toggleAllFields = () => {
    if (includeFields.length === allFields.length) {
      setIncludeFields([])
    } else {
      setIncludeFields(allFields.map(f => f.key))
    }
  }

  if (!open) return null

  const generatedAt = new Date().toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })

  const FORMAT_ICONS: Record<ExportFormat, React.ComponentProps<typeof HugeIcon>["icon"]> = {
    json: CodeFolderIcon,
    excel: FileSpreadsheetIcon,
    csv: Table01Icon,
    xml: DatabaseIcon,
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <header
        data-tauri-drag-region
        className="app-drag flex shrink-0 items-center gap-2 border-b border-border bg-background/95 py-3 pr-4 backdrop-blur-md sm:pr-6"
        style={{ paddingLeft: "calc(var(--chrome-traffic-light-inset, 0px) + 0.75rem)" }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="app-no-drag shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              disabled={exporting}
              className="rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="返回"
            >
              <HugeIcon icon={ArrowLeft01Icon} size={14} />
            </Button>
          </div>
          <div className="h-4 w-px shrink-0 bg-hairline" />
          <div className="min-w-0">
            <p className="text-ink truncate font-heading text-base font-semibold">导出元数据</p>
            <p className="truncate text-fine-print text-muted-foreground">
              {documents.length} 个文件 · {allFields.length} 个可用字段
              <span className="mx-1.5 text-muted-foreground/60">·</span>
              {generatedAt}
            </p>
          </div>
        </div>
        <div className="app-no-drag flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            onClick={handleExport}
            disabled={exporting || documents.length === 0}
            className="gap-1.5 rounded-lg"
          >
            {exporting ? (
              <HugeIcon icon={Loading02Icon} size={14} className="animate-spin" />
            ) : (
              <HugeIcon icon={Download01Icon} size={14} />
            )}
            {exporting ? "导出中…" : "开始导出"}
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-6 sm:px-6 sm:pt-10 sm:pb-8">
          <section className="mb-8">
            <p className="mb-1.5 text-caption font-medium tracking-widest text-muted-foreground uppercase">
              导出 · {generatedAt}
            </p>
            <h1 className="text-ink font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
              {documents.length} 个文件待导出
            </h1>
            <p className="text-ink-soft mt-3 max-w-2xl text-fine-print">
              选择目标格式与字段后，点击右下角的"开始导出"即可保存到本地任意路径。
              所有元数据来自文件本身，不会上传到任何云端。
            </p>
          </section>

          <ReportSection index="01" title="目标格式" hint={`已选 ${FORMAT_META[format].label}`}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {(Object.keys(FORMAT_META) as ExportFormat[]).map(key => {
                const meta = FORMAT_META[key]
                const active = format === key
                const Icon = FORMAT_ICONS[key]
                return (
                  <button
                    key={key}
                    onClick={() => setFormat(key)}
                    className={cn(
                      "flex flex-col items-start gap-1.5 rounded-lg border px-3 py-2.5 text-left transition-all",
                      active
                        ? "border-primary/40 bg-primary/8 ring-1 ring-primary/20"
                        : "border-border/60 hover:border-primary/30",
                    )}
                  >
                    <HugeIcon
                      icon={Icon}
                      size={16}
                      className={active ? "text-primary" : "text-muted-foreground"}
                    />
                    <div>
                      <p className="text-ink text-caption font-semibold">{meta.label}</p>
                      <p className="text-fine-print text-muted-foreground">{meta.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </ReportSection>

          <ReportSection
            index="02"
            title="导出字段"
            hint={
              includeFields.length === 0
                ? "已选全部"
                : `已选 ${includeFields.length}/${allFields.length}`
            }
          >
            <div className="mb-3 flex items-center justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleAllFields}
                className="gap-1.5 rounded-lg"
              >
                {includeFields.length === allFields.length ? "清空选择" : "全选"}
              </Button>
            </div>
            <div className="overflow-hidden rounded-lg border border-border/60">
              <ScrollArea className="max-h-60">
                <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
                  {allFields.map(field => {
                    const isAutoIncluded = includeFields.length === 0
                    const checked = isAutoIncluded || includeFields.includes(field.key)
                    return (
                      <label
                        key={field.key}
                        className="flex cursor-pointer items-center gap-2 rounded-md py-1 text-fine-print hover:text-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isAutoIncluded}
                          onChange={() => toggleField(field.key)}
                          className="size-3.5 rounded border-border text-primary disabled:opacity-50"
                        />
                        <span className="text-ink-soft truncate">{field.label}</span>
                        <span className="text-fine-print text-muted-foreground/60 ml-auto font-mono">
                          {field.key}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </ScrollArea>
            </div>
          </ReportSection>

          <ReportSection
            index="03"
            title="导出预览"
            hint={`共 ${documents.length} 个文件${documents.length > previewDocs.length ? `（仅预览前 ${previewDocs.length} 个）` : ""}`}
          >
            <div className="overflow-hidden rounded-lg border border-border/60">
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-sm">
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[14%]" />
                    <col className="w-[14%]" />
                    <col className="w-[14%]" />
                    <col />
                  </colgroup>
                  <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                    <tr className="border-b border-border/60">
                      <th className="px-3 py-2 font-medium">文件名</th>
                      <th className="px-3 py-2 font-medium">类型</th>
                      <th className="px-3 py-2 font-medium whitespace-nowrap">作者</th>
                      <th className="px-3 py-2 font-medium whitespace-nowrap">修改时间</th>
                      <th className="px-3 py-2 font-medium">路径</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewDocs.map(doc => {
                      const fileName = doc.metadata.fileName || doc.filePath.split("/").pop()
                      return (
                        <tr key={doc.id} className="border-b border-border/40 last:border-b-0">
                          <td className="text-ink px-3 py-2 font-medium">
                            <span className="line-clamp-1" title={fileName}>
                              {fileName}
                            </span>
                          </td>
                          <td className="text-ink-soft px-3 py-2 font-mono text-xs uppercase">
                            {doc.metadata.fileType || "-"}
                          </td>
                          <td className="text-ink-soft px-3 py-2 whitespace-nowrap">
                            {doc.metadata.documentProperties.creator || "—"}
                          </td>
                          <td className="text-ink-soft px-3 py-2 whitespace-nowrap">
                            {doc.metadata.documentProperties.modified || "—"}
                          </td>
                          <td className="text-ink-soft px-3 py-2 wrap-break-word text-fine-print">
                            {doc.filePath}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </ReportSection>

          {result ? (
            <section className="mb-8">
              <div
                className={cn(
                  "rounded-lg border p-4",
                  result.success
                    ? "border-emerald-500/30 bg-emerald-500/5"
                    : "border-red-500/30 bg-red-500/5",
                )}
              >
                <div className="flex items-start gap-3">
                  {result.success ? (
                    <HugeIcon icon={CheckmarkCircle02Icon} size={20} className="text-emerald-600" />
                  ) : (
                    <HugeIcon icon={CancelCircleIcon} size={20} className="text-red-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-caption font-semibold",
                        result.success ? "text-emerald-700" : "text-red-700",
                      )}
                    >
                      {result.success ? "导出成功" : "导出失败"}
                    </p>
                    {result.success ? (
                      <>
                        <p className="text-ink-soft mt-1 text-fine-print">
                          已将 {result.exportedCount} 个文件的元数据写入
                          <span className="mx-1 font-mono uppercase">
                            .{format === "excel" ? "xlsx" : format}
                          </span>
                          文件
                        </p>
                        {result.outputPath ? (
                          <p className="text-fine-print text-muted-foreground mt-2 break-all">
                            {result.outputPath}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-ink-soft mt-1 text-fine-print">
                        请检查输出路径权限和文件格式后重试。
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          <div className="mt-10 border-t border-border/60 pt-4 text-fine-print text-muted-foreground">
            所有元数据来自文件本身，未上传到任何云端。
            · Excel 格式使用 xlsx（SheetJS）生成并通过 write_binary_file 写入。
          </div>
        </div>
      </main>
    </div>
  )
}

interface ReportSectionProps {
  index?: string
  title: string
  hint?: string
  children: React.ReactNode
}

const ReportSection: React.FC<ReportSectionProps> = ({ index, title, hint, children }) => (
  <section className="mb-8 scroll-mt-24">
    <header className="mb-3 flex items-baseline justify-between border-b border-border/40 pb-2">
      <h2 className="text-ink flex items-baseline gap-3 font-heading text-caption font-semibold tracking-wide uppercase">
        {index ? (
          <span className="font-heading text-fine-print text-muted-foreground tabular-nums">
            {index}
          </span>
        ) : null}
        <span>{title}</span>
      </h2>
      {hint ? <span className="text-fine-print text-muted-foreground">{hint}</span> : null}
    </header>
    {children}
  </section>
)

export default ExportView
