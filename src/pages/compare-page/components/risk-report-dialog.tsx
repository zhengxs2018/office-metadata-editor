import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert02Icon,
  Alert01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Building01Icon,
  CheckmarkCircle02Icon,
  FileSpreadsheetIcon,
  File01Icon,
  PlayIcon,
  ScrollHorizontalIcon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons"
import { invoke } from "@tauri-apps/api/core"
import { save } from "@tauri-apps/plugin-dialog"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts"

import { HugeIcon } from "@/components/icons/huge-icon"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
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
  riskLevel: "high" | "medium" | null
  matchingField: string | null
  matchingValue: string | null
}

const COMPANY_ACCENTS = [
  { ring: "border-sky-400/40 bg-sky-50/40", accent: "text-sky-700", chip: "bg-sky-500/10 text-sky-700" },
  { ring: "border-orange-400/40 bg-orange-50/40", accent: "text-orange-700", chip: "bg-orange-500/10 text-orange-700" },
  { ring: "border-violet-400/40 bg-violet-50/40", accent: "text-violet-700", chip: "bg-violet-500/10 text-violet-700" },
  { ring: "border-emerald-400/40 bg-emerald-50/40", accent: "text-emerald-700", chip: "bg-emerald-500/10 text-emerald-700" },
  { ring: "border-rose-400/40 bg-rose-50/40", accent: "text-rose-700", chip: "bg-rose-500/10 text-rose-700" },
  { ring: "border-amber-400/40 bg-amber-50/40", accent: "text-amber-700", chip: "bg-amber-500/10 text-amber-700" },
]

