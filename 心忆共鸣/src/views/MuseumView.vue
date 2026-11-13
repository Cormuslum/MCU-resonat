<script setup lang="ts">
/**
 * 博物图鉴 · 主界面：背景图烘焙标题/选项卡/返回图标/入口物体，这里只叠透明热区。
 * 热区轮廓来自 `src/data/museum-hits.ts`；热区按钮须撑满 1920×1080（`clip-path` 用绝对坐标）。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { play } from '@/composables/useAudio'
import { HITS, type MuseumHitKey, type Pt } from '@/data/museum-hits'
import SearchPopup from '@/components/SearchPopup.vue'
import { clearHops, pushHop, takeHop, withSearchResume, resumeKeyword } from '@/composables/useNavBack'
import type { SearchItem } from '@/components/SearchPopup.vue'
import { searchMuseum, PAGE_LABEL } from '@/core/museum-search'
import { parentOf } from '@/router'

const store = useGameStore()
const route = useRoute()
const router = useRouter()
const ui = computed(() => store.manifest?.ui)

const asset = (p: string | null | undefined) => store.asset(p)

/* ══════════════════════════════════════════ 区域 */
type Region = 'wish' | 'yizan'
const REGION_LABEL: Record<Region, string> = { wish: '心愿原野', yizan: '伊赞之土' }
const region = ref<Region>('wish')

const bgOf = (r: Region) => asset(r === 'wish' ? ui.value?.museum.bgWish : ui.value?.museum.bgYizan)
const splitOf = (r: Region, k: MuseumHitKey) => asset(ui.value?.museum.split[`${r}-${k}`])

/* ══════════════════════════════════════════ 热区 */
/**
 * 入口物体：label 只用于无障碍（`aria-label`）。
 */
const ITEMS: { key: MuseumHitKey; label: string }[] = [
  { key: 'clothes', label: '服装图鉴' },
  { key: 'story', label: '故事图鉴' },
  { key: 'reading', label: '阅读物图鉴' },
  { key: 'search', label: '搜索' },
]

function clipOf(pts: Pt[]): string {
  return `polygon(${pts.map(([x, y]) => `${x}px ${y}px`).join(', ')})`
}

/** 悬停 / 选中（按下未抬起也算）—— 只有一块会亮 */
const litKey = ref<MuseumHitKey | null>(null)
function light(k: MuseumHitKey) {
  litKey.value = k
}
function unlight(k: MuseumHitKey) {
  if (litKey.value === k) litKey.value = null
}

/* ══════════════════════════════════════════ 区域切换：整屏碎裂 → 粒子重构 */
/**
 * 切换特效时间轴（总 1100ms）：0ms 块状飞散 + 虚空淡入 → 420ms 换底图 → 520ms 虚空淡出 → 1100ms 清空小块。
 */
const TILE_W = 64
const TILE_H = 54
const SWAP_MS = 1100
const BREAK_MS = 420

interface Cell {
  i: number
  x: number
  y: number
  tx: number
  ty: number
  rot: number
  delay: number
  dur: number
}

const swapping = ref(false)
const phase = ref<'break' | 'rebuild'>('break')
const voidOn = ref(false)
const cells = ref<Cell[]>([])
const incoming = ref<Region | null>(null)

/** 动画期间底图直接指向目标区域（被虚空遮住，看不见切换过程） */
const bgNow = computed(() => bgOf(incoming.value ?? region.value))

let timers: number[] = []

function buildCells() {
  const arr: Cell[] = []
  let i = 0
  for (let y = 0; y < 1080; y += TILE_H) {
    for (let x = 0; x < 1920; x += TILE_W) {
      arr.push({
        i: i++,
        x,
        y,
        // 飞散方向：靠中心的块往外炸，边缘的块往画面外甩
        tx: (x / 1920 - 0.5) * 320 + (Math.random() - 0.5) * 180,
        ty: (y / 1080 - 0.5) * 240 + (Math.random() - 0.5) * 160,
        rot: (Math.random() - 0.5) * 110,
        delay: Math.random() * 110,
        dur: 340 + Math.random() * 160,
      })
    }
  }
  cells.value = arr
}

