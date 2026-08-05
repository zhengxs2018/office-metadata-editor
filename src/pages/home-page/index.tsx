import React from "react"
import { useNavigate } from "react-router-dom"
import { HugeIcon } from "@/components/icons/huge-icon"
import {
  Upload01Icon,
  Layers01Icon,
  GitCompareIcon,
  File01Icon,
  FileSpreadsheetIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons"

import { useFileContext } from "@/contexts/file-context"
import { ThemeSwitch } from "@/components/chrome/theme-switch"
import { Spinner } from "@/components/ui/spinner"
import { APP_NAME } from "@/lib/app-config"
import { SUPPORTED_FILE_EXTENSIONS } from "@/lib/documents/supported-formats"
import { cn } from "@/lib/utils"
import { invoke } from "@tauri-apps/api/core"
import { BlankLayout } from "@/layouts/blank-layout"
import { ROUTES } from "@/router/paths"
import { useGlobalDragDrop } from "@/hooks/use-global-drag-drop"
import type { DirectoryScanResult } from "@/types/om-workflow"

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { openFiles, addFilesByPaths, clearAll, isLoading: ctxLoading } = useFileContext()

  React.useEffect(() => {
    clearAll()
  }, [clearAll])

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
      <div className="flex h-full w-full flex-col bg-background">
        <header className="flex shrink-0 flex-wrap items-start justify-between gap-4 px-6 pb-5 pt-10">
          <div className="min-w-0 flex-1 pt-1">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              欢迎使用 {APP_NAME}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              快速检查、对比与清洗您的文档元数据。
            </p>
          </div>
          <div className="shrink-0 pr-10 pt-3">
            <ThemeSwitch />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-6 pb-6">
          <section className="flex min-h-0 flex-1 flex-col justify-center rounded-xl border border-dashed border-primary/35 bg-linear-to-br from-primary/8 via-primary/3 to-transparent p-4">
            <DragOrUploadZone
              isLoading={ctxLoading}
              onDropFiles={handleDropFiles}
              onOpenFiles={handleOpenFiles}
            />
          </section>

          <section className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-2">
            <EntryCard
              tone="orange"
              icon={GitCompareIcon}
              title="对比视图"
              description="深度比对多份文档的作者、编辑时间与软件环境，精准识别国际串标风险。"
              badge="核心"
              actionLabel="开始对比"
              onClick={() => navigate(ROUTES.compare)}
            />
            <EntryCard
              tone="violet"
              icon={Layers01Icon}
              title="批量处理"
              description="一键解析数百个 Office 文档的隐藏属性、修订记录与自定义 XML 数据。"
              badge="高效"
              actionLabel="批量处理"
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

  useGlobalDragDrop(
    onDropFiles,
    hovering => setIsDragOver(hovering),
  )

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
      onClick={() => {
        if (!isLoading) onOpenFiles()
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl py-6 transition-colors hover:bg-primary/5",
        isDragOver && "bg-primary/8",
      )}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          if (!isLoading) onOpenFiles()
        }
      }}
    >
      <div className="flex items-center justify-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 shadow-sm dark:bg-blue-500/15 dark:text-blue-300">
          <HugeIcon icon={File01Icon} size={22} />
        </span>
        <span className="-ml-1.5 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shadow-sm dark:bg-emerald-500/15 dark:text-emerald-300">
          <HugeIcon icon={FileSpreadsheetIcon} size={22} />
        </span>
        <span className="-ml-1.5 flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 shadow-sm dark:bg-rose-500/15 dark:text-rose-300">
          <HugeIcon icon={SparklesIcon} size={22} />
        </span>
      </div>

      <div className="mt-1 flex items-center justify-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-primary/15">
          <HugeIcon icon={Upload01Icon} size={18} />
        </span>
      </div>

      <div className="mt-0.5 text-center">
        <p className="text-xs font-medium text-foreground">点击选择文件，或拖拽文件/文件夹到此处</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          支持 {extensions.join(" / ")} 及旧版格式
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Spinner className="h-3.5 w-3.5" />
          正在加载…
        </div>
      ) : (
        <span className="mt-1 text-[11px] text-muted-foreground/60">
          点击此处选择文件
        </span>
      )}

      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
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
}

const EntryCard: React.FC<{
  tone: "orange" | "violet"
  icon: React.ComponentProps<typeof HugeIcon>["icon"]
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
      : "bg-blue-500 text-white"

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col rounded-xl border bg-linear-to-br p-4 text-left transition-shadow hover:shadow-md",
        style.card,
      )}
    >
      <div className="flex items-start justify-between">
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-md", style.icon)}>
          <HugeIcon icon={Icon} size={16} />
        </span>
        <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", badgeColor)}>
          {badge}
        </span>
      </div>
      <div className="mt-3 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="mt-3 flex items-center justify-end text-xs font-medium text-primary transition-transform group-hover:translate-x-0.5">
        {actionLabel} →
      </div>
    </button>
  )
}

export default HomePage
