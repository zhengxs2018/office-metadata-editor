import { useCallback, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { HugeIcon } from '@/components/icons/huge-icon';
import { FolderOpenIcon, Loading02Icon, Upload01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useGlobalDragDrop } from '@/hooks/use-global-drag-drop';
import type { DirectoryScanResult } from '@/types/scan';

const DEFAULT_ACCEPT = ['docx', 'doc', 'xlsx', 'pptx', 'pdf'];

async function scanFolder(dir: string, extensions: string[]): Promise<string[]> {
  try {
    const result = await invoke<DirectoryScanResult>('scan_directory', {
      path: dir,
      options: { recursive: true, extensions },
    });
    return result.files.map(f => f.path);
  } catch {
    return [];
  }
}

export interface FileDropZoneProps {
  /** 用户选择或拖拽了文件路径后的回调 */
  onFilesSelected: (paths: string[]) => void | Promise<void>;
  /** 接受的扩展名列表 @default ["docx","doc","xlsx","pptx","pdf"] */
  accept?: string[];
  /** 外部繁忙状态 */
  busy?: boolean;
  /** 外部提示信息 */
  hint?: string | null;
  className?: string;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  accept = DEFAULT_ACCEPT,
  busy: externalBusy,
  hint: externalHint,
  className,
}) => {
  const [internalBusy, setInternalBusy] = useState(false);
  const [internalHint, setInternalHint] = useState<string | null>(null);
  const [hovering, setHovering] = useState(false);
  const zoneRef = useRef<HTMLDivElement | null>(null);

  const extensions = Array.isArray(accept) ? accept : DEFAULT_ACCEPT;

  const busy = externalBusy ?? internalBusy;
  const hint = externalHint ?? internalHint;

  const isInsideZone = useCallback((position: { x: number; y: number } | null) => {
    if (!position) return false;
    const el = zoneRef.current;
    if (!el) return false;
    const dpr = window.devicePixelRatio || 1;
    const x = position.x / dpr;
    const y = position.y / dpr;
    const hit = document.elementFromPoint(x, y);
    if (!hit) return false;
    return el.contains(hit) || hit === el;
  }, []);

  const ingestPaths = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return;
      setInternalBusy(true);
      setInternalHint(null);

      const extSet = new Set(extensions.map(e => e.toLowerCase()));
      const collected: string[] = [];

      for (const p of paths) {
        const lower = p.toLowerCase();
        const ext = lower.split('.').pop() ?? '';
        if (extSet.has(ext)) {
          collected.push(p);
          continue;
        }
        // not a supported file → try as directory
        const listed = await scanFolder(p, extensions);
        collected.push(...listed);
      }

      if (collected.length === 0) {
        setInternalHint('未找到支持的文件（PDF / XLSX / DOCX / PPTX）');
        setInternalBusy(false);
        return;
      }

      await onFilesSelected(collected);
      setInternalBusy(false);
    },
    [extensions, onFilesSelected],
  );

  const handleHover = useCallback(
    (isHovering: boolean, position: { x: number; y: number } | null) => {
      if (isHovering) {
        if (isInsideZone(position)) setHovering(true);
      } else {
        if (!position || !isInsideZone(position)) setHovering(false);
      }
    },
    [isInsideZone],
  );

  useGlobalDragDrop(ingestPaths, handleHover);

  const handlePickFiles = useCallback(async () => {
    setInternalHint(null);
    setInternalBusy(true);
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: '支持的文档', extensions: extensions }],
      });
      if (!selected) {
        setInternalBusy(false);
        return;
      }
      const paths = Array.isArray(selected) ? selected : [selected];
      await ingestPaths(paths);
    } catch {
      setInternalHint('选择文件失败');
      setInternalBusy(false);
    }
  }, [extensions, ingestPaths]);

  const handleZoneClick = () => {
    if (busy) return;
    handlePickFiles();
  };

  return (
    <div
      ref={zoneRef}
      onClick={handleZoneClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleZoneClick();
        }
      }}
      className={cn(
        'flex min-h-0 min-w-0 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-all',
        'cursor-pointer border-primary/30 bg-primary/3 hover:bg-primary/5',
        hovering && 'border-primary/60 bg-primary/6 ring-4 ring-primary/20',
        busy && 'cursor-default',
        className,
      )}
    >
      {busy ? (
        <div className="animate-fade-in flex flex-col items-center gap-3">
          <HugeIcon icon={Loading02Icon} size={28} className="animate-spin text-muted-foreground" />
          <p className="text-fine-print text-muted-foreground">正在解析文件…</p>
        </div>
      ) : (
        <>
          <div
            className={cn(
              'flex size-12 items-center justify-center rounded-2xl transition-colors',
              hovering ? 'bg-primary/15 text-primary' : 'bg-muted/60 text-muted-foreground',
            )}
          >
            <HugeIcon icon={hovering ? Upload01Icon : FolderOpenIcon} size={22} />
          </div>
          <div className="space-y-1">
            <p className={cn('text-caption font-medium title-text')}>
              {hovering ? '松开以导入文件' : '点击或拖拽文件/文件夹至此处'}
            </p>
            <p className={cn('text-fine-print aux-text')}>
              支持 {extensions.map(e => e.toUpperCase()).join(' / ')}
            </p>
          </div>
        </>
      )}
      {hint ? (
        <p className="animate-fade-in text-fine-print text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
};

export default FileDropZone;
