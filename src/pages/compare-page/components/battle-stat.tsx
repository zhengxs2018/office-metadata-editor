import React from "react"
import { cn } from "@/lib/utils"

interface BattleStatProps {
  tone: "high" | "medium" | "pass"
  label: string
  value: number
}

const BATTLE_STAT_PALETTE = {
  high: "border-red-500/30 bg-red-500/10 text-red-600",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  pass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
}

export const BattleStat: React.FC<BattleStatProps> = ({ tone, label, value }) => {
  const palette = BATTLE_STAT_PALETTE[tone]
  return (
    <div className={cn("rounded-md border px-2 py-1.5", palette)}>
      <p className="text-[10px] font-medium leading-none uppercase tracking-wider opacity-80">
        {label}
      </p>
      <p className="font-heading mt-1 text-lg font-semibold leading-none tabular-nums">
        {value}
      </p>
    </div>
  )
}
