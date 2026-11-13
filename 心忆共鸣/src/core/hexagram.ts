/**
 * 周易层（天机）—— 日课卦：每日自动卦象，不做手动摇卦；不直接断吉凶，只给行动建议。
 */

import { HEXAGRAMS, HEX_BY_TRIGRAM, type Hexagram, type Trigram } from './fortuneTexts'
import { hashStr, makeRng } from './seed'

/* ------------------------------------------------------------------ 种子 / rng */

/** FNV-1a / mulberry32 的唯一真源在 `./seed`，此处保留同名导出。 */
export { hashStr, makeRng }

/* ------------------------------------------------------------------ 卦象 */

/** 三爻（自下而上，bit0 = 最下）→ 八卦名 */
const TRIGRAM_NAME: Trigram[] = ['坤', '震', '坎', '兑', '艮', '离', '巽', '乾']

export interface HexLine {
  /** true = 阳 */
  yang: boolean
  /** 是否动爻 */
  moving: boolean
  /** 爻题，如「九三」「六二」 */
  label: string
}

export interface Divination {
  /** 本卦 */
  primary: Hexagram
  /** 变卦 */
  changed: Hexagram
  /** 六爻（自下而上） */
  lines: HexLine[]
  /** 动爻位置（1~6，自下而上） */
  movingAt: number[]
  /** 主爻（按多动爻口径选出的那一爻位置；0 = 无） */
  mainLine: number
  /** 解读口径说明 */
  rule: string
  /** D 日课卦加成 -5~+5 */
  d: number
  /** D 的拆解说明 */
  dNote: string
}

const YAO_POS = ['初', '二', '三', '四', '五', '上']

function yaoLabel(yang: boolean, pos: number): string {
  // 阳爻称九、阴爻称六；初爻与上爻的「九/六」写在后面
  const num = yang ? '九' : '六'
  if (pos === 0) return `初${num}`
  if (pos === 5) return `上${num}`
  return `${num}${YAO_POS[pos]}`
}

/** tendency → D 基础分（+5/+3/0/-3/-5） */
export function tendencyToD(t: number): number {
  if (t >= 2) return 5
  if (t === 1) return 3
  if (t === 0) return 0
  if (t === -1) return -3
  return -5
}

function trigramOf(lines: boolean[], from: number): Trigram {
  const v = (lines[from] ? 1 : 0) + (lines[from + 1] ? 2 : 0) + (lines[from + 2] ? 4 : 0)
  return TRIGRAM_NAME[v]
}

function hexOf(lines: boolean[]): Hexagram {
  const lower = trigramOf(lines, 0)
  const upper = trigramOf(lines, 3)
  const id = HEX_BY_TRIGRAM[`${upper}|${lower}`]
  return HEXAGRAMS[id - 1]
}

/**
 * 日课卦：6 爻自下而上，含本卦、变卦与动爻。
 */
export function divinationOf(dateKey: string): Divination {
  const rng = makeRng(hashStr('hexagram-v1|' + dateKey))

  const yangs: boolean[] = []
  const movings: boolean[] = []
  for (let i = 0; i < 6; i++) {
    yangs.push(rng() < 0.5)
    movings.push(rng() < 0.25)
  }

  const lines: HexLine[] = yangs.map((yang, i) => ({
    yang,
    moving: movings[i],
    label: yaoLabel(yang, i),
  }))

  const changedBits = yangs.map((y, i) => (movings[i] ? !y : y))

  const primary = hexOf(yangs)
  const changed = hexOf(changedBits)

  const movingAt = movings.map((m, i) => (m ? i + 1 : 0)).filter((v) => v > 0)
  const n = movingAt.length

  /* ---- 多动爻口径 ---- */
  let mainLine = 0
  let rule = ''
  switch (n) {
    case 0:
      rule = '无动爻，只看本卦卦辞'
      break
    case 1:
      mainLine = movingAt[0]
      rule = '一爻动，看该动爻爻辞'
      break
    case 2:
      mainLine = movingAt[1]
      rule = '二爻动，取最上方动爻为主爻，变卦看走向'
      break
    case 3:
      mainLine = movingAt[1]
      rule = '三爻动，取中间动爻为主爻，本卦定现状、变卦看走向'
      break
    case 4:
      mainLine = movingAt[0]
      rule = '四爻动，取最下方动爻为主爻，变卦看走向（变动较多，宜保守）'
      break
    case 5: {
      const still = [1, 2, 3, 4, 5, 6].filter((p) => !movingAt.includes(p))
      mainLine = still[0]
      rule = '五爻动，取唯一不变爻为主爻'
      break
    }
    default:
      rule = '六爻全动，只看变卦卦辞（旧局已换）'
      break
  }

  /* ---- D 加成：取本卦 tendency，变卦只做 ±1 修正 ---- */
  const baseD = tendencyToD(primary.tendency)
  const delta = Math.sign(changed.tendency - primary.tendency)
  const d = Math.max(-5, Math.min(5, baseD + delta))
  const dNote =
    delta === 0
      ? `本卦「${primary.keywords[0]}」${baseD >= 0 ? '+' : ''}${baseD}，变卦同向不修正`
      : `本卦「${primary.keywords[0]}」${baseD >= 0 ? '+' : ''}${baseD}，变卦${delta > 0 ? '转好' : '转弱'} ${delta > 0 ? '+1' : '−1'} → ${d >= 0 ? '+' : ''}${d}`

  return { primary, changed, lines, movingAt, mainLine, rule, d, dNote }
}
