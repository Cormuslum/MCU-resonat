<script setup lang="ts">
/** 抽卡演出页：动画屏（RPs-1 / RPm-10，出 5★ 用 _Y）→ 十连结果 → 单抽详情 → 套装获得 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import {
  play,
  stop,
  stopAllSfx,
  playStarHit,
  duckBgm,
} from '@/composables/useAudio'
import type { Part, PullResult } from '@/types'
import { parentOf } from '@/router'

const store = useGameStore()
const route = useRoute()
const router = useRouter()

const times = computed<1 | 10>(() => (route.query.times === '10' ? 10 : 1))

type Phase = 'anim' | 'result' | 'detail' | 'suit'
const phase = ref<Phase>('anim')

/** 本次结果 */
const results = ref<PullResult[]>([])
const gold = computed(() => results.value.some((r) => r.rarity === 5))

/** 当前查看的卡片索引（单抽详情 / 十连点开） */
const cur = ref(0)

/** 揭示序列：每抽到套装的新部件，就在该件详情后插入一次套装页（徽章 1/N … N/N），重复件不插 */
type SeqStep =
  | { kind: 'detail'; idx: number; forced?: boolean }
  | { kind: 'suit'; setId: string; count: number; total: number; second?: boolean }
const revealSeq = ref<SeqStep[]>([])
const seqPos = ref(0)
const revealing = ref(false)
/** 拉取前各套装的已有数（算徽章递增用） */
const ownedBefore = ref<Map<string, number>>(new Map())
/** 拉取前各部件的已有份数（算「第二套」递增用） */
const dupBefore = ref<Map<string, number>>(new Map())
/** 当前套装页展示的内容（徽章数取这里，不是实时图鉴） */
const suitView = ref<{ setId: string; count: number; total: number; second?: boolean } | null>(null)
/** 「跳过全部」已经按过一次：按过之后按钮消失，剩下只走强制项 */
const revealSkipping = ref(false)

/** 视频与音频句柄（跳过时淡出） */
const videoEl = ref<HTMLVideoElement | null>(null)
let animAudio: HTMLAudioElement | null = null
let perfAudio: HTMLAudioElement | null = null
/** 已跳过，避免视频 ended 再触发一次 */
let skipped = false
/** 翻牌音是否已播 */
let flipped = false

const ui = computed(() => store.manifest?.ui)
const video = computed(() => store.manifest?.video)

function asset(p: string | null | undefined) {
  return store.asset(p)
}

/* ---------------------------------------------------- 属性 → 面板/标签 */

/** 五维 → 属性面板索引（board-1..4）：甜美 1 / 清新 2 / 典雅 3 / 性感 4 / 帅气 4 */
const BOARD_BY_STAT: Record<string, number> = {
  典雅: 2,
  清新: 1,
  甜美: 0,
  帅气: 3,
  性感: 3,
}
/** 五维 → 属性标签长条索引（tag-1..5） */
const TAG_BY_STAT: Record<string, number> = {
  甜美: 0,
  典雅: 1,
  清新: 2,
  性感: 3,
  帅气: 4,
}

/** 部件的主属性（五维最高的一项） */
function mainStat(p: Part): string {
  if (p.top?.length) return p.top[0]
  // 3★ 散件没有五维，用部位猜一个
  return '典雅'
}

function boardOf(p: Part): string {
  const idx = BOARD_BY_STAT[mainStat(p)] ?? 2
  return ui.value?.detail.board[idx] ?? ui.value?.detail.board[0] ?? ''
}

function tagOf(stat: string): string {
  const list = ui.value?.detail.tags ?? []
  const idx = TAG_BY_STAT[stat] ?? 1
  return list[idx] ?? list[0] ?? ''
}

/** 风格标签底图（label01~10） */
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

/** 部件的风格标签（3★ 散件在 YAML 的 tags.标签 里，其余部件没有） */
const styleTags = computed<string[]>(() => {
  const t = curPart.value?.tags
  if (!t) return []
  const v = t['标签']
  if (Array.isArray(v)) return v.filter(Boolean)
  if (typeof v === 'string' && v.trim()) return v.split(/[、,，\s]+/).filter(Boolean)
  return []
})

