/**
 * DLC 挂载接口定义：包只声明实现了哪些接口，模拟器只认接口名。清单（与 `updater/lib/dlc.mjs` 的 INTERFACES 一一对应）：
 * pool.banner / pool.set / codex.story / codex.reading / version.banner
 */

export const DLC_INTERFACES = {
  'pool.banner': {
    label: '服装阁',
    desc: '往共鸣页挂一整只新服装阁（含套装）',
    /** 数据文件名（相对包根 data/ 目录） */
    data: 'pool.banner.json',
  },
  'pool.set': {
    label: '套装',
    desc: '往指定服装阁里追加一套服装',
    data: 'pool.set.json',
  },
  'codex.story': {
    label: '故事',
    desc: '往故事图鉴追加一篇套装故事',
    data: 'codex.story.json',
  },
  'codex.reading': {
    label: '阅读物',
    desc: '往阅读物图鉴追加一篇',
    data: 'codex.reading.json',
  },
  'version.banner': {
    label: '版本',
    desc: '往版本页追加一个小版本（含缩略图与大图）',
    data: 'version.banner.json',
  },
} as const

export type DlcInterfaceId = keyof typeof DLC_INTERFACES

export const DLC_INTERFACE_IDS = Object.keys(DLC_INTERFACES) as DlcInterfaceId[]

/** 包清单里的一条「我提供了这个接口」 */
export interface DlcProvide {
  interface: string
  /** 是否挂载 —— 包自己说了算 */
  mount?: boolean
  /** 数据文件（相对包根） */
  data?: string
  /** 额外参数（如 pool.set 挂在哪座阁） */
  options?: Record<string, unknown>
}

/** 一个 DLC 包的清单 */
export interface DlcManifest {
  schema: string
  id: string
  name: string
  version: string
  author?: string
  description?: string
  createdAt?: string
  /** 对模拟器的最低版本要求 */
  requires?: { simulator?: string }
  /** 整包的默认挂载状态 */
  mount?: { enabled?: boolean }
  provides?: DlcProvide[]
}

/** 运行区索引：装了哪些包、每个包现在挂不挂 */
export interface DlcIndex {
  updatedAt?: string
  packages?: Array<{
    id: string
    name?: string
    version?: string
    /** 整包开关 */
    enabled?: boolean
    /** 接口级开关（覆盖包内的 provides[].mount） */
    interfaces?: Record<string, boolean>
    installedAt?: string
    source?: string
  }>
}

/** 运行区里一个已挂载包的运行时形态 */
export interface DlcRuntime {
  id: string
  name: string
  version: string
  /** 该包当前实际挂载的接口 */
  mounted: DlcInterfaceId[]
  /** 挂了哪些数据（接口 → 解析后的 JSON） */
  data: Partial<Record<DlcInterfaceId, unknown>>
  /** 加载过程中的提示（缺文件、版本不符等） */
  notes: string[]
}
