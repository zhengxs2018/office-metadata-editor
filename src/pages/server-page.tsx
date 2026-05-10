import React, { useMemo, useState } from "react"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"

import { PageLayout } from "@/layouts/page-layout"
import { useTemplateStore } from "@/stores/om-workflow-store"
import type { MetadataTemplate } from "@/types/om-workflow"
import type {
  LogLevel,
  ServiceLog,
  ServiceRequest,
  BatchClearResultItem,
  AutomationRequestPayload,
  DocumentPropertiesOverrides,
  CorePropertiesOverrides,
  AppPropertiesOverrides,
  MetadataOverrides,
} from "@/types/server-service"
import { ServerConfigPanel } from "@/components/om/om-server-config-panel"
import { ServerRequestQueue } from "@/components/om/om-server-request-queue"
import { ServerLogPanel } from "@/components/om/om-server-log-panel"
import { ServerExamplesDialog } from "@/components/om/om-server-examples-dialog"

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
        <ServerConfigPanel
          bindAddress={bindAddress}
          port={port}
          allowedSources={allowedSources}
          isRunning={isRunning}
          onBindAddressChange={setBindAddress}
          onPortChange={setPort}
          onAllowedSourcesChange={setAllowedSources}
          onToggleService={() => void toggleService()}
          onShowExamples={() => setShowExamples(true)}
        />

        <section className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
          <ServerRequestQueue requests={requests} onCancelRequest={cancelRequest} />
          <ServerLogPanel
            filteredLogs={filteredLogs}
            logFilter={logFilter}
            levelFilter={levelFilter}
            onLogFilterChange={setLogFilter}
            onLevelFilterChange={setLevelFilter}
          />
        </section>
      </div>

      <ServerExamplesDialog
        open={showExamples}
        onOpenChange={setShowExamples}
        bindAddress={bindAddress}
        port={port}
      />
    </PageLayout>
  )
}

export default ServerPage
