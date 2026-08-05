import type { RiskFinding, RiskLevel } from "./compare-audit"

export type CompareReportInput = {
  leftName: string
  rightName: string
  findings: RiskFinding[]
  generatedAt?: Date
}

const RULE = "=".repeat(64)
const THIN = "-".repeat(64)

const LEVEL_LABEL: Record<RiskLevel, string> = {
  high: "高风险",
  medium: "中风险",
}

function formatDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  )
}

function countByLevel(findings: RiskFinding[]): Record<RiskLevel, number> {
  const counts: Record<RiskLevel, number> = { high: 0, medium: 0 }
  for (const finding of findings) counts[finding.level] += 1
  return counts
}

export function buildCompareReport(input: CompareReportInput): string {
  const { leftName, rightName, findings, generatedAt = new Date() } = input
  const counts = countByLevel(findings)
  const lines: string[] = []

  lines.push(RULE)
  lines.push("文档元数据对比报告")
  lines.push(RULE)
  lines.push(`生成时间：${formatDateTime(generatedAt)}`)
  lines.push(`对比对象：${leftName} × ${rightName}`)
  lines.push("")
  lines.push(`风险发现：高危 ${counts.high} 项 / 中风险 ${counts.medium} 项`)
  lines.push("")

  lines.push("对比结果明细")
  lines.push(THIN)
  if (findings.length === 0) {
    lines.push("未发现风险项。")
  } else {
    findings.forEach((f, index) => {
      lines.push(`${index + 1}. [${LEVEL_LABEL[f.level]}] ${f.problem}（${f.fields.join("、")}）`)
      lines.push(`   值："${f.value}"`)
      lines.push(`   文件：${f.files.join("，")}`)
      lines.push(`   公司：${f.companies.join("，")}`)
      lines.push("")
    })
  }

  lines.push(RULE)
  lines.push("报告结束。本报告由文档元数据对比工具自动生成，仅供人工复核参考。")
  lines.push(RULE)

  return lines.join("\n")
}

export function buildCompareReportFileName(
  leftName: string,
  rightName: string,
  generatedAt: Date = new Date(),
): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp =
    `${generatedAt.getFullYear()}${pad(generatedAt.getMonth() + 1)}${pad(generatedAt.getDate())}` +
    `-${pad(generatedAt.getHours())}${pad(generatedAt.getMinutes())}`
  const safe = (value: string) => value.replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 24)
  return `元数据对比报告_${safe(leftName)}_${safe(rightName)}_${stamp}.txt`
}
