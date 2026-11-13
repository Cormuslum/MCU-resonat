<script setup lang="ts">
/**
 * 深海回响（V2 重制版）
 *
 * 权威依据：`布局坐标/深海回响/深海回响界面_实机UI坐标与动态效果分析.md`
 * 基准画面：1920×1080（实机录屏 1918×1078 按 +1,+1 折算）
 *
 * 版式语义 = **奖励预览详情页**，不是选择器：
 *   - 左上  返回金钮 + 标题「深海回响」
 *   - 顶部  紫缎带「N次后可领取」（N = 重点档 160 抽 − 当前抽数）
 *   - 左侧  摆饰 / 礼盒大图（按**当前服装阁**取：manifest 的 banner.decor；没素材的池不显示）
 *   - 右侧  物品名 / 分隔饰线 / 金色类型说明 / 描述正文
 *   - 底部  10 档里程碑轨道（波形进度线 + 节点 + 当前抽数徽章）
 *   - 不做 UID 水印（用户明确要求）
 *
 * 坐标一律写死 1920×1080 绝对像素，子元素全部 position:absolute。
 * 根元素 `inset:0` 落在 `.banner`（也是 1920×1080）里，跟着 `.design` 一起缩放，
 * 所以**不需要 Teleport**——Teleport 到 body 反而会脱离设计坐标系。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { toDesignX } from '@/core/stage'
import { play } from '@/composables/useAudio'
import type { TierView } from '@/core/milestone'

const emit = defineEmits<{ (e: 'close'): void }>()

const store = useGameStore()

const ui = computed(() => store.manifest?.ui.deepsea)
const uiBanner = computed(() => store.manifest?.ui.banner)
const tiers = computed<TierView[]>(() => store.tiers)
const total = computed(() => store.pity.total)

function asset(p: string | null | undefined) {
  return store.asset(p)
}

/* ══════════════════════════════════════════════════════ 轨道几何
 *
 * 12 个实测采样点（实机亮芯中心线）。线性插值会看出折角，所以用
 * Catmull-Rom 样条做 C1 连续插值——这是「曲线看起来不像游戏里那条」的根因。
 */
const TRACK_PTS: ReadonlyArray<readonly [number, number]> = [
  [66, 767], [173, 773], [342, 782], [511, 784], [681, 780], [847, 765],
  [1021, 751], [1189, 744], [1357, 741], [1527, 743], [1695, 747], [1800, 750],
]
const TRACK_X0 = 66
const TRACK_X1 = 1800

/* ══════════════════════════════════════════════════════ 长轨道（常驻池）
 *
 * 常驻池「遥远之海」（banner-001）的深海回响是 **36 档 20→715 的长轨道**，
 * 与五星池的 10 档（20→230）、四星池的 3 档（5/15/25）都不同。
 *
 * 实机《深海回响-常驻服装阁》录屏实测（列采样 + t=0/t=20 两帧互相关对齐）：
 *   - 首节点 X=254、节点间距恒为 **188**（36 档 → 末节点 254+35×188=6834）
 *   - 曲线是周期缓波：谷 X≈630 y≈492 → 峰 X≈1570 y≈400 → 谷 X≈2510 y≈503 → 峰 X≈3450 y≈412…
 *     （振幅 ≈52、周期 ≈1880）；录屏没走到区段按周期延拓
 *   - 无左侧摆饰大图、无蓝色光柱（重点档概念只属于五星池）、无自选弹窗（用户明确不做）
 *   - 徽章在「当前抽数」插值位置（715 抽账号里它在画面外，随滚动到尾部才可见）
 */
const LONG_X0 = 254
const LONG_GAP = 188
const LONG_W = 7150
const LONG_PTS: ReadonlyArray<readonly [number, number]> = [
  [0, 470], [254, 477], [442, 488], [630, 492], [818, 477], [1006, 451],
  [1194, 425], [1382, 404], [1570, 400], [1758, 401], [1946, 427], [2134, 462],
  [2322, 492], [2510, 503], [2698, 492], [2886, 468], [3074, 440], [3262, 420],
  [3450, 412], [3638, 420], [3826, 445], [4014, 478], [4202, 502], [4390, 505],
  [4578, 488], [4766, 458], [4954, 428], [5142, 408], [5330, 400], [5518, 402],
  [5706, 420], [5894, 450], [6082, 480], [6270, 500], [6458, 505], [6646, 492],
  [6834, 468], [7150, 440],
]

/** 超过 10 档铺不下固定轨道 → 切长轨道（横向滚动）模式 */
const longMode = computed(() => tiers.value.length > 10)

/**
 * 四星池短轨道（3 档 5/15/25）。
 * 依据 `无限暖暖2/实机分析/09_深海回响_奖励轨道页_常驻与四星池.md` 实测：
 * 节点间距 ≈190（820→1012→1201，中心 1010）、奖励图标 105×123、
 * 抽数徽章外环 **Ø170**（五星池只有 Ø89，约 1.9×）。
 */
const shortMode = computed(() => !longMode.value && tiers.value.length > 0 && tiers.value.length <= 3)
const SHORT_GAP = 190
const SHORT_MID = 1010
const SHORT_CARD_K = 1.09
const SHORT_BADGE_K = 1.9

