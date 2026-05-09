import React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type DialogSize = "xxl" | "xl" | "lg" | "md"

interface OmFeatureDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  size?: DialogSize
  children: React.ReactNode
}

export const OmFeatureDialog: React.FC<OmFeatureDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  children,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
