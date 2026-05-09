import React from "react"
import { useMetadata } from "@/contexts/metadata-context"
import { OmFileTypeIcon } from "@/components/om/om-file-type-icon"
import { SidebarProvider } from "@/components/ui/sidebar"
import { PageLayout } from "@/layouts/page-layout"
import { formatFileSize } from "@/lib/utils"

export interface EditorLayoutProps {
  showSidebarTrigger?: boolean
  actions?: React.ReactNode
}

export const EditorLayout: React.FC<React.PropsWithChildren<EditorLayoutProps>> = ({
  showSidebarTrigger,
  children,
  actions,
}) => {
  const { metadata } = useMetadata()
  const resolvedMetadata = metadata!

  const fileType = resolvedMetadata.fileType
  const fileName = resolvedMetadata.fileName
  const fileSize = resolvedMetadata.fileSize

  return (
    <SidebarProvider className="h-screen">
      <PageLayout
        backTo="/"
        header={
          <div className="flex items-center gap-2" data-tauri-drag-region>
            <OmFileTypeIcon type={fileType} />
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-medium text-foreground">{fileName}</span>
              <span className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</span>
            </div>
          </div>
        }
        actions={actions}
        showSidebarTrigger={showSidebarTrigger}
      >
        {children}
      </PageLayout>
    </SidebarProvider>
  )
}

export default EditorLayout
