import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export interface MetadataSectionProps {
  title: string;
  description: string;
}

export const MetadataSection: React.FC<React.PropsWithChildren<MetadataSectionProps>> = ({
  title,
  description,
  children,
}) => {
  return (
    <Card size="sm" className="animate-fade-in rounded-lg border border-border bg-card shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
};

export default MetadataSection;
