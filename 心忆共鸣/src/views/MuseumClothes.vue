<script setup lang="ts">
/** 博物图鉴 · 服装图鉴子界面 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { toDesignX } from '@/core/stage'
import { play } from '@/composables/useAudio'
import SearchPopup from '@/components/SearchPopup.vue'
import { clearHops, pushHop, takeHop, resumeKeyword } from '@/composables/useNavBack'
import type { SearchItem } from '@/components/SearchPopup.vue'
import { parentOf } from '@/router'

const store = useGameStore()
const router = useRouter()
const route = useRoute()
const ui = computed(() => store.manifest?.ui)

/** 大版本图标：优先 `ui.ver.majorIcons[大版本号]`，否则取内置 `ui.ver.tower[大版本号-1]`。都没有时返回空串，模板据此不渲染 `<img>` */
function majorIconOf(majorId: string): string {
  const ver = ui.value?.ver
  const own = ver?.majorIcons?.[majorId]
  if (own) return own
  return ver?.tower?.[Number(majorId) - 1] ?? ''
}

function asset(p: string | null | undefined) {
  return store.asset(p)
}

/* ══════════════════════════════════════════ 全局套装表（跨池去重） */
interface SuitAssets {
  portrait?: string
  icons?: { name: string; src: string }[]
  stages?: { stage: string; setName: string; cards: { name: string; src: string }[] }[]
}
interface SuitSet {
  id: string
  name: string
  star: number
  styles?: string[]
  desc?: string
  firstVersion?: string
  parts?: MzPart[]
  assets: SuitAssets
}
interface MzPart {
  name: string
  slot: string
  uid: string
  desc?: string
  stats?: Record<string, number>
}
interface SuitRow {
  set: SuitSet
  version: string
}

/** 套装行 = 阁 × 套装；分组依据是阁所在的版本，同一套会在自建阁 / 复刻阁里各出现一次 */
const SUITS = computed<SuitRow[]>(() => {
  const seen = new Set<string>()
  const out: SuitRow[] = []
  for (const b of store.manifest?.banners ?? []) {
    for (const s of (b.sets ?? []) as unknown as SuitSet[]) {
      if (!s.id) continue
      const key = `${b.version}|${s.id}` // 同版本下重复导入的同名套装只留一条
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ set: s, version: b.version })
    }
  }
  return out
})

/** 同一套可能出现在多座阁里 → 搜索/深链只认一条，优先落在首发版本那座阁 */
function canonicalRow(name: string): SuitRow | undefined {
  const rows = SUITS.value.filter((r) => r.set.name === name)
  if (!rows.length) return undefined
  return (
    rows.find((r) => !!r.set.firstVersion && inVersion(r.set.firstVersion, r.version)) ?? rows[0]
  )
}

/** `Part.id` 的构造规则（core/inventory.ts）：`${setId}:${partName}` */
function partKey(setId: string, p: MzPart) {
  return `${setId}:${p.name}`
}
function partGot(setId: string, p: MzPart) {
  // 套装已集齐 → 每件都算已获得（存档 key 用图标名，个别英文图标与部件名对不上）
  if (store.setDone(setId)) return true
  return store.codex.has(partKey(setId, p))
}

/* ══════════════════════════════════════════ 赛季栏 */
/** 赛季栏的版本列表：从服装阁数据派生，不读 `ui.ver.cards` 的键；缺卡时露出底板 + 版本号 + 版本名 */
const VER_LIST = computed(() => {
  const set = new Set<string>()
  for (const b of store.manifest?.banners ?? []) set.add(b.version)
  return [...set].sort((a, b) => {
    const pa = a.split('.').map(Number)
    const pb = b.split('.').map(Number)
    return (pa[0] - pb[0]) || ((pa[1] ?? 0) - (pb[1] ?? 0))
  })
})

/** 版本号精确前缀匹配（避免 1.1 命中 1.10） */
function inVersion(v: string, target: string) {
  return v.startsWith(target) && !/^\d/.test(v.slice(target.length))
}

/** 每个版本的套装总数 / 已集齐套数 —— 缩略图黑白→彩色按这个比例从左往右恢复。判定走 store.setDone（全库 5★/4★ 部件的完成度） */
function versionProgress(v: string): number {
  const list = SUITS.value.filter((r) => inVersion(r.version, v))
  if (!list.length) return 0
  let done = 0
  for (const r of list) if (store.setDone(r.set.id)) done++
  return done / list.length
}

/** 彩色层的软边蒙版：已集齐比例 p% 的左侧为彩色、右侧为黑白，交接处 8% 柔和过渡。p=0 → 全部黑白；p=100 → 全部彩色（避免「一套都没集齐却露彩色」） */
function softMask(v: string): string {
  const p = versionProgress(v) * 100
  if (p <= 0) return 'linear-gradient(to right, transparent 0%, transparent 100%)'
  if (p >= 100) return 'linear-gradient(to right, #000 0%, #000 100%)'
  const a = Math.max(0, p - 8)
  const b = p
  return `linear-gradient(to right, #000 0%, #000 ${a}%, transparent ${b}%, transparent 100%)`
}

const version = ref('')

/** 大版本 id → 名称：以 manifest 的 `ui.ver.versions[].majorName` 为准，内置表只作兜底 */
const FALLBACK_MAJOR_LABEL: Record<string, string> = { '1': '心愿原野', '2': '伊赞之土' }
const MAJOR_LABEL = computed<Record<string, string>>(() => {
  const out: Record<string, string> = { ...FALLBACK_MAJOR_LABEL }
  for (const m of store.manifest?.ui.ver.versions ?? []) {
    if (m.major && m.majorName) out[m.major] = m.majorName
  }
  return out
})