/** 卡牌框：3★ 金 / 4★ 紫 / 5★ 粉拱 */
/** 立绘区（相对卡框左上）：立绘裁在这里，卡框画在其上 → 不会溢出容器 */
const PHOTO_RECT: Record<number, [number, number, number, number]> = {
  3: [29.9, 32.4, 213, 312.8],
  4: [31.2, 33.5, 211.3, 307],
  5: [32.4, 34.6, 209.6, 301.2],
}
/** 星级区 / 名牌（相对卡框） */
const STARS_TOP = 299.9
const NAME_RECT: [number, number, number, number] = [28.6, 346.5, 215.7, 45.3]
function photoStyle(rarity: number | string): Record<string, string> {
  const [l, t, w, h] = PHOTO_RECT[frameIdx(rarity) + 3]
  return { left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px' }
}
/** 重复件赠送的材料 */
function matOf(rarity: number | string): { icon: string | undefined; n: number } {
  const idx = frameIdx(rarity)
  if (idx === 0) return { icon: ui.value?.result.mat3, n: 10 }
  if (idx === 1) return { icon: ui.value?.result.mat4, n: 4 }
  return { icon: ui.value?.result.mat4, n: 10 }
}

/** 星级 / 名牌的卡内绝对盒子 */
function starsStyle(): Record<string, string> {
  return { left: '37.9px', top: STARS_TOP + 'px', width: '199.7px', height: '39.9px' }
}
function nameStyle(): Record<string, string> {
  const [l, t, w, h] = NAME_RECT
  return { left: l + 'px', top: t + 'px', width: w + 'px', height: h + 'px' }
}

/** 卡框下标：3★→0 / 4★→1 / 5★→2。rarity 可能是字符串 */
function frameIdx(rarity: number | string): number {
  const n = Number(rarity)
  return n >= 5 ? 2 : n >= 4 ? 1 : 0
}

/** 十连网格定位 —— 全部取自 `十连界面-图片工程.pxdesk`。卡框 276×444 1:1 */
const GRID_X0 = 291.9
const GRID_Y0 = 119.4
const GRID_DX = 257.3
const GRID_DY = 400
const GRID_STAGGER = 28.3

/** 每张卡的浮动参数：同时起浮，但幅度和速度各不相同 */
const FLOAT_AMP = [10, 15, 7, 13, 17, 9, 14, 6, 16, 11]
const FLOAT_DUR = [3.4, 4.3, 2.9, 4.7, 3.7, 3.1, 4.5, 3.9, 3.2, 4.1]

function cardStyle(i: number): Record<string, string> {
  const col = i % 5
  const row = Math.floor(i / 5)
  return {
    left: GRID_X0 + col * GRID_DX + 'px',
    top: GRID_Y0 + row * GRID_DY + (col % 2 === 1 ? GRID_STAGGER : 0) + 'px',
    '--amp': (FLOAT_AMP[i % FLOAT_AMP.length] ?? 10) + 'px',
    '--dur': (FLOAT_DUR[i % FLOAT_DUR.length] ?? 3.8) + 's',
  }
}

/* ---------------------------------------------------- 抽卡 */function doPull() {
  const before = new Map<string, number>()
  const dup = new Map<string, number>()
  for (const s of store.banner?.sets ?? []) {
    before.set(s.id, store.setProgress(s.id).owned)
  }
  for (const p of store.allParts) dup.set(p.id, store.codex.count(p.id))
  ownedBefore.value = before
  dupBefore.value = dup
  results.value = store.pull(times.value)
}

/** 拉取结束后构建揭示序列（详情 → 新部件的套装页 → 详情 → …）；4★/5★ 集齐后再抽到重复部件触发第二套页 */
function buildSeq(): SeqStep[] {
  const seq: SeqStep[] = []
  const running = new Map<string, number>()
  // 第二套：逐件累加后的「份数」表（从拉取前的快照起步）
  const dupRun = new Map<string, number>(dupBefore.value)
  const partsOf = (setId: string) => (store.allParts ?? []).filter((p) => p.setId === setId)
  const dupCountOf = (setId: string) => partsOf(setId).filter((p) => (dupRun.get(p.id) ?? 0) >= 2).length

  const pushSuit = (setId: string) => {
    const set = store.banner?.sets.find((s) => s.id === setId)
    if (!set) return // 不属于本池套装的部件（3★ 散件等）不触发
    const count = (running.get(setId) ?? ownedBefore.value.get(setId) ?? 0) + 1
    running.set(setId, count)
    seq.push({ kind: 'suit', setId, count, total: store.setProgress(setId).total })
  }

  results.value.forEach((r, i) => {
    if (times.value !== 10 && i !== 0) return
    const setId = r.part.setId
    // 先推进份数（第二套判定要用**这一份**的序号）
    if (setId) dupRun.set(r.part.id, (dupRun.get(r.part.id) ?? 0) + 1)
    const inPool = !!setId && !!store.banner?.sets.some((s) => s.id === setId)
    const star = Number(r.rarity)
    const firstFull = !!setId && (ownedBefore.value.get(setId) ?? 0) >= store.setProgress(setId).total
    /** 第二套：4★/5★、第一套已集齐、且这一份正好是第 2 份 */
    const secondHit = inPool && !r.isNew && star >= 4 && firstFull && (dupRun.get(r.part.id) ?? 0) === 2

    seq.push({ kind: 'detail', idx: i, forced: r.isNew || secondHit })
    if (!setId || !inPool) return
    if (r.isNew) {
      pushSuit(setId)
      return
    }
    if (secondHit) {
      seq.push({
        kind: 'suit',
        setId,
        count: dupCountOf(setId),
        total: partsOf(setId).length,
        second: true,
      })
    }
  })
  return seq
}

/* ---------------------------------------------------- 动画 */
function startAnim() {
  const v = video.value
  const isGold = gold.value
  const src = v ? (times.value === 10 ? (isGold ? v.ten.gold : v.ten.normal) : isGold ? v.single.gold : v.single.normal) : null

  // 抽卡动画音效 + 共鸣演出叠加（演出音量取一半，尾部对齐）
  animAudio = play(isGold ? 'draw-gold' : 'draw-normal', { volume: 1 })
  attachOverlay(isGold)

  if (!src) {
    // 没有视频就直接进结果
    window.setTimeout(() => toResult(), 400)
    return
  }

  window.setTimeout(() => {
    const el = videoEl.value
    if (!el) {
      toResult()
      return
    }
    el.src = asset(src)
    el.load()
    void el.play().catch(() => {
      // 自动播放被拦截 → 直接进结果，不让用户卡住
      toResult()
    })
  }, 60)
}

/** 共鸣演出音与抽卡动画尾部对齐：直接从头播，让视频结束事件统一收尾 */
function attachOverlay(isGold: boolean) {
  const perfName = isGold ? 'perf-gold' : 'perf-normal'
  perfAudio = play(perfName, { volume: 0.5 })
}

function onVideoEnd() {
  if (skipped) return
  // 视频 10s，动画音效 13.5s/16.2s，演出音 10.1s —— 统一在这里收尾
  stop(animAudio, 420)
  stop(perfAudio, 420)
  toResult()
}

/** 跳过：淡出动画音效 + 演出音，BGM 淡回 */
function skip() {
  if (skipped) return
  skipped = true
  const el = videoEl.value
  if (el) {
    el.pause()
    try {
      el.currentTime = 0
    } catch {
      /* 忽略 */
    }
  }
  // 300~450ms 淡出
  stop(animAudio, 380)
  stop(perfAudio, 380)
  duckBgm(false, 520)
  play('sendgift-popup', { volume: 0.8 })
  toResult()
}

/** 进结果：单抽和十连都先进单抽界面，按 `revealSeq` 逐步揭示 */
function toResult() {
  revealSeq.value = buildSeq()
  seqPos.value = 0
  revealSkipping.value = false
  revealing.value = true
  applyStep(revealSeq.value[0])
  duckBgm(false, 600)
}

/** 应用揭示序列的当前步 */
function applyStep(st: SeqStep | undefined) {
  if (!st) {
    finishReveal()
    return
  }
  if (st.kind === 'detail') {
    phase.value = 'detail'
    showPart(st.idx)
  } else {
    suitView.value = { setId: st.setId, count: st.count, total: st.total, second: st.second }
    toSuit()
  }
}

/** 揭示流程走完（或被跳过）：十连进网格，单抽回共鸣页 */
function finishReveal() {
  revealing.value = false
  if (times.value === 10) {
    toGrid()
    return
  }
  back()
}

/** 进十连网格 */
function toGrid() {
  revealing.value = false
  phase.value = 'result'
  play('sendgift-popup', { volume: 0.85 })
  window.setTimeout(() => {
    if (flipped) return
    flipped = true
    playStarHit(results.value[0]?.rarity ?? 3)
  }, 260)
}

/** 复审模式的逐件索引（从结果网格点开卡片后用）。十连 = 10 件逐件过；揭示流程（动画后）走的是 `revealSeq`（详情与套装页交错） */
const detailQueue = computed<number[]>(() => {
  if (!results.value.length) return []
  if (times.value !== 10) return [0]
  // 十连：10 件逐件过一遍（点空白 / F 就是「下一件」）
  return results.value.map((_, i) => i)
})

/* ---------------------------------------------------- 交互 */

/** 单抽详情的入场动效总时长（ms）：`dtItemIn` 最后一帧 76% → 1.52s，按 1.52s 上锁 */
const DETAIL_INTRO_MS = 1520
/** 入场动效播放中：屏蔽点击 / F / ESC / 跳过全部 */
const dtLocked = ref(false)
let dtLockTimer = 0
function lockDetail() {
  dtLocked.value = true
  window.clearTimeout(dtLockTimer)
  dtLockTimer = window.setTimeout(() => {
    dtLocked.value = false
  }, DETAIL_INTRO_MS)
}

/** 演出·2「跳过单抽动画」：详情入场动效期间双击 → 立刻结束上锁。双击前的两次 click 都落在 dtLocked 里被 next() 拦掉，不会误翻页 */
function finishIntro() {
  if (!store.save.settings.skipSingleAnim || !dtLocked.value) return
  window.clearTimeout(dtLockTimer)
  dtLocked.value = false
  play('sendgift-popup', { volume: 0.5 })
}

/** 切到队列里的下一件并播放翻牌音 */
function showPart(i: number) {
  cur.value = i
  play('flip-single', { volume: 0.85 })
  window.setTimeout(() => playStarHit(results.value[i]?.rarity ?? 3), 260)
  lockDetail()
}

/** 进套装获得页 */
function toSuit() {
  phase.value = 'suit'
  play('set-complete', { volume: 0.9 })
  window.setTimeout(() => play('set-progress-done', { volume: 0.8 }), 300)
}

/** 「下一件」（点空白 / F / 详情页右上按钮）：揭示流程按 `revealSeq` 前进，复审模式沿 `detailQueue` 走 */
function next() {
  // 入场动效没放完不许交互（跳过 / 点击 / F 全部拦掉）
  if (phase.value === 'detail' && dtLocked.value) return
  if (revealing.value) {
    advanceReveal()
    return
  }
  const q = detailQueue.value
  const pos = q.indexOf(cur.value)
  if (pos >= 0 && pos < q.length - 1) {
    showPart(q[pos + 1])
    return
  }
  if (times.value === 10) {
    toGrid()
    return
  }
  back()
}

/** 揭示流程前进一步：`forced` 部件（新部件，或 4★/5★ 第 1、2 份）的套装页必播； 按过「跳过全部」后其余重复件不再出现，直接跳到下一个 `forced` */
function advanceReveal() {
  const seq = revealSeq.value
  const cur = seq[seqPos.value]
  const curForced = cur?.kind === 'detail' && !!cur.forced
  const nxt = seq[seqPos.value + 1]

  // 当前这件的套装获得页（第一套页 / 第二套页都跟 forced 部件走）
  if (nxt?.kind === 'suit' && (!revealSkipping.value || curForced)) {
    seqPos.value += 1
    applyStep(nxt)
    return
  }

  if (revealSkipping.value && times.value === 10) {
    for (let i = seqPos.value + 1; i < seq.length; i++) {
      const st = seq[i]
      if (st.kind === 'detail' && st.forced) {
        seqPos.value = i
        applyStep(st)
        return
      }
    }
    finishReveal()
    return
  }

  seqPos.value += 1
  applyStep(seq[seqPos.value])
}

/** 跳过全部（右上按钮 / ESC）：此后只走 `forced` 部件，每件带套装获得页，最后一件放完再点才进结算网格 */
function skipAll() {
  if (phase.value === 'detail' && dtLocked.value) return
  if (revealing.value) {
    if (times.value === 10) {
      revealSkipping.value = true
      advanceReveal()
      return
    }
    finishReveal()
    return
  }
  if (times.value === 10) {
    toGrid()
    return
  }
  back()
}

/** 套装获得页 → 继续（套装页只出现在揭示流程中，继续下一步） */
function afterSuit() {
  advanceReveal()
}

function back() {
  play('reward-a', { volume: 0.85 })
  stopAllSfx(180)
  // 十连回共鸣页时弹「恭喜获得」（单抽不弹；演出·3 可关闭）
  if (times.value === 10 && results.value.length && !store.save.settings.skipReward) {
    store.rewardOpen = true
  }
  router.push(parentOf(route.path))
}

/* ---------------------------------------------------- 派生展示数据 */

/** 开发期截图对齐用：`?demo=<部件名>` 强制当前部件并直接进详情页（生产构建整段被摇掉） */
const demoPart = computed<Part | null>(() => {
  if (!import.meta.env.DEV) return null
  const q = route.query.demo
  if (typeof q !== 'string' || !q) return null
  return store.allParts.find((p) => p.name === q || p.displayName === q) ?? null
})
const curResult = computed<PullResult | null>(() => {
  const r = results.value[cur.value]
  if (r) return r
  const d = demoPart.value
  if (d) return { rarity: d.star as 3 | 4 | 5, part: d, isNew: true, count: 1, index: 1 }
  return null
})
const curPart = computed<Part | null>(() => curResult.value?.part ?? null)

/** 套装页展示的套装信息（由揭示序列的当前步决定） */
const suitInfo = computed(() => {
  const id = suitView.value?.setId
  if (!id) return null
  return store.banner?.sets.find((s) => s.id === id) ?? null
})

const suitAttr = computed(() => suitInfo.value?.styles?.[0] ?? '')

/** 套名底板四选一：4★ 未集齐 board_02（紫）/ 已集齐 board_03（蓝）， 5★ 未集齐 board_01（粉）/ 已集齐 board_04（暗金） */
const bandSrc = computed(() => {
  const boards = ui.value?.suit.boards
  if (!boards || boards.length < 4) return null
  const star5 = (suitInfo.value?.star ?? 4) >= 5
  const full = suitProg.value.owned >= suitProg.value.total
  return asset(boards[star5 ? (full ? 3 : 0) : full ? 2 : 1])
})

/** 徽章进度：本次揭示步的 1/N … N/N（来自序列，不是实时图鉴） */
const suitProg = computed(() => ({
  owned: suitView.value?.count ?? 0,
  total: suitView.value?.total ?? 1,
}))
/** 该套装是否已集齐（决定盘面 / 动效 / 文案） */
const isSuitFull = computed(() => suitProg.value.owned >= suitProg.value.total)

function badgeStyle(): Record<string, string> {
  const pct = Math.round((suitProg.value.owned / Math.max(suitProg.value.total, 1)) * 100)
  return { '--p': String(pct) }
}

/** ESC：动画中=跳过，单抽界面=跳过全部，十连网格=回共鸣页，套装页=继续。和屏幕上写的键位提示保持一致，别让提示说谎 */
function onKey(e: KeyboardEvent) {
  const k = e.key.toLowerCase()
  // F：动画屏 = 跳过动画；详情页 = 看下一件（与屏幕上的「F 跳过」「[F] 点击空白区域继续」一致）
  if (k === 'f') {
    if (phase.value === 'anim') {
      e.preventDefault()
      skip()
    } else if (phase.value === 'detail') {
      e.preventDefault()
      next()
    }
    return
  }
  if (e.key !== 'Escape') return
  e.preventDefault()
  // ESC = 跳过全部（动画屏就是跳过动画）
  if (phase.value === 'anim') skip()
  else if (phase.value === 'detail') skipAll()
  else if (phase.value === 'result') back()
  else if (phase.value === 'suit') afterSuit()
}

// 开发期调试钩子（生产摇掉）：verify-*.mjs 巡检脚本读内部状态用
if (import.meta.env.DEV) {
  ;(window as any).__gachaDbg = {
    get phase() { return phase.value },
    get completedSet() {
      const suits = revealSeq.value.filter((s) => s.kind === 'suit') as Array<Extract<SeqStep, { kind: 'suit' }>>
      return suits.length ? suits[suits.length - 1].setId : null
    },
    get cur() { return cur.value },
    get queue() {
      return revealSeq.value.map((s) => (s.kind === 'detail' ? s.idx : `suit:${s.setId}:${s.count}/${s.total}`))
    },
    get results() { return results.value.length },
    get resultIds() { return results.value.map((r) => r.part.id + '|' + r.rarity + '|' + (r.isNew ? 'N' : '-')) },
    get pool5() { return store.pool?.['5'].map((p) => p.id) ?? [] },
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  // 开发期像素对比：?demo=<部件名> 直接停在详情页，不跑抽卡流程
  if (demoPart.value) {
    skipped = true
    phase.value = 'detail'
    return
  }
  // 开发期像素对比：?suit=<套装名>&banner=<bannerId> 直接停在套装获得页
  if (import.meta.env.DEV) {
    const sq = route.query.suit
    if (typeof sq === 'string' && sq) {
      const bq = route.query.banner
      if (typeof bq === 'string' && bq && store.banner?.id !== bq) store.selectBanner(bq)
      const target = store.banner?.sets.find((s) => s.name === sq || s.id === sq)
      if (target) {
        const prog = store.setProgress(target.id)
        suitView.value = { setId: target.id, count: prog.owned, total: prog.total }
      }
      phase.value = 'suit'
      return
    }
    // 验收脚本用的调试口（仅 DEV，生产构建整段被摇掉）：
    //   __gacha.pull()      按当前 times 真抽一次（同时刷新 ownedBefore / dupBefore）
    //   __gacha.seq()       取当前结果对应的揭示序列（不推进 UI）
    ;(window as any).__gacha = {
      store,
      pull: () => {
        doPull()
        return results.value
      },
      seq: () => buildSeq(),
      times,
      ownedBefore,
      dupBefore,
      results,
    }
  }
  doPull()
  if (store.save.settings.skipAnim) {
    skipped = true
    duckBgm(false, 300)
    toResult()
  } else {
    startAnim()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  stop(animAudio, 120)
  stop(perfAudio, 120)
  duckBgm(false, 200)
})
</script>

<template>
  <div class="gacha">
    <!-- ==================== 动画屏 ==================== -->
    <div v-if="phase === 'anim'" class="anim">
      <video ref="videoEl" class="anim-video" playsinline preload="auto" @ended="onVideoEnd"></video>
      <!-- 跳过 -->
      <button class="anim-skip" @click="skip">
        <img v-if="ui" class="as-f" :src="asset(ui.btn.keyF)" alt="F" />
        <span class="as-txt">跳过</span>
      </button>
    </div>

    <!-- ==================== 十连结果（02 号界面） ==================== -->
    <div v-else-if="phase === 'result'" class="result" @click="back">
      <!-- 背景：用户已把标题/键位/地面光环烘焙进整图，这里只负责卡片区 -->
      <img v-if="ui" class="rs-bg" :src="asset(ui.result.bg)" alt="" />

      <div class="rs-grid">
        <button
          v-for="(r, i) in results"
          :key="i"
          class="rcard"
          :class="['r' + r.rarity, { 'is-new': r.isNew }]"
          :style="cardStyle(i)"
        >
          <span class="rc-in">
            <!-- 4★/5★ 光柱（紫 / 粉），在卡框之下 -->
            <img
              v-if="r.rarity >= 4 && ui"
              class="rc-glow"
              :src="asset(r.rarity === 5 ? ui.result.glowPink : ui.result.glowPurple)"
              alt=""
            />
            <!-- 立绘先画（在卡框之下）：卡框的边和金线要压住立绘 -->
            <span class="rc-photo" :style="photoStyle(r.rarity)">
              <img :src="asset(r.part.card)" :alt="r.part.displayName" draggable="false" />
            </span>
            <!-- 卡框（含名牌底板）：3★ char-1 / 4★ char-2 / 5★ char-3 -->
            <img v-if="ui" class="rc-frame" :src="asset(ui.result.char[frameIdx(r.rarity)])" alt="" />
            <!-- 星级：压在立绘下缘，居中 -->
            <span class="rc-stars" :class="'s' + r.rarity" :style="starsStyle()">
              <img v-for="n in r.rarity" :key="n" :src="asset(ui?.detail.star)" alt="★" draggable="false" />
            </span>
            <!-- 套名：居中在半透明名牌里，超长省略 -->
            <span class="rc-name" :style="nameStyle()">{{ r.part.displayName }}</span>
            <!-- 新件：十连专用「新」角标 -->
            <img v-if="r.isNew && ui" class="rc-new" :src="asset(ui.result.newBadge)" alt="新" />
            <!-- 重复件 -->
            <span v-else class="rc-dup">
              <img class="rd-soft" :src="asset(ui?.result.soft)" alt="" />
              <img class="rd-line" :src="asset(ui?.result.line)" alt="" />
              <img class="rd-ico" :src="asset(matOf(r.rarity).icon)" alt="" />
              <b class="num">×{{ matOf(r.rarity).n }}</b>
            </span>
          </span>
        </button>
      </div>
    </div>

    <!-- ==================== 单抽 / 部件详情（03/05 号界面） ====================
         图层顺序与坐标 1:1 对齐实机截图（1918×1078，「俏皮黑桃」单抽展示）。
         素材全部来自 SysReward / Common 解包，未做任何人工合成。 -->
    <div
      v-else-if="phase === 'detail' && curPart"
      :key="'d' + cur"
      class="detail"
      :class="{ locked: dtLocked }"
      @click="next"
      @dblclick.stop="finishIntro"
    >
      <!-- L01 整屏底板（上紫下暖） -->
      <img v-if="ui" class="dt-bg" :src="asset(ui.detail.bgPlate)" alt="" />
      <!-- L01b 底部暖光：底板把解包 bg 的底部亮带抹掉了，用 screen 叠回来 -->
      <img v-if="ui" class="dt-glow" :src="asset(ui.detail.bg)" alt="" />

      <!-- L03 右上罗盘徽记 1095,90 784×854 -->
      <img v-if="ui" class="dt-logo" :src="asset(ui.detail.logo)" alt="" />
      <!-- L04 右下虚线圆环 1573,757 286×280，36s 慢旋 -->
      <img v-if="ui" class="dt-ring" :src="asset(ui.detail.ring)" alt="" />
      <!-- L05/L06 右侧文字装饰条 1575,543 + 下划线 1576,581 -->
      <img v-if="ui" class="dt-textbar" :src="asset(ui.detail.ornameText)" alt="" />
      <img v-if="ui" class="dt-underline" :src="asset(ui.detail.ornameText2)" alt="" />

      <!-- L07 属性面板 970,340 670×338（左上胶片孔是纹理自带，勿再叠） -->
      <img v-if="ui" class="dt-board" :src="asset(boardOf(curPart))" alt="" />
      <!-- L08 面板标题右侧的金色圆环挂饰 1212,373 99×90 -->
      <img v-if="ui" class="dt-ornament" :src="asset(ui.detail.ornament3)" alt="" />

      <!-- L09-L12 立绘组合：粗金线 → 丝绸纸角 → 立绘 → 金框 -->
      <div class="dt-cardwrap">
        <img v-if="ui" class="dt-line2" :src="asset(ui.detail.line)" alt="" />
        <img v-if="ui" class="dt-silk" :src="asset(ui.detail.silkRibbon)" alt="" />
        <img class="dt-char" :src="asset(curPart.card)" :alt="curPart.displayName" draggable="false" />
        <img v-if="ui" class="dt-frame" :src="asset(ui.detail.frame)" alt="" />
      </div>
      <!-- 新件角标：卡框右上角 -->
      <img v-if="curResult?.isNew && ui" class="dt-new" :src="asset(ui.result.newSuit)" alt="新" />

      <!-- L13 卡侧丝带 772,197 184×488 -->
      <img v-if="ui" class="dt-ribbon" :src="asset(ui.detail.orname3)" alt="" />

      <!-- L14-L16 卡左侧三条金弧：大弧 / 中弧 / 小弧 -->
      <img v-if="ui" class="dt-arc a" :src="asset(ui.detail.deco[1])" alt="" />
      <img v-if="ui" class="dt-arc b" :src="asset(ui.detail.deco[2])" alt="" />
      <img v-if="ui" class="dt-arc c" :src="asset(ui.detail.deco[0])" alt="" />

      <!-- L17 名称 1045,392 52px -->
      <h2 class="dt-name">{{ curPart.displayName }}</h2>
      <!-- L18 星级 1038/1072/1106,474 56×57 -->
      <div class="dt-stars" :class="'s' + curResult!.rarity">
        <img v-for="n in curResult!.rarity" :key="n" :src="asset(ui?.detail.star)" alt="★" />
      </div>
      <!-- L19 属性标签 1049,542 106×31（五维各一张彩色长条） -->
      <span class="dt-tag" :style="{ backgroundImage: `url(${asset(tagOf(mainStat(curPart)))})` }">
        {{ mainStat(curPart) }}
      </span>
      <!-- L20 风格标签 1049,591 108×37，多个横排 -->
      <div class="dt-labels">
        <span v-for="(st, i) in styleTags" :key="st + i" class="dt-label"
          :style="{ backgroundImage: `url(${asset(labelOfIdx(st))})` }">{{ st }}</span>
      </div>
      <!-- L21 细分割线 1053,640 654×3 -->
      <img v-if="ui" class="dt-divline" :src="asset(ui.detail.lineThin)" alt="" />
      <!-- L22 文案 1051,663 宽 690，24/31 -->
      <p class="dt-desc">{{ curPart.desc || '通用散件 · 没有专属文案' }}</p>

      <!-- L23-L25 额外获得条 0,866 473×123 + 水滴 33,879 90×90 + 两行文字
           新部件不显示（新件本身就是要展示的收获，再叠一条「额外获得」是错的） -->
      <template v-if="!curResult?.isNew">
        <img v-if="ui" class="dt-tips" :src="asset(ui.detail.tips[0])" alt="" />
        <img class="dt-drop" :src="asset(store.manifest?.currency['静谧水滴']?.icon)" alt="" />
        <span class="dt-ex-k">额外获得</span>
        <span class="dt-ex-n">静谧水滴 <em>×10</em></span>
      </template>

      <!-- L26/L27 右上按钮 -->
      <template v-if="times === 10 && !revealSkipping">
        <button class="dh-skip" @click.stop="skipAll">
          <img class="ds-n" :src="asset(ui?.btn.skip)" alt="" />
          <img class="ds-h" :src="asset(ui?.btn.backH)" alt="" />
        </button>
        <span class="dt-skip-txt">跳过全部</span>
      </template>

      <!-- L28-L32 底部键位提示：ESC 跳过全部 / [F] [鼠标] 点击空白区域继续
           共鸣一次没有「跳过全部」→ ESC 那一组（键帽 + 文字 + 斜杠）整段不渲染；
           按过「跳过全部」之后这组也隐藏（ESC 此时的语义与点击一致） -->
      <template v-if="times === 10 && !revealSkipping">
        <svg class="df-cap" viewBox="0 0 38 24" aria-hidden="true">
          <defs>
            <mask id="escKnock">
              <rect width="38" height="24" rx="7" fill="#fff" />
              <text x="19" y="16.6" text-anchor="middle" font-size="11.5" font-weight="700"
                fill="#000">ESC</text>
            </mask>
          </defs>
          <rect width="38" height="24" rx="7" fill="#fff" mask="url(#escKnock)" />
        </svg>
        <span class="df-txt esc">跳过全部</span>
      </template>
      <img v-if="ui" class="df-f" :src="asset(ui.btn.keyF)" alt="" />
      <span v-if="times === 10 && !revealSkipping" class="df-slash">/</span>
      <img v-if="ui" class="df-mouse" :src="asset(ui.btn.keyMouse)" alt="" />
      <span class="df-txt go">点击空白区域继续</span>

      <!-- L33 UID -->
      <span class="dt-uid">UID 114081169</span>
    </div>

    <!-- ==================== 套装获得（实机「潮汐鲨影 6/9」逐层对齐；只有集齐整套才出现一次） ==================== -->
    <div v-else-if="phase === 'suit' && suitInfo" class="suit" @click="afterSuit">
      <!-- 四芒星渐变（星级/徽章顶饰共用） -->
      <svg width="0" height="0" style="position: absolute" aria-hidden="true">
        <defs>
          <radialGradient id="suitSparkGold" cx="50%" cy="42%" r="65%">
            <stop offset="0%" stop-color="#fff8e2" />
            <stop offset="45%" stop-color="#f3d488" />
            <stop offset="100%" stop-color="#c89a4a" />
          </radialGradient>
        </defs>
      </svg>

      <!-- L01 背景 -->
      <img v-if="ui" class="su-bg" :src="asset(ui.suit.bg)" alt="" />
      <!-- L02 卡后拱顶暖光 -->
      <img v-if="ui" class="su-cardglow" :src="asset(ui.suit.imgLight)" alt="" />
      <!-- L03 大圆环细线组合 ornament_01：等比 1:1，圆面 (1031.5,515.5) r400.5 对准组合中心 -->
      <img v-if="ui" class="su-orn" :src="asset(ui.suit.ornament[0])" alt="" />
      <!-- L03b 右下虚线圆环：与单抽界面**同位置、同尺寸、同 36s 转速** -->
      <img v-if="ui" class="su-dring" :src="asset(ui.detail.ring)" alt="" />
      <!-- L04 金色放射光带：圆心与大圆环一致，36s 匀速 -->
      <i class="su-rays" aria-hidden="true"></i>
      <!-- L05 黑底发光弧（必须 screen）：glow-2 卡顶左大弧 / glow-1 卡底亮弧 -->
      <img v-if="ui" class="su-glowarc" :src="asset(ui.suit.glow2)" alt="" />
      <img v-if="ui" class="su-glowbot" :src="asset(ui.suit.glow1)" alt="" />
      <!-- L06 卡底暗土丘：**已删**—— `ui.suit.board`(board-4) 是套名底板改成 4 态 （boards[0..3]）之前的老单层，和 `.su-band` 叠在一起就是两个土丘； 而且 board-4 是「5★已集齐」态，挂在 4★ 套装上语义也不对 -->

      <!-- L08 套装卡 454×612 @(736,196)：装饰 → 金底 frame-2 → 顶光 → 立绘 → 外框 frame-1 按 pxdesk「套装获得页」补了两层装饰（坐标/不透明度照抄）， 并把立绘挪到 frame-2 与 frame-1 之间 -->
      <div class="su-card">
        <!-- 装饰层（在 frame-2 之下）：卡顶右上的柔光 + 贴身纹样 -->
        <img v-if="ui" class="sc-deco sc-deco-light" :src="asset(ui.suit.light)" alt="" draggable="false" />
        <img v-if="ui && ui.suit.ornClothes3" class="sc-deco sc-deco-orn" :src="asset(ui.suit.ornClothes3)" alt="" draggable="false" />
        <img v-if="ui" class="sc-body" :src="asset(ui.suit.frames[1])" alt="" />
        <i class="sc-halo" aria-hidden="true"></i>
        <!-- 立绘：contain 进卡内，不再 object-fit:fill（会被拉变形且溢出容器）；层级在 frame-1 之下 -->
        <img class="sc-portrait" :src="asset(suitInfo.assets.portrait)" :alt="suitInfo.name" draggable="false" />
        <img v-if="ui" class="sc-frame" :src="asset(ui.suit.frames[0])" alt="" />
        <!-- 第二套：只在「第一套已集齐、又抽到重复部件」时出现，纯文字 -->
        <span v-if="suitView?.second" class="sc-second">第二套</span>
      </div>

      <!-- L07 套名底板 720×300 -->
      <img v-if="bandSrc" class="su-band" :src="bandSrc" alt="" />

      <!-- L09 套装进度圆：空槽 schedule_02 → 盘面 schedule_bg/fullbg → 高亮动效 → 进度弧 → 四角星 → 左半金环 -->
      <div
        class="su-badge"
        :class="{ 'is-full': isSuitFull }"
        :style="{ ...badgeStyle(), '--m-slot': ui ? `url(${asset(ui.suit.sched.slot)})` : 'none' }"
      >
        <img v-if="ui" class="sud-slot" :src="asset(ui.suit.sched.slot)" alt="" />
        <!-- 进度弧放在盘面**之前** -->
        <i class="sud-prog" aria-hidden="true"></i>
        <img v-if="ui" class="sud-face" :src="asset(isSuitFull ? ui.suit.sched.fullBg : ui.suit.sched.bg)" alt="" />
        <!-- 高亮动效：已集齐 0.6s 升到 80%；进度上涨 0.4s 升到 50%，随后落到对应盘面 -->
        <img v-if="ui" class="sud-flash"
          :src="asset(isSuitFull ? ui.suit.sched.full : ui.suit.sched.step)" alt="" />
        <img v-if="ui" class="sud-star" :src="asset(ui.suit.sched.star)" alt="" />
        <!-- 左半边金色半环 ornament_02（细金线 + 珠簇，圆心与盘面同心） -->
        <img v-if="ui" class="sud-orn2" :src="asset(ui.suit.ornament[1])" alt="" />
        <span v-if="isSuitFull" class="sud-full-txt">已集齐</span>
        <span v-else class="sud-txt">
          <b class="sud-num num">{{ suitProg.owned }}</b>
          <span class="sud-total num">/{{ suitProg.total }}</span>
        </span>
      </div>

      <!-- L10 套名 55px @(y816) / 星级四芒星 38px @(y878) / 属性胶囊（detail tag 素材） -->
      <div class="su-name">
        <h2>{{ suitInfo.name }}</h2>
        <!-- 星级 -->
        <span class="sn-stars" :class="'s' + suitInfo.star">
          <img v-for="n in suitInfo.star" :key="n" :src="asset(ui?.detail.star)" alt="★" />
        </span>
        <span
          v-if="suitAttr"
          class="sn-tag"
          :style="{ backgroundImage: `url(${asset(tagOf(suitAttr))})` }"
        >{{ suitAttr }}</span>
      </div>

      <!-- L11 套装能力区：**不做**（2026-10-26） -->

      <!-- 右上「跳过全部」：与单抽界面**同一个按钮素材 + 同一套坐标**（.dh-skip / .dt-skip-txt） 按过一次之后消失（与单抽界面同一条规则） -->
      <button v-if="!revealSkipping" class="dh-skip" @click.stop="afterSuit" @mouseenter="play('common-hover', { volume: 0.4 })">
        <img class="ds-n" :src="asset(ui?.btn.skip)" alt="" />
        <img class="ds-h" :src="asset(ui?.btn.backH)" alt="" />
      </button>
      <span v-if="!revealSkipping" class="dt-skip-txt">跳过全部</span>

      <!-- 底部点状装饰带（在键位文字下层） -->
      <i class="su-dotline" aria-hidden="true"></i>
      <!-- 底部键位提示 按过「跳过全部」之后 ESC 这一组整段消失（此时 ESC 与点击同义） -->
      <template v-if="!revealSkipping">
        <svg class="df-cap" viewBox="0 0 38 24" aria-hidden="true">
          <defs>
            <mask id="escKnockSuit">
              <rect width="38" height="24" rx="7" fill="#fff" />
              <text x="19" y="16.6" text-anchor="middle" font-size="11.5" font-weight="700"
                fill="#000">ESC</text>
            </mask>
          </defs>
          <rect width="38" height="24" rx="7" fill="#fff" mask="url(#escKnockSuit)" />
        </svg>
        <span class="df-txt esc">跳过全部</span>
        <span class="df-slash">/</span>
      </template>
      <img v-if="ui" class="df-f" :src="asset(ui.btn.keyF)" alt="" />
      <img v-if="ui" class="df-mouse" :src="asset(ui.btn.keyMouse)" alt="" />
      <span class="df-txt go">点击空白区域继续</span>
    </div>
  </div>
</template>
<style scoped>
.gacha {
  position: relative;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
}

/* ==================== 动画屏 ==================== */
.anim {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: #04060e;
}
.anim-video { width: 100%; height: 100%; object-fit: cover; }
/* 动画屏跳过 */
.anim-skip {
  position: absolute;
  left: 1759px;
  top: 1013px;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  z-index: 30;
}
.as-f {
  width: 31px;
  height: 30px;
  object-fit: contain;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.35));
}
.as-txt {
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 24px;
  line-height: 1;
  color: #fff;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
}
/* 「共鸣中…」转圈 + 文字、以及旧胶囊跳过钮都已删除 */

