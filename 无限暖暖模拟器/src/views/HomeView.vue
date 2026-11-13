<script setup lang="ts">
/**
 * 主页（一级界面）—— 「心忆共鸣」
 *
 * 版式（静态背景）：严格按 `素材/主页/主页.pxdesk`（1400×788 画布 ×1.3714286 = 1920×1080）。
 *  - 左侧竖版艺术字「心忆共鸣」（1713×2447 → 313×460 @116,34，op .75 + 淡蓝光晕）
 *  - 居中横版「无限暖暖」（v1.2.02 回退，460×310，与竖版并存）
 *  - 静态背景上 5 个星芒/纸卷 = 五个**二级界面**入口（悬停呼吸）
 *
 * 版式（动态背景，v1.2.02）：左下角切换键切到视频后，星芒换成**右缘中部竖排系统图标**
 *  （常态 op .5，悬停 op 1 + 放大 10px），素材与左侧栏图标同一批（`ui.home.navSys`）。
 *
 * 三段式开机：boot（5s 宣传片）→ reveal（底图/LOGO/星芒淡入）→ ready
 * **只在本次会话第一次进主页时播**（sessionStorage 记 `nikki-boot-played`），
 * 从其他界面返回不再重播；「模拟器记忆」重置会清掉这个标记。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { bgmGain, play } from '@/composables/useAudio'
import EggPopup from '@/components/EggPopup.vue'
import MailPopup from '@/components/MailPopup.vue'

const store = useGameStore()
const router = useRouter()

type Stage = 'boot' | 'reveal' | 'ready'
const stage = ref<Stage>('boot')

/** 自动播放被拦截时，显示「点击开始」 */
const needTap = ref(false)

const bootVideo = ref<HTMLVideoElement | null>(null)
let revealTimer: number | null = null

const ui = computed(() => store.manifest?.ui.home)
/** 背景切换键复用共鸣页那套素材（`ui.banner.switch / switchH`） */
const bannerUi = computed(() => store.manifest?.ui.banner)
const loginVideo = computed(() => store.manifest?.loginVideo)

function asset(p: string | null | undefined) {
  return store.asset(p)
}

/* ════════════════════════════════ 五个二级界面入口（pxdesk 坐标） */

interface NavSpot {
  key: 'ver' | 'codex' | 'almanac' | 'banner' | 'gloria'
  to: string
  label: string
  x: number
  y: number
  w: number
  h: number
  /** 旋转角度（度） */
  rot?: number
}

const SPOTS: NavSpot[] = [
  { key: 'ver', to: '/versions', label: '时隙遗光', x: 744, y: 431, w: 476, h: 428 },
  { key: 'codex', to: '/codex', label: '博物图鉴', x: 1068, y: 635, w: 424, h: 416 },
  { key: 'almanac', to: '/almanac', label: '玄学运势', x: 621, y: 680, w: 167, h: 287, rot: -44 },
  { key: 'banner', to: '/banner', label: '心忆共鸣', x: 1629, y: 43, w: 236, h: 243 },
  { key: 'gloria', to: '/settings', label: '辉煌心光', x: 297, y: 466, w: 336, h: 268 },
]

/**
 * 未选版本时「心忆共鸣」入口置灰（v1.4.02）。
 *
 * 共鸣页只列当前版本的服装阁 —— 没有当前版本就没有内容可进，所以主页两套入口
 * （静态背景的星芒 / 动态背景的右缘竖排）都禁用，点了不发跳转、不改音量。
 * 解锁条件：在「时隙遗光」里点过任意一个小版本。
 */
function navLocked(s: NavSpot): boolean {
  return s.key === 'banner' && !store.selectedVersion
}
const LOCK_HINT = '先去「时隙遗光」选择版本'

function spotStyle(s: NavSpot) {
  return {
    left: s.x + 'px',
    top: s.y + 'px',
    width: s.w + 'px',
    height: s.h + 'px',
    transform: s.rot ? `rotate(${s.rot}deg)` : undefined,
  }
}

function go(s: NavSpot) {
  if (stage.value === 'boot') return
  if (navLocked(s)) return
  play('btn-res-select', { volume: 0.7 })
  router.push(s.to)
}

/* ════════════════════════════════ 动态背景 + 右缘竖排入口（v1.2.02） */

/**
 * 背景模式。默认 `video`（用户新给的星海动态背景），
 * 左下角切换键与共鸣页同一个素材、同一个行为（`ui.banner.switch / switchH`）。
 */
type BgMode = 'video' | 'still'
const BG_MODE_KEY = 'nikki-home-bg'
const BG_PICK_KEY = 'nikki-home-bg-pick'
const bgMode = ref<BgMode>('video')
const homeVideo = ref<HTMLVideoElement | null>(null)

/**
 * 轮播的几条动态背景（v1.9.04）。新 manifest 给 `bgVideos`（星海 / 伊始两条），
 * 老 manifest 只有单条 `bgVideo` —— 回落成一个长度 1 的列表，下面的逻辑不用分叉。
 */
