import React, { useCallback, useEffect, useState } from "react"
import { open } from "@tauri-apps/plugin-dialog"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useTemplateStore } from "@/stores/om-workflow-store"
import type { MetadataTemplate } from "@/types/om-workflow"

const createDraftTemplate = (): MetadataTemplate => ({
  id: "",
  name: "新通讯录模板",
  description: "",
  organization: "",
  manager: "",
  language: "zh-CN",
  version: "1.0.0",
  fields: [],
  author: "",
  tags: [],
  isBuiltin: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
})

const COMMON_LOCALE_CODES = [
  "zh-CN",
  "zh-TW",
  "zh-HK",
  "en-US",
  "en-GB",
  "ja-JP",
  "ko-KR",
  "de-DE",
  "fr-FR",
  "es-ES",
  "pt-BR",
  "it-IT",
  "ru-RU",
  "ar-SA",
  "hi-IN",
  "th-TH",
  "vi-VN",
  "id-ID",
  "tr-TR",
  "nl-NL",
] as const

const languageDisplay = new Intl.DisplayNames(["zh-CN"], { type: "language" })

function getLanguageOptionLabel(localeCode: string): string {
  const normalized = localeCode.trim()
  if (!normalized) {
    return ""
  }

  const languageCode = normalized.split("-")[0] ?? normalized
  const languageName = languageDisplay.of(languageCode) ?? "未知语言"
  return `${normalized} · ${languageName}`
}

