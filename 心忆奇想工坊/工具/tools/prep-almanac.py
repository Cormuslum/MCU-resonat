# -*- coding: utf-8 -*-
"""
prep-almanac.py —— 玄学运势（书桌 + 卷轴）素材预处理

权威依据：`素材/玄学运势/玄学运势-详细设定.md` + 两个 pxdesk 工程。
v1.1.01 起改用用户新提供的高清素材（`素材/卷轴/` 与 `素材/卷轴筒、笔、笔架/`），
并把所有素材**裁到 alpha 实体框**——这样「不计透明通道」的贴合关系在 CSS 里就是
「图片边缘 == 实体边缘」，轴杆中心压纸面边缘、闭合态两杆紧贴都能精确对齐。

尺寸口径：
    纸面 1668×956 @(105,46)   ← v1.1.02 按用户要求「稍微压缩纸面高度」
    轴杆 高 956（与纸面等高、同 y，轴杆上下端与纸边齐平），宽度按素材自身比例
    桶   720×717 @(-197,439)；墨台 329×329 @(348,770) op.7；返回键 184×169 @(0,0)

产出目录：`素材/玄学运势/素材/工程产出/`（不覆盖原素材）
另产出 `src/data/almanac-hits.ts`（中/欧两套卷轴按钮的 alpha 轮廓掩码）

用法：python tools/prep-almanac.py
"""
import os

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：无限暖暖模拟器（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "无限暖暖模拟器")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
SRC = os.path.join(ROOT, "素材", "玄学运势", "素材")
DST = os.path.join(SRC, "工程产出")

# ---- 实机尺寸（px @1920×1080） -----------------------------------------
PAPER_W, PAPER_H = 1668, 956
AXLE_H = 956
BASKET_W, BASKET_H = 720, 717
INK_W, INK_H = 329, 329

MASK_GRID = 64  # 命中掩码 64×64 网格

# ---- 三套「纸面 + 轴杆」（按序号配对，按日期哈希轮换 60/20/20） --------
SCROLL_SETS = [
    ("卷轴/纸面1.webp", "卷轴/轴杆1.webp", "1"),
    ("卷轴/纸面2.webp", "卷轴/轴杆2.webp", "2"),
    ("卷轴/纸面3.webp", "卷轴/轴杆3.webp", "3"),
]

# ---- 两种场景风格（各 50%）：桶 + 四卷轴拆分 + 墨台 + 书写笔 -----------
# 拆分图按 x 位置对应：-1 最左 → 过往，-2 → 今日，-4 → 生辰引导，-3 最右 → 未来
STYLES = {
    "eu": {
        "basket": "卷轴筒、笔、笔架/a1770001.png",
        "splits": {
            "past": "卷轴筒、笔、笔架/a1770001-1.png",
            "today": "卷轴筒、笔、笔架/a1770001-2.png",
            "bazi": "卷轴筒、笔、笔架/a1770001-4.png",
            "future": "卷轴筒、笔、笔架/a1770001-3.png",
        },
        "ink": "卷轴筒、笔、笔架/1170000085.png",
        "quill": "卷轴筒、笔、笔架/1-250F5133U050B.png",
    },
    "cn": {
        "basket": "卷轴筒、笔、笔架/a1770002.png",
        "splits": {
            "past": "卷轴筒、笔、笔架/a1770002-1.png",
            "today": "卷轴筒、笔、笔架/a1770002-2.png",
            "bazi": "卷轴筒、笔、笔架/a1770002-4.png",
            "future": "卷轴筒、笔、笔架/a1770002-3.png",
        },
        "ink": "卷轴筒、笔、笔架/1170000085-2.png",
        "quill": "卷轴筒、笔、笔架/2-250F5133U050B.png",
    },
}

# 七档运势艺术字（缺「大凶」，运行时用「凶」+ 暗红滤镜兜底）
TIER_ARTS = [
    ("大吉", "艺术字/大吉_鎏金.webp", "tier-great.png"),
    ("吉", "艺术字/吉_石绿.webp", "tier-good.png"),
    ("小吉", "艺术字/小吉_霁青.webp", "tier-minor-good.png"),
    ("平", "艺术字/平_黛蓝.webp", "tier-neutral.png"),
    ("小凶", "艺术字/小凶_杏黄深.webp", "tier-minor-bad.png"),
    ("凶", "艺术字/凶_胭脂.webp", "tier-bad.png"),
]


def ensure_dir(p):
    os.makedirs(p, exist_ok=True)


def load(name):
    p = os.path.join(SRC, name)
    if not os.path.exists(p):
        raise SystemExit("缺少素材：" + p)
    return Image.open(p).convert("RGBA")


