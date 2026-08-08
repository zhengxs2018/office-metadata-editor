import React, { useCallback, useMemo, useState } from 'react';
import { FileSpreadsheetIcon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import { invoke } from '@tauri-apps/api/core';
import { save } from '@tauri-apps/plugin-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { HugeIcon } from '@/components/icons/huge-icon';
import { Button } from '@/components/ui/button';
import {
  buildCompareWorkbookBase64,
  buildCompareWorkbookFileName,
} from '@/lib/documents/compare/export';
import {
  DEFAULT_FILTER_STATE,
  collectDiffFields,
  findGroupOfFinding,
  findingsOfGroup,
  selectFindingClusters,
  selectGroups,
  type CompareFilterState,
  type FindingCluster,
} from '@/lib/documents/compare/selectors';
import type { CompareResult } from '@/lib/documents/compare/types';
import { notifyExportSuccess } from '@/lib/configuration/reveal';

import { ReportSection } from './report-section';
import { CompareSummary } from './compare-summary';
import { CompareToolbar } from './compare-toolbar';
import { AlignmentMatrix } from './alignment-matrix';
import { FieldDiffPanel } from './field-diff-panel';
import { FindingsList } from './findings-list';
import { UnmatchedPanel } from './unmatched-panel';
import { FileMetaTable } from './file-meta-table';

interface CompareWorkbenchProps {
  result: CompareResult;
  /** docId -> 文件系统路径，用于文件表中定位文件 */
  docPaths: Record<string, string>;
}

export const CompareWorkbench: React.FC<CompareWorkbenchProps> = ({ result, docPaths }) => {
  const [filterState, setFilterState] = useState<CompareFilterState>(DEFAULT_FILTER_STATE);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const groups = useMemo(() => selectGroups(result, filterState), [result, filterState]);
  const clusters = useMemo(() => selectFindingClusters(result, filterState), [result, filterState]);
  const diffFields = useMemo(() => collectDiffFields(result), [result]);

  const activeGroupId = useMemo(() => {
    if (selectedGroupId && groups.some(group => group.groupId === selectedGroupId)) {
      return selectedGroupId;
    }
    return groups[0]?.groupId ?? null;
  }, [selectedGroupId, groups]);

  const activeGroup = useMemo(
    () => groups.find(group => group.groupId === activeGroupId) ?? null,
    [groups, activeGroupId],
  );

  const activeGroupFindings = useMemo(
    () => (activeGroupId ? findingsOfGroup(result, activeGroupId) : []),
    [result, activeGroupId],
  );

  const handleLocate = useCallback(
    (cluster: FindingCluster) => {
      const representative = cluster.underlying[0];
      if (!representative) return;
      const group = findGroupOfFinding(result, representative);
      if (group) setSelectedGroupId(group.groupId);
    },
    [result],
  );

  const handleExport = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const generatedAt = new Date();
      const base64 = buildCompareWorkbookBase64(result, generatedAt);
      const target = await save({
        defaultPath: buildCompareWorkbookFileName(generatedAt),
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
      console.error('导出对比报告失败:', error);
      toast.error('导出失败', { description: message });
    } finally {
      setExporting(false);
    }
  }, [exporting, result]);

  const hasResult = result.stats.fileCount > 0;
  const hasGroups = groups.length > 0;
  const hasRisk = result.stats.highCount > 0 || result.stats.mediumCount > 0;

  // 已在线索来源文件列表中出现过的 docId → 未匹配区应排除，避免重复呈现。
  const findingDocIds = useMemo(() => {
    const ids = new Set<string>();
    for (const cluster of clusters) {
      for (const file of cluster.files) ids.add(file.docId);
    }
    return ids;
  }, [clusters]);

  const unmatchedFiltered = useMemo(
    () => result.unmatched.filter(u => !findingDocIds.has(u.docId)),
    [result.unmatched, findingDocIds],
  );

  return (
    <div className="mx-auto w-full animate-fade-in-up px-4 py-4 sm:px-6">
      <ReportSection
        title="执行摘要"
        index="01"
        hint={`${result.stats.fileCount} 个文件`}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={handleExport}
            disabled={exporting || !hasResult}
            className="gap-1.5 rounded-lg"
          >
            <HugeIcon icon={FileSpreadsheetIcon} size={14} />
            {exporting ? '导出中…' : '导出 Excel'}
          </Button>
        }
      >
        <CompareSummary result={result} />
      </ReportSection>

      <ReportSection title="文件元数据" index="02" hint={`${result.files.length} 个文件`}>
        <div className="rounded-md border border-border/50 overflow-hidden">
          <FileMetaTable files={result.files} findingDocIds={findingDocIds} filePaths={docPaths} />
        </div>
      </ReportSection>

      {hasGroups ? (
        <ReportSection title="对齐矩阵" index="03" hint="点击任一行查看逐字段差异">
          <div className="space-y-2.5">
            <CompareToolbar
              state={filterState}
              onChange={setFilterState}
              companies={result.companies}
              fields={diffFields}
              groupCount={groups.length}
              totalGroups={result.groups.length}
            />
            <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <AlignmentMatrix
                groups={groups}
                companies={result.companies}
                selectedGroupId={activeGroupId}
                onSelect={setSelectedGroupId}
              />
              <FieldDiffPanel
                group={activeGroup}
                companies={result.companies}
                findings={activeGroupFindings}
              />
            </div>
          </div>
        </ReportSection>
      ) : null}

      <ReportSection
        title="线索清单"
        index={hasGroups ? '04' : '03'}
        hint={`共 ${clusters.length} 条线索`}
      >
        <FindingsList
          clusters={clusters}
          companies={result.companies}
          activeGroupId={activeGroupId}
          onLocate={handleLocate}
          positive={!hasRisk}
        />

        {hasRisk ? (
          <p className="mt-4 select-none inline-flex items-center gap-1.5 py-2 text-fine-print leading-relaxed text-amber-800">
            <HugeIcon icon={FileSpreadsheetIcon} size={14} className="shrink-0" />
            检测到需要留意的关联线索，建议点击右上角「导出
            Excel」保存完整报告（含逐文件元数据与差异明细）以便复核归档。
          </p>
        ) : null}
      </ReportSection>

      <ReportSection
        title="未匹配文件"
        index={hasGroups ? '05' : '04'}
        hint={`${unmatchedFiltered.length} 个`}
      >
        <UnmatchedPanel items={unmatchedFiltered} companies={result.companies} />
        <p className="mt-4 text-fine-print leading-relaxed text-muted-foreground">
          这些是名称与其他公司文件均不相同、未被纳入「对齐矩阵」逐一比对的文件。
        </p>
        <p className="mt-1 text-fine-print leading-relaxed text-muted-foreground">
          它们未必有问题，但无法自动判定是否与其他文件同源，建议人工复核其来源。
        </p>
      </ReportSection>

      <hr className="my-4" />

      <div className="rounded-md border border-border/50 bg-muted/30 px-2.5 py-2.5 text-fine-print leading-relaxed text-muted-foreground">
        <div className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground/80">
          <HugeIcon icon={InformationCircleIcon} size={13} className="shrink-0" />
          免责声明
        </div>
        {result.disclaimer.split('\n').map((line, idx) => (
          <p
            key={idx}
            className={cn('whitespace-pre-wrap', line.trim() === '' ? 'h-1.5' : 'mb-1.5 last:mb-0')}
          >
            {line}
          </p>
        ))}
      </div>
    </div>
  );
};
