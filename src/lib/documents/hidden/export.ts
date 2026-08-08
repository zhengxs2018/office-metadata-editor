import * as XLSX from 'xlsx';

import type { HiddenStats, HiddenTraceRow } from '@/types/hidden';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function formatDateTime(date: Date): string {
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export function buildHiddenWorkbookFileName(generatedAt: Date = new Date()): string {
  const stamp =
    `${generatedAt.getFullYear()}${pad(generatedAt.getMonth() + 1)}${pad(generatedAt.getDate())}` +
    `-${pad(generatedAt.getHours())}${pad(generatedAt.getMinutes())}`;
  return `隐藏信息报告_${stamp}.xlsx`;
}

function sheetOverview(stats: HiddenStats, generatedAt: Date): XLSX.WorkSheet {
  const rows: string[][] = [
    ['隐藏信息提取报告'],
    [''],
    ['生成时间', formatDateTime(generatedAt)],
    ['扫描文件数', String(stats.fileCount)],
    ['存在痕迹文件数', String(stats.flaggedCount)],
    ['无痕迹文件数', String(stats.cleanCount)],
    [''],
    ['痕迹统计', ''],
    ['批注作者', String(stats.annotationCount)],
    ['修订作者', String(stats.revisionCount)],
    ['XMP 创建者', String(stats.xmpCount)],
    ['隐藏内容标记', String(stats.markerCount)],
    [''],
    ['说明'],
    ['隐藏痕迹可能泄露文件编辑者身份，建议在对外分发前逐项核对并清除。'],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet['!cols'] = [{ wch: 20 }, { wch: 80 }];
  return sheet;
}

function sheetTraces(rows: HiddenTraceRow[]): XLSX.WorkSheet {
  const header = [
    '文件名',
    '文件类型',
    '痕迹数',
    '批注作者',
    '修订作者',
    'XMP 创建者',
    '隐藏内容标记',
    '文件路径',
  ];
  const body = rows
    .filter(row => row.hasTrace)
    .map(row => [
      row.fileName,
      row.fileType,
      String(row.traceCount),
      row.annotationAuthors.join(' / '),
      row.revisionAuthors.join(' / '),
      row.xmpCreators.join(' / '),
      row.hasHiddenMarkers ? '是' : '否',
      row.filePath,
    ]);
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet['!cols'] = [
    { wch: 34 },
    { wch: 10 },
    { wch: 8 },
    { wch: 28 },
    { wch: 28 },
    { wch: 28 },
    { wch: 14 },
    { wch: 60 },
  ];
  return sheet;
}

function sheetAuthors(authors: { name: string; files: string[] }[]): XLSX.WorkSheet {
  const header = ['作者 / 创建者', '涉及文件数', '涉及文件'];
  const body = authors.map(author => [
    author.name,
    String(author.files.length),
    author.files.join(' / '),
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 80 }];
  return sheet;
}

function sheetAllFiles(rows: HiddenTraceRow[]): XLSX.WorkSheet {
  const header = ['文件名', '文件类型', '检测结果', '痕迹数', '文件路径'];
  const body = rows.map(row => [
    row.fileName,
    row.fileType,
    row.hasTrace ? '存在隐藏痕迹' : '未发现痕迹',
    String(row.traceCount),
    row.filePath,
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet['!cols'] = [{ wch: 34 }, { wch: 10 }, { wch: 16 }, { wch: 8 }, { wch: 60 }];
  return sheet;
}

export function buildHiddenWorkbookBase64(
  rows: HiddenTraceRow[],
  stats: HiddenStats,
  authors: { name: string; files: string[] }[],
  generatedAt: Date = new Date(),
): string {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheetOverview(stats, generatedAt), '报告概要');
  XLSX.utils.book_append_sheet(workbook, sheetTraces(rows), '痕迹明细');
  XLSX.utils.book_append_sheet(workbook, sheetAuthors(authors), '作者汇总');
  XLSX.utils.book_append_sheet(workbook, sheetAllFiles(rows), '全部文件');

  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const bytes = new Uint8Array(wbout);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
