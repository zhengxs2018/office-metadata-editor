import React, { useState } from 'react';
import { ArrowDown01Icon, ArrowRight01Icon, UserMultipleIcon } from '@hugeicons/core-free-icons';
import { HugeIcon } from '@/components/icons/huge-icon';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HiddenAuthorPanelProps {
  authors: { name: string; files: string[] }[];
}

const AuthorItem: React.FC<{ name: string; files: string[] }> = ({ name, files }) => {
  const [open, setOpen] = useState(false);

  return (
    <li className={cn('rounded-md surface-card-block')}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/40"
      >
        <HugeIcon
          icon={open ? ArrowDown01Icon : ArrowRight01Icon}
          size={14}
          className="shrink-0 text-muted-foreground"
        />
        <HugeIcon icon={UserMultipleIcon} size={14} className="shrink-0 text-muted-foreground" />
        <span className={cn('truncate font-mono text-body body-strong')}>{name}</span>
        <Badge variant="outline" className="ml-auto shrink-0 text-fine-print tabular-nums">
          {files.length} 个文件
        </Badge>
      </button>

      {open ? (
        <ul className="space-y-1 border-t border-border/40 px-3 py-2">
          {files.map(file => (
            <li key={file} className="text-fine-print break-all text-muted-foreground">
              {file}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
};

export const HiddenAuthorPanel: React.FC<HiddenAuthorPanelProps> = ({ authors }) => {
  if (authors.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {authors.map(author => (
        <AuthorItem key={author.name} name={author.name} files={author.files} />
      ))}
    </ul>
  );
};
