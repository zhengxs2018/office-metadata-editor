import * as React from "react"
import { Sun01Icon, Moon01Icon, AiLaptopIcon } from "@hugeicons/core-free-icons"
import { HugeIcon } from "@/components/icons/huge-icon"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

type ThemeOption = {
  value: "light" | "dark" | "system"
  label: string
  icon: React.ComponentProps<typeof HugeIcon>["icon"]
}

const OPTIONS: ThemeOption[] = [
  { value: "light", label: "白天", icon: Sun01Icon },
  { value: "dark", label: "暗黑", icon: Moon01Icon },
  { value: "system", label: "系统", icon: AiLaptopIcon },
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
            <HugeIcon icon={Icon} size={14} />
            <span>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ThemeSwitch
