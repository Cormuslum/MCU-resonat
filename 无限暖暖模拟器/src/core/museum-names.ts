/**
 * 可搜索的图鉴名称（**不含正文**）。
 *
 * 为什么单独一层：图鉴主界面只是三张入口卡，却要在搜索里列出故事 / 阅读物的书名。
 * 原先 `museum-search.ts` 直接 import `museum-content` → 1.66MB 正文全被拉进
 * 图鉴主界面和服装页的 chunk。
 *
 * v2.1.00：标题也不再是编译期常量 —— 内置标题跟着 `museum-stories` /
 * `museum-readings` 的运行时加载一起补进来（`addStoryNames` / `addReadingNames`），
 * 这样发行版工坊改了故事/阅读物，搜索索引也跟着变。
 */
import { reactive } from 'vue'

function uniq(list: string[]): string[] {
  return [...new Set(list.filter((x) => (x ?? '').trim()))]
}

/** 可搜索的故事名（内置 + DLC，加载后填充） */
export const storyNames = reactive<string[]>([])

/** 可搜索的阅读物名（内置 + DLC，加载后填充） */
export const readingNames = reactive<string[]>([])

/** 把故事标题补进搜索索引（已有的跳过）。内置与 DLC 共用这一条。 */
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

/** 把阅读物标题补进搜索索引（已有的跳过）。 */
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
