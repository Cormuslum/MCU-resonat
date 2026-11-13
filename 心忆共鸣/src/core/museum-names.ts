/** 可搜索的图鉴名称（**不含正文**）。内置标题随 `museum-stories` / `museum-readings` 的运行时加载一起补进来 */
import { reactive } from 'vue'

function uniq(list: string[]): string[] {
  return [...new Set(list.filter((x) => (x ?? '').trim()))]
}

/** 可搜索的故事名（内置 + DLC，加载后填充） */
export const storyNames = reactive<string[]>([])

/** 可搜索的阅读物名（内置 + DLC，加载后填充） */
export const readingNames = reactive<string[]>([])

/** 把故事标题补进搜索索引（已有的跳过） */
export function addStoryNames(list: string[]): number {
  let n = 0
  for (const t of list) {
    const name = (t ?? '').trim()
    if (!name || storyNames.includes(name)) continue
    storyNames.push(name)
    n++
  }
  return n
}

/** 把阅读物标题补进搜索索引（已有的跳过） */
export function addReadingNames(list: string[]): number {
  let n = 0
  for (const t of list) {
    const name = (t ?? '').trim()
    if (!name || readingNames.includes(name)) continue
    readingNames.push(name)
    n++
  }
  return n
}

export { uniq }
