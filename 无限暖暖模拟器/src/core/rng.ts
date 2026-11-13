/**
 * 可复现随机数（mulberry32）
 * 用固定种子即可复现整条抽卡序列，便于排查「为什么这十连是这些」
 */
export class Rng {
  private state: number

  constructor(seed = Date.now() >>> 0) {
    this.state = seed >>> 0
  }

  /** [0, 1) */
  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** [min, max) 整数 */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min))
  }

  /** 从数组里取一个 */
  pick<T>(arr: readonly T[]): T | undefined {
    if (arr.length === 0) return undefined
    return arr[this.int(0, arr.length)]
  }

  getSeed(): number {
    return this.state >>> 0
  }
}

export const rng = new Rng()
