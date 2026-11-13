# -*- coding: utf-8 -*-
"""
prep-gloria.py —— 「辉煌心光」（设置页重做）素材预处理

来源：
  素材/辉煌心光/1-演出.png ~ 4-存档.png   —— 3840×2160 画布，图标已按设计稿就位
  素材/辉煌心光/交互.pxdesk               —— 四个图标的权威版式（1400×788 画布）
  素材/辉煌心光/二级确认弹窗.pxdesk        —— 确认条设计稿（837×183 已合成图）
  素材/辉煌心光/T_UI_dressingshow_img_scoring_board_.png  —— 弹窗容器 1496×1012
  素材/辉煌心光/T_UI_HUD_soul_img_crosshair_020.png       —— 左上角名牌 120×120
  素材/辉煌心光/T_UI_house_btn_turn_n.png                 —— 返回键常态 60×60
  素材/辉煌心光/T_UI_house_icon_Mobile_back.png           —— 返回键高亮 64×64
  素材/朋友分享素材/UI/Common/Textures/                   —— close_n/h
  素材/辉煌心光/无限暖暖-致敬辉煌的光.mp4                  —— 3840×2160 / 26.7s 背景视频

⚠️ v1.2.01 起：四个交互图标**不再裁到实体框**，整张 3840×2160 等比缩到 1920×1080
   直接叠在视频上（用户要求「不裁剪，等比缩放」）。canvas 与视频同 16:9，
   所以缩到 1920×1080 后坐标就是设计稿坐标。

产出：素材/辉煌心光/工程产出/*.png
（webp 由 collect-assets.py 统一转，视频由 README 里的 ffmpeg 命令写 public/assets/ui/gloria/）

用法：python tools/prep-gloria.py
"""
import io
import json
import os
import subprocess
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asset_paths import ASSET, resolve, resolve_file  # noqa: E402

# 素材重构后：
#   - 目录名 `辉煌心光` → `素材/界面/辉煌心光`
#   - 源文件（1-演出.png 等）只留在 `原始素材/辉煌心光/`，`素材/` 里只留「工程产出」
#   - `朋友分享素材/` 已并入 `素材/界面/UI整包/`
SRC = resolve("辉煌心光")
TEX = resolve("UI/Common/Textures")
DST = os.path.join(ASSET, "界面", "辉煌心光", "工程产出")


def srcf(name):
    """在 `辉煌心光` 目录下找单个源文件，跨 素材/ 与 原始素材/ 回落。"""
    return resolve_file("辉煌心光", name)

# 3840×2160 全画布，按设计稿顺序（键名 → 源文件）
ICONS = [
    ("stage", "1-演出.png"),
    ("volume", "2-音量.png"),
    ("quick", "3-快捷.png"),
    ("save", "4-存档.png"),
]

TEX_FILES = [
    ("T_UI_common_btn_close_n.png", "close-n.png"),
    ("T_UI_common_btn_close_h.png", "close-h.png"),
]

LOCAL_FILES = [
    ("T_UI_house_btn_turn_n.png", "back-n.png"),
    ("T_UI_house_icon_Mobile_back.png", "back-h.png"),
]

STAGE_W, STAGE_H = 1920, 1080


def ensure_dir(p):
    os.makedirs(p, exist_ok=True)


def pxdesk_image(path):
    """pxdesk 是单文件工程：整幅合成图存在 image 字段（data URI）里"""
    import base64
    import io

    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    raw = d["image"].split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGBA")


def alpha_box(im):
    return im.getchannel("A").getbbox()


