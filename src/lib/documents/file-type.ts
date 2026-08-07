import type { DocumentFileType } from '@/types/metadata';

export const supportedDocumentTypes: DocumentFileType[] = ['docx', 'doc', 'xlsx', 'pdf'];

export function normalizeDocumentFileType(rawType: string): DocumentFileType {
  const normalized = rawType.trim().toLowerCase();
  return supportedDocumentTypes.includes(normalized as DocumentFileType)
    ? (normalized as DocumentFileType)
    : 'unknown';
}

export function resolveFileTypeFromPath(filePath: string): DocumentFileType {
  const fileName = filePath.split(/[\\/]/).filter(Boolean).pop() ?? '';
  const extension = fileName.includes('.') ? (fileName.split('.').pop() ?? '') : '';
  return normalizeDocumentFileType(extension);
}

export function isOoxmlDocumentFileType(fileType: DocumentFileType): boolean {
  return fileType === 'docx' || fileType === 'xlsx';
}
