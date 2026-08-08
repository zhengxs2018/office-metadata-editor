// 类型以 src-tauri/src/export/mod.rs 的 Rust 模型为权威源

export type ExportFormat = 'json' | 'excel' | 'csv' | 'xml';

export interface ExportOptions {
  format: ExportFormat;
  includeFields?: string[];
  outputDir?: string;
  fileName?: string;
  prettyPrint?: boolean;
}

export interface ExportResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  exportedCount: number;
}

export interface ExportFieldOption {
  key: string;
  label: string;
}

/** Rust 端默认导出字段（9 个），与 src-tauri/src/export/mod.rs 的 DEFAULT_FIELDS 对齐 */
export const DEFAULT_EXPORT_FIELDS = [
  'title',
  'subject',
  'creator',
  'keywords',
  'description',
  'lastModifiedBy',
  'created',
  'modified',
  'category',
] as const;
