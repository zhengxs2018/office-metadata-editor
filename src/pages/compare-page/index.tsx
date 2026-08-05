import React, { useCallback, useEffect, useMemo, useState } from "react"
import { HugeIcon } from "@/components/icons/huge-icon"
import { PlayIcon } from "@hugeicons/core-free-icons"
import { invoke } from "@tauri-apps/api/core"

import { Button } from "@/components/ui/button"
import { PageLayout } from "@/layouts/page-layout"
import { useFileContext, type CompanyEntry } from "@/contexts/file-context"
import { useMetadata, type LoadedDocument } from "@/contexts/metadata-context"
import { type RiskFinding } from "@/lib/documents/compare-audit"
import { ROUTES } from "@/router/paths"
import { DropZone } from "@/pages/compare-page/components/drop-zone"
import { CompanyCard } from "@/pages/compare-page/components/company-card"
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
  const { companyById, companies, clearAll, companyCount } = useFileContext()
  const { documents } = useMetadata()
  const [findings, setFindings] = useState<RiskFinding[]>([])
  const [comparing, setComparing] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const readyDocs = useMemo(() => documents.filter(doc => doc.status === "ready"), [documents])

  useEffect(() => {
    setFindings([])
    setDialogOpen(false)
  }, [])

  const allCompanies = useMemo(() => Object.values(companyById), [companyById])

  const docsByCompany = useMemo(() => {
    const map = new Map<string, LoadedDocument[]>()
    for (const c of allCompanies) {
      map.set(
        c.id,
        readyDocs.filter(doc => doc.companyId === c.id),
      )
    }
    return map
  }, [readyDocs, allCompanies])

  const companiesWithFiles = useMemo(
    () => allCompanies.filter(c => (docsByCompany.get(c.id)?.length ?? 0) > 0),
    [allCompanies, docsByCompany],
  )

  const canRun = companiesWithFiles.length >= 2 && !comparing

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
  }, [canRun, documents, companyById])

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
          {companyCount > 0 ? (
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
            size="sm"
            onClick={handleRun}
            disabled={!canRun}
            className="gap-1.5 rounded-lg"
          >
            <HugeIcon icon={PlayIcon} size={14} />
            {comparing ? "对比中…" : "开始对比"}
          </Button>
        </div>
      }
    >
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          <DropZone mode="directory" />
          {allCompanies.map((company, idx) => (
            <CompanyCard key={company.id} company={company} index={idx} />
          ))}
        </div>
      </div>

      <RiskReportView
        open={dialogOpen}
        onClose={() => {
          if (comparing) return
          setDialogOpen(false)
        }}
        comparing={comparing}
        findings={findings}
        companies={allCompanies}
        docsByCompany={docsByCompany}
        canRerun={canRun}
        onRerun={handleRun}
      />
    </PageLayout>
  )
}

export default ComparePage
