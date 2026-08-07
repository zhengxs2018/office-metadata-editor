import type { LoadedDocument } from '@/contexts/metadata-context';
import type { HiddenStats, HiddenTraceRow } from '@/types/hidden';

const uniqStrings = (values: (string | null | undefined)[]): string[] => {
  const seen = new Set<string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
};

const fileNameOf = (filePath: string): string => {
  const parts = filePath.split(/[\\/]/);
  return parts[parts.length - 1] || filePath;
};

export const buildTraceRow = (doc: LoadedDocument): HiddenTraceRow => {
  const meta = doc.metadata;

  const annotationAuthors = uniqStrings(meta.annotationAuthors ?? []);
  const revisionAuthors = uniqStrings(meta.revisionAuthors ?? []);
  const xmpCreators = uniqStrings(meta.xmpCreators ?? []);
  const hasHiddenMarkers = Boolean(meta.hasHiddenMarkers);

  const traceCount =
    annotationAuthors.length +
    revisionAuthors.length +
    xmpCreators.length +
    (hasHiddenMarkers ? 1 : 0);

  return {
    id: doc.id,
    filePath: doc.filePath,
    fileName: meta.fileName || fileNameOf(doc.filePath),
    fileType: (meta.fileType || '').toUpperCase(),
    annotationAuthors,
    revisionAuthors,
    xmpCreators,
    hasHiddenMarkers,
    traceCount,
    hasTrace: traceCount > 0,
  };
};

export const buildTraceRows = (docs: LoadedDocument[]): HiddenTraceRow[] =>
  docs.map(buildTraceRow).sort((a, b) => {
    if (a.hasTrace !== b.hasTrace) return a.hasTrace ? -1 : 1;
    if (a.traceCount !== b.traceCount) return b.traceCount - a.traceCount;
    return a.fileName.localeCompare(b.fileName, 'zh-CN');
  });

export const buildStats = (rows: HiddenTraceRow[]): HiddenStats => {
  let annotationCount = 0;
  let revisionCount = 0;
  let xmpCount = 0;
  let markerCount = 0;
  let flaggedCount = 0;

  for (const row of rows) {
    annotationCount += row.annotationAuthors.length;
    revisionCount += row.revisionAuthors.length;
    xmpCount += row.xmpCreators.length;
    if (row.hasHiddenMarkers) markerCount += 1;
    if (row.hasTrace) flaggedCount += 1;
  }

  return {
    fileCount: rows.length,
    flaggedCount,
    cleanCount: rows.length - flaggedCount,
    annotationCount,
    revisionCount,
    xmpCount,
    markerCount,
  };
};

export const collectAuthors = (rows: HiddenTraceRow[]): { name: string; files: string[] }[] => {
  const map = new Map<string, Set<string>>();

  for (const row of rows) {
    const names = [...row.annotationAuthors, ...row.revisionAuthors, ...row.xmpCreators];
    for (const name of names) {
      const bucket = map.get(name) ?? new Set<string>();
      bucket.add(row.fileName);
      map.set(name, bucket);
    }
  }

  return [...map.entries()]
    .map(([name, files]) => ({ name, files: [...files] }))
    .sort((a, b) => b.files.length - a.files.length || a.name.localeCompare(b.name, 'zh-CN'));
};
