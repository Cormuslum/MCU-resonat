#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""背景音（BGM）预处理：mp3 → ogg，并做统一响度对齐（v2.4.01）。

为什么要这个脚本
----------------
以前只有一首 BGM（`sfx/bgm.ogg`，卡池曲）。v2.4.01 起按界面分配背景音，
图鉴和玄学还会在多首里**随机挑一首**、播完再换。不同来源的曲子母带响度差得远
（实测最大差 6dB 以上），随机切换时音量会忽大忽小 —— 所以这里统一做一次静态增益，
让每首都落在同一个目标响度上，切换时才听不出落差。

为什么用「静态增益」而不是 `loudnorm`
------------------------------------
`loudnorm` 单次过是动态压缩式归一化，长曲会被压出泵感（呼吸感），BGM 尤其明显。
这里改用 `volumedetect` 量出整轨平均电平，算一个**固定 dB 偏移**整轨加上去，
波形动态完全不变，只动整体电平。

用法：python tools/prep-bgm.py
输出：public/assets/bgm/<key>.ogg，并打印每首的原始/目标电平
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")


def _src_dir():
    """背景音源目录。

    v1.9.00 素材重构后 `素材/卡池音频/背景音` 已经不存在了，源只在
    `原始素材/卡池音频/背景音`（只读原件）。这个脚本因此静默失效过一阵子 ——
    产物目录里躺着的还是旧文件，谁改参数都不会生效。按顺序试，谁在就用谁。
    """
    for rel in (("素材", "音频", "背景音"),
                ("素材", "卡池音频", "背景音"),
                ("原始素材", "卡池音频", "背景音")):
        p = os.path.join(ROOT, *rel)
        if os.path.isdir(p):
            return p
    return os.path.join(ROOT, "原始素材", "卡池音频", "背景音")


SRC_DIR = _src_dir()
OUT_DIR = os.path.join(SIM, "public", "assets", "bgm")

FFMPEG = os.environ.get("FFMPEG", "ffmpeg")
FFPROBE = os.environ.get("FFPROBE", "ffprobe")

# 键名 → 源文件名。键名同时是 manifest 里 `bgm.*.src` 的文件名（bgm/<key>.ogg）
TRACKS = {
    # 版本页
    "qiji": "无限暖暖,FoldEcho - 奇迹大陆的起点.mp3",
    # 博物图鉴（5 首加权随机）
    "qixiang": "无限暖暖,FoldEcho - 奇想激化.mp3",
    "langhua": "无限暖暖,FoldEcho - 浪花轻轻悄.mp3",
    # 交织的云海：用户 2026-11-08 明确要求「保持原始音量，不调低」。
    # 源文件名原来写的是那个长名 mp3，素材重构后目录里只剩这个 wav；
    # 实测两者电平一致（mean -37.0 / max -18.2 dB），换过来不影响听感。
    # 它**不做响度归一化**（见 NO_NORMALIZE），保持这个偏轻的原始电平。
    "yunhai": "交织的云海(混响高音质).wav",
    "mengjing": "无限暖暖,FoldEcho - 呜呼呼梦境穿梭.mp3",
    "qianwan": "无限暖暖,FoldEcho - 只为千万次相逢.mp3",
    # 玄学运势（2 首各 50%）
    "cunzhong": "无限暖暖,FoldEcho - 村中无事.mp3",
    "yuanqi": "无限暖暖,FoldEcho,狐狸球球@FoldEcho - 缘起丹青.mp3",
    # 辉煌心光：用户另给的一版 WAV（112s，首尾电平一致、没有静音尾巴）。
    # 旧 mp3（128.4s）末尾有 2.46s 纯静音，loop 起来每 2 分钟就空一大拍，听感很突兀。
    "wanzhang": "无限暖暖@FoldEcho - 万丈曙色.wav",
}

# 需要做「首尾交叉淡化」的曲目：键名 → 交叉秒数。
# 单曲界面是靠 `<audio loop>` 整轨循环的，如果曲子结尾不是自然衰减到 0，
# 循环点就会「啪」一下接回去。交叉淡化把尾部 N 秒融进开头 N 秒，
# 循环点变成连续的，听不出接缝。
LOOP_XFADE = {"wanzhang": 1.2}

# 目标平均电平（dBFS）。-20 是「能当背景、又不至于听不清」的常见区间，
# 实际播放时还会再乘 master × bgmVol × sceneVol 三层音量。
TARGET_DB = -20.0

