/** 生辰八字（人事层）：只做个人分、个人幸运色与加权，不宣称专业命理；缺时辰 → 三柱简版、个人分收窄 35~65 */

/* ------------------------------------------------------------------ 基础常量 */

export type Element = '金' | '木' | '水' | '火' | '土'

export const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const
export const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const

/** 天干五行 */
export const GAN_ELEMENT: Element[] = ['木', '木', '火', '火', '土', '土', '金', '金', '水', '水']
/** 地支本气五行（不展开藏干） */
export const ZHI_ELEMENT: Element[] = ['水', '土', '木', '木', '土', '火', '火', '土', '金', '金', '土', '水']

const SHENG: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const KE: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

/** 生我者（印） */
function shengMe(e: Element): Element {
  return (Object.keys(SHENG) as Element[]).find((k) => SHENG[k] === e)!
}
/** 我生者（食伤） */
function meSheng(e: Element): Element {
  return SHENG[e]
}
/** 我克者（财） */
function meKe(e: Element): Element {
  return KE[e]
}
/** 克我者（官杀） */
function keMe(e: Element): Element {
  return (Object.keys(KE) as Element[]).find((k) => KE[k] === e)!
}

/* ------------------------------------------------------------------ 儒略日 / 节气 */

/** 公历 → 儒略日（0h UT） */
export function jdOf(y: number, m: number, d: number, hours = 0): number {
  let yy = y
  let mm = m
  if (mm <= 2) {
    yy -= 1
    mm += 12
  }
  const A = Math.floor(yy / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (yy + 4716)) + Math.floor(30.6001 * (mm + 1)) + d + B - 1524.5 + hours / 24
}

/** 儒略日 → 时间戳（ms） */
function msOfJd(jd: number): number {
  return (jd - 2440587.5) * 86400000
}

/** 太阳视黄经（度，0~360） */
function sunLongitude(jd: number): number {
  const n = jd - 2451545.0
  const L = 280.46 + 0.9856474 * n
  const g = ((357.528 + 0.9856003 * n) * Math.PI) / 180
  const lambda = L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)
  return ((lambda % 360) + 360) % 360
}

/** 十二「节」：名字 / 所在公历月 / 太阳黄经 */
const JIE: { name: string; month: number; lon: number }[] = [
  { name: '小寒', month: 1, lon: 285 },
  { name: '立春', month: 2, lon: 315 },
  { name: '惊蛰', month: 3, lon: 345 },
  { name: '清明', month: 4, lon: 15 },
  { name: '立夏', month: 5, lon: 45 },
  { name: '芒种', month: 6, lon: 75 },
  { name: '小暑', month: 7, lon: 105 },
  { name: '立秋', month: 8, lon: 135 },
  { name: '白露', month: 9, lon: 165 },
  { name: '寒露', month: 10, lon: 195 },
  { name: '立冬', month: 11, lon: 225 },
  { name: '大雪', month: 12, lon: 255 },
]

/** 某个「节」在北京时间下的日历日（yyyy-m-d） */
function jieDay(year: number, jieIndex: number): { y: number; m: number; d: number } {
  const j = JIE[jieIndex]
  const lo0 = jdOf(year, j.month, 1)
  const hi0 = lo0 + 40
  const diff = (t: number) => {
    let d = sunLongitude(t) - j.lon
    while (d > 180) d -= 360
    while (d <= -180) d += 360
    return d
  }
  let lo = lo0
  let hi = hi0
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2
    if (diff(mid) < 0) lo = mid
    else hi = mid
  }
  // 北京时间（UTC+8）
  const t = new Date(msOfJd((lo + hi) / 2) + 8 * 3600000)
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }
}

/** 节气日缓存（同一年只算 12 次） */
const JIE_CACHE = new Map<number, { y: number; m: number; d: number }[]>()

function jieDaysOfYear(year: number): { y: number; m: number; d: number }[] {
  let v = JIE_CACHE.get(year)
  if (!v) {
    v = JIE.map((_, i) => jieDay(year, i))
    JIE_CACHE.set(year, v)
  }
  return v
}

/** 数字化的日期（yyyymmdd），便于比较 */
function numOf(y: number, m: number, d: number): number {
  return y * 10000 + m * 100 + d
}

/* ------------------------------------------------------------------ 四柱 */

export interface Pillar {
  /** 天干序号 0~9 */
  ganIndex: number
  /** 地支序号 0~11 */
  zhiIndex: number
  gan: string
  zhi: string
  /** 干支合写，如「甲子」 */
  text: string
  /** 天干五行 */
  ganElement: Element
  /** 地支本气五行 */
  zhiElement: Element
}

