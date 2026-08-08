import React from 'react';

import type { CompanySnapshot, UnmatchedFile } from '@/lib/documents/compare/types';

interface UnmatchedPanelProps {
  items: UnmatchedFile[];
  companies: CompanySnapshot[];
}

export const UnmatchedPanel: React.FC<UnmatchedPanelProps> = ({ items, companies }) => {
  const nameOf = new Map(companies.map(c => [c.companyId, c.companyName]));

  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border/60 p-4 text-center text-fine-print text-muted-foreground">
        所有文件均已成功对齐。
      </p>
    );
  }

  const grouped = new Map<string, UnmatchedFile[]>();
  for (const item of items) {
    const list = grouped.get(item.companyId) ?? [];
    list.push(item);
    grouped.set(item.companyId, list);
  }

  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {[...grouped.entries()].map(([companyId, files]) => (
        <div
          key={companyId}
          className="flex flex-col rounded-lg border border-border/60 surface-card-block px-3 py-2.5 transition-[colors,transform] duration-200 ease-out hover:-translate-y-px"
        >
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-medium" title={nameOf.get(companyId)}>
              {nameOf.get(companyId) ?? companyId}
            </p>
            <span className="shrink-0 rounded-full bg-muted/60 px-1.5 text-[11px] tabular-nums text-muted-foreground">
              {files.length}
            </span>
          </div>
          <ul className="mt-1.5 space-y-1 border-t border-border/30 pt-1.5">
            {files.map(file => (
              <li
                key={file.docId}
                className="truncate text-xs text-muted-foreground"
                title={`${file.fileName} — ${file.reason}`}
              >
                {file.fileName}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};
