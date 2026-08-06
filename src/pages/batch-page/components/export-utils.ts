import * as XLSX from "xlsx"
import type { LoadedDocument } from "@/contexts/metadata-context"
import type { ExportFormat } from "./export-types"

export const FORMAT_META: Record<ExportFormat, { label: string; description: string }> = {
  json: { label: "JSON", description: "程序处理 / 备份" },
  excel: { label: "Excel", description: "人工查阅 / 编辑" },
  csv: { label: "CSV", description: "导入其他系统" },
  xml: { label: "XML", description: "企业级数据交换" },
}

export const DEFAULT_FIELD_LABELS: Record<string, string> = {
  title: "标题",
  subject: "主题",
  creator: "作者",
  keywords: "关键词",
  description: "描述",
  lastModifiedBy: "最后修改者",
  created: "创建时间",
  modified: "修改时间",
  category: "分类",
  manager: "管理者",
  company: "组织机构",
  application: "创建器",
  appVersion: "App 版本",
  pages: "页数",
  words: "字数",
  characters: "字符数",
  lines: "行数",
  paragraphs: "段落数",
  slides: "幻灯片数",
  hiddenSlides: "隐藏幻灯片",
}

export function resolveFieldLabel(field: string): string {
  return DEFAULT_FIELD_LABELS[field] ?? field
}

export function buildRecord(doc: LoadedDocument, fields: string[]): Record<string, unknown> {
  const props = doc.metadata.documentProperties as unknown as Record<string, unknown>
  const app = doc.metadata.appProperties as unknown as Record<string, unknown>
  const base: Record<string, unknown> = {
    filePath: doc.filePath,
    fileName: doc.metadata.fileName,
    fileType: doc.metadata.fileType,
    fileSize: doc.metadata.fileSize,
  }
  for (const f of fields) {
    base[f] = props[f] ?? app[f] ?? ""
  }
  return base
}

export function buildContent(format: ExportFormat, records: Record<string, unknown>[]): string {
  if (records.length === 0) return ""
  if (format === "json") {
    return JSON.stringify(records, null, 2)
  }
  if (format === "xml") {
    const items = records
      .map(row => {
        const body = Object.entries(row)
          .map(
            ([k, v]) =>
              `<${k}>${String(v ?? "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")}</${k}>`,
          )
          .join("")
        return `<item>${body}</item>`
      })
      .join("")
    return `<?xml version="1.0" encoding="UTF-8"?><metadata>${items}</metadata>`
  }
  const headers = Object.keys(records[0] ?? {})
  const rows = records.map(row =>
    headers.map(h => `"${String(row[h] ?? "").replaceAll('"', '""')}"`).join(","),
  )
  return [headers.join(","), ...rows].join("\n")
}

export function buildExcelBase64(records: Record<string, unknown>[]): string {
  if (records.length === 0) return ""
  const workbook = XLSX.utils.book_new()
  const headers = Object.keys(records[0] ?? {})
  const rows = records.map(r => headers.map(h => String(r[h] ?? "")))
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows])
  const colWidths = headers.map(h => ({ wch: Math.min(Math.max(h.length * 2, 12), 32) }))
  sheet["!cols"] = colWidths
  XLSX.utils.book_append_sheet(workbook, sheet, "元数据明细")

  const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const bytes = new Uint8Array(wbout)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

export function buildFileName(format: ExportFormat, date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`
  const ext = format === "excel" ? "xlsx" : format
  return `元数据导出_${stamp}.${ext}`
}
