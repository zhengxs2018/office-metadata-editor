import React from "react"
import { HugeIcon } from "@/components/icons/huge-icon"
import { cn } from "@/lib/utils"

interface SummaryBigCardProps {
  tone: "high" | "medium" | "pass"
  icon: React.ComponentProps<typeof HugeIcon>["icon"]
  label: string
  value: number
  description: string
}

const TONE_PALETTE = {
  high: {
    ring: "border-red-500/30 bg-red-500/5",
    icon: "bg-red-500/10 text-red-600",
    value: "text-red-600",
  },
  medium: {
    ring: "border-amber-500/30 bg-amber-500/5",
    icon: "bg-amber-500/10 text-amber-600",
    value: "text-amber-600",
  },
  pass: {
    ring: "border-emerald-500/30 bg-emerald-500/5",
    icon: "bg-emerald-500/10 text-emerald-600",
    value: "text-emerald-600",
  },
}

export const SummaryBigCard: React.FC<SummaryBigCardProps> = ({
  tone,
  icon: Icon,
  label,
  value,
  description,
}) => {
  const palette = TONE_PALETTE[tone]

  return (
    <div className={cn("rounded-lg border px-4 py-3", palette.ring)}>
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("rounded p-1", palette.icon)}>
          <HugeIcon icon={Icon} size={14} />
        </span>
        <p className="text-caption font-medium text-muted-foreground">{label}</p>
      </div>
      <p
        className={cn(
          "font-heading text-3xl leading-none font-semibold tabular-nums",
          palette.value,
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 truncate text-fine-print text-muted-foreground">{description}</p>
    </div>
  )
}
