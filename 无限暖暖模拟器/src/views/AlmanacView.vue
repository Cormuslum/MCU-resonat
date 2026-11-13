<script setup lang="ts">
/**
 * 玄学运势（书桌场景 + 卷轴弹窗）
 *
 * 权威依据（按优先级）：
 * 1. `素材/玄学运势/玄学运势-详细设定.md` —— 规格（素材/状态机/动效/三合一算法/文案库）
 * 2. `素材/玄学运势/素材/玄学运势-工程文件.pxdesk`（书桌场景）
 *    `素材/玄学运势/素材/玄学运势-工程文件2.pxdesk`（卷轴弹窗）
 *
 * 坐标（pxdesk 1400×788 → 1920×1080，SX=1.3714 / SY=1.3706）：
 *   方桌   (-810, 648) 1879×1089 ｜ 收纳桶 (-197, 439) 720×717 ← 交互区域
 *   墨台   ( 348, 770)  329×329 op .7 ｜ 返回键 (0,0) 184×169
 *   纸面   ( 105,  46) 1668×976  ← 展开态；轴杆高 824，宽度随素材（`almanac-geo.ts` 自动生成）
 *
 * v1.1.01（本版）改动：
 *  ① 换高清素材（`卷轴/` + `卷轴筒、笔、笔架/`），并全部**裁到 alpha 实体框**；
 *  ② 轴杆中心线始终压在纸面边缘、闭合态两根轴杆紧贴（都靠「图片边缘 == 实体边缘」保证）；
 *  ③ 弹窗去掉「玄学运势」四字，副标题居中放大；
 *  ④ 去掉左侧运势圆环（与书签功能重合），改三列版式；
 *  ⑤ 书签默认显示背面（110A），点击一次才翻到正面看档位（艺术字）；
 *  ⑥ 书桌「卷轴桶/墨台/书写笔」中欧两风格各 50%；
 *  ⑦ 主界面标题换「玄运」艺术字；返回键悬停换 _h 素材。
 *  ⑧ 纸面版式重排：三列等高（space-between）+ 列间竖线，右列加宽到 420 容纳签文，
 *     「个人提点」从八字区移到右列，页眉翻页键收到日期旁；
 *  ⑨ 展开/收起补间改为**常驻 transition**（`drag` 时才禁用），闭合态用 clip-path
 *     把纸面上下超出的 82/70px 收进轴杆带 —— 否则杆外会露白边；
 *  ⑩ 纸面上的书签（`.bm-card`）不再被 `setPointerCapture` 抢走 click。
 *
 * 用户早前定稿的三条口径不变：
 * ① 卷轴尺寸以 pxdesk2 为准 ② 弹窗没有退出键 ③ 过往无限向前 / 今日仅当天 / 未来 5 天
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { toDesignX } from '@/core/stage'
import { play } from '@/composables/useAudio'
import { setRailSuppressed } from '@/composables/useChrome'
import { fortuneOf, loadProfile, markBirthAsked, saveBirth, type Profile } from '@/core/fortune'
import { shiftDay, LUCKY_COLOR_HEX } from '@/core/almanac'
import { hitTest, type HitKey, type SceneStyle } from '@/data/almanac-hits'
import { AXLE_H, AXLE_W, PAPER_H, PAPER_W } from '@/data/almanac-geo'
import { hashStr } from '@/core/seed'
import { parentOf } from '@/router'

const store = useGameStore()
const route = useRoute()
const router = useRouter()

const R = computed(() => store.manifest?.ui?.almanac)
function asset(p: string | null | undefined) {
  return store.asset(p)
}

/* ══════════════════════════════════════════════ 几何常量 */

const PAPER_X = 105
const PAPER_Y = 46
/**
 * 展开态轴杆顶边 = 纸面顶边（v1.1.02 用户要求：轴杆与纸面上下齐平）。
 * 轴杆高已与纸面等高（AXLE_H = PAPER_H = 956，见 `almanac-geo.ts`），
 * 两杆同 y 就自然与纸边齐平 —— 不再沿用 pxdesk2 的 117/122 错位值。
 */
const ROD_Y_OPEN = PAPER_Y
/** 收起态轴杆垂直居中 */
const ROD_Y_COLLAPSED = Math.round((1080 - AXLE_H) / 2)

const L_DESK = { left: '-810px', top: '648px', width: '1879px', height: '1089px' }
const L_BASKET = { left: '-197px', top: '439px', width: '720px', height: '717px' }
const L_INK = { left: '348px', top: '770px', width: '329px', height: '329px', opacity: '0.7' }
const L_BACK = { left: '0px', top: '0px', width: '184px', height: '169px' }

/* ══════════════════════════════════════════════ 状态 */

type ScrollKind = 'past' | 'today' | 'future'
type SceneState = 'idle' | 'collapsed' | 'open'

const KIND_LABEL: Record<ScrollKind, string> = {
  past: '过往回顾',
  today: '今日感知',
  future: '未来预测',
}

const KIND_LIMIT: Record<ScrollKind, { min: number; max: number }> = {
  past: { min: -36500, max: -1 },
  today: { min: 0, max: 0 },
  future: { min: 1, max: 5 },
}

/** 书桌风格：中国风 / 欧洲风，进入页面时各 50% */
const style = ref<SceneStyle>(Math.random() < 0.5 ? 'eu' : 'cn')

const state = ref<SceneState>('idle')
const kind = ref<ScrollKind>('today')
const offset = ref(0)
const hoverKey = ref<HitKey | null>(null)
const progress = ref(0)
const dragging = ref(false)
const backHover = ref(false)

const profile = ref<Profile>(loadProfile())

const viewDate = computed(() => shiftDay(new Date(), offset.value))
const F = computed(() => fortuneOf(viewDate.value, profile.value))

/** 纸面/轴杆变体：按日期哈希 60 / 20 / 20 */
const variant = computed(() => {
  const r = hashStr('paper-v1|' + F.value.date) % 100
  return r < 60 ? 0 : r < 80 ? 1 : 2
})
const axleW = computed(() => AXLE_W[variant.value] ?? 50)
const paperSrc = computed(() => asset(R.value?.paper?.[variant.value]))
const axleSrc = computed(() => asset(R.value?.axle?.[variant.value]))

/* ══════════════════════════════════════════════ 卷轴几何（progress 驱动） */

/**
 * 轴杆**左边缘** x。展开态让轴杆中心压在纸面边缘上（需求 8）：
 *   左杆中心 = PAPER_X            → left = PAPER_X - w/2
 *   右杆中心 = PAPER_X + PAPER_W  → left = PAPER_X + PAPER_W - w/2
 * 收起态两杆紧贴（需求 7）：左杆 left = 0，右杆 left = w。
 */
const rodLX = computed(() => (PAPER_X - axleW.value / 2) * progress.value)
const rodRX = computed(() => axleW.value + (PAPER_X + PAPER_W - axleW.value / 2 - axleW.value) * progress.value)

/** 纸面左边缘 = 左杆中心；宽度 = 两杆中心距（闭合态正好一个杆宽，不会与杆分离） */
const paperLeft = computed(() => rodLX.value + axleW.value / 2)
const paperW = computed(() => Math.max(0, rodRX.value - rodLX.value))

const paperStyle = computed(() => ({
  left: paperLeft.value + 'px',
  top: PAPER_Y + 'px',
  width: paperW.value + 'px',
  height: PAPER_H + 'px',
  clipPath: sheetClip.value,
}))
const rodTop = computed(() => ROD_Y_COLLAPSED + (ROD_Y_OPEN - ROD_Y_COLLAPSED) * progress.value + 'px')
const rodLStyle = computed(() => ({
  left: rodLX.value + 'px',
  top: rodTop.value,
  height: AXLE_H + 'px',
}))
const rodRStyle = computed(() => ({
  left: rodRX.value + 'px',
  top: rodTop.value,
  height: AXLE_H + 'px',
}))
const sheetInnerStyle = computed(() => ({ width: PAPER_W + 'px', height: PAPER_H + 'px' }))