def save(im, name):
    p = os.path.join(DST, name)
    im.save(p, "PNG", optimize=True)
    print(f"  → {name}  {im.width}×{im.height}")
    return p


def trim(im, th=8):
    """裁到 alpha 实体框（关键：让「图片边缘 == 实体边缘」）"""
    al = im.getchannel("A").point(lambda v: 255 if v > th else 0)
    box = al.getbbox()
    return im.crop(box) if box else im


def fit_into(im, w, h):
    """等比缩放到 w×h 内并居中，输出恰好 w×h 的透明画布"""
    s = min(w / im.width, h / im.height)
    nw, nh = max(1, round(im.width * s)), max(1, round(im.height * s))
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.alpha_composite(im.resize((nw, nh), Image.LANCZOS), ((w - nw) // 2, (h - nh) // 2))
    return out


def lighten(im, alpha=0.30, color=(251, 243, 224)):
    """叠一层米色提亮（`纸面3` 做旧过重，深棕墨字压不住）"""
    veil = Image.new("RGBA", im.size, color + (int(255 * alpha),))
    out = im.copy()
    out.alpha_composite(veil)
    return out


def alpha_mask(im, grid=MASK_GRID, th=40):
    """alpha 轮廓栅格化成 grid×grid 位掩码；每行 16 进制（bit gx = 第 gx 列）"""
    a = im.getchannel("A")
    cell = im.width / grid
    rows = []
    for gy in range(grid):
        bits = 0
        y0, y1 = int(gy * cell), max(int(gy * cell) + 1, int((gy + 1) * cell))
        for gx in range(grid):
            x0, x1 = int(gx * cell), max(int(gx * cell) + 1, int((gx + 1) * cell))
            if a.crop((x0, y0, x1, y1)).getextrema()[1] > th:
                bits |= 1 << gx
        rows.append(bits)
    # 膨胀 1 格（≈11px @720 显示）：细长纸卷轮廓太窄，纯 alpha 命中率太低
    grown = []
    for gy in range(grid):
        bits = rows[gy]
        for dy in (-1, 0, 1):
            yy = gy + dy
            if 0 <= yy < grid:
                bits |= rows[yy] | (rows[yy] << 1) | (rows[yy] >> 1)
        grown.append(bits & ((1 << grid) - 1))
    return [f"{b:016x}" for b in grown]


def main():
    ensure_dir(DST)

    print("== 卷轴纸面（裁实体框 → 拉伸到 1668×956）+ 轴杆（裁实体框，高 956） ==")
    axle_widths = []
    for paper, axle, idx in SCROLL_SETS:
        p = trim(load(paper))
        if idx == "3":
            p = lighten(p)
        save(p.resize((PAPER_W, PAPER_H), Image.LANCZOS), f"paper-{idx}.png")

        a = trim(load(axle))
        w = max(1, round(a.width * AXLE_H / a.height))
        axle_widths.append(w)
        save(a.resize((w, AXLE_H), Image.LANCZOS), f"axle-{idx}.png")

    print("== 两种风格：收纳桶 + 四卷轴拆分（720×717，与源同框） ==")
    masks = {}
    for style, cfg in STYLES.items():
        b = load(cfg["basket"])
        save(b.resize((BASKET_W, BASKET_H), Image.LANCZOS), f"basket-{style}.png")
        masks[style] = {}
        for key, path in cfg["splits"].items():
            src = load(path)
            save(src.resize((BASKET_W, BASKET_H), Image.LANCZOS), f"btn-{style}-{key}.png")
            masks[style][key] = alpha_mask(src)
        print(f"  · {style} 掩码：4 张")

    print("== 墨台 / 书写笔（两种风格） ==")
    for style, cfg in STYLES.items():
        save(fit_into(trim(load(cfg["ink"])), INK_W, INK_H), f"inkstand-{style}.png")
        q = trim(load(cfg["quill"]))
        save(q, f"quill-{style}.png")

    print("== 书签正/反面（裁实体框） ==")
    save(trim(load("2-821F5121U110A.png")), "bookmark-back.png")
    save(trim(load("2-821F5121U110B.webp")), "bookmark-front.png")

    print("== 七档运势艺术字（缺大凶） ==")
    for label, path, out in TIER_ARTS:
        save(trim(load(path)), out)

    print("== 主界面标题字 ==")
    save(trim(load("艺术字/玄运_鎏金黑.webp")), "title.png")

    print("== 背景 / 方桌 / 返回键 ==")
    save(load("T_UI_house_purchase_img_bg.png"), "bg.png")
    save(load("1810000005.webp"), "desk.png")
    save(load("T_UI_Common_btn_next_s.png"), "back-n.png")
    save(load("T_UI_Common_btn_next_h.png"), "back-h.png")

    # ---- 命中掩码 → src/data/almanac-hits.ts ----
    keys = ("past", "today", "future", "bazi")
    ts = [
        "/**",
        " * 玄学运势 · 卷轴按钮命中掩码（自动生成，勿手改）",
        " *",
        " * 由 `tools/prep-almanac.py` 从两套（中/欧）各 4 张拆分图的 alpha 通道栅格化而来，",
        " * 64×64 网格、每行 16 位十六进制（bit gx = 第 gx 列）。",
        " * 用于「按 alpha 轮廓判定点击」——不做大矩形热区（设定 §3.1 实现要点）。",
        " */",
        "",
        f"export const HIT_GRID = {MASK_GRID}",
        "",
        "export type SceneStyle = 'eu' | 'cn'",
        "export type HitKey = 'past' | 'today' | 'future' | 'bazi'",
        "",
        "export const HIT_MASKS: Record<SceneStyle, Record<HitKey, string[]>> = {",
    ]
    for style in ("eu", "cn"):
        ts.append(f"  {style}: {{")
        for key in keys:
            ts.append(f"    {key}: [")
            for r in masks[style][key]:
                ts.append(f"      '{r}',")
            ts.append("    ],")
        ts.append("  },")
    ts.append("}")
    ts += [
        "",
        "/**",
        " * 局部归一化坐标 (0~1) 是否命中实体",
        " *",
        " * 两个坑（都踩过）：",
        " *  1. 一行是 64 位 = 16 个十六进制字符，`parseInt(row, 16)` 会超出 JS 双精度整数",
        " *     的 53 位安全范围、高位被静默截断（实测掩码出现 16 格周期的镜像重影）。",
        " *  2. 十六进制串**最左字符是最高位**（bit 63），不是 bit 0 —— 直接按列号取字符会左右镜像。",
        " * 所以按「字符 = 4 位」定位：第 col 列 → 从右往左第 (col >> 2) 个字符的第 (col & 3) 位。",
        " */",
        "export function hitTest(style: SceneStyle, key: HitKey, nx: number, ny: number): boolean {",
        "  if (nx < 0 || nx >= 1 || ny < 0 || ny >= 1) return false",
        "  const row = HIT_MASKS[style][key][Math.floor(ny * HIT_GRID)]",
        "  if (!row) return false",
        "  const col = Math.floor(nx * HIT_GRID)",
        "  const nibble = parseInt(row[HIT_GRID / 4 - 1 - (col >> 2)] ?? '0', 16)",
        "  return ((nibble >> (col & 3)) & 1) === 1",
        "}",
        "",
    ]
    geo = [
        "/**",
        " * 玄学运势 · 卷轴几何常量（自动生成，勿手改）",
        " *",
        " * 由 `tools/prep-almanac.py` 按素材实际尺寸算出。素材已裁到 alpha 实体框，",
        " * 所以「图片边缘 == 实体边缘」——轴杆中心压纸面边缘、闭合态两杆紧贴都能精确对齐。",
        " */",
        "",
        f"export const PAPER_W = {PAPER_W}",
        f"export const PAPER_H = {PAPER_H}",
        f"export const AXLE_H = {AXLE_H}",
        "",
        "/** 三套轴杆的实机宽度（与 paper-1/2/3 一一配对，按变体索引取） */",
        "export const AXLE_W: number[] = [" + ", ".join(str(w) for w in axle_widths) + "]",
        "",
    ]
    gpath = os.path.join(SIM, "src", "data", "almanac-geo.ts")
    with open(gpath, "w", encoding="utf-8", newline=chr(10)) as f:
        f.write(chr(10).join(geo) + chr(10))
    print(f"== 几何常量 → src/data/almanac-geo.ts（轴杆宽 {axle_widths}） ==")

    out = os.path.join(SIM, "src", "data", "almanac-hits.ts")
    ensure_dir(os.path.dirname(out))
    with open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(ts))
    print(f"== 命中掩码 → src/data/almanac-hits.ts（{MASK_GRID}² × 2 套 × 4 键） ==")

    print("\n== 掩码覆盖率自检 ==")
    for style in ("eu", "cn"):
        for key in keys:
            n = sum(bin(int(r, 16)).count("1") for r in masks[style][key])
            print(f"  {style}-{key:7s} {n:5d} / {MASK_GRID ** 2} 格 = {n / MASK_GRID ** 2 * 100:5.1f}%")


if __name__ == "__main__":
    main()
