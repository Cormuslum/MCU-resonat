<script setup lang="ts">
/**
 * 彩蛋弹窗（主界面右下角 200×100 热区触发）
 *
 * 容器沿用共鸣页「共鸣概率」弹窗那套美术（羊皮纸 bg_01 + 三道金线），
 * 只是整体放大 1.25 倍：836×512 → 1045×640。
 *
 * 版式：
 *  - 内边缘顶部固定标题「彩蛋 / 碎碎念 / 发癫」
 *  - 中间是**可上下滚动**的正文区，条目按分割线切分（见 `src/data/easterEgg.ts`）
 *  - 左右两侧圆钮（`T_UI__collocation_btn_skip_n / _h`）切换条目，底部显示「第 n / N 条」
 *  - 底部中间是页码跳转框：输入数字回车即跳到该条（v1.3.02）
 *  - 打开时**随机**一条，随机池不含「彩蛋文本3」（剧情吐槽，v1.3.05）
 *  - 点容器外空白 / ESC 关闭
 */
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'
import { useGameStore } from '@/stores/game'
import { play } from '@/composables/useAudio'
import { EGG_ENTRIES, EGG_RANDOM_POOL } from '@/data/easterEgg'

const store = useGameStore()
const emit = defineEmits<{ (e: 'close'): void }>()

const B = computed(() => store.manifest?.ui?.banner)
const E = computed(() => store.manifest?.ui?.egg)
function asset(p: string | null | undefined) {
  return store.asset(p)
}

/** 放大倍数：836×512 → 1045×640 */
const K = 1.25
const W = Math.round(836 * K) // 1045
const H = Math.round(512 * K) // 640

/**
 * 首次打开**随机**一条（用户要求：每次点彩蛋应是随机的，不能永远第 1 条）。
 * 之后左右切换仍在 0..N-1 里顺序走。
 *
 * v1.3.05：随机池剔除 `彩蛋文本3`（剧情吐槽，30 条）—— 那批只在手动翻页 / 页码跳转时出现，
 * 所以这里从 `EGG_RANDOM_POOL`（file != 3 的下标）里抽，而不是 `0..N-1`。
 */
const idx = ref(EGG_RANDOM_POOL[Math.floor(Math.random() * EGG_RANDOM_POOL.length)] ?? 0)
const scroller = ref<HTMLElement | null>(null)
const cur = computed(() => EGG_ENTRIES[idx.value])
const total = EGG_ENTRIES.length

function go(step: number) {
  const next = (idx.value + step + total) % total
  if (next === idx.value) return
  idx.value = next
  play('paper-slide', { volume: 0.5 })
}

function close() {
  play('back-select', { volume: 0.5 })
  emit('close')
}

/* ---------------- 页码跳转（v1.3.02） ---------------- */

/** 输入框内容（只收数字，最多 3 位） */
const jumpText = ref('')

function onJumpInput(e: Event) {
  const el = e.target as HTMLInputElement
  jumpText.value = el.value.replace(/\D/g, '').slice(0, 3)
  // 受控输入：过滤掉非数字后要把值写回去，否则输入框里会残留字符
  el.value = jumpText.value
}

/** 回车 / 失焦确认：超出范围就夹到 1..total，非法输入直接忽略 */
function doJump() {
  const n = Number(jumpText.value)
  jumpText.value = ''
  if (!Number.isFinite(n) || n < 1) return
  const target = Math.min(total, Math.trunc(n)) - 1
  if (target === idx.value) return
  idx.value = target
  play('paper-slide', { volume: 0.5 })
}

// 切条目后回到顶部
watch(idx, async () => {
  await nextTick()
  if (scroller.value) scroller.value.scrollTop = 0
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.stopPropagation()
    close()
    return
  }
  // 焦点在页码输入框里时，方向键 / 数字都归它，不要抢去切条
  const t = e.target as HTMLElement | null
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
  if (e.key === 'ArrowLeft') go(-1)
  else if (e.key === 'ArrowRight') go(1)
}

onMounted(() => {
  play('window-open', { volume: 0.7 })
  window.addEventListener('keydown', onKey, true)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey, true))
</script>