/* ==================== 十连结果 ====================
   背景是用户烘焙好的整图（SysResonance-10.png，1920×1080），这里只管卡片区。
   网格实测（屏幕截图 2026-10-19 145930）：列距 267、卡 207×353、行 y 155 / 545，
   第 2、4 张比同排低 13px。 */
.result {
  position: absolute;
  inset: 0;
  cursor: var(--nk-cursor, auto), pointer;
  overflow: hidden;
}
.rs-bg {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  object-fit: fill;
  pointer-events: none;
}
.rs-grid {
  position: absolute;
  inset: 0;
}
.rcard {
  position: absolute;
  width: 276px;
  height: 444px;
  padding: 0;
  border: 0;
  background: none;
  /* 卡牌仅做展示 */
  cursor: var(--nk-cursor, auto), default;
}
/* 浮动层 */
.rc-in {
  position: absolute;
  inset: 0;
  animation: rcFloat var(--dur, 3.8s) ease-in-out infinite alternate;
}
@keyframes rcFloat {
  from { transform: translateY(calc(var(--amp, 10px) * -1)); }
  to { transform: translateY(var(--amp, 10px)); }
}

/* 4★/5★ 光柱：素材 288×624，按卡面重排（横向放宽、纵向压短） */
.rc-glow {
  position: absolute;
  left: -8.4px;
  top: -85.4px;
  width: 286.8px;
  height: 643.8px;
  object-fit: fill;
  opacity: 0.5;
  pointer-events: none;
  animation: rcGlow 3.2s ease-in-out infinite alternate;
}
@keyframes rcGlow {
  from { opacity: 0.36; }
  to { opacity: 0.62; }
}
/* 卡框 */
.rc-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  pointer-events: none;
}
/* 立绘孔 */
.rc-photo {
  position: absolute;
  overflow: hidden;
  pointer-events: none;
}
/* 4★/5★ 卡框是**拱形**开口，立绘盒子却是矩形 → 上方两角会拱出拱顶。
   按拱形把顶部两角收圆（椭圆近似：横向 50%、纵向 22~26%）。 */
