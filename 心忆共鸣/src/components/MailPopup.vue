<script setup lang="ts">
/**
 * 主页 ·「信封」弹窗：点信封裂开飞走 → 信纸浮现（第 1 页欢迎词，第 2~4 页最近三次版本更新）。
 * 素材三张卡背：cardbg01 信封正面 / cardbg03 信封背 / cardbg08 信纸；无退出键，点空白或 ESC 关闭。
 */
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { play } from '@/composables/useAudio'
import { toDesignDelta } from '@/core/stage'
import { MAIL_COPY, mailBlocks, mailRich } from '@/data/copy'
import { loadMailLogs, type MailLog } from '@/data/mail-changelog'

const emit = defineEmits<{ (e: 'close'): void }>()

const store = useGameStore()
const ui = computed(() => store.manifest?.ui.mail ?? null)
/** 欢迎语在 `文案.json` 的 mail 段 */
const mail = MAIL_COPY

/** 'closed' 未拆 → 'opening' 拆开动画中 → 'open' 信纸可翻页 */
type Phase = 'closed' | 'opening' | 'open'
const phase = ref<Phase>('closed')

const page = ref(0)

/**
 * 版本日志：运行时从 `public/assets/data/mail-changelog.json` 读。
 * 读不到就只剩欢迎页（信封照常能拆开，不会白屏）。
 */
const mailLogs = ref<MailLog[]>([])

const pages = computed(() => [
  { key: 'welcome', kind: 'welcome' as const, title: mail.title, sub: '', head: '', body: mailBlocks(mail.body) },
  ...mailLogs.value.map((l) => ({
    key: l.version,
    kind: 'log' as const,
    title: l.version,
    sub: l.date,
    head: l.title,
    body: mailBlocks(l.lines),
  })),
])

const total = computed(() => pages.value.length)
const cur = computed(() => pages.value[Math.min(page.value, total.value - 1)])

/**
 * 正文滚动。**不缩放文字**，溢出的内容用滚轮或按住拖动看，`.lt-body` 自己滚。
 * 拖动位移必须换算设计坐标：用 `toDesignDelta()`（见 `core/stage.ts`）。
 */
const bodyRef = ref<HTMLElement | null>(null)
/** 正文是否溢出（只用来决定光标形态，不参与拖拽判定） */
const scrollable = ref(false)
const dragging = ref(false)
let dragFromY = 0
let dragFromTop = 0

function checkOverflow() {
  const el = bodyRef.value
  if (!el) return
  scrollable.value = el.scrollHeight - el.clientHeight > 1
}

function onBodyDown(e: PointerEvent) {
  const el = bodyRef.value
  if (!el) return
  // 溢出量现算：字体异步加载 / 内容变化都可能改变它，别信上一次的结论
  if (el.scrollHeight - el.clientHeight <= 1) return
  // 按在滚动条上（clientWidth 之外）时交给浏览器自己处理，别抢
  if (e.offsetX >= el.clientWidth) return
  dragging.value = true
  dragFromY = e.clientY
  dragFromTop = el.scrollTop
  el.setPointerCapture(e.pointerId)
  e.preventDefault()
}

function onBodyMove(e: PointerEvent) {
  const el = bodyRef.value
  if (!el || !dragging.value) return
  el.scrollTop = dragFromTop - toDesignDelta(e.clientY - dragFromY)
}

function onBodyUp(e: PointerEvent) {
  if (!dragging.value) return
  dragging.value = false
  bodyRef.value?.releasePointerCapture?.(e.pointerId)
}

function asset(p: string | null | undefined) {
  return store.asset(p)
}

let openTimer = 0
function reveal() {
  if (phase.value !== 'closed') return
  phase.value = 'opening'
  play('paper-envelope', { volume: 0.85 })
  // 信封两半飞走（620ms）+ 信纸浮现，之后才允许翻页
  openTimer = window.setTimeout(() => {
    phase.value = 'open'
  }, 640)
}

function turn(d: -1 | 1) {
  const n = page.value + d
  if (n < 0 || n >= total.value) return
  page.value = n
  play('paper-flip', { volume: 0.5 })
}

