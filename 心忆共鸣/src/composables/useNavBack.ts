/** 「ESC 返回跳转前界面」栈：跳转前把来源完整 URL 压栈（最多 2 层），目标页 ESC 先问 `takeHop()`； 需要恢复的状态全部编码在 query 里，只在内存里，不落 localStorage */

/** 最多记几层跳转 */
const MAX_DEPTH = 2

let hops: string[] = []

export function pushHop(fromUrl: string): void {
  if (!fromUrl) return
  hops.push(fromUrl)
  if (hops.length > MAX_DEPTH) hops.shift()
}

/** ESC 时调用：有记录就吐出最近一条（并清空），没有返回 null */
export function takeHop(): string | null {
  return hops.pop() ?? null
}

/** 直接点退出键 / 正常返回时清空 */
export function clearHops(): void {
  hops = []
}

/** 给「来源 URL」挂上需要恢复的弹窗状态。用 `resume=search&kw=<关键词>` 表示「回来时把搜索弹窗打开，关键词还原」 */
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

/** 图鉴视图：版本 / 套装名 / 部件下标（-1 = 套装整体） */
export interface ViewState {
  version: string
  suit: string
  part: number
}

/** 给「来源 URL」挂上需要恢复的图鉴视图。用 `ver/suit/part` 表示「回来时还原版本、套装、部件」 */
export function withViewResume(url: string, view: ViewState): string {
  const [path, rawQuery] = url.split('?')
  const q = new URLSearchParams(rawQuery ?? '')
  q.set('ver', view.version)
  q.set('suit', view.suit)
  q.set('part', String(view.part))
  return `${path}?${q.toString()}`
}

/** 从 URL query 里读「要恢复的图鉴视图」；没有则返回 null */
export function viewResumeOf(query: Record<string, unknown>): ViewState | null {
  const ver = query.ver
  if (typeof ver !== 'string' || !ver) return null
  return {
    version: ver,
    suit: typeof query.suit === 'string' ? query.suit : '',
    part: Number(query.part),
  }
}
