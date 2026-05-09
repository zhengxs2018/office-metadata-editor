import React, { useMemo, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { CircleHelp, Copy, Play, Square } from "lucide-react"

import { PageLayout } from "@/layouts/page-layout"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useTemplateStore } from "@/stores/om-workflow-store"
import type { MetadataTemplate } from "@/types/om-workflow"

type LogLevel = "info" | "warn" | "error"

interface ServiceLog {
  id: string
  level: LogLevel
  source: string
  message: string
  timestamp: string
}

interface BatchClearResultItem {
  filePath: string
  success: boolean
  error?: string | null
}

interface AutomationRequestPayload {
  source?: string
  templateId?: string
  metadataOverrides?: MetadataOverrides
  filePaths?: string[]
}

interface DocumentPropertiesOverrides {
  title?: string
  subject?: string
  creator?: string
  keywords?: string
  description?: string
  lastModifiedBy?: string
  revision?: string
  created?: string
  modified?: string
  category?: string
  contentStatus?: string
  version?: string
  language?: string
  identifier?: string
  source?: string
}

interface CorePropertiesOverrides {
  dcTitle?: string
  dcSubject?: string
  dcCreator?: string
  dcDescription?: string
  dcKeywords?: string
  dcLanguage?: string
  dcIdentifier?: string
  dcSource?: string
}

interface AppPropertiesOverrides {
  application?: string
  appVersion?: string
  company?: string
  manager?: string
  template?: string
  totalTime?: string
  pages?: number
  words?: number
  characters?: number
  charactersWithSpaces?: number
  paragraphs?: number
  lines?: number
}

interface MetadataOverrides {
  documentProperties?: DocumentPropertiesOverrides
  coreProperties?: CorePropertiesOverrides
  appProperties?: AppPropertiesOverrides
}

interface ServiceRequest {
  id: string
  source: string
  pathCount: number
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  receivedAt: string
}

const now = () => new Date().toLocaleTimeString("zh-CN", { hour12: false })

const extCommandMap: Record<string, string> = {
  docx: "batch_clear_and_save_docx_metadata",
  doc: "batch_clear_and_save_doc_metadata",
  xlsx: "batch_clear_and_save_xlsx_metadata",
  pdf: "batch_clear_and_save_pdf_metadata",
}

