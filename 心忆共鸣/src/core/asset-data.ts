/** 运行时加载 `public/assets/data/*.json` */
const cache = new Map<string, Promise<unknown>>()

export function loadAssetJson<T>(name: string): Promise<T[]> {
  const hit = cache.get(name)
  if (hit) return hit as Promise<T[]>
  const p = (async (): Promise<T[]> => {
    try {
      // 绕过 304 / 强缓存
      const res = await fetch(`/assets/data/${name}`, { cache: 'no-cache' })
      if (!res.ok) return []
      const d = (await res.json()) as unknown
      return Array.isArray(d) ? (d as T[]) : []
    } catch {
      // 留空，界面按「暂无内容」渲染
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