export interface Birth {
  year: number
  month: number
  day: number
  /** 0~23，未填为 null */
  hour: number | null
}

function pillarOf(ganIdx: number, zhiIdx: number): Pillar {
  const gi = ((ganIdx % 10) + 10) % 10
  const zi = ((zhiIdx % 12) + 12) % 12
  return {
    ganIndex: gi,
    zhiIndex: zi,
    gan: GAN[gi],
    zhi: ZHI[zi],
    text: GAN[gi] + ZHI[zi],
    ganElement: GAN_ELEMENT[gi],
    zhiElement: ZHI_ELEMENT[zi],
  }
}

/** 日柱序号（0 = 甲子） */
export function dayIndex60(d: Date): number {
  const base = Date.UTC(1949, 9, 1)
  const cur = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round((cur - base) / 86400000)
  return ((days % 60) + 60) % 60
}

/** 干支年序号（0 = 甲子年，1984 年为甲子） */
export function yearIndex60(year: number): number {
  return (((year - 1984) % 60) + 60) % 60
}

export interface Bazi {
  /** 四柱（缺时辰时只有三柱） */
  pillars: { year: Pillar; month: Pillar; day: Pillar; hour: Pillar | null }
  /** 日主（= 日干）五行 */
  dayMaster: Element
  /** 四柱（或三柱）五行计数 */
  counts: Record<Element, number>
  /** 喜用五行（1~2 个，第一位为主） */
  favor: Element[]
  /** 忌神五行（1~2 个） */
  avoid: Element[]
  /** 同党 / 异党 计数（旺衰依据） */
  sameCount: number
  otherCount: number
  /** 偏旺 / 偏弱 */
  strength: '偏旺' | '偏弱'
  /** 是否缺时辰（三柱简版） */
  partial: boolean
  note: string
}

/** 排八字 */
export function baziOf(b: Birth): Bazi {
  /* ---- 年柱：以立春为界 ---- */
  const lichunThis = jieDaysOfYear(b.year)[1]
  const bornNum = numOf(b.year, b.month, b.day)
  const beforeLichun = bornNum < numOf(lichunThis.y, lichunThis.m, lichunThis.d)
  const ganZhiYear = beforeLichun ? b.year - 1 : b.year
  const yIdx = yearIndex60(ganZhiYear)
  const yearPillar = pillarOf(yIdx % 10, yIdx % 12)

  /* ---- 月柱：以十二节为界，年干五虎遁 ---- */
  // 干支年内的 12 个节（立春起）：本年立春→惊蛰…大雪，再到次年小寒
  const jieThis = jieDaysOfYear(ganZhiYear)
  const jieNext = jieDaysOfYear(ganZhiYear + 1)
  const marks: number[] = []
  for (let i = 1; i <= 11; i++) marks.push(numOf(jieThis[i].y, jieThis[i].m, jieThis[i].d)) // 立春…大雪
  marks.push(numOf(jieNext[0].y, jieNext[0].m, jieNext[0].d)) // 次年小寒
  let k = 0
  for (let i = 0; i < marks.length; i++) if (bornNum >= marks[i]) k = i
  // k=0 → 寅月
  // 五虎遁：甲己起丙寅、乙庚起戊寅、丙辛起庚寅、丁壬起壬寅、戊癸起甲寅
  const monthGan = ((yIdx % 10) % 5) * 2 + 2 + k
  const monthPillar = pillarOf(monthGan, 2 + k)

  /* ---- 日柱 ---- */
  const dayIdx = dayIndex60(new Date(b.year, b.month - 1, b.day))
  const dayPillar = pillarOf(dayIdx % 10, dayIdx % 12)

  /* ---- 时柱：日干五鼠遁 ---- */
  let hourPillar: Pillar | null = null
  if (b.hour !== null && b.hour !== undefined) {
    const hz = Math.floor(((b.hour + 1) % 24) / 2) // 23~1 子、1~3 丑 …
    // 五鼠遁：甲己起甲子、乙庚起丙子、丙辛起戊子、丁壬起庚子、戊癸起壬子
    const hg = ((dayIdx % 10) % 5) * 2 + hz
    hourPillar = pillarOf(hg, hz)
  }

  /* ---- 五行统计 ---- */
  const counts: Record<Element, number> = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 }
  const all = [yearPillar, monthPillar, dayPillar, ...(hourPillar ? [hourPillar] : [])]
  for (const p of all) {
    counts[p.ganElement] += 1
    counts[p.zhiElement] += 1
  }

  const dayMaster = dayPillar.ganElement
  const sameSet: Element[] = [dayMaster, shengMe(dayMaster)]
  const otherSet: Element[] = [meSheng(dayMaster), meKe(dayMaster), keMe(dayMaster)]
  let sameCount = 0
  let otherCount = 0
  for (const e of sameSet) sameCount += counts[e]
  for (const e of otherSet) otherCount += counts[e]
  const strength: '偏旺' | '偏弱' = sameCount >= otherCount ? '偏旺' : '偏弱'

  // 喜用：偏弱取生扶（印、比劫）；偏旺取制衡（官杀、食伤）
  // 忌神：偏弱取克泄（官杀、财）；偏旺取同党（比劫、印）
  const favor: Element[] =
    strength === '偏弱' ? [shengMe(dayMaster), dayMaster] : [keMe(dayMaster), meSheng(dayMaster)]
  const avoid: Element[] =
    strength === '偏弱' ? [keMe(dayMaster), meKe(dayMaster)] : [dayMaster, shengMe(dayMaster)]

  return {
    pillars: { year: yearPillar, month: monthPillar, day: dayPillar, hour: hourPillar },
    dayMaster,
    counts,
    favor,
    avoid,
    sameCount,
    otherCount,
    strength,
    partial: !hourPillar,
    note: '娱乐简化排盘，非专业命理',
  }
}

