export interface HiddenTraceRow {
  id: string;
  filePath: string;
  fileName: string;
  fileType: string;
  annotationAuthors: string[];
  revisionAuthors: string[];
  xmpCreators: string[];
  hasHiddenMarkers: boolean;
  traceCount: number;
  hasTrace: boolean;
}

export interface HiddenStats {
  fileCount: number;
  flaggedCount: number;
  cleanCount: number;
  annotationCount: number;
  revisionCount: number;
  xmpCount: number;
  markerCount: number;
}
