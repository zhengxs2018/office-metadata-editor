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
import { FILE_META_COLS } from "./report-config"
import { shortenCompany, companyNamesList, describeFindingFor } from "./report-utils"
import type { RiskFinding } from "@/lib/documents/compare-audit"
import type { FlaggedFile, CompanySnapshot } from "./report-types"

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
    <>
      <div className="overflow-hidden rounded-lg border border-border/60">
        <div className="overflow-x-auto">
          <div
            className={cn(
              "grid min-w-160 gap-x-2.5 gap-y-1 px-3 py-2 text-xs",
              FILE_META_COLS,
            )}
          >
            <div className="text-fine-print font-medium text-muted-foreground">公司</div>
            <div className="text-fine-print font-medium text-muted-foreground">文件</div>
            <div className="hidden text-fine-print font-medium text-muted-foreground min-[860px]:block">
              作者
            </div>
            <div className="hidden text-fine-print font-medium whitespace-nowrap text-muted-foreground min-[860px]:block">
              最后修改者
            </div>
            <div className="hidden text-fine-print font-medium text-muted-foreground min-[860px]:block">
              组织名
            </div>
            <div className="hidden text-fine-print font-medium text-muted-foreground min-[860px]:block">
              创建器
            </div>
            <div className="hidden text-fine-print font-medium whitespace-nowrap text-muted-foreground min-[860px]:block">
              创建时间
            </div>
            <div className="text-right text-fine-print font-medium whitespace-nowrap text-muted-foreground">
              状态
            </div>

            {allFiles.map(({ company, file }) => {
              const fileFindings = findingsByFile.get(file.fileName) ?? []
              return (
                <React.Fragment key={file.id}>
                  <div className="truncate leading-snug text-ink-soft" title={company}>
                    {shortenCompany(company)}
                  </div>
                  <div
                    className={cn(
                      "flex min-w-0 items-center gap-1.5 truncate leading-snug",
                      file.isFlagged ? "text-ink font-medium" : "text-ink-soft",
                    )}
                    title={file.fileName}
                  >
                    <HugeIcon icon={File01Icon} size={12} />
                    <span className="truncate">{file.fileName}</span>
                  </div>
                  <div
                    className={cn(
                      "hidden truncate leading-snug min-[860px]:block",
                      file.isFlagged ? "text-ink" : "text-ink-soft",
                    )}
                    title={file.author}
                  >
                    {file.author}
                  </div>
                  <div
                    className={cn(
                      "hidden truncate leading-snug min-[860px]:block",
                      file.isFlagged ? "text-ink" : "text-ink-soft",
                    )}
                    title={file.lastModifiedBy}
                  >
                    {file.lastModifiedBy}
                  </div>
                  <div
                    className="hidden truncate leading-snug text-ink-soft min-[860px]:block"
                    title={file.appCompany}
                  >
                    {file.appCompany}
                  </div>
                  <div
                    className="hidden truncate leading-snug text-ink-soft min-[860px]:block"
                    title={file.application}
                  >
                    {file.application}
                  </div>
                  <div className="hidden truncate leading-snug whitespace-nowrap text-ink-soft min-[860px]:block">
                    {file.created}
                  </div>
                  <div className="text-right leading-snug whitespace-nowrap">
                    {file.isFlagged ? (
                      <TooltipProvider delayDuration={150}>
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
                      </TooltipProvider>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">
                        <HugeIcon icon={CheckmarkCircle02Icon} size={12} />
                        正常
                      </span>
                    )}
                  </div>
                </React.Fragment>
              )
            })}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 px-1 text-fine-print text-muted-foreground">
        <span>
          共 {totalFiles} 个文件 · 已标记 {flaggedTotal} · 通过 {cleanTotal}
        </span>
        <span className="tabular-nums">{companyNamesList(companySnapshots)}</span>
      </div>
    </>
  )
}
