import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { getCurrentWindow } from "@tauri-apps/api/window"

import { useTheme } from "@/components/theme-provider"
import { isTauri } from "@/lib/tauri"

export function ChromeThemeSync() {
  const location = useLocation()
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    if (!isTauri()) return

    const rafId = window.requestAnimationFrame(() => {
      const color = resolvePageBackgroundColor()

      if (color) {
        void getCurrentWindow()
          .setBackgroundColor(color)
          .catch(() => {
            // Ignore permission/runtime errors to avoid unhandled promise rejections.
          })
      }
    })

    return () => void window.cancelAnimationFrame(rafId)
  }, [location.pathname, resolvedTheme])

  return null
}

function resolvePageBackgroundColor(): [number, number, number, number] | null {
  const shell = document.querySelector("[data-ui-scroll-container]") as HTMLElement | null
  const candidates = [shell, document.body, document.documentElement].filter(
    Boolean,
  ) as HTMLElement[]

  for (const element of candidates) {
    const colorText = window.getComputedStyle(element).backgroundColor
    const rgba = parseCssColorToRgba(colorText)
    if (rgba) {
      return rgba
    }
  }

  return null
}

function parseCssColorToRgba(colorText: string): [number, number, number, number] | null {
  const trimmed = colorText.trim()
  if (!trimmed) {
    return null
  }

  const rgbMatch = trimmed.match(/^rgba?\((.+)\)$/i)
  if (rgbMatch?.[1]) {
    const parts = rgbMatch[1].split(",").map(part => part.trim())
    if (parts.length < 3) {
      return null
    }

    const red = Number(parts[0])
    const green = Number(parts[1])
    const blue = Number(parts[2])
    const alpha = parts[3] !== undefined ? Math.round(Number(parts[3]) * 255) : 255

    if (
      Number.isFinite(red) &&
      Number.isFinite(green) &&
      Number.isFinite(blue) &&
      Number.isFinite(alpha)
    ) {
      return [
        Math.max(0, Math.min(255, Math.round(red))),
        Math.max(0, Math.min(255, Math.round(green))),
        Math.max(0, Math.min(255, Math.round(blue))),
        Math.max(0, Math.min(255, Math.round(alpha))),
      ]
    }
  }

  return null
}
