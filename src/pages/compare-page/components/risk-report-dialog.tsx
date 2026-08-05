import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertOctagon,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileText,
  Play,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react"
import { invoke } from "@tauri-apps/api/core"
import { save } from "@tauri-apps/plugin-dialog"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { RiskFinding } from "@/lib/documents/compare-audit"
import type { CompanyEntry } from "@/contexts/file-context"
import type { LoadedDocument } from "@/contexts/metadata-context"
import {
  buildCompareExcelBase64,
  buildExcelReportFileName,
  type FileMetadataRecord,
} from "@/lib/documents/compare-report"

interface RiskReportViewProps {
  open: boolean
  onClose: () => void
  comparing: boolean
  findings: RiskFinding[]
  companies: CompanyEntry[]
  docsByCompany: Map<string, LoadedDocument[]>
  canRerun: boolean
  onRerun: () => void
}

interface FlaggedFile {
  id: string
  fileName: string
  author: string
  lastModifiedBy: string
  appCompany: string
  application: string
  created: string
  modified: string
  isFlagged: boolean
}

function buildFlaggedFiles(
  documents: LoadedDocument[],
  findings: RiskFinding[],
): FlaggedFile[] {
  const flaggedNames = new Set<string>()
  for (const finding of findings) {
    for (const name of finding.files) flaggedNames.add(name)
  }
  return documents.map(doc => {
    const props = doc.metadata.documentProperties
    const app = doc.metadata.appProperties
    const fileName = doc.metadata.fileName || doc.filePath.split("/").pop() || "未命名文件"
    return {
      id: doc.id,
      fileName,
      author: (props?.creator ?? "").trim() || "—",
      lastModifiedBy: (props?.lastModifiedBy ?? "").trim() || "—",
      appCompany: (app?.company ?? "").trim() || "—",
      application: (app?.application ?? "").trim() || "—",
      created: (props?.created ?? "").trim() || "—",
      modified: (props?.modified ?? "").trim() || "—",
      isFlagged: flaggedNames.has(fileName),
    }
  })
}

function shortenCompany(name: string): string {
  const suffixes = [
    "股份有限公司",
    "有限责任公司",
    "科技有限公司",
    "技术有限公司",
    "有限公司",
    "股份公司",
    "集团",
    "公司",
  ]
  let result = name
  for (const suffix of suffixes) {
    if (result.endsWith(suffix) && result.length > suffix.length) {
      result = result.slice(0, -suffix.length)
      break
    }
  }
  return result || name
}

const FILE_META_COLS =
  "grid-cols-[minmax(0,1.5fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto]"

