<script setup lang="ts">
/**
 * 时隙遗光（版本选择页）
 *
 * 进入：左侧收纳栏「时隙遗光」；右下进入键 → **选中版本对应的服装阁**（v1.4.01，
 *       未选版本时直接进当前池）。
 *
 * 结构：
 *   左  版本缩略图栏（大版本 1 心愿原野 / 2 伊赞之土 常显；小版本折叠，点大版本展开）
 *        小版本 = 容器底板 `btn_title_l/h`（裁掉透明边距的 title-panel）+ 版本缩略图(70%)
 *                + 左上角版本号角标 + 居中版本名（超宽走跑马灯）
 *   右  版本大图（`Pear_Card_img_NNN_M`，常态折叠，点小版本才展开）
 *        + 底边文案条（`tuning_txtbg04` 九宫格只拉中间）+ 底边装饰（`tuning_txtbg03` 居中）
 *   左上 退出键（`next` 素材镜像，箭头朝左）；右下 服装阁进入键（箭头朝右）+ 对应服装阁名
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { play, playBannerEnter } from '@/composables/useAudio'
import { parentOf } from '@/router'

interface VerItem {
  v: string
  name: string
  desc: string
}

/**
 * 兜底版本表（manifest 未加载 / 老 manifest 没有 `ui.ver.versions` 时用）。
 *
 * v1.5.00 起版本列表的**权威来源是 manifest.ui.ver.versions**，它由
 * `素材/信息表/版本表.csv` 生成 —— 更新程序新增版本时只改那张表，这里不用动。
 * 这份常量留着是为了「manifest 拉取失败也能看到界面」，别删。
 */
const FALLBACK_VERSIONS: VerItem[] = [
  { v: '1.0', name: '探索季', desc: '与伙伴一同踏上旅途，走向未知的远方，寻找奇迹诞生的地方。' },
  { v: '1.1', name: '流星季', desc: '听闻在流星雨降临的时候，许下的愿望会被赐予幸运的祝福。' },
  { v: '1.2', name: '花焰季', desc: '仰望长燃不灭的花焰，俯瞰大地的别样风光。' },
  { v: '1.3', name: '传说季', desc: '高悬的满月之下，谜诡的歌声之中，不为人知的传说正在肆意生长。' },
  { v: '1.4', name: '妄想季', desc: '当舞会的钟声敲响，派对的霓光开始跃动，狂欢的盛宴便就此开启。' },
  { v: '1.5', name: '泡泡季', desc: '轻盈升空的，除了绚烂的虹彩，和无忧的泡泡，还有被忘却的眷恋。' },
  { v: '1.6', name: '天真季', desc: '总想沉浸在童趣盈溢的夏日里，多希望那颗年轻的心能够永远天真。' },
  { v: '1.7', name: '蓝泪季', desc: '蓝眼泪，蓝眼泪，带我逆流，回到昨天……' },
  { v: '1.8', name: '丹青季', desc: '缘尽亦缘起，终有再会时。' },
  { v: '1.9', name: '音乐季', desc: '帷幔后的故事终将谢幕，名为永恒的旋律也会迎来最后的尾音。' },
  { v: '1.10', name: '丰收季', desc: '黑夜过去，日出来临。在金色、热烈的光晕中，所有的往事，都已丰收，都已结束…...' },
  { v: '1.11', name: '拾光季', desc: '纵使赛事终场哨响，纵使未来各赴远方，那些共度的时光，依旧在记忆里发烫。' },
  { v: '2.0', name: '祷声起诸大地', desc: '菇众将唱响祷声，直至晨风捎来大地的真相。' },
  { v: '2.1', name: '若生命如诗', desc: '树影裹住它挂满花朵的枝芽，它在芬芳中安眠，化作新生的另一序章。' },
  { v: '2.2', name: '九色万相生', desc: '涤九色尘光，化人间万相。' },
  { v: '2.3', name: '予我无冕之心', desc: '抛却“完美”的枷锁，拥抱无冕的真心。' },
  { v: '2.4', name: '嘘！森林不必听', desc: '别去理会虚伪傲慢的嘲声，让愤怒化为枪口烈火，燃却禁锢的荆棘！' },
  { v: '2.5', name: '万灵的归途', desc: '万灵终赴潮海，守望自成归途。' },
  { v: '2.6', name: '潮汐尽头的明天', desc: '行至潮汐尽头，奔赴彼岸晨光。' },
  { v: '2.7', name: '千星所向的旅途', desc: '万千星光相逢于星海，聆听彼此在旅途中诞生的心情。' },
  { v: '2.8', name: '黄金尘', desc: '接纳轮回的意志，归途亦是新程，失落千年的辉光终将重临黄金之乡。' },
  { v: '2.9', name: '向晴空绽放', desc: '勇敢迈向晴空，心花终将盛放。' },
  { v: '2.10', name: '金羽的裁决', desc: '金羽拂落，沉寂有声。循着天平的回响，落笔千年的裁决。' },
  { v: '2.11', name: '时光缝合的扉页', desc: '用一场幸福的雪，颂念无名勇者的归途。' },
]

