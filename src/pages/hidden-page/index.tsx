import React, { useCallback, useMemo, useState } from 'react';
import { Delete02Icon, FileAddIcon, ScanEyeIcon } from '@hugeicons/core-free-icons';

import { FileDropZone } from '@/components/base/file-drop-zone';
import { HugeIcon } from '@/components/icons/huge-icon';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useFileContext } from '@/contexts/file-context';
import { useMetadata } from '@/contexts/metadata-context';
import { PageLayout } from '@/layouts/page-layout';
import { cn } from '@/lib/utils';
import { AddFilesDialog } from '@/components/base/add-files-dialog';
import { ROUTES } from '@/router/paths';

import { HiddenWorkbench } from './components/hidden-workbench';

export const HiddenPage: React.FC = () => {
  const { addFilesByPaths, clearFiles } = useFileContext();
  const { documents } = useMetadata();

  const [showAddDialog, setShowAddDialog] = useState(false);

  const readyDocs = useMemo(() => documents.filter(item => item.status === 'ready'), [documents]);

  const parsing = documents.length > 0 && readyDocs.length < documents.length;
  const hasFiles = documents.length > 0;

  const handleDropZoneFiles = useCallback(
    (paths: string[]) => {
      clearFiles();
      addFilesByPaths(paths);
    },
    [addFilesByPaths, clearFiles],
  );

  const handleAddFilesConfirm = useCallback(
    (paths: string[], mode: 'append' | 'overwrite') => {
      if (mode === 'overwrite') clearFiles();
      addFilesByPaths(paths);
      setShowAddDialog(false);
    },
    [addFilesByPaths, clearFiles],
  );

  const headerContent = (
    <div className="flex min-w-0 items-center gap-2">
      <HugeIcon icon={ScanEyeIcon} size={16} className={cn('shrink-0 text-success')} />
      <p className={cn('truncate font-heading text-base font-semibold title-text')}>隐藏信息提取</p>
    </div>
  );

  const headerActions = hasFiles ? (
    <div className="flex items-center gap-2">
      <Button
        variant="default"
        size="sm"
        onClick={() => setShowAddDialog(true)}
        className="gap-1.5 rounded-lg"
      >
        <HugeIcon icon={FileAddIcon} size={14} />
        添加文件
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => clearFiles()}
        className="gap-1.5 rounded-lg"
      >
        <HugeIcon icon={Delete02Icon} size={14} />
        清空
      </Button>
    </div>
  ) : undefined;

  return (
    <TooltipProvider delayDuration={150}>
      <PageLayout backTo={ROUTES.home} header={headerContent} actions={headerActions}>
        <div className="flex min-h-0 flex-1 flex-col">
          {hasFiles ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              {parsing ? (
                <p className="text-fine-print mb-4 text-muted-foreground">
                  正在解析 {documents.length - readyDocs.length} 个文件…
                </p>
              ) : null}
              <HiddenWorkbench documents={readyDocs} />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              <p className="text-fine-print text-muted-foreground">
                批量提取文档中的批注作者、修订痕迹与内嵌元数据（如 XMP
                创作者），用于判断文件的编辑来源与是否存在身份泄露。
              </p>
              <FileDropZone onFilesSelected={handleDropZoneFiles} className="flex-1" />
            </div>
          )}
        </div>

        <AddFilesDialog
          open={showAddDialog}
          onClose={() => setShowAddDialog(false)}
          onConfirm={handleAddFilesConfirm}
          existingFileCount={documents.length}
        />
      </PageLayout>
    </TooltipProvider>
  );
};

export default HiddenPage;
