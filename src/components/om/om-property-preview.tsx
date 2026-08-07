import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  OmPropertyPreviewList,
  OmPropertyPreviewItem,
} from "@/components/om/om-property-preview-item"

export type OmProperty = {
  label: string
  value: string
  span?: 1 | 2
}

export type OmPropertyPreviewProps = {
  title: string
  properties: OmProperty[]
}

export const OmPropertyPreview: React.FC<OmPropertyPreviewProps> = ({ title, properties }) => {
  return (
    <Card
      size="sm"
      className="rounded-lg border border-border bg-card/60 shadow-none"
    >
      <CardHeader className="pb-1.5">
        <CardTitle className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-40 pt-0 pr-1">
        <OmPropertyPreviewList>
          {properties.map(item => (
            <OmPropertyPreviewItem
              key={item.label}
              label={item.label}
              value={item.value}
              span={item.span}
            />
          ))}
        </OmPropertyPreviewList>
      </CardContent>
    </Card>
  )
}

export default OmPropertyPreview