/** 兜底大版本名（manifest 里没给 majorName 时按 id 取） */
const FALLBACK_MAJORS: Record<string, string> = { '1': '心愿原野', '2': '伊赞之土' }

const store = useGameStore()
const route = useRoute()
const router = useRouter()
const ui = computed(() => store.manifest?.ui.ver)

/**
 * 版本卡兜底（v1.9.06）。
 *
 * 两种情况会用到：工坊新建一个还没配卡图的版本（`cards[v]` 为空，管线已回落到
 * default 图，但老 manifest 里可能仍是空串）、以及卡图文件损坏导致 404。
 * 以前这里直接 `v-if` 不渲染，露出光秃秃的底板；现在统一落到默认卡上。
 */
function cardOf(v: string): string {
  const u = ui.value
  return u?.cards?.[v] || u?.cardDefault || ''
}
function bigOf(v: string): string {
  const u = ui.value
  return u?.bigCards?.[v] || u?.bigDefault || ''
}
function onCardError(e: Event) {
  const el = e.target as HTMLImageElement
  const fb = ui.value?.cardDefault
  if (!fb || el.dataset.fellBack) return
  el.dataset.fellBack = '1'
  el.src = asset(fb)
}
function onBigError(e: Event) {
  const el = e.target as HTMLImageElement
  const fb = ui.value?.bigDefault
  if (!fb || el.dataset.fellBack) return
  el.dataset.fellBack = '1'
  el.src = asset(fb)
}

/** 版本列表：manifest 优先（来自 素材/信息表/版本表.csv），缺失则兜底常量 */
const VERSIONS = computed<VerItem[]>(() => {
  const list = store.manifest?.ui.ver.versions
  if (list?.length) {
    return list
      .filter((x) => x.v)
      .map((x) => ({ v: x.v, name: x.name || x.v, desc: x.desc || '' }))
  }
  return FALLBACK_VERSIONS
})

/** 大版本分组：按版本号首位分组，range 由组内首尾自动算（新增 2.12 不需要改这里） */
const MAJORS = computed(() => {
  const meta = store.manifest?.ui.ver.versions ?? []
  const ids = [...new Set(VERSIONS.value.map((x) => x.v.split('.')[0]))]
  return ids.map((id) => {
    const items = VERSIONS.value.filter((x) => x.v.split('.')[0] === id)
    const label =
      meta.find((x) => x.major === id && x.majorName)?.majorName ?? FALLBACK_MAJORS[id] ?? `第 ${id} 代`
    return {
      id,
      label,
      range: items.length ? `${items[0].v} – ${items[items.length - 1].v}` : '',
    }
  })
})

function asset(p: string | null | undefined) {
  return store.asset(p)
}

const root = ref<HTMLElement | null>(null)
/**
 * 进页面就把「当前版本」摆出来（v1.4.02）：已选过版本的，高亮那一行并展开它所在的大版本；
 * 没选过的（首次进入）保持空白，必须自己点一下。
 */
const openMajor = ref<string | null>(store.selectedVersion ? store.selectedVersion.split('.')[0] : '1')
const selected = ref<string | null>(store.selectedVersion || null)

const groups = computed(() =>
  MAJORS.value.map((m) => ({
    ...m,
    items: VERSIONS.value.filter((v) => v.v.split('.')[0] === m.id),
  })),
)

