/** 存档：localStorage 道具与货币无限，不记数量；只记保底进度、图鉴、里程碑领取、抽卡历史 */
import type { BgmScene, PityState } from '@/types'

const KEY = 'nikki-resonance-save-v1'

export interface SaveData {
  version: 1
  /**
   * 当前版本（如 `2.10`）：共鸣页只列这个版本的服装阁；空串 = 还没选过，此时共鸣入口置灰。
   * 与 `version: 1`（存档结构版本号）不是一回事。
   */  selectedVersion: string
  pity: Record<string, PityState>
  /** 部件 ID → 获得次数与首次时间 */
  codex: Record<string, { count: number; firstAt: number }>
  /** bannerId → 已领取的里程碑抽数 */
  milestoneClaimed: Record<string, number[]>
  /** 抽卡流水（持久化）：最多保留 500 条，按 `banner` 逐池裁剪；`name` / `star` 为抽到时的快照 */
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
    bgm: boolean
    /** 背景音音量 0~1（音量·2） */
    bgmVol: number
    /** 各界面背景音 0~1 */
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
    /** 欧皇模式 */
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
      // 老存档没有 selectedVersion → 按「还没选过」处理
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

/** 逐池裁剪抽卡流水 */
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
    // 必须**逐池**截断
    data.history = trimHistory(data.history)
    localStorage.setItem(KEY, JSON.stringify(data))
  } catch (e) {
    console.warn('存档写入失败', e)
  }
}


/* ────────────────────────────── 存档备份（导出 / 导入） ────────────────────────────── */

/** 导出文件的**外壳**：`app` / `kind` / `schema` 用于识别「这不是存档」以及判断是否需要迁移 */
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

/** 把存档包成可下载的文本（带缩进） */
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

/** 解析导入的文本；接受带外壳的（本程序导出的）和裸 `SaveData`（手工拼的）两种写法 */
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
  if (typeof obj.app === 'string' && obj.app !== SAVE_APP) {
    return { ok: false, error: `这是「${obj.app}」的存档，不是本模拟器的` }
  }
  const data = (obj.data ?? obj) as Record<string, unknown>
  if (!data || typeof data !== 'object') {
    return { ok: false, error: '文件里没有存档数据' }
  }
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
