import React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CompareFilterState, GroupFilter, GroupSort } from '@/lib/documents/compare/selectors';
import type { CompanySnapshot } from '@/lib/documents/compare/types';

interface CompareToolbarProps {
  state: CompareFilterState;
  onChange: (next: CompareFilterState) => void;
  companies: CompanySnapshot[];
  fields: { key: string; label: string }[];
  groupCount: number;
  totalGroups: number;
}

const FILTERS: { value: GroupFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'risky', label: '有线索' },
  { value: 'different', label: '有差异' },
  { value: 'missing', label: '有缺失' },
];

const SORTS: { value: GroupSort; label: string }[] = [
  { value: 'risk', label: '线索优先' },
  { value: 'diffCount', label: '差异最多' },
  { value: 'name', label: '文件名' },
  { value: 'confidence', label: '置信度低优先' },
];

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

const Chip: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'rounded-md border px-2 py-1 text-fine-print transition-colors',
      active
        ? 'border-primary/30 bg-primary/10 text-primary'
        : 'border-border/60 text-muted-foreground hover:bg-muted/60',
    )}
  >
    {children}
  </button>
);

export const CompareToolbar: React.FC<CompareToolbarProps> = ({
  state,
  onChange,
  companies,
  fields,
  groupCount,
  totalGroups,
}) => {
  const patch = (next: Partial<CompareFilterState>): void => onChange({ ...state, ...next });
  const hasNarrowing =
    state.filter !== 'all' ||
    state.companyIds.length > 0 ||
    state.fieldKeys.length > 0 ||
    state.keyword.trim() !== '';

  return (
    <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1">
          {FILTERS.map(item => (
            <Chip
              key={item.value}
              active={state.filter === item.value}
              onClick={() => patch({ filter: item.value })}
            >
              {item.label}
            </Chip>
          ))}
        </div>

        <div className="h-4 w-px bg-hairline" />

        <label className="flex items-center gap-1.5 text-fine-print text-muted-foreground">
          排序
          <select
            value={state.sort}
            onChange={event => patch({ sort: event.target.value as GroupSort })}
            className="rounded-md border border-border/60 bg-background px-1.5 py-1 text-fine-print"
          >
            {SORTS.map(item => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <input
          value={state.keyword}
          onChange={event => patch({ keyword: event.target.value })}
          placeholder="搜索文件名…"
          className="min-w-40 flex-1 rounded-md border border-border/60 bg-background px-2 py-1 text-fine-print"
        />

        <label className="flex cursor-pointer items-center gap-1.5 text-fine-print text-muted-foreground">
          <input
            type="checkbox"
            checked={state.showLowRisk}
            onChange={event => patch({ showLowRisk: event.target.checked })}
            className="size-3.5 accent-primary"
          />
          显示弱线索
        </label>

        <span className="ml-auto text-fine-print tabular-nums text-muted-foreground">
          {groupCount} / {totalGroups} 组
        </span>

        {hasNarrowing ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 rounded-md px-2 text-fine-print text-muted-foreground"
            onClick={() => patch({ filter: 'all', companyIds: [], fieldKeys: [], keyword: '' })}
          >
            重置
          </Button>
        ) : null}
      </div>

      {companies.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-fine-print text-muted-foreground">公司</span>
          {companies.map(company => (
            <Chip
              key={company.companyId}
              active={state.companyIds.includes(company.companyId)}
              onClick={() => patch({ companyIds: toggle(state.companyIds, company.companyId) })}
            >
              {company.companyName}
            </Chip>
          ))}
        </div>
      ) : null}

      {fields.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-0.5 text-fine-print text-muted-foreground">字段</span>
          {fields.map(field => (
            <Chip
              key={field.key}
              active={state.fieldKeys.includes(field.key)}
              onClick={() => patch({ fieldKeys: toggle(state.fieldKeys, field.key) })}
            >
              {field.label}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );
};
