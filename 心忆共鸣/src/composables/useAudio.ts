import { ref } from 'vue'
import type { BgmScene, BgmTrack } from '@/types'

/** 音频系统 */
export type SfxName =
  // 共鸣页
  | 'btn-res-hover' | 'btn-res-select'
  | 'btn-ten-hover' | 'btn-ten-select'
  | 'echo-open'
  // 抽卡演出
  | 'perf-normal' | 'perf-gold'
  | 'flip-star' | 'flip-single'
  | 'set-progress-loop' | 'set-progress-done' | 'set-complete'
  | 'panel-fadein' | 'reward-a'
  | 'draw-normal' | 'draw-gold'
  // 弹窗出现
  | 'window-open' | 'unlock-big' | 'sendgift-popup'
  // 纸质（图鉴）
  | 'paper-book' | 'paper-envelope' | 'paper-fadein' | 'paper-slide' | 'paper-flip'
  // 导航 / 通用
  | 'nav-hover' | 'nav-select'
  | 'thumb-hover' | 'thumb-select'
  | 'echo-hover' | 'echo-select'
  | 'codex-exit' | 'back-select'
  | 'common-hover' | 'settings-hover'
  | 'settings-btn-hover' | 'settings-btn-select'
  | 'settings-open'
  | 'btn-deny' | 'points-slide' | 'big-b-select'

export interface PlayOpts {
  volume?: number
  loop?: boolean
  /** 淡入毫秒 */
  fadeIn?: number
  /** 播放速率，>1 变快 */
  rate?: number
}

const SFX_BASE = '/assets/'

/** 背景音场景：主页无 BGM（静态静音 / 动态放视频自带音轨）、版本、共鸣（含抽卡演出 duck）、 图鉴（5 首加权随机）、玄学（2 首各 50）、辉煌；多曲界面在进界面时与播完时换曲 */
export type SceneKey = BgmScene

/** 分场景音量面板的顺序（主页排第一，虽然它没有独立 BGM，但动态背景的视频音轨归它管） */
export const SCENES: SceneKey[] = ['home', 'versions', 'banner', 'codex', 'almanac', 'gloria']
export const SCENE_LABEL: Record<SceneKey, string> = {
  home: '主页',
  versions: '版本',
  banner: '共鸣',
  codex: '博物图鉴',
  almanac: '玄学运势',
  gloria: '辉煌心光',
}

export type SceneTrack = BgmTrack

/** 全局状态（模块级单例，跨组件共享） */
const loaded = ref(false)
const masterVolume = ref(0.7)
/** 背景音总控音量（0~1，乘在 BGM_BASE 上） */
const bgmVolume = ref(0.7)
/** UI 音效分轨音量（0~1，乘在每次 play 的 volume 上） */
const uiVolume = ref(0.8)
const bgmEnabled = ref(true)

/** 当前场景 */
const scene = ref<SceneKey>('home')

/** 各界面背景音自己那根滑杆（0~1，默认 1；串在「背景音总控」下面） */
const sceneVol = ref<Record<SceneKey, number>>({
  home: 1, versions: 1, banner: 1, codex: 1, almanac: 1, gloria: 1,
})

/** 演出期间是否处于压低状态 */
let bgmDucked = false

const buffers = new Map<string, HTMLAudioElement>()
const urlOf = new Map<string, string>()

/** 场景 → 曲目表（由 App.vue 在 manifest 就绪后注册） */
let sceneTracks: Partial<Record<SceneKey, SceneTrack[]>> = {}

let bgmEl: HTMLAudioElement | null = null
/** BGM 正常音量（被 duck 之前的基准） */
const BGM_BASE = 0.34
let lastSrc = ''
/** 播放代次：切场景时 +1，旧元素的 ended 回调据此自动作废 */
let playToken = 0

function resolve(key: string): string | null {
  return urlOf.get(key) ?? null
}

function clamp(v: number, lo = 0, hi = 1) {
  return Math.max(lo, Math.min(hi, v))
}

/** 用一个 interval 做线性淡变；同一元素重复调用会先清掉旧定时器 */
const fadeTimers = new WeakMap<HTMLAudioElement, number>()

function fadeTo(el: HTMLAudioElement, target: number, ms: number, stopAtEnd = false) {
  const old = fadeTimers.get(el)
  if (old) window.clearInterval(old)
  if (ms <= 0) {
    el.volume = clamp(target)
    if (stopAtEnd) el.pause()
    return
  }
  const from = el.volume
  const t0 = performance.now()
  const id = window.setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms)
    el.volume = clamp(from + (target - from) * k)
    if (k >= 1) {
      window.clearInterval(id)
      fadeTimers.delete(el)
      if (stopAtEnd) {
        el.pause()
        try {
          el.currentTime = 0
        } catch {
          /* 某些容器不支持 seek，忽略 */
        }
      }
    }
  }, 16)
  fadeTimers.set(el, id)
}