const current = computed(() => VERSIONS.value.find((v) => v.v === selected.value) ?? null)

/**
 * 跑马灯判定：名字实际宽度超出容器才滚动。
 * 用「先摘掉 scroll 类 → 量宽度 → 再决定」的顺序，否则 scroll 态加的
 * `padding-right` 会把宽度撑大，永远判定为溢出。
 */
function refreshOverflow() {
  const nodes = root.value?.querySelectorAll<HTMLElement>('.vn-name') ?? []
  nodes.forEach((el) => {
    const first = el.querySelector<HTMLElement>('.vn-run > b')
    if (!first) return
    el.classList.remove('scroll')
    if (first.getBoundingClientRect().width > el.clientWidth + 1) el.classList.add('scroll')
  })
}

function toggleMajor(id: string, ev?: MouseEvent) {
  play('common-hover', { volume: 0.4 })
  // 收起某个大版本（含「展开另一个组导致本组被收起」）时，若当前选中项属于它，
  // 版本大图也一并收起 —— 否则折叠栏已合上、右边还挂着一张图
  const cur = VERSIONS.value.find((v) => v.v === selected.value)
  if (cur && cur.v.split('.')[0] === id) selected.value = null
  openMajor.value = openMajor.value === id ? null : id
  // 展开后把该组滚到视口顶部，保证两个大版本按钮都还能看到
  const rail = (ev?.currentTarget as HTMLElement | undefined)?.closest('.vr-rail')
  const group = (ev?.currentTarget as HTMLElement | undefined)?.closest('.vr-group')
  if (rail && group && openMajor.value === id) {
    rail.scrollTo({ top: (group as HTMLElement).offsetTop - 8, behavior: 'smooth' })
  }
}
/**
 * 大版本图标（v1.6.07）。
 *
 * 内置只有 1/2 两张（`ui.tower` 是数组，按大版本号-1 取）。
 * 新增大版本时工坊可以上传图标，存成 `ui.majorIcons[大版本号]`；
 * 没有就退回内置数组，再没有就留空（不再抛错）。
 */
function majorIconOf(majorId: string): string {
  const map = ui.value?.majorIcons
  const own = map?.[majorId]
  if (own) return own
  return ui.value?.tower[Number(majorId) - 1] ?? ''
}

function pick(v: string) {
  selected.value = v
  // 点一下小版本 = 选定当前版本（共鸣页只列这个版本的服装阁，入口也随之解锁）
  store.selectVersion(v)
  // 版本点击音 = 该版本**首个五星阁**的进入音（2026-11-04）。
  // 用原声，不再叠 common-hover —— 两个声音同时响会把前奏糊掉。
  const p = poolOf.value[v]
  if (p) playBannerEnter(p.id)
}
/**
 * 版本 → 该版本对应的服装阁（v1.4.01）。
 *
 * manifest.banners 的排列顺序就是「版本号 → 官方编号升序」，同版本里含 5★ 的混池
 * 编号一定靠前（1.0 的 004/005 是纯 4★，排在 001~003 之后），所以取该版本
 * **第一个含 5★ 的池**即可；整个版本都只有 4★ 时才退回第一条。
 * 24 个版本全部有池（实测 1.0 → 2.11 无一个空缺）。
 */
const poolOf = computed(() => {
  const map: Record<string, { id: string; name: string }> = {}
  const fiveOnly: Record<string, { id: string; name: string }> = {}
  for (const b of store.manifest?.banners ?? []) {
    if (!map[b.version]) map[b.version] = { id: b.id, name: b.name }
    if (!fiveOnly[b.version] && String(b.star ?? '').includes('5★')) {
      fiveOnly[b.version] = { id: b.id, name: b.name }
    }
  }
  return { ...map, ...fiveOnly }
})

/** 当前选中版本对应的服装阁（没点过就用已选定的版本；都没有则为 null） */
const targetPool = computed(() => {
  const v = selected.value ?? store.selectedVersion
  return v ? poolOf.value[v] ?? null : null
})

