/**
 * 保底与概率
 *
 * ⚠️ 两条铁律（写错会导致出率肉眼可见地不对）：
 *  1. 4★ 的基础概率是 3.6801%（条件于未出 5★），不是公示的 3.29%。
 *     第 10 抽必出，综合 11.595%（实机 7043 人 / 1245 万抽的间隔分布反解）。
 *  2. pity4 的重置条件是 rarity === 4，**不是 rarity >= 4**。
 *     5★ 不清零 4★ 计数（实机表现为「4★ 顺延一抽」）。写成 >= 4 会把分布压成
 *     「1~9 抽均匀 8.58%、第 10 抽才必出」，综合出率不变、每抽手感全错。
 */
import type { RulesConfig } from '@/types'

/** 第 n 抽的 5★ 条件概率（n 从 1 开始，即「距上次 5★ 已抽了 n 抽」） */
export function fiveStarRate(n: number, rules: RulesConfig): number {
  const { hard, softStart, softSlope } = rules.pity['5']
  const base = rules.rates.base['5']
  if (n >= hard) return 1
  if (n >= softStart) return Math.min(1, base + (n - softStart + 1) * softSlope)
  return base
}

/**
 * 4★ 条件概率（仅在 5★ 未命中后判定；第 `hard` 抽必出）。
 *
 * `softStart` 是可选的：实机的纯 4★ 池在第 4 抽把概率抬到 20.15%
 * （前 3 抽恒定 10.2%），主池没有这段提升，所以 `pity['4'].softStart` 缺省不填。
 */
export function fourStarRate(n: number, rules: RulesConfig): number {
  const p = rules.pity['4']
  const base = rules.rates.base['4']
  if (n >= p.hard) return 1
  if (p.softStart && n >= p.softStart) {
    return Math.min(1, base + (n - p.softStart + 1) * (p.softSlope ?? 0))
  }
  return base
}

/**
 * 欧皇模式的 5★ 条件概率。
 *
 * 「概率提高 3 倍」若只把**单抽条件概率** ×3，会被硬保底卡住：
 * 20 抽必出的天花板不变，综合出率只能涨到 1.3 倍上下，和用户预期差得远。所以这里同时做两件事，让**综合出率**真正约等于 ×3：
 *   ① 单抽概率按「三次取最好」折算：p' = 1 − (1 − p)^3（小概率时≈3p）
 *   ② 硬保底窗口压缩到 1/3（20 → 6 抽），否则仍被 1/20 的天花板压住
 */
export function luckyFiveRate(n: number, rules: RulesConfig, luck = 3): number {
  const hard = Math.max(1, Math.floor(rules.pity['5'].hard / luck))
  if (n >= hard) return 1
  return Math.min(1, 1 - Math.pow(1 - fiveStarRate(n, rules), luck))
}

/** 欧皇模式的 4★ 条件概率（同上：三次取最好 + 保底窗口 1/3） */
export function luckyFourRate(n: number, rules: RulesConfig, luck = 3): number {
  const hard = Math.max(1, Math.floor(rules.pity['4'].hard / luck))
  if (n >= hard) return 1
  return Math.min(1, 1 - Math.pow(1 - fourStarRate(n, rules), luck))
}

/**
 * 纯 4★ 服装阁的规则视图（v1.2.02）。
 *
 * 这类池子里没有任何 5★ 套装，游戏给另一套规则：
 * 4★ 基础 **10.21%**、第 4 抽升到 **20.15%**、**每 5 抽**必出，综合 **24.96%**
 * （实机 1245 万抽统计；官方公示的「基础 10%、每 5 抽必出」漏了第 4 抽那段提升）。
 * 主池的 3.68%/10 抽保底套过来会把出率压到 11.6%，明显偏低。
 *
 * 做法是派生一份 RulesConfig：把 5★ 概率压成 0、4★ 换成 pure4 的参数，
 * 并让 5★ 的硬保底永远够不到（否则第 20 抽会被判成 1）。
 */
export function pure4Rules(base: RulesConfig): RulesConfig {
  const p = base.pure4
  if (!p) return base
  const e4 = p.effective4
  return {
    ...base,
    rates: {
      ...base.rates,
      base: { ...base.rates.base, '5': 0, '4': p.base4, '3': 1 - p.base4 },
      effective: { '5': 0, '4': e4, '3': Math.max(0, 1 - e4) },
      note: p.note,
    },
    pity: {
      ...base.pity,
      '4': {
        hard: p.hard4,
        // 实机第 4 抽会抬到 20.15%，不是恒定 10.2%
        ...(p.softStart4 ? { softStart: p.softStart4, softSlope: p.softSlope4 ?? 0 } : {}),
        note: `每 ${p.hard4} 次共鸣必出四星服装` +
          (p.softStart4 ? `，第 ${p.softStart4} 抽起概率提升` : ''),
      },
      // 纯 4★ 池没有 5★：hard 和 softStart 都要推到不可达。
      // 只改 hard 是不够的 —— `fiveStarRate()` 在 n >= softStart 时会走
      // `base + (n - softStart + 1) * softSlope`，base 虽然是 0、斜率却还在，
      // 抽到第 18 抽会凭空算出 35% 的出金率（v1.9.09 验收 B7 抓到）。
      '5': {
        ...base.pity['5'],
        hard: Number.MAX_SAFE_INTEGER,
        softStart: Number.MAX_SAFE_INTEGER,
      },
    },
  }
}

/** 精确计算综合概率（二维马尔可夫链，与 tools/verify-rates.py 同算法） */

