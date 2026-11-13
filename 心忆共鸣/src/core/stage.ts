/**
 * 舞台缩放：界面一律按 1920×1080 设计坐标写死，外层 `.design` 统一等比缩放（见 `App.vue` 的 `fitStage()`）。
 * ⚠ `PointerEvent.clientX/clientY` 是屏幕像素，用指针位移驱动布局时先除以 scale。
 */

/** 设计舞台尺寸（所有界面的坐标基准） */
export const DESIGN_W = 1920
export const DESIGN_H = 1080

/**
 * 当前缩放比（屏幕像素 / 设计像素）。
 * 与 `App.vue` 的 `fitStage()` 是同一套算法，两边必须一致。
 */
export function stageScale(): number {
  if (typeof window === 'undefined') return 1
  return Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
}

/**
 * 屏幕像素 → 设计像素（单个坐标）。
 * 需要减去 design 舞台居中后的黑边偏移 —— 非 16:9 屏幕下舞台是居中的，偏移不为 0。
 */
export function toDesignX(clientX: number): number {
  return (clientX - (window.innerWidth - DESIGN_W * stageScale()) / 2) / stageScale()
}

/** 屏幕像素 → 设计像素（Y 方向） */
export function toDesignY(clientY: number): number {
  return (clientY - (window.innerHeight - DESIGN_H * stageScale()) / 2) / stageScale()
}

/**
 * 指针的**位移** → 设计位移。拖拽场景用这个：位移是相对量，只需除以 scale。
 */
export function toDesignDelta(delta: number): number {
  return delta / stageScale()
}
