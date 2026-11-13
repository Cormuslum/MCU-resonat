<script setup lang="ts">
/**
 * 辉煌心光（设置页）：1920×1080 绝对定位，背景是无声循环宣传片。
 * 四个交互区按全画布等比叠图，图标进热区或该面板打开时才显形（热区见 `src/data/gloria-hits.ts`）。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { GLORIA_HOTS, type GloriaKey } from '@/data/gloria-hits'
import {
  play,
  SCENES,
  SCENE_LABEL,
  setMasterVolume,
  setBgmVolume,
  setSceneVolume,
  setUiVolume,
  setBgmEnabled,
  type SceneKey,
} from '@/composables/useAudio'
import { parseSaveFileText } from '@/core/save'
import { parentOf } from '@/router'

const store = useGameStore()
const route = useRoute()
const router = useRouter()

const R = computed(() => store.manifest?.ui?.gloria)
const S = computed(() => store.save.settings)
function asset(p: string | null | undefined) {
  return store.asset(p)
}

/* ═══════════════════════════════════════════ 四个交互区 */

type PanelKey = GloriaKey

const PANEL_TITLE: Record<PanelKey, string> = {
  stage: '演出',
  volume: '音量',
  quick: '快捷',
  save: '存档',
}

const panel = ref<PanelKey | null>(null)
/** 鼠标当前所在的交互区（图标只在这时显形） */
const hoverKey = ref<PanelKey | null>(null)
const closeHover = ref(false)
const backHover = ref(false)

/** 图标是否显形：悬停中、或它的面板正开着 */
function iconOn(k: PanelKey) {
  return hoverKey.value === k || panel.value === k
}

function openPanel(k: PanelKey) {
  play('window-open', { volume: 0.7 })
  panel.value = k
}

function closePanel() {
  if (!panel.value) return
  play('back-select', { volume: 0.5 })
  panel.value = null
  confirm.value = null
}

function goBack() {
  play('back-select', { volume: 0.8 })
  router.push(parentOf(route.path))
}

/* ═══════════════════════════════════════════ 开关 / 滑杆 */

function toggle(key: 'skipAnim' | 'skipSingleAnim' | 'skipReward' | 'skipOpening' | 'skipGacha' | 'lucky') {
  play('settings-btn-select', { volume: 0.7 })
  store.setSetting(key, !S.value[key])
}

const pct = (v: number) => Math.round((v ?? 0) * 100)

function onVolume(e: Event) {
  const v = Number((e.target as HTMLInputElement).value) / 100
  store.setSetting('volume', v)
  setMasterVolume(v)
}

function onBgmVol(e: Event) {
  const v = Number((e.target as HTMLInputElement).value) / 100
  store.setSetting('bgmVol', v)
  setBgmVolume(v)
  // 「BGM 开关」并入这根滑杆：拉到 0 视为静音，拉回来自动恢复
  store.setSetting('bgm', v > 0)
  setBgmEnabled(v > 0)
}

/**
 * 单个界面的背景音：它是「背景音总控」下面的乘数，不是绝对值。
 */
function onSceneVol(k: SceneKey, e: Event) {
  const v = Number((e.target as HTMLInputElement).value) / 100
  const next = { ...(S.value.bgmScene ?? {}), [k]: v }
  store.setSetting('bgmScene', next)
  setSceneVolume(k, v)
}

/** 分界面滑杆的当前值（老存档缺字段时按 1 显示） */
function scenePct(k: SceneKey): number {
  return Math.round((S.value.bgmScene?.[k] ?? 1) * 100)
}


function onUiVol(e: Event) {
  const v = Number((e.target as HTMLInputElement).value) / 100
  store.setSetting('uiVol', v)
  setUiVolume(v)
  play('settings-hover', { volume: 0.6 })
}

/* ═══════════════════════════════════════════ 快捷：一键集齐 */

function doCollectSets() {
  const n = store.collectAllSets()
  play('set-complete', { volume: 0.8 })
  toast(n > 0 ? `已集齐全部套装（新增 ${n} 件）` : '全部套装此前已集齐')
}

