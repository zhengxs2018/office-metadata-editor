import React from "react"
import { useNavigate } from "react-router-dom"
import {
  Upload,
  Layers3,
  GitCompareArrows,
  ShieldCheck,
  FileText,
  FileSpreadsheet,
  Sparkles,
} from "lucide-react"

import { useFileContext } from "@/contexts/file-context"
import { Button } from "@/components/ui/button"
import { ThemeSwitch } from "@/components/chrome/theme-switch"
import { Spinner } from "@/components/ui/spinner"
import { APP_NAME } from "@/lib/app-config"
import { SUPPORTED_FILE_EXTENSIONS } from "@/lib/documents/supported-formats"
import { cn } from "@/lib/utils"
import { getCurrentWebview } from "@tauri-apps/api/webview"
import { invoke } from "@tauri-apps/api/core"
import BlankLayout from "@/layouts/blank-layout"
import { ROUTES } from "@/router/paths"
import type { DirectoryScanResult } from "@/types/om-workflow"

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { openFiles, addFilesByPaths, clearFiles, isLoading: ctxLoading } = useFileContext()

  React.useEffect(() => {
    clearFiles()
  }, [clearFiles])

  const handleOpenFiles = async () => {
    const added = await openFiles()
    if (added > 0) navigate(ROUTES.editor)
  }

  const handleDropFiles = async (paths: string[]) => {
    const supportedSet = new Set(SUPPORTED_FILE_EXTENSIONS.map(ext => ext.toLowerCase()))
    const filePaths: string[] = []
    for (const p of paths) {
      const lower = p.toLowerCase()
      if (supportedSet.has(lower.replace(/^.*\./, ""))) {
        filePaths.push(p)
      } else {
        try {
          const result = await invoke<DirectoryScanResult>("scan_directory", {
            path: p,
            options: { recursive: true, extensions: [...supportedSet] },
          })
          for (const f of result.files) filePaths.push(f.path)
        } catch (err) {
          console.warn("scan_directory failed", p, err)
        }
      }
    }
    const added = addFilesByPaths(filePaths)
    if (added > 0) navigate(ROUTES.editor)
  }

  return (
    <BlankLayout>
      <div className="relative h-full w-full overflow-hidden bg-background">
        <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col px-6 pt-8 pb-6">
          <header className="flex shrink-0 flex-wrap items-center justify-between gap-4 pb-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                欢迎使用 {APP_NAME}
              </h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                快速检查、对比与清洗您的文档元数据。
              </p>
            </div>
            <div className="flex items-center gap-6">
              <ThemeSwitch />
            </div>
          </header>

          <section className="flex min-h-0 flex-1 flex-col justify-center rounded-2xl border border-dashed border-primary/35 bg-linear-to-br from-primary/8 via-primary/3 to-transparent p-6">
            <DragOrUploadZone
              isLoading={ctxLoading}
              onDropFiles={handleDropFiles}
              onOpenFiles={handleOpenFiles}
            />
          </section>

          <section className="mt-5 grid shrink-0 grid-cols-1 gap-4 md:grid-cols-3">
            <EntryCard
              tone="orange"
              icon={GitCompareArrows}
              title="对比视图（防串标）"
              description="深度比对多份文档的作者、编辑时间与软件环境，精准识别国际串标风险。"
              badge="核心"
              actionLabel="开始对比"
              onClick={() => navigate(ROUTES.compare)}
            />
            <EntryCard
              tone="violet"
              icon={Layers3}
              title="批量提取"
              description="一键解析数百个 Office 文档的隐藏属性、修订记录与自定义 XML 数据。"
              badge="高效"
              actionLabel="批量处理"
              onClick={() => navigate(ROUTES.batch)}
            />
            <EntryCard
              tone="emerald"
              icon={ShieldCheck}
              title="隐私清洗"
              description="彻底清除文档中的个人信息、隐藏批注、宏代码及不可见水印。"
              badge="安全"
              actionLabel="清洗工具"
              onClick={() => navigate(ROUTES.batch)}
            />
          </section>
        </div>
      </div>
    </BlankLayout>
  )
}

