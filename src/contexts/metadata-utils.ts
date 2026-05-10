import type { DocumentMetadata } from "@/types/metadata"
import { resolveFileTypeFromPath } from "@/lib/documents/file-type"
import type { DocumentState } from "@/contexts/metadata-defaults"
import { defaultMetadata } from "@/contexts/metadata-defaults"

export function normalizeMetadata(
  parsedMetadata: DocumentMetadata,
  filePath: string,
): DocumentMetadata {
  const resolvedType = resolveFileTypeFromPath(filePath)

  return {
    ...defaultMetadata,
    ...parsedMetadata,
    fileName: parsedMetadata.fileName || basename(filePath),
    fileType: resolvedType,
    documentProperties: {
      ...defaultMetadata.documentProperties,
      ...parsedMetadata.documentProperties,
    },
    coreProperties: {
      ...defaultMetadata.coreProperties,
      ...parsedMetadata.coreProperties,
    },
    appProperties: {
      ...defaultMetadata.appProperties,
      ...parsedMetadata.appProperties,
    },
  }
}

export function createPlaceholderDocumentState(filePath: string): DocumentState {
  const placeholder = createPlaceholderMetadata(filePath)
  return {
    metadata: placeholder,
    originalMetadata: placeholder,
    hasChanges: false,
  }
}

export function createPlaceholderMetadata(filePath: string): DocumentMetadata {
  const fileName = basename(filePath)
  const fileType = resolveFileTypeFromPath(filePath)

  return {
    ...defaultMetadata,
    fileName,
    fileType,
    fileSize: 0,
    documentProperties: { ...defaultMetadata.documentProperties },
    coreProperties: { ...defaultMetadata.coreProperties },
    appProperties: { ...defaultMetadata.appProperties },
  }
}

export function basename(filePath: string): string {
  return filePath.split(/[\\/]/).filter(Boolean).pop() ?? filePath
}
