export interface DirectoryScanOptions {
  recursive: boolean;
  extensions?: string[];
  maxFiles?: number;
  excludePatterns?: string[];
}

export interface DirectoryScanResult {
  path: string;
  files: DirectoryInfo[];
  totalFound: number;
  scannedAt: number;
}

export interface DirectoryInfo {
  path: string;
  name: string;
  extension: string;
  size: number;
  modifiedAt: number;
  selected: boolean;
}
