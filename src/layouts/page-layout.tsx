import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { HugeIcon } from '@/components/icons/huge-icon';
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons';

import { Button } from '@/components/ui/button';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppShell } from '@/layouts/app-shell';

export interface PageLayoutProps {
  backTo?: string;
  header: React.ReactNode;
  actions?: React.ReactNode;
  showSidebarTrigger?: boolean;
  showBackButton?: boolean;
  bleed?: boolean;
  sidebar?: React.ReactNode;
}

export const PageLayout: React.FC<React.PropsWithChildren<PageLayoutProps>> = ({
  children,
  backTo = '/',
  header,
  actions,
  showSidebarTrigger = false,
  showBackButton = true,
  bleed,
  sidebar,
}) => {
  const navigate = useNavigate();
  const dragRef = useRef<HTMLDivElement>(null);

  // 递归给标题区域所有子元素添加 data-tauri-drag-region（排除交互元素）
  useEffect(() => {
    const el = dragRef.current;
    if (!el) return;

    const EXCLUDE_TAGS = new Set(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT']);
    const EXCLUDE_CLASSES = ['app-no-drag'];

    const addDrag = (node: Element) => {
      if (EXCLUDE_TAGS.has(node.tagName) || EXCLUDE_CLASSES.some(c => node.classList.contains(c)))
        return;
      node.setAttribute('data-tauri-drag-region', '');
      for (const child of Array.from(node.children)) {
        addDrag(child);
      }
    };

    addDrag(el);
  }, [header]);

  const leading = (
    <>
      {showSidebarTrigger && (
        <div className="app-no-drag shrink-0">
          <SidebarTrigger className="size-7 rounded-lg text-muted-foreground hover:text-foreground" />
        </div>
      )}
      {showBackButton && (
        <>
          <div className="app-no-drag shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="返回"
              onClick={() => navigate(backTo)}
              className="rounded-lg text-muted-foreground hover:text-foreground"
            >
              <HugeIcon icon={ArrowLeft01Icon} size={14} />
            </Button>
          </div>
          <div className="h-4 w-px shrink-0 bg-hairline" />
        </>
      )}
      <div ref={dragRef} className="min-w-0 flex-1 select-none" data-tauri-drag-region>
        {header}
      </div>
    </>
  );

  return (
    <SidebarProvider className="h-full min-h-0">
      <AppShell
        bleed={bleed ?? Boolean(sidebar)}
        actions={actions}
        leading={leading}
        contentDirection={sidebar ? 'flex-row' : 'flex-col'}
      >
        {sidebar ? (
          <>
            {sidebar}
            <SidebarInset className="flex min-h-0 flex-1 flex-col">{children}</SidebarInset>
          </>
        ) : (
          children
        )}
      </AppShell>
    </SidebarProvider>
  );
};

export default PageLayout;
