# -*- coding: utf-8 -*-
"""
subset-fonts.py —— 字体子集化（v1.2.01，需求 14）

问题：Noto Sans SC 两个字重各 11MB（全量 CJK），首屏 20.6MB 全耗在字体上。
做法：按「本站实际用到的字符」切子集 + 转 WOFF（zlib）。

字符集 = `src/**/*.{ts,vue}` 的全部字符 ∪ `public/assets/manifest.json` 的全部字符
（部件名 / 套装名 / 描述 / 标签都在 manifest 里，是最容易被漏掉的一块）。
实测 4309 个唯一字符（CJK 4062）。

⚠ 本机 pip 无外网，装不了 `brotli`，所以只能出 **WOFF**（zlib）；
   若以后能联网：`pip install brotli` 后把 flavor 改成 'woff2'，体积还能再小 ~25%。

产出：
  public/assets/fonts/<alias>.woff          ← 前端直接用
  素材/字体库/工程产出/<alias>.woff          ← 供 collect-assets.py 复制

用法：python tools/subset-fonts.py
"""
import glob
import io
import os

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：无限暖暖模拟器（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "无限暖暖模拟器")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
SRC = os.path.join(ROOT, "素材", "字体库")
OUT_WEB = os.path.join(SIM, "public", "assets", "fonts")
OUT_SRC = os.path.join(SRC, "工程产出")

FONTS = [
    ("NotoSansSC-Regular.ttf", "body"),
    ("NotoSansSC-SemiBold.ttf", "body-bold"),
    ("DIN_Alternate_Bold.ttf", "number"),
    ("X6FontCurrency-Regular.ttf", "currency"),
    ("FZYASHJW_Cu.ttf", "yahei-bold"),
    ("FZYASHJW_Zhong.ttf", "yahei-medium"),
]

# 常用兜底标点/符号（防止某些动态拼接的符号缺失）
EXTRA = "　、。，．·；：！？…—～〈〉《》「」『』【】（）〔〕％＋－×÷＝／＼＃＆＊＠｜"


def collect_charset() -> set[str]:
    chars: set[str] = set()
    for f in glob.glob(os.path.join(SIM, "src", "**", "*.ts"), recursive=True):
        chars |= set(io.open(f, encoding="utf-8").read())
    for f in glob.glob(os.path.join(SIM, "src", "**", "*.vue"), recursive=True):
        chars |= set(io.open(f, encoding="utf-8").read())
    mj = os.path.join(SIM, "public", "assets", "manifest.json")
    if os.path.exists(mj):
        chars |= set(io.open(mj, encoding="utf-8").read())
    # ASCII 可打印 + 兜底标点
    chars |= {chr(c) for c in range(0x20, 0x7F)}
    chars |= set(EXTRA)
    return {c for c in chars if ord(c) >= 0x20}


def main():
    os.makedirs(OUT_WEB, exist_ok=True)
    os.makedirs(OUT_SRC, exist_ok=True)
    chars = collect_charset()
    text = "".join(sorted(chars))
    print(f"字符集 {len(chars)} 个（CJK {len([c for c in chars if '\u4e00' <= c <= '\u9fff'])}）")

    total_before = total_after = 0
    for fname, alias in FONTS:
        src = os.path.join(SRC, fname)
        if not os.path.exists(src):
            print(f"  !! 缺失 {fname}")
            continue
        before = os.path.getsize(src)
        opts = subset.Options()
        opts.flavor = "woff"
        opts.desubroutinize = True
        opts.layout_features = ["*"]
        opts.name_IDs = ["*"]
        opts.notdef_outline = True
        opts.recalc_bounds = True
        opts.drop_tables += ["DSIG"]
        font = TTFont(src)
        sub = subset.Subsetter(options=opts)
        sub.populate(text=text)
        sub.subset(font)
        tmp = os.path.join(OUT_WEB, f"{alias}.woff")
        font.flavor = "woff"
        font.save(tmp)
        font.close()
        after = os.path.getsize(tmp)
        total_before += before
        total_after += after
        # 同步一份到素材库（collect-assets 会从这里复制）
        with open(tmp, "rb") as rf, open(os.path.join(OUT_SRC, f"{alias}.woff"), "wb") as wf:
            wf.write(rf.read())
        print(f"  {alias:12s} {before/1048576:6.1f}MB → {after/1024:7.1f}KB")

    print(f"合计 {total_before/1048576:.1f}MB → {total_after/1048576:.2f}MB")


if __name__ == "__main__":
    main()
