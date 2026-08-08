import React, { useState } from 'react';

import { ArrowDown01Icon, ArrowRight01Icon, CheckCircle } from '@hugeicons/core-free-icons';

import { HugeIcon } from '@/components/icons/huge-icon';
import { cn } from '@/lib/utils';
import { RISK_LEVEL_LABEL, type CompanySnapshot } from '@/lib/documents/compare/types';
import type {
  FindingCluster,
  FindingClusterField,
  FindingClusterFile,
} from '@/lib/documents/compare/selectors';

import { RISK_TONE } from './compare-tokens';

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
    .join(' - ');

  return (
    <li style={{ ['--md-index' as string]: index }}>
      <div
        className={cn(
          'rounded-lg border px-2.5 py-2 transition-[colors,box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-sm',
          active ? 'border-primary/40 bg-primary/5' : 'border-border/60',
        )}
      >
        <button
          type="button"
          onClick={() => onLocate(cluster)}
          className="w-full text-left hover:bg-muted/40 -mx-1 rounded-md px-1"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-fine-print',
                tone.chip,
              )}
            >
              <span className={cn('size-1.5 rounded-full', tone.dot)} />
              {RISK_LEVEL_LABEL[cluster.level]}
            </span>
            <span className="text-fine-print text-muted-foreground">
              {cluster.evidenceKind === 'sameEntity' ? '同一主体' : '同源制作'}
            </span>
            <span className="ml-auto text-fine-print tabular-nums text-muted-foreground">
              {Math.round(cluster.score * 100)}%
            </span>
          </div>
          <p className="mt-1 text-fine-print font-medium">{cluster.label}</p>
          {companyChain ? (
            <p className="mt-0.5 truncate text-fine-print text-muted-foreground">{companyChain}</p>
          ) : null}
        </button>

        <div className="mt-1.5 border-t border-border/40 pt-1.5">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="inline-flex items-center gap-1 text-fine-print text-muted-foreground hover:text-foreground"
          >
            <HugeIcon
              icon={open ? ArrowDown01Icon : ArrowRight01Icon}
              size={12}
              className={cn('transition-transform', open && 'rotate-90')}
            />
            来源文件（{cluster.files.length}）
          </button>
          {open ? (
            <ul className="mt-1 animate-fade-in space-y-1">
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
    <li className="rounded bg-muted/40 px-2 py-1 text-fine-print">
      <p className="truncate font-medium text-foreground" title={file.fileName}>
        {file.fileName}
      </p>
      {file.fields.map((field, idx) => (
        <FieldLine key={`${field.key}-${idx}`} field={field} />
      ))}
    </li>
  );
};

interface FieldLineProps {
  field: FindingClusterField;
}

const FieldLine: React.FC<FieldLineProps> = ({ field }) => {
  return (
    <p className="mt-0.5 text-muted-foreground">
      {field.label}：{field.rawValue || '—'}
    </p>
  );
};
