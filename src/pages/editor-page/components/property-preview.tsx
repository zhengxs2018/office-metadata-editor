import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PropertyPreviewList, PropertyPreviewItem } from './property-preview-item';

export type Property = {
  label: string;
  value: string;
  span?: 1 | 2;
};

export type PropertyPreviewProps = {
  title: string;
  properties: Property[];
  style?: React.CSSProperties;
};

export const PropertyPreview: React.FC<PropertyPreviewProps> = ({ title, properties, style }) => {
  return (
    <Card
      size="sm"
      className="animate-fade-in-up rounded-lg border border-border bg-card/60 shadow-none"
      style={style}
    >
      <CardHeader className="pb-1.5">
        <CardTitle className="text-xs font-semibold tracking-[0.08em] text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-40 pt-0 pr-1">
        <PropertyPreviewList>
          {properties.map(item => (
            <PropertyPreviewItem
              key={item.label}
              label={item.label}
              value={item.value}
              span={item.span}
            />
          ))}
        </PropertyPreviewList>
      </CardContent>
    </Card>
  );
};

export default PropertyPreview;
