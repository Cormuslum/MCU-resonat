/**
 * 运行时加载 `public/assets/data/*.json`（v2.1.00）。
 *
 * 为什么不再编译进 JS：故事/阅读物正文合计 1.7MB，以前由 `gen-stories.py` /
 * `gen-readings.py` 生成 `src/data/*.ts` 再被打进 bundle —— **发行版里没有 vite**，
 * 工坊改完这两样永远不生效，只能回项目重新 build。改成运行时 JSON 后，
 * 写盘 → 刷新浏览器就看到了，顺带把首屏 chunk 削掉 1.7MB。
 *
 * 同一个文件只请求一次（模块级缓存），并发调用共享同一个 Promise。
 */
const cache = new Map<string, Promise<unknown>>()

export function loadAssetJson<T>(name: string): Promise<T[]> {
  const hit = cache.get(name)
  if (hit) return hit as Promise<T[]>
  const p = (async (): Promise<T[]> => {
    try {
      // no-cache：工坊刚写完就刷新时要拿到新内容，别吃 304/强缓存
      const res = await fetch(`/assets/data/${name}`, { cache: 'no-cache' })
      if (!res.ok) return []
      const d = (await res.json()) as unknown
      return Array.isArray(d) ? (d as T[]) : []
    } catch {
      // 加载失败不该让图鉴页崩：留空，界面按「暂无内容」渲染
      return []
    }
  })()
  cache.set(name, p)
  return p
}

/** 测试/热更新用：清掉缓存，下次会重新请求 */
export function clearAssetJsonCache(): void {
  cache.clear()
}
