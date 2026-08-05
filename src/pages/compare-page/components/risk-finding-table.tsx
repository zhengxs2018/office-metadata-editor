import React from "react"
import type { RiskFinding, RiskLevel } from "@/lib/documents/compare-audit"
import { Alert02Icon, Alert01Icon } from "@hugeicons/core-free-icons"
import { HugeIcon } from "@/components/icons/huge-icon"

const LEVEL_META: Record<
  RiskLevel,
  { label: string; className: string; icon: React.ComponentProps<typeof HugeIcon>["icon"] }
> = {
  high: { label: "高风险", className: "bg-red-500/10 text-red-600", icon: Alert02Icon },
  medium: { label: "中风险", className: "bg-amber-500/10 text-amber-600", icon: Alert01Icon },
}

interface RiskFindingTableProps {
  findings: RiskFinding[]
  loading?: boolean
}

export const RiskFindingTable: React.FC<RiskFindingTableProps> = ({ findings, loading }) => {
  if (loading) {
    return <div className="text-ink-soft py-8 text-center text-sm">正在分析…</div>
  }

  if (findings.length === 0) {
    return (
      <div className="text-ink-soft rounded-lg border border-dashed border-border/70 bg-card/50 py-8 text-center text-sm">
        未发现风险项
      </div>
    )
  }

  return (
    <div className="overflow-auto rounded-lg border border-border/70">
      <table className="w-full border-collapse text-sm">
        <thead className="text-ink-soft sticky top-0 bg-canvas text-left text-xs">
          <tr className="border-b border-border/70">
            <th className="px-3 py-2 font-medium">状态</th>
            <th className="px-3 py-2 font-medium">问题</th>
            <th className="px-3 py-2 font-medium">字段</th>
            <th className="px-3 py-2 font-medium">值</th>
            <th className="px-3 py-2 font-medium">文件</th>
            <th className="px-3 py-2 font-medium">公司</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f, i) => {
            const meta = LEVEL_META[f.level]
            const Icon = meta.icon
            return (
              <tr key={i} className="border-b border-border/50 align-top last:border-0">
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${meta.className}`}
                  >
                    <HugeIcon icon={Icon} size={14} />
                    {meta.label}
                  </span>
                </td>
                <td className="text-ink px-3 py-2">{f.problem}</td>
                <td className="text-ink-soft px-3 py-2">{f.fields.join("、")}</td>
                <td className="text-ink px-3 py-2 font-medium">"{f.value}"</td>
                <td className="text-ink-soft px-3 py-2">{f.files.join("，")}</td>
                <td className="text-ink-soft px-3 py-2">{f.companies.join("，")}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