/** 轨道中线在任意 x 处的 y（Catmull-Rom，两端外推取端点值） */
function trackY(x: number): number {
  const P = longMode.value ? LONG_PTS : TRACK_PTS
  if (x <= P[0][0]) return P[0][1]
  if (x >= P[P.length - 1][0]) return P[P.length - 1][1]
  let i = 0
  for (let k = 0; k < P.length - 1; k++) {
    if (x >= P[k][0] && x <= P[k + 1][0]) { i = k; break }
  }
  const p0 = P[Math.max(0, i - 1)]
  const p1 = P[i]
  const p2 = P[i + 1]
  const p3 = P[Math.min(P.length - 1, i + 2)]
  const t = (x - p1[0]) / (p2[0] - p1[0])
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (
    2 * p1[1] +
    (-p0[1] + p2[1]) * t +
    (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
    (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3
  )
}

/** 按 6px 步长采样成折线 path */
function trackPath(x0: number, x1: number, step = 6): string {
  const out: string[] = []
  for (let x = x0; x <= x1; x += step) {
    out.push(`${out.length ? 'L' : 'M'}${x} ${trackY(x).toFixed(1)}`)
  }
  const lastY = trackY(x1).toFixed(1)
  out.push(`L${x1} ${lastY}`)
  return out.join(' ')
}
/** 长轨道的 path 覆盖整个内层宽度；固定轨道维持原实测区间 */
const trackD = computed(() =>
  longMode.value ? trackPath(0, LONG_W) : trackPath(TRACK_X0, TRACK_X1),
)

/* ══════════════════════════════════════════════════════ 节点排布
 *
 * 实机 10 档：首节点 x=174、末节点 x=1695、间距恒为 169。
 * 换成「间距固定 169 + 整组居中于 934」就能同时满足 10 档（算出 173.5≈174），
 * 档数变少时也不会全部挤在左边。
 * 长轨道：首节点 X=254、间距 188，整条随视口横向滚动。
 */
const NODE_GAP = 169
const NODE_MID = 934
const CARD_W = 96
/** 徽章中心到轨道中线的垂直距离（实机 108 抽 → 徽章 y=692、轨道 y≈759） */
const BADGE_DY = 67

const n = computed(() => tiers.value.length)

/**
 * 档位间距。10 档时正好 169（与实机一致）；长轨道恒为 188（实机实测）。
 */
const gap = computed(() => {
  if (longMode.value) return LONG_GAP
  if (shortMode.value) return SHORT_GAP
  const m = Math.max(1, n.value - 1)
  return Math.min(NODE_GAP, (TRACK_X1 - TRACK_X0) / m)
})
/** 卡片缩放比：间距被压窄时卡片跟着缩，1 档时恒为 1，不影响默认池；长轨道不缩；四星池按实机放大到 105 宽 */
const cardK = computed(() => {
  if (longMode.value) return 1
  if (shortMode.value) return SHORT_CARD_K
  return Math.min(1, Math.max(0.36, (gap.value - 8) / CARD_W))
})

const nodeX0 = computed(() => {
  if (longMode.value) return LONG_X0
  const mid = shortMode.value ? SHORT_MID : NODE_MID
  return mid - (Math.max(1, n.value) - 1) * gap.value / 2
})

function nodeX(i: number): number {
  return nodeX0.value + i * gap.value
}
function nodeY(i: number): number {
  return trackY(nodeX(i))
}

/* ══════════════════════════════════════════════════════ 抽数徽章
 *
 * 实测 108 抽 → 徽章 x=916；按「100 次节点 849.5 + 8/20×169」= 917，吻合。
 * 低于首档时向 TRACK_X0 线性外推，0 抽正好落在轨道起点。
 */
const badgeX = computed(() => {
  const list = tiers.value
  const t = total.value
  if (!list.length) return longMode.value ? LONG_X0 : NODE_MID
  const first = list[0]
  if (t <= first.pulls) {
    const k = first.pulls > 0 ? t / first.pulls : 1
    if (longMode.value) {
      // 长轨道起点离左缘足够远（254），0 抽的徽章直接落在首档节点上
      return LONG_X0 + (nodeX(0) - LONG_X0) * k
    }
    // 0 抽会外推到 TRACK_X0，徽章外环半径 55 会被左边裁掉一半 → 兜到 100
    // 四星池徽章 Ø170（半径 85），实机 0 抽中心 x=194.5 → 兜到 194
    if (shortMode.value) {
      return Math.max(194, 194 + (nodeX(0) - 194) * k)
    }
    return Math.max(100, TRACK_X0 + (nodeX(0) - TRACK_X0) * k)
  }
  const last = list[list.length - 1]
  if (t >= last.pulls) return nodeX(list.length - 1)
  for (let i = 0; i < list.length - 1; i++) {
    const a = list[i]
    const b = list[i + 1]
    if (t >= a.pulls && t <= b.pulls) {
      const k = (t - a.pulls) / (b.pulls - a.pulls)
      return nodeX(i) + k * gap.value
    }
  }
  return longMode.value ? LONG_X0 : NODE_MID
})
const badgeY = computed(() => trackY(badgeX.value) - BADGE_DY)

/**
 * 「已走过」的那一段轨道（v1.3.04）。
 *
 * 实机里走过的地方整段是亮的、像被光灌满的槽；原来整条轨道一个亮度，
 * 走到哪都看不出来。这里用**同一套样条**从起点重画到当前抽数，
 * 只多两条 path，几何完全跟随主线，不会错位。
 */
const passedD = computed(() => {
  const x1 = badgeX.value
  if (longMode.value) return trackPath(0, Math.max(1, x1))
  return trackPath(TRACK_X0, Math.max(TRACK_X0 + 1, x1))
})

/* ══════════════════════════════════════════════════════ 长轨道滚动
 *
 * 实机用滚轮 / 拖动横向浏览长轨道；录屏实测滚动是平滑跟手的（≈130px/s 的一段）。
 * 这里做「滚轮纵向量 → 横向滚动」+「按住拖拽」，不做回弹。
 * 初始停在轨道起点（实机 t=0 就是 20次 档在画面左端，**不会**自动跳到当前进度）。
 */
const scrollX = ref(0)
const innerW = computed(() => (longMode.value ? LONG_W : 1920))
const maxScroll = computed(() => (longMode.value ? LONG_W - 1920 : 0))
const dragging = ref(false)
let dragFrom = 0
let dragScroll = 0

function clampScroll(v: number): number {
  return Math.min(maxScroll.value, Math.max(0, v))
}
function onWheel(e: WheelEvent) {
  if (!longMode.value) return
  scrollX.value = clampScroll(scrollX.value + e.deltaY + e.deltaX)
}
function dragStart(e: PointerEvent) {
  if (!longMode.value) return
  dragging.value = true
  // v1.6.02：记**设计坐标**，不然高分辨率下拖拽会跑得更快
  dragFrom = toDesignX(e.clientX)
  dragScroll = scrollX.value
  window.addEventListener('pointermove', dragMove)
  window.addEventListener('pointerup', dragEnd, { once: true })
}
function dragMove(e: PointerEvent) {
  if (!dragging.value) return
  scrollX.value = clampScroll(dragScroll - (toDesignX(e.clientX) - dragFrom))
}
function dragEnd() {
  dragging.value = false
  window.removeEventListener('pointermove', dragMove)
}

/* ══════════════════════════════════════════════════════ 档位语义 */

/** 重点档：带摆饰的那一档（如 076 的 160 抽）以及 230 抽大档 —— 金色灯泡 + 蓝色光柱。
 *  这是五星池的概念；常驻池长轨道没有摆饰重点档（实机也无光柱），长轨道下一律不渲染。 */
function isMajor(t: TierView): boolean {
  if (longMode.value) return false
  return t.pulls >= 230 || showcaseTier.value?.pulls === t.pulls
}

/** 第一个还没达成的档（底部「N次后可领取」提示挂在它下面） */
const nextTier = computed(() => tiers.value.find((t) => !t.reached) ?? null)

/**
 * 本池的摆饰 / 礼盒（v2.7.02）。
 *
 * 以前这里写死「万金之上」+ `ui.deepsea.scene` 一张图，等于只有 2.10 执律的流金能用。
 * 现在数据来自 pool-map 的 `decor`（源：`Rewards Introduction.md` 的「对应套装」列），
 * 每座阁按自己 5★ 套装取；md 里没列的池为 null，整块（大图 + 右侧文案）都不渲染。
 */
const decor = computed(() => store.banner?.decor ?? null)

/** 摆饰所在的那一档（奖励名与摆饰名对得上才认）；对不上就没有「N次后可领取」缎带 */
const showcaseTier = computed(() => {
  const d = decor.value
  if (!d) return null
  return tiers.value.find((t) => t.rewards.some((r) => r.reward === d.name)) ?? null
})
/** 顶部缎带：距摆饰那一档还差多少抽 */
const ribbon = computed(() => {
  const t = showcaseTier.value
  if (!t) return null
  if (t.claimed) return { num: '', text: '已领取' }
  if (t.reached) return { num: '', text: '可领取' }
  return { num: String(t.pulls - total.value), text: '次后可领取' }
})

/** 摆饰详情：名称和正文来自数据表；类型说明按「礼盒 / 摆饰」二分（md 里没这一列） */
const showcase = computed(() => {
  const d = decor.value
  if (!d) return null
  return {
    name: d.name,
    sub: d.name.includes('礼盒') ? '内含舞蹈动作与道具的礼盒。' : '可供拍照与观赏的摆饰。',
    desc: d.desc,
  }
})

/* ══════════════════════════════════════════════════════ 环境动效
 *
 * 实机《屏幕录制 2026-10-24 234837》逐帧实测的五种环境动效，全部纯 CSS
 * （只动 transform / opacity，合成器友好）。它们属于背景层：不随长轨道
 * scrollX 平移，固定轨道与长轨道共享。坐标写死 1920×1080。
 */

/** 彩虹光带四色：黄 → 蓝 → 红 → 绿 循环（c1=主色亮芯 / c2=边缘深一档）。
 *  单周期内一色作为带中央的主色调，其余三色在带上下边缘，层间 crossfade 即「柔和混杂」。 */
const RB_COLORS = [
  { name: 'y', main: '#f4e3a0', deep: '#d9bd6b' },
  { name: 'b', main: '#9fcdff', deep: '#6ea6e0' },
  { name: 'r', main: '#ff9caa', deep: '#e07a8c' },
  { name: 'g', main: '#a5e2ae', deep: '#74c586' },
] as const

/** 星空粒子：固定种子伪随机（每次渲染位置一致），上半屏 y 0..620 */
const STARS = (() => {
  let s = 0x9e3779b9
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0xffffffff
  }
  return Array.from({ length: 34 }, (_, i) => ({
    x: Math.round(rnd() * 1900),
    y: Math.round(rnd() * 612) + 8,
    size: 1 + Math.round(rnd() * 2.2),
    dur: 2.4 + rnd() * 3.2,
    delay: -rnd() * 6,
    drift: i % 4 === 0,
  }))
})()

/** 上浮气泡：实测出现点/尺寸（Ø15–30，≈10px/s 上浮，6~9s 循环，升约 100px 后消散） */
const BUBBLES = [
  { x: 1000, y: 838, size: 24, dur: 6.8, delay: 0 },
  { x: 1230, y: 800, size: 17, dur: 8.2, delay: -2.6 },
  { x: 1600, y: 782, size: 28, dur: 7.4, delay: -4.8 },
  { x: 1875, y: 830, size: 15, dur: 9.0, delay: -1.4 },
  { x: 520, y: 815, size: 19, dur: 8.6, delay: -6.1 },
]

/* ══════════════════════════════════════════════════════ 交互 */

function close() {
  play('back-select', { volume: 0.7 })
  emit('close')
}

function hover() {
  play('common-hover', { volume: 0.32 })
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  play('echo-open', { volume: 0.7 })
  window.addEventListener('keydown', onKey)
  /*
   * 旧版在档位详情里点「领取」，现在没有逐档详情页（只展示「万金之上」），
   * 所以达成即视为已领取 —— 这样轨道上的对勾状态与实机一致，
   * 共鸣页那个「可领取」小红点也会跟着消失。
   */
  for (const t of tiers.value) {
    if (t.reached && !t.claimed) store.claimMilestone(t.pulls)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('pointermove', dragMove)
})
</script>

<template>
  <div
    v-if="ui"
    class="echo"
    :class="{ long: longMode, dragging }"
    @wheel.prevent="onWheel"
    @pointerdown="dragStart"
  >
    <!-- ══════════ 背景（2731×1535 深紫夜空，比例与 16:9 几乎一致，直接 cover） -->
    <div class="ds-bg">
      <img class="ds-bg-img" :src="asset(ui.bg)" alt="" draggable="false" />
      <div class="ds-bg-veil"></div>
    </div>

    <!-- ══════════ 环境动效层（背景之上、场景与轨道之下，均不随长轨道滚动） -->
    <!-- 右上彩虹光带：黄/蓝/红/绿四色周期渐变，单周期一色为主（带中央）、其余三色在带边缘、交界柔和 -->
    <div class="rb" aria-hidden="true">
      <i v-for="c in RB_COLORS" :key="'rb' + c.name" class="rb-band" :class="'rb-' + c.name"></i>
    </div>
    <!-- 星空粒子闪烁（上半屏随机生灭，少量带缓慢漂移） -->
    <div class="stars" aria-hidden="true">
      <i
        v-for="(st, i) in STARS"
        :key="'st' + i"
        class="star"
        :class="{ drift: st.drift }"
        :style="{
          left: st.x + 'px',
          top: st.y + 'px',
          width: st.size + 'px',
          height: st.size + 'px',
          animationDuration: st.dur + 's, 30s',
          animationDelay: st.delay + 's, ' + st.delay + 's',
        }"
      ></i>
    </div>
    <!-- 上浮气泡（轨道区域升起，升约 100px 消散，带左右轻摆） -->
    <div class="bubbles" aria-hidden="true">
      <span
        v-for="(b, i) in BUBBLES"
        :key="'bb' + i"
        class="bubble"
        :style="{
          left: b.x + 'px',
          top: b.y + 'px',
          width: b.size + 'px',
          height: b.size + 'px',
          animationDuration: b.dur + 's',
          animationDelay: b.delay + 's',
        }"
      >
        <i class="bb-body"></i>
      </span>
    </div>
    <!-- 底部云雾翻涌（三层异速向左漂移 + 长周期明暗） -->
    <div class="mist" aria-hidden="true">
      <i class="mist-l mist-l1"></i>
      <i class="mist-l mist-l2"></i>
      <i class="mist-l mist-l3"></i>
    </div>
    <!-- 中部环境光呼吸（解包 Fx_Glow 一族：y 365..600 水平光晕带） -->
    <i class="ds-glowband" aria-hidden="true"></i>
    <!-- 顶部横幅后光柱（解包 img_titleBg，8s 极微弱闪烁；实机里几乎只在高光瞬间可感知） -->
    <img
      v-if="uiBanner"
      class="ds-titleglow"
      :src="asset(uiBanner.glowTitle)"
      alt=""
      draggable="false"
    />

    <!-- ══════════ 左上：返回金钮 + 标题 -->
    <button class="ds-back" title="返回" @click="close" @mouseenter="hover">
      <img class="ds-back-n" :src="asset(ui.backN)" alt="" draggable="false" />
      <img class="ds-back-h" :src="asset(ui.backH)" alt="" draggable="false" />
    </button>
    <h2 class="ds-title">深海回响</h2>

    <!-- ══════════ 顶部紫缎带：「N次后可领取」 -->
    <div v-if="ribbon" class="ds-ribbon">
      <img class="ds-ribbon-img" :src="asset(ui.ribbon)" alt="" draggable="false" />
      <p class="ds-rb">
        <b v-if="ribbon.num" class="num">{{ ribbon.num }}</b><span>{{ ribbon.text }}</span>
      </p>
    </div>

    <!-- ══════════ 左侧摆饰大图（本池一件，无翻页） -->
    <img
      v-if="decor?.img"
      class="ds-scene"
      :src="asset(decor.img)"
      :alt="decor.name"
      draggable="false"
    />

    <!-- ══════════ 右侧物品信息 -->
    <div v-if="showcase" class="ds-info">
      <h3 class="ds-name">{{ showcase.name }}</h3>
      <img class="ds-divider" :src="asset(ui.divider)" alt="" draggable="false" />
      <p class="ds-sub">{{ showcase.sub }}</p>
      <p class="ds-desc">{{ showcase.desc }}</p>
    </div>

    <!-- ══════════ 底部里程碑轨道 -->
    <!--
      ⚠️ 这里**不放** track.webp 叠层：那张图是「纯黑底 + 白线」且不带透明通道，
      而 `.ds-track` 因为 z-index 形成了独立层叠上下文，`mix-blend-mode: screen`
      只会跟这个空上下文混，黑底就原样留下一条黑杠。轨道形态改由下面 SVG 完全负责。
    -->
    <div
      class="ds-track"
      :style="{
        '--m-cap': `url(${asset(ui.numPlate)})`,
        '--m-hint': `url(${asset(ui.glowBand)})`,
      }"
    >
      <!-- 长轨道：内层比屏幕宽（≈7150px），整个随 scrollX 平移；固定轨道 innerW=1920 与原渲染一致 -->
      <div
        class="ds-inner"
        :style="{ width: innerW + 'px', transform: `translateX(${-scrollX}px)` }"
      >
      <svg
        class="ds-svg"
        :viewBox="`0 0 ${innerW} 1080`"
        :style="{ width: innerW + 'px' }"
        preserveAspectRatio="none"
      >
        <!-- 两条平行发丝线 -->
        <path class="ds-line-hair" :d="trackD" transform="translate(0,-11)" />
        <path class="ds-line-hair" :d="trackD" transform="translate(0,12)" />
        <!-- 外发光 + 亮芯 -->
        <defs>
          <linearGradient id="dsPassGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" :x2="innerW" y2="0">
            <stop offset="0%" stop-color="#9fc6ff" />
            <stop offset="46%" stop-color="#dcd2ff" />
            <stop offset="100%" stop-color="#ffeec6" />
          </linearGradient>
        </defs>
        <path class="ds-line-glow" :d="trackD" />
        <path class="ds-line" :d="trackD" />
        <!-- 已走过：外溢柔光 + 亮芯，把槽「灌满」 -->
        <path class="ds-pass-halo" :d="passedD" />
        <path class="ds-pass-core" :d="passedD" />
        <path class="ds-line-flow" :d="trackD" />
      </svg>

      <!-- 重点档蓝色光柱 -->
      <template v-for="(t, i) in tiers" :key="'beam-' + t.pulls">
        <img
          v-if="isMajor(t)"
          class="ds-beam"
          :src="asset(ui.beam)"
          :style="{ left: nodeX(i) - 76.5 + 'px' }"
          alt=""
          draggable="false"
        />
      </template>

      <!-- 节点 -->
      <div
        v-for="(t, i) in tiers"
        :key="t.pulls"
        class="ds-node"
        :class="{
          reached: t.reached,
          claimed: t.claimed,
          claimable: t.claimable,
          major: isMajor(t),
          next: nextTier?.pulls === t.pulls,
        }"
        :style="{ '--nx': nodeX(i) + 'px', '--ny': nodeY(i) + 'px', '--ck': cardK }"
        @mouseenter="hover"
      >
        <!-- 连接竖杆：节点中线 → 抽数标签 -->
        <span class="ds-stem"></span>
        <!--
          环 + 球：**每个节点都画**。实机里「经过」的节点是发光的白球（环也亮），
          「未经过」的是灰环 + 灰球 —— 只靠 CSS 改滤镜，不换结构。
        -->
        <img
          class="ds-ring"
          :src="asset(t.reached ? ui.nodeRingOn : ui.nodeRing)"
          alt=""
          draggable="false"
        />
        <!-- 重点档：实心金球（素材中心是暗核，拉亮也留黑芯，所以用 CSS 画） -->
        <span v-if="isMajor(t)" class="ds-orb ds-orb-major"></span>
        <!-- 已达成：白球用素材 grade_main -->
        <img v-else-if="t.reached" class="ds-orb" :src="asset(ui.badgeBall)" alt="" draggable="false" />
        <!-- 未经过：实机是一颗浅灰实心小球 -->
        <span v-else class="ds-dot"></span>
        <!--
          箭头 grade_arrow **永远贴着球**（球盖住它的宽口，只露出向下的尖端），
          不再单独出现在轨道节点上；只有「已达成」或「重点档」才有。
        -->
        <img
          v-if="t.reached || isMajor(t)"
          class="ds-arrow"
          :src="asset(ui.nodeArrow)"
          alt=""
          draggable="false"
        />
        <!-- 抽数 -->
        <span class="ds-cap num">{{ t.pulls }}次</span>
        <!-- 奖励卡 -->
        <span class="ds-card">
          <img class="ds-card-bg" :src="asset(ui.card)" alt="" draggable="false" />
          <img
            class="ds-card-item"
            :src="asset(t.rewards[0]?.img)"
            :alt="t.rewards[0]?.reward"
            draggable="false"
          />
          <img
            v-if="t.claimed"
            class="ds-tick"
            :src="asset(ui.hook)"
            alt="已领取"
            draggable="false"
          />
        </span>
        <!-- 下一档提示 -->
        <span v-if="nextTier?.pulls === t.pulls" class="ds-hint">
          {{ nextTier.remain }}次后可领取
        </span>
      </div>

      <!-- 当前抽数徽章 -->
      <div class="ds-badge" :style="{ left: badgeX + 'px', top: badgeY + 'px', '--bk': shortMode ? SHORT_BADGE_K : 1 }">
        <img class="ds-badge-dial" :src="asset(ui.badgeDial)" alt="" draggable="false" />
        <img class="ds-badge-ball" :src="asset(ui.badgeBall)" alt="" draggable="false" />
        <b class="ds-badge-num num">{{ total }}</b>
        <span class="ds-badge-spike"></span>
      </div>
      </div><!-- /ds-inner -->
    </div>
  </div>
