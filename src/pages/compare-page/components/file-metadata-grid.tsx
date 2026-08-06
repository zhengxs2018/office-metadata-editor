import React, { useMemo } from "react"
import {
  Alert01Icon,
  Alert02Icon,
  CheckmarkCircle02Icon,
  File01Icon,
} from "@hugeicons/core-free-icons"
import { HugeIcon } from "@/components/icons/huge-icon"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { shortenCompany, companyNamesList, describeFindingFor } from "./report-utils"
import type { RiskFinding } from "@/lib/documents/compare-audit"
import type { FlaggedFile, CompanySnapshot } from "./report-types"

// ---------- sticky border/shadow helpers (batch-page best practices) ----------

const TH_L = "sticky left-0 z-30 rounded-tl-lg border-t border-b border-l border-r border-zinc-300 bg-muted py-2.5 pr-2 pl-3 font-medium whitespace-nowrap text-left text-xs text-muted-foreground shadow-[2px_0_3px_-1px_rgba(0,0,0,0.08)]"
const TH_R = "sticky right-0 z-30 rounded-tr-lg border-t border-b border-l border-r border-zinc-300 bg-muted py-2.5 pr-3 pl-3 font-medium whitespace-nowrap text-right text-xs text-muted-foreground shadow-[-2px_0_3px_-1px_rgba(0,0,0,0.08)]"
const TH = "border-t border-b border-r border-zinc-300 bg-muted py-2.5 pr-2 pl-3 font-medium whitespace-nowrap text-left text-xs text-muted-foreground"

const TD_L = "sticky left-0 z-10 border-b border-l border-r border-zinc-300 bg-card py-1.5 pr-2 pl-3 text-fine-print group-hover:bg-muted/30 shadow-[2px_0_3px_-1px_rgba(0,0,0,0.08)]"
const TD_R = "sticky right-0 z-10 border-b border-l border-r border-zinc-300 bg-card py-1.5 pr-3 pl-3 text-fine-print group-hover:bg-muted/30 shadow-[-2px_0_3px_-1px_rgba(0,0,0,0.08)]"
const TD = "border-b border-r border-zinc-300 py-1.5 pr-2 pl-3 text-fine-print"

// ---------- component ----------

interface FileMetadataGridProps {
  allFiles: { company: string; file: FlaggedFile }[]
  findingsByFile: Map<string, RiskFinding[]>
  companySnapshots: CompanySnapshot[]
}

export const FileMetadataGrid: React.FC<FileMetadataGridProps> = ({
  allFiles,
  findingsByFile,
  companySnapshots,
}) => {
  const totalFiles = allFiles.length
  const flaggedTotal = useMemo(() => allFiles.filter(({ file }) => file.isFlagged).length, [allFiles])
  const cleanTotal = totalFiles - flaggedTotal

  return (
    <TooltipProvider delayDuration={150}>
      <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
        <div className="overflow-auto">
          <table
            className="border-separate border-spacing-0 text-sm"
            style={{ width: "max-content", minWidth: "100%" }}
          >
            <thead className="sticky top-0 z-20">
              <tr>
                <th className={cn(TH_L, "w-30 min-w-30 shrink-0")}>公司</th>
                <th className={cn(TH, "w-50 min-w-50")}>文件</th>
                <th className={cn(TH, "w-25 min-w-25")}>作者</th>
                <th className={cn(TH, "w-28 min-w-28")}>最后修改者</th>
                <th className={cn(TH, "w-28 min-w-28")}>组织名</th>
                <th className={cn(TH, "w-25 min-w-25")}>创建器</th>
                <th className={cn(TH, "w-32 min-w-32")}>创建时间</th>
                <th className={cn(TH_R, "w-20 min-w-20 shrink-0")}>状态</th>
              </tr>
            </thead>
            <tbody>
              {allFiles.map(({ company, file }) => {
                const fileFindings = findingsByFile.get(file.fileName) ?? []

                return (
                  <tr key={file.id} className="group">
                    {/* 公司 — sticky left */}
                    <td className={cn(TD_L, "w-30 min-w-30 shrink-0 truncate")} title={company}>
                      {shortenCompany(company)}
                    </td>

                    {/* 文件 */}
                    <td className={cn(TD, "w-50 min-w-50")}>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <HugeIcon icon={File01Icon} size={12} className="shrink-0 text-muted-foreground" />
                        <span
                          className={cn(
                            "truncate",
                            file.isFlagged && "font-medium text-ink",
                          )}
                          title={file.fileName}
                        >
                          {file.fileName}
                        </span>
                      </div>
                    </td>

                    {/* 作者 */}
                    <td className={cn(TD, "w-25 min-w-25")} title={file.author}>
                      <span className={cn("block truncate", file.isFlagged ? "text-ink" : "text-ink-soft")}>
                        {file.author}
                      </span>
                    </td>

                    {/* 最后修改者 */}
                    <td className={cn(TD, "w-28 min-w-28")} title={file.lastModifiedBy}>
                      <span className={cn("block truncate", file.isFlagged ? "text-ink" : "text-ink-soft")}>
                        {file.lastModifiedBy}
                      </span>
                    </td>

                    {/* 组织名 */}
                    <td className={cn(TD, "w-28 min-w-28")} title={file.appCompany}>
                      <span className="block truncate text-ink-soft">{file.appCompany}</span>
                    </td>

                    {/* 创建器 */}
                    <td className={cn(TD, "w-25 min-w-25")} title={file.application}>
                      <span className="block truncate text-ink-soft">{file.application}</span>
                    </td>

                    {/* 创建时间 */}
                    <td className={cn(TD, "w-32 min-w-32 whitespace-nowrap")}>
                      <span className="text-ink-soft">{file.created}</span>
                    </td>

                    {/* 状态 — sticky right */}
                    <td className={cn(TD_R, "w-20 min-w-20 shrink-0 text-right")}>
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
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-fine-print text-muted-foreground">
        <span>
          共 {totalFiles} 个文件 · 已标记 {flaggedTotal} · 通过 {cleanTotal}
        </span>
        <span className="tabular-nums">{companyNamesList(companySnapshots)}</span>
      </div>
    </TooltipProvider>
  )
}
