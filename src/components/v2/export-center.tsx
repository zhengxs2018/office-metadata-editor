/**
 * 导出中心组件 v2.0
 * 支持将元数据导出为 JSON、Excel、CSV、XML 等格式
 */

import React, { useState, useCallback } from 'react'
import { useFileStore } from '../../stores/v2-stores'
import type { ExportFormat, ExportOptions } from '../../types/v2-core'
import { save } from '@tauri-apps/plugin-dialog'
import { invoke } from '@tauri-apps/api/core'

interface ExportCenterProps {
  fileIds?: string[]
}

export const ExportCenter: React.FC<ExportCenterProps> = ({ fileIds = [] }) => {
  const { files } = useFileStore()
  
  const [format, setFormat] = useState<ExportFormat>('json')
  const [includeFields, setIncludeFields] = useState<string[]>([])
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<{ success: boolean; path?: string; count: number } | null>(null)

  // 可选字段列表
  const availableFields = [
    'title', 'subject', 'creator', 'keywords', 'description',
    'lastModifiedBy', 'created', 'modified', 'category',
    'manager', 'company'
  ]

  const toggleField = (field: string) => {
    setIncludeFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
  }

  const handleExport = useCallback(async () => {
    if (files.length === 0) {
      alert('没有可导出的文件')
      return
    }

    setIsExporting(true)
    setExportResult(null)

    try {
      const filePath = await save({
        title: '导出元数据',
        filters: [{ 
          name: format.toUpperCase(), 
          extensions: [format === 'excel' ? 'xlsx' : format] 
        }],
      })

      if (!filePath) {
        setIsExporting(false)
        return
      }

      const options: ExportOptions = {
        format,
        includeFields: includeFields.length > 0 ? includeFields : undefined,
        outputDir: filePath.substring(0, filePath.lastIndexOf('/')),
        fileName: filePath.split('/').pop() || 'export',
        prettyPrint: format === 'json',
      }

      const paths = fileIds.length > 0 
        ? files.filter(f => fileIds.includes(f.id)).map(f => f.path)
        : files.map(f => f.path)

      const result = await invoke<ExportResult>('export_metadata', {
        filePaths: paths,
        options,
      })

      setExportResult({
        success: result.success,
        path: result.outputPath,
        count: result.exportedCount,
      })

      if (result.success) {
        // TODO: 显示成功 Toast
        console.log(`导出成功：${result.outputPath}, 共 ${result.exportedCount} 个文件`)
      } else {
        // TODO: 显示错误 Toast
        console.error('导出失败:', result.error)
      }
    } catch (error) {
      console.error('导出失败:', error)
      // TODO: 显示错误 Toast
    } finally {
      setIsExporting(false)
    }
  }, [files, fileIds, format, includeFields])

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        导出中心
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 左侧：导出配置 */}
        <div className="space-y-6">
          {/* 导出格式 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              导出格式
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['json', 'excel', 'csv', 'xml'] as ExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`p-4 border rounded-lg text-center transition-all ${
                    format === fmt
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="text-lg font-semibold text-gray-900 dark:text-white uppercase">
                    {fmt}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {fmt === 'json' && 'JSON 格式'}
                    {fmt === 'excel' && 'Excel 表格'}
                    {fmt === 'csv' && '逗号分隔值'}
                    {fmt === 'xml' && 'XML 文档'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 选择字段 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              导出字段
              <span className="ml-2 text-xs text-gray-500">(不选则导出全部)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableFields.map((field) => (
                <label
                  key={field}
                  className="flex items-center gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <input
                    type="checkbox"
                    checked={includeFields.includes(field)}
                    onChange={() => toggleField(field)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {field}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* 导出范围 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              导出范围
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {fileIds.length > 0 
                  ? `已选择 ${fileIds.length} 个文件`
                  : `全部 ${files.length} 个文件`
                }
              </div>
            </div>
          </div>

          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            disabled={isExporting || files.length === 0}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                导出中...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                开始导出
              </>
            )}
          </button>
        </div>

        {/* 右侧：预览与结果 */}
        <div className="space-y-6">
          {/* 文件预览 */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              待导出文件预览
            </h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                {(fileIds.length > 0 ? files.filter(f => fileIds.includes(f.id)) : files).slice(0, 10).map((file) => (
                  <div
                    key={file.id}
                    className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0 flex items-center gap-3 bg-white dark:bg-gray-800"
                  >
                    <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-xs font-bold uppercase">
                      {file.extension}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {file.path}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {(fileIds.length > 0 ? fileIds.length : files.length) > 10 && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400 text-center">
                  还有 {(fileIds.length > 0 ? fileIds.length : files.length) - 10} 个文件...
                </div>
              )}
              {files.length === 0 && (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  暂无文件，请先导入文件
                </div>
              )}
            </div>
          </div>

          {/* 导出结果 */}
          {exportResult && (
            <div className={`p-4 rounded-lg ${
              exportResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {exportResult.success ? (
                  <svg className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    exportResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                  }`}>
                    {exportResult.success ? '导出成功' : '导出失败'}
                  </h4>
                  {exportResult.success && (
                    <>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        成功导出 {exportResult.count} 个文件的元数据
                      </p>
                      {exportResult.path && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-2 break-all">
                          {exportResult.path}
                        </p>
                      )}
                    </>
                  )}
                  {!exportResult.success && (
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      请检查文件格式和权限后重试
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 使用说明 */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              💡 使用提示
            </h4>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
              <li>JSON 格式适合程序处理和备份</li>
              <li>Excel 格式适合人工查看和编辑</li>
              <li>CSV 格式适合导入到其他系统</li>
              <li>XML 格式适合企业级数据交换</li>
              <li>可选择特定字段进行精简导出</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ExportCenter
