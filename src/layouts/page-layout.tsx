import React from "react"
import { useNavigate } from "react-router-dom"
import { HugeIcon } from "@/components/icons/huge-icon"
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppShell } from "@/layouts/app-shell"

export interface PageLayoutProps {
  backTo?: string
  header: React.ReactNode
  actions?: React.ReactNode
  showSidebarTrigger?: boolean
  showBackButton?: boolean
  bleed?: boolean
  sidebar?: React.ReactNode
}

export const PageLayout: React.FC<React.PropsWithChildren<PageLayoutProps>> = ({
  children,
  backTo = "/",
  header,
  actions,
  showSidebarTrigger = false,
  showBackButton = true,
  bleed,
  sidebar,
}) => {
  const navigate = useNavigate()

  const leading = (
    <>
      {showSidebarTrigger && (
        <div className="app-no-drag shrink-0">
          <SidebarTrigger className="size-7 rounded-lg text-muted-foreground hover:text-foreground" />
        </div>
      )}
      {showBackButton && (
        <>
          <div className="app-no-drag shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="返回"
              onClick={() => navigate(backTo)}
              className="rounded-lg text-muted-foreground hover:text-foreground"
            >
              <HugeIcon icon={ArrowLeft01Icon} size={14} />
            </Button>
          </div>
          <div className="h-4 w-px shrink-0 bg-hairline" />
        </>
      )}
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
