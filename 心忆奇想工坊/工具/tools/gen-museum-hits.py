# -*- coding: utf-8 -*-
"""
由用户拆分好的「交互项」PNG（alpha 通道）生成博物图鉴主界面的**热区多边形**。

为什么这么做：
  CSS 的 `mask-image` / `pointer-events` 都**不按 alpha 判定命中**（只认盒子），
  想让点击区域贴合物体轮廓，只能把 alpha 轮廓 traced 成多边形再喂 `clip-path: polygon()`。
  红笔描边 JSON 是手工描的，比真实 alpha 外扩；这里直接从拆分图取，边界更准。

算法：alpha≥128 → 降采样 4× → 3×3 膨胀 1 次（合并近邻碎片）→ Moore 邻域外轮廓追踪
      → RDP 简化（eps=2.2 降采样像素）→ 换算到 1920×1080。

输出：`src/data/museum-hits.ts`（`HITS[region][item] = [[x,y], ...]`）

用法：python tools/gen-museum-hits.py
"""
import io
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：无限暖暖模拟器（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "无限暖暖模拟器")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asset_paths import resolve  # noqa: E402

# 素材重构：旧目录名 `博物图鉴` → 新结构 `界面/博物图鉴`。
# ⚠ 找不到源图时**必须直接报错退出**，否则会把 museum-hits.ts 写成空对象、
# 悄悄丢掉图鉴的全部热区（ 踩过这个坑）。
SRC = resolve(os.path.join("界面", "博物图鉴", "主界面", "拆分"))
if not os.path.isdir(SRC):
    raise SystemExit(f"✗ 找不到热区拆分图目录：{SRC}")
OUT = os.path.join(SIM, "src", "data", "museum-hits.ts")

BASE_W, BASE_H = 2732, 1536          # 拆分图原始画布
OUT_W, OUT_H = 1920, 1080            # 目标坐标系
DS = 4                               # 降采样倍数
ALPHA_TH = 128
RDP_EPS = 2.2

REGIONS = {"心愿原野": "wish", "伊赞之土": "yizan"}
ITEMS = {"服装图鉴": "clothes", "故事图鉴": "story", "阅读物图鉴": "reading", "放大镜": "search"}


# ---------------------------------------------------------------- 轮廓
def dilate(m, times=1):
    """3×3 膨胀（numpy 位移实现，避免依赖 scipy）"""
    for _ in range(times):
        p = np.zeros_like(m)
        p[1:, :] |= m[:-1, :]
        p[:-1, :] |= m[1:, :]
        p[:, 1:] |= m[:, :-1]
        p[:, :-1] |= m[:, 1:]
        p[1:, 1:] |= m[:-1, :-1]
        p[1:, :-1] |= m[:-1, 1:]
        p[:-1, 1:] |= m[1:, :-1]
        p[:-1, :-1] |= m[1:, 1:]
        m = m | p
    return m


DIRS = [(-1, 0), (-1, 1), (0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1)]


def moore_trace(m):
    """Moore 邻域外轮廓追踪（起点 = 最上一行最左的实心像素，backtrack 从西边开始）"""
    h, w = m.shape
    ys, xs = np.where(m)
    if len(ys) == 0:
        return []
    sy = int(ys.min())
    sx = int(xs[ys == sy].min())

    contour = [(sx, sy)]
    back = 6                     # 上一格的来向：西
    cur = (sx, sy)
    for _ in range(h * w):
        moved = False
        for k in range(8):
            i = (back + 1 + k) % 8
            nx, ny = cur[0] + DIRS[i][1], cur[1] + DIRS[i][0]
            if 0 <= ny < h and 0 <= nx < w and m[ny, nx]:
                contour.append((nx, ny))
                back = (i + 4) % 8
                cur = (nx, ny)
                moved = True
                break
        if not moved:
            break
        if cur == (sx, sy) and len(contour) > 8:
            break
    return contour


def rdp(pts, eps):
    """Ramer–Douglas–Peucker 折线简化"""
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    norm = (dx * dx + dy * dy) ** 0.5 or 1e-9
    idx, dmax = 0, -1.0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        d = abs(dy * (px - x1) - dx * (py - y1)) / norm
        if d > dmax:
            idx, dmax = i, d
    if dmax > eps:
        left = rdp(pts[: idx + 1], eps)
        right = rdp(pts[idx:], eps)
        return left[:-1] + right
    return [pts[0], pts[-1]]


def contour_of(path):
    im = Image.open(path).convert("RGBA")
    a = np.asarray(im.split()[3])
    m = a >= ALPHA_TH
    small = np.asarray(
        Image.fromarray((m * 255).astype(np.uint8)).resize(
            (BASE_W // DS, BASE_H // DS), Image.NEAREST
        )
    ) > 127
    small = dilate(small, 1)
    pts = moore_trace(small)
    if len(pts) > 4 and pts[0] == pts[-1]:
        pts = pts[:-1]
    pts = rdp(pts, RDP_EPS)
    # 降采样 px → 1920 坐标系
    k = DS * (OUT_W / BASE_W)
    return [[round(x * k, 1), round(y * k, 1)] for x, y in pts]


def main():
    out = {}
    for zh_region, en_region in REGIONS.items():
        out[en_region] = {}
        for zh_item, en_item in ITEMS.items():
            p = os.path.join(SRC, f"{zh_region}-{zh_item}.png")
            if not os.path.exists(p):
                print(f"  [缺失] {os.path.basename(p)}")
                continue
            poly = contour_of(p)
            out[en_region][en_item] = poly
            xs = [q[0] for q in poly]
            ys = [q[1] for q in poly]
            print(f"  {zh_region}-{zh_item}: {len(poly)} 点  bbox=({min(xs):.0f},{min(ys):.0f})-({max(xs):.0f},{max(ys):.0f})")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    body = json.dumps(out, ensure_ascii=False, indent=0).replace('"', "'")
    with io.open(OUT, "w", encoding="utf-8") as f:
        f.write(
            "/* 自动生成，勿手改 —— python tools/gen-museum-hits.py\n"
            " * 来源：素材/博物图鉴/主界面/拆分/<区域>-<交互项>.png 的 alpha 轮廓\n"
            " * 坐标已换算到 1920×1080；供 MuseumView 的 clip-path: polygon() 使用。 */\n"
            "export type Pt = [number, number]\n"
            "export type MuseumHitKey = 'clothes' | 'story' | 'reading' | 'search'\n\n"
            f"export const HITS: Record<'wish' | 'yizan', Record<MuseumHitKey, Pt[]>> = {body}\n"
        )
    print(f"[OK] 已生成 {OUT}")


if __name__ == "__main__":
    main()