function clearSweep() {
  for (const t of timers) window.clearTimeout(t)
  timers = []
}

function setRegion(r: Region) {
  if (r === region.value || swapping.value) return
  play('big-b-select', { volume: 0.6 })
  litKey.value = null

  const run = () => {
    swapping.value = true
    phase.value = 'break'
    voidOn.value = false
    buildCells()

    // 破碎的同时压暗
    requestAnimationFrame(() => (voidOn.value = true))

    timers.push(
      window.setTimeout(() => {
        incoming.value = r
        phase.value = 'rebuild'
      }, BREAK_MS),
      window.setTimeout(() => {
        region.value = r
        incoming.value = null
        swapping.value = false
        voidOn.value = false
        cells.value = []
      }, SWAP_MS),
    )
  }

  // 先解码目标底图再起动画
  const probe = new Image()
  probe.src = bgOf(r)
  const go = () => run()
  if (probe.decode) probe.decode().then(go).catch(go)
  else probe.onload = go
}

/** 小块贴的是哪张图：破碎阶段 = 旧界面，重构阶段 = 新界面 */
const cellImg = computed(() => (phase.value === 'break' ? bgOf(region.value) : bgOf(incoming.value ?? region.value)))

/* ══════════════════════════════════════════ 搜索弹窗 */
const searching = ref(false)
const kw = ref('')

const results = computed<SearchItem[]>(() => searchMuseum(kw.value, store))

/** 搜索结果选中：服装 → 跳转到服装子界面并定位套装；阅读 → 跳转到阅读物子界面并定位；故事 → 暂以提示占位 */
function onSearchSelect(r: SearchItem) {
  const [name, page] = r.title.split('｜')
  const path =
    page === PAGE_LABEL.clothes ? '/codex/clothes'
    : page === PAGE_LABEL.reading ? '/codex/readings'
    : page === PAGE_LABEL.story ? '/codex/stories'
    : ''
  if (path) {
    pushHop(withSearchResume(route.fullPath, kw.value))
    router.push({ path, query: { name } })
  } else {
    hint('暂不支持该页跳转')
  }
  closeSearch()
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

function openSearch() {
  play('nav-select', { volume: 0.7 })
  searching.value = true
}
const closeSearch = () => { searching.value = false; kw.value = '' }

/* ══════════════════════════════════════════ 导航 */
const toast = ref('')
let toastTimer = 0
function hint(msg: string) {
  toast.value = msg
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = ''), 1600)
}

function enter(k: MuseumHitKey) {
  if (k === 'search') return openSearch()
  if (k === 'clothes') {
    play('nav-select', { volume: 0.8 })
    pushHop(route.fullPath)
    router.push('/codex/clothes')
    return
  }
  if (k === 'reading') {
    play('nav-select', { volume: 0.8 })
    pushHop(route.fullPath)
    router.push('/codex/readings')
    return
  }
  if (k === 'story') {
    play('nav-select', { volume: 0.8 })
    pushHop(route.fullPath)
    router.push('/codex/stories')
    return
  }
  play('common-hover', { volume: 0.5 })
}

function goBack() {
  clearHops() // 清掉 ESC 返回栈
  play('back-select', { volume: 0.8 })
  router.push(parentOf(route.path))
}

/* 返回键：与烘焙图标等大重合（65×65 @35,16） */
const BACK = { x: 35, y: 16, w: 65, h: 65 }
/* 顶栏选项卡热区（烘焙图实测） */
const TABS: Record<Region, { x: number; y: number; w: number; h: number }> = {
  wish: { x: 728, y: 12, w: 240, h: 66 },
  yizan: { x: 998, y: 12, w: 204, h: 66 },
}

