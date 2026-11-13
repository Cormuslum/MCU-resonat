/**
 * 「ESC 返回跳转前界面」栈（v1.3.04）
 *
 * 需求：各种跳转（搜索弹窗跳转、按钮跳转…）到别的界面后，按 **ESC** 应该退回原来的界面
 * （搜索弹窗跳过去的，退回来时搜索弹窗还开着）；**鼠标点退出键不算**，走的还是正常的父级返回。
 *
 * 做法：跳转前把「来源的完整 URL」压进这个模块级栈（最多 2 层，即递归 2 次），
 * 目标页的 ESC 里先问一句 `takeHop()`，有值就 `router.replace()` 回去，没值才走本来的 goBack。
 *
 * 为什么存 URL 而不是存组件状态：来源页需要恢复的东西（比如搜索弹窗开着、关键词是什么）
 * 全部编码在 query 里（`?resume=search&kw=xxx`），回来时由来源页自己的 `onMounted` 读 query 还原。
 * 这样栈里只有一个字符串，不依赖任何组件实例，刷新页面也不会串。
 *
 * 只在内存里，不落 localStorage —— 关掉页面就该忘掉。
 */

/** 最多记几层跳转（用户要求：跳转仅递归 2 次） */
const MAX_DEPTH = 2

let hops: string[] = []

/** 跳转前调用：记下来源 URL（超过 2 层就丢掉最早的一条） */
export function pushHop(fromUrl: string): void {
  if (!fromUrl) return
  hops.push(fromUrl)
  if (hops.length > MAX_DEPTH) hops.shift()
}

/** ESC 时调用：有记录就吐出最近一条（并清空），没有返回 null */
export function takeHop(): string | null {
  return hops.pop() ?? null
}

/** 直接点退出键 / 正常返回时清空，避免下次 ESC 莫名其妙往回跳 */
export function clearHops(): void {
  hops = []
}

/**
 * 给「来源 URL」挂上需要恢复的弹窗状态。
 *
 * 目前只有搜索弹窗需要恢复（跳过去看过详情，按 ESC 回来应该还停在搜索结果上）。
 * 用 `resume=search&kw=<关键词>` 表示「回来时把搜索弹窗打开，关键词还原」。
 */
export function withSearchResume(url: string, kw: string): string {
  const [path, rawQuery] = url.split('?')
  const q = new URLSearchParams(rawQuery ?? '')
  q.set('resume', 'search')
  q.set('kw', kw)
  return `${path}?${q.toString()}`
}

/** 从 URL query 里读「是不是要恢复搜索弹窗」，是则返回关键词（可能是空串） */
export function resumeKeyword(query: Record<string, unknown>): string | null {
  if (query.resume !== 'search') return null
  const kw = query.kw
  return typeof kw === 'string' ? kw : ''
}
