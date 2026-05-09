import React from "react"
import { OmMetadataEditor } from "@/components/om/om-metadata-editor"
import { OmPropertyPreview } from "@/components/om/om-property-preview"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DocumentFileType, MetadataPreviewGroup } from "@/types/metadata"

export interface OmMetadataEditViewProps {
  fileType: DocumentFileType
  previewGroups: MetadataPreviewGroup[]
}

export const OmMetadataEditView: React.FC<OmMetadataEditViewProps> = ({ fileType, previewGroups }) => {
  return (
    <div className="flex h-full overflow-hidden p-4 gap-2">
      <ScrollArea className="min-w-0 flex-3 pr-2">
        <OmMetadataEditor fileType={fileType} />
      </ScrollArea>
      <div className="flex w-60 shrink-0 flex-col gap-4 overflow-hidden">
        {previewGroups.map(group => (
          <OmPropertyPreview key={group.id} title={group.title} properties={group.properties} />
        ))}
      </div>
    </div>
  )
}

export default OmMetadataEditView
