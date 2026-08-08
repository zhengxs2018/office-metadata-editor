import { useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileTypeIcon } from '@/components/base/file-type-icon';
import type { FileMetaSnapshot } from '@/lib/documents/compare/types';
import { revealFileInFolder } from '@/lib/configuration/reveal';
import { toast } from 'sonner';

interface FileMetaTableProps {
  files: FileMetaSnapshot[];
  findingDocIds: Set<string>;
  /** docId -> 文件系统路径，用于点击在文件管理器中定位 */
  filePaths?: Record<string, string>;
}

/** CSS 截断 + Tooltip 显示完整内容（纯 CSS，无 JS 长度判断） */
const TruncatedCell: React.FC<{ value: string }> = ({ value }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="block truncate whitespace-nowrap">{value}</span>
    </TooltipTrigger>
    <TooltipContent side="top" className="text-xs max-w-md">
      {value}
    </TooltipContent>
  </Tooltip>
);

export const FileMetaTable: React.FC<FileMetaTableProps> = ({
  files,
  findingDocIds,
  filePaths,
}) => {
  const [locatingId, setLocatingId] = useState<string | null>(null);

  const handleLocate = (docId: string) => {
    const path = filePaths?.[docId];
    if (!path) {
      toast.error('无法定位文件', { description: '缺少文件路径信息' });
      return;
    }
    setLocatingId(docId);
    void revealFileInFolder(path).finally(() => setLocatingId(null));
  };

  return (
    <div className="max-h-[520px] overflow-auto">
      <Table className="w-full min-w-[760px]">
        <TableHeader className="sticky top-0 z-10 bg-canvas">
          <TableRow>
            <TableHead className="h-8 px-2 w-35 max-w-35 overflow-hidden">公司</TableHead>
            <TableHead className="h-8 px-2 min-w-50">文件</TableHead>
            <TableHead className="h-8 px-2 w-27.5 max-w-27.5 overflow-hidden">作者</TableHead>
            <TableHead className="h-8 px-2 w-32.5 max-w-32.5 overflow-hidden">最后修改者</TableHead>
            <TableHead className="h-8 px-2 w-30 max-w-30 overflow-hidden">组织名</TableHead>
            <TableHead className="h-8 px-2 w-40 max-w-40 overflow-hidden">程序</TableHead>
            <TableHead className="h-8 px-2 w-16 text-right">状态</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {files.map(file => {
            const isRisk = findingDocIds.has(file.docId) || file.hasHiddenMarkers;
            const path = filePaths?.[file.docId];
            const isLocating = locatingId === file.docId;

            return (
              <TableRow key={file.docId}>
                <TableCell className="px-2 py-1.5 text-xs text-muted-foreground whitespace-nowrap max-w-35 overflow-hidden">
                  <TruncatedCell value={file.companyName} />
                </TableCell>
                <TableCell className="px-2 py-1.5 text-xs min-w-0 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleLocate(file.docId)}
                    disabled={!path || isLocating}
                    title={path ? '在文件管理器中定位' : undefined}
                    className="inline-flex items-center gap-1.5 text-left hover:text-primary disabled:cursor-default disabled:hover:text-inherit min-w-0 max-w-full overflow-hidden"
                  >
                    <FileTypeIcon
                      extension={file.fileName.split('.').pop() ?? ''}
                      className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    />
                    <TruncatedCell value={file.fileName} />
                  </button>
                </TableCell>
                <TableCell className="px-2 py-1.5 text-xs whitespace-nowrap max-w-27.5 overflow-hidden">
                  <TruncatedCell value={file.creator || '-'} />
                </TableCell>
                <TableCell className="px-2 py-1.5 text-xs whitespace-nowrap max-w-32.5 overflow-hidden">
                  <TruncatedCell value={file.lastModifiedBy || '-'} />
                </TableCell>
                <TableCell className="px-2 py-1.5 text-xs whitespace-nowrap max-w-30 overflow-hidden">
                  <TruncatedCell value={file.manager || '-'} />
                </TableCell>
                <TableCell className="px-2 py-1.5 text-xs whitespace-nowrap max-w-40 overflow-hidden">
                  <TruncatedCell value={file.application || '-'} />
                </TableCell>
                <TableCell className="px-2 py-1.5 text-right whitespace-nowrap w-16">
                  <Badge
                    variant={isRisk ? 'destructive' : 'secondary'}
                    className="text-[10px] px-1.5 py-0"
                  >
                    {isRisk ? '风险' : '正常'}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