/**
 * 闭合态纸面必须完全藏在两根轴杆之后。
 *
 * 杆与纸等高后横向仍被两杆盖住，但收起态两杆是**视口居中**（y=62），
 * 比展开态纸面（y=46）低 16px → 纸面顶边会从杆上方露出 16px。
 * 用 clip-path 把这部分随 progress 线性收掉，收起/展开因此不会「先露白边」。
 * （上下各取 max(0, …)：杆高于纸时另一侧无需裁切。）
 */
const sheetClip = computed(() => {
  const k = 1 - progress.value
  const top = Math.max(0, ROD_Y_COLLAPSED - PAPER_Y) * k
  const bottom = Math.max(0, PAPER_Y + PAPER_H - (ROD_Y_COLLAPSED + AXLE_H)) * k
  return `inset(${top.toFixed(2)}px 0 ${bottom.toFixed(2)}px 0)`
})

/* ══════════════════════════════════════════════ 待机场景：卷轴热区 */

const BTN_LIST: ScrollKind[] = ['past', 'today', 'future']

const guiding = ref(false)
const showBirth = ref(false)
const locked = computed(() => guiding.value)
const hardLocked = computed(() => disPhase.value !== 'off')

function hitOf(e: MouseEvent, el: HTMLElement): HitKey | null {
  const r = el.getBoundingClientRect()
  const nx = (e.clientX - r.left) / r.width
  const ny = (e.clientY - r.top) / r.height
  if (guiding.value && hitTest(style.value, 'bazi', nx, ny)) return 'bazi'
  for (const k of BTN_LIST) if (hitTest(style.value, k, nx, ny)) return k
  return null
}

function onBasketMove(e: MouseEvent) {
  if (state.value !== 'idle' || hardLocked.value) return
  hoverKey.value = hitOf(e, e.currentTarget as HTMLElement)
}
function onBasketLeave() {
  hoverKey.value = null
}
function onBasketClick(e: MouseEvent) {
  if (state.value !== 'idle' || hardLocked.value) return
  const hit = hitOf(e, e.currentTarget as HTMLElement)
  if (!hit) return
  if (locked.value && hit !== 'bazi') return
  if (hit === 'bazi') {
    openBirthDialog()
    return
  }
  enterScroll(hit)
}

/* ══════════════════════════════════════════════ 状态机 */

let timers: number[] = []
function later(fn: () => void, ms: number) {
  timers.push(window.setTimeout(fn, ms))
}
function clearTimers() {
  timers.forEach((t) => window.clearTimeout(t))
  timers = []
}

function enterScroll(k: ScrollKind) {
  kind.value = k
  offset.value = k === 'past' ? -1 : k === 'future' ? 1 : 0
  state.value = 'collapsed'
  progress.value = 0
  play('paper-flip', { volume: 0.75 })
}

function expand() {
  if (state.value !== 'collapsed') return
  state.value = 'open'
  play('paper-flip', { volume: 0.8 })
  progress.value = 1
  later(() => startWriting(), 640)
}

function collapse() {
  if (state.value !== 'open') return
  stopWriting()
  bookmarkIn.value = false
  bookmarkFlipped.value = false
  state.value = 'collapsed'
  play('paper-slide', { volume: 0.75 })
  progress.value = 0
}

function backToIdle() {
  stopWriting()
  bookmarkIn.value = false
  bookmarkFlipped.value = false
  state.value = 'idle'
  progress.value = 0
  play('paper-book', { volume: 0.7 })
}

/* ---- 拖动（双向，阈值 50%，反拖到底回待机） ---- */

let dragStartX = 0
let dragStartT = 0
let dragMoved = false
let lastDragAt = 0

function onPointerDown(e: PointerEvent) {
  if (state.value === 'idle' || showBirth.value) return
  // 纸面上自带 click 的元素（翻页 / 填写生辰 / 改 / 书签翻面）必须直接放行：
  // 一旦在这里 setPointerCapture，click 会被重定向到 sheet 上，元素就点不动了。
  if ((e.target as HTMLElement).closest('button, .bm-card')) return
  dragging.value = true
  dragMoved = false
  // v1.6.02：记**设计坐标**，不然高分辨率下拖拽会跑得更快
  dragStartX = toDesignX(e.clientX)
  dragStartT = progress.value
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const host = sheetInner.value
  const k = host ? host.getBoundingClientRect().width / PAPER_W : 1
  const dt = (toDesignX(e.clientX) - dragStartX) / k / PAPER_W
  if (Math.abs(dt) > 0.012) dragMoved = true
  progress.value = Math.max(0, Math.min(1, dragStartT + dt))
}

function onPointerUp() {
  if (!dragging.value) return
  dragging.value = false
  if (!dragMoved) return
  lastDragAt = Date.now()
  const t = progress.value
  const prev = state.value

  if (prev === 'collapsed') {
    if (t >= 0.5) {
      state.value = 'open'
      progress.value = 1
      play('paper-flip', { volume: 0.8 })
      later(() => startWriting(), 640)
    } else {
      progress.value = 0
    }
  } else if (prev === 'open') {
    if (t <= 0.02) {
      state.value = 'idle'
      progress.value = 0
      stopWriting()
      bookmarkIn.value = false
      bookmarkFlipped.value = false
      play('paper-book', { volume: 0.7 })
    } else if (t <= 0.5) {
      state.value = 'collapsed'
      progress.value = 0
      stopWriting()
      bookmarkIn.value = false
      bookmarkFlipped.value = false
      play('paper-slide', { volume: 0.75 })
    } else {
      progress.value = 1
    }
  }
}

/* ══════════════════════════════════════════════ 书写动效 */

const sheetInner = ref<HTMLElement | null>(null)
const writing = ref(false)
const typed = ref<Record<string, number>>({})
let writeToken = 0
const quill = ref({ x: 0, y: 0, tilt: 0, show: false })

const WRITE_ITEMS = computed(() => {
  const f = F.value
  const list: { id: string; text: string }[] = [
    { id: 'verdict', text: f.almanac.verdict },
    { id: 'guaText', text: f.div.primary.text },
    { id: 'guaAdvice', text: f.div.primary.advice },
  ]
  if (f.baziScore) list.push({ id: 'baziTip', text: f.baziScore.tip })
  list.push({ id: 'slip', text: f.almanac.poem })
  return list
})

function shown(id: string, text: string): string {
  const n = typed.value[id]
  if (n === undefined) return text
  return text.slice(0, n)
}

/** 每字停留 62ms（设定写 80~120ms，整段约 140 字 → 12s 太久，折中 + 可点击跳过） */
const CHAR_MS = 62

function positionQuill(el: HTMLElement) {
  const host = sheetInner.value
  if (!host) return
  const node = el.firstChild
  if (!node || node.nodeType !== Node.TEXT_NODE) return
  const len = (node.textContent ?? '').length
  if (!len) return
  const range = document.createRange()
  range.setStart(node, len)
  range.collapse(true)
  const rect = range.getBoundingClientRect()
  const hr = host.getBoundingClientRect()
  const k = hr.width / PAPER_W || 1
  quill.value = {
    x: (rect.left - hr.left) / k,
    y: (rect.top - hr.top) / k,
    tilt: len % 2 ? 6 : -6,
    show: true,
  }
}

const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

