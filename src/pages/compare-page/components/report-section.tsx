import React from 'react';
import { HugeIcon } from '@/components/icons/huge-icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReportSectionProps {
  index?: string;
  title: string;
  hint?: string;
  hintIcon?: React.ComponentProps<typeof HugeIcon>['icon'];
  hintHint?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const ReportSection: React.FC<ReportSectionProps> = ({
  index,
  title,
  hint,
  hintIcon,
  hintHint,
  actions,
  children,
}) => (
  <section className="mb-8 animate-fade-in-up scroll-mt-24">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border/40 pb-2">
      <h2 className="text-ink flex items-baseline gap-3 font-heading text-caption font-semibold tracking-wide uppercase">
        {index ? (
          <span className="font-heading text-fine-print text-muted-foreground tabular-nums">
            {index}
          </span>
        ) : null}
        <span>{title}</span>
      </h2>
      <div className="flex items-center gap-3">
        {hint ? (
          <span className="text-fine-print text-muted-foreground">
            {hint}
            {hintIcon && hintHint ? (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="ml-1 inline-flex cursor-help items-center align-middle text-muted-foreground/70">
                      <HugeIcon icon={hintIcon} size={11} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">{hintHint}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </span>
        ) : null}
        {actions}
      </div>
    </header>
    {children}
  </section>
);
