import React from 'react';

export const PropertyPreviewList: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">{children}</dl>;
};

export interface PropertyPreviewItemProps {
  label: string;
  value: string;
  span?: 1 | 2;
}

export const PropertyPreviewItem: React.FC<PropertyPreviewItemProps> = ({
  label,
  value,
  span = 1,
}) => {
  return (
    <div
      className={`grid min-w-0 grid-cols-[max-content_1fr] items-start gap-x-2 py-0.5 ${span === 2 ? 'col-span-2' : 'col-span-1'}`}
    >
      <dt className="text-[11px] tracking-wide whitespace-nowrap text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate text-xs font-medium text-foreground/95">{value || '-'}</dd>
    </div>
  );
};