</template>

<style scoped>
/* 全局 img{max-width:100%} 会把超宽素材算成 0 —— 这里统一放开 */
.echo img {
  max-width: none;
}

.echo {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  z-index: 200;
  overflow: hidden;
  animation: echoIn 0.44s cubic-bezier(0.22, 1, 0.36, 1) both;
}
/* 长轨道（常驻池）：整页可拖拽浏览，滚轮/拖拽横向滚动 */
.echo.long {
  cursor: grab;
  user-select: none;
}
.echo.long.dragging {
  cursor: grabbing;
}
@keyframes echoIn {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ══════════ 背景 ══════════ */
.ds-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}
.ds-bg-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: bgDrift 26s ease-in-out infinite alternate;
}
@keyframes bgDrift {
  from { transform: scale(1.015); }
  to { transform: scale(1.055); }
}
/* 中部横向光晕带（y 365..600）+ 轨道上方压暗带（y 600..760），对应解包 Fx_Glow / Fx_Bg_Black */
.ds-bg-veil {
  position: absolute;
  inset: 0;
  background:
    /* 顶部压暗：实机上半区比素材更黑，不压住会整页发灰 */
    linear-gradient(180deg, rgba(6, 4, 20, 0.58) 0%, rgba(8, 6, 24, 0.18) 16%, transparent 30%),
    /* 中部环境光晕 */
    linear-gradient(180deg, transparent 0%, transparent 33%, rgba(120, 130, 220, 0.10) 42%, rgba(120, 130, 220, 0.06) 54%, transparent 58%),
    /* 轨道上方压暗带 */
    linear-gradient(180deg, transparent 50%, rgba(4, 5, 16, 0.26) 62%, rgba(4, 5, 16, 0.26) 71%, transparent 86%),
    /* 四周暗角 */
    radial-gradient(128% 96% at 50% 44%, transparent 34%, rgba(3, 4, 14, 0.46) 100%),
    /* 底部云雾提亮 */
    radial-gradient(1250px 340px at 46% 107%, rgba(222, 234, 255, 0.34), transparent 74%);
  pointer-events: none;
}

