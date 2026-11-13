import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'
import type { BannerInfo, Manifest, Part, PityState, PullResult } from '@/types'
import { buildPool, Codex, type PoolParts } from '@/core/inventory'
import { drawOne, newPity } from '@/core/engine'
import { pure4Rules } from '@/core/pity'
import { Rng } from '@/core/rng'
import {
  loadSave, resetSave, writeSave, toSaveFileText, parseSaveFileText, type SaveData,
} from '@/core/save'
import { milestoneViews, nextClaimable, tierViews } from '@/core/milestone'
import { loadDlc, applyDlcToManifest, dlcPackages } from '@/core/dlc'

const ASSET_BASE = '/assets/'

export const useGameStore = defineStore('game', () => {
  // ---------------- 基础状态
  const manifest = ref<Manifest | null>(null)
  const loading = ref(true)
  const loadError = ref<string | null>(null)

  const save = ref<SaveData>(loadSave())
  const codex = shallowRef<Codex>(Codex.fromJSON(save.value.codex))
  /**
   * 图鉴版本号。
   * ⚠ codex 是 shallowRef，往里面的 Map 加东西**不会**让 computed 失效，
   * 所以每次抽完都 +1，所有读图鉴的 computed / 函数都先读它一下。
   */
  const codexRev = ref(0)
  const rng = new Rng()

  /**
   * 当前选中的服装阁。
   *
   * v2.7.02 起服装阁 id = 官方编号（`banner-076` = 执律的流金），不再用「版本内序号」。
   */
  const bannerId = ref<string>('banner-076')

  /** 常驻池 id：每个版本的列表末尾都挂它（「常驻永远是当前版本的最后一座服装阁」） */
  const STANDARD_BANNER_ID = 'banner-001'

  /**
   * 当前版本（v1.4.02）：`''` = 还没在「时隙遗光」选过。
   *
   * 共鸣页只列这个版本的服装阁；空串时共鸣入口置灰、直达 `/banner` 会被路由守卫打回版本页。
   * 存在存档里（`save.selectedVersion`），刷新 / 重启后不回退。
   */
  const selectedVersion = ref<string>(save.value.selectedVersion ?? '')

  /** 最近一次抽卡结果 */
  const lastResults = ref<PullResult[]>([])
  /** 十连结果页 → 回共鸣页时弹「恭喜获得」（弹窗自己负责置回 false） */
  const rewardOpen = ref(false)

  // ---------------- 派生
  /**
   * 当前版本自己的服装阁，按 `seq`（版本内序号）升序。
   *
   * `seq` 由 `tools/build-pool-map.py` 算好后写进 manifest：
   *   含 5★ 的阁在前 → 同星级按 gachaKey 数值升序 → 常驻阁永远最后。
   * 所以这里只按 seq 排，不再看编号 —— 编号会随官方补录/自建而跳跃
   * （999 / 1000 / 1206 / 2233 并存），拿它当顺序会把纯 4★ 池排到混池前面。
   * 缺 seq 的（旧 manifest / DLC 自带）排到最后，保证不抛错。
   */
  const versionPools = computed<BannerInfo[]>(() => {
    const all = manifest.value?.banners ?? []
    if (!selectedVersion.value) return []
    return all
      .filter((b) => b.version === selectedVersion.value)
      .slice()
      .sort((a, b) => (a.seq ?? 1e6) - (b.seq ?? 1e6))
  })

  /**
   * 共鸣页可见的服装阁 = 当前版本的池 + **常驻池（永远排最后一个）**。
   *
   * 用户要求「所有版本的服装阁都显示常驻服装阁，放置在当前版本服装阁的下方」。
   * 1.0 自己就含常驻池，此时不追加（否则同一个池出现两次、保底也会看着像两份）。
   */
  const visiblePools = computed<BannerInfo[]>(() => {
    const own = versionPools.value
    const std = (manifest.value?.banners ?? []).find((b) => b.id === STANDARD_BANNER_ID)
    if (!std || own.some((b) => b.id === std.id)) return own
    return [...own, std]
  })

  /**
   * 当前服装阁：优先在「可见池」里找 `bannerId`，找不到就退回第一个。
   *
   * 以前是「全局找，找不到退回 banners[0]」—— 版本收窄之后那样会让 bannerId 指到
   * 别的版本的池（比如 1.0 的常驻），背景/艺术字/保底全串味，所以先按版本夹一次。
   * 未选版本时退回全局（只有兜底意义：此时 /banner 已被守卫拦住）。
   */
  const banner = computed<BannerInfo | null>(() => {
    const all = manifest.value?.banners ?? []
    if (!all.length) return null
    const scoped = visiblePools.value
    const inScope = scoped.find((b) => b.id === bannerId.value)
    if (inScope) return inScope
    return scoped[0] ?? all.find((b) => b.id === bannerId.value) ?? all[0]
  })

  const pool = computed<PoolParts | null>(() => {
    if (!manifest.value || !banner.value) return null
    return buildPool(banner.value, manifest.value.stars3)
  })

  const pity = computed<PityState>(() => {
    const id = bannerId.value
    if (!save.value.pity[id]) save.value.pity[id] = newPity()
    return save.value.pity[id]
  })

  /** 当前池是否为「纯 4★ 池」（奖池里没有任何 5★ 套装） */
  const isPure4 = computed(() => !!pool.value && pool.value['5'].length === 0)

  /**
   * 当前池实际生效的概率规则。
   * ⚠ 纯 4★ 池的规则与主池不同（4★ 10.21% / 第 4 抽提升 / 5 抽保底 / 综合 24.96%），
   *   所以不能直接把 manifest.rules 拿去用 —— 必须过一层 `pure4Rules()`。
   */
  const rules = computed(() => {
    const base = manifest.value?.rules
    if (!base) return null
    return isPure4.value ? pure4Rules(base) : base
  })

  /** 深海回响：按档位分组后的节点 */
  const tiers = computed(() => {
    if (!banner.value) return []
    return tierViews(
      banner.value,
      pity.value.total,
      save.value.milestoneClaimed[banner.value.id] ?? [],
    )
  })

  /** 平铺的每一件奖励（兼容旧用法） */
  const milestones = computed(() => {
    if (!banner.value) return []
    return milestoneViews(
      banner.value,
      pity.value.total,
      save.value.milestoneClaimed[banner.value.id] ?? [],
    )
  })

  const claimable = computed(() => {
    if (!banner.value) return null
    return nextClaimable(banner.value, pity.value.total, save.value.milestoneClaimed[banner.value.id] ?? [])
  })

  /** 当前池的全部部件（图鉴用） */
  const allParts = computed<Part[]>(() => {
    if (!pool.value) return []
    return [...pool.value['5'], ...pool.value['4'], ...pool.value['3']]
  })

  /* ---------------- 全库套装完成度（图鉴用） ----------------
   * ⚠ `allParts` 只含**当前服装阁**的部件，图鉴（服装/故事）要判"这套有没有集齐"，
   *   必须跨全部 79 池算，否则永远只能看到当前池的 1~2 套。
   * 这里按 manifest 全量 buildPool 一次（约 1033 件），结果随 codexRev 失效重算。
   */
  const allSetsParts = computed<Part[]>(() => {
    const m = manifest.value
    if (!m) return []
    const out: Part[] = []
    for (const b of m.banners) {
      const p = buildPool(b, m.stars3)
      out.push(...p['5'], ...p['4'])
    }
    return out
  })

  /** setId → { total, owned }（只统计 4★/5★ 套装部件，3★ 散件不算套装） */
  const setProgressAll = computed<Map<string, { total: number; owned: number }>>(() => {
    void codexRev.value
    const total = new Map<string, number>()
    const owned = new Map<string, number>()
    for (const p of allSetsParts.value) {
      total.set(p.setId, (total.get(p.setId) ?? 0) + 1)
      if (codex.value.has(p.id)) owned.set(p.setId, (owned.get(p.setId) ?? 0) + 1)
    }
    const res = new Map<string, { total: number; owned: number }>()
    for (const [sid, t] of total) res.set(sid, { total: t, owned: owned.get(sid) ?? 0 })
    return res
  })

  /** 这套是否已集齐（全部部件都抽到过） */
  function setDone(setId: string): boolean {
    const s = setProgressAll.value.get(setId)
    return !!s && s.total > 0 && s.owned === s.total
  }

  /** 这套是否抽到过任意一件（图鉴里"可查看"的门槛） */
  function setTouched(setId: string): boolean {
    const s = setProgressAll.value.get(setId)
    return !!s && s.owned > 0
  }

  /**
   * 资源路径拼接。
   *
   * 内置资源是「相对 /assets/ 的路径」（`sets/S0438/portrait.webp`）；
   * DLC 包里的资源自带 `/dlc/<id>/...` 的绝对路径 —— 那类原样返回。
   */
  function asset(p: string | null | undefined): string {
    if (!p) return ''
    if (p.startsWith('/')) return p
    return ASSET_BASE + p
  }

  // ---------------- 动作
  // v2.0.02：`migrateBannerIds()` 已删除 —— 用户确认目前没有老存档，
  // 不需要把 `banner-2.10-02` 这类旧 id 迁到官方编号；
  // manifest 也不再产出 `legacyId` / `prevId`。

  async function init() {
    loading.value = true
    loadError.value = null
    try {
      const res = await fetch(`${ASSET_BASE}manifest.json`)
      if (!res.ok) throw new Error(`manifest.json 加载失败：HTTP ${res.status}`)
      manifest.value = (await res.json()) as Manifest
      // DLC：读运行区里已装的包，按接口合并进 manifest（挂载失败只记提示，不阻断）
      const pkgs = await loadDlc()
      await applyDlcToManifest(manifest.value, pkgs)
      for (const p of pkgs) {
        for (const n of p.notes) console.warn(`[DLC ${p.id}] ${n}`)
      }
      // 版本号在 manifest 里不存在（老存档 / 手工改坏）→ 按「还没选过」处理
      if (selectedVersion.value && !manifest.value.banners.some((b) => b.version === selectedVersion.value)) {
        selectedVersion.value = ''
        save.value.selectedVersion = ''
      }
      // 当前池必须落在「当前版本的池 + 常驻池」里，否则退回该版本第一池
      if (selectedVersion.value) {
        const inVer = manifest.value.banners.filter((b) => b.version === selectedVersion.value)
        const ok = inVer.some((b) => b.id === bannerId.value) || bannerId.value === STANDARD_BANNER_ID
        if (!ok) bannerId.value = inVer[0]?.id ?? bannerId.value
      } else if (!manifest.value.banners.some((b) => b.id === bannerId.value)) {
        // 未选版本时 bannerId 只作兜底，仍需指向一个真实存在的池
        bannerId.value = manifest.value.banners[0]?.id ?? ''
      }
    } catch (e) {
      loadError.value = e instanceof Error ? e.message : String(e)
    } finally {
      loading.value = false
    }
  }

  function selectBanner(id: string) {
    bannerId.value = id
  }

  /**
   * 选定当前版本（「时隙遗光」里点某个小版本时调用）。
   *
   * 幂等：只有当前池不属于新版本时才挪到该版本第一池 ——
   * 否则在同一版本里反复点版本行，会把用户切到的第 3 个池打回第 1 个。
   */
  function selectVersion(v: string) {
    if (!v) return
    const inVer = (manifest.value?.banners ?? []).filter((b) => b.version === v)
    selectedVersion.value = v
    save.value.selectedVersion = v
    if (!inVer.some((b) => b.id === bannerId.value)) bannerId.value = inVer[0]?.id ?? bannerId.value
    persist()
  }

  /** 抽一次 / 十连。返回结果数组 */
  function pull(times: 1 | 10): PullResult[] {
    if (!rules.value || !pool.value) return []
    const ctx = {
      rules: rules.value,
      pool: pool.value,
      codex: codex.value,
      pity: pity.value,
      rng,
      lucky: save.value.settings.lucky,
    }
    const results: PullResult[] = []
    for (let i = 1; i <= times; i++) results.push(drawOne(ctx, i))

    lastResults.value = results

    // 写存档
    save.value.codex = codex.value.toJSON()
    codexRev.value++
    for (const r of results) {
      save.value.history.push({
        banner: bannerId.value,
        rarity: r.rarity,
        part: r.part.id,
        // 快照：共鸣详情的抽取记录要跨服装阁展示，不能靠 part id 回查当前池
        name: r.part.displayName || r.part.name,
        star: r.part.star,
        at: Date.now(),
      })
    }
    persist()
    return results
  }

  function persist() {
    writeSave(save.value)
  }

  function claimMilestone(pulls: number) {
    if (!banner.value) return
    const list = save.value.milestoneClaimed[banner.value.id] ?? []
    if (!list.includes(pulls)) {
      list.push(pulls)
      save.value.milestoneClaimed[banner.value.id] = list
      persist()
    }
  }

  /** 「辉煌心光」通用写设置：改一项就落盘 */
  function setSetting<K extends keyof SaveData['settings']>(key: K, value: SaveData['settings'][K]) {
    save.value.settings[key] = value
    persist()
  }

  /* ---------------- 存档清理（存档弹窗 5 项） ----------------
   * ⚠ v1.2.02 修正：以前只清 pity / 里程碑 / 历史，**图鉴里的部件没删**，
   *   所以清完回共鸣页仍然显示「套装全部获得」。现在连该池（该版本 / 全部池）
   *   的 4★/5★ 部件一起从 codex 里删掉；故事解锁是「套装集齐」派生的，
   *   部件一少，对应故事自然回到上锁状态。
   */

  /** 若干服装阁所拥有的 4★/5★ 部件 id（3★ 散件是全局共用的，不属于任何池，不动） */
  function partIdsOfBanners(ids: string[]): string[] {
    const m = manifest.value
    if (!m) return []
    const want = new Set(ids)
    const out: string[] = []
    for (const b of m.banners) {
      if (!want.has(b.id)) continue
      const p = buildPool(b, m.stars3)
      out.push(...p['5'].map((x) => x.id), ...p['4'].map((x) => x.id))
    }
    return out
  }

  /** 从 codex 删掉一批部件（返回实际删除数），并同步存档 / 触发图鉴重算 */
  function dropParts(ids: string[]): number {
    if (!ids.length) return 0
    const set = new Set(ids)
    const n = codex.value.deleteWhere((id) => set.has(id))
    if (n) {
      save.value.codex = codex.value.toJSON()
      codexRev.value++
      persist()
    }
    return n
  }

  /** 当前池：保底进度 + 里程碑 + 抽卡历史 + **该池已获得的套装部件** */
  function clearBannerMemory(id = bannerId.value): number {
    delete save.value.pity[id]
    delete save.value.milestoneClaimed[id]
    save.value.history = save.value.history.filter((h) => h.banner !== id)
    persist()
    return dropParts(partIdsOfBanners([id]))
  }

  /** 当前池所属版本：该版本下所有池的保底 / 里程碑 / 历史 / 部件 */
  function clearVersionMemory(): number {
    const ver = banner.value?.version
    if (!ver || !manifest.value) return clearBannerMemory()
    const ids = manifest.value.banners.filter((b) => b.version === ver).map((b) => b.id)
    const set = new Set(ids)
    for (const id of ids) {
      delete save.value.pity[id]
      delete save.value.milestoneClaimed[id]
    }
    save.value.history = save.value.history.filter((h) => !set.has(h.banner))
    persist()
    return dropParts(partIdsOfBanners(ids))
  }

  /** 所有服装阁：保底 / 里程碑 / 历史 / 全部套装部件 */
  function clearAllBannerMemory(): number {
    const ids = (manifest.value?.banners ?? []).map((b) => b.id)
    save.value.pity = {}
    save.value.milestoneClaimed = {}
    save.value.history = []
    persist()
    return dropParts(partIdsOfBanners(ids))
  }

  /** 阅读物记忆：清掉 codex 里所有 reading:* 条目 */
  function clearReadingMemory(): number {
    const n = codex.value.deleteWhere((id) => id.startsWith('reading:'))
    if (n) {
      save.value.codex = codex.value.toJSON()
      codexRev.value++
      persist()
    }
    return n
  }

  /** 模拟器记忆：本机所有 nikki-* 键（存档 / PV / 生辰）一起清，回到初始状态 */
  /**
   * 导出存档：返回可下载的 JSON 文本。
   *
   * 单机游戏最怕「清一次浏览器数据，几百抽全没了」——给一个能自己存起来的出口。
   */
  function exportSave(): string {
    return toSaveFileText(save.value)
  }

  /**
   * 导入存档：校验通过后**直接写盘**，由调用方刷新页面重载。
   *
   * 为什么不在内存里热替换：`codex` 是 shallowRef、`selectedVersion` / `bannerId`
   * 又各自是独立 ref，逐个补容易漏一处就出现「图鉴对了但保底还是旧的」。
   * 重载一次最稳，和「全部重置」走同一套路。
   */
  function importSave(text: string): { ok: true } | { ok: false; error: string } {
    const r = parseSaveFileText(text)
    if (!r.ok) return r
    writeSave(r.data)
    return { ok: true }
  }

  function hardReset(): void {
    resetSave()
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith('nikki-'))
        .forEach((k) => localStorage.removeItem(k))
      // 「本次已播开屏」标记也在 sessionStorage 里，一并清掉，重置后重走一遍开机
      Object.keys(sessionStorage)
        .filter((k) => k.startsWith('nikki-'))
        .forEach((k) => sessionStorage.removeItem(k))
    } catch {
      /* 无痕模式等场景忽略 */
    }
  }

  /* ---------------- 快捷：一键集齐 ---------------- */

  /** 集齐全部套装（4★/5★ 部件，覆盖 manifest 里所有服装阁） */
  function collectAllSets(): number {
    const m = manifest.value
    if (!m) return 0
    let added = 0
    for (const b of m.banners) {
      const p = buildPool(b, m.stars3)
      for (const star of ['5', '4'] as const) {
        for (const part of p[star]) {
          if (!codex.value.has(part.id)) {
            codex.value.add(part.id)
            added++
          }
        }
      }
    }
    if (added) {
      save.value.codex = codex.value.toJSON()
      codexRev.value++
      persist()
    }
    return added
  }

  /**
   * 集齐全部阅读物（两个区域一起，替代阅读物页原来的「收集全部」）。
   *
   * ⚠ 这里**动态 import** 阅读物包（933KB）：静态引入会让首页白下整包
   * （主 chunk 曾因此到 1.76MB）。这个按钮点一次才跑，按需加载完全可接受；
   * 阅读物页也会用到，浏览器会复用同一个 chunk。
   */
  async function collectAllReadings(): Promise<number> {
    const before = codex.value.countWhere((id) => id.startsWith('reading:'))
    // 正文是运行时 JSON（v2.1.00）：先等它到，否则列表是空的，一键收集会收 0 条
    const mod = await import('@/core/museum-readings')
    await mod.ensureReadings()
    obtainAllReadings(mod.readings.map((r) => r.id))
    return codex.value.countWhere((id) => id.startsWith('reading:')) - before
  }

  /* ---------------- 存档统计（存档弹窗顶部） ---------------- */

  /** 所有服装阁累计抽数 */
  const totalPullsAll = computed(() =>
    Object.values(save.value.pity).reduce((n, p) => n + (p?.total ?? 0), 0),
  )
  /** 已获得的服装部件数（不含阅读物） */
  const ownedPartCount = computed(() => {
    void codexRev.value
    return codex.value.countWhere((id) => !id.startsWith('reading:'))
  })
  /** 已解锁阅读物数 */
  const ownedReadingCount = computed(() => {
    void codexRev.value
    return codex.value.countWhere((id) => id.startsWith('reading:'))
  })

  // ---------------- 图鉴统计
  const codexStats = computed(() => {
    void codexRev.value
    const total = allParts.value.length
    const owned = allParts.value.filter((p) => codex.value.has(p.id)).length
    const byStar: Record<number, { owned: number; total: number }> = {}
    for (const star of [5, 4, 3]) {
      const list = allParts.value.filter((p) => p.star === star)
      byStar[star] = { owned: list.filter((p) => codex.value.has(p.id)).length, total: list.length }
    }
    return { total, owned, byStar }
  })

  /** 某套装进度 */
  function setProgress(setId: string) {
    void codexRev.value
    return codex.value.setProgress(allParts.value, setId)
  }

  /**
   * 是否「集齐第二套」——每个部件都至少抽到 2 次。
   * 对应 进化条件.md 里 5★「满进」/ 4★「进化」的解锁条件。
   */
  function setDupFull(setId: string): boolean {
    void codexRev.value
    const parts = allParts.value.filter((p) => p.setId === setId)
    return parts.length > 0 && parts.every((p) => codex.value.count(p.id) >= 2)
  }

  /** 阅读物图鉴：获得（解锁）一本阅读物；返回是否首次获得。复用 codex（key=reading:${id}）+ codexRev 触发响应式。 */
  function obtainReading(id: string): boolean {
    const key = `reading:${id}`
    const { isNew } = codex.value.add(key)
    if (isNew) {
      save.value.codex = codex.value.toJSON()
      codexRev.value++
      persist()
    }
    return isNew
  }

  /** 一键解锁一批阅读物（如「收集全部」），只触发一次存档写入 */
  function obtainAllReadings(ids: string[]): void {
    let changed = false
    for (const id of ids) {
      if (!codex.value.has(`reading:${id}`)) {
        codex.value.add(`reading:${id}`)
        changed = true
      }
    }
    if (changed) {
      save.value.codex = codex.value.toJSON()
      codexRev.value++
      persist()
    }
  }

  return {
    // 状态
    manifest,
    loading,
    loadError,
    dlcPackages,
    save,
    codex,
    bannerId,
    banner,
    selectedVersion,
    visiblePools,
    pool,
    pity,
    rules,
    milestones,
    tiers,
    claimable,
    allParts,
    lastResults,
    rewardOpen,
    codexStats,
    codexRev,
    // 动作
    init,
    selectBanner,
    selectVersion,
    pull,
    asset,
    claimMilestone,
    setSetting,
    clearBannerMemory,
    clearVersionMemory,
    clearAllBannerMemory,
    clearReadingMemory,
    hardReset,
    exportSave,
    importSave,
    collectAllSets,
    collectAllReadings,
    totalPullsAll,
    ownedPartCount,
    ownedReadingCount,
    isPure4,
    setProgressAll,
    setDone,
    setTouched,
    setProgress,
    setDupFull,
    obtainReading,
  }
})
