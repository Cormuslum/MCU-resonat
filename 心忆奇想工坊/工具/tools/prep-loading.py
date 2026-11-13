# -*- coding: utf-8 -*-
"""
prep-loading.py —— 黑屏加载过渡（SysLoading）素材预处理

来源：
  素材/朋友分享素材/UI/SysLoading/Texture/
    T_UI_loading_slider_01.png        1920×28   进度条「未加载」底（极淡彩线）
    T_UI_loading_slider_02.png        1920×28   进度条「已加载」高亮（同 alpha，纯白）
    T_UI_loading_special_spirits.png  1920×1080 精灵群装饰（16 只，4×4）
    ScenePhoto/T_UI_loading_img_photo_*.png  1220×632 各界面指向性装饰（水彩羽化边）
  （废弃）奔跑暖暖_动态.gif           480×270   白底不透明，抠白会打穿脸和裙子

产出：public/assets/ui/loading/
  slider-off.webp / slider-on.webp
  spirits.webp
  photo-home / ver / banner / codex / almanac / gloria .webp
  nikki-run.webp（动图，16 帧）

同时在 public/assets/manifest.json 写入 `ui.loading` 段（幂等：每次运行覆盖该段）。
"""
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：无限暖暖模拟器（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "无限暖暖模拟器")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
SRC = os.path.join(ROOT, "素材/朋友分享素材/UI/SysLoading/Texture")
OUT = os.path.join(SIM, "public/assets/ui/loading")
MANIFEST = os.path.join(SIM, "public/assets/manifest.json")

# 指向性装饰：界面键 → ScenePhoto 编号
PHOTOS = {
    "home": "064",
    "ver": "044",
    "banner": "093",
    "codex": "01",
    "almanac": "041",
    "gloria": "107",
}

os.makedirs(OUT, exist_ok=True)


def save_webp(img: Image.Image, name: str, quality: int):
    p = os.path.join(OUT, name)
    img.save(p, "WEBP", quality=quality, method=6)
    kb = os.path.getsize(p) / 1024
    print(f"  {name:<22} {img.size[0]}×{img.size[1]}  {kb:6.1f} KB")
    return f"ui/loading/{name}"


def slice_sheet(sheet: Image.Image, cols: int = 4, rows: int = 4) -> list[Image.Image]:
    """把 4×4 序列帧大图按**行优先**切成 16 张。

    为什么不再用 `奔跑暖暖_动态.gif`（v1.3.02）：
    那个 gif 是不透明的 (254,254,254) 白底，得自己抠。上一版用「八边种子 floodfill +
    把所有近白像素压成 alpha=90」的组合，结果把角色**脸和手**（肤色本来就 >242）
    一起打成了半透明 —— 深色加载页上一看就是「脸部变成透明的洞」。
    而 `T_UI_loading_special_spirits.png` 本身就是带 alpha 的 16 格序列帧，
    像素完整、边缘干净，直接切就行，一个像素都不用动。
    """
    cw, ch = sheet.width // cols, sheet.height // rows
    return [
        sheet.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
        for r in range(rows)
        for c in range(cols)
    ]


def main():
    print("→ 进度条")
    for src, dst, q in [
        ("T_UI_loading_slider_01.png", "slider-off.webp", 92),
        ("T_UI_loading_slider_02.png", "slider-on.webp", 92),
    ]:
        p = os.path.join(SRC, src)
        if not os.path.isfile(p):
            print(f"  ! 缺失 {src}")
            continue
        save_webp(Image.open(p).convert("RGBA"), dst, q)

    print("→ 精灵群装饰")
    p = os.path.join(SRC, "T_UI_loading_special_spirits.png")
    if os.path.isfile(p):
        save_webp(Image.open(p).convert("RGBA"), "spirits.webp", 80)

    print("→ 各界面指向性装饰")
    for key, no in PHOTOS.items():
        p = os.path.join(SRC, "ScenePhoto", f"T_UI_loading_img_photo_{no}.png")
        if not os.path.isfile(p):
            print(f"  ! 缺失 photo_{no}")
            continue
        save_webp(Image.open(p).convert("RGBA"), f"photo-{key}.webp", 82)

    print("→ 右下角奔跑装饰（16 格序列帧 → 动图，不动 alpha）")
    sheet_path = os.path.join(SRC, "T_UI_loading_special_spirits.png")
    if os.path.isfile(sheet_path):
        frames = slice_sheet(Image.open(sheet_path).convert("RGBA"))
        dest = os.path.join(OUT, "nikki-run.webp")
        frames[0].save(
            dest, "WEBP", save_all=True, append_images=frames[1:],
            duration=100, loop=0, quality=90, alpha_quality=100, method=6,
        )
        print(f"  nikki-run.webp          {frames[0].width}×{frames[0].height}  "
              f"{os.path.getsize(dest) / 1024:6.1f} KB  ({len(frames)} 帧)")

    # ---------------- manifest：覆盖写入 ui.loading
    with open(MANIFEST, encoding="utf-8") as f:
        man = json.load(f)

    def rel(name):
        return f"ui/loading/{name}" if os.path.isfile(os.path.join(OUT, name)) else None

    # ⚠ 必须 merge 而不是整段覆盖：`ui.loading` 里还有别的脚本/手工维护的键
    # （比如 v1.3.01 加的 `bg` 整屏底图），写成 `= {...}` 会把它悄悄抹掉。
    ld = man.setdefault("ui", {}).setdefault("loading", {})
    ld.update({
        "sliderOff": rel("slider-off.webp"),
        "sliderOn": rel("slider-on.webp"),
        "spirits": rel("spirits.webp"),
        "runner": rel("nikki-run.webp"),
        "photo": {k: rel(f"photo-{k}.webp") for k in PHOTOS},
    })
    if not ld.get("bg"):
        ld["bg"] = rel("bg.webp")
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(man, f, ensure_ascii=False, indent=2)
    print("\n✓ manifest.json 已写入 ui.loading")
    return 0


if __name__ == "__main__":
    sys.exit(main())
