import { resolveFieldLabel } from "./export-utils"

export interface ExportFieldOption {
  key: string
  label: string
}

export type ExportFormat = "json" | "excel" | "csv" | "xml"

export interface ExportResult {
  success: boolean
  path?: string
  count: number
  format: ExportFormat
}
