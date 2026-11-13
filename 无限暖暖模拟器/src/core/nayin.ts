/**
 * 纳音五行（辅助层）
 *
 * 定位（§5.1.2）：**另一套五行语言** —— 不加入喜用/忌神集合、不产个人主幸运色、不进 A/C/D，
 * 只作 B 分的辅参项与展示标签。标签必须与「正五行」分写，不能混为一谈。
 *
 * 权威来源：`玄学运势-详细设定.md` §5.1.2 纳音辅参表 + 附录 A.4（60 甲子 → 30 纳音）
 */

import type { Element } from './bazi'

export interface Nayin {
  /** 纳音名，如「海中金」 */
  name: string
  element: Element
}

/**
 * 30 纳音，按六十甲子顺序两两一组：
 * index i 对应干支 2i / 2i+1（如 i=0 → 甲子、乙丑 = 海中金）
 */
export const NAYIN_TABLE: Nayin[] = [
  { name: '海中金', element: '金' }, // 甲子 乙丑
  { name: '炉中火', element: '火' }, // 丙寅 丁卯
  { name: '大林木', element: '木' }, // 戊辰 己巳
  { name: '路旁土', element: '土' }, // 庚午 辛未
  { name: '剑锋金', element: '金' }, // 壬申 癸酉
  { name: '山头火', element: '火' }, // 甲戌 乙亥
  { name: '涧下水', element: '水' }, // 丙子 丁丑
  { name: '城头土', element: '土' }, // 戊寅 己卯
  { name: '白蜡金', element: '金' }, // 庚辰 辛巳
  { name: '杨柳木', element: '木' }, // 壬午 癸未
  { name: '泉中水', element: '水' }, // 甲申 乙酉
  { name: '屋上土', element: '土' }, // 丙戌 丁亥
  { name: '霹雳火', element: '火' }, // 戊子 己丑
  { name: '松柏木', element: '木' }, // 庚寅 辛卯
  { name: '长流水', element: '水' }, // 壬辰 癸巳
  { name: '沙中金', element: '金' }, // 甲午 乙未
  { name: '山下火', element: '火' }, // 丙申 丁酉
  { name: '平地木', element: '木' }, // 戊戌 己亥
  { name: '壁上土', element: '土' }, // 庚子 辛丑
  { name: '金箔金', element: '金' }, // 壬寅 癸卯
  { name: '覆灯火', element: '火' }, // 甲辰 乙巳
  { name: '天河水', element: '水' }, // 丙午 丁未
  { name: '大驿土', element: '土' }, // 戊申 己酉
  { name: '钗钏金', element: '金' }, // 庚戌 辛亥
  { name: '桑柘木', element: '木' }, // 壬子 癸丑
  { name: '大溪水', element: '水' }, // 甲寅 乙卯
  { name: '沙中土', element: '土' }, // 丙辰 丁巳
  { name: '天上火', element: '火' }, // 戊午 己未
  { name: '石榴木', element: '木' }, // 庚申 辛酉
  { name: '大海水', element: '水' }, // 壬戌 癸亥
]

/** 六十甲子序号（0 = 甲子）→ 纳音 */
export function nayinOf(index60: number): Nayin {
  const i = ((index60 % 60) + 60) % 60
  return NAYIN_TABLE[Math.floor(i / 2)]
}

/* ------------------------------------------------------------------ 五行生克 */

const SHENG: Record<Element, Element> = { 木: '火', 火: '土', 土: '金', 金: '水', 水: '木' }
const KE: Record<Element, Element> = { 木: '土', 土: '水', 水: '火', 火: '金', 金: '木' }

/** a 生 b */
export function sheng(a: Element, b: Element): boolean {
  return SHENG[a] === b
}
/** a 克 b */
export function ke(a: Element, b: Element): boolean {
  return KE[a] === b
}

/* ------------------------------------------------------------------ 辅参 */

export interface NayinDetail {
  /** 今日纳音（日课标签，同天恒定） */
  today: Nayin
  /** 本命纳音（= 出生日柱纳音；未填出生日期为 null） */
  self: Nayin | null
  /** 辅参合计（-8 ~ +8，冲突降级后 -3 ~ +3） */
  score: number
  /** 拆解明细，供 UI 展示（如「喜用 +4，相生 +3」） */
  parts: string[]
}

/**
 * 纳音辅参（§5.1.2，×1.4 权重）
 *
 * 判定顺序：
 *   ① 纳音五行对喜忌（喜用 +4 / 忌神 -4）
 *   ② 今日 vs 本命纳音生克（相生 +3 / 相克 -3 / 比和 +1 / 无关 0）
 *   ③ 先封顶 clamp(-8, +8)
 *   ④ 与**正五行主项**（仅当日日干/日支正五行喜忌净分）符号相反时降级 clamp(-3, +3)；正五行主项为 0 不降级
 */
export function nayinBonus(
  today: Nayin,
  self: Nayin | null,
  favor: Element[],
  avoid: Element[],
  /** 正五行主项净分（日干 ±10 + 日支 ±8），用于第 ④ 步冲突降级 */
  mainScore: number,
): NayinDetail {
  if (!self) {
    return { today, self: null, score: 0, parts: [] }
  }

  let raw = 0
  const parts: string[] = []

  // ① 纳音五行 vs 喜用/忌神
  if (favor.includes(today.element)) {
    raw += 4
    parts.push('喜用 +4')
  } else if (avoid.includes(today.element)) {
    raw -= 4
    parts.push('忌神 −4')
  }

  // ② 今日纳音 vs 本命纳音
  if (today.element === self.element) {
    raw += 1
    parts.push('比和 +1')
  } else if (sheng(today.element, self.element)) {
    raw += 3
    parts.push('相生 +3')
  } else if (ke(today.element, self.element)) {
    raw -= 3
    parts.push('相克 −3')
  } else if (sheng(self.element, today.element)) {
    // 本命生今日：泄气但不伤，按相生的一半取整 → 0（表里未列，按 0 处理）
    parts.push('本命生今日 ±0')
  } else if (ke(self.element, today.element)) {
    // 本命克今日：我克者为财，轻微有利，表里未列 → 0
    parts.push('本命克今日 ±0')
  }

  // ③ 封顶 ±8
  let score = Math.max(-8, Math.min(8, raw))

  // ④ 与正五行主项符号相反 → 降级 ±3
  if (mainScore !== 0 && score !== 0 && Math.sign(score) !== Math.sign(mainScore)) {
    score = Math.max(-3, Math.min(3, score))
    parts.push('与正五行相左，降级至 ±3')
  }

  return { today, self, score, parts }
}
