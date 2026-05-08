/**
 * 目录扫描文件浏览器 - v2.0 核心组件
 * 支持选择目录、列出文件、勾选导入
 */

import React, { useCallback } from 'react'
import { useFileStore } from '../../stores/v2-stores'
import { cn } from '@/lib/utils'

interface DirectoryFileBrowserProps {
  onImportComplete?: () => void
}

export const DirectoryFileBrowser: React.FC<DirectoryFileBrowserProps> = ({
  onImportComplete,
}) => {
  const {
    scanResults,
    directoryFiles,
    isLoading,
    error,
    scanDirectory,
    toggleDirectoryFileSelection,
    selectAllDirectoryFiles,
    clearDirectorySelection,
    importSelectedFiles,
  } = useFileStore()

  const [directoryPath, setDirectoryPath] = React.useState('')

  const handleScanDirectory = useCallback(async () => {
    if (!directoryPath.trim()) return
    
    try {
      await scanDirectory(directoryPath, { recursive: true })
    } catch (err) {
      console.error('扫描目录失败:', err)
    }
  }, [directoryPath, scanDirectory])

  const handleSelectDirectory = useCallback(async () => {
    // TODO: 调用 Tauri open 对话框选择目录
    // const selected = await open({ directory: true, multiple: false })
    // if (selected) setDirectoryPath(selected)
    
    // 临时模拟
    setDirectoryPath('/Users/example/Documents')
  }, [])

  const handleImport = useCallback(async () => {
    try {
      await importSelectedFiles()
      onImportComplete?.()
    } catch (err) {
      console.error('导入失败:', err)
    }
  }, [importSelectedFiles, onImportComplete])

  const selectedCount = directoryFiles.filter(f => f.selected).length
  const totalCount = directoryFiles.length

  return (
    <div className="w-full h-full flex flex-col bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      {/* 顶部工具栏 */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSelectDirectory}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
        >
          选择目录
        </button>
        
        <input
          type="text"
          value={directoryPath}
          onChange={(e) => setDirectoryPath(e.target.value)}
          placeholder="或输入目录路径..."
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onKeyDown={(e) => e.key === 'Enter' && handleScanDirectory()}
        />
        
        <button
          onClick={handleScanDirectory}
          disabled={!directoryPath.trim() || isLoading}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? '扫描中...' : '扫描'}
        </button>
      </div>

      {/* 状态栏 */}
      {scanResults && (
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            找到 <span className="font-semibold text-gray-900 dark:text-gray-100">{totalCount}</span> 个文件
            {selectedCount > 0 && (
              <span className="ml-2 text-blue-600 dark:text-blue-400">
                已选择 <span className="font-semibold">{selectedCount}</span> 个
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={selectAllDirectoryFiles}
              className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              全选
            </button>
            <button
              onClick={clearDirectorySelection}
              className="px-3 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              取消选择
            </button>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0 || isLoading}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md text-xs font-medium transition-colors disabled:cursor-not-allowed"
            >
              导入所选 ({selectedCount})
            </button>
          </div>
        </div>
      )}

      {/* 文件列表 */}
      <div className="flex-1 overflow-auto">
        {error && (
          <div className="p-4 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {!scanResults && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
            <p className="text-sm">选择一个目录开始扫描</p>
            <p className="text-xs mt-1">支持 DOCX, XLSX, PPTX, PDF 格式</p>
          </div>
        )}

        {isLoading && !scanResults && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">正在扫描目录...</p>
          </div>
        )}

        {scanResults && directoryFiles.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-sm">该目录下没有找到支持的文档</p>
          </div>
        )}

        {directoryFiles.length > 0 && (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCount === totalCount && totalCount > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        selectAllDirectoryFiles()
                      } else {
                        clearDirectorySelection()
                      }
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  文件名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  类型
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  大小
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  修改时间
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {directoryFiles.map((file, index) => (
                <tr
                  key={file.path}
                  className={cn(
                    'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                    file.selected && 'bg-blue-50 dark:bg-blue-900/20'
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={file.selected}
                      onChange={() => toggleDirectoryFileSelection(index)}
                      className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <FileIcon extension={file.extension} />
                      <span className="ml-3 text-sm text-gray-900 dark:text-gray-100 truncate max-w-md">
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 uppercase">
                      {file.extension}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(file.modifiedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ==================== 辅助组件 ====================

const FileIcon: React.FC<{ extension: string }> = ({ extension }) => {
  const colors: Record<string, string> = {
    docx: 'text-blue-600',
    xlsx: 'text-green-600',
    pptx: 'text-orange-600',
    pdf: 'text-red-600',
  }

  const color = colors[extension.toLowerCase()] || 'text-gray-400'

  return (
    <svg className={cn('w-8 h-8', color)} fill="currentColor" viewBox="0 0 24 24">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z" />
      <path d="M14 3v5h5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
