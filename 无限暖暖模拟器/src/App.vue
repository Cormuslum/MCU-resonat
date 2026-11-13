<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { stageScale, toDesignX } from '@/core/stage'
import { useRailSuppressed } from '@/composables/useChrome'
import LoadingOverlay from '@/components/LoadingOverlay.vue'
import type { LoadPhotoKey } from '@/types'
import type { SceneKey } from '@/composables/useAudio'
import {
  preloadAudio,
  SCENES,
  setBgmScene,
  registerSceneBgm,
  play,
  setMasterVolume,
  setBgmVolume,
  setSceneVolume,
  setUiVolume,
  setBgmEnabled,
} from '@/composables/useAudio'

const store = useGameStore()
const route = useRoute()
const router = useRouter()

/** 侧边栏展开态（常态隐藏，指针进入屏幕左缘 100px 才滑出） */
const railOpen = ref(false)

/**
 * 设计舞台缩放。
 *
 * 所有界面统一按 1920×1080 设计坐标写死，外层只做一次等比缩放 ——
 * 这样内部元素的 px 值就是实机的 px 值，不用再让每个组件各自写
 * flex/百分比去"凑"，也就不会出现「看着差不多、实际差一截」。
 */
const scale = ref(1)

function fitStage() {
  // 算法在 core/stage.ts（与组件里的指针换算共用同一份，避免两处不一致）
  scale.value = stageScale()
}

/**
 * 侧边导航项（主页为一级，其余为二级）。
 * `icon` 是缺图时的兜底字形；`sys` 指向 `manifest.ui.home.navSys` 的系统图标键
 * —— 与主页右缘竖排入口**共用同一批素材**（v1.2.02）。
 */
const NAV = [
  { to: '/', name: 'home', label: '心绮之启', icon: '⌂', sys: 'home' },
  { to: '/versions', name: 'versions', label: '时隙遗光', icon: '❖', sys: 'ver' },
  { to: '/banner', name: 'banner', label: '心忆共鸣', icon: '◈', sys: 'banner' },
  { to: '/codex', name: 'codex', label: '博物图鉴', icon: '▤', sys: 'codex' },
  { to: '/almanac', name: 'almanac', label: '玄学运势', icon: '✦', sys: 'almanac' },
  { to: '/settings', name: 'settings', label: '辉煌心光', icon: '✦', sys: 'gloria' },
] as const

/** 侧栏图标（缺图返回空串，模板退回字形） */
function navIcon(sys: string): string {
  const map = store.manifest?.ui.home?.navSys as Record<string, string | undefined> | undefined
  return store.asset(map?.[sys] ?? null)
}

/**
 * 未选版本时「心忆共鸣」不可点（v1.4.02）。
 * 共鸣页只列当前版本的服装阁，没有当前版本就没有内容 —— 与主页入口同一套判定。
 */
function navLocked(item: { name: string }): boolean {
  return item.name === 'banner' && !store.selectedVersion
}

/**
 * 抽卡演出不显示侧边栏，避免遮挡；页面也可以主动申请暂时隐藏（见 useChrome）。
 * v1.6.06 起主页也不显示：主页是全屏立绘 + 信封入口，侧边栏的 100px 左缘感应区
 * 会压住竖版站名和信封键，且主页的入口本来就在画面里。
 */
const railSuppressed = useRailSuppressed()
const HIDE_RAIL_ROUTES = ['gacha', 'home']
const railVisible = computed(
  () => !HIDE_RAIL_ROUTES.includes(String(route.name ?? '')) && !railSuppressed.value,
)

/** 子路由也归到父级导航项上高亮（如 /codex/clothes → codex） */
const activeName = computed(() => {
  const n = String(route.name ?? '')
  if (n === 'gacha') return 'banner'
  if (n.startsWith('codex')) return 'codex'
  return n
})

/* ════════════════════════════════ 侧边栏：屏幕左缘 100px 感应 */