export const RiskReportView: React.FC<RiskReportViewProps> = ({
  open,
  onClose,
  comparing,
  findings,
  companies,
  docsByCompany,
  canRerun,
  onRerun,
}) => {
  const [exporting, setExporting] = useState(false)

  const flaggedFilesByCompany = useMemo(() => {
    const map = new Map<string, FlaggedFile[]>()
    for (const c of companies) {
      const docs = docsByCompany.get(c.id) ?? []
      map.set(c.id, buildFlaggedFiles(docs, findings))
    }
    return map
  }, [companies, docsByCompany, findings])

  const findingsByFile = useMemo(() => {
    const map = new Map<string, RiskFinding[]>()
    for (const f of findings) {
      for (const name of f.files) {
        const list = map.get(name) ?? []
        list.push(f)
        map.set(name, list)
      }
    }
    return map
  }, [findings])

  const allFiles = useMemo(() => {
    const result: { company: string; file: FlaggedFile }[] = []
    for (const c of companies) {
      const files = flaggedFilesByCompany.get(c.id) ?? []
      for (const f of files) {
        result.push({ company: c.name, file: f })
      }
    }
    return result
  }, [companies, flaggedFilesByCompany])

  const highCount = findings.filter(f => f.level === "high").length
  const mediumCount = findings.filter(f => f.level === "medium").length
  const flaggedTotal = allFiles.filter(({ file }) => file.isFlagged).length
  const cleanTotal = allFiles.length - flaggedTotal

  const generatedAt = useMemo(
    () =>
      new Date().toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  )

  const companyNames = useMemo(
    () => companies.map(c => shortenCompany(c.name)),
    [companies],
  )

  const totalFiles = useMemo(() => {
    let count = 0
    for (const c of companies) {
      count += (docsByCompany.get(c.id)?.length ?? 0)
    }
    return count
  }, [companies, docsByCompany])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !comparing) onClose()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, comparing, onClose])

  const handleExportExcel = useCallback(async () => {
    if (exporting) return
    setExporting(true)
    try {
      const records: FileMetadataRecord[] = allFiles.map(({ company, file }) => ({
        company,
        fileName: file.fileName,
        author: file.author,
        lastModifiedBy: file.lastModifiedBy,
        orgCompany: file.appCompany,
        application: file.application,
        created: file.created,
        modified: file.modified,
      }))
      const base64 = buildCompareExcelBase64({ records, generatedAt: new Date() })
      const target = await save({
        defaultPath: buildExcelReportFileName(new Date()),
        filters: [{ name: "Excel 工作簿", extensions: ["xlsx"] }],
      })
      if (!target) return
      await invoke("write_binary_file", { filePath: target, base64Data: base64 })
    } catch (error) {
      console.error("导出 Excel 失败:", error)
    } finally {
      setExporting(false)
    }
  }, [exporting, allFiles])

  if (!open) return null

  return (
    <TooltipProvider delayDuration={150}>
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <header
          data-tauri-drag-region
          className="app-drag flex shrink-0 items-center gap-2 border-b border-border bg-background/95 py-3 pr-4 backdrop-blur-md sm:pr-6"
          style={{ paddingLeft: "calc(var(--chrome-traffic-light-inset, 0px) + 0.75rem)" }}
        >
          <div className="app-no-drag flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              disabled={comparing}
              className="rounded-full"
              aria-label="返回"
            >
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="text-ink truncate font-heading text-base font-semibold">对比报告</p>
              <p className="truncate text-fine-print text-muted-foreground">
                {companyNames.join(" ⟷ ")}
                <span className="mx-1.5 text-muted-foreground/60">·</span>
                {companies.length} 家公司 · {totalFiles} 个文件
                <span className="mx-1.5 text-muted-foreground/60">·</span>
                {generatedAt}
              </p>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-5 pt-12 pb-10 sm:px-8 sm:pt-20 sm:pb-14">
            <section className="mb-12">
              <p className="mb-2 text-caption font-medium tracking-widest text-muted-foreground uppercase">
                元数据对比 · {generatedAt}
              </p>
              <h1 className="text-ink font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
                {companyNames.join(" ⟷ ")}
              </h1>
              <p className="text-ink-soft mt-3 max-w-2xl text-fine-print">
                {findings.length === 0
                  ? "各公司文件元数据全部一致，未发现可疑条目。本次审查通过。"
                  : `共识别 ${findings.length} 条可疑条目（高风险 ${highCount} 条、中风险 ${mediumCount} 条），建议优先复核高风险条目。`}
              </p>
            </section>

            <ReportSection
              title="执行摘要"
              index="01"
              hint={findings.length === 0 ? "全部通过" : undefined}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryBigCard
                  tone="high"
                  icon={ShieldAlert}
                  label="高风险"
                  value={highCount}
                  description="疑似同一人"
                />
                <SummaryBigCard
                  tone="medium"
                  icon={TriangleAlert}
                  label="中风险"
                  value={mediumCount}
                  description="非同一家单位"
                />
                <SummaryBigCard
                  tone="pass"
                  icon={ShieldCheck}
                  label="通过"
                  value={cleanTotal + flaggedTotal}
                  description="已检查文件总数"
                />
              </div>
            </ReportSection>

            <ReportSection
              title="文件元数据明细"
              index="02"
              hint={`${companies.length} 家公司 · ${totalFiles} 个文件`}
            >
              <div className="mb-4 flex items-center justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className="gap-1.5 rounded-lg"
                >
                  <FileSpreadsheet className="size-3.5" />
                  {exporting ? "导出中…" : "导出 Excel"}
                </Button>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/60">
                <div className="overflow-x-auto">
                  <div
                    className={cn(
                      "grid min-w-0 gap-x-3 gap-y-1.5 px-4 py-3 text-sm",
                      FILE_META_COLS,
                    )}
                  >
                    <div className="text-fine-print font-medium text-muted-foreground">公司</div>
                    <div className="text-fine-print font-medium text-muted-foreground">文件</div>
                    <div className="text-fine-print font-medium text-muted-foreground">作者</div>
                    <div className="text-fine-print font-medium whitespace-nowrap text-muted-foreground">
                      最后修改者
                    </div>
                    <div className="text-fine-print font-medium text-muted-foreground">组织名</div>
                    <div className="text-fine-print font-medium text-muted-foreground">创建器</div>
                    <div className="text-fine-print font-medium whitespace-nowrap text-muted-foreground">
                      创建时间
                    </div>
                    <div className="text-right text-fine-print font-medium whitespace-nowrap text-muted-foreground">
                      状态
                    </div>

                    {allFiles.map(({ company, file }) => {
                      const fileFindings = findingsByFile.get(file.fileName) ?? []
                      return (
                        <React.Fragment key={file.id}>
                          <div
                            className="truncate leading-snug text-ink-soft"
                            title={company}
                          >
                            {shortenCompany(company)}
                          </div>
                          <div
                            className={cn(
                              "flex min-w-0 items-center gap-1.5 truncate leading-snug",
                              file.isFlagged ? "text-ink font-medium" : "text-ink-soft",
                            )}
                            title={file.fileName}
                          >
                            <FileText className="size-3 shrink-0 text-muted-foreground" />
                            <span className="truncate">{file.fileName}</span>
                          </div>
                          <div
                            className={cn(
                              "truncate leading-snug",
                              file.isFlagged ? "text-ink" : "text-ink-soft",
                            )}
                            title={file.author}
                          >
                            {file.author}
                          </div>
                          <div
                            className={cn(
                              "truncate leading-snug",
                              file.isFlagged ? "text-ink" : "text-ink-soft",
                            )}
                            title={file.lastModifiedBy}
                          >
                            {file.lastModifiedBy}
                          </div>
                          <div
                            className="truncate leading-snug text-ink-soft"
                            title={file.appCompany}
                          >
                            {file.appCompany}
                          </div>
                          <div
                            className="truncate leading-snug text-ink-soft"
                            title={file.application}
                          >
                            {file.application}
                          </div>
                          <div className="truncate leading-snug whitespace-nowrap text-ink-soft">
                            {file.created}
                          </div>
                          <div className="text-right leading-snug whitespace-nowrap">
                            {file.isFlagged ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-help items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600">
                                    <AlertOctagon className="size-3" />
                                    风险
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="left"
                                  align="end"
                                  className="max-w-sm text-left whitespace-pre-line"
                                >
                                  {fileFindings.map((f, i) => (
                                    <div key={i}>
                                      {describeFindingFor(file.fileName, company, f)}
                                    </div>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                                <CheckCircle2 className="size-3" />
                                正常
                              </span>
                            )}
                          </div>
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>
              </div>
            </ReportSection>

            {findings.length > 0 && (
              <ReportSection
                title="风险事件清单"
                index="03"
                hint={`共 ${findings.length} 条 · 高 ${highCount} · 中 ${mediumCount}`}
              >
                <RiskEventsTable findings={findings} />
              </ReportSection>
            )}

            <div className="mt-16 border-t border-border/60 pt-6 text-fine-print text-muted-foreground">
              本报告由本地工具自动生成，所有元数据来自文件本身，未上传到任何云端。 ·
              跨公司文件逐一比对作者和最后一次修改者，并做了空值/公司后缀/通用词归一化。
            </div>
          </div>
        </main>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md sm:px-6">
          <p className="hidden truncate text-fine-print text-muted-foreground sm:block">
            {findings.length === 0
              ? "可直接关闭，或重新对比后导出 Excel 报告。"
              : "建议优先复核高风险条目，再导出 Excel 报告归档。"}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRerun}
              disabled={!canRerun || comparing}
              className="gap-1.5 rounded-lg"
            >
              <Play className="size-3.5 fill-current" />
              {comparing ? "对比中…" : "重新对比"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={comparing}
              className="rounded-lg"
            >
              关闭
            </Button>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}

interface ReportSectionProps {
  index?: string
  title: string
  hint?: string
  children: React.ReactNode
}

const ReportSection: React.FC<ReportSectionProps> = ({ index, title, hint, children }) => (
  <section className="mb-14 scroll-mt-24">
    <header className="mb-5 flex items-baseline justify-between border-b border-border/40 pb-3">
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

interface SummaryBigCardProps {
  tone: "high" | "medium" | "pass"
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  description: string
}

const SummaryBigCard: React.FC<SummaryBigCardProps> = ({
  tone,
  icon: Icon,
  label,
  value,
  description,
}) => {
  const palette = {
    high: {
      ring: "border-red-500/30 bg-red-500/5",
      icon: "bg-red-500/10 text-red-600",
      value: "text-red-600",
    },
    medium: {
      ring: "border-amber-500/30 bg-amber-500/5",
      icon: "bg-amber-500/10 text-amber-600",
      value: "text-amber-600",
    },
    pass: {
      ring: "border-emerald-500/30 bg-emerald-500/5",
      icon: "bg-emerald-500/10 text-emerald-600",
      value: "text-emerald-600",
    },
  }[tone]

  return (
    <div className={cn("rounded-xl border px-5 py-4", palette.ring)}>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("rounded-md p-1.5", palette.icon)}>
          <Icon className="size-4" />
        </span>
        <p className="text-caption font-medium text-muted-foreground">{label}</p>
      </div>
      <p
        className={cn(
          "font-heading text-4xl leading-none font-semibold tabular-nums",
          palette.value,
        )}
      >
        {value}
      </p>
      <p className="mt-2 truncate text-fine-print text-muted-foreground">{description}</p>
    </div>
  )
}

function describeFindingFor(
  selfFileName: string,
  selfCompany: string,
  finding: RiskFinding,
): string {
  const counterpartFiles = finding.files.filter(n => n !== selfFileName)
  const counterpartCompanies = finding.companies.filter(c => c !== selfCompany)
  const fieldLabel = finding.fields.join("、")
  return `与「${counterpartFiles.join("、")}」（${counterpartCompanies.join(
    "、",
  )}）的「${fieldLabel}」字段相同：${finding.value}`
}

interface RiskEventsTableProps {
  findings: RiskFinding[]
}

const RiskEventsTable: React.FC<RiskEventsTableProps> = ({ findings }) => {
  const sorted = [...findings].sort((a, b) => {
    const order = { high: 0, medium: 1 }
    const diff = order[a.level] - order[b.level]
    if (diff !== 0) return diff
    return a.problem.localeCompare(b.problem, "zh-CN")
  })

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-16" />
            <col className="w-24" />
            <col className="w-32" />
            <col className="w-28" />
            <col />
            <col />
          </colgroup>
          <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="px-3 py-2 font-medium whitespace-nowrap">状态</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">问题</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">字段</th>
              <th className="px-3 py-2 font-medium whitespace-nowrap">值</th>
              <th className="px-3 py-2 font-medium">文件</th>
              <th className="px-3 py-2 font-medium">公司</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((finding, idx) => {
              const isHigh = finding.level === "high"
              const tone = isHigh ? "bg-red-500/10 text-red-600" : "bg-amber-500/10 text-amber-600"
              const Icon = isHigh ? ShieldAlert : AlertTriangle
              return (
                <tr
                  key={`${finding.matchTag}-${idx}`}
                  className="border-b border-border/40 align-top last:border-b-0 hover:bg-muted/20"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                        tone,
                      )}
                    >
                      <Icon className="size-3" />
                      {isHigh ? "高" : "中"}
                    </span>
                  </td>
                  <td className="text-ink px-3 py-2">{finding.problem}</td>
                  <td className="text-ink-soft px-3 py-2">
                    {finding.fields.map((name, i) => (
                      <span key={name}>
                        {name}
                        {i < finding.fields.length - 1 ? "、" : ""}
                      </span>
                    ))}
                  </td>
                  <td className="text-ink px-3 py-2 font-medium">"{finding.value}"</td>
                  <td className="text-ink-soft px-3 py-2 wrap-break-word">
                    {finding.files.map((name, i) => (
                      <span key={name}>
                        {name}
                        {i < finding.files.length - 1 ? "、" : ""}
                      </span>
                    ))}
                  </td>
                  <td className="text-ink-soft px-3 py-2 wrap-break-word">
                    {finding.companies.map((name, i) => (
                      <span key={name}>
                        {name}
                        {i < finding.files.length - 1 ? "、" : ""}
                      </span>
                    ))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
