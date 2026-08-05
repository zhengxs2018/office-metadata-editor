import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Play } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"
import { save } from "@tauri-apps/plugin-dialog"

import { Button } from "@/components/ui/button"
import { PageLayout } from "@/layouts/page-layout"
import { useFileContext, type CompanyEntry } from "@/contexts/file-context"
import { useMetadata, type LoadedDocument } from "@/contexts/metadata-context"
import { type RiskFinding } from "@/lib/documents/compare-audit"
import { buildCompareReport, buildCompareReportFileName } from "@/lib/documents/compare-report"
import { ROUTES } from "@/router/paths"
import { CompanySlot } from "@/pages/compare-page/components/company-slot"
import { RiskReportView } from "@/pages/compare-page/components/risk-report-dialog"

interface RustMatchReport {
  riskLevel: string
  issue: string
  fields: string[]
  value: string
  files: string[]
  companies: string[]
  score: number
  matchTag: string
}

interface CompareFileInput {
  id: string
  fileName: string
  company: string
  author: string
  lastModifiedBy: string
  appCompany: string
}

function toCompareInputs(
  documents: LoadedDocument[],
  companyById: Record<string, CompanyEntry>,
): CompareFileInput[] {
  return documents
    .filter(doc => doc.status === "ready")
    .map(doc => {
      const props = doc.metadata.documentProperties
      const app = doc.metadata.appProperties
      const companyEntry = doc.companyId ? companyById[doc.companyId] : undefined
      return {
        id: doc.id,
        fileName: doc.metadata.fileName,
        company: (companyEntry?.name ?? "").trim(),
        author: (props?.creator ?? "").trim(),
        lastModifiedBy: (props?.lastModifiedBy ?? "").trim(),
        appCompany: (app?.company ?? "").trim(),
      }
    })
}

export const ComparePage: React.FC = () => {
  const { companyById, clearAll } = useFileContext()
  const { documents } = useMetadata()
  const [findings, setFindings] = useState<RiskFinding[]>([])
  const [comparing, setComparing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const readyDocs = useMemo(() => documents.filter(doc => doc.status === "ready"), [documents])

  useEffect(() => {
    setFindings([])
    setDialogOpen(false)
  }, [])

  const leftCompany = useMemo(
    () => Object.values(companyById).find(c => c.side === "left") ?? null,
    [companyById],
  )
  const rightCompany = useMemo(
    () => Object.values(companyById).find(c => c.side === "right") ?? null,
    [companyById],
  )
  const leftDocs = useMemo(
    () => readyDocs.filter(doc => doc.companyId === leftCompany?.id),
    [readyDocs, leftCompany?.id],
  )
  const rightDocs = useMemo(
    () => readyDocs.filter(doc => doc.companyId === rightCompany?.id),
    [readyDocs, rightCompany?.id],
  )

  const canRun =
    Boolean(leftCompany && rightCompany) &&
    leftDocs.length > 0 &&
    rightDocs.length > 0 &&
    !comparing

  const handleRun = useCallback(async () => {
    if (!canRun) return
    setComparing(true)
    setDialogOpen(true)
    try {
      const inputs = toCompareInputs(documents, companyById)
      const reports = await invoke<RustMatchReport[]>("compare_metadata", { files: inputs })
      setFindings(
        reports.map(report => ({
          level: (report.riskLevel === "high" ? "high" : "medium") as RiskFinding["level"],
          problem: report.issue,
          fields: report.fields,
          value: report.value,
          files: report.files,
          companies: report.companies,
          score: report.score,
          matchTag: report.matchTag,
        })),
      )
    } catch (error) {
      console.error("对比失败:", error)
      setFindings([])
    } finally {
      setComparing(false)
    }
  }, [canRun, documents])

  const handleExport = async () => {
    if (exporting) return
    setExporting(true)
    try {
      const leftName = leftCompany?.name ?? ""
      const rightName = rightCompany?.name ?? ""
      const report = buildCompareReport({
        leftName,
        rightName,
        findings,
        generatedAt: new Date(),
      })
      const target = await save({
        defaultPath: buildCompareReportFileName(leftName, rightName),
        filters: [{ name: "纯文本报告", extensions: ["txt"] }],
      })
      if (!target) return
      await invoke("write_text_file", { filePath: target, contents: report })
    } catch (error) {
      console.error("导出报告失败:", error)
    } finally {
      setExporting(false)
    }
  }

  const handleReset = () => {
    clearAll()
    setFindings([])
    setDialogOpen(false)
  }

  return (
    <PageLayout
      backTo={ROUTES.home}
      bleed
      header={<h1 className="text-caption font-semibold">元数据对比</h1>}
      actions={
        <div className="flex items-center gap-1">
          {leftCompany || rightCompany ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="gap-1.5 rounded-lg text-muted-foreground"
              disabled={comparing}
            >
              清空全部
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 rounded-lg"
            disabled={!dialogOpen || exporting || findings.length === 0}
            onClick={handleExport}
          >
            <Download className="size-4" />
            导出报告
          </Button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 p-6">
        <div className="flex w-full max-w-6xl flex-col items-stretch gap-4 lg:flex-row">
          <CompanySlot
            side="left"
            title="基准方 (Baseline)"
            emptyHint="拖拽基准方文件夹至此处"
            addFolderLabel="选择文件夹"
            sourceLabel="或点击下方按钮选择目录"
            tone="blue"
          />
          <CompanySlot
            side="right"
            title="对比方 (Comparison)"
            emptyHint="拖拽对比方文件夹至此处"
            addFolderLabel="选择文件夹"
            sourceLabel="或点击下方按钮选择目录"
            tone="orange"
          />
        </div>

        <Button
          size="lg"
          onClick={handleRun}
          disabled={!canRun}
          className="rounded-full px-8 shadow-product"
        >
          <Play className="mr-1.5 size-4 fill-current" />
          {comparing ? "对比中…" : "开始对比"}
        </Button>
      </div>

      <RiskReportView
        open={dialogOpen}
        onClose={() => {
          if (comparing) return
          setDialogOpen(false)
        }}
        comparing={comparing}
        findings={findings}
        leftCompanyName={leftCompany?.name ?? "基准方"}
        rightCompanyName={rightCompany?.name ?? "对比方"}
        leftDocs={leftDocs}
        rightDocs={rightDocs}
        leftCount={leftDocs.length}
        rightCount={rightDocs.length}
        canRerun={canRun}
        exporting={exporting}
        onRerun={handleRun}
        onExport={handleExport}
      />
    </PageLayout>
  )
}

export default ComparePage
