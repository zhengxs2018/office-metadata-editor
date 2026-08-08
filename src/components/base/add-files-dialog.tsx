import React, { useState, useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { FileDropZone } from '@/components/base/file-drop-zone';
import { HugeIcon } from '@/components/icons/huge-icon';
import { CheckmarkCircle02Icon, FileAddIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

export type AddFilesMode = 'append' | 'overwrite';

interface AddFilesDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (paths: string[], mode: AddFilesMode) => void;
  /** 已存在的文件数量（用于决定默认模式） */
  existingFileCount: number;
}

export const AddFilesDialog: React.FC<AddFilesDialogProps> = ({
  open,
  onClose,
  onConfirm,
  existingFileCount,
}) => {
  // 关闭时不挂载内部 FileDropZone，避免其 useGlobalDragDrop 抢占模块级
  // dropHandlerRef，导致同页其他拖拽区收不到文件。
  if (!open) return null;

  const [mode, setMode] = useState<AddFilesMode>(existingFileCount === 0 ? 'overwrite' : 'append');
  const [collected, setCollected] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const handleFilesSelected = useCallback((paths: string[]) => {
    setCollected(paths);
  }, []);

  const handleConfirm = () => {
    if (collected.length === 0) {
      onClose();
      return;
    }
    onConfirm(collected, mode);
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      setCollected([]);
      setMode(existingFileCount === 0 ? 'overwrite' : 'append');
      onClose();
    }, 600);
  };

  const handleCancel = () => {
    if (confirmed) return;
    setCollected([]);
    onClose();
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4',
        open ? 'block' : 'hidden',
      )}
      onClick={handleCancel}
    >
      <div
        className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center gap-2">
          <HugeIcon icon={FileAddIcon} size={20} className="text-primary" />
          <h2 className="text-lg font-semibold text-foreground">添加文件</h2>
        </div>

        <FileDropZone
          onFilesSelected={handleFilesSelected}
          accept={['.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt', '.pdf']}
        />

        {collected.length > 0 && (
          <div className="mt-3 max-h-32 space-y-1 overflow-auto rounded-md bg-muted p-2 text-xs">
            {collected.map(path => (
              <div key={path} className="truncate text-muted-foreground">
                {path}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">添加方式</span>
          <button
            type="button"
            onClick={() => setMode('append')}
            className={cn(
              'rounded-md px-3 py-1 text-sm transition-colors',
              mode === 'append'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            追加
          </button>
          <button
            type="button"
            onClick={() => setMode('overwrite')}
            className={cn(
              'rounded-md px-3 py-1 text-sm transition-colors',
              mode === 'overwrite'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            覆盖
          </button>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={handleCancel} disabled={confirmed}>
            取消
          </Button>
          <Button onClick={handleConfirm} disabled={collected.length === 0 || confirmed}>
            {confirmed ? (
              <>
                <HugeIcon icon={CheckmarkCircle02Icon} size={16} className="mr-1.5" />
                已添加
              </>
            ) : (
              '确认添加'
            )}
          </Button>
        </div>

        {existingFileCount > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            当前已有 {existingFileCount} 个文件，追加模式将在其基础上增加。
          </p>
        )}
      </div>
    </div>
  );
};

export default AddFilesDialog;
