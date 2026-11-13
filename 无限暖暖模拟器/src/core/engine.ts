/**
 * 抽卡引擎
 *
 * 判定顺序（不可调换）：
 *   1. 先判 5★（含软保底、硬保底）
 *   2. 5★ 未命中，再判 4★（第 10 抽必出）
 *   3. 都不是 → 3★
 *
 * 重置规则（v1.9.11 起，依据实机 fourStarType2Distribution）：
 *   5★ → p5=0，**p4 照常 +1、不清零**（只是把这一抽让给 5★，4★ 顺延一抽）
 *   4★ → p4=0（p5 继续累加）
 *   3★ → 都累加
 *
 * 为什么 5★ 不清零 p4：实机 4★ 间隔分布里 1~9 抽恒 3.4%、10 抽 94.5%、11~13 抽还有 4% 尾巴。
 * 若 5★ 也清零，间隔就会全部落在 10 抽以内、且 11 抽之后归零 —— 与实测矛盾。
 */
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
  /** 欧皇模式：5★ / 4★ 概率 ×3（用户在「快捷」里手动开启） */
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
    // p4 不动：5★ 不清零 4★ 计数（实机表现为「4★ 顺延一抽」，见文件头）
  } else if (rarity === 4) {
    pity.p4 = 0
  }

  const { isNew, count } = codex.add(part.id)
  return { rarity, part, isNew, count, index }
}

/** 十连：连抽 10 次，index 从 1 到 10 */
/** 十连里是否出了 5★（决定播 _Y 还是 _N 视频） */
export function hasGold(results: PullResult[]): boolean {
  return results.some((r) => r.rarity === 5)
}

export function newPity(): PityState {
  return { p5: 0, p4: 0, total: 0 }
}

/** 距离下一个 5★ 还有几抽（保底计数展示用） */
