/**
 * 存档：localStorage
 * 道具与货币无限，不记数量；只记保底进度、图鉴、里程碑领取、抽卡历史。
 */
import type { BgmScene, PityState } from '@/types'

const KEY = 'nikki-resonance-save-v1'

export interface SaveData {
  version: 1
  /**
   * 当前版本（如 `2.10`），v1.4.02 起。
   *
   * 语义：**「时隙遗光」里选定的那个版本**，共鸣页只列这个版本的服装阁。
   * 空串 = 还没选过（首次进入 / 老存档升级），此时共鸣入口置灰、直达 `/banner` 会被打回版本页。
   * 注意与上面的 `version: 1`（存档结构版本号）不是一个东西。
   */
  selectedVersion: string
  /** bannerId → 保底状态（各池独立，不继承） */
  pity: Record<string, PityState>
  /** 部件 ID → 获得次数与首次时间 */
  codex: Record<string, { count: number; firstAt: number }>
  /** bannerId → 已领取的里程碑抽数 */
  milestoneClaimed: Record<string, number[]>
  /** 抽卡历史（最多保留 500 条） */
  /**
   * 抽卡流水（**持久化**，跟着存档走）。
   *
   * `banner` 是归属服装阁 —— 共鸣详情的「抽取记录」只显示**当前池**的流水（v1.3.05 起），
   * 所以这里必须逐池裁剪，不能按总条数一刀切（否则抽得多的池会把别的池挤空）。
   * `name` / `star` 是 v1.3.04 加的快照字段（抽到时就把显示名和星级存下来）——
   * 按 part id 回查当前池是查不到的；老存档没有这两个字段，渲染时回退到 id 的部件名部分。
   */
  history: Array<{
    banner: string
    rarity: number
    part: string
    /** 部件显示名（快照） */
    name?: string
    /** 星级（快照） */
    star?: number
    at: number
  }>
  settings: {
    /** 是否跳过抽卡动画（演出·1） */
    skipAnim: boolean
    /** 主音量 0~1 */
    volume: number
    /** 是否播放 BGM（由「背景音」滑杆是否 >0 派生，见 SettingsView.onBgmVol） */
    bgm: boolean
    /** 背景音音量 0~1（音量·2） */
    bgmVol: number
    /**
     * 各界面背景音 0~1（音量·4，v2.4.01）。
     * 串在 bgmVol 下面：最终电平 = 基准 × bgmVol × bgmScene[场景] × volume（主音量）。
     * 缺省（老存档没有这个字段）按全 1 处理。
     */
    bgmScene: Partial<Record<BgmScene, number>>
    /** UI 音效音量 0~1（音量·3） */
    uiVol: number
    /** 跳过单抽动画：单抽详情入场动效期间双击即结束（演出·2） */
    skipSingleAnim: boolean
    /** 跳过「恭喜获得」弹窗（演出·3） */
    skipReward: boolean
    /** 跳过开屏动画（演出·4） */
    skipOpening: boolean
    /** 跳过抽卡演出：点抽卡直接结算，不进单抽/十连界面（演出·5） */
    skipGacha: boolean
    /** 欧皇模式：5★/4★ 概率 ×3（快捷·3） */
    lucky: boolean
  }
}

function blank(): SaveData {
  return {
    version: 1,
    selectedVersion: '',
    pity: {},
    codex: {},
    milestoneClaimed: {},
    history: [],
    settings: {
      skipAnim: false,
      volume: 0.7,
      bgm: true,
      bgmVol: 0.7,
      bgmScene: { home: 1, versions: 1, banner: 1, codex: 1, almanac: 1, gloria: 1 },
      uiVol: 0.8,
      skipSingleAnim: false,
      skipReward: false,
      skipOpening: false,
      skipGacha: false,
      lucky: false,
    },
  }
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return blank()
    const data = JSON.parse(raw) as SaveData
    return {
      ...blank(),
      ...data,
      // 老存档 / 手工改坏的存档可能没有 history 或不是数组，兜一下免得后面 .filter 崩
      history: Array.isArray(data.history) ? data.history : [],
      // 老存档没有 selectedVersion（v1.4.02 才有）→ 按「还没选过」处理，逼一次版本选择
      selectedVersion: typeof data.selectedVersion === 'string' ? data.selectedVersion : '',
      settings: { ...blank().settings, ...(data.settings ?? {}) },
    }
  } catch {
    return blank()
  }
}

