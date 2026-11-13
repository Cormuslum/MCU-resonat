/** 保底与概率 */
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
 * 4★ 条件概率（仅在 5★ 未命中后判定，第 `hard` 抽必出）；`softStart` 是纯 4★ 池第 4 抽的抬升点。
 */export function fourStarRate(n: number, rules: RulesConfig): number {
  const p = rules.pity['4']
  const base = rules.rates.base['4']
  if (n >= p.hard) return 1
  if (p.softStart && n >= p.softStart) {
    return Math.min(1, base + (n - p.softStart + 1) * (p.softSlope ?? 0))
  }
  return base
}

/** 欧皇模式的 5★ 条件概率：单抽按「三次取最好」折算 p' = 1 − (1 − p)^3，硬保底窗口压到 1/3 */
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

/** 纯 4★ 服装阁的规则视图：4★ 基础 10.21%、第 4 抽 20.15%、每 5 抽必出、综合 24.96%； 派生一份 RulesConfig（5★ 概率压 0、硬保底够不到） */
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
      // 纯 4★ 池没有 5★：hard 和 softStart 都要推到不可达
      // 否则 n >= softStart 时会走 base + (n - softStart + 1) * softSlope
      '5': {
        ...base.pity['5'],
        hard: Number.MAX_SAFE_INTEGER,
        softStart: Number.MAX_SAFE_INTEGER,
      },
    },
  }
}

/** 精确计算综合概率（二维马尔可夫链，与 tools/verify-rates.py 同算法） */

