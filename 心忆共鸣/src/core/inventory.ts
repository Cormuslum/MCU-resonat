/**
 * 部件池构建与图鉴：抽卡的最小单位是「部件」
 */import type { BannerInfo, Part, SetInfo, Star3Info } from '@/types'

/** 卡片图文件名形如 `连衣裙-柔风花吟` / `整体-初始`，取出部位与部件名 */
function parseCardName(fileName: string): { slot: string; part: string } {
  const base = fileName.replace(/\.(webp|png)$/i, '')
  const i = base.indexOf('-')
  if (i < 0) return { slot: '', part: base }
  return { slot: base.slice(0, i), part: base.slice(i + 1) }
}

/** 卡片图是否对应某个部件名 */
function cardMatches(fileName: string, partName: string): boolean {
  const p = parseCardName(fileName).part
  return p === partName || p.startsWith(partName + '·')
}

/** 把一套装的图标与卡片图对上，展开成 Part[] */
export function expandSet(set: SetInfo): Part[] {
  const { assets } = set
  // 优先用「初始」阶段，找不到就用第一个
  const initial =
    assets.stages.find((s) => s.stage === '初始') ??
    assets.stages.find((s) => s.stage.startsWith('初始')) ??
    assets.stages[0]

/** 少数图标名是英文（如 `Whispered Wishes` / `Embracing Vines`）， 对应的是「整体」卡片（`整体-初始`），这类图标按顺序领一张「整体」卡片 */
  const overallPool = (stage?: { cards: Array<{ name: string; src: string }> }) =>
    (stage?.cards ?? []).filter((c) => parseCardName(c.name).slot === '整体')

  const matchedPartNames = new Set<string>()
  for (const st of assets.stages) {
    for (const c of st.cards) matchedPartNames.add(parseCardName(c.name).part)
  }

  // 未被任何卡片名覆盖的图标 → 候选「整体」件
  const orphans = assets.icons.filter((ic) => !matchedPartNames.has(ic.name))
  const overallByIcon = new Map<string, { slot: string; part: string; src: string; name: string }>()
  {
    const pool = overallPool(initial)
    let k = 0
    for (const ic of orphans) {
      const card = pool[k++]
      if (!card) break
      const { slot, part } = parseCardName(card.name)
      overallByIcon.set(ic.name, { slot, part, src: card.src, name: card.name })
    }
  }

  const parts: Part[] = []
  // 属性表按部件名索引（3★ 散件没有属性表，全字段留空）
  const infoByName = new Map((set.parts ?? []).map((p) => [p.name, p]))

  /** 图标是英文名的部件（`Whispered Wishes` / `Embracing Vines`），按「两边各自未匹配的集合」顺序一对一配中文名 */
  const yamlNames = new Set((set.parts ?? []).map((p) => p.name))
  const iconNames = new Set(assets.icons.map((i) => i.name))
  const orphanIcons = assets.icons.filter((i) => !yamlNames.has(i.name)).map((i) => i.name)
  const orphanYaml = (set.parts ?? []).filter((p) => !iconNames.has(p.name))
  orphanIcons.forEach((n, i) => {
    const hit = orphanYaml[i]
    if (hit) infoByName.set(n, hit)
  })

  for (const icon of assets.icons) {
    const orphan = overallByIcon.get(icon.name)
    const cnName = infoByName.get(icon.name)?.name

/** 选卡顺序：按图标名找同名卡 → 英文图标**先用中文属性名找** （`饰品·颈饰-心灵对话` / `饰品·臂饰-银蔓依偎`）→ 都没有才退回「整体」图 */
    let card = initial?.cards.find((c) => cardMatches(c.name, icon.name))
    if (!card && cnName) card = initial?.cards.find((c) => cardMatches(c.name, cnName))
    if (!card && orphan) card = { name: orphan.name, src: orphan.src }
    // 少数部件在初始阶段没有对应卡片（如只有整体图），退回其它阶段里同名部件
    if (!card) {
      for (const st of assets.stages) {
        card = st.cards.find((c) => cardMatches(c.name, icon.name)) ??
          (cnName ? st.cards.find((c) => cardMatches(c.name, cnName)) : undefined)
        if (card) break
      }
    }
    if (!card) continue

    const stageCards: Record<string, string> = {}
    if (card.name.startsWith('整体')) {
      // 整体件：各阶段的「整体」卡片按序号对应
      const idx = overallPool(initial).findIndex((c) => c.src === card.src)
      for (const st of assets.stages) {
        const hit = overallPool(st)[idx]
        if (hit) stageCards[st.stage] = hit.src
      }
    } else {
      for (const st of assets.stages) {
        const hit = st.cards.find((c) => cardMatches(c.name, icon.name)) ??
          (cnName ? st.cards.find((c) => cardMatches(c.name, cnName)) : undefined)
        if (hit) stageCards[st.stage] = hit.src
      }
    }

    const info = infoByName.get(icon.name)
    parts.push({
      id: `${set.id}:${icon.name}`,
      setId: set.id,
      setName: set.name,
      name: icon.name,
      displayName: info?.name || icon.name,
      // 属性表里的「类型」比卡片图前缀更准，优先用它
      slot: info?.slot || (orphan ? orphan.slot : parseCardName(card.name).slot),
      star: set.star,
      iconKind: 'flat',
      icon: icon.src,
      card: card.src,
      stageCards,
      portrait: assets.portrait,
      uid: info?.uid ?? '',
      stats: info?.stats ?? {},
      top: info?.top ?? [],
      desc: info?.desc ?? '',
      tags: info?.tags ?? {},
    })
  }
  return parts
}

