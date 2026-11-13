/**
 * DLC 运行时（模拟器侧）。
 *
 * 工坊把「一次更新」产成一个**包**（`updater/dlc/<id>/`），装进运行区
 * （`public/dlc/<id>/`）后，这里在启动时把已挂载的包读进来、按接口
 * 合并进模拟器的数据。
 *
 * 三层结构：
 *
 *   内置库   public/assets/manifest.json  —— 官方原版内容，永远加载
 *   DLC 包   public/dlc/<id>/             —— 自带素材与数据，声明接口
 *   合并层   本文件                        —— 按接口把包叠加到内置库之上
 *
 * 「延迟」体现在：包可以在装好之后、刷新之前一直不生效（接口级开关）；
 * 「分布式」体现在：包自带全部资源，别人拿走这个目录就能用，不依赖本机的素材库。
 *
 * 路径约定：包内资源的 URL 以 `/` 开头（如 `/dlc/<id>/assets/sets/S0438/portrait.webp`），
 * 与内置库的 `/assets/...` 区分开 —— `store.asset()` 对 `/` 开头的路径原样返回。
 */
import { ref } from 'vue'
import type { BannerInfo, Manifest, SetInfo } from '@/types'
import type { ReadingEntry } from '@/data/readings'
import type { StoryEntry } from '@/data/stories'
/* ⚠ 故意**不**静态 import 故事 / 阅读物正文：两包合计 1.66MB，
   静态拉进来会让首页白下整包。只有真的装了带故事/阅读物的 DLC、且该接口被挂载时，
   才在下面 applyDlcToManifest 里按需动态取一次。 */
import {
  DLC_INTERFACES,
  DLC_INTERFACE_IDS,
  type DlcIndex,
  type DlcInterfaceId,
  type DlcManifest,
  type DlcRuntime,
} from './dlc-interfaces'

const DLC_BASE = '/dlc/'

/** 已加载的包（按索引顺序，后面的包优先级更高） */
export const dlcPackages = ref<DlcRuntime[]>([])

/** pool.set 接口的数据 */
export interface DlcSetPayload {
  /** 挂到哪座阁（banner id，如 banner-080） */
  poolId: string
  set: SetInfo
}

/** version.banner 接口的数据 */
export interface DlcVersionPayload {
  version: {
    v: string
    name: string
    major: string
    majorName?: string
    desc?: string
  }
  /** 版本缩略图 / 大图（包内绝对路径） */
  card?: string | null
  big?: string | null
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: 'no-cache' })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * 读取运行区索引与各包清单 / 数据。
 *
 * 单个包加载失败（缺文件、清单坏了）不影响其它包 —— 分布式结构的好处就在这：
 * 坏一个包，别的包照常用。
 */
export async function loadDlc(): Promise<DlcRuntime[]> {
  const out: DlcRuntime[] = []
  dlcPackages.value = out

  const idx = await fetchJson<DlcIndex>(`${DLC_BASE}index.json`)
  const list = idx?.packages ?? []
  if (!list.length) return out

  for (const p of list) {
    // 整包关掉的直接跳过（连清单都不读）
    if (p.enabled === false) continue

    const notes: string[] = []
    const mf = await fetchJson<DlcManifest>(`${DLC_BASE}${p.id}/dlc.json`)
    if (!mf) {
      out.push({
        id: p.id, name: p.name || p.id, version: p.version || '0.0.0',
        mounted: [], data: {}, notes: ['清单 dlc.json 读不到，已跳过'],
      })
      continue
    }

    const mounted: DlcInterfaceId[] = []
    const data: Partial<Record<DlcInterfaceId, unknown>> = {}

    for (const pv of mf.provides ?? []) {
      const id = pv.interface as DlcInterfaceId
      if (!DLC_INTERFACE_IDS.includes(id)) {
        notes.push(`未知接口「${pv.interface}」，已忽略`)
        continue
      }
      // 挂载决策的三层：索引里的接口级开关 > 包内的 provides[].mount > 默认挂
      const on = p.interfaces?.[id] ?? pv.mount ?? mf.mount?.enabled ?? true
      if (!on) continue

      // 数据文件默认在包的 data/ 子目录下；包作者写了带斜杠的路径就按原样取
      const file = pv.data || DLC_INTERFACES[id].data
      const rel = file.includes('/') ? file : `data/${file}`
      const j = await fetchJson(`${DLC_BASE}${p.id}/${rel}`)
      if (j === null) {
        notes.push(`接口「${id}」的数据 ${file} 读不到，已跳过`)
        continue
      }
      mounted.push(id)
      data[id] = j
    }

    out.push({
      id: p.id,
      name: mf.name || p.name || p.id,
      version: mf.version || p.version || '0.0.0',
      mounted,
      data,
      notes,
    })
  }

  dlcPackages.value = out
  return out
}

