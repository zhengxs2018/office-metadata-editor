import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useFileContext } from "@/contexts/file-context"
import { useFileStore } from "@/stores/v2-stores"
import { useTheme } from "@/components/theme-provider"
import { OmFileUploadZone } from "@/components/om/om-file-upload-zone"
import { DirectoryFileBrowser } from "@/components/v2/directory-file-browser"
import { TemplateManager } from "@/components/v2/template-manager"
import { ExportCenter } from "@/components/v2/export-center"
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
import {
  ArrowRight,
  CloudSun,
  Layers3,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  Upload,
  Zap,
  FolderOpen,
  FileSpreadsheet,
  Brain,
  Settings,
} from "lucide-react"
import { SUPPORTED_FILE_EXTENSIONS } from "@/lib/documents/supported-formats"
import { APP_NAME } from "@/lib/app-config"
import BlankLayout from "@/layouts/blank-layout"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

export const HomePage: React.FC = () => {
  const navigate = useNavigate()
  const { openFiles, isLoading: ctxLoading } = useFileContext()
  const { addFiles, importSelectedFiles } = useFileStore()
  const { theme, resolvedTheme, setTheme } = useTheme()
  
  const [showDirectoryBrowser, setShowDirectoryBrowser] = useState(false)
  const [showTemplateManager, setShowTemplateManager] = useState(false)
  const [showExportCenter, setShowExportCenter] = useState(false)
  const [activeTab, setActiveTab] = useState<'upload' | 'directory'>('upload')

  const handleOpenFiles = async () => {
    const added = await openFiles()
    if (added === 0) return
    navigate("/editor")
  }

  const handleDirectoryImportComplete = async () => {
    setShowDirectoryBrowser(false)
    navigate("/batch")
  }

  return (
    <BlankLayout>
      <div className="relative h-full w-full overflow-hidden">
        {/* 背景装饰层，z-index:0，拖拽区始终在顶层 */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_14%_12%,oklch(0.9_0.11_245/0.18),transparent_48%),radial-gradient(circle_at_86%_78%,oklch(0.88_0.1_162/0.16),transparent_46%)] dark:bg-[radial-gradient(circle_at_14%_12%,oklch(0.4_0.11_245/0.24),transparent_48%),radial-gradient(circle_at_86%_78%,oklch(0.4_0.08_162/0.22),transparent_46%)]" />

        <div className="relative flex h-full flex-col px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center justify-between">
            <div className="rounded-full border border-border/70 bg-card/75 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm select-none">
              {APP_NAME}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-full bg-card/75 backdrop-blur-sm"
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

          <div className="mx-auto grid h-full w-full max-w-7xl grid-cols-1 items-start gap-6 py-4 lg:grid-cols-[1.1fr_0.9fr]">
            {/* 左侧：主要功能和导航 */}
            <section className="rounded-xl border border-border/70 bg-card/72 p-6 shadow-xl backdrop-blur-sm sm:p-8">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary select-none">
                <Sparkles className="h-3.5 w-3.5" />
                v2.0 全新升级
              </p>
              <h1 className="text-3xl leading-tight font-semibold tracking-tight text-foreground sm:text-4xl select-none">
                Office 元数据编辑器
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base select-none">
                读取、编辑、清理、批处理全部本地完成，支持多格式文档的元数据处理。新增模板管理、目录扫描、AI 集成等强大功能。
              </p>

              <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-4">
                <OmFeatureItem icon={ShieldCheck} text="全程本地" />
                <OmFeatureItem icon={Upload} text="拖拽即用" />
                <OmFeatureItem icon={Zap} text="批量提速" />
                <OmFeatureItem icon={Brain} text="AI 集成" />
              </div>

              {/* 核心功能入口 */}
              <div className="mt-7 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowDirectoryBrowser(true)}
                  className="group flex items-center justify-between w-full rounded-2xl border border-blue-500/25 bg-blue-500/10 px-4 py-3.5 text-left transition-all hover:bg-blue-500/18 hover:shadow-md"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold text-blue-600 dark:text-blue-400">
                    <FolderOpen className="h-5 w-5" />
                    选择目录批量导入
                    <span className="text-xs font-normal text-blue-500/80 ml-1">新</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-blue-600 dark:text-blue-400 transition-transform group-hover:translate-x-1" />
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/batch")}
                  className="group flex items-center justify-between w-full rounded-2xl border border-primary/25 bg-primary/12 px-4 py-3 text-left transition-colors hover:bg-primary/18"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Layers3 className="h-4 w-4" />
                    打开批量处理工作台
                  </span>
                  <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5" />
                </button>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setShowTemplateManager(true)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-purple-500/25 bg-purple-500/10 p-4 text-center transition-colors hover:bg-purple-500/18"
                  >
                    <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">模板管理</span>
                  </button>
                  <button
                    onClick={() => setShowExportCenter(true)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-green-500/25 bg-green-500/10 p-4 text-center transition-colors hover:bg-green-500/18"
                  >
                    <FileSpreadsheet className="h-6 w-6 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">导出中心</span>
                  </button>
                </div>

                <Button
                  variant="secondary"
                  className="w-full rounded-xl mt-2"
                  onClick={() => void handleOpenFiles()}
                >
                  直接开始编辑
                </Button>
              </div>

              <p className="mt-5 text-xs text-muted-foreground select-none">
                💡 提示：使用模板可一键应用元数据到多个文件，大幅提升效率。
              </p>
            </section>

            <section className="mx-auto w-full max-w-125 rounded-xl border border-border/70 bg-card/82 p-5 shadow-xl backdrop-blur-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3 select-none">
                <div>
                  <p className="text-sm font-semibold text-foreground">拖拽上传并开始</p>
                  <p className="text-xs text-muted-foreground">
                    单文件编辑或多文件批处理都可从这里进入
                  </p>
                </div>
              </div>

              <OmFileUploadZone onOpenFiles={handleOpenFiles} isLoading={ctxLoading} />

              <div className="mt-6">
                <p className="mb-2 text-xs font-medium text-muted-foreground select-none">支持的文件类型</p>
                <div className="flex flex-wrap gap-2">
                  {SUPPORTED_FILE_EXTENSIONS.map(type => (
                    <OmFileTypeBadge key={type} type={type} supported />
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* 目录浏览器对话框 */}
        <Dialog open={showDirectoryBrowser} onOpenChange={setShowDirectoryBrowser}>
          <DialogContent className="max-w-5xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>选择目录批量导入</DialogTitle>
              <DialogDescription>
                扫描指定目录下的所有支持文档，勾选后批量导入到工作区
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 -mx-6 -mb-6">
              <DirectoryFileBrowser onImportComplete={handleDirectoryImportComplete} />
            </div>
          </DialogContent>
        </Dialog>

        {/* 模板管理器对话框 */}
        <Dialog open={showTemplateManager} onOpenChange={setShowTemplateManager}>
          <DialogContent className="max-w-4xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>元数据模板管理</DialogTitle>
              <DialogDescription>
                创建、编辑、导入导出元数据模板，一键应用到多个文件
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 -mx-6 -mb-6">
              <TemplateManager />
            </div>
          </DialogContent>
        </Dialog>

        {/* 导出中心对话框 */}
        <Dialog open={showExportCenter} onOpenChange={setShowExportCenter}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>导出元数据</DialogTitle>
              <DialogDescription>
                将当前工作区的元数据导出为 JSON、Excel、CSV 或 XML 格式
              </DialogDescription>
            </DialogHeader>
            <div className="-mx-6 -mb-6">
              <ExportCenter />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </BlankLayout>
  )
}

interface OmFeatureItemProps {
  icon: React.FC<{ className?: string }>
  text: string
}

const OmFeatureItem: React.FC<OmFeatureItemProps> = ({ icon: Icon, text }) => {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-muted-foreground">
      <Icon className="h-4 w-4 text-primary" />
      <span className="text-xs font-medium select-none">{text}</span>
    </div>
  )
}

interface OmFileTypeBadgeProps {
  type: string
  supported: boolean
}

const OmFileTypeBadge: React.FC<OmFileTypeBadgeProps> = ({ type, supported }) => {
  return (
    <span
      className={`rounded-md px-2 py-1 text-xs font-medium ${
        supported
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground line-through opacity-50"
      }`}
    >
      .{type}
    </span>
  )
}