/** 设计坐标下的边缘感应宽度 */
const RAIL_SENSE = 100
/** 面板展开后的实际宽度（与 CSS .rail 一致） */
const RAIL_W = 158
/**
 * 贴边死区：指针进到这个宽度以内**强制**展开，不管下面压着什么。
 *
 * 起因（v2.4.01）：版本页左栏从 x≈20 起就是整列的版本卡（button），
 * 按「压着按钮就让位」的规则，x≤100 全程都判给页面，侧栏在这一页永远够不到 ——
 * 而侧栏是跨二级页跳转的唯一入口，等于把导航锁死了。
 * 留 32px 的死区既能把侧栏叫出来，又只压住卡片最左 12px，点卡片还够得着。
 */
const RAIL_SENSE_EDGE = 32

/**
 * 指针的 clientX → 设计坐标。
 *
 * 舞台固定居中、只做一次 scale，所以屏幕黑边 = (innerW − 1920×scale)/2，
 * 这里直接算，不读 DOM（pointermove 频率高，getBoundingClientRect 会反复触发布局计算）。
 *
 * v1.6.02：算法挪到 `core/stage.ts`（`toDesignX`），与各组件的指针换算共用一份。
 */
function designX(clientX: number): number {
  return toDesignX(clientX)
}

/**
 * 页面自己的可交互元素 —— 指针停在这些东西上时不要抢着弹侧栏。
 * 标签判不了自定义热区（玄学运势的收纳桶、共鸣页的服装阁列表都是 div），
 * 所以再开放一个 `data-no-rail` 标记给页面自己声明。
 */
const INTERACTIVE = 'button, a, [role="button"], input, select, textarea, [data-no-rail]'

function onPointerMove(e: PointerEvent) {
  if (!railVisible.value) {
    if (railOpen.value) railOpen.value = false
    return
  }
  const x = designX(e.clientX)
  const t = e.target as HTMLElement | null
  const inRail = !!t?.closest('.rail')
  /**
   * 页面上不少交互物件就贴在左边缘（玄学运势的收纳桶就在 x≈19、共鸣页的服装阁列表
   * 从 x=14 起）。如果单纯按「x < 100 就弹」，这些地方永远点不到。
   * 所以再判一次指针下的元素：是页面按钮就让位，是空白/装饰才唤醒。
   */
  const onPageUI = !!t?.closest(INTERACTIVE)

  let want = false
  if (inRail) {
    want = true
  } else if (x <= RAIL_SENSE_EDGE) {
    // 贴到最左的死区：无条件展开（页面按钮再密也不能把导航锁死）
    want = true
  } else if (x <= RAIL_SENSE && !onPageUI) {
    want = true
  } else if (railOpen.value && x <= RAIL_W && !onPageUI) {
    want = true
  }
  if (want !== railOpen.value) railOpen.value = want
}

/** 指针移出窗口时不收不到 pointermove，单独兜底 */
function onPointerLeave() {
  railOpen.value = false
}

/* ════════════════════════════════ 黑屏加载过渡（v1.3.00） */

/**
 * 只有「一级 ↔ 二级」「二级 ↔ 二级」这三类跳转铺黑屏：
 *   主页 /↔ 二级、二级 ↔ 另一个二级。
 * 三级（/codex/* 、/gacha）走各自的页面内转场，不遮。
 */
const PAGE_L1 = '/'
const PAGE_L2 = new Set(['/versions', '/banner', '/codex', '/almanac', '/settings'])

const PHOTO_OF: Record<string, LoadPhotoKey> = {
  '/': 'home',
  '/versions': 'ver',
  '/banner': 'banner',
  '/codex': 'codex',
  '/almanac': 'almanac',
  '/settings': 'gloria',
}

/** `null` = 不在加载中 */
const ldLoading = ref<{ id: number; photo: LoadPhotoKey } | null>(null)
let loadingSeq = 0

/* ════════════════════════════════ 背景音：按界面分场景（v2.4.01） */

/**
 * 路径 → 场景。三级路由归到父级：
 *   /codex/clothes → codex、/gacha → banner（抽卡是共鸣的一部分，共用服装阁 BGM）。
 * 主页没有独立曲目，切过去等于静音（动态背景由视频自带音轨接管）。
 */
const SCENE_OF: Record<string, SceneKey> = {
  '/': 'home',
  '/versions': 'versions',
  '/banner': 'banner',
  '/codex': 'codex',
  '/almanac': 'almanac',
  '/settings': 'gloria',
  '/gacha': 'banner',
}