async function startWriting() {
  const my = ++writeToken
  writing.value = true
  bookmarkIn.value = false
  bookmarkFlipped.value = false
  const zero: Record<string, number> = {}
  for (const it of WRITE_ITEMS.value) zero[it.id] = 0
  typed.value = zero
  await nextTick()
  await sleep(400)

  for (const item of WRITE_ITEMS.value) {
    const el = sheetInner.value?.querySelector<HTMLElement>(`[data-w="${item.id}"]`)
    if (!el) continue
    for (let i = 1; i <= item.text.length; i++) {
      if (my !== writeToken) return
      typed.value = { ...typed.value, [item.id]: i }
      await nextTick()
      positionQuill(el)
      await sleep(CHAR_MS)
    }
    await sleep(160)
  }
  if (my !== writeToken) return

  quill.value = { ...quill.value, y: quill.value.y - 10 }
  await sleep(220)
  quill.value = { ...quill.value, show: false }
  writing.value = false
  playBookmark()
}

function stopWriting() {
  writeToken++
  writing.value = false
  quill.value = { ...quill.value, show: false }
  // 归零而不是清空：清空后 shown() 会退回「全文」，
  // 再次展开时纸面会先闪一下整段文字、400ms 后才被擦掉重写。
  const zero: Record<string, number> = {}
  for (const it of WRITE_ITEMS.value) zero[it.id] = 0
  typed.value = zero
}

function skipWriting() {
  if (!writing.value) return
  if (Date.now() - lastDragAt < 320) return
  writeToken++
  const full: Record<string, number> = {}
  for (const it of WRITE_ITEMS.value) full[it.id] = it.text.length
  typed.value = full
  writing.value = false
  quill.value = { ...quill.value, show: false }
  playBookmark()
}

/* ---- 书签：默认背面，点击翻面（需求 6） ---- */
const bookmarkIn = ref(false)
const bookmarkFlipped = ref(false)

function playBookmark() {
  bookmarkIn.value = true
  play('paper-slide', { volume: 0.6 })
}

function flipBookmark() {
  if (!bookmarkIn.value) return
  bookmarkFlipped.value = !bookmarkFlipped.value
  play('paper-flip', { volume: 0.55 })
}

/** 档位艺术字：6 张，大凶缺素材 → 用「凶」压暗兜底 */
const TIER_KEY = {
  great: 'great',
  good: 'good',
  minorGood: 'minorGood',
  neutral: 'neutral',
  minorBad: 'minorBad',
  bad: 'bad',
  greatBad: 'bad',
} as const

const tierArt = computed(() => asset(R.value?.tier?.[TIER_KEY[F.value.tier.key]]))
const tierDark = computed(() => F.value.tier.key === 'greatBad')

/* ══════════════════════════════════════════════ 翻页 */

const limit = computed(() => KIND_LIMIT[kind.value])
const canPrev = computed(() => offset.value > limit.value.min)
const canNext = computed(() => offset.value < limit.value.max)

function step(d: number) {
  if (d < 0 && !canPrev.value) return
  if (d > 0 && !canNext.value) return
  play(d < 0 ? 'paper-flip' : 'paper-slide', { volume: 0.65 })
  offset.value += d
}

watch(offset, () => {
  if (state.value === 'open') startWriting()
})

/* ══════════════════════════════════════════════ 首登免责声明 */

const disclaimer = [
  '本玩法仅供娱乐，与实际体验无关',
  '内容不真实、不可靠、不可信',
  '使用者不依赖、不迷信',
]
const disPhase = ref<'off' | 'writing' | 'hold' | 'fade'>('off')
const disTyped = ref(0)
const disEl = ref<HTMLElement | null>(null)
const disQuill = ref({ x: 0, y: 0, tilt: 0, show: false })

function updateDisQuill() {
  const host = disEl.value
  if (!host) return
  const ps = [...host.querySelectorAll('p')]
  const line = [...ps].reverse().find((e) => (e.textContent ?? '').length > 0)
  if (!line) return
  const node = line.firstChild
  if (!node || node.nodeType !== Node.TEXT_NODE) return
  const range = document.createRange()
  range.setStart(node, (node.textContent ?? '').length)
  range.collapse(true)
  const rect = range.getBoundingClientRect()
  const hr = host.getBoundingClientRect()
  const stage = document.querySelector('.design')?.getBoundingClientRect()
  const k = stage ? stage.width / 1920 : 1
  disQuill.value = {
    x: (rect.left - hr.left) / k,
    y: (rect.top - hr.top) / k,
    tilt: disTyped.value % 2 ? 6 : -6,
    show: true,
  }
}

async function runDisclaimer() {
  disPhase.value = 'writing'
  disTyped.value = 0
  const total = disclaimer.join('').length
  for (let i = 1; i <= total; i++) {
    disTyped.value = i
    await nextTick()
    updateDisQuill()
    await sleep(58)
  }
  disQuill.value = { ...disQuill.value, y: disQuill.value.y - 10 }
  await sleep(200)
  disQuill.value = { ...disQuill.value, show: false }
  disPhase.value = 'hold'
  await sleep(3000)
  disPhase.value = 'fade'
  await sleep(320)
  disPhase.value = 'off'
  guiding.value = true
}

const disLines = computed(() => {
  let left = disTyped.value
  return disclaimer.map((l) => {
    const n = Math.max(0, Math.min(l.length, left))
    left -= l.length
    return l.slice(0, n)
  })
})

/* ══════════════════════════════════════════════ 生辰填写 */

const bYear = ref(2020)
const bMonth = ref(2)
const bDay = ref(20)
const bHour = ref<number | null>(null)

const years = Array.from({ length: 96 }, (_, i) => 1930 + i)
const months = Array.from({ length: 12 }, (_, i) => i + 1)
const daysInMonth = computed(() => new Date(bYear.value, bMonth.value, 0).getDate())
const days = computed(() => Array.from({ length: daysInMonth.value }, (_, i) => i + 1))

watch([bYear, bMonth], () => {
  if (bDay.value > daysInMonth.value) bDay.value = daysInMonth.value
})

function openBirthDialog() {
  const b = profile.value.birth
  if (b) {
    bYear.value = b.year
    bMonth.value = b.month
    bDay.value = b.day
    bHour.value = b.hour
  }
  showBirth.value = true
  play('paper-book', { volume: 0.7 })
}

function saveBirthInfo() {
  profile.value = {
    ...profile.value,
    birth: { year: bYear.value, month: bMonth.value, day: bDay.value, hour: bHour.value },
    asked: true,
  }
  saveBirth(profile.value.birth)
  markBirthAsked()
  showBirth.value = false
  guiding.value = false
  play('paper-flip', { volume: 0.8 })
  if (state.value === 'open') startWriting()
}

function clearBirthInfo() {
  profile.value = { ...profile.value, birth: null, asked: true }
  saveBirth(null)
  markBirthAsked()
  showBirth.value = false
  play('paper-book', { volume: 0.6 })
  if (state.value === 'open') startWriting()
}

/**
 * 「不填写，直接进入」。
 * 关键：这里必须**也**落一次「已问过」标记 —— 否则 birth 一直是 null，
 * 下次进玄学又被当成首次进入，免责声明 + 弹窗再走一遍（v2.4.01 修）。
 */
function skipBirth() {
  if (!profile.value.birth) {
    profile.value = { ...profile.value, asked: true }
    markBirthAsked()
  }
  showBirth.value = false
  guiding.value = false
  play('paper-book', { volume: 0.6 })
}

/* ══════════════════════════════════════════════ 路由 / 键盘 */

function goBack() {
  router.push(parentOf(route.path))
}

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (showBirth.value) {
    skipBirth()
    return
  }
  if (state.value === 'open') collapse()
  else if (state.value === 'collapsed') backToIdle()
  // 书桌待机态（卷轴未展开 / 已收起回书桌）→ 退出到上一级（v1.2.02）
  else goBack()
}

/**
 * 卷轴一进去就别让侧边栏冒出来（v2.4.01）。
 *
 * 侧栏只在指针贴左缘 100px 时才滑出，但收起态的卷轴两根轴杆就立在左边，
 * 侧栏一滑出来正好把金杆挡掉一半（用户截图）。展开态纸面也靠左，同样会被盖。
 * 所以只要不是「书桌待机态」就整块抑制掉；回待机/离开页面时恢复。
 */
