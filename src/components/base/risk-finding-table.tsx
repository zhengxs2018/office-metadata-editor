import React from 'react';
import { HugeIcon } from '@/components/icons/huge-icon';
import type { IconSvgElement } from '@hugeicons/react';

export interface RiskFindingColumn<T> {
  key: string;
  header: string;
  width?: string;
  render: (row: T, index: number) => React.ReactNode;
}

export interface RiskFindingTableProps<T> {
  columns: RiskFindingColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyText?: string;
  loadingText?: string;
}

export function RiskFindingTable<T>({
  columns,
  rows,
  loading,
  emptyText = '未发现风险项',
  loadingText = '正在分析…',
}: RiskFindingTableProps<T>) {
  if (loading) {
    return <div className="text-ink-soft py-8 text-center text-sm">{loadingText}</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="text-ink-soft rounded-lg border border-dashed border-border/70 bg-card/50 py-8 text-center text-sm">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-border/70">
      <table className="w-full border-collapse text-sm">
        <thead className="text-ink-soft sticky top-0 bg-canvas text-left text-xs">
          <tr className="border-b border-border/70">
            {columns.map(col => (
              <th key={col.key} className="px-3 py-2 font-medium">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 align-top last:border-0">
              {columns.map(col => (
                <td key={col.key} className="px-3 py-2">
                  {col.render(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface LevelBadgeProps {
  level: 'high' | 'medium' | 'low';
  labels?: Record<string, string>;
  className?: string;
  icon?: IconSvgElement;
  iconSize?: number;
}

const LEVEL_BADGE_DEFAULTS = {
  high: {
    label: '高风险',
    className: 'bg-red-500/10 text-red-600',
    icon: null as IconSvgElement | null,
  },
  medium: {
    label: '中风险',
    className: 'bg-amber-500/10 text-amber-600',
    icon: null as IconSvgElement | null,
  },
  low: {
    label: '低风险',
    className: 'bg-blue-500/10 text-blue-600',
    icon: null as IconSvgElement | null,
  },
};

export const LevelBadge: React.FC<LevelBadgeProps> = ({
  level,
  labels,
  className,
  icon,
  iconSize = 14,
}) => {
  const defaults = LEVEL_BADGE_DEFAULTS[level];
  const label = labels?.[level] ?? defaults.label;
  const cls = className ?? defaults.className;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      {icon ? <HugeIcon icon={icon} size={iconSize} /> : null}
      {label}
    </span>
  );
};