/* ------------------------------------------------------------------ B 分 */

/** 天干五合 */
const GAN_HE: [number, number][] = [
  [0, 5],
  [1, 6],
  [2, 7],
  [3, 8],
  [4, 9],
]
/** 地支六合 */
const ZHI_HE: [number, number][] = [
  [0, 1],
  [2, 11],
  [3, 10],
  [4, 9],
  [5, 8],
  [6, 7],
]
/** 地支六冲 */
const ZHI_CHONG: [number, number][] = [
  [0, 6],
  [1, 7],
  [2, 8],
  [3, 9],
  [4, 10],
  [5, 11],
]

function hasPair(pairs: [number, number][], a: number, b: number): boolean {
  return pairs.some(([x, y]) => (x === a && y === b) || (x === b && y === a))
}

/** 正五行主项净分（日干 ±10 + 日支 ±8，**不含**合冲/旺衰/纳音） */
export function mainElementScore(day: DayPillar, favor: Element[], avoid: Element[]): number {
  let s = 0
  const g = GAN_ELEMENT[day.ganIndex]
  const z = ZHI_ELEMENT[day.zhiIndex]
  if (favor.includes(g)) s += 10
  else if (avoid.includes(g)) s -= 10
  if (favor.includes(z)) s += 8
  else if (avoid.includes(z)) s -= 8
  return s
}

export interface BaziScore {
  /** B 个人分 0~100 */
  score: number
  parts: { label: string; value: number }[]
  /** 个人提示 */
  tip: string
  /** 今日与命局的合冲描述 */
  relation: string
}

export interface DayPillar {
  ganIndex: number
  zhiIndex: number
  /** 该日的干支序号（0~59），用于纳音 */
  index60: number
}

/** 由日期得到当日日柱 */
export function dayPillarOf(d: Date): DayPillar {
  const i = dayIndex60(d)
  return { ganIndex: i % 10, zhiIndex: i % 12, index60: i }
}

/**
 * B 分：50 + 日干五行 ±10 + 日支五行 ±8 + 五合 +10 + 六合 +12 + 六冲 -22 + 生肖冲 -8 + 旺衰 ±5
 * 缺时辰 → clamp(35, 65) 并标「三柱简版」
 */
