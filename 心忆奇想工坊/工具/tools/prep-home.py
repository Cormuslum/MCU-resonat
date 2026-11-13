# -*- coding: utf-8 -*-
"""
prep-home.py —— 主页（心忆共鸣）素材预处理

来源：
  素材/主页/主页.pxdesk                               —— 版式权威（1400×788 画布，×1.3714 = 1920×1080）
  素材/朋友分享素材/UI/SysDailyTask/texture/...         —— 5 个二级入口图标
  素材/主页/LOGO-心忆共鸣 .png                         —— 新站名艺术字（1713×2447）

产出：素材/主页/工程产出/*.png
  静态背景版：nav-ver / nav-codex / nav-almanac / nav-banner / nav-gloria
  动态背景版 + 侧边栏：sys-ver / sys-banner / sys-almanac / sys-codex / sys-gloria / sys-home
  站名：logo（心忆共鸣，左侧竖版）/ logo-center（无限暖暖，居中横版，v1.2.02 回退）

显示尺寸取自 pxdesk 图层（1400 画布 ×1.3714286 = 1920 实机）：
  版本页   T_UI_NTASK_btn_beike4_h  476×428 @ (744.3, 431.5)
  博物图鉴 T_UI_XHSY_bg_star        424×416 @ (1068.3, 634.6)
  玄学运势 T_UI_NTASK_btn_paper     166.9×287.4 @ (620.7, 680.0) rot −43.99°
  共鸣页   T_UI_XHSY_icon_star1     236.3×242.8 @ (1629.2, 43.0)
  辉煌心光 T_UI_NTASK_img_stars2    336.0×267.9 @ (297.3, 465.8)  常态隐藏
  LOGO                               312.8×459.8 @ (116.2, 33.7)

小图标（纸卷 48×80 / 四角星 168×166）按 2× 预放大（LANCZOS），避免 CSS 放大发虚。

用法：python tools/prep-home.py
"""
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
SRC = os.path.join(ROOT, "素材")
OUT = os.path.join(SRC, "主页", "工程产出")
TEX = os.path.join(SRC, "朋友分享素材", "UI", "SysDailyTask", "texture")

# (输出名, 源文件, 目标显示宽, 目标显示高)
ITEMS = [
    ("nav-ver", os.path.join(TEX, "Shell", "T_UI_NTASK_btn_beike4_h.png"), 476, 428),
    ("nav-codex", os.path.join(TEX, "XHSY", "T_UI_XHSY_bg_star.png"), 424, 416),
    ("nav-almanac", os.path.join(TEX, "T_UI_NTASK_btn_paper.png"), 167, 287),
    ("nav-banner", os.path.join(TEX, "XHSY", "T_UI_XHSY_icon_star1.png"), 236, 243),
    ("nav-gloria", os.path.join(TEX, "Shell", "T_UI_NTASK_img_stars2.png"), 336, 268),
    ("logo", os.path.join(SRC, "主页", "LOGO-心忆共鸣 .png"), 313, 460),
    # ：回退「无限暖暖」横版 LOGO（原 1032×696 → 显示 460×310，居中偏上），与竖版并存
    ("logo-center", os.path.join(SRC, "主页", "主页面素材", "T_UI_img_LOGO1.png"), 460, 310),
]

# 系统图标（100×100 画布，内容约 83×80）：动态背景右缘竖排入口 + 左侧栏图标**共用同一批**
SYSICON = os.path.join(SRC, "朋友分享素材", "UI", "Common", "Textures", "SystemIcon")
SYS = [
    ("sys-ver", "T_UI_pear_icon_app_resonance.png", "版本"),
    ("sys-banner", "T_UI_pear_icon_app_ntask.png", "共鸣"),
    ("sys-almanac", "T_UI_HUD_btn_ps5_Events_CompTravel_n.png", "玄学运势"),
    ("sys-codex", "T_UI_HUD_btn_dailymail_n.png", "博物图鉴"),
    ("sys-gloria", "T_UI_HUD_btn_ps5_setting_n.png", "辉煌心光"),
    ("sys-home", "T_UI_HUD_btn_ps5_interactivefurniture_n.png", "主页（仅侧边栏）"),
]

SS = 2  # 超采样倍数
SYS_SS = 3  # 系统图标显示 76px，导出 228px 供高分屏


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, src, w, h in ITEMS:
        if not os.path.exists(src):
            print(f"  !! 缺失 {src}")
            continue
        im = Image.open(src).convert("RGBA")
        # 先按目标尺寸的 SS 倍做高质量重采样，再由浏览器缩到设计尺寸
        im = im.resize((w * SS, h * SS), Image.LANCZOS)
        dst = os.path.join(OUT, f"{name}.png")
        im.save(dst, "PNG", optimize=True)
        print(f"  → {name}.png  {im.width}×{im.height}   (显示 {w}×{h})")

    print("== 系统图标（右缘竖排入口 / 侧边栏共用） ==")
    for name, src, role in SYS:
        path = os.path.join(SYSICON, src)
        if not os.path.exists(path):
            print(f"  !! 缺失 {path}")
            continue
        im = Image.open(path).convert("RGBA")
        # 不裁边：图标四周的留白是设计的一部分，裁掉会显得过大
        im = im.resize((100 * SYS_SS, 100 * SYS_SS), Image.LANCZOS)
        im.save(os.path.join(OUT, f"{name}.png"), "PNG", optimize=True)
        print(f"  → {name}.png  100×100 画布 ×{SYS_SS}   ({role})")


if __name__ == "__main__":
    main()
