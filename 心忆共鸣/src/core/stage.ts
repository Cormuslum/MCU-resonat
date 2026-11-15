/** 舞台缩放 */

/** 设计舞台尺寸（所有界面的坐标基准） */
export const DESIGN_W = 1920
export const DESIGN_H = 1080

/** 当前缩放比（屏幕像素 / 设计像素）。与 `App.vue` 的 `fitStage()` 是同一套算法，两边必须一致 */
export function stageScale(): number {
  if (typeof window === 'undefined') return 1
  return Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
}

/** 屏幕像素 → 设计像素（单个坐标） */
export function toDesignX(clientX: number): number {
  return (clientX - (window.innerWidth - DESIGN_W * stageScale()) / 2) / stageScale()
}

/** 屏幕像素 → 设计像素（Y 方向） */
export function toDesignY(clientY: number): number {
  return (clientY - (window.innerHeight - DESIGN_H * stageScale()) / 2) / stageScale()
}

/** 指针的**位移** → 设计位移 */
export function toDesignDelta(delta: number): number {
  return delta / stageScale()
}
