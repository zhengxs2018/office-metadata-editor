import React from 'react';
import { Alert02Icon, CheckmarkCircle02Icon, MoreHorizontalIcon } from '@hugeicons/core-free-icons';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { HugeIcon } from '@/components/icons/huge-icon';
import { cn } from '@/lib/utils';

export type CleanupResult = {
  status: 'running' | 'success' | 'failure';
  total: number;
  success: number;
  failures: { id: string; fileName: string; error: string }[];
};

export const CleanupResultPill: React.FC<{ result: CleanupResult }> = ({ result }) => {
  if (result.status === 'running') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-md bg-warning/10 px-2 py-0.5 text-warning')}>
        <HugeIcon icon={MoreHorizontalIcon} size={12} className="animate-pulse" />
        <span>清理中… {result.total} 个文件</span>
      </span>
    );
  }

  if (result.status === 'success') {
    return (
      <span className={cn('inline-flex items-center gap-1.5 rounded-md bg-success/10 px-2 py-0.5 text-success')}>
        <HugeIcon icon={CheckmarkCircle02Icon} size={12} />
        <span>清理成功 {result.success} 个文件</span>
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className={cn('inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-destructive/10 px-2 py-0.5 hover:bg-destructive/15 text-destructive')}>
          <HugeIcon icon={Alert02Icon} size={12} />
          <span>
            清理失败 {result.failures.length} 个，共 {result.total}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 p-3 text-fine-print">
        <p className={cn('mb-2 font-semibold text-destructive')}>
          失败 {result.failures.length} / {result.total}
        </p>
        <ul className="max-h-60 space-y-1.5 overflow-auto">
          {result.failures.map(f => (
            <li key={f.id} className="rounded border border-border/40 bg-muted/30 p-2">
              <p className={cn('truncate font-medium body-strong')} title={f.fileName}>
                {f.fileName}
              </p>
              <p className={cn('mt-0.5 break-all aux-text')}>{f.error}</p>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