def main():
    ensure_dir(DST)

    print("== 四个交互区（3840×2160 全画布 → 1920×1080，不裁剪） ==")
    hits = {}
    for key, src in ICONS:
        im = Image.open(srcf(src)).convert("RGBA")
        im = im.resize((STAGE_W, STAGE_H), Image.LANCZOS)
        im.save(os.path.join(DST, f"ic-{key}.png"), "PNG", optimize=True)
        bb = alpha_box(im) or (0, 0, STAGE_W, STAGE_H)
        hits[key] = bb
        print(f"  → ic-{key}.png  1920×1080  命中框 {bb}")

    print("== 交互.pxdesk 复核（画布 1400×788 → ×1.3714 = 1920） ==")
    # 直接读 pxdesk 的图层做交叉校验（导出图坐标应与之一致）
    with open(srcf("交互.pxdesk"), encoding="utf-8") as f:
        pk = json.load(f)
    k = STAGE_W / pk["state"]["width"]
    for layer in pk["state"]["layers"]:
        name = str(layer.get("name"))
        bb = alpha_box(pxdesk_image_bytes(layer["image"]))
        print(
            f"  层 {name}: 1400 画布 bbox={bb} → 1920 应为 "
            f"{tuple(round(v * k) for v in bb)}"
        )

    print("== 弹窗容器 / 左上角名牌 / 二级确认条 ==")
    board = Image.open(srcf("T_UI_dressingshow_img_scoring_board_.png")).convert("RGBA")
    board.save(os.path.join(DST, "board.png"), "PNG", optimize=True)
    print(f"  → board.png  {board.size}")

    tab = Image.open(srcf("T_UI_HUD_soul_img_crosshair_020.png")).convert("RGBA")
    tab.save(os.path.join(DST, "tab.png"), "PNG", optimize=True)
    print(f"  → tab.png  {tab.size}")

    cf = pxdesk_image(srcf("二级确认弹窗.pxdesk"))
    # 会把后面的行文字透出来
    r, g, b, a = cf.split()
    a = a.point(lambda v: 255 if v * 1.42 > 255 else int(v * 1.42))
    cf = Image.merge("RGBA", (r, g, b, a))
    cf.save(os.path.join(DST, "confirm.png"), "PNG", optimize=True)
    print(f"  → confirm.png  {cf.size}  实体框 {alpha_box(cf)}")

    print("== 返回键 / 关闭键 ==")
    for src, out in LOCAL_FILES:
        im = Image.open(srcf(src)).convert("RGBA")
        im.save(os.path.join(DST, out), "PNG", optimize=True)
        print(f"  → {out}  {im.size}")
    for src, out in TEX_FILES:
        im = Image.open(os.path.join(TEX, src)).convert("RGBA")
        im.save(os.path.join(DST, out), "PNG", optimize=True)
        print(f"  → {out}  {im.size}")

    print("== 视频海报帧（t=4s，1920×1080） ==")
    poster = os.path.join(DST, "poster.png")
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error", "-ss", "4",
            "-i", srcf("无限暖暖-致敬辉煌的光.mp4"),
            "-frames:v", "1", "-vf", "scale=1920:1080", poster,
        ],
        check=True,
    )
    print(f"  → poster.png  {Image.open(poster).size}")

    # ── 命中框入库：图标常态不可见，靠这块热区触发 hover / 点击 ──
    PAD = 16
    LABEL = {"stage": "演出", "volume": "音量", "quick": "快捷", "save": "存档"}
    rows = []
    print("\n命中框（1920×1080，已各边外扩 %dpx）：" % PAD)
    for key, bb in hits.items():
        x = max(0, bb[0] - PAD)
        y = max(0, bb[1] - PAD)
        w = min(STAGE_W, bb[2] + PAD) - x
        h = min(STAGE_H, bb[3] + PAD) - y
        rows.append((key, x, y, w, h))
        print(f"  {key:8s} x {x} y {y}  {w}×{h}")
    write_hits(rows, LABEL)


def write_hits(rows, label):
    """生成 src/data/gloria-hits.ts（图标热区，随素材重跑自动同步）"""
    out = os.path.join(SIM, "src", "data", "gloria-hits.ts")
    body = ",\n".join(
        '  { key: \'%s\', label: \'%s\', x: %d, y: %d, w: %d, h: %d }' % (k, label[k], x, y, w, h)
        for k, x, y, w, h in rows
    )
    text = (
        "/**\n"
        " * 「辉煌心光」四个交互区的命中框（1920×1080 设计坐标）\n"
        " *\n"
        " * **自动生成，勿手改** —— 由 `tools/prep-gloria.py` 按图标的 alpha 实体框各边外扩 16px 得出。\n"
        " * 图标常态不可见（用户要求），只有鼠标进入这块热区、或该面板已打开时才显形。\n"
        " */\n"
        "export type GloriaKey = 'stage' | 'volume' | 'quick' | 'save'\n\n"
        "export interface GloriaHot {\n"
        "  key: GloriaKey\n"
        "  /** 中文名，仅用于 title 提示与无障碍 */\n"
        "  label: string\n"
        "  x: number\n"
        "  y: number\n"
        "  w: number\n"
        "  h: number\n"
        "}\n\n"
        "export const GLORIA_HOTS: GloriaHot[] = [\n" + body + ",\n]\n"
    )
    with io.open(out, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    print(f"  → {os.path.relpath(out, ROOT)}")


def pxdesk_image_bytes(data_uri):
    import base64
    import io

    raw = data_uri.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(raw))).convert("RGBA")


if __name__ == "__main__":
    main()
