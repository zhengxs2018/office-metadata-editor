export type LogLevel = "info" | "warn" | "error"

export interface ServiceLog {
  id: string
  level: LogLevel
  source: string
  message: string
  timestamp: string
}

export interface ServiceRequest {
  id: string
  source: string
  pathCount: number
  status: "queued" | "running" | "completed" | "failed" | "cancelled"
  receivedAt: string
}

export interface BatchClearResultItem {
  filePath: string
  success: boolean
  error?: string | null
}

export interface DocumentPropertiesOverrides {
  title?: string
  subject?: string
  creator?: string
  keywords?: string
  description?: string
  lastModifiedBy?: string
  revision?: string
  created?: string
  modified?: string
  category?: string
  contentStatus?: string
  version?: string
  language?: string
  identifier?: string
  source?: string
}

export interface CorePropertiesOverrides {
  dcTitle?: string
  dcSubject?: string
  dcCreator?: string
  dcDescription?: string
  dcKeywords?: string
  dcLanguage?: string
  dcIdentifier?: string
  dcSource?: string
}

export interface AppPropertiesOverrides {
  application?: string
  appVersion?: string
  company?: string
  manager?: string
  template?: string
  totalTime?: string
  pages?: number
  words?: number
  characters?: number
  charactersWithSpaces?: number
  paragraphs?: number
  lines?: number
}

export interface MetadataOverrides {
  documentProperties?: DocumentPropertiesOverrides
  coreProperties?: CorePropertiesOverrides
  appProperties?: AppPropertiesOverrides
}

export interface AutomationRequestPayload {
  source?: string
  templateId?: string
  metadataOverrides?: MetadataOverrides
  filePaths?: string[]
}
