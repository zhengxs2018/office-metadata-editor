import React from "react"

export interface OmWindowTitleBarProps {
  leading?: React.ReactNode
  actions?: React.ReactNode
}

export const OmWindowTitleBar: React.FC<OmWindowTitleBarProps> = ({ leading, actions }) => {
  return (
    <header
      className="flex h-22 shrink-0 items-center justify-between border-b border-border/80 bg-card/92 px-3 pt-8 backdrop-blur-sm"
      data-tauri-drag-region
    >
      <div className="flex items-center gap-2">{leading}</div>
      <div className="flex items-center gap-1.5">{actions}</div>
    </header>
  )
}

export default OmWindowTitleBar
