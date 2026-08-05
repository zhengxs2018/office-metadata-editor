/**
 * Office Meta Editor - 工作流类型定义
 * 支持模板、目录扫描、MCP、导出等核心功能
 */

// ==================== 文件与文档 ====================

export type FileStatus = "idle" | "ready" | "processing" | "synced" | "error" | "pending"

export interface FileEntry {
  id: string
  path: string
  name: string
  extension: string
  type: "docx" | "xlsx" | "pptx" | "pdf" | "unknown"
  size: number
  status: FileStatus
  errorMessage?: string
  createdAt: number
  updatedAt: number
}

export interface LoadedDocument {
  id: string
  fileId: string
  path: string
  metadata: DocumentMetadata
  originalMetadata: DocumentMetadata
  isDirty: boolean
  lastSavedAt?: number
  loadedAt: number
}

// ==================== 元数据字段 ====================

export interface MetadataField {
  key: string
  label: string
  value: string
  type: "text" | "date" | "number" | "select"
  builtin: boolean
  editable: boolean
  options?: string[]
}

export interface DocumentMetadata {
  title?: string
  subject?: string
  creator?: string
  keywords?: string
  description?: string
  lastModifiedBy?: string
  created?: string
  modified?: string
  category?: string
  manager?: string
  company?: string
  custom?: Record<string, string>
  [key: string]: string | Record<string, string> | undefined
}

// ==================== 目录扫描 ====================

export interface DirectoryScanOptions {
  recursive: boolean
  extensions?: string[]
  maxFiles?: number
  excludePatterns?: string[]
}

export interface DirectoryScanResult {
  path: string
  files: DirectoryInfo[]
  totalFound: number
  scannedAt: number
}

export interface DirectoryInfo {
  path: string
  name: string
  extension: string
  size: number
  modifiedAt: number
  selected: boolean
}

// ==================== 导出系统 ====================

export type ExportFormat = "json" | "excel" | "csv" | "xml"

export interface ExportOptions {
  format: ExportFormat
  includeFields?: string[]
  outputDir?: string
  fileName?: string
  prettyPrint?: boolean
}

export interface ExportResult {
  success: boolean
  outputPath?: string
  error?: string
  exportedCount: number
}

// ==================== 批量操作 ====================

export interface BatchOperation {
  id: string
  type: "apply_template" | "clear_metadata" | "export" | "save_all"
  status: "pending" | "running" | "completed" | "failed" | "cancelled"
  totalItems: number
  processedItems: number
  successfulItems: number
  failedItems: number
  progress: number
  startedAt?: number
  completedAt?: number
  error?: string
}

export interface BatchItemResult {
  fileId: string
  path: string
  success: boolean
  error?: string
}

// ==================== 应用状态 ====================

export interface Workspace {
  id: string
  name: string
  directories: string[]
  activeTemplateId?: string
  lastOpenedAt: number
}

export interface AppState {
  currentView: "workspace" | "editor" | "templates" | "batch" | "export" | "settings"
  workspaces: Workspace[]
  activeWorkspaceId?: string
  darkMode: boolean
  mcpEnabled: boolean
  language: "zh-CN" | "en-US"
}

// ==================== Tauri 命令类型 ====================

export interface TauriCommandMap {
  // 文件操作
  scan_directory: (path: string, options: DirectoryScanOptions) => Promise<DirectoryScanResult>
  load_file_metadata: (path: string) => Promise<DocumentMetadata>
  save_file_metadata: (path: string, metadata: DocumentMetadata) => Promise<void>
  clear_file_metadata: (path: string) => Promise<void>

  // 导出操作
  export_metadata: (filePaths: string[], options: ExportOptions) => Promise<ExportResult>

  // 批量操作
  batch_save_metadata: (
    items: Array<{ path: string; metadata: DocumentMetadata }>,
  ) => Promise<BatchItemResult[]>
  batch_clear_metadata: (filePaths: string[]) => Promise<BatchItemResult[]>
}
