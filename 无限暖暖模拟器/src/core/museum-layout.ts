/**
 * 博物图鉴 · 故事 / 阅读物子界面共用的派生几何（单一真源）。
 *
 * 两视图原先各有一份逐字相同的 5 个 layout computed；这里收敛为纯函数，
 * 函数体逐字等价（仅 `L.value` → 参数 `L`），算法与返回值一律不改。
 */
import { RD_LAYOUT, RD_ROW_H, RD_LIST_TOP } from '@/data/readings-layout'
import type { RdBox } from '@/data/readings-layout'

export interface RdLayoutStyles {
  listH: number
  rowHiStyle: Record<string, string>
  rowLineStyle: Record<string, string>
  contentStyle: Record<string, string>
  emptyStickerStyle: Record<string, string>
}

/** 由 `RD_LAYOUT[region]` 算出 5 个派生几何值（与原 computed 完全一致）。 */
export function rdLayout(L: Record<string, RdBox>): RdLayoutStyles {
  /** 列表可视高度 */
  const tp = L.tabpanel
  const listH = Math.round(tp.y + tp.h - RD_LIST_TOP - 74)

  /** 行内高亮框 */
  const b = L.selBox
  const rowHiStyle: Record<string, string> = {
    left: '0px',
    top: '0px',
    width: b.w + 'px',
    height: b.h + 'px',
  }

  /** 行内分隔线（tabLine1 相对 selBox） */
  const s = L.selBox
  const t = L.tabLine1
  const rowLineStyle: Record<string, string> = {
    left: t.x - s.x + 'px',
    top: RD_ROW_H - 2 + 'px',
    width: t.w + 'px',
    height: '3px',
  }

  /** 正文容器（paper 右页内，书脊 x≈505/1520） */
  const p = L.paper
  const spine = p.x + (505 / 1520) * p.w // 右页左边界
  const contentStyle: Record<string, string> = {
    left: Math.round(spine + 22) + 'px',
    top: Math.round(p.y + 20) + 'px',
    width: Math.round(p.x + p.w - spine - 42 - 32) + 'px',
    height: Math.round(p.h - 40 - 38) + 'px',
  }

  /** 空态贴纸：按 240×240 素材有效像素底边（y=232）对齐纸面底 */
  const h = 621.6
  const ART_BOTTOM = 232 / 240
  const nudge = L === RD_LAYOUT.yizan ? 0 : 0 // 占位：真实判断见下
  const emptyStickerStyle: Record<string, string> = {
    left: '864px',
    top: Math.round(p.y + p.h - h * ART_BOTTOM + nudge) + 'px',
    width: '642.7px',
    height: h + 'px',
  }

  return { listH, rowHiStyle, rowLineStyle, contentStyle, emptyStickerStyle }
}