async function doCollectReadings() {
  const n = await store.collectAllReadings()
  play('unlock-big', { volume: 0.8 })
  toast(n > 0 ? `已解锁全部阅读物（新增 ${n} 本）` : '阅读物此前已全部解锁')
}

/* ═══════════════════════════════════════════ 存档：清理 + 二级确认 */

interface ConfirmSpec {
  title: string
  run: () => void
}

const confirm = ref<ConfirmSpec | null>(null)

function ask(spec: ConfirmSpec) {
  play('settings-btn-hover', { volume: 0.6 })
  confirm.value = spec
}

function runConfirm() {
  const c = confirm.value
  if (!c) return
  c.run()
  confirm.value = null
  play('set-progress-done', { volume: 0.8 })
}

const bannerName = computed(() => store.banner?.name ?? '当前服装阁')
const versionName = computed(() => {
  const b = store.banner
  return b ? `${b.version} ${b.versionName || ''}`.trim() : '当前版本'
})

function clearCurrentBanner() {
  ask({
    title: `当前服装阁记忆 · ${bannerName.value}`,
    run: () => {
      const n = store.clearBannerMemory()
      toast(n > 0 ? `已清空「${bannerName.value}」，回收 ${n} 件套装部件` : `已清空「${bannerName.value}」的抽卡记录`)
    },
  })
}

function clearCurrentVersion() {
  ask({
    title: `当前版本记忆 · ${versionName.value}`,
    run: () => {
      const n = store.clearVersionMemory()
      toast(n > 0 ? `已清空「${versionName.value}」，回收 ${n} 件套装部件` : `已清空「${versionName.value}」的抽卡记录`)
    },
  })
}

function clearAllBanners() {
  ask({
    title: '所有服装阁记忆',
    run: () => {
      const n = store.clearAllBannerMemory()
      toast(n > 0 ? `已清空所有服装阁，回收 ${n} 件套装部件` : '所有服装阁的抽卡记录已清空')
    },
  })
}

function clearReadings() {
  ask({
    title: `阅读物记忆 · 已解锁 ${store.ownedReadingCount} 本`,
    run: () => {
      const n = store.clearReadingMemory()
      toast(n > 0 ? `已清空 ${n} 本阅读物的解锁` : '阅读物此前都未解锁')
    },
  })
}

/* ─────────── 存档备份：导出 / 导入 ─────────── */

const fileEl = ref<HTMLInputElement | null>(null)

/** 导出：把当前存档下成一个 JSON 文件（文件名带日期，方便区分多份） */
function doExportSave() {
  try {
    const text = store.exportSave()
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const d = new Date()
    const p2 = (n: number) => String(n).padStart(2, '0')
    const name = `无限暖暖存档-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`
      + `-${p2(d.getHours())}${p2(d.getMinutes())}.json`
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    // 延后释放
    window.setTimeout(() => URL.revokeObjectURL(url), 2000)
    play('set-progress-done', { volume: 0.8 })
    toast(`存档已导出 · ${name}`)
  } catch {
    toast('导出失败，请检查浏览器是否拦截了下载')
  }
}

/** 选文件（真正的解析在 onImportFile） */
function pickImportFile() {
  play('settings-btn-hover', { volume: 0.6 })
  fileEl.value?.click()
}

/**
 * 导入：先校验，再确认，最后才覆盖。
 * 校验失败时只 toast 说原因，绝不弹确认框。
 */
async function onImportFile(e: Event) {
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  // 选完立刻清空，这样「同一个文件再选一次」也能触发 change 事件
  input.value = ''
  if (!f) return
  let text = ''
  try {
    text = await f.text()
  } catch {
    toast('这个文件读不出来')
    return
  }
  const parsed = parseSaveFileText(text)
  if (!parsed.ok) {
    play('common-cancel', { volume: 0.7 })
    toast(`导入失败：${parsed.error}`)
    return
  }
  ask({
    title: `导入存档 · 覆盖当前进度（${Object.keys(parsed.data.pity ?? {}).length} 座服装阁有记录）`,
    run: () => {
      const r = store.importSave(text)
      if (!r.ok) {
        toast(`导入失败：${r.error}`)
        return
      }
      toast('存档已导入，正在重新载入…')
      window.setTimeout(() => window.location.reload(), 700)
    },
  })
}

