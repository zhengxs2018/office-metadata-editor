export type RiskLevel = "high" | "medium"

/** 对比结果中的一条风险发现（与 Rust compare_metadata 返回结构一致）。 */
export interface RiskFinding {
  level: RiskLevel
  problem: string
  fields: string[]
  value: string
  files: string[]
  companies: string[]
  score: number
  matchTag: string
}
