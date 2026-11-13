<script setup lang="ts">
/**
 * 十连「恭喜获得」弹窗：滚轮 + 底部横条拖动翻页，点空白 / ESC 关闭，背板只压暗不做高斯模糊。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { toDesignX } from '@/core/stage'
import { play } from '@/composables/useAudio'

const store = useGameStore()
const ui = computed(() => store.manifest?.ui)

function asset(p: string | null | undefined) {
  return store.asset(p)
}

/* ---------------- 布局常量（pxdesk → 1920） ---------------- */
const PITCH = 169.2
const VIEW_W = 1100

interface Row {
  key: string
  icon: string | undefined
  name: string
  count: number
  bg: string | undefined
  isNew: boolean
  star: number
}

/**
 * 卡片数据：重复件折算材料并聚合成 1 张，抽到的服装每件出卡；底板按内容分色（3★ 蓝 / 4★ 紫 / 5★ 金）。
 */
const rows = computed<Row[]>(() => {
  const u = ui.value
  if (!u) return []
  const list = store.lastResults ?? []
  const out: Row[] = []

  // ① 材料卡（排在前面，和实机一致：静谧水滴 90 是第一张）
  const dropN = list.filter((r) => !r.isNew && Number(r.rarity) < 4).length * 10
  const sprayN = list
    .filter((r) => !r.isNew && Number(r.rarity) >= 4)
    .reduce((s, r) => s + (Number(r.rarity) >= 5 ? 10 : 4), 0)
  if (dropN) {
    out.push({ key: 'mat:drop', icon: u.result.mat3, name: '静谧水滴', count: dropN,
      bg: u.reward.item4, isNew: false, star: 3 })
  }
  if (sprayN) {
    out.push({ key: 'mat:spray', icon: u.result.mat4, name: '澎湃浪花', count: sprayN,
      bg: u.reward.item5, isNew: false, star: 5 })
  }

  // ② 服装卡：每件都出，同部件合并
  const at = new Map<string, number>()
  for (const r of list) {
    const star = Number(r.rarity)
    const key = 'part:' + r.part.id
    const hit = at.get(key)
    if (hit !== undefined) {
      out[hit].count += 1
      continue
    }
    at.set(key, out.length)
    out.push({
      key,
      icon: r.part.icon ?? r.part.card,
      name: r.part.displayName,
      count: 1,
      bg: star >= 5 ? u.reward.item5 : star >= 4 ? u.reward.item4 : u.reward.item3,
      isNew: r.isNew,
      star,
    })
  }
  return out
})

/* ---------------- 滚动（滚轮 + 横条拖动） ---------------- */
const maxShift = computed(() => Math.max(0, rows.value.length - VIEW_W / PITCH))
const shift = ref(0)
/** 每格位移，用于像素 ↔ 卡片换算 */
const progress = computed(() => (maxShift.value ? shift.value / maxShift.value : 0))

function clamp(v: number) {
  return Math.min(maxShift.value, Math.max(0, v))
}
function onWheel(e: WheelEvent) {
  // 一格滚轮 ≈ 1 张卡；触控板的小 delta 按比例走
  shift.value = clamp(shift.value + (e.deltaY + e.deltaX) / PITCH / 2)
}

let dragging = false
let dragX = 0
let dragFrom = 0
function dragStart(e: PointerEvent) {
  dragging = true
  // 记**设计坐标**，不然高分辨率下拖拽会跑得更快
  dragX = toDesignX(e.clientX)
  dragFrom = shift.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}
function dragMove(e: PointerEvent) {
  if (!dragging) return
  // 横条 185.6 宽对应整条轨道
  const trackPx = 185.6
  const dx = toDesignX(e.clientX) - dragX
  shift.value = clamp(dragFrom + (dx / trackPx) * maxShift.value)
}
function dragEnd() {
  dragging = false
}

/* ---------------- 关闭 ---------------- */
function close() {
  play('back-select', { volume: 0.6 })
  store.rewardOpen = false
}
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