function resetAll() {
  ask({
    title: '模拟器记忆 · 全部重置',
    run: () => {
      store.hardReset()
      // 回到初始状态：先回主页再重启
      window.setTimeout(() => {
        window.location.hash = '#/'
        window.location.reload()
      }, 260)
    },
  })
}

/* ═══════════════════════════════════════════ 提示条 */

const toastText = ref('')
let toastTimer = 0
function toast(msg: string) {
  toastText.value = msg
  window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => (toastText.value = ''), 2400)
}

/* ═══════════════════════════════════════════ 键盘 / 生命周期 */

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (confirm.value) {
    confirm.value = null
    return
  }
  if (panel.value) closePanel()
  else goBack()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  play('settings-open', { volume: 0.7 })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  window.clearTimeout(toastTimer)
})
</script>

<template>
  <div class="gl">
    <!-- 背景视频（无声循环；解码前用 poster 顶住） -->
    <video
      class="gl-bg"
      :src="asset(R?.bg)"
      :poster="asset(R?.poster)"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
    ></video>
    <div class="gl-scrim"></div>

    <!-- 四个交互区：1920×1080 全画布叠图，常态透明 -->
    <img
      v-for="h in GLORIA_HOTS"
      :key="'i' + h.key"
      class="gl-ic"
      :class="{ on: iconOn(h.key) }"
      :src="asset(R?.entry[h.key])"
      alt=""
      draggable="false"
    />

    <!-- 返回（常态 turn_n / 悬停 Mobile_back） -->
    <img
      class="gl-back"
      :src="asset(backHover ? R?.backH : R?.backN)"
      alt="返回"
      title="返回"
      draggable="false"
      @mouseenter="backHover = true"
      @mouseleave="backHover = false"
      @click="goBack"
    />

    <header class="gl-head">
      <p>Settings · 设 置</p>
    </header>

    <!-- 四个交互热区（透明；悬停显形、点击开面板） -->
    <button
      v-for="h in GLORIA_HOTS"
      :key="'h' + h.key"
      class="gl-hot"
      :style="{ left: h.x + 'px', top: h.y + 'px', width: h.w + 'px', height: h.h + 'px' }"
      :aria-label="h.label"
      @mouseenter="hoverKey = h.key"
      @mouseleave="hoverKey = null"
      @click="openPanel(h.key)"
    ></button>

    <p class="gl-foot">素材版权归叠纸所有 · 非商业同人作品</p>

    <!-- ═══════════════ 设置弹窗（四类共用评分板容器） ═══════════════ -->
    <div v-if="panel" class="gl-mask" @click.self="closePanel">
      <section class="gl-modal">
        <img class="gm-board" :src="asset(R?.board)" alt="" draggable="false" />

        <!-- 左上角名牌：十字准星金环包住该项名称 -->
        <div class="gm-tab">
          <img class="gm-tab-ring" :src="asset(R?.tab)" alt="" draggable="false" />
          <span>{{ PANEL_TITLE[panel] }}</span>
        </div>

        <!-- 右上角：关闭键 -->
        <img
          class="gm-close"
          :src="asset(closeHover ? R?.closeH : R?.closeN)"
          alt="关闭"
          title="关闭"
          draggable="false"
          @mouseenter="closeHover = true"
          @mouseleave="closeHover = false"
          @click="closePanel"
        />

        <div class="gm-body">
          <!-- ─────────── 演出 ─────────── -->
          <template v-if="panel === 'stage'">
            <div class="gm-row">
              <div class="gr-txt">
                <b>跳过抽卡动画</b>
                <span>抽卡演出直接跳到结果，不再播放共鸣动画</span>
              </div>
              <button class="sw" :class="{ on: S.skipAnim }" @click="toggle('skipAnim')"><i></i></button>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>跳过单抽动画</b>
                <span>单抽详情入场动效播放中，双击屏幕可立即播完并解锁交互</span>
              </div>
              <button class="sw" :class="{ on: S.skipSingleAnim }" @click="toggle('skipSingleAnim')"><i></i></button>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>跳过奖励弹窗</b>
                <span>十连结束回共鸣页时，不弹「恭喜获得」</span>
              </div>
              <button class="sw" :class="{ on: S.skipReward }" @click="toggle('skipReward')"><i></i></button>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>跳过开屏动画</b>
                <span>启动时直接进心绮之启，不播放 5s 开机动画</span>
              </div>
              <button class="sw" :class="{ on: S.skipOpening }" @click="toggle('skipOpening')"><i></i></button>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>跳过抽卡</b>
                <span>点击抽卡直接结算获得部件，不进入单抽 / 十连界面</span>
              </div>
              <button class="sw" :class="{ on: S.skipGacha }" @click="toggle('skipGacha')"><i></i></button>
            </div>
          </template>

          <!-- ─────────── 音量 ─────────── -->
          <template v-else-if="panel === 'volume'">
            <div class="gm-row">
              <div class="gr-txt">
                <b>主音量</b>
                <span>总音量，同时作用于背景音与 UI 音效</span>
              </div>
              <div class="gr-slider">
                <input type="range" min="0" max="100" :value="pct(S.volume)" @input="onVolume" />
                <em class="num">{{ pct(S.volume) }}</em>
              </div>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>背景音总控</b>
                <span>所有界面背景音的总闸，下面六个分项都乘在它上面</span>
              </div>
              <div class="gr-slider">
                <input type="range" min="0" max="100" :value="pct(S.bgmVol)" @input="onBgmVol" />
                <em class="num">{{ pct(S.bgmVol) }}</em>
              </div>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>UI 音效</b>
                <span>按钮、翻牌、弹窗等界面音</span>
              </div>
              <div class="gr-slider">
                <input type="range" min="0" max="100" :value="pct(S.uiVol)" @input="onUiVol" />
                <em class="num">{{ pct(S.uiVol) }}</em>
              </div>
            </div>

            <p class="gm-sub">各界面背景音</p>
            <div v-for="k in SCENES" :key="k" class="gm-row mini">
              <div class="gr-txt">
                <b>{{ SCENE_LABEL[k] }}</b>
              </div>
              <div class="gr-slider slim">
                <input type="range" min="0" max="100" :value="scenePct(k)" @input="onSceneVol(k, $event)" />
                <em class="num">{{ scenePct(k) }}</em>
              </div>
            </div>
            <p class="gm-note">
              音量实时生效，关闭页面后仍会记住。心绮之启仅在动态背景下有声（用视频自带音轨）。
            </p>
          </template>

          <!-- ─────────── 快捷 ─────────── -->
          <template v-else-if="panel === 'quick'">
            <div class="gm-row">
              <div class="gr-txt">
                <b>集齐全部套装</b>
                <span>一键解锁全部服装阁的 4★ / 5★ 套装部件</span>
              </div>
              <button class="gm-btn" @click="doCollectSets">执行</button>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>集齐全部阅读</b>
                <span>一键解锁心愿原野与伊赞之土的全部阅读物（原阅读物页「收集全部」）</span>
              </div>
              <button class="gm-btn" @click="doCollectReadings">执行</button>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>欧皇模式</b>
                <span>5★ / 4★ 综合出率约 ×3：单抽取三次最好值，硬保底窗口同步压缩为 1/3</span>
              </div>
              <button class="sw luck" :class="{ on: S.lucky }" @click="toggle('lucky')"><i></i></button>
            </div>
            <p class="gm-note">开启后 5★ 综合出率由 6.11% 提升到约 19%，4★ 同步提升，仅影响本机模拟结果。</p>
          </template>

          <!-- ─────────── 存档 ─────────── -->
          <template v-else>
            <div class="gm-stats">
              <div class="gs-item">
                <em class="num">{{ store.totalPullsAll }}</em>
                <span>服装阁累计抽数</span>
              </div>
              <div class="gs-item">
                <em class="num">{{ store.ownedPartCount }}</em>
                <span>已获服装部件</span>
              </div>
              <div class="gs-item">
                <em class="num">{{ store.ownedReadingCount }}</em>
                <span>已解锁阅读物</span>
              </div>
            </div>

            <!-- 备份 / 恢复：合成一行（面板高度固定，拆成两行会把「重置」挤出可视区） -->
            <div class="gm-row">
              <div class="gr-txt">
                <b>存档备份</b>
                <span>导成 JSON 存一份，或从备份里恢复（导入会先校验、再确认覆盖）</span>
              </div>
              <div class="gm-pair">
                <button class="gm-btn" @click="doExportSave">导出</button>
                <button class="gm-btn" @click="pickImportFile">导入</button>
              </div>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>当前服装阁记忆</b>
                <span>清空「{{ bannerName }}」的保底、深海回响与抽卡记录</span>
              </div>
              <button class="gm-btn" @click="clearCurrentBanner">清空</button>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>当前版本记忆</b>
                <span>清空「{{ versionName }}」下所有服装阁的同类记录</span>
              </div>
              <button class="gm-btn" @click="clearCurrentVersion">清空</button>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>所有服装阁记忆</b>
                <span>清空全部服装阁的保底、深海回响与抽卡记录（不影响图鉴）</span>
              </div>
              <button class="gm-btn" @click="clearAllBanners">清空</button>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>阅读物记忆</b>
                <span>清空阅读物解锁情况，图鉴回到全部未获得</span>
              </div>
              <button class="gm-btn" @click="clearReadings">清空</button>
            </div>
            <div class="gm-row">
              <div class="gr-txt">
                <b>模拟器记忆</b>
                <span>清空所有记忆（含生辰、抽卡记录），回到初始状态</span>
              </div>
              <button class="gm-btn danger" @click="resetAll">重置</button>
            </div>
          </template>
        </div>
      </section>
    </div>

    <!-- 导入存档用的隐藏文件选择器（点「导入」时由代码触发） -->
    <input
      ref="fileEl"
      type="file"
      accept=".json,application/json"
      style="display: none"
      @change="onImportFile"
    />

    <!-- ═══════════════ 二级确认（叠在设置弹窗上，中部偏上） ═══════════════ -->
    <div v-if="confirm" class="cf-mask" @click.self="confirm = null">
      <div class="cf-wrap">
        <p class="cf-cap">{{ confirm.title }}</p>
        <div class="cf-bar">
          <img class="cf-art" :src="asset(R?.confirm)" alt="该操作不可逆，是否执行？" draggable="false" />
          <button class="cf-btn cancel" title="取消" @click="confirm = null"></button>
          <button class="cf-btn ok" title="确认执行" @click="runConfirm"></button>
        </div>
      </div>
    </div>

    <!-- 提示条 -->
    <transition name="gl-toast">
      <div v-if="toastText" class="gl-toast">{{ toastText }}</div>
    </transition>
  </div>