watch(state, (s) => setRailSuppressed(s !== 'idle'), { immediate: true })

onMounted(() => {
  window.addEventListener('keydown', onKey)
  // 只有「没填过生辰 **且** 从来没问过」才算首次进入（v2.4.01：跳过也算问过）
  if (!profile.value.birth && !profile.value.asked) runDisclaimer()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  setRailSuppressed(false)
  clearTimers()
})

/* ══════════════════════════════════════════════ 展示辅助 */

const colorHex = (name: string) => LUCKY_COLOR_HEX[name] ?? '#888'
const tierColor = computed(() => F.value.tier.color)

const guaLabel = computed(() => `${F.value.div.primary.upper}上${F.value.div.primary.lower}下`)
const changedLabel = computed(() => `${F.value.div.changed.upper}上${F.value.div.changed.lower}下`)
const guaLines = computed(() => [...F.value.div.lines].reverse())

const dateBig = computed(() => {
  const d = viewDate.value
  return `${String(d.getMonth() + 1).padStart(2, '0')} / ${String(d.getDate()).padStart(2, '0')}`
})

const baziPillars = computed(() => {
  const b = F.value.bazi
  if (!b) return []
  const arr = [b.pillars.year, b.pillars.month, b.pillars.day]
  if (b.pillars.hour) arr.push(b.pillars.hour)
  return arr
})

const scoreParts = computed(() => F.value.baziScore?.parts.filter((p) => p.label !== '基础') ?? [])

const LUCK_COLOR: Record<string, string> = {
  大吉: '#B8860B',
  吉: '#2E8B57',
  小吉: '#3A7CA5',
  平: '#4A5A6A',
  小凶: '#B5651D',
  凶: '#A03030',
  大凶: '#6B1F1F',
}
const hourDot = (luck: string) => LUCK_COLOR[luck] ?? '#888'
</script>

