/** 稳定种子 / 伪随机；两条种子流必须隔离：almanacSeed = hash('almanac-v1|' + dateKey)、hexagramSeed = hash('hexagram-v1|' + dateKey) */

/** FNV-1a 32 位 */
export function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32：同种子同序列 */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length) % arr.length]
}

/** 不重复抽 n 个 */
export function pickN<T>(rng: () => number, arr: readonly T[], n: number): T[] {
  const pool = [...arr]
  const out: T[] = []
  for (let i = 0; i < n && pool.length; i++) {
    out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  }
  return out
}