/** 音频注册：只同步注册 URL，`play()` 时 `new Audio(url)` 按需取；首屏 UI 音预热，其余空闲补预热 */
const WARM_KEYS = [
  'common-hover', 'nav-hover', 'thumb-hover', 'btn-res-hover', 'btn-res-select',
  'btn-ten-select', 'back-select', 'panel-fadein', 'paper-fadein', 'flip-star', 'reward-a',
  'window-open', 'nav-select',
]

/** 并发 4 个地预热指定键（失败静默） */
function warm(keys: string[]) {
  const queue = keys.filter((k) => urlOf.has(k) && !buffers.has(k))
  let i = 0
  const next = () => {
    if (i >= queue.length) return
    const key = queue[i++]
    const url = urlOf.get(key)!
    const a = new Audio()
    a.preload = 'auto'
    a.src = url
    const done = () => next()
    a.addEventListener('canplaythrough', done, { once: true })
    a.addEventListener('error', done, { once: true })
    a.load()
    buffers.set(key, a)
  }
  for (let n = 0; n < 4; n++) next()
}

const idle = (cb: () => void) => {
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => void })
    .requestIdleCallback
  if (ric) ric(cb, { timeout: 3000 })
  else window.setTimeout(cb, 2200)
}

/** 注册全部音效（同步、不阻塞），只预热少量 + 空闲补齐 */
export function preloadAudio(sfx: Record<string, string>, bannerEnter: Record<string, string> = {}) {
  for (const [key, path] of Object.entries(sfx)) urlOf.set(key, SFX_BASE + path)
  for (const [bannerId, path] of Object.entries(bannerEnter)) {
    urlOf.set(`banner-enter:${bannerId}`, SFX_BASE + path)
  }
  loaded.value = true
  warm(WARM_KEYS)
  /** 空闲时补预热其余常驻音效。`bgm` / `bgm-egg` 排除在外：背景音改走 `bgm/*.ogg` 分场景曲库 */
  idle(() => warm(Object.keys(sfx).filter((k) => k !== 'bgm' && k !== 'bgm-egg')))
}

export function warmBannerEnter(bannerId: string) {
  warm([`banner-enter:${bannerId}`])
}

/** 播放一次音效。返回 Audio 实例，便于调用方手动淡出（如「跳过动画」） */
export function play(name: SfxName | string, opts: PlayOpts = {}): HTMLAudioElement | null {
  const url = resolve(name)
  if (!url) return null
  const { volume = 1, loop = false, fadeIn = 0, rate = 1 } = opts
  const el = new Audio(url)
  el.loop = loop
  el.playbackRate = rate
  const target = clamp(volume * uiVolume.value * masterVolume.value)
  el.volume = fadeIn > 0 ? 0 : target
  void el.play().catch(() => {
    /* 未交互前会被浏览器拦截，静默失败即可 */
  })
  if (fadeIn > 0) fadeTo(el, target, fadeIn)
  return el
}

/** 淡出并停止一个正在播的声音 */
export function stop(el: HTMLAudioElement | null | undefined, fadeMs = 320) {
  if (!el) return
  fadeTo(el, 0, fadeMs, true)
}

/** 停掉所有正在播的预加载音效（不含 BGM） */
export function stopAllSfx(fadeMs = 200) {
  for (const el of buffers.values()) {
    if (!el.paused) fadeTo(el, 0, fadeMs, true)
  }
}

/** 星级音 */
export function playStarHit(star: number, opts: PlayOpts = {}) {
  const times = Math.max(1, Math.min(5, star))
  for (let i = 0; i < times; i++) {
    window.setTimeout(() => play('flip-star', { volume: 0.8, ...opts }), i * 100)
  }
}

/** 服装阁专属「进入界面」音（每座阁一个，键名带 bannerId 前缀） */
let bannerEnterEl: HTMLAudioElement | null = null

export function playBannerEnter(bannerId: string, factor = 1) {
  const want = bgmGain('banner') * 0.5 * factor
  const denom = Math.max(1e-4, uiVolume.value * masterVolume.value)
  const el = play(`banner-enter:${bannerId}`, { volume: clamp(want / denom), fadeIn: 400 })
  if (!el) return null
  if (bannerEnterEl && bannerEnterEl !== el) stop(bannerEnterEl, 200)
  bannerEnterEl = el
  return el
}

// ------------------------------------------------------------------ BGM

/** 当前场景的最终音量 */
function level(at: SceneKey = scene.value): number {
  return clamp(
    BGM_BASE * bgmVolume.value * (sceneVol.value[at] ?? 1) * masterVolume.value * (bgmDucked ? 0.28 : 1),
  )
}

