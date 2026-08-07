import React from 'react';
import {
  Alert01Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Delete01Icon,
  File01Icon,
  Loading02Icon,
  SaveEnergy01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HugeIcon } from '@/components/icons/huge-icon';
import { cn, formatFileSize, formatFullTime, formatRelativeTime } from '@/lib/utils';
import type { BatchRow } from '@/types/batch';

interface BatchTableRowProps {
  row: BatchRow;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onSave: (id: string) => Promise<void>;
  onRemove: (id: string) => void;
  onCancelTask: (id: string) => void;
}

const TOOLTIP_CLASS = 'bg-zinc-900 text-zinc-50 [&_p]:text-zinc-50';

export const BatchTableRow: React.FC<BatchTableRowProps> = ({
  row,
  isSelected,
  onToggleSelect,
  onSave,
  onRemove,
  onCancelTask,
}) => {
  const processing = row.status === 'processing' || row.status === 'reading';
  const isError = row.status === 'error';
  const hasTask = !!row.taskRequestId;

  const isSynced = !processing && !isError && !row.hasChanges;
  const canSave = row.hasChanges && !processing && !hasTask;

  const saveLabel = processing
    ? row.progressMessage || '处理中'
    : isError
      ? '查看失败原因'
      : isSynced
        ? '已同步'
        : '保存';

  const saveIcon = processing
    ? Loading02Icon
    : isError
      ? Alert01Icon
      : isSynced
        ? CheckmarkCircle02Icon
        : SaveEnergy01Icon;

  const SaveIcon = saveIcon;

  return (
    <TooltipProvider delayDuration={250}>
      <tr className="group hover:bg-muted/30">
        {/* Checkbox — sticky left */}
        <td className="sticky left-0 z-10 w-10 min-w-10 shrink-0 border-b border-l border-r border-zinc-300 bg-card py-1.5 pr-1 pl-3 group-hover:bg-muted shadow-[2px_0_3px_-1px_rgba(0,0,0,0.08)]">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(row.id)}
            className="size-3.5 cursor-pointer rounded border-border text-primary"
          />
        </td>

        {/* File — relative width, min 200px */}
        <td className="w-50 min-w-50 border-b border-r border-zinc-300 py-1.5 pr-3 pl-3">
          <div className="flex min-w-0 items-center gap-1.5">
            <HugeIcon icon={File01Icon} size={12} className="shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="block w-full cursor-default">
                    <p className="text-ink truncate text-caption font-medium">{row.fileName}</p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className={cn('text-fine-print', TOOLTIP_CLASS)}>
                  <p>{row.fileName}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="block w-full cursor-help">
                    <p className="truncate text-fine-print text-muted-foreground">
                      {row.fileType}
                      {row.fileSize > 0 ? ` · ${formatFileSize(row.fileSize)}` : ''}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className={cn('text-fine-print max-w-xs break-all', TOOLTIP_CLASS)}
                >
                  <p>{row.filePath}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </td>

        {/* Author — always visible */}
        <td className="w-25 min-w-25 border-b border-r border-zinc-300 py-1.5 pr-2 pl-3 text-fine-print">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="block w-full cursor-default">
                <span className="text-ink-soft block truncate">{row.author}</span>
              </div>
            </TooltipTrigger>
            {row.author !== '-' ? (
              <TooltipContent side="top" className={cn('text-fine-print', TOOLTIP_CLASS)}>
                <p>{row.author}</p>
              </TooltipContent>
            ) : null}
          </Tooltip>
        </td>

        {/* LastModifiedBy — always visible */}
        <td className="w-25 min-w-25 border-b border-r border-zinc-300 py-1.5 pr-2 pl-3 text-fine-print">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="block w-full cursor-default">
                <span className="text-ink-soft block truncate">{row.lastModifiedBy}</span>
              </div>
            </TooltipTrigger>
            {row.lastModifiedBy !== '-' ? (
              <TooltipContent side="top" className={cn('text-fine-print', TOOLTIP_CLASS)}>
                <p>{row.lastModifiedBy}</p>
              </TooltipContent>
            ) : null}
          </Tooltip>
        </td>

        {/* Modified — always visible, relative time */}
        <td className="w-30 min-w-30 border-b border-r border-zinc-300 py-1.5 pr-2 pl-3 text-fine-print whitespace-nowrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="block w-full cursor-default">
                <span className="text-ink-soft">
                  {row.modified !== '-' ? formatRelativeTime(row.modified) : '-'}
                </span>
              </div>
            </TooltipTrigger>
            {row.modified !== '-' ? (
              <TooltipContent side="top" className={cn('text-fine-print', TOOLTIP_CLASS)}>
                <p>{formatFullTime(row.modified)}</p>
              </TooltipContent>
            ) : null}
          </Tooltip>
        </td>

        {/* Optional fields — scrollable area starts here */}
        <td className="w-25 min-w-25 border-b border-r border-zinc-300 py-1.5 pr-2 pl-3 text-fine-print">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="block w-full cursor-default">
                <span className="text-ink-soft block truncate">{row.appCompany}</span>
              </div>
            </TooltipTrigger>
            {row.appCompany !== '-' ? (
              <TooltipContent side="top" className={cn('text-fine-print', TOOLTIP_CLASS)}>
                <p>{row.appCompany}</p>
              </TooltipContent>
            ) : null}
          </Tooltip>
        </td>

        <td className="w-25 min-w-25 border-b border-r border-zinc-300 py-1.5 pr-2 pl-3 text-fine-print">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="block w-full cursor-default">
                <span className="text-ink-soft block truncate">{row.application}</span>
              </div>
            </TooltipTrigger>
            {row.application !== '-' ? (
              <TooltipContent side="top" className={cn('text-fine-print', TOOLTIP_CLASS)}>
                <p>{row.application}</p>
              </TooltipContent>
            ) : null}
          </Tooltip>
        </td>

        <td className="w-27.5 min-w-27.5 border-b border-r border-zinc-300 py-1.5 pr-3 pl-3 text-fine-print whitespace-nowrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="block w-full cursor-default">
                <span className="text-ink-soft">
                  {row.created !== '-' ? formatRelativeTime(row.created) : '-'}
                </span>
              </div>
            </TooltipTrigger>
            {row.created !== '-' ? (
              <TooltipContent side="top" className={cn('text-fine-print', TOOLTIP_CLASS)}>
                <p>{formatFullTime(row.created)}</p>
              </TooltipContent>
            ) : null}
          </Tooltip>
        </td>

        {/* Operations — sticky right */}
        <td className="sticky right-0 z-10 w-24 min-w-24 shrink-0 border-b border-l border-r border-zinc-300 bg-card py-1.5 pr-3 group-hover:bg-muted shadow-[-2px_0_3px_-1px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-end gap-1 whitespace-nowrap">
            {isError ? (
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="size-7 rounded-md p-0 text-red-600 hover:bg-red-500/10 hover:text-red-600"
                      >
                        <HugeIcon icon={SaveIcon} size={14} />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="left" className={cn('text-fine-print', TOOLTIP_CLASS)}>
                    {saveLabel}
                  </TooltipContent>
                </Tooltip>
                <PopoverContent side="left" align="start" className="w-72 p-3 text-fine-print">
                  <p className="mb-1.5 font-semibold text-red-600">处理失败：{row.fileName}</p>
                  <p className="break-all text-muted-foreground">{row.error || '未知错误'}</p>
                </PopoverContent>
              </Popover>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isSynced ? 'ghost' : 'default'}
                    size="icon-sm"
                    onClick={() => void onSave(row.id)}
                    disabled={!canSave && !processing}
                    className={cn(
                      'size-7 rounded-md p-0',
                      isSynced && 'text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600',
                      processing && 'cursor-default',
                    )}
                  >
                    <HugeIcon
                      icon={SaveIcon}
                      size={14}
                      className={cn(processing && 'animate-spin')}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className={cn('text-fine-print', TOOLTIP_CLASS)}>
                  {saveLabel}
                </TooltipContent>
              </Tooltip>
            )}

            {hasTask ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onCancelTask(row.id)}
                    className="size-7 rounded-md p-0 text-red-500 hover:bg-red-500/10 hover:text-red-500"
                  >
                    <HugeIcon icon={Cancel01Icon} size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className={cn('text-fine-print', TOOLTIP_CLASS)}>
                  取消任务
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRemove(row.id)}
                    disabled={processing}
                    className="size-7 rounded-md p-0 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                  >
                    <HugeIcon icon={Delete01Icon} size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className={cn('text-fine-print', TOOLTIP_CLASS)}>
                  从列表移除
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </td>
      </tr>
    </TooltipProvider>
  );
};
