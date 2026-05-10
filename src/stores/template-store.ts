/**
 * Template Store - 模板状态管理
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs'
import type { MetadataTemplate } from '@/types/om-workflow'

const TEMPLATE_STORAGE_KEY = 'om.templates'

const persistTemplates = (templates: MetadataTemplate[]) => {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates))
}

const toText = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : ''
}

export const normalizeTemplate = (input: MetadataTemplate): MetadataTemplate => {
  const legacyFields = Array.isArray(input.fields) ? input.fields : []
  const legacyAuthor = legacyFields.find(field => field.key === 'creator')?.defaultValue
  const legacyOrganization =
    legacyFields.find(field => field.key === 'company' || field.key === 'organization')?.defaultValue
  const legacyManager = legacyFields.find(field => field.key === 'manager')?.defaultValue
  const legacyLanguage =
    legacyFields.find(field => field.key === 'language' || field.key === 'dcLanguage')?.defaultValue

  return {
    ...input,
    id: input.id || `tpl_${Date.now()}`,
    name: toText(input.name) || '未命名模板',
    description: toText(input.description),
    author: toText(input.author) || toText(legacyAuthor),
    organization: toText(input.organization) || toText(legacyOrganization),
    manager: toText(input.manager) || toText(legacyManager),
    language: toText(input.language) || toText(legacyLanguage) || 'zh-CN',
    version: toText(input.version) || '1.0.0',
    fields: legacyFields,
    createdAt: input.createdAt || Date.now(),
    updatedAt: Date.now(),
  }
}

const parseTemplateFile = (content: string): MetadataTemplate => {
  const raw = JSON.parse(content) as MetadataTemplate
  return normalizeTemplate(raw)
}

interface TemplateState {
  templates: MetadataTemplate[]
  activeTemplateId: string | null
  isLoading: boolean
  error: string | null
}

interface TemplateActions {
  loadTemplates: () => Promise<void>
  createTemplate: (template: Omit<MetadataTemplate, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>
  updateTemplate: (template: MetadataTemplate) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  setActiveTemplate: (id: string | null) => void
  exportTemplate: (id: string, outputPath: string) => Promise<void>
  importTemplate: (inputPath: string) => Promise<MetadataTemplate>
}

type TemplateStore = TemplateState & TemplateActions

export const useTemplateStore = create<TemplateStore>()(
  subscribeWithSelector((set) => ({
    templates: [],
    activeTemplateId: null,
    isLoading: false,
    error: null,

    loadTemplates: async () => {
      set({ isLoading: true, error: null })
      try {
        const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY)
        const templates = raw ? (JSON.parse(raw) as MetadataTemplate[]) : []
        const normalized = templates.map(item => normalizeTemplate(item))
        persistTemplates(normalized)
        set({ templates: normalized, isLoading: false })
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '加载模板失败',
          isLoading: false,
        })
      }
    },

    createTemplate: async (template) => {
      set({ isLoading: true, error: null })
      try {
        const now = Date.now()
        const id = `tpl_${now}`

        const newTemplate = normalizeTemplate({
          ...template,
          id,
          createdAt: now,
          updatedAt: now,
        } as MetadataTemplate)

        set(state => ({
          templates: (() => {
            const next = [...state.templates, newTemplate]
            persistTemplates(next)
            return next
          })(),
          activeTemplateId: id,
          isLoading: false,
        }))

        return id
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '创建模板失败',
          isLoading: false,
        })
        throw error
      }
    },

    updateTemplate: async (template) => {
      set({ isLoading: true, error: null })
      try {
        set(state => ({
          templates: (() => {
            const next = state.templates.map(t =>
              t.id === template.id ? normalizeTemplate({ ...template, updatedAt: Date.now() }) : t,
            )
            persistTemplates(next)
            return next
          })(),
          isLoading: false,
        }))
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '更新模板失败',
          isLoading: false,
        })
        throw error
      }
    },

    deleteTemplate: async (id: string) => {
      set({ isLoading: true, error: null })
      try {
        set(state => ({
          templates: (() => {
            const next = state.templates.filter(t => t.id !== id)
            persistTemplates(next)
            return next
          })(),
          activeTemplateId: state.activeTemplateId === id ? null : state.activeTemplateId,
          isLoading: false,
        }))
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '删除模板失败',
          isLoading: false,
        })
        throw error
      }
    },

    setActiveTemplate: (id: string | null) => set({ activeTemplateId: id }),

    exportTemplate: async (id, outputPath) => {
      const template = useTemplateStore.getState().templates.find(t => t.id === id)
      if (!template) {
        throw new Error('模板不存在')
      }
      await writeTextFile(outputPath, JSON.stringify(template, null, 2))
    },

    importTemplate: async (inputPath) => {
      set({ isLoading: true, error: null })
      try {
        const content = await readTextFile(inputPath)
        const parsed = parseTemplateFile(content)
        const template = normalizeTemplate({
          ...parsed,
          id: `tpl_${Date.now()}`,
          updatedAt: Date.now(),
        })

        set(state => ({
          templates: (() => {
            const next = [...state.templates, template]
            persistTemplates(next)
            return next
          })(),
          activeTemplateId: template.id,
          isLoading: false,
        }))

        return template
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '导入模板失败',
          isLoading: false,
        })
        throw error
      }
    },
  }))
)
