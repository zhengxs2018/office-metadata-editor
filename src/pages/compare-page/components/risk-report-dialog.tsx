import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Alert02Icon,
  Alert01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  FileSpreadsheetIcon,
  PlayIcon,
  ScrollHorizontalIcon,
  SecurityCheckIcon,
} from "@hugeicons/core-free-icons"
import { invoke } from "@tauri-apps/api/core"
import { save } from "@tauri-apps/plugin-dialog"

import { HugeIcon } from "@/components/icons/huge-icon"
import { Button } from "@/components/ui/button"
import { TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  buildCompareExcelBase64,
  buildExcelReportFileName,
  type FileMetadataRecord,
} from "@/lib/documents/compare-report"

import { COMPANY_ACCENTS } from "./report-config"
import { buildFlaggedFiles, shortenCompany } from "./report-utils"
import { ReportSection } from "./report-section"
import { SummaryBigCard } from "./summary-big-card"
import { CompanyBattleRow } from "./company-battle-row"
import { RiskDistributionChart } from "./risk-distribution-chart"
import { RiskFindingsAdversarial } from "./risk-findings-adversarial"
import { FileMetadataGrid } from "./file-metadata-grid"
import type { RiskReportViewProps, CompanySnapshot, FlaggedFile } from "./report-types"
import type { RiskFinding } from "@/lib/documents/compare-audit"

export { type RiskReportViewProps } from "./report-types"

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
              <FileMetadataGrid
                allFiles={allFiles}
                findingsByFile={findingsByFile}
                companySnapshots={companySnapshots}
              />
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