const bgList = computed<{ video: string; audio?: string | null; poster?: string | null }[]>(() => {
  const h = ui.value
  if (!h) return []
  if (h.bgVideos?.length) return h.bgVideos
  return h.bgVideo ? [{ video: h.bgVideo, audio: h.bgAudio ?? null }] : []
})

/**
 * 本次会话选中的那条。
 *
 * 为什么不是「每次进主页都随机」：HomeView 每次从别的页面切回来都会重新挂载，
 * 真随机的话背景一直在变，看着像出了故障。随机只在**冷启动**发生一次，
 * 结果存进 sessionStorage，本次会话内保持不变。
 */
const bgPickIdx = ref(-1)
const bgPick = computed(() => bgList.value[bgPickIdx.value] ?? null)

function readPickIndex(n: number): number {
  if (n <= 0) return -1
  try {
    const raw = sessionStorage.getItem(BG_PICK_KEY)
    if (raw !== null) {
      const i = Number(raw)
      if (Number.isInteger(i) && i >= 0 && i < n) return i
    }
  } catch { /* 无痕模式忽略 */ }
  const i = Math.floor(Math.random() * n)
  try { sessionStorage.setItem(BG_PICK_KEY, String(i)) } catch { /* 同上 */ }
  return i
}

function setPickIndex(i: number) {
  bgPickIdx.value = i
  try { sessionStorage.setItem(BG_PICK_KEY, String(i)) } catch { /* 同上 */ }
}

// manifest 到位后再决定抽哪条（之前 bgList 还是空的，算不出范围）
watch(bgList, (list) => {
  if (bgPickIdx.value >= 0 && bgPickIdx.value < list.length) return
  bgPickIdx.value = readPickIndex(list.length)
}, { immediate: true })

/** 判过死刑的下标：加载失败过的不再重试，避免在两个坏文件之间来回跳 */
const deadVideoIdx = new Set<number>()

/**
 * 视频加载失败的兜底链（v1.9.04）：
 *   ① 还有别的背景能播 → 换过去（「缺失视频时转另一个动态背景」）
 *   ② 一条都播不了 → 落静态底图，绝不黑屏
 * 素材是在构建期登记的，正常不会 404；但换素材、清缓存、改 manifest 之后
 * 浏览器手里还挂着旧路径的情况真的会发生 —— 那时宁可少一段动效，也不能留一块黑。
 */
function onVideoError() {
  if (bgPickIdx.value >= 0) deadVideoIdx.add(bgPickIdx.value)
  const next = bgList.value.findIndex((_, i) => !deadVideoIdx.has(i))
  if (next >= 0) {
    setPickIndex(next)
    return
  }
  bgMode.value = 'still'
  try { sessionStorage.setItem(BG_MODE_KEY, 'still') } catch { /* 忽略 */ }
}

/**
 * 动态背景的音轨（v1.3.06：从 `<video>` 里拆出来单独播）
 *
 * 为什么要拆（用户实测）：
 *   以前声音挂在 `<video>` 上，靠「先 muted 起步、用户第一次点/按键再摘 muted」绕自动播放策略。
 *   但这套只对**页面内**的手势有效 —— 从别的界面切回主页时，那次点击发生在**上一个页面**，
 *   而 HomeView 是这时才挂载的，监听器挂晚了，于是视频静音、要再点一次才出声。
 *
 * 现在的做法：
 *   · `<video>` 永远 `muted` —— 静音视频的自动播放不受策略限制，一定能起；
 *   · 声音交给独立的 `<audio :src="ui.home.bgAudio">`（从 bg-video.webm 抽出来的同一条 opus 轨）。
 *     回主页那次点击已经给整个 document 拿到了「粘性激活」，所以这里的 `play()` 直接放行；
 *   · 只有「冷启动直接落在主页」这种确实没有任何手势的情况才会被拦，catch 里挂一次性监听补放。
 *
 * 音量仍走同一条链路 `bgmGain('home')`：主音量 / 背景音总控 / 主页那根滑杆都能控它。
 */
const homeAudio = ref<HTMLAudioElement | null>(null)
/** 被拦过一次时挂着的一次性手势监听（成功播放后自己卸掉） */
let audioKick: (() => void) | null = null

/**
 * 音轨的基准系数。视频音轨是完整混音、比 BGM 母带响，乘一个系数让它落在同一听感区间；
 * v1.3.02 用户要求「主页背景音上限只到 70%」→ 系数从 2 收到 1.4，再加一道 0.7 的硬上限兜底。
 */
const HOME_GAIN = 1.4
const HOME_MAX = 0.7
const homeVol = computed(() => Math.min(HOME_MAX, bgmGain('home') * HOME_GAIN))

