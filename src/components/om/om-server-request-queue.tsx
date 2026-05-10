import React from "react"
import type { ServiceRequest } from "@/types/server-service"

export interface ServerRequestQueueProps {
  requests: ServiceRequest[]
  onCancelRequest: (id: string) => void
}

const statusColorMap: Record<ServiceRequest["status"], string> = {
  failed: "text-red-500",
  cancelled: "text-amber-500",
  completed: "text-emerald-600",
  running: "text-blue-600",
  queued: "text-muted-foreground",
}

export const ServerRequestQueue: React.FC<ServerRequestQueueProps> = ({
  requests,
  onCancelRequest,
}) => {
  return (
    <div className="flex min-h-0 flex-col rounded-lg border border-border/55 bg-card/84 p-4 backdrop-blur-md">
      <div className="mb-3">
        <p className="text-sm font-semibold text-foreground">请求队列</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          外部程序推送的文件任务会按时间顺序进入这里。
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {requests.length === 0 ? (
          <p className="py-4 text-xs leading-6 text-muted-foreground">
            服务启动后，外部程序推送的文件列表会出现在这里。
          </p>
        ) : (
          requests.map(item => (
            <div
              key={item.id}
              className="grid grid-cols-[84px_66px_1fr_48px] gap-2 py-2 text-xs not-last:border-b not-last:border-border/50"
            >
              <span className="truncate text-muted-foreground">{item.receivedAt}</span>
              <span className={statusColorMap[item.status]}>{item.status}</span>
              <span className="truncate text-foreground">
                {item.source} / {item.pathCount} 文件 / {item.id}
              </span>
              <button
                type="button"
                className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                onClick={() => void onCancelRequest(item.id)}
                disabled={item.status !== "queued" && item.status !== "running"}
              >
                取消
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default ServerRequestQueue
