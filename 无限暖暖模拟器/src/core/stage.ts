/**
 * 舞台缩放（v1.6.02）
 *
 * 所有界面统一按 1920×1080 设计坐标写死，外层 `.design` 做一次等比缩放
 * （见 `App.vue` 的 `fitStage()`）。这样内部元素的 px 就是设计 px。
 *
 * ⚠ **由此产生的一个陷阱**：浏览器的 `PointerEvent.clientX/clientY` 是
 * **屏幕像素**，而组件里的布局值是**设计像素**。在 1920×1080 的屏上
 * 两者 1:1，但在 2560×1440 / 3840×2160 上差一个 scale 倍。
 *
 * 直接拿 clientX 差值当设计坐标用，后果是**拖拽在高分辨率上跑得更快**：
 *
 *     指针移 200 屏幕px  →  期望轨道移 200/scale 设计px
 *     实际（未换算）    →  轨道移 200 设计px      ← 4K 下快了 2 倍
 *
 * 所以凡是「用指针位移驱动元素位移」的地方，都要先除以 scale。
 * 本模块提供统一的换算，避免每个组件各写一遍。
 */

/** 设计舞台尺寸（所有界面的坐标基准） */
export const DESIGN_W = 1920
export const DESIGN_H = 1080

/**
 * 当前缩放比（屏幕像素 / 设计像素）。
 *
 * 与 `App.vue` 的 `fitStage()` 是同一套算法，但这里独立算一遍 ——
 * 组件里需要的是「指针位移 → 设计位移」的换算，不该依赖 App 的 ref。
 * 两边算法必须一致，否则拖拽会有细微偏差。
 */
export function stageScale(): number {
  if (typeof window === 'undefined') return 1
  return Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H)
}

/**
 * 屏幕像素 → 设计像素（单个坐标）。
 *
 * 需要减去 design 舞台居中后的黑边偏移 —— 非 16:9 屏幕（如 21:9）下
 * 舞台是居中的，偏移不为 0。
 */
export function toDesignX(clientX: number): number {
  return (clientX - (window.innerWidth - DESIGN_W * stageScale()) / 2) / stageScale()
}

/** 屏幕像素 → 设计像素（Y 方向） */
export function toDesignY(clientY: number): number {
  return (clientY - (window.innerHeight - DESIGN_H * stageScale()) / 2) / stageScale()
}

/**
 * 指针的**位移** → 设计位移。
 *
 * 拖拽场景用这个：位移是相对量，只需除以 scale，不用管黑边偏移。
 * ★ 这是拖拽类代码最该用的函数。
 */
export function toDesignDelta(delta: number): number {
  return delta / stageScale()
}
