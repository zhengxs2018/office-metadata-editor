import React from "react"
import { Alert02Icon, Alert01Icon, File01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeIcon } from "@/components/icons/huge-icon"
import { cn } from "@/lib/utils"
import { COMPANY_ACCENTS } from "./report-config"
import { shortenCompany } from "./report-utils"
import type { RiskFinding } from "@/lib/documents/compare-audit"
import type { CompanySnapshot } from "./report-types"

interface RiskFindingsAdversarialProps {
  findings: RiskFinding[]
  companySnapshots: CompanySnapshot[]
}

export const RiskFindingsAdversarial: React.FC<RiskFindingsAdversarialProps> = ({
  findings,
  companySnapshots,
}) => {
  const sorted = [...findings].sort((a, b) => {
    const order: Record<string, number> = { high: 0, medium: 1 }
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
