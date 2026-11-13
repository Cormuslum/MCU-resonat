/** 抽卡引擎。重置规则：5★ → p5=0 但 p4 照常 +1；4★ → p4=0；3★ → 都累加 */
import type { Part, PityState, PullResult, RulesConfig } from '@/types'
import type { PoolParts } from './inventory'
import { Codex } from './inventory'
import { fiveStarRate, fourStarRate, luckyFiveRate, luckyFourRate } from './pity'
import { Rng } from './rng'

export interface DrawContext {
  rules: RulesConfig
  pool: PoolParts
  codex: Codex
  pity: PityState
  rng: Rng
  /** 欧皇模式 */
  lucky?: boolean
}

/** 从某星级里挑一个部件：优先未获得，全获得后转重复 */
function pickPart(pool: PoolParts, star: 3 | 4 | 5, codex: Codex, rng: Rng): Part | null {
  const list = pool[String(star) as '3' | '4' | '5']
  if (!list.length) return null
  const fresh = list.filter((p) => !codex.has(p.id))
  if (fresh.length) return rng.pick(fresh) ?? fresh[0]
  return rng.pick(list) ?? list[0]
}

/** 抽一次，原地更新 pity 与 codex */
export function drawOne(ctx: DrawContext, index = 1): PullResult {
  const { rules, pool, codex, pity, rng } = ctx
  const luck = ctx.lucky ? 3 : 1
  pity.p5++
  pity.p4++
  pity.total++

  // ---- 1. 判 5★
  let rarity: 3 | 4 | 5 | null = null
  const p5 = luck > 1 ? luckyFiveRate(pity.p5, rules, luck) : fiveStarRate(pity.p5, rules)
  if (rng.next() < p5) {
    rarity = 5
    if (!pool['5'].length) rarity = null // 纯 4★ 池没有 5★ 部件，降级
  }

  // ---- 2. 判 4★
  if (rarity === null) {
    const p4 = luck > 1 ? luckyFourRate(pity.p4, rules, luck) : fourStarRate(pity.p4, rules)
    if (rng.next() < p4) {
      rarity = 4
      if (!pool['4'].length) rarity = 3
    }
  }

  // ---- 3. 兜底 3★
  if (rarity === null) rarity = 3

  let part = pickPart(pool, rarity, codex, rng)
  // 极端情况：某星级池为空，继续降级
  if (!part && rarity > 3) {
    rarity = 3
    part = pickPart(pool, 3, codex, rng)
  }
  if (!part) {
    // 连 3★ 都没有 —— 数据有问题，抛错比静默更安全
    throw new Error(`服装阁奖池为空：${JSON.stringify({ p3: pool['3'].length, p4: pool['4'].length, p5: pool['5'].length })}`)
  }

  // ---- 重置保底
  if (rarity === 5) {
    pity.p5 = 0
    // p4 不动：5★ 不清零 4★ 计数
  } else if (rarity === 4) {
    pity.p4 = 0
  }

  const { isNew, count } = codex.add(part.id)
  return { rarity, part, isNew, count, index }
}

/** 十连里是否出了 5★（决定播 _Y 还是 _N 视频） */
export function hasGold(results: PullResult[]): boolean {
  return results.some((r) => r.rarity === 5)
}

export function newPity(): PityState {
  return { p5: 0, p4: 0, total: 0 }
}

/** 距离下一个 5★ 还有几抽（保底计数展示用） */
