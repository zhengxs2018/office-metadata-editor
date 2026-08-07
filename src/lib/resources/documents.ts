import type { DocumentMetadata } from '@/types/metadata';
import type { DocumentFileType } from '@/types/metadata';
import { trackedInvoke } from '@/lib/tauri';
import { resolveFileTypeFromPath } from '@/lib/documents/file-type';

export interface BatchSaveResultItem {
  filePath: string;
  success: boolean;
  error?: string;
}

export interface BatchSaveRequestItem {
  filePath: string;
  metadata: DocumentMetadata;
}

type DocumentResourceApi = {
  show: (filePath: string) => Promise<DocumentMetadata>;
  replace: (filePath: string, metadata: DocumentMetadata, requestId?: string) => Promise<string>;
  createSavedCopy: (filePath: string, metadata: DocumentMetadata) => Promise<string | null>;
  replaceMany: (
    items: BatchSaveRequestItem[],
    requestId?: string,
  ) => Promise<BatchSaveResultItem[]>;
  destroyMetadataMany: (filePaths: string[], requestId?: string) => Promise<BatchSaveResultItem[]>;
};

export const documentsResource = {
  docx: {
    show(filePath: string) {
      return trackedInvoke<DocumentMetadata>('parse_docx_metadata_from_path', { filePath });
    },
    replace(filePath: string, metadata: DocumentMetadata, requestId?: string) {
      return trackedInvoke<string>('save_docx_metadata_to_source', {
        filePath,
        metadata,
        requestId,
      });
    },
    createSavedCopy(filePath: string, metadata: DocumentMetadata) {
      return trackedInvoke<string | null>('save_docx_metadata_as', { filePath, metadata });
    },
    replaceMany(items: BatchSaveRequestItem[], requestId?: string) {
      return trackedInvoke<BatchSaveResultItem[]>('batch_save_docx_metadata_to_source', {
        items,
        requestId,
      });
    },
    destroyMetadataMany(filePaths: string[], requestId?: string) {
      return trackedInvoke<BatchSaveResultItem[]>('batch_clear_and_save_docx_metadata', {
        filePaths,
        requestId,
      });
    },
  },
  xlsx: {
    show(filePath: string) {
      return trackedInvoke<DocumentMetadata>('parse_xlsx_metadata_from_path', { filePath });
    },
    replace(filePath: string, metadata: DocumentMetadata, requestId?: string) {
      return trackedInvoke<string>('save_xlsx_metadata_to_source', {
        filePath,
        metadata,
        requestId,
      });
    },
    createSavedCopy(filePath: string, metadata: DocumentMetadata) {
      return trackedInvoke<string | null>('save_xlsx_metadata_as', { filePath, metadata });
    },
    replaceMany(items: BatchSaveRequestItem[], requestId?: string) {
      return trackedInvoke<BatchSaveResultItem[]>('batch_save_xlsx_metadata_to_source', {
        items,
        requestId,
      });
    },
    destroyMetadataMany(filePaths: string[], requestId?: string) {
      return trackedInvoke<BatchSaveResultItem[]>('batch_clear_and_save_xlsx_metadata', {
        filePaths,
        requestId,
      });
    },
  },
  pdf: {
    show(filePath: string) {
      return trackedInvoke<DocumentMetadata>('parse_pdf_metadata_from_path', { filePath });
    },
    replace(filePath: string, metadata: DocumentMetadata, requestId?: string) {
      return trackedInvoke<string>('save_pdf_metadata_to_source', {
        filePath,
        metadata,
        requestId,
      });
    },
    createSavedCopy(filePath: string, metadata: DocumentMetadata) {
      return trackedInvoke<string | null>('save_pdf_metadata_as', { filePath, metadata });
    },
    replaceMany(items: BatchSaveRequestItem[], requestId?: string) {
      return trackedInvoke<BatchSaveResultItem[]>('batch_save_pdf_metadata_to_source', {
        items,
        requestId,
      });
    },
    destroyMetadataMany(filePaths: string[], requestId?: string) {
      return trackedInvoke<BatchSaveResultItem[]>('batch_clear_and_save_pdf_metadata', {
        filePaths,
        requestId,
      });
    },
  },
  doc: {
    show(filePath: string) {
      return trackedInvoke<DocumentMetadata>('parse_doc_metadata_from_path', { filePath });
    },
    replace(filePath: string, metadata: DocumentMetadata, requestId?: string) {
      return trackedInvoke<string>('save_doc_metadata_to_source', {
        filePath,
        metadata,
        requestId,
      });
    },
    createSavedCopy(filePath: string, metadata: DocumentMetadata) {
      return trackedInvoke<string | null>('save_doc_metadata_as', { filePath, metadata });
    },
    replaceMany(items: BatchSaveRequestItem[], requestId?: string) {
      return trackedInvoke<BatchSaveResultItem[]>('batch_save_doc_metadata_to_source', {
        items,
        requestId,
      });
    },
    destroyMetadataMany(filePaths: string[], requestId?: string) {
      return trackedInvoke<BatchSaveResultItem[]>('batch_clear_and_save_doc_metadata', {
        filePaths,
        requestId,
      });
    },
  },
} as const;

const unsupportedResource: DocumentResourceApi = {
  async show(filePath: string) {
    throw new Error(`暂不支持的文件类型: ${filePath}`);
  },
  async replace(filePath: string) {
    throw new Error(`暂不支持的文件类型: ${filePath}`);
  },
  async createSavedCopy(filePath: string) {
    throw new Error(`暂不支持的文件类型: ${filePath}`);
  },
  async replaceMany(items: BatchSaveRequestItem[]) {
    if (items.length > 0) {
      throw new Error(`暂不支持的文件类型: ${items[0]?.filePath}`);
    }
    return [];
  },
  async destroyMetadataMany(filePaths: string[]) {
    if (filePaths.length > 0) {
      throw new Error(`暂不支持的文件类型: ${filePaths[0]}`);
    }
    return [];
  },
};

export function getDocumentResourceByType(fileType: DocumentFileType): DocumentResourceApi {
  switch (fileType) {
    case 'docx':
      return documentsResource.docx;
    case 'xlsx':
      return documentsResource.xlsx;
    case 'pdf':
      return documentsResource.pdf;
    case 'doc':
      return documentsResource.doc;
    default:
      return unsupportedResource;
  }
}

export function getDocumentResourceByPath(filePath: string): DocumentResourceApi {
  return getDocumentResourceByType(resolveFileTypeFromPath(filePath));
}

export default documentsResource;