// 换页：正文回到顶部，再重新量一次是否溢出
watch(page, () => {
  const el = bodyRef.value
  if (el) el.scrollTop = 0
  void nextTick(checkOverflow)
})
watch(phase, (p) => { if (p === 'open') void nextTick(checkOverflow) })
onMounted(() => {
  void nextTick(checkOverflow)
  // 子集字体是异步加载的，加载完行宽会变 → 再量一次
  void document.fonts?.ready.then(() => checkOverflow())
  // 版本日志是运行时 JSON：到货后页数会变，翻页钮与溢出量都要重算
  void loadMailLogs().then((logs) => {
    mailLogs.value = logs
    void nextTick(checkOverflow)
  })
})

function close() {
  play('common-hover', { volume: 0.45 })
  emit('close')
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    e.preventDefault()
    close()
  } else if (e.key === 'ArrowLeft') turn(-1)
  else if (e.key === 'ArrowRight') turn(1)
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  window.clearTimeout(openTimer)
})
</script>

<template>
  <div class="mail-mask" @click.self="close">
    <div class="mail-stage" :class="phase" @click.self="close">
      <!-- ============ 信封（未拆 / 拆开中） ============ -->
      <div v-if="phase !== 'open'" class="env-wrap" @click="reveal">
        <div class="env-half top"><img :src="asset(ui?.env)" alt="" draggable="false" /></div>
        <div class="env-half bottom"><img :src="asset(ui?.env)" alt="" draggable="false" /></div>
        <span v-if="phase === 'closed'" class="env-hint">{{ mail.hint }}</span>
      </div>

      <!-- ============ 拆开后：信封背 + 信纸 ============ -->
      <template v-if="phase !== 'closed'">
        <img v-if="ui?.back" class="mail-back" :src="asset(ui.back)" alt="" draggable="false" />

        <div class="mail-paper">
          <img v-if="ui?.paper" class="paper-img" :src="asset(ui.paper)" alt="" draggable="false" />

          <div class="letter">
            <header class="lt-head">
              <p v-if="cur.kind === 'welcome'" class="lt-kicker">{{ mail.kicker }}</p>
              <p v-else class="lt-kicker">{{ cur.sub }}</p>
              <h2 class="lt-title">{{ cur.title }}</h2>
              <p v-if="cur.head" class="lt-sub">{{ cur.head }}</p>
              <span class="lt-rule"></span>
            </header>

            <div
              ref="bodyRef"
              class="lt-body"
              :class="{ log: cur.kind === 'log', scrollable, dragging }"
              @pointerenter="checkOverflow"
              @pointerdown="onBodyDown"
              @pointermove="onBodyMove"
              @pointerup="onBodyUp"
              @pointercancel="onBodyUp"
            >
              <p v-for="(b, i) in cur.body" :key="i" class="lt-p" :class="b.style" v-html="mailRich(b.text)"></p>
              <p v-if="cur.kind === 'welcome'" class="lt-sign">{{ mail.sign }}</p>
            </div>

            <!-- 翻页键：与共鸣页「抽取记录」同一套圆钮 -->
            <div v-if="total > 1" class="lt-pager">
              <button class="lt-pg" :disabled="page <= 0" title="上一页" @click.stop="turn(-1)">‹</button>
              <span class="lt-num num">{{ page + 1 }} <i>/</i> {{ total }}</span>
              <button class="lt-pg" :disabled="page >= total - 1" title="下一页" @click.stop="turn(1)">›</button>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
/* 设计坐标 1920×1080；信封 720×448（cardbg01 1292×804），信纸 900×508（cardbg08 1000×564） */
.mail-mask {
  position: absolute;
  inset: 0;
  z-index: 140;
  display: grid;
  place-items: center;
  background: rgba(4, 5, 10, 0.66);
  backdrop-filter: blur(4px);
  animation: mailFade 0.24s ease both;
}
@keyframes mailFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mail-stage {
  position: relative;
  width: 1000px;
  height: 620px;
  display: grid;
  place-items: center;
}

