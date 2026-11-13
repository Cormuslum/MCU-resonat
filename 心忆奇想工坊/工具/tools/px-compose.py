# -*- coding: utf-8 -*-
"""用 pxdesk 的 raster 底图 + 贴纸素材合成预览，验证 pxdesk 坐标是否与实机对齐。"""
import base64
import io
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

WISH = {
    1: "T_UI_readings_bg.png",
    2: "T_UI_readings_bg_reel.png",
    3: "T_UI_readings_bg_reel_paper.png",
    4: "T_UI_readings_bg_tab.png",
    5: "T_UI_readings_img_label.png",
    7: "T_UI_common_img_line_01.png",
    9: os.path.join(DEC, "T_UI_readings_img_dec_magnifyingglass.png"),
    12: os.path.join(DEC, "T_UI_readings_img_dec_papercranes.png"),
    13: "T_UI_readings_img_tab_line.png",
    14: "T_UI_readings_img_tab_line.png",
    15: "T_UI_readings_btn_tab_selected_n.png",
    16: os.path.join(DEC, "随机贴纸-心愿原野", "T_UI_achievement_illustration_002.png"),
}

YIZAN = {
    1: "T_UI_readings_02_bg.png",
    2: os.path.join(DEC, "T_UI_events_rule_img_dec02.png"),
    3: "T_UI_readings_02_bg_reel.png",
    4: os.path.join(DEC, "T_UI_readings_02_img_dec_lace.png"),
    5: "T_UI_readings_02_bg_reel_paper.png",
    6: "T_UI_readings_02_bg_tab.png",
    7: os.path.join(DEC, "T_UI_readings_02_img_dec_magnifyingglass.png"),
    8: "T_UI_common_img_line_01.png",
    13: "T_UI_readings_img_tab_line.png",
    14: "T_UI_readings_img_tab_line.png",
    15: os.path.join(DEC, "T_UI_events_rule_img_messagedec03.png"),
    16: "T_UI_readings_img_label-2.png",
    17: os.path.join(DEC, "随机贴纸-伊赞之土", "T_UI_achievement_illustrationV2_003.png"),
    18: "T_UI_readings_btn_tab_selected_n.png",
}


def build(px_name, mapping, out_name):
    path = os.path.join(BASE, px_name)
    d = json.load(open(path, encoding="utf-8"))
    st = d["state"]
    W, H = int(st["width"]), int(st["height"])
    raster = st["layers"][0]
    b64 = raster["image"].split(",", 1)[1]
    canvas = Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGBA")
    if canvas.size != (W, H):
        canvas = canvas.resize((W, H), Image.LANCZOS)
    miss = []
    for i, L in enumerate(st["layers"]):
        if L.get("kind") == "raster":
            continue
        f = mapping.get(i)
        if f and not os.path.isabs(f):
            f = os.path.join(BASE, f)
        if not f or not os.path.isfile(f):
            miss.append(i)
            continue
        im = Image.open(f).convert("RGBA")
        tw, th = max(1, int(round(L["width"]))), max(1, int(round(L["height"])))
        im = im.resize((tw, th), Image.LANCZOS)
        op = L.get("opacity")
        if op is not None and op < 1:
            im.putalpha(im.split()[3].point(lambda v: int(v * op)))
        rot = L.get("rotation") or 0
        if rot:
            im = im.rotate(-rot, resample=Image.BICUBIC, expand=True)
        px = int(round(L["x"] + (im.width - tw) / 2))
        py = int(round(L["y"] + (im.height - th) / 2))
        canvas.alpha_composite(im, (px, py))
    out = os.path.join(ROOT, ".shots", out_name)
    canvas.save(out)
    print(f"saved {out_name} {canvas.size}  未映射层={miss}")


if __name__ == "__main__":
    build("图片工程-心愿原野.pxdesk", WISH, "_px_wish.png")
    build("图片工程-伊赞之土.pxdesk", YIZAN, "_px_yizan.png")