function sceneOf(path: string): SceneKey {
  if (SCENE_OF[path]) return SCENE_OF[path]
  if (path.startsWith('/codex')) return 'codex'
  return 'home'
}

function isStageHop(from: string, to: string): boolean {
  if (from === to) return false
  const a = from === PAGE_L1 || PAGE_L2.has(from)
  const b = to === PAGE_L1 || PAGE_L2.has(to)
  return a && b
}

router.beforeEach((to, from) => {
  const toPath = to.path
  const fromPath = from.path
  if (!isStageHop(fromPath, toPath)) {
    // 进三级 / 演出时若有残留的加载层，顺手清掉
    if (ldLoading.value) ldLoading.value = null
    return
  }
  ldLoading.value = { id: ++loadingSeq, photo: PHOTO_OF[toPath] ?? 'home' }
})

/** 路由一变就换背景音：同场景（二级 → 它的三级）是幂等的，不会重头放 */
watch(
  () => route.path,
  (p) => setBgmScene(sceneOf(p)),
)

onMounted(async () => {
  fitStage()
  window.addEventListener('resize', fitStage)
  window.addEventListener('pointermove', onPointerMove)
  document.addEventListener('mouseleave', onPointerLeave)
  await store.init()
  if (store.manifest) {
    // 预加载音效 → 之后才能无缝播放
    await preloadAudio(store.manifest.sfx, store.manifest.bannerEnter)
  }
  setMasterVolume(store.save.settings.volume ?? 0.7)
  setBgmVolume(store.save.settings.bgmVol ?? 0.7)
  setUiVolume(store.save.settings.uiVol ?? 0.8)
  // 按界面背景音（老存档没有这份数据，缺省全 1）
  const savedScene = store.save.settings.bgmScene ?? {}
  for (const k of SCENES) setSceneVolume(k, savedScene[k] ?? 1)
  // 背景音滑杆拉到 0 也视为静音（旧版 bgm 开关已并入音量面板）
  setBgmEnabled(store.save.settings.bgm !== false && (store.save.settings.bgmVol ?? 0.7) > 0)

  // 场景曲目表 + 当前场景。浏览器要等首次交互才让出声，so 先 set 一次记下场景
  if (store.manifest?.bgm) registerSceneBgm(store.manifest.bgm)
  setBgmScene(sceneOf(route.path))

  // 首次交互后再起 BGM，避免被浏览器自动播放策略拦截
  const kick = () => {
    setBgmScene(sceneOf(route.path))
    window.removeEventListener('pointerdown', kick)
    window.removeEventListener('keydown', kick)
  }
  window.addEventListener('pointerdown', kick)
  window.addEventListener('keydown', kick)

  // 鼠标指针：用游戏内素材（26×30，热点按比例设在左上 2,2 —— 原图是 52×60 / 4,4）
  const cursor = store.manifest?.ui?.cursor
  if (cursor) {
    // 变量里放完整的 cursor 值，配合各处 `cursor: var(--nk-cursor, auto), pointer`
    document.documentElement.style.setProperty(
      '--nk-cursor', `url("${store.asset(cursor)}") 2 2, auto`,
    )
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', fitStage)
  window.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('mouseleave', onPointerLeave)
})

function go(to: string, name: string) {
  if (activeName.value === name) {
    railOpen.value = false
    return
  }
  play('nav-select', { volume: 0.75 })
  railOpen.value = false
  router.push(to)
}
</script>

<template>
  <div class="stage">
    <!-- 设计舞台：内部一律按 1920×1080 写死，只在外层等比缩放 -->
    <div class="design" :style="{ transform: `translate(-50%, -50%) scale(${scale})` }">
      <div class="app-shell">
        <!-- 背景星云 -->
    <div class="bg-layer">
      <div class="bg-glow bg-glow-1"></div>
      <div class="bg-glow bg-glow-2"></div>
      <div class="bg-grain"></div>
    </div>

    <!-- 加载中 -->
    <div v-if="store.loading" class="center-box">
      <div class="loading">
        <div class="loading-ring"></div>
        <p>正在展开星图…</p>
      </div>
    </div>

    <!-- 加载失败 -->
    <div v-else-if="store.loadError" class="center-box">
      <div class="error-box panel">
        <h2>素材没找到</h2>
        <p class="err-msg">{{ store.loadError }}</p>
        <p class="hint">
          请先在项目根目录执行：<br />
          <code>python tools/collect-assets.py</code>
        </p>
      </div>
    </div>

    <!-- 主界面 -->
    <template v-else>
      <!-- ============ 侧边收纳栏（常态隐藏，指针进入屏幕左缘 100px 才滑出） ============ -->
      <aside
        v-if="railVisible"
        class="rail"
        :class="{ open: railOpen }"
        aria-label="页面导航"
      >
        <nav class="rail-list">
          <button
            v-for="item in NAV"
            :key="item.name"
            class="rail-btn"
            :class="{ active: activeName === item.name, 'is-locked': navLocked(item) }"
            :disabled="navLocked(item)"
            :title="navLocked(item) ? '先去「时隙遗光」选择版本' : undefined"
            @mouseenter="!navLocked(item) && play('nav-hover', { volume: 0.45 })"
            @click="go(item.to, item.name)"
          >
            <span class="rb-ico">
              <img v-if="navIcon(item.sys)" :src="navIcon(item.sys)" alt="" draggable="false" />
              <template v-else>{{ item.icon }}</template>
            </span>
            <span class="rb-txt">{{ item.label }}</span>
          </button>
        </nav>
      </aside>

          <main class="main-area">
            <router-view v-slot="{ Component }">
              <transition name="page" mode="out-in">
                <component :is="Component" />
              </transition>
            </router-view>
          </main>
        </template>
      </div>

      <!-- 黑屏加载过渡：盖住整块设计舞台（主页 ↔ 二级 / 二级 ↔ 二级） -->
      <LoadingOverlay
        v-if="ldLoading"
        :key="ldLoading.id"
        :photo="ldLoading.photo"
        @done="ldLoading = null"
      />
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  background: #04060e;
  overflow: hidden;
}
/*
 * 居中不能用 grid/flex 的 center：
 * 设计盒 1920×1080 比容器大时，CSS 的「安全对齐」会把 center 退化成 start，
 * 元素从 (0,0) 开始布局，再被 scale 一缩就往右下跑（左上一大片黑边）。
 * 改成 absolute + left/top 50% + translate(-50%,-50%)，缩放原点也是中心，稳。
 */
