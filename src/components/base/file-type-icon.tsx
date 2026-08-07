import { File01Icon, FileSpreadsheetIcon, Presentation01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';

import { cn } from '@/lib/utils';

const ICON_MAP = {
  docx: FileSpreadsheetIcon,
  doc: FileSpreadsheetIcon,
  xlsx: FileSpreadsheetIcon,
  xls: FileSpreadsheetIcon,
  pptx: Presentation01Icon,
  ppt: Presentation01Icon,
  pdf: File01Icon,
} as const;

type FileType = keyof typeof ICON_MAP;

interface FileTypeIconProps {
  extension: string;
  className?: string;
}

export function FileTypeIcon({ extension, className }: FileTypeIconProps) {
  const type = extension.toLowerCase() as FileType;
  const Icon = ICON_MAP[type] ?? File01Icon;

  return (
    <HugeiconsIcon
      icon={Icon}
      strokeWidth={2}
      className={cn('h-4 w-4 shrink-0 text-muted-foreground', className)}
    />
  );
}
