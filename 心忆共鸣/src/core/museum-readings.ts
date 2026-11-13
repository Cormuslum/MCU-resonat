/**
 * 阅读物图鉴内容（内置 + DLC）：内置部分运行时加载 `public/assets/data/readings.json`。
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
