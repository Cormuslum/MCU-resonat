#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""彩蛋弹窗素材：左右切换键（v1.3.02）。

素材 `T_UI__collocation_btn_skip_n / _h`（74×74 圆钮，常态 / 高亮）原本是
搭配界面的「跳过」键，这里借来做彩蛋弹窗的上一条 / 下一条 —— 比原来那对
方条字符箭头更像游戏原生的按钮。

输出：public/assets/ui/egg/skip-n.webp、skip-h.webp
     并把路径写进 manifest 的 `ui.egg`
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
SRC = os.path.join(ROOT, "素材", "朋友分享素材", "UI", "Common", "Textures")
OUT = os.path.join(SIM, "public", "assets", "ui", "egg")
MANIFEST = os.path.join(SIM, "public", "assets", "manifest.json")

FILES = [
    ("T_UI__collocation_btn_skip_n.png", "skip-n.webp"),
    ("T_UI__collocation_btn_skip_h.png", "skip-h.webp"),
]


def main() -> int:
    os.makedirs(OUT, exist_ok=True)
    made = {}
    for src_name, dst_name in FILES:
        src = os.path.join(SRC, src_name)
        if not os.path.isfile(src):
            print(f"  ! 缺失 {src_name}")
            return 1
        im = Image.open(src).convert("RGBA")
        dst = os.path.join(OUT, dst_name)
        im.save(dst, "WEBP", quality=92, method=6)
        made[dst_name] = f"ui/egg/{dst_name}"
        print(f"  {dst_name:<16} {im.size[0]}×{im.size[1]}  {os.path.getsize(dst) / 1024:5.1f} KB")

    with open(MANIFEST, encoding="utf-8") as f:
        man = json.load(f)
    egg = man.setdefault("ui", {}).setdefault("egg", {})
    egg["skipN"] = made["skip-n.webp"]
    egg["skipH"] = made["skip-h.webp"]
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(man, f, ensure_ascii=False, indent=2)
    print("\n✓ manifest.json 已写入 ui.egg")
    return 0


if __name__ == "__main__":
    sys.exit(main())