/**
 * 音画同步看护（v1.9.09）
 *
 * 视频是 muted 播的、声音走独立 `<audio>`（这个分离是必须的：带声视频在「切回主页」
 * 这类没有手势的场景会被自动播放策略拦掉）。代价是两条流各自 loop —— 浏览器给它们
 * 的起点并不一致，每绕一圈就固定错开几十毫秒，停留久了能差小半秒。
 *
 * 管线侧已经把音轨裁成和视频**等长**（`collect-assets.to_ogg(trim=...)`，视频剪掉
 * 首尾黑屏的那一刀音轨也照剪），这里再兜一道：每 200ms 比一次相位。
 *   · 差 > 0.30s → 直接拽到视频位置（一次硬对齐，听感上只是极短的断点）
 *   · 60~300ms  → 用 playbackRate 1±0.03 慢慢追（几乎听不出变调）
 *   · < 60ms    → 恢复 1.0
 * 视频回绕（loop）时把音轨也拨回 0，否则相差的那一段会一直带进下一圈。
 */
const SYNC_HARD = 0.30
const SYNC_SOFT = 0.06
const SYNC_TICK = 200
let syncTimer = 0
let lastVideoT = 0

function syncAudioToVideo() {
  const v = homeVideo.value
  const a = homeAudio.value
  if (!v || !a || v.paused || a.paused) return
  const vd = v.duration
  if (!Number.isFinite(vd) || vd <= 0.5) return

  // 视频回到开头 = 刚绕了一圈。音轨必须跟着回，不然会停在上一圈的相位上
  if (v.currentTime + 0.5 < lastVideoT) {
    lastVideoT = v.currentTime
    try { a.currentTime = v.currentTime } catch { /* 忽略 */ }
    if (a.playbackRate !== 1) a.playbackRate = 1
    return
  }
  lastVideoT = v.currentTime

  let drift = a.currentTime - v.currentTime
  // 一边已经绕圈、另一边还没绕：按环长折回最小差
  if (drift > vd / 2) drift -= vd
  else if (drift < -vd / 2) drift += vd

  const d = Math.abs(drift)
  if (d > SYNC_HARD) {
    try { a.currentTime = v.currentTime } catch { /* 忽略 */ }
    if (a.playbackRate !== 1) a.playbackRate = 1
  } else if (d > SYNC_SOFT) {
    a.playbackRate = drift > 0 ? 0.97 : 1.03
  } else if (a.playbackRate !== 1) {
    a.playbackRate = 1
  }
}

function startSyncWatch() {
  if (syncTimer) return
  lastVideoT = homeVideo.value?.currentTime ?? 0
  syncTimer = window.setInterval(syncAudioToVideo, SYNC_TICK)
}

function stopSyncWatch() {
  if (syncTimer) {
    window.clearInterval(syncTimer)
    syncTimer = 0
  }
  const a = homeAudio.value
  if (a && a.playbackRate !== 1) a.playbackRate = 1
}

/** 起播主页音轨；返回是否真的播上了（false = 被策略拦 / 当前不该出声） */
async function startHomeAudio(): Promise<boolean> {
  const a = homeAudio.value
  if (!a || bgMode.value !== 'video' || stage.value === 'boot') return false
  // 已经在播就别再调 play()（watch 会在多个依赖变化时重复触发，别做无用功）
  if (!a.paused) return true
  a.volume = homeVol.value
  // 起播即对齐相位：视频是 muted 的，能自己 autoplay 起来；音轨要等 play() 返回，
  // 这段时间视频可能已经走了几百毫秒。元数据还没到时 currentTime 会抛错，交给看护循环。
  const v = homeVideo.value
  if (v && v.currentTime > 0.05) {
    try { a.currentTime = v.currentTime } catch { /* 等 loadedmetadata 后再对 */ }
  }
  try {
    await a.play()
    // play() 返回时元数据一定就绪了：立刻再对一次相位，把「play() 本身要花几十到几百
    // 毫秒才出声」这段延迟抹掉。否则音频会永远比画面晚起步，靠看护一点点追太慢。
    if (v && Number.isFinite(v.currentTime) && v.currentTime > 0.05) {
      try { a.currentTime = v.currentTime } catch { /* 忽略 */ }
    }
    startSyncWatch()
    return true
  } catch {
    armAudioKick()
    return false
  }
}

function disarmAudioKick() {
  if (!audioKick) return
  window.removeEventListener('pointerdown', audioKick)
  window.removeEventListener('keydown', audioKick)
  audioKick = null
}

function armAudioKick() {
  if (audioKick) return
  audioKick = () => {
    void startHomeAudio().then((ok) => {
      if (ok) disarmAudioKick()
    })
  }
  window.addEventListener('pointerdown', audioKick)
  window.addEventListener('keydown', audioKick)
}

// 元素挂上 / 背景切回动态 / 开场动画结束 → 都试一次起播
watch([homeAudio, stage, bgMode], () => {
  // 切到静态背景或还在开屏：没有音轨可对，停掉看护（否则定时器空转）
  if (bgMode.value !== 'video' || stage.value === 'boot') {
    stopSyncWatch()
    return
  }
  void startHomeAudio()
})
/**
 * 元素是 v-if 建的，挂上那一刻就要把音量写进去（否则会停在浏览器默认的 1.0）；
 * 之后任何一层滑杆动一下也跟着改。
 */
watch([homeAudio, homeVol], ([a, vol]) => {
  if (a) a.volume = vol
}, { immediate: true })

