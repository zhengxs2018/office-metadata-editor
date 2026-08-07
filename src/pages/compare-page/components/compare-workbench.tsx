import React, { useCallback, useMemo, useState } from "react"
import { FileSpreadsheetIcon } from "@hugeicons/core-free-icons"
import { invoke } from "@tauri-apps/api/core"
import { save } from "@tauri-apps/plugin-dialog"
import { toast } from "sonner"

import { HugeIcon } from "@/components/icons/huge-icon"
import { Button } from "@/components/ui/button"
import {
  buildCompareWorkbookBase64,
  buildCompareWorkbookFileName,
} from "@/lib/documents/compare/export"
import {
  DEFAULT_FILTER_STATE,
  collectDiffFields,
  findGroupOfFinding,
  findingsOfGroup,
  selectFindingClusters,
  selectGroups,
  type CompareFilterState,
  type FindingCluster,
} from "@/lib/documents/compare/selectors"
import type { CompareResult } from "@/lib/documents/compare/types"

import { ReportSection } from "./report-section"
import { CompareSummary } from "./compare-summary"
import { CompareToolbar } from "./compare-toolbar"
import { AlignmentMatrix } from "./alignment-matrix"
import { FieldDiffPanel } from "./field-diff-panel"
import { FindingsList } from "./findings-list"
import { UnmatchedPanel } from "./unmatched-panel"

interface CompareWorkbenchProps {
  result: CompareResult
}

export const CompareWorkbench: React.FC<CompareWorkbenchProps> = ({ result }) => {
  const [filterState, setFilterState] = useState<CompareFilterState>(DEFAULT_FILTER_STATE)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const groups = useMemo(() => selectGroups(result, filterState), [result, filterState])
  const clusters = useMemo(() => selectFindingClusters(result, filterState), [result, filterState])
  const diffFields = useMemo(() => collectDiffFields(result), [result])

  const activeGroupId = useMemo(() => {
    if (selectedGroupId && groups.some(group => group.groupId === selectedGroupId)) {
      return selectedGroupId
    }
    return groups[0]?.groupId ?? null
  }, [selectedGroupId, groups])

  const activeGroup = useMemo(
    () => groups.find(group => group.groupId === activeGroupId) ?? null,
    [groups, activeGroupId],
  )

  const activeGroupFindings = useMemo(
    () => (activeGroupId ? findingsOfGroup(result, activeGroupId) : []),
    [result, activeGroupId],
  )

  const handleLocate = useCallback(
    (cluster: FindingCluster) => {
      const representative = cluster.underlying[0]
      if (!representative) return
      const group = findGroupOfFinding(result, representative)
      if (group) setSelectedGroupId(group.groupId)
    },
    [result],
  )

  const handleExport = useCallback(async () => {
    if (exporting) return
    setExporting(true)
    try {
      const generatedAt = new Date()
      const base64 = buildCompareWorkbookBase64(result, generatedAt)
      const target = await save({
        defaultPath: buildCompareWorkbookFileName(generatedAt),
        filters: [{ name: "Excel 工作簿", extensions: ["xlsx"] }],
      })
      if (!target) return
      await invoke("write_binary_file", { filePath: target, base64Data: base64 })
      toast.success("导出成功", {
        description: `对比报告已导出至 ${target}`,
      })
      await invoke("open_export_folder", { filePath: target }).catch(() => {})
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error("导出对比报告失败:", error)
      toast.error("导出失败", { description: message })
    } finally {
      setExporting(false)
    }
  }, [exporting, result])

  const hasResult = result.stats.fileCount > 0
  const hasGroups = groups.length > 0
  const hasRisk = result.stats.highCount > 0 || result.stats.mediumCount > 0



  const needExport = hasRisk

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6">
      <ReportSection
        title="执行摘要"
        index="01"
        hint={`${result.stats.companyCount} 家公司 / ${result.stats.fileCount} 个文件`}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={exporting || !hasResult}
            className="gap-1.5 rounded-lg"
          >
            <HugeIcon icon={FileSpreadsheetIcon} size={14} />
            {exporting ? "导出中…" : "导出 Excel"}
          </Button>
        }
      >
        <CompareSummary result={result} companies={result.companies} needExport={needExport} />
      </ReportSection>

      {hasGroups ? (
        <ReportSection
          title="对齐矩阵"
          index="02"
          hint="点击任一行查看逐字段差异"
        >
          <div className="space-y-2.5">
            <CompareToolbar
              state={filterState}
              onChange={setFilterState}
              companies={result.companies}
              fields={diffFields}
              groupCount={groups.length}
              totalGroups={result.groups.length}
            />
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <AlignmentMatrix
                groups={groups}
                companies={result.companies}
                selectedGroupId={activeGroupId}
                onSelect={setSelectedGroupId}
              />
              <FieldDiffPanel
                group={activeGroup}
                companies={result.companies}
                findings={activeGroupFindings}
              />
            </div>
          </div>
        </ReportSection>
      ) : null}

      <ReportSection
        title="线索清单"
        index={hasGroups ? "03" : "02"}
        hint={`共 ${clusters.length} 条线索`}
      >
        <FindingsList
          clusters={clusters}
          companies={result.companies}
          activeGroupId={activeGroupId}
          onLocate={handleLocate}
          positive={!hasRisk}
        />
      </ReportSection>

      <ReportSection
        title="未匹配文件"
        index={hasGroups ? "04" : "03"}
        hint={`${result.stats.unmatchedCount} 个`}
      >
        <UnmatchedPanel items={result.unmatched} companies={result.companies} />
        <p className="mt-4 text-fine-print leading-relaxed text-muted-foreground">
          这些是名称与其他公司文件均不相同、未被纳入「对齐矩阵」逐一比对的文件。
        </p>
        <p className="mt-1 text-fine-print leading-relaxed text-muted-foreground">
          它们未必有问题，但无法自动判定是否与其他文件同源，建议人工复核其来源。
        </p>
      </ReportSection>
    </div>
  )
}
