/**
 * 黄历（天时层）：仿传统黄历格式、内容改成「择时抽卡」；纯函数 + 日期种子，同一天结果恒定、跨天翻页。
 * 纯娱乐，不参与抽卡概率计算（结果仍由 `engine.ts` 的保底链决定）。
 */
import { hashStr, makeRng, pick, pickN } from './seed'
import { SLIPS, type FortuneSlip } from './fortuneTexts'

/** 七档 */
export type Luck = '大吉' | '吉' | '小吉' | '平' | '小凶' | '凶' | '大凶'

export type Element = '金' | '木' | '水' | '火' | '土'

export interface AlmanacHour {
  /** 子 / 丑 / … */
  name: string
  /** 23:00-01:00 */
  range: string
  luck: Luck
  /** 一句话点评 */
  note: string
}

export interface AlmanacDay {
  /** 2026-10-21 */
  date: string
  weekday: string
  /** 伪农历写法，如「菊月十一」（仅展示，不参与排盘） */
  lunar: string
  /** 干支，如「甲子日」 */
  ganzhi: string
  /** 值神 */
  zhiShen: string
  /** 五行意象词，如「水光潋滟」 */
  wuxing: string
  /** 意象词对应的传统五行（B 分只用这个） */
  wuxingElement: Element
  /** 冲煞（游戏概念） */
  chong: string
  yi: string[]
  ji: string[]
  /** 通用幸运色（8 色命名） */
  luckyColor: string
  luckyPart: string
  luckyHour: string
  hours: AlmanacHour[]
  poem: string
  /** 签文出处（自拟的卷名） */
  poemFrom: string
  /** 当日签（带 theme / weight，参与 C 分） */
  slip: FortuneSlip
  /** 黄历分 A 0~100 */
  score: number
  /** 一句话总评 */
  verdict: string
}

/* ------------------------------------------------------------------ 档位 */

export interface VerdictTier {
  key: 'great' | 'good' | 'minorGood' | 'neutral' | 'minorBad' | 'bad' | 'greatBad'
  label: Luck
  /** 含 */
  min: number
  colorName: string
  color: string
}

export const VERDICT_TIERS: VerdictTier[] = [
  { key: 'great', label: '大吉', min: 88, colorName: '鎏金', color: '#B8860B' },
  { key: 'good', label: '吉', min: 76, colorName: '石绿', color: '#2E8B57' },
  { key: 'minorGood', label: '小吉', min: 66, colorName: '霁青', color: '#3A7CA5' },
  { key: 'neutral', label: '平', min: 50, colorName: '黛蓝', color: '#4A5A6A' },
  { key: 'minorBad', label: '小凶', min: 38, colorName: '杏黄深', color: '#B5651D' },
  { key: 'bad', label: '凶', min: 28, colorName: '胭脂', color: '#A03030' },
  { key: 'greatBad', label: '大凶', min: -Infinity, colorName: '暗红', color: '#6B1F1F' },
]

/** 分数 → 档位（clamp 0~100 后四舍五入） */
export function getVerdict(score: number): VerdictTier {
  const s = Math.max(0, Math.min(100, Math.round(score)))
  return VERDICT_TIERS.find((t) => s >= t.min)!
}

/* ------------------------------------------------------------------ 内容池 */

const ZHI_SHEN = [
  '星辉天君', '流金司命', '缀星童子', '月华真君',
  '织梦星官', '无垠使者', '花信风神', '深海司辰',
  '拾光散人', '望舒星君',
]

/** 五行意象词 → 传统五行 */
const WU_XING: { word: string; element: Element }[] = [
  { word: '金箔满盈', element: '金' },
  { word: '水光潋滟', element: '水' },
  { word: '木华初绽', element: '木' },
  { word: '火树银花', element: '火' },
  { word: '土德厚重', element: '土' },
  { word: '星砂聚顶', element: '金' },
  { word: '云气东来', element: '木' },
  { word: '珠光暗涌', element: '水' },
]

const YI = [
  '共鸣', '单抽', '十连', '抽新阁', '补保底', '看深海回响',
  '整理图鉴', '换装', '翻服装阁详情', '数保底', '开新阁', '许愿',
  '截图留念', '听服装阁BGM', '点满深海回响',
]

const JI = [
  '单抽赌金', '深夜十连', '硬啃保底', '连抽不出仍抽', '借钱抽卡',
  '在非时抽卡', '跳过动画', '反复重置', '与欧皇攀比', '边抽边算概率',
  '抽完立刻后悔', '把钻石当无限用',
]

const CHONG = [
  '冲「非酋」煞西', '冲「保底」煞东', '冲「四星」煞南', '冲「钱包」煞北',
  '冲「手气」煞东北', '冲「十连」煞西南', '冲「玄学」煞西北', '冲「单抽」煞东南',
]

/** 通用幸运色 8 色（白、金、青、绿、蓝、黑、红、黄） */
export const LUCKY_COLORS = ['白', '金', '青', '绿', '蓝', '黑', '红', '黄'] as const

/** 通用幸运色 → 展示用色块 */
export const LUCKY_COLOR_HEX: Record<string, string> = {
  白: '#F5F2EA',
  金: '#C9A227',
  青: '#3A7CA5',
  绿: '#2E8B57',
  蓝: '#2C4A73',
  黑: '#2A2A2E',
  红: '#A03030',
  黄: '#D8B44A',
}