onMounted(() => {
  play('panel-fadein', { volume: 0.4 })
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="ui" class="rw" @click="close" @wheel.prevent="onWheel">
    <!-- 背板：**只压暗，不做高斯模糊**（用户第 5 条） -->
    <div class="rw-veil" aria-hidden="true"></div>

    <!-- 标题组 -->
    <img class="rw-word" :src="asset(ui.reward.word)" alt="" draggable="false" />
    <img class="rw-section" :src="asset(ui.reward.section)" alt="" draggable="false" />
    <img class="rw-orn" :src="asset(ui.ver.descOrn)" alt="" draggable="false" />
    <h2 class="rw-title">恭喜获得</h2>

    <!-- 卡片条 -->
    <img class="rw-strip" :src="asset(ui.reward.strip)" alt="" draggable="false" />
    <div class="rw-view" @click.stop @wheel.prevent="onWheel">
      <div class="rw-track" :style="{ transform: `translateX(${-shift * PITCH}px)` }">
        <div
          v-for="(it, i) in rows"
          :key="it.key"
          class="rw-card"
          :style="{ left: i * PITCH + 'px' }"
        >
          <img class="rc-bg" :src="asset(it.bg)" alt="" draggable="false" />
          <img class="rc-ico" :src="asset(it.icon)" :alt="it.name" draggable="false" />
          <span class="rc-num num">{{ it.count }}</span>
          <img v-if="it.isNew" class="rc-new" :src="asset(ui.result.newBadge)" alt="新" draggable="false" />
        </div>
      </div>
    </div>

    <!-- 金线 -->
    <img class="rw-line" :src="asset(ui.reward.lineH)" alt="" draggable="false" />

    <!-- 箭头：**仅展示**，不绑任何点击 -->
    <img class="rw-arrow" :src="asset(ui.reward.arrow)" alt="" draggable="false" />

    <!-- 底部横条：可拖动翻页 -->
    <div
      class="rw-bar"
      @click.stop
      @pointerdown.stop="dragStart"
      @pointermove.stop="dragMove"
      @pointerup.stop="dragEnd"
      @pointercancel.stop="dragEnd"
    >
      <img class="rb-track" :src="asset(ui.reward.bar)" alt="" draggable="false" />
      <i class="rb-thumb" :style="{ left: progress * 100 + '%' }"></i>
    </div>

    <p class="rw-tip">点击空白处或按 ESC 关闭</p>
  </div>
</template>

<style scoped>
.rw {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  z-index: 300;
  cursor: var(--nk-cursor, auto), pointer;
}
.rw img { max-width: none; }

/* 只压暗 */
.rw-veil {
  position: absolute;
  inset: 0;
  background: rgba(8, 6, 14, 0.52);
}

/* ---------- 标题组（pxdesk 反查） ---------- */
.rw-word {
  position: absolute;
  left: 703.9px;
  top: 151.4px;
  width: 519.6px;
  height: 267.3px;
  object-fit: fill;
  pointer-events: none;
}
.rw-section {
  position: absolute;
  left: 805.2px;
  top: 223.4px;
  width: 312.9px;
  height: 301.8px;
  object-fit: fill;
  pointer-events: none;
}
.rw-orn {
  position: absolute;
  left: 627.6px;
  top: 232.8px;
  width: 721.3px;
  height: 208.5px;
  object-fit: fill;
  opacity: 0.72;
  pointer-events: none;
  filter: brightness(1.5) drop-shadow(0 0 8px rgba(255, 255, 255, 0.75));
}
.rw-title {
  position: absolute;
  left: 886.1px;
  top: 261.6px;
  width: 224.6px;
  margin: 0;
  text-align: center;
  font-family: 'NikkiYaHei', 'NikkiBodyBold', sans-serif;
  font-size: 44px;
  line-height: 50.8px;
  letter-spacing: 0.16em;
  text-indent: 0.16em;
  color: #f7ffcc;
  text-shadow: 0 0 20px rgba(255, 228, 160, 0.6), 0 2px 10px rgba(0, 0, 0, 0.5);
  pointer-events: none;
}

/* ---------- 卡片条 ---------- */
.rw-strip {
  position: absolute;
  left: 116px;
  top: 368.2px;
  width: 1732.1px;
  height: 323.3px;
  object-fit: fill;
  opacity: 0.72;
  pointer-events: none;
}
.rw-view {
  position: absolute;
  left: 404.5px;
  top: 468.1px;
  width: 1100px;
  height: 137.3px;
  overflow: hidden;
}
.rw-track {
  position: absolute;
  left: 0;
  top: 0;
  height: 137.3px;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}
.rw-card {
  position: absolute;
  top: 0;
  width: 126.7px;
  height: 137.3px;
}
.rc-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.rc-ico {
  position: absolute;
  left: 11px;
  top: 10px;
  width: 104.7px;
  height: 104.7px;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.3));
}
.rc-num {
  position: absolute;
  right: 9px;
  bottom: 5px;
  font-family: 'NikkiNumber', 'NikkiYaHei', sans-serif;
  font-size: 22px;
  line-height: 1;
  color: #fff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
}
.rc-new {
  position: absolute;
  left: 71.1px;
  top: -6.8px;
  width: 78.7px;
  height: 48.8px;
  object-fit: fill;
  pointer-events: none;
}

/* ---------- 金线 / 箭头 / 进度条 ---------- */
.rw-line {
  position: absolute;
  left: 136.3px;
  top: 623.8px;
  width: 1627.9px;
  height: 85px;
  object-fit: fill;
  opacity: 0.72;
  pointer-events: none;
}
.rw-arrow {
  position: absolute;
  left: 1597.7px;
  top: 503.9px;
  width: 42.5px;
  height: 53.5px;
  object-fit: contain;
  opacity: 0.85;
  pointer-events: none;
}
/* 底部横条：185.6 宽，拇指块可拖 */
.rw-bar {
  position: absolute;
  left: 791.9px;
  top: 715px;
  width: 185.6px;
  height: 28px;
  cursor: var(--nk-cursor, auto), grab;
  touch-action: none;
}
.rw-bar:active { cursor: grabbing; }
.rb-track {
  position: absolute;
  left: 0;
  top: 5.4px;
  width: 100%;
  height: 17.8px;
  object-fit: fill;
  opacity: 0.72;
  pointer-events: none;
}
.rb-thumb {
  position: absolute;
  top: 8px;
  width: 34px;
  height: 12px;
  margin-left: -17px;
  border-radius: 6px;
  background: rgba(255, 246, 222, 0.92);
  box-shadow: 0 0 10px rgba(255, 232, 180, 0.8);
  pointer-events: none;
  transition: left 0.2s ease;
}
.rw-tip {
  position: absolute;
  left: 0;
  top: 762px;
  width: 1920px;
  margin: 0;
  text-align: center;
  font-size: 20px;
  letter-spacing: 0.12em;
  color: rgba(255, 248, 232, 0.55);
  pointer-events: none;
}
</style>
