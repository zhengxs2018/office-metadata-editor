import React, { useState } from 'react';

import { ArrowDown01Icon, ArrowRight01Icon, CheckCircle } from '@hugeicons/core-free-icons';

import { HugeIcon } from '@/components/icons/huge-icon';
import { cn } from '@/lib/utils';
import { RISK_TONE } from './compare-tokens';
import type {
  FindingCluster,
  FindingClusterFile,
} from '@/lib/documents/compare/selectors';
import type { CompanySnapshot } from '@/lib/documents/compare/types';

interface FindingsListProps {
  clusters: FindingCluster[];
  companies: CompanySnapshot[];
  activeGroupId: string | null;
  onLocate: (cluster: FindingCluster) => void;
  /** 无任何高/中风险线索时为 true，用于展示积极状态 */
  positive?: boolean;
}

export const FindingsList: React.FC<FindingsListProps> = ({
  clusters,
  companies,
  activeGroupId,
  onLocate,
  positive = false,
}) => {
  if (clusters.length === 0) {
    if (positive) {
      return (
        <div className="flex flex-col animate-scale-in items-center gap-2 rounded-lg border border-emerald-300/50 bg-emerald-50/40 p-6 text-center">
          <HugeIcon icon={CheckCircle} size={28} className="text-emerald-600" />
          <p className="text-fine-print font-medium text-emerald-700">未发现任何高风险关联线索</p>
          <p className="text-fine-print text-muted-foreground">
            基于当前文件，未检测到可判定为同源或同一主体的元数据线索。
          </p>
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-fine-print text-muted-foreground">
        未发现符合当前筛选条件的线索。
      </div>
    );
  }

  return (
    <ul className="stagger space-y-1.5" style={{ ['--md-stagger' as string]: 40 }}>
      {clusters.map((cluster, i) => (
        <FindingClusterItem
          key={cluster.clusterId}
          cluster={cluster}
          nameOf={new Map(companies.map(c => [c.companyId, c.companyName]))}
          active={cluster.groupIds.length > 0 && cluster.groupIds.includes(activeGroupId ?? '')}
          onLocate={onLocate}
          index={i}
        />
      ))}
    </ul>
  );
};

interface FindingClusterItemProps {
  cluster: FindingCluster;
  nameOf: Map<string, string>;
  active: boolean;
  onLocate: (cluster: FindingCluster) => void;
  index: number;
}

const FindingClusterItem: React.FC<FindingClusterItemProps> = ({
  cluster,
  nameOf,
  active,
  onLocate,
  index,
}) => {
  const [open, setOpen] = useState(false);
  const tone = RISK_TONE[cluster.level];
  const companyChain = cluster.companies
    .map(c => nameOf.get(c.companyId) ?? c.companyId)
    .join(' · ');

  return (
    <li style={{ ['--md-index' as string]: index }}>
      <div
        className={cn(
          'rounded-lg border border-border/60 surface-card-block px-3.5 py-3 transition-[colors,transform] duration-200 ease-out hover:-translate-y-px',
          active && 'border-primary/50 ring-1 ring-primary/10',
        )}
      >
        {/* 状态行：证据类型标签 + 匹配度 */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLocate(cluster)}
            className={cn(
              'inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-medium leading-none',
              tone.chip,
            )}
          >
            <span className={cn('size-1.5 rounded-full', tone.dot)} />
            {cluster.evidenceKind === 'sameEntity' ? '同一主体' : '同源制作'}
          </button>
          <span className="ml-auto shrink-0 tabular-nums text-sm font-semibold text-foreground">
            {Math.round(cluster.score * 100)}%
          </span>
        </div>

        {/* 标题行：与状态行拉开间距 */}
        <p className="mt-2 text-sm font-medium leading-snug">{cluster.label}</p>

        {/* 公司链：灰色辅助信息 */}
        {companyChain ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">{companyChain}</p>
        ) : null}

        {/* 来源文件展开区 */}
        <div className="mt-2 border-t border-border/30 pt-2">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <HugeIcon
              icon={open ? ArrowDown01Icon : ArrowRight01Icon}
              size={14}
              className={cn('transition-transform', open && 'rotate-90')}
            />
            来源文件（{cluster.files.length}）
          </button>
          {open ? (
            <ul className="mt-1.5 animate-fade-in space-y-1.5">
              {cluster.files.map(file => (
                <SourceFileRow key={file.docId} file={file} />
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </li>
  );
};

interface SourceFileRowProps {
  file: FindingClusterFile;
}

const SourceFileRow: React.FC<SourceFileRowProps> = ({ file }) => {
  return (
    <li className="border-b border-border/30 pb-2 last:border-b-0">
      <p className={cn('truncate text-sm font-medium text-foreground')} title={file.fileName}>
        {file.fileName}
      </p>
      {file.fields.length > 0 ? (
        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {file.fields.map((field, idx) => (
            <span key={`${field.key}-${idx}`}>
              {field.label}：{field.rawValue || '—'}
            </span>
          ))}
        </div>
      ) : null}
    </li>
  );
};
