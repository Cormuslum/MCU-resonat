import type { useGameStore } from '@/stores/game'
import type { SearchItem } from '@/components/SearchPopup.vue'
import { storyNames, readingNames } from './museum-names'

type Store = ReturnType<typeof useGameStore>

interface SuitLike {
  id: string
  name: string
  star: number
  styles: string[]
  parts?: { name: string }[]
}

/** 各子界面在搜索结果里的页面后缀（同名内容用「｜」分隔，如「小王子｜故事页」） */
export const PAGE_LABEL = {
  clothes: '服装页',
  story: '故事页',
  reading: '阅读页',
} as const

/** 把含中文/符号的星级查询归一化成数字：五星/5星/5★/★5/5 等 → 5（无数字则返回 null） */
function starOf(q: string): number | null {
  const cn: Record<string, number> = { 五: 5, 四: 4, 三: 3, 二: 2, 一: 1 }
  let s = q
  for (const k of Object.keys(cn)) s = s.split(k).join(String(cn[k]))
  const m = s.match(/\d/)
  return m ? Number(m[0]) : null
}

/** 跨池去重收集全部套装（与 MuseumClothes.SUITS 同源） */
function collectSuits(store: Store): SuitLike[] {
  const seen = new Set<string>()
  const out: SuitLike[] = []
  for (const b of store.manifest?.banners ?? []) {
    for (const s of (b.sets ?? []) as unknown as SuitLike[]) {
      if (!s.id || seen.has(s.id)) continue
      seen.add(s.id)
      out.push({ id: s.id, name: s.name, star: Number(s.star ?? 4), styles: s.styles ?? [], parts: s.parts })
    }
  }
  return out
}

/** 至少集齐该套装一件部件才可被搜到（与服装子界面「未获得不可查看」一致） */
function suitUnlocked(store: Store, s: SuitLike): boolean {
  const parts = s.parts ?? []
  if (!parts.length) return true
  return parts.some((p) => store.codex.has(`${s.id}:${p.name}`))
}

/** 主界面统一搜索：服装（套装名 / 属性标签 / 星级 / 部件名）+ 故事 / 阅读名称（来自 `museum-names`） */
export function searchMuseum(q: string, store: Store): SearchItem[] {
  const query = q.trim()
  if (!query) return []
  const qs = starOf(query)
  const out: SearchItem[] = []

  for (const s of collectSuits(store)) {
    if (!suitUnlocked(store, s)) continue
    const partNames = (s.parts ?? []).map((p) => p.name)
    const hit =
      s.name.includes(query) ||
      s.styles.some((t) => t.includes(query)) ||
      partNames.some((n) => n.includes(query)) ||
      (qs != null && s.star === qs)
    if (hit) out.push({ id: `clothes:${s.id}`, title: `${s.name}｜${PAGE_LABEL.clothes}`, star: s.star })
  }

  for (const n of storyNames) {
    if (n.includes(query)) out.push({ id: `story:${n}`, title: `${n}｜${PAGE_LABEL.story}` })
  }
  for (const n of readingNames) {
    if (n.includes(query)) out.push({ id: `reading:${n}`, title: `${n}｜${PAGE_LABEL.reading}` })
  }

  return out.slice(0, 6)
}
