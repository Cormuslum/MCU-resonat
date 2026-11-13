# -*- coding: utf-8 -*-
"""对比「我的实现截图」与「pxdesk 规格合成图」，输出分区 MAE + 差异热力图。

用法：python tools/diff-readings.py wish
"""
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
SHOTS = os.path.join(ROOT, ".shots")


def load(p):
    return Image.open(p).convert("RGB")


def main(region="wish"):
    spec = load(os.path.join(SHOTS, f"_px_{region}.png")).resize((1920, 1080), Image.LANCZOS)
    mine = load(os.path.join(SHOTS, f"rd-new-{region}.png"))
    a = np.array(spec).astype(int)
    b = np.array(mine).astype(int)
    d = np.abs(a - b).mean(axis=2)

    print(f"全局 MAE = {d.mean():.2f}")
    zones = {
        "背景左带 (0-200)": (0, 200, 0, 1080),
        "列表栏 (200-720)": (200, 720, 80, 1000),
        "纸面左页 (200-717)": (200, 717, 150, 950),
        "正文右页 (717-1720)": (717, 1720, 150, 950),
        "顶栏 (0-140)": (0, 1920, 0, 140),
        "左缘放大镜 (0-260)": (0, 260, 430, 1080),
        "右上纸鹤 (1330-1850)": (1330, 1850, 0, 270),
    }
    for name, (x0, x1, y0, y1) in zones.items():
        print(f"  {name:<24} MAE={d[y0:y1, x0:x1].mean():7.2f}")

    # 热力图
    hm = np.zeros((1080, 1920, 3), dtype=np.uint8)
    v = np.clip(d * 3, 0, 255).astype(np.uint8)
    hm[..., 0] = v
    hm[..., 1] = (v // 4).astype(np.uint8)
    Image.fromarray(hm).save(os.path.join(SHOTS, f"_diff_{region}.png"))

    # 并排
    side = Image.new("RGB", (1920, 1080 * 2 + 12), (20, 20, 20))
    side.paste(spec, (0, 0))
    side.paste(mine, (0, 1092))
    side.resize((960, (1080 * 2 + 12) // 2), Image.LANCZOS).save(
        os.path.join(SHOTS, f"_side_{region}.png")
    )
    print(f"输出 _diff_{region}.png / _side_{region}.png")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "wish")