function readBgMode(): BgMode {
  try {
    return sessionStorage.getItem(BG_MODE_KEY) === 'still' ? 'still' : 'video'
  } catch {
    return 'video'
  }
}

function toggleBg() {
  if (!bgList.value.length) return
  bgMode.value = bgMode.value === 'video' ? 'still' : 'video'
  play('common-hover', { volume: 0.5 })
  try {
    sessionStorage.setItem(BG_MODE_KEY, bgMode.value)
  } catch {
    /* 无痕模式忽略 */
  }
  if (bgMode.value === 'video') {
    // v-if 重建后浏览器不会自动续播（视频是 muted 的，可以直接起；音轨走上面的 watch）
    window.setTimeout(() => void homeVideo.value?.play().catch(() => {}), 80)
  }
}

/**
 * 动态背景下的右缘竖排入口：只用系统图标，不显示名称/英文。
 * 竖排 5 枚，右缘 24px、垂直居中（总高 5×76 + 4×34 = 516 → top 282）。
 */
const DYN: NavSpot[] = [
  { key: 'ver', to: '/versions', label: '时隙遗光', x: 0, y: 0, w: 76, h: 76 },
  { key: 'banner', to: '/banner', label: '心忆共鸣', x: 0, y: 0, w: 76, h: 76 },
  { key: 'almanac', to: '/almanac', label: '玄学运势', x: 0, y: 0, w: 76, h: 76 },
  { key: 'codex', to: '/codex', label: '博物图鉴', x: 0, y: 0, w: 76, h: 76 },
  { key: 'gloria', to: '/settings', label: '辉煌心光', x: 0, y: 0, w: 76, h: 76 },
]

function goDyn(s: NavSpot) {
  if (stage.value === 'boot') return
  if (navLocked(s)) return
  play('btn-res-select', { volume: 0.7 })
  router.push(s.to)
}

/** 动态背景模式下，星芒入口整体隐藏（两套入口不能同时出现） */
const showStars = computed(() => bgMode.value === 'still')

/* ════════════════════════════════ 开机：本次会话只播一次 */

const BOOT_FLAG = 'nikki-boot-played'

function toReveal() {
  if (stage.value !== 'boot') return
  stage.value = 'reveal'
  const v = bootVideo.value
  if (v) {
    v.pause()
    v.removeAttribute('src')
  }
  // 底图 + LOGO 动画走完再显示底部提示、起 BGM
  revealTimer = window.setTimeout(() => {
    stage.value = 'ready'
  }, 1900)
}

/** 首次尝试自动播放；被拦截就等用户点 */
function tryPlay() {
  const v = bootVideo.value
  if (!v || !loginVideo.value) {
    toReveal()
    return
  }
  v.volume = 0.9
  const p = v.play()
  if (p) {
    p.then(() => {
      needTap.value = false
    }).catch(() => {
      // 自动播放被拦，等用户点一下
      needTap.value = true
    })
  }
}

/** 用户点击「开始」 */
function tapStart() {
  const v = bootVideo.value
  if (!v) return
  needTap.value = false
  void v.play().catch(() => toReveal())
}

function alreadyBooted(): boolean {
  try {
    return sessionStorage.getItem(BOOT_FLAG) === '1'
  } catch {
    return false
  }
}

function markBooted() {
  try {
    sessionStorage.setItem(BOOT_FLAG, '1')
  } catch {
    /* 无痕模式忽略 */
  }
}

/** 开机播完（或跳过）都算「已播过」，回主页不再重播 */
function onBootDone() {
  markBooted()
  toReveal()
}

onMounted(() => {
  bgMode.value = readBgMode()
  // 冷启动直接落在主页时没有任何手势 → 先试一次，被拦就由 startHomeAudio 内部挂一次性监听
  void startHomeAudio()
  // ① 本次会话已播过 / ② 设置里关了开屏 / ③ 没有开机视频 → 直接进 reveal
  if (alreadyBooted() || store.save.settings.skipOpening || !loginVideo.value) {
    markBooted()
    toReveal()
    return
  }
  // 等 video 元素挂上再设 src
  window.setTimeout(() => {
    const v = bootVideo.value
    if (!v) {
      toReveal()
      return
    }
    v.src = asset(loginVideo.value)
    v.load()
    v.addEventListener('loadedmetadata', tryPlay, { once: true })
    // 兜底：8s 内还没进 reveal 就强制进（防止视频卡住）
    window.setTimeout(() => {
      if (stage.value === 'boot') toReveal()
    }, 8000)
  }, 60)
})

onUnmounted(() => {
  if (revealTimer) window.clearTimeout(revealTimer)
  stopSyncWatch()
  disarmAudioKick()
})

/* ════════════════════════════════ 右上角信封（v1.5.05） */

const mailOpen = ref(false)
function openMail() {
  if (stage.value === 'boot') return
  play('settings-open', { volume: 0.6 })
  mailOpen.value = true
}

/* ════════════════════════════════ 右下角彩蛋 */