function back() {
  play('back-select', { volume: 0.7 })
  router.push(parentOf(route.path))
}
/**
 * 进入服装阁：**先切到选中版本对应的池**，再跳页。
 *
 * v1.4.02：没有当前版本就**不跳**（共鸣页只列当前版本的池，跳过去也会被守卫打回来），
 * 用户必须先点一个小版本 ——「首次进入必须在版本页选一次」就是这个手感。
 */
function enter() {
  play('back-select', { volume: 0.7 })
  const p = targetPool.value
  if (!p) return
  if (selected.value) store.selectVersion(selected.value)
  if (store.bannerId !== p.id) store.selectBanner(p.id)
  // `from=versions`：共鸣页的退出键 / ESC 据此退回版本页，而不是回主页（v1.4.03）
  router.push({ path: '/banner', query: { from: 'versions' } })
}

watch(openMajor, () => nextTick(refreshOverflow))

/** ESC 退出（v1.2.02：二级界面统一支持） */
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') back()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  play('echo-open', { volume: 0.5 })
  nextTick(refreshOverflow)
  // 字体加载完宽度会变，再量一次
  document.fonts?.ready.then(refreshOverflow)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div v-if="ui" ref="root" class="ver">
    <img class="vr-bg" :src="asset(ui.bg)" alt="" draggable="false" />

    <!-- 退出键：next 素材水平镜像 → 箭头朝左 -->
    <button class="vr-back" @click="back" @mouseenter="play('common-hover', { volume: 0.35 })">
      <img class="vb-n" :src="asset(ui.nextN)" alt="" draggable="false" />
      <img class="vb-h" :src="asset(ui.nextH)" alt="" draggable="false" />
    </button>

    <!-- 版本缩略图栏 -->
    <aside class="vr-rail">
      <div v-for="g in groups" :key="g.id" class="vr-group">
        <!-- 大版本：option 按钮 + 左侧地标图标（名称居中，不再带 1.0–1.11 区间） -->
        <button
          class="vr-major"
          :class="{ open: openMajor === g.id }"
          @click="toggleMajor(g.id, $event)"
          @mouseenter="play('common-hover', { volume: 0.35 })"
        >
          <img class="vm-bg" :src="asset(openMajor === g.id ? ui.optS : ui.optN)" alt="" draggable="false" />
          <!-- 没有图标就别渲染 <img>：空 src 会显示浏览器的「裂图」占位，比留白难看得多 -->
          <img v-if="majorIconOf(g.id)" class="vm-icon" :src="asset(majorIconOf(g.id))" alt="" draggable="false" />
          <span class="vm-txt">{{ g.label }}</span>
        </button>

        <!-- 小版本：容器底板 + 缩略图 + 左上角版本号角标 + 居中版本名 -->
        <div class="vr-minors" :class="{ open: openMajor === g.id }">
          <button
            v-for="it in g.items"
            :key="it.v"
            class="vr-minor"
            :class="{ active: selected === it.v }"
            @click="pick(it.v)"
            @mouseenter="play('common-hover', { volume: 0.28 })"
          >
            <img class="vn-bg" :src="asset(selected === it.v ? ui.titlePanelH : ui.titlePanelN)" alt="" draggable="false" />
            <!-- 2.11 起还没有版本卡素材：缺卡时回落到通用默认卡（v1.9.06），不再留空底板 -->
            <img v-if="cardOf(it.v)" class="vn-thumb" :src="asset(cardOf(it.v))" alt=""
              draggable="false" @error="onCardError" />
            <span class="vn-ver">
              <img class="vv-bg" :src="asset(ui.verTag)" alt="" draggable="false" />
              <b>{{ it.v }}</b>
            </span>
            <span class="vn-name">
              <span class="vn-run">
                <b>{{ it.name }}</b>
                <b class="dup" aria-hidden="true">{{ it.name }}</b>
              </span>
            </span>
          </button>
        </div>
      </div>
    </aside>

    <!-- 版本大图（常态折叠，选中才展开） -->
    <section class="vr-stage" :class="{ show: !!current }">
      <img class="vs-frame" :src="asset(ui.picFrame)" alt="" draggable="false" />
      <!-- 边框上的呼吸粉光：与边框容器重合，鼠标悬停时 30%~90% 呼吸 -->
      <img class="vs-pink" :src="asset(ui.pinkH)" alt="" draggable="false" />

      <img v-if="current && bigOf(current.v)" class="vs-card" :src="asset(bigOf(current.v))"
        :alt="current.v" draggable="false" @error="onBigError" />
      <!-- 底边装饰：tuning_txtbg03，与版本大图同一条中线 -->
      <img v-if="current" class="vs-orn" :src="asset(ui.descOrn)" alt="" draggable="false" />

      <div v-if="current" class="vs-desc" :style="{ '--band': `url(${asset(ui.descBand)})` }">
        <p>{{ current.desc }}</p>
      </div>
      <div v-if="current" class="vs-title">{{ current.name }}</div>
      <p v-if="!current" class="vs-empty">从左侧选择版本查看介绍</p>
    </section>

    <!-- 右下：进入键前标出「这一版对应的服装阁」，点了就知道会落到哪 -->
    <span v-if="targetPool" class="vr-pool"><i>服装阁</i>{{ targetPool.name }}</span>

    <!-- 服装阁进入键：箭头朝右 -->
    <button
      class="vr-enter"
      :title="targetPool ? `进入服装阁 · ${targetPool.name}` : '进入服装阁'"
      @click="enter"
      @mouseenter="play('common-hover', { volume: 0.35 })"
    >
      <img class="vb-n" :src="asset(ui.nextN)" alt="" draggable="false" />
      <img class="vb-h" :src="asset(ui.nextH)" alt="" draggable="false" />
    </button>
  </div>