export const ServerPage: React.FC = () => {
  const { templates, activeTemplateId, loadTemplates } = useTemplateStore()

  const [isRunning, setIsRunning] = useState(false)
  const [bindAddress, setBindAddress] = useState("127.0.0.1")
  const [port, setPort] = useState("9876")
  const [allowedSources, setAllowedSources] = useState("*")
  const [logFilter, setLogFilter] = useState("")
  const [levelFilter, setLevelFilter] = useState<"all" | LogLevel>("all")
  const [isProcessing, setIsProcessing] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [logs, setLogs] = useState<ServiceLog[]>([])

  const pushRequest = (request: ServiceRequest) => {
    setRequests(prev => [request, ...prev].slice(0, 80))
  }

  const updateRequestStatus = (id: string, status: ServiceRequest["status"]) => {
    setRequests(prev => prev.map(item => (item.id === id ? { ...item, status } : item)))
  }

  const pushLog = (level: LogLevel, source: string, message: string) => {
    setLogs(prev => [
      {
        id: crypto.randomUUID(),
        level,
        source,
        message,
        timestamp: now(),
      },
      ...prev,
    ])
  }

  const filteredLogs = useMemo(() => {
    return logs.filter(item => {
      if (levelFilter !== "all" && item.level !== levelFilter) return false
      if (!logFilter.trim()) return true
      const keyword = logFilter.trim().toLowerCase()
      return (
        item.source.toLowerCase().includes(keyword) || item.message.toLowerCase().includes(keyword)
      )
    })
  }, [levelFilter, logFilter, logs])

  const allowedSourceSet = useMemo(() => {
    return new Set(
      allowedSources
        .split(",")
        .map(item => item.trim())
        .filter(Boolean),
    )
  }, [allowedSources])

  const templatesMap = useMemo(() => {
    return templates.reduce<Record<string, MetadataTemplate>>((acc, template) => {
      acc[template.id] = template
      return acc
    }, {})
  }, [templates])

  const requestExamples = {
    curl: `curl -X POST http://${bindAddress}:${port}/request \\
  -H "Content-Type: application/json" \\
  -d '{
    "source": "curl",
    "templateId": "tpl_1741234567890",
    "metadataOverrides": {
      "documentProperties": { "creator": "品牌部", "source": "curl" },
      "appProperties": { "company": "ACME Corp" }
    },
    "filePaths": ["/Users/demo/a.docx", "/Users/demo/b.xlsx"]
  }'`,
    node: `await emit("ome://service/request", {
  source: "node",
  templateId: "tpl_1741234567890",
  metadataOverrides: {
    documentProperties: { creator: "研发中心" },
  },
  filePaths: ["/Users/demo/a.docx", "/Users/demo/b.xlsx"],
})`,
    payload: `{
  "source": "external",
  "templateId": "tpl_1741234567890",
  "metadataOverrides": {
    "documentProperties": {
      "creator": "法务部",
      "source": "external"
    }
  },
  "filePaths": ["/Users/demo/a.docx", "/Users/demo/b.xlsx"]
}`,
  }

  const copyText = async (value: string) => {
    await navigator.clipboard.writeText(value)
  }

  const mergeOverrides = (
    templateOverrides?: MetadataOverrides,
    payloadOverrides?: MetadataOverrides,
  ): MetadataOverrides | undefined => {
    const merged: MetadataOverrides = {
      documentProperties: {
        ...(templateOverrides?.documentProperties || {}),
        ...(payloadOverrides?.documentProperties || {}),
      },
      coreProperties: {
        ...(templateOverrides?.coreProperties || {}),
        ...(payloadOverrides?.coreProperties || {}),
      },
      appProperties: {
        ...(templateOverrides?.appProperties || {}),
        ...(payloadOverrides?.appProperties || {}),
      },
    }

    if (Object.keys(merged.documentProperties || {}).length === 0) delete merged.documentProperties
    if (Object.keys(merged.coreProperties || {}).length === 0) delete merged.coreProperties
    if (Object.keys(merged.appProperties || {}).length === 0) delete merged.appProperties

    if (!merged.documentProperties && !merged.coreProperties && !merged.appProperties) {
      return undefined
    }
    return merged
  }

  const buildTemplateOverrides = (template?: MetadataTemplate): MetadataOverrides | undefined => {
    if (!template) return undefined

    const documentProperties: DocumentPropertiesOverrides = {}
    const coreProperties: CorePropertiesOverrides = {}
    const appProperties: AppPropertiesOverrides = {}

    if (template.author?.trim()) {
      documentProperties.creator = template.author.trim()
      coreProperties.dcCreator = template.author.trim()
    }
    if (template.organization?.trim()) {
      appProperties.company = template.organization.trim()
    }
    if (template.manager?.trim()) {
      appProperties.manager = template.manager.trim()
    }
    if (template.language?.trim()) {
      documentProperties.language = template.language.trim()
      coreProperties.dcLanguage = template.language.trim()
    }

    ;(template.fields || []).forEach(field => {
      const value = field.defaultValue?.trim()
      if (!value) return

      switch (field.key) {
        case "title":
          documentProperties.title = value
          break
        case "subject":
          documentProperties.subject = value
          break
        case "creator":
          documentProperties.creator = value
          coreProperties.dcCreator = value
          break
        case "keywords":
          documentProperties.keywords = value
          coreProperties.dcKeywords = value
          break
        case "description":
          documentProperties.description = value
          coreProperties.dcDescription = value
          break
        case "lastModifiedBy":
          documentProperties.lastModifiedBy = value
          break
        case "category":
          documentProperties.category = value
          break
        case "contentStatus":
          documentProperties.contentStatus = value
          break
        case "version":
          documentProperties.version = value
          break
        case "language":
        case "dcLanguage":
          documentProperties.language = value
          coreProperties.dcLanguage = value
          break
        case "identifier":
          documentProperties.identifier = value
          coreProperties.dcIdentifier = value
          break
        case "source":
          documentProperties.source = value
          coreProperties.dcSource = value
          break
        case "company":
        case "organization":
          appProperties.company = value
          break
        case "manager":
          appProperties.manager = value
          break
        case "application":
          appProperties.application = value
          break
        case "appVersion":
          appProperties.appVersion = value
          break
        case "template":
          appProperties.template = value
          break
        default:
          break
      }
    })

    const overrides: MetadataOverrides = {}
    if (Object.keys(documentProperties).length > 0)
      overrides.documentProperties = documentProperties
    if (Object.keys(coreProperties).length > 0) overrides.coreProperties = coreProperties
    if (Object.keys(appProperties).length > 0) overrides.appProperties = appProperties

    return Object.keys(overrides).length > 0 ? overrides : undefined
  }

  const cancelRequest = async (requestId: string) => {
    try {
      await invoke("cancel_automation_request", { requestId })
      updateRequestStatus(requestId, "cancelled")
      pushLog("warn", "request", `任务已取消 ${requestId}`)
    } catch (error) {
      pushLog("error", "request", error instanceof Error ? error.message : "取消任务失败")
    }
  }

  const runMetadataClear = async (
    requestId: string,
    paths: string[],
    source: string,
    templateId?: string,
    metadataOverrides?: MetadataOverrides,
  ) => {
    if (!isRunning || isProcessing) return

    setIsProcessing(true)
    updateRequestStatus(requestId, "running")
    pushLog("info", "request", `收到请求 ${requestId} (${source})，路径数量 ${paths.length}`)

    let finalStatus: ServiceRequest["status"] = "completed"

    try {
      const grouped = paths.reduce<Record<string, string[]>>((acc, path) => {
        const ext = path.split(".").pop()?.toLowerCase() || ""
        if (!extCommandMap[ext]) {
          acc.__unsupported = [...(acc.__unsupported || []), path]
          return acc
        }
        acc[ext] = [...(acc[ext] || []), path]
        return acc
      }, {})

      if (grouped.__unsupported?.length) {
        pushLog("warn", "request", `忽略不支持类型: ${grouped.__unsupported.length} 个`)
      }

      for (const [ext, filePaths] of Object.entries(grouped)) {
        if (ext === "__unsupported") continue
        const command = extCommandMap[ext]
        const options =
          templateId || metadataOverrides
            ? {
                templateId,
                metadataOverrides,
              }
            : undefined
        const result = await invoke<BatchClearResultItem[]>(command, { filePaths, options })
        const ok = result.filter(item => item.success).length
        const fail = result.length - ok
        pushLog("info", "clear", `${ext.toUpperCase()} 清理完成: 成功 ${ok}, 失败 ${fail}`)

        result
          .filter(item => !item.success)
          .forEach(item => {
            pushLog("error", "clear", `${item.filePath}: ${item.error || "未知错误"}`)
          })

        if (fail > 0) {
          finalStatus = "failed"
        }
      }
    } catch (error) {
      finalStatus = "failed"
      pushLog("error", "service", error instanceof Error ? error.message : "执行失败")
    } finally {
      updateRequestStatus(requestId, finalStatus)
      try {
        await invoke("finish_automation_request", { requestId, status: finalStatus })
      } catch (error) {
        pushLog("warn", "request", error instanceof Error ? error.message : "任务收尾失败")
      }
      setIsProcessing(false)
    }
  }

  const toggleService = async () => {
    if (isRunning) {
      const unlisten = (window as unknown as { __omeServiceUnlisten?: () => void })
        .__omeServiceUnlisten
      if (unlisten) {
        unlisten()
        ;(window as unknown as { __omeServiceUnlisten?: () => void }).__omeServiceUnlisten =
          undefined
      }
      setIsRunning(false)
      pushLog("info", "service", "服务停止")
      return
    }

    const unlisten = await listen<AutomationRequestPayload>("ome://service/request", event => {
      const payload = event.payload || {}
      const source = payload.source?.trim() || ""
      if (!source) {
        pushLog("warn", "request", "source 为必填字段，已忽略请求")
        return
      }
      if (!allowedSourceSet.has(source)) {
        pushLog("warn", "request", `source=${source} 不在允许列表，已忽略请求`)
        return
      }

      const paths = Array.isArray(payload.filePaths) ? payload.filePaths.filter(Boolean) : []
      if (paths.length === 0) {
        pushLog("warn", "request", "收到空文件列表请求，已忽略")
        return
      }

      void (async () => {
        try {
          const requestId = await invoke<string>("create_automation_request", {
            filePaths: paths,
            source,
          })

          const resolvedTemplateId = payload.templateId || activeTemplateId || undefined
          const template = resolvedTemplateId ? templatesMap[resolvedTemplateId] : undefined
          const templateOverrides = buildTemplateOverrides(template)
          const mergedOverrides = mergeOverrides(templateOverrides, payload.metadataOverrides)

          const request: ServiceRequest = {
            id: requestId,
            source,
            pathCount: paths.length,
            status: "queued",
            receivedAt: now(),
          }

          pushRequest(request)
          await runMetadataClear(requestId, paths, source, resolvedTemplateId, mergedOverrides)
        } catch (error) {
          pushLog(
            "error",
            "request",
            error instanceof Error ? error.message : "创建 requestId 失败",
          )
        }
      })()
    })

    setIsRunning(true)
    pushLog("info", "service", `服务启动 ${bindAddress}:${port}`)
    ;(window as unknown as { __omeServiceUnlisten?: () => void }).__omeServiceUnlisten = unlisten
  }

  React.useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  React.useEffect(() => {
    return () => {
      const unlisten = (window as unknown as { __omeServiceUnlisten?: () => void })
        .__omeServiceUnlisten
      if (unlisten) {
        unlisten()
      }
    }
  }, [])

  return (
    <PageLayout
      backTo="/"
      header={
        <div className="flex flex-col leading-tight select-none">
          <span className="text-sm font-medium text-foreground">启动服务</span>
        </div>
      }
    >
      <div className="flex h-full min-h-0 w-full flex-col gap-4 p-4">
        <section className="rounded-lg border border-border/55 bg-card/84 p-4 backdrop-blur-md">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_120px_170px] lg:items-end">
            <label className="space-y-2">
              <span className="text-xs text-muted-foreground">监听地址</span>
              <Input
                value={bindAddress}
                onChange={event => setBindAddress(event.target.value)}
                placeholder="127.0.0.1"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs text-muted-foreground">端口</span>
              <Input
                value={port}
                onChange={event => setPort(event.target.value)}
                placeholder="9876"
              />
            </label>
            <div className="flex items-center gap-2 lg:justify-end">
              <Button size="default" onClick={toggleService} className="gap-2">
                {isRunning ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isRunning ? "停止服务" : "启动服务"}
              </Button>
              <CircleHelp className="h-4 w-4" onClick={() => setShowExamples(true)} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_120px_170px] lg:items-end">
            <label className="space-y-2 lg:col-span-2">
              <span className="text-xs text-muted-foreground">允许来源 source（逗号分隔）</span>
              <Input
                value={allowedSources}
                onChange={event => setAllowedSources(event.target.value)}
                placeholder="限制来源"
              />
            </label>
          </div>
        </section>

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <div className="flex min-h-0 flex-col rounded-lg border border-border/55 bg-card/84 p-4 backdrop-blur-md">
            <div>
              <div>
                <p className="text-sm font-semibold text-foreground">请求队列</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  外部程序推送的文件任务会按时间顺序进入这里。
                </p>
              </div>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {requests.length === 0 ? (
                <div className="rounded-lg bg-background/60 px-0 py-4 text-xs leading-6 text-muted-foreground">
                  服务启动后，外部程序推送的文件列表会出现在这里。
                </div>
              ) : (
                requests.map(item => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[84px_66px_1fr_48px] gap-2 px-0 py-2 text-xs not-last:border-b not-last:border-border/50"
                  >
                    <span className="truncate text-muted-foreground">{item.receivedAt}</span>
                    <span
                      className={
                        item.status === "failed"
                          ? "text-red-500"
                          : item.status === "cancelled"
                            ? "text-amber-500"
                            : item.status === "completed"
                              ? "text-emerald-600"
                              : item.status === "running"
                                ? "text-blue-600"
                                : "text-muted-foreground"
                      }
                    >
                      {item.status}
                    </span>
                    <span className="truncate text-foreground">
                      {item.source} / {item.pathCount} 文件 / {item.id}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground transition-colors hover:text-destructive disabled:opacity-40"
                      onClick={() => void cancelRequest(item.id)}
                      disabled={item.status !== "queued" && item.status !== "running"}
                    >
                      取消
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-lg border border-border/55 bg-card/84 p-4 backdrop-blur-md">
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <Input
                value={logFilter}
                onChange={event => setLogFilter(event.target.value)}
                placeholder="过滤 source / message"
              />
              <select
                value={levelFilter}
                onChange={event => setLevelFilter(event.target.value as "all" | LogLevel)}
                className="border border-border bg-background px-2 py-2 text-xs"
              >
                <option value="all">全部</option>
                <option value="info">INFO</option>
                <option value="warn">WARN</option>
                <option value="error">ERROR</option>
              </select>
            </div>

            <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
              {filteredLogs.length === 0 ? (
                <div className="rounded-lg bg-background/60 px-3 py-4 text-xs text-muted-foreground">
                  暂无日志
                </div>
              ) : (
                filteredLogs.map(item => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[72px_56px_110px_1fr] gap-2 px-0 py-2 text-xs not-last:border-b not-last:border-border/50"
                  >
                    <span className="text-muted-foreground">{item.timestamp}</span>
                    <span
                      className={
                        item.level === "error"
                          ? "text-red-500"
                          : item.level === "warn"
                            ? "text-amber-500"
                            : "text-muted-foreground"
                      }
                    >
                      {item.level.toUpperCase()}
                    </span>
                    <span className="truncate text-muted-foreground">{item.source}</span>
                    <span className="truncate">{item.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <Dialog open={showExamples} onOpenChange={setShowExamples}>
        <DialogContent className="min-w-120">
          <DialogHeader>
            <DialogTitle>调用示例</DialogTitle>
            <DialogDescription>
              使用事件 ome://service/request 推送文件列表，下面提供不同调用方式的示例。
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="payload" className="w-full overflow-hidden">
            <TabsList variant="line" className="w-full justify-start p-0">
              <TabsTrigger value="payload">Payload</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="node">Node.js</TabsTrigger>
            </TabsList>

            <TabsContent value="payload" className="mt-4">
              <ExampleCodeBlock
                label="Payload 结构"
                value={requestExamples.payload}
                onCopy={copyText}
              />
            </TabsContent>
            <TabsContent value="curl" className="mt-4">
              <ExampleCodeBlock label="命令行调用" value={requestExamples.curl} onCopy={copyText} />
            </TabsContent>
            <TabsContent value="node" className="mt-4">
              <ExampleCodeBlock
                label="Node.js / Tauri 事件调用"
                value={requestExamples.node}
                onCopy={copyText}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}

interface ExampleCodeBlockProps {
  label: string
  value: string
  onCopy: (value: string) => Promise<void>
}

const ExampleCodeBlock: React.FC<ExampleCodeBlockProps> = ({ label, value, onCopy }) => {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Button variant="outline" size="sm" onClick={() => void onCopy(value)} className="gap-1.5">
          <Copy className="h-3.5 w-3.5" />
          复制
        </Button>
      </div>
      <pre className="block overflow-x-auto rounded-lg bg-muted/55 p-4 text-xs leading-6 whitespace-pre text-foreground">
        <code>{value}</code>
      </pre>
    </div>
  )
}

export default ServerPage