.rcard.r5 .rc-photo { border-radius: 50% 50% 0 0 / 26% 26% 0 0; }
.rcard.r4 .rc-photo { border-radius: 50% 50% 0 0 / 22% 22% 0 0; }
.rc-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}
/* 星级 */
.rc-stars {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.rc-stars img {
  width: 36.3px;
  height: 33px;
  object-fit: contain;
  margin-right: -12.2px;
  filter: drop-shadow(0 1px 4px rgba(40, 20, 0, 0.75));
}
.rc-stars img:last-child { margin-right: 0; }
.rc-stars.s5 img { filter: drop-shadow(0 0 7px rgba(255, 206, 120, 0.95)); }
.rc-stars.s4 img { filter: drop-shadow(0 0 5px rgba(210, 170, 255, 0.8)); }
/* 套名 */
.rc-name {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  font-size: 22px;
  line-height: 1.1;
  letter-spacing: 0.02em;
  color: #f2f6ff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.75);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
}
/* 新件角标 */
.rc-new {
  position: absolute;
  left: 188.3px;
  top: 19.8px;
  width: 87px;
  height: 47.4px;
  object-fit: contain;
  pointer-events: none;
  animation: rcNewPulse 2.4s ease-in-out infinite;
}
@keyframes rcNewPulse {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.25); }
}
/* 重复件 */
/* 「×n」角标 */
.rc-dup {
  position: absolute;
  left: 135.6px;
  top: 14.2px;
  width: 106.4px;
  height: 56.4px;
  /* 底板完全交给「柔层」素材本身 */
  pointer-events: none;
}
/* 柔层素材 */
.rd-soft {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.rd-line {
  position: absolute;
  left: 9px;
  top: 21.8px;
  width: 101.4px;
  height: 36.9px;
  object-fit: fill;
}
.rd-ico {
  position: absolute;
  left: 28.6px;
  top: 17.7px;
  width: 38.9px;
  height: 36.9px;
  object-fit: contain;
  filter: drop-shadow(0 1px 4px rgba(0, 0, 0, 0.55));
}
.rc-dup b {
  position: absolute;
  left: 69px;
  top: 17.7px;
  width: 36px;
  height: 36.9px;
  display: flex;
  align-items: center;
  font-size: 21px;
  font-weight: 500;
  line-height: 1;
  color: #ffffff;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.85);
}

/* ==================== 部件详情 ====================
   坐标全部来自实机截图量测（1918×1078），与 1920×1080 基准差 ±1px。
   1920 设计坐标系，子元素一律 position:absolute。 */
.detail {
  position: absolute;
  inset: 0;
  cursor: var(--nk-cursor, auto), pointer;
  overflow: hidden;
  background: #120b20;
}
.dt-bg {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  object-fit: fill;
}
.dt-glow {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  object-fit: fill;
  mix-blend-mode: screen;
  opacity: 0.62;
  /* 实机的暖光只在「底部偏左」一团 */
  -webkit-mask-image: radial-gradient(ellipse 1400px 760px at 36% 106%,
    #000 0%, #000 34%, rgba(0, 0, 0, 0.55) 60%, transparent 82%);
  mask-image: radial-gradient(ellipse 1400px 760px at 36% 106%,
    #000 0%, #000 34%, rgba(0, 0, 0, 0.55) 60%, transparent 82%);
  pointer-events: none;
}
.dt-logo {
  position: absolute;
  left: 1095px;
  top: 90px;
  width: 784px;
  height: 854px;
  object-fit: fill;
  opacity: 0.5;
  filter: brightness(0.55) saturate(0.8);
  pointer-events: none;
}
.dt-ring {
  position: absolute;
  left: 1573px;
  top: 757px;
  width: 286px;
  height: 280px;
  object-fit: fill;
  transform-origin: 50% 50%;
  animation: dtRingSpin 36s linear infinite;
  pointer-events: none;
}
@keyframes dtRingSpin { to { transform: rotate(360deg); } }
.dt-textbar {
  position: absolute;
  left: 1575px;
  top: 543px;
  width: 261px;
  height: 33px;
  object-fit: fill;
  pointer-events: none;
}
.dt-underline {
  position: absolute;
  left: 1576px;
  top: 581px;
  width: 300px;
  height: 18px;
  object-fit: fill;
  pointer-events: none;
}
.dt-board {
  position: absolute;
  left: 970px;
  top: 340px;
  width: 670px;
  height: 338px;
  object-fit: fill;
  pointer-events: none;
}
.dt-ornament {
  position: absolute;
  left: 1212px;
  top: 373px;
  width: 99px;
  height: 90px;
  object-fit: fill;
  pointer-events: none;
}
/* 新件角标 */
.dt-new {
  position: absolute;
  left: 806px;
  top: 206px;
  width: 118px;
  height: 118px;
  object-fit: contain;
  z-index: 6;
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(255, 170, 190, 0.7));
  animation: dtNewPulse 2.4s ease-in-out infinite;
}
@keyframes dtNewPulse {
  0%, 100% { filter: drop-shadow(0 0 10px rgba(255, 170, 190, 0.55)); }
  50% { filter: drop-shadow(0 0 20px rgba(255, 190, 205, 0.95)); }
}

.dt-cardwrap {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  transform-origin: 645px 552px;
  z-index: 2;
}

.dt-cardwrap > * { max-width: none; }
.dt-line2 {
  position: absolute;
  left: 415px;
  top: 231px;
  width: 329px;
  height: 55px;
  object-fit: fill;
  pointer-events: none;
}
.dt-silk {
  position: absolute;
  left: 634px;
  top: 753px;
  width: 249px;
  height: 144px;
  object-fit: fill;
  pointer-events: none;
}
.dt-char {
  position: absolute;
  left: 435px;
  top: 257px;
  width: 420px;
  height: 585px;
  object-fit: cover;
  object-position: 50% 50%;
  pointer-events: none;
}
.dt-frame {
  position: absolute;
  left: 427px;
  top: 250px;
  width: 436px;
  height: 600px;
  object-fit: fill;
  pointer-events: none;
}
.dt-ribbon {
  position: absolute;
  left: 772px;
  top: 197px;
  width: 184px;
  height: 488px;
  object-fit: fill;
  opacity: 0.9;
  pointer-events: none;
  z-index: 3;
}
.dt-arc {
  position: absolute;
  object-fit: fill;
  pointer-events: none;
  z-index: 3;
}
.dt-arc.a { left: 325px; top: 297px; width: 176px; height: 259px; }
.dt-arc.b { left: 392px; top: 373px; width:  68px; height: 114px; }
.dt-arc.c { left: 390px; top: 556px; width:  70px; height: 103px; }

.dt-name {
  position: absolute;
  left: 1031px;
  top: 388px;
  margin: 0;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 56px;
  font-weight: 400;
  line-height: 1;
  color: #fff;
  white-space: nowrap;
  text-shadow:
    0 0 14px rgba(170, 190, 220, 0.3),
    0 0 4px rgba(205, 215, 235, 0.25),
    0 2px 6px rgba(0, 0, 0, 0.18);
  z-index: 4;
}
.dt-stars {
  position: absolute;
  left: 1038px;
  top: 474px;
  display: flex;
  gap: 0;
  z-index: 4;
}
.dt-stars img {
  width: 56px;
  height: 57px;
  object-fit: contain;
  margin-right: -22px;
}
.dt-stars img:last-child { margin-right: 0; }
/* 星级一律用素材本色 */
.dt-stars.s5 { filter: drop-shadow(0 0 10px rgba(255, 200, 120, 0.8)); }
.dt-stars.s4 { filter: drop-shadow(0 0 6px rgba(255, 214, 160, 0.45)); }

.dt-tag {
  position: absolute;
  left: 1049px;
  top: 542px;
  width: 106px;
  height: 31px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 20px;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 2px rgba(30, 40, 70, 0.25);
  z-index: 4;
}
.dt-labels {
  position: absolute;
  left: 1049px;
  top: 591px;
  display: flex;
  gap: 12px;
  z-index: 4;
}
.dt-label {
  width: 108px;
  height: 37px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 20px;
  line-height: 1;
  color: #8da9f1;
  text-shadow: 0 1px 2px rgba(30, 40, 70, 0.2);
  white-space: nowrap;
}
.dt-divline {
  position: absolute;
  left: 1053px;
  top: 640px;
  width: 654px;
  height: 3px;
  object-fit: fill;
  opacity: 0.75;
  pointer-events: none;
  z-index: 4;
}
.dt-desc {
  position: absolute;
  left: 1051px;
  top: 663px;
  width: 690px;
  margin: 0;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 24px;
  line-height: 31px;
  color: #dcd8da;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.35);
  z-index: 4;
}

.dt-tips {
  position: absolute;
  left: 0;
  top: 866px;
  width: 473px;
  height: 123px;
  object-fit: fill;
  pointer-events: none;
  z-index: 3;
}
.dt-drop {
  position: absolute;
  left: 29px;
  top: 886px;
  width: 76px;
  height: 76px;
  object-fit: contain;
  filter: drop-shadow(0 2px 12px rgba(120, 150, 255, 0.35));
  pointer-events: none;
  z-index: 4;
}
.dt-ex-k,
.dt-ex-n {
  position: absolute;
  left: 121px;
  white-space: nowrap;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  line-height: 1;
  z-index: 4;
}
.dt-ex-k {
  top: 888px;
  font-size: 20px;
  color: #b59466;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}
.dt-ex-n {
  top: 935px;
  font-size: 26px;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
.dt-ex-n em {
  font-style: normal;
  margin-left: 6px;
  color: #e8e4dc;
}

.dh-skip {
  position: absolute;
  left: 1677px;
  top: 18px;
  width: 76px;
  height: 77px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  z-index: 20;
}
.ds-n,
.ds-h {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.16s ease;
}
.ds-h { opacity: 0; }
.dh-skip:hover .ds-h { opacity: 1; }
.dt-skip-txt {
  position: absolute;
  left: 1753px;
  top: 42px;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 30px;
  letter-spacing: 2px;
  line-height: 1;
  color: #c2c0c2;
  white-space: nowrap;
  text-shadow:
    0 2px 5px rgba(190, 170, 140, 0.18),
    0 0 8px rgba(255, 210, 160, 0.08);
  z-index: 20;
}

.df-cap,
.df-txt,
.df-slash {
  position: absolute;
  top: 1017px;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 24px;
  line-height: 1;
  color: #fff;
  white-space: nowrap;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  z-index: 20;
}
.df-cap {
  position: absolute;
  left: 1400px;
  top: 1014px;
  width: 38px;
  height: 24px;
  overflow: visible;
  z-index: 20;
}
.df-txt.esc { left: 1446px; }
/* F 与鼠标两个键帽**必须等大 */
.df-f {
  position: absolute;
  left: 1569px;
  top: 1015px;
  width: 24px;
  height: 24px;
  object-fit: contain;
  z-index: 20;
}
.df-slash { left: 1596px; font-size: 24px; color: #d5d1d3; }
.df-mouse {
  position: absolute;
  left: 1611px;
  top: 1015px;
  width: 24px;
  height: 24px;
  object-fit: contain;
  z-index: 20;
}
.df-txt.go { left: 1648px; }

.dt-uid {
  position: absolute;
  left: 9px;
  top: 1056px;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 17px;
  line-height: 1;
  color: #d8d0be;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
  white-space: nowrap;
  z-index: 20;
}

/* 入场动效 */
.detail .dt-cardwrap { animation: dtCardIn 2s linear both; }
.detail .dt-ribbon { animation: dtRibbonIn 2s linear both; }
.detail .dt-arc { animation: dtDecoIn 2s linear both; }
.detail .dt-board,
.detail .dt-ornament,
.detail .dt-divline,
.detail .dt-name,
.detail .dt-desc,
.detail .dt-tag,
.detail .dt-labels { animation: dtInfoIn 2s linear both; }
.detail .dt-logo { animation: dtLogoIn 2s linear both; }
.detail .dt-textbar { animation: dtBarIn 2s linear both; }
.detail .dt-underline { animation: dtUnderlineIn 2s linear both; }
.detail .dt-tips,
.detail .dt-drop,
.detail .dt-ex-k,
.detail .dt-ex-n { animation: dtItemIn 2s linear both; }
.detail .dt-stars img:nth-child(1) { animation: dtStar1 2s linear both; }
.detail .dt-stars img:nth-child(2) { animation: dtStar2 2s linear both; }
.detail .dt-stars img:nth-child(3) { animation: dtStar3 2s linear both; }
.detail .dt-stars img:nth-child(4) { animation: dtStar4 2s linear both; }
.detail .dt-stars img:nth-child(5) { animation: dtStar5 2s linear both; }
/* 「新」角标 */
.detail .dt-new { animation: dtNewIn 2s linear both, dtNewPulse 2.4s ease-in-out infinite; }
@keyframes dtNewIn {
  0%, 45% { opacity: 0; }
  65%     { opacity: 1; }
  100%    { opacity: 1; }
}

/* 立绘组合 */
@keyframes dtCardIn {
  0%   { transform: translate(315px, -12px) scale(0.8); }
  15%  { transform: translate(315px, -12px) scale(0.8); }
  27.5%{ transform: translate(315px, -12px) scale(1); }
  32.5%{ transform: translate(110px, -4px) scale(1); }
  37.5%{ transform: translate(20px, -1px) scale(1); }
  42.5%{ transform: translate(0, 0) scale(1); }
  100% { transform: translate(0, 0) scale(1); }
}
/* 丝带绕底部角尖摆正 */
@keyframes dtRibbonIn {
  0%, 40% { opacity: 0; transform: rotate(-15deg); }
  47.5%   { opacity: 0.9; transform: rotate(0deg); }
  100%    { opacity: 0.9; transform: rotate(0deg); }
}
/* 左侧金弧自右 */
@keyframes dtDecoIn {
  0%, 40% { opacity: 0; transform: translateX(20px); }
  47.5%   { opacity: 1; transform: translateX(0); }
  100%    { opacity: 1; transform: translateX(0); }
}
/* 信息组自左 */
@keyframes dtInfoIn {
  0%, 30% { opacity: 0; transform: translateX(-100px); }
  42.5%   { opacity: 1; transform: translateX(0); }
  100%    { opacity: 1; transform: translateX(0); }
}
/* 罗盘 */
@keyframes dtLogoIn {
  0%, 35% { transform: scale(0.1); }
  45%     { transform: scale(1); }
  100%    { transform: scale(1); }
}
/* 装饰条 / 下划线逐像素自左向右浮现 */
@keyframes dtBarIn {
  0%, 45% { clip-path: inset(0 100% 0 0); }
  50%     { clip-path: inset(0 0 0 0); }
  100%    { clip-path: inset(0 0 0 0); }
}
@keyframes dtUnderlineIn {
  0%, 50% { clip-path: inset(0 100% 0 0); }
  57.5%   { clip-path: inset(0 0 0 0); }
  100%    { clip-path: inset(0 0 0 0); }
}
/* 道具组自左 */
@keyframes dtItemIn {
  0%, 60% { opacity: 0; transform: translateX(-70px); }
  76%     { opacity: 1; transform: translateX(0); }
  100%    { opacity: 1; transform: translateX(0); }
}
/* 星星 */
@keyframes dtStar1 {
  0%, 45% { opacity: 0; transform: translateX(30px) scale(1); filter: brightness(1); }
  50%, 57.5% { opacity: 1; transform: translateX(30px) scale(3); filter: brightness(3); }
  60%, 100% { opacity: 1; transform: translateX(0) scale(1); filter: brightness(1); }
}
@keyframes dtStar2 {
  0%, 45% { opacity: 0; transform: translateX(30px) scale(1); filter: brightness(1); }
  50%, 57.5% { opacity: 1; transform: translateX(30px) scale(3); filter: brightness(3); }
  62.5%, 100% { opacity: 1; transform: translateX(0) scale(1); filter: brightness(1); }
}
@keyframes dtStar3 {
  0%, 45% { opacity: 0; transform: translateX(30px) scale(1); filter: brightness(1); }
  50%, 57.5% { opacity: 1; transform: translateX(30px) scale(3); filter: brightness(3); }
  65%, 100% { opacity: 1; transform: translateX(0) scale(1); filter: brightness(1); }
}
@keyframes dtStar4 {
  0%, 45% { opacity: 0; transform: translateX(30px) scale(1); filter: brightness(1); }
  50%, 57.5% { opacity: 1; transform: translateX(30px) scale(3); filter: brightness(3); }
  67.5%, 100% { opacity: 1; transform: translateX(0) scale(1); filter: brightness(1); }
}
@keyframes dtStar5 {
  0%, 45% { opacity: 0; transform: translateX(30px) scale(1); filter: brightness(1); }
  50%, 57.5% { opacity: 1; transform: translateX(30px) scale(3); filter: brightness(3); }
  70%, 100% { opacity: 1; transform: translateX(0) scale(1); filter: brightness(1); }
}


/* ==================== 套装获得 ====================
   基准 `图片/游戏实机/套装展示-潮汐鲨影-实机.png`（1918×1078）逐层量测。
   背景 = clothes_bg(155×87) 整屏拉伸 + clothes_bg_right(1188×1080) 右贴渐融。 */
.suit {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #171009;
  cursor: var(--nk-cursor, auto), pointer;
}
.su-bg {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  object-fit: fill;
  pointer-events: none;
}
.su-cardglow {
  position: absolute;
  left: 338px;
  top: -210px;
  width: 1256px;
  height: 1095px;
  object-fit: contain;
  mix-blend-mode: screen;
  opacity: 0.75;
  pointer-events: none;
}
.su-orn {
  position: absolute;
  left: 7px;
  top: 25.7px;
  width: 1895px;
  height: 950px;
  object-fit: fill;
  opacity: 0.85;
  pointer-events: none;
}
.su-dring {
  position: absolute;
  left: 1573px;
  top: 757px;
  width: 286px;
  height: 280px;
  object-fit: fill;
  transform-origin: 50% 50%;
  animation: dtRingSpin 36s linear infinite;
  pointer-events: none;
}
.su-rays {
  position: absolute;
  left: 522px;
  top: 80px;
  width: 850px;
  height: 850px;
  background: repeating-conic-gradient(
    rgba(255, 226, 172, 0.155) 0deg 0.9deg,
    transparent 0.9deg 4.2deg
  );
  -webkit-mask-image: radial-gradient(circle,
    rgba(0, 0, 0, 0.9) 12%, rgba(0, 0, 0, 0.5) 40%, transparent 68%);
  mask-image: radial-gradient(circle,
    rgba(0, 0, 0, 0.9) 12%, rgba(0, 0, 0, 0.5) 40%, transparent 68%);
  transform-origin: 50% 50%;
  animation: dtRingSpin 36s linear infinite;
  pointer-events: none;
}
.su-glowarc {
  position: absolute;
  left: 440px;
  top: 668px;
  width: 1240px;
  height: 259px;
  object-fit: fill;
  mix-blend-mode: screen;
  opacity: 0.1;
  pointer-events: none;
}
.su-glowbot {
  position: absolute;
  left: 728px;
  top: 794px;
  width: 470px;
  height: 67px;
  object-fit: fill;
  mix-blend-mode: screen;
  opacity: 0.85;
  pointer-events: none;
}
.su-band {
  position: absolute;
  left: 596px;
  top: 672px;
  width: 720px;
  height: 300px;
  object-fit: fill;
  pointer-events: none;
}

.su-card {
  position: absolute;
  left: 723px;
  top: 94px;
  width: 476px;
  height: 756px;
  animation: suitIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.sc-body {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  filter: brightness(1.06) saturate(0.96);
  pointer-events: none;
}
/* 卡顶拱部的白色光晕 */
.sc-halo {
  position: absolute;
  left: 50%;
  top: -34px;
  width: 680px;
  height: 430px;
  transform: translateX(-50%);
  background: radial-gradient(50% 55% at 50% 46%, rgba(255, 246, 218, 0.45) 0%, rgba(255, 238, 196, 0.18) 52%, transparent 74%);
  mix-blend-mode: screen;
  pointer-events: none;
}
.sc-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  filter: drop-shadow(0 18px 44px rgba(0, 0, 0, 0.55));
  pointer-events: none;
}
/* 顶端两层装饰 */
.sc-deco {
  position: absolute;
  object-fit: contain;
  pointer-events: none;
}
.sc-deco-light {
  left: 377px;
  top: 66px;
  width: 150px;
  height: 132px;
  opacity: 0.36;
}
.sc-deco-orn {
  left: 402px;
  top: 76px;
  width: 117px;
  height: 100px;
  opacity: 0.42;
}
/* 立绘 */
/* 立绘 */
.sc-portrait {
  position: absolute;
  left: 10px;
  top: 95px;
  width: 456px;
  height: 647px;
  object-fit: cover;
  object-position: center top;
  filter: drop-shadow(0 10px 26px rgba(0, 0, 0, 0.42));
}

/* 第二套 */
.sc-second {
  position: absolute;
  left: 0;
  top: 20px;
  width: 100%;
  text-align: center;
  font-family: 'NikkiYaHei', 'NikkiBodyBold', sans-serif;
  font-size: 28px;
  line-height: 1;
  letter-spacing: 0.12em;
  text-indent: 0.12em;
  color: #fff;
  text-shadow: 0 0 16px rgba(255, 214, 140, 0.6), 0 2px 10px rgba(40, 24, 8, 0.65);
  pointer-events: none;
  z-index: 5;
}

.su-badge {
  position: absolute;
  left: 666px;
  top: 310px;
  width: 120px;
  height: 120px;
  animation: suitIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.su-badge > * { position: absolute; }
.su-badge img { max-width: none; }

/* 1) 空槽 schedule_02（190×196，内容 129×130）→ 内容拉到 Ø126（实机暗环外径 665..790）
   ⚠️ 素材的暗圈带右下投影，bbox 中心比圈心偏右 → 用 left 微调 3px 对齐圆心 */
.sud-slot {
  left: -29.8px;
  top: -33px;          /* 比盘面圆心低 2px（实机底图1/底图2 圆心差 2px → 槽上细下粗） */
  width: 185.6px;
  height: 190px;
  object-fit: fill;
  pointer-events: none;
}
.sud-face {
  left: 6px;
  top: 6px;
  width: 108px;
  height: 108px;
  object-fit: fill;
  pointer-events: none;
}
.sud-flash {
  left: -22.5px;
  top: -22.5px;
  width: 165px;
  height: 165px;
  object-fit: contain;
  pointer-events: none;
  animation: sudFlashStep 0.4s ease-out both;
}
.su-badge.is-full .sud-flash {
  animation: sudFlashFull 0.6s ease-out both;
}
/* 0 → 50% 后直接切走（99% 处硬切，实机是「亮一下」而不是慢慢淡出） */
@keyframes sudFlashStep {
  0% { opacity: 0; }
  99% { opacity: 0.5; }
  100% { opacity: 0; }
}
@keyframes sudFlashFull {
  0% { opacity: 0; }
  99% { opacity: 0.8; }
  100% { opacity: 0; }
}
/* 4) 进度弧：落在空槽上（r 54..60 → 盒子 90%~100%），颜色取星饰同族、偏白更亮 */
.sud-prog {
  /* 盒 */
  left: -6px;
  top: -6px;
  width: 132px;
  height: 132px;
  border-radius: 50%;
  background: conic-gradient(from 0deg,
    #ddffca 0deg calc(var(--p, 100) * 3.6deg),
    transparent calc(var(--p, 100) * 3.6deg) 360deg);
  -webkit-mask: radial-gradient(circle closest-side, transparent 81%, #000 83.5%, #000 97.5%, transparent 99%);
  mask: radial-gradient(circle closest-side, transparent 81%, #000 83.5%, #000 97.5%, transparent 99%);
  pointer-events: none;
}
/* 已集齐 */
.su-badge.is-full .sud-prog {
  background: conic-gradient(from 0deg, #fff4d8 0deg 360deg);
}

/* 5) 起始点四角星 schedule_star（25×41，内容 24×36）→ 40×62，尖端压在空槽上沿 */
.sud-star {
  left: 50%;
  top: -22px;   /* 星饰最宽行在素材 43.9% 处 → 让它落在空槽上沿 */
  width: 32px;
  height: 48px;
  transform: translateX(-50%);
  object-fit: contain;
  filter: drop-shadow(0 0 6px rgba(255, 244, 210, 0.75));
  pointer-events: none;
}
/* 6) 左半金环 ornament_02（140×155，圆面圆心 (132,72) R72）→ 1.139x，圆心对齐盘面圆心 */
.sud-orn2 {
  left: -90.4px;
  top: -22px;
  width: 159.5px;
  height: 176.5px;
  object-fit: fill;
  opacity: 0.9;
  pointer-events: none;
}
/* 文案 */
.sud-txt {
  left: 0;
  top: 0;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}
.sud-num {
  font-size: 46px;
  line-height: 1;
  color: #f4d998;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.8);
}
.sud-total {
  font-size: 26px;
  line-height: 1;
  margin: 10px 0 0 2px;
  color: #f4f2ee;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}
/* 已集齐 */
.sud-full-txt {
  left: 0;
  top: 0;
  width: 120px;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  line-height: 1;
  letter-spacing: 1px;
  color: #fffdf4;
  text-shadow: 0 0 14px rgba(255, 226, 150, 0.9), 0 2px 8px rgba(0, 0, 0, 0.75);
  pointer-events: none;
}

.su-name h2 {
  position: absolute;
  left: 0;
  top: 818px;
  width: 1920px;
  margin: 0;
  text-align: center;
  font-family: 'NikkiYaHei', 'NikkiBodyBold', sans-serif;
  font-size: 52px;
  line-height: 1;
  letter-spacing: -0.02em;
  color: #fff;
  text-shadow: 0 0 26px rgba(210, 170, 255, 0.35), 0 4px 20px rgba(0, 0, 0, 0.6);
}
/* 星级 */
.sn-stars {
  position: absolute;
  left: 0;
  top: 859px;
  width: 1920px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0;
}
.sn-stars img {
  width: 58px;
  height: 55px;
  object-fit: contain;
  margin-right: -18px;
  filter: drop-shadow(0 0 7px rgba(255, 226, 158, 0.75));
}
.sn-stars img:last-child { margin-right: 0; }
.sn-tag {
  position: absolute;
  left: 911px;
  top: 956px;
  width: 98px;
  height: 27px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 20px;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 3px rgba(20, 40, 70, 0.4);
}

.suit .df-cap { left: 1386px; top: 1013px; width: 55px; height: 34px; }
.suit .df-txt { font-weight: 700; }
.suit .df-txt.esc { left: 1444px; }
.suit .df-f { left: 1570px; top: 1014px; width: 26px; height: 26px; }
.suit .df-slash { left: 1599px; font-size: 26px; }
.suit .df-mouse { left: 1615px; top: 1014px; width: 27px; height: 27px; }
.suit .df-txt.go { left: 1650px; }
/* 底部横向点状装饰带 */
.su-dotline {
  position: absolute;
  left: 90px;
  top: 1046px;
  width: 1740px;
  height: 16px;
  background: radial-gradient(circle 1.6px at 7px 8px, rgba(238, 222, 180, 0.5) 98%, transparent 100%) repeat-x;
  background-size: 14px 16px;
  pointer-events: none;
}

@keyframes suitIn {
  from { opacity: 0; transform: translateY(26px) scale(0.94); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