const eggOpen = ref(false)
function openEgg() {
  if (stage.value === 'boot') return
  play('settings-open', { volume: 0.6 })
  eggOpen.value = true
}
</script>

<template>
  <div class="home" :class="{ 'is-reveal': stage !== 'boot' }">
    <!-- ============ 背景：动态视频 / 静态底图（左下角切换） ============ -->
    <div class="hm-bg">
      <!--
        ⚠ 开屏动画期间**不挂载**背景视频（v1.9.06）。
        以前 video 一直在后台静默播放：等开屏放完，背景已经播到第 N 秒，
        于是「画面不是从头开始」；音轨却是在 stage 切到 reveal 才起播的 ——
        两边错开好几秒，越看越别扭。现在视频和音轨都等 reveal 之后一起从 0 起。
      -->
      <video
        v-if="bgPick && bgMode === 'video' && stage !== 'boot'"
        :key="bgPick.video"
        ref="homeVideo"
        class="hm-bg-video"
        :src="asset(bgPick.video)"
        :poster="bgPick.poster ? asset(bgPick.poster) : undefined"
        autoplay
        muted
        loop
        playsinline
        preload="auto"
        @error="onVideoError"
      ></video>
      <img v-else-if="ui?.bgMain" class="hm-bg-img" :src="asset(ui.bgMain)" alt="" />
      <!--
        动态背景的音轨：从视频里抽出来的同一条 opus 轨，单独走 <audio>。
        视频永远 muted（保证自动播放不被拦），声音只由这里出。
        音轨自己缺失/加载失败不降级 —— 少一段声音比换掉画面正常得多。
      -->
      <audio
        v-if="bgPick?.audio && bgMode === 'video'"
        :key="bgPick.audio"
        ref="homeAudio"
        class="hm-bg-audio"
        :src="asset(bgPick.audio)"
        loop
        preload="auto"
      ></audio>
      <div class="hm-bg-veil" :class="{ dyn: bgMode === 'video' }"></div>
    </div>

    <!-- ============ 站名 ============
         静态背景：竖版「心忆共鸣」 + 居中横版「无限暖暖」并存（v1.2.02 回退版式）
         动态背景：只留竖版「心忆共鸣」，横版 LOGO 会跟星海视频里的画面打架（v1.3.00） -->
    <img v-if="ui?.logo" class="hm-logo" :src="asset(ui.logo)" alt="心忆共鸣" draggable="false" />
    <img
      v-if="ui?.logoCenter && bgMode === 'still'"
      class="hm-logo-center"
      :src="asset(ui.logoCenter)"
      alt="无限暖暖 INFINITY NIKKI"
      draggable="false"
    />

    <!-- ============ 静态背景：五个星芒入口（pxdesk 坐标） ============ -->
    <button
      v-for="s in SPOTS"
      v-show="showStars"
      :key="s.key"
      class="hm-nav"
      :class="['nv-' + s.key, { 'is-locked': navLocked(s) }]"
      :style="spotStyle(s)"
      :aria-label="s.label"
      :aria-disabled="navLocked(s) ? 'true' : undefined"
      :disabled="navLocked(s)"
      :title="navLocked(s) ? LOCK_HINT : undefined"
      @click="go(s)"
      @mouseenter="!navLocked(s) && play('common-hover', { volume: 0.35 })"
    >
      <img v-if="ui?.nav?.[s.key]" :src="asset(ui.nav[s.key])" alt="" draggable="false" />
    </button>

    <!-- ============ 动态背景：右缘中部竖排系统图标（常态 50%，悬停 100% + 放大 10px） ============ -->
    <nav v-if="!showStars" class="hm-dyn" aria-label="二级界面入口">
      <button
        v-for="s in DYN"
        :key="s.key"
        class="dy-btn"
        :class="['dy-' + s.key, { 'is-locked': navLocked(s) }]"
        :aria-label="s.label"
        :aria-disabled="navLocked(s) ? 'true' : undefined"
        :disabled="navLocked(s)"
        :title="navLocked(s) ? LOCK_HINT : undefined"
        @click="goDyn(s)"
        @mouseenter="!navLocked(s) && play('common-hover', { volume: 0.35 })"
      >
        <img v-if="ui?.navSys?.[s.key]" :src="asset(ui.navSys[s.key])" alt="" draggable="false" />
      </button>
    </nav>

    <!-- ============ 左下角：动态 / 静态背景切换键（与共鸣页同素材同行为） ============ -->
    <button
      v-if="bgList.length"
      class="hm-switch"
      :aria-label="bgMode === 'video' ? '切换静态背景' : '切换动态背景'"
      @click="toggleBg"
      @mouseenter="play('common-hover', { volume: 0.4 })"
    >
      <img v-if="bannerUi" class="hs-n" :src="asset(bannerUi.switch)" alt="" draggable="false" />
      <img v-if="bannerUi" class="hs-h" :src="asset(bannerUi.switchH)" alt="" draggable="false" />
    </button>

    <!-- ============ 左上角信封（点开是欢迎信 + 最近三次更新） ============ -->
    <button
      v-if="stage !== 'boot'"
      class="hm-mail"
      aria-label="信箱"
      title="信箱"
      @click="openMail"
      @mouseenter="play('common-hover', { volume: 0.35 })"
    >
      <!-- 白线透明底信封图标（用户给的示例样式：矩形 + V 形封口 + 两条下摆斜线） -->
      <svg class="hm-mail-ic" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect x="6" y="14" width="52" height="36" rx="4.5" />
        <path d="M7.2 16.4 32 35.6 56.8 16.4" />
        <path d="M7.6 47.8 24.6 33.2" />
        <path d="M56.4 47.8 39.4 33.2" />
      </svg>
    </button>

    <!-- ============ 右下角彩蛋热区（透明，无可见控件） ============ -->
    <div class="hm-egg" @click="openEgg"></div>

    <!-- ============ 开机动画（无跳过按钮：跳过开关已并入「辉煌心光 · 演出」） ============ -->
    <div v-if="stage === 'boot'" class="boot" @click="needTap && tapStart()">
      <video
        ref="bootVideo"
        class="boot-video"
        playsinline
        preload="auto"
        @ended="onBootDone"
        @error="onBootDone"
      ></video>

      <!-- 自动播放被拦：点击开始 -->
      <div v-if="needTap" class="boot-tap">
        <span class="bt-ring"></span>
        <p>点 击 开 始</p>
      </div>
    </div>

    <!-- ============ 底部提示 ============ -->
    <footer class="hm-foot" :class="{ show: stage === 'ready' }">
      <span class="hf-line"></span>
      <span class="hf-arrow">‹</span>
      <span class="hf-txt">
        {{ showStars ? '点亮画中星芒 · 开启心忆之旅' : '心忆心绮 · 拾忆拾光' }}
      </span>
      <span class="hf-line"></span>
    </footer>

    <!-- ============ 彩蛋弹窗 ============ -->
    <EggPopup v-if="eggOpen" @close="eggOpen = false" />

    <!-- ============ 信封弹窗 ============ -->
    <MailPopup v-if="mailOpen" @close="mailOpen = false" />
  </div>
