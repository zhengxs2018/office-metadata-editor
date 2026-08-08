import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const EditorPageSkeleton: React.FC = () => {
  return (
    <div className="flex h-full animate-fade-in overflow-hidden p-4">
      <div className="flex min-w-0 flex-3 flex-col gap-3">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <div className="flex w-80 shrink-0 flex-col gap-4 p-2">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
};

export default EditorPageSkeleton;