/* ══════════ 环境动效（实机逐帧实测，纯 transform/opacity） ══════════ */

/* ── 右上彩虹光带：黄/蓝/红/绿四色周期渐变 ──
   单周期（20s，每色 5s）内一色作为带中央的主色调，其余三色在带上下边缘，
   层间 crossfade 即「颜色交界处的柔和混杂」。整条以 32° 斜置并在右上区缓慢往返摆动。 */
.rb {
  position: absolute;
  left: 1080px;
  top: -150px;
  width: 860px;
  height: 700px;
  z-index: 1;
  pointer-events: none;
  overflow: visible;
  animation: rbSway 7.5s ease-in-out infinite alternate;
}
/* 用户要求整条光带**左右翻转**（镜像）。transform 写在 keyframes 里，
   否则会被 animation 的 transform 覆盖掉。 */
@keyframes rbSway {
  from { transform: scaleX(-1) translateX(-55px); opacity: 0.55; }
  50% { opacity: 0.78; }
  to { transform: scaleX(-1) translateX(55px); opacity: 0.55; }
}
/* 窄长光带：300×1050 居中斜置（与竖直约 32°）。
   三条「边缘柔和的条带」由 3 层横向 mask 切出（mask 默认 add 叠加）：
   各条带宽窄不一（118/168/136）、长短不一（88%/100%/76%），避免三条一样齐。 */