/* ==================== 信封 ==================== */
.env-wrap {
  position: relative;
  width: 720px;
  height: 448px;
  cursor: var(--nk-cursor, auto), pointer;
  /* 提示拆开的左右轻晃 */
  animation: envShake 2.6s ease-in-out infinite;
  transform-origin: 50% 60%;
  filter: drop-shadow(0 26px 48px rgba(0, 0, 0, 0.55));
  transition: filter 0.2s ease;
  z-index: 3;
}
.env-wrap:hover {
  filter: drop-shadow(0 26px 54px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 26px rgba(255, 214, 150, 0.35));
  /* 悬停即暂停晃动：否则指针追着一个左右摆的目标，容易点空 */
  animation-play-state: paused;
}
@keyframes envShake {
  0%, 100% { transform: rotate(-1.5deg) translateX(-5px); }
  50% { transform: rotate(1.5deg) translateX(5px); }
}
.opening .env-wrap {
  animation: none;
}

.env-half {
  position: absolute;
  inset: 0;
}
.env-half img {
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
  display: block;
}
/* 上下各留一半：视觉上就是「信封从中缝裂开」 */
.env-half.top { clip-path: inset(0 0 50% 0); }
.env-half.bottom { clip-path: inset(50% 0 0 0); }

.opening .env-half.top {
  animation: envTopOut 0.62s cubic-bezier(0.4, 0, 0.6, 1) both;
}
.opening .env-half.bottom {
  animation: envBottomOut 0.62s cubic-bezier(0.4, 0, 0.6, 1) both;
}
@keyframes envTopOut {
  to { transform: translateY(-210px) rotate(-7deg) scale(0.96); opacity: 0; }
}
@keyframes envBottomOut {
  to { transform: translateY(230px) rotate(5deg) scale(0.96); opacity: 0; }
}

.env-hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -62px;
  text-align: center;
  font-size: 15px;
  letter-spacing: 0.42em;
  text-indent: 0.42em;
  color: rgba(246, 228, 196, 0.9);
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.75);
  animation: hintPulse 2.2s ease-in-out infinite;
}
@keyframes hintPulse {
  0%, 100% { opacity: 0.5; transform: translateY(2px); }
  50% { opacity: 1; transform: translateY(-2px); }
}

