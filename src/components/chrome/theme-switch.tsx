import * as React from 'react';
import { Sun01Icon, Moon01Icon, AiLaptopIcon } from '@hugeicons/core-free-icons';
import { HugeIcon } from '@/components/icons/huge-icon';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

type ThemeOption = {
  value: 'light' | 'dark' | 'system';
  label: string;
  icon: React.ComponentProps<typeof HugeIcon>['icon'];
};

const OPTIONS: ThemeOption[] = [
  { value: 'light', label: '白天', icon: Sun01Icon },
  { value: 'dark', label: '暗黑', icon: Moon01Icon },
  { value: 'system', label: '系统', icon: AiLaptopIcon },
];

export const ThemeSwitch: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="主题切换"
      className={cn(
        'group inline-flex items-center gap-0.5 rounded-full border border-border/20 bg-card/40 p-0.5 backdrop-blur-sm transition-all duration-200',
        'hover:border-border/60 hover:bg-card/70',
        className,
      )}
    >
      {OPTIONS.map(option => {
        const Icon = option.icon;
        const active = theme === option.value;

        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            onClick={() => setTheme(option.value)}
            className={cn(
              'inline-flex items-center rounded-full text-[11px] font-medium transition-all duration-200',
              !active &&
                'max-w-0 w-0 overflow-hidden p-0 gap-0 opacity-0 group-hover:max-w-none group-hover:w-auto group-hover:px-2.5 group-hover:py-1 group-hover:gap-1 group-hover:opacity-100',
              active
                ? 'size-7 justify-center p-0 group-hover:w-auto group-hover:px-2.5 group-hover:py-1 group-hover:gap-1'
                : 'text-muted-foreground hover:bg-background/60 hover:text-foreground',
              active &&
                'group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-sm',
            )}
          >
            <HugeIcon icon={Icon} size={14} />
            <span
              className={cn(
                'overflow-hidden whitespace-nowrap transition-[width] duration-200',
                active ? 'w-0 group-hover:w-auto' : 'w-0 group-hover:w-auto',
              )}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSwitch;