function onKey(e: KeyboardEvent) {
  const k = e.key.toLowerCase()
  if (k === 'escape') {
    e.preventDefault()
    if (searching.value) {
      closeSearch()
      return
    }
    const back = takeHop()
    if (back) {
      router.replace(back)
      return
    }
    goBack()
    return
  }
  if (searching.value) return
  if (k === 'Escape') {
    goBack()
    return
  }
  if (k === 'q') {
    e.preventDefault()
    setRegion('wish')
  } else if (k === 'e') {
    e.preventDefault()
    setRegion('yizan')
  }
}

onMounted(() => {
  resumeSearch()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.clearTimeout(toastTimer)
  clearSweep()
})
</script>

<template>
  <div v-if="ui" class="museum">
    <!-- 背景 -->
    <img class="mz-bg" :src="bgNow" alt="" draggable="false" />

    <!-- 切换特效：深色虚空 + 整屏小块（先碎旧的，再拼新的） -->
    <template v-if="swapping">
      <i class="mz-void" :class="{ on: voidOn }"></i>
      <div class="mz-cells">
        <i
          v-for="c in cells"
          :key="phase + '-' + c.i"
          class="mz-cell"
          :class="phase"
          :style="{
            left: c.x + 'px',
            top: c.y + 'px',
            width: TILE_W + 'px',
            height: TILE_H + 'px',
            backgroundImage: `url(${cellImg})`,
            backgroundPosition: `-${c.x}px -${c.y}px`,
            '--tx': c.tx + 'px',
            '--ty': c.ty + 'px',
            '--rot': c.rot + 'deg',
            animationDelay: c.delay + 'ms',
            animationDuration: c.dur + 'ms',
          }"
        ></i>
      </div>
      <i class="mz-flash"></i>
    </template>

    <!-- ============ 悬停/选中金光（拆分图当 drop-shadow 载体 + 金色薄层的 mask） ============ -->
    <template v-for="it in ITEMS" :key="'g' + it.key">
      <img
        class="mz-split"
        :class="{ lit: litKey === it.key }"
        :src="splitOf(region, it.key)"
        alt=""
        draggable="false"
      />
      <i
        class="mz-sheen"
        :class="{ lit: litKey === it.key }"
        :style="{
          maskImage: `url(${splitOf(region, it.key)})`,
          WebkitMaskImage: `url(${splitOf(region, it.key)})`,
        }"
      ></i>
    </template>

    <!-- ============ 轮廓热区（按钮撑满全屏，clip-path 用绝对坐标） ============ -->
    <button
      v-for="it in ITEMS"
      :key="'h' + it.key"
      class="mz-hit"
      :style="{ clipPath: clipOf(HITS[region][it.key]) }"
      :aria-label="it.label"
      :disabled="swapping"
      @mouseenter="light(it.key)"
      @mouseleave="unlight(it.key)"
      @focus="light(it.key)"
      @blur="unlight(it.key)"
      @pointerdown="light(it.key)"
      @click="enter(it.key)"
    ></button>

    <!-- ============ 顶栏选项卡（烘焙，只做热区） ============ -->
    <button
      v-for="r in (['wish', 'yizan'] as Region[])"
      :key="r"
      class="mz-tab"
      :style="{ left: TABS[r].x + 'px', top: TABS[r].y + 'px', width: TABS[r].w + 'px', height: TABS[r].h + 'px' }"
      :disabled="swapping"
      @click="setRegion(r)"
    >
      <span class="sr-only">{{ REGION_LABEL[r] }}</span>
    </button>

    <!-- ============ 返回键（与烘焙图标等大重合） ============ -->
    <button
      class="mz-back"
      :style="{ left: BACK.x + 'px', top: BACK.y + 'px', width: BACK.w + 'px', height: BACK.h + 'px' }"
      @click="goBack"
    >
      <img :src="asset(ui.museum.btnBackH)" alt="返回" draggable="false" />
    </button>

    <!-- ============ 搜索弹窗（跨子界面检索，复用 SearchPopup 模板） ============ -->
    <SearchPopup
      :open="searching"
      :query="kw"
      :results="results"
      placeholder="搜索 服装 / 故事 / 阅读物（如：小王子、5★、甜美）…"
      @update:query="kw = $event"
      @select="onSearchSelect"
      @close="closeSearch"
    />

    <!-- 轻提示 -->
    <transition name="mztoast">
      <div v-if="toast" class="mz-toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.museum {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  background: #2a1f18;
}
.mz-bg {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  object-fit: fill;
  pointer-events: none;
  user-select: none;
}

