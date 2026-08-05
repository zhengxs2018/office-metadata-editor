import React from "react"
import { HugeIcon } from "@/components/icons/huge-icon"
import { File01Icon, FileSpreadsheetIcon, Presentation01Icon } from "@hugeicons/core-free-icons"

export interface OmFileTypeIconProps {
  type: string
  className?: string
}

export const OmFileTypeIcon: React.FC<OmFileTypeIconProps> = ({ type, className = "" }) => {
  const iconProps = {
    className: `h-5 w-5 ${className}`,
  }

  switch (type) {
    case "docx":
    case "doc":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
          <HugeIcon icon={File01Icon} size={20} className="text-blue-500" />
        </div>
      )
    case "xlsx":
    case "xls":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
          <HugeIcon icon={FileSpreadsheetIcon} size={20} className="text-green-500" />
        </div>
      )
    case "pptx":
    case "ppt":
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
          <HugeIcon icon={Presentation01Icon} size={20} className="text-orange-500" />
        </div>
      )
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
          <HugeIcon icon={File01Icon} size={20} />
        </div>
      )
  }
}

export default OmFileTypeIcon