export interface PoolParts {
  '3': Part[]
  '4': Part[]
  '5': Part[]
}

/** 一座服装阁的完整奖池（按星级分组） */
export function buildPool(banner: BannerInfo, stars3: Star3Info[]): PoolParts {
  const pool: PoolParts = { '3': [], '4': [], '5': [] }

  for (const set of banner.sets) {
    const parts = expandSet(set)
    const star = (set.star === 5 ? '5' : '4') as '4' | '5'
    pool[star].push(...parts)
  }

  /** 3★ 通用散件 */
  pool['3'] = stars3.map((s) => {
    // 文件名形如 `鞋子-与时间赛跑`，但 YAML 里 名称/部位 更权威
    const parsed = parseCardName(s.name)
    const slot = s.slot || parsed.slot
    const name = parsed.part || s.name
    return {
      id: `S3:${s.name}`,
      setId: 'S3',
      setName: '通用散件',
      name,
      displayName: name,
      slot,
      star: 3 as const,
      iconKind: 'photo' as const,
      icon: s.icon ?? s.src,
      card: s.src,
      stageCards: {},
      portrait: null,
      uid: s.code || '',
      stats: s.stats ?? {},
      top: s.top ?? [],
      desc: s.desc ?? '',
      tags: { 风格: s.style ?? '', 标签: s.tags ?? [], 评论: s.comment ?? '' },
    }
  })

  return pool
}

/** 图鉴：已获得的部件集合（按部件 ID） */
export class Codex {
  private owned = new Map<string, { count: number; firstAt: number }>()

  has(id: string): boolean {
    return this.owned.has(id)
  }

  count(id: string): number {
    return this.owned.get(id)?.count ?? 0
  }

  add(id: string, at = Date.now()): { isNew: boolean; count: number } {
    const cur = this.owned.get(id)
    if (!cur) {
      this.owned.set(id, { count: 1, firstAt: at })
      return { isNew: true, count: 1 }
    }
    cur.count++
    return { isNew: false, count: cur.count }
  }

  /** 某套装已收集的部件数 */
  setProgress(parts: Part[], setId: string): { owned: number; total: number } {
    const inSet = parts.filter((p) => p.setId === setId)
    return { owned: inSet.filter((p) => this.owned.has(p.id)).length, total: inSet.length }
  }

  /** 删除满足条件的条目，返回删除数量（阅读物清理 / 重置用） */
  deleteWhere(pred: (id: string) => boolean): number {
    let n = 0
    for (const id of [...this.owned.keys()]) {
      if (pred(id)) {
        this.owned.delete(id)
        n++
      }
    }
    return n
  }

  /** 满足条件的条目数（统计服装 / 阅读物分别多少件） */
  countWhere(pred: (id: string) => boolean): number {
    let n = 0
    for (const id of this.owned.keys()) if (pred(id)) n++
    return n
  }

  toJSON(): Record<string, { count: number; firstAt: number }> {
    return Object.fromEntries(this.owned)
  }

  static fromJSON(data: Record<string, { count: number; firstAt: number }> | undefined): Codex {
    const c = new Codex()
    if (data) for (const [k, v] of Object.entries(data)) c.owned.set(k, { ...v })
    return c
  }
}