/* ---------- 切换特效：虚空 + 整屏小块 ---------- */
.mz-void {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  background:
    radial-gradient(900px 700px at 50% 50%, rgba(28, 22, 40, 0.94) 0%, rgba(10, 8, 16, 1) 62%, #050408 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.mz-void.on {
  opacity: 1;
}
.mz-cells {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  pointer-events: none;
}
.mz-cell {
  position: absolute;
  display: block;
  background-size: 1920px 1080px;
  background-repeat: no-repeat;
  animation-fill-mode: both;
}
/* 破碎：原地飞散 + 旋转 + 缩小 */
.mz-cell.break {
  animation-name: mzBreak;
  animation-timing-function: cubic-bezier(0.32, 0, 0.68, 0.42);
}
@keyframes mzBreak {
  0% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate3d(var(--tx), var(--ty), 0) rotate(var(--rot)) scale(0.28);
  }
}
/* 重构：从散乱位置聚回原位 */
.mz-cell.rebuild {
  animation-name: mzRebuild;
  animation-timing-function: cubic-bezier(0.16, 0.9, 0.3, 1);
}
@keyframes mzRebuild {
  0% {
    opacity: 0;
    transform: translate3d(var(--tx), var(--ty), 0) rotate(var(--rot)) scale(0.32);
  }
  100% {
    opacity: 1;
    transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
  }
}
/* 破碎/重构时整屏的一层迸光 */
.mz-flash {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  pointer-events: none;
  mix-blend-mode: screen;
  background: radial-gradient(
    760px 560px at 50% 48%,
    rgba(226, 238, 255, 0.5) 0%,
    rgba(196, 212, 255, 0.24) 44%,
    rgba(170, 190, 255, 0) 78%
  );
  opacity: 0;
  animation: mzFlash 1.1s ease-out both;
}
@keyframes mzFlash {
  0% {
    opacity: 0;
  }
  26% {
    opacity: 0.85;
  }
  62% {
    opacity: 0.35;
  }
  100% {
    opacity: 0;
  }
}

/* ---------- 悬停金光 ---------- */
.mz-split {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  object-fit: fill;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  max-width: none;
}
.mz-split.lit {
  opacity: 1;
  filter: brightness(1.1) saturate(1.14)
    drop-shadow(0 0 10px rgba(241, 243, 129, 1))
    drop-shadow(0 0 26px rgba(241, 243, 129, 0.9))
    drop-shadow(0 0 64px rgba(241, 243, 129, 0.55));
}
.mz-sheen {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  background: rgb(241, 243, 129);
  mix-blend-mode: screen;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
}
.mz-sheen.lit {
  opacity: 0.44;
}

/* ---------- 轮廓热区 ---------- */
.mz-hit {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: var(--nk-cursor, auto), pointer;
}
.mz-hit:disabled {
  cursor: default;
}

/* ---------- 顶栏选项卡热区 ---------- */
.mz-tab {
  position: absolute;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: var(--nk-cursor, auto), pointer;
}
.mz-tab:disabled {
  cursor: default;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* 返回键：`T_UI_btn_common_back_h` 是悬停/选中高亮态，常态透明 */
.mz-back {
  position: absolute;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  opacity: 0;
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.mz-back img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-width: none;
}
.mz-back:hover,
.mz-back:focus-visible {
  opacity: 1;
  transform: scale(1.06);
}

/* ---------- 轻提示 ---------- */
.mz-toast {
  position: absolute;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  padding: 12px 28px;
  border-radius: 10px;
  background: rgba(24, 16, 10, 0.82);
  color: #fff3d8;
  font-size: 24px;
  letter-spacing: 0.06em;
  z-index: 60;
}
.mztoast-enter-active,
.mztoast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.mztoast-enter-from,
.mztoast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
