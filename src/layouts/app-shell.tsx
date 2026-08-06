import React from "react"

import { cn } from "@/lib/utils"

export interface AppShellProps {
  /** Rendered at the leading edge of the title bar, after the traffic-light inset. */
  leading?: React.ReactNode
  /** Rendered at the trailing edge of the title bar. */
  actions?: React.ReactNode
  /** Removes the default content padding for pages that manage their own gutters. */
  bleed?: boolean
  className?: string
  /**
   * When provided, the content container uses the given flex direction instead of the
   * default "flex-col".  Pass "flex-row" when the layout contains a sidebar so that
   * shadcn sidebar gap can push the inset via cross-axis max-content.
   */
  contentDirection?: "flex-col" | "flex-row"
}

/**
 * The single window shell for every route.
 *
 * The title bar is the OS drag region and stays a fixed height on all platforms;
 * macOS traffic lights are handled by reserving leading space rather than by
 * pushing the whole bar downwards.
 */
export const AppShell: React.FC<React.PropsWithChildren<AppShellProps>> = ({
  leading,
  actions,
  bleed = false,
  className,
  contentDirection = "flex-col",
  children,
}) => {
  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-canvas text-foreground">
      <header
        data-tauri-drag-region
        className="app-drag hairline-b relative z-30 flex h-(--chrome-titlebar-height) shrink-0 items-center gap-2 bg-parchment/80 pr-3 backdrop-blur-xl"
        style={{ paddingLeft: "calc(var(--chrome-traffic-light-inset) + 0.75rem)" }}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">{leading}</div>
        {actions ? (
          <div className="app-no-drag flex shrink-0 items-center gap-1">{actions}</div>
        ) : null}
      </header>

      <div
        className={cn(
          "relative flex min-h-0 flex-1 overflow-hidden",
          contentDirection,
          !bleed && "p-4",
          className,
        )}
      >
        {children}
      </div>
    </div>
  )
}

export default AppShell
