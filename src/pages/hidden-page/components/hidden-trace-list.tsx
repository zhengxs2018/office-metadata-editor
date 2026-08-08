import React, { useState } from 'react';
import {
  ArrowDown01Icon,
  ArrowRight01Icon,
  CheckCircle,
  File01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { HugeIcon } from '@/components/icons/huge-icon';
import { Badge } from '@/components/ui/badge';
import type { HiddenTraceRow } from '@/types/hidden';

interface HiddenTraceListProps {
  rows: HiddenTraceRow[];
}

interface TraceGroupProps {
  label: string;
  values: string[];
}

const TraceGroup: React.FC<TraceGroupProps> = ({ label, values }) => {
  if (values.length === 0) return null;

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <span className="text-fine-print shrink-0 text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1">
        {values.map(value => (
          <Badge key={value} variant="outline" className="font-mono text-fine-print">
            {value}
          </Badge>
        ))}
      </div>
    </div>
  );
};

const TraceItem: React.FC<{ row: HiddenTraceRow }> = ({ row }) => {
  const [open, setOpen] = useState(false);

  return (
    <li className={cn('rounded-md surface-card-block')}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
      >
        <HugeIcon
          icon={open ? ArrowDown01Icon : ArrowRight01Icon}
          size={14}
          className="shrink-0 text-muted-foreground"
        />
        <HugeIcon icon={File01Icon} size={14} className="shrink-0 text-muted-foreground" />
        <span className={cn('truncate text-body font-medium body-strong')}>{row.fileName}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="text-fine-print uppercase">
            {row.fileType}
          </Badge>
          <Badge variant="destructive" className="text-fine-print tabular-nums">
            {row.traceCount} 项痕迹
          </Badge>
        </span>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-border/40 px-3 py-2.5">
          <p className="text-fine-print break-all text-muted-foreground">{row.filePath}</p>
          <TraceGroup label="批注作者" values={row.annotationAuthors} />
          <TraceGroup label="修订作者" values={row.revisionAuthors} />
          <TraceGroup label="XMP 创建者" values={row.xmpCreators} />
          {row.hasHiddenMarkers ? (
            <p className="text-fine-print text-muted-foreground">
              检测到隐藏内容标记（隐藏行列 / 隐藏工作表 / 隐藏文本）。
            </p>
          ) : null}
        </div>
      ) : null}
    </li>
  );
};

export const HiddenTraceList: React.FC<HiddenTraceListProps> = ({ rows }) => {
  const flagged = rows.filter(row => row.hasTrace);

  if (flagged.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-success/30 bg-success/5 px-4 py-8 text-center">
        <HugeIcon icon={CheckCircle} size={28} className="text-success" />
        <p className={cn('text-body font-medium', 'title-text')}>未发现任何隐藏痕迹</p>
        <p className={cn('text-fine-print', 'aux-text')}>
          所有文件的批注、修订与 XMP 元数据中均未检出作者信息。
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-1.5">
      {flagged.map(row => (
        <TraceItem key={row.id} row={row} />
      ))}
    </ul>
  );
};
