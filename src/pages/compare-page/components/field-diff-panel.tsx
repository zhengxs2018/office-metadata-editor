import React, { useMemo, useState } from "react"

import { cn } from "@/lib/utils"
import {
  DIFF_STATE_LABEL,
  RISK_LEVEL_LABEL,
  RULE_LABEL,
  type AlignedGroup,
  type CompanySnapshot,
  type RiskFinding,
} from "@/lib/documents/compare/types"

import { DIFF_TONE, RISK_TONE } from "./compare-tokens"

interface FieldDiffPanelProps {
  group: AlignedGroup | null
  companies: CompanySnapshot[]
  findings: RiskFinding[]
}

export const FieldDiffPanel: React.FC<FieldDiffPanelProps> = ({
  group,
  companies,
  findings,
}) => {
  const [showIdentical, setShowIdentical] = useState(false)

  const riskyFieldKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const finding of findings) {
      for (const key of finding.fieldKeys) keys.add(key)
    }
    return keys
  }, [findings])

  const diffs = useMemo(() => {
    if (!group) return []
    return group.diffs.filter(diff => {
      if (diff.state === "ignored") return false
      if (diff.state === "identical" && !showIdentical) return riskyFieldKeys.has(diff.fieldKey)
      return true
    })
  }, [group, showIdentical, riskyFieldKeys])

  if (!group) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center rounded-lg border border-dashed border-border/60 p-6 text-center text-fine-print text-muted-foreground">
        选择左侧任一对齐组，查看逐字段差异。
      </div>
    )
  }

  const shown = new Set(group.cells.map(cell => cell.companyId))
  const cols = companies.filter(company => shown.has(company.companyId))

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium" title={group.label}>
            {group.label}
          </p>
          <p className="text-fine-print text-muted-foreground">
            {group.cells.length} 个文件 · {group.diffCount} 项差异 · {group.missingCount} 项缺失
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-fine-print text-muted-foreground">
          <input
            type="checkbox"
            checked={showIdentical}
            onChange={event => setShowIdentical(event.target.checked)}
            className="size-3.5 accent-primary"
          />
          显示完全一致字段
        </label>
      </div>

      {findings.length > 0 ? (
        <ul className="space-y-1">
          {findings.map(finding => (
            <li
              key={finding.findingId}
              className={cn(
                "rounded-md border px-2 py-1.5 text-fine-print",
                RISK_TONE[finding.level].chip,
              )}
            >
              <span className="font-medium">
                {RISK_LEVEL_LABEL[finding.level]} · {RULE_LABEL[finding.ruleId] ?? finding.ruleId}
              </span>
              <span className="mx-1.5 opacity-50">·</span>
              {finding.problem}
            </li>
          ))}
        </ul>
      ) : null}

      {diffs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-fine-print text-muted-foreground">
          该组没有需要关注的字段差异。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border/60">
          <table className="w-full border-collapse text-fine-print">
            <thead>
              <tr className="bg-muted/40">
                <th className="w-28 px-2 py-2 text-left font-medium text-muted-foreground">
                  字段
                </th>
                <th className="w-20 px-2 py-2 text-left font-medium text-muted-foreground">
                  状态
                </th>
                {cols.map(company => (
                  <th
                    key={company.companyId}
                    className="px-2 py-2 text-left font-medium text-muted-foreground"
                    title={company.companyName}
                  >
                    <span className="block truncate">{company.companyName}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diffs.map(diff => {
                const byCompany = new Map(diff.values.map(value => [value.companyId, value]))
                const flagged = riskyFieldKeys.has(diff.fieldKey)
                return (
                  <tr
                    key={diff.fieldKey}
                    className={cn("border-t border-border/40", flagged && "bg-rose-500/4")}
                  >
                    <td className="px-2 py-1.5">
                      <span className="font-medium">{diff.fieldLabel}</span>
                      {diff.tier === "risk" ? (
                        <span className="ml-1 text-muted-foreground/60">*</span>
                      ) : null}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 whitespace-nowrap",
                          DIFF_TONE[diff.state],
                        )}
                      >
                        {DIFF_STATE_LABEL[diff.state]}
                      </span>
                    </td>
                    {cols.map(company => {
                      const value = byCompany.get(company.companyId)
                      return (
                        <td key={company.companyId} className="max-w-64 px-2 py-1.5">
                          {value && !value.isEmpty ? (
                            <span className="block truncate" title={value.raw ?? ""}>
                              {value.raw}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">空</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-fine-print text-muted-foreground/70">
        带 * 为参与线索判定的风险字段。差异状态仅描述事实，取值一致不代表安全。
      </p>
    </div>
  )
}
