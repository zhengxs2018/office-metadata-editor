import type { RiskFinding } from "@/lib/documents/compare-audit"
import type { LoadedDocument } from "@/contexts/metadata-context"
import type { FlaggedFile, CompanySnapshot } from "./report-types"

export function buildFlaggedFiles(
  documents: LoadedDocument[],
  findings: RiskFinding[],
): FlaggedFile[] {
  type Marker = { level: "high" | "medium"; field: string; value: string }
  const markers = new Map<string, Marker[]>()
  for (const finding of findings) {
    for (const name of finding.files) {
      const list = markers.get(name) ?? []
      list.push({
        level: finding.level,
        field: finding.fields.join(" / "),
        value: finding.value,
      })
      markers.set(name, list)
    }
  }

  return documents.map(doc => {
    const props = doc.metadata.documentProperties
    const app = doc.metadata.appProperties
    const fileName = doc.metadata.fileName || doc.filePath.split("/").pop() || "未命名文件"
    const fileMarkers = markers.get(fileName)
    const topMarker =
      fileMarkers?.find(m => m.level === "high") ?? fileMarkers?.[0] ?? null
    return {
      id: doc.id,
      fileName,
      author: (props?.creator ?? "").trim() || "—",
      lastModifiedBy: (props?.lastModifiedBy ?? "").trim() || "—",
      appCompany: (app?.company ?? "").trim() || "—",
      application: (app?.application ?? "").trim() || "—",
      created: (props?.created ?? "").trim() || "—",
      modified: (props?.modified ?? "").trim() || "—",
      isFlagged: !!fileMarkers,
      riskLevel: topMarker?.level ?? null,
      matchingField: topMarker?.field ?? null,
      matchingValue: topMarker?.value ?? null,
    }
  })
}

export function shortenCompany(name: string): string {
  const suffixes = [
    "股份有限公司",
    "有限责任公司",
    "科技有限公司",
    "技术有限公司",
    "有限公司",
    "股份公司",
    "集团",
    "公司",
  ]
  let result = name
  for (const suffix of suffixes) {
    if (result.endsWith(suffix) && result.length > suffix.length) {
      result = result.slice(0, -suffix.length)
      break
    }
  }
  return result || name
}

export function companyNamesList(snapshots: CompanySnapshot[]): string {
  if (snapshots.length === 0) return ""
  const summary = snapshots
    .map(s => `${s.shortName} ${s.files.length} 个 / 风险 ${s.highCount + s.mediumCount}`)
    .join(" · ")
  return summary
}

export function statsColCount(s: CompanySnapshot): number {
  let n = 0
  if (s.highCount > 0) n++
  if (s.mediumCount > 0) n++
  n++
  return n
}

export function describeFindingFor(
  selfFileName: string,
  selfCompany: string,
  finding: RiskFinding,
): string {
  const counterpartFiles = finding.files.filter(n => n !== selfFileName)
  const counterpartCompanies = finding.companies.filter(c => c !== selfCompany)
  const fieldLabel = finding.fields.join("、")
  return `与「${counterpartFiles.join("、")}」（${counterpartCompanies.join(
    "、",
  )}）的「${fieldLabel}」字段相同：${finding.value}`
}