</template>

<style scoped>
.home {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #04060e;
  user-select: none;
}

/* ============ 背景底图 ============ */
.hm-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.hm-bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transform: scale(1.07);
  transition: opacity 1.6s ease, transform 3.2s cubic-bezier(0.22, 1, 0.36, 1);
}
/* 动态背景：缓慢推近 + 淡入；视频本身在动，不再加 scale 呼吸（会抖） */
.hm-bg-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 1.2s ease;
}
/* 音轨元素不可见（只是播放器），别让它占布局 */
.hm-bg-audio {
  display: none;
}
.is-reveal .hm-bg-video {
  opacity: 1;
}
.is-reveal .hm-bg-img {
  opacity: 1;
  transform: scale(1);
  animation: bgBreath 26s 3s ease-in-out infinite alternate;
}
@keyframes bgBreath {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.045);
  }
}
.hm-bg-veil {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1200px 720px at 50% 44%, transparent 0%, rgba(6, 10, 22, 0.12) 60%, rgba(6, 10, 22, 0.55) 100%),
    linear-gradient(180deg, rgba(6, 10, 22, 0.28) 0%, transparent 24%, transparent 76%, rgba(6, 10, 22, 0.52) 100%);
  opacity: 0;
  transition: opacity 1.6s ease;
  pointer-events: none;
}
.is-reveal .hm-bg-veil {
  opacity: 1;
}
/* 动态背景画面本身偏亮，右侧图标要能看清 → 右缘压一层更深的暗角 */
.hm-bg-veil.dyn {
  background:
    radial-gradient(1200px 720px at 46% 50%, transparent 0%, rgba(6, 10, 22, 0.16) 62%, rgba(6, 10, 22, 0.5) 100%),
    linear-gradient(90deg, transparent 62%, rgba(6, 10, 22, 0.42) 100%),
    linear-gradient(180deg, rgba(6, 10, 22, 0.22) 0%, transparent 22%, transparent 78%, rgba(6, 10, 22, 0.45) 100%);
}

/* ============ 站名艺术字（pxdesk：313×460 @116,34，op .75 + 淡蓝光晕） ============ */
.hm-logo {
  position: absolute;
  left: 116px;
  top: 34px;
  width: 313px;
  height: 460px;
  max-width: none;
  object-fit: contain;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 0 22px rgba(150, 190, 255, 0.45)) drop-shadow(0 0 60px rgba(120, 160, 235, 0.3));
  opacity: 0;
  transform: translateY(28px) scale(0.97);
  transition: opacity 1.5s 0.55s ease, transform 1.8s 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}
.is-reveal .hm-logo {
  opacity: 0.75;
  transform: translateY(0) scale(1);
  animation: logoBreath 7s 2.4s ease-in-out infinite;
}
@keyframes logoBreath {
  0%,
  100% {
    filter: drop-shadow(0 0 22px rgba(150, 190, 255, 0.45)) drop-shadow(0 0 60px rgba(120, 160, 235, 0.3));
  }
  50% {
    filter: drop-shadow(0 0 32px rgba(180, 215, 255, 0.7)) drop-shadow(0 0 86px rgba(130, 170, 250, 0.45));
  }
}

