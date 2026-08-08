import { useEffect, useRef } from 'react';
import { getCurrentWebview } from '@tauri-apps/api/webview';

type DropHandler = (paths: string[]) => void;
type HoverHandler = (hovering: boolean, position: { x: number; y: number } | null) => void;

let unlistenFn: (() => void) | null = null;
let setupPromise: Promise<void> | null = null;
let refCount = 0;

// 用 ref 对象保持最新回调引用，避免 empty-deps useEffect 陈旧闭包
let dropHandlerRef: { current: DropHandler | null } = { current: null };
let hoverHandlerRef: { current: HoverHandler | null } = { current: null };

async function setupListener() {
  if (unlistenFn) return;
  if (setupPromise) return setupPromise;
  setupPromise = (async () => {
    try {
      const webview = getCurrentWebview();
      const fn = await webview.onDragDropEvent(event => {
        const t = event.payload.type;
        if (t === 'enter' || t === 'over') {
          const pos = (event.payload as { position?: { x: number; y: number } }).position ?? null;
          hoverHandlerRef.current?.(true, pos);
        } else if (t === 'leave') {
          const pos = (event.payload as { position?: { x: number; y: number } }).position ?? null;
          hoverHandlerRef.current?.(false, pos);
        } else if (t === 'drop') {
          const payload = event.payload as { paths?: string[] };
          hoverHandlerRef.current?.(false, null);
          const paths = payload.paths ?? [];
          if (paths.length > 0) dropHandlerRef.current?.(paths);
        }
      });
      unlistenFn = fn;
    } catch (err) {
      console.warn('[useGlobalDragDrop] 监听拖拽事件失败:', err);
    } finally {
      setupPromise = null;
    }
  })();
  return setupPromise;
}

export function useGlobalDragDrop(onDrop: DropHandler | null, onHover: HoverHandler | null = null) {
  // 每次 render 同步 ref 到最新值，避免陈旧闭包
  const onDropRef = useRef(onDrop);
  const onHoverRef = useRef(onHover);
  onDropRef.current = onDrop;
  onHoverRef.current = onHover;

  useEffect(() => {
    refCount++;
    dropHandlerRef = onDropRef;
    hoverHandlerRef = onHoverRef;
    void setupListener();
    return () => {
      refCount--;
      if (dropHandlerRef === onDropRef) dropHandlerRef = { current: null };
      if (hoverHandlerRef === onHoverRef) hoverHandlerRef = { current: null };
      if (refCount === 0 && unlistenFn) {
        try {
          unlistenFn();
        } catch {
          // webview may already be torn down
        }
        unlistenFn = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
