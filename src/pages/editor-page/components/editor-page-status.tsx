import React from 'react';
import { PropertyPreview } from '@/pages/editor-page/components/property-preview';
import type { DocumentFileType } from '@/types/metadata';

export interface EditorPageUnsupportedStatusProps {
  fileType: DocumentFileType;
}

export const EditorPageUnsupportedStatus: React.FC<EditorPageUnsupportedStatusProps> = ({
  fileType,
}) => {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <PropertyPreview
        title="当前文件暂不支持编辑"
        properties={[
          {
            label: '文件类型',
            value: fileType,
            span: 2,
          },
        ]}
      />
    </div>
  );
};

export default EditorPageUnsupportedStatus;
