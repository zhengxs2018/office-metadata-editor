import type {
  AlignedGroup,
  CompanySnapshot,
  CompareResult,
  FieldDiff,
  RiskFinding,
  RiskLevel,
} from "./types"

export type GroupFilter = "all" | "risky" | "different" | "missing"

export type GroupSort = "risk" | "diffCount" | "name" | "confidence"

export interface CompareFilterState {
  filter: GroupFilter
  sort: GroupSort
  companyIds: string[]
  fieldKeys: string[]
  showLowRisk: boolean
  keyword: string
}

export const DEFAULT_FILTER_STATE: CompareFilterState = {
  filter: "all",
  sort: "risk",
  companyIds: [],
  fieldKeys: [],
  showLowRisk: false,
  keyword: "",
}

const LEVEL_WEIGHT: Record<RiskLevel, number> = { high: 3, medium: 2, low: 1 }

function levelWeight(level: RiskLevel | null): number {
  return level ? LEVEL_WEIGHT[level] : 0
}

/** 弱线索默认不展示，避免噪声淹没有效信息。 */
export function isVisibleFinding(finding: RiskFinding, showLowRisk: boolean): boolean {
  return showLowRisk || finding.level !== "low"
}

export function visibleDiffs(group: AlignedGroup, fieldKeys: string[]): FieldDiff[] {
  const diffs = group.diffs.filter(diff => diff.state !== "ignored")
  if (fieldKeys.length === 0) return diffs
  const allow = new Set(fieldKeys)
  return diffs.filter(diff => allow.has(diff.fieldKey))
}

function matchesFilter(group: AlignedGroup, filter: GroupFilter): boolean {
  switch (filter) {
    case "risky":
      return group.riskLevel !== null
    case "different":
      return group.diffCount > 0
    case "missing":
      return group.missingCount > 0
    default:
      return true
  }
}

function matchesCompanies(group: AlignedGroup, companyIds: string[]): boolean {
  if (companyIds.length === 0) return true
  const allow = new Set(companyIds)
  return group.cells.some(cell => allow.has(cell.companyId))
}

function matchesFields(group: AlignedGroup, fieldKeys: string[]): boolean {
  if (fieldKeys.length === 0) return true
  const allow = new Set(fieldKeys)
  return group.diffs.some(
    diff => allow.has(diff.fieldKey) && diff.state !== "identical" && diff.state !== "ignored",
  )
}

function matchesKeyword(group: AlignedGroup, keyword: string): boolean {
  const term = keyword.trim().toLowerCase()
  if (!term) return true
  if (group.label.toLowerCase().includes(term)) return true
  return group.cells.some(cell => (cell.fileName ?? "").toLowerCase().includes(term))
}

export function selectGroups(
  result: CompareResult,
  state: CompareFilterState,
): AlignedGroup[] {
  const filtered = result.groups.filter(
    group =>
      matchesFilter(group, state.filter) &&
      matchesCompanies(group, state.companyIds) &&
      matchesFields(group, state.fieldKeys) &&
      matchesKeyword(group, state.keyword),
  )

  const sorted = [...filtered]
  switch (state.sort) {
    case "diffCount":
      sorted.sort((a, b) => b.diffCount - a.diffCount || a.label.localeCompare(b.label))
      break
    case "name":
      sorted.sort((a, b) => a.label.localeCompare(b.label))
      break
    case "confidence":
      sorted.sort(
        (a, b) => a.matchConfidence - b.matchConfidence || a.label.localeCompare(b.label),
      )
      break
    default:
      sorted.sort(
        (a, b) =>
          levelWeight(b.riskLevel) - levelWeight(a.riskLevel) ||
          b.diffCount - a.diffCount ||
          a.label.localeCompare(b.label),
      )
  }
  return sorted
}

