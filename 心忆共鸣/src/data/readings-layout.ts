/* AUTO-GENERATED —— python tools/gen-readings-layout.py，勿手改。层叠顺序即对象键顺序（自底向上） */
export interface RdBox {
  x: number
  y: number
  w: number
  h: number
  /** 旋转角度（度，顺时针为正） */
  rot?: number
  /** 不透明度，缺省 1 */
  op?: number
}

export type RdRegion = 'wish' | 'yizan'

/** 列表行高（= 选中高亮框高度，两区域实测均值） */
export const RD_ROW_H = 71.5

/** 列表首行顶部 y（= 选中高亮框 y） */
export const RD_LIST_TOP = 188.8

export const RD_LAYOUT: Record<RdRegion, Record<string, RdBox>> = {
  wish: {
    bg: { x: -334.2, y: -165.3, w: 2565.6, h: 1425.0 },
    reel: { x: 91.4, y: 115.3, w: 1934.0, h: 903.7 },
    paper: { x: 211.6, y: 165.3, w: 1507.3, h: 774.3 },
    tabpanel: { x: 227.8, y: 97.2, w: 480.7, h: 889.3 },
    label: { x: 287.2, y: 96.1, w: 346.7, h: 68.9, rot: -3.33 },
    arrow: { x: 26.6, y: 12.0, w: 80.0, h: 76.6 },
    topLine: { x: 5.0, y: 94.8, w: 1909.7, h: 2.7 },
    menu: { x: 777.3, y: 0.0, w: 196.5, h: 119.9 },
    magnifier: { x: -152.3, y: 454.8, w: 420.8, h: 722.3 },
    keyE: { x: 1158.9, y: 33.4, w: 33.4, h: 30.7 },
    keyQ: { x: 728.9, y: 32.6, w: 34.8, h: 31.6 },
    papercranes: { x: 1333.6, y: -151.0, w: 511.4, h: 413.8 },
    tabLine1: { x: 279.0, y: 259.3, w: 364.6, h: 3.6 },
    tabLine2: { x: 274.0, y: 330.8, w: 364.6, h: 3.6 },
    selBox: { x: 242.7, y: 188.8, w: 410.0, h: 72.2 },
    egg: { x: 1310.6, y: 590.9, w: 329.1, h: 328.9, op: 0.25 },
  },
  yizan: {
    bg: { x: -194.1, y: -54.0, w: 2303.9, h: 1308.3 },
    maple: { x: 1363.2, y: 0.0, w: 472.3, h: 418.0 },
    reel: { x: 79.2, y: 41.4, w: 2009.6, h: 995.6 },
    lace: { x: 22.8, y: 689.2, w: 1120.5, h: 542.9 },
    paper: { x: 212.3, y: 163.9, w: 1530.3, h: 782.0 },
    tabpanel: { x: 230.5, y: 101.3, w: 475.0, h: 902.0 },
    magnifier: { x: -142.6, y: 436.7, w: 434.6, h: 749.1 },
    topLine: { x: 0.0, y: 97.4, w: 1918.3, h: 3.2 },
    menu: { x: 973.6, y: 0.0, w: 194.8, h: 120.1 },
    keyE: { x: 1171.4, y: 34.0, w: 29.2, h: 32.6 },
    keyQ: { x: 733.8, y: 34.9, w: 35.3, h: 33.8 },
    arrow: { x: 30.0, y: 10.8, w: 75.7, h: 75.6 },
    tabLine1: { x: 277.2, y: 551.7, w: 358.2, h: 4.0 },
    tabLine2: { x: 279.4, y: 627.1, w: 358.2, h: 2.7 },
    spiral: { x: 1832.7, y: 988.7, w: 87.3, h: 79.5 },
    label: { x: 222.6, y: 92.7, w: 381.1, h: 113.9 },
    egg: { x: 1394.8, y: 617.5, w: 329.1, h: 328.9, op: 0.25 },
    selBox: { x: 246.1, y: 188.9, w: 413.6, h: 69.6 },
  },
}
