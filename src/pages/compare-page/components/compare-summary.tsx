import React from 'react';
import { cn } from '@/lib/utils';
import type { CompareResult } from '@/lib/documents/compare/types';

import { RISK_TONE } from './compare-tokens';

interface CompareSummaryProps {
  result: CompareResult;
}

const Stat: React.FC<{ label: string; value: number | string; tone?: string }> = ({
  label,
  value,
  tone,
}) => (
  <div className="rounded-lg border border-border/60 bg-background px-2.5 py-2">
    <p className="text-fine-print text-muted-foreground">{label}</p>
    <p className={cn('font-heading text-lg font-semibold tabular-nums', tone)}>{value}</p>
  </div>
);

export const CompareSummary: React.FC<CompareSummaryProps> = ({ result: { stats } }) => {
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        <Stat label="强线索" value={stats.highCount} tone={RISK_TONE.high.text} />
        <Stat label="中线索" value={stats.mediumCount} tone={RISK_TONE.medium.text} />
        <Stat label="对齐组" value={stats.groupCount} />
        <Stat label="差异字段" value={stats.diffFieldCount} />
      </div>
    </div>
  );
};