export function selectFindings(
  result: CompareResult,
  state: CompareFilterState,
): RiskFinding[] {
  const allowCompany = new Set(state.companyIds)
  const allowField = new Set(state.fieldKeys)
  return result.findings
    .filter(finding => isVisibleFinding(finding, state.showLowRisk))
    .filter(
      finding =>
        state.companyIds.length === 0 ||
        finding.refs.some(ref => allowCompany.has(ref.companyId)),
    )
    .filter(
      finding =>
        state.fieldKeys.length === 0 ||
        finding.fieldKeys.some(key => allowField.has(key)),
    )
    .sort(
      (a, b) =>
        levelWeight(b.level) - levelWeight(a.level) ||
        b.weight * b.score - a.weight * a.score,
    )
}

export function findGroupOfFinding(
  result: CompareResult,
  finding: RiskFinding,
): AlignedGroup | undefined {
  if (finding.groupId) {
    const direct = result.groups.find(group => group.groupId === finding.groupId)
    if (direct) return direct
  }
  const docIds = new Set(finding.refs.map(ref => ref.docId))
  return result.groups.find(group => group.cells.some(cell => cell.docId && docIds.has(cell.docId)))
}

export function findingsOfGroup(result: CompareResult, groupId: string): RiskFinding[] {
  return result.findings.filter(finding => finding.groupId === groupId)
}

export interface FindingClusterField {
  key: string
  label: string
  rawValue: string
}

export interface FindingClusterFile {
  docId: string
  fileName: string
  companyId: string
  companyName: string
  fields: FindingClusterField[]
}

export interface FindingCluster {
  clusterId: string
  ruleId: string
  evidenceKind: "sameEntity" | "sameOrigin"
  level: RiskLevel
  score: number
  weight: number
  label: string
  companies: CompanySnapshot[]
  files: FindingClusterFile[]
  underlying: RiskFinding[]
  groupIds: string[]
}

const FIELD_LABELS: Record<string, string> = {
  creator: "作者",
  lastModifiedBy: "最后修改作者",
  manager: "管理者",
  appCompany: "公司名",
  template: "模板",
  application: "应用程序",
  appVersion: "版本",
  created: "创建时间",
  modified: "修改时间",
  annotationAuthors: "批注作者",
  revisionAuthors: "修订作者",
}

const RULE_LABELS: Record<string, string> = {
  SAME_PERSON: "疑似同一人",
  SAME_MANAGER: "管理者相同",
  SAME_APP_COMPANY: "公司标识相同",
  SIMILAR_APP_COMPANY: "公司标识相似",
  SAME_TEMPLATE: "使用相同模板",
  CLOSE_TIMESTAMP: "创建时间接近",
  SAME_APP_FINGERPRINT: "应用程序与版本一致",
  REVISION_TRACES: "编辑/批注痕迹交集",
}

function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key
}

function ruleLabel(ruleId: string): string {
  return RULE_LABELS[ruleId] ?? ruleId
}

function formatTimeRange(min: Date, max: Date): string {
  const sameDay =
    min.getFullYear() === max.getFullYear() &&
    min.getMonth() === max.getMonth() &&
    min.getDate() === max.getDate()
  const datePart = `${min.getFullYear()}-${String(min.getMonth() + 1).padStart(2, "0")}-${String(min.getDate()).padStart(2, "0")}`
  const timePart = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  if (sameDay) {
    return `${datePart} ${timePart(min)} ~ ${timePart(max)}`
  }
  return `${datePart} ${timePart(min)} ~ ${max.getFullYear()}-${String(max.getMonth() + 1).padStart(2, "0")}-${String(max.getDate()).padStart(2, "0")} ${timePart(max)}`
}

function fileNameOf(docId: string, result: CompareResult): string {
  for (const group of result.groups) {
    const cell = group.cells.find(c => c.docId === docId)
    if (cell?.fileName) return cell.fileName
  }
  const unmatched = result.unmatched.find(u => u.docId === docId)
  return unmatched?.fileName ?? docId
}

