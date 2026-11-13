/**
 * 「辉煌心光」四个交互区的命中框（1920×1080 设计坐标，**自动生成，勿手改**）：
 * 由 `tools/prep-gloria.py` 按图标 alpha 实体框各边外扩 16px 得出。
 */
export type GloriaKey = 'stage' | 'volume' | 'quick' | 'save'

export interface GloriaHot {
  key: GloriaKey
  /** 中文名，仅用于 title 提示与无障碍 */
  label: string
  x: number
  y: number
  w: number
  h: number
}

export const GLORIA_HOTS: GloriaHot[] = [
  { key: 'stage', label: '演出', x: 1061, y: 677, w: 142, h: 152 },
  { key: 'volume', label: '音量', x: 944, y: 504, w: 139, h: 137 },
  { key: 'quick', label: '快捷', x: 1183, y: 470, w: 116, h: 117 },
  { key: 'save', label: '存档', x: 1300, y: 705, w: 99, h: 99 },
]