<template>
  <div class="alm">
    <!-- ══════════ 层 0：页面主背景 ══════════ -->
    <img class="alm-bg" :src="asset(R?.bg)" alt="" draggable="false" />

    <!-- ══════════ 层 1：书桌场景（待机） ══════════ -->
    <div class="alm-scene" :class="{ out: state !== 'idle' }">
      <img class="sc-desk" :style="L_DESK" :src="asset(R?.desk)" alt="" draggable="false" />
      <img class="sc-ink" :style="L_INK" :src="asset(R?.inkstand?.[style])" alt="" draggable="false" />

      <!-- 收纳桶 = 交互区域；四张拆分图层与桶边缘重合叠放 -->
      <div
        class="sc-basket"
        data-no-rail
        :style="L_BASKET"
        :class="{ hot: !!hoverKey }"
        @mousemove="onBasketMove"
        @mouseleave="onBasketLeave"
        @click="onBasketClick"
      >
        <img class="bs-img" :src="asset(R?.basket?.[style])" alt="" draggable="false" />
        <img
          v-for="k in BTN_LIST"
          :key="k"
          class="bs-btn"
          :class="{ on: hoverKey === k, dim: locked }"
          :src="asset(R?.btn?.[style]?.[k])"
          alt=""
          draggable="false"
        />
        <img
          v-if="!profile.birth"
          class="bs-btn bs-bazi"
          :class="{ on: hoverKey === 'bazi', lit: guiding }"
          :src="asset(R?.btn?.[style]?.bazi)"
          alt=""
          draggable="false"
        />
      </div>

      <!-- 顶部标题（艺术字「玄运」） -->
      <div class="sc-title">
        <img class="st-art" :src="asset(R?.title)" alt="玄学运势" draggable="false" />
        <p class="st-sub">择时而动 · 顺星而行</p>
        <p class="st-hint">点桶中纸卷，展卷问运</p>
      </div>

      <!-- 返回键（仅待机态；悬停换 _h 高亮素材） -->
      <img
        class="sc-back"
        data-no-rail
        :style="L_BACK"
        :src="asset(backHover ? R?.backH : R?.backN)"
        alt="返回"
        title="返回"
        draggable="false"
        @mouseenter="backHover = true"
        @mouseleave="backHover = false"
        @click="goBack"
      />
    </div>

    <!-- ══════════ 层 2：卷轴（收起 / 展开） ══════════ -->
    <div class="scroll" :class="{ show: state !== 'idle', drag: dragging }">
      <!-- 纸面：外层 overflow 裁切，内层固定 1668 宽 → 展开感 -->
      <div
        class="sheet"
        :style="paperStyle"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @click="skipWriting"
      >
        <div ref="sheetInner" class="sheet-inner" :style="sheetInnerStyle">
          <img class="sheet-bg" :src="paperSrc" alt="" draggable="false" />

          <!-- ── 页眉：副标题居中放大（原「玄学运势」四字已去） ── -->
          <div class="hd">
            <div class="hd-kind">{{ KIND_LABEL[kind] }}</div>
            <div class="hd-date">
              <b class="hd-big">{{ dateBig }}</b>
              <span class="hd-week">星期{{ F.almanac.weekday }}</span>
              <div class="hd-nav">
                <button class="pg" :disabled="!canPrev" title="前一日" @click.stop="step(-1)">‹</button>
                <button class="pg" :disabled="!canNext" title="后一日" @click.stop="step(1)">›</button>
              </div>
            </div>
            <div class="hd-meta">
              <span>{{ F.almanac.ganzhi }}</span>
              <i class="dot"></i>
              <span>值神 {{ F.almanac.zhiShen }}</span>
              <i class="dot"></i>
              <span>{{ F.almanac.lunar }}</span>
              <i class="dot"></i>
              <span>{{ F.almanac.wuxing }} · {{ F.almanac.wuxingElement }}</span>
            </div>
          </div>
          <div class="hr"></div>

          <!-- ── 第一列：卦象 + 八字 ── -->
          <div class="col col-a">
            <section class="sec">
              <h3 class="sec-hd">今日卦象<em>日课卦</em></h3>
              <div class="gua">
                <div class="gua-figs">
                  <div v-for="(l, i) in guaLines" :key="i" class="yao-line" :class="{ moving: l.moving }">
                    <span v-if="l.yang" class="y-yang"></span>
                    <span v-else class="y-yin"><i></i><i></i></span>
                  </div>
                </div>
                <div class="gua-name">
                  <div class="gn-main">{{ F.div.primary.name }}</div>
                  <div class="gn-sub">{{ guaLabel }} · 变 {{ F.div.changed.name }}（{{ changedLabel }}）</div>
                  <div class="gn-kw">
                    <span class="kw">{{ F.div.primary.keywords[0] }}</span>
                    <span class="kw sub">{{ F.div.primary.keywords[1] }}</span>
                    <span v-if="F.div.mainLine" class="kw kw-main">{{ F.div.lines[F.div.mainLine - 1].label }} 为主</span>
                  </div>
                </div>
              </div>
              <p class="gua-text" data-w="guaText">{{ shown('guaText', F.div.primary.text) }}</p>
              <p class="gua-adv">
                <span class="adv-k">宜行</span>
                <span data-w="guaAdvice">{{ shown('guaAdvice', F.div.primary.advice) }}</span>
              </p>
              <p class="gua-d">卦气 {{ F.div.dNote }}</p>
            </section>

            <section class="sec">
              <h3 class="sec-hd">
                生辰八字<em v-if="F.bazi?.partial">三柱简版</em>
                <button v-if="F.bazi" class="bz-edit" @click.stop="openBirthDialog">改</button>
              </h3>

              <template v-if="F.bazi">
                <div class="pz">
                  <div v-for="(p, i) in baziPillars" :key="i" class="pz-item">
                    <span class="pz-k">{{ ['年', '月', '日', '时'][i] }}柱</span>
                    <b class="pz-v">{{ p.text }}</b>
                  </div>
                </div>
                <div class="bz-row">
                  <span class="bz-k">日主</span>
                  <span class="bz-v">{{ F.bazi.dayMaster }} · {{ F.bazi.strength }}</span>
                  <span class="bz-k">喜用</span>
                  <span class="bz-v">{{ F.bazi.favor.join(' ') }}</span>
                  <span class="bz-k">忌神</span>
                  <span class="bz-v">{{ F.bazi.avoid.join(' ') }}</span>
                </div>
                <div class="bz-row">
                  <span class="bz-k">个人幸运色</span>
                  <span class="bz-v">
                    <i class="sw" :style="{ background: colorHex(F.color?.main ?? '') }"></i>{{ F.color?.main }}
                    <template v-if="F.color?.sub">
                      <i class="sw" :style="{ background: colorHex(F.color.sub) }"></i>{{ F.color.sub }}
                    </template>
                  </span>
                  <span class="bz-k">本命纳音</span>
                  <span class="bz-v">{{ F.selfNayin?.name }} · {{ F.selfNayin?.element }}</span>
                </div>
                <div class="bz-row">
                  <span class="bz-k">个人分</span>
                  <span class="bz-v bz-score">{{ F.baziScore?.score }}</span>
                  <span class="bz-k">合冲</span>
                  <span class="bz-v">{{ F.baziScore?.relation }}</span>
                  <span class="bz-k">纳音辅参</span>
                  <span class="bz-v">{{ (F.nayin.score ?? 0) >= 0 ? '+' : '' }}{{ F.nayin.score }}</span>
                </div>
                <div class="bz-parts">
                  <span v-for="(p, i) in scoreParts" :key="i" class="pt" :class="{ neg: p.value < 0 }">
                    {{ p.label }} {{ p.value > 0 ? '+' : '' }}{{ p.value }}
                  </span>
                </div>
              </template>

              <div v-else class="bz-empty">
                <p>尚未填写生辰，当前按「黄历 + 周易」双模式推算。</p>
                <button class="bz-btn" @click.stop="openBirthDialog">填写生辰 · 解锁个人运势</button>
              </div>
            </section>
          </div>

          <!-- ── 第二列：宜 / 忌 + 通用幸运 + 冲煞 ── -->
          <div class="col col-b">
            <div class="block">
              <div class="bl-hd"><i class="mk yi"></i>宜</div>
              <div class="chips">
                <span v-for="t in F.almanac.yi" :key="t" class="chip yi">{{ t }}</span>
              </div>
            </div>
            <div class="block">
              <div class="bl-hd"><i class="mk ji"></i>忌</div>
              <div class="chips">
                <span v-for="t in F.almanac.ji" :key="t" class="chip ji">{{ t }}</span>
              </div>
            </div>

            <div class="lucky">
              <div class="lk">
                <span class="lk-k">通用幸运色</span>
                <span class="lk-v">
                  <i class="sw" :style="{ background: colorHex(F.almanac.luckyColor) }"></i>
                  {{ F.almanac.luckyColor }}
                </span>
              </div>
              <div class="lk">
                <span class="lk-k">幸运部位</span>
                <span class="lk-v">{{ F.almanac.luckyPart }}</span>
              </div>
              <div class="lk">
                <span class="lk-k">幸运时辰</span>
                <span class="lk-v">{{ F.almanac.luckyHour }}</span>
              </div>
              <div class="lk">
                <span class="lk-k">今日纳音</span>
                <span class="lk-v">{{ F.nayin.today.name }} · {{ F.nayin.today.element }}</span>
              </div>
            </div>

            <div class="chong">
              <span class="ch-k">冲煞</span>
              <span class="ch-v">{{ F.almanac.chong }}</span>
            </div>
          </div>

          <!-- ── 第三列：总评 + 签文 + 个人提点（档位由书签承载） ── -->
          <div class="col col-c">
            <div class="verdict-wrap">
              <div class="vc-hd">今日总评</div>
              <p class="verdict" data-w="verdict">{{ shown('verdict', F.almanac.verdict) }}</p>
            </div>

            <div class="slip">
              <div class="vc-hd">今日签</div>
              <p class="slip-text" data-w="slip">「{{ shown('slip', F.almanac.poem) }}」</p>
              <p class="slip-from">—— {{ F.almanac.poemFrom }}</p>
            </div>

            <div v-if="F.bazi" class="tip-wrap">
              <div class="vc-hd">个人提点</div>
              <p class="bz-tip" data-w="baziTip">{{ shown('baziTip', F.baziScore?.tip ?? '') }}</p>
            </div>
          </div>

          <!-- ── 十二时辰（整幅宽，上移到纸面实体内） ── -->
          <div class="hours">
            <div class="hh-hd">十二时辰</div>
            <div class="hh-grid">
              <div v-for="h in F.almanac.hours" :key="h.name" class="hh" :title="h.note">
                <i class="hh-dot" :style="{ background: hourDot(h.luck) }"></i>
                <b class="hh-n">{{ h.name }}</b>
                <span class="hh-l" :style="{ color: hourDot(h.luck) }">{{ h.luck }}</span>
              </div>
            </div>
          </div>

          <!-- ── 羽毛笔（书写光标） ── -->
          <img
            class="quill"
            :class="{ show: quill.show }"
            :style="{ left: quill.x + 'px', top: quill.y + 'px', transform: `rotate(${quill.tilt}deg)` }"
            :src="asset(R?.quill?.[style])"
            alt=""
            draggable="false"
          />

          <!-- ── 书签：默认背面（玄运），点击翻到正面看档位 ── -->
          <div class="bm" :class="{ in: bookmarkIn }">
            <div class="bm-card" :class="{ flipped: bookmarkFlipped }" @click.stop="flipBookmark">
              <img class="bm-face bm-back" :src="asset(R?.bookmarkBack)" alt="" draggable="false" />
              <div class="bm-face bm-front">
                <img class="bm-paper" :src="asset(R?.bookmarkFront)" alt="" draggable="false" />
                <div class="bm-info">
                  <img class="bm-tier-art" :class="{ dark: tierDark }" :src="tierArt" alt="" draggable="false" />
                  <span class="bm-num" :style="{ color: tierColor }">{{ F.total }}</span>
                  <span class="bm-col">{{ F.tier.colorName }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 收起态：空白区双击退出（x120 起，避开左侧轴杆；z 低于杆与按钮） -->
      <div v-if="state === 'collapsed'" class="alm-blank" @dblclick.stop="backToIdle"></div>

      <!-- 轴杆（中心线压在纸面边缘，压在纸面之上） -->
      <img
        class="axle"
        :style="rodLStyle"
        :src="axleSrc"
        alt=""
        draggable="false"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />
      <img
        class="axle"
        :style="rodRStyle"
        :src="axleSrc"
        alt=""
        draggable="false"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      />

      <!-- 快速展开 / 收起按钮 -->
      <button class="qa qa-open" :class="{ show: state === 'collapsed' && progress < 0.9 }" title="展开" @click.stop="expand">
        <img :src="asset(R?.arrowN)" alt="" draggable="false" />
      </button>
      <button class="qa qa-close" :class="{ show: state === 'open' && progress > 0.9 }" title="收起" @click.stop="collapse">
        <img :src="asset(R?.arrowN)" alt="" draggable="false" />
      </button>
    </div>

    <!-- ══════════ 层 3：首登免责声明 ══════════ -->
    <div v-if="disPhase !== 'off'" ref="disEl" class="dis" :class="{ fade: disPhase === 'fade' }">
      <p v-for="(l, i) in disLines" :key="i">{{ l }}</p>
      <img
        class="dis-quill"
        :class="{ show: disQuill.show }"
        :style="{ left: disQuill.x + 'px', top: disQuill.y + 'px', transform: `rotate(${disQuill.tilt}deg)` }"
        :src="asset(R?.quill?.[style])"
        alt=""
        draggable="false"
      />
    </div>

    <div v-else class="dis-corner">
      <p v-for="(l, i) in disclaimer" :key="i">{{ l }}</p>
    </div>

    <!-- ══════════ 层 4：生辰填写弹窗 ══════════ -->
    <div v-if="showBirth" class="bd-mask">
      <div class="bd">
        <h4 class="bd-hd">生辰八字</h4>
        <p class="bd-tip">公历年月日必填，时辰选填（缺时辰按三柱简版推算）。信息仅存本机，可随时修改或清除。</p>
        <div class="bd-row">
          <label>年</label>
          <select v-model.number="bYear">
            <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
          </select>
          <label>月</label>
          <select v-model.number="bMonth">
            <option v-for="m in months" :key="m" :value="m">{{ m }}</option>
          </select>
          <label>日</label>
          <select v-model.number="bDay">
            <option v-for="d in days" :key="d" :value="d">{{ d }}</option>
          </select>
          <label>时</label>
          <select
            :value="bHour === null ? '' : bHour"
            @change="bHour = ($event.target as HTMLSelectElement).value === '' ? null : Number(($event.target as HTMLSelectElement).value)"
          >
            <option value="">不填</option>
            <option v-for="h in 24" :key="h" :value="h - 1">{{ h - 1 }} 时</option>
          </select>
        </div>
        <div class="bd-btns">
          <button v-if="profile.birth" class="bd-clear" @click="clearBirthInfo">清除生辰</button>
          <span class="bd-gap"></span>
          <button class="bd-skip" @click="skipBirth">{{ profile.birth ? '取消' : '不填写，直接进入' }}</button>
          <button class="bd-ok" @click="saveBirthInfo">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alm {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  user-select: none;
}

.alm-bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  max-width: none;
  object-fit: cover;
}