</template>

<style scoped>
.ver {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  cursor: var(--nk-cursor, auto), pointer;
}
.ver img { max-width: none; }
.vr-bg {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  object-fit: cover;
  pointer-events: none;
}

/* 退出 / 进入键：96×96，next 素材内容 (8,6)-(55,57) */
.vr-back,
.vr-enter {
  position: absolute;
  width: 96px;
  height: 96px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  z-index: 8;
}
.vr-back { left: 44px; top: 34px; transform: scaleX(-1); }
.vr-enter { left: 1750px; top: 928px; }
.vb-n,
.vb-h {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: opacity 0.16s ease;
}
.vb-h { opacity: 0; }
.vr-back:hover .vb-h,
.vr-enter:hover .vb-h { opacity: 1; }

/* 进入键左邻的「对应服装阁」标签：右对齐贴着 1750 的键，垂直居中于键心 976 */
.vr-pool {
  position: absolute;
  right: 188px;
  top: 950px;
  max-width: 520px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 14px;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 23px;
  letter-spacing: 0.06em;
  color: #f7efdc;
  text-shadow: 0 2px 8px rgba(40, 26, 10, 0.85), 0 0 18px rgba(255, 233, 190, 0.35);
  pointer-events: none;
  white-space: nowrap;
  z-index: 8;
}
.vr-pool i {
  margin-right: 10px;
  font-style: normal;
  font-size: 17px;
  letter-spacing: 0.12em;
  opacity: 0.72;
}

/* ========== 缩略图栏 ==========
   容器底板素材带 8~16px 透明留白，必须让「可见实体」正好填满 340×103 的盒子，
   否则可见边比盒子小一圈：缩略图一盖就把容器边吃光、上下还漏出缝。
   做法见 .vm-bg / .vn-bg（按 alpha 128 边界反算 img 尺寸与偏移）。
   rail 左移到 36 + 左右各 8px padding，给底板投影留出不被裁的空间。 */
.vr-rail {
  position: absolute;
  left: 36px;
  top: 152px;
  width: 360px;
  height: 806px;
  padding: 0 8px;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 6;
  scrollbar-width: thin;
  scrollbar-color: rgba(214, 236, 255, 0.25) transparent;
}
.vr-rail::-webkit-scrollbar { width: 6px; }
.vr-rail::-webkit-scrollbar-thumb {
  background: rgba(214, 236, 255, 0.45);
  border-radius: 3px;
}
.vr-group { margin-bottom: 0; }

/* 大版本按钮：option 素材 437×132 → 340×103（1:1 比例）
   v1.2.02：改为 sticky —— 展开该组小版本后，大版本按钮（1.0 心愿原野 / 2.0 伊赞之土）
   始终贴在列表顶部，不跟着滚走。sticky 的相对包含块是 `.vr-group`，
   所以滚到下一组时它会被本组底边带走，不会两个大版本同时钉住。 */
