<script setup lang="ts">
/** 博物图鉴 · 故事图鉴子界面：数据 `src/data/stories.ts`（按 set.id 正序）， 分区 0 奇迹传说 / 1 心愿原野 / 2 伊赞之土；抽齐对应套装才可读，不写 codex */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { play } from '@/composables/useAudio'
import SearchPopup from '@/components/SearchPopup.vue'
import { clearHops, pushHop, takeHop, withSearchResume, resumeKeyword } from '@/composables/useNavBack'
import type { SearchItem } from '@/components/SearchPopup.vue'
import { searchMuseum, PAGE_LABEL } from '@/core/museum-search'
// 只依赖「故事」正文包；正文是运行时 JSON
import { stories, ensureStories } from '@/core/museum-stories'
import type { StoryEntry } from '@/data/stories'
import { RD_LAYOUT, RD_ROW_H, RD_LIST_TOP, type RdBox, type RdRegion } from '@/data/readings-layout'
import { rdLayout } from '@/core/museum-layout'
import { parentOf } from '@/router'

const store = useGameStore()
const router = useRouter()
const route = useRoute()

// 进页面就开始拉（幂等）；`stories` 是响应式数组，到了会自动渲染
void ensureStories()

const R = computed(() => store.manifest?.ui?.museum?.readings)
const asset = (p: string | null | undefined) => store.asset(p)
/** RdBox → inline style */
function box(b: RdBox | undefined): Record<string, string> {
  if (!b) return {}
  const s: Record<string, string> = {
    left: b.x + 'px',
    top: b.y + 'px',
    width: b.w + 'px',
    height: b.h + 'px',
  }
  if (b.rot) s.transform = `rotate(${b.rot}deg)`
  if (b.op !== undefined && b.op !== 1) s.opacity = String(b.op)
  return s
}

type Region = RdRegion | 'miracle'

/** 分区的权威定义（顺序 = 顶部切换栏从左到右）；`art` = 借用的版式素材区域 */
interface RegionDef {
  key: Region
  major: number
  label: string
  art: RdRegion
}
const REGIONS: RegionDef[] = [
  { key: 'miracle', major: 0, label: '奇迹传说', art: 'wish' },
  { key: 'wish', major: 1, label: '心愿原野', art: 'wish' },
  { key: 'yizan', major: 2, label: '伊赞之土', art: 'yizan' },
]
const region = ref<Region>('wish')
const def = computed<RegionDef>(() => REGIONS.find((r) => r.key === region.value) ?? REGIONS[1])
const artKey = computed<RdRegion>(() => def.value.art)
/** 大版本号 → 分区（深链 / 搜索跳转用） */
function regionOfMajor(m: number): Region {
  return REGIONS.find((r) => r.major === m)?.key ?? 'wish'
}

const L = computed(() => RD_LAYOUT[artKey.value])
const regionStories = computed(() => stories.filter((s) => s.major === def.value.major))

/** 按书名定位（深链 / 搜索选中）：先精确匹配，再退化为包含匹配 */
function findStory(name: string): StoryEntry | undefined {
  return (
    stories.find((x) => x.title === name) ??
    stories.find((x) => x.setName === name) ??
    stories.find((x) => x.title.includes(name))
  )
}

/** 已集齐的套装集合 */
const gotSets = computed(() => {
  const m = new Set<string>()
  // 必须用全库完成度：store.allParts 只含「当前服装阁」
  for (const [sid, s] of store.setProgressAll) if (s.total > 0 && s.owned === s.total) m.add(sid)
  return m
})
function unlocked(s: StoryEntry) {
  return !!s.setId && gotSets.value.has(s.setId)
}
const obtained = computed(() => regionStories.value.filter((r) => unlocked(r)).length)

/* ════════════════════════════════════════ 选择 / 解锁 */
const selId = ref('')
const animId = ref('')
/** 正文两步加载：标题立即显示 → ~240ms 后正文 160ms 淡入（录屏实测 0.2~0.3s 间隔） */
const bodyShown = ref(false)
let bodyTimer = 0

/** 当前要展示正文的条目；只有已解锁（套装已集齐）才返回 */
function selEntry(): StoryEntry | undefined {
  const r = regionStories.value.find((x) => x.id === selId.value)
  return r && unlocked(r) ? r : undefined
}