.rb-band {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 300px;
  height: 1050px;
  transform: translate(-50%, -50%) rotate(-32deg);
  mix-blend-mode: screen;
  opacity: 0;
  /*
   * v1.3.04 柔化：原来三条 mask 都是**纯横向** linear-gradient，
   * 纵向靠 `mask-size` 的百分比高度硬切 → 色带上下两端是直角的硬边（用户圈出来的锐利边缘）。
   * 换成径向椭圆遮罩：横竖两个方向同时渐隐，端头自然收圆；
   * 再叠一层 blur(10px) 把剩下的过渡带抹开。
   * blur 不会掉帧：rbPhase 只改 opacity，不碰 transform，模糊结果可以缓存。
   */
  -webkit-mask-image:
    radial-gradient(ellipse 62px 46% at 12% 50%, #000 0%, rgba(0, 0, 0, 0.55) 55%, transparent 100%),
    radial-gradient(ellipse 88px 50% at 50% 50%, #000 0%, rgba(0, 0, 0, 0.55) 55%, transparent 100%),
    radial-gradient(ellipse 72px 40% at 87% 50%, #000 0%, rgba(0, 0, 0, 0.55) 55%, transparent 100%);
  -webkit-mask-repeat: no-repeat;
  mask-image:
    radial-gradient(ellipse 62px 46% at 12% 50%, #000 0%, rgba(0, 0, 0, 0.55) 55%, transparent 100%),
    radial-gradient(ellipse 88px 50% at 50% 50%, #000 0%, rgba(0, 0, 0, 0.55) 55%, transparent 100%),
    radial-gradient(ellipse 72px 40% at 87% 50%, #000 0%, rgba(0, 0, 0, 0.55) 55%, transparent 100%);
  mask-repeat: no-repeat;
  filter: blur(10px);
}
/* 主色亮芯居中（渐变沿带宽方向 = 旋转后的纵向），其余三色各占一条边缘、向中心渐隐。
   ⚠️ 条带两端的**长边**原来是硬切（0% / 100% 都带 0.4 以上的实色）→ 边缘锐利。
   现在首尾各加 transparent，颜色整体内缩到 10%~90%，两端自然淡出。 */
.rb-y {
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(111, 166, 224, 0.4) 10%, rgba(116, 197, 134, 0.28) 20%, transparent 34%,
    rgba(244, 227, 160, 0.62) 50%, transparent 66%,
    rgba(224, 122, 140, 0.3) 80%, rgba(217, 189, 107, 0.42) 90%,
    transparent 100%
  );
}
.rb-b {
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(224, 122, 140, 0.4) 10%, rgba(217, 189, 107, 0.28) 20%, transparent 34%,
    rgba(159, 205, 255, 0.62) 50%, transparent 66%,
    rgba(116, 197, 134, 0.3) 80%, rgba(111, 166, 224, 0.42) 90%,
    transparent 100%
  );
}
.rb-r {
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(116, 197, 134, 0.4) 10%, rgba(111, 166, 224, 0.28) 20%, transparent 34%,
    rgba(255, 156, 174, 0.62) 50%, transparent 66%,
    rgba(217, 189, 107, 0.3) 80%, rgba(224, 122, 140, 0.42) 90%,
    transparent 100%
  );
}
.rb-g {
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(217, 189, 107, 0.4) 10%, rgba(224, 122, 140, 0.28) 20%, transparent 34%,
    rgba(165, 226, 174, 0.62) 50%, transparent 66%,
    rgba(111, 166, 224, 0.3) 80%, rgba(116, 197, 134, 0.42) 90%,
    transparent 100%
  );
}
/* 四层同 keyframes、负延迟错相 5s：任一时刻一色为主，相邻色在其两侧淡出 → 柔和混杂 */
@keyframes rbPhase {
  0% { opacity: 0; }
  12% { opacity: 0.55; }
  25% { opacity: 0.55; }
  37% { opacity: 0; }
  100% { opacity: 0; }
}
.rb-y { animation: rbPhase 20s linear 0s infinite; }
.rb-b { animation: rbPhase 20s linear -5s infinite; }
.rb-r { animation: rbPhase 20s linear -10s infinite; }
.rb-g { animation: rbPhase 20s linear -15s infinite; }

/* ── 星空粒子闪烁：上半屏随机生灭 + 少量缓慢漂移 ── */
.stars {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}
.star {
  position: absolute;
  border-radius: 50%;
  background: #e8edff;
  box-shadow: 0 0 4px rgba(210, 224, 255, 0.85);
  opacity: 0.15;
  animation-name: starTwinkle, starDrift;
  animation-timing-function: ease-in-out, linear;
  animation-iteration-count: infinite, infinite;
  animation-direction: normal, alternate;
}
@keyframes starTwinkle {
  0%, 100% { opacity: 0.1; }
  45% { opacity: 0.85; }
}
@keyframes starDrift {
  from { transform: translateX(0); }
  to { transform: translateX(-16px); }
}

/* ── 上浮气泡：Ø15–30 半透明泡，≈10px/s 上浮 + 左右轻摆，升约 100px 消散 ── */
.bubbles {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}
.bubble {
  position: absolute;
  display: block;
  opacity: 0;
  animation-name: bubbleRise;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
/* 泡体 = 内层：竖向升沉由外层负责，内层只做左右摆 + 画泡 */
.bb-body {
  position: absolute;
  inset: 0;
  display: block;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.30) 0%, rgba(255, 255, 255, 0.05) 34%, transparent 55%),
    radial-gradient(circle at 50% 50%, transparent 58%, rgba(214, 228, 255, 0.34) 72%, rgba(255, 255, 255, 0.16) 84%, rgba(214, 228, 255, 0.05) 100%);
  box-shadow: 0 0 8px rgba(190, 214, 255, 0.28), inset 0 0 6px rgba(220, 234, 255, 0.32);
  animation: bubbleSway 2.3s ease-in-out infinite alternate;
}
@keyframes bubbleRise {
  0% { transform: translateY(0); opacity: 0; }
  14% { opacity: 0.8; }
  72% { opacity: 0.55; }
  100% { transform: translateY(-102px); opacity: 0; }
}
@keyframes bubbleSway {
  from { transform: translateX(-5px); }
  to { transform: translateX(5px); }
}

/* ── 底部云雾翻涌：三层异速向左漂 + 长周期明暗（与场景地面倒影交融） ── */
.mist {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 1920px;
  height: 240px;
  z-index: 3;
  pointer-events: none;
  overflow: hidden;
}
.mist-l {
  position: absolute;
  left: -350px;
  bottom: -40px;
  width: 2650px;
  height: 300px;
  mix-blend-mode: screen;
}
.mist-l1 {
  background:
    radial-gradient(560px 190px at 16% 76%, rgba(233, 241, 255, 0.42), transparent 72%),
    radial-gradient(760px 210px at 46% 94%, rgba(240, 246, 255, 0.44), transparent 74%),
    radial-gradient(520px 170px at 76% 72%, rgba(228, 238, 255, 0.42), transparent 70%);
  animation: mistDrift1 46s ease-in-out infinite alternate, mistBreath1 12s ease-in-out infinite;
}
.mist-l2 {
  background:
    radial-gradient(680px 200px at 30% 88%, rgba(238, 244, 255, 0.4), transparent 74%),
    radial-gradient(540px 170px at 62% 70%, rgba(232, 240, 255, 0.36), transparent 72%),
    radial-gradient(620px 190px at 90% 92%, rgba(236, 243, 255, 0.38), transparent 72%);
  animation: mistDrift2 34s ease-in-out infinite alternate, mistBreath2 9s ease-in-out infinite;
}
.mist-l3 {
  background:
    radial-gradient(900px 220px at 40% 100%, rgba(244, 248, 255, 0.34), transparent 76%),
    radial-gradient(700px 190px at 82% 84%, rgba(238, 245, 255, 0.3), transparent 74%);
  animation: mistDrift3 58s ease-in-out infinite alternate, mistBreath1 15s ease-in-out infinite;
}
@keyframes mistDrift1 {
  from { transform: translateX(0); }
  to { transform: translateX(-240px); }
}
@keyframes mistDrift2 {
  from { transform: translateX(-180px); }
  to { transform: translateX(0); }
}
@keyframes mistDrift3 {
  from { transform: translateX(0); }
  to { transform: translateX(-160px); }
}
@keyframes mistBreath1 {
  0%, 100% { opacity: 0.52; }
  50% { opacity: 0.72; }
}
@keyframes mistBreath2 {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.72; }
}

