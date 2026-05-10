import React, { useMemo } from "react"
import type { FileEntry } from "@/contexts/file-context"
import type { LoadedDocument } from "@/contexts/metadata-context"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenuAction,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { FileText, X } from "lucide-react"
import { formatRelativeTime } from "@/lib/utils"

export interface EditorPageSidebarProps {
  files: FileEntry[]
  documents: LoadedDocument[]
  activeFileId: string | null
  onSelectFile: (fileId: string) => void
  onRemoveFile: (fileId: string) => void
}

export const EditorPageSidebar: React.FC<EditorPageSidebarProps> = ({
  files,
  documents,
  activeFileId,
  onSelectFile,
  onRemoveFile,
}) => {
  const documentMap = useMemo(() => {
    return new Map(documents.map(item => [item.id, item]))
  }, [documents])

  if (files.length < 2) {
    return null
  }

  return (
    <Sidebar
      collapsible="icon"
      className="top-[52px] bottom-0 h-auto"
    >
      <SidebarContent>
        <SidebarGroup className="px-2 py-1.5">
          <SidebarGroupLabel>文件列表</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {files.map(item => {
                const doc = documentMap.get(item.id)
                if (!doc) return null
                const fileName = doc.metadata.fileName
                const hasChanges = doc.hasChanges
                const modified = doc.metadata.documentProperties.modified
                const created = doc.metadata.documentProperties.created
                const displayTime = formatRelativeTime(modified || created)

                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      isActive={activeFileId === item.id}
                      tooltip={`${fileName}\n${displayTime}`}
                      onClick={() => onSelectFile(item.id)}
                      className="relative h-auto min-h-12 items-start gap-2 rounded-lg border border-transparent px-2 py-1.5 pr-9 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:min-h-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:rounded-md group-data-[collapsible=icon]:p-0 hover:bg-sidebar-accent/70 data-[active=true]:border-primary/35 data-[active=true]:bg-primary/10 data-[active=true]:text-foreground data-[active=true]:hover:bg-primary/12"
                    >
                      <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                        <div className="truncate pr-1 text-sm font-medium">{fileName}</div>
                        {hasChanges ? (
                          <div className="truncate pr-1 text-xs text-primary">有未保存修改</div>
                        ) : (
                          <div className="truncate pr-1 text-xs text-muted-foreground">
                            {displayTime}
                          </div>
                        )}
                        {item.status !== "ready" && (
                          <div className="truncate pr-1 text-xs text-muted-foreground">
                            {item.progressMessage}
                          </div>
                        )}
                      </div>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      aria-label={`移除 ${fileName}`}
                      className="top-1.5 right-1.5 rounded-md text-muted-foreground peer-data-active/menu-button:text-muted-foreground hover:bg-destructive/12 hover:text-destructive"
                      onClick={event => {
                        event.stopPropagation()
                        onRemoveFile(item.id)
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </SidebarMenuAction>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}

export default EditorPageSidebar