</template>

<style scoped>
.gl {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  user-select: none;
  color: #f2e6cc;
}

/* ---------- 背景 ---------- */
.gl-bg {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  object-fit: cover;
  max-width: none;
}
.gl-scrim {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(900px 520px at 6% 0%, rgba(10, 8, 6, 0.62) 0%, transparent 62%),
    radial-gradient(700px 520px at 92% 100%, rgba(10, 8, 6, 0.42) 0%, transparent 66%),
    linear-gradient(180deg, rgba(8, 6, 4, 0.34) 0%, transparent 26%, transparent 72%, rgba(8, 6, 4, 0.42) 100%);
  pointer-events: none;
}

/* ---------- 四个交互区（全画布叠图，常态透明） ---------- */
.gl-ic {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  max-width: none;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.18s ease, filter 0.22s ease;
  filter: drop-shadow(0 0 16px rgba(255, 214, 140, 0.55));
}
.gl-ic.on {
  opacity: 1;
  /* 悬停亮度加一档 */
  filter: brightness(1.32) saturate(1.12) drop-shadow(0 0 26px rgba(255, 226, 160, 1))
    drop-shadow(0 0 56px rgba(255, 196, 96, 0.6));
  animation: icGlow 1.6s ease-in-out infinite alternate;
}
@keyframes icGlow {
  from {
    filter: brightness(1.32) saturate(1.12) drop-shadow(0 0 26px rgba(255, 226, 160, 1))
      drop-shadow(0 0 56px rgba(255, 196, 96, 0.6));
  }
  to {
    filter: brightness(1.55) saturate(1.18) drop-shadow(0 0 34px rgba(255, 236, 186, 1))
      drop-shadow(0 0 72px rgba(255, 206, 106, 0.8));
  }
}
.gl-hot {
  position: absolute;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
  z-index: 3;
}