/* ══════════ 书桌场景 ══════════ */
.alm-scene {
  position: absolute;
  inset: 0;
  transition: opacity 300ms ease-in-out, transform 300ms ease-in-out;
  transform-origin: 30% 80%;
}
.alm-scene.out {
  opacity: 0;
  transform: scale(1.03);
  pointer-events: none;
}
.sc-desk,
.sc-ink,
.sc-back {
  position: absolute;
  max-width: none;
}
.sc-back {
  cursor: pointer;
}

.sc-basket {
  position: absolute;
}
.sc-basket.hot {
  cursor: pointer;
}
.bs-img,
.bs-btn {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  pointer-events: none;
}
.bs-btn.on {
  animation: goldBreath 0.9s ease-in-out infinite alternate;
}
@keyframes goldBreath {
  from {
    filter: drop-shadow(0 0 10px rgba(255, 205, 110, 0.9)) brightness(1.2) saturate(1.1);
  }
  to {
    filter: drop-shadow(0 0 26px rgba(255, 220, 140, 1)) brightness(1.45) saturate(1.22);
  }
}
.bs-btn.dim {
  filter: grayscale(0.85) brightness(0.72);
  opacity: 0.85;
}
.bs-bazi.lit {
  animation: goldBreath 1.4s ease-in-out infinite alternate;
}

/* 标题（艺术字「玄运」） */
.sc-title {
  position: absolute;
  left: 296px;
  top: 74px;
  pointer-events: none;
}
.st-art {
  display: block;
  width: 384px;
  height: auto;
  max-width: none;
  filter: drop-shadow(0 6px 22px rgba(255, 252, 240, 0.85));
}
.st-sub {
  margin: 16px 0 0 10px;
  font-size: 22px;
  letter-spacing: 9px;
  color: #7a6247;
}
.st-hint {
  margin: 8px 0 0 10px;
  font-size: 16px;
  letter-spacing: 3px;
  color: #9b7f5c;
}

/* ══════════ 卷轴 ══════════ */
.scroll {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
}
.scroll.show {
  opacity: 1;
}
.scroll.show .sheet,
.scroll.show .axle,
.scroll.show .qa.show {
  pointer-events: auto;
}
.sheet,
.axle {
  /* 常驻过渡：展开/收起由 progress 改 left/width/top/clip-path 驱动。
     不能把 transition 和首帧样式写在同一个 class 切换里 —— 浏览器不会为
     「本次才获得 transition」的属性补间，动画会直接跳到终态。 */
  transition: left 600ms cubic-bezier(0.2, 0.8, 0.2, 1), width 600ms cubic-bezier(0.2, 0.8, 0.2, 1),
    top 600ms cubic-bezier(0.2, 0.8, 0.2, 1), clip-path 600ms cubic-bezier(0.2, 0.8, 0.2, 1);
}
/* 拖动时手动跟手，不能有过渡 */
.scroll.drag .sheet,
.scroll.drag .axle {
  transition: none;
}

.sheet {
  position: absolute;
  overflow: hidden;
  cursor: grab;
}
.sheet:active {
  cursor: grabbing;
}
.sheet-inner {
  position: absolute;
  left: 0;
  top: 0;
  overflow: hidden;
}
.sheet-bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: fill;
  filter: drop-shadow(0 10px 34px rgba(60, 40, 20, 0.35));
}

.axle {
  position: absolute;
  z-index: 2;
  height: 956px;
  width: auto;
  max-width: none;
  cursor: ew-resize;
}

/* 收起态空白双击区（需求 5）：避开左侧两根轴杆，其余整屏可双击退出 */
.alm-blank {
  position: absolute;
  left: 120px;
  top: 0;
  width: 1800px;
  height: 1080px;
  z-index: 1;
  pointer-events: auto;
  cursor: default;
}

/* 快速展开 / 收起 */
.qa {
  position: absolute;
  z-index: 3;
  top: 500px;
  width: 64px;
  height: 80px;
  padding: 0;
  border: 0;
  background: none;
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
}
.qa.show {
  opacity: 1;
}
.qa img {
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
}
.qa-open {
  left: 96px;
  animation: qaBreath 1.6s ease-in-out infinite;
}
.qa-close {
  left: 1760px;
  transform: scaleX(-1);
  animation: qaBreath 1.6s ease-in-out infinite;
}
@keyframes qaBreath {
  0%,
  100% {
    filter: drop-shadow(0 0 6px rgba(224, 176, 80, 0.6));
  }
  50% {
    filter: drop-shadow(0 0 14px rgba(240, 200, 110, 0.95));
  }
}

/* ══════════ 纸面内容（1668×976 内绝对定位）
   左右各留 64px：轴杆中心压在纸边，杆身向纸内伸半个杆宽（≤26px），
   内容从 64 起才不会被杆挡住（需求 2 的溢出根因）。

   版式：页眉（居中副标题 + 日期 + 干支）→ 三列（卦象/八字 ｜ 宜忌/幸运/冲煞 ｜ 总评/签文/提点）
   → 十二时辰整幅底栏。三列等高、space-between 均分，列底落在同一条线上，
   避免「左列顶到底、右列半页空」。 ══════════ */