/** 每座服装阁各自保留的流水条数（共鸣详情只显示最近 50，留 200 足够回溯） */
const PER_BANNER = 200
/** 全存档流水硬上限（localStorage 兜底） */
const HISTORY_CAP = 4000

/**
 * 逐池裁剪抽卡流水。
 *
 * 以前的写法是 `slice(-500)` —— 全池共用一个名额，抽得多的池会把别的池的历史整段挤掉，
 * 换成按池各自截断之后，每个池的记录只会被**本池**的新记录淘汰。
 * 截完再按时间重排回去（原数组本来就是追加顺序，重排只是防止裁剪打乱顺序）。
 */
function trimHistory(list: SaveData['history']): SaveData['history'] {
  if (list.length <= PER_BANNER) return list
  const byBanner = new Map<string, SaveData['history']>()
  for (const it of list) {
    const arr = byBanner.get(it.banner)
    if (arr) arr.push(it)
    else byBanner.set(it.banner, [it])
  }
  const kept: SaveData['history'] = []
  for (const arr of byBanner.values()) kept.push(...arr.slice(-PER_BANNER))
  kept.sort((a, b) => a.at - b.at)
  return kept.slice(-HISTORY_CAP)
}

export function writeSave(data: SaveData): void {
  try {
    // 历史太长会撑爆 localStorage，但必须**逐池**截断（否则抽得多的池会把别的池挤空）
    data.history = trimHistory(data.history)
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('存档写入失败', e)
  }
}


/* ────────────────────────────── 存档备份（导出 / 导入） ────────────────────────────── */

/**
 * 导出文件的**外壳**。
 *
 * 只导出裸 `SaveData` 也能用，但加上 `app` / `kind` / `schema` 之后：
 * ① 用户误把别的 JSON 拖进来时能一眼看出「这不是存档」；
 * ② 以后存档结构真要升级，有 `schema` 可以判断该不该迁移。
 */
export interface SaveFile {
  app: 'nikki-resonance'
  kind: 'save'
  /** 存档结构版本（与 SaveData.version 同步） */
  schema: number
  /** 导出时间（ISO），仅供人看 */
  exportedAt: string
  data: SaveData
}

export const SAVE_APP = 'nikki-resonance'

/** 把存档包成可下载的文本（带缩进，方便用户自己打开看一眼） */
export function toSaveFileText(data: SaveData): string {
  const file: SaveFile = {
    app: SAVE_APP,
    kind: 'save',
    schema: data.version,
    exportedAt: new Date().toISOString(),
    data,
  }
  return JSON.stringify(file, null, 2)
}

/**
 * 解析导入的文本。**宁严勿松** —— 导入错文件会把玩家累积的进度直接覆盖掉。
 *
 * 接受两种写法：带外壳的（本程序导出的）和裸 `SaveData`（手工拼的 / 早期版本）。
 * 校验只做「结构上像不像」，具体字段仍走 `loadSave` 那套兜底合并。
 */
export function parseSaveFileText(text: string): { ok: true; data: SaveData } | { ok: false; error: string } {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: '这个文件不是有效的 JSON' }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: '文件内容不是存档对象' }
  }
  const obj = raw as Record<string, unknown>
  // 带外壳的：app 对不上就直说，别让用户以为是文件坏了
  if (typeof obj.app === 'string' && obj.app !== SAVE_APP) {
    return { ok: false, error: `这是「${obj.app}」的存档，不是本模拟器的` }
  }
  const data = (obj.data ?? obj) as Record<string, unknown>
  if (!data || typeof data !== 'object') {
    return { ok: false, error: '文件里没有存档数据' }
  }
  // 至少要有一个存档字段，否则多半是随手拖进来的其它 JSON
  const looksLikeSave = ['pity', 'codex', 'history', 'settings', 'selectedVersion']
    .some((k) => k in data)
  if (!looksLikeSave) {
    return { ok: false, error: '文件里没有可识别的存档内容（保底 / 图鉴 / 记录都没有）' }
  }
  // 缺字段的（老版本导出）按 blank() 补齐，与 loadSave 的口径一致
  const part = data as Partial<SaveData>
  const merged: SaveData = {
    ...blank(),
    ...part,
    history: Array.isArray(part.history) ? part.history : [],
    selectedVersion: typeof part.selectedVersion === 'string' ? part.selectedVersion : '',
    settings: { ...blank().settings, ...(part.settings ?? {}) },
  }
  return { ok: true, data: merged }
}
export function resetSave(): void {
  localStorage.removeItem(KEY)
}
