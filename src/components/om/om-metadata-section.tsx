import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export interface OmMetadataSectionProps {
  title: string
  description: string
}

export const OmMetadataSection: React.FC<React.PropsWithChildren<OmMetadataSectionProps>> = ({
  title,
  description,
  children,
}) => {
  return (
    <Card size="sm" className="rounded-lg border border-zinc-200 bg-card/95 shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

export default OmMetadataSection