/* ---------- 返回键 ---------- */
.gl-back {
  position: absolute;
  left: 28px;
  top: 24px;
  width: 84px;
  height: 84px;
  max-width: none;
  cursor: pointer;
  z-index: 5;
  transition: filter 0.16s ease, transform 0.16s ease;
  filter: drop-shadow(0 0 10px rgba(0, 0, 0, 0.85)) drop-shadow(0 2px 10px rgba(0, 0, 0, 0.6));
}
.gl-back:hover {
  filter: drop-shadow(0 0 16px rgba(255, 222, 150, 0.85)) brightness(1.12);
  transform: translateX(-2px);
}

/* ---------- 标题 ---------- */
.gl-head {
  position: absolute;
  left: 148px;
  top: 56px;
  z-index: 4;
}
.gl-head p {
  margin: 0;
  font-size: 21px;
  letter-spacing: 8px;
  color: rgba(246, 228, 190, 0.92);
  text-shadow: 0 3px 18px rgba(0, 0, 0, 0.85);
}
.gl-head p::after {
  content: '';
  display: block;
  width: 300px;
  height: 1px;
  margin-top: 14px;
  background: linear-gradient(90deg, rgba(222, 184, 110, 0.8), rgba(222, 184, 110, 0.04));
}

.gl-foot {
  position: absolute;
  left: 148px;
  bottom: 34px;
  margin: 0;
  z-index: 4;
  font-size: 13px;
  letter-spacing: 2px;
  color: rgba(240, 220, 180, 0.62);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}

