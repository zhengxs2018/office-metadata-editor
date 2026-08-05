import { useCallback, useEffect, useRef, useState } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import { getCurrentWebview } from "@tauri-apps/api/webview"
import { invoke } from "@tauri-apps/api/core"
import {
  AlertCircle,
  Building2,
  FileSpreadsheet,
  FileText,
  FolderPlus,
  Loader2,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useFileContext } from "@/contexts/file-context"
import { useMetadata } from "@/contexts/metadata-context"
import type { DirectoryScanResult } from "@/types/om-workflow"

const ACCEPT_EXTS = ["docx", "doc", "xlsx", "pdf"]
const ACCEPT_FILTERS = [{ name: "Office 文档", extensions: ACCEPT_EXTS }]

function iconForExt(path: string) {
  return path.toLowerCase().endsWith(".xlsx") ? FileSpreadsheet : FileText
}

function basename(path: string): string {
  const seg = path.replace(/\\/g, "/").split("/").filter(Boolean)
  return seg[seg.length - 1] ?? path
}

function basenameOfFolder(folder: string): string {
  return basename(folder.replace(/\/+$/, ""))
}

/** 规范化目录绝对路径（去尾部斜杠 + Windows 反斜杠统一），用于目录唯一性判定。 */
function normalizeDir(dir: string): string {
  return dir.replace(/[\\/]+$/, "").replace(/\\/g, "/")
}

async function scanFolder(dir: string): Promise<string[]> {
  try {
    const result = await invoke<DirectoryScanResult>("scan_directory", {
      path: dir,
      options: { recursive: true, extensions: ACCEPT_EXTS },
    })
    return result.files.map(f => f.path)
  } catch (err) {
    console.warn("scan_directory failed", dir, err)
    return []
  }
}

export type CompanySlotProps = {
  side: "left" | "right"
  title: string
  emptyHint?: string
  addFolderLabel?: string
  sourceLabel?: string
  tone?: "blue" | "orange"
}