export const OmTemplateHub: React.FC = () => {
  const {
    templates,
    activeTemplateId,
    setActiveTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    loadTemplates,
    importTemplate,
    exportTemplate,
  } = useTemplateStore()

  const [editingTemplate, setEditingTemplate] = useState<MetadataTemplate | null>(null)

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    if (!editingTemplate && activeTemplateId) {
      const active = templates.find(item => item.id === activeTemplateId)
      if (active) {
        setEditingTemplate({ ...active })
      }
    }
  }, [activeTemplateId, editingTemplate, templates])

  const handleCreate = () => {
    setEditingTemplate(createDraftTemplate())
    setActiveTemplate(null)
  }

  const handleImport = useCallback(async () => {
    const filePath = await open({
      title: "导入模板",
      filters: [{ name: "JSON", extensions: ["json"] }],
    })
    if (typeof filePath === "string") {
      await importTemplate(filePath)
    }
  }, [importTemplate])

  const handleExport = useCallback(
    async (template: MetadataTemplate) => {
      const outputDir = await open({ title: "选择导出目录", directory: true, multiple: false })
      if (typeof outputDir !== "string") return
      const sanitizedName = (template.name || "template").replace(/[^a-zA-Z0-9_-]/g, "_")
      await exportTemplate(template.id, `${outputDir}/${sanitizedName}.json`)
    },
    [exportTemplate],
  )

  const handleSave = useCallback(async () => {
    if (!editingTemplate) return
    if (!editingTemplate.name.trim()) return

    const existed = editingTemplate.id && templates.some(item => item.id === editingTemplate.id)
    if (existed) {
      await updateTemplate({ ...editingTemplate, updatedAt: Date.now() })
      setActiveTemplate(editingTemplate.id)
    } else {
      const { id, createdAt, updatedAt, ...payload } = editingTemplate
      const newId = await createTemplate(payload)
      setActiveTemplate(newId)
    }
  }, [createTemplate, editingTemplate, setActiveTemplate, templates, updateTemplate])

  const handleStartEdit = useCallback(
    (template: MetadataTemplate) => {
      setActiveTemplate(template.id)
      setEditingTemplate({ ...template })
    },
    [setActiveTemplate],
  )

  return (
    <div className="w-full grid h-full min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[300px_1fr]">
      <aside className="flex min-h-0 flex-col border-b border-border/60 lg:border-r lg:border-b-0">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
          <h3 className="text-sm font-semibold text-foreground">模板列表</h3>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={handleCreate}>
              新建
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => void handleImport()}
            >
              导入
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {templates.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">暂无模板</div>
          ) : (
            templates.map(template => {
              const isActive = activeTemplateId === template.id

              return (
                <div
                  key={template.id}
                  className={`border-b border-border/55 px-3 py-2.5 ${isActive ? "bg-primary/8" : "bg-transparent"}`}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => handleStartEdit(template)}
                  >
                    <p className="truncate text-sm font-semibold text-foreground">
                      {template.name}
                    </p>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {template.description || "无描述"}
                    </p>
                  </button>
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => void handleExport(template)}
                    >
                      导出
                    </button>
                    <span className="h-3 w-px bg-border/70" />
                    <button
                      type="button"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => handleStartEdit(template)}
                    >
                      编辑
                    </button>
                    <span className="h-3 w-px bg-border/70" />
                    <button
                      type="button"
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      onClick={() => void deleteTemplate(template.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2.5">
          <h3 className="text-sm font-semibold text-foreground">模板编辑器</h3>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => void handleSave()} disabled={!editingTemplate}>
              保存模板
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {!editingTemplate ? (
            <div className="px-2 py-12 text-center text-sm text-muted-foreground">
              请选择左侧模板
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                <FormField label="模板名称">
                  <Input
                    value={editingTemplate.name}
                    onChange={e =>
                      setEditingTemplate(prev => (prev ? { ...prev, name: e.target.value } : prev))
                    }
                    placeholder="例如：品牌部统一署名"
                    className="h-8 rounded-none border-0 border-b border-border/55 bg-transparent px-0 text-sm shadow-none focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-none"
                  />
                </FormField>

                <FormField label="版本号">
                  <Input
                    value={editingTemplate.version}
                    onChange={e =>
                      setEditingTemplate(prev =>
                        prev ? { ...prev, version: e.target.value } : prev,
                      )
                    }
                    placeholder="1.0.0"
                    className="h-8 rounded-none border-0 border-b border-border/55 bg-transparent px-0 text-sm shadow-none focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-none"
                  />
                </FormField>

                <FormField label="说明" className="md:col-span-2">
                  <Textarea
                    value={editingTemplate.description || ""}
                    onChange={e =>
                      setEditingTemplate(prev =>
                        prev ? { ...prev, description: e.target.value } : prev,
                      )
                    }
                    placeholder="描述模板适用场景，例如对外发文、法务材料、品牌资料。"
                    className="min-h-18 rounded-none border-0 border-b border-border/55 bg-transparent px-0 py-1 text-sm leading-6 shadow-none focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-none"
                  />
                </FormField>
              </div>

              <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
                <FormField label="作者">
                  <Input
                    value={editingTemplate.author || ""}
                    onChange={e =>
                      setEditingTemplate(prev =>
                        prev ? { ...prev, author: e.target.value } : prev,
                      )
                    }
                    placeholder="覆盖 creator / dcCreator"
                    className="h-8 rounded-none border-0 border-b border-border/55 bg-transparent px-0 text-sm shadow-none focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-none"
                  />
                </FormField>

                <FormField label="组织名称">
                  <Input
                    value={editingTemplate.organization || ""}
                    onChange={e =>
                      setEditingTemplate(prev =>
                        prev ? { ...prev, organization: e.target.value } : prev,
                      )
                    }
                    placeholder="覆盖 company"
                    className="h-8 rounded-none border-0 border-b border-border/55 bg-transparent px-0 text-sm shadow-none focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-none"
                  />
                </FormField>

                <FormField label="管理员">
                  <Input
                    value={editingTemplate.manager || ""}
                    onChange={e =>
                      setEditingTemplate(prev =>
                        prev ? { ...prev, manager: e.target.value } : prev,
                      )
                    }
                    placeholder="覆盖 manager"
                    className="h-8 rounded-none border-0 border-b border-border/55 bg-transparent px-0 text-sm shadow-none focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-none"
                  />
                </FormField>

                <FormField label="语言">
                  <div className="relative">
                    <select
                      value={editingTemplate.language || ""}
                      onChange={e =>
                        setEditingTemplate(prev =>
                          prev ? { ...prev, language: e.target.value } : prev,
                        )
                      }
                      className="h-8 w-full appearance-none rounded-none border-0 border-b border-border/55 bg-transparent px-0 pr-7 text-sm shadow-none outline-none focus:border-primary/40"
                    >
                      <option value="">未设置</option>
                      {COMMON_LOCALE_CODES.map(code => (
                        <option key={code} value={code}>
                          {getLanguageOptionLabel(code)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-0.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </FormField>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

interface FormFieldProps {
  label: string
  className?: string
}

const FormField: React.FC<React.PropsWithChildren<FormFieldProps>> = ({
  label,
  className,
  children,
}) => {
  return (
    <div className={className}>
      <Label className="text-[11px] font-medium tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  )
}

export default OmTemplateHub
