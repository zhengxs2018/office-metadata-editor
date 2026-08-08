import React, { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useMetadata } from '@/contexts/metadata-context';
import { resolveFieldLabel } from '@/lib/documents/export/utils';
import { open } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { HugeIcon } from '@/components/icons/huge-icon';
import { CheckCircle, Cancel01Icon } from '@hugeicons/core-free-icons';
import type { ExportFormat, ExportOptions, ExportResult, ExportFieldOption } from '@/types/export';
import { notifyExportSuccess } from '@/lib/configuration/reveal';

export type { ExportFieldOption } from '@/types/export';

interface ExportCenterProps {
  fileIds?: string[];
  availableFields?: ExportFieldOption[];
}

export const ExportCenter: React.FC<ExportCenterProps> = ({ fileIds = [], availableFields }) => {
  const { documents } = useMetadata();

  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeFields, setIncludeFields] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);

  const selectedDocs =
    fileIds.length > 0 ? documents.filter(d => fileIds.includes(d.id)) : documents;

  const resolvedFields: ExportFieldOption[] = (() => {
    if (availableFields && availableFields.length > 0) return availableFields;
    const fieldSet = new Set<string>();
    selectedDocs.forEach(doc => {
      Object.keys(doc.metadata.documentProperties).forEach(key => fieldSet.add(key));
      Object.keys(doc.metadata.appProperties).forEach(key => fieldSet.add(key));
    });
    return Array.from(fieldSet).map(key => ({ key, label: resolveFieldLabel(key) }));
  })();

  const toggleField = (field: string) => {
    setIncludeFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field],
    );
  };

  const handleExport = useCallback(async () => {
    if (documents.length === 0) {
      alert('没有可导出的文件');
      return;
    }

    setIsExporting(true);
    setExportResult(null);

    try {
      const outputDir = await open({ title: '选择导出目录', directory: true, multiple: false });
      const extension = format === 'excel' ? 'csv' : format;
      const filePath =
        typeof outputDir === 'string'
          ? `${outputDir}/metadata-export-${Date.now()}.${extension}`
          : null;

      if (!filePath) {
        setIsExporting(false);
        return;
      }

      const options: ExportOptions = {
        format,
        includeFields: includeFields.length > 0 ? includeFields : undefined,
        outputDir: filePath.substring(0, filePath.lastIndexOf('/')),
        fileName: filePath.split('/').pop() || 'export',
        prettyPrint: format === 'json',
      };

      const normalizedData = selectedDocs.map(doc => {
        const base: Record<string, unknown> = {
          filePath: doc.filePath,
          fileName: doc.metadata.fileName,
          fileType: doc.metadata.fileType,
        };

        const source = doc.metadata.documentProperties as unknown as Record<string, unknown>;
        const fields =
          options.includeFields && options.includeFields.length > 0
            ? options.includeFields
            : Object.keys(source);

        fields.forEach(field => {
          base[field] = source[field] ?? '';
        });

        return base;
      });

      let content = '';
      if (format === 'json') {
        content = JSON.stringify(normalizedData, null, options.prettyPrint ? 2 : 0);
      } else if (format === 'xml') {
        const items = normalizedData
          .map(row => {
            const body = Object.entries(row)
              .map(
                ([k, v]) =>
                  `<${k}>${String(v ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')}</${k}>`,
              )
              .join('');
            return `<item>${body}</item>`;
          })
          .join('');
        content = `<?xml version="1.0" encoding="UTF-8"?><metadata>${items}</metadata>`;
      } else {
        const headers = Object.keys(normalizedData[0] || {});
        const rows = normalizedData.map(row =>
          headers.map(h => `"${String(row[h] ?? '').replaceAll('"', '""')}"`).join(','),
        );
        content = [headers.join(','), ...rows].join('\n');
      }

      await writeTextFile(filePath, content);

      const result: ExportResult = {
        success: true,
        outputPath: filePath,
        exportedCount: selectedDocs.length,
      };

      setExportResult(result);

      if (result.success) {
        await notifyExportSuccess(filePath, `已导出 ${result.exportedCount} 个文件的元数据`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error('导出失败', { description: message });
    } finally {
      setIsExporting(false);
    }
  }, [documents, fileIds, format, includeFields]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-xl font-semibold text-foreground">导出中心</h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="grid min-h-0 grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="min-h-0 space-y-6">
            <div>
              <label className="mb-3 block text-sm font-medium text-foreground">导出格式</label>
              <div className="grid grid-cols-2 gap-3">
                {(['json', 'excel', 'csv', 'xml'] as ExportFormat[]).map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setFormat(fmt)}
                    className={`rounded-lg border p-4 text-center transition-all ${
                      format === fmt
                        ? 'border-primary bg-primary/8'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="text-lg font-semibold text-foreground uppercase">{fmt}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {fmt === 'json' && 'JSON 格式'}
                      {fmt === 'excel' && 'Excel 表格'}
                      {fmt === 'csv' && '逗号分隔值'}
                      {fmt === 'xml' && 'XML 文档'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-3 block text-sm font-medium text-foreground">
                导出字段
                <span className="ml-2 text-xs text-muted-foreground">(不选则导出全部)</span>
              </label>
              <div className="max-h-65 overflow-y-auto rounded-lg border border-border p-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {resolvedFields.map(field => (
                    <label
                      key={field.key}
                      className="flex items-center gap-2 rounded border border-border p-2 hover:bg-accent/50"
                    >
                      <input
                        type="checkbox"
                        checked={includeFields.includes(field.key)}
                        onChange={() => toggleField(field.key)}
                        className="rounded border-border text-primary"
                      />
                      <span className="text-sm text-foreground">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">导出范围</label>
              <div className="rounded-lg border border-border bg-background/60 p-3">
                <div className="text-sm text-muted-foreground">
                  {fileIds.length > 0
                    ? `已选择 ${fileIds.length} 个文件`
                    : `全部 ${documents.length} 个文件`}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {isExporting ? '导出中...' : '开始导出'}
              </button>
            </div>
          </div>

          <div className="min-h-0 space-y-6">
            {exportResult && (
              <div
                className={`rounded-lg border p-4 ${
                  exportResult.success
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                    : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                }`}
              >
                <div className="flex items-start gap-3">
                  {exportResult.success ? (
                    <HugeIcon
                      icon={CheckCircle}
                      size={24}
                      className="shrink-0 text-emerald-600 dark:text-emerald-400"
                    />
                  ) : (
                    <HugeIcon
                      icon={Cancel01Icon}
                      size={24}
                      className="shrink-0 text-red-600 dark:text-red-400"
                    />
                  )}
                  <div className="flex-1">
                    <h4
                      className={`font-medium ${
                        exportResult.success ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {exportResult.success ? '导出成功' : '导出失败'}
                    </h4>
                    {exportResult.success && (
                      <>
                        <p className="mt-1 text-sm text-emerald-700">
                          成功导出 {exportResult.exportedCount} 个文件的元数据
                        </p>
                        {exportResult.outputPath && (
                          <p className="mt-2 text-xs break-all text-emerald-700">
                            {exportResult.outputPath}
                          </p>
                        )}
                      </>
                    )}
                    {!exportResult.success && (
                      <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                        请检查文件格式和权限后重试
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <h4 className="mb-2 text-sm font-medium text-foreground">使用提示</h4>
              <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                <li>JSON 格式适合程序处理和备份</li>
                <li>Excel 格式适合人工查看和编辑</li>
                <li>CSV 格式适合导入到其他系统</li>
                <li>XML 格式适合企业级数据交换</li>
                <li>可选择特定字段进行精简导出</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportCenter;