/* ── 中部环境光呼吸（y 365..600 水平光晕带，7s 明暗） ── */
.ds-glowband {
  position: absolute;
  left: 0;
  top: 365px;
  width: 1920px;
  height: 235px;
  z-index: 1;
  pointer-events: none;
  background:
    linear-gradient(180deg, transparent 0%, rgba(142, 152, 224, 0.13) 42%, rgba(142, 152, 224, 0.07) 62%, transparent 100%),
    radial-gradient(1200px 160px at 46% 46%, rgba(160, 170, 240, 0.1), transparent 76%);
  animation: glowBreath 7s ease-in-out infinite;
}
@keyframes glowBreath {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

/* ── 顶部横幅后光柱（img_titleBg 族：竖向光柱 + 8s 极微弱闪烁） ── */
.ds-titleglow {
  position: absolute;
  left: 478px;
  top: -768px;
  width: 363px;
  height: 1176px;
  z-index: 1;
  object-fit: fill;
  mix-blend-mode: screen;
  opacity: 0.4;
  pointer-events: none;
  animation: titleGlow 8s ease-in-out infinite;
}
@keyframes titleGlow {
  0% { opacity: 0.42; }
  10% { opacity: 0.24; }
  20% { opacity: 0.4; }
  30% { opacity: 0.12; }
  50% { opacity: 0.38; }
  67% { opacity: 0.16; }
  80% { opacity: 0.36; }
  100% { opacity: 0.42; }
}

/* ══════════ 返回金钮 ══════════ */
/* backN 69×69，内容 bbox (7,7)-(63,62)=56×55 → 缩到实机 54×54 得盒子 66.5 */
.ds-back {
  position: absolute;
  left: 36.25px;
  top: 16.25px;
  width: 66.5px;
  height: 66.5px;
  z-index: 12;
  padding: 0;
  background: none;
  border: 0;
  cursor: var(--nk-cursor, auto), pointer;
}
.ds-back img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: brightness(1.18) saturate(1.1);
}
/* 悬停态 backH 只有外发光环、没有底，必须两层叠，不能替换 */
.ds-back-h {
  opacity: 0;
  transition: opacity 0.18s ease;
}
.ds-back:hover .ds-back-h {
  opacity: 1;
}
.ds-back:hover {
  transform: scale(1.05);
  transition: transform 0.18s ease;
}

/* ══════════ 标题 ══════════ */
/* 实机墨迹 119,38 → 241,66（123×29），字高 29 */
.ds-title {
  position: absolute;
  left: 119px;
  top: 34px;
  margin: 0;
  z-index: 12;
  font-size: 31px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: 0.5px;
  color: #ffffff;
  text-shadow: 0 2px 14px rgba(0, 0, 0, 0.55);
  pointer-events: none;
}

/* ══════════ 顶部紫缎带 ══════════ */
/* ribbon 380×48，内容 (28,0)-(363,48)=335×48；实机实心紫带 495,113 → 740,156（246×44）
   横向 246/335=0.7343、纵向 44/48=0.9167，非等比 —— 盒子 279×44 @ (474.4, 113) */
.ds-ribbon {
  position: absolute;
  left: 474.4px;
  top: 113px;
  width: 279px;
  height: 44px;
  z-index: 12;
}
.ds-ribbon-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
/* 整行文字 525,120 → 715,148，中心 (620,134) */
.ds-rb {
  position: absolute;
  left: 20.6px;
  top: 7px;
  width: 246px;
  height: 30px;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1px;
  font-size: 28px;
  line-height: 1;
  letter-spacing: 0;
  color: #ffffff;
  white-space: nowrap;
  text-shadow: 0 1px 6px rgba(24, 8, 44, 0.55);
}
.ds-rb .num {
  color: #f6e2a5;
}

