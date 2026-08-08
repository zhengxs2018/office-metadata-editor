import React, { useCallback, useMemo, useState } from 'react';
import { FileSpreadsheetIcon } from '@hugeicons/core-free-icons';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { toast } from 'sonner';

import { HugeIcon } from '@/components/icons/huge-icon';
import { Button } from '@/components/ui/button';
import type { LoadedDocument } from '@/contexts/metadata-context';

import { ReportSection } from '@/pages/compare-page/components/report-section';
import { HiddenAuthorPanel } from './hidden-author-panel';
import {
  buildHiddenWorkbookBase64,
  buildHiddenWorkbookFileName,
} from '@/lib/documents/hidden/export';
import { buildStats, buildTraceRows, collectAuthors } from '@/lib/documents/hidden/selectors';
import { notifyExportSuccess } from '@/lib/configuration/reveal';
import { HiddenSummary } from './hidden-summary';
import { HiddenTraceList } from './hidden-trace-list';

interface HiddenWorkbenchProps {
  documents: LoadedDocument[];
}

export const HiddenWorkbench: React.FC<HiddenWorkbenchProps> = ({ documents }) => {
  const [exporting, setExporting] = useState(false);

  const rows = useMemo(() => buildTraceRows(documents), [documents]);
  const stats = useMemo(() => buildStats(rows), [rows]);
  const authors = useMemo(() => collectAuthors(rows), [rows]);

  const hasRisk = stats.flaggedCount > 0;
  const cleanRows = useMemo(() => rows.filter(row => !row.hasTrace), [rows]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const generatedAt = new Date();
      const base64 = buildHiddenWorkbookBase64(rows, stats, authors, generatedAt);
      const target = await save({
        defaultPath: buildHiddenWorkbookFileName(generatedAt),
        filters: [{ name: 'Excel 工作簿', extensions: ['xlsx'] }],
      });
      if (!target) return;
      await invoke('write_binary_file', {
        filePath: target,
        base64Data: base64,
      });
      await notifyExportSuccess(target);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('导出隐藏信息报告失败:', error);
      toast.error('导出失败', { description: message });
    } finally {
      setExporting(false);
    }
  }, [exporting, rows, stats, authors]);

  return (
    <>
      <ReportSection
        index="01"
        title="扫描概要"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleExport()}
            disabled={exporting}
          >
            <HugeIcon icon={FileSpreadsheetIcon} size={14} className="mr-1.5" />
            {exporting ? '导出中…' : '导出 Excel'}
          </Button>
        }
      >
        <HiddenSummary stats={stats} needExport={hasRisk} />
      </ReportSection>

      <ReportSection
        index="02"
        title="隐藏痕迹清单"
        hint={hasRisk ? `${stats.flaggedCount} 个文件存在痕迹，点击展开详情` : '未检出痕迹'}
      >
        <HiddenTraceList rows={rows} />
      </ReportSection>

      {authors.length > 0 ? (
        <ReportSection
          index="03"
          title="作者汇总"
          hint={`${authors.length} 个不同身份，点击展开涉及文件`}
        >
          <p className="text-fine-print mb-2 text-muted-foreground">
            按人名归并全部批注作者、修订作者与 XMP 创建者，便于快速判断文件是否出自同一编辑者。
          </p>
          <HiddenAuthorPanel authors={authors} />
        </ReportSection>
      ) : null}

      {cleanRows.length > 0 ? (
        <ReportSection
          index={authors.length > 0 ? '04' : '03'}
          title="未检出痕迹的文件"
          hint={`${cleanRows.length} 个`}
        >
          <p className="text-fine-print mb-2 text-muted-foreground">
            以下文件未在批注、修订与 XMP 元数据中发现作者信息，可正常对外分发。
          </p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {cleanRows.map(row => (
              <li
                key={row.id}
                className="text-fine-print truncate rounded-md border border-border/40 bg-background/60 px-3 py-1.5 text-muted-foreground"
                title={row.filePath}
              >
                {row.fileName}
              </li>
            ))}
          </ul>
        </ReportSection>
      ) : null}
    </>
  );
};
