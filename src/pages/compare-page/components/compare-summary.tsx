import React from "react"

import { FileSpreadsheetIcon, InformationCircleIcon } from "@hugeicons/core-free-icons"

import { HugeIcon } from "@/components/icons/huge-icon"
import { cn } from "@/lib/utils"
import {
  RISK_LEVEL_LABEL,
  RULE_LABEL,
  type CompanySnapshot,
  type CompareResult,
} from "@/lib/documents/compare/types"

import { RISK_TONE } from "./compare-tokens"

interface CompareSummaryProps {
  result: CompareResult
  companies: CompanySnapshot[]
  /** 存在高/中风险线索时为 true，提示导出报告 */
  needExport?: boolean
}

const Stat: React.FC<{ label: string; value: number | string; tone?: string }> = ({
  label,
  value,
  tone,
}) => (
  <div className="rounded-lg border border-border/60 bg-background px-2.5 py-2">
    <p className="text-fine-print text-muted-foreground">{label}</p>
    <p className={cn("font-heading text-lg font-semibold tabular-nums", tone)}>{value}</p>
  </div>
)

export const CompareSummary: React.FC<CompareSummaryProps> = ({
  result,
  companies,
  needExport = false,
}) => {
  const nameOf = new Map(companies.map(c => [c.companyId, c.companyName]))
  const { stats } = result
  const topPairs = result.pairRisks.filter(pair => pair.level !== "low").slice(0, 6)

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        <Stat label="强线索" value={stats.highCount} tone={RISK_TONE.high.text} />
        <Stat label="中线索" value={stats.mediumCount} tone={RISK_TONE.medium.text} />
        <Stat label="对齐组" value={stats.groupCount} />
        <Stat label="差异字段" value={stats.diffFieldCount} />
        <Stat label="未匹配" value={stats.unmatchedCount} />
        <Stat label="文件总数" value={stats.fileCount} />
      </div>

      {topPairs.length > 0 ? (
        <div className="space-y-1">
          <p className="text-fine-print text-muted-foreground">公司对线索强度</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {topPairs.map(pair => {
              const tone = RISK_TONE[pair.level]
              return (
                <li
                  key={pair.pairId}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-2 py-1.5 text-fine-print",
                    tone.chip,
                  )}
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full", tone.dot)} />
                  <span className="min-w-0 flex-1 truncate">
                    {nameOf.get(pair.companyA) ?? pair.companyA} ⟷{" "}
                    {nameOf.get(pair.companyB) ?? pair.companyB}
                  </span>
                  <span className="shrink-0 opacity-70">
                    {pair.ruleIds.map(id => RULE_LABEL[id] ?? id).join("·")}
                  </span>
                  <span className="shrink-0 font-medium tabular-nums">
                    {RISK_LEVEL_LABEL[pair.level]}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div className="rounded-md border border-border/50 bg-muted/30 px-2.5 py-2.5 text-fine-print leading-relaxed text-muted-foreground">
        <div className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground/80">
          <HugeIcon icon={InformationCircleIcon} size={13} className="shrink-0" />
          免责声明
        </div>
        {result.disclaimer.split("\n").map((line, idx) => (
          <p
            key={idx}
            className={cn(
              "whitespace-pre-wrap",
              line.trim() === "" ? "h-1.5" : "mb-1.5 last:mb-0",
            )}
          >
            {line}
          </p>
        ))}
      </div>

      {needExport ? (
        <p className="inline-flex items-center gap-1.5 rounded-md border border-amber-300/60 bg-amber-50/50 px-2.5 py-2 text-fine-print leading-relaxed text-amber-800">
          <HugeIcon icon={FileSpreadsheetIcon} size={14} className="shrink-0" />
          检测到需要留意的关联线索，建议点击右上角「导出 Excel」保存完整报告（含逐文件元数据与差异明细）以便复核归档。
        </p>
      ) : null}
    </div>
  )
}
