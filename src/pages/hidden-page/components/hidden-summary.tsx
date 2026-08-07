import React from "react"
import {
  Alert01Icon,
  CheckCircle,
  FileSpreadsheetIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { HugeIcon } from "@/components/icons/huge-icon"
import type { HiddenStats } from "./hidden-types"

interface HiddenSummaryProps {
  stats: HiddenStats
  needExport?: boolean
}

interface StatCellProps {
  label: string
  value: number
  tone?: "default" | "danger"
}

const StatCell: React.FC<StatCellProps> = ({ label, value, tone = "default" }) => (
  <div className="rounded-md border border-border/50 bg-background/60 px-3 py-2">
    <div
      className={`font-heading text-lg font-semibold tabular-nums ${
        tone === "danger" && value > 0 ? "text-destructive" : "text-ink"
      }`}
    >
      {value}
    </div>
    <div className="text-fine-print text-muted-foreground">{label}</div>
  </div>
)

export const HiddenSummary: React.FC<HiddenSummaryProps> = ({ stats, needExport }) => {
  const hasRisk = stats.flaggedCount > 0

  return (
    <div className="space-y-3">
      <div
        className={`flex items-start gap-3 rounded-md border px-4 py-3 ${
          hasRisk
            ? "border-destructive/30 bg-destructive/5"
            : "border-emerald-500/30 bg-emerald-500/5"
        }`}
      >
        <HugeIcon
          icon={hasRisk ? Alert01Icon : CheckCircle}
          size={18}
          className={hasRisk ? "mt-0.5 text-destructive" : "mt-0.5 text-emerald-600"}
        />
        <div className="space-y-1">
          <p className="text-ink text-body font-medium">
            {hasRisk
              ? `${stats.flaggedCount} 个文件检测到隐藏痕迹`
              : `已扫描 ${stats.fileCount} 个文件，未发现隐藏痕迹`}
          </p>
          <p className="text-fine-print text-muted-foreground">
            {hasRisk
              ? "隐藏痕迹包含批注作者、修订作者、XMP 创建者与隐藏标记，可能泄露编辑者身份，建议逐项核对后清除。"
              : "未在批注、修订记录、XMP 元数据中发现作者痕迹，文件可安全对外分发。"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCell label="扫描文件" value={stats.fileCount} />
        <StatCell label="存在痕迹" value={stats.flaggedCount} tone="danger" />
        <StatCell label="批注作者" value={stats.annotationCount} tone="danger" />
        <StatCell label="修订作者" value={stats.revisionCount} tone="danger" />
        <StatCell label="XMP 创建者" value={stats.xmpCount} tone="danger" />
      </div>

      {needExport ? (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <HugeIcon icon={FileSpreadsheetIcon} size={14} className="mt-0.5 text-amber-600" />
          <p className="text-fine-print text-muted-foreground">
            建议点击右上角「导出 Excel」保存完整痕迹清单，便于逐个文件核对与留档。
          </p>
        </div>
      ) : null}

      {stats.markerCount > 0 ? (
        <div className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/30 px-3 py-2">
          <HugeIcon icon={UserMultipleIcon} size={14} className="mt-0.5 text-muted-foreground" />
          <p className="text-fine-print text-muted-foreground">
            另有 {stats.markerCount} 个文件包含隐藏内容标记（隐藏行列、隐藏工作表或隐藏文本）。
          </p>
        </div>
      ) : null}
    </div>
  )
}
