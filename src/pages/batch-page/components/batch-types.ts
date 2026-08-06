export interface BatchRow {
  id: string
  filePath: string
  fileName: string
  fileType: string
  fileSize: number
  author: string
  lastModifiedBy: string
  appCompany: string
  application: string
  created: string
  modified: string
  status: string
  progressMessage: string
  hasChanges: boolean
  error: string
  taskRequestId: string
  companyId: string
}
