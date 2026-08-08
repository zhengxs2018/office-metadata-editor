import React from 'react';
import { MetadataEditor } from './metadata-editor';
import { PropertyPreview } from './property-preview';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { DocumentFileType, MetadataPreviewGroup } from '@/types/metadata';

export interface MetadataEditViewProps {
  fileType: DocumentFileType;
  previewGroups: MetadataPreviewGroup[];
}

export const MetadataEditView: React.FC<MetadataEditViewProps> = ({ fileType, previewGroups }) => {
  return (
    <div className="flex h-full gap-2 overflow-hidden p-4">
      <ScrollArea className="min-w-0 flex-3 pr-2">
        <MetadataEditor fileType={fileType} />
      </ScrollArea>
      <div
        className="stagger flex w-60 shrink-0 flex-col gap-4 overflow-hidden"
        style={{ ['--md-stagger' as string]: 50 }}
      >
        {previewGroups.map((group, i) => (
          <PropertyPreview
            key={group.id}
            title={group.title}
            properties={group.properties}
            style={{ ['--md-index' as string]: i }}
          />
        ))}
      </div>
    </div>
  );
};

export default MetadataEditView;
