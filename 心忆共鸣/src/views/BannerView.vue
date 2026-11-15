<script setup lang="ts">
/** 共鸣页 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { toDesignX } from '@/core/stage'
import { play, duckBgm, playBannerEnter, resumeBgm, warmBannerEnter } from '@/composables/useAudio'
import EchoView from '@/components/EchoView.vue'
import RewardPopup from '@/components/RewardPopup.vue'
import type { SetInfo } from '@/types'
import { parentOf } from '@/router'
import { clearHops, pushHop, takeHop } from '@/composables/useNavBack'

const store = useGameStore()
const router = useRouter()
const route = useRoute()

/** 货币：只显示死数值，不随抽卡变化 */
const CURRENCY = [
  { name: '无垠星石', slug: 'starlight', value: '66666' },
  { name: '钻石', slug: 'diamond', value: '88888' },
  { name: '共鸣水晶', slug: 'crystal', value: '99999' },
]

const showEcho = ref(false)
let timer = 0
const showDetail = ref<SetInfo | null>(null)
const showRules = ref(false)
/** 共鸣详情弹窗的两个页签：概率 / 抽取记录（左右切换键翻页） */
const detailTab = ref<'prob' | 'history'>('prob')
/** 抽取记录只留最近 50 条 */
const RECENT_MAX = 50

/** 当前服装阁的最近 50 条抽取记录（倒序），按池过滤，存于 `save.history` */
const recentPulls = computed(() => {
  const bid = store.bannerId
  const h = store.save?.history ?? []
  return h
    .filter((it) => it.banner === bid)
    .slice(-RECENT_MAX)
    .reverse()
    .map((it, i) => {
      // 老存档没有 name / star 快照 → 回退到 id 的部件名部分与 rarity
      const fallback = it.part.includes(':') ? it.part.split(':').pop()! : it.part
      return {
        key: `${it.at}-${i}-${it.part}`,
        name: it.name || fallback,
        star: it.star ?? it.rarity ?? 3,
      }
    })
})

/* ────────── 抽取记录分页 ────────── */

/** 单页条数 */
const PAGE_SIZE = 10
/** 当前页（0 起） */
const page = ref(0)
const pageCount = computed(() => Math.max(1, Math.ceil(recentPulls.value.length / PAGE_SIZE)))
/** 本页要显示的记录（不限序号，列表里只显示名称 + 星级） */
const pagedPulls = computed(() =>
  recentPulls.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE),
)

function turnPage(d: -1 | 1) {
  const next = Math.min(pageCount.value - 1, Math.max(0, page.value + d))
  if (next === page.value) return
  page.value = next
  play(d < 0 ? 'paper-flip' : 'paper-slide', { volume: 0.5 })
}

// 记录变少（清空本池 / 换池）时把页码夹回合法范围
watch(pageCount, (c) => {
  if (page.value > c - 1) page.value = Math.max(0, c - 1)
})

function toggleRules() {
  if (showRules.value) {
    showRules.value = false
    return
  }
  detailTab.value = 'prob'
  page.value = 0
  showRules.value = true
}

/** 左右切换键：两个页签循环 */
function switchDetailTab(dir: -1 | 1) {
  const order: Array<'prob' | 'history'> = ['prob', 'history']
  const i = order.indexOf(detailTab.value)
  detailTab.value = order[(i + dir + order.length) % order.length]
  page.value = 0
  play('btn-ten-hover', { volume: 0.5 })
}

const banner = computed(() => store.banner)
const rules = computed(() => store.rules)

/** 5★ / 4★ 保底 */
const p5 = computed(() => store.pity.p5)
const p4 = computed(() => store.pity.p4)
const hard5 = computed(() => rules.value?.pity['5'].hard ?? 20)
const hard4 = computed(() => rules.value?.pity['4'].hard ?? 10)
const soft5 = computed(() => rules.value?.pity['5'].softStart ?? 18)
/** 4★ 软保底起点 */
const soft4 = computed(() => rules.value?.pity['4'].softStart ?? 0)
const remain5 = computed(() => Math.max(0, hard5.value - p5.value))
const inSoft = computed(() => p5.value >= soft5.value)
const p5Pct = computed(() => Math.min(100, (p5.value / hard5.value) * 100))
const p4Pct = computed(() => Math.min(100, (p4.value / hard4.value) * 100))
const softPct = computed(() => (soft5.value / hard5.value) * 100)

/** 本池套装（星级降序）；`plateIdx` = 该套装在本池的序号（1 起，5★ 在前，同级保持 manifest 顺序） */
const sets = computed(() =>
  [...(banner.value?.sets ?? [])]
    .sort((a, b) => b.star - a.star)
    .map((st, i) => ({ ...st, plateIdx: i + 1 })),
)

/** 左下角套名横幅：本池全部套装横向排列，同屏最多 3 套，其余滚轮 / 拖动查看 */
const bannerPlates = computed(() => sets.value)

/* ---- 套名横幅横向滚动：滚轮 + 拖动（拖动后不触发点击） ---- */
const platesEl = ref<HTMLElement | null>(null)
const platesRev = ref(0)
let dragStartX = 0
let dragStartLeft = 0
let dragging = false
let dragMoved = false

function onPlatesWheel(e: WheelEvent) {
  const el = platesEl.value
  if (!el) return
  el.scrollLeft += e.deltaY || e.deltaX
}

function onPlatesDown(e: PointerEvent) {
  const el = platesEl.value
  if (!el) return
  dragging = true
  dragMoved = false
  // 记**设计坐标**，不然高分辨率下拖拽会跑得更快
  dragStartX = toDesignX(e.clientX)
  dragStartLeft = el.scrollLeft
}

function onPlatesMove(e: PointerEvent) {
  if (!dragging) return
  const el = platesEl.value
  if (!el) return
  const dx = toDesignX(e.clientX) - dragStartX
  if (Math.abs(dx) > 3) dragMoved = true
  el.scrollLeft = dragStartLeft - dx
}

function onPlatesUp() {
  dragging = false
}

/** 套装详情 → 服装图鉴对应位置（图鉴支持 `?name=` 定位），并把来源压进 ESC 返回栈 */
function jumpToClothes() {
  const st = showDetail.value
  if (!st) return
  play('window-open', { volume: 0.6 })
  pushHop(route.fullPath)
  showDetail.value = null
  router.push({ path: '/codex/clothes', query: { name: st.name } })
}

function openPlate(st: SetInfo) {
  // 拖动查看不算点击
  if (dragMoved) {
    dragMoved = false
    return
  }
  openSet(st)
}

/** 两端渐隐（滚到头那一侧不虚化），与服装阁列表同一套逻辑 */
const platesMask = computed(() => {
  void platesRev.value
  const el = platesEl.value
  if (!el) return 'none'
  if (el.scrollWidth <= el.clientWidth + 1) return 'none'
  const atLeft = el.scrollLeft <= 1
  const atRight = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
  if (atLeft && atRight) return 'none'
  const l = atLeft ? '#000 0' : 'transparent 0, #000 30px'
  const r = atRight ? '#000 100%' : '#000 calc(100% - 30px), transparent 100%'
  return `linear-gradient(90deg, ${l}, ${r})`
})

/** 艺术字：优先用该池专属艺术字 */
const titleArt = computed(() => {
  const a = banner.value?.assets
  return a?.title ? store.asset(a.title) : null
})

function asset(p: string | null | undefined) {
  return store.asset(p)
}

const ui = computed(() => store.manifest?.ui)

/* ---------------------------------------------------- 背景：动态 PV / 静态底图 */
/** 服装阁动态背景（官网 PV 转的 webm，manifest.assets.bgVideo，没有就退回静态） */
const bgVideo = computed(() => store.banner?.assets.bgVideo ?? null)
/** 静态底图（按池） */
const isDefaultPool = computed(() => store.bannerId === 'banner-076')
const bgStill = computed(() => {
  if (isDefaultPool.value && ui.value?.banner.bg076) return ui.value.banner.bg076
  return store.banner?.assets.bgClean ?? ''
})
/** 2560×1440 才需要「left:-320 top:-180 中心裁切」；1920×1080 直接铺满 */
const bgStillStyle = computed(() =>
  isDefaultPool.value && ui.value?.banner.bg076
    ? undefined
    : { left: '0px', top: '0px', width: '1920px', height: '1080px' },
)
const bgMode = ref<'video' | 'still'>('video')
const bgVideoEl = ref<HTMLVideoElement | null>(null)

/** 当前这条 bgVideo 加载失败过（切阁时重置；失败过的路径不该反复重试） */
const bgVideoBroken = ref(false)

/** 实际播放的视频：本级正常就播本级，加载失败过就落静态、不再重试 */
const activeVideo = computed(() => (bgVideoBroken.value ? null : bgVideo.value))

/** 本阁静态背景加载失败过（切阁时重置） */
const bgStillBroken = ref(false)

/** 实际渲染的静态背景：本阁背景（坏过就跳过）→ 统一兜底图 */
const stillSrc = computed(() => {
  if (!bgStillBroken.value && bgStill.value) return bgStill.value
  return fallbackBg.value || ''
})

function onStillError() {
  if (bgStillBroken.value) return
  bgStillBroken.value = true
}

/** 动态背景加载失败的兜底链：本阁静态底图 → 统一兜底背景（`ui/ver/bg.webp`）→ `.bg-none` 渐变 */
function onBgVideoError() {
  bgVideoBroken.value = true
  bgMode.value = 'still'
}

function toggleBg() {
  if (!activeVideo.value) {
    toast('本服装阁暂无动态背景')
    return
  }
  bgMode.value = bgMode.value === 'video' ? 'still' : 'video'
  play('common-hover', { volume: 0.5 })
  if (bgMode.value === 'video') {
    // 切回视频时重新播（v-if 重建后需要手动 play）
    window.setTimeout(() => void bgVideoEl.value?.play().catch(() => {}), 60)
  }
}

/* ---------------------------------------------------- 服装阁列表滚动 */
const poolListEl = ref<HTMLElement | null>(null)

/** 上下临界区虚化：到顶不虚化顶部、到底不虚化底部，内容不足一屏时两端都不虚化 */
const poolAtTop = ref(true)
const poolAtBottom = ref(false)
const POOL_FADE_TOP = 24
const POOL_FADE_BOTTOM = 102

