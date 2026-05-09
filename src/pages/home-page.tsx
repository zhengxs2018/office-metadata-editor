import React from "react"
import { useNavigate } from "react-router-dom"
import {
  CloudSun,
  Moon,
  Sun,
  ArrowUpRight,
  Layers3,
  Settings,
  Server,
  FolderArchive,
} from "lucide-react"

import { useFileContext } from "@/contexts/file-context"
import { useTheme } from "@/components/theme-provider"
import { OmFileUploadZone } from "@/components/om/om-file-upload-zone"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { APP_NAME } from "@/lib/app-config"
import { SUPPORTED_FILE_EXTENSIONS } from "@/lib/documents/supported-formats"
import BlankLayout from "@/layouts/blank-layout"

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { openFiles, addFilesByPaths, clearFiles, isLoading: ctxLoading } = useFileContext()
  const { theme, resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    clearFiles()
  }, [clearFiles])

  const handleOpenFiles = async () => {
    const added = await openFiles()
    if (added > 0) {
      navigate("/editor")
    }
  }

  const handleDropFiles = (paths: string[]) => {
    const added = addFilesByPaths(paths)
    if (added > 0) {
      navigate("/editor")
    }
  }

  return (
    <BlankLayout>
      <div className="relative h-full w-full overflow-hidden bg-[linear-gradient(165deg,oklch(0.99_0.01_245)_0%,oklch(0.985_0.02_190)_48%,oklch(0.97_0.025_150)_100%)] dark:bg-[linear-gradient(165deg,oklch(0.23_0.015_248)_0%,oklch(0.2_0.02_210)_50%,oklch(0.19_0.02_170)_100%)]">
        <div className="pointer-events-none absolute -top-30 left-1/2 h-95 w-95 -translate-x-1/2 rounded-full bg-white/35 blur-3xl dark:bg-white/8" />

        <div className="relative flex h-full min-h-0 flex-col overflow-hidden px-7 pt-10 pb-4">
          <div className="flex items-center justify-between pb-4">
            <div className="rounded-md border border-border/60 bg-card/75 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm select-none">
              {APP_NAME}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-md bg-card/75 backdrop-blur-sm"
                >
                  {theme === "system" ? (
                    <CloudSun className="h-4 w-4" />
                  ) : resolvedTheme === "dark" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel>主题</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={theme}
                  onValueChange={value => setTheme(value as "dark" | "light" | "system")}
                >
                  <DropdownMenuRadioItem value="light">白天</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark">暗黑</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="system">跟随系统</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="mx-auto grid h-full min-h-0 w-full max-w-7xl grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[0.88fr_1.12fr]">
            <section className="flex min-h-0 flex-col gap-4 self-start">
              <div className="rounded-lg border border-border/55 bg-card/84 p-5 backdrop-blur-md">
                <p className="text-[2.2rem] leading-[1.05] font-semibold tracking-tight text-foreground">
                  Office 元数据编辑器
                </p>
                <p className="mt-2.5 max-w-lg text-[14px] leading-6 text-muted-foreground">
                  读取、编辑、清理、批处理全部本地完成，支持多格式文档的元数据处理。
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-medium tracking-[0.02em] text-muted-foreground">
                  {["全程本地", "文档回源", "批量提速", "多格式支持"].map(item => (
                    <span key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary/55" />
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-border/55 bg-card/84 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">快捷入口</p>
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FolderArchive className="h-4 w-4" />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2.5 xl:grid-cols-3">
                  <ShortcutCard
                    title="批量处理"
                    icon={Layers3}
                    onClick={() => navigate("/batch")}
                  />
                  <ShortcutCard
                    title="模板中心"
                    icon={Settings}
                    onClick={() => navigate("/templates")}
                  />
                  <ShortcutCard title="启动服务" icon={Server} onClick={() => navigate("/server")} />
                </div>
              </div>
            </section>

            <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/55 bg-card/86 p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">快速导入</p>
                  <p className="mt-1 text-xs text-muted-foreground">拖入文件或直接点击上传区域</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  {SUPPORTED_FILE_EXTENSIONS.map(ext => (
                    <span
                      key={ext}
                      className="rounded-md bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
                    >
                      .{ext}
                    </span>
                  ))}
                </div>
              </div>

              <OmFileUploadZone
                className="flex-1"
                isLoading={ctxLoading}
                onOpenFiles={handleOpenFiles}
                onDropFiles={handleDropFiles}
              />
            </section>
          </div>
        </div>
      </div>
    </BlankLayout>
  )
}

interface ShortcutCardProps {
  title: string
  icon: React.FC<{ className?: string }>
  onClick: () => void
}

const ShortcutCard: React.FC<ShortcutCardProps> = ({ title, icon: Icon, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-24 flex-col justify-between rounded-lg bg-background/72 p-3 text-left transition-colors hover:bg-background"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <ArrowUpRight className="h-4 w-4 text-primary/70 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>
    </button>
  )
}
