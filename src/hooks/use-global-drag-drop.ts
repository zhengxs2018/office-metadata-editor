import { useEffect } from "react"
import { getCurrentWebview } from "@tauri-apps/api/webview"

type DropHandler = (paths: string[]) => void
type HoverHandler = (hovering: boolean, position: { x: number; y: number } | null) => void

let dropHandler: DropHandler | null = null
let hoverHandler: HoverHandler | null = null
let unlistenFn: (() => void) | null = null
let setupPromise: Promise<void> | null = null
let refCount = 0

async function setupListener() {
  if (unlistenFn) return
  if (setupPromise) return setupPromise
  setupPromise = (async () => {
    try {
      const webview = getCurrentWebview()
      const fn = await webview.onDragDropEvent(event => {
        const t = event.payload.type
        if (t === "enter" || t === "over") {
          const pos = (event.payload as { position?: { x: number; y: number } }).position ?? null
          hoverHandler?.(true, pos)
        } else if (t === "leave") {
          const pos = (event.payload as { position?: { x: number; y: number } }).position ?? null
          hoverHandler?.(false, pos)
        } else if (t === "drop") {
          const payload = event.payload as { paths?: string[] }
          hoverHandler?.(false, null)
          const paths = payload.paths ?? []
          if (paths.length > 0) dropHandler?.(paths)
        }
      })
      unlistenFn = fn
    } catch (err) {
      console.warn("[useGlobalDragDrop] 监听拖拽事件失败:", err)
    } finally {
      setupPromise = null
    }
  })()
  return setupPromise
}

export function useGlobalDragDrop(
  onDrop: DropHandler | null,
  onHover: HoverHandler | null = null,
) {
  useEffect(() => {
    refCount++
    if (onDrop) dropHandler = onDrop
    if (onHover) hoverHandler = onHover
    void setupListener()
    return () => {
      refCount--
      if (dropHandler === onDrop) dropHandler = null
      if (hoverHandler === onHover) hoverHandler = null
      if (refCount === 0 && unlistenFn) {
        try {
          unlistenFn()
        } catch {
          // webview may already be torn down
        }
        unlistenFn = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}