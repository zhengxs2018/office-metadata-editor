import React from "react"

import { PageLayout } from "@/layouts/page-layout"
import { OmTemplateHub } from "@/components/om/om-template-hub.tsx"

export const TemplatePage: React.FC = () => {
  return (
    <PageLayout
      backTo="/"
      header={
        <div className="flex flex-col leading-tight select-none">
          <span className="text-sm font-medium text-foreground">模板中心</span>
        </div>
      }
    >
      <div className="h-full w-full p-4">
        <div className="h-full rounded-lg border border-border/55 bg-card/84 p-4 backdrop-blur-md">
          <OmTemplateHub />
        </div>
      </div>
    </PageLayout>
  )
}

export default TemplatePage
