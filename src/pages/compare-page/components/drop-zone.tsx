import { useCallback, useEffect, useRef, useState } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { AlertCircle, FolderOpen, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useFileContext } from "@/contexts/file-context"
import { useGlobalDragDrop } from "@/hooks/use-global-drag-drop"
import type { DirectoryScanResult } from "@/types/om-workflow"

const ACCEPT_EXTS = ["docx", "doc", "xlsx", "pdf"]

function basename(path: string): string {
  const seg = path.replace(/\\/g, "/").split("/").filter(Boolean)
  return seg[seg.length - 1] ?? path
}

function basenameOfFolder(folder: string): string {
  return basename(folder.replace(/\/+$/, ""))
}

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

export const DropZone: React.FC = () => {
  const { addFilesByPaths, ensureCompany, files: ctxFiles } = useFileContext()
  const [hovering, setHovering] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const zoneRef = useRef<HTMLDivElement | null>(null)

  const ctxFilesRef = useRef(ctxFiles)
  ctxFilesRef.current = ctxFiles

  const isInsideZone = useCallback((position: { x: number; y: number } | null) => {
    if (!position) return false
    const el = zoneRef.current
    if (!el) return false
    const dpr = window.devicePixelRatio || 1
    const x = position.x / dpr
    const y = position.y / dpr
    const hit = document.elementFromPoint(x, y)
    if (!hit) return false
    return el.contains(hit) || hit === el
  }, [])

  const ingestPaths = useCallback(
    async (paths: string[]) => {
      if (paths.length === 0) return
      setBusy(true)
      setHint(null)
      for (const p of paths) {
        const lower = p.toLowerCase()
        const isSingleFile = ACCEPT_EXTS.some(ext => lower.endsWith("." + ext))
        if (isSingleFile) {
          const companyId = ensureCompany(basename(p).replace(/\.[^.]+$/, "") || "未命名")
          addFilesByPaths([p], companyId)
          continue
        }
        const sourceDir = normalizeDir(p)
        const folderName = basenameOfFolder(p)
        const listed = await scanFolder(p)
        if (listed.length === 0) {
          setHint(`未在 "${folderName}" 中找到支持的文件`)
          continue
        }
        const companyName = folderName || "未命名公司"
        const dedup = listed.filter(fp => !ctxFilesRef.current.some(f => f.filePath === fp))
        if (dedup.length === 0) {
          setHint(`"${folderName}" 中的文件已全部添加过`)
          continue
        }
        const companyId = ensureCompany(companyName, sourceDir)
        addFilesByPaths(dedup, companyId)
      }
      setBusy(false)
    },
    [addFilesByPaths, ensureCompany],
  )

  const handleHover = useCallback(
    (isHovering: boolean, position: { x: number; y: number } | null) => {
      if (isHovering) {
        if (isInsideZone(position)) setHovering(true)
      } else {
        if (!position || !isInsideZone(position)) setHovering(false)
      }
    },
    [isInsideZone],
  )

  useGlobalDragDrop(ingestPaths, handleHover)

  async function handlePickDirectory() {
    setHint(null)
    setBusy(true)
    try {
      const dir = await open({ directory: true, multiple: false })
      if (!dir) {
        setBusy(false)
        return
      }
      await ingestPaths([Array.isArray(dir) ? dir[0] : dir])
    } catch (err) {
      console.warn("pickDirectory failed", err)
      setHint("选择目录失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      ref={zoneRef}
      className={cn(
        "flex min-h-0 min-w-0 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition-all",
        "border-primary/30 bg-primary/3",
        hovering && "border-primary/60 bg-primary/6 ring-4 ring-primary/20",
      )}
    >
      {busy ? (
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-muted-foreground" strokeWidth={1.25} />
          <p className="text-fine-print text-muted-foreground">正在解析文件…</p>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-2xl transition-colors",
              hovering ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground",
            )}
          >
            {hovering ? (
              <Upload className="size-5" />
            ) : (
              <FolderOpen className="size-5" strokeWidth={1.5} />
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-ink text-fine-print font-medium">拖拽文件夹或文件至此处</p>
            <p className="text-fine-print text-muted-foreground">支持 PDF / XLSX / DOCX</p>
          </div>
          <Button
            onClick={handlePickDirectory}
            variant="outline"
            size="sm"
            className="mt-1 gap-1.5 rounded-lg"
          >
            <FolderOpen className="size-3.5" />
            选择文件夹
          </Button>
        </>
      )}

      {hint ? (
        <p className="inline-flex items-center gap-1 text-fine-print text-warning-foreground">
          <AlertCircle className="size-3" />
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export default DropZone