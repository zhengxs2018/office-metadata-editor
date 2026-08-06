import React from "react"
import { useNavigate } from "react-router-dom"
import {
  Upload01Icon,
  Layers01Icon,
  GitCompareIcon,
  Shield01Icon,
  Mouse01Icon,
  ZapIcon,
} from "@hugeicons/core-free-icons"

import { useFileContext } from "@/contexts/file-context"
import { ThemeSwitch } from "@/components/chrome/theme-switch"
import { Spinner } from "@/components/ui/spinner"
import { Button } from "@/components/ui/button"
import { APP_NAME } from "@/lib/app-config"
import { SUPPORTED_FILE_EXTENSIONS } from "@/lib/documents/supported-formats"
import { cn } from "@/lib/utils"
import { invoke } from "@tauri-apps/api/core"
import { HugeIcon } from "@/components/icons/huge-icon"
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
        <header className="mt-4 mb-10 flex items-start justify-end gap-4 px-6 pb-3 pt-10">
          <div className="shrink-0 pr-10 pt-3">
            <ThemeSwitch />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-6 pb-6">
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 min-[820px]:grid-cols-[1.4fr_1fr]">
            <section className="flex flex-col rounded-xl p-5 sm:p-6">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                {APP_NAME}
              </h2>
              <p className="mt-2 text-sm leading-5 text-muted-foreground">
                读取、编辑、清理、批处理全部本地完成，支持多格式文档的元数据处理。
              </p>
            </section>

            <section className="flex min-h-0 flex-col rounded-xl border border-dashed border-primary/35 bg-linear-to-br from-primary/8 via-primary/3 to-transparent p-4">
              <DragOrUploadZone
                isLoading={ctxLoading}
                onDropFiles={handleDropFiles}
                onOpenFiles={handleOpenFiles}
              />
            </section>
          </div>

          <section className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-2">
            <EntryCard
              tone="orange"
              icon={GitCompareIcon}
              title="对比视图"
              description="深度比对多份文档的作者、编辑时间与软件环境，精准识别国际串标风险。"
              badge="核心"
              onClick={() => navigate(ROUTES.compare)}
            />
            <EntryCard
              tone="violet"
              icon={Layers01Icon}
              title="批量处理"
              description="一键解析数百个 Office 文档的隐藏属性、修订记录与自定义 XML 数据。"
              badge="高效"
              onClick={() => navigate(ROUTES.batch)}
            />
          </section>
        </div>
      </div>
    </BlankLayout>
  )
}

const FeatureChip: React.FC<{
  icon: React.ComponentProps<typeof HugeIcon>["icon"]
  text: string
}> = ({ icon: Icon, text }) => (
  <span className="inline-flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground">
    <HugeIcon icon={Icon} size={13} className="text-primary" />
    {text}
  </span>
)

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
        "flex min-h-0 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg py-4 transition-colors hover:bg-primary/5",
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
      <div className="flex items-center justify-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-primary/15">
          <HugeIcon icon={Upload01Icon} size={16} />
        </span>
      </div>

      <div className="text-center">
        <p className="text-xs font-medium text-foreground">
          点击或拖拽文件 / 文件夹到此处
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          支持多格式文档，单文件或多文件皆可
        </p>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/80">
        {extensions.map(ext => (
          <span
            key={ext}
            className="rounded border border-border/60 bg-background/60 px-1.5 py-0.5"
          >
            {ext}
          </span>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Spinner className="h-3 w-3" />
          正在加载…
        </div>
      )}
    </div>
  )
}

const TONE_STYLES: Record<string, { card: string; icon: string }> = {
  orange: {
    card: "from-orange-500/15 to-orange-500/0 border-orange-500/20",
    icon: "bg-orange-500/10 text-orange-600 dark:text-orange-300",
  },
  violet: {
    card: "from-violet-500/15 to-violet-500/0 border-violet-500/20",
    icon: "bg-violet-500/10 text-violet-600 dark:text-violet-300",
  },
}

const EntryCard: React.FC<{
  tone: "orange" | "violet"
  icon: React.ComponentProps<typeof HugeIcon>["icon"]
  title: string
  description: string
  badge: string
  onClick: () => void
}> = ({ tone, icon: Icon, title, description, badge, onClick }) => {
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
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-end text-xs font-medium text-primary transition-transform group-hover:translate-x-0.5">
        {badge === "核心" ? "开始对比" : "批量处理"} →
      </div>
    </button>
  )
}

export default HomePage