function onPoolScroll() {
  const el = poolListEl.value
  if (!el) return
  poolAtTop.value = el.scrollTop <= 1
  poolAtBottom.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 1
}

const poolMask = computed(() => {
  const el = poolListEl.value
  const top = poolAtTop.value ? 0 : POOL_FADE_TOP
  const bottom = poolAtBottom.value ? 0 : POOL_FADE_BOTTOM
  if (!el) return `linear-gradient(180deg, #000 ${top}px, #000 calc(100% - ${bottom}px))`
  const noScroll = el.scrollHeight <= el.clientHeight + 1
  if (noScroll) return 'none'
  if (!top && !bottom) return 'none'
  const a = top ? `transparent 0, #000 ${top}px` : '#000 0'
  const b = bottom ? `#000 calc(100% - ${bottom}px), transparent 100%` : '#000 100%'
  return `linear-gradient(180deg, ${a}, ${b})`
})

/** 滚轮：列表本身可滚，滚到头再把事件交还给页面（这里页面本来也不滚） */
function onPoolWheel(e: WheelEvent) {
  const el = poolListEl.value
  if (!el) return
  el.scrollTop += e.deltaY
}

/** 把当前服装阁滚进列表可视区 */
async function scrollSelectedIntoView() {
  await nextTick()
  const el = poolListEl.value
  if (!el) return
  const items = el.querySelectorAll<HTMLElement>('.pool-item')
  const item = items[selectedIdx.value]
  if (!item) return
  const target = item.offsetTop - (el.clientHeight - item.offsetHeight) / 2
  const max = el.scrollHeight - el.clientHeight
  el.scrollTop = Math.min(Math.max(0, target), Math.max(0, max))
  onPoolScroll()
}
watch(() => store.bannerId, () => void scrollSelectedIntoView(), { immediate: true })
onMounted(() => void scrollSelectedIntoView())

/* ---------------------------------------------------- 深海回响：还差多少抽 */
const wishHint = computed(() => {
  // 深海回响素材还没收录的池（2.11 雪落颂愿时）：tiers 为空时不能显示「全部已领取」，那是误导
  if (!(store.banner?.milestones?.length)) return '奖励待收录'
  const t = store.tiers.find((x) => !x.claimed)
  if (!t) return '全部已领取'
  if (t.claimable) return '可领取'
  return `${Math.max(0, t.pulls - store.pity.total)}次后可领取`
})

/* ---------------------------------------------------- 本服装阁服装收集进度（3★30 + 4★8 + 5★10 = 48） */
const collect = computed(() => ({
  owned: store.codexStats.owned,
  total: store.codexStats.total,
}))

/* ---- 左侧服装阁列表：顺序 = manifest.banners（版本升序 → 同版本按 seq），id = pool-map 的 banner id ---- */
interface PoolEntry {
  id: string
  name: string
  /** 阁型：内置三种 + 工坊自定义（自定义时看 `typeLabel`） */
  type: 'collab' | 'limited' | 'standard' | 'custom'
  /** 自定义阁型的中文名（如「联动」「复刻」）；内置阁型为空 */
  typeLabel?: string
  real: boolean
  /** 该池专属列表缩略图（`banners/thumb/NNN.webp`） */
  thumb: string | null
  /** 去艺术字整屏背景；没有缩略图时用它顶（绝不借别座阁的图） */
  bg: string | null
}

/** 服装阁列表 = 当前版本的服装阁 + 常驻池（永远最后一个），来自 `store.visiblePools` */
const POOLS = computed<PoolEntry[]>(() =>
  (store.visiblePools ?? [])
    .map((b) => {
      // 阁型：standard / limited / collab 走内置图标与文案
      // 其它任何值（工坊里自定义的阁型）统一归 visiblePools 的 `typeLabel`
      const t = String(b.type ?? 'limited')
      const known = t === 'standard' || t === 'limited' || t === 'collab'
      return {
        id: b.id,
        name: b.name,
        type: (known ? t : 'custom') as PoolEntry['type'],
        typeLabel: known ? undefined : (b.typeLabel || t),
        real: true,
        thumb: b.assets?.thumb ?? null,
        bg: b.assets?.bgClean ?? null,
      }
    }),
)

/** 是否「素材已收录」：manifest 里有这个 banner 即可（缺背景由 `.bg-none` 渐变兜底） */
function isReal(p: PoolEntry): boolean {
  return !!store.manifest?.banners.some((x) => x.id === p.id)
}

/** 统一兜底背景：没给背景 / 图或视频损坏时都落到这张 */
const fallbackBg = computed(() => ui.value?.banner.fallbackBg ?? '')

/** 列表缩略图：本阁缩略图 → 本阁背景 → 统一兜底图 */
function thumbOf(p: PoolEntry): string {
  return p.thumb || p.bg || fallbackBg.value || ''
}

/** 缩略图加载失败 → 换兜底图 */
function onThumbError(e: Event) {
  const el = e.target as HTMLImageElement
  if (!fallbackBg.value || el.dataset.fellBack) return
  el.dataset.fellBack = '1'
  el.src = asset(fallbackBg.value)
}

function tagOf(t: PoolEntry['type']): string {
  const b = ui.value?.banner
  if (!b) return ''
  // 自定义阁型借用「限定」的底框（形状一致，只有文字不同）
  return t === 'collab' ? b.tagCollab : t === 'standard' ? b.tagStandard : b.tagLimited
}

/** 当前服装阁编号（001~999 官方 / 1000~9999 自定义），必须整串匹配 `^\d{3,4}$`，不合法返回空串 */
const gachaNo = computed(() => {
  const k = String(banner.value?.gachaKey ?? '').trim()
  return /^\d{3,4}$/.test(k) ? k : ''
})
/** 套名横幅底板：按该套装在本池的序号取专属铭牌，其次整池一张 `_name.png`，最后通用粉 / 紫底板 */
function plateOf(st: SetInfo & { plateIdx?: number }): string {
  const b = ui.value?.banner
  if (!b) return ''
  const own = gachaNo.value ? b.namePlates?.[gachaNo.value] : undefined
  const plate = typeof own === 'string' ? { any: own } : own
  const bySeq = st.plateIdx ? plate?.[String(st.plateIdx)] : undefined
  const hit = bySeq || plate?.any
  return hit || (st.star === 5 ? b.setName1 : b.setName2)
}

function tagText(p: PoolEntry): string {
  if (p.type === 'custom') return p.typeLabel || '限定'
  return p.type === 'collab' ? '联动限定' : p.type === 'limited' ? '限定' : '常驻'
}

/** 列表放大 */

/** 选中项 = 当前 bannerId 在列表里的位置，跟随 `store.bannerId` */
const selectedIdx = ref(0)
watch(
  () => [store.bannerId, POOLS.value.length] as const,
  () => {
    const i = POOLS.value.findIndex((p) => p.id === store.bannerId)
    if (i >= 0) selectedIdx.value = i
  },
  { immediate: true },
)
const hoverIdx = ref(-1)
/** 悬停优先级高于选中；同时只有一个放大 */
const enlarged = computed(() => (hoverIdx.value >= 0 ? hoverIdx.value : selectedIdx.value))

/* ---------------------------------------------------- 轻提示 */
const hint = ref('')
let hintTimer = 0
function toast(msg: string) {
  hint.value = msg
  window.clearTimeout(hintTimer)
  hintTimer = window.setTimeout(() => (hint.value = ''), 1600)
}

function selectPool(i: number) {
  const p = POOLS.value[i]
  if (!p) return
  if (!isReal(p)) {
    toast(`${p.name} · 该服装阁素材尚未收录`)
    return
  }
  selectedIdx.value = i
  play('thumb-select', { volume: 0.6 })
  if (store.bannerId !== p.id) {
    store.selectBanner(p.id)
    // 每座阁有自己的「进入界面」音：进页时播过一次（音量 1.0）
    // 在缩略图栏**切到另一座**时再播一次（音量 0.7）
    playBannerEnter(p.id, 0.7)
    // 新阁重新评估背景：上一座阁坏掉的视频/背景图不代表这一座也坏
    bgVideoBroken.value = false
    bgStillBroken.value = false
    // 常驻池没有动态 PV
    bgMode.value = store.banner?.assets.bgVideo ? 'video' : 'still'
  }
}

/** 悬停缩略图：放大 + 悬停音 + **顺手预热这座阁的进入音**（76KB/个） */
function hoverPool(i: number) {
  hoverIdx.value = i
  play('thumb-hover', { volume: 0.45 })
  const p = POOLS.value[i]
  if (p && isReal(p)) warmBannerEnter(p.id)
}

/* ---------------------------------------------------- 倒计时（10 天 12 时 37 分 29 秒） */
const END_AT = new Date('2026-11-03T10:34:00+08:00').getTime()
const countdown = ref('')
function tick() {
  const ms = Math.max(0, END_AT - Date.now())
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  countdown.value = `${d}天${h}时${m}分${sec}秒`
}


function currencyIcon(name: string): string {
  return store.asset(store.manifest?.currency[name]?.icon)
}

/* ---------------------------------------------------- 动作 */

/** 退出共鸣页：`?from=versions` 退回版本页，其余入口回上级 */
function leave() {
  clearHops()
  play('back-select', { volume: 0.8 })
  const fromVersions = route.query.from === 'versions'
  router.push(fromVersions ? '/versions' : parentOf(route.path))
}

function openEcho() {
  play('echo-open', { volume: 0.85 })
  showEcho.value = true
}

/** ESC 退出 */
function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  /* 层级从高到低逐层退：套装详情弹窗最先关 */
  if (showDetail.value) {
    showDetail.value = null
    play('back-select', { volume: 0.5 })
    return
  }
  if (showEcho.value) {
    showEcho.value = false
    return
  }
  if (showRules.value) {
    showRules.value = false
    return
  }
  // 是从别的界面跳过来的 → ESC 退回那一层（而不是父级）
  const back = takeHop()
  if (back) {
    play('back-select', { volume: 0.8 })
    router.replace(back)
    return
  }
  leave()
}