.hd {
  position: absolute;
  left: 64px;
  top: 34px;
  width: 1540px;
  height: 150px;
}
.hd-kind {
  position: absolute;
  left: 0;
  top: 30px;
  width: 100%;
  text-align: center;
  font-size: 38px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: 10px;
  color: #4a3320;
  text-indent: 10px;
}
.hd-date {
  position: absolute;
  left: 0;
  top: 58px;
  display: flex;
  align-items: baseline;
  gap: 14px;
}
.hd-big {
  font-family: 'NikkiNumber', monospace;
  font-size: 48px;
  line-height: 1;
  color: #3b2a1a;
  letter-spacing: 2px;
}
.hd-week {
  font-size: 19px;
  color: #7a6247;
  letter-spacing: 1px;
}
.hd-nav {
  display: flex;
  gap: 6px;
  align-self: center;
  margin-left: 10px;
}
.pg {
  width: 36px;
  height: 36px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(120, 90, 55, 0.35);
  background: rgba(255, 250, 235, 0.55);
  color: #5b4227;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  transition: all 160ms ease;
}
.pg:hover:not(:disabled) {
  background: rgba(255, 245, 220, 0.95);
  border-color: rgba(150, 110, 60, 0.7);
  transform: translateY(-1px);
}
.pg:disabled {
  opacity: 0.28;
  cursor: default;
}
.hd-meta {
  position: absolute;
  left: 2px;
  top: 116px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  color: #7a6247;
  letter-spacing: 0.5px;
  white-space: nowrap;
}
.hd-meta .dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #b9a184;
}

.hr {
  position: absolute;
  left: 64px;
  top: 180px;
  width: 1540px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(120, 90, 55, 0.42) 10%, rgba(120, 90, 55, 0.42) 90%, transparent);
}

/* ---- 三列：等高，内容在列内均分 ---- */
.col {
  position: absolute;
  top: 200px;
  height: 600px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.col-a {
  left: 64px;
  width: 540px;
}
/* 列间竖分隔线：让「散开的三列」读起来是一张排好的版面，而不是几块浮字 */
.col-b::before,
.col-c::before {
  content: '';
  position: absolute;
  left: -20px;
  top: 2px;
  bottom: 2px;
  width: 1px;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(150, 110, 60, 0.22) 10%,
    rgba(150, 110, 60, 0.22) 90%,
    transparent
  );
}
.col-b {
  left: 644px;
  width: 360px;
}
.col-c {
  left: 1044px;
  width: 420px;
}

.sec-hd {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 11px;
  font-size: 23px;
  font-weight: 700;
  color: #5b4227;
  letter-spacing: 4px;
  border-left: 3px solid rgba(150, 110, 60, 0.6);
  padding-left: 12px;
}
.sec-hd em {
  font-style: normal;
  font-size: 14px;
  letter-spacing: 1px;
  color: #a8926f;
  font-weight: 400;
}
.bz-edit {
  margin-left: auto;
  padding: 1px 10px;
  font-size: 13px;
  font-weight: 400;
  letter-spacing: 1px;
  color: #8a7256;
  border: 1px solid rgba(150, 110, 60, 0.35);
  border-radius: 2px;
  background: transparent;
  cursor: pointer;
}
.bz-edit:hover {
  color: #5b4227;
  border-color: rgba(150, 110, 60, 0.7);
}

/* ---- 卦象 ---- */
.gua {
  display: flex;
  gap: 18px;
  align-items: center;
}
.gua-figs {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 4px 0;
}
.yao-line {
  width: 78px;
  height: 9px;
  display: flex;
  gap: 9px;
}
.y-yang {
  flex: 1;
  background: #4a3320;
  border-radius: 1px;
}
.y-yin {
  flex: 1;
  display: flex;
  gap: 9px;
}
.y-yin i {
  flex: 1;
  background: #4a3320;
  border-radius: 1px;
}
.yao-line.moving .y-yang,
.yao-line.moving .y-yin i {
  background: #b8860b;
  box-shadow: 0 0 6px rgba(184, 134, 11, 0.6);
}
.gua-name {
  flex: 1;
  min-width: 0;
}
.gn-main {
  font-size: 32px;
  font-weight: 700;
  color: #3b2a1a;
  letter-spacing: 2px;
  line-height: 1.2;
}
.gn-sub {
  margin-top: 6px;
  font-size: 16px;
  color: #7a6247;
  line-height: 1.5;
}
.gn-kw {
  margin-top: 7px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.kw {
  font-size: 15px;
  padding: 1px 9px;
  border-radius: 2px;
  color: #6b4f2f;
  background: rgba(150, 110, 60, 0.14);
}
.kw.sub {
  color: #8a7256;
  background: rgba(150, 110, 60, 0.08);
}
.kw-main {
  color: #8a6a12;
  background: rgba(184, 134, 11, 0.14);
}
.gua-text {
  margin: 12px 0 0;
  font-size: 21px;
  text-wrap: pretty;
  line-height: 1.85;
  color: #4a3320;
  letter-spacing: 0.4px;
  min-height: 40px;
}
.gua-adv {
  margin: 6px 0 0;
  font-size: 19px;
  color: #5b4227;
  display: flex;
  gap: 9px;
  align-items: baseline;
}
.adv-k {
  font-size: 14px;
  color: #8a7256;
  border: 1px solid rgba(150, 110, 60, 0.35);
  border-radius: 2px;
  padding: 1px 7px;
  white-space: nowrap;
}
.gua-d {
  margin: 5px 0 0;
  font-size: 15px;
  color: #a8926f;
}

/* ---- 八字 ---- */
.pz {
  display: flex;
  gap: 8px;
}
.pz-item {
  flex: 1;
  text-align: center;
  border: 1px solid rgba(150, 110, 60, 0.28);
  border-radius: 3px;
  padding: 6px 0 4px;
  background: rgba(255, 250, 235, 0.4);
}
.pz-k {
  display: block;
  font-size: 13px;
  color: #8a7256;
}
.pz-v {
  display: block;
  margin-top: 3px;
  font-size: 26px;
  letter-spacing: 3px;
  color: #3b2a1a;
}
.bz-row {
  margin-top: 7px;
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  font-size: 17px;
  color: #4a3320;
}
.bz-k {
  color: #8a7256;
  font-size: 15px;
}
.bz-v {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-right: 8px;
}
.bz-score {
  font-family: 'NikkiNumber', monospace;
  font-size: 21px;
  color: #8a6a12;
}
.bz-parts {
  margin-top: 6px;
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}
.pt {
  font-size: 13.5px;
  padding: 1px 7px;
  border-radius: 2px;
  color: #1f6b42;
  background: rgba(46, 139, 87, 0.1);
  white-space: nowrap;
}
.pt.neg {
  color: #8a2020;
  background: rgba(160, 48, 48, 0.09);
}
.bz-tip {
  margin: 0;
  font-size: 19px;
  text-wrap: pretty;
  line-height: 1.85;
  color: #5b4227;
  min-height: 28px;
}
.bz-empty {
  font-size: 18px;
  color: #6b5238;
  line-height: 1.8;
}
.bz-empty p {
  margin: 0 0 12px;
}
.bz-btn {
  padding: 9px 20px;
  border-radius: 4px;
  border: 1px solid rgba(150, 110, 60, 0.5);
  background: rgba(255, 248, 228, 0.85);
  color: #5b4227;
  font-size: 18px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 160ms ease;
}
.bz-btn:hover {
  background: #fff6df;
  box-shadow: 0 2px 10px rgba(150, 110, 60, 0.25);
}

/* ---- 宜忌 ---- */
.bl-hd {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 22px;
  font-weight: 700;
  color: #5b4227;
  letter-spacing: 3px;
  margin-bottom: 12px;
}
.mk {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: inline-block;
}
.mk.yi {
  background: #2e8b57;
}
.mk.ji {
  background: #a03030;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.chip {
  padding: 5px 15px;
  border-radius: 3px;
  font-size: 20px;
  letter-spacing: 1px;
  border: 1px solid;
  line-height: 1.4;
}
.chip.yi {
  color: #1f6b42;
  border-color: rgba(46, 139, 87, 0.45);
  background: rgba(46, 139, 87, 0.09);
}
.chip.ji {
  color: #8a2020;
  border-color: rgba(160, 48, 48, 0.4);
  background: rgba(160, 48, 48, 0.08);
}

.lucky {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2px;
}
.lk {
  display: flex;
  align-items: center;
  font-size: 19px;
  color: #5b4227;
  line-height: 38px;
}
.lk-k {
  width: 116px;
  flex: 0 0 116px;
  color: #8a7256;
  letter-spacing: 1px;
  font-size: 17px;
}
.lk-v {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.sw {
  width: 15px;
  height: 15px;
  border-radius: 3px;
  border: 1px solid rgba(90, 70, 45, 0.4);
  display: inline-block;
  flex: 0 0 15px;
}

/* 冲煞：独立成条，与幸运项之间用虚线分隔 */
.chong {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(150, 110, 60, 0.32);
  font-size: 19px;
  color: #5b4227;
}
.ch-k {
  font-size: 14px;
  letter-spacing: 3px;
  color: #a8926f;
}
.ch-v {
  letter-spacing: 0.5px;
}

/* ---- 总评 / 签文 / 提点 ---- */
.vc-hd {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  letter-spacing: 4px;
  color: #a8926f;
  margin-bottom: 10px;
}
.vc-hd::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, rgba(150, 110, 60, 0.5), rgba(150, 110, 60, 0.1));
}
.verdict {
  margin: 0;
  font-size: 22px;
  text-wrap: pretty;
  line-height: 2.05;
  color: #4a3320;
  letter-spacing: 0.8px;
  min-height: 46px;
}
.slip {
  width: 100%;
}
.slip-text {
  margin: 0;
  font-size: 26px;
  letter-spacing: 1.5px;
  color: #4a3320;
  line-height: 1.9;
  min-height: 50px;
  word-break: break-word;
}
.slip-from {
  margin: 8px 0 0;
  font-size: 16px;
  color: #8a7256;
  letter-spacing: 1px;
  text-align: right;
}
.tip-wrap {
  width: 100%;
}

