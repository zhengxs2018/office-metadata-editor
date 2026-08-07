export interface BatchOperation {
  id: string;
  type: 'apply_template' | 'clear_metadata' | 'export' | 'save_all';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalItems: number;
  processedItems: number;
  successfulItems: number;
  failedItems: number;
  progress: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
}

export interface BatchItemResult {
  fileId: string;
  path: string;
  success: boolean;
  error?: string;
}

export interface BatchRow {
  id: string;
  filePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  author: string;
  lastModifiedBy: string;
  appCompany: string;
  application: string;
  created: string;
  modified: string;
  status: string;
  progressMessage: string;
  hasChanges: boolean;
  error: string;
  taskRequestId: string;
  companyId: string;
}
