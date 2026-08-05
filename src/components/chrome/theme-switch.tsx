import * as React from "react"
import { Sun, Moon, CloudSun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

type ThemeOption = {
  value: "light" | "dark" | "system"
  label: string
  icon: LucideIcon
}

const OPTIONS: ThemeOption[] = [
  { value: "light", label: "白天", icon: Sun },
  { value: "dark", label: "暗黑", icon: Moon },
  { value: "system", label: "系统", icon: CloudSun },
]

export const ThemeSwitch: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="主题切换"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/70 p-0.5 backdrop-blur-sm",
        className,
      )}
    >
      {OPTIONS.map(option => {
        const Icon = option.icon
        const active = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(option.value)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ThemeSwitch