function pull(times: 1 | 10) {
  if (times === 1) play('btn-res-select', { volume: 0.9 })
  else play('btn-ten-select', { volume: 0.9 })

  // 演出·5「跳过抽卡」：不进退演出，直接结算并把结果交给「恭喜获得」
  if (store.save.settings.skipGacha) {
    const res = store.pull(times)
    if (res.length) {
      play('reward-a', { volume: 0.85 })
      if (!store.save.settings.skipReward) store.rewardOpen = true
    }
    return
  }

  duckBgm(true, 500)
  window.setTimeout(() => {
    router.push({ path: '/gacha', query: { times: String(times) } })
  }, 120)
}

function hoverRes(times: 1 | 10) {
  play(times === 1 ? 'btn-res-hover' : 'btn-ten-hover', { volume: 0.5 })
}

function openSet(s: SetInfo) {
  play('common-hover', { volume: 0.7 })
  showDetail.value = s
}

/* ---------------------------------------------------- 套装详情弹层 */
/** 主属性 → 弹层素材键（五套插画 / 纸底） */
const ATTR_KEY: Record<string, string> = {
  典雅: 'elegant', 清新: 'fresh', 性感: 'sexy', 帅气: 'cool', 甜美: 'sweet',
}
/** 主属性 → 主题色（与服装阁标签的语义色一致） */
const ATTR_RGB: Record<string, string> = {
  典雅: '216, 169, 74',
  清新: '111, 196, 138',
  性感: '169, 127, 216',
  帅气: '90, 159, 216',
  甜美: '232, 139, 176',
}
/** 主属性 = 套装标签里的第一个五维属性（套装文案 txt 的〖属性〗行首位） */
const attrName = computed(() => {
  const st = showDetail.value?.styles ?? []
  return st.find((x) => ATTR_KEY[x]) ?? '甜美'
})
const attrKey = computed(() => ATTR_KEY[attrName.value] ?? 'sweet')
const sheetTheme = computed(() => ({ '--attr': ATTR_RGB[attrName.value] ?? ATTR_RGB['甜美'] }))

/** 当前选中的进化形态（0 = 初始/大立绘，1..n = 底部形态卡） */
const formIdx = ref(0)
watch(showDetail, () => (formIdx.value = 0))

/** 形态的规范顺序（5★：初始/焕新→一进→二进→满进；4★：初始/焕新→进化） */
const FORM_ORDER = ['初始', '焕新', '一进', '二进', '满进', '进化']

/** 等级图标序号：初始/焕新=01、一进/进化=02、二进=03、满进=04 */
function stageIconIdx(name: string): number {
  if (name === '一进' || name === '进化') return 1
  if (name === '二进') return 2
  if (name === '满进') return 3
  return 0
}
/** 等级图标：on=true 用 _s（高亮），否则 _l（置灰） */
function stageIcon(name: string, on = false): string {
  const pp = ui.value?.popup
  const list = (on ? pp?.stagesOn : pp?.stages) ?? []
  return list[stageIconIdx(name)] ?? list[0] ?? ''
}

/** 形态是否已解锁：5★ 集齐→初始 / 焕新、180 抽→一进、230 抽→二进、集齐第二套→满进； 4★ 集齐→焕新、集齐第二套→进化 */
function stageUnlocked(name: string, st: SetInfo | null = showDetail.value): boolean {
  if (!st) return false
  const pr = setProgress(st)
  const full = pr.total > 0 && pr.owned >= pr.total
  const pulls = store.pity.total
  switch (name) {
    case '初始':
    case '焕新':
      return full
    case '一进':
      return full && pulls >= 180
    case '二进':
      return full && pulls >= 230
    case '满进':
    case '进化':
      return full && store.setDupFull(st.id)
    default:
      return false
  }
}

/** 属性标签 → 胶囊素材 */
const LABEL_OF: Record<string, string> = {
  典雅: '01', 清新: '02', 甜美: '04', 性感: '08', 帅气: '05',
  保暖: '05', 清凉: '04', 居家: '02', 礼服: '01', 简约: '03',
  幻想: '07', 知性: '06', 冒险: '03', 浪漫: '04', 复古: '06',
  时尚: '02', 制服: '09', 精灵: '07', 舞会: '06', 宫廷: '03',
  琳琅: '01', 田园: '02', 童趣: '09', 潮酷: '06', 甜心: '04',
  发光: '01', 发亮: '01', 神谕: '06', 森林: '07', 灵动: '05',
  古典: '03', 大地: '01', 唯美: '09', 绮想: '04', 流彩: '02',
}
function labelOf(tag: string): string {
  const k = LABEL_OF[tag] ?? '10'
  return ui.value?.popup?.labels?.[k] ?? ui.value?.popup?.label ?? ''
}

/** 进化形态缩略图：按 manifest 里的真实 stage 名取 `整体-<形态>` 卡 */
const formThumbs = computed(() => {
  const s = showDetail.value
  if (!s) return []
  const rank = (n: string) => {
    const i = FORM_ORDER.indexOf(n)
    return i < 0 ? 99 : i
  }
  return [...(s.assets.stages ?? [])]
    .sort((a, b) => rank(a.stage) - rank(b.stage))
    .map((st) => {
      const whole = st.cards.find((c) => c.name.startsWith('整体-'))
      return {
        name: st.stage,
        setName: st.setName,
        src: whole?.src ?? st.cards[0]?.src ?? null,
      }
    })
    .filter((x): x is { name: string; setName: string; src: string } => !!x.src)
})

/** 圆形收集进度的描边长度（半径 86 → 周长 540.4） */
const ringDash = computed(() => {
  const st = showDetail.value
  if (!st) return 0
  const pr = setProgress(st)
  const pct = pr.total > 0 ? pr.owned / pr.total : 0
  return +(2 * Math.PI * 86 * Math.min(1, Math.max(0, pct))).toFixed(1)
})

/** 底部形态卡：去掉「初始」（它就是左边那张大立绘） */
const formCards = computed(() => formThumbs.value.filter((f) => f.name !== '初始'))


