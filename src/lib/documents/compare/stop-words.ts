/**
 * 比对模块的分类停用词词典（cspell 风格字典表）。
 *
 * 设计目标：把散落在各处的"遇到即忽略/排除"词组集中为可扩展的字典，
 * 字段命名采用 vscode 设置表风格（如 `compare.fields.stop_words`），
 * 便于后续在设置页面中以配置项形式呈现与编辑。
 */

export type StopWordScope = "field" | "folder"

export interface StopWordDict {
  /** 配置键，vscode settings.json 风格，设置页面直接复用 */
  id: string
  /** 展示名，设置页面用 */
  label: string
  /** 作用域：字段级归一化 / 目录级识别 */
  scope: StopWordScope
  /** 停用词词组（小写存储，匹配时忽略大小写） */
  words: string[]
}

/**
 * 分类停用词词典表。
 * 新增一类停用词只需在此追加一项，引用方通过 `getStopWords(id)` 读取，
 * 无需改动业务代码。
 */
export const STOP_WORD_DICTS: Record<string, StopWordDict> = {
  "compare.fields.stop_words": {
    id: "compare.fields.stop_words",
    label: "字段归一化停用词",
    scope: "field",
    words: [
      // 模板标识词：命中即视为通用模板，不作为公司特征
      "模板",
      "template",
      "通用",
      "standard",
      // 无意义后缀/词：参与归一化时忽略
      "稿",
      "终稿",
      "最终版",
      "clean",
      "final",
      "正式",
      "版",
    ],
  },
  "compare.folders.stop_words": {
    id: "compare.folders.stop_words",
    label: "非公司目录提示词",
    scope: "folder",
    words: [
      "甄选",
      "公开",
      "应答",
      "招标",
      "合同",
      "模板",
      "附件",
      "唱标",
      "技术规范",
      "标段",
      "报价一览",
      "项目",
    ],
  },
}

const DICT_BY_ID = STOP_WORD_DICTS

/** 读取指定字典的停用词列表（已转为小写）。 */
export function getStopWords(id: string): string[] {
  const dict = DICT_BY_ID[id]
  if (!dict) return []
  return dict.words.map((w) => w.toLowerCase())
}

/** 按作用域列出全部字典，供设置页面渲染分类表单。 */
export function listStopWordDicts(scope?: StopWordScope): StopWordDict[] {
  return Object.values(DICT_BY_ID).filter((d) => !scope || d.scope === scope)
}

/**
 * 判断文本是否命中某字典的任一停用词（忽略大小写、子串包含）。
 * 语义与 cspell 的"词典词命中"一致：命中即视为该词属于此类。
 */
export function matchesStopWord(id: string, text: string): boolean {
  const lower = text.toLowerCase()
  return getStopWords(id).some((w) => lower.includes(w))
}