<template>
  <div class="eg-mask" @click.self="close">
    <div class="eg-panel" :style="{ width: W + 'px', height: H + 'px' }">
      <!-- 三道金线 + 羊皮纸（与共鸣概率弹窗同款，等比 ×1.25） -->
      <img class="pw-outer" :src="asset(B?.winLine3)" alt="" draggable="false" />
      <img class="pw-bg" :src="asset(B?.winBg)" alt="" draggable="false" />
      <img class="pw-line4" :src="asset(B?.winLine4)" alt="" draggable="false" />
      <img class="pw-line1" :src="asset(B?.winLine1)" alt="" draggable="false" />

      <div class="eg-body">
        <h3 class="eg-title">彩蛋 / 碎碎念 / 发癫</h3>
        <div class="eg-rule"></div>

        <div ref="scroller" class="eg-scroll">
          <p class="eg-text" :class="cur.align">{{ cur.text }}</p>
        </div>

        <div class="eg-foot">
          <span class="eg-count">
            <b>{{ idx + 1 }}</b>
            <i>/</i>
            {{ total }}
          </span>
          <label class="eg-jump" title="输入页码后回车跳转">
            <span class="eg-jlabel">跳转</span>
            <input
              class="eg-jinput"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              maxlength="3"
              placeholder="页码"
              :value="jumpText"
              @input="onJumpInput"
              @keydown.enter.stop="doJump"
              @blur="doJump"
            />
          </label>
          <span class="eg-hint">← → 切换条目 · 点空白处关闭</span>
        </div>
      </div>

      <!-- 左右切换：圆形跳过键，左键水平翻转（同一张图） -->
      <button class="eg-nav prev" title="上一条" @click.stop="go(-1)">
        <img class="nav-n" :src="asset(E?.skipN)" alt="" draggable="false" />
        <img class="nav-h" :src="asset(E?.skipH)" alt="" draggable="false" />
      </button>
      <button class="eg-nav next" title="下一条" @click.stop="go(1)">
        <img class="nav-n" :src="asset(E?.skipN)" alt="" draggable="false" />
        <img class="nav-h" :src="asset(E?.skipH)" alt="" draggable="false" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.eg-mask {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 4, 10, 0.6);
  backdrop-filter: blur(2px);
  animation: egFade 180ms ease both;
}
@keyframes egFade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.eg-panel {
  position: relative;
  filter: drop-shadow(0 24px 60px rgba(0, 0, 0, 0.72));
  animation: egPop 220ms cubic-bezier(0.2, 0.9, 0.3, 1.1) both;
}
@keyframes egPop {
  from {
    opacity: 0;
    transform: translateY(14px) scale(0.988);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* 三线一纸：坐标 = 共鸣概率弹窗（836×512）的数值 × 1.25 */
.pw-outer,
.pw-bg,
.pw-line4,
.pw-line1 {
  position: absolute;
  object-fit: fill;
  max-width: none;
  pointer-events: none;
}
.pw-outer {
  left: -40px;
  top: -60.6px;
  width: 1130px;
  height: 758.1px;
}
.pw-bg {
  inset: 0;
  width: 100%;
  height: 100%;
}
.pw-line4 {
  left: -1.3px;
  top: 0;
  width: 1048.8px;
  height: 640px;
}
.pw-line1 {
  left: 11.4px;
  top: 20.1px;
  width: 1028.3px;
  height: 606.9px;
}

/* 内容区（纸面亮部内，留出内框 18px） */
.eg-body {
  position: absolute;
  left: 77px;
  top: 62px;
  right: 77px;
  /* 羊皮纸下缘有一段深色做旧带（≈600 起），内容到 558 收住，计数器才落在亮纸上 */
  bottom: 82px;
  display: flex;
  flex-direction: column;
  color: #4a3618;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
}

.eg-title {
  margin: 0;
  text-align: center;
  font-size: 30px;
  font-weight: 400;
  letter-spacing: 10px;
  text-indent: 10px;
  color: #6b4a16;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}
.eg-rule {
  height: 1px;
  margin: 14px 4px 0;
  background: linear-gradient(
    90deg,
    rgba(120, 88, 40, 0) 0%,
    rgba(120, 88, 40, 0.42) 22%,
    rgba(120, 88, 40, 0.42) 78%,
    rgba(120, 88, 40, 0) 100%
  );
}

.eg-scroll {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  /* 短条目垂直居中；长条目（safe center 退化成 start）从顶部开始滚 */
  justify-content: safe center;
  margin-top: 12px;
  padding: 4px 18px 8px 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(140, 104, 52, 0.55) transparent;
}
.eg-scroll::-webkit-scrollbar {
  width: 8px;
}
.eg-scroll::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(140, 104, 52, 0.45);
}
.eg-scroll::-webkit-scrollbar-track {
  background: rgba(140, 104, 52, 0.1);
}

.eg-text {
  flex: 0 0 auto;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 21px;
  line-height: 1.95;
  letter-spacing: 0.5px;
  color: #45300f;
  text-shadow: 0 1px 0 rgba(255, 250, 235, 0.55);
}
.eg-text.center {
  text-align: center;
}
.eg-text.left {
  text-align: left;
}

.eg-foot {
  /* 三段：页码 | 跳转框 | 提示。用 grid 而不是 space-between，
     中间那格才会真正居中，不会被左右两块宽度差推歪 */
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  margin-top: 10px;
  padding-top: 6px;
  border-top: 1px solid rgba(120, 88, 40, 0.2);
}
.eg-count {
  font-size: 15px;
  letter-spacing: 1px;
  color: #7a5f36;
}
.eg-count b {
  font-family: 'NikkiNumber', monospace;
  font-size: 22px;
  font-weight: 400;
  color: #8a5a12;
}
.eg-count i {
  margin: 0 5px;
  font-style: normal;
  opacity: 0.6;
}
.eg-hint {
  justify-self: end;
  font-size: 13px;
  letter-spacing: 1px;
  color: rgba(120, 88, 40, 0.62);
}

/* 左右切换键：74×74 圆钮（T_UI__collocation_btn_skip_n / _h），常态图叠高亮图做淡入 */
.eg-nav {
  position: absolute;
  top: 50%;
  width: 74px;
  height: 74px;
  margin-top: -37px;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.55));
  transition: filter 0.16s ease, transform 0.16s ease;
}
.eg-nav.prev {
  left: -108px;
  transform: scaleX(-1);
}
.eg-nav.next {
  right: -108px;
}
.eg-nav:hover {
  filter: drop-shadow(0 0 16px rgba(255, 224, 150, 0.85)) brightness(1.06);
}
.eg-nav:active {
  transform: translateY(2px);
}
/* 左键翻转后 :active 的位移方向也要翻回来 */
.eg-nav.prev:active {
  transform: scaleX(-1) translateY(2px);
}
.eg-nav img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
  transition: opacity 0.14s ease;
}
/* 左键翻转时不要把图标也镜像——这里靠外层 transform 整体翻转，图标朝向随之镜像，
   正是我们要的「左键指向左」 */
