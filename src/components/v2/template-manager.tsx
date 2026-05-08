/**
 * 模板管理器组件 v2.0
 * 支持模板的创建、编辑、导入导出、应用
 */

import React, { useState, useCallback } from 'react'
import { useTemplateStore } from '../../stores/v2-stores'
import type { MetadataTemplate, TemplateField } from '../../types/v2-core'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { readTextFile } from '@tauri-apps/plugin-fs'

interface TemplateManagerProps {
  onTemplateApply?: (templateId: string, fileIds: string[]) => void
  selectedFileIds?: string[]
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({ 
  onTemplateApply, 
  selectedFileIds = [] 
}) => {
  const { 
    templates, 
    activeTemplateId, 
    setActiveTemplate, 
    createTemplate, 
    updateTemplate, 
    deleteTemplate,
    importTemplate,
    exportTemplate 
  } = useTemplateStore()
  
  const [isCreating, setIsCreating] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<MetadataTemplate | null>(null)
  const [showImportExport, setShowImportExport] = useState(false)

  // 创建新模板
  const handleCreateTemplate = useCallback(() => {
    const newTemplate: Omit<MetadataTemplate, 'id' | 'createdAt' | 'updatedAt'> = {
      name: '新模板',
      description: '',
      organization: '默认组织',
      version: '1.0.0',
      fields: [
        { key: 'title', label: '标题', required: true, type: 'text' },
        { key: 'creator', label: '作者', required: false, type: 'text' },
        { key: 'company', label: '公司', required: false, type: 'text' },
      ],
      author: '用户',
      tags: ['通用'],
      isBuiltin: false,
    }
    createTemplate(newTemplate)
    setIsCreating(true)
  }, [createTemplate])

  // 导出模板
  const handleExportTemplate = useCallback(async (templateId: string) => {
    try {
      const filePath = await save({
        title: '导出模板',
        filters: [{ name: 'Office Metadata Template', extensions: ['omet'] }],
      })
      
      if (filePath) {
        await exportTemplate(templateId, filePath)
        // TODO: 显示成功提示
      }
    } catch (error) {
      console.error('导出模板失败:', error)
      // TODO: 显示错误提示
    }
  }, [exportTemplate])

  // 导入模板
  const handleImportTemplate = useCallback(async () => {
    try {
      const filePath = await open({
        title: '导入模板',
        filters: [{ name: 'Office Metadata Template', extensions: ['omet'] }],
      })
      
      if (filePath && typeof filePath === 'string') {
        const content = await readTextFile(filePath)
        const template = JSON.parse(content) as MetadataTemplate
        await importTemplate(template)
        // TODO: 显示成功提示
      }
    } catch (error) {
      console.error('导入模板失败:', error)
      // TODO: 显示错误提示
    }
  }, [importTemplate])

  // 应用模板到文件
  const handleApplyTemplate = useCallback(async (templateId: string) => {
    if (!onTemplateApply || selectedFileIds.length === 0) {
      // TODO: 提示用户选择文件
      return
    }
    
    try {
      await onTemplateApply(templateId, selectedFileIds)
      // TODO: 显示成功提示
    } catch (error) {
      console.error('应用模板失败:', error)
      // TODO: 显示错误提示
    }
  }, [onTemplateApply, selectedFileIds])

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-sm">
      {/* 头部操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          元数据模板中心
        </h2>
        
        <div className="flex gap-2">
          <button
            onClick={handleCreateTemplate}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            + 新建模板
          </button>
          
          <button
            onClick={handleImportTemplate}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors"
          >
            导入模板
          </button>
          
          <button
            onClick={() => setShowImportExport(!showImportExport)}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium transition-colors"
          >
            批量管理
          </button>
        </div>
      </div>

      {/* 模板列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <div
            key={template.id}
            className={`p-4 border rounded-lg cursor-pointer transition-all ${
              activeTemplateId === template.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            onClick={() => setActiveTemplate(template.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {template.name}
              </h3>
              {template.isBuiltin && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded">
                  内置
                </span>
              )}
            </div>
            
            {template.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                {template.description}
              </p>
            )}
            
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded">
                {template.organization || '未分类'}
              </span>
              {template.tags?.slice(0, 2).map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded">
                  #{tag}
                </span>
              ))}
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <span>{template.fields.length} 个字段</span>
              <span>v{template.version}</span>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              {!template.isBuiltin && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingTemplate(template)
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleExportTemplate(template.id)
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded transition-colors"
                  >
                    导出
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm(`确定删除模板 "${template.name}"？`)) {
                        deleteTemplate(template.id)
                      }
                    }}
                    className="flex-1 px-2 py-1 text-xs bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded transition-colors"
                  >
                    删除
                  </button>
                </>
              )}
              
              {selectedFileIds.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleApplyTemplate(template.id)
                  }}
                  className="flex-1 px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  应用到 {selectedFileIds.length} 个文件
                </button>
              )}
            </div>
          </div>
        ))}
        
        {templates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 mb-2">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">暂无模板</p>
              <p className="text-sm">创建一个新模板或导入现有模板开始使用</p>
            </div>
          </div>
        )}
      </div>

      {/* 模板编辑器 Modal */}
      {(isCreating || editingTemplate) && (
        <TemplateEditor
          template={editingTemplate || templates.find(t => t.id === activeTemplateId) || null}
          onSave={(template) => {
            if (isCreating) {
              // 已自动创建，只需更新
              const newTemplate = templates[templates.length - 1]
              if (newTemplate) {
                updateTemplate({ ...template, id: newTemplate.id })
              }
            } else {
              updateTemplate(template)
            }
            setIsCreating(false)
            setEditingTemplate(null)
          }}
          onCancel={() => {
            setIsCreating(false)
            setEditingTemplate(null)
            if (isCreating && templates.length > 0) {
              // 删除未保存的新模板
              const newTemplate = templates[templates.length - 1]
              if (newTemplate?.fields.length === 3) { // 默认字段数
                deleteTemplate(newTemplate.id)
              }
            }
          }}
        />
      )}
    </div>
  )
}