function buildFlaggedFiles(
  documents: LoadedDocument[],
  findings: RiskFinding[],
): FlaggedFile[] {
  type Marker = { level: "high" | "medium"; field: string; value: string }
  const markers = new Map<string, Marker[]>()
  for (const finding of findings) {
    for (const name of finding.files) {
      const list = markers.get(name) ?? []
      list.push({
        level: finding.level,
        field: finding.fields.join(" / "),
        value: finding.value,
      })
      markers.set(name, list)
    }
  }

  return documents.map(doc => {
    const props = doc.metadata.documentProperties
    const app = doc.metadata.appProperties
    const fileName = doc.metadata.fileName || doc.filePath.split("/").pop() || "未命名文件"
    const fileMarkers = markers.get(fileName)
    const topMarker =
      fileMarkers?.find(m => m.level === "high") ?? fileMarkers?.[0] ?? null
    return {
      id: doc.id,
      fileName,
      author: (props?.creator ?? "").trim() || "—",
      lastModifiedBy: (props?.lastModifiedBy ?? "").trim() || "—",
      appCompany: (app?.company ?? "").trim() || "—",
      application: (app?.application ?? "").trim() || "—",
      created: (props?.created ?? "").trim() || "—",
      modified: (props?.modified ?? "").trim() || "—",
      isFlagged: !!fileMarkers,
      riskLevel: topMarker?.level ?? null,
      matchingField: topMarker?.field ?? null,
      matchingValue: topMarker?.value ?? null,
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
  "min-[860px]:grid-cols-[minmax(0,1.4fr)_minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.7fr)_minmax(0,0.8fr)_auto] grid-cols-[minmax(0,1.2fr)_minmax(140px,1fr)_auto]"

interface CompanySnapshot {
  id: string
  name: string
  shortName: string
  files: FlaggedFile[]
  highCount: number
  mediumCount: number
  cleanCount: number
  accentIndex: number
}

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
  const totalFiles = allFiles.length
  const flaggedTotal = allFiles.filter(({ file }) => file.isFlagged).length
  const cleanTotal = totalFiles - flaggedTotal

  const companySnapshots = useMemo<CompanySnapshot[]>(() => {
    return companies.map((c, idx) => {
      const files = flaggedFilesByCompany.get(c.id) ?? []
      const highCount = files.filter(f => f.riskLevel === "high").length
      const mediumCount = files.filter(f => f.riskLevel === "medium").length
      const cleanCount = files.length - highCount - mediumCount
      return {
        id: c.id,
        name: c.name,
        shortName: shortenCompany(c.name),
        files,
        highCount,
        mediumCount,
        cleanCount,
        accentIndex: idx,
      }
    })
  }, [companies, flaggedFilesByCompany])

  const involvedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const f of findings) {
      for (const c of companySnapshots) {
        if (f.companies.includes(c.name)) ids.add(c.id)
      }
    }
    return ids
  }, [findings, companySnapshots])

  const involvedCompanyIds = useMemo(
    () => companySnapshots.filter(c => involvedIds.has(c.id)),
    [companySnapshots, involvedIds],
  )

  const involvedShortNames = useMemo(
    () =>
      involvedCompanyIds.length > 0
        ? involvedCompanyIds.map(c => c.shortName)
        : companySnapshots.map(c => c.shortName),
    [involvedCompanyIds, companySnapshots],
  )

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

  const headlineText =
    findings.length === 0
      ? "各公司文件元数据全部一致，未发现可疑条目。"
      : `共识别 ${findings.length} 条可疑条目（高风险 ${highCount} 条、中风险 ${mediumCount} 条），建议优先复核高风险条目。`

  return (
    <TooltipProvider delayDuration={150}>
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
                disabled={comparing}
                className="rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="返回"
              >
                <HugeIcon icon={ArrowLeft01Icon} size={14} />
              </Button>
            </div>
            <div className="h-4 w-px shrink-0 bg-hairline" />
            <div className="min-w-0">
              <p className="text-ink truncate font-heading text-base font-semibold">对比报告</p>
              <p className="truncate text-fine-print text-muted-foreground">
                {involvedShortNames.join(" ⟷ ")}
                <span className="mx-1.5 text-muted-foreground/60">·</span>
                {companies.length} 家公司 · {totalFiles} 个文件
                <span className="mx-1.5 text-muted-foreground/60">·</span>
                {generatedAt}
              </p>
            </div>
          </div>
          <div className="app-no-drag flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              onClick={onRerun}
              disabled={!canRerun || comparing}
              className="gap-1.5 rounded-lg"
            >
              <HugeIcon icon={PlayIcon} size={14} />
              {comparing ? "对比中…" : "重新对比"}
            </Button>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-6 sm:px-6 sm:pt-10 sm:pb-8">
            <section className="mb-8">
              <p className="mb-1.5 text-caption font-medium tracking-widest text-muted-foreground uppercase">
                元数据对比 · {generatedAt}
              </p>
              <h1 className="text-ink flex flex-wrap items-center gap-x-2 gap-y-1 font-heading text-xl font-semibold tracking-tight sm:text-2xl">
                {companySnapshots.length > 0 ? (
                  companySnapshots.map((c, idx) => {
                    const isInvolved = involvedIds.has(c.id)
                    const accent = COMPANY_ACCENTS[c.accentIndex % COMPANY_ACCENTS.length]
                    return (
                      <React.Fragment key={c.id}>
                        {idx > 0 ? (
                          <HugeIcon
                            icon={ArrowRight01Icon}
                            size={18}
                            className="text-muted-foreground"
                          />
                        ) : null}
                        <span
                          className={cn(
                            "rounded-md px-1.5 transition-opacity",
                            accent.chip,
                            !isInvolved && findings.length > 0 && "opacity-50",
                          )}
                          title={isInvolved ? c.name : `${c.name}（未涉及风险）`}
                        >
                          {c.shortName}
                        </span>
                      </React.Fragment>
                    )
                  })
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </h1>
              <p className="text-ink-soft mt-3 max-w-2xl text-fine-print">{headlineText}</p>
            </section>

            <ReportSection
              title="执行摘要"
              index="01"
              hint={
                findings.length === 0
                  ? "全部通过"
                  : `${companies.length} 家公司 / ${totalFiles} 个文件`
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <SummaryBigCard
                  tone="high"
                  icon={Alert02Icon}
                  label="高风险"
                  value={highCount}
                  description="疑似同一人跨公司"
                />
                <SummaryBigCard
                  tone="medium"
                  icon={Alert01Icon}
                  label="中风险"
                  value={mediumCount}
                  description="公司标识相似或相同"
                />
                <SummaryBigCard
                  tone="pass"
                  icon={SecurityCheckIcon}
                  label="通过"
                  value={cleanTotal}
                  description="无标记的文件数"
                />
              </div>
              <p className="text-fine-print mt-3 text-muted-foreground">
                {headlineText}
              </p>
            </ReportSection>

            <ReportSection
              title="对阵图"
              index="02"
              hint={`${companySnapshots.length} 家公司 / ${totalFiles} 个文件`}
              hintIcon={ScrollHorizontalIcon}
              hintHint="小屏可横向滚动"
            >
              <div className="space-y-4">
                {companySnapshots.length >= 2 ? (
                  <RiskDistributionChart snapshots={companySnapshots} />
                ) : null}
                <CompanyBattleRow
                  snapshots={companySnapshots}
                  involvedIds={involvedIds}
                />
              </div>
            </ReportSection>

            {findings.length > 0 && (
              <ReportSection
                title="风险事件清单"
                index="03"
                hint={`共 ${findings.length} 条 · 高 ${highCount} · 中 ${mediumCount}`}
              >
                <RiskFindingsAdversarial
                  findings={findings}
                  companySnapshots={companySnapshots}
                />
              </ReportSection>
            )}

            <ReportSection
              title="文件元数据明细"
              index={findings.length > 0 ? "04" : "03"}
              actions={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExportExcel}
                  disabled={exporting}
                  className="gap-1.5 rounded-lg"
                >
                  <HugeIcon icon={FileSpreadsheetIcon} size={14} />
                  {exporting ? "导出中…" : "导出 Excel"}
                </Button>
              }
            >
              <div className="overflow-hidden rounded-lg border border-border/60">
                <div className="overflow-x-auto">
                  <div
                    className={cn(
                      "grid min-w-160 gap-x-2.5 gap-y-1 px-3 py-2 text-xs",
                      FILE_META_COLS,
                    )}
                  >
                    <div className="text-fine-print font-medium text-muted-foreground">公司</div>
                    <div className="text-fine-print font-medium text-muted-foreground">文件</div>
                    <div className="hidden text-fine-print font-medium text-muted-foreground min-[860px]:block">
                      作者
                    </div>
                    <div className="hidden text-fine-print font-medium whitespace-nowrap text-muted-foreground min-[860px]:block">
                      最后修改者
                    </div>
                    <div className="hidden text-fine-print font-medium text-muted-foreground min-[860px]:block">
                      组织名
                    </div>
                    <div className="hidden text-fine-print font-medium text-muted-foreground min-[860px]:block">
                      创建器
                    </div>
                    <div className="hidden text-fine-print font-medium whitespace-nowrap text-muted-foreground min-[860px]:block">
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
                            <HugeIcon icon={File01Icon} size={12} />
                            <span className="truncate">{file.fileName}</span>
                          </div>
                          <div
                            className={cn(
                              "hidden truncate leading-snug min-[860px]:block",
                              file.isFlagged ? "text-ink" : "text-ink-soft",
                            )}
                            title={file.author}
                          >
                            {file.author}
                          </div>
                          <div
                            className={cn(
                              "hidden truncate leading-snug min-[860px]:block",
                              file.isFlagged ? "text-ink" : "text-ink-soft",
                            )}
                            title={file.lastModifiedBy}
                          >
                            {file.lastModifiedBy}
                          </div>
                          <div
                            className="hidden truncate leading-snug text-ink-soft min-[860px]:block"
                            title={file.appCompany}
                          >
                            {file.appCompany}
                          </div>
                          <div
                            className="hidden truncate leading-snug text-ink-soft min-[860px]:block"
                            title={file.application}
                          >
                            {file.application}
                          </div>
                          <div className="hidden truncate leading-snug whitespace-nowrap text-ink-soft min-[860px]:block">
                            {file.created}
                          </div>
                          <div className="text-right leading-snug whitespace-nowrap">
                            {file.isFlagged ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-help items-center gap-1 rounded-md bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-600">
                                    <HugeIcon
                                      icon={file.riskLevel === "medium" ? Alert01Icon : Alert02Icon}
                                      size={12}
                                    />
                                    风险
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="left"
                                  align="end"
                                  className="max-w-sm text-left whitespace-pre-line"
                                >
                                  {file.matchingField && file.matchingValue ? (
                                    <p className="mb-1 font-semibold">
                                      「{file.matchingField}」相同："{file.matchingValue}"
                                    </p>
                                  ) : null}
                                  {fileFindings.map((f, i) => (
                                    <div key={i}>
                                      {describeFindingFor(file.fileName, company, f)}
                                    </div>
                                  ))}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                                <HugeIcon icon={CheckmarkCircle02Icon} size={12} />
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
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-fine-print text-muted-foreground">
                <span>
                  共 {totalFiles} 个文件 · 已标记 {flaggedTotal} · 通过 {cleanTotal}
                </span>
                <span className="tabular-nums">{companyNamesList(companySnapshots)}</span>
              </div>
            </ReportSection>

            <div className="mt-10 border-t border-border/60 pt-4 text-fine-print text-muted-foreground">
              本报告由本地工具自动生成，所有元数据来自文件本身，未上传到任何云端。 ·
              跨公司文件逐一比对作者和最后一次修改者，并做了空值/公司后缀/通用词归一化。
            </div>
          </div>
        </main>
      </div>
    </TooltipProvider>
  )
}

function companyNamesList(snapshots: CompanySnapshot[]): string {
  if (snapshots.length === 0) return ""
  const summary = snapshots
    .map(s => `${s.shortName} ${s.files.length} 个 / 风险 ${s.highCount + s.mediumCount}`)
    .join(" · ")
  return summary
}

interface ReportSectionProps {
  index?: string
  title: string
  hint?: string
  hintIcon?: React.ComponentProps<typeof HugeIcon>["icon"]
  hintHint?: string
  actions?: React.ReactNode
  children: React.ReactNode
}

const ReportSection: React.FC<ReportSectionProps> = ({
  index,
  title,
  hint,
  hintIcon,
  hintHint,
  actions,
  children,
}) => (
  <section className="mb-8 scroll-mt-24">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/40 pb-2">
      <h2 className="text-ink flex items-baseline gap-3 font-heading text-caption font-semibold tracking-wide uppercase">
        {index ? (
          <span className="font-heading text-fine-print text-muted-foreground tabular-nums">
            {index}
          </span>
        ) : null}
        <span>{title}</span>
      </h2>
      <div className="flex items-center gap-3">
        {hint ? (
          <span className="text-fine-print text-muted-foreground">
            {hint}
            {hintIcon && hintHint ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="ml-1 inline-flex cursor-help items-center align-middle text-muted-foreground/70">
                    <HugeIcon icon={hintIcon} size={11} />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">{hintHint}</TooltipContent>
              </Tooltip>
            ) : null}
          </span>
        ) : null}
        {actions}
      </div>
    </header>
    {children}
  </section>
)

interface SummaryBigCardProps {
  tone: "high" | "medium" | "pass"
  icon: React.ComponentProps<typeof HugeIcon>["icon"]
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
    <div className={cn("rounded-lg border px-4 py-3", palette.ring)}>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("rounded p-1", palette.icon)}>
          <HugeIcon icon={Icon} size={14} />
        </span>
        <p className="text-caption font-medium text-muted-foreground">{label}</p>
      </div>
      <p
        className={cn(
          "font-heading text-3xl leading-none font-semibold tabular-nums",
          palette.value,
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 truncate text-fine-print text-muted-foreground">{description}</p>
    </div>
  )
}

interface CompanyBattleRowProps {
  snapshots: CompanySnapshot[]
  involvedIds: Set<string>
}

const CompanyBattleRow: React.FC<CompanyBattleRowProps> = ({ snapshots, involvedIds }) => {
  if (snapshots.length === 0) {
    return (
      <p className="text-fine-print rounded-lg border border-dashed border-border/60 py-6 text-center text-muted-foreground">
        暂无可对账的公司
      </p>
    )
  }

  const involved = snapshots.filter(s => involvedIds.has(s.id))
  const uninvolved = snapshots.filter(s => !involvedIds.has(s.id))
  const n = snapshots.length
  const useHorizontalScroll = n >= 3

  const cardWidth = useHorizontalScroll ? "w-[280px] sm:w-[310px]" : "min-w-0 sm:min-w-65 sm:max-w-[360px]"

  const colsClass =
    n === 1
      ? "grid-cols-1 [&>article]:max-w-[480px]"
      : "grid-cols-1 sm:grid-cols-2 [&>article]:sm:max-w-none"

  const renderCard = (s: CompanySnapshot) => {
    const accent = COMPANY_ACCENTS[s.accentIndex % COMPANY_ACCENTS.length]
    const isInvolved = involvedIds.has(s.id)
    const flaggedFiles = s.files.filter(f => f.isFlagged)
    const cleanCount = s.files.length - flaggedFiles.length
    const flaggedShown = flaggedFiles.slice(0, 4)

    return (
      <article
        key={s.id}
        className={cn(
          "flex min-w-0 flex-col gap-3 rounded-xl border-2 p-3.5",
          accent.ring,
          cardWidth,
          !isInvolved && "opacity-70",
        )}
      >
        <header className="flex items-center gap-2">
          <span className={cn("rounded p-1", accent.chip)}>
            <HugeIcon icon={Building01Icon} size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p
                className={cn(
                  "truncate font-heading text-caption font-semibold",
                  accent.accent,
                )}
                title={s.name}
              >
                {s.shortName}
              </p>
              <CompanyTag s={s} isInvolved={isInvolved} />
            </div>
            <p className="text-fine-print mt-0.5 text-muted-foreground tabular-nums">
              {s.files.length} 个文件
            </p>
          </div>
        </header>

        {isInvolved ? (
          <>
            {(s.highCount > 0 || s.mediumCount > 0) ? (
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${statsColCount(s)}, minmax(0, 1fr))` }}>
                {s.highCount > 0 ? (
                  <BattleStat
                    tone="high"
                    label="高"
                    value={s.highCount}
                  />
                ) : null}
                {s.mediumCount > 0 ? (
                  <BattleStat
                    tone="medium"
                    label="中"
                    value={s.mediumCount}
                  />
                ) : null}
                <BattleStat
                  tone="pass"
                  label="通过"
                  value={cleanCount}
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-emerald-700">
                <HugeIcon icon={CheckmarkCircle02Icon} size={14} />
                <p className="text-fine-print font-medium">
                  {s.files.length} 个文件全部通过
                </p>
              </div>
            )}

            {flaggedShown.length > 0 ? (
              <ul className="flex min-h-0 flex-1 flex-col gap-2.5 border-t border-border/40 pt-3">
                {flaggedShown.map(file => (
                  <li
                    key={file.id}
                    className="flex min-w-0 items-center gap-2 rounded-md bg-red-500/5 px-2.5 py-2 text-fine-print"
                    title={
                      file.matchingField && file.matchingValue
                        ? `「${file.matchingField}」相同：${file.matchingValue}`
                        : file.fileName
                    }
                  >
                    <HugeIcon
                      icon={
                        file.riskLevel === "medium" ? Alert01Icon : Alert02Icon
                      }
                      size={12}
                      className={cn(
                        "shrink-0",
                        file.riskLevel === "medium" ? "text-amber-600" : "text-red-600",
                      )}
                    />
                    <span className="text-ink min-w-0 flex-1 truncate font-medium">
                      {file.fileName}
                    </span>
                  </li>
                ))}
                {(flaggedFiles.length > flaggedShown.length || cleanCount > 0) ? (
                  <li className="text-fine-print px-2 text-muted-foreground">
                    + 还有 {cleanCount + flaggedFiles.length - flaggedShown.length} 个文件未列出
                  </li>
                ) : null}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="text-fine-print flex items-center gap-1.5 text-emerald-700">
            <HugeIcon icon={CheckmarkCircle02Icon} size={12} />
            全部 {s.files.length} 个文件均无风险
          </p>
        )}
      </article>
    )
  }

  const cards = snapshots.map(renderCard)

  if (useHorizontalScroll) {
    return (
      <div className="relative -mx-1">
        <ScrollArea className="w-full">
          <div className="flex w-max gap-3 px-1 pb-2">
            {cards}
          </div>
        </ScrollArea>
        <p className="text-fine-print mt-1 px-1 text-muted-foreground">
          {involved.length > 0 ? (
            <>
              涉及 {involved.length} 家、共 {n} 家 · 卡片可横向滚动
            </>
          ) : (
            <>共 {n} 家公司，可横向滚动查看</>
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      <div className={cn("grid gap-3", colsClass)}>{cards}</div>
      {uninvolved.length > 0 ? (
        <p className="text-fine-print text-muted-foreground">
          另有 {uninvolved.length} 家未涉及：
          {uninvolved.map((s, idx) => (
            <React.Fragment key={s.id}>
              {idx > 0 ? "、" : ""}
              <span className={cn("mx-0.5", COMPANY_ACCENTS[s.accentIndex % COMPANY_ACCENTS.length].accent)}>
                {s.shortName}
              </span>
            </React.Fragment>
          ))}
          （共 {uninvolved.reduce((sum, s) => sum + s.files.length, 0)} 个文件全部通过）
        </p>
      ) : null}
    </div>
  )
}

function statsColCount(s: CompanySnapshot): number {
  let n = 0
  if (s.highCount > 0) n++
  if (s.mediumCount > 0) n++
  n++
  return n
}

function CompanyTag({ s, isInvolved }: { s: CompanySnapshot; isInvolved: boolean }) {
  if (s.accentIndex === 0) {
    return (
      <span className="shrink-0 rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        基准方
      </span>
    )
  }
  if (isInvolved) {
    return (
      <span className="shrink-0 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
        对手方
      </span>
    )
  }
  return null
}

interface RiskDistributionChartProps {
  snapshots: CompanySnapshot[]
}

const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ snapshots }) => {
  if (snapshots.length < 2) return null
  const data = snapshots.map(s => ({
    name: s.shortName,
    high: s.highCount,
    medium: s.mediumCount,
    clean: s.cleanCount,
    accentIndex: s.accentIndex,
  }))
  const maxFiles = Math.max(...data.map(d => d.high + d.medium + d.clean), 1)
  const height = Math.max(110, snapshots.length * 36 + 40)

  const accentColor = (idx: number) => {
    const ring = ["#0284c7", "#ea580c", "#9333ea", "#0d9488", "#e11d48", "#d97706"][idx % 6]
    return ring
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="text-fine-print mb-1 flex items-center justify-between">
        <span className="text-muted-foreground">各公司文件风险分布</span>
        <span className="text-muted-foreground/70 tabular-nums">
          最深档位 {maxFiles} 个
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          barCategoryGap={6}
          margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="2 4"
            horizontal={false}
            stroke="var(--border)"
            strokeOpacity={0.55}
          />
          <XAxis
            type="number"
            hide
            domain={[0, maxFiles]}
          />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={88}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Bar dataKey="clean" stackId="files" fill="#10b981" fillOpacity={0.85} />
          <Bar dataKey="medium" stackId="files" fill="#f59e0b" fillOpacity={0.85} />
          <Bar
            dataKey="high"
            stackId="files"
            fill="#ef4444"
            fillOpacity={0.9}
            radius={[0, 4, 4, 0]}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.high > 0 ? "#ef4444" : "transparent"} />
            ))}
          </Bar>
          <ReTooltip
            cursor={{ fillOpacity: 0.06 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const item = payload[0]?.payload as (typeof data)[number] | undefined
              if (!item) return null
              const total = item.high + item.medium + item.clean
              return (
                <div className="rounded-md border border-border bg-popover px-3 py-2 text-fine-print shadow-lg">
                  <p
                    className="font-heading text-caption font-semibold"
                    style={{ color: accentColor(item.accentIndex) }}
                  >
                    {item.name}
                  </p>
                  <p className="text-muted-foreground tabular-nums">共 {total} 个文件</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {item.high > 0 ? (
                      <li className="flex items-center gap-2 text-red-600">
                        <span className="inline-block h-2 w-2 rounded-sm bg-red-500" />
                        高风险 {item.high}
                      </li>
                    ) : null}
                    {item.medium > 0 ? (
                      <li className="flex items-center gap-2 text-amber-600">
                        <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" />
                        中风险 {item.medium}
                      </li>
                    ) : null}
                    <li className="flex items-center gap-2 text-emerald-600">
                      <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
                      通过 {item.clean}
                    </li>
                  </ul>
                </div>
              )
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

interface BattleStatProps {
  tone: "high" | "medium" | "pass"
  label: string
  value: number
}

const BattleStat: React.FC<BattleStatProps> = ({ tone, label, value }) => {
  const palette = {
    high: "border-red-500/30 bg-red-500/10 text-red-600",
    medium: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    pass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  }[tone]
  return (
    <div className={cn("rounded-md border px-2 py-1.5", palette)}>
      <p className="text-[10px] font-medium leading-none uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="font-heading mt-1 text-lg font-semibold leading-none tabular-nums">
        {value}
      </p>
    </div>
  )
}

interface RiskFindingsAdversarialProps {
  findings: RiskFinding[]
  companySnapshots: CompanySnapshot[]
}

const RiskFindingsAdversarial: React.FC<RiskFindingsAdversarialProps> = ({
  findings,
  companySnapshots,
}) => {
  const sorted = [...findings].sort((a, b) => {
    const order = { high: 0, medium: 1 }
    const diff = order[a.level] - order[b.level]
    if (diff !== 0) return diff
    return a.problem.localeCompare(b.problem, "zh-CN")
  })

  const companyByName = new Map(companySnapshots.map(c => [c.name, c]))

  return (
    <div className="space-y-3">
      {sorted.map((finding, idx) => {
        const isHigh = finding.level === "high"
        const toneRing = isHigh ? "border-red-500/30 bg-red-500/5" : "border-amber-500/30 bg-amber-500/5"
        const toneText = isHigh ? "text-red-600" : "text-amber-600"
        const Icon = isHigh ? Alert02Icon : Alert01Icon
        const companyPairs = finding.companies.map(name => {
          const snap = companyByName.get(name)
          return {
            name,
            shortName: snap?.shortName ?? shortenCompany(name),
            accentIndex: snap?.accentIndex ?? 0,
          }
        })

        return (
          <article
            key={`${finding.matchTag}-${idx}`}
            className={cn("overflow-hidden rounded-lg border", toneRing)}
          >
            <div className="flex items-start gap-2 px-3.5 pt-2.5 pb-2.5">
              <span
                className={cn(
                  "mt-0.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold",
                  isHigh
                    ? "bg-red-500/10 text-red-600"
                    : "bg-amber-500/10 text-amber-600",
                )}
              >
                <HugeIcon icon={Icon} size={12} />
                {isHigh ? "高风险" : "中风险"}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-caption font-semibold", toneText)}>{finding.problem}</p>
                <p className="text-fine-print mt-0.5 text-muted-foreground">
                  字段「{finding.fields.join(" / ")}」值相同：
                  <span className={cn("font-medium", toneText)}>"{finding.value}"</span>
                </p>
              </div>
            </div>
            <div className="border-t border-border/40 bg-background/40 px-3.5 py-2.5">
              <div className="text-fine-print flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
                <span>
                  涉及 {companyPairs.length} 家 · {finding.files.length} 个文件
                </span>
                <span className="text-muted-foreground/40">|</span>
                {companyPairs.map((cp, i) => (
                  <React.Fragment key={cp.name}>
                    {i > 0 ? (
                      <HugeIcon
                        icon={ArrowRight01Icon}
                        size={12}
                        className="text-muted-foreground/60"
                      />
                    ) : null}
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-fine-print font-medium",
                        COMPANY_ACCENTS[cp.accentIndex % COMPANY_ACCENTS.length].chip,
                      )}
                    >
                      {cp.shortName}
                    </span>
                  </React.Fragment>
                ))}
              </div>
              <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {finding.files.map((fileName, i) => {
                  const companyName = finding.companies[i]
                  const snap = companyByName.get(companyName ?? "")
                  const accent = COMPANY_ACCENTS[(snap?.accentIndex ?? 0) % COMPANY_ACCENTS.length]
                  return (
                    <div
                      key={`${fileName}-${i}`}
                      className="flex min-w-0 items-center gap-2 rounded-md bg-background/60 px-2.5 py-2 ring-1 ring-border/60"
                    >
                      <HugeIcon
                        icon={File01Icon}
                        size={12}
                        className={cn("shrink-0", accent.accent)}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-fine-print text-ink-soft"
                          title={`${snap?.shortName ?? shortenCompany(companyName ?? "")} · ${fileName}`}
                        >
                          <span className={cn("font-medium", accent.accent)}>
                            {snap?.shortName ?? shortenCompany(companyName ?? "")}
                          </span>
                          <span className="mx-1 text-muted-foreground/60">·</span>
                          {fileName}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </article>
        )
      })}
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