.design {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1920px;
  height: 1080px;
  transform-origin: center center;
  overflow: hidden;
}
.app-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* ---------- 背景 ---------- */
.bg-layer {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  background:
    radial-gradient(1200px 800px at 50% -10%, #1a2340 0%, transparent 60%),
    radial-gradient(900px 700px at 85% 110%, #2a1a3a 0%, transparent 55%),
    var(--bg-deep);
}
.bg-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
  opacity: 0.5;
  animation: drift 22s ease-in-out infinite alternate;
}
.bg-glow-1 {
  width: 520px;
  height: 520px;
  left: -120px;
  top: -140px;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.35), transparent 70%);
}
.bg-glow-2 {
  width: 620px;
  height: 620px;
  right: -180px;
  bottom: -220px;
  background: radial-gradient(circle, rgba(124, 196, 240, 0.22), transparent 70%);
  animation-delay: -8s;
}
@keyframes drift {
  from { transform: translate3d(0, 0, 0) scale(1); }
  to { transform: translate3d(40px, 30px, 0) scale(1.12); }
}
.bg-grain {
  position: absolute;
  inset: 0;
  opacity: 0.16;
  background-image: radial-gradient(rgba(255, 255, 255, 0.5) 0.5px, transparent 0.5px);
  background-size: 3px 3px;
  mix-blend-mode: overlay;
}

/* ---------- 侧边收纳栏 ----------
 * v1.3.00：常态**完全隐藏**（连那条细金线也不露），指针进入屏幕左缘 100px
 * 才整块滑入（判定在 App.vue 的 pointermove 里，用设计坐标算，跟缩放无关）。
 */
