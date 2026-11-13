/**
 * 故事图鉴内容（内置 + DLC）。
 *
 * 与「阅读物」分开成两个模块：两包正文都很大，绑在一起会让只开故事页的人
 * 白下阅读物全文（反之亦然）。
 *
 * v2.1.00：内置部分改成**运行时加载** `public/assets/data/stories.json`（见
 * `./asset-data`）。以前是编译进 bundle 的常量，发行版里没有 vite，工坊改完
 * 故事刷新页面也看不到变化。
 *
 * 搜索用的名称索引不在这里（见 `./museum-names`）。
 */
import { reactive } from 'vue'
import type { StoryEntry } from '@/data/stories'
import { addStoryNames } from './museum-names'
import { loadAssetJson } from './asset-data'

/** 全部故事（内置 + DLC） */
export const stories = reactive<StoryEntry[]>([])

let loading: Promise<void> | null = null

/** 载入内置故事（幂等；重复调用共享同一次请求） */
export function ensureStories(): Promise<void> {
  if (!loading) {
    loading = loadAssetJson<StoryEntry>('stories.json').then((list) => {
      addStories(list)
    })
  }
  return loading
}

/** 加入一批故事（id 重复的跳过） */
export function addStories(list: StoryEntry[]): number {
  let n = 0
  for (const s of list) {
    if (!s?.id) continue
    if (stories.some((x) => x.id === s.id)) continue
    stories.push(s)
    addStoryNames([s.title])
    n++
  }
  return n
}

export type { StoryEntry }
