/** 三合一运势（黄历 · 八字 · 周易 + 纳音辅助） */
import { almanacOf, dateKeyOf, getVerdict, type AlmanacDay, type VerdictTier } from './almanac'
import {
  baziOf,
  baziScore,
  dayIndex60,
  dayPillarOf,
  mainElementScore,
  personalColor,
  type Bazi,
  type BaziScore,
  type Birth,
  type ColorHint,
} from './bazi'
import { divinationOf, type Divination } from './hexagram'
import { nayinBonus, nayinOf, type Nayin, type NayinDetail } from './nayin'
import { themesOf } from '@/config/themeDict'
import type { Theme } from './fortuneTexts'

/* ------------------------------------------------------------------ 存档 */

const BIRTH_KEY = 'nikki-almanac-birth-v1'
const UUID_KEY = 'nikki-almanac-uid-v1'
/** 「生辰弹窗已经问过」标记（填写 / 跳过 / 清除都置位） */
const ASKED_KEY = 'nikki-almanac-bazi-asked-v1'

/** 出生信息（年/月/日必填，时选填） */
export interface Profile {
  birth: Birth | null
  /** 匿名 ID（首次进入生成，用于个人种子） */
  uid: string
  /** 生辰弹窗是否已经问过（跳过也算） */
  asked: boolean
}

export function loadProfile(): Profile {
  let uid = ''
  let birth: Birth | null = null
  let asked = false
  try {
    uid = localStorage.getItem(UUID_KEY) || ''
    if (!uid) {
      uid = 'u-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
      localStorage.setItem(UUID_KEY, uid)
    }
    const raw = localStorage.getItem(BIRTH_KEY)
    if (raw) {
      const o = JSON.parse(raw)
      if (o && typeof o.year === 'number' && typeof o.month === 'number' && typeof o.day === 'number') {
        birth = {
          year: o.year,
          month: o.month,
          day: o.day,
          hour: typeof o.hour === 'number' ? o.hour : null,
        }
      }
    }
    asked = localStorage.getItem(ASKED_KEY) === '1'
    // 老存档：生辰已经填过，补上标记
    if (birth) asked = true
  } catch {
    /* localStorage 不可用时按未填处理 */
  }
  return { birth, uid, asked }
}

export function saveBirth(b: Birth | null): void {
  try {
    if (b) localStorage.setItem(BIRTH_KEY, JSON.stringify(b))
    else localStorage.removeItem(BIRTH_KEY)
  } catch {
    /* ignore */
  }
}

/** 标记「生辰弹窗问过了」。填写、跳过、清除三条路都要调，之后不再自动弹 */
export function markBirthAsked(): void {
  try {
    localStorage.setItem(ASKED_KEY, '1')
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ C 分 */

export interface SlipScore {
  score: number
  /** 命中的宜主题 */
  hitYi: Theme[]
  /** 命中的忌主题 */
  hitJi: Theme[]
  /** 命中的卦主题 */
  hitGua: Theme[]
  weight: number
}

/** 去重 + 取前 n */
function uniq<T>(arr: T[]): T[] {
  return [...new Set(arr)]
}

/* ------------------------------------------------------------------ 综合 */

export interface FortuneResult {
  date: string
  almanac: AlmanacDay
  div: Divination
  slip: SlipScore
  /** 八字层（未填出生信息为 null） */
  bazi: Bazi | null
  baziScore: BaziScore | null
  nayin: NayinDetail
  /** 本命纳音（未填为 null） */
  selfNayin: Nayin | null
  /** 个人幸运色（未填为 null） */
  color: ColorHint | null
  /** A / B / C / D */
  a: number
  b: number | null
  c: number
  d: number
  /** 综合分 */
  total: number
  /** 档位 */
  tier: VerdictTier
  /** 综合公式说明 */
  formula: string
}

/** C 个人签分 */
export function slipScore(day: AlmanacDay, div: Divination): SlipScore {
  const slipThemes = uniq(day.slip.theme)
  const yiThemes = uniq(day.yi.slice(0, 3).flatMap(themesOf))
  const jiThemes = uniq(day.ji.slice(0, 2).flatMap(themesOf))
  const guaThemes = uniq([div.primary.theme[0], div.primary.theme[1]].filter(Boolean) as Theme[])

  const hitYi = slipThemes.filter((t) => yiThemes.includes(t) && !jiThemes.includes(t)).slice(0, 2)
  const hitJi = slipThemes.filter((t) => jiThemes.includes(t)).slice(0, 2)
  const hitGua = slipThemes.filter((t) => guaThemes.includes(t)).slice(0, 2)

  const score = Math.max(
    0,
    Math.min(
      100,
      50 + Math.min(16, 8 * hitYi.length) - Math.min(16, 8 * hitJi.length) + Math.min(12, 6 * hitGua.length) + day.slip.weight,
    ),
  )

  return { score, hitYi, hitJi, hitGua, weight: day.slip.weight }
}

/** 计算某一天的三合一运势 */
export function fortuneOf(date: Date, profile: Profile): FortuneResult {
  const day = almanacOf(date)
  const div = divinationOf(dateKeyOf(date))
  const slip = slipScore(day, div)

  const a = day.score
  const c = slip.score
  const d = div.d

  /* 八字层 */
  let bazi: Bazi | null = null
  let baziSc: BaziScore | null = null
  let selfNayin: Nayin | null = null
  let color: ColorHint | null = null

  const todayPillar = dayPillarOf(date)
  const todayNayin = nayinOf(todayPillar.index60)

  if (profile.birth) {
    bazi = baziOf(profile.birth)
    // 本命纳音 = 出生日柱纳音
    const birth = profile.birth
    selfNayin = nayinOf(dayIndex60(new Date(birth.year, birth.month - 1, birth.day)))

    // 正五行主项（日干 ±10 + 日支 ±8），用于纳音冲突降级
    const mainScore = mainElementScore(todayPillar, bazi.favor, bazi.avoid)
    const nb = nayinBonus(todayNayin, selfNayin, bazi.favor, bazi.avoid, mainScore)
    baziSc = baziScore(bazi, todayPillar, nb.score)
    color = personalColor(bazi)

    const b = baziSc.score
    const total = Math.max(0, Math.min(100, Math.round(0.45 * a + 0.45 * b + 0.1 * c + d)))
    return {
      date: day.date,
      almanac: day,
      div,
      slip,
      bazi,
      baziScore: baziSc,
      nayin: nb,
      selfNayin,
      color,
      a,
      b,
      c,
      d,
      total,
      tier: getVerdict(total),
      formula: `综合 ${total} = 0.45×黄历 ${a} + 0.45×个人 ${b} + 0.10×签 ${c} + 卦 ${d >= 0 ? '+' : ''}${d}`,
    }
  }

  // 未填出生信息 → 黄历 + 周易 双模式
  const nb: NayinDetail = { today: todayNayin, self: null, score: 0, parts: [] }
  const total = Math.max(0, Math.min(100, Math.round(0.5 * a + 0.4 * c + d)))
  return {
    date: day.date,
    almanac: day,
    div,
    slip,
    bazi: null,
    baziScore: null,
    nayin: nb,
    selfNayin: null,
    color: null,
    a,
    b: null,
    c,
    d,
    total,
    tier: getVerdict(total),
    formula: `综合 ${total} = 0.5×黄历 ${a} + 0.4×签 ${c} + 卦 ${d >= 0 ? '+' : ''}${d}（未填生辰，双模式）`,
  }
}
