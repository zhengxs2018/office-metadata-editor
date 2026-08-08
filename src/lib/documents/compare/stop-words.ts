/**
 * 比对模块的分类停用词词典。
 *
 * 词条本身已迁移到配置中心（`settings.json` 的 `engine.compare.*`），
 * 与 Rust 侧 `documents/compare/rules.rs` 共用同一份键，避免前后端词表漂移。
 * 本文件只保留「字典元信息 + 读取入口」。
 */

import { getConfiguration } from '@/lib/configuration';

export type StopWordScope = 'field' | 'folder' | 'label';

export interface StopWordDict {
  /** 配置键（点分路径），设置页面直接复用 */
  id: string;
  /** 展示名，设置页面用 */
  label: string;
  /** 作用域：字段级归一化 / 目录级识别 / 标签 */
  scope: StopWordScope;
}

/**
 * 字典登记表。
 * 新增一类停用词：此处加一项 + `settings.default.json` 加一段。
 */
export const STOP_WORD_DICTS: Record<string, StopWordDict> = {
  'engine.compare.labels.stopWords': {
    id: 'engine.compare.labels.stopWords',
    label: '标签停用词',
    scope: 'label',
  },
  'engine.compare.folders.stopWords': {
    id: 'engine.compare.folders.stopWords',
    label: '非公司目录提示词',
    scope: 'folder',
  },
  'engine.compare.fields.stopWords': {
    id: 'engine.compare.fields.stopWords',
    label: '字段归一化停用词',
    scope: 'field',
  },
};

/**
 * 读取指定字典的停用词列表（已转为小写）。
 *
 * 配置未加载时返回空表，此时归一化退化为「不剔除停用词」。
 */
export function getStopWords(id: string): string[] {
  const words = getConfiguration().get<string[]>(id, []);
  return words.map(w => w.trim().toLowerCase()).filter(Boolean);
}

/** 按作用域列出全部字典，供设置页面渲染分类表单。 */
export function listStopWordDicts(scope?: StopWordScope): StopWordDict[] {
  return Object.values(STOP_WORD_DICTS).filter(d => !scope || d.scope === scope);
}

/**
 * 判断文本是否命中某字典的任一停用词（忽略大小写、子串包含）。
 * 语义与 cspell 的"词典词命中"一致：命中即视为该词属于此类。
 */
export function matchesStopWord(id: string, text: string): boolean {
  const lower = text.toLowerCase();
  return getStopWords(id).some(w => lower.includes(w));
}