/* ---------- 弹窗（评分板容器 1496×1012 → 1240×839） ---------- */
.gl-mask {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(6, 5, 4, 0.62);
  animation: glFade 180ms ease both;
}
@keyframes glFade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.gl-modal {
  position: relative;
  width: 1240px;
  height: 839px;
  animation: glPop 220ms cubic-bezier(0.2, 0.9, 0.3, 1.1) both;
  filter: drop-shadow(0 30px 80px rgba(0, 0, 0, 0.72));
}
@keyframes glPop {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
.gm-board {
  position: absolute;
  inset: 0;
  width: 1240px;
  height: 839px;
  max-width: none;
  object-fit: fill;
  pointer-events: none;
}

/* 左上角名牌：十字准星金环兜住该项名称 */
.gm-tab {
  position: absolute;
  left: 6px;
  top: 14px;
  width: 104px;
  height: 104px;
  display: grid;
  place-items: center;
}
.gm-tab-ring {
  position: absolute;
  inset: 0;
  width: 104px;
  height: 104px;
  max-width: none;
  pointer-events: none;
  filter: drop-shadow(0 0 14px rgba(255, 206, 120, 0.75));
}
.gm-tab span {
  position: relative;
  z-index: 1;
  width: 74px;
  height: 74px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  font-size: 26px;
  letter-spacing: 3px;
  text-indent: 3px;
  color: #ffe7b6;
  background: radial-gradient(circle at 40% 32%, rgba(46, 34, 18, 0.96), rgba(14, 10, 6, 0.96));
  box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.7);
}

.gm-close {
  position: absolute;
  right: 4px;
  top: 16px;
  width: 84px;
  height: 84px;
  max-width: none;
  cursor: pointer;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.6));
  transition: filter 0.16s ease, transform 0.16s ease;
}
.gm-close:hover {
  filter: drop-shadow(0 0 18px rgba(255, 224, 150, 0.9)) brightness(1.1);
  transform: scale(1.05);
}