/** 大版本分组（组 id 由版本号首位决定，新增 0.x / 3.x 都不用改这里）；可折叠，和版本页同款 */
const majorGroups = computed(() => {
  const g = new Map<string, string[]>()
  for (const v of VER_LIST.value) {
    const k = v.split('.')[0]
    if (!g.has(k)) g.set(k, [])
    g.get(k)!.push(v)
  }
  return [...g.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    // 名称取不到时用「第 N 代」而不是光秃秃的数字，与 VersionView 的兜底一致
    .map(([key, versions]) => ({ key, label: MAJOR_LABEL.value[key] ?? `第 ${key} 代`, versions }))
})
const openMajor = ref<string | null>('2')
function toggleMajor(k: string) {
  play('common-hover', { volume: 0.4 })
  openMajor.value = openMajor.value === k ? null : k
}
function isMajorOpen(k: string) {
  return openMajor.value === k
}

/** 版本号 → 版本名：以 manifest 的 `ui.ver.versions` 为准，内置表只兜底 */
const FALLBACK_VER_NAME: Record<string, string> = {
  '1.0': '探索季', '1.1': '流星季', '1.2': '花焰季', '1.3': '传说季', '1.4': '妄想季',
  '1.5': '泡泡季', '1.6': '天真季', '1.7': '蓝泪季', '1.8': '丹青季', '1.9': '音乐季',
  '1.10': '丰收季', '1.11': '拾光季',
  '2.0': '祷声起诸大地', '2.1': '若生命如诗', '2.2': '九色万相生', '2.3': '予我无冕之心',
  '2.4': '嘘！森林不必听', '2.5': '万灵的归途', '2.6': '潮汐尽头的明天', '2.7': '千星所向的旅途',
  '2.8': '黄金尘', '2.9': '向晴空绽放', '2.10': '金羽的裁决', '2.11': '时光缝合的扉页',
}
const VER_NAME = computed<Record<string, string>>(() => {
  const out: Record<string, string> = { ...FALLBACK_VER_NAME }
  for (const m of store.manifest?.ui.ver.versions ?? []) {
    if (m.v && m.name) out[m.v] = m.name
  }
  return out
})
function verName(v: string) {
  return VER_NAME.value[v] ?? v
}
/** 选版本：过滤套装 + 重置各栏（与「版本界面」选版本同款操作） */
function pickVer(v: string) {
  play('common-hover', { volume: 0.5 })
  version.value = v
  suitIdx.value = 0
  setShift.value = 0
  partShift.value = 0
  partSel.value = -1
}

const suitsOfVersion = computed(() => {
  if (!version.value) return SUITS.value
  return SUITS.value.filter((r) => inVersion(r.version, version.value))
})

/* ══════════════════════════════════════════ 当前套装 / 部件 */
const suitIdx = ref(0)
const cur = computed<SuitRow | null>(() => suitsOfVersion.value[suitIdx.value] ?? null)
const curParts = computed<MzPart[]>(() => cur.value?.set.parts ?? [])
const curStar = computed(() => Number(cur.value?.set.star ?? 4))
const ownedCount = computed(() =>
  cur.value ? curParts.value.filter((p) => partGot(cur.value!.set.id, p)).length : 0,
)
/** 一套都没抽到 → 该套装不可查看（按键走禁用态）；判定同样走全库完成度 */
function suitLocked(r: SuitRow): boolean {
  const parts = r.set.parts ?? []
  return parts.length > 0 && !store.setTouched(r.set.id)
}
const curLocked = computed(() => (cur.value ? suitLocked(cur.value) : true))

const partSel = ref(-1) // -1 = 未选部件 → 显示「套装整体」
const selPart = computed<MzPart | null>(() => (partSel.value >= 0 ? curParts.value[partSel.value] ?? null : null))

/** 部件对应的试穿图（stages[0] 里 `类型-部件名`）：先按部件名后缀精确匹配， 再按部件 slot（= 卡片名前缀）兜底。slot 在全部套装里无重复，可作 1:1 键 */
function partCard(p: MzPart): string | undefined {
  const stage = cur.value?.set.assets.stages?.[0]
  if (!stage) return undefined
  const cards = stage.cards ?? []
  const byName = cards.find((c) => c.name.endsWith('-' + p.name))
  if (byName) return byName.src
  const slot = p.slot
  if (!slot) return undefined
  const bySlot = cards.find((c) => c.name.startsWith(slot + '-') && !c.name.startsWith('整体'))
  return bySlot?.src
}
/** 当前展示的是否为半身像（比例不同）。匹配不到试穿图时会回退到整体立绘，此时不能套用半身像比例 */
const isHalf = computed(() => !!(selPart.value && partCard(selPart.value)))
/** 展示图：选部件 → 该部件试穿图；否则 → 套装整体立绘 */
const showImg = computed(() => {
  const s = cur.value?.set
  if (!s) return undefined
  if (selPart.value) return partCard(selPart.value) ?? s.assets.portrait
  return s.assets.portrait
})
/** 立绘背景图按套装星级调色：5★ 粉金 / 4★ 淡紫偏蓝 / 其余淡金（均为可调近似，改 filter 即可） */
const bgFilter = computed(() => {
  const s = curStar.value
  if (s >= 5) return 'sepia(0.55) saturate(2.3) hue-rotate(-18deg) brightness(1.06)'
  if (s >= 4) return 'sepia(0.5) hue-rotate(205deg) saturate(1.55) brightness(1.04)'
  return 'sepia(0.35) hue-rotate(190deg) saturate(1.2) brightness(1.02)'
})
/** 文案：选部件 → 部件文案；否则 → 套装整体文案 */
const showDesc = computed(() => {
  if (curLocked.value) return '尚未获得这套装的任何部件。抽到任意一件后即可在此查看完整立绘、五维与文案。'
  if (selPart.value) return selPart.value.desc || '（该部件没有专属文案）'
  return cur.value?.set.desc || ''
})
/** 名称：选部件 → 该部件名；再点同一个部件回退 → 套装名（与文案同步切换） */
const curName = computed(() => (selPart.value ? selPart.value.name : cur.value?.set.name ?? ''))

/** 五维雷达： - 未选部件（partSel === -1）→ 该套装所有部件五维之和； - 选中某个具体部件 → 该部件自己的五维 */
const DIMS = ['典雅', '清新', '甜美', '性感', '帅气'] as const
const radar = computed(() => {
  const src = selPart.value ? [selPart.value] : curParts.value
  const sum: Record<string, number> = {}
  for (const d of DIMS) sum[d] = 0
  for (const p of src) {
    for (const d of DIMS) sum[d] += Number(p.stats?.[d] ?? 0)
  }
  return DIMS.map((d) => ({ dim: d, val: sum[d] }))
})
const radarMax = computed(() => Math.max(1, ...radar.value.map((r) => r.val)))

const RD = { cx: 120, cy: 118, R: 92, LR: 110 }
/** 五个顶点（数据点）+ 轴端标签位 */
const radarVerts = computed(() =>
  radar.value.map((r, i) => {
    const a = (-90 + i * 72) * (Math.PI / 180)
    const rr = RD.R * (r.val / radarMax.value)
    return {
      dim: r.dim,
      val: r.val,
      x: RD.cx + rr * Math.cos(a),
      y: RD.cy + rr * Math.sin(a),
      lx: RD.cx + RD.LR * Math.cos(a),
      ly: RD.cy + RD.LR * Math.sin(a),
    }
  }),
)
/** 悬停某个尖角 → 只显示那个角的具体数值（纯文字，无容器） */
const hoverDim = ref<string | null>(null)

function radarPts(k: number) {
  return radar.value
    .map((r, i) => {
      const a = (-90 + i * 72) * (Math.PI / 180)
      const rr = RD.R * k * (r.val / radarMax.value)
      return `${(RD.cx + rr * Math.cos(a)).toFixed(1)},${(RD.cy + rr * Math.sin(a)).toFixed(1)}`
    })
    .join(' ')
}

/* ══════════════════════════════════════════ 属性 / 风格标签胶囊（与共鸣页套装弹窗同一套素材） */
const STYLE_LABEL: Record<string, number> = { 制服: 9 }
function labelOfIdx(name: string): string {
  const list = ui.value?.detail.labels ?? []
  if (!list.length) return ''
  const want = STYLE_LABEL[name]
  if (want) {
    const hit = list.find((p) => p.endsWith(`label-${want}.webp`))
    if (hit) return hit
  }
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return list[h % list.length]
}

/* ══════════════════════════════════════════ 套装栏（最多 3 套，滚轮/拖动） */
const SET_VISIBLE = 3
const SET_W = 347
const SET_H = 109
/** 套装格子间隔 2px */
const SET_PITCH = SET_W + 2
const setShift = ref(0)
const setMax = computed(() => Math.max(0, suitsOfVersion.value.length - SET_VISIBLE))

function setWheel(e: WheelEvent) {
  if (setMax.value <= 0) return
  setShift.value = Math.min(setMax.value, Math.max(0, setShift.value + (e.deltaY > 0 ? 1 : -1)))
}
/** 拖动翻页 */
let setPressed = false
let setMoved = false
let setX0 = 0
let setFrom = 0
function setDown(e: PointerEvent) {
  setMoved = false
  if (setMax.value <= 0) return
  setPressed = true
  // 记设计坐标，不然高分辨率下拖拽会跑得更快
  setX0 = toDesignX(e.clientX)
  setFrom = setShift.value
  window.addEventListener('pointermove', setMove)
  window.addEventListener('pointerup', setUp, { once: true })
}
function setMove(e: PointerEvent) {
  if (!setPressed) return
  const dx = setX0 - toDesignX(e.clientX)
  if (!setMoved && Math.abs(dx) < 5) return
  setMoved = true
  setShift.value = Math.min(setMax.value, Math.max(0, setFrom + dx / SET_PITCH))
}
function setUp() {
  setPressed = false
  window.removeEventListener('pointermove', setMove)
  // 拖动结束吸附到整数格：套装栏只显示完整按键，不露被裁切的半截
  if (setMoved) setShift.value = Math.min(setMax.value, Math.max(0, Math.round(setShift.value)))
}

function pickSet(i: number) {
  if (setMoved) return // 刚才是拖动，不当作点击
  const r = suitsOfVersion.value[i]
  if (!r || suitLocked(r)) return // 未获得 → 不可查看
  if (i === suitIdx.value) return
  play('common-hover', { volume: 0.5 })
  suitIdx.value = i
  partSel.value = -1 // 切套装 → 回到「整体」
  partShift.value = 0
}

/** 主属性色 */
const STYLE_ORDER = ['甜美', '典雅', '清新', '性感', '帅气'] as const
function tagOfSet(s: SuitSet): string {
  const st = (s.styles ?? []).find((x) => (STYLE_ORDER as readonly string[]).includes(x))
  return st ?? '甜美'
}

/* ══════════════════════════════════════════ 部件栏（最多 5 个，滚轮/拖动） */
const PART_VISIBLE = 5
const PART_PITCH = 127
const partShift = ref(0)
const partMax = computed(() => Math.max(0, curParts.value.length - PART_VISIBLE))

function partWheel(e: WheelEvent) {
  if (partMax.value <= 0) return
  partShift.value = Math.min(partMax.value, Math.max(0, partShift.value + (e.deltaY > 0 ? 1 : -1)))
}
let partPressed = false
let partMoved = false
let partX0 = 0
let partFrom = 0
function partDown(e: PointerEvent) {
  partMoved = false
  if (partMax.value <= 0) return
  partPressed = true
  // 记设计坐标，不然高分辨率下拖拽会跑得更快
  partX0 = toDesignX(e.clientX)
  partFrom = partShift.value
  window.addEventListener('pointermove', partMove)
  window.addEventListener('pointerup', partUp, { once: true })
}
function partMove(e: PointerEvent) {
  if (!partPressed) return
  const dx = partX0 - toDesignX(e.clientX)
  if (!partMoved && Math.abs(dx) < 5) return
  partMoved = true
  partShift.value = Math.min(partMax.value, Math.max(0, partFrom + dx / PART_PITCH))
}
function partUp() {
  partPressed = false
  window.removeEventListener('pointermove', partMove)
}


/** 从「ESC 返回栈」回来时，把搜索弹窗恢复成离开时的样子 */
function resumeSearch() {
  const k = resumeKeyword(route.query)
  if (k === null) return
  kw.value = k
  searching.value = true
  // 把 resume / kw 从地址栏抹掉
  const q = { ...route.query }
  delete q.resume
  delete q.kw
  router.replace({ path: route.path, query: q })
}

function pickPart(i: number) {
  if (partMoved) return // 刚才是拖动
  // 部件栏切换用共鸣页十连按钮的悬停音
  play('btn-ten-hover', { volume: 0.5 })
  partSel.value = partSel.value === i ? -1 : i
}

/** 星级 → 底板（「恭喜获得」同款） */
function partBg(): string | undefined {
  const s = curStar.value
  const r = ui.value?.reward
  return s >= 5 ? r?.item5 : s >= 4 ? r?.item4 : r?.item3
}
function partIcon(p: MzPart): string | undefined {
  return cur.value?.set.assets.icons?.find((i) => i.name === p.name)?.src
}

/* ══════════════════════════════════════════ 名称跑马灯 */
const nameEl = ref<HTMLElement | null>(null)
const marquee = ref(false)
watch(
  () => curName.value,
  async () => {
    marquee.value = false
    await nextTick()
    const el = nameEl.value
    if (el) marquee.value = el.scrollWidth > el.clientWidth + 2
  },
  { immediate: true },
)

/* ══════════════════════════════════════════ 版式（pxdesk → 1920） */
const L = {
  back: { x: 27, y: 14, w: 137, h: 137 },
  sets: { x: 280, y: 33.5, w: SET_W, h: SET_H },
  /** 立绘容器 `T_UI_Collage_free_02` */
  collage: { x: 301.2, y: 198.5, w: 290.9, h: 434 },
  petals: { x: 190.7, y: 96.3, w: 217.7, h: 329.1 },
  info: { x: 654.3, y: 176, w: 946.1, h: 661.1 },
  plog: { x: 494.5, y: 668.2, w: 137.1, h: 137.1 },
  parts: { x: 601.7, y: 935, w: 5 * PART_PITCH, h: 137 },
  /** 赛季栏下边界 */
  vers: { x: 1662.2, y: 12, w: 257.8, h: 1018 },
  /** 放大镜热区（点开搜索弹窗）：以 (250,820) 为圆心、半径 100 的圆形点击区域 */
  search: { x: 150, y: 720, w: 200, h: 200 },
  /** 装饰（服装界面-图片工程2 */
  decor: { x: 1050.3, y: 203.5, w: 514.6, h: 613.6, opacity: 0.3 },
}

/* ══════════════════════════════════════════ 搜索（整体无位移） */
const searching = ref(false)
const kw = ref('')
/** 把含中文/符号的星级查询归一化成数字：五星/5星/5★/★5/5 等 → 5（无数字则返回 null） */
function starFromQuery(q: string): number | null {
  const cn: Record<string, number> = { 五: 5, 四: 4, 三: 3, 二: 2, 一: 1 }
  let s = q
  for (const [k, v] of Object.entries(cn)) s = s.split(k).join(String(v))
  const m = s.match(/\d/)
  return m ? Number(m[0]) : null
}

const results = computed(() => {
  const q = kw.value.trim()
  if (!q) return []
  const qStar = starFromQuery(q)
  // 同一套可能同时躺在自建阁与复刻阁里 → 按套装名去重，只留「首发那座阁」那条
  const seen = new Set<string>()
  const hit: SuitRow[] = []
  for (const r of SUITS.value) {
    if (seen.has(r.set.name)) continue
    if (suitLocked(r)) continue
    const nameOk = r.set.name.includes(q)
    const styleOk = (r.set.styles ?? []).some((t) => t.includes(q))
    const starOk = qStar != null && r.set.star === qStar
    if (!nameOk && !styleOk && !starOk) continue
    seen.add(r.set.name)
    hit.push(canonicalRow(r.set.name) ?? r)
  }
  return hit.slice(0, 6).map((r) => ({ name: r.set.name, star: r.set.star }))
})
/** 给 SearchPopup 用的条目格式（服装子界面无「｜」后缀） */
const searchItems = computed<SearchItem[]>(() =>
  results.value.map((r) => ({ id: r.name, title: r.name, star: r.star })),
)
function onSearchSelect(r: SearchItem) {
  pickResult({ name: r.title, star: r.star ?? 0 })
}
function openSearch() {
  play('btn-deny', { volume: 0.7 })
  searching.value = true
}
function closeSearch() {
  searching.value = false
  kw.value = ''
}
const selResult = ref('')
/** 搜索结果跳转：定位到该套装（必要时切版本），并关闭弹窗 */
function pickResult(r: { name: string; star: number }) {
  const row = canonicalRow(r.name)
  if (row && version.value !== row.version) version.value = row.version
  const idx = suitsOfVersion.value.findIndex((x) => x.set.name === r.name)
  if (idx >= 0) {
    suitIdx.value = idx
    partSel.value = -1
  }
  selResult.value = r.name
  closeSearch()
}

/* ══════════════════════════════════════════ 导航 */
function goBack() {
  clearHops() // 清掉 ESC 返回栈
  play('back-select', { volume: 0.8 })
  router.push(parentOf(route.path))
}
/** 套装故事：跳到故事图鉴并定位到当前套装的故事 */
function openStory() {
  play('common-hover', { volume: 0.5 })
  const name = cur.value?.set.name
  if (!name) return
  pushHop(route.fullPath)
  router.push({ path: '/codex/stories', query: { name } })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    if (searching.value) {
      closeSearch()
      return
    }
    // 是从别处跳过来的 → ESC 退回那一层（点退出键不走这里）
    const back = takeHop()
    if (back) {
      router.replace(back)
      return
    }
    goBack()
  }
}
onMounted(() => {
  version.value = VER_LIST.value[VER_LIST.value.length - 1] ?? ''
  // 默认停在第一个「已获得」的套装上
  const i = suitsOfVersion.value.findIndex((r) => !suitLocked(r))
  suitIdx.value = i >= 0 ? i : 0

  // 来自主界面搜索的「跳转到套装」：定位到对应套装（必要时切换版本）
  const qn = route.query.name
  if (typeof qn === 'string' && qn) {
    const row = canonicalRow(qn)
    if (row) {
      if (version.value !== row.version) version.value = row.version
      const idx = suitsOfVersion.value.findIndex((r) => r.set.name === qn)
      if (idx >= 0) {
        suitIdx.value = idx
        partSel.value = -1
      }
    }
  }

  resumeSearch()
  window.addEventListener('keydown', onKey)
  // 赛季栏展开动画结束后，把当前选中的版本滚进视口
  window.setTimeout(() => {
    const rail = document.querySelector('.cl-vers') as HTMLElement | null
    const act = document.querySelector('.cl-vminor.active') as HTMLElement | null
    if (!rail || !act) return
    const rr = rail.getBoundingClientRect()
    const ar = act.getBoundingClientRect()
    if (ar.top < rr.top || ar.bottom > rr.bottom) rail.scrollTop += ar.top - rr.top - 8
  }, 480)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div v-if="ui" class="cl">
    <img class="cl-bg" :src="asset(ui.museum.clothes.bg)" alt="" draggable="false" />

    <!-- 装饰（服装界面-图片工程2 图层 1） -->
    <img
      class="cl-decor"
      :src="asset(ui.museum.clothes.decor)"
      alt=""
      draggable="false"
      :style="{ left: L.decor.x + 'px', top: L.decor.y + 'px', width: L.decor.w + 'px', height: L.decor.h + 'px', opacity: L.decor.opacity }"
    />

    <!-- 返回键 -->
    <button class="cl-back" :style="{ left: L.back.x + 'px', top: L.back.y + 'px', width: L.back.w + 'px', height: L.back.h + 'px' }" @click="goBack">
      <img class="bn" :src="asset(ui.museum.clothes.backN)" alt="返回" draggable="false" />
      <img class="bh" :src="asset(ui.museum.clothes.backH)" alt="" draggable="false" />
    </button>

    <!-- ============ 套装选择栏：最多 3 套 ============ -->
    <div
      class="cl-sets"
      :style="{ left: L.sets.x + 'px', top: L.sets.y + 'px', width: 3 * SET_PITCH - (SET_PITCH - SET_W) + 'px', height: L.sets.h + 'px' }"
      @wheel.prevent="setWheel"
      @pointerdown="setDown"
      @pointermove="setMove"
      @pointerup="setUp"
      @pointercancel="setUp"
    >
      <div class="cl-settrack" :style="{ transform: `translateX(${-setShift * SET_PITCH}px)` }">
        <button
          v-for="(r, i) in suitsOfVersion"
          :key="r.set.id"
          class="cl-set"
          :class="{ on: suitIdx === i, locked: suitLocked(r) }"
          :style="{ left: i * SET_PITCH + 'px', width: SET_W + 'px', height: SET_H + 'px' }"
          @click="pickSet(i)"
        >
          <img class="st-bg" :src="asset(suitLocked(r) ? ui.museum.clothes.tagOff : ui.museum.clothes.tag[tagOfSet(r.set)])" alt="" draggable="false" />
          <span class="st-name">{{ r.set.name }}</span>
        </button>
      </div>
    </div>

    <!-- ============ 赛季栏：与「版本界面」同款（大版本 option + 小版本底板/缩略图/版本号/版本名） ============ -->
    <div class="cl-vers" :style="{ left: L.vers.x + 'px', top: L.vers.y + 'px', width: L.vers.w + 'px', height: L.vers.h + 'px' }">
      <div v-for="g in majorGroups" :key="g.key" class="cl-vgroup">
        <button class="cl-vmajor" :class="{ open: isMajorOpen(g.key) }" @click="toggleMajor(g.key)">
          <img class="vm-bg" :src="asset(isMajorOpen(g.key) ? ui.ver.optS : ui.ver.optN)" alt="" draggable="false" />
          <img v-if="majorIconOf(g.key)" class="vm-icon" :src="asset(majorIconOf(g.key))" alt="" draggable="false" />
          <span class="vm-txt">{{ g.label }}</span>
        </button>
        <div class="cl-vminors" :class="{ open: isMajorOpen(g.key) }">
          <button
            v-for="v in g.versions"
            :key="v"
            class="cl-vminor"
            :class="{ active: version === v }"
            @click="pickVer(v)"
          >
            <img class="vn-bg" :src="asset(version === v ? ui.ver.titlePanelH : ui.ver.titlePanelN)" alt="" draggable="false" />
            <img v-if="ui.ver.cards[v]" class="vn-thumb vn-gray" :src="asset(ui.ver.cards[v])" alt="" draggable="false" />
            <img
              v-if="ui.ver.cards[v]"
              class="vn-thumb vn-color"
              :src="asset(ui.ver.cards[v])"
              alt=""
              draggable="false"
              :style="{ maskImage: softMask(v), WebkitMaskImage: softMask(v) }"
            />
            <span class="vn-ver">
              <img class="vv-bg" :src="asset(ui.ver.verTag)" alt="" draggable="false" />
              <b>{{ v }}</b>
            </span>
            <span class="vn-name">{{ verName(v) }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- ============ 立绘容器 `T_UI_Collage_free_02` + 立绘 ============ -->
    <!-- 立绘/半身像置于容器框之下（先渲染 → 被框遮住） -->
    <div class="cl-show" :class="{ locked: curLocked }" :style="{ left: L.collage.x + 'px', top: L.collage.y + 'px', width: L.collage.w + 'px', height: L.collage.h + 'px' }">
      <img class="sh-bg" :src="asset(ui.museum.clothes.showBg)" :style="{ filter: bgFilter }" alt="" draggable="false" />
      <img v-if="showImg" class="sh-img" :class="{ half: isHalf }" :src="asset(showImg)" alt="" draggable="false" />
      <img class="sh-frame" :src="asset(ui.museum.clothes.collage)" alt="" draggable="false" />
    </div>
    <!-- 花瓣装饰 -->
    <img
      class="cl-petals"
      :src="asset(ui.museum.clothes.petals)"
      alt=""
      draggable="false"
      :style="{ left: L.petals.x + 'px', top: L.petals.y + 'px', width: L.petals.w + 'px', height: L.petals.h + 'px' }"
    />

    <!-- 放大镜 → 搜索弹窗（无悬停高亮） -->
    <button
      class="cl-search"
      :style="{ left: L.search.x + 'px', top: L.search.y + 'px', width: L.search.w + 'px', height: L.search.h + 'px' }"
      @click="openSearch"
    >
      <span class="sr-only">搜索</span>
    </button>

    <!-- ============ 信息栏（羊皮纸底图）：名称 / 五维雷达 / 文案 ============ -->
    <div class="cl-info" :style="{ left: L.info.x + 'px', top: L.info.y + 'px', width: L.info.w + 'px', height: L.info.h + 'px' }">
      <img class="in-paper" :src="asset(ui.museum.clothes.paper)" alt="" draggable="false" />
      <template v-if="cur">
        <!-- 名称等信息 -->
        <div class="in-head">
          <div class="in-namerow">
            <div class="in-namebox">
              <h2 ref="nameEl" class="in-name" :class="{ mq: marquee }">
                <span>{{ curName }}</span>
                <span v-if="marquee" class="mq-dup">{{ curName }}</span>
              </h2>
            </div>
            <div class="in-tags">
              <span
                v-for="s in cur.set.styles"
                :key="s"
                class="in-tag"
                :style="{ backgroundImage: `url(${asset(labelOfIdx(s))})` }"
              >{{ s }}</span>
            </div>
          </div>
          <div class="in-stars">
            <img v-for="n in curStar" :key="n" :src="asset(ui.detail.star)" alt="★" draggable="false" />
          </div>
        </div>

        <!-- 五维雷达图（容器 T_UI_Collage_f_1） -->
        <div class="in-radar">
          <img class="rd-frame" :src="asset(ui.museum.clothes.radarFrame)" alt="" draggable="false" />
          <svg viewBox="0 0 240 240" class="rd-svg">
            <polygon v-for="k in [1, 0.75, 0.5, 0.25]" :key="k" :points="radarPts(k)" class="rd-grid" />
            <line
              v-for="(v, i) in radarVerts"
              :key="'ax' + i"
              x1="120" y1="118"
              :x2="(120 + 92 * Math.cos((-90 + i * 72) * Math.PI / 180)).toFixed(1)"
              :y2="(118 + 92 * Math.sin((-90 + i * 72) * Math.PI / 180)).toFixed(1)"
              class="rd-axis"
            />
            <polygon :points="radarPts(1)" class="rd-area" />
            <text
              v-for="(v, i) in radarVerts"
              :key="'lb' + i"
              :x="v.lx" :y="v.ly"
              class="rd-label" text-anchor="middle" dominant-baseline="middle"
            >{{ v.dim }}</text>
            <g v-for="(v, i) in radarVerts" :key="'hot' + i">
              <circle :cx="v.lx" :cy="v.ly" r="20" class="rd-hot"
                @mouseenter="hoverDim = v.dim" @mouseleave="hoverDim = null" />
              <text v-if="hoverDim === v.dim" :x="v.lx" :y="v.ly - 24"
                class="rd-val" text-anchor="middle" dominant-baseline="middle">{{ v.val }}</text>
            </g>
          </svg>
        </div>

        <!-- 文案 -->
        <p class="in-desc">{{ showDesc }}</p>

        <!-- 部件数（置于信息栏左下、雷达图下方空白区） -->
        <div class="in-prog">部件 {{ ownedCount }}/{{ curParts.length }}</div>
      </template>
    </div>

    <!-- 套装故事跳转 -->
    <button class="cl-plog" :style="{ left: L.plog.x + 'px', top: L.plog.y + 'px', width: L.plog.w + 'px', height: L.plog.h + 'px' }" @click="openStory">
      <img :src="asset(ui.museum.clothes.plog)" alt="套装故事" draggable="false" />
    </button>

    <!-- ============ 部件选择栏：最多 5 个 ============ -->
    <div
      class="cl-parts"
      :style="{ left: L.parts.x + 'px', top: L.parts.y + 'px', width: L.parts.w + 'px', height: L.parts.h + 'px' }"
      @wheel.prevent="partWheel"
      @pointerdown="partDown"
      @pointermove="partMove"
      @pointerup="partUp"
      @pointercancel="partUp"
    >
      <div class="cl-parttrack" :style="{ transform: `translateX(${-partShift * PART_PITCH}px)` }">
        <button
          v-for="(p, i) in curParts"
          :key="p.name"
          class="cl-part"
          :class="{ on: partSel === i, got: partGot(cur!.set.id, p) }"
          :style="{ left: i * PART_PITCH + 'px' }"
          @click="pickPart(i)"
        >
          <img class="pt-bg" :src="asset(partBg())" alt="" draggable="false" />
          <!-- 高亮框（T_UI_common_img_item_bg_empty）：置于部件之下，与底板等大 -->
          <img class="pt-hi" :src="asset(ui.museum.clothes.itemEmpty)" alt="" draggable="false" />
          <img class="pt-ico" :src="asset(partIcon(p))" :alt="p.name" draggable="false" />
          <span class="pt-stars">
            <img v-for="n in curStar" :key="n" :src="asset(ui.detail.star)" alt="★" draggable="false" />
          </span>
        </button>
      </div>
    </div>

    <!-- ============ 搜索弹窗（复用 SearchPopup 模板） ============ -->
    <SearchPopup
      :open="searching"
      :query="kw"
      :results="searchItems"
      placeholder="搜索套装名称 / 属性标签 / 星级…"
      @update:query="kw = $event"
      @select="onSearchSelect"
      @close="closeSearch"
    />
  </div>
</template>

<style scoped>
.cl {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background: #2a1f18;
}
.cl-bg {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
}

/* 返回键 */
.cl-back {
  position: absolute;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
}
.cl-back img {
  position: absolute;
  inset: 0;
  width: 80%;
  height: 80%;
  object-fit: contain;
  max-width: none;
  transition: opacity 0.16s ease;
}
.cl-back .bh { opacity: 0; }
.cl-back:hover .bn { opacity: 0; }
.cl-back:hover .bh { opacity: 1; }

/* 套装选择栏 */
.cl-sets {
  position: absolute;
  overflow: hidden;
  touch-action: none;
  cursor: var(--nk-cursor, auto), grab;
}
.cl-sets:active { cursor: grabbing; }
.cl-settrack {
  position: absolute;
  inset: 0;
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}
.cl-set {
  position: absolute;
  top: 0;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
}
.cl-set.locked { cursor: default; }
.cl-set img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  max-width: none;
}
/* 高亮 */
.cl-set::after {
  content: '';
  position: absolute;
  inset: 12px;
  border-radius: 6px;
  pointer-events: none;
  opacity: 0;
}
.cl-set:not(.locked):hover,
.cl-set.on { z-index: 2; }
/* 选中常亮 */
.cl-set.on::after {
  opacity: .9;
  box-shadow: inset 0 0 0 3px rgba(178,222,255,1),
              inset 0 0 12px rgba(178,222,255,.7);
}
/* 悬停呼吸 */
.cl-set:not(.locked):hover::after {
  animation: setBlueBreath 0.4s ease-in-out infinite;
}
@keyframes setBlueBreath {
  0%, 100% {
    opacity: 0.55;
    box-shadow: inset 0 0 0 2px rgba(150, 205, 255, 0.9), inset 0 0 8px rgba(150, 205, 255, 0.5);
  }
  50% {
    opacity: 0.95;
    box-shadow: inset 0 0 0 4px rgba(178, 222, 255, 1), inset 0 0 15px rgba(178, 222, 255, 0.75);
  }
}
.st-name {
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  transform: translateY(-50%);
  text-align: center;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 28px;
  color: #5a3f1e;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.55);
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0 26px;
  box-sizing: border-box;
}
.cl-set.locked .st-name { color: #7b736a; }

/* 赛季栏 */
.cl-vers {
  position: absolute;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
}
.cl-vers::-webkit-scrollbar { width: 0; }
/* 大版本按钮 */
.cl-vgroup { margin: 0 0 2px; }
/* 与版本页一致 */
.cl-vmajor {
  position: sticky;
  top: 0;
  z-index: 4;
  display: block;
  width: 100%;
  height: 78px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
}
/* 大版本底板 */
.vm-bg {
  position: absolute;
  left: -0.2px;
  top: -2.8px;
  width: 259.9px;
  height: 83.7px;
  object-fit: fill;
  max-width: none;
  filter: drop-shadow(0 3px 8px rgba(20, 40, 60, 0.32));
}
.vm-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  width: 47px;
  height: 47px;
  transform: translateY(-50%);
  object-fit: contain;
  max-width: none;
  filter: drop-shadow(0 2px 5px rgba(30, 50, 70, 0.42));
}
.vm-txt {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  text-align: center;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 27px;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: #4a3a28;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  pointer-events: none;
}
.cl-vmajor.open .vm-txt { color: #6b3f18; }

/* 小版本折叠容器 */
.cl-vminors {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  transition: max-height 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease;
}
.cl-vminors.open { max-height: 1600px; opacity: 1; }
.cl-vminor {
  position: relative;
  display: block;
  width: 100%;
  height: 78px;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
}
.vn-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  max-width: none;
  filter: drop-shadow(0 2px 5px rgba(20, 40, 60, 0.28));
}
.cl-vminor.active .vn-bg { filter: drop-shadow(0 0 8px rgba(255, 226, 160, 0.75)); }
/* 缩略图 */
.vn-thumb {
  position: absolute;
  left: 6px;
  top: 6px;
  width: 246px;
  height: 66px;
  object-fit: cover;
  border-radius: 4px;
  max-width: none;
  pointer-events: none;
}
.vn-gray { filter: grayscale(1) brightness(0.72); }
.vn-color { transition: clip-path 0.4s ease; }
/* 版本号角标 */
.vn-ver {
  position: absolute;
  left: 6px;
  top: 6px;
  height: 20px;
  padding: 0 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  pointer-events: none;
}
.vv-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  max-width: none;
}
.vn-ver b {
  position: relative;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 2px rgba(38, 28, 72, 0.7);
}
/* 版本名居中 */
.vn-name {
  position: absolute;
  left: 10px;
  right: 10px;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  pointer-events: none;
  z-index: 3;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: #38291a;
  text-shadow: 0 0 6px rgba(255, 251, 238, 0.95), 0 0 14px rgba(255, 251, 238, 0.85), 0 1px 0 rgba(255, 255, 255, 0.9);
  white-space: nowrap;
}

/* 展示区 */
.cl-show {
  position: absolute;
  pointer-events: none;
}
/* 立绘背景图 */
.sh-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 95%;
  object-fit: fill;
  max-width: none;
  pointer-events: none;
}
/* 容器铺满 */
.sh-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 97%;
  object-fit: fill;
  max-width: none;
}
.sh-img {
  position: absolute;
  /* 贴合 T_UI_Collage_free_ */
  left: 2.99%;
  top: 0.25%;
  width: 94.93%;
  height: 96.87%;
  object-fit: contain;
  max-width: none;
  filter: drop-shadow(0 8px 18px rgba(60, 40, 20, 0.35));
}
/* 半身像 */
.sh-img.half {
  object-fit: cover;
}
/* 未获得套装 */
.cl-show.locked .sh-img { filter: grayscale(1) brightness(0.72) opacity(0.55); }
/* 未获得套装 */
.cl-show.locked .sh-bg { filter: grayscale(1) brightness(0.66) !important; }
/* 套装卡底板同理 */
.cl-set.locked .st-bg { filter: grayscale(1) brightness(0.8); }

