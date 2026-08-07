export type FileStatus = 'idle' | 'ready' | 'processing' | 'synced' | 'error' | 'pending';

export interface FileEntry {
  id: string;
  path: string;
  name: string;
  extension: string;
  type: 'docx' | 'xlsx' | 'pptx' | 'pdf' | 'unknown';
  size: number;
  status: FileStatus;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
}

export interface LoadedDocument {
  id: string;
  fileId: string;
  path: string;
  metadata: DocumentMetadata;
  originalMetadata: DocumentMetadata;
  isDirty: boolean;
  lastSavedAt?: number;
  loadedAt: number;
}

export interface MetadataField {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'date' | 'number' | 'select';
  builtin: boolean;
  editable: boolean;
  options?: string[];
}

export interface DocumentMetadata {
  title?: string;
  subject?: string;
  creator?: string;
  keywords?: string;
  description?: string;
  lastModifiedBy?: string;
  created?: string;
  modified?: string;
  category?: string;
  manager?: string;
  company?: string;
  custom?: Record<string, string>;
  [key: string]: string | Record<string, string> | undefined;
}