/* ---------- 弹窗内容（落在评分板内面板亮部） ---------- */
.gm-body {
  position: absolute;
  left: 101px;
  top: 152px;
  right: 102px;
  bottom: 118px;
  display: flex;
  flex-direction: column;
  /* safe center：内容不超高时居中，超高时退化成 start */
  justify-content: safe center;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(200, 160, 90, 0.5) transparent;
}
.gm-body::-webkit-scrollbar {
  width: 8px;
}
.gm-body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgba(200, 160, 90, 0.45);
}
.gm-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  /* 行高整体收紧 */
  padding: 4px 6px;
  border-bottom: 1px solid rgba(216, 178, 106, 0.22);
}
.gm-row:first-child {
  border-top: 1px solid rgba(216, 178, 106, 0.22);
}
/* 紧凑行：分界面背景音那六条，比常规行矮一半 */
.gm-row.mini {
  padding: 4px 6px;
}
.gm-row.mini .gr-txt b {
  font-size: 20px;
  line-height: 1.2;
  letter-spacing: 4px;
}
/* 小标题：把「主音量 / 背景音 / UI 音效」和「各界面背景音」分开 */
.gm-sub {
  margin: 7px 6px 2px;
  font-size: 15px;
  letter-spacing: 3px;
  color: rgba(226, 202, 160, 0.55);
}
.gr-txt {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 0;
}
.gr-txt b {
  font-size: 25px;
  font-weight: 600;
  letter-spacing: 3px;
  color: #f6e8ca;
}
.gr-txt span {
  font-size: 15.5px;
  letter-spacing: 0.6px;
  color: rgba(226, 202, 160, 0.62);
}

/* 开关 */
.sw {
  position: relative;
  flex: 0 0 92px;
  width: 92px;
  height: 42px;
  border-radius: 21px;
  border: 1px solid rgba(214, 178, 106, 0.5);
  background: rgba(0, 0, 0, 0.42);
  cursor: pointer;
  transition: all 0.18s ease;
}
.sw i {
  position: absolute;
  left: 4px;
  top: 4px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(210, 190, 158, 0.75);
  transition: all 0.18s ease;
}
.sw.on {
  border-color: rgba(255, 219, 146, 0.95);
  background: linear-gradient(180deg, rgba(196, 148, 66, 0.9), rgba(140, 100, 40, 0.9));
  box-shadow: 0 0 16px rgba(230, 180, 90, 0.55);
}
.sw.on i {
  left: 54px;
  background: #fff4d8;
  box-shadow: 0 0 10px rgba(255, 238, 196, 0.9);
}
.sw.luck.on {
  background: linear-gradient(180deg, rgba(226, 170, 62, 0.95), rgba(170, 118, 30, 0.95));
  box-shadow: 0 0 22px rgba(255, 200, 90, 0.7);
}
.sw:hover {
  border-color: rgba(255, 226, 160, 0.9);
}

/* 滑杆 */
.gr-slider {
  display: flex;
  align-items: center;
  gap: 18px;
  flex: 0 0 420px;
}
/* 分界面那六行用窄版滑杆 */
.gr-slider.slim {
  flex: 0 0 320px;
  gap: 14px;
}
.gr-slider.slim input[type='range'] {
  width: 246px;
}
.gr-slider.slim .num {
  width: 46px;
  font-size: 21px;
}
.gr-slider input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 340px;
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, rgba(226, 182, 100, 0.85), rgba(226, 182, 100, 0.25));
  outline: none;
  cursor: pointer;
}
.gr-slider input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff3d2, #c79a48 70%, #8d6522);
  border: 1px solid rgba(255, 238, 200, 0.9);
  box-shadow: 0 0 12px rgba(255, 206, 120, 0.8);
  cursor: pointer;
}
.gr-slider .num {
  font-style: normal;
  width: 52px;
  text-align: right;
  font-family: 'NikkiNumber', monospace;
  font-size: 24px;
  color: #ffe4ad;
}

/* 执行按钮 */
.gm-pair {
  display: flex;
  gap: 8px;
  flex: 0 0 auto;
}