.vr-major {
  position: sticky;
  top: 0;
  z-index: 4;
  display: block;
  width: 340px;
  height: 103px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
}
/* 大版本按钮：盒子 340×103；option 素材 437×132、实体 (15,16)-(421,116)=406×100
   → img 放大到 366×136 并左移/上移，让实体正好铺满盒子（上下贴边，与小版本 0 间距） */
.vm-bg {
  position: absolute;
  left: -12.56px;
  top: -16.48px;
  width: 366px;
  height: 136px;
  object-fit: fill;
  filter: drop-shadow(0 3px 10px rgba(20, 40, 60, 0.35));
}
.vm-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  width: 62px;
  height: 62px;
  transform: translateY(-50%);
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(30, 50, 70, 0.45));
}
/* 大版本名称：居中、32px（不再带 1.0–1.11 区间） */
.vm-txt {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  text-align: center;
  font-size: 36px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: #4a3a28;
  text-shadow: 0 1px 0 rgba(255, 255, 255, 0.5);
  pointer-events: none;
}
.vr-major.open .vm-txt { color: #6b3f18; }

/* 小版本：与大版本同尺寸（340×103），折叠 / 展开 */
.vr-minors {
  overflow: hidden;
  max-height: 0;
  opacity: 0;
  /* 左右各留 8px 给底板投影，别被 overflow:hidden 裁掉左边那条 */
  width: 356px;
  margin-left: -8px;
  padding-left: 8px;
  transition: max-height 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease;
}
.vr-minors.open {
  max-height: 1400px;
  opacity: 1;
}
.vr-minor {
  position: relative;
  display: block;
  width: 340px;
  height: 103px;
  margin: 0;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
}
/* 容器底板：`btn_title_l/h` 裁掉 42px 透明边距后的 473×128，
   实体 (16,13)-(459,117)=443×104 → img 放大到 363×126.8 并左移/上移，实体正好铺满盒子。
   这样缩略图内缩 8px 就是真的 8px 容器边（之前实体比盒子小一圈，边被缩略图吃光了） */
.vn-bg {
  position: absolute;
  left: -12.28px;
  top: -12.88px;
  width: 363px;
  height: 126.8px;
  object-fit: fill;
  filter: drop-shadow(0 2px 6px rgba(20, 40, 60, 0.3));
}
.vr-minor.active .vn-bg { filter: drop-shadow(0 0 10px rgba(255, 226, 160, 0.75)); }
/* 版本缩略图：672×188 → 324×87，不透明度 70%；四周留 8px 露出容器底板 */
.vn-thumb {
  position: absolute;
  left: 8px;
  top: 8px;
  width: 324px;
  height: 87px;
  object-fit: cover;
  border-radius: 5px;
  opacity: 0.7;
}
/* 版本号：`tuning_txtbg01` 紫色缎带做容器，左/上边缘与缩略图左上角重合，
   宽度随版本号字数自适应（padding 撑开），数字居中 */
.vn-ver {
  position: absolute;
  left: 8px;
  top: 8px;
  height: 26px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.vv-bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
}
.vn-ver b {
  position: relative;
  font-size: 15px;
  font-weight: 500;
  line-height: 1;
  letter-spacing: 0.02em;
  color: #fff;
  text-shadow: 0 1px 2px rgba(38, 28, 72, 0.7);
}
/* 版本名：容器内居中；超宽时改跑马灯 */
.vn-name {
  position: absolute;
  left: 12px;
  right: 12px;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  pointer-events: none;
  z-index: 3;
}
.vn-run {
  display: inline-flex;
  white-space: nowrap;
}
.vn-run b {
  font-size: 30px;
  font-weight: 500;
  letter-spacing: 0.03em;
  color: #38291a;
  text-shadow: 0 0 6px rgba(255, 251, 238, 0.95), 0 0 14px rgba(255, 251, 238, 0.85),
    0 1px 0 rgba(255, 255, 255, 0.9);
}
.vn-run .dup { display: none; }
/* 跑马灯：两份等宽副本 + translateX(-50%)，单向匀速无缝循环 */
.vn-name.scroll { justify-content: flex-start; }
.vn-name.scroll .vn-run { animation: vnMarquee 7s linear infinite; }
.vn-name.scroll .vn-run b { padding-right: 56px; }
.vn-name.scroll .vn-run .dup { display: inline-block; }
@keyframes vnMarquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

/* ========== 版本大图 ========== */
.vr-stage {
  position: absolute;
  left: 452px;
  top: 96px;
  width: 1280px;
  height: 732px;
  z-index: 4;
  opacity: 0;
  transform: scale(0.97);
  transition: opacity 0.3s ease, transform 0.34s cubic-bezier(0.22, 1, 0.36, 1);
  pointer-events: none;
}
.vr-stage.show { opacity: 1; transform: scale(1); }
/* 边框容器 1400×800 → 1280×732 */
.vs-frame {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  filter: drop-shadow(0 0 18px rgba(255, 226, 170, 0.45));
  animation: vsFrameBreath 4.2s ease-in-out infinite;
}
@keyframes vsFrameBreath {
  0%, 100% { filter: drop-shadow(0 0 12px rgba(255, 226, 170, 0.32)); }
  50% { filter: drop-shadow(0 0 26px rgba(255, 236, 190, 0.72)); }
}
/* 粉色呼吸层：与边框重合，鼠标悬停 30%~90% 呼吸 */
.vs-pink {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}
.vr-stage:hover .vs-pink {
  opacity: 0.3;
  animation: vsPinkBreath 2.6s ease-in-out infinite;
}
@keyframes vsPinkBreath {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.9; }
}
/* 版本大图：1532×860（1.781）→ 1184×640 */
.vs-card {
  position: absolute;
  left: 32px;
  top: 30px;
  width: 1214px;
  height: 667px;
  object-fit: cover;
  border-radius: 4px;
  animation: vsCardIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes vsCardIn {
  from { opacity: 0; transform: translateY(12px) scale(0.985); }
  to { opacity: 1; transform: none; }
}
/* 文案条装饰 tuning_txtbg03：668×180 → 620×167；素材横线在第 114 行，
   内容中心比画布中心偏左 22px → 换算后 top 让横线正好落在文案条下沿（y=652） */
.vs-orn {
  position: absolute;
  left: 350px;
  top: 516px;
  width: 620px;
  height: 167px;
  object-fit: fill;
  pointer-events: none;
  z-index: 2;
  filter: brightness(1.34) drop-shadow(0 0 5px rgba(255, 255, 255, 0.9));
}
/* 文案条：tuning_txtbg04（616×68，两头渐隐）→ 1024×92，九宫格只拉中间 */
.vs-desc {
  position: absolute;
  left: 128px;
  top: 620px;
  width: 1024px;
  height: 92px;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}
/* 底板挂 ::before：border-image 的 border 区会吃掉内容盒，
   直接写在 .vs-desc 上会让文字只剩 624×52 */
.vs-desc::before {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0.5;
  border-style: solid;
  border-width: 20px 200px;
  border-color: transparent;
  border-image-source: var(--band);
  border-image-slice: 20 200 20 200 fill;
  border-image-repeat: stretch;
}
.vs-desc p {
  position: relative;
  width: 100%;
  margin: 0;
  padding: 0 40px;
  text-align: center;
  font-size: 26px;
  line-height: 1.55;
  letter-spacing: 0.02em;
  color: #f4efe2;
  text-shadow: 0 1px 2px rgba(18, 22, 34, 0.75), 0 0 12px rgba(18, 22, 34, 0.55);
}
/* 版本大图左上角：只显示版本名称（版本号已移到缩略图栏角标） */
.vs-title {
  position: absolute;
  left: 76px;
  top: 42px;
  z-index: 4;
  pointer-events: none;
  font-size: 38px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #fff;
  text-shadow: 0 2px 8px rgba(16, 18, 28, 0.85), 0 0 22px rgba(16, 18, 28, 0.7);
}
.vs-empty {
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  margin: 0;
  transform: translateY(-50%);
  text-align: center;
  font-size: 26px;
  letter-spacing: 0.1em;
  color: rgba(74, 58, 40, 0.5);
}
</style>
