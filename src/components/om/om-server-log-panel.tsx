import React from "react"
import { Input } from "@/components/ui/input"
import type { ServiceLog, LogLevel } from "@/types/server-service"

export interface ServerLogPanelProps {
  filteredLogs: ServiceLog[]
  logFilter: string
  levelFilter: "all" | LogLevel
  onLogFilterChange: (v: string) => void
  onLevelFilterChange: (v: "all" | LogLevel) => void
}

const levelColorMap: Record<LogLevel, string> = {
  error: "text-red-500",
  warn: "text-amber-500",
  info: "text-muted-foreground",
}

export const ServerLogPanel: React.FC<ServerLogPanelProps> = ({
  filteredLogs,
  logFilter,
  levelFilter,
  onLogFilterChange,
  onLevelFilterChange,
}) => {
  return (
    <div className="flex min-h-0 flex-col rounded-lg border border-border/55 bg-card/84 p-4 backdrop-blur-md">
      <div className="mb-3 grid grid-cols-[1fr_120px] gap-2">
        <Input
          value={logFilter}
          onChange={e => onLogFilterChange(e.target.value)}
          placeholder="过滤 source / message"
        />
        <select
          value={levelFilter}
          onChange={e => onLevelFilterChange(e.target.value as "all" | LogLevel)}
          className="h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:border-primary/50 focus:ring-0"
        >
          <option value="all">全部</option>
          <option value="info">INFO</option>
          <option value="warn">WARN</option>
          <option value="error">ERROR</option>
        </select>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <p className="py-4 text-xs text-muted-foreground">暂无日志</p>
        ) : (
          filteredLogs.map(item => (
            <div
              key={item.id}
              className="grid grid-cols-[72px_56px_110px_1fr] gap-2 py-2 text-xs not-last:border-b not-last:border-border/50"
            >
              <span className="text-muted-foreground">{item.timestamp}</span>
              <span className={levelColorMap[item.level]}>{item.level.toUpperCase()}</span>
              <span className="truncate text-muted-foreground">{item.source}</span>
              <span className="truncate">{item.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ServerLogPanel
