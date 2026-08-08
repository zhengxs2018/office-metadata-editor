import React from 'react';

import { FileTypeIcon } from '@/components/base/file-type-icon';
import { PageLayout } from '@/layouts/page-layout';
import { formatFileSize } from '@/lib/utils';
import { useMetadata } from '@/contexts/metadata-context';
import { ROUTES } from '@/router/paths';

export interface EditorLayoutProps {
  showSidebarTrigger?: boolean;
  actions?: React.ReactNode;
  sidebar?: React.ReactNode;
}

export const EditorLayout: React.FC<React.PropsWithChildren<EditorLayoutProps>> = ({
  showSidebarTrigger,
  children,
  actions,
  sidebar,
}) => {
  const { metadata } = useMetadata();
  const fileType = metadata?.fileType ?? '';
  const fileName = metadata?.fileName ?? '';
  const fileSize = metadata?.fileSize ?? 0;

  return (
    <PageLayout
      backTo={ROUTES.home}
      bleed
      showSidebarTrigger={showSidebarTrigger}
      actions={actions}
      sidebar={sidebar}
      header={
        <div className="flex min-w-0 items-center gap-2">
          <FileTypeIcon extension={fileType} />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-caption font-medium text-foreground">{fileName}</span>
            <span className="text-fine-print text-muted-foreground">
              {formatFileSize(fileSize)}
            </span>
          </div>
        </div>
      }
    >
      {children}
    </PageLayout>
  );
};

export default EditorLayout;
