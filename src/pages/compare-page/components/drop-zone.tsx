import { useCallback, useRef, useState } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { HugeIcon } from "@/components/icons/huge-icon"
import { AlertCircleIcon, FolderOpenIcon, Loading02Icon, Upload01Icon } from "@hugeicons/core-free-icons"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useFileContext } from "@/contexts/file-context"
import { useGlobalDragDrop } from "@/hooks/use-global-drag-drop"
import type { DirectoryScanResult } from "@/types/om-workflow"
import { getStopWords } from "@/lib/documents/compare/stop-words"

const ACCEPT_EXTS = ["docx", "doc", "xlsx", "pdf"]

/** 非公司目录提示词（来自分类停用词词典，不在本文件硬编码）。 */
const NON_COMPANY_DIR_HINTS = getStopWords("compare.folders.stop_words")

function isHiddenSegment(seg: string): boolean {
  return seg.startsWith(".")
}

/** 判断直接子目录名是否为投标公司目录（而非招标文件/缓存目录） */
function isCompanyDirName(name: string): boolean {
  if (isHiddenSegment(name)) return false
  const lower = name.toLowerCase()
  return !NON_COMPANY_DIR_HINTS.some(hint => lower.includes(hint))
}

/** 过滤临时文件（如 .~xxx.xlsx） */
function isRealFile(path: string): boolean {
  return !path.split("/").some(seg => seg.startsWith(".~"))
}

/**
 * 从顶层文件夹的全部文件中，按「直接子目录」推断投标公司目录。
 * 返回 公司目录名 -> 该目录递归下的支持文件列表。
 */
function splitCompanyDirs(baseDir: string, allFiles: string[]): Map<string, string[]> {
  const base = normalizeDir(baseDir)
  const children = new Map<string, string[]>()
  for (const f of allFiles) {
    if (!isRealFile(f)) continue
    const rel = normalizeDir(f).slice(base.length + 1)
    const slash = rel.indexOf("/")
    if (slash <= 0) continue
    const top = rel.slice(0, slash)
    if (!isCompanyDirName(top)) continue
    const arr = children.get(top) ?? []
    arr.push(f)
    children.set(top, arr)
  }
  return children
}

/** 文件选择模式 */
export type DropZoneMode = "both" | "file" | "directory"

export interface DropZoneProps {
  /**
   * 选择模式：
   * - `"both"`：点击=文件对话框，拖拽=文件+目录，保留「选择文件夹」按钮
   * - `"file"`：仅文件，点击=文件对话框，拖拽只接受文件，无目录按钮
   * - `"directory"`：仅目录，点击=目录对话框，拖拽只接受目录，无文件按钮
   * @default "both"
   */
  mode?: DropZoneMode
}

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

export const DropZone: React.FC<DropZoneProps> = ({ mode = "both" }) => {
  const { addFilesByPaths, ensureCompany, files: ctxFiles } = useFileContext()
  const [hovering, setHovering] = useState(false)
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const zoneRef = useRef<HTMLDivElement | null>(null)

  const ctxFilesRef = useRef(ctxFiles)
  ctxFilesRef.current = ctxFiles

  const canAcceptFile = mode !== "directory"
  const canAcceptDir = mode !== "file"

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
        // 按模式过滤非法路径
        if (isSingleFile && !canAcceptFile) continue
        if (!isSingleFile && !canAcceptDir) continue

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
        const companyDirs = splitCompanyDirs(p, listed)
        if (companyDirs.size >= 2) {
          let added = 0
          for (const [dirName, dirFiles] of companyDirs) {
            const dedup = dirFiles.filter(fp => !ctxFilesRef.current.some(f => f.filePath === fp))
            if (dedup.length === 0) continue
            const companyId = ensureCompany(dirName, normalizeDir(p) + "/" + dirName)
            addFilesByPaths(dedup, companyId)
            added++
          }
          if (added > 0) {
            setHint(`已从 "${folderName}" 自动识别 ${added} 个投标公司目录`)
          } else {
            setHint(`"${folderName}" 中的文件已全部添加过`)
          }
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
    [addFilesByPaths, ensureCompany, canAcceptFile, canAcceptDir],
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

  async function handlePickFiles() {
    setHint(null)
    setBusy(true)
    try {
      const selected = await open({
        multiple: true,
        filters: [{ name: "支持的文档", extensions: ACCEPT_EXTS }],
      })
      if (!selected) {
        setBusy(false)
        return
      }
      const paths = Array.isArray(selected) ? selected : [selected]
      await ingestPaths(paths)
    } catch (err) {
      console.warn("pickFiles failed", err)
      setHint("选择文件失败")
    } finally {
      setBusy(false)
    }
  }

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

  /** 区域点击行为：目录模式=目录对话框，其他=文件对话框 */
  const handleZoneClick = () => {
    if (busy) return
    if (mode === "directory") {
      handlePickDirectory()
    } else {
      handlePickFiles()
    }
  }

  const description = {
    both: "点击或拖拽文件/文件夹至此处",
    file: "点击或拖拽文件至此处",
    directory: "点击或拖拽文件夹至此处",
  } as const

  return (
    <div
      ref={zoneRef}
      onClick={handleZoneClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          handleZoneClick()
        }
      }}
      className={cn(
        "flex min-h-0 min-w-0 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-all",
        "cursor-pointer border-primary/30 bg-primary/3 hover:bg-primary/5",
        hovering && "border-primary/60 bg-primary/6 ring-4 ring-primary/20",
      )}
    >
      {busy ? (
        <div className="flex flex-col items-center gap-3">
          <HugeIcon icon={Loading02Icon} size={32} className="animate-spin text-muted-foreground" />
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
              <HugeIcon icon={Upload01Icon} size={20} />
            ) : (
              <HugeIcon icon={FolderOpenIcon} size={20} />
            )}
          </div>
          <div className="space-y-0.5">
            <p className="text-sm text-fine-print font-medium">{description[mode]}</p>
            <p className="mt-4 text-xs text-fine-print text-muted-foreground">支持 PDF / XLSX / DOCX</p>
          </div>
          {mode === "both" && (
            <Button
              onClick={e => {
                e.stopPropagation()
                handlePickDirectory()
              }}
              variant="outline"
              size="sm"
              className="mt-1 gap-1.5 rounded-lg"
            >
              <HugeIcon icon={FolderOpenIcon} size={14} />
              选择文件夹
            </Button>
          )}
        </>
      )}

      {hint ? (
        <p className="inline-flex items-center gap-1 text-fine-print text-warning-foreground">
          <HugeIcon icon={AlertCircleIcon} size={12} />
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export default DropZone
