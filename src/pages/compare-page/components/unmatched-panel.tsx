import React from "react"

import type { CompanySnapshot, UnmatchedFile } from "@/lib/documents/compare/types"

interface UnmatchedPanelProps {
  items: UnmatchedFile[]
  companies: CompanySnapshot[]
}

export const UnmatchedPanel: React.FC<UnmatchedPanelProps> = ({ items, companies }) => {
  const nameOf = new Map(companies.map(c => [c.companyId, c.companyName]))

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-fine-print text-muted-foreground">
        所有文件均已成功对齐。
      </p>
    )
  }

  const grouped = new Map<string, UnmatchedFile[]>()
  for (const item of items) {
    const list = grouped.get(item.companyId) ?? []
    list.push(item)
    grouped.set(item.companyId, list)
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {[...grouped.entries()].map(([companyId, files]) => (
        <div key={companyId} className="rounded-lg border border-border/60 p-2.5">
          <p className="truncate text-fine-print font-medium" title={nameOf.get(companyId)}>
            {nameOf.get(companyId) ?? companyId}
            <span className="ml-1.5 text-muted-foreground">{files.length}</span>
          </p>
          <ul className="mt-1 space-y-0.5">
            {files.map(file => (
              <li
                key={file.docId}
                className="truncate text-fine-print text-muted-foreground"
                title={`${file.fileName} — ${file.reason}`}
              >
                {file.fileName}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