/* 居中横版「无限暖暖」：460×310，横向居中、距顶 76px（旧版版式原样回退） */
.hm-logo-center {
  position: absolute;
  left: 730px;
  top: 76px;
  width: 460px;
  height: 310px;
  max-width: none;
  object-fit: contain;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 0 26px rgba(150, 190, 255, 0.55)) drop-shadow(0 10px 30px rgba(0, 0, 0, 0.55));
  opacity: 0;
  transform: translateY(24px) scale(0.97);
  transition: opacity 1.5s 0.4s ease, transform 1.8s 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}
.is-reveal .hm-logo-center {
  opacity: 1;
  transform: translateY(0) scale(1);
  animation: centerBreath 8s 2.6s ease-in-out infinite;
}
@keyframes centerBreath {
  0%,
  100% {
    filter: drop-shadow(0 0 26px rgba(150, 190, 255, 0.55)) drop-shadow(0 10px 30px rgba(0, 0, 0, 0.55));
  }
  50% {
    filter: drop-shadow(0 0 40px rgba(180, 215, 255, 0.8)) drop-shadow(0 12px 34px rgba(0, 0, 0, 0.6));
  }
}

/* ============ 动态背景：右缘竖排入口 ============ */
/*
 * 5 枚 76px、间距 34px → 总高 516，垂直居中（top 282）。
 * 常态 50% 不透明度；悬停 100% 且**放大 10px**（76 → 86，scale 1.1316），
 * transform-origin 靠右，放大方向朝画面内侧，不会被右边缘裁掉。
 */
.hm-dyn {
  position: absolute;
  right: 24px;
  top: 282px;
  z-index: 6;
  display: flex;
  flex-direction: column;
  gap: 34px;
  align-items: flex-end;
}
.dy-btn {
  width: 76px;
  height: 76px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  opacity: 0.5;
  transform-origin: right center;
  transition: opacity 0.22s ease, transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), filter 0.22s ease;
}
.dy-btn img {
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
  pointer-events: none;
  filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.55));
}
.dy-btn:hover,
.dy-btn:focus-visible {
  opacity: 1;
  transform: scale(1.1316);
  filter: drop-shadow(0 0 18px rgba(255, 226, 168, 0.85));
}

/* ============ 左下角 背景切换键（与共鸣页同素材：52×52） ============ */
.hm-switch {
  position: absolute;
  left: 24px;
  top: 996px;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  z-index: 8;
  transition: filter 0.16s ease;
}
.hm-switch img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
  transition: opacity 0.16s ease;
}
.hm-switch .hs-h {
  opacity: 0;
}
.hm-switch:hover .hs-h {
  opacity: 1;
}
.hm-switch:hover {
  filter: drop-shadow(0 0 14px rgba(255, 214, 140, 0.6));
}

/* ============ 五个入口 ============ */
.hm-nav {
  position: absolute;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  z-index: 5;
  opacity: 0;
  transition: opacity 0.9s ease, filter 0.25s ease;
}
.is-reveal .hm-nav {
  opacity: var(--rest, 0.42);
}
.hm-nav img {
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
  pointer-events: none;
  transition: filter 0.25s ease;
}

/* 常态不透明度 + 悬停呼吸（周期 2s，参数取自 pxdesk 图层说明） */
.nv-ver,
.nv-codex {
  --rest: 0.42;
}
.nv-almanac {
  --rest: 0.25;
}
.nv-banner {
  --rest: 0.2;
}
.nv-gloria {
  --rest: 0;
}

.nv-ver:hover,
.nv-ver:focus-visible,
.nv-codex:hover,
.nv-codex:focus-visible {
  opacity: 1;
  animation: nvBreathe42 2s ease-in-out infinite alternate;
  filter: drop-shadow(0 0 18px rgba(255, 236, 190, 0.85));
}
.nv-almanac:hover,
.nv-almanac:focus-visible {
  opacity: 0.8;
  animation: nvBreathe25 2s ease-in-out infinite alternate;
  filter: drop-shadow(0 0 16px rgba(255, 226, 170, 0.8));
}
.nv-banner:hover,
.nv-banner:focus-visible {
  opacity: 0.8;
  animation: nvBreathe20 2s ease-in-out infinite alternate;
  filter: drop-shadow(0 0 18px rgba(255, 232, 180, 0.85));
}
.nv-gloria:hover,
.nv-gloria:focus-visible {
  opacity: 1;
  filter: drop-shadow(0 0 20px rgba(255, 240, 200, 0.9));
}

@keyframes nvBreathe42 {
  from {
    opacity: 0.42;
  }
  to {
    opacity: 1;
  }
}
@keyframes nvBreathe25 {
  from {
    opacity: 0.25;
  }
  to {
    opacity: 0.8;
  }
}
/* 共鸣页额外带「大小周期缩放，幅度 −8px～0px」：用 scale 近似（236 宽 → −8px ≈ 0.966） */
@keyframes nvBreathe20 {
  from {
    opacity: 0.2;
    transform: scale(1);
  }
  to {
    opacity: 0.8;
    transform: scale(0.966);
  }
}