const PARTS = [
  '连衣裙', '发型', '上衣', '下装', '外套', '鞋子', '袜子',
  '饰品·发饰', '饰品·颈饰', '饰品·手持物',
]

const HOUR_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const HOUR_NOTES: Record<Luck, string[]> = {
  大吉: ['星门大开，金气东来', '此辰最宜十连', '手气如虹，莫迟疑', '星潮顺流，宜进取'],
  吉: ['可抽，但别贪多', '小试一二，尚可', '星辉微明，聊胜于无', '宜单抽试水'],
  小吉: ['略有星辉，随缘一试', '小有起色，莫贪', '手气微暖，宜轻抽', '可试，勿重仓'],
  平: ['不好不坏，随心即可', '星轨平稳，无甚波澜', '此时抽与不抽，差不多', '静待时机'],
  小凶: ['手气偏薄，宜缓', '星砂散乱，易空手', '不如去整理图鉴', '省点水晶吧'],
  凶: ['非时也，抽必悔', '星门闭合，宜歇', '此时抽卡，白给', '关掉页面，去睡觉'],
  大凶: ['星轨逆行，万勿开抽', '此时抽卡，十抽九空', '闭门谢客，静待明日', '非时之极，宜远离服装阁'],
}

/* ------------------------------------------------------------------ 农历感 */

const LUNAR_MONTHS = ['正月', '杏月', '桃月', '槐月', '榴月', '荷月', '巧月', '桂月', '菊月', '露月', '葭月', '腊月']
const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
]

/** 六十甲子 */
const GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

/** 把一个 Date 转成伪农历（按公历月份/日期映射，纯装饰用途，不参与排盘） */
function fakeLunar(d: Date): string {
  const m = LUNAR_MONTHS[d.getMonth()]
  const day = ((d.getDate() * 7 + d.getMonth() * 11) % 30) + 1
  return m + LUNAR_DAYS[day - 1]
}

/** 日干支（基准：1949-10-01 = 甲子日，与 2000-01-01 = 戊午日 互校） */
function ganzhiOf(d: Date): string {
  const base = Date.UTC(1949, 9, 1)
  const now = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round((now - base) / 86400000)
  const i = ((days % 60) + 60) % 60
  return GAN[i % 10] + ZHI[i % 12] + '日'
}

/** 日期键 yyyy-mm-dd */
export function dateKeyOf(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/* ------------------------------------------------------------------ 主函数 */

export function almanacOf(d: Date = new Date()): AlmanacDay {
  const date = dateKeyOf(d)
  const rng = makeRng(hashStr('almanac-v1|' + date))

  // 黄历分：0~100 可达
  const raw = 55 + (rng() + rng() + rng() - 1.5) * 45
  const score = Math.max(0, Math.min(100, Math.round(raw)))

  const hours: AlmanacHour[] = HOUR_NAMES.map((name, i) => {
    const start = (23 + i * 2) % 24
    const end = (start + 2) % 24
    const r = rng()
    const bias = (score - 50) / 100
    const v = r + bias * 0.42
    const luck: Luck =
      v > 0.9 ? '大吉' : v > 0.74 ? '吉' : v > 0.58 ? '小吉' : v > 0.4 ? '平' : v > 0.24 ? '小凶' : v > 0.12 ? '凶' : '大凶'
    return {
      name,
      range: `${String(start).padStart(2, '0')}:00-${String(end).padStart(2, '0')}:00`,
      luck,
      note: pick(rng, HOUR_NOTES[luck]),
    }
  })

  const bestHour = hours.find((h) => h.luck === '大吉') ?? hours.find((h) => h.luck === '吉') ?? hours[0]

  const verdict =
    score >= 88
      ? '星潮顺流，今日可大抽一场。'
      : score >= 76
        ? '手气正盛，宜进取，见好就收。'
        : score >= 66
          ? '手气尚可，宜小试。'
          : score >= 50
            ? '中平之日，抽与不抽都不亏。'
            : score >= 38
              ? '星砂散乱，宜守，忌进。'
              : score >= 28
                ? '星门半闭，今日宜静。'
                : '非时也。今日开图鉴，明日再抽。'

  const wx = pick(rng, WU_XING)
  const slip = pick(rng, SLIPS)

  return {
    date,
    weekday: WEEKDAYS[d.getDay()],
    lunar: fakeLunar(d),
    ganzhi: ganzhiOf(d),
    zhiShen: pick(rng, ZHI_SHEN),
    wuxing: wx.word,
    wuxingElement: wx.element,
    chong: pick(rng, CHONG),
    yi: pickN(rng, YI, 3),
    ji: pickN(rng, JI, 2),
    luckyColor: pick(rng, LUCKY_COLORS),
    luckyPart: pick(rng, PARTS),
    luckyHour: `${bestHour.name}时（${bestHour.range}）`,
    hours,
    poem: slip.text,
    poemFrom: slip.source,
    slip,
    score,
    verdict,
  }
}

/** 往前/往后翻页 */
export function shiftDay(base: Date, delta: number): Date {
  const d = new Date(base.getTime())
  d.setDate(d.getDate() + delta)
  return d
}
