# -*- coding: utf-8 -*-
"""
字体对照图生成器

把 素材/字体库/ 里每个字体渲染同一句测试文本，按「中文覆盖度」分组拼成对照图，
方便肉眼挑字体。

用法：
  python tools/font-preview.py

输出：.shots/fonts/ 下的分组 PNG + 一份 index.md（含覆盖率统计）
"""
import os, sys, json, unicodedata
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：无限暖暖模拟器（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "无限暖暖模拟器")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
FONT_DIR = os.path.join(ROOT, "素材", "字体库")
OUT = os.path.join(ROOT, ".shots", "fonts")

TEXT = "《无限暖暖》座右铭——无论何时何地都要盛装登场！"

# 需要检测的字符：汉字 + 中文标点
def need_chars(s):
    out = []
    for ch in s:
        if ch in out:
            continue
        # 只检测非 ASCII（ASCII 基本所有字体都有）
        if ord(ch) > 127:
            out.append(ch)
    return out


def cmap_of(path):
    """读字体 cmap，返回可渲染码点集合；失败返回 None"""
    try:
        f = TTFont(path, lazy=True, fontNumber=0)
        best = None
        for t in f["cmap"].tables:
            if best is None or len(t.cmap) > len(best):
                best = t.cmap
        return set(best.keys()) if best else set()
    except Exception as e:
        return None


def family_name(path):
    try:
        f = TTFont(path, lazy=True, fontNumber=0)
        for rec in f["name"].names:
            if rec.nameID == 1:
                try:
                    v = rec.toUnicode()
                    if v:
                        return v
                except Exception:
                    pass
    except Exception:
        pass
    return ""


CN_FONT = "C:/Windows/Fonts/msyh.ttc"      # 微软雅黑：族名/备注里有中文，不能用西文字体
MONO_FONT = "C:/Windows/Fonts/consola.ttf"


def _font(path, size, fallback=None):
    try:
        return ImageFont.truetype(path, size)
    except Exception:
        return fallback or ImageFont.load_default()


def render_row(draw, x, y, name, text, font_path, size, color, name_color, box_h):
    """画一行：左字体名（西文等宽），右测试文本（垂直居中）"""
    nf = _font(MONO_FONT, 15)
    cf = _font(CN_FONT, 13)
    draw.text((x, y + 10), name, font=nf, fill=name_color)

    f = _font(font_path, size, None)
    if f is None:
        draw.text((x + 230, y + 10), "[加载失败]", font=cf, fill=(255, 120, 120))
        return
    # 垂直居中：用 bbox 的实际高度对齐行中线
    try:
        bb = draw.textbbox((0, 0), text, font=f)
        th = bb[3] - bb[1]
        ty = y + (box_h - th) // 2 - bb[1]
    except Exception:
        ty = y + 6
    try:
        draw.text((x + 230, ty), text, font=f, fill=color)
    except Exception as e:
        draw.text((x + 230, y + 10), f"[渲染失败] {e}", font=cf, fill=(255, 120, 120))


def build_sheet(title, items, path, row_h=104, width=1560, size=34, body=None):
    """items: [(文件名, 字体路径, 覆盖率说明)]"""
    pad_top = 92
    height = pad_top + len(items) * row_h + 24
    img = Image.new("RGB", (width, height), (13, 18, 32))
    d = ImageDraw.Draw(img)

    try:
        tf = ImageFont.truetype("C:/Windows/Fonts/msyhbd.ttc", 30)
    except Exception:
        tf = ImageFont.load_default()
    d.text((36, 26), title, font=tf, fill=(232, 200, 122))

    sf = _font(MONO_FONT, 14)
    cf = _font(CN_FONT, 14)
    shown = body or TEXT
    d.text((36, 64), f"测试文本：{shown}", font=cf, fill=(140, 152, 180))

    for i, (name, fpath, note) in enumerate(items):
        y = pad_top + i * row_h
        # 分隔线
        d.line([(24, y - 6), (width - 24, y - 6)], fill=(30, 38, 58), width=1)
        render_row(d, 36, y, name, shown, fpath, size, (232, 238, 250), (120, 170, 230), row_h - 6)
        if note:
            d.text((36 + 230, y + row_h - 26), note, font=cf, fill=(196, 150, 150))

    img.save(path)
    print(f"  → {os.path.basename(path)}  {width}×{height}  {len(items)} 个字体")


def main():
    os.makedirs(OUT, exist_ok=True)
    files = sorted(f for f in os.listdir(FONT_DIR) if f.lower().endswith((".ttf", ".otf")))
    chars = need_chars(TEXT)
    print(f"字体 {len(files)} 个，测试文本需要 {len(chars)} 个非 ASCII 字符：{''.join(chars)}")

    full, partial, none, broken = [], [], [], []
    rows = []

    for fn in files:
        p = os.path.join(FONT_DIR, fn)
        cm = cmap_of(p)
        name = os.path.splitext(fn)[0]
        fam = family_name(p)
        if cm is None:
            broken.append((name, p, "字体解析失败"))
            rows.append({"file": fn, "family": fam, "cover": "解析失败", "missing": ""})
            continue
        missing = [c for c in chars if ord(c) not in cm]
        cover = 1 - len(missing) / len(chars)
        rows.append({
            "file": fn,
            "family": fam,
            "cover": round(cover * 100, 1),
            "missing": "".join(missing),
        })
        if not missing:
            full.append((name, p, f"完整中文覆盖 · {fam}" if fam and fam != name else ""))
        elif cover < 0.15:
            none.append((name, p, f"无中文字形 · {fam}" if fam and fam != name else "无中文字形"))
        else:
            partial.append((name, p, f"缺 {len(missing)} 字：{''.join(missing)}"))

    print(f"\n完整覆盖 {len(full)} / 部分 {len(partial)} / 无中文 {len(none)} / 失败 {len(broken)}")

    # 分组出图（每张最多 18 行，太长不好看）
    def chunk(items, n):
        for i in range(0, len(items), n):
            yield items[i:i + n]

    idx = 1
    LATIN = "Nikki Infinity 0123 —— Aa Bb"
    groups = (
        (full, "完整中文覆盖", None),
        (partial, "部分中文覆盖（缺字会显示豆腐）", None),
        (none, "无中文字形（下面展示其拉丁字形，不能用于中文）", LATIN),
    )
    for grp, title, body in groups:
        if not grp:
            continue
        for part in chunk(grp, 18):
            tag = f"{idx:02d}"
            build_sheet(f"{title}（{len(grp)} 个 · 第 {tag} 张）", part,
                        os.path.join(OUT, f"fonts-{tag}-{len(grp)}.png"), body=body)
            idx += 1

    # 索引
    md = ["# 字体库清单", "", f"测试文本：`{TEXT}`", "",
          f"- 完整中文覆盖 **{len(full)}** 个",
          f"- 部分覆盖 **{len(partial)}** 个",
          f"- 无中文字形 **{len(none)}** 个",
          f"- 解析失败 **{len(broken)}** 个", "",
          "| 字体文件 | 内部族名 | 中文覆盖 | 缺失字符 |",
          "|---|---|---|---|"]
    for r in sorted(rows, key=lambda x: (x["cover"] == "解析失败", x["file"])):
        md.append(f"| `{r['file']}` | {r['family'] or '—'} | {r['cover']}% | {r['missing'] or '—'} |")
    with open(os.path.join(OUT, "index.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(md))
    print(f"\n索引 → {os.path.join(OUT, 'index.md')}")


if __name__ == "__main__":
    main()