function setProgress(s: SetInfo) {
  return store.setProgress(s.id)
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  // 列表挂上后先算一次虚化状态（到顶 → 顶部不虚化）
  void nextTick().then(() => onPoolScroll())
  if (banner.value) {
    // 服装阁进入音（原始音量）+ 赠送弹窗音叠加（弹窗音量为进入音的 1/3，头部对齐）
    playBannerEnter(banner.value.id)
    window.setTimeout(() => play('echo-open', { volume: 0.33 }), 60)
  }
  resumeBgm(700)
  tick()
  timer = window.setInterval(tick, 1000)

  // 开发期直出套装详情：/#/banner?set=蒙尘之罪（生产构建里这段会被摇掉）
  // manifest 是异步加载的，onMounted 时 sets 可能还是空的 → 用 watch 等它到齐
  if (import.meta.env.DEV) {
    const q = route.query.set
    const want = typeof q === 'string' ? q : ''
    if (want) {
      let done = false
      watch(sets, (list) => {
        if (done) return
        const hit = list.find((x) => x.name === want)
        if (hit) { done = true; openSet(hit) }
      }, { immediate: true })
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.clearInterval(timer)
  window.clearTimeout(hintTimer)
  duckBgm(false, 400)
})
</script>

<template>
  <div v-if="banner" class="banner">
    <!-- ============ 背景：优先播动态 PV（官网 06.mp4 转 webm），切静态时用原图 ============
         静态底图 2560×1440，实机「缩放 0.75」= **只取画面中心 75%（即中心 1920×1080 区域）**，
         1:1 铺满屏幕，既不缩放也不拉伸。 -->
    <div class="bg-wrap">
      <video v-if="activeVideo && bgMode === 'video'" :key="activeVideo" ref="bgVideoEl"
        class="bg-img bg-video" :src="asset(activeVideo)" autoplay muted loop playsinline
        @error="onBgVideoError"></video>
      <img v-else-if="stillSrc" class="bg-img bg-still" :src="asset(stillSrc)"
        :style="bgStillStyle" alt="" draggable="false" @error="onStillError" />
      <!-- 兜底图也拿不到（manifest 缺 ui/ver/bg.webp）→ 同色系渐变，仍然不黑屏 -->
      <div v-else class="bg-img bg-none"></div>
    </div>
    <div class="bg-scrim"></div>

    <!-- ============ 退出键（95×96 原尺寸，圆心落在实机 68.5,49）+ 页签「共鸣」 ============ -->
    <button class="back-btn" title="退出共鸣" @click="leave"
      @mouseenter="play('common-hover', { volume: 0.45 })">
      <img class="bb-n" :src="asset(ui?.btn.backN)" alt="退出" draggable="false" />
      <img class="bb-h" :src="asset(ui?.btn.backH)" alt="" draggable="false" />
    </button>
    <span class="page-title">共鸣</span>

    <!-- ============ 货币栏 1325,23 546×50（容器 social_performance_bg 60% + 底部金线） ============ -->
    <div class="wallet">
      <span v-if="ui?.banner" class="w-bg"
        :style="{ '--w-bg-src': `url('${asset(ui.banner.socialBg)}')` }"></span>
      <img v-if="ui?.banner" class="w-line" :src="asset(ui.banner.longDetailsN)" alt="" draggable="false" />
      <template v-for="(c, i) in CURRENCY" :key="c.slug">
        <span v-if="i > 0" class="w-sep"></span>
        <button class="w-item" @mouseenter="play('btn-ten-hover', { volume: 0.35 })">
          <img :src="currencyIcon(c.name)" :alt="c.name" draggable="false" />
          <b class="num">{{ c.value }}</b>
          <i v-if="c.slug === 'diamond'" class="w-add">+</i>
        </button>
      </template>
    </div>

    <!-- ============ 服装阁列表（缩略图 242×110，可滚动，上下临界区虚化）
         放大规则：鼠标悬停 > 当前选中，**同时只有一个放大**。
         悬停是临时放大（离开即复原），选中是常驻放大。 ============ -->
    <div
      ref="poolListEl"
      class="pool-list"
      data-no-rail
      :style="{ maskImage: poolMask, WebkitMaskImage: poolMask }"
      @wheel.passive="onPoolWheel"
      @scroll.passive="onPoolScroll"
      @mouseleave="hoverIdx = -1">
      <div class="pool-inner">
        <button v-for="(p, i) in POOLS" :key="p.name" class="pool-item"
          :class="{ big: enlarged === i, locked: !isReal(p) }"
          :title="isReal(p) ? p.name : p.name + '（该服装阁素材尚未收录）'"
          @mouseenter="hoverPool(i)"
          @click="selectPool(i)">
          <img class="pi-img" :src="asset(thumbOf(p))" :alt="p.name" draggable="false"
            @error="onThumbError" />
          <!-- 每个缩略图下方都有金线装饰（解包 bg_list_line，金线在最底部） -->
          <img v-if="ui?.banner" class="pi-line" :src="asset(ui.banner.listLine)" alt="" draggable="false" />
          <!-- 悬停/选中 -->
          <img v-if="ui?.banner" class="pi-frame" :src="asset(ui.banner.cardFrame)" alt="" draggable="false" />
          <!-- 类型标签 -->
          <img v-if="ui?.banner" class="pi-tag" :src="asset(tagOf(p.type))" alt="" draggable="false" />
          <span class="pi-tag-txt">{{ tagText(p) }}</span>
          <span class="pi-name">{{ p.name }}</span>
        </button>
      </div>
    </div>

    <!-- ============ 服装阁名称艺术字 1501,95 376×193 ============ -->
    <img v-if="titleArt" class="title-art" :src="titleArt" :alt="banner.name" draggable="false" />
    <h1 v-else class="title-text">{{ banner.name }}</h1>

    <!-- ============ 抽取说明 1479,298（右移 5 / 上移 4） ============ -->
    <p class="rule-text">{{ rules?.pity['4'].note ?? '每十次共鸣必出四星或以上服装' }}</p>

    <!-- ============ 深海回响活动签 1732,606 170×164 ============ -->
    <button class="wish-card" @click="openEcho" @mouseenter="play('echo-hover', { volume: 0.5 })">
      <img class="wc-ring" :src="asset(ui?.banner.wishN)" alt="" draggable="false" />
      <img class="wc-ring-h" :src="asset(ui?.banner.wishH)" alt="" draggable="false" />
      <img v-if="ui?.banner" class="wc-gift" :src="asset(ui.banner.giftFlower)" alt="" draggable="false" />
      <span class="wc-stars">
        <img v-for="n in 5" :key="n" :src="asset(ui?.detail.star)" alt="★" draggable="false" />
      </span>
      <span class="wc-txt">深海回响</span>
      <span class="wc-sub">{{ wishHint }}</span>
    </button>

    <!-- ============ 共鸣按钮（同一盒子 296×66，1224,937 / 1564,937） ============ -->
    <button class="pull-btn single" @click="pull(1)" @mouseenter="hoverRes(1)">
      <img :src="asset(ui?.btn.resSingle)" alt="共鸣一次" draggable="false" />
    </button>
    <button class="pull-btn ten" @click="pull(10)" @mouseenter="hoverRes(10)">
      <img :src="asset(ui?.btn.resTen)" alt="共鸣十次" draggable="false" />
    </button>

    <!-- ============ 左下角横排：收集进度 + 共鸣详情（金框容器），离屏幕边缘 18px ============ -->
    <span class="collect-progress num">{{ collect.owned }}/{{ collect.total }}</span>
    <button class="detail-btn" :class="{ on: showRules }" @click="toggleRules"
      @mouseenter="play('common-hover', { volume: 0.4 })">
      <img v-if="ui?.banner" class="db-bg" :src="asset(ui.banner.goldenEdge)" alt="" draggable="false" />
      <span class="db-txt">共鸣详情</span>
      <i v-if="inSoft" class="db-alert"></i>
    </button>

    <!-- ============ 套名横幅：全部套装横排，同屏 3 套，余下滚轮 / 拖动查看 ============ -->
    <div
      ref="platesEl"
      class="set-banners"
      :style="{ maskImage: platesMask, WebkitMaskImage: platesMask }"
      @wheel.prevent="onPlatesWheel"
      @scroll.passive="platesRev++"
      @pointerdown="onPlatesDown"
      @pointermove="onPlatesMove"
      @pointerup="onPlatesUp"
      @pointercancel="onPlatesUp"
      @pointerleave="onPlatesUp"
    >
      <div class="sb-track">
        <button v-for="st in bannerPlates" :key="st.id" class="set-banner"
          :title="st.name" @click="openPlate(st)">
          <img class="sb-plate" :src="asset(plateOf(st))" alt="" draggable="false" />
          <span class="sb-name">{{ st.name }}</span>
          <span class="sb-stars">
            <img v-for="n in st.star" :key="n" :src="asset(ui?.detail.star)" alt="★" draggable="false" />
          </span>
        </button>
      </div>
    </div>

    <!-- ============ 视频 / 静态背景切换键（与共鸣详情同排，间隔 15px，无红点） ============ -->
    <button class="switch-btn" :title="bgMode === 'video' ? '切换静态背景' : '切换动态背景'"
      @click="toggleBg" @mouseenter="play('common-hover', { volume: 0.4 })">
      <img v-if="ui?.banner" class="sw-n" :src="asset(ui.banner.switch)" alt="" draggable="false" />
      <img v-if="ui?.banner" class="sw-h" :src="asset(ui.banner.switchH)" alt="" draggable="false" />
    </button>

    <!-- 轻提示 -->
    <transition name="pop">
      <div v-if="hint" class="hint-toast">{{ hint }}</div>
    </transition>

    <transition name="pop">
      <div v-if="showRules && rules" class="prob-mask" @click.self="showRules = false">
      <div class="prob-panel">
        <!-- 弹窗美术：羊皮纸底（bg_01）+ 外圈金线（03_line）+ 内框（04_line / 01_line） -->
        <img v-if="ui?.banner" class="pw-outer" :src="asset(ui.banner.winLine3)" alt="" draggable="false" />
        <img v-if="ui?.banner" class="pw-bg" :src="asset(ui.banner.winBg)" alt="" draggable="false" />
        <img v-if="ui?.banner" class="pw-line4" :src="asset(ui.banner.winLine4)" alt="" draggable="false" />
        <img v-if="ui?.banner" class="pw-line1" :src="asset(ui.banner.winLine1)" alt="" draggable="false" />

        <div class="pp-body">
          <div class="pp-head">
            <h4>{{ detailTab === 'prob' ? '共鸣概率' : '抽取记录' }}</h4>
            <!-- 抽取记录分页：样式沿用玄学的圆钮，底色改淡蓝 -->
            <div v-if="detailTab === 'history' && pageCount > 1" class="hp-pager">
              <button class="hp-pg" :disabled="page <= 0" title="上一页" @click="turnPage(-1)">‹</button>
              <span class="hp-num num">{{ page + 1 }} <i>/</i> {{ pageCount }}</span>
              <button class="hp-pg" :disabled="page >= pageCount - 1" title="下一页" @click="turnPage(1)">›</button>
            </div>
            <button class="pp-x" @click="showRules = false">×</button>
          </div>

          <!-- ────────── 页签：抽取记录（本池最近 50 条，每页 10 条） ────────── -->
          <template v-if="detailTab === 'history'">
            <ul v-if="pagedPulls.length" class="ph-list">
              <li v-for="p in pagedPulls" :key="p.key" class="ph-item" :class="{ s5: p.star >= 5, s4: p.star === 4 }">
                <span class="ph-name">{{ p.name }}</span>
                <span class="ph-stars" :title="`${p.star}★`">
                  <img v-for="n in p.star" :key="n" :src="asset(ui?.detail.star)" alt="" draggable="false" />
                </span>
              </li>
            </ul>
            <p v-else class="pp-empty">本阁还没有抽取记录。抽一次就会出现在这里。</p>
            <p class="pp-note dim">
              仅显示「{{ store.banner?.name || '本阁' }}」最近 {{ RECENT_MAX }} 条（新 → 旧），每页 {{ PAGE_SIZE }} 条；各阁记录相互独立，清空本阁记录时会一并清掉。
            </p>
          </template>

          <template v-else>
          <div class="pp-pity">
            <!-- 纯 4★ 池没有 5★，保底条只显示 4★ -->
            <template v-if="!store.isPure4">
            <div class="pp-row">
              <span class="pp-k">距离 5★ 保底</span>
              <b class="num" :class="{ hot: inSoft }">{{ remain5 }} 抽</b>
            </div>
            <div class="pb-bar">
              <div class="pb-fill" :class="{ hot: inSoft }" :style="{ width: p5Pct + '%' }"></div>
              <div class="pb-soft" :style="{ left: softPct + '%' }"></div>
            </div>
            </template>
            <div class="pp-sub">
              <span>已抽 <b class="num">{{ store.pity.total }}</b></span>
              <span class="pp-sep"></span>
              <span>4★ <b class="num">{{ Math.min(p4, hard4) }}</b>/{{ hard4 }}</span>
            </div>
            <div class="pb-bar thin">
              <div class="pb-fill four" :style="{ width: p4Pct + '%' }"></div>
            </div>
          </div>
          <table class="pp-table">
            <thead><tr><th>星级</th><th>基础</th><th>综合</th></tr></thead>
            <tbody>
              <tr v-if="!store.isPure4">
                <td class="r5">5★</td>
                <td class="num">{{ (rules.rates.base['5'] * 100).toFixed(1) }}%</td>
                <td class="num">{{ (rules.rates.effective['5'] * 100).toFixed(2) }}%</td>
              </tr>
              <tr>
                <td class="r4">4★</td>
                <td class="num">{{ (rules.rates.base['4'] * 100).toFixed(2) }}%</td>
                <td class="num">{{ (rules.rates.effective['4'] * 100).toFixed(2) }}%</td>
              </tr>
              <tr>
                <td class="r3">3★</td>
                <td class="num">{{ (rules.rates.base['3'] * 100).toFixed(2) }}%</td>
                <td class="num">{{ (rules.rates.effective['3'] * 100).toFixed(2) }}%</td>
              </tr>
            </tbody>
          </table>
          <p v-if="store.isPure4" class="pp-note">
            本服装阁为纯四星服装阁：4★ 基础 {{ (rules.rates.base['4'] * 100).toFixed(1) }}%<template v-if="soft4">，第 {{ soft4 }} 抽起概率提升</template>，每 {{ hard4 }} 抽必出，含保底综合 {{ (rules.rates.effective['4'] * 100).toFixed(1) }}%。
          </p>
          <p v-else class="pp-note">
            5★ 第 {{ soft5 }} 抽起概率提升，第 {{ hard5 }} 抽必出；4★ 每 {{ hard4 }} 抽必出四星或以上。
          </p>
          <p class="pp-note dim">保底各阁独立，不跨阁继承。综合概率为长期期望值。</p>
          <div class="pp-echo">
            <span class="pe-k">深海回响</span>
            <span class="pe-v num">{{ store.tiers.filter((t) => t.claimed).length }}/{{ store.tiers.length }}</span>
            <span v-if="store.claimable" class="pe-dot">可领取</span>
          </div>
          </template>
        </div>

        <!-- 左右切换键：与主页彩蛋弹窗同一套圆钮 -->
        <template v-if="ui?.egg?.skipN">
          <button class="pn prev" title="上一页" @click.stop="switchDetailTab(-1)">
            <img class="pn-n" :src="asset(ui.egg.skipN)" alt="" draggable="false" />
            <img class="pn-h" :src="asset(ui.egg.skipH)" alt="" draggable="false" />
          </button>
          <button class="pn next" title="下一页" @click.stop="switchDetailTab(1)">
            <img class="pn-n" :src="asset(ui.egg.skipN)" alt="" draggable="false" />
            <img class="pn-h" :src="asset(ui.egg.skipH)" alt="" draggable="false" />
          </button>
        </template>
      </div>
      </div>
    </transition>

    <!-- ============ 深海回响 ============ -->
    <EchoView v-if="showEcho" @close="showEcho = false" />

    <!-- ============ 十连「恭喜获得」弹窗（结果页返回时自动弹） ============ -->
    <RewardPopup v-if="store.rewardOpen" />

    <!-- ============ 套装详情弹层（按主属性换肤，版式按用户的 pxdesk 精修） ============ -->
    <transition name="sheet">
      <div v-if="showDetail" class="sheet-mask" @click.self="showDetail = null">
        <div class="sheet" :style="sheetTheme">
          <!-- 底：活动窗口背景 -->
          <img v-if="ui?.popup" class="sh-bg" :src="asset(ui.popup.bg)" alt="" draggable="false" />
          <!-- 两侧垂挂飘带 + 左侧光柱 -->
          <img v-if="ui?.popup" class="sh-pocky sh-pocky-l" :src="asset(ui.popup.pocky)" alt="" draggable="false" />
          <img v-if="ui?.popup" class="sh-pocky sh-pocky-r" :src="asset(ui.popup.pocky)" alt="" draggable="false" />
          <img v-if="ui?.popup" class="sh-light" :src="asset(ui.popup.light)" alt="" draggable="false" />

          <!-- 顶部：左右飘带 + 暗色光晕 + 名字发光底 + 五星 + 套装名 -->
          <img v-if="ui?.popup" class="sh-ribbon sh-ribbon-l" :src="asset(ui.popup.ribbon1)" alt="" draggable="false" />
          <img v-if="ui?.popup" class="sh-ribbon sh-ribbon-r" :src="asset(ui.popup.ribbon2)" alt="" draggable="false" />
          <img v-if="ui?.popup" class="sh-glow" :src="asset(ui.popup.glow)" alt="" draggable="false" />
          <div class="sh-stars">
            <img v-for="n in showDetail.star" :key="n" :src="asset(ui?.popup.star)" alt="★" draggable="false" />
          </div>
          <!-- 名字底：border-image 九宫格，两头保持原样、只拉伸中间，长套名不会溢出 -->
          <div class="sh-namebox">
            <span v-if="ui?.popup" class="sh-np sh-np-base"
              :style="{ '--np': `url('${asset(ui.popup.nameN)}')` }"></span>
            <span v-if="ui?.popup" class="sh-np sh-np-glow"
              :style="{ '--np': `url('${asset(ui.popup.nameH)}')` }"></span>
            <h2 class="sh-name">{{ showDetail.name }}</h2>
          </div>

          <!-- 左：属性插画 + 立绘 + 初始等级图标 -->
          <img v-if="ui?.popup" class="sh-artbg" :src="asset(ui?.popup.art[attrKey])" alt="" draggable="false" />
          <!-- 立绘按各套装的画幅不同，直接放会顶出照片框。外面套一层「照片框同尺寸 + overflow:hidden」的容器，超出部分裁掉 -->
          <div class="sh-hero-box">
            <img class="sh-hero" :class="{ s4: showDetail.star === 4 }"
              :src="asset(showDetail.assets.portrait)" :alt="showDetail.name" draggable="false" />
          </div>
          <img v-if="ui?.popup" class="sh-stage sh-stage-hero"
            :src="asset(stageIcon('初始', stageUnlocked('初始')))" alt="" draggable="false" />

          <!-- 中：方框 + 圆形收集进度 -->
          <img v-if="ui?.popup" class="sh-slotframe" :src="asset(ui.popup.slotFrame)" alt="" draggable="false" />
          <img v-if="ui?.popup" class="sh-slotbg" :src="asset(ui.popup.slotBg)" alt="" draggable="false" />
          <div class="sh-ring" :title="`已收集 ${setProgress(showDetail).owned} / ${setProgress(showDetail).total}`">
            <svg viewBox="0 0 200 200" class="sh-ring-svg">
              <circle class="ring-track" cx="100" cy="100" r="86" />
              <circle class="ring-fill" cx="100" cy="100" r="86"
                :stroke-dasharray="`${ringDash} 999`" transform="rotate(-90 100 100)" />
            </svg>
            <span class="sh-ring-txt num">{{ setProgress(showDetail).owned }}/{{ setProgress(showDetail).total }}</span>
          </div>

          <!-- 右：紫纸 + 三个属性胶囊 + 套装文案 -->
          <img v-if="ui?.popup" class="sh-paper" :src="asset(ui?.popup.plate[attrKey])" alt="" draggable="false" />
          <div class="sh-labels">
            <span v-for="t in showDetail.styles" :key="t" class="sh-label" :class="{ main: t === attrName }">
              <img :src="asset(labelOf(t))" alt="" draggable="false" />
              <b>{{ t }}</b>
            </span>
          </div>
          <!-- 属性胶囊右侧：跳到服装图鉴的对应套装 -->
          <button v-if="ui?.btn?.jump" class="sh-jump" title="前往服装图鉴"
            @click.stop="jumpToClothes"
            @mouseenter="play('common-hover', { volume: 0.4 })">
            <img :src="asset(ui.btn.jump)" alt="前往服装图鉴" draggable="false" />
          </button>

          <p class="sh-desc">{{ showDetail.desc || '暂无套装文案' }}</p>

          <!-- 底部：进化形态卡 -->
          <div class="sh-forms">
            <button v-for="(f, i) in formCards" :key="f.name" class="sh-form"
              :class="{ on: i === formIdx - 1, locked: !stageUnlocked(f.name) }"
              :title="`${f.setName || f.name}${stageUnlocked(f.name) ? '' : '（未解锁）'}`"
              @click="formIdx = i + 1; play('paper-flip', { volume: 0.45 })">
              <img v-if="ui?.popup" class="sh-form-card" :src="asset(ui.popup.formCard)" alt="" draggable="false" />
              <span class="sh-form-clip">
                <img class="sh-form-pic" :src="asset(f.src)" :alt="f.name" loading="lazy" draggable="false" />
              </span>
              <img v-if="ui?.popup" class="sh-form-glow" :src="asset(ui.popup.slotFrame)" alt="" draggable="false" />
              <img v-if="ui?.popup" class="sh-stage sh-stage-form"
                :src="asset(stageIcon(f.name, stageUnlocked(f.name)))" alt="" draggable="false" />
              <span class="sh-form-nm">{{ f.name }}</span>
            </button>
          </div>

          <!-- 底：装饰带 + 分隔线 + 菱形 -->
          <img v-if="ui?.popup" class="sh-band" :src="asset(ui.popup.band)" alt="" draggable="false" />
          <img v-if="ui?.popup" class="sh-line sh-line-l" :src="asset(ui.popup.line2)" alt="" draggable="false" />
          <img v-if="ui?.popup" class="sh-line sh-line-r" :src="asset(ui.popup.line1)" alt="" draggable="false" />
          <img v-if="ui?.popup" class="sh-diamond" :src="asset(ui.popup.diamond)" alt="" draggable="false" />

          <button class="sheet-x" aria-label="关闭" @click="showDetail = null"
            @mouseenter="play('common-hover', { volume: 0.4 })">
            <img v-if="ui?.btn" class="sx-n" :src="asset(ui.btn.closeN)" alt="" draggable="false" />
            <img v-if="ui?.btn" class="sx-h" :src="asset(ui.btn.closeH)" alt="" draggable="false" />
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
<style scoped>
/* 共鸣页 */
.banner {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
}

/* 背景 */
.bg-wrap {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.bg-img {
  position: absolute;
  display: block;
}
.bg-still {
  left: -320px;
  top: -180px;
  width: 2560px;
  height: 1440px;
  max-width: none;
  object-fit: fill;
}
.bg-video {
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  object-fit: fill;
}
/* 无背景素材的池 */
.bg-none {
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  background:
    radial-gradient(1200px 760px at 68% 32%, rgba(255, 236, 248, 0.34), transparent 62%),
    radial-gradient(900px 620px at 20% 80%, rgba(176, 216, 236, 0.26), transparent 60%),
    linear-gradient(155deg, #262738 0%, #393850 38%, #554e6c 66%, #7b7290 100%);
}
/* 压暗 */
.bg-scrim {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(8, 6, 12, 0.66) 0%, rgba(8, 6, 12, 0.22) 22%, transparent 42%),
    linear-gradient(180deg, rgba(8, 6, 12, 0.5) 0%, transparent 16%),
    linear-gradient(0deg, rgba(8, 6, 12, 0.62) 0%, transparent 24%);
}

/* 退出键 */
.back-btn {
  position: absolute;
  left: 21px;
  top: 2px;
  width: 95px;
  height: 96px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  z-index: 20;
  transition: filter 0.16s ease;
}
.bb-n, .bb-h {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.16s ease;
}
.bb-h { opacity: 0; }
.back-btn:hover { filter: drop-shadow(0 0 12px rgba(255, 214, 140, 0.55)); }
.back-btn:hover .bb-h { opacity: 1; }

/* 页签「共鸣」 */
.page-title {
  position: absolute;
  left: 118px;
  top: 31px;
  height: 40px;
  display: flex;
  align-items: center;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 38px;
  line-height: 1;
  letter-spacing: 0.04em;
  color: #f5f1e6;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
  z-index: 20;
}

/* 货币栏 */
.wallet {
  position: absolute;
  left: 1331px;
  top: 23px;
  width: 546px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  z-index: 20;
}
.w-bg {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border-style: solid;
  border-width: 0 28px;
  border-color: transparent;
  border-image-source: var(--w-bg-src);
  border-image-slice: 0 28 0 28 fill;
  border-image-width: 0 28px;
  border-image-outset: 0;
  border-image-repeat: stretch;
  opacity: 0.6;
  pointer-events: none;
}
/* 金线 */
.w-line {
  position: absolute;
  left: -22.2px;
  top: -20.8px;
  width: 629.8px;
  height: 101px;
  max-width: none;
  object-fit: fill;
  pointer-events: none;
  opacity: 0.9;
}
.w-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  padding: 0 6px;
  border-radius: 20px;
  transition: background 0.16s ease;
}
.w-item:hover { background: rgba(255, 255, 255, 0.08); }
.w-item img {
  width: 34px;
  height: 34px;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.55));
}
.w-item b {
  font-size: 26px;
  font-weight: 400;
  color: #f2f5fb;
  letter-spacing: 0.02em;
}
.w-add {
  width: 26px;
  height: 26px;
  margin-left: 4px;
  display: grid;
  place-items: center;
  border: 0;
  background: none;
  font-style: normal;
  font-size: 30px;
  line-height: 1;
  color: #ffd98a;
  text-shadow: 0 0 10px rgba(255, 200, 110, 0.6);
}
.w-sep {
  position: relative;
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.16);
}