function triggerBody() {
  window.clearTimeout(bodyTimer)
  bodyShown.value = false
  if (!selId.value) return
  bodyTimer = window.setTimeout(() => (bodyShown.value = true), 240)
}

function pick(s: StoryEntry) {
  // 只有「真的换了另一篇」才刷新彩蛋
  const changed = selId.value !== s.id
  selId.value = s.id
  if (changed) rollEgg()

  // 未解锁：只高亮 + 提示「集齐套装」，不提供点击解锁
  if (!unlocked(s)) {
    bodyShown.value = false
    hint(`集齐「${s.setName}」套装即可解锁`)
    play('points-slide', { volume: 0.35 })
    return
  }
  triggerBody()
  play('points-slide', { volume: 0.5 })
}

/** 正文滚动容器 */
const bodyWrap = ref<HTMLElement | null>(null)

/** 切换故事 → 正文回到第一行（正文容器是同一个 DOM 节点） */
watch(selId, () => {
  nextTick(() => {
    if (bodyWrap.value) bodyWrap.value.scrollTop = 0
  })
})


/* ════════════════════════════════════════ 区域切换（黑屏过渡，无淡入淡出） */
/** 黑屏过渡遮罩：压黑 160ms → 换区域 → 淡出 160ms */
const blackout = ref(false)
let blackTimer = 0

function setRegion(r: Region) {
  if (r === region.value) return
  play('points-slide', { volume: 0.5 })
  blackout.value = true
  window.clearTimeout(blackTimer)
  blackTimer = window.setTimeout(() => {
    region.value = r
    selId.value = ''
    autoPick()
    animId.value = ''
    bodyShown.value = false
    rollEgg() // 彩蛋刷新时机③：切换大版本
    blackout.value = false
  }, 160)
}

/** 键盘 ←→（Q / E）在三个分区之间循环 */
function stepRegion(d: number) {
  const i = REGIONS.findIndex((r) => r.key === region.value)
  const n = REGIONS.length
  setRegion(REGIONS[((i < 0 ? 0 : i) + d + n) % n].key)
}

/* ════════════════════════════════════════ 随机彩蛋（三时机刷新，opacity 0.25） */
const eggSrc = ref('')
function rollEgg() {
  const arr = (artKey.value === 'yizan' ? R.value?.stickersYizan : R.value?.stickersWish) ?? []
  if (!arr.length) {
    eggSrc.value = ''
    return
  }
  eggSrc.value = store.asset(arr[Math.floor(Math.random() * arr.length)])
}

/* ════════════════════════════════════════ 搜索弹窗 */
const searching = ref(false)
const kw = ref('')
const searchResults = computed<SearchItem[]>(() => searchMuseum(kw.value, store))

function onSearchSelect(r: SearchItem) {
  const [name, page] = r.title.split('｜')
  if (page === PAGE_LABEL.story) {
    const found = findStory(name)
    if (found) {
      region.value = regionOfMajor(found.major)
      selId.value = found.id
      animId.value = ''
      triggerBody()
      rollEgg()
    }
  } else if (page === PAGE_LABEL.clothes || page === PAGE_LABEL.reading) {
    pushHop(withSearchResume(route.fullPath, kw.value))
    router.push({ path: page === PAGE_LABEL.clothes ? '/codex/clothes' : '/codex/readings', query: { name } })
  } else {
    hint(`${name} · 暂不支持跳转`)
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
  play('points-slide', { volume: 0.7 })
  searching.value = true
}
const closeSearch = () => { searching.value = false; kw.value = '' }

/* ════════════════════════════════════════ 导航 / 快捷键 */
const toast = ref('')
let toastTimer = 0
function hint(msg: string) {
  toast.value = msg
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toast.value = ''), 1600)
}
function goBack() {
  // 优先退回跳转来源（从服装图鉴来的带着原视图），否则退回上一层
  const back = takeHop()
  clearHops() // 清掉 ESC 返回栈
  play('back-select', { volume: 0.8 })
  if (back) {
    router.replace(back)
    return
  }
  router.push(parentOf(route.path))
}