/* ==================== 信封背 + 信纸 ==================== */
/* cardbg03：信封背。尺寸比信纸略窄、位置略低 → 只从信纸下缘露出来一截，像信还没完全抽出 */
.mail-back {
  position: absolute;
  left: 50%;
  top: calc(50% + 34px);
  width: 862px;
  height: 495px;
  max-width: none;
  object-fit: fill;
  transform: translate(-50%, -50%);
  opacity: 0;
  filter: drop-shadow(0 24px 46px rgba(0, 0, 0, 0.5));
  animation: backIn 0.45s 0.12s ease both;
}
@keyframes backIn {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

.mail-paper {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 940px;
  height: 530px;
  transform: translate(-50%, -50%);
  animation: paperIn 0.7s 0.08s cubic-bezier(0.22, 1, 0.36, 1) both;
  z-index: 2;
}
@keyframes paperIn {
  from { opacity: 0; transform: translate(-50%, -42%) scale(0.84); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}
.paper-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: fill;
  filter: drop-shadow(0 18px 40px rgba(0, 0, 0, 0.45));
}

.letter {
  position: absolute;
  inset: 48px 88px 70px;
  display: flex;
  flex-direction: column;
  animation: letterIn 0.4s 0.5s ease both;
}
@keyframes letterIn {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

.lt-head {
  position: relative;
  flex: 0 0 auto;
  padding-bottom: 14px;
}
.lt-kicker {
  margin: 0 0 6px;
  font-size: 12px;
  letter-spacing: 0.34em;
  color: #b08b5e;
}
.lt-title {
  margin: 0;
  font-family: 'NikkiYaHei', 'NikkiBody', serif;
  font-size: 27px;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: #6d4126;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6);
}
.lt-sub {
  margin: 8px 0 0;
  font-size: 14px;
  line-height: 1.5;
  color: #8a6742;
}
.lt-rule {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 2px;
  height: 1px;
  background: linear-gradient(90deg, rgba(168, 124, 74, 0.55), rgba(168, 124, 74, 0.12) 72%, transparent);
}

.lt-body {
  flex: 1 1 auto;
  min-height: 0;
  /* 右侧留出滚动条的位置，正文不贴条 */
  padding: 16px 10px 0 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  /* 不缩字，溢出就滚 */
  font-size: 15px;
}
.lt-body.log {
  font-size: 14.5px;
}
/* 只在真的溢出时才给「可拖」光标，不然会误导 */
.lt-body.scrollable {
  cursor: grab;
}
.lt-body.dragging {
  cursor: grabbing;
  user-select: none;
}
/**
 * 滚动条只能用 `::-webkit-scrollbar`（同时写 `scrollbar-width` 会让 webkit 伪元素整组失效）。
 */
.lt-body::-webkit-scrollbar {
  width: 10px;
}
.lt-body::-webkit-scrollbar-track {
  background: rgba(168, 124, 74, 0.14);
  border-left: 1px solid rgba(168, 124, 74, 0.18);
  border-radius: 5px;
}
.lt-body::-webkit-scrollbar-thumb {
  background: rgba(146, 103, 60, 0.62);
  border-radius: 5px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.lt-body::-webkit-scrollbar-thumb:hover {
  background: rgba(122, 84, 46, 0.85);
  background-clip: padding-box;
}
.lt-p {
  margin: 0 0 9px;
  font-size: 1.03em;   /* 相对 .lt-body 的基准字号 */
  line-height: 1.82;
  letter-spacing: 0.02em;
  color: #60412c;
  text-align: justify;
}
/**
 * 段落样式（`文案.json` 的 `{ "style": … }`）：`h2` 小标题（居中、字号双倍）、`warn` 警示句（居中、红）。
 */
.lt-p.h2 {
  margin: 20px 0 10px;
  text-align: center;
  font-size: 2.06em;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.5;
  color: #6d4126;
}
.lt-p.warn {
  margin: 14px 0 12px;
  text-align: center;
  font-weight: 700;
  color: #b0392f;
}
/* 更新日志页：每条一行，前面挂一枚小菱形 */
.lt-body.log .lt-p {
  position: relative;
  padding-left: 18px;
  margin-bottom: 9px;
  font-size: 1em;      /* 相对 .lt-body.log 的字号 */
  line-height: 1.78;
  color: #654733;
}
.lt-body.log .lt-p::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 9px;
  width: 5px;
  height: 5px;
  transform: rotate(45deg);
  background: #c39a62;
}
.lt-sign {
  margin: 14px 0 0;
  text-align: right;
  font-size: 15px;
  letter-spacing: 0.08em;
  color: #8a6742;
}

/* 翻页键：复刻共鸣页「抽取记录」的圆钮（32px 淡蓝渐变） */
.lt-pager {
  flex: 0 0 auto;
  align-self: center;
  display: flex;
  align-items: center;
  gap: 10px;
}
.lt-pg {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid rgba(108, 146, 190, 0.55);
  background: linear-gradient(180deg, #f1f8ff, #cfe2f6);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.85), 0 1px 3px rgba(62, 96, 136, 0.22);
  color: #3d6389;
  font-size: 21px;
  line-height: 1;
  cursor: var(--nk-cursor, auto), pointer;
  transition: all 160ms ease;
}
.lt-pg:hover:not(:disabled) {
  background: linear-gradient(180deg, #ffffff, #dcecfc);
  border-color: rgba(84, 128, 178, 0.8);
  color: #2c5073;
  transform: translateY(-1px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 3px 8px rgba(62, 96, 136, 0.28);
}
.lt-pg:disabled {
  opacity: 0.45;
  color: rgba(61, 99, 137, 0.55);
  cursor: default;
}
.lt-num {
  min-width: 52px;
  text-align: center;
  font-size: 16px;
  letter-spacing: 0.06em;
  color: #7a5a3c;
}
.lt-num i {
  font-style: normal;
  margin: 0 3px;
  opacity: 0.55;
}
</style>
