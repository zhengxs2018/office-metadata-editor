import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HugeIcon } from '@/components/icons/huge-icon';
import { LockPasswordIcon } from '@hugeicons/core-free-icons';
import type { MetadataField } from '@/types/metadata';

export const MetadataFieldList: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <div className="grid gap-x-4 gap-y-2.5 md:grid-cols-2">{children}</div>;
};

export interface MetadataFieldItemProps {
  field: MetadataField;
  onChange: (key: string, value: string) => void;
}

export const MetadataFieldItem: React.FC<MetadataFieldItemProps> = ({ field, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (field.editable) {
      onChange(field.key, e.target.value);
    }
  };

  const formatDateValue = (value: string): string => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const displayValue = field.type === 'date' ? formatDateValue(field.value) : field.value;

  return (
    <div
      className={`grid items-start gap-1 ${field.span === 2 ? 'md:col-span-2' : 'md:col-span-1'}`}
    >
      <div className="flex min-h-6 items-center gap-1.5">
        <Label
          htmlFor={field.key}
          className="text-[11px] font-medium tracking-wide text-muted-foreground"
        >
          {field.label}
        </Label>
        {!field.editable && (
          <HugeIcon icon={LockPasswordIcon} size={12} className="text-muted-foreground/50" />
        )}
      </div>
      <div className="flex items-center">
        {field.editable ? (
          field.type === 'textarea' ? (
            <Textarea
              id={field.key}
              value={field.value}
              onChange={handleChange}
              placeholder={`输入${field.label}`}
              className="min-h-16 rounded-none border-0 border-b border-zinc-200 bg-transparent px-0 py-1 text-sm leading-6 shadow-none focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-none"
            />
          ) : (
            <Input
              id={field.key}
              type="text"
              value={field.value}
              onChange={handleChange}
              placeholder={`输入${field.label}`}
              className="h-8 rounded-none border-0 border-b border-zinc-200 bg-transparent px-0 text-sm shadow-none focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:outline-none"
            />
          )
        ) : (
          <div className="flex h-8 w-full items-center px-0">
            <span className="text-sm text-foreground/90">{displayValue || '-'}</span>
          </div>
        )}
      </div>
    </div>
  );
};
