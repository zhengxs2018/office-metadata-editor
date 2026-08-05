export type CompareFileEntry = {
  filePath: string
  fileName: string
  fileType: string
}

export type CompareRow = {
  key: string
  files: (CompareFileEntry | null)[]
}

const EXTENSION_PATTERN = /\.([a-z0-9]+)$/i

function extractExtension(fileName: string): string {
  const match = fileName.match(EXTENSION_PATTERN)
  return match ? match[1].toLowerCase() : ""
}

/**
 * 生成配对键：去掉文件名开头可能的公司/单位名前缀，保留核心词 + 扩展名。
 * 投标场景下文件名形如「xx公司商务.pdf」，核心词是「商务」而非公司名。
 */
export function buildMatchKey(fileName: string): string {
  const extension = extractExtension(fileName)
  const base = fileName.slice(0, fileName.length - (extension ? extension.length + 1 : 0))

  const prefixes = ["公司", "集团", "股份", "有限", "企业", "单位", "局", "院", "所"]
  let core = base
  for (const prefix of prefixes) {
    const idx = core.indexOf(prefix)
    if (idx > 0) {
      core = core.slice(idx + prefix.length)
      break
    }
  }

  core = core.replace(/[一二三四五六七八九十\d]+/g, "").trim()
  return `${core}#${extension}`
}

// 归一化 Levenshtein 距离（0=完全相同，1=完全不同）
export function normalizedSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const lenA = a.length
  const lenB = b.length
  if (lenA === 0 || lenB === 0) return 0

  const matrix: number[][] = Array.from({ length: lenA + 1 }, () => new Array(lenB + 1).fill(0))
  for (let i = 0; i <= lenA; i++) matrix[i][0] = i
  for (let j = 0; j <= lenB; j++) matrix[0][j] = j

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      )
    }
  }

  const distance = matrix[lenA][lenB]
  return 1 - distance / Math.max(lenA, lenB)
}

/**
 * 跨列配对：以第一列为基准，其余各列按匹配键相似度对齐到基准行。
 * 无法配对的文件作为独立行追加在末尾。
 */
export function alignColumns(columns: CompareFileEntry[][]): CompareRow[] {
  if (columns.length === 0) return []

  const base = columns[0]
  const rows: CompareRow[] = base.map(file => ({
    key: buildMatchKey(file.fileName),
    files: [file, ...columns.slice(1).map(() => null)],
  }))

  for (let col = 1; col < columns.length; col++) {
    const available = [...columns[col]]
    const used = new Set<number>()

    for (const row of rows) {
      const baseKey = row.key
      let bestIdx = -1
      let bestScore = 0.3

      available.forEach((file, idx) => {
        if (used.has(idx)) return
        const score = normalizedSimilarity(baseKey, buildMatchKey(file.fileName))
        if (score > bestScore) {
          bestScore = score
          bestIdx = idx
        }
      })

      if (bestIdx >= 0) {
        row.files[col] = available[bestIdx]
        used.add(bestIdx)
      }
    }

    available.forEach((file, idx) => {
      if (!used.has(idx)) {
        rows.push({
          key: buildMatchKey(file.fileName),
          files: [...columns.slice(0, col).map(() => null), file],
        })
      }
    })
  }

  return rows
}