function onKey(e: KeyboardEvent) {
  const k = e.key.toLowerCase()
  if (k === 'escape') {
    e.preventDefault()
    if (searching.value) {
      closeSearch()
      return
    }
    // 从「ESC 返回栈」退回来：跳过去时记了来源，这里原样回去
    const back = takeHop()
    if (back) {
      router.replace(back)
      return
    }
    goBack()
    return
  }
  if (searching.value) return
  if (k === 'q') {
    e.preventDefault()
    stepRegion(-1)
  } else if (k === 'e') {
    e.preventDefault()
    stepRegion(1)
  }
}

/* ════════════════════════════════════════ 生命周期 */
/** 深链：?name=书名 → 定位（首次挂载与后续 query 变化都生效） */
function applyDeepLink() {
  const name = route.query.name
  if (typeof name === 'string' && name) {
    const found = findStory(name)
    if (found) {
      region.value = regionOfMajor(found.major)
      selId.value = found.id
      triggerBody()
      rollEgg()
    }
  }
}
onMounted(() => {
  applyDeepLink()
  autoPick()
  resumeSearch()
  rollEgg() // 彩蛋刷新时机①：进入子界面
  window.addEventListener('keydown', onKey)
})
/** 正文是运行时 JSON：到货后补一次定位（首次进入时 mounted 阶段还是空数组，深链必然落空） */
watch(
  () => stories.length,
  () => {
    if (selId.value) return
    applyDeepLink()
    autoPick()
  },
)
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.clearTimeout(toastTimer)
  window.clearTimeout(bodyTimer)
})
// query 变化时（已挂载情况下再次进入深链）重新定位
watch(
  () => route.query.name,
  () => applyDeepLink()
)

/* ════════════════════════════════════════ 派生几何 */