/* ============ v1.4.02：未选版本 → 心忆共鸣入口置灰（两套入口同一套规则） ============
   置灰 = 灰度 + 压暗 + 不透明度比常态再低一档（用 --rest × 0.8，因为各入口的常态
   透明度本来就不一样：星芒 0.2、右缘 0.5），悬停也不再发光/呼吸/放大。 */
.hm-nav.is-locked,
.dy-btn.is-locked {
  cursor: not-allowed;
  animation: none;
  transform: none;
  filter: grayscale(1) brightness(0.5) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.55));
}
/* 星芒常态最暗只有 0.2（悬停才亮），再乘 0.8 会直接看不见 —— 这里反而要**抬到 0.3**，
   靠「灰 + 压暗」表达不可点，而不是靠消失 */
.is-reveal .hm-nav.is-locked {
  opacity: 0.3;
}
.dy-btn.is-locked {
  opacity: 0.32;
}
/* 关掉悬停/聚焦的高亮（`:disabled` 不给鼠标事件，但 CSS 的 :hover 仍然会命中） */
.nv-banner.is-locked:hover,
.nv-banner.is-locked:focus-visible {
  opacity: 0.3;
  animation: none;
  transform: none;
  filter: grayscale(1) brightness(0.5) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.55));
}
.dy-btn.is-locked:hover,
.dy-btn.is-locked:focus-visible {
  opacity: 0.32;
  transform: none;
  filter: grayscale(1) brightness(0.5) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.55));
}

/* ============ 左上角信封键（v1.6.05：从右上角移来） ============ */
.hm-mail {
  position: absolute;
  /* 紧贴竖版站名艺术字（313×460 @116,34）左侧：36+66=102，与它留 14px 间距 */
  left: 36px;
  top: 34px;
  width: 66px;
  height: 66px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  z-index: 9;
  opacity: 0;
  transition: opacity 0.9s 0.3s ease, transform 0.22s ease, filter 0.22s ease;
}
.is-reveal .hm-mail {
  opacity: 0.72;
}
.hm-mail-ic {
  width: 100%;
  height: 100%;
  stroke: #fff;
  stroke-width: 3.1;
  stroke-linecap: round;
  stroke-linejoin: round;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.65));
  transition: filter 0.22s ease;
}
.hm-mail:hover,
.hm-mail:focus-visible {
  opacity: 1;
  transform: scale(1.08);
}
.hm-mail:hover .hm-mail-ic,
.hm-mail:focus-visible .hm-mail-ic {
  filter: drop-shadow(0 0 14px rgba(255, 236, 196, 0.9)) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6));
}

/* ============ 右下角彩蛋热区 ============ */
.hm-egg {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 200px;
  height: 100px;
  z-index: 24;
  cursor: var(--nk-cursor, auto), pointer;
}

/* ============ 开机动画 ============ */
.boot {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: #04060e;
  display: grid;
  place-items: center;
  animation: bootIn 0.4s ease both;
}
@keyframes bootIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.boot-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 点击开始 */
.boot-tap {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 22px;
  cursor: var(--nk-cursor, auto), pointer;
}
.bt-ring {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  border: 1px solid rgba(220, 232, 255, 0.5);
  box-shadow: 0 0 26px rgba(160, 200, 255, 0.35), inset 0 0 18px rgba(160, 200, 255, 0.2);
  animation: tapPulse 2.2s ease-in-out infinite;
}
@keyframes tapPulse {
  0%,
  100% {
    transform: scale(0.94);
    opacity: 0.55;
  }
  50% {
    transform: scale(1.06);
    opacity: 1;
  }
}
.boot-tap p {
  margin: 0;
  font-size: 13px;
  letter-spacing: 0.5em;
  text-indent: 0.5em;
  color: rgba(224, 234, 255, 0.85);
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.8);
}

/* ============ 底部提示 ============ */
.hm-foot {
  position: relative;
  z-index: 2;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding-bottom: 30px;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.9s ease, transform 0.9s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}
.hm-foot.show {
  opacity: 1;
  transform: translateY(0);
}
.hf-line {
  width: 84px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(200, 190, 255, 0.45), transparent);
}
.hf-arrow {
  font-size: 18px;
  line-height: 1;
  color: rgba(232, 200, 122, 0.9);
  text-shadow: 0 0 14px rgba(232, 200, 122, 0.7);
  animation: arrowLeft 2.4s ease-in-out infinite;
}
@keyframes arrowLeft {
  0%,
  100% {
    transform: translateX(4px);
    opacity: 0.45;
  }
  50% {
    transform: translateX(-6px);
    opacity: 1;
  }
}
.hf-txt {
  font-size: 12px;
  letter-spacing: 0.34em;
  text-indent: 0.34em;
  color: rgba(214, 220, 240, 0.85);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
}
</style>
