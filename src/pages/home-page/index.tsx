import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers01Icon, GitCompareIcon, ScanEyeIcon } from '@hugeicons/core-free-icons';

import { useFileContext } from '@/contexts/file-context';
import { ThemeSwitch } from '@/components/chrome/theme-switch';
import { APP_NAME } from '@/lib/app-config';
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
    <BlankLayout>
      <div className="flex h-full w-full flex-col bg-background relative">
        <div className="absolute top-10 right-10 z-10">
          <ThemeSwitch />
        </div>

        <div className="flex h-full flex-1 items-center flex-col gap-3 overflow-hidden mt-20 p-10">
          <section className="flex justify-between gap-2">
            <div className="flex flex-col items-start w-3/5">
              <h2 className={cn('text-2xl font-semibold tracking-tight sm:text-3xl title-text')}>
                {APP_NAME}
              </h2>
              <p className={cn('mt-2 text-sm leading-5 aux-text')}>
                读取、编辑、清理、批处理全部本地完成，支持多格式文档的元数据处理。
              </p>
            </div>
            <div className="w-2/5 p-2">
              <FileDropZone
                onFilesSelected={handleDropFiles}
                className="rounded-xl border border-dashed border-primary/35 bg-linear-to-br from-primary/8 via-primary/3 to-transparent"
              />
            </div>
          </section>

          <section className="grid shrink-0 grid-cols-1 gap-3 md:grid-cols-3">
            <EntryCard
              index={0}
              tone="orange"
              icon={GitCompareIcon}
              title="对比视图"
              description="深度比对多份文档的作者、编辑时间与软件环境，精准识别同一作者风险。"
              badge="核心"
              cta="开始对比"
              onClick={() => navigate(ROUTES.compare)}
            />
            <EntryCard
              index={1}
              tone="violet"
              icon={Layers01Icon}
              title="批量处理"
              description="一键解析数百个 Office 文档的隐藏属性、修订记录与自定义 XML 数据。"
              badge="高效"
              cta="批量处理"
              onClick={() => navigate(ROUTES.batch)}
            />
            <EntryCard
              index={2}
              tone="emerald"
              icon={ScanEyeIcon}
              title="隐藏信息提取"
              description="提取文档中的批注作者、修订痕迹与内嵌元数据，辅助识别编辑来源。"
              badge="检视"
              cta="查看隐藏信息"
              onClick={() => navigate(ROUTES.hidden)}
            />
          </section>
        </div>
      </div>
    </BlankLayout>
  );
};

const TONE_STYLES: Record<string, { card: string; icon: string; badge: string }> = {
  orange: {
    card: 'from-orange-500/15 to-orange-500/0 border-orange-500/20',
    icon: 'bg-orange-500/10 text-orange-600 dark:text-orange-300',
    badge: 'bg-red-500 text-white',
  },
  violet: {
    card: 'from-violet-500/15 to-violet-500/0 border-violet-500/20',
    icon: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
    badge: 'bg-blue-500 text-white',
  },
  emerald: {
    card: 'from-emerald-500/15 to-emerald-500/0 border-emerald-500/20',
    icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    badge: 'bg-emerald-600 text-white',
  },
};

const EntryCard: React.FC<{
  index: number;
  tone: 'orange' | 'violet' | 'emerald';
  icon: React.ComponentProps<typeof HugeIcon>['icon'];
  title: string;
  description: string;
  badge: string;
  cta: string;
  onClick: () => void;
}> = ({ index, tone, icon: Icon, title, description, badge, cta, onClick }) => {
  const style = TONE_STYLES[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col rounded-xl border bg-linear-to-br p-4 text-left transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md animate-fade-in-up',
        style.card,
      )}
      style={{ animationDelay: `calc(${index} * 50ms)` }}
    >
      <div className="flex items-start justify-between">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-md', style.icon)}>
          <HugeIcon icon={Icon} size={16} />
        </span>
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', style.badge)}>
          {badge}
        </span>
      </div>
      <div className="mt-3 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="mt-3 flex items-center justify-end text-xs font-medium text-primary transition-transform group-hover:translate-x-0.5">
        {cta} →
      </div>
    </button>
  );
};

export default HomePage;