// 模板编辑器组件
interface TemplateEditorProps {
  template: MetadataTemplate | null
  onSave: (template: MetadataTemplate) => void
  onCancel: () => void
}

const TemplateEditor: React.FC<TemplateEditorProps> = ({ template, onSave, onCancel }) => {
  const [formData, setFormData] = useState<MetadataTemplate>(() => {
    if (template) return template
    return {
      id: '',
      name: '',
      description: '',
      organization: '',
      version: '1.0.0',
      fields: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: '',
      tags: [],
      isBuiltin: false,
    }
  })

  const addField = () => {
    setFormData(prev => ({
      ...prev,
      fields: [
        ...prev.fields,
        { key: '', label: '', required: false, type: 'text' } as TemplateField,
      ],
    }))
  }

  const updateField = (index: number, updates: Partial<TemplateField>) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.map((field, i) => 
        i === index ? { ...field, ...updates } : field
      ),
    }))
  }

  const removeField = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      updatedAt: Date.now(),
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {template?.id ? '编辑模板' : '新建模板'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                模板名称 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                组织/分类
              </label>
              <input
                type="text"
                value={formData.organization || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                描述
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                作者
              </label>
              <input
                type="text"
                value={formData.author || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                版本号
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          {/* 字段列表 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900 dark:text-white">元数据字段</h4>
              <button
                type="button"
                onClick={addField}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
              >
                + 添加字段
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.fields.map((field, index) => (
                <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="grid grid-cols-4 gap-3">
                    <div className="col-span-1">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">字段键 *</label>
                      <input
                        type="text"
                        value={field.key}
                        onChange={(e) => updateField(index, { key: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="如：title"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">显示标签 *</label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(index, { label: e.target.value })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                        placeholder="如：标题"
                        required
                      />
                    </div>
                    
                    <div className="col-span-1">
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">类型</label>
                      <select
                        value={field.type}
                        onChange={(e) => updateField(index, { type: e.target.value as any })}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      >
                        <option value="text">文本</option>
                        <option value="number">数字</option>
                        <option value="date">日期</option>
                        <option value="select">下拉选择</option>
                      </select>
                    </div>
                    
                    <div className="col-span-1 flex items-end">
                      <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                          className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                        />
                        必填
                      </label>
                      <button
                        type="button"
                        onClick={() => removeField(index)}
                        className="ml-auto px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {formData.fields.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                  暂无字段，点击"添加字段"开始定义
                </div>
              )}
            </div>
          </div>
        </form>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            取消
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            保存模板
          </button>
        </div>
      </div>
    </div>
  )
}

export default TemplateManager
