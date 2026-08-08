import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { OPEN_FILE_DIALOG_FILTER } from '@/lib/documents/supported-formats';

export type FileStatus = 'idle' | 'reading' | 'ready' | 'processing' | 'error';
export type CompanySide = string;

export interface CompanyEntry {
  id: string;
  name: string;
  side: CompanySide;
  /** 目录来源的规范化绝对路径；仅当通过"选择目录/拖拽目录"导入时设置。 */
  sourceDir?: string;
}

export interface FileEntry {
  id: string;
  filePath: string;
  status: FileStatus;
  progressMessage: string;
  error?: string;
  companyId?: string;
}

export interface FileContextValue {
  files: FileEntry[];
  activeFileId: string | null;
  isLoading: boolean;
  companies: CompanyEntry[];
  companyById: Record<string, CompanyEntry>;
  openFiles: () => Promise<number>;
  addFilesByPaths: (paths: string[], companyId?: string) => number;
  selectFile: (fileId: string) => void;
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  /** Drops every file and company, returning the session to a blank state. */
  clearAll: () => void;
  updateFileStatus: (fileId: string, patch: Partial<Omit<FileEntry, 'id' | 'filePath'>>) => void;
  ensureCompany: (name: string, sourceDir?: string) => string;
  removeCompany: (companyId: string) => void;
  companyCount: number;
}

const FileContext = createContext<FileContextValue | null>(null);

export const FileProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [companies, setCompanies] = useState<CompanyEntry[]>([]);

  const companyById = useMemo(() => {
    const map: Record<string, CompanyEntry> = {};
    for (const c of companies) map[c.id] = c;
    return map;
  }, [companies]);

  const ensureCompany = useCallback(
    (name: string, sourceDir?: string): string => {
      const normalizedSourceDir = sourceDir
        ? sourceDir.replace(/[\\/]+$/, '').replace(/\\/g, '/')
        : undefined;
      if (normalizedSourceDir) {
        const dup = companies.find(
          c =>
            c.sourceDir &&
            c.sourceDir.replace(/[\\/]+$/, '').replace(/\\/g, '/') === normalizedSourceDir,
        );
        if (dup) {
          if (dup.name !== name) {
            setCompanies(prev => prev.map(c => (c.id === dup.id ? { ...c, name } : c)));
          }
          return dup.id;
        }
      }
      const side = String(companies.length);
      const id = crypto.randomUUID();
      setCompanies(prev => [
        ...prev,
        { id, side, name, ...(sourceDir !== undefined ? { sourceDir } : {}) },
      ]);
      return id;
    },
    [companies],
  );

  const removeCompany = useCallback((companyId: string) => {
    setCompanies(prev => prev.filter(c => c.id !== companyId));
    setFiles(prev =>
      prev.map(f => (f.companyId === companyId ? { ...f, companyId: undefined } : f)),
    );
  }, []);

  const openFiles = useCallback(async (): Promise<number> => {
    setIsLoading(true);
    try {
      const selected = await open({
        multiple: true,
        filters: [OPEN_FILE_DIALOG_FILTER],
      });

      if (!selected) return 0;
      const selectedPaths = Array.isArray(selected) ? selected : [selected];
      if (selectedPaths.length === 0) return 0;

      const existingPathSet = new Set(files.map(item => item.filePath));
      const pathsToLoad = selectedPaths.filter(path => !existingPathSet.has(path));
      if (pathsToLoad.length === 0) {
        if (!activeFileId && files[0]) {
          setActiveFileId(files[0].id);
        }
        return 0;
      }

      const addedFiles: FileEntry[] = pathsToLoad.map(filePath => ({
        id: crypto.randomUUID(),
        filePath,
        status: 'idle',
        progressMessage: '待处理',
      }));

      setFiles(prev => [...prev, ...addedFiles]);
      setActiveFileId(prev => prev ?? addedFiles[0]?.id ?? null);
      return addedFiles.length;
    } catch (error) {
      console.error('选择文件失败:', error);
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, [activeFileId, files]);

  const addFilesByPaths = useCallback(
    (paths: string[], companyId?: string): number => {
      if (paths.length === 0) return 0;

      const existingPathSet = new Set(files.map(item => item.filePath));
      const pathsToLoad = paths.filter(path => !existingPathSet.has(path));
      if (pathsToLoad.length === 0) return 0;

      const addedFiles: FileEntry[] = pathsToLoad.map(filePath => ({
        id: crypto.randomUUID(),
        filePath,
        status: 'idle',
        progressMessage: '待处理',
        ...(companyId ? { companyId } : {}),
      }));

      setFiles(prev => [...prev, ...addedFiles]);
      setActiveFileId(prev => prev ?? addedFiles[0]?.id ?? null);
      return addedFiles.length;
    },
    [files],
  );

  const selectFile = useCallback((fileId: string) => {
    setActiveFileId(fileId);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const removeIndex = prev.findIndex(item => item.id === fileId);
      if (removeIndex < 0) return prev;

      const next = prev.filter(item => item.id !== fileId);

      setActiveFileId(currentActiveId => {
        if (currentActiveId !== fileId) return currentActiveId;
        if (next.length === 0) return null;
        const fallbackIndex = Math.min(removeIndex, next.length - 1);
        return next[fallbackIndex]?.id ?? null;
      });

      return next;
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
    setActiveFileId(null);
  }, []);

  const clearAll = useCallback(() => {
    setFiles([]);
    setActiveFileId(null);
    setCompanies([]);
  }, []);

  const updateFileStatus = useCallback(
    (fileId: string, patch: Partial<Omit<FileEntry, 'id' | 'filePath'>>) => {
      setFiles(prev =>
        prev.map(item =>
          item.id === fileId
            ? {
                ...item,
                ...patch,
              }
            : item,
        ),
      );
    },
    [],
  );

  const value = useMemo<FileContextValue>(
    () => ({
      files,
      activeFileId,
      isLoading,
      companies,
      companyById,
      companyCount: companies.length,
      openFiles,
      addFilesByPaths,
      selectFile,
      removeFile,
      clearFiles,
      clearAll,
      updateFileStatus,
      ensureCompany,
      removeCompany,
    }),
    [
      files,
      activeFileId,
      isLoading,
      companies,
      companyById,
      openFiles,
      addFilesByPaths,
      selectFile,
      removeFile,
      clearFiles,
      clearAll,
      updateFileStatus,
      ensureCompany,
      removeCompany,
    ],
  );

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
};

export function useFileContext(): FileContextValue {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFileContext must be used within a FileProvider');
  }
  return context;
}

export default FileProvider;