/* 服装阁列表 */
.pool-list {
  position: absolute;
  left: 14px;
  top: 99px;
  width: 322px;
  height: 713px;
  padding: 24px 0 24px 30px;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 15;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.pool-list::-webkit-scrollbar { width: 0; height: 0; display: none; }
.pool-inner {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 24px;
}
/* 未放大 */
.pool-item {
  position: relative;
  flex: 0 0 auto;
  width: 242px;
  height: 110px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  /* 放大 */
  transform-origin: 20% 50%;
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 1;
}
.pool-item.big {
  transform: scale(1.1281, 1.1455);
  z-index: 3;
}
.pi-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 2px;
}
/* 每个缩略图下方都有金线装饰 */
.pi-line {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 49px;
  object-fit: fill;
  pointer-events: none;
}
/* 悬停 / 选中 */
.pi-frame {
  position: absolute;
  left: -13.67px;
  top: -13.08px;
  width: 267.3px;
  height: 131.9px;
  max-width: none;
  object-fit: fill;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease;
}
.pool-item.big .pi-frame { opacity: 1; }
/* 未放大的整体压暗一点 */
.pool-item::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 2px;
  background: rgba(8, 6, 12, 0.3);
  pointer-events: none;
  transition: background 0.2s ease;
}
.pool-item.big::after { background: none; }
/* 类型标签 */
.pi-tag {
  position: absolute;
  left: -8.2px;
  top: -9.5px;
  width: 88.7px;
  height: 41px;
  object-fit: fill;
  pointer-events: none;
}
.pi-tag-txt {
  position: absolute;
  left: -12.2px;
  top: -2.2px;
  width: 76px;
  height: 26px;
  display: grid;
  place-items: center;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 17px;
  line-height: 1;
  letter-spacing: 0.04em;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
  pointer-events: none;
}
/* 服装阁名 */
.pi-name {
  position: absolute;
  left: 5px;
  bottom: 4px;
  max-width: calc(100% - 10px);
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 20px;
  line-height: 1;
  color: #f6f2e8;
  letter-spacing: 0.01em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
  pointer-events: none;
}

