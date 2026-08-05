import React from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppShell } from "@/layouts/app-shell"

export interface PageLayoutProps {
  backTo?: string
  header: React.ReactNode
  actions?: React.ReactNode
  showSidebarTrigger?: boolean
  bleed?: boolean
  /**
   * 左/右侧 sidebar（如 `<EditorPageSidebar/>`）。
   * 传入后 AppShell content 改为 flex-row（让 sidebar-gap 按 max-content 推挤 SidebarInset）。
   */
  sidebar?: React.ReactNode
}

/**
 * 页面级布局：
 *
 * ```
 * <SidebarProvider>          ← Provider 在最外，保证 SidebarTrigger 可用
 *   <AppShell direction=row> ← header 全宽 + content flex-row（sidebar 推挤）
 *     {sidebar}              ← shadcn Sidebar（wrapper block → max-content = gap 宽）
 *     <SidebarInset>         ← flex-1 撑满剩余
 *       {children}
 * ```
 */
export const PageLayout: React.FC<React.PropsWithChildren<PageLayoutProps>> = ({
  children,
  backTo = "/",
  header,
  actions,
  showSidebarTrigger = false,
  bleed,
  sidebar,
}) => {
  const navigate = useNavigate()

  const leading = (
    <>
      {showSidebarTrigger && (
        <SidebarTrigger className="size-7 rounded-lg text-muted-foreground hover:text-foreground" />
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="返回"
        onClick={() => navigate(backTo)}
        className="rounded-lg text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
      </Button>
      <div className="h-4 w-px shrink-0 bg-hairline" />
      <div className="min-w-0 flex-1">{header}</div>
    </>
  )

  return (
    <SidebarProvider className="h-full min-h-0">
      <AppShell
        bleed={bleed ?? Boolean(sidebar)}
        actions={actions}
        leading={leading}
        contentDirection={sidebar ? "flex-row" : "flex-col"}
      >
        {sidebar ? (
          <>
            {sidebar}
            <SidebarInset className="flex min-h-0 flex-1 flex-col">{children}</SidebarInset>
          </>
        ) : (
          children
        )}
      </AppShell>
    </SidebarProvider>
  )
}

export default PageLayout
