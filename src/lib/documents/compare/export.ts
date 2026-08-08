import * as XLSX from 'xlsx';

import {
  DIFF_STATE_LABEL,
  MATCH_SOURCE_LABEL,
  RISK_LEVEL_LABEL,
  RULE_LABEL,
  type CompareResult,
} from './types';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateTime(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export function buildCompareWorkbookFileName(generatedAt: Date = new Date()): string {
  const stamp =
    `${generatedAt.getFullYear()}${pad(generatedAt.getMonth() + 1)}${pad(generatedAt.getDate())}` +
    `-${pad(generatedAt.getHours())}${pad(generatedAt.getMinutes())}`;
  return `元数据对比报告_${stamp}.xlsx`;
}

function companyNameMap(result: CompareResult): Map<string, string> {
  return new Map(result.companies.map(c => [c.companyId, c.companyName]));
}

function sheetOverview(result: CompareResult, generatedAt: Date): XLSX.WorkSheet {
  const rows: string[][] = [
    ['元数据对比报告'],
    [''],
    ['生成时间', formatDateTime(generatedAt)],
    ['参与公司数', String(result.stats.companyCount)],
    ['文件总数', String(result.stats.fileCount)],
    ['对齐组数', String(result.stats.groupCount)],
    ['未匹配文件', String(result.stats.unmatchedCount)],
    ['差异字段数', String(result.stats.diffFieldCount)],
    [''],
    ['公司对线索强度', ''],
    ['强线索', String(result.stats.highCount)],
    ['中线索', String(result.stats.mediumCount)],
    ['弱线索', String(result.stats.lowCount)],
    [''],
    ['免责声明'],
    [result.disclaimer],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 18 }, { wch: 80 }];
  return sheet;
}

function sheetAlignment(result: CompareResult): XLSX.WorkSheet {
  const names = companyNameMap(result);
  const companyIds = result.companies.map(c => c.companyId);
  const header = [
    '组ID',
    '对齐名称',
    '匹配方式',
    '置信度',
    '线索强度',
    '差异字段数',
    '缺失字段数',
    ...companyIds.map(id => names.get(id) ?? id),
  ];
  const rows = result.groups.map(group => {
    const byCompany = new Map(group.cells.map(cell => [cell.companyId, cell.fileName ?? '']));
    return [
      group.groupId,
      group.label,
      MATCH_SOURCE_LABEL[group.matchSource],
      `${Math.round(group.matchConfidence * 100)}%`,
      group.riskLevel ? RISK_LEVEL_LABEL[group.riskLevel] : '—',
      String(group.diffCount),
      String(group.missingCount),
      ...companyIds.map(id => byCompany.get(id) ?? ''),
    ];
  });
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = [
    { wch: 8 },
    { wch: 30 },
    { wch: 10 },
    { wch: 8 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    ...companyIds.map(() => ({ wch: 28 })),
  ];
  return sheet;
}

function sheetFindings(result: CompareResult): XLSX.WorkSheet {
  const names = companyNameMap(result);
  const header = [
    '线索ID',
    '规则',
    '线索强度',
    '证据类别',
    '所属组',
    '问题描述',
    '命中值',
    '涉及公司',
    '涉及文件',
    '涉及字段',
    '匹配算法',
    '置信度',
    '说明',
  ];
  const rows = result.findings.map(finding => [
    finding.findingId,
    RULE_LABEL[finding.ruleId] ?? finding.ruleId,
    RISK_LEVEL_LABEL[finding.level],
    finding.evidenceKind === 'sameEntity' ? '同一主体' : '同源制作',
    finding.groupId ?? '—',
    finding.problem,
    finding.value,
    finding.refs.map(r => names.get(r.companyId) ?? r.companyId).join(' / '),
    finding.refs.map(r => r.docId).join(' / '),
    finding.fieldKeys.join(' / '),
    finding.matchTag,
    `${Math.round(finding.score * 100)}%`,
    finding.explain,
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = [
    { wch: 8 },
    { wch: 16 },
    { wch: 10 },
    { wch: 10 },
    { wch: 8 },
    { wch: 34 },
    { wch: 20 },
    { wch: 28 },
    { wch: 24 },
    { wch: 18 },
    { wch: 14 },
    { wch: 8 },
    { wch: 40 },
  ];
  return sheet;
}

function sheetPairRisks(result: CompareResult): XLSX.WorkSheet {
  const names = companyNameMap(result);
  const header = ['公司A', '公司B', '线索强度', '合计得分', '命中规则数', '命中规则', '说明'];
  const rows = result.pairRisks.map(pair => [
    names.get(pair.companyA) ?? pair.companyA,
    names.get(pair.companyB) ?? pair.companyB,
    RISK_LEVEL_LABEL[pair.level],
    String(pair.pairScore),
    String(pair.ruleIds.length),
    pair.ruleIds.map(id => RULE_LABEL[id] ?? id).join(' / '),
    pair.summary,
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = [
    { wch: 24 },
    { wch: 24 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
    { wch: 36 },
    { wch: 44 },
  ];
  return sheet;
}

function sheetFieldDiffs(result: CompareResult): XLSX.WorkSheet {
  const names = companyNameMap(result);
  const companyIds = result.companies.map(c => c.companyId);
  const header = [
    '组ID',
    '对齐名称',
    '字段',
    '字段层级',
    '差异状态',
    ...companyIds.map(id => names.get(id) ?? id),
  ];
  const rows: string[][] = [];
  for (const group of result.groups) {
    for (const diff of group.diffs) {
      if (diff.state === 'ignored') continue;
      const byCompany = new Map(diff.values.map(v => [v.companyId, v.raw ?? '']));
      rows.push([
        group.groupId,
        group.label,
        diff.fieldLabel,
        diff.tier === 'risk' ? '风险字段' : '展示字段',
        DIFF_STATE_LABEL[diff.state],
        ...companyIds.map(id => byCompany.get(id) ?? ''),
      ]);
    }
  }
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    ...companyIds.map(() => ({ wch: 26 })),
  ];
  return sheet;
}

function sheetUnmatched(result: CompareResult): XLSX.WorkSheet {
  const names = companyNameMap(result);
  const header = ['公司', '文件名', '文件ID', '原因'];
  const rows = result.unmatched.map(item => [
    names.get(item.companyId) ?? item.companyId,
    item.fileName,
    item.docId,
    item.reason,
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet['!cols'] = [{ wch: 24 }, { wch: 34 }, { wch: 24 }, { wch: 32 }];
  return sheet;
}

/** 生成 6 张表的对比工作簿 base64，供后端 write_binary_file 落盘。 */
export function buildCompareWorkbookBase64(
  result: CompareResult,
  generatedAt: Date = new Date(),
): string {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetOverview(result, generatedAt), '报告概要');
  XLSX.utils.book_append_sheet(workbook, sheetPairRisks(result), '公司对线索');
  XLSX.utils.book_append_sheet(workbook, sheetFindings(result), '线索明细');
  XLSX.utils.book_append_sheet(workbook, sheetAlignment(result), '对齐结果');
  XLSX.utils.book_append_sheet(workbook, sheetFieldDiffs(result), '字段差异');
  XLSX.utils.book_append_sheet(workbook, sheetUnmatched(result), '未匹配文件');

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const bytes = new Uint8Array(wbout);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
