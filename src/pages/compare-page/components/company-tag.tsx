import React from "react"
import type { CompanySnapshot } from "./report-types"

interface CompanyTagProps {
  s: CompanySnapshot
  isInvolved: boolean
}

export const CompanyTag: React.FC<CompanyTagProps> = ({ s, isInvolved }) => {
  if (s.accentIndex === 0) {
    return (
      <span className="shrink-0 rounded bg-foreground/5 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        基准方
      </span>
    )
  }
  if (isInvolved) {
    return (
      <span className="shrink-0 rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
        对手方
      </span>
    )
  }
  return null
}
