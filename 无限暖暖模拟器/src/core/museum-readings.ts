/**
 * 阅读物图鉴内容（内置 + DLC）。
 *
 * 与「故事」分开成两个模块：两包正文都很大，绑在一起会让只开阅读页的人
 * 白下故事全文（反之亦然）。
 *
 * v2.1.00：内置部分改成**运行时加载** `public/assets/data/readings.json`。
 * 以前编译进 bundle，发行版里没有 vite，工坊改完阅读物刷新也看不到变化。
 *
 * 搜索用的名称索引不在这里（见 `./museum-names`）。
 */
import { reactive } from 'vue'
import type { ReadingEntry } from '@/data/readings'
import { addReadingNames } from './museum-names'
import { loadAssetJson } from './asset-data'

/** 全部阅读物（内置 + DLC） */
export const readings = reactive<ReadingEntry[]>([])

let loading: Promise<void> | null = null

/** 载入内置阅读物（幂等；重复调用共享同一次请求） */
export function ensureReadings(): Promise<void> {
  if (!loading) {
    loading = loadAssetJson<ReadingEntry>('readings.json').then((list) => {
      addReadings(list)
    })
  }
  return loading
}

/** 加入一批阅读物（id 重复的跳过） */
export function addReadings(list: ReadingEntry[]): number {
  let n = 0
  for (const r of list) {
    if (!r?.id) continue
    if (readings.some((x) => x.id === r.id)) continue
    readings.push(r)
    addReadingNames([r.title])
    n++
  }
  return n
}

export type { ReadingEntry }