/* 服装阁名称艺术字 */
.title-art {
  position: absolute;
  left: 1484px;
  top: 77.5px;
  width: 418px;
  height: 214px;
  object-fit: contain;
  pointer-events: none;
  z-index: 12;
  filter: drop-shadow(0 4px 18px rgba(0, 0, 0, 0.45));
}
.title-text {
  position: absolute;
  left: 1507px;
  /* 与 .title-art 同一条视觉中线 */
  top: 145px;
  margin: 0;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 62px;
  font-weight: 400;
  letter-spacing: 0.06em;
  color: #f7ecd2;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.7), 0 0 40px rgba(255, 210, 130, 0.35);
  z-index: 12;
}

.rule-text {
  position: absolute;
  left: 1504px;
  top: 289px;
  width: 380px;
  margin: 0;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 24px;
  line-height: 32px;
  letter-spacing: 0.02em;
  color: #f6f1e5;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.85);
  z-index: 12;
}

/* 深海回响活动签 */
.wish-card {
  position: absolute;
  left: 1738px;
  /* 抽取提示盒底 */
  top: 338px;
  width: 170px;
  height: 164px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  z-index: 15;
}
/* 圆环素材 */
.wc-ring, .wc-ring-h {
  position: absolute;
  left: 26px;
  top: -14px;
  width: 109px;
  height: 120px;
  object-fit: fill;
  transition: opacity 0.16s ease;
}
.wc-ring-h { opacity: 0; }
.wish-card:hover .wc-ring-h { opacity: 1; }
/* 礼盒图标 */
.wc-gift {
  position: absolute;
  left: 51px;
  top: 5px;
  width: 70px;
  height: 70px;
  object-fit: fill;
  pointer-events: none;
  filter: drop-shadow(0 4px 12px rgba(255, 190, 140, 0.45));
}
/* 5 颗星（素材本色金，star.webp 86×87 内容 65×66），紧贴圆环下沿 */
.wc-stars {
  position: absolute;
  left: 0;
  right: 0;
  top: 86px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.wc-stars img {
  width: 24px;
  height: 24px;
  object-fit: contain;
  margin-right: -9px;
  filter: drop-shadow(0 0 5px rgba(255, 210, 140, 0.7));
}
.wc-stars img:last-child { margin-right: 0; }
.wc-txt {
  position: absolute;
  left: 0;
  right: 0;
  top: 112px;
  text-align: center;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 26px;
  line-height: 1;
  color: #fff;
  letter-spacing: 0.02em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.85);
  pointer-events: none;
}
.wc-sub {
  position: absolute;
  left: 0;
  right: 0;
  top: 142px;
  text-align: center;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 20px;
  line-height: 1;
  color: #f3e6c8;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.85);
  white-space: nowrap;
  pointer-events: none;
}

/* 共鸣按钮 */
.pull-btn {
  position: absolute;
  top: 987px; /* 下边缘留 22px：1080 - 22 - 71 */
  width: 296px;
  height: 71px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  z-index: 18;
  transition: filter 0.16s ease;
}
.pull-btn.single { left: 1296px; }
.pull-btn.ten { left: 1602px; } /* 右边缘 1898 = 1920-22；与单抽间隔 10px */
.pull-btn img {
  display: block;
  width: 296px;
  height: auto;
  max-width: none;
  transition: filter 0.16s ease, transform 0.12s ease;
}
.pull-btn:hover { filter: drop-shadow(0 0 22px rgba(255, 214, 140, 0.55)) brightness(1.08); }
.pull-btn:active img { transform: scale(0.985); }