/* ══════════ 左侧摆饰大图 ══════════ */
/* 1264×728 @ (93,51)：素材内容 bbox (98,55)-(1160,689)，中心落在实机主体中心 (725,415) */
.ds-scene {
  position: absolute;
  left: 93px;
  top: 51px;
  width: 1264px;
  height: 728px;
  z-index: 2;
  object-fit: contain;
  pointer-events: none;
  /* 实机场景与背景融合得比素材更暗，直接放会「浮」起来 */
  filter: brightness(0.78) saturate(1.2) contrast(1.04);
  /* 素材四边是硬边，压在暗背景上会露出矩形轮廓 —— 四边羽化才像实机那样「无 UI 框」 */
  -webkit-mask-image:
    linear-gradient(to right, transparent 0%, #000 21%, #000 79%, transparent 100%),
    linear-gradient(to bottom, transparent 0%, #000 10%, #000 91%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(to right, transparent 0%, #000 21%, #000 79%, transparent 100%),
    linear-gradient(to bottom, transparent 0%, #000 10%, #000 91%, transparent 100%);
  mask-composite: intersect;
  animation: sceneIn 0.9s ease-out both;
}
@keyframes sceneIn {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* ══════════ 右侧物品信息 ══════════ */
.ds-info {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  z-index: 3;
  pointer-events: none;
}
/* 物品名 1386,201 → 1572,243（187×43），字高 42，字距加宽，中心 x≈1479。
   盒子必须比墨迹宽 —— 4 字×43 + 4×字距 4 = 188 已经超过 187，会硬生生折成两行。 */
.ds-name {
  position: absolute;
  left: 1379px;
  top: 195px;
  width: 200px;
  margin: 0;
  font-size: 43px;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: 4px;
  text-align: center;
  color: #ffffff;
  text-shadow: 0 3px 20px rgba(0, 0, 0, 0.5);
}
/* divider 668×180，线本体 y≈115、菱形中心 (310,114)，实机菱形中心 (1482,277)
   等比 0.78 → 盒子 521×140.4 @ (1240.2, 188.1) */
.ds-divider {
  position: absolute;
  left: 1240.2px;
  top: 188.1px;
  width: 521px;
  height: 140.4px;
  object-fit: fill;
  mix-blend-mode: screen;
  opacity: 0.9;
}
/* 金色副标题 1319,320 → 1628,346，字高 27 */
.ds-sub {
  position: absolute;
  left: 1319px;
  top: 315px;
  margin: 0;
  font-size: 28px;
  line-height: 1;
  letter-spacing: 0.5px;
  color: #f6e2a5;
  white-space: nowrap;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
}
/* 描述正文 1220,375 → 1738,468（519×94），实机 3 行、行高 37。
   每行 19 个汉字要塞进 519px → 单字宽 ≈27.3，所以字号 27、不加字距，否则变 4 行。 */
.ds-desc {
  position: absolute;
  left: 1220px;
  top: 369px;
  width: 519px;
  margin: 0;
  font-size: 28px;
  line-height: 37px;
  letter-spacing: 0;
  color: #c3c4d2;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
}

/* ══════════ 轨道 ══════════ */
.ds-track {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  z-index: 6;
  pointer-events: none;
}
/* 长轨道内层：比屏幕宽，随 scrollX 平移（wheel/drag）。
   固定轨道 innerW=1920、scrollX 恒 0，渲染与旧版完全一致。 */
.ds-inner {
  position: absolute;
  left: 0;
  top: 0;
  height: 1080px;
  will-change: transform;
}
.ds-svg {
  position: absolute;
  left: 0;
  top: 0;
  height: 1080px;
  overflow: visible;
}
.ds-line {
  fill: none;
  stroke: rgba(222, 208, 255, 0.8);
  stroke-width: 2;
  stroke-linecap: round;
  filter: drop-shadow(0 0 5px rgba(160, 132, 255, 0.7));
}
.ds-line-glow {
  fill: none;
  stroke: rgba(140, 112, 250, 0.28);
  stroke-width: 9;
  filter: blur(6px);
}
.ds-line-hair {
  fill: none;
  stroke: rgba(198, 178, 255, 0.20);
  stroke-width: 1.1;
}
/* 沿轨道自左向右扫动的流光。
   实机这条只是「比主线亮一点点」的柔光，不是灯管 —— 亮度压到 1/3，
   再用 blur 把 dash 的两端糊开（dash 的端头本来是硬切口）。 */
/* 已走过的轨道：一层粗柔光把槽填满，一层细亮芯压在上面 */
.ds-pass-halo {
  fill: none;
  stroke: url(#dsPassGrad);
  stroke-width: 26;
  stroke-linecap: round;
  opacity: 0.42;
  filter: blur(9px);
}
.ds-pass-core {
  fill: none;
  stroke: url(#dsPassGrad);
  stroke-width: 7;
  stroke-linecap: round;
  opacity: 0.9;
  filter: drop-shadow(0 0 10px rgba(206, 186, 255, 0.95));
}
.ds-line-flow {
  fill: none;
  stroke: rgba(255, 250, 255, 0.92);
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-dasharray: 104 1492;
  opacity: 0.34;
  filter: blur(2.6px);
  animation: trackFlow 5.6s linear infinite;
}
@keyframes trackFlow {
  from { stroke-dashoffset: 1596; }
  to { stroke-dashoffset: 0; }
}

/* ══════════ 重点档蓝色光柱 ══════════ */
/* beam 172×372，内容 (4,17)-(167,351)=163×334；实机柱 145 宽、y 660..1035
   横向 145/163=0.8896 → 盒宽 153.1；纵向 375/334=1.1228 → 盒高 417.6；top 640.9 */
.ds-beam {
  position: absolute;
  top: 640.9px;
  width: 153.1px;
  height: 417.6px;
  object-fit: fill;
  mix-blend-mode: screen;
  opacity: 0.95;
  filter: brightness(2.6) saturate(1.85) hue-rotate(-6deg);
  /* 实机光柱「边缘无锐利边界、与背景雾化融合」——素材是硬边矩形，必须双向羽化 */
  -webkit-mask-image:
    linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%),
    linear-gradient(to bottom, transparent 0%, #000 12%, #000 84%, transparent 100%);
  -webkit-mask-composite: source-in;
  mask-image:
    linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%),
    linear-gradient(to bottom, transparent 0%, #000 12%, #000 84%, transparent 100%);
  mask-composite: intersect;
  animation: beamBreath 6s ease-in-out infinite;
}
@keyframes beamBreath {
  0%, 100% { opacity: 0.82; }
  50% { opacity: 1; }
}

/* ══════════ 节点 ══════════ */
.ds-node {
  position: absolute;
  left: 0;
  top: 0;
  width: 0;
  height: 0;
  pointer-events: auto;
}
.ds-node > * {
  position: absolute;
}

/* 连接竖杆：标签底板顶 → 节点中线（实机 25~46px） */
.ds-stem {
  left: var(--nx);
  top: calc(var(--ny) + 4px);
  width: 1.4px;
  height: calc(57px * var(--ck));
  transform: translateX(-50%);
  background: linear-gradient(180deg, rgba(220, 232, 255, 0.9), rgba(214, 226, 255, 0.14));
  opacity: 0.45;
}
.ds-node.reached .ds-stem,
.ds-node.major .ds-stem {
  opacity: 0.85;
}

/* 灯泡 nodeArrow 50×37，内容 (4,5)-(46,33)=42×28 → 1:1 用原尺寸，
   盒子顶 = ny-33，内容底边 y=33 正好落在轨道中线上 */
/* ── 节点球 grade_main 166×167，圆面 (11,11)-(153,152) 直径 142、圆心 (82,81.5)
      实机已达成球的光晕 Ø26 → 盒子 30（30/166 × 142 ≈ 25.7） ── */
.ds-orb {
  left: var(--nx);
  top: var(--ny);
  width: 26px;
  height: 26px;
  transform: translate(-50%, -50%);
  object-fit: contain;
}
/* 未经过的灰球：Ø11，浅灰实心（实机环内那颗） */
.ds-dot {
  left: var(--nx);
  top: var(--ny);
  width: 11px;
  height: 11px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle at 50% 36%, #eef2fb 0%, #c3cbe2 52%, #8f97b5 100%);
  opacity: 0.9;
  box-shadow: 0 0 7px rgba(170, 188, 226, 0.45);
}
/* 已达成：白球 + 冷光晕 */
.ds-node.reached .ds-orb {
  filter: brightness(1.5) saturate(0.55) drop-shadow(0 0 10px rgba(198, 216, 255, 0.95));
  animation: orbBreath 3.6s ease-in-out infinite;
}
/* 重点档（160 / 230）：实心金球 + 细亮环（实机就是一颗均匀发光的金珠） */
.ds-orb-major {
  width: 21px;
  height: 21px;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 40%, #fffaea 0%, #ffe6ab 38%, #f7c76a 70%, #e0a548 100%);
  box-shadow:
    0 0 0 1.2px rgba(255, 238, 196, 0.75),
    0 0 15px rgba(255, 202, 112, 0.95),
    0 0 34px rgba(255, 186, 84, 0.55);
  animation: orbBreath 3s ease-in-out infinite;
}
@keyframes orbBreath {
  0%, 100% { opacity: 0.86; }
  50% { opacity: 1; }
}

/* ── 箭头 grade_arrow 50×37，内容 (4,5)-(46,33)=42×28，尖端 (25,33)
      实机箭头比球窄、藏在球下面 → 盒 26×19，尖端落在 ny+12 ── */
.ds-arrow {
  left: var(--nx);
  top: calc(var(--ny) - 3px);
  width: 17px;
  height: 27px;
  transform: translateX(-50%);
  object-fit: fill;
  mix-blend-mode: screen;
  opacity: 0.9;
}
.ds-node.major .ds-arrow {
  filter: sepia(1) saturate(3.4) hue-rotate(-10deg) brightness(1.9);
}

/* ── 细环 cir_01 220×220，圆面 (19,20)-(200,202) Ø181 → 盒 32 得 Ø26.3 ── */
.ds-ring {
  left: var(--nx);
  top: var(--ny);
  width: 24px;
  height: 24px;
  transform: translate(-50%, -50%);
  object-fit: contain;
  opacity: 0.82;
  filter: grayscale(0.7) brightness(1);
  transition: opacity 0.2s ease, filter 0.2s ease;
}
/* 已达成：环也点亮（cir_02 是高光环，叠 screen 才有光） */
.ds-node.reached .ds-ring {
  opacity: 0.95;
  filter: none;
  mix-blend-mode: screen;
}
.ds-node.major .ds-ring {
  opacity: 0.6;
  filter: sepia(1) saturate(2.2) hue-rotate(-8deg) brightness(1.25);
}
/* 下一档：环再亮一档 */
.ds-node.next .ds-ring {
  opacity: 0.85;
  filter: none;
}

/* 抽数标签：实机 45×19，文字金色 + 深色圆角底板。
   底板形状直接用 bg_number_01（116×44 的柔和圆角胶囊）当 mask —— 换素材就能换形状。 */
.ds-cap {
  left: var(--nx);
  top: calc(var(--ny) + 61px * var(--ck));
  transform: translateX(-50%);
  padding: 3px 10px 4px;
  font-size: max(11px, calc(19px * var(--ck)));
  line-height: 1;
  letter-spacing: 0.5px;
  color: #f0d79a;
  white-space: nowrap;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.6);
  transition: background 0.18s ease, color 0.18s ease;
}
/* 底板形状：素材只当 mask，垫在文字底下（直接给元素加 mask 会把文字一起羽化） */
.ds-cap::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: rgba(14, 10, 32, 0.8);
  -webkit-mask-image: var(--m-cap);
  -webkit-mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-image: var(--m-cap);
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
}
/* 160 / 230 重点档：底板整体略大且偏金（实机 76×36） */
.ds-node.major .ds-cap {
  padding: 7px 18px 8px;
  font-size: max(12px, calc(21px * var(--ck)));
  color: #ffe6ad;
}
.ds-node.major .ds-cap::before {
  background: rgba(58, 40, 22, 0.82);
}
.ds-node.claimable .ds-cap {
  color: #fff3d2;
}

/* 奖励卡：card 128×137 满幅，实机 96×102（比例 0.9375 / 0.934，等比） */
.ds-card {
  left: var(--nx);
  top: calc(var(--ny) + 105px * var(--ck));
  width: calc(96px * var(--ck));
  height: calc(102px * var(--ck));
  transform: translateX(-50%);
  display: block;
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), filter 0.2s ease;
}
.ds-card-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.ds-card-item {
  position: absolute;
  left: calc(13px * var(--ck));
  top: calc(9px * var(--ck));
  width: calc(70px * var(--ck));
  height: calc(70px * var(--ck));
  object-fit: contain;
  filter: drop-shadow(0 2px 5px rgba(60, 30, 60, 0.35));
}
/* 实机卡片始终是原色（只有节点分「经过 / 未经过」），所以这里不做去饱和 */
/* 已领取对勾：解包 T_UI_common_icon_hook_06（75×74 绿圈勾）。
   素材是深绿实体 → **正常混合 + 提亮**（screen 会被粉卡底色吃成白粉痕迹），
   提亮后勾身是鲜绿、圈身深绿，浮在卡上与实机的覆盖式对勾同理。 */
.ds-tick {
  position: absolute;
  left: 50%;
  top: 46%;
  width: calc(42px * var(--ck));
  height: calc(41px * var(--ck));
  transform: translate(-50%, -50%);
  object-fit: contain;
  filter: brightness(1.55) saturate(1.25) drop-shadow(0 2px 5px rgba(20, 40, 30, 0.45));
}

/* 悬停 */
.ds-node:hover .ds-card {
  transform: translateX(-50%) translateY(-5px) scale(1.05);
  filter: brightness(1.1) drop-shadow(0 8px 18px rgba(180, 150, 255, 0.55));
}
.ds-node:hover .ds-cap {
  background: rgba(46, 32, 74, 0.9);
  color: #fff6dd;
}

/* 下一档提示：实机 963,989 → 1075,1006，挂在下一档卡片正下方。
   底板形状用 txtbg04（616×68 两端渐隐的光带）当 mask —— 素材本身就是柔边，
   比手写 border-radius 更像实机。 */
.ds-hint {
  left: var(--nx);
  top: calc(var(--ny) + 232px * var(--ck));
  transform: translateX(-50%);
  padding: 5px 24px 6px;
  font-size: max(11px, calc(18px * var(--ck)));
  line-height: 1;
  letter-spacing: 0.5px;
  color: #ffffff;
  white-space: nowrap;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.65);
  animation: hintBreath 2.6s ease-in-out infinite;
}
.ds-hint::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: rgba(10, 8, 26, 0.72);
  -webkit-mask-image: var(--m-hint);
  -webkit-mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mask-image: var(--m-hint);
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
}
@keyframes hintBreath {
  0%, 100% { opacity: 0.82; }
  50% { opacity: 1; }
}

/* ══════════ 抽数徽章 ══════════ */
/* 外环 Ø89：badgeDial 144×144，圆面 (16,16)-(128,120) → 圆心 (75,68)、Ø104
   盒子 109.4（比例 0.7597）→ left/top 必须让「圆心」落在徽章原点，不是盒子中心。
   ⚠️ 这个素材要转圈，`transform-origin` 也必须设在圆心，否则会绕着盒子中心公转、
      看起来就是「外环和内球不同心」。 */
.ds-badge {
  position: absolute;
  width: 0;
  height: 0;
  pointer-events: none;
  /* 四星池徽章 Ø170（五星池 Ø89）→ 整枚绕自身原点放大 1.9× */
  transform: scale(var(--bk, 1));
}
.ds-badge > * {
  position: absolute;
}
.ds-badge-dial {
  left: -56.98px;
  top: -51.66px;
  width: 109.4px;
  height: 109.4px;
  object-fit: contain;
  transform-origin: 52.08% 47.22%;
  filter: brightness(1.35) drop-shadow(0 0 10px rgba(140, 170, 255, 0.55));
  animation: dialSpin 14s linear infinite;
}
@keyframes dialSpin {
  to { transform: rotate(360deg); }
}
/* 内球 63×64：badgeBall 166×167，圆面 (11,11)-(153,152) → 圆心 (82,81.5)、Ø142
   盒子 63.7（比例 0.3837）→ 圆心对齐原点 */
.ds-badge-ball {
  left: -31.47px;
  top: -31.27px;
  width: 63.7px;
  height: 63.7px;
  object-fit: contain;
  filter: brightness(1.2) drop-shadow(0 0 16px rgba(130, 160, 255, 0.75));
}
.ds-badge-num {
  left: 0;
  top: -13px;
  width: 76px;
  transform: translateX(-50%);
  text-align: center;
  font-size: 20px;
  font-weight: 400;
  line-height: 26px;
  color: #fbfcfe;
  text-shadow: 0 0 12px rgba(180, 200, 255, 0.95), 0 1px 3px rgba(0, 0, 0, 0.6);
}
/* 底部尖锥光柱，尖端触到轨道中线 */
.ds-badge-spike {
  left: 0;
  top: 30px;
  width: 3px;
  height: 40px;
  transform: translateX(-50%);
  background: linear-gradient(180deg, rgba(214, 226, 255, 0.95), rgba(190, 210, 255, 0.55) 55%, rgba(190, 210, 255, 0));
  clip-path: polygon(50% 0%, 100% 8%, 50% 100%, 0% 8%);
  filter: drop-shadow(0 0 8px rgba(170, 200, 255, 0.9));
}
</style>
