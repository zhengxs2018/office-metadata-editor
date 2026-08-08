import React from 'react';

import { cn } from '@/lib/utils';
import {
  MATCH_SOURCE_LABEL,
  RISK_LEVEL_LABEL,
  type AlignedGroup,
  type CompanySnapshot,
} from '@/lib/documents/compare/types';

import { MATCH_TONE, MISSING_TONE, RISK_TONE } from './compare-tokens';

interface AlignmentMatrixProps {
  groups: AlignedGroup[];
  companies: CompanySnapshot[];
  selectedGroupId: string | null;
  onSelect: (groupId: string) => void;
}

export const AlignmentMatrix: React.FC<AlignmentMatrixProps> = ({
  groups,
  companies,
  selectedGroupId,
  onSelect,
}) => {
  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-fine-print text-muted-foreground">
        没有符合当前筛选条件的对齐组。
      </div>
    );
  }

  return (
    <div className="max-h-[520px] overflow-auto rounded-lg border border-border/60">
      <table className="w-full min-w-3xl border-collapse text-fine-print">
        <thead className="sticky top-0 z-20">
          <tr className="bg-canvas">
            <th className="sticky left-0 z-10 bg-canvas px-3 py-2 text-left font-medium text-muted-foreground">
              对齐组
            </th>
            <th className="px-2 py-2 text-left font-medium text-muted-foreground">线索</th>
            <th className="px-2 py-2 text-right font-medium text-muted-foreground">差异</th>
            <th className="px-2 py-2 text-right font-medium text-muted-foreground">缺失</th>
            <th className="px-2 py-2 text-left font-medium text-muted-foreground">匹配</th>
            {companies.map(company => (
              <th
                key={company.companyId}
                className="max-w-56 px-2 py-2 text-left font-medium text-muted-foreground"
                title={company.companyName}
              >
                <span className="block truncate">{company.companyName}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="stagger" style={{ ['--md-stagger' as string]: 26 }}>
          {groups.map((group, i) => {
            const byCompany = new Map(group.cells.map(cell => [cell.companyId, cell]));
            const selected = group.groupId === selectedGroupId;
            return (
              <tr
                key={group.groupId}
                onClick={() => onSelect(group.groupId)}
                className={cn(
                  'cursor-pointer border-t border-border/40 transition-colors',
                  selected ? 'bg-primary/5' : 'hover:bg-muted/30',
                )}
                style={{ ['--md-index' as string]: i }}
              >
                <td
                  className={cn(
                    'sticky left-0 z-10 max-w-64 px-3 py-2',
                    selected ? 'bg-primary/5' : 'bg-canvas',
                  )}
                >
                  <span className="block truncate font-medium" title={group.label}>
                    {group.label}
                  </span>
                </td>
                <td className="px-2 py-2">
                  {group.riskLevel ? (
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5',
                        RISK_TONE[group.riskLevel].chip,
                      )}
                    >
                      <span
                        className={cn('size-1.5 rounded-full', RISK_TONE[group.riskLevel].dot)}
                      />
                      {RISK_LEVEL_LABEL[group.riskLevel]}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/60">—</span>
                  )}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {group.diffCount > 0 ? (
                    group.diffCount
                  ) : (
                    <span className="text-muted-foreground/60">0</span>
                  )}
                </td>
                <td className="px-2 py-2 text-right tabular-nums">
                  {group.missingCount > 0 ? (
                    <span className={MISSING_TONE}>{group.missingCount}</span>
                  ) : (
                    <span className="text-muted-foreground/60">0</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  <span className={cn('whitespace-nowrap', MATCH_TONE[group.matchSource])}>
                    {MATCH_SOURCE_LABEL[group.matchSource]}
                    {group.matchSource === 'fuzzy'
                      ? ` ${Math.round(group.matchConfidence * 100)}%`
                      : ''}
                  </span>
                </td>
                {companies.map(company => {
                  const cell = byCompany.get(company.companyId);
                  return (
                    <td key={company.companyId} className="max-w-56 px-2 py-2">
                      {cell?.fileName ? (
                        <span className="block truncate" title={cell.fileName}>
                          {cell.fileName}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/50">缺</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
