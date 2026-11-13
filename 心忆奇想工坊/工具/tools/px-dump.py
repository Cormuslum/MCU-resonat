# -*- coding: utf-8 -*-
"""输出两个 pxdesk 的 1920×1080 精确坐标表，并报告每个素材的 alpha 留白比例。"""
import json
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：无限暖暖模拟器（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "无限暖暖模拟器")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
BASE = os.path.join(ROOT, "素材", "博物图鉴", "子界面-故事&阅读物 图鉴（两个子界面，但素材相同）")
DEC = os.path.join(BASE, "装饰")
SX = 1920 / 1400
SY = 1080 / 788

WISH = {
    1: ("bg", "T_UI_readings_bg.png"),
    2: ("reel", "T_UI_readings_bg_reel.png"),
    3: ("paper", "T_UI_readings_bg_reel_paper.png"),
    4: ("tabpanel", "T_UI_readings_bg_tab.png"),
    5: ("label", "T_UI_readings_img_label.png"),
    7: ("topLine", "T_UI_common_img_line_01.png"),
    9: ("magnifier", os.path.join(DEC, "T_UI_readings_img_dec_magnifyingglass.png")),
    12: ("papercranes", os.path.join(DEC, "T_UI_readings_img_dec_papercranes.png")),
    13: ("tabLine1", "T_UI_readings_img_tab_line.png"),
    14: ("tabLine2", "T_UI_readings_img_tab_line.png"),
    15: ("selBox", "T_UI_readings_btn_tab_selected_n.png"),
    16: ("egg", os.path.join(DEC, "随机贴纸-心愿原野", "T_UI_achievement_illustration_002.png")),
}

YIZAN = {
    1: ("bg", "T_UI_readings_02_bg.png"),
    2: ("maple", os.path.join(DEC, "T_UI_events_rule_img_dec02.png")),
    3: ("reel", "T_UI_readings_02_bg_reel.png"),
    4: ("lace", os.path.join(DEC, "T_UI_readings_02_img_dec_lace.png")),
    5: ("paper", "T_UI_readings_02_bg_reel_paper.png"),
    6: ("tabpanel", "T_UI_readings_02_bg_tab.png"),
    7: ("magnifier", os.path.join(DEC, "T_UI_readings_02_img_dec_magnifyingglass.png")),
    8: ("topLine", "T_UI_common_img_line_01.png"),
    13: ("tabLine1", "T_UI_readings_img_tab_line.png"),
    14: ("tabLine2", "T_UI_readings_img_tab_line.png"),
    15: ("spiral", os.path.join(DEC, "T_UI_events_rule_img_messagedec03.png")),
    16: ("label", "T_UI_readings_img_label-2.png"),
    17: ("egg", os.path.join(DEC, "随机贴纸-伊赞之土", "T_UI_achievement_illustrationV2_003.png")),
    18: ("selBox", "T_UI_readings_btn_tab_selected_n.png"),
}


def alpha_bbox(path):
    im = Image.open(path).convert("RGBA")
    bb = im.getbbox()
    if not bb:
        return im.size, (0, 0, 0, 0), (0, 0, 0, 0)
    a = im.split()[3]
    bb = a.getbbox()
    w, h = im.size
    l, t, r, b = bb
    return (w, h), bb, (l / w, t / h, r / w, b / h)


def dump(px_name, mapping, tag):
    path = os.path.join(BASE, px_name)
    st = json.load(open(path, encoding="utf-8"))["state"]
    print(f"\n{'='*100}\n{tag}  canvas {st['width']}x{st['height']}\n{'='*100}")
    print(f"{'层':>3} {'名称':<11} {'实机 x':>8} {'实机 y':>8} {'w':>7} {'h':>7} {'rot':>6} {'op':>5}  素材原始 / alpha可见占比")
    for i, L in enumerate(st["layers"]):
        if L.get("kind") == "raster":
            continue
        name, f = mapping.get(i, (f"layer{i}", None))
        x = L["x"] * SX
        y = L["y"] * SY
        w = L["width"] * SX
        h = L["height"] * SY
        info = ""
        if f:
            fp = f if os.path.isabs(f) else os.path.join(BASE, f)
            if os.path.isfile(fp):
                (ow, oh), bb, frac = alpha_bbox(fp)
                info = f"{ow}x{oh}  a={frac[0]:.2f},{frac[1]:.2f}~{frac[2]:.2f},{frac[3]:.2f}"
        print(
            f"{i:>3} {name:<11} {x:>8.1f} {y:>8.1f} {w:>7.1f} {h:>7.1f} "
            f"{L.get('rotation') or 0:>6.2f} {L.get('opacity') if L.get('opacity') is not None else 1:>5}  {info}"
        )


if __name__ == "__main__":
    dump("图片工程-心愿原野.pxdesk", WISH, "心愿原野（实机 1920×1080）")
    dump("图片工程-伊赞之土.pxdesk", YIZAN, "伊赞之土（实机 1920×1080）")
