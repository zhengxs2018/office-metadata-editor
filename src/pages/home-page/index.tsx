import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers01Icon, GitCompareIcon, ScanEyeIcon } from '@hugeicons/core-free-icons';

import { useFileContext } from '@/contexts/file-context';
import { ThemeSwitch } from '@/components/chrome/theme-switch';
import { cn } from '@/lib/utils';
import { HugeIcon } from '@/components/icons/huge-icon';
import { BlankLayout } from '@/layouts/blank-layout';
import { ROUTES } from '@/router/paths';
import { FileDropZone } from '@/components/base/file-drop-zone';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { addFilesByPaths, clearAll } = useFileContext();

  React.useEffect(() => {
    clearAll();
  }, [clearAll]);

  const handleDropFiles = (paths: string[]) => {
    const added = addFilesByPaths(paths);
    if (added > 0) navigate(ROUTES.editor);
  };

  return (
    <BlankLayout
      header={
        <div
          data-tauri-drag-region
          className="hairline-b flex h-(--chrome-titlebar-height) shrink-0 items-center justify-end bg-parchment pr-3"
          style={{ paddingLeft: 'calc(var(--chrome-traffic-light-inset) + 0.75rem)' }}
        >
          <div className="app-no-drag">
            <ThemeSwitch />
          </div>
        </div>
      }
    >
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 bg-canvas p-6">
        <FileDropZone
          onFilesSelected={handleDropFiles}
          className="h-32 w-full max-w-sm rounded-lg border border-dashed border-border bg-background"
        />

        <nav className="grid w-full max-w-md grid-cols-3 gap-2">
          <NavItem
            icon={GitCompareIcon}
            label="对比视图"
            onClick={() => navigate(ROUTES.compare)}
          />
          <NavItem
            icon={Layers01Icon}
            label="批量处理"
            onClick={() => navigate(ROUTES.batch)}
          />
          <NavItem
            icon={ScanEyeIcon}
            label="隐藏信息"
            onClick={() => navigate(ROUTES.hidden)}
          />
        </nav>
      </div>
    </BlankLayout>
  );
};

const NavItem: React.FC<{
  icon: React.ComponentProps<typeof HugeIcon>['icon'];
  label: string;
  onClick: () => void;
}> = ({ icon, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex flex-col items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-3 text-center transition-colors hover:bg-accent',
    )}
  >
    <HugeIcon icon={icon} size={18} className="text-muted-foreground" />
    <span className="text-xs font-medium text-foreground">{label}</span>
  </button>
);

export default HomePage;
