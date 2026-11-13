# -*- coding: utf-8 -*-
"""从 pxdesk 工程直出阅读物图鉴 1920×1080 精确布局。

来源：素材/界面/博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/图片工程-{心愿原野,伊赞之土}.pxdesk
画布 1400×788 → 实机 1920×1080（x×1.3714286 / y×1.3705584）
输出：src/data/readings-layout.ts（AUTO-GENERATED，勿手改）
"""
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asset_paths import resolve_file  # noqa: E402

# 素材重构：旧目录名 `博物图鉴` → 新结构 `界面/博物图鉴`
# 所以逐文件 resolve，命中新结构就用新结构，否则回落原始素材
BASE_REL = os.path.join("界面", "博物图鉴", "子界面-故事&阅读物 图鉴（两个子界面，但素材相同）")
OUT = os.path.join(SIM, "src", "data", "readings-layout.ts")
SX = 1920 / 1400
SY = 1080 / 788

# 层索引 → 语义键（两个工程层序不同，各自映射）
WISH_MAP = {
    1: "bg", 2: "reel", 3: "paper", 4: "tabpanel", 5: "label",
    6: "arrow", 7: "topLine", 8: "menu", 9: "magnifier",
    10: "keyE", 11: "keyQ", 12: "papercranes",
    13: "tabLine1", 14: "tabLine2", 15: "selBox", 16: "egg",
}
YIZAN_MAP = {
    1: "bg", 2: "maple", 3: "reel", 4: "lace", 5: "paper", 6: "tabpanel",
    7: "magnifier", 8: "topLine", 9: "menu", 10: "keyE", 11: "keyQ",
    12: "arrow", 13: "tabLine1", 14: "tabLine2", 15: "spiral",
    16: "label", 17: "egg", 18: "selBox",
}


def load(name, mapping):
    st = json.load(open(resolve_file(BASE_REL, name), encoding="utf-8"))["state"]
    out = {}
    for i, L in enumerate(st["layers"]):
        if L.get("kind") == "raster":
            continue
        key = mapping.get(i)
        if not key:
            continue
        out[key] = {
            "x": round(L["x"] * SX, 1),
            "y": round(L["y"] * SY, 1),
            "w": round(L["width"] * SX, 1),
            "h": round(L["height"] * SY, 1),
            "rot": round(L.get("rotation") or 0, 2),
            "op": L.get("opacity") if L.get("opacity") is not None else 1,
        }
    return out


def fmt(d):
    lines = []
    for k, v in d.items():
        parts = [f'x: {v["x"]}', f'y: {v["y"]}', f'w: {v["w"]}', f'h: {v["h"]}']
        if v["rot"]:
            parts.append(f'rot: {v["rot"]}')
        if v["op"] != 1:
            parts.append(f'op: {v["op"]}')
        lines.append(f"    {k}: {{ {', '.join(parts)} }},")
    return "\n".join(lines)


def main():
    wish = load("图片工程-心愿原野.pxdesk", WISH_MAP)
    yizan = load("图片工程-伊赞之土.pxdesk", YIZAN_MAP)

    # 行高
    row_h = round(wish["tabLine2"]["y"] - wish["tabLine1"]["y"], 1)

    src = f'''/* AUTO-GENERATED —— python tools/gen-readings-layout.py，勿手改。
 * 来源：素材/博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/图片工程-{{心愿原野,伊赞之土}}.pxdesk
 * 画布 1400×788 → 实机 1920×1080（x×{SX:.7f} / y×{SY:.7f}）
 * 层叠顺序即对象键顺序（自底向上），与 pxdesk 图层顺序一致。
 */
export interface RdBox {{
  x: number
  y: number
  w: number
  h: number
  /** 旋转角度（度，顺时针为正） */
  rot?: number
  /** 不透明度，缺省 1 */
  op?: number
}}

export type RdRegion = 'wish' | 'yizan'

/** 列表行高（= 选中高亮框高度，两区域实测均值） */
export const RD_ROW_H = {row_h}

/** 列表首行顶部 y（= 选中高亮框 y） */
export const RD_LIST_TOP = {wish["selBox"]["y"]}

export const RD_LAYOUT: Record<RdRegion, Record<string, RdBox>> = {{
  wish: {{
{fmt(wish)}
  }},
  yizan: {{
{fmt(yizan)}
  }},
}}
'''
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8", newline="\n").write(src)
    print(f"OK -> {OUT}")
    print(f"   wish layers={len(wish)}  yizan layers={len(yizan)}  row_h={row_h}")


if __name__ == "__main__":
    main()
