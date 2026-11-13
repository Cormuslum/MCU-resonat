# -*- coding: utf-8 -*-
"""
实机截图测量辅助工具
====================
用途：对 1920x1080（实为 1918x1078）的游戏实机截图做「亮像素投影」分析，
      辅助人工判定各界面元素的边界坐标（列/行方向的密度突变处即元素边界）。

用法：
  python tools/measure-shot.py <截图路径> [--bin 10] [--th 190] [--axis both]

输出：
  列投影（每 bin 的亮像素数）与行投影，按密度降序打印前若干个峰，
  并给出「连续非零区间」（元素可能存在的横向/纵向范围）。
"""
import sys
import argparse
from PIL import Image


def load_gray(path):
    im = Image.open(path).convert("L")
    return im


def profile(im, axis, th):
    w, h = im.size
    px = im.load()
    if axis == "x":
        out = [0] * w
        for x in range(w):
            c = 0
            for y in range(0, h, 2):
                if px[x, y] >= th:
                    c += 1
            out[x] = c
    else:
        out = [0] * h
        for y in range(h):
            c = 0
            for x in range(0, w, 2):
                if px[x, y] >= th:
                    c += 1
            out[y] = c
    return out


def binned(prof, bin_size):
    n = (len(prof) + bin_size - 1) // bin_size
    out = []
    for i in range(n):
        seg = prof[i * bin_size:(i + 1) * bin_size]
        out.append(sum(seg) / max(1, len(seg)))
    return out


def ranges(prof, minval, gap):
    """返回连续 >= minval 的区间（允许 gap 个低于阈值的空洞）"""
    res = []
    start = None
    holes = 0
    for i, v in enumerate(prof):
        if v >= minval:
            if start is None:
                start = i
            holes = 0
        else:
            if start is not None:
                holes += 1
                if holes > gap:
                    res.append((start, i - holes))
                    start = None
                    holes = 0
    if start is not None:
        res.append((start, len(prof) - 1))
    return [(a, b) for a, b in res if b - a >= 0]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("--bin", type=int, default=8)
    ap.add_argument("--th", type=int, default=190)
    ap.add_argument("--axis", default="both", choices=["x", "y", "both"])
    ap.add_argument("--minval", type=float, default=4.0)
    ap.add_argument("--gap", type=int, default=6)
    a = ap.parse_args()

    im = load_gray(a.path)
    print("size:", im.size, " threshold:", a.th)
    for axis in (["x", "y"] if a.axis == "both" else [a.axis]):
        prof = profile(im, axis, a.th)
        b = binned(prof, a.bin)
        rs = ranges(b, a.minval, a.gap)
        label = "列(x)" if axis == "x" else "行(y)"
        print(f"\n=== {label}投影：连续区块（bin={a.bin}px, 单位=每列/行亮像素数） ===")
        for s, e in rs:
            print(f"  {s*a.bin:5d} → {e*a.bin+a.bin-1:5d}   宽/高={ (e-s+1)*a.bin:4d}px   均值={sum(b[s:e+1])/(e-s+1):.1f}")


if __name__ == "__main__":
    main()
