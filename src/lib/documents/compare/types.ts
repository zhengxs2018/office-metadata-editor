export type RiskLevel = "low" | "medium" | "high"

export type DiffState = "identical" | "similar" | "conflict" | "missing" | "ignored"

export type FieldTier = "risk" | "display" | "ignored"

export type MatchSource = "exact" | "normalized" | "fuzzy" | "manual"

export type EvidenceKind = "sameEntity" | "sameOrigin"

export interface CompareFileInput {
  id: string
  companyId: string
  companyName: string
  fileName: string
  creator: string
  lastModifiedBy: string
  appCompany: string
  manager: string
  template: string
  application: string
  appVersion: string
  created: string
  modified: string
  revision: string
  title: string
  subject: string
  keywords: string
  description: string
  category: string
  contentStatus: string
  version: string
  language: string
  totalTime: string
  /** 隐藏信息 / 编辑痕迹提取：批注作者 */
  annotationAuthors?: string[]
  /** 隐藏信息 / 编辑痕迹提取：修订作者 */
  revisionAuthors?: string[]
  /** 隐藏信息 / 编辑痕迹提取：XMP 创作者 */
  xmpCreators?: string[]
  /** 是否存在隐藏标记（水印 / XMP / 增量保存痕迹） */
  hasHiddenMarkers?: boolean
}

/** 单条规则的运行时覆盖，供规则产品化（白名单 / 灵敏度）预留接口使用。 */
export interface RuleOverride {
  enabled?: boolean
  level?: "high" | "medium" | "low"
}

export interface CompareOptions {
  closeTimestampMinutes?: number
  fuzzyMatchFloor?: number
  /** 规则产品化预留：ruleId -> 覆盖（启用状态 / 风险等级）。 */
  ruleOverrides?: Record<string, RuleOverride>
}

export interface CompanySnapshot {
  companyId: string
  companyName: string
  fileCount: number
}

export interface GroupCell {
  companyId: string
  docId: string | null
  fileName: string | null
}

export interface FieldValue {
  companyId: string
  docId: string | null
  raw: string | null
  normalized: string | null
  isEmpty: boolean
}

export interface FieldDiff {
  fieldKey: string
  fieldLabel: string
  tier: FieldTier
  state: DiffState
  values: FieldValue[]
}

export interface AlignedGroup {
  groupId: string
  label: string
  cells: GroupCell[]
  diffs: FieldDiff[]
  riskLevel: RiskLevel | null
  diffCount: number
  missingCount: number
  matchConfidence: number
  matchSource: MatchSource
}

export interface UnmatchedFile {
  docId: string
  companyId: string
  fileName: string
  reason: string
}

export interface FindingRef {
  companyId: string
  docId: string
  fieldKey: string
  raw: string
}

export interface RiskFinding {
  findingId: string
  ruleId: string
  level: RiskLevel
  evidenceKind: EvidenceKind
  weight: number
  problem: string
  groupId: string | null
  refs: FindingRef[]
  fieldKeys: string[]
  value: string
  entityKey: string | null
  score: number
  matchTag: string
  explain: string
}

export interface CompanyPairRisk {
  pairId: string
  companyA: string
  companyB: string
  level: RiskLevel
  pairScore: number
  ruleIds: string[]
  findingIds: string[]
  summary: string
}

export interface CompareStats {
  companyCount: number
  fileCount: number
  groupCount: number
  unmatchedCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  diffFieldCount: number
}

export interface CompareResult {
  schemaVersion: number
  dimension: string
  disclaimer: string
  companies: CompanySnapshot[]
  groups: AlignedGroup[]
  unmatched: UnmatchedFile[]
  findings: RiskFinding[]
  pairRisks: CompanyPairRisk[]
  stats: CompareStats
}

export const EMPTY_COMPARE_RESULT: CompareResult = {
  schemaVersion: 1,
  dimension: "cross-company",
  disclaimer: "",
  companies: [],
  groups: [],
  unmatched: [],
  findings: [],
  pairRisks: [],
  stats: {
    companyCount: 0,
    fileCount: 0,
    groupCount: 0,
    unmatchedCount: 0,
    highCount: 0,
    mediumCount: 0,
    lowCount: 0,
    diffFieldCount: 0,
  },
}

/** 线索强度展示词。合规要求：不得使用「认定串标」等定性表述。 */
export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  high: "强线索",
  medium: "中线索",
  low: "弱线索",
}

export const DIFF_STATE_LABEL: Record<DiffState, string> = {
  identical: "完全一致",
  similar: "近似一致",
  conflict: "取值冲突",
  missing: "部分缺失",
  ignored: "全部为空",
}

export const MATCH_SOURCE_LABEL: Record<MatchSource, string> = {
  exact: "精确匹配",
  normalized: "归一匹配",
  fuzzy: "模糊匹配",
  manual: "人工指定",
}

export const RULE_LABEL: Record<string, string> = {
  SAME_PERSON: "疑似同一人",
  SAME_MANAGER: "管理者相同",
  SAME_APP_COMPANY: "公司标识相同",
  SIMILAR_APP_COMPANY: "公司标识相似",
  SAME_TEMPLATE: "相同非通用模板",
  CLOSE_TIMESTAMP: "创建时间接近",
  SAME_APP_FINGERPRINT: "软件指纹一致",
  REVISION_TRACES: "编辑痕迹交集",
}
