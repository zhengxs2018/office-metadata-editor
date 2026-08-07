import React, { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';
import { useMetadata } from '@/contexts/metadata-context';
import { MetadataSection } from './metadata-section';
import { MetadataFieldList } from './metadata-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HugeIcon } from '@/components/icons/huge-icon';
import { LockPasswordIcon } from '@hugeicons/core-free-icons';
import { resolveMetadataSections } from '@/lib/documents/metadata';
import type { DocumentFileType } from '@/types/metadata';

const COMMON_LOCALE_CODES = [
  'zh-CN',
  'zh-TW',
  'zh-HK',
  'en-US',
  'en-GB',
  'ja-JP',
  'ko-KR',
  'de-DE',
  'fr-FR',
  'es-ES',
  'pt-BR',
  'it-IT',
  'ru-RU',
  'ar-SA',
  'hi-IN',
  'th-TH',
  'vi-VN',
  'id-ID',
  'tr-TR',
  'nl-NL',
] as const;

const languageDisplay = new Intl.DisplayNames(['zh-CN'], { type: 'language' });

function getLanguageOptionLabel(localeCode: string): string {
  const normalized = localeCode.trim();
  if (!normalized) {
    return '';
  }

  const languageCode = normalized.split('-')[0] ?? normalized;
  const languageName = languageDisplay.of(languageCode) ?? '未知语言';
  return `${normalized} · ${languageName}`;
}

function isLanguageField(field: { key: string; editable: boolean; type: string }) {
  if (!field.editable || field.type !== 'text') {
    return false;
  }

  return field.key === 'language' || field.key === 'dcLanguage';
}

const textFieldSchema = z
  .string()
  .max(4000, '字段长度不能超过 4000 个字符')
  .refine(value => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value), {
    message: '包含不可见控制字符',
  })
  .refine(value => !value.includes('\uFFFD'), {
    message: '文本编码异常，请重新输入该字段',
  });

function formatDateValue(value: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const dateStr = date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeStr = date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${dateStr} ${timeStr}`;
}

function toFieldPath(category: string, key: string): string {
  return `${category}.${key}`;
}

export interface MetadataEditorProps {
  fileType: DocumentFileType;
}

export const MetadataEditor: React.FC<MetadataEditorProps> = ({ fileType }) => {
  const { metadata, updateField } = useMetadata();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const resolvedMetadata = metadata!;
  const sections = useMemo(
    () => resolveMetadataSections(fileType, resolvedMetadata),
    [fileType, resolvedMetadata],
  );

  const handleFieldChange = useCallback(
    (
      category: 'documentProperties' | 'coreProperties' | 'appProperties',
      field: string,
      asLanguageField = false,
    ) =>
      (value: string) => {
        const fieldPath = toFieldPath(category, field);
        let result = textFieldSchema.safeParse(value);

        if (asLanguageField && value.trim() !== '') {
          try {
            void new Intl.Locale(value);
          } catch {
            result = {
              success: false,
              error: {
                issues: [{ message: '请输入有效的 BCP 47 语言代码，如 zh-CN 或 en-US' }],
              },
            } as typeof result;
          }
        }

        setFieldErrors(prev => ({
          ...prev,
          [fieldPath]: result.success ? null : (result.error.issues[0]?.message ?? '输入无效'),
        }));

        updateField(category, field, value);
      },
    [updateField],
  );

  return (
    <div className="flex flex-col gap-3">
      {sections.map(section => (
        <MetadataSection key={section.id} title={section.title} description={section.description}>
          <MetadataFieldList>
            {section.fields.map(field => {
              const fieldPath = toFieldPath(section.category, field.key);
              const value = String(field.value ?? '');
              const errorText = fieldErrors[fieldPath] ?? null;
              const languageInputListId = `${fieldPath}-language-options`;

              return (
                <div
                  key={`${section.id}-${field.key}`}
                  className={`grid items-start gap-1 ${field.span === 2 ? 'md:col-span-2' : 'md:col-span-1'}`}
                >
                  <div className="flex min-h-6 items-center gap-1.5">
                    <Label
                      htmlFor={fieldPath}
                      className="text-xs font-medium tracking-wide text-muted-foreground"
                    >
                      {field.label}
                    </Label>
                    {!field.editable && (
                      <HugeIcon
                        icon={LockPasswordIcon}
                        size={12}
                        className="text-muted-foreground/50"
                      />
                    )}
                  </div>
                  <div className="flex items-center">
                    {field.editable ? (
                      isLanguageField(field) ? (
                        <div className="w-full">
                          <Input
                            id={fieldPath}
                            value={value}
                            list={languageInputListId}
                            onChange={e => {
                              handleFieldChange(section.category, field.key, true)(e.target.value);
                            }}
                            placeholder="输入或筛选语言代码，例如 zh-CN / en-US"
                            className="h-7 rounded-md border border-input bg-input/20 text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                          />
                          <datalist id={languageInputListId}>
                            {COMMON_LOCALE_CODES.map(code => (
                              <option key={code} value={code} label={getLanguageOptionLabel(code)}>
                                {getLanguageOptionLabel(code)}
                              </option>
                            ))}
                          </datalist>
                        </div>
                      ) : field.type === 'textarea' ? (
                        <Textarea
                          id={fieldPath}
                          value={value}
                          onChange={e => {
                            handleFieldChange(section.category, field.key)(e.target.value);
                          }}
                          placeholder={`输入${field.label}`}
                          className="min-h-16 rounded-md border border-input bg-input/20 px-2 py-1 text-sm leading-6 shadow-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                        />
                      ) : (
                        <Input
                          id={fieldPath}
                          type="text"
                          value={value}
                          onChange={e => {
                            handleFieldChange(section.category, field.key)(e.target.value);
                          }}
                          placeholder={`输入${field.label}`}
                          className="h-7 rounded-md border border-input bg-input/20 px-2 text-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
                        />
                      )
                    ) : (
                      <div className="flex h-8 w-full items-center px-0">
                        <span className="text-sm text-foreground/90">
                          {field.type === 'date' ? formatDateValue(value) : value || '-'}
                        </span>
                      </div>
                    )}
                  </div>
                  {errorText && field.editable ? (
                    <p className="text-[11px] text-destructive">{errorText}</p>
                  ) : null}
                </div>
              );
            })}
          </MetadataFieldList>
        </MetadataSection>
      ))}
    </div>
  );
};

export default MetadataEditor;