export function baziScore(bz: Bazi, today: DayPillar, nayinScore: number): BaziScore {
  const parts: { label: string; value: number }[] = [{ label: '基础', value: 50 }]
  let s = 50

  const gEl = GAN_ELEMENT[today.ganIndex]
  const zEl = ZHI_ELEMENT[today.zhiIndex]

  /* 日干五行 vs 喜忌（只判一次） */
  let mainScore = 0
  if (bz.favor.includes(gEl)) {
    s += 10
    mainScore += 10
    parts.push({ label: `日干${GAN[today.ganIndex]}属${gEl}·喜用`, value: 10 })
  } else if (bz.avoid.includes(gEl)) {
    s -= 10
    mainScore -= 10
    parts.push({ label: `日干${GAN[today.ganIndex]}属${gEl}·忌神`, value: -10 })
  }

  /* 日支五行 vs 喜忌（只判一次） */
  if (bz.favor.includes(zEl)) {
    s += 8
    mainScore += 8
    parts.push({ label: `日支${ZHI[today.zhiIndex]}属${zEl}·喜用`, value: 8 })
  } else if (bz.avoid.includes(zEl)) {
    s -= 8
    mainScore -= 8
    parts.push({ label: `日支${ZHI[today.zhiIndex]}属${zEl}·忌神`, value: -8 })
  }

  /* 合冲：今日日柱 vs 本命日柱；生肖冲 = 今日日支 vs 本命年支 */
  const selfGan = bz.pillars.day.ganIndex
  const selfZhi = bz.pillars.day.zhiIndex
  const selfYearZhi = bz.pillars.year.zhiIndex

  let relation = ''
  if (hasPair(GAN_HE, today.ganIndex, selfGan)) {
    s += 10
    parts.push({ label: '天干五合', value: 10 })
    relation = '天干五合'
  }
  if (hasPair(ZHI_HE, today.zhiIndex, selfZhi)) {
    s += 12
    parts.push({ label: '地支六合', value: 12 })
    relation = relation ? relation + '、地支六合' : '地支六合'
  }
  if (hasPair(ZHI_CHONG, today.zhiIndex, selfZhi)) {
    s -= 22
    parts.push({ label: '地支六冲', value: -22 })
    relation = relation ? relation + '、地支六冲' : '地支六冲'
  }
  const zodiacChong = hasPair(ZHI_CHONG, today.zhiIndex, selfYearZhi)
  if (zodiacChong) {
    s -= 8
    parts.push({ label: '生肖相冲', value: -8 })
  }

  /* 旺衰倾向：今日日干五行 vs 日主（印/比/食伤/财/官杀，±5 以内） */
  const dm = bz.dayMaster
  let wangShuai = 0
  if (gEl === shengMe(dm)) wangShuai = bz.strength === '偏弱' ? 5 : -5
  else if (gEl === dm) wangShuai = bz.strength === '偏弱' ? 4 : -4
  else if (gEl === meSheng(dm)) wangShuai = bz.strength === '偏旺' ? 3 : -3
  else if (gEl === meKe(dm)) wangShuai = bz.strength === '偏旺' ? 4 : -4
  else if (gEl === keMe(dm)) wangShuai = bz.strength === '偏旺' ? 5 : -5
  if (wangShuai) {
    s += wangShuai
    parts.push({ label: `旺衰（日主${bz.strength}）`, value: wangShuai })
  }

  /* 纳音辅参（已在 nayin.ts 算好，含 ±8 / 降级 ±3） */
  if (nayinScore) {
    s += nayinScore
    parts.push({ label: '纳音辅参', value: nayinScore })
  }

  s = Math.max(0, Math.min(100, Math.round(s)))
  if (bz.partial) s = Math.max(35, Math.min(65, s))

  /* 个人提示 */
  const tips: string[] = []
  if (bz.favor.includes(gEl)) tips.push('今日干支为喜用，宜主动')
  else if (bz.avoid.includes(gEl)) tips.push('今日干支为忌神，宜保守')
  if (zodiacChong) tips.push('今日日支与生肖相冲，宜稳不宜进')
  if (relation.includes('六合') || relation.includes('五合')) tips.push('合中得力，可与人协作')
  if (relation.includes('六冲')) tips.push('冲则动，凡事留三分余地')
  if (bz.partial) tips.push('缺时辰，仅三柱参考')
  const tip = tips.length ? tips.join('；') : '今日与命局无甚冲突，随缘而行'

  return { score: s, parts, tip, relation: relation || '无合无冲' }
}

/* ------------------------------------------------------------------ 个人幸运色 */

export interface ColorHint {
  /** 主色名 */
  main: string
  /** 辅色名（可能为空） */
  sub: string
}

/** 五行 → 主色 / 辅色 */
export const ELEMENT_COLOR: Record<Element, ColorHint> = {
  金: { main: '鎏金', sub: '月白' },
  木: { main: '霁青', sub: '石绿' },
  水: { main: '黛蓝', sub: '月白' },
  火: { main: '胭脂', sub: '藕荷' },
  土: { main: '杏黄', sub: '' },
}

/** 个人幸运色 = 喜用五行主色（只从 8 色取） */
export function personalColor(bz: Bazi): ColorHint {
  return ELEMENT_COLOR[bz.favor[0]]
}
