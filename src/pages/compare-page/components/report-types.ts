import type { RiskFinding } from "@/lib/documents/compare-audit"
import type { CompanyEntry } from "@/contexts/file-context"
import type { LoadedDocument } from "@/contexts/metadata-context"

export interface RiskReportViewProps {
  open: boolean
  onClose: () => void
  comparing: boolean
  findings: RiskFinding[]
  companies: CompanyEntry[]
  docsByCompany: Map<string, LoadedDocument[]>
  canRerun: boolean
  onRerun: () => void
}

export interface FlaggedFile {
  id: string
  fileName: string
  author: string
  lastModifiedBy: string
  appCompany: string
  application: string
  created: string
  modified: string
  isFlagged: boolean
  riskLevel: "high" | "medium" | null
  matchingField: string | null
  matchingValue: string | null
}

export interface CompanySnapshot {
  id: string
  name: string
  shortName: string
  files: FlaggedFile[]
  highCount: number
  mediumCount: number
  cleanCount: number
  accentIndex: number
}