/* ---- 十二时辰 ---- */
.hours {
  position: absolute;
  left: 64px;
  top: 832px;
  width: 1540px;
}
.hh-hd {
  font-size: 15px;
  color: #8a7256;
  letter-spacing: 4px;
  margin-bottom: 8px;
}
.hh-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 6px;
}
.hh {
  text-align: center;
  padding: 7px 0 6px;
  border-radius: 3px;
  background: rgba(255, 250, 235, 0.35);
  border: 1px solid rgba(150, 110, 60, 0.16);
}
.hh-dot {
  display: block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin: 0 auto 3px;
}
.hh-n {
  display: block;
  font-size: 19px;
  color: #4a3320;
  line-height: 1.3;
}
.hh-l {
  display: block;
  font-size: 13px;
  line-height: 1.5;
}

/* ---- 羽毛笔 ---- */
.quill {
  position: absolute;
  height: 108px;
  width: auto;
  max-width: none;
  object-fit: contain;
  transform-origin: 8% 92%;
  opacity: 0;
  pointer-events: none;
  transition: left 90ms linear, top 90ms linear, transform 120ms ease, opacity 220ms ease;
  filter: drop-shadow(0 4px 10px rgba(40, 25, 10, 0.5));
  z-index: 40;
}
.quill.show {
  opacity: 1;
}

/* ---- 书签（默认背面，点击翻面） ---- */
.bm {
  position: absolute;
  left: 1476px;
  top: 0;
  width: 150px;
  height: 390px;
  z-index: 30;
  opacity: 0;
  transform: translateY(150px);
  clip-path: inset(100% 0 0 0);
  pointer-events: none;
  perspective: 900px;
}
.bm.in {
  animation: bmIn 420ms cubic-bezier(0.34, 1.4, 0.64, 1) forwards;
  pointer-events: auto;
}
@keyframes bmIn {
  from {
    opacity: 0;
    transform: translateY(150px);
    clip-path: inset(100% 0 0 0);
  }
  to {
    opacity: 1;
    transform: translateY(0);
    clip-path: inset(0 0 0 0);
  }
}
.bm-card {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  transition: transform 420ms cubic-bezier(0.4, 0.1, 0.3, 1);
  cursor: pointer;
}
.bm-card.flipped {
  transform: rotateY(180deg);
}
.bm-face {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  filter: drop-shadow(0 8px 18px rgba(60, 40, 20, 0.4));
}
.bm-front {
  transform: rotateY(180deg);
}
.bm-paper {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
}
.bm-info {
  position: absolute;
  left: 0;
  top: 98px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.bm-tier-art {
  height: 108px;
  width: auto;
  max-width: 120px;
  object-fit: contain;
  margin-bottom: 2px;
}
.bm-tier-art.dark {
  filter: brightness(0.62) saturate(1.25);
}
.bm-num {
  font-family: 'NikkiNumber', monospace;
  font-size: 26px;
  line-height: 1;
}
.bm-col {
  font-size: 12px;
  color: #8a7256;
  letter-spacing: 2px;
}

/* ══════════ 免责声明 ══════════ */
.dis {
  position: absolute;
  left: 0;
  top: 440px;
  width: 1920px;
  text-align: center;
  transition: opacity 300ms ease;
  pointer-events: none;
}
.dis.fade {
  opacity: 0;
}
.dis p {
  margin: 0;
  min-height: 54px;
  font-size: 26px;
  line-height: 2.1;
  letter-spacing: 3px;
  color: #3b2a1a;
  text-shadow: 0 2px 10px rgba(255, 250, 235, 0.9);
}
.dis-quill {
  position: absolute;
  height: 96px;
  width: auto;
  max-width: none;
  object-fit: contain;
  transform-origin: 8% 92%;
  margin-left: -12px;
  margin-top: -54px;
  opacity: 0;
  transition: left 90ms linear, top 90ms linear, transform 120ms ease, opacity 200ms ease;
  filter: drop-shadow(0 4px 10px rgba(40, 25, 10, 0.55));
}
.dis-quill.show {
  opacity: 1;
}
.dis-corner {
  position: absolute;
  right: 28px;
  bottom: 20px;
  text-align: right;
  opacity: 0.5;
  pointer-events: none;
}
.dis-corner p {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: #5b4227;
  letter-spacing: 1px;
}

/* ══════════ 生辰弹窗 ══════════ */
.bd-mask {
  position: absolute;
  inset: 0;
  background: rgba(20, 14, 8, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}
.bd {
  width: 660px;
  padding: 28px 32px 24px;
  border-radius: 6px;
  background: linear-gradient(180deg, #fdf7e6, #f2e6c9);
  border: 1px solid rgba(120, 90, 55, 0.45);
  box-shadow: 0 20px 60px rgba(20, 12, 4, 0.5);
}
.bd-hd {
  margin: 0 0 8px;
  font-size: 24px;
  letter-spacing: 6px;
  color: #4a3320;
}
.bd-tip {
  margin: 0 0 18px;
  font-size: 14px;
  line-height: 1.7;
  color: #7a6247;
}
.bd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.bd-row label {
  font-size: 15px;
  color: #6b5238;
}
.bd-row select {
  padding: 5px 8px;
  border-radius: 3px;
  border: 1px solid rgba(120, 90, 55, 0.4);
  background: #fffaf0;
  color: #3b2a1a;
  font-size: 15px;
}
.bd-btns {
  margin-top: 22px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}
.bd-gap {
  flex: 1;
}
.bd-clear {
  border: 1px solid rgba(160, 48, 48, 0.4);
  background: transparent;
  color: #8a2020;
}
.bd-btns button {
  padding: 8px 22px;
  border-radius: 4px;
  font-size: 16px;
  letter-spacing: 1px;
  cursor: pointer;
}
.bd-skip {
  border: 1px solid rgba(120, 90, 55, 0.4);
  background: transparent;
  color: #6b5238;
}
.bd-ok {
  border: 1px solid #8a6a12;
  background: #8a6a12;
  color: #fff8e4;
}
.bd-ok:hover {
  background: #a07d1a;
}
</style>
