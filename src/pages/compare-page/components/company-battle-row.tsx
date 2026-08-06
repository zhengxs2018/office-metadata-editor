import React from "react"
import {
  Alert01Icon,
  Alert02Icon,
  Building01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons"
import { HugeIcon } from "@/components/icons/huge-icon"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { COMPANY_ACCENTS } from "./report-config"
import { statsColCount } from "./report-utils"
import { BattleStat } from "./battle-stat"
import { CompanyTag } from "./company-tag"
import type { CompanySnapshot } from "./report-types"

interface CompanyBattleRowProps {
  snapshots: CompanySnapshot[]
  involvedIds: Set<string>
}

export const CompanyBattleRow: React.FC<CompanyBattleRowProps> = ({ snapshots, involvedIds }) => {
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
                  <BattleStat tone="high" label="高" value={s.highCount} />
                ) : null}
                {s.mediumCount > 0 ? (
                  <BattleStat tone="medium" label="中" value={s.mediumCount} />
                ) : null}
                <BattleStat tone="pass" label="通过" value={cleanCount} />
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
                      icon={file.riskLevel === "medium" ? Alert01Icon : Alert02Icon}
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