export function CompanySlot({
  side,
  title,
  emptyHint = "拖拽文件夹至此处",
  addFolderLabel = "选择文件夹",
  sourceLabel = "或点击下方按钮选择目录",
  tone,
}: CompanySlotProps) {
  const resolvedTone: "blue" | "orange" = tone ?? (side === "left" ? "blue" : "orange")
  const {
    addFilesByPaths,
    removeFile,
    files: ctxFiles,
    ensureCompany,
    removeCompany,
    companyById,
  } = useFileContext()
  const { documents } = useMetadata()
  const [hovering, setHovering] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement | null>(null)

  const companyEntry = Object.values(companyById).find(c => c.side === side) ?? null
  const slotDocs = documents.filter(d => d.companyId === companyEntry?.id)
  const totalFiles = slotDocs.length
  const readyFiles = slotDocs.filter(d => d.status === "ready").length

  // 拖拽监听器闭包捕获的是旧 render 的 companyById，用 ref 保证读到最新公司表。
  const companyByIdRef = useRef(companyById)
  companyByIdRef.current = companyById

  /** 用 CSS 坐标 + elementFromPoint 判定拖拽点是否落在此槽位内（比 getBoundingClientRect 边界判定更稳）。 */
  const isInsideSlot = useCallback((position: { x: number; y: number }) => {
    const el = sectionRef.current
    if (!el) return false
    const dpr = window.devicePixelRatio || 1
    const x = position.x / dpr
    const y = position.y / dpr
    const hit = document.elementFromPoint(x, y)
    if (!hit) return false
    return el.contains(hit) || hit === el
  }, [])

  useEffect(() => {
    let unlisten: (() => void) | undefined
    const setup = async () => {
      try {
        const webview = getCurrentWebview()
        unlisten = await webview.onDragDropEvent(event => {
          const t = event.payload.type
          if (t === "enter" || t === "over") {
            const pos = (event.payload as { position?: { x: number; y: number } }).position
            if (pos && isInsideSlot(pos)) setHovering(true)
          } else if (t === "leave") {
            const pos = (event.payload as { position?: { x: number; y: number } }).position
            if (!pos || !isInsideSlot(pos)) setHovering(false)
          } else if (t === "drop") {
            const payload = event.payload as {
              paths?: string[]
              position?: { x: number; y: number }
            }
            if (payload.position && isInsideSlot(payload.position)) {
              setHovering(false)
              const paths = payload.paths ?? []
              void ingestPaths(paths)
            }
          }
        })
      } catch (err) {
        console.warn("onDragDropEvent failed", err)
      }
    }
    void setup()
    return () => {
      try {
        unlisten?.()
      } catch {
        // webview may already be torn down
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, companyEntry?.id, isInsideSlot])

  async function ingestPaths(paths: string[]) {
    if (paths.length === 0) return
    setBusy(true)
    setHint(null)
    const filePaths: string[] = []
    let folderName: string | null = null
    let sourceDir: string | null = null
    for (const p of paths) {
      const lower = p.toLowerCase()
      if (ACCEPT_EXTS.some(ext => lower.endsWith("." + ext))) {
        filePaths.push(p)
      } else {
        sourceDir = normalizeDir(p)
        folderName = basenameOfFolder(p)
        const listed = await scanFolder(p)
        for (const lp of listed) filePaths.push(lp)
      }
    }
    if (filePaths.length === 0) {
      setHint("未找到 .docx / .doc / .xlsx / .pdf 文件")
      setBusy(false)
      return
    }
    if (sourceDir) {
      const oppositeSide = side === "left" ? "right" : "left"
      const opposite = Object.values(companyByIdRef.current).find(c => c.side === oppositeSide)
      if (opposite?.sourceDir && normalizeDir(opposite.sourceDir) === sourceDir) {
        setHint("该目录已在另一侧，请更换目录")
        setBusy(false)
        return
      }
    }
    const name = companyEntry?.name ?? folderName ?? (side === "left" ? "基准方" : "对比方")
    const companyId = ensureCompany(side, name, sourceDir ?? undefined)
    const dedup = filePaths.filter(p => !ctxFiles.some(f => f.filePath === p))
    const added = addFilesByPaths(dedup, companyId)
    if (added === 0 && dedup.length > 0) {
      setHint("这些文件已添加过")
    }
    setBusy(false)
  }

  async function handlePickDirectory() {
    setHint(null)
    try {
      const dir = await open({ directory: true, multiple: false })
      if (!dir) return
      await ingestPaths([Array.isArray(dir) ? dir[0] : dir])
    } catch (err) {
      console.warn("pickDirectory failed", err)
      setHint("选择目录失败")
      setBusy(false)
    }
  }

  async function handlePickFiles() {
    setHint(null)
    try {
      const result = await open({ multiple: true, filters: ACCEPT_FILTERS })
      if (result == null) return
      const paths = Array.isArray(result) ? result : [result]
      if (paths.length === 0) return
      await ingestPaths(paths)
    } catch (err) {
      console.warn("pickFiles failed", err)
      setHint("选择文件失败")
      setBusy(false)
    }
  }

  function handleClear() {
    for (const d of slotDocs) removeFile(d.id)
    if (companyEntry) removeCompany(companyEntry.id)
    setHint(null)
  }

  const accent =
    resolvedTone === "blue"
      ? "border-sky-300/70 bg-sky-50/40"
      : "border-orange-300/70 bg-orange-50/40"
  const ringHover = resolvedTone === "blue" ? "ring-sky-400/60" : "ring-orange-400/60"
  const buttonCls =
    resolvedTone === "blue"
      ? "bg-sky-600 hover:bg-sky-700 text-white"
      : "bg-orange-500 hover:bg-orange-600 text-white"

  return (
    <section
      ref={sectionRef}
      className={cn(
        "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border-2 border-dashed transition-all",
        accent,
        hovering && cn("ring-4 ring-offset-2", ringHover),
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-ink text-caption font-semibold">{title}</h3>
          {companyEntry ? (
            <span
              className="truncate text-fine-print text-muted-foreground"
              title={companyEntry.name}
            >
              · {companyEntry.name}
            </span>
          ) : null}
        </div>
        {companyEntry ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="清空该方"
            onClick={handleClear}
            className="shrink-0 rounded-lg text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </Button>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        {busy ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="size-12 animate-spin text-muted-foreground" strokeWidth={1.25} />
            <p className="text-fine-print text-muted-foreground">正在解析文件…</p>
          </div>
        ) : !companyEntry ? (
          <div className="flex w-full max-w-xs flex-col items-center gap-4">
            <FolderPlus
              className={cn(
                "size-14 shrink-0",
                resolvedTone === "blue" ? "text-sky-500/70" : "text-orange-500/70",
              )}
              strokeWidth={1.25}
            />
            <div className="space-y-1">
              <p className="text-ink text-fine-print font-medium">{emptyHint}</p>
              <p className="text-fine-print text-muted-foreground">{sourceLabel}</p>
              <p className="text-fine-print text-muted-foreground">支持格式：PDF、XLSX、DOCX</p>
            </div>
            <Button
              onClick={handlePickDirectory}
              disabled={busy}
              className={cn("rounded-lg px-6", buttonCls)}
            >
              {addFolderLabel}
            </Button>
          </div>
        ) : (
          <div className="flex min-h-0 w-full flex-1 flex-col">
            <div className="flex items-center justify-between gap-2 px-1 pb-2">
              <div className="flex items-center gap-1.5 text-fine-print text-muted-foreground">
                <Building2 className="size-3.5" />
                <span className="tabular-nums">
                  {readyFiles}/{totalFiles} 已加载
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePickFiles}
                className="h-7 gap-1 rounded-md text-fine-print"
              >
                追加文件
              </Button>
            </div>
            <ScrollArea className="min-h-0 flex-1 pr-1">
              <ul className="space-y-0.5">
                {slotDocs.map(doc => {
                  const Icon = iconForExt(doc.filePath)
                  const isReady = doc.status === "ready"
                  const isError = doc.status === "error"
                  return (
                    <li key={doc.id}>
                      <div
                        className={cn(
                          "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-fine-print",
                          !isReady && !isError && "opacity-60",
                        )}
                        title={doc.filePath}
                      >
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">
                          {doc.metadata.fileName || basename(doc.filePath)}
                        </span>
                        <span className="shrink-0 text-micro-legal text-muted-foreground">
                          {isReady ? "就绪" : isError ? "失败" : doc.progressMessage || "读取中"}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </ScrollArea>
          </div>
        )}

        {hint ? (
          <p className="inline-flex items-center gap-1 text-fine-print text-warning-foreground">
            <AlertCircle className="size-3" />
            {hint}
          </p>
        ) : null}
      </div>
    </section>
  )
}

export default CompanySlot