.eg-nav .nav-h {
  opacity: 0;
}
.eg-nav:hover .nav-h {
  opacity: 1;
}
.eg-nav:hover .nav-n {
  opacity: 0;
}

/* 页码跳转框（v1.3.02）：贴在「第 n / N 条」右边 */
.eg-jump {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 2px 8px 2px 10px;
  border-radius: 999px;
  background: rgba(255, 248, 232, 0.5);
  border: 1px solid rgba(150, 112, 56, 0.45);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}
.eg-jump:focus-within {
  border-color: rgba(198, 148, 62, 0.95);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8), 0 0 12px rgba(226, 180, 96, 0.55);
}
.eg-jlabel {
  font-size: 13px;
  letter-spacing: 2px;
  color: #7a5f36;
}
.eg-jinput {
  width: 52px;
  padding: 2px 0 3px;
  border: 0;
  border-bottom: 1px dashed rgba(140, 104, 52, 0.55);
  background: none;
  outline: none;
  text-align: center;
  font-family: 'NikkiNumber', monospace;
  font-size: 18px;
  letter-spacing: 2px;
  color: #8a5a12;
}
.eg-jinput::placeholder {
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 13px;
  letter-spacing: 1px;
  color: rgba(120, 88, 40, 0.45);
}
</style>
