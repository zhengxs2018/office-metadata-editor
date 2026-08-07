import type { DiffState, RiskLevel } from '@/lib/documents/compare/types';

export const RISK_TONE: Record<RiskLevel, { chip: string; dot: string; text: string }> = {
  high: {
    chip: 'bg-rose-500/10 text-rose-700 border-rose-500/20',
    dot: 'bg-rose-500',
    text: 'text-rose-700',
  },
  medium: {
    chip: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
    dot: 'bg-amber-500',
    text: 'text-amber-700',
  },
  low: {
    chip: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    dot: 'bg-slate-400',
    text: 'text-slate-600',
  },
};

/**
 * 差异态仅描述事实，不表达好坏。
 * 多公司横向对比中「完全一致」反而可能是疑点，故一律用中性色，
 * 风险着色只由 RISK_TONE 依据规则层结论施加。
 */
export const DIFF_TONE: Record<DiffState, string> = {
  identical: 'bg-muted/40 text-muted-foreground',
  similar: 'bg-sky-500/10 text-sky-700',
  conflict: 'bg-violet-500/10 text-violet-700',
  missing: 'bg-orange-500/10 text-orange-700',
  ignored: 'bg-transparent text-muted-foreground/60',
};

export const MATCH_TONE: Record<string, string> = {
  exact: 'text-emerald-700',
  normalized: 'text-sky-700',
  fuzzy: 'text-amber-700',
  manual: 'text-violet-700',
};
