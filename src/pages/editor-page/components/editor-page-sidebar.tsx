import React from "react"
import { FileSpreadsheet, FileText, Trash2 } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import type { LoadedDocument } from "@/contexts/metadata-context"

export interface EditorPageSidebarProps {
  files: Array<{ id: string; filePath: string; status?: string }>
  documents: LoadedDocument[]
  activeFileId: string | null
  onSelectFile: (id: string) => void
  onRemoveFile: (id: string) => void
}

/**
 * 文件列表 sidebar（多文件时让用户切换/删除）。
 * 必须作为 `<SidebarProvider>` 的直接 flex 子节点，与 `<SidebarInset>` 兄弟。
 */
export const EditorPageSidebar: React.FC<EditorPageSidebarProps> = ({
  files,
  documents,
  activeFileId,
  onSelectFile,
  onRemoveFile,
}) => {
  return (
    <Sidebar
      collapsible="icon"
      className="top-22 bottom-0 h-auto border-r"
      style={{
        top: "var(--chrome-titlebar-height, 44px)",
        bottom: 0,
        height: "calc(100svh - var(--chrome-titlebar-height, 44px))",
      }}
    >
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>文件列表</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {uniqueByBasename(files).map(file => {
                const doc = documents.find(d => d.id === file.id)
                const fileName =
                  doc?.metadata.fileName || file.filePath.split(/[\\/]/).pop() || file.filePath
                const Icon = file.filePath.toLowerCase().endsWith(".xlsx")
                  ? FileSpreadsheet
                  : FileText
                const isActive = file.id === activeFileId
                const status = file.status ?? doc?.status ?? "idle"
                return (
                  <SidebarMenuItem key={file.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => onSelectFile(file.id)}
                      tooltip={fileName}
                      className={cn(
                        "w-full items-center justify-between gap-2",
                        status === "error" && "text-destructive",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className="min-w-0 flex-1 truncate text-left">{fileName}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">
                        {statusLabel(status)}
                      </span>
                    </SidebarMenuButton>
                    <SidebarMenuAction
                      showOnHover
                      aria-label="删除文件"
                      onClick={e => {
                        e.stopPropagation()
                        onRemoveFile(file.id)
                      }}
                    >
                      <Trash2 />
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

function statusLabel(status: string): string {
  if (status === "ready") return "就绪"
  if (status === "error") return "失败"
  if (status === "loading") return "加载中"
  return "待处理"
}

/** 按 basename 去重（同名文件保留第一个），避免跨目录同名重复显示。 */
function uniqueByBasename<T extends { filePath: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const base = item.filePath.split(/[\\/]/).pop() ?? item.filePath
    if (seen.has(base)) continue
    seen.add(base)
    out.push(item)
  }
  return out
}