.rail {
  /* design 舞台内绝对定位，跟着 1920×1080 一起缩放 */
  position: absolute;
  left: 0;
  top: 50%;
  z-index: 60;
  width: 158px;
  padding: 34px 0;
  display: flex;
  align-items: center;
  transform: translate(-102%, -50%);
  opacity: 0;
  pointer-events: none;
  transition:
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.26s ease;
}
.rail.open {
  transform: translate(0, -50%);
  opacity: 1;
  pointer-events: auto;
}
/* 圆角金边面板（v1.2.02：底色 #C39C7A；v1.3.00 只在滑入时可见） */
.rail::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 100%;
  background: #c39c7a;
  border: 1px solid rgba(255, 232, 176, 0.75);
  border-left: 0;
  border-radius: 0 18px 18px 0;
  box-shadow: 8px 0 40px rgba(0, 0, 0, 0.45), inset 0 0 26px rgba(255, 240, 205, 0.35);
  pointer-events: none;
}

.rail-list {
  position: relative;
  width: 100%;
  display: grid;
  gap: 4px;
  padding-left: 8px;
}

.rail-btn {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 14px 9px 10px;
  border-radius: 0 10px 10px 0;
  color: #4a3418;
  font-size: 13.5px;
  letter-spacing: 0.16em;
  transition: all 0.16s ease;
  white-space: nowrap;
  background: none;
}
.rail-btn:hover {
  color: #2b1c07;
  background: rgba(255, 246, 226, 0.42);
}
.rail-btn.active {
  color: #2b1c07;
  background: rgba(255, 246, 226, 0.72);
  font-family: 'NikkiBodyBold', sans-serif;
  box-shadow: inset 0 0 0 1px rgba(255, 236, 190, 0.85), 0 3px 12px rgba(90, 62, 24, 0.25);
}
/* 未选版本：共鸣项置灰不可点（v1.4.02）。`:disabled` 自带 hover 屏蔽，
   但底色/字色是写在 .rail-btn:hover 上的，得显式压回去。 */
.rail-btn:disabled,
.rail-btn.is-locked:hover {
  cursor: not-allowed;
  color: rgba(74, 52, 24, 0.45);
  background: none;
  filter: grayscale(1);
  box-shadow: none;
}
.rail-btn.is-locked .rb-ico,
.rail-btn.is-locked .rb-txt {
  opacity: 0.55;
}
.rb-ico {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  text-align: center;
  font-size: 15px;
  line-height: 1;
  flex: 0 0 auto;
}
/* 系统图标本体偏白，压在 #C39C7A 底上要加一点暗描边才立得住 */
.rb-ico img {
  width: 22px;
  height: 22px;
  max-width: none;
  object-fit: contain;
  filter: drop-shadow(0 1px 2px rgba(70, 46, 14, 0.45)) brightness(0.96) saturate(1.15);
}
.rb-txt {
  font-size: 13px;
  letter-spacing: 0.2em;
}

/* ---------- 主区域 ---------- */
.main-area {
  position: relative;
  z-index: 10;
  height: 100%;
  overflow: hidden;
}

/* ---------- 页面切换 ---------- */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.26s ease, transform 0.26s ease;
}
.page-enter-from {
  opacity: 0;
  transform: scale(0.985);
}
.page-leave-to {
  opacity: 0;
  transform: scale(1.008);
}

/* ---------- 加载 ---------- */
.loading {
  display: grid;
  gap: 18px;
  justify-items: center;
  color: var(--text-dim);
  letter-spacing: 0.14em;
}
.loading-ring {
  width: 44px;
  height: 44px;
  border: 2px solid rgba(232, 200, 122, 0.18);
  border-top-color: var(--gold);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

/* ---------- 错误 ---------- */
.error-box {
  padding: 34px 40px;
  max-width: 520px;
}
.error-box h2 {
  margin: 0 0 12px;
  color: var(--pink);
  font-size: 18px;
}
.err-msg {
  color: var(--text-dim);
  margin: 0 0 18px;
}
.hint {
  color: var(--text-mute);
  font-size: 13px;
  line-height: 1.9;
}
.hint code {
  display: inline-block;
  margin-top: 6px;
  padding: 7px 12px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--line);
  border-radius: 7px;
  color: var(--gold);
  font-size: 12px;
}
</style>