/* 放大镜热区 */
.cl-search {
  position: absolute;
  padding: 0;
  border: 0;
  background: transparent;
  border-radius: 50%;
  cursor: var(--nk-cursor, auto), pointer;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

/* 信息栏 */
.cl-info {
  position: absolute;
  padding: 0;
}
.in-paper {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  max-width: none;
  pointer-events: none;
}
.cl-petals {
  position: absolute;
  object-fit: fill;
  max-width: none;
  pointer-events: none;
  opacity: 0.95;
}
.in-head {
  position: absolute;
  left: 70px;
  top: 68px;
  width: 800px;
  height: 137px;
}
.in-namerow {
  display: flex;
  align-items: center;
  gap: 18px;
  height: 72px;
}
.in-namebox {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
/* 名称跑马灯 */
.in-name {
  margin: 0;
  font-family: 'NikkiYaHei', 'NikkiBodyBold', sans-serif;
  font-size: 44px;
  line-height: 72px;
  color: #4a3618;
  white-space: nowrap;
}
.in-name.mq { display: inline-flex; animation: mqMove 9s linear infinite; }
.in-name.mq .mq-dup { padding-left: 64px; }
@keyframes mqMove {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.in-stars {
  display: flex;
  gap: 0;
  flex: none;
  margin-top: 8px;
}
/* 星级 */
.in-stars img {
  width: 60px;
  height: 60px;
  margin-right: -24px;
  object-fit: contain;
  max-width: none;
  filter: drop-shadow(0 0 6px rgba(255, 226, 158, 0.8));
}
.in-tags {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 10px;
  font-size: 22px;
  color: #7a5a2c;
}
/* 标签胶囊 */
.in-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  padding: 0 20px;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 22px;
  color: #6b4a22;
}
.in-prog {
  position: absolute;
  left: 92px;
  top: 560px;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 22px;
  color: #7a5a2c;
  letter-spacing: 0.02em;
  pointer-events: none;
}

/* 五维雷达 */
.in-radar {
  position: absolute;
  left: 92px;
  top: 251px;
  width: 318px;
  height: 289px;
}
.rd-svg { width: 100%; height: 100%; overflow: visible; }
.rd-grid { fill: none; stroke: rgba(120, 88, 48, 0.28); stroke-width: 1.4; }
.rd-axis { stroke: rgba(120, 88, 48, 0.22); stroke-width: 1.2; }
.rd-area {
  fill: rgba(214, 162, 92, 0.42);
  stroke: rgba(168, 118, 44, 0.95);
  stroke-width: 2;
}
.rd-label {
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 17px;
  fill: #6b4f28;
}

/* 文案 */
.in-desc {
  position: absolute;
  left: 443px;
  top: 251px;
  width: 418px;
  height: 289px;
  margin: 0;
  overflow: hidden;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 21px;
  line-height: 1.85;
  color: #5a452a;
}

.cl-plog {
  position: absolute;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
}
.cl-plog img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-width: none;
  transition: filter 0.18s ease;
}
.cl-plog:hover img { animation: plogBreath 1.6s ease-in-out infinite; }
@keyframes plogBreath {
  0%, 100% { filter: drop-shadow(0 0 5px rgba(241, 243, 129, 0.85)) drop-shadow(0 0 12px rgba(241, 243, 129, 0.6)); }
  50% { filter: drop-shadow(0 0 9px rgba(241, 243, 129, 1)) drop-shadow(0 0 22px rgba(241, 243, 129, 0.95)); }
}

/* 部件栏 */
.cl-parts {
  position: absolute;
  overflow: hidden;
  touch-action: none;
  cursor: var(--nk-cursor, auto), grab;
}
.cl-parts:active { cursor: grabbing; }
.cl-parttrack {
  position: absolute;
  left: 0;
  top: 0;
  height: 137px;
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}
.cl-part {
  position: absolute;
  top: 0;
  width: 128px;
  height: 137px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
}
.cl-part img {
  position: absolute;
  max-width: none;
}
.pt-bg {
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.pt-ico {
  left: 11px;
  top: 25px;
  width: 106px;
  height: 106px;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3));
}
/* 未获得 */
.cl-part:not(.got) .pt-ico { filter: grayscale(0.7) brightness(0.6) opacity(0.5); }
.cl-part:not(.got) .pt-bg { filter: grayscale(1) brightness(0.62) opacity(0.75); }
/* 高亮框 */
.pt-hi {
  inset: -3px;
  width: calc(100% + 6px);
  height: calc(100% + 6px);
  object-fit: fill;
  opacity: 0;
  transition: opacity 0.16s ease;
  pointer-events: none;
}
.cl-part:hover .pt-hi,
.cl-part.on .pt-hi { opacity: 1; }
.pt-stars {
  position: absolute;
  left: 6px;
  top: 4px;
  display: flex;
  pointer-events: none;
}
.pt-stars img {
  position: static;
  width: 18px;
  height: 18px;
  object-fit: contain;
  margin-right: -2.3px;
  filter: drop-shadow(0 0 4px rgba(255, 226, 158, 0.9));
}
/* 未获得 */
.cl-part:not(.got) .pt-stars { filter: grayscale(1) brightness(0.7) opacity(0.5); }
/* 搜索弹窗样式在 `src/components/SearchPopup.vue` */
/* 装饰层 */
.cl-decor {
  position: absolute;
  object-fit: fill;
  max-width: none;
  pointer-events: none;
  user-select: none;
  /* 信息栏羊皮纸不透明 */
  z-index: 5;
}

/* 五维雷达 */
/* 容器 T_UI_Collage_f_ */
.rd-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-width: none;
  opacity: 0.5;
  pointer-events: none;
}
/* 每个尖角的透明热区 */
.rd-hot {
  fill: rgba(214, 162, 92, 0);
  pointer-events: all;
  cursor: var(--nk-cursor, auto), pointer;
}
/* 悬停该角时显示的纯文字数值 */
.rd-val {
  font-family: 'NikkiYaHei', 'NikkiBodyBold', sans-serif;
  font-size: 22px;
  font-weight: 700;
  fill: #8a5a1e;
  paint-order: stroke;
  stroke: #fff8ec;
  stroke-width: 3px;
  pointer-events: none;
}
</style>