/* 本服装阁服装收集进度 */
.collect-progress {
  position: absolute;
  left: 18px;
  top: 986px;
  width: 187px;
  text-align: center;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 22px;
  line-height: 26px;
  color: #f6f0e2;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.85);
  z-index: 19;
  pointer-events: none;
}
/* 共鸣详情 */
.detail-btn {
  position: absolute;
  left: 18px;
  top: 1017px;
  width: 187px;
  height: 45px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  z-index: 18;
}
/* 金框素材 */
.db-bg {
  position: absolute;
  left: -10.4px;
  top: -7.4px;
  width: 208.6px;
  height: 62.6px;
  max-width: none;
  object-fit: fill;
  pointer-events: none;
  transition: filter 0.16s ease;
}
/* 文字居中基准 = 金框**内容矩形 */
.db-txt {
  position: absolute;
  left: 0;
  top: 0.05px;
  width: 187px;
  height: 42.5px;
  display: grid;
  place-items: center;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 22px;
  letter-spacing: 0.06em;
  color: #f6f0e2;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  transition: color 0.16s ease;
}
.detail-btn:hover .db-bg, .detail-btn.on .db-bg {
  filter: drop-shadow(0 0 14px rgba(255, 214, 140, 0.7)) brightness(1.15);
}
.detail-btn:hover .db-txt, .detail-btn.on .db-txt { color: #ffe6b0; }
.db-alert {
  position: absolute;
  right: 8px;
  top: 8px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff5a5a;
  box-shadow: 0 0 8px rgba(255, 90, 90, 0.9);
}

/* 视频 / 静态背景切换键 */
.switch-btn {
  position: absolute;
  left: 208px;
  top: 1012px;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  z-index: 18;
  transition: filter 0.16s ease;
}
.switch-btn img {
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  object-fit: contain;
  transition: opacity 0.16s ease;
}
.sw-h { opacity: 0; }
.switch-btn:hover .sw-h { opacity: 1; }
.switch-btn:hover { filter: drop-shadow(0 0 14px rgba(255, 214, 140, 0.6)); }

/* 套名横幅 */
.set-banners {
  position: absolute;
  left: 276px;
  top: 946px;
  width: 920px;
  height: 112px;
  padding: 4px 0;
  overflow: hidden;
  cursor: grab;
  z-index: 18;
  user-select: none;
}
.set-banners:active {
  cursor: grabbing;
}
.sb-track {
  display: flex;
  gap: 10px;
  width: max-content;
}
.set-banner {
  position: relative;
  display: block;
  width: 300px;
  height: 86px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  transition: filter 0.16s ease;
}
.set-banner:hover { filter: drop-shadow(0 0 12px rgba(255, 214, 140, 0.6)) brightness(1.08); }
/* 必须写死宽度 */
.sb-plate {
  display: block;
  width: 300px;
  height: 86px;
  max-width: none;
  object-fit: fill;
}
.sb-name {
  position: absolute;
  left: 64px;
  top: 0;
  height: 86px;
  display: flex;
  align-items: center;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 27px;
  line-height: 1;
  letter-spacing: 0.02em;
  color: #fff;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
  pointer-events: none;
}
.sb-stars {
  position: absolute;
  /* 对齐名称牌可见区的左缘 */
  left: 40px;
  top: 72px;
  display: flex;
  pointer-events: none;
}
.sb-stars img {
  width: 32.4px;
  height: 32.4px;
  max-width: none;
  object-fit: contain;
  margin-right: -12px;
  filter: drop-shadow(0 0 6px rgba(255, 214, 150, 0.8));
}
.sb-stars img:last-child { margin-right: 0; }

/* 轻提示 */
.hint-toast {
  position: absolute;
  left: 50%;
  bottom: 180px;
  transform: translateX(-50%);
  padding: 10px 22px;
  border-radius: 999px;
  background: rgba(10, 8, 16, 0.86);
  border: 1px solid rgba(255, 214, 140, 0.3);
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 16px;
  color: #f0e8d6;
  white-space: nowrap;
  z-index: 40;
}

/* ============================================================
 * 共鸣详情弹窗：美术全部走解包素材
 *   bg_01 836×512 羊皮纸 / bg_01_line、bg_04_line 内框金线 / bg_03_line 1072×720 外圈金线（缩到 900×604）
 * ============================================================ */
/* 遮罩 */
.prob-mask {
  position: absolute;
  inset: 0;
  background: rgba(6, 4, 10, 0.6);
  backdrop-filter: blur(2px);
  z-index: 40;
}
.prob-panel {
  position: absolute;
  left: 542px;
  top: 284px;
  width: 836px;
  height: 512px;
  padding: 0;
  border: 0;
  background: none;
  filter: drop-shadow(0 24px 60px rgba(0, 0, 0, 0.72));
  z-index: 40;
}
.pw-outer, .pw-bg, .pw-line4, .pw-line1 {
  position: absolute;
  object-fit: fill;
  max-width: none;
  pointer-events: none;
}
/* 外圈 */
/* 三张线框素材的**内容都不在画布正中 */
.pw-outer { left: -32px; top: -48.5px; width: 904px; height: 606.5px; }
.pw-bg { inset: 0; width: 100%; height: 100%; }
.pw-line4 { left: -1px; top: 0; width: 839px; height: 512px; }
.pw-line1 { left: 9.1px; top: 16.1px; width: 822.6px; height: 485.5px; }

/* 内容区 */
.pp-body {
  position: absolute;
  left: 62px;
  top: 48px;
  right: 62px;
  bottom: 42px;
  display: flex;
  flex-direction: column;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  color: #4a3618;
}
.pp-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.pp-head h4 {
  margin: 0;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 26px;
  font-weight: 400;
  letter-spacing: 0.22em;
  color: #6b4a16;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55);
}
.pp-x {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 24px;
  line-height: 1;
  color: #8a6a3a;
}
.pp-x:hover { color: #6b4a16; background: rgba(120, 88, 40, 0.14); }
.pp-pity { padding-bottom: 12px; border-bottom: 1px solid rgba(120, 88, 40, 0.22); }
.pp-row { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 8px; }
.pp-k { font-size: 17px; letter-spacing: 0.1em; color: #7a5f36; }
.pp-row b { font-size: 24px; font-weight: 400; color: #3f2c12; }
.pp-row b.hot { color: #b06a10; text-shadow: 0 0 12px rgba(214, 150, 40, 0.5); }
.pp-sub { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 15px; color: #7a5f36; }
.pp-sub b { color: #4a3618; font-weight: 400; }
.pp-sep { width: 1px; height: 12px; background: rgba(120, 88, 40, 0.3); }

.pb-bar { position: relative; height: 8px; border-radius: 999px; background: rgba(120, 88, 40, 0.18); }
.pb-bar.thin { height: 4px; margin-top: 7px; }
.pb-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #a98a58, #d9b878);
  transition: width 0.5s cubic-bezier(0.22, 1, 0.36, 1);
}
.pb-fill.hot { background: linear-gradient(90deg, #d09020, #f0c060); box-shadow: 0 0 12px rgba(214, 150, 40, 0.55); }
.pb-fill.four { background: linear-gradient(90deg, #8a6ea8, #b89ad0); }
.pb-soft {
  position: absolute;
  top: -4px;
  width: 1px;
  height: 16px;
  background: rgba(140, 96, 30, 0.8);
  box-shadow: 0 0 6px rgba(180, 130, 40, 0.6);
}

/* ────────── 抽取记录 ────────── */
.ph-list {
  flex: 1 1 auto;
  margin: 0;
  padding: 0 4px 0 0;
  list-style: none;
  overflow-y: auto;
  scrollbar-width: thin;
}
.ph-item {
  display: flex;
  align-items: center;
  gap: 12px;
  /* 10 行必须正好落在列表可视区内（332px）：34 → 33，否则底部会冒出 8px 滚动条 */
  height: 33px;
  padding: 0 8px;
  border-bottom: 1px solid rgba(120, 88, 40, 0.14);
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 18px;
  color: #5b4423;
}
.ph-item.s5 { background: linear-gradient(90deg, rgba(255, 226, 150, 0.4), rgba(255, 226, 150, 0) 78%); }
.ph-item.s4 { background: linear-gradient(90deg, rgba(198, 178, 255, 0.34), rgba(198, 178, 255, 0) 72%); }

/* 抽取记录分页 */
.hp-pager {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: 18px;
  margin-right: auto;
}
.hp-pg {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(108, 146, 190, 0.55);
  background: linear-gradient(180deg, #f1f8ff, #cfe2f6);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.85),
    0 1px 3px rgba(62, 96, 136, 0.22);
  color: #3d6389;
  font-size: 21px;
  line-height: 1;
  cursor: pointer;
  transition: all 160ms ease;
}
.hp-pg:hover:not(:disabled) {
  background: linear-gradient(180deg, #ffffff, #dcecfc);
  border-color: rgba(84, 128, 178, 0.8);
  color: #2c5073;
  transform: translateY(-1px);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.9),
    0 3px 8px rgba(62, 96, 136, 0.28);
}
.hp-pg:disabled {
  /* 别压得太狠 */
  opacity: 0.45;
  color: rgba(61, 99, 137, 0.55);
  cursor: default;
}
.hp-num {
  min-width: 52px;
  text-align: center;
  font-size: 16px;
  letter-spacing: 0.06em;
  color: #3f5f80;
}
.hp-num i {
  font-style: normal;
  margin: 0 3px;
  opacity: 0.55;
}
.ph-name {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
/* 星级 */
.ph-stars {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 1px;
  padding: 2px 8px 1px;
  border-radius: 8px;
  background: linear-gradient(180deg, rgba(96, 68, 30, 0.22), rgba(76, 50, 18, 0.32));
  box-shadow:
    inset 0 1px 2px rgba(70, 44, 12, 0.26),
    0 1px 0 rgba(255, 246, 224, 0.4);
}
.ph-stars img {
  width: 19px;
  height: 19px;
  max-width: none;
  object-fit: contain;
  filter:
    drop-shadow(0 0 1.5px rgba(52, 30, 6, 0.95))
    drop-shadow(0 1px 1px rgba(44, 24, 4, 0.7))
    brightness(1.22) contrast(1.1) saturate(1.2);
}
.pp-empty {
  flex: 1 1 auto;
  display: grid;
  place-items: center;
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.08em;
  color: rgba(110, 82, 40, 0.6);
}

/* 左右切换键 */
.pn {
  position: absolute;
  top: 50%;
  width: 74px;
  height: 74px;
  margin-top: -37px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.5));
  transition: filter 0.16s ease, transform 0.16s ease;
}
.pn.prev { left: -100px; transform: scaleX(-1); }
.pn.next { right: -100px; }
.pn:hover { filter: drop-shadow(0 0 16px rgba(255, 224, 150, 0.85)) brightness(1.06); }
.pn:active { transform: translateY(2px); }
.pn.prev:active { transform: scaleX(-1) translateY(2px); }
.pn img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
  transition: opacity 0.14s ease;
}
.pn .pn-h { opacity: 0; }
.pn:hover .pn-h { opacity: 1; }
.pn:hover .pn-n { opacity: 0; }

.pp-table { width: 100%; margin-top: 12px; border-collapse: collapse; font-size: 17px; }
.pp-table th {
  padding: 6px;
  text-align: right;
  font-weight: 400;
  font-size: 14px;
  letter-spacing: 0.1em;
  color: #8a6a3a;
  border-bottom: 1px solid rgba(120, 88, 40, 0.24);
}
.pp-table th:first-child { text-align: left; }
.pp-table td { padding: 7px 6px; text-align: right; color: #4a3618; border-bottom: 1px solid rgba(120, 88, 40, 0.12); }
.pp-table td:first-child { text-align: left; }
.pp-table .r5 { color: #c07a12; }
.pp-table .r4 { color: #7a5aa0; }
.pp-table .r3 { color: #4a6a8a; }

.pp-note { margin: 10px 0 0; font-size: 14px; line-height: 1.75; color: #6b543a; }
.pp-note.dim { color: #8a7050; }
.pp-echo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid rgba(120, 88, 40, 0.22);
  font-size: 15px;
}
.pe-k { letter-spacing: 0.12em; color: #7a5f36; }
.pe-v { color: #4a3618; }
.pe-dot { margin-left: auto; color: #3f7a4a; }
.pe-dot::before {
  content: '';
  display: inline-block;
  width: 6px; height: 6px;
  margin-right: 4px;
  border-radius: 50%;
  background: #3f7a4a;
  box-shadow: 0 0 8px rgba(63, 122, 74, 0.8);
  vertical-align: middle;
}

.pop-enter-active, .pop-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(10px); }

/* 套装详情弹层 */
.sheet-mask {
  position: absolute;
  inset: 0;
  z-index: 120;
  display: grid;
  place-items: center;
  background: rgba(4, 5, 10, 0.72);
  backdrop-filter: blur(5px);
}
.sheet {
  position: relative;
  width: 1400px;
  height: 820px;
  overflow: hidden;
  border-radius: 12px;
}
.sheet img { position: absolute; max-width: none; }

/* 底 */
.sh-bg {
  /* pxdesk 里 */
  left: 0; top: 0;
  width: 1400px; height: 820px;
  object-fit: fill;
}
.sh-pocky { width: 63px; height: 602px; top: 125px; object-fit: fill; opacity: 0.95; }
.sh-pocky-l { left: 75px; }
.sh-pocky-r { left: 1282px; transform: scaleX(-1); }
.sh-light { left: 179px; top: -7px; width: 112px; height: 410px; object-fit: fill; opacity: 0.75; }

/* 顶部 */
.sh-ribbon {
  top: 68px; height: 76px;
  object-fit: fill; opacity: 0.9;
  transform: scaleY(-1);
}
.sh-ribbon-l { left: 88px; width: 461px; }
.sh-ribbon-r { left: 890px; width: 425px; }
.sh-glow { left: 500px; top: -9px; width: 429px; height: 237px; object-fit: fill; opacity: 0.55; }
/* 名字底 */
.sh-namebox {
  position: absolute;
  left: 714px; top: 52px;
  min-width: 340px; height: 150px;
  max-width: 640px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 60px;
}
.sh-np {
  position: absolute;
  inset: 0;
  border-style: solid;
  border-width: 36px;
  border-image-slice: 36 fill;
  border-image-width: 36px;
  border-image-repeat: stretch;
  border-image-source: var(--np);
  pointer-events: none;
}
.sh-np-base { opacity: 0.92; }
/* 常驻高光 */
.sh-np-glow { mix-blend-mode: screen; opacity: 0.55; }
.sh-stars {
  position: absolute;
  left: 549px; top: 22px;
  width: 330px; height: 52px;
  display: flex; align-items: center; justify-content: center;
  pointer-events: none;
}
.sh-stars img {
  position: static;
  width: 52px; height: 52px;
  object-fit: contain;
  margin-right: -19px;
  filter: drop-shadow(0 0 8px rgba(255, 220, 160, 0.85));
}
.sh-stars img:last-child { margin-right: 0; }
.sh-name {
  position: relative;
  margin: 0;
  white-space: nowrap;
  text-align: center;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 40px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: 0.04em;
  color: #fff;
  text-shadow: 0 2px 10px rgba(120, 60, 20, 0.65), 0 0 22px rgba(255, 214, 150, 0.5);
  pointer-events: none;
}

/* 左 */
.sh-artbg {
  left: 124px; top: 183px;
  width: 311px; height: 502px;
  object-fit: cover;
  border-radius: 10px;
  opacity: 0.95;
}
/* 立绘裁切框 */
.sh-hero-box {
  position: absolute;
  left: 124px; top: 183px;
  width: 311px; height: 502px;
  overflow: hidden;
  border-radius: 10px;
  z-index: 2;
  pointer-events: none;
}
.sh-hero {
  /* 坐标系相对裁切框 */
  left: -43px; top: 0;
  width: 352px; height: 500px;
  object-fit: cover;
  object-position: 50% 0;
  filter: drop-shadow(0 10px 24px rgba(60, 20, 40, 0.45));
}
.sh-hero.s4 { left: -14px; }
/* 进化等级图标 */
.sh-stage { object-fit: contain; pointer-events: none; }
.sh-stage-hero { left: 81px; top: 183px; width: 70px; height: 70px; }

/* 中 */
.sh-slotframe { left: 446px; top: 171px; width: 269px; height: 268px; object-fit: fill; }
/* 方框里的白色圆角板 */
.sh-slotbg { left: 444px; top: 170px; width: 273px; height: 273px; object-fit: fill; opacity: 0.55; }
/* 中央 */
.sh-ring {
  position: absolute;
  left: 480px; top: 205px;
  width: 200px; height: 200px;
  display: grid;
  place-items: center;
}
.sh-ring-svg { position: absolute; inset: 0; width: 200px; height: 200px; overflow: visible; }
.ring-track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.5);
  stroke-width: 4;
}
.ring-fill {
  fill: none;
  stroke: #ffe9a8;
  stroke-width: 5;
  stroke-linecap: round;
  filter: drop-shadow(0 0 6px rgba(255, 226, 150, 0.9));
  transition: stroke-dasharray 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}
.sh-ring-txt {
  position: relative;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 46px;
  letter-spacing: 0.02em;
  color: #fff8e6;
  text-shadow: 0 2px 10px rgba(120, 50, 60, 0.55);
}

/* 右 */
.sh-paper { left: 729px; top: 154px; width: 577px; height: 331px; object-fit: fill; }
.sh-labels {
  position: absolute;
  left: 742px; top: 189px;
  display: flex; gap: 17px;
  pointer-events: none;
}
.sh-label {
  position: relative;
  width: 123px; height: 49px;
  display: grid; place-items: center;
}
.sh-label img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }
.sh-label b {
  position: relative;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 20px;
  font-weight: 400;
  letter-spacing: 0.08em;
  color: #6a4a3a;
}
.sh-label.main b { color: #b03a5a; }
/* 跳转服装图鉴 */
.sh-jump {
  position: absolute;
  left: 1160px; top: 176px;
  width: 74px; height: 74px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  filter: drop-shadow(0 4px 12px rgba(90, 40, 70, 0.35));
  transition: filter 0.16s ease, transform 0.16s ease;
}
.sh-jump img {
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  max-width: none;
  object-fit: contain;
}
.sh-jump:hover {
  filter: drop-shadow(0 0 14px rgba(255, 232, 178, 0.95)) brightness(1.14);
  transform: translateY(-2px);
}
.sh-jump:active { transform: translateY(1px); }

.sh-desc {
  position: absolute;
  left: 758px; top: 268px;
  width: 516px; height: 158px;
  margin: 0;
  padding-right: 6px;
  overflow-y: auto;
  font-family: 'FangSong', '仿宋', 'STFangsong', 'FZFangSong-Z02', 'Noto Serif SC', serif;
  font-size: 30px;
  line-height: 1.25;
  letter-spacing: 0.01em;
  color: #fdf7f2;
  text-shadow: 0 1px 3px rgba(70, 40, 60, 0.55);
}
.sh-desc::-webkit-scrollbar { width: 4px; }
.sh-desc::-webkit-scrollbar-thumb { background: rgba(70, 50, 60, 0.3); border-radius: 2px; }

/* 底部形态卡 */
.sh-forms {
  position: absolute;
  left: 484px; top: 452px;
  display: flex; gap: 37px;
  z-index: 4;
}
.sh-form {
  position: relative;
  width: 164px; height: 244px;
  padding: 0; border: 0; background: none;
  cursor: var(--nk-cursor, auto), pointer;
}
.sh-form-card {
  left: 14px; top: 6px;
  width: 151px; height: 244px;
  object-fit: fill;
  opacity: 0.9;
}
/* 形态缩略图裁切框 */
.sh-form-clip {
  position: absolute;
  left: 14px; top: 6px;
  width: 151px; height: 244px;
  overflow: hidden;
  border-radius: 4px;
  pointer-events: none;
}
.sh-form-pic {
  position: absolute;
  /* 相对裁切框的偏移 */
  left: -14px; top: -6px;
  width: 164px; height: 240px;
  object-fit: cover;
  object-position: 50% 0;
  border-radius: 4px;
  transition: transform 0.16s ease, filter 0.16s ease;
  filter: brightness(0.86) saturate(0.95);
}
.sh-form:hover .sh-form-pic { transform: translateY(-3px); filter: brightness(1) saturate(1.05); }
/* 悬停高光 */
.sh-form-glow {
  left: 0; top: 0;
  width: 164px; height: 244px;
  object-fit: fill;
  opacity: 0;
  transition: opacity 0.16s ease;
  pointer-events: none;
}
.sh-form:hover .sh-form-glow { opacity: 1; }
.sh-form.locked .sh-form-pic { filter: brightness(0.74) saturate(0.68); }
.sh-form.locked .sh-form-nm { color: rgba(255, 255, 255, 0.6); }
.sh-form.on .sh-form-pic {
  filter: brightness(1.05) saturate(1.08);
}
/* 选中描边移到裁切框上 */
.sh-form.on .sh-form-clip {
  box-shadow: 0 0 0 2px rgba(var(--attr), 0.85), 0 10px 22px rgba(0, 0, 0, 0.4);
}
.sh-stage-form { left: 0; top: 0; width: 62px; height: 62px; }
.sh-form-nm {
  position: absolute;
  left: 0; right: 0; bottom: 8px;
  text-align: center;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 15px;
  letter-spacing: 0.06em;
  color: #fff;
  text-shadow: 0 2px 6px rgba(60, 20, 30, 0.85), 0 0 10px rgba(60, 20, 30, 0.6);
  pointer-events: none;
}
.sh-form.on .sh-form-nm { color: #b03a5a; }

/* 底部装饰 */
.sh-band {
  /* 左右边缘与背景底板 */
  left: 100px; top: 630px;
  width: 1220px; height: 91px;
  object-fit: fill; opacity: 0.9;
  /* 底部装饰带压在立绘与形态卡之上 */
  z-index: 4;
}
.sh-line { top: 736px; height: 14px; object-fit: fill; opacity: 0.85; z-index: 5; }
.sh-line-l { left: 30px; width: 567px; }
.sh-line-r { left: 818px; width: 567px; }
.sh-diamond { left: 608px; top: 724px; width: 188px; height: 41px; object-fit: fill; z-index: 5; }

/* 关闭键 */
/* 关闭键 */
.sheet-x {
  position: absolute;
  top: 12px; right: 14px;
  width: 96px; height: 96px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
}
.sheet-x img {
  position: absolute;
  inset: 0;
  width: 100%; height: 100%;
  object-fit: contain;
  transition: opacity 0.16s ease;
}
.sx-h { opacity: 0; }
.sheet-x:hover .sx-h { opacity: 1; }

.sheet-enter-active, .sheet-leave-active { transition: opacity 0.24s ease; }
.sheet-enter-active .sheet, .sheet-leave-active .sheet { transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1); }
.sheet-enter-from, .sheet-leave-to { opacity: 0; }
.sheet-enter-from .sheet, .sheet-leave-to .sheet { transform: translateY(20px) scale(0.97); }
</style>