/** 注册场景曲目表（App.vue 在 manifest 就绪后调用） */
export function registerSceneBgm(map: Partial<Record<SceneKey, SceneTrack[]>>) {
  sceneTracks = map
}

/** 加权抽一首，尽量避开刚放过的那首 */
function pickTrack(list: SceneTrack[]): SceneTrack | null {
  if (!list.length) return null
  if (list.length === 1) return list[0]
  const fresh = list.filter((t) => t.src !== lastSrc)
  const pool = fresh.length ? fresh : list
  const total = pool.reduce((s, t) => s + (t.w > 0 ? t.w : 1), 0)
  let r = Math.random() * total
  for (const t of pool) {
    r -= t.w > 0 ? t.w : 1
    if (r <= 0) return t
  }
  return pool[pool.length - 1]
}

/** 当前 BGM 元素的最终音量（别的模块要跟着调时用，比如主页视频音轨） */
export function bgmGain(at: SceneKey = scene.value): number {
  return level(at)
}

/** 停掉当前 BGM（淡出后销毁） */
function stopBgm(fadeMs = 420) {
  const el = bgmEl
  bgmEl = null
  if (!el) return
  el.onended = null
  fadeTo(el, 0, fadeMs, true)
}

/** 切到某个场景 */
export function setBgmScene(k: SceneKey) {
  if (k === scene.value) {
    if (!bgmEl && bgmEnabled.value && (sceneTracks[k]?.length ?? 0) > 0) playScene(k)
    return
  }
  playScene(k)
}

function playScene(k: SceneKey, fadeMs = 800) {
  scene.value = k
  const list = sceneTracks[k] ?? []
  const token = ++playToken
  stopBgm(380)
  if (!bgmEnabled.value || !list.length) return

  const t = pickTrack(list)
  if (!t) return
  lastSrc = t.src

  const el = new Audio(SFX_BASE + t.src)
  el.preload = 'auto'
  // 单曲场景整轨循环；多曲场景播完就换
  el.loop = list.length === 1
  el.volume = 0
  el.addEventListener('ended', () => {
    if (token !== playToken) return // 已经切走了，别把新场景顶掉
    playScene(k, 900)
  })
  bgmEl = el
  void el.play().catch(() => {
    /* 还没交互，等下一次交互再起 */
  })
  fadeTo(el, level(k), fadeMs)
}

export function resumeBgm(fadeMs = 600) {
  if (!bgmEnabled.value) return
  if (!bgmEl) return playScene(scene.value, fadeMs)
  if (bgmEl.paused) void bgmEl.play().catch(() => {})
  fadeTo(bgmEl, level(), fadeMs)
}

/** 抽卡演出期间把 BGM 压低，结束后恢复 */
export function duckBgm(on: boolean, ms = 600) {
  bgmDucked = on
  if (bgmEl && !bgmEl.paused) fadeTo(bgmEl, level(), ms)
}

/** 背景音总控（0~1）；正在播时立即生效 */
export function setBgmVolume(v: number) {
  bgmVolume.value = clamp(v)
  if (bgmEl && !bgmEl.paused) fadeTo(bgmEl, level(), 180)
}

/** 单个界面的背景音（0~1）；只影响那个界面，切过去时生效 */
export function setSceneVolume(k: SceneKey, v: number) {
  sceneVol.value = { ...sceneVol.value, [k]: clamp(v) }
  if (k === scene.value && bgmEl && !bgmEl.paused) fadeTo(bgmEl, level(k), 180)
}

/** UI 音效分轨音量（0~1）；只影响之后播放的音效 */
export function setUiVolume(v: number) {
  uiVolume.value = clamp(v)
}

/** 主音量。主音量已计入 `level()`，这里只需要把当前元素跟随过去 */
export function setMasterVolume(v: number) {
  masterVolume.value = clamp(v)
  if (bgmEl && !bgmEl.paused) fadeTo(bgmEl, level(), 180)
}

export function setBgmEnabled(on: boolean) {
  bgmEnabled.value = on
  if (on) playScene(scene.value, 600)
  else stopBgm(400)
}

export function useAudio() {
  return {
    loaded,
    masterVolume,
    bgmVolume,
    uiVolume,
    bgmEnabled,
    scene,
    sceneVol,
    play,
    stop,
    stopAllSfx,
    playStarHit,
    resumeBgm,
    duckBgm,
    setMasterVolume,
    setBgmVolume,
    setSceneVolume,
    setUiVolume,
    setBgmEnabled,
    setBgmScene,
    bgmGain,
    playBannerEnter,
    warmBannerEnter,
  }
}