export function selectFindingClusters(
  result: CompareResult,
  state: CompareFilterState,
): FindingCluster[] {
  const companyNameOf = new Map(result.companies.map(c => [c.companyId, c.companyName]))
  const visible = selectFindings(result, state)
  const map = new Map<string, FindingCluster>()

  for (const finding of visible) {
    const key = finding.entityKey
      ? `${finding.ruleId}:${finding.evidenceKind}:${finding.entityKey}`
      : finding.findingId

    const cluster = map.get(key) ?? {
      clusterId: key,
      ruleId: finding.ruleId,
      evidenceKind: finding.evidenceKind,
      level: finding.level,
      score: finding.score,
      weight: finding.weight,
      label: ruleLabel(finding.ruleId),
      companies: [],
      files: [],
      underlying: [],
      groupIds: [],
    }

    cluster.underlying.push(finding)
    if (levelWeight(finding.level) > levelWeight(cluster.level)) {
      cluster.level = finding.level
    }
    cluster.score = Math.max(cluster.score, finding.score)
    cluster.weight = Math.max(cluster.weight, finding.weight)
    if (finding.groupId) cluster.groupIds.push(finding.groupId)

    for (const ref of finding.refs) {
      const companyId = ref.companyId
      if (!cluster.companies.some(c => c.companyId === companyId)) {
        const existing = result.companies.find(c => c.companyId === companyId)
        if (existing) cluster.companies.push(existing)
      }

      const fileName = fileNameOf(ref.docId, result)
      const existingFile = cluster.files.find(f => f.docId === ref.docId)
      if (existingFile) {
        if (!existingFile.fields.some(field => field.key === ref.fieldKey && field.rawValue === ref.raw)) {
          existingFile.fields.push({
            key: ref.fieldKey,
            label: fieldLabel(ref.fieldKey),
            rawValue: ref.raw,
          })
        }
      } else {
        cluster.files.push({
          docId: ref.docId,
          fileName,
          companyId,
          companyName: companyNameOf.get(companyId) ?? companyId,
          fields: [
            {
              key: ref.fieldKey,
              label: fieldLabel(ref.fieldKey),
              rawValue: ref.raw,
            },
          ],
        })
      }
    }

    map.set(key, cluster)
  }

  const clusters = [...map.values()]
  for (const cluster of clusters) {
    let suffix = ""
    if (cluster.ruleId === "CLOSE_TIMESTAMP") {
      const times = cluster.underlying
        .map(f => new Date(f.value.trim()).getTime())
        .filter(t => !Number.isNaN(t))
      if (times.length) {
        suffix = formatTimeRange(
          new Date(Math.min(...times)),
          new Date(Math.max(...times)),
        )
      }
    } else {
      const values = new Set(cluster.underlying.map(f => f.value.trim()).filter(Boolean))
      suffix = [...values].sort().join(" / ")
    }
    if (suffix) cluster.label = `${cluster.label}：${suffix}`
    cluster.companies.sort((a, b) => a.companyName.localeCompare(b.companyName, "zh-CN"))
    cluster.files.sort((a, b) => {
      const byCompany = a.companyName.localeCompare(b.companyName, "zh-CN")
      return byCompany || a.fileName.localeCompare(b.fileName, "zh-CN")
    })
    cluster.groupIds = [...new Set(cluster.groupIds)]
  }

  return clusters.sort(
    (a, b) =>
      levelWeight(b.level) - levelWeight(a.level) ||
      b.weight * b.score - a.weight * a.score ||
      a.label.localeCompare(b.label, "zh-CN"),
  )
}

/** 收集全部出现过差异的字段，供筛选下拉使用。 */
export function collectDiffFields(result: CompareResult): { key: string; label: string }[] {
  const seen = new Map<string, string>()
  for (const group of result.groups) {
    for (const diff of group.diffs) {
      if (diff.state === "ignored") continue
      if (!seen.has(diff.fieldKey)) seen.set(diff.fieldKey, diff.fieldLabel)
    }
  }
  return [...seen.entries()].map(([key, label]) => ({ key, label }))
}
