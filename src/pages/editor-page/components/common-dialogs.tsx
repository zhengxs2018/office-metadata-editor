import React from 'react';

import { FeatureDialog } from './feature-dialog';
import { ExportCenter } from '@/components/export/export-center';
import type { ExportFieldOption } from '@/types/export';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileIds?: string[];
  availableFields?: ExportFieldOption[];
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  open,
  onOpenChange,
  fileIds = [],
  availableFields = [],
}) => {
  return (
    <FeatureDialog
      open={open}
      onOpenChange={onOpenChange}
      title="导出元数据"
      description="将当前工作区元数据导出为 JSON、CSV 或 XML。"
      size="xl"
    >
      <ExportCenter fileIds={fileIds} availableFields={availableFields} />
    </FeatureDialog>
  );
};

export default ExportDialog;