/** 顶部大版本切换栏几何 */
const TAB_W = 194.8
const TAB_H = 120.1
const TAB_STEP = 180.8
const TAB_X0 = Math.round(((1920 - ((REGIONS.length - 1) * TAB_STEP + TAB_W)) / 2) * 10) / 10
function tabX(i: number) {
  return Math.round((TAB_X0 + i * TAB_STEP) * 10) / 10
}
/** Q / E 键提示贴在最左 / 最右两栏的外侧（原设计：Q 距首栏 −50.6、E 距末栏 +3.8） */
const keyQStyle = computed<Record<string, string>>(() => {
  const b = L.value.keyQ
  return { left: tabX(0) - 50.6 + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' }
})
const keyEStyle = computed<Record<string, string>>(() => {
  const b = L.value.keyE
  return {
    left: tabX(REGIONS.length - 1) + TAB_W + 3.8 + 'px',
    top: b.y + 'px',
    width: b.w + 'px',
    height: b.h + 'px',
  }
})

/** 派生几何的单一真源：src/core/museum-layout.ts */
const listH = computed(() => rdLayout(L.value).listH)
const rowHiStyle = computed<Record<string, string>>(() => rdLayout(L.value).rowHiStyle)
const rowLineStyle = computed<Record<string, string>>(() => rdLayout(L.value).rowLineStyle)
const contentStyle = computed<Record<string, string>>(() => rdLayout(L.value).contentStyle)
const emptyStickerStyle = computed<Record<string, string>>(() => rdLayout(L.value).emptyStickerStyle)

/** 当前是否有选中条目（= 纸面展示正文，而非空态） */
const hasSelection = computed(() => !!selEntry())

/** 没有深链、也没手动选过时，自动停在第一条已解锁条目上 */
function autoPick() {
  if (selId.value) return
  const first = regionStories.value.find((r) => unlocked(r))
  if (!first) return
  selId.value = first.id
  triggerBody() // 与手动点击一致：标题先出、正文 240ms 后淡入
}
</script>

<template>
  <div v-if="R" class="readings">
    <!-- ══════════ 层 1：全屏背景（溢出裁切） ══════════ -->
    <img class="rd-bg" :style="box(L.bg)" :src="asset(artKey === 'yizan' ? R.bgYizan : R.bgWish)" alt="" draggable="false" />

    <!-- ══════════ 层 2：枫叶（仅伊赞之土，bg 之上 / reel 之下） ══════════ -->
    <img v-if="artKey === 'yizan'" class="rd-dec" :style="box(L.maple)" :src="asset(R.maple)" alt="" draggable="false" />

    <!-- ══════════ 层 3：中央卷轴底 ══════════ -->
    <img class="rd-layer" :style="box(L.reel)" :src="asset(artKey === 'yizan' ? R.reelYizan : R.reelWish)" alt="" draggable="false" />

    <!-- ══════════ 层 4：飘带蕾丝（仅伊赞之土，reel 之上 / paper 之下） ══════════ -->
    <img v-if="artKey === 'yizan'" class="rd-dec" :style="box(L.lace)" :src="asset(R.lace)" alt="" draggable="false" />

    <!-- ══════════ 层 5：纸面（打开的书：左页=列表纸底，右页=正文） ══════════ -->
    <img class="rd-layer" :style="box(L.paper)" :src="asset(artKey === 'yizan' ? R.paperYizan : R.paperWish)" alt="" draggable="false" />

    <!-- ══════════ 层 6：左侧列表栏面板 ══════════ -->
    <img class="rd-layer" :style="box(L.tabpanel)" :src="asset(artKey === 'yizan' ? R.tabYizan : R.tabWish)" alt="" draggable="false" />

    <!-- ══════════ 层 7：左缘放大镜（= 搜索入口，溢出左缘） ══════════ -->
    <button class="rd-mag" :style="box(L.magnifier)" @click="openSearch">
      <img :src="asset(artKey === 'yizan' ? R.magnifierYizan : R.magnifierWish)" alt="搜索" draggable="false" />
    </button>

    <!-- ══════════ 层 8：顶部横线 ══════════ -->
    <img class="rd-layer rd-topline" :style="box(L.topLine)" :src="asset(R.topLine)" alt="" draggable="false" />

    <!-- ══════════ 层 10/11：E / Q 键提示（键位含义 = 左右翻栏） ══════════ -->
    <img class="rd-key" :style="keyEStyle" :src="asset(R.keyE)" alt="" draggable="false" />
    <img class="rd-key" :style="keyQStyle" :src="asset(R.keyQ)" alt="" draggable="false" />

    <!-- ══════════ 层 12：右上千纸鹤（仅心愿原野，溢出顶部） ══════════ -->
    <img v-if="artKey === 'wish'" class="rd-dec" :style="box(L.papercranes)" :src="asset(R.papercranes)" alt="" draggable="false" />

    <!-- ══════════ 顶部压暗层：分割线以上 ══════════ -->
    <div class="rd-dim" aria-hidden="true"></div>

    <!-- ══════════ 层 12：返回箭头（arrowN + arrowH 叠层） ══════════ -->
    <button class="rd-back" :style="box(L.arrow)" @click="goBack">
      <img class="bn" :src="asset(store.manifest?.ui?.museum.clothes.arrowN)" alt="返回" draggable="false" />
      <img class="bh" :src="asset(store.manifest?.ui?.museum.clothes.arrowH)" alt="" draggable="false" />
    </button>

    <!-- ══════════ 大版本切换键：容器 = common_img_menu_s（三栏整组居中） ══════════ -->
    <button
      v-for="(r, i) in REGIONS"
      :key="r.key"
      class="rd-tab"
      :class="{ on: region === r.key }"
      :style="{ left: tabX(i) + 'px', top: '0px', width: TAB_W + 'px', height: TAB_H + 'px' }"
      @click="setRegion(r.key)"
    >
      <img class="tb-hi" :src="asset(store.manifest?.ui?.museum.btnMenu)" alt="" draggable="false" />
      <span class="tb-txt">{{ r.label }}</span>
    </button>

    <!-- ══════════ 层 13：列表 ══════════ -->
    <div class="rd-list" :style="{ left: L.selBox.x + 'px', top: RD_LIST_TOP + 'px', width: L.selBox.w + 'px', height: listH + 'px' }">
      <div
        v-for="r in regionStories"
        :key="r.id"
        class="rd-row"
        :class="{ sel: r.id === selId }"
        :style="{ height: RD_ROW_H + 'px' }"
        @click="pick(r)"
      >
        <!-- 选中高亮框（常态不显示） -->
        <img v-if="r.id === selId" class="rd-hi" :style="rowHiStyle" :src="asset(R.tabSelN)" alt="" draggable="false" />
        <!-- 条目分隔线 -->
        <img class="rd-line" :style="rowLineStyle" :src="asset(R.tabLine)" alt="" draggable="false" />
        <span class="rd-title">{{ r.title }}</span>
        <!-- 未获取：锁框 + 链条 + 挂锁 三层组合（置于名称之后） -->
        <span v-if="!unlocked(r)" class="rd-lock">
          <img class="lk-frame" :src="asset(R.lock02)" alt="" draggable="false" />
          <img class="lk-chain" :src="asset(R.lockChain)" alt="" draggable="false" />
          <img class="lk-pad" :src="asset(R.lock01)" alt="" draggable="false" />
        </span>
        <!-- 解锁三阶段动画覆盖层（跟随锁的位置） -->
        <span v-if="animId === r.id" class="rd-unlock">
          <img class="u-frame" :src="asset(R.lock02)" alt="" draggable="false" />
          <img class="u-chain" :src="asset(R.lockChain)" alt="" draggable="false" />
          <img class="u-pad" :src="asset(R.lock01)" alt="" draggable="false" />
        </span>
      </div>
    </div>

    <!-- ══════════ 层 14：螺旋（仅伊赞之土） ══════════ -->
    <img v-if="artKey === 'yizan'" class="rd-dec" :style="box(L.spiral)" :src="asset(R.spiral)" alt="" draggable="false" />

    <!-- ══════════ 层 15：标签头（-3.33° 旋转 + 阴影） ══════════ -->
    <img v-if="R.labelShadow" class="rd-label-shadow" :style="box(L.label)" :src="asset(R.labelShadow)" alt="" draggable="false" />
    <img class="rd-label" :style="box(L.label)" :src="asset(artKey === 'yizan' ? R.labelYizan : R.labelWish)" alt="" draggable="false" />
    <div class="rd-labeltxt" :style="box(L.label)">故事 ({{ obtained }}/{{ regionStories.length }})</div>

    <!-- ══════════ 层 16：随机彩蛋（仅在展示已获取的故事时出现） ══════════ -->
    <img v-if="eggSrc && hasSelection" class="rd-egg" :style="box(L.egg)" :src="eggSrc" alt="" draggable="false" />

    <!-- ══════════ 空态贴纸：判据是「当前能不能展示正文」 ══════════ -->
    <img
      v-if="!hasSelection"
      class="rd-empty-sticker"
      :style="emptyStickerStyle"
      :src="asset(R.emptySticker)"
      alt=""
      draggable="false"
    />

    <!-- ══════════ 正文（纸面右页内）：标题固定，仅正文滚动 ══════════ -->
    <div class="rd-content" :style="contentStyle">
      <template v-if="selEntry()">
        <!-- 标题立即显示、不随正文滚动 -->
        <div class="rd-ctitle">{{ selEntry()!.title }}</div>
        <!-- 正文延迟 ~240ms 后 160ms 淡入（两步加载），可独立滚动 -->
        <div ref="bodyWrap" class="rd-cbody-wrap">
          <div class="rd-cbody" :class="{ show: bodyShown }">{{ selEntry()!.text }}</div>
        </div>
      </template>
      <!-- 空态提示文字（延迟 100ms 淡入） -->
    </div>

    <!-- ══════════ 空态提示：舞台绝对坐标（屏幕中央偏上 160px） ══════════ -->
    <div v-if="!hasSelection" class="rd-empty">
      <div class="rd-empty-txt">暂未获得故事书，快去收集套装吧～</div>
    </div>

    <!-- 搜索弹窗 -->
    <SearchPopup
      :open="searching"
      :query="kw"
      :results="searchResults"
      placeholder="搜索 阅读物…"
      @update:query="kw = $event"
      @select="onSearchSelect"
      @close="closeSearch"
    />

    <!-- 黑屏过渡（切换大版本） -->
    <div class="rd-blackout" :class="{ on: blackout }"></div>

    <!-- 提示 -->
    <div v-if="toast" class="rd-toast">
      <img class="rd-toast-bg" :src="asset(R.placename)" alt="" draggable="false" />
      <span class="rd-toast-txt">{{ toast }}</span>
    </div>
  </div>
</template>

<style scoped src="../styles/museum-codex.css"></style>