# 不做响度归一化的曲目：原样输出。
#   目前为空 —— yunhai 曾在里面（用户 2026-11-08 上午要求「保持原始音量」），
#   当天下午改口径：要跟其它曲目一样响。它的源本来只有 -37 dB，
#   不归一化的话随机切到它会像被人调小了音量，所以回到统一目标。
NO_NORMALIZE: set[str] = set()
# 增益夹紧范围：避免把本来就很轻的曲子推爆，或把过响的压到没气。
# 上限从 12 放宽到 18：yunhai 的源只有 -37 dB，要拉到 -20 得 +17 dB，
# 夹在 12 上会让它永远比别的曲子低 5 dB —— 用户要的是「跟其它一样响」。
# 它的峰值是 -18.2 dB，+17 之后落在 -1.2 dB，不会削顶。
GAIN_LO, GAIN_HI = -14.0, 18.0


def mean_volume(path: str) -> float | None:
    """用 volumedetect 取整轨平均电平（dBFS）"""
    p = subprocess.run(
        [FFMPEG, "-hide_banner", "-i", path, "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    m = re.search(r"mean_volume:\s*(-?[\d.]+) dB", p.stderr)
    return float(m.group(1)) if m else None


def duration_of(path: str) -> float:
    p = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        capture_output=True, text=True,
    )
    return float(p.stdout.strip())


def encode(src: str, dst: str, gain_db: float, xfade: float = 0.0) -> None:
    """转 ogg。`xfade > 0` 时顺带做首尾交叉淡化，供 `<audio loop>` 无缝循环。

    ⚠ 一定要带 `-vn`：源 mp3 里常带一张 mjpeg 封面，不加会把封面转成一条
    theora 视频流塞进 ogg（v1.3.01 的 wanzhang.ogg 就是这样，多了一条视频轨）。
    """
    common_out = ["-c:a", "libvorbis", "-q:a", "3", "-ac", "2", "-ar", "48000", "-vn", dst]
    if xfade <= 0:
        subprocess.run(
            [FFMPEG, "-hide_banner", "-y", "-i", src,
             "-af", f"volume={gain_db:.2f}dB", *common_out],
            check=True, capture_output=True,
        )
        return

    dur = duration_of(src)
    tail_start = dur - xfade
    fc = (
        "[0:a]aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo,"
        f"volume={gain_db:.2f}dB,asplit=3[a][b][c];"
        f"[a]atrim=0:{xfade:.3f},asetpts=PTS-STARTPTS[head];"
        f"[b]atrim={xfade:.3f}:{tail_start:.3f},asetpts=PTS-STARTPTS[mid];"
        f"[c]atrim={tail_start:.3f}:{dur:.3f},asetpts=PTS-STARTPTS[tail];"
        f"[tail][head]acrossfade=d={xfade:.3f}:c1=tri:c2=tri[x];"
        "[x][mid]concat=n=2:v=0:a=1[out]"
    )
    subprocess.run(
        [FFMPEG, "-hide_banner", "-y", "-i", src, "-filter_complex", fc,
         "-map", "[out]", *common_out],
        check=True, capture_output=True,
    )


def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    rows = []
    for key, name in TRACKS.items():
        src = os.path.join(SRC_DIR, name)
        if not os.path.isfile(src):
            print(f"!! 缺源文件：{name}")
            return 1
        mv = mean_volume(src)
        if mv is None:
            print(f"!! 量不到电平：{name}")
            return 1
        gain = 0.0 if key in NO_NORMALIZE else max(GAIN_LO, min(GAIN_HI, TARGET_DB - mv))
        dst = os.path.join(OUT_DIR, f"{key}.ogg")
        xfade = LOOP_XFADE.get(key, 0.0)
        encode(src, dst, gain, xfade)
        size = os.path.getsize(dst) / 1024
        rows.append((key, mv, gain, size))
        tag = f"  loop×{xfade:.1f}s" if xfade else ""
        # NO_NORMALIZE 的曲子增益是 0，实际电平就是原始电平 —— 别再打印一个假的目标值
        tgt = "   保持原样" if key in NO_NORMALIZE else f"{TARGET_DB:>7.1f} dB"
        print(f"  {key:<10} {mv:>7.2f} dB → {tgt}  (增益 {gain:+.2f} dB)  {size:>7.0f} KB{tag}")
    total = sum(r[3] for r in rows) / 1024
    print(f"\nOK → public/assets/bgm/  共 {len(rows)} 首 / {total:.1f} MB")
    # 供 collect-assets.py 参考的键名清单（不写 manifest，manifest 由 collect-assets 统一生成）
    print("keys:", json.dumps(list(TRACKS), ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
