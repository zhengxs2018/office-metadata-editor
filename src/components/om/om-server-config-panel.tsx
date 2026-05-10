import React from "react"
import { CircleHelp, Play, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface ServerConfigPanelProps {
  bindAddress: string
  port: string
  allowedSources: string
  isRunning: boolean
  onBindAddressChange: (v: string) => void
  onPortChange: (v: string) => void
  onAllowedSourcesChange: (v: string) => void
  onToggleService: () => void
  onShowExamples: () => void
}

export const ServerConfigPanel: React.FC<ServerConfigPanelProps> = ({
  bindAddress,
  port,
  allowedSources,
  isRunning,
  onBindAddressChange,
  onPortChange,
  onAllowedSourcesChange,
  onToggleService,
  onShowExamples,
}) => {
  return (
    <section className="rounded-lg border border-border/55 bg-card/84 p-4 backdrop-blur-md">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_120px_170px] lg:items-end">
        <label className="space-y-1.5">
          <span className="text-xs text-muted-foreground">监听地址</span>
          <Input
            value={bindAddress}
            onChange={e => onBindAddressChange(e.target.value)}
            placeholder="127.0.0.1"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs text-muted-foreground">端口</span>
          <Input
            value={port}
            onChange={e => onPortChange(e.target.value)}
            placeholder="9876"
          />
        </label>
        <div className="flex items-center gap-2 lg:justify-end">
          <Button size="default" onClick={onToggleService} className="gap-2">
            {isRunning ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {isRunning ? "停止服务" : "启动服务"}
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onShowExamples} className="rounded-lg">
            <CircleHelp className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_120px_170px] lg:items-end">
        <label className="space-y-1.5 lg:col-span-2">
          <span className="text-xs text-muted-foreground">允许来源 source（逗号分隔）</span>
          <Input
            value={allowedSources}
            onChange={e => onAllowedSourcesChange(e.target.value)}
            placeholder="限制来源，例如 curl,node"
          />
        </label>
      </div>
    </section>
  )
}

export default ServerConfigPanel
