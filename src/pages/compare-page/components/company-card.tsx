import React, { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { HugeIcon } from '@/components/icons/huge-icon';
import {
  AlertCircleIcon,
  Building01Icon,
  FileSpreadsheetIcon,
  File01Icon,
  Loading02Icon,
  Delete01Icon,
} from '@hugeicons/core-free-icons';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useFileContext, type CompanyEntry } from '@/contexts/file-context';
import { useMetadata, type LoadedDocument } from '@/contexts/metadata-context';
import type { DirectoryScanResult } from '@/types/scan';

const ACCEPT_EXTS = ['docx', 'doc', 'xlsx', 'pdf'];
const ACCEPT_FILTERS = [{ name: 'Office 文档', extensions: ACCEPT_EXTS }];

function iconForExt(path: string) {
  return path.toLowerCase().endsWith('.xlsx') ? FileSpreadsheetIcon : File01Icon;
}

function basename(path: string): string {
  const seg = path.replace(/\\/g, '/').split('/').filter(Boolean);
  return seg[seg.length - 1] ?? path;
}

export interface CompanyCardProps {
  company: CompanyEntry;
  index: number;
}

export const CompanyCard: React.FC<CompanyCardProps> = ({ company, index }) => {
  const { addFilesByPaths, removeFile, removeCompany, files: ctxFiles } = useFileContext();
  const { documents } = useMetadata();
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const slotDocs: LoadedDocument[] = documents.filter(d => d.companyId === company.id);
  const totalFiles = slotDocs.length;
  const readyFiles = slotDocs.filter(d => d.status === 'ready').length;

  const colors = [
    'border-sky-300/60 bg-sky-50/30',
    'border-orange-300/60 bg-orange-50/30',
    'border-emerald-300/60 bg-emerald-50/30',
    'border-violet-300/60 bg-violet-50/30',
    'border-rose-300/60 bg-rose-50/30',
    'border-amber-300/60 bg-amber-50/30',
  ];
  const borderColor = colors[index % colors.length];

  async function handleAddFiles() {
    setHint(null);
    setBusy(true);
    try {
      const result = await open({ multiple: true, filters: ACCEPT_FILTERS });
      if (result == null) {
        setBusy(false);
        return;
      }
      const paths = Array.isArray(result) ? result : [result];
      if (paths.length === 0) {
        setBusy(false);
        return;
      }
      for (const p of paths) {
        const lower = p.toLowerCase();
        if (ACCEPT_EXTS.some(ext => lower.endsWith('.' + ext))) {
          if (!ctxFiles.some(f => f.filePath === p)) {
            addFilesByPaths([p], company.id);
          }
          continue;
        }
        try {
          const result = await invoke<DirectoryScanResult>('scan_directory', {
            path: p,
            options: { recursive: true, extensions: ACCEPT_EXTS },
          });
          const listed = result.files.map(f => f.path);
          const dedup = listed.filter(fp => !ctxFiles.some(f => f.filePath === fp));
          addFilesByPaths(dedup, company.id);
        } catch {
          setHint('扫描目录失败');
        }
      }
    } catch (err) {
      console.warn('addFiles failed', err);
      setHint('选择文件失败');
    } finally {
      setBusy(false);
    }
  }

  function handleClear() {
    for (const d of slotDocs) removeFile(d.id);
    removeCompany(company.id);
    setHint(null);
  }

  return (
    <div
      className={cn(
        'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border-2 transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md',
        borderColor,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <HugeIcon icon={Building01Icon} size={16} />
          <h3 className="text-ink truncate text-caption font-semibold" title={company.name}>
            {company.name || '未命名公司'}
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="移除该公司"
          onClick={handleClear}
          className="shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
        >
          <HugeIcon icon={Delete01Icon} size={14} />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
        {busy ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <HugeIcon
              icon={Loading02Icon}
              size={32}
              className="animate-spin text-muted-foreground"
            />
          </div>
        ) : slotDocs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
            <p className="text-fine-print text-muted-foreground">暂无文件</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddFiles}
              className="h-7 rounded-md text-fine-print"
            >
              添加文件
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 pb-2">
              <span className="text-fine-print text-muted-foreground tabular-nums">
                {readyFiles}/{totalFiles} 已加载
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddFiles}
                className="h-7 gap-1 rounded-md text-fine-print"
              >
                追加文件
              </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1">
              <ul className="stagger space-y-0.5" style={{ ['--md-stagger' as string]: 22 }}>
                {slotDocs.map((doc, i) => {
                  const Icon = iconForExt(doc.filePath);
                  const isReady = doc.status === 'ready';
                  const isError = doc.status === 'error';
                  return (
                    <li key={doc.id} style={{ ['--md-index' as string]: i }}>
                      <div
                        className={cn(
                          'flex items-center gap-2 rounded-lg px-2 py-1 text-fine-print',
                          !isReady && !isError && 'opacity-60',
                        )}
                        title={doc.filePath}
                      >
                        <HugeIcon icon={Icon} size={14} />
                        <span className="min-w-0 flex-1 truncate">
                          {doc.metadata.fileName || basename(doc.filePath)}
                        </span>
                        <span className="shrink-0 text-micro-legal text-muted-foreground">
                          {isReady ? '就绪' : isError ? '失败' : doc.progressMessage || '读取中'}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </>
        )}

        {hint ? (
          <p className="mt-2 inline-flex animate-fade-in items-center gap-1 text-fine-print text-warning-foreground">
            <HugeIcon icon={AlertCircleIcon} size={12} />
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default CompanyCard;