/**
 * 把已挂载的包合并进内置 manifest。
 *
 * 合并规则（故意的，不是随便定的）：
 *   - 同 id 的服装阁 / 套装**跳过**并记一条提示 —— 装了重复的包不该把图鉴弄乱；
 *   - pool.set 找不到目标池时跳过（目标池可能还没装）；
 *   - version.banner 会同时补版本条目与两张版本图。
 */
export async function applyDlcToManifest(manifest: Manifest, pkgs: DlcRuntime[]): Promise<void> {
  /* 懒加载图鉴正文：故事与阅读物**分开取**，装包只带故事时不会把阅读物也拉下来 */
  let storyMod: typeof import('./museum-stories') | null = null
  let readingMod: typeof import('./museum-readings') | null = null
  const needStories = async () => (storyMod ??= await import('./museum-stories'))
  const needReadings = async () => (readingMod ??= await import('./museum-readings'))
  /**
   * v2.0.05：一个接口的数据文件统一是**数组**（工坊一次可多选打包）。
   * 老包里这三个接口写的是单对象，这里一并兼容 —— 装老包不该报错。
   */
  const asArray = <T>(d: unknown): T[] => (Array.isArray(d) ? (d as T[]) : d ? [d as T] : [])
  for (const pkg of pkgs) {
    for (const id of pkg.mounted) {
      const d = pkg.data[id]
      if (d === undefined) continue

      if (id === 'pool.banner') {
        for (const b of asArray<BannerInfo>(d)) {
          if (!b?.id) { pkg.notes.push('pool.banner 缺 id，已跳过'); continue }
          if (manifest.banners.some((x) => x.id === b.id)) {
            pkg.notes.push(`服装阁 ${b.name}（${b.id}）已存在，跳过`)
            continue
          }
          manifest.banners.push(b)
        }
        continue
      }

      if (id === 'pool.set') {
        for (const s of asArray<DlcSetPayload>(d)) {
          if (!s?.set?.id || !s.poolId) { pkg.notes.push('pool.set 数据不完整，已跳过'); continue }
          const target = manifest.banners.find((b) => b.id === s.poolId)
          if (!target) {
            pkg.notes.push(`目标服装阁 ${s.poolId} 不存在，套装 ${s.set.name} 未能挂载`)
            continue
          }
          if (target.sets.some((x) => x.id === s.set.id)) {
            pkg.notes.push(`套装 ${s.set.name}（${s.set.id}）已存在，跳过`)
            continue
          }
          target.sets.push(s.set)
        }
        continue
      }

      if (id === 'codex.story') {
        const list = Array.isArray(d) ? (d as StoryEntry[]) : []
        const { addStories } = await needStories()
        const n = addStories(list)
        if (n < list.length) pkg.notes.push(`故事：${list.length - n} 篇与已有内容重复，已跳过`)
        continue
      }

      if (id === 'codex.reading') {
        const list = Array.isArray(d) ? (d as ReadingEntry[]) : []
        const { addReadings } = await needReadings()
        const n = addReadings(list)
        if (n < list.length) pkg.notes.push(`阅读物：${list.length - n} 篇与已有内容重复，已跳过`)
        continue
      }

      if (id === 'version.banner') {
        for (const v of asArray<DlcVersionPayload>(d)) {
          const meta = v?.version
          if (!meta?.v) { pkg.notes.push('version.banner 数据不完整，已跳过'); continue }
          const ver = manifest.ui?.ver
          if (!ver) { pkg.notes.push('manifest 没有 ui.ver，版本未能挂载'); continue }
          if (!ver.versions) ver.versions = []
          if (!ver.versions.some((x) => x.v === meta.v)) {
            ver.versions.push({
              v: meta.v, name: meta.name, major: meta.major,
              majorName: meta.majorName ?? '', desc: meta.desc ?? '',
            })
          }
          if (v.card) ver.cards[meta.v] = v.card
          if (v.big) ver.bigCards[meta.v] = v.big
        }
        continue
      }
    }
  }
}
