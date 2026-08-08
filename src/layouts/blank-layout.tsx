import React from 'react';
import { ChromeWindowToolbar } from '../components/chrome/chrome-window-toolbar';

export interface BlankLayoutProps {
  header?: React.ReactNode;
  enableWindowDragOverlay?: boolean;
}

export const BlankLayout: React.FC<React.PropsWithChildren<BlankLayoutProps>> = ({
  header,
  enableWindowDragOverlay,
  children,
}) => {
  const showWindowDragOverlay = enableWindowDragOverlay ?? !header;

  return (
    <main className="h-full w-full bg-background">
      {showWindowDragOverlay && <ChromeWindowToolbar />}
      <div className="flex h-full flex-col bg-background">
        {header}
        <div className="flex min-h-0 flex-1 overflow-hidden bg-muted/55">{children}</div>
      </div>
    </main>
  );
};

export default BlankLayout;
