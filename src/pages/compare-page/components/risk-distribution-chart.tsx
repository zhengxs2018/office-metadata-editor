import React from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { CHART_COLORS } from "./report-config"
import type { CompanySnapshot } from "./report-types"

interface RiskDistributionChartProps {
  snapshots: CompanySnapshot[]
}

export const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ snapshots }) => {
  if (snapshots.length < 2) return null
  const data = snapshots.map(s => ({
    name: s.shortName,
    high: s.highCount,
    medium: s.mediumCount,
    clean: s.cleanCount,
    accentIndex: s.accentIndex,
  }))
  const maxFiles = Math.max(...data.map(d => d.high + d.medium + d.clean), 1)
  const height = Math.max(110, snapshots.length * 36 + 40)

  const accentColor = (idx: number) => CHART_COLORS[idx % CHART_COLORS.length]

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-3">
      <div className="text-fine-print mb-1 flex items-center justify-between">
        <span className="text-muted-foreground">各公司文件风险分布</span>
        <span className="text-muted-foreground/70 tabular-nums">
          最深档位 {maxFiles} 个
        </span>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          barCategoryGap={6}
          margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="2 4"
            horizontal={false}
            stroke="var(--border)"
            strokeOpacity={0.55}
          />
          <XAxis type="number" hide domain={[0, maxFiles]} />
          <YAxis
            type="category"
            dataKey="name"
            tickLine={false}
            axisLine={false}
            width={88}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Bar dataKey="clean" stackId="files" fill="#10b981" fillOpacity={0.85} />
          <Bar dataKey="medium" stackId="files" fill="#f59e0b" fillOpacity={0.85} />
          <Bar
            dataKey="high"
            stackId="files"
            fill="#ef4444"
            fillOpacity={0.9}
            radius={[0, 4, 4, 0]}
          >
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.high > 0 ? "#ef4444" : "transparent"} />
            ))}
          </Bar>
          <ReTooltip
            cursor={{ fillOpacity: 0.06 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const item = payload[0]?.payload as (typeof data)[number] | undefined
              if (!item) return null
              const total = item.high + item.medium + item.clean
              return (
                <div className="rounded-md border border-border bg-popover px-3 py-2 text-fine-print shadow-lg">
                  <p
                    className="font-heading text-caption font-semibold"
                    style={{ color: accentColor(item.accentIndex) }}
                  >
                    {item.name}
                  </p>
                  <p className="text-muted-foreground tabular-nums">共 {total} 个文件</p>
                  <ul className="mt-1.5 space-y-0.5">
                    {item.high > 0 ? (
                      <li className="flex items-center gap-2 text-red-600">
                        <span className="inline-block h-2 w-2 rounded-sm bg-red-500" />
                        高风险 {item.high}
                      </li>
                    ) : null}
                    {item.medium > 0 ? (
                      <li className="flex items-center gap-2 text-amber-600">
                        <span className="inline-block h-2 w-2 rounded-sm bg-amber-500" />
                        中风险 {item.medium}
                      </li>
                    ) : null}
                    <li className="flex items-center gap-2 text-emerald-600">
                      <span className="inline-block h-2 w-2 rounded-sm bg-emerald-500" />
                      通过 {item.clean}
                    </li>
                  </ul>
                </div>
              )
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