.gm-btn {
  flex: 0 0 auto;
  min-width: 112px;
  padding: 10px 26px;
  font-size: 20px;
  letter-spacing: 3px;
  color: #ffe7b6;
  background: rgba(255, 214, 140, 0.08);
  border: 1px solid rgba(222, 182, 106, 0.55);
  cursor: pointer;
  transition: all 0.16s ease;
}
.gm-btn:hover {
  background: rgba(255, 214, 140, 0.18);
  border-color: rgba(255, 226, 160, 0.95);
  box-shadow: 0 0 16px rgba(230, 180, 90, 0.45);
}
.gm-btn.danger {
  color: #ffd0c2;
  border-color: rgba(206, 108, 84, 0.6);
  background: rgba(160, 48, 48, 0.12);
}
.gm-btn.danger:hover {
  background: rgba(180, 60, 50, 0.22);
  border-color: rgba(255, 150, 130, 0.9);
  box-shadow: 0 0 16px rgba(220, 90, 70, 0.45);
}

.gm-note {
  margin: 6px 6px 0;
  font-size: 14px;
  letter-spacing: 1px;
  color: rgba(226, 202, 160, 0.45);
}

/* 存档统计条 */
.gm-stats {
  display: flex;
  align-items: center;
  margin-bottom: 2px;
  padding: 0 8px 6px;
  border-bottom: 1px solid rgba(216, 178, 106, 0.32);
}
.gs-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  border-left: 1px solid rgba(216, 178, 106, 0.18);
}
.gs-item:first-child {
  border-left: 0;
}
.gs-item .num {
  font-family: 'NikkiNumber', monospace;
  font-size: 30px;
  font-style: normal;
  color: #ffe4ad;
  text-shadow: 0 0 22px rgba(240, 190, 100, 0.5);
}
.gs-item span {
  font-size: 14px;
  letter-spacing: 2px;
  color: rgba(226, 202, 160, 0.6);
}

/* ---------- 二级确认（成品条 837×183 → 900×197） ---------- */
.cf-mask {
  position: absolute;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  background: rgba(4, 3, 2, 0.55);
  animation: glFade 140ms ease both;
}
.cf-wrap {
  /* 设置弹窗中部偏上：标题胶囊落在评分板上方留白带 */
  margin-top: 232px;
  display: flex;
  flex-direction: column;
  align-items: center;
  animation: glPop 180ms cubic-bezier(0.2, 0.9, 0.3, 1.1) both;
}
.cf-cap {
  margin: 0 0 12px;
  padding: 7px 22px;
  font-size: 16px;
  letter-spacing: 4px;
  color: #ffe7b6;
  background: rgba(12, 9, 5, 0.86);
  border: 1px solid rgba(226, 190, 120, 0.42);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.6);
}
.cf-bar {
  position: relative;
  width: 900px;
  height: 197px;
  filter: drop-shadow(0 22px 50px rgba(0, 0, 0, 0.72));
}
.cf-art {
  position: absolute;
  inset: 0;
  width: 900px;
  height: 197px;
  max-width: none;
  object-fit: fill;
  pointer-events: none;
}
/* 两个圆钮在成品图里已烘好，这里只叠透明点击区，悬停点亮 */
.cf-btn {
  position: absolute;
  top: 88px;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  transition: box-shadow 0.16s ease, background 0.16s ease, transform 0.12s ease;
}
.cf-btn.cancel {
  left: 269px;
}
.cf-btn.ok {
  left: 533px;
}
.cf-btn:hover {
  background: radial-gradient(circle, rgba(255, 240, 200, 0.3), rgba(255, 220, 150, 0) 72%);
  box-shadow: 0 0 26px rgba(255, 226, 160, 0.85), inset 0 0 14px rgba(255, 236, 190, 0.6);
}
.cf-btn:active {
  transform: scale(0.94);
}

/* ---------- 提示 ---------- */
.gl-toast {
  position: absolute;
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  padding: 14px 34px;
  font-size: 19px;
  letter-spacing: 2px;
  color: #ffe9c2;
  background: rgba(18, 14, 10, 0.92);
  border: 1px solid rgba(226, 190, 120, 0.55);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.55);
  z-index: 90;
}
.gl-toast-enter-active,
.gl-toast-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}
.gl-toast-enter-from,
.gl-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>
