#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
v1.3.03：把「某个界面专属」的通用 UI 音单独转出来。

以前这些场景全靠 `panel-fadein`（`UI_WBP_Resonance_RewarPanel_Fadein_Ten`，
本来只是「共鸣奖励面板淡入」那一声，4.85s）一站到底，21 个调用点都放它，
用户听起来就是「所有弹窗一个味」。这个脚本按事件名从 `素材/卡池音频/索引.csv`
取源 mp3，转成独立 key，再把 `manifest.sfx` 补上。

用法：python tools/prep-sfx.py
"""
import csv
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asset_paths import resolve  # noqa: E402

# 素材重构：`卡池音频/` → `素材/音频/`（索引.csv 随之搬过来）
IDX = resolve(os.path.join("音频", "索引.csv"))
OUT = os.path.join(SIM, "public", "assets")
MANIFEST = os.path.join(OUT, "manifest.json")
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")

# 注：`ui_general_window_a_open;ui_general_window_b_open` 在索引里是**同一行**的两个别名
# 指向同一个 `052_窗口打开.mp3`，所以「A + B」并不是两段叠加，只有一段 0.43s 的窗口音
PICK = [
    ("ui_general_window_a_open",            "window-open",   "窗口打开"),
    ("ui_general_unlock_big",               "unlock-big",    "解锁·大"),
    ("UI_Resonance_SendGift_Campaign_Popup", "sendgift-popup", "赠送活动·弹窗"),
    ("ui_general_button_medium_b_deny",     "btn-deny",      "按钮·中B·取消"),
    ("ui_general_reward_points_slide",      "points-slide",  "奖励·积分滑动"),
    ("ui_general_button_big_b_select",      "big-b-select",  "按钮·大B·点击"),
]


def build_index():
    """事件名 → (分类, 文件名)。索引里 `A;B` 是同一音频的多个别名，要拆开逐个登记。"""
    idx = {}
    with open(IDX, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            fn = (row.get("文件名") or "").strip()
            cat = (row.get("分类") or "").strip()
            if not fn:
                continue
            for ev in (row.get("原始事件名") or "").split(";"):
                ev = ev.strip()
                if ev and ev not in idx:
                    idx[ev] = (cat, fn)
    return idx


def main():
    idx = build_index()
    os.makedirs(os.path.join(OUT, "sfx"), exist_ok=True)
    ok = []
    for ev, key, cn in PICK:
        hit = idx.get(ev)
        if not hit:
            print(f"  ✗ 索引里找不到事件 {ev}")
            continue
        cat, fn = hit
        src = resolve(os.path.join("音频", cat, fn))
        dst = os.path.join(OUT, "sfx", f"{key}.ogg")
        if not os.path.exists(src):
            print(f"  ✗ 源文件不存在 {src}")
            continue
        subprocess.run(
            [FFMPEG, "-hide_banner", "-y", "-loglevel", "error", "-i", src,
             "-c:a", "libvorbis", "-q:a", "5", "-b:a", "128k", dst],
            check=True,
        )
        kb = os.path.getsize(dst) / 1024
        print(f"  {key:<16} ← {cn:<10} {fn:<26} {kb:>6.1f} KB")
        ok.append((key, f"sfx/{key}.ogg"))

    with open(MANIFEST, encoding="utf-8") as f:
        man = json.load(f)
    sfx = man.setdefault("sfx", {})
    for k, v in ok:
        sfx[k] = v
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(man, f, ensure_ascii=False, indent=2)

    print(f"\n写入 manifest.sfx：{len(ok)} 个")
    return 0


if __name__ == "__main__":
    sys.exit(main())