const DragOrUploadZone: React.FC<{
  isLoading: boolean
  onDropFiles: (paths: string[]) => void
  onOpenFiles: () => void
}> = ({ isLoading, onDropFiles, onOpenFiles }) => {
  const [isDragOver, setIsDragOver] = React.useState(false)

  React.useEffect(() => {
    let unlisten: (() => void) | undefined
    getCurrentWebview()
      .onDragDropEvent(event => {
        if (event.payload.type === "over" || event.payload.type === "enter") {
          setIsDragOver(true)
        } else if (event.payload.type === "leave") {
          setIsDragOver(false)
        } else if (event.payload.type === "drop") {
          setIsDragOver(false)
          const paths = event.payload.paths ?? []
          if (paths.length > 0) onDropFiles(paths)
        }
      })
      .then(fn => {
        unlisten = fn
      })
      .catch(err => console.error("[home-page] 监听拖拽事件失败:", err))
    return () => {
      if (unlisten) unlisten()
    }
  }, [onDropFiles])

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
    const paths = Array.from(event.dataTransfer.files)
      .map(file => (file as File & { path?: string }).path)
      .filter((path): path is string => Boolean(path))
    if (paths.length > 0) onDropFiles(paths)
  }

  const extensions = SUPPORTED_FILE_EXTENSIONS.map(ext => `.${ext}`)

  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl py-12 transition-colors",
        isDragOver && "bg-primary/8",
      )}
    >
      <div className="flex items-center justify-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 shadow-sm dark:bg-blue-500/15 dark:text-blue-300">
          <FileText className="h-7 w-7" />
        </span>
        <span className="-ml-2 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-300">
          <FileSpreadsheet className="h-7 w-7" />
        </span>
        <span className="-ml-2 flex h-12 w-12 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 shadow-sm dark:bg-rose-500/15 dark:text-rose-300">
          <Sparkles className="h-7 w-7" />
        </span>
      </div>

      <div className="mt-2 flex items-center justify-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-primary/15">
          <Upload className="h-5 w-5" />
        </span>
      </div>

      <div className="mt-1 text-center">
        <p className="text-sm font-medium text-foreground">拖拽文件或文件夹到此处</p>
        <p className="mt-1 text-xs text-muted-foreground">
          支持 {extensions.join(" / ")} 及旧版格式
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner className="h-4 w-4" />
          正在加载…
        </div>
      ) : (
        <Button onClick={onOpenFiles} className="mt-2">
          选择文件…
        </Button>
      )}

      <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/80">
        {extensions.map(ext => (
          <span
            key={ext}
            className="rounded border border-border/60 bg-background/60 px-1.5 py-0.5"
          >
            {ext}
          </span>
        ))}
      </div>
    </div>
  )
}

const TONE_STYLES: Record<string, { card: string; ring: string; icon: string }> = {
  orange: {
    card: "from-orange-500/15 to-orange-500/0 border-orange-500/20",
    ring: "ring-orange-500/15",
    icon: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  },
  violet: {
    card: "from-violet-500/15 to-violet-500/0 border-violet-500/20",
    ring: "ring-violet-500/15",
    icon: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  },
  emerald: {
    card: "from-emerald-500/15 to-emerald-500/0 border-emerald-500/20",
    ring: "ring-emerald-500/15",
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
}

const EntryCard: React.FC<{
  tone: "orange" | "violet" | "emerald"
  icon: React.FC<{ className?: string }>
  title: string
  description: string
  badge: string
  actionLabel: string
  onClick: () => void
}> = ({ tone, icon: Icon, title, description, badge, actionLabel, onClick }) => {
  const style = TONE_STYLES[tone]
  const badgeColor =
    tone === "orange"
      ? "bg-red-500 text-white"
      : tone === "emerald"
        ? "bg-emerald-500 text-white"
        : "bg-blue-500 text-white"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-linear-to-br p-5 text-left transition-shadow hover:shadow-md",
        style.card,
      )}
    >
      <div className="flex items-start justify-between">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-lg", style.icon)}>
          <Icon className="h-5 w-5" />
        </span>
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", badgeColor)}>
          {badge}
        </span>
      </div>
      <div className="mt-4 flex-1">
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4 flex items-center justify-end text-xs font-medium text-primary transition-transform group-hover:translate-x-0.5">
        {actionLabel} →
      </div>
    </button>
  )
}

export default HomePage
