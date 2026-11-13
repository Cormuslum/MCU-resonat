# -*- coding: utf-8 -*-
"""
collect-assets.py —— 把素材归集到前端目录 public/assets/

输入：素材/pool-map.json（唯一数据源）+ 素材/卡池音频/索引.csv（音频事件表）
输出：public/assets/{manifest.json, banners/, sets/, stars3/, milestones/, video/, sfx/, fonts/, ui/}

用法：
  python tools/collect-assets.py --pool banner-1.0-03   # 只收一个试点池
  python tools/collect-assets.py --all                  # 收全部 77 池
  python tools/collect-assets.py --pool banner-1.0-03 --force   # 覆盖已存在文件
  python tools/collect-assets.py --pool banner-1.0-03 --manifest-only  # 只重建 manifest

图片统一转 WebP（无损优先，体积降 60%+），音效转 OGG Vorbis。
已存在的输出文件默认跳过，加快增量重跑。
"""
import os, re, sys, json, csv, shutil, subprocess, argparse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：无限暖暖模拟器（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "无限暖暖模拟器")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")


def _env_dir(name, default):
    """目录可被环境变量覆盖（发行版：数据在工坊目录、成品在模拟器目录，不同根）。"""
    v = os.environ.get(name)
    return os.path.abspath(v) if v else default


# 读：编辑数据根（信息表 / 套装库 / pool-map）。发行版指向工坊下的 `data/`。
ASSET = _env_dir("NIKKI_DATA_DIR", os.path.join(ROOT, "素材"))
# 写：成品根（manifest.json / webp / ogg / mp4）。发行版指向模拟器的 `public/assets`。
OUT = _env_dir("NIKKI_OUT_DIR", os.path.join(SIM, "public", "assets"))

# ── UI 整包根目录的两代名字 ──────────────────────────────────────────────
# 老脚本里所有路径都写 `朋友分享素材/UI/…`（2026-10 那版 59GB rip 的目录名）。
# 用户 2026-11-02 把整包并进了 `0主素材/`，旧目录不再存在 —— 不处理的话
# 所有 UI 素材都会静默走 MISSING 分支，manifest 照写但 webp 一个都不产出。
# 统一在**拼路径的入口**换算一次，不动下面几百条字符串常量：
#   优先「文件真的存在」的那个根，其次 0主素材，最后回退旧名。
UI_ROOTS = ("界面/UI整包", "0主素材", "朋友分享素材")

# 同一次整理里被改名的其它素材目录（旧名 → 新名，按顺序试）
DIR_ALIASES = {
    # ── ：素材目录重构（原始素材 → 素材/ 新结构）──
    # 旧名 → 新名。P()/A() 会按顺序试，哪个存在用哪个。
    "抽卡奖励界面": ("界面/抽卡演出",),
    "抽卡道具": ("界面/抽卡演出",),
    "游戏内实机展示": ("界面/抽卡演出",),
    # 顶层重命名
    "source": ("服装阁",),
    "图片素材": ("套装卡片图",),
    "套装故事": ("故事",),
    "部分UI及道具图片": ("界面/通用UI",),
    "卡池背景图": ("卡池背景",),
    "卡池背景图（纯图片，无艺术字）": ("卡池背景",),
    "卡池界面缩略图": ("卡池背景",),
    "卡池音频": ("音频",),
    "音频素材": ("音频",),
    "视频素材": ("视频",),
    "字体库": ("字体",),
    "所有卡池通用三星散件": ("通用散件",),
    "主页": ("界面/主页",),
    "博物图鉴": ("界面/博物图鉴",),
    "玄学运势": ("界面/玄学运势",),
    "辉煌心光": ("界面/辉煌心光",),
    "深海回响奖励": ("界面/深海回响",),
    "0主素材": ("界面/UI整包",),
}


def _norm_key(s):
    return str(s).replace("\\", "/").strip().lstrip("./")


# `--overrides <json>`：本次写入的「虚拟素材路径 → 真实文件」重定向表。
#
# 发行版不再保存 `素材/`（3.9G 的源图/源视频），但 pool-map 里每个素材仍记着
# 一条**虚拟相对路径**（`服装阁/0.1·祈愿星/心愿栖金蕊/背景图.jpg`）——
# 它是推算产物名（`banners/bg/1000.webp`）的唯一依据，必须原样保留。
# 工坊把用户选的文件（可能在 E:、F:）映射到这条虚拟路径上，转码逻辑一行不用改，
# 磁盘上也不会多出第二份副本。
OVERRIDES = {}


def A(*parts):
    """素材相对路径 → 绝对路径，自动把旧目录名换到实际存在的那个。"""
    parts = [str(p) for p in parts]
    if not parts:
        return os.path.join(ASSET, *parts)
    over = OVERRIDES.get(_norm_key("/".join(parts)))
    if over:
        return over
    first = parts[0].replace("\\", "/")
    head = first.split("/", 1)[0]
    rest = first.split("/", 1)[1] if "/" in first else ""
    tail = ([rest] if rest else []) + parts[1:]

    roots = UI_ROOTS if head in ("朋友分享素材", "0主素材") else ((head,) + DIR_ALIASES.get(head, ()))
    cands = [os.path.join(ASSET, r, *tail) for r in roots]
    for c in cands:
        if os.path.exists(c):
            return c
    return cands[0]

def _find_ffmpeg():
    """ffmpeg 定位：显式环境变量 → 与 python.exe 同目录（发行版自带运行时）→ PATH。

    发行版里 ffmpeg.exe 就跟 python.exe 放在一起，PATH 上并没有它 ——
    只写 `"ffmpeg"` 的话所有转码都会失败，而且报错长得像"素材有问题"。
    """
    exe = "ffmpeg.exe" if os.name == "nt" else "ffmpeg"
    for c in (os.environ.get("NIKKI_FFMPEG"),
              os.path.join(os.path.dirname(sys.executable), exe)):
        if c and os.path.isfile(c):
            return c
    return shutil.which(exe) or exe


FFMPEG = _find_ffmpeg()
STATS = {"copied": 0, "converted": 0, "skipped": 0, "missing": 0}
MISSING = []

# --manifest-only：只重建 manifest.json，不动任何素材文件
MANIFEST_ONLY = False

# --bust：只强制重转**指定输出子目录**（阈值 50 的批量删除策略挡着，懒得删文件时用）
#   例：--bust banners/title,banners/name  —— 换了处理算法、只想重跑这几批
BUST: tuple[str, ...] = ()


def busted(dst):
    """该输出是否命中了 --bust（命中则忽略「已存在就跳过」）。"""
    if not BUST:
        return False
    d = dst.replace("\\", "/")
    return any(b in d for b in BUST)


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True)
    return p.returncode == 0


def ensure_dir(p):
    os.makedirs(p, exist_ok=True)


def trim_alpha_to_webp(src, dst, quality=92, force=False, th=80):
    """按 alpha 裁掉透明留白再转 WebP（共鸣按钮专用）。

    两张「共鸣按钮」PNG 的透明边距不对称：单次右边留 17px、十连左边留 15px。
    直接并排摆，屏幕上的视觉间距会比 CSS 里写的大 30px，怎么调都对不上，
    所以先把实体裁出来，之后 CSS 里写的间距就是眼睛看到的间距。
    """
    if MANIFEST_ONLY:
        return os.path.exists(dst)
    if not force and os.path.exists(dst) and os.path.getsize(dst) > 0:
        STATS["skipped"] += 1
        return True
    if not os.path.exists(src):
        STATS["missing"] += 1
        MISSING.append(src)
        return False
    try:
        from PIL import Image
        im = Image.open(src).convert("RGBA")
        al = im.getchannel("A").point(lambda v: 255 if v > th else 0)
        box = al.getbbox()
        if box:
            im = im.crop(box)
        ensure_dir(os.path.dirname(dst))
        im.save(dst, "WEBP", quality=quality, method=6)
        STATS["converted"] += 1
        return True
    except Exception as e:  # 没装 Pillow 就退回不裁
        print(f"    [warn] 裁切失败，退回原图：{e}")
        return to_webp(src, dst, quality, force)


def mask_webp(src, dst, force=False):
    """把 alpha 拉伸到 0..255 再存 webp —— 专供 CSS `mask-image`。

    解包素材的 alpha 峰值经常只有 80~120（画师留的半透明），直接当蒙版会把
    元素整体压成半透明，连文字都看不清。这里只动 alpha，RGB 保持不变。

    ⚠️ 编码必须走 ffmpeg（`yuva420p`），别用 Pillow 直接存：Pillow 的
    lossy-alpha webp Chrome 解不出来，`mask-image` 会静默变成全透明。
    """
    if MANIFEST_ONLY:
        return os.path.exists(dst)
    if not force and os.path.exists(dst) and os.path.getsize(dst) > 0:
        STATS["skipped"] += 1
        return True
    if not os.path.exists(src):
        STATS["missing"] += 1
        MISSING.append(src)
        return False
    try:
        from PIL import Image
    except Exception as e:
        print(f"    [warn] 无 Pillow，退回普通转换：{e}")
        return to_webp(src, dst, 92, force)

    im = Image.open(src).convert("RGBA")
    al = im.getchannel("A")
    peak = al.getextrema()[1] or 255
    if peak < 255:
        im.putalpha(al.point(lambda v: min(255, round(v * 255 / peak))))

    ensure_dir(os.path.dirname(dst))
    tmp = dst + ".tmp.png"
    im.save(tmp)
    ok = run([FFMPEG, "-y", "-loglevel", "error", "-i", tmp,
              "-c:v", "libwebp", "-quality", "92",
              "-compression_level", "6", "-pix_fmt", "yuva420p", dst])
    try:
        os.remove(tmp)
    except OSError:
        pass
    if ok and os.path.exists(dst) and os.path.getsize(dst) > 0:
        STATS["converted"] += 1
        return True
    STATS["missing"] += 1
    MISSING.append(f"{src} (mask webp 转换失败)")
    return False


# 部件图标文件名 → 图鉴 / 「恭喜获得」用的部件名。
# 常规池的文件名就是部件名（`金涛浪涌.png`）；2.11 用户给的一批带部位前缀
# （`发型-愿景回旋.png`、`饰品·发饰-飘曳星辉.png`），而前端按部件名匹配图标
# （MuseumClothes 的 `i.name === p.name`），不剥前缀会整排图标对不上。
SLOT_PREFIXES = ("发型", "外套", "连衣裙", "袜子", "鞋子", "饰品")


def icon_stem(filename):
    stem = os.path.splitext(os.path.basename(filename))[0]
    if "-" in stem:
        head, rest = stem.split("-", 1)
        if rest and any(head == pre or head.startswith(pre + "·") for pre in SLOT_PREFIXES):
            return rest
    return stem


def thumb_from_bg(bg_webp, dst, quality=88, force=False):
    """没有列表缩略图时，从成品背景中心裁一条 320×140（v1.6.07）。

    以前缺缩略图的池会走前端的「通用图轮播」（`ui.banner.thumbs`），
    结果是**显示别座阁的画**（用户报「错误使用其他服装阁的缩略图」）。
    列表项是 242×110（≈2.2:1），从 1920×1080 中心裁 840px 高的横条，
    主体（人物/水晶球）基本都在中间，视觉上和实机缩略图一致。
    """
    if MANIFEST_ONLY:
        return os.path.exists(dst)
    if not force and not busted(dst) and os.path.exists(dst) and os.path.getsize(dst) > 0:
        STATS["skipped"] += 1
        return True
    if not os.path.exists(bg_webp):
        return False
    try:
        from PIL import Image
        im = Image.open(bg_webp).convert("RGB")
        tw, th = 320, 140
        band_h = int(round(im.width / (tw / th)))
        band_h = min(band_h, im.height)
        top = (im.height - band_h) // 2
        im = im.crop((0, top, im.width, top + band_h)).resize((tw, th), Image.LANCZOS)
        ensure_dir(os.path.dirname(dst))
        im.save(dst, "WEBP", quality=quality, method=6)
        STATS["converted"] += 1
        return True
    except Exception:
        return False


def to_webp(src, dst, quality=88, force=False, scale=None):
    """任意图片 → WebP。已存在且未强制则跳过（--bust 命中时强制重转）。

    `scale=(w, h)`：成品比源图小的时候用（v2.2.06 鼠标光标 52×60 → 26×30，
    系统箭头贴图在游戏界面里偏大）。默认不缩放，保持原始像素。
    """
    if MANIFEST_ONLY:
        return os.path.exists(dst)
    if not force and not busted(dst) and os.path.exists(dst) and os.path.getsize(dst) > 0:
        STATS["skipped"] += 1
        return True
    if not os.path.exists(src):
        STATS["missing"] += 1
        MISSING.append(src)
        return False
    ensure_dir(os.path.dirname(dst))
    resize = ["-vf", f"scale={scale[0]}:{scale[1]}:flags=lanczos"] if scale else []
    ok = run([FFMPEG, "-y", "-loglevel", "error", "-i", src, *resize,
              "-c:v", "libwebp", "-quality", str(quality),
              "-compression_level", "6", "-pix_fmt", "yuva420p", dst])
    if ok and os.path.exists(dst) and os.path.getsize(dst) > 0:
        STATS["converted"] += 1
        return True
    STATS["missing"] += 1
    MISSING.append(f"{src} (webp 转换失败)")
    return False


def copy_as(src, dst, force=False):
    if MANIFEST_ONLY:
        return os.path.exists(dst)
    if not force and os.path.exists(dst) and os.path.getsize(dst) > 0:
        STATS["skipped"] += 1
        return True
    if not os.path.exists(src):
        STATS["missing"] += 1
        MISSING.append(src)
        return False
    ensure_dir(os.path.dirname(dst))
    shutil.copy2(src, dst)
    STATS["copied"] += 1
    return True


def to_ogg(src, dst, force=False, bitrate="128k", gain=1.0, trim=None):
    """`gain` 是线性音量系数（1.0 = 原样）。只给需要单独调音量的轨用，
    比如首页「伊始」那条录音偏响（用户要求 0.6）。

    `trim=(start, end)` 与 `transcode_video()` 的 trim **取同一区间**（秒，end 可为 None）。

    ⚠ 首页这条必须传，否则音画会逐圈漂移 —— 视频剪掉了首尾黑屏（星海 120s → 116.5s），
    音轨若还是整条源（120s），两者循环周期就差 3.6 秒：第一圈末尾开始错开，
    第二圈起越差越多（用户 2026-11-08 反馈「长时间停留后二次播放不同步」）。
    这里用 `atrim` + `asetpts` 而不是 `-ss`，与视频滤镜链的 `trim`/`setpts` 同源同语义，
    起止点误差为 0。
    """
    if MANIFEST_ONLY:
        return os.path.exists(dst)
    if not force and os.path.exists(dst) and os.path.getsize(dst) > 0:
        # 有 trim 时必须核对**时长**：老产物是整条源抽出来的，光看「文件存在」
        # 会一直留着那条比视频长几秒的旧音轨，音画永远对不上
        stale = False
        if trim:
            want = (trim[1] if trim[1] is not None else _duration(src)) - (trim[0] or 0.0)
            got = _duration(dst)
            if want > 0.5 and got > 0 and abs(got - want) > 0.35:
                stale = True
        if not stale:
            STATS["skipped"] += 1
            return True
    if not os.path.exists(src):
        STATS["missing"] += 1
        MISSING.append(src)
        return False
    ensure_dir(os.path.dirname(dst))
    # `-vn` 必须写：源可能是**视频**（首页背景要从视频里抽音轨），
    # 不显式丢掉视频流的话，ogg 容器装不下 vp9/h264，ffmpeg 直接失败并留下 0 字节文件
    filters = []
    if trim:
        s = max(0.0, float(trim[0] or 0.0))
        seg = f"atrim=start={s:.3f}"
        if trim[1] is not None:
            seg += f":end={float(trim[1]):.3f}"
        filters.append(seg + ",asetpts=PTS-STARTPTS")
    if abs(gain - 1.0) >= 1e-6:
        filters.append(f"volume={gain:.3f}")
    af = ["-af", ",".join(filters)] if filters else []
    ok = run([FFMPEG, "-y", "-loglevel", "error", "-i", src, "-vn", *af,
              "-c:a", "libvorbis", "-q:a", "5", "-b:a", bitrate, dst])
    if ok and os.path.exists(dst) and os.path.getsize(dst) > 0:
        STATS["converted"] += 1
        return True
    STATS["missing"] += 1
    MISSING.append(f"{src} (ogg 转换失败)")
    return False


# ---------------------------------------------------------------- 视频转码
_ENCODER = None
FFPROBE = os.environ.get("FFPROBE", "ffprobe")
VIDEO_PROBE_CACHE = os.path.join(OUT, ".video-probe.json")


def video_encoder():
    """优先走硬件编码（NVENC），没有就回落 libx264。探测一次并缓存。"""
    global _ENCODER
    if _ENCODER:
        return _ENCODER
    _ENCODER = "libx264"
    try:
        r = subprocess.run([FFMPEG, "-hide_banner", "-encoders"],
                           capture_output=True, text=True, timeout=20000)
        if "h264_nvenc" in (r.stdout or ""):
            _ENCODER = "h264_nvenc"
    except Exception:
        pass
    return _ENCODER


def _probe_cache_load():
    try:
        with open(VIDEO_PROBE_CACHE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _probe_cache_save(cache):
    try:
        ensure_dir(os.path.dirname(VIDEO_PROBE_CACHE))
        with open(VIDEO_PROBE_CACHE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=1)
    except Exception:
        pass


def _media_size(path):
    """(宽, 高, 时长秒)；取不到就当 0"""
    try:
        r = subprocess.run([FFPROBE, "-v", "error", "-select_streams", "v:0",
                            "-show_entries", "stream=width,height:format=duration",
                            "-of", "default=noprint_wrappers=1", path],
                           capture_output=True, text=True, timeout=30000)
        txt = r.stdout or ""
        w = int(re.search(r"width=(\d+)", txt).group(1)) if re.search(r"width=(\d+)", txt) else 0
        h = int(re.search(r"height=(\d+)", txt).group(1)) if re.search(r"height=(\d+)", txt) else 0
        d = float(re.search(r"duration=([\d.]+)", txt).group(1)) if re.search(r"duration=([\d.]+)", txt) else 0.0
        return w, h, d
    except Exception:
        return 0, 0, 0.0


def _duration(path):
    """媒体时长（秒）；纯音频 / 纯视频都能取，取不到返回 0。

    与 `_media_size()` 分开：那个限定了 `v:0`，对 ogg 这类纯音频会拿不到流。
    """
    try:
        r = subprocess.run([FFPROBE, "-v", "error", "-show_entries", "format=duration",
                            "-of", "default=noprint_wrappers=1", path],
                           capture_output=True, text=True, timeout=30000)
        m = re.search(r"duration=([\d.]+)", r.stdout or "")
        return float(m.group(1)) if m else 0.0
    except Exception:
        return 0.0


def probe_video(src):
    """探测一条视频的「该裁掉什么」，返回 `{trimStart, trimEnd, crop}`。

    两件事，都是上游素材的锅：

    · **首尾黑屏**。PV / 录屏常带 0.3~3 秒的黑场（星海开头 0.33s、结尾 3.2s）。
      做循环背景时，周期性地闪一下黑，非常明显 —— 用户 2026-11-08 明确要求去掉。
    · **上下黑边**。1920×1080 的片子里有效画面可能只有 1920×800（星海就是），
      直接铺满会看到两条黑条。老版本裁过，v1.9.04 重新转码时把这一步弄丢了，
      用户发现「又改回来了」。

    结果按 (相对路径, mtime, size) 缓存 —— 源文件不动就不重算，
    否则每次跑管���都要把 30 条视频整片解码一遍。
    """
    try:
        st = os.stat(src)
    except OSError:
        return {"trimStart": 0.0, "trimEnd": None, "crop": None}

    key = f"{os.path.relpath(src, ROOT)}|{int(st.st_mtime)}|{st.st_size}"
    cache = _probe_cache_load()
    if key in cache:
        return cache[key]

    info = {"trimStart": 0.0, "trimEnd": None, "crop": None}
    w, h, dur = _media_size(src)

    # ① 首尾黑屏。只认「从 0 开始」和「到结尾为止」的那两段，
    #    片子中间的黑场（转场）不能剪，剪了就是改内容
    if dur > 0:
        p = subprocess.run([FFMPEG, "-hide_banner", "-i", src,
                            "-vf", "blackdetect=d=0.10:pic_th=0.98:pix_th=0.10",
                            "-an", "-f", "null", "-"],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        for m in re.finditer(r"black_start:([\d.]+)\s+black_end:([\d.]+)", p.stderr or ""):
            bs, be = float(m.group(1)), float(m.group(2))
            if bs <= 0.08 and be > info["trimStart"]:
                info["trimStart"] = round(be, 3)
            if be >= dur - 0.2:
                info["trimEnd"] = round(bs, 3)

    # ② 有效画面框。在黑场之后采样 8 秒，取众数
    if w and h:
        start = info["trimStart"] + 3.0
        if dur and start > dur - 4:
            start = info["trimStart"]
        p2 = subprocess.run([FFMPEG, "-hide_banner", "-ss", f"{start:.2f}", "-t", "8",
                             "-i", src, "-vf", "cropdetect=limit=24:round=2:reset=0",
                             "-an", "-f", "null", "-"],
                            capture_output=True, text=True, encoding="utf-8", errors="replace")
        crops = re.findall(r"crop=(\d+):(\d+):(\d+):(\d+)", p2.stderr or "")
        if crops:
            from collections import Counter
            cw, ch, cx, cy = map(int, Counter(crops).most_common(1)[0][0])
            # 只有真的裁掉了 ≥2% 的边才认 —— 暗场景会被 cropdetect 误判成「全是黑」
            if cw >= 16 and ch >= 16 and (cw < w * 0.98 or ch < h * 0.98):
                info["crop"] = [cw - cw % 2, ch - ch % 2, cx - cx % 2, cy - cy % 2]

    cache[key] = info
    _probe_cache_save(cache)
    if info["trimStart"] or info["trimEnd"] is not None or info["crop"]:
        bits = []
        if info["trimStart"]:
            bits.append(f"剪头 {info['trimStart']:.2f}s")
        if info["trimEnd"] is not None:
            bits.append(f"剪尾 {dur - info['trimEnd']:.2f}s")
        if info["crop"]:
            bits.append(f"裁 {info['crop'][0]}×{info['crop'][1]}")
        print(f"    [视频] {os.path.basename(src)}：{'、'.join(bits)}")
    return info


def video_poster(src, dst, at=2.0, force=False, width=1280):
    """从视频里抽一帧当 poster（`<video poster>`）。

    为什么需要：首页那两条是 45MB / 495MB，浏览器把首帧解出来之前那块区域是黑的。
    有了 poster，静态站点先有画面，视频就绪后再自然盖上去 —— 这是「不降分辨率」
    前提下唯一真正有效的加载优化（用户 2026-11-08 要求保持原分辨率）。
    `at` 取首尾黑屏之后，避免抽到一张纯黑。
    """
    if MANIFEST_ONLY:
        return os.path.exists(dst)
    if not os.path.exists(src):
        return False
    if (not force and not busted(dst) and os.path.exists(dst)
            and os.path.getsize(dst) > 0
            and os.path.getmtime(dst) >= os.path.getmtime(src)):
        return True
    ensure_dir(os.path.dirname(dst))
    info = probe_video(src)
    t = max(at, (info.get("trimStart") or 0) + 1.0)
    return run([FFMPEG, "-y", "-loglevel", "error", "-ss", f"{t:.2f}", "-i", src,
                "-frames:v", "1", "-vf", f"scale={width}:-2",
                "-c:v", "libwebp", "-quality", "82", dst])


def transcode_video(src, dst, force=False, crf=28, height=None):
    """视频 → **去掉音轨**的 h264/mp4，并顺手剪掉首尾黑屏、裁掉黑边。

    为什么不再原样拷（v1.9.04）：
      · 服装阁动态背景**不该有声音**。上游素材来自录屏 / PV，普遍带 opus 或 aac 轨
        （剪辑时误带进来的），进阁时会和「进入音」叠在一起。这里一律 `-an`，
        不去判断「这条有没有音轨」—— 少一个分支就少一处漏网。
      · 原始码率高得离谱（有 164MB / 42 秒 ≈ 31Mbps 的），浏览器边下边解会卡；
        转成 h264 后体积降七成以上，对背景来说观感没有可见差别。

    ⚠ **不再缩放分辨率**（用户 2026-11-08 要求「所有视频保持原分辨率」）。
    唯一会改变尺寸的只有裁黑边 —— 那是去掉不属于画面的像素，不是压缩。

    增量判据用**修改时间**而不是「存在就跳过」：源视频被重新处理过时，
    光看存在会把旧产物一直留着。
    """
    if MANIFEST_ONLY:
        return os.path.exists(dst)
    if not os.path.exists(src):
        STATS["missing"] += 1
        MISSING.append(src)
        return False
    if (not force and not busted(dst) and os.path.exists(dst)
            and os.path.getsize(dst) > 0
            and os.path.getmtime(dst) >= os.path.getmtime(src)):
        STATS["skipped"] += 1
        return True

    ensure_dir(os.path.dirname(dst))
    info = probe_video(src)

    # 滤镜链：先剪首尾，再裁黑边。顺序不能反 —— crop 的 x/y 是原始画面坐标，
    # 提前裁过会让坐标整体偏移
    vf = []
    ts = info.get("trimStart") or 0.0
    te = info.get("trimEnd")
    if ts > 0.01 or te is not None:
        seg = f"trim=start={ts:.3f}" + (f":end={te:.3f}" if te is not None else "")
        vf.append(seg + ",setpts=PTS-STARTPTS")
    if info.get("crop"):
        cw, ch, cx, cy = info["crop"]
        vf.append(f"crop={cw}:{ch}:{cx}:{cy}")
    if height:
        vf.append(f"scale=-2:{height}")

    def build(enc):
        if enc == "h264_nvenc":
            vargs = ["-c:v", "h264_nvenc", "-preset", "p5", "-rc", "vbr",
                     "-cq", str(crf), "-b:v", "0"]
        else:
            vargs = ["-c:v", "libx264", "-preset", "veryfast", "-crf", str(crf)]
        cmd = [FFMPEG, "-y", "-loglevel", "error", "-i", src, "-an"]
        if vf:
            cmd += ["-vf", ",".join(vf)]
        cmd += [*vargs, "-pix_fmt", "yuv420p", "-movflags", "+faststart", dst]
        return run(cmd)

    enc = video_encoder()
    ok = build(enc)
    if not ok and enc == "h264_nvenc":
        # 驱动/显卡不支持某些分辨率时硬件编码会直接失败，回落软编再来一次 ——
        # 一条视频不该把整条管线卡死
        ok = build("libx264")
    if not ok or not (os.path.exists(dst) and os.path.getsize(dst) > 0):
        STATS["missing"] += 1
        MISSING.append(f"{src} (视频转码失败)")
        return False

    STATS["converted"] += 1
    # 清掉同一 stem 的旧封装。manifest 的 bgVideo 按 .webm → .mp4 顺序取第一个存在的，
    # 留着旧 webm 会让页面继续播那条带音轨的旧视频。
    for ext in (".webm", ".mp4"):
        old = os.path.splitext(dst)[0] + ext
        if old != dst and os.path.exists(old):
            try:
                os.remove(old)
            except OSError:
                pass
    return True


# ---------------------------------------------------------------- 音频映射
# 依据 素材/卡池音频/选定的音频.md。
# 源：素材/卡池音频/索引.csv 的「原始事件名 → 文件名」，按事件名精确匹配。
SFX_EVENTS = [
    # 共鸣页按钮
    ("UI_Resonance_1_Button_Hover",              "btn-res-hover"),
    ("UI_Resonance_1_Button_Select",             "btn-res-select"),
    ("UI_Resonance_10_Button_Hover",             "btn-ten-hover"),
    ("UI_Resonance_10_Button_Select",            "btn-ten-select"),
    ("UI_Resonance_SendGift_Campaign_Popup",     "echo-open"),
    # 抽卡演出
    ("LS_Resonance_Performance_N",               "perf-normal"),
    ("LS_Resonance_Performance_Y",               "perf-gold"),
    ("ui_general_reward_cloth_single_star",      "flip-star"),
    ("ui_general_reward_cloth_single",           "flip-single"),
    ("ui_general_reward_cloth_progress_loop",    "set-progress-loop"),
    ("ui_general_reward_cloth_progress_complete", "set-progress-done"),
    ("ui_general_reward_cloth_suite",            "set-complete"),
    ("UI_WBP_Resonance_RewarPanel_Fadein_Ten",   "panel-fadein"),
    ("ui_general_reward_a",                      "reward-a"),
    # 纸质（图鉴页）
    ("ui_general_paper_book",                    "paper-book"),
    ("ui_general_paper_slide_envelope",          "paper-envelope"),
    ("UI_General_Paper_Fadein_a",                "paper-fadein"),
    ("ui_general_paper_slide",                   "paper-slide"),
    ("ui_general_paper_flip",                    "paper-flip"),
    # 导航 / 通用
    ("ui_general_interact_target_hover",         "nav-hover"),
    ("ui_general_interact_target_select",        "nav-select"),
    ("ui_general_button_medium_b_hover",         "thumb-hover"),
    ("ui_general_button_medium_c_hover",         "thumb-select"),
    ("ui_general_button_big_d_hover",            "echo-hover"),
    ("ui_general_button_medium_a_select",        "echo-select"),
    ("ui_general_button_big_d_select",           "codex-exit"),
    ("ui_general_button_small_c_select",         "back-select"),
    ("UI_Common_Button_Medium_A_Hover",          "common-hover"),
    ("ui_general_button_small_a_hover",          "settings-hover"),
    ("UI_Common_Button_Big_A_Hover",             "settings-btn-hover"),
    ("UI_Common_Button_Big_A_Select",            "settings-btn-select"),
    # 弹窗 / 面板出现：以前 21 处全走 panel-fadein（共鸣奖励面板淡入音），
    # 换成按场景各用各的。`sendgift-popup` 与 `echo-open` 同源（088_赠送活动·弹窗），
    # 但用途已经分道扬镳（一个是共鸣页开门、一个是抽卡页转场），所以各自留一份文件，
    # 以后想单独调音量/换素材互不影响。
    ("ui_general_window_a_open",                 "window-open"),
    ("ui_general_unlock_big",                    "unlock-big"),
    ("UI_Resonance_SendGift_Campaign_Popup",     "sendgift-popup"),
    ("ui_general_button_medium_b_deny",          "btn-deny"),
    ("ui_general_reward_points_slide",           "points-slide"),
    ("ui_general_button_big_b_select",           "big-b-select"),
]

# 不走事件表的直接路径：(源相对素材根, 输出, 码率)
AUDIO_FILES = [
    ("音频素材/96/968622297.mp3",            "sfx/bgm.ogg",           "128k"),  # 卡池 BGM1
    ("音频素材/99/994516521.mp3",            "sfx/bgm-egg.ogg",       "128k"),  # BGM2 彩蛋
    ("音频素材/81/810555521.mp3",            "sfx/draw-normal.ogg",   "128k"),  # 抽卡动画·普通
    ("音频素材/39/393569930.mp3",            "sfx/draw-gold.ogg",     "128k"),  # 抽卡动画·出金
    ("卡池音频/游戏录屏音频分割/open1.mp3",  "sfx/settings-open.ogg", "112k"),  # 进入设置页
]

# ：按界面分配背景音。曲目文件由 tools/prep-bgm.py 生成到 bgm/（含响度对齐），
# 这里只负责登记「哪个界面放哪几首、权重多少」。`bgm` 这个键指的是旧的 sfx/bgm.ogg（卡池曲）。
#   图鉴：奇想激化 40 / 浪花轻轻悄 20 / 交织的云海 20 / 梦境穿梭 15 / 千万次相逢 5
#   玄学：村中无事 50 / 缘起丹青 50
BGM_SCENES = {
    "versions": [("qiji", 1)],
    "banner": [("bgm", 1)],
    "codex": [("qixiang", 40), ("langhua", 20), ("yunhai", 20), ("mengjing", 15), ("qianwan", 5)],
    "almanac": [("cunzhong", 50), ("yuanqi", 50)],
    "gloria": [("wanzhang", 1)],
}

# ：字体先由 tools/subset-fonts.py 子集化 + 转 WOFF（24MB → 2.9MB），这里只复制产物
FONT_MAP = [
    ("body.woff",        "body"),
    ("body-bold.woff",   "body-bold"),
    ("number.woff",      "number"),
    ("currency.woff",    "currency"),
    # 游戏正文字体：解包 UI 全篇用方正雅士黑（生僻字靠 Noto 兜底）
    ("yahei-bold.woff",  "yahei-bold"),
    ("yahei-medium.woff","yahei-medium"),
]


def font_src(fname):
    """字体源：v1.9.02 用户把 `字体/工程产出/*.woff` 提了一层到 `字体/*.woff`，
    老布局仍要认（三种都试，谁存在用谁）。"""
    for rel in (("字体", fname), ("字体", "工程产出", fname), ("字体库", "工程产出", fname)):
        p = A(*rel)
        if os.path.isfile(p):
            return p
    return A("字体", fname)

# 4 段抽卡动画（单抽/十连 × 是否出 5★）
VIDEO_FILES = {
    "single": {"normal": "video/RPs-1-N.webm", "gold": "video/RPs-1-Y.webm"},
    "ten": {"normal": "video/RPm-10-N.webm", "gold": "video/RPm-10-Y.webm"},
}


# ---------------------------------------------------------------- 深海回响 V2
# 深海回响奖励轨道界面（1920×1080）。素材来源：用户整理的
# `布局坐标/深海回响/素材副本/`，已按「素材/ 是唯一源」的约定回填到素材库
# （其中 bg-SHHX.png 原库缺失，从素材副本补入 DXT5/）。
# 键名 = 输出文件名，manifest 里直接 ui.deepsea.<键名>。
DEEPSEA_ASSETS = {
    # 背景与摆饰展示
    "bg":          ("部分UI及道具图片/DXT5/bg-SHHX.png", 86),
    # scene（076 的「万金之上」大图）已由按池的 `decor/<官方号>.webp` 取代， 删除
    # 进度轨道（黑底白线，必须 screen）
    # 节点（灯泡 / 环）
    "nodeArrow":   ("朋友分享素材/UI/SysResonance/texture/V2/T_UI_resonance_reward_bg_grade_arrow.png", 94),
    "nodeRing":    ("朋友分享素材/UI/SysResonance/texture/V2/T_UI_resonance_reward_bg_grade_cir_01.png", 92),
    "nodeRingOn":  ("朋友分享素材/UI/SysResonance/texture/V2/T_UI_resonance_reward_bg_grade_cir_02.png", 92),
    # 抽数徽章（外刻度盘 + 内球）
    "badgeBall":   ("朋友分享素材/UI/SysResonance/texture/V2/T_UI_resonance_reward_bg_grade_main.png", 92),
    "badgeDial":   ("朋友分享素材/UI/SysResonance/texture/V2/T_UI_resonance_wish_bg_number_n.png", 94),
    # 蓝色光柱 / 顶部缎带 / 右侧分隔线 / 淡光带
    "beam":        ("朋友分享素材/UI/SysResonance/texture/V2/T_UI_resonance_reward_tuning_currently02.png", 90),
    "ribbon":      ("朋友分享素材/UI/SysResonance/texture/V2/T_UI_resonance_reward_tuning_txtbg01.png", 92),
    "divider":     ("朋友分享素材/UI/SysResonance/texture/V2/T_UI_resonance_reward_tuning_txtbg03.png", 92),
    "glowBand":    ("朋友分享素材/UI/SysResonance/texture/V2/T_UI_resonance_reward_tuning_txtbg04.png", 90),
    # 抽数胶囊底板（116×44，只取形状当 mask 用）
    "numPlate":    ("朋友分享素材/UI/SysResonance/texture/V2/T_UI_resonance_reward_bg_number_01.png", 94),
    # 已领取对勾（75×74 绿圈勾，screen 叠在奖励卡上）
    "hook":        ("朋友分享素材/UI/Common/Textures/T_UI_common_icon_hook_06.png", 94),
    # 返回键三态（69×69）
    "backN":       ("朋友分享素材/UI/Common/Textures/Temp/T_UI_btn_common_back_n.png", 94),
    "backH":       ("朋友分享素材/UI/Common/Textures/Temp/T_UI_btn_common_back_h.png", 94),
    # 奖励卡底：粉底 / 金框雪花（未达成）
    "card":        ("朋友分享素材/UI/Common/Textures/T_UI_common_img_item_bg_golden.png", 92),
}

# 这些素材只当 CSS 蒙版（形状）用，落盘前要把 alpha 拉满
DEEPSEA_MASKS = {"numPlate", "glowBand"}


# ---------------------------------------------------------------- UI 素材表
# (源相对素材根, 输出相对 assets, webp 质量)
U = "朋友分享素材/UI"

UI_ASSETS = [
    # ---------- 主页
    ("主页/主页面素材/bg1.png",                        "ui/home/bg.webp", 84),    # 用户自己设计的主页底图 + 游戏官方 LOGO
    ("主页/主页面素材/主页背景底图.png",               "ui/home/bg-main.webp", 88),
    # 站名艺术字： 换成「心忆共鸣」（预处理见 tools/prep-home.py）
    ("主页/工程产出/logo.png",                         "ui/home/logo.webp", 94),
    # ：横版「无限暖暖」LOGO 回退（与竖版「心忆共鸣」并存）
    ("主页/工程产出/logo-center.png",                  "ui/home/logo-center.webp", 94),
    # 系统图标：动态背景右缘竖排入口 + 左侧栏图标共用
    ("主页/工程产出/sys-ver.png",                      "ui/home/sys-ver.webp", 92),
    ("主页/工程产出/sys-banner.png",                   "ui/home/sys-banner.webp", 92),
    ("主页/工程产出/sys-almanac.png",                  "ui/home/sys-almanac.webp", 92),
    ("主页/工程产出/sys-codex.png",                    "ui/home/sys-codex.webp", 92),
    ("主页/工程产出/sys-gloria.png",                   "ui/home/sys-gloria.webp", 92),
    ("主页/工程产出/sys-home.png",                     "ui/home/sys-home.webp", 92),
    # 主页五个二级入口（pxdesk 定位）
    ("主页/工程产出/nav-ver.png",                      "ui/home/nav-ver.webp", 92),
    ("主页/工程产出/nav-codex.png",                    "ui/home/nav-codex.webp", 92),
    ("主页/工程产出/nav-almanac.png",                  "ui/home/nav-almanac.webp", 92),
    ("主页/工程产出/nav-banner.png",                   "ui/home/nav-banner.webp", 92),
    ("主页/工程产出/nav-gloria.png",                   "ui/home/nav-gloria.webp", 92),
    # 主页装饰件：全部当 screen 混合层用，黑底/透明底都吃得下
    ("主页/主页面素材/T_UI_HUD_img_starlight_right.png",            "ui/home/deco-starlight.webp", 90),
    ("主页/主页面素材/T_UI_Events_Inference_img_start_01.png",       "ui/home/deco-halo.webp", 90),
    ("主页/主页面素材/T_UI_Shop_Starstone_bg_2.png",                "ui/home/deco-ribbon.webp", 90),
    ("主页/主页面素材/T_Glow_Star_02.png",                          "ui/home/deco-stars.webp", 92),
    ("主页/主页面素材/T_UI_HUD_starAFK_effect_star_main_glow.png",  "ui/home/deco-glow.webp", 92),
    ("主页/主页面素材/T_UI_Heart_Light_bg.png",                     "ui/home/deco-beam.webp", 92),

    # ---------- 主页「信封」弹窗：信封正面 / 信封背 / 信纸
    ("0主素材/UI/SysRiverLanternBig/Texture/Receive/T_UI_River_img_cardbg01.png", "ui/mail/env.webp", 92),
    ("0主素材/UI/SysRiverLanternBig/Texture/Receive/T_UI_River_img_cardbg03.png", "ui/mail/back.webp", 92),
    ("0主素材/UI/SysRiverLanternBig/Texture/Receive/T_UI_River_img_cardbg08.png", "ui/mail/paper.webp", 92),

    # ---------- 鼠标指针 / 通用按钮
    # 鼠标：源图 52×60，玩家反馈「指针太大」，缩到 26×30（正好一半）。
    # 元组第 4 项是 scale，不写就按原尺寸转（见 UI_ASSETS 循环）。
    (f"{U}/Common/Cursor/UI_Common_Mouse_img.png",                 "ui/cursor/mouse.webp", 92, (26, 30)),
    (f"{U}/Common/Textures/T_UI_btn_common_skip_n.png",            "ui/btn/skip.webp", 92),
    # 圆形按钮三态：返回 / 关闭（都是 95×96 的棕金圆钮）
    (f"{U}/Common/Textures/T_UI_common_btn_back_n.png",            "ui/btn/back-n.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_btn_back_h.png",            "ui/btn/back-h.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_btn_close_n.png",           "ui/btn/close-n.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_btn_close_h.png",           "ui/btn/close-h.webp", 94),
    # 加的「套装详情 → 服装图鉴」跳转键（74×74），此前只手工塞过 manifest，重跑就丢
    (f"{U}/Common/Textures/Button_Icon/T_UI_interaction_icon_21.png",  "ui/btn/jump.webp", 94),
    # 彩蛋弹窗左右翻页键（74×74），同上
    (f"{U}/Common/Textures/T_UI__collocation_btn_skip_n.png",      "ui/egg/skip-n.webp", 94),
    (f"{U}/Common/Textures/T_UI__collocation_btn_skip_h.png",      "ui/egg/skip-h.webp", 94),

    # ---------- 心忆奇想工坊（更新程序）顶栏图标
    # 用户指定：帮助 = Rule / Rule_h，重新读取 = physical_reset_s / _h，
    # 左上角 = ps5_update_n，关闭 = TopHUDbtn_back_n
    (f"{U}/Common/Textures/T_UI_btn_common_icon_Rule.png",         "ui/updater/rule-n.webp", 94),
    (f"{U}/Common/Textures/T_UI_btn_common_icon_Rule_h.png",       "ui/updater/rule-h.webp", 94),
    (f"{U}/Common/Textures/T_UI_physical_btn_reset_s.png",         "ui/updater/reset-n.webp", 94),
    (f"{U}/Common/Textures/T_UI_physical_btn_reset_h.png",         "ui/updater/reset-h.webp", 94),
    (f"{U}/Common/Textures/SystemIcon/T_UI_photo_btn_ps5_update_n.png", "ui/updater/seal.webp", 94),
    (f"{U}/Common/Textures/T_UI_Common_TopHUDbtn_back_n.png",      "ui/updater/close.webp", 94),
    # ：DLC 面板的上传 / 下载按钮（用户指定 SuitShow 里的这两张）
    (f"{U}/Common/Textures/SuitShow/T_UI_upload.png",              "ui/updater/upload.webp", 92),
    (f"{U}/Common/Textures/SuitShow/T_UI_download.png",            "ui/updater/download.webp", 92),

    # 共鸣页：卡池列表条目的名称底条 + 标题背光（T_UI_Glow_23，512×512）
    (f"{U}/SysResonance/Texture/V2/T_UI_resonance_bg_list_line.png",             "ui/banner/list-line.webp", 92),
    (f"{U}/UIParticle/Texture/T_UI_Glow_23.png",                                 "ui/banner/glow-title.webp", 92),

    # ---------- 共鸣页（2.10 执律的流金 实机版式）
    # 卡池类型标签：01 常驻蓝 / 02 限定金 / 03 联动限定绿（168×60）
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_bg_limit_01.png",              "ui/banner/tag-standard.webp", 94),
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_bg_limit_02.png",              "ui/banner/tag-limited.webp", 94),
    ("部分UI及道具图片/DXT5/T_UI_resonance_bg_limit_03.png",                      "ui/banner/tag-collab.webp", 94),
    # 卡池缩略图的米白光框（268×148）
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_bg_list_line_h.png",           "ui/banner/card-frame.webp", 94),
    # 底部三段长按钮（超值礼包 / 共鸣详情 / 套装展示，624×100）
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_btn_long_details_s.png",       "ui/banner/long-bar.webp", 92),
    # 视频 / 静态背景切换键
    (f"{U}/Common/Textures/T_UI_common_btn_cloud_replace_01_n.png",              "ui/banner/switch.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_btn_cloud_replace_01_h.png",              "ui/banner/switch-h.webp", 92),
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_icon_switchover.png",          "ui/banner/switch-ico.webp", 94),
    # 金色描边（活动条 / 高亮）
    (f"{U}/Common/Textures/T_UI_common_btn_golden_edge.png",                     "ui/banner/golden-edge.webp", 92),
    # 列表分割线
    (f"{U}/Common/Textures/T_UI_task_img_line_01.png",                           "ui/banner/divider.webp", 94),
    # 社交 / 分享条
    (f"{U}/Common/Textures/T_UI_social_performance_bg.png",                      "ui/banner/social-bg.webp", 92),
    # 深海回响活动签（常态 / 高亮）
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_btn_limitwish_n.png",          "ui/banner/wish-n.webp", 92),
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_btn_limitwish_h.png",          "ui/banner/wish-h.webp", 92),
    # 共鸣按钮（白 / 金，356×112，文字已烘焙）
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_common_btn_white_n.png",       "ui/banner/pull-white.webp", 94),
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_common_btn_yellow_n.png",      "ui/banner/pull-yellow.webp", 94),
    # 套名横幅（通用款，060 的 name01/name02：
    # name01 = 粉、name02 = 紫。332×96，可见底板 254×54）
    (f"{U}/SysResonance/texture/Pic/060/T_UI_resonance_gacha_060_name01.png",     "ui/banner/set-name-01.webp", 94),
    (f"{U}/SysResonance/texture/Pic/060/T_UI_resonance_gacha_060_name02.png",     "ui/banner/set-name-02.webp", 94),
    # 套装详情弹层：五种主属性的插画（416×628）+ 纸底（520×252）
    (f"{U}/SysBattlePass/Texture/Item/T_UI_BP_img_dp14.png",                      "ui/popup/art-elegant.webp", 92),
    (f"{U}/SysBattlePass/Texture/Item/T_UI_BP_img_dp16.png",                      "ui/popup/art-fresh.webp", 92),
    (f"{U}/SysBattlePass/Texture/Item/T_UI_BP_img_dp18.png",                      "ui/popup/art-sexy.webp", 92),
    (f"{U}/SysBattlePass/Texture/Item/T_UI_BP_img_dp9.png",                       "ui/popup/art-cool.webp", 92),
    (f"{U}/SysBattlePass/Texture/Item/T_UI_BP_img_dp11.png",                      "ui/popup/art-sweet.webp", 92),
    (f"{U}/SysBag/Textures/T_UI_common_img_item_tips_bg_golden.png",              "ui/popup/plate-elegant.webp", 92),
    (f"{U}/SysBag/Textures/T_UI_common_img_item_tips_bg_green.png",               "ui/popup/plate-fresh.webp", 92),
    (f"{U}/SysBag/Textures/T_UI_common_img_item_tips_bg_purple.png",              "ui/popup/plate-sexy.webp", 92),
    (f"{U}/SysBag/Textures/T_UI_common_img_item_tips_bg_blue.png",                "ui/popup/plate-cool.webp", 92),
    (f"{U}/SysBag/Textures/T_UI_common_img_item_tips_bg_normal.png",              "ui/popup/plate-sweet.webp", 92),
    # 套装详情弹层的「外框 / 装饰」——全部按 pxdesk 里用户实际用的素材反查出来的
    (f"{U}/SysSnailCityPages/Texture/UI_events_rule_top_bg02.png",                 "ui/popup/bg.webp", 90),
    (f"{U}/SysSnailCityPages/Texture/T_UI_events_rule_black_bg_02.png",           "ui/popup/glow.webp", 90),
    (f"{U}/SysSnailCityPages/Texture/UI_events_rule_btn_n.png",                   "ui/popup/name-n.webp", 92),
    (f"{U}/SysSnailCityPages/Texture/UI_events_rule_btn_h.png",                   "ui/popup/name-h.webp", 92),
    (f"{U}/Common/Resource/T_UI_common_quality_star_n.png",                       "ui/popup/star.webp", 94),
    (f"{U}/Common/Textures/T_UI_Common_ih_img_arrow.png",                         "ui/popup/slot-bg.webp", 94),
    (f"{U}/SysSnailCityPages/Texture/T_UI_events_rule_img_ribbon_01.png",         "ui/popup/ribbon-1.webp", 92),
    (f"{U}/SysSnailCityPages/Texture/T_UI_events_rule_img_ribbon_01-2.png",       "ui/popup/ribbon-2.webp", 92),
    (f"{U}/SysSnailCityPages/Texture/T_UI_events_rule_img_pocky_02.png",          "ui/popup/pocky.webp", 90),
    (f"{U}/SysSnailCityPages/Texture/T_UI_events_rule_img_light_03.png",          "ui/popup/light.webp", 90),
    (f"{U}/SysSnailCityPages/Texture/T_UI_events_rule_line01.png",                "ui/popup/line-1.webp", 94),
    (f"{U}/SysSnailCityPages/Texture/T_UI_events_rule_line01-2.png",              "ui/popup/line-2.webp", 94),
    (f"{U}/SysSnailCityPages/Texture/T_UI_event_rule_des.png",                    "ui/popup/diamond.webp", 94),
    (f"{U}/SysSnailCityPages/Texture/T_UI_events_rule_top_img03.png",             "ui/popup/band.webp", 92),
    (f"{U}/SysBattlePass/Texture/Item/T_UI_BP_Reward_item_diamond_edge02.png",    "ui/popup/slot-frame.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_item_bg_golden.png",                   "ui/popup/form-card.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_label01.png",                          "ui/popup/label.webp", 94),
    # 进化等级图标：初始/焕新=01、一进/进化=02、二进=03、满进=04
    # _l = 常态（置灰）、_s = 已激活（高亮）
    (f"{U}/SysEvolution/Textures/T_UI_evolution_icon_stage_01_l.png",             "ui/popup/stage-1.webp", 94),
    (f"{U}/SysEvolution/Textures/T_UI_evolution_icon_stage_02_l.png",             "ui/popup/stage-2.webp", 94),
    (f"{U}/SysEvolution/Textures/T_UI_evolution_icon_stage_03_l.png",             "ui/popup/stage-3.webp", 94),
    (f"{U}/SysEvolution/Textures/T_UI_evolution_icon_stage_04_l.png",             "ui/popup/stage-4.webp", 94),
    (f"{U}/SysEvolution/Textures/T_UI_evolution_icon_stage_01_s.png",             "ui/popup/stage-1-on.webp", 94),
    (f"{U}/SysEvolution/Textures/T_UI_evolution_icon_stage_02_s.png",             "ui/popup/stage-2-on.webp", 94),
    (f"{U}/SysEvolution/Textures/T_UI_evolution_icon_stage_03_s.png",             "ui/popup/stage-3-on.webp", 94),
    (f"{U}/SysEvolution/Textures/T_UI_evolution_icon_stage_04_s.png",             "ui/popup/stage-4-on.webp", 94),
    # 属性标签胶囊（按《标签颜色映射表》分色；label08 原素材缺失，用 label09 改色补的紫色）
    (f"{U}/Common/Textures/T_UI_common_img_label01.png",                          "ui/popup/label-01.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_label02.png",                          "ui/popup/label-02.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_label03.png",                          "ui/popup/label-03.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_label04.png",                          "ui/popup/label-04.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_label05.png",                          "ui/popup/label-05.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_label06.png",                          "ui/popup/label-06.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_label07.png",                          "ui/popup/label-07.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_label08.png",                          "ui/popup/label-08.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_label09.png",                          "ui/popup/label-09.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_label10.png",                          "ui/popup/label-10.webp", 94),
    # 部件格：常态 160×160 / 悬停 162×170（金色发光边）
    (f"{U}/Common/Textures/T_UI_common_img_item_bg_empty.png",                    "ui/popup/slot.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_item_bg_0pink_s.png",                  "ui/popup/slot-hover.webp", 94),
    # 共鸣详情弹窗美术（羊皮纸底 + 三道金线框）
    (f"{U}/Common/Textures/T_UI_common_img_window_bg_01.png",                     "ui/window/bg-01.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_window_bg_01_line.png",                "ui/window/bg-01-line.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_window_bg_04_line.png",                "ui/window/bg-04-line.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_window_bg_03_line.png",                "ui/window/bg-03-line.webp", 94),
    # 卡池主背景原图（2560×1440，实机按 0.75 缩放到 1920×1080 显示）
    ("部分UI及道具图片/DXT5/T_UI_resonance_gacha_076_bg_Vx.png", "ui/banner/bg-076.webp", 88),
    # 货币栏下划线（624×100 素材，金色细线在底部）
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_btn_long_details_n.png",      "ui/banner/long-details-n.webp", 94),
    # 深海回响礼盒图标
    ("深海回响奖励/Flowing Spectrum_ Selectable.png",                             "ui/banner/gift-flower.webp", 92),
    # ⚠ `ui/banner/thumbs/1~6.webp` 已废弃：那 6 张「卡池界面缩略图」是早期
    #   实机截图里硬塞的，列表改成按阁取 `banners/thumb/<编号>.webp` 之后它们全程用不上，
    #   和 banners/thumb 的内容也是同一批。用户 2026-11-08 要求删掉整个目录。

    # ---------- 单抽详情（衣服展示）
    # 单抽展示整屏底板：由解包 bg + bg_right 校色合成（1920×1080）。
    # 解包那两张单独看是暖棕，叠起来仍然偏棕；实机是「上紫下暖」，
    # 所以用这张已对齐实机的底板当底，bg / bg-right 只留作备用。
    ("还原底板/单抽展示_背景底板.png",                    "ui/detail/bg-plate.webp", 90),
    (f"{U}/SysReward/Textures/T_showpic_clothes_bg.png",                  "ui/detail/bg.webp", 86),
    (f"{U}/SysReward/Textures/T_showpic_clothes_bg_right.png",            "ui/detail/bg-right.webp", 86),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_frame.png",           "ui/detail/frame.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_board_01.png",        "ui/detail/board-1.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_board_02.png",        "ui/detail/board-2.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_board_03.png",        "ui/detail/board-3.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_board_04.png",        "ui/detail/board-4.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_boardorname_01.png",  "ui/detail/orname-1.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_boardorname_02.png",  "ui/detail/orname-2.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_bg_right_orname_01.png",  "ui/detail/ring.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_logo_right.png",      "ui/detail/logo.webp", 90),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_card_deco_01.png",    "ui/detail/deco-1.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_card_deco_02.png",    "ui/detail/deco-2.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_card_deco_03.png",    "ui/detail/deco-3.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_line_02.png",         "ui/detail/line-2.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_tips_01.png",         "ui/detail/tips-1.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_tips_02.png",         "ui/detail/tips-2.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_tips_03.png",         "ui/detail/tips-3.webp", 92),
    (f"{U}/Common/Resource/T_UI_common_quality_star_n.png",               "ui/detail/star.webp", 92),
    (f"{U}/Common/Textures/Reward/T_UI_attributes_img_btn_bg.png",        "ui/detail/label-bg.webp", 92),
    # 部件详情 03/05 号界面补件（来自「界面标注」的图层表）
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_line_01.png",         "ui/detail/line-1.webp", 94),
    (f"{U}/Common/Textures/T_UI_123.png",                                 "ui/detail/icon-item.webp", 92),
    (f"{U}/Image/Showpic/T_showpic_clothes_blank.png",                    "ui/detail/cloth-blank.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_boardorname_03.png",  "ui/detail/orname-3.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_orname_silk_ribbon.png", "ui/detail/silk-ribbon.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_orname_text_01.png",  "ui/detail/orname-text.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_orname_text_02.png",  "ui/detail/orname-text-2.webp", 94),
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_ornament_03.png",     "ui/detail/ornament-3.webp", 92),
    (f"{U}/Common/Textures/KeyTips/T_UI_KeyTips_key_f.png",               "ui/btn/key-f.webp", 94),
    (f"{U}/Common/Textures/T_UI_KeyTips_Left_Mouse.png",                  "ui/btn/key-mouse.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_label01.png",                  "ui/detail/label-1.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_label05.png",                  "ui/detail/label-5.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_label02.png",                  "ui/detail/label-2.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_label03.png",                  "ui/detail/label-3.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_label04.png",                  "ui/detail/label-4.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_label06.png",                  "ui/detail/label-6.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_label07.png",                  "ui/detail/label-7.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_label09.png",                  "ui/detail/label-9.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_label10.png",                  "ui/detail/label-10.webp", 92),
    # 属性标签（甜美粉 / 典雅金 / 清新绿 / 性感紫 / 帅气蓝）
    (f"{U}/Common/Textures/T_UI_common_img_tag01.png",                    "ui/detail/tag-1.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_tag02.png",                    "ui/detail/tag-2.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_tag03.png",                    "ui/detail/tag-3.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_tag04.png",                    "ui/detail/tag-4.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_tag05.png",                    "ui/detail/tag-5.webp", 94),

    # ---------- 十连结果卡牌

    # ---------- 套装获得
    # 背景整图：素材/抽卡奖励界面/SysReward.png（1920×1080，非 SysReward/Textures 下）
    ("抽卡奖励界面/SysReward.png",                                        "ui/suit/bg.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_frame_01.png",               "ui/suit/frame-1.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_frame_02.png",               "ui/suit/frame-2.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_frame_04.png",               "ui/suit/frame-4.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_bg_light.png",               "ui/suit/light.webp", 90),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_bg_light.png",           "ui/suit/img-light.webp", 90),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_ornament_01.png",        "ui/suit/orn-1.webp", 90),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_ornament_02.png",        "ui/suit/orn-2.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_line_01.png",            "ui/suit/line-1.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_line_02.png",            "ui/suit/line-2.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_line_03.png",            "ui/suit/line-3.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_board_01.png",           "ui/suit/board-1.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_board_02.png",           "ui/suit/board-2.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_board_03.png",           "ui/suit/board-3.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_board_04.png",           "ui/suit/board-4.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_schedule_01.png",        "ui/suit/sched-1.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_schedule_02.png",        "ui/suit/sched-2.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_schedule_bg.png",        "ui/suit/sched-bg.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_schedule_full.png",      "ui/suit/sched-full.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_schedule_fullbg.png",    "ui/suit/sched-fullbg.webp", 92),
    (f"{U}/SysReward/Textures/T_showpic_suit_img_schedule_star.png",      "ui/suit/sched-star.webp", 92),
    (f"{U}/Common/Textures/T_UI_Common_Tab_SelectIcon.png",               "ui/suit/spark.webp", 94),
    (f"{U}/SysReward/Textures/T_showpic_suit_glow_line_01.png",          "ui/suit/glow-1.webp", 94),
    (f"{U}/SysReward/Textures/T_showpic_suit_glow_line_02.png",          "ui/suit/glow-2.webp", 94),
    (f"{U}/SysReward/Textures/T_showpic_suit_glow_line_03.png",          "ui/suit/glow-3.webp", 94),
    (f"{U}/SysReward/Textures/T_showpic_Suit_img_ornament_03.png",       "ui/suit/orn-3.webp", 94),
    # 套装获得页右上角的贴身小纹样（117×100，用户 2026-11-03 指定；与上面的 orn-3 是两张不同的图）
    (f"{U}/SysReward/Textures/T_showpic_clothes_img_ornament_03.png",    "ui/suit/orn-clothes-3.webp", 94),

    # ---------- 十连结果页
    ("抽卡奖励界面/SysResonance-10.png",                                   "ui/result/bg.webp", 90),
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_bg_character_01.png",   "ui/result/char-1.webp", 94),
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_bg_character_02.png",   "ui/result/char-2.webp", 94),
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_bg_character_03.png",   "ui/result/char-3.webp", 94),
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_bg_Glow_Purple.png",    "ui/result/glow-purple.webp", 90),
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_bg_Glow_Pink.png",      "ui/result/glow-pink.webp", 90),
    (f"{U}/Common/Textures/RedPoint/T_UI_common_img_new_01.png",          "ui/result/new-badge.webp", 94),
    (f"{U}/Common/Textures/T_UI_reward_new_img_new.png",                  "ui/result/new-suit.webp", 94),
    (f"{U}/Common/Textures/Material_Icon/T_icon_shop_0003.png",           "ui/result/mat-3.webp", 92),
    (f"{U}/Common/Textures/Material_Icon/T_icon_shop_0004.png",           "ui/result/mat-4.webp", 92),
    # 「×n」角标的两层底（pxdesk 里叫「柔层」和「下划线」）
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_bg.png",                "ui/result/soft.webp", 90),
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_btn_long_details_n.png", "ui/result/line.webp", 94),

    # ---------- 版本选择页
    (f"{U}/SysLogin/Texture/T_UI_login_bg.png",                           "ui/ver/bg.webp", 88),
    (f"{U}/SysHeart/texture/T_UI_ih_btn_next_s.png",                      "ui/ver/next-n.webp", 94),
    (f"{U}/SysHeart/texture/T_UI_ih_btn_next_h.png",                      "ui/ver/next-h.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_btn_option_01_n.png",              "ui/ver/opt-n.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_btn_option_01_s.png",              "ui/ver/opt-s.webp", 94),
    (f"{U}/Common/Textures/T_UI_tower_icon_main_page_03.png",             "ui/ver/tower-1.webp", 94),
    (f"{U}/Common/Textures/T_UI_tower_icon_main_page_04.png",             "ui/ver/tower-2.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_btn_title_l.png",                  "ui/ver/title-n.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_btn_title_h.png",                  "ui/ver/title-h.webp", 94),
    (f"{U}/Common/Textures/T_UI_checkin_img_pic.png",                     "ui/ver/pic-frame.webp", 90),
    (f"{U}/Common/Textures/T_UI_common_img_item_bg_0pink_h.png",          "ui/ver/pink-h.webp", 92),
    # 版本大图底边装饰（与深海回响的 tuning_txtbg03 同源）
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_reward_tuning_txtbg03.png", "ui/ver/desc-orn.webp", 92),
    # 十连「恭喜获得」弹窗
    (f"{U}/Common/Textures/T_UI_common_section_start_n_08.png",            "ui/reward/section.webp", 92),
    (f"{U}/Common/Textures/Reward/T_UI_reward_bg_rewardword_02.png",       "ui/reward/word.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_arrow_n.png",                   "ui/reward/arrow.webp", 94),
    (f"{U}/Common/Textures/T_UI_common_img_item_bg_blue.png",              "ui/reward/item-3.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_item_bg_purple.png",            "ui/reward/item-4.webp", 92),
    (f"{U}/Common/Textures/T_UI_common_img_item_bg_golden.png",            "ui/reward/item-5.webp", 92),
    # 恭喜获得弹窗（pxdesk 反查到的另外三件）
    (f"{U}/SysClothes/Textures/Ability/T_UI_dresup_bg_details.png",        "ui/reward/strip.webp", 90),
    (f"{U}/SysClothes/Textures/Ability/T_UI_configure_img_skillsuit_lline_n.png", "ui/reward/bar.webp", 94),
    (f"{U}/SysResonance/texture/V2/T_UI_resonance_btn_long_details_h.png", "ui/reward/line-h.webp", 92),
    # ---------- 博物图鉴（M1 主界面 + 搜索弹窗）
    ("博物图鉴/主界面/心愿原野.png",                        "ui/museum/bg-wish.webp", 84),
    ("博物图鉴/主界面/伊赞之土.png",                        "ui/museum/bg-yizan.webp", 84),
    ("博物图鉴/按键/T_UI_btn_common_back_h.png",            "ui/museum/btn-back-h.webp", 94),
    ("博物图鉴/按键/T_UI_common_img_menu_s.png",            "ui/museum/btn-menu.webp", 94),
    ("博物图鉴/按键/T_UI_common_btn_close_02_n.png",        "ui/museum/btn-close-n.webp", 94),
    ("博物图鉴/按键/T_UI_common_btn_close_02_h.png",        "ui/museum/btn-close-h.webp", 94),
    ("博物图鉴/搜索栏/T_UI_NTASK_bg_02.png",                "ui/museum/search-bg.webp", 88),
    ("博物图鉴/搜索栏/T_UI_NTASK_bg_task_06.png",           "ui/museum/search-bar.webp", 90),
    ("博物图鉴/搜索栏/T_UI_common_btn_search_02_n.png",     "ui/museum/search-icon.webp", 94),
    ("朋友分享素材/UI/Common/Textures/T_UI_common_next_btn.png", "ui/museum/next-btn.webp", 94),
    # 交互项拆分图（用户逐物体抠好、带 alpha）—— 热区轮廓从它的 alpha 描出来，悬停金光也用它当蒙版
    ("博物图鉴/主界面/拆分/心愿原野-服装图鉴.png",            "ui/museum/split/wish-clothes.webp", 86),
    ("博物图鉴/主界面/拆分/心愿原野-故事图鉴.png",            "ui/museum/split/wish-story.webp", 86),
    ("博物图鉴/主界面/拆分/心愿原野-阅读物图鉴.png",          "ui/museum/split/wish-reading.webp", 86),
    ("博物图鉴/主界面/拆分/心愿原野-放大镜.png",              "ui/museum/split/wish-search.webp", 86),
    ("博物图鉴/主界面/拆分/伊赞之土-服装图鉴.png",            "ui/museum/split/yizan-clothes.webp", 86),
    ("博物图鉴/主界面/拆分/伊赞之土-故事图鉴.png",            "ui/museum/split/yizan-story.webp", 86),
    ("博物图鉴/主界面/拆分/伊赞之土-阅读物图鉴.png",          "ui/museum/split/yizan-reading.webp", 86),
    ("博物图鉴/主界面/拆分/伊赞之土-放大镜.png",              "ui/museum/split/yizan-search.webp", 86),
    # ---------- 博物图鉴 M2 服装图鉴子界面
    ("博物图鉴/子界面-服装图鉴界面/T_UI_book_clothes_bg.png",  "ui/museum/clothes/bg.webp", 84),
    ("博物图鉴/子界面-服装图鉴界面/T_UI_book_search_textures_suitshow_n_01.png",
     "ui/museum/clothes/show-texture.webp", 88),
    ("博物图鉴/子界面-服装图鉴界面/T_UI_Console_icon_plog.png", "ui/museum/clothes/plog.webp", 94),
    ("博物图鉴/子界面-服装图鉴界面/T_UI_resonance_bg_list_line_h.png",
     "ui/museum/clothes/set-item.webp", 92),
    ("博物图鉴/子界面-服装图鉴界面/T_UI_resonance_common_btn_white_n.png",
     "ui/museum/clothes/btn-white.webp", 92),
    ("博物图鉴/子界面-服装图鉴界面/T_UI_resonance_common_btn_gray.png",
     "ui/museum/clothes/btn-gray.webp", 92),
    ("博物图鉴/子界面-服装图鉴界面/T_UI_common_btn_arrow_n.png", "ui/museum/clothes/arrow-n.webp", 94),
    ("博物图鉴/子界面-服装图鉴界面/T_UI_common_btn_arrow_h.png", "ui/museum/clothes/arrow-h.webp", 94),
    ("博物图鉴/子界面-服装图鉴界面/区域选项卡.png",            "ui/museum/clothes/region-tab.webp", 94),
    ("博物图鉴/子界面-服装图鉴界面/信息栏羊皮纸.png",          "ui/museum/clothes/paper.webp", 90),
    ("博物图鉴/子界面-服装图鉴界面/花瓣装饰.png",              "ui/museum/clothes/petals.webp", 92),
    ("博物图鉴/子界面-服装图鉴界面/T_UI_Collage_free_02.png",  "ui/museum/clothes/collage.webp", 88),
    ("博物图鉴/子界面-服装图鉴界面/T_UI_Collage_f_1.png",      "ui/museum/clothes/radar-frame.webp", 90),
    ("博物图鉴/子界面-服装图鉴界面/1793115502748_100.png",     "ui/museum/clothes/decor.webp", 90),
    ("朋友分享素材/UI/Common/Textures/T_showpic_bg_clothes.png", "ui/museum/clothes/show-bg.webp", 88),
    ("博物图鉴/按键/T_UI_common_btn_arrow_n.png",             "ui/museum/clothes/back-n.webp", 94),
    ("博物图鉴/按键/T_UI_common_btn_arrow_h.png",             "ui/museum/clothes/back-h.webp", 94),
    # 套装选择栏按键（5 属性 + 选中/悬停/禁用）
    ("博物图鉴/套装选择栏按键/套装选择栏按键-甜美.png",        "ui/museum/clothes/tag-sweet.webp", 92),
    ("博物图鉴/套装选择栏按键/套装选择栏按键-典雅.png",        "ui/museum/clothes/tag-elegant.webp", 92),
    ("博物图鉴/套装选择栏按键/套装选择栏按键-清新.png",        "ui/museum/clothes/tag-fresh.webp", 92),
    ("博物图鉴/套装选择栏按键/套装选择栏按键-性感.png",        "ui/museum/clothes/tag-sexy.webp", 92),
    ("博物图鉴/套装选择栏按键/套装选择栏按键-帅气.png",        "ui/museum/clothes/tag-cool.webp", 92),
    ("博物图鉴/套装选择栏按键/套装选择栏按键-悬停&选中.png",  "ui/museum/clothes/tag-on.webp", 94),
    ("博物图鉴/套装选择栏按键/套装选择栏按键-禁用态.png",      "ui/museum/clothes/tag-off.webp", 92),
    ("朋友分享素材/UI/Common/Textures/T_UI_common_img_item_bg_empty.png",
     "ui/museum/clothes/item-empty.webp", 94),
    # ── 阅读物图鉴（M3）──
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_bg.png", "ui/museum/readings/bg-wish.webp", 84),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_02_bg.png", "ui/museum/readings/bg-yizan.webp", 84),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_bg_reel.png", "ui/museum/readings/reel-wish.webp", 86),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_02_bg_reel.png", "ui/museum/readings/reel-yizan.webp", 86),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_bg_reel_paper.png", "ui/museum/readings/paper-wish.webp", 88),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_02_bg_reel_paper.png", "ui/museum/readings/paper-yizan.webp", 88),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_bg_tab.png", "ui/museum/readings/tab-wish.webp", 90),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_02_bg_tab.png", "ui/museum/readings/tab-yizan.webp", 90),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_btn_tab_selected_n.png", "ui/museum/readings/tab-sel-n.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_btn_tab_selected_h.png", "ui/museum/readings/tab-sel-h.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_img_label.png", "ui/museum/readings/label-wish.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_img_label-2.png", "ui/museum/readings/label-yizan.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_img_label_shadow.png", "ui/museum/readings/label-shadow.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_readings_img_tab_line.png", "ui/museum/readings/tab-line.webp", 94),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/T_UI_common_img_line_01.png", "ui/museum/readings/top-line.webp", 94),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/T_UI_readings_img_dec_magnifyingglass.png", "ui/museum/readings/magnifier-wish.webp", 90),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/T_UI_readings_02_img_dec_magnifyingglass.png", "ui/museum/readings/magnifier-yizan.webp", 90),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/T_UI_readings_img_dec_papercranes.png", "ui/museum/readings/papercranes.webp", 90),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/T_UI_readings_02_img_dec_lace.png", "ui/museum/readings/lace.webp", 90),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/T_UI_events_rule_img_dec02.png", "ui/museum/readings/maple.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/T_UI_events_rule_img_messagedec03.png", "ui/museum/readings/spiral.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/锁/T_UI_common_icon_lock_n_01.png", "ui/museum/readings/lock-01.webp", 94),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/锁/T_UI_common_icon_lock_n_02.png", "ui/museum/readings/lock-02.webp", 94),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/锁/T_UI_common_icon_lock_n_03.png", "ui/museum/readings/lock-03.webp", 94),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/锁/T_UI_common_icon_lock_03.png", "ui/museum/readings/lock-chain.webp", 94),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/锁/T_UI_common_icon_lock_04.png", "ui/museum/readings/lock-04.webp", 94),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/T_UI_chat_img_sticker_0268.png", "ui/museum/readings/empty-sticker.webp", 92),
    ("朋友分享素材/UI/Common/Textures/T_UI_common_bg_placename.png", "ui/museum/readings/placename.webp", 92),
    ("博物图鉴/按键/T_UI_KeyTips_key_q.png", "ui/museum/readings/key-q.webp", 94),
    ("博物图鉴/按键/T_UI_KeyTips_key_e.png", "ui/museum/readings/key-e.webp", 94),
    # 随机彩蛋装饰库（各 10 张）
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-心愿原野/T_UI_achievement_illustration_002.png", "ui/museum/readings/sticker-wish-01.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-心愿原野/T_UI_achievement_illustration_003.png", "ui/museum/readings/sticker-wish-02.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-心愿原野/T_UI_achievement_illustration_005.png", "ui/museum/readings/sticker-wish-03.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-心愿原野/T_UI_achievement_illustration_007.png", "ui/museum/readings/sticker-wish-04.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-心愿原野/T_UI_achievement_illustration_010.png", "ui/museum/readings/sticker-wish-05.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-心愿原野/T_UI_achievement_illustration_012.png", "ui/museum/readings/sticker-wish-06.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-心愿原野/T_UI_achievement_illustration_017.png", "ui/museum/readings/sticker-wish-07.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-心愿原野/T_UI_achievement_illustration_031.png", "ui/museum/readings/sticker-wish-08.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-心愿原野/T_UI_achievement_illustration_032.png", "ui/museum/readings/sticker-wish-09.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-心愿原野/T_UI_achievement_illustration_040.png", "ui/museum/readings/sticker-wish-10.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-伊赞之土/T_UI_achievement_illustrationV2_003.png", "ui/museum/readings/sticker-yizan-01.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-伊赞之土/T_UI_achievement_illustrationV2_004.png", "ui/museum/readings/sticker-yizan-02.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-伊赞之土/T_UI_achievement_illustrationV2_005.png", "ui/museum/readings/sticker-yizan-03.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-伊赞之土/T_UI_achievement_illustrationV2_008.png", "ui/museum/readings/sticker-yizan-04.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-伊赞之土/T_UI_achievement_illustrationV2_012.png", "ui/museum/readings/sticker-yizan-05.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-伊赞之土/T_UI_achievement_illustrationV2_018.png", "ui/museum/readings/sticker-yizan-06.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-伊赞之土/T_UI_achievement_illustrationV2_023.png", "ui/museum/readings/sticker-yizan-07.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-伊赞之土/T_UI_achievement_illustrationV2_031.png", "ui/museum/readings/sticker-yizan-08.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-伊赞之土/T_UI_achievement_illustrationV2_035.png", "ui/museum/readings/sticker-yizan-09.webp", 92),
    ("博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/装饰/随机贴纸-伊赞之土/T_UI_achievement_illustrationV2_046.png", "ui/museum/readings/sticker-yizan-10.webp", 92),

    # ─────────── 玄学运势（书桌 + 卷轴； 换高清素材） ───────────
    # 全部来自 `tools/prep-almanac.py` 预处理产物（`素材/玄学运势/素材/工程产出/`），
    # 素材已裁到 alpha 实体框 —— CSS 里「图片边缘 == 实体边缘」，轴杆贴合/双杆紧贴才能精确对齐。
    ("玄学运势/素材/工程产出/bg.png", "ui/almanac/bg.webp", 86),
    ("玄学运势/素材/工程产出/desk.png", "ui/almanac/desk.webp", 84),
    ("玄学运势/素材/工程产出/back-n.png", "ui/almanac/back-n.webp", 92),
    ("玄学运势/素材/工程产出/back-h.png", "ui/almanac/back-h.webp", 92),
    # 场景两种风格（各 50%）：桶 + 四卷轴拆分 + 墨台 + 书写笔
    ("玄学运势/素材/工程产出/basket-eu.png", "ui/almanac/basket-eu.webp", 88),
    ("玄学运势/素材/工程产出/basket-cn.png", "ui/almanac/basket-cn.webp", 88),
    ("玄学运势/素材/工程产出/btn-eu-past.png", "ui/almanac/btn-eu-past.webp", 90),
    ("玄学运势/素材/工程产出/btn-eu-today.png", "ui/almanac/btn-eu-today.webp", 90),
    ("玄学运势/素材/工程产出/btn-eu-future.png", "ui/almanac/btn-eu-future.webp", 90),
    ("玄学运势/素材/工程产出/btn-eu-bazi.png", "ui/almanac/btn-eu-bazi.webp", 90),
    ("玄学运势/素材/工程产出/btn-cn-past.png", "ui/almanac/btn-cn-past.webp", 90),
    ("玄学运势/素材/工程产出/btn-cn-today.png", "ui/almanac/btn-cn-today.webp", 90),
    ("玄学运势/素材/工程产出/btn-cn-future.png", "ui/almanac/btn-cn-future.webp", 90),
    ("玄学运势/素材/工程产出/btn-cn-bazi.png", "ui/almanac/btn-cn-bazi.webp", 90),
    ("玄学运势/素材/工程产出/inkstand-eu.png", "ui/almanac/inkstand-eu.webp", 88),
    ("玄学运势/素材/工程产出/inkstand-cn.png", "ui/almanac/inkstand-cn.webp", 88),
    ("玄学运势/素材/工程产出/quill-eu.png", "ui/almanac/quill-eu.webp", 90),
    ("玄学运势/素材/工程产出/quill-cn.png", "ui/almanac/quill-cn.webp", 90),
    # 书签正/反面（默认显示背面，点击翻到正面看档位）
    ("玄学运势/素材/工程产出/bookmark-back.png", "ui/almanac/bookmark-back.webp", 88),
    ("玄学运势/素材/工程产出/bookmark-front.png", "ui/almanac/bookmark-front.webp", 88),
    # 三套纸面 + 轴杆
    ("玄学运势/素材/工程产出/paper-1.png", "ui/almanac/paper-1.webp", 88),
    ("玄学运势/素材/工程产出/paper-2.png", "ui/almanac/paper-2.webp", 88),
    ("玄学运势/素材/工程产出/paper-3.png", "ui/almanac/paper-3.webp", 88),
    ("玄学运势/素材/工程产出/axle-1.png", "ui/almanac/axle-1.webp", 90),
    ("玄学运势/素材/工程产出/axle-2.png", "ui/almanac/axle-2.webp", 90),
    ("玄学运势/素材/工程产出/axle-3.png", "ui/almanac/axle-3.webp", 90),
    # 七档运势艺术字（缺「大凶」，运行时用「凶」+ 暗红滤镜兜底）
    ("玄学运势/素材/工程产出/tier-great.png", "ui/almanac/tier-great.webp", 90),
    ("玄学运势/素材/工程产出/tier-good.png", "ui/almanac/tier-good.webp", 90),
    ("玄学运势/素材/工程产出/tier-minor-good.png", "ui/almanac/tier-minor-good.webp", 90),
    ("玄学运势/素材/工程产出/tier-neutral.png", "ui/almanac/tier-neutral.webp", 90),
    ("玄学运势/素材/工程产出/tier-minor-bad.png", "ui/almanac/tier-minor-bad.webp", 90),
    ("玄学运势/素材/工程产出/tier-bad.png", "ui/almanac/tier-bad.webp", 90),
    # 主界面标题艺术字「玄运」
    ("玄学运势/素材/工程产出/title.png", "ui/almanac/title.webp", 90),
    # 快速展开 / 收起按钮（原件 31×39，收起用 scaleX(-1) 反向）
    ("朋友分享素材/UI/Common/Textures/T_UI_common_img_arrow_n.png", "ui/almanac/arrow-n.webp", 94),

    # ─────────── 黑屏加载过渡（SysLoading；动图 nikki-run.webp 见 tools/prep-loading.py） ───────────
    ("朋友分享素材/UI/SysLoading/Texture/T_UI_loading_slider_01.png", "ui/loading/slider-off.webp", 92),
    ("朋友分享素材/UI/SysLoading/Texture/T_UI_loading_slider_02.png", "ui/loading/slider-on.webp", 92),
    ("朋友分享素材/UI/SysLoading/Texture/T_UI_loading_special_spirits.png", "ui/loading/spirits.webp", 80),
    ("朋友分享素材/UI/SysLoading/Texture/ScenePhoto/T_UI_loading_img_photo_064.png", "ui/loading/photo-home.webp", 82),
    ("朋友分享素材/UI/SysLoading/Texture/ScenePhoto/T_UI_loading_img_photo_044.png", "ui/loading/photo-ver.webp", 82),
    ("朋友分享素材/UI/SysLoading/Texture/ScenePhoto/T_UI_loading_img_photo_093.png", "ui/loading/photo-banner.webp", 82),
    ("朋友分享素材/UI/SysLoading/Texture/ScenePhoto/T_UI_loading_img_photo_01.png", "ui/loading/photo-codex.webp", 82),
    ("朋友分享素材/UI/SysLoading/Texture/ScenePhoto/T_UI_loading_img_photo_041.png", "ui/loading/photo-almanac.webp", 82),
    ("朋友分享素材/UI/SysLoading/Texture/ScenePhoto/T_UI_loading_img_photo_107.png", "ui/loading/photo-gloria.webp", 82),

    # ─────────── 辉煌心光（设置页重做；预处理产物见 tools/prep-gloria.py） ───────────
    # 四个交互区：1920×1080 全画布叠图（不裁剪，等比缩放后与视频叠加）
    ("辉煌心光/工程产出/ic-stage.png", "ui/gloria/ic-stage.webp", 90),
    ("辉煌心光/工程产出/ic-volume.png", "ui/gloria/ic-volume.webp", 90),
    ("辉煌心光/工程产出/ic-quick.png", "ui/gloria/ic-quick.webp", 90),
    ("辉煌心光/工程产出/ic-save.png", "ui/gloria/ic-save.webp", 90),
    ("辉煌心光/工程产出/back-n.png", "ui/gloria/back-n.webp", 92),
    ("辉煌心光/工程产出/back-h.png", "ui/gloria/back-h.webp", 92),
    ("辉煌心光/工程产出/close-n.png", "ui/gloria/close-n.webp", 92),
    ("辉煌心光/工程产出/close-h.png", "ui/gloria/close-h.webp", 92),
    # 弹窗容器（评分板）+ 左上角名牌（十字准星）+ 二级确认条（pxdesk 合成图）
    ("辉煌心光/工程产出/board.png", "ui/gloria/board.webp", 92),
    ("辉煌心光/工程产出/tab.png", "ui/gloria/tab.webp", 92),
    ("辉煌心光/工程产出/confirm.png", "ui/gloria/confirm.webp", 92),
    ("辉煌心光/工程产出/poster.png", "ui/gloria/poster.webp", 86),
]

# 版本卡（UI/Image/Card）：1.0~2.10 共 23 张，按 card映射表.md 一一对应
VERSION_CARDS = [
    ("1.0", "008"), ("1.1", "010"), ("1.2", "011"), ("1.3", "012"), ("1.4", "013"),
    ("1.5", "014"), ("1.6", "016"), ("1.7", "017"), ("1.8", "018"), ("1.9", "022"),
    ("1.10", "023"), ("1.11", "024"), ("2.0", "030"), ("2.1", "040"), ("2.2", "042"),
    ("2.3", "044"), ("2.4", "046"), ("2.5", "049"), ("2.6", "052"), ("2.7", "054"),
    ("2.8", "056"), ("2.9", "063"), ("2.10", "067"), ("2.11", "069"),
]

# 主页水晶碎块：6 个形状 × 3 态（主体 / 光晕 / 暗态）

# 新货币图标（方案指定路径，优先于 pool-map 的旧图）
CURRENCY_ICONS = {
    "无垠星石": (f"{U}/Common/Textures/Material_Icon/T_icon_shop_0002.png", "starlight"),
    "钻石":     (f"{U}/Common/Textures/Material_Icon/T_icon_shop_0001.png", "diamond"),
    "共鸣水晶": (f"{U}/Common/Textures/Material_Icon/T_UI_icon_016.png",     "crystal"),
    "启示水晶": (f"{U}/Common/Textures/Material_Icon/T_UI_icon_016.png",     "crystal"),
    "静谧水滴": (f"{U}/Common/Textures/Material_Icon/T_icon_shop_0003.png", "drop"),
}

# 方案指定的共鸣按钮（文字已烘焙进图）
RES_BUTTONS = [
    ("部分UI及道具图片/共鸣按钮-单次.png", "ui/btn/res-single.webp"),
    ("部分UI及道具图片/共鸣按钮-十连.png", "ui/btn/res-ten.webp"),
]


def bg4_full_webp(src, dst, quality=88, force=False):
    """整屏背景（2560/2760×1440 这类成品）→ 居中裁 16:9 再缩到 1920×1080。

    和 `bg4_webp` 的区别：那条是给**1000×500 列表图**用的（要按实机截图定标裁一块），
    这里的源已经是整屏成品，302 宽出来的部分（2760 的池）只是左右多给的安全边，
    居中裁掉即可。
    """
    if MANIFEST_ONLY:
        return os.path.exists(dst)
    if not force and not busted(dst) and os.path.exists(dst) and os.path.getsize(dst) > 0:
        STATS["skipped"] += 1
        return True
    if not os.path.exists(src):
        STATS["missing"] += 1
        MISSING.append(src)
        return False
    try:
        from PIL import Image
    except Exception:
        return to_webp(src, dst, quality, force)
    im = Image.open(src).convert("RGB")
    im = crop_16x9(im)
    im = im.resize((1920, 1080), Image.LANCZOS)
    ensure_dir(os.path.dirname(dst))
    im.save(dst, "WEBP", quality=quality, method=6)
    STATS["converted"] += 1
    return True


def crop_16x9(im):
    """按中心裁到 16:9（不缩放）。已经是 16:9 就原样返回。"""
    w, h = im.size
    if abs(w / h - 16 / 9) < 0.01:
        return im
    if w / h > 16 / 9:                      # 太宽 → 裁左右
        nw = round(h * 16 / 9)
        left = (w - nw) // 2
        return im.crop((left, 0, left + nw, h))
    nh = round(w * 9 / 16)                  # 太高 → 裁上下
    top = (h - nh) // 2
    return im.crop((0, top, w, top + nh))


def bg_webp(src, dst, quality=88, force=False):

    """背景统一入口。



    `.png` 有两种来源，靠**宽高比**分辨（文件名不可靠，两边都叫 list-*）：

      · 1000×500（比例 2.0）→ 四星池列表图，走实机定标的裁切放大

      · 2560×1440 等整屏成品 → 居中裁 16:9 后缩到 1920×1080

    非 png（早期转好的 webp）直接转。

    """

    if src.lower().endswith(".png"):

        try:

            from PIL import Image

            with Image.open(src) as im:

                wide, tall = im.size

            if tall and abs(wide / tall - 2.0) < 0.08:

                return bg4_webp(src, dst, quality, force)

        except Exception:

            pass

        return bg4_full_webp(src, dst, quality, force)

    return to_webp(src, dst, quality, force)





def center_alpha_webp(src, dst, quality=92, force=False):

    """艺术字：把 alpha 实体平移到画布正中心，再转 webp。



    为什么（v1.4.03）：卡池名艺术字一张一个尺寸，四周透明边距也不一样

    （1.7「自由的第二章」下面几乎没留白、上面留一大截），`.title-art` 用固定 418×214 的

    contain 时**视觉重心**就偏上，看着「贴着下面的提示文字、离货币栏远」。

    这里不缩放、不改画布尺寸，只把实体搬到画布中心 —— 之后盒子居中就等于实体居中，

    也不用给每个池写死偏移。

    """

    if MANIFEST_ONLY:

        return os.path.exists(dst)

    if not force and not busted(dst) and os.path.exists(dst) and os.path.getsize(dst) > 0:

        STATS["skipped"] += 1

        return True

    if not os.path.exists(src):

        STATS["missing"] += 1

        MISSING.append(src)

        return False

    try:

        from PIL import Image

    except Exception:

        return to_webp(src, dst, quality, force)

    im = Image.open(src).convert("RGBA")

    # 阈值 8：只认「看得见」的像素，别让几乎全透明的光晕把 bbox 撑成整张画布

    bbox = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()

    if bbox:

        w, h = im.size

        bw, bh = bbox[2] - bbox[0], bbox[3] - bbox[1]

        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))

        canvas.paste(im.crop(bbox), ((w - bw) // 2, (h - bh) // 2))

        im = canvas

    ensure_dir(os.path.dirname(dst))

    im.save(dst, "WEBP", quality=quality, method=6)

    STATS["converted"] += 1

    return True


def layer_name(path):
    """分层件输出名：去掉 T_UI_resonance_ 前缀，扩展名统一 .webp

    必须与 to_webp 的输出名严格一致，否则 manifest 会指向不存在的文件。
    坑：raw string 里写两个反斜杠，正则拿到的是「字面反斜杠 + 任意字符」，
    匹配不到 `_PNG.png`，于是 manifest 里残留 .png 导致 404。
    """
    name = re.sub(r"^T_UI_resonance_", "", os.path.basename(path))
    name = re.sub(r"_PNG\.png$", ".webp", name, flags=re.I)
    name = re.sub(r"\.png$", ".webp", name, flags=re.I)
    return name


def milestone_names(milestones):
    """深忆奖励的落盘文件名（不含扩展名），按输入顺序一一对应。

    同一档位可能发多件奖励（076 池 230 抽就是 3 件）。早期版本直接按
    `f"{pulls}.webp"` 命名，后一件把前一件覆盖掉 —— 12 件只落 10 个文件。
    这里按「档位内序号」加后缀：单件仍是 `230`，多件才是 `230-1/230-2/230-3`，
    保持既有单件文件不变，避免无谓的 404。
    """
    total = {}
    for m in milestones:
        total[m["pulls"]] = total.get(m["pulls"], 0) + 1
    seq = {}
    names = []
    for m in milestones:
        p = m["pulls"]
        if total[p] == 1:
            names.append(f"{p}")
        else:
            seq[p] = seq.get(p, 0) + 1
            names.append(f"{p}-{seq[p]}")
    return names


# 五星池 20~100 抽送的都是同一件「流光自选礼盒」，79 个池里 33 个五星池的这 5 档
# 素材逐字节相同（md5 一致，实测 165 个文件同一个哈希）。没必要一池一份 ——
# 统一落成 `milestones/shared/low.webp`，各池 manifest 都指它；120 抽起才是各池专属。
LOW_TIER = (20, 40, 60, 80, 100)
LOW_TIER_WEBP = "milestones/shared/low.webp"


def milestone_target(banner, m, mname):
    """某档奖励图在 public/assets 下的相对路径（正斜杠）。"""
    if m["pulls"] in LOW_TIER:
        return LOW_TIER_WEBP
    return f"milestones/{banner['id']}/{mname}.webp"


def build_sfx_index():
    """原始事件名 → (分类, mp3 文件名)（读 素材/卡池音频/索引.csv）

    坑：部分行的「原始事件名」是 `A;B` 形式（同一音频的多个别名），
    早期版本只存整串，导致 `UI_Common_Button_Big_A_Hover` 这类单名查不到。
    必须按 `;` 拆开逐个别名登记。
    """
    path = A("卡池音频", "索引.csv")
    idx = {}
    if not os.path.exists(path):
        return idx
    with open(path, encoding="utf-8-sig") as f:
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


def build_banner_enter_index():
    """卡池名 → 卡池进入音文件名（01_卡池界面/卡池进入·<ver> <name>.mp3）"""
    d = A("卡池音频", "01_卡池界面")
    out = {}
    if not os.path.isdir(d):
        return out
    for f in os.listdir(d):
        # 文件名形如 `007_卡池进入·1.0 留于花间的浮想.mp3`，前面有序号前缀，
        # 必须用 search 而不是 match
        m = re.search(r"卡池进入·([\d.]+)\s+(.+)\.mp3$", f)
        if m:
            out.setdefault(m.group(2).strip(), f)
    # 人工映射：文件名与池名对不上的（**一律以文件上写的池名为准**，前缀编号不作数）
    out.update({
        # 同一首的两个长度，取短的（进池那一下只露头 2~3 秒）
        "我所行之途": "041_卡池进入·1.11 我所行之途（短）.mp3",
        # 用户当时用拼音首字母命名：绘(H)于(Y)蝶(D)影(Y)的(D)幻(M)梦(H)
        "绘于蝶影的幻梦": "082_卡池进入·HYDYDMH.mp3",
    })
    return out


def build_manual_enter_index():
    """工坊手工指定的进入音：`素材/音频/服装阁进入音/<阁名>.<ext>` → 阁名 → 完整路径。

    文件名就是阁名 —— 和动态背景同一个理由：编号会改，阁名不会。
    这一层**优先于**按 `卡池进入·<版本> <阁名>.mp3` 的自动匹配：
    自动匹配全靠字符串对得上，名字里带空格、符号或者版本号写错时就会静默漏掉，
    手工指定是最后一道保险。
    """
    d = A("音频", "服装阁进入音")
    out = {}
    if not os.path.isdir(d):
        return out
    for f in sorted(os.listdir(d)):
        stem, ext = os.path.splitext(f)
        if ext.lower() not in (".mp3", ".ogg", ".wav", ".m4a", ".flac"):
            continue
        out.setdefault(stem, os.path.join(d, f))
    return out


# ---------------------------------------------------------------- 进化阶段
def _build_stages(s, sid):
    """把套装的 OV 立绘 + 部件卡拼成前端的 `assets.stages`。

    前端两处消费：
      · `stages[0].cards` —— 图鉴详情的**部件试穿图**（按 `部位-部件名` / slot 匹配）
      · `formThumbs` 遍历**所有** stages，每段取一张 `整体-<阶段>` 当形态卡缩略图

    所以：
      · 初始阶段放全部部件卡（`部位-部件名` → `cards/<代号>-<id>.webp`）；
      · 其余阶段各放一张 `整体-<阶段>`（→ `OV-lvN.webp`），供底部形态卡用。

    `stage` 用素材原名（4★ 是「进化」、5★ 是「一进」），前端 FORM_ORDER 两者都认。
    """
    sa = s.get("assets") or {}
    cards = sa.get("cards") or []
    ov = sa.get("ov") or []
    if not cards and not ov:
        return []

    setName = s.get("name") or sid
    out = []

    # ① 初始阶段：全部部位卡 + 一张「整体-初始」（指向 OV-lv0）
    init_cards = []
    ov0 = next((o for o in ov if o["code"] == "OV-lv0"), None)
    if ov0:
        init_cards.append({"name": "整体-初始", "src": f"sets/{sid}/OV-lv0.webp"})
    for c in cards:
        init_cards.append({"name": c["name"], "src": f"sets/{sid}/cards/{c['code']}-{sid}.webp"})
    if init_cards:
        out.append({"stage": "初始", "setName": setName, "cards": init_cards})

    # ② 其余阶段：只给一张整体卡
    for o in ov:
        if o["code"] == "OV-lv0":
            continue
        out.append({
            "stage": o.get("stageRaw") or o.get("stage") or o["code"],
            "setName": setName,
            "cards": [{"name": f"整体-{o.get('stageRaw') or o['code']}",
                       "src": f"sets/{sid}/{o['code']}.webp"}],
        })
    return out


# ---------------------------------------------------------------- 主流程
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pool", action="append", default=[], help="banner id，可多次指定")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--bust", default="", help="强制重转的输出子目录，逗号分隔（如 banners/title,banners/name）")
    ap.add_argument("--no-video", action="store_true", help="跳过视频（卡池动态背景）")
    ap.add_argument("--manifest-only", action="store_true", help="只重建 manifest.json，不动素材")
    ap.add_argument("--milestones-only", action="store_true",
                    help="只转深海回响的奖励图与摆饰大图（低档共用一张），不动其它素材")
    ap.add_argument("--icons", action="store_true",
                    help="轻量：只补全全部套装的部件图标 + 3★ 散件图标（256 透明），然后重建 manifest")
    ap.add_argument("--overrides", default="",
                    help="JSON：{虚拟素材路径: 真实文件}。发行版工坊用 —— "
                         "外部源直接经此重定向进转码，不在磁盘上留素材副本")
    args = ap.parse_args()

    global MANIFEST_ONLY
    MANIFEST_ONLY = args.manifest_only
    global BUST
    BUST = tuple(x.strip() for x in args.bust.split(",") if x.strip())
    # 重定向表：优先命令行，其次环境变量（启动器在写入流程里一次性设好，
    # 后面连着跑 build-pool-map / collect 几条命令时不必每条都带参数）
    ov_path = args.overrides or os.environ.get("NIKKI_OVERRIDES", "")
    if ov_path:
        try:
            with open(ov_path, encoding="utf-8") as f:
                ov = json.load(f)
            if isinstance(ov, dict) and isinstance(ov.get("overrides"), dict):
                ov = ov["overrides"]
            if not isinstance(ov, dict):
                raise ValueError("期望 {虚拟路径: 真实文件} 的对象")
            OVERRIDES.update({
                _norm_key(k): os.path.abspath(v) for k, v in ov.items() if v
            })
            hit = sum(1 for v in OVERRIDES.values() if os.path.isfile(v))
            print(f"[overrides] {len(OVERRIDES)} 条外部源重定向（文件存在 {hit} 条）")
        except Exception as e:
            print(f"[overrides] 读取失败：{type(e).__name__}: {e}")
            return 1
    if MANIFEST_ONLY:
        print("[manifest-only] 仅重建 manifest.json，不转码、不复制")

    pool_map = json.load(open(A("pool-map.json"), encoding="utf-8"))
    banners = pool_map["banners"]

    # 版本卡编号以 pool-map.versions 为准（它来自 素材/信息表/版本表.csv）：
    # 更新程序新增版本时只写一行 CSV，这里自动跟上；常量只做「CSV 里没有时」的兜底。
    global VERSION_CARDS
    _cards = dict(VERSION_CARDS)
    for _v in pool_map.get("versions", []):
        if _v.get("cardNo"):
            _cards[_v["version"]] = _v["cardNo"]
    VERSION_CARDS = sorted(
        _cards.items(),
        key=lambda kv: [int(n) for n in re.findall(r"\d+", kv[0])] or [999],
    )
    if args.all:
        targets = banners
    elif args.pool:
        ids = set(args.pool)
        targets = [b for b in banners if b["id"] in ids]
        if not targets:
            print(f"未找到卡池: {args.pool}")
            return 1
    elif args.icons or args.milestones_only:
        # 轻量模式：manifest 仍要覆盖全部卡池（否则 banners 被清空、前端无池可用），
        # 只是下方「卡池素材」拷贝按 ICON_ONLY 跳过
        targets = banners
    else:
        print("请指定 --pool <id> 或 --all")
        return 1

    ensure_dir(OUT)
    print(f"目标 {len(targets)} 个卡池 → {OUT}")

    # 深海回响专项：奖励图 + 摆饰大图。单独一条路径是因为这两类是「全池一次补齐」的，
    # 走 --all 会顺带比对 8000+ 个其它素材（几分钟）。
    if args.milestones_only:
        n_ms = n_dc = 0
        for b in banners:
            ms_list = b["assets"].get("milestones", [])
            for m, mname in zip(ms_list, milestone_names(ms_list)):
                # 低档（20~100）是补出来的节点、没有独立源文件：图走共用 shared/low.webp
                if not m.get("file"):
                    continue
                if to_webp(A(m["file"]), os.path.join(OUT, milestone_target(b, m, mname)), 88, args.force):
                    n_ms += 1
            d = b.get("decor")
            if d and d.get("file") and b.get("gachaKey"):
                if to_webp(A(d["file"]), os.path.join(OUT, "decor", f"{b['gachaKey']}.webp"), 88, args.force):
                    n_dc += 1
        print(f"  深海回响：奖励图 {n_ms} 张 / 摆饰 {n_dc} 张")
        return 0

    # ---------- 1. 卡池素材（--icons 轻量模式跳过：不动横幅/立绘/深忆/套装卡）
    for b in ([] if args.icons else targets):
        a = b["assets"]
        key = b.get("gachaKey") or b["id"]
        gk = b["gachaKey"]
        print(f"  [{b['id']}] {b['name']}")

        # ：阁目录里的 `背景图.*` 是**唯一**来源。
        # 原来还有一条「找 `卡池背景图（纯图片，无艺术字）/list-*.png` 合成装饰件」
        # 的老素材回落链（BG_COMPOSE），88 座阁都有自带整屏图后它从未命中过，已删除。
        if a.get("bgClean"):
            bg_webp(A(a["bgClean"]), os.path.join(OUT, "banners/bg", f"{key}.webp"), 86, args.force)
        elif os.path.exists(os.path.join(OUT, "ui/ver/bg.webp")):
            # 缺背景 → 界面用默认背景顶上（manifest 里直接指 ui/ver/bg.webp，不复制副本）
            print("      缺背景图 → 用默认背景 ui/ver/bg.webp 顶上")
        else:
            print("      ⚠ 缺背景图，且默认背景 ui/ver/bg.webp 也不存在 → 界面会没有底图")
        if a.get("thumbnail"):
            to_webp(A(a["thumbnail"]), os.path.join(OUT, "banners/thumb", f"{key}.webp"), 88, args.force)
        elif a.get("bgClean"):
            # 没给缩略图 → 用自己的背景裁一张，绝不借别座阁的图
            thumb_from_bg(os.path.join(OUT, "banners/bg", f"{key}.webp"),
                          os.path.join(OUT, "banners/thumb", f"{key}.webp"), 88, args.force)
        if a.get("titleArt") and gk:
            # 艺术字要把实体居中（见 center_alpha_webp）：`.title-art` 靠盒子居中保证
            # 「离货币栏下划线」和「离提示文字」一样远，素材自带的不对称留白必须先抹平
            center_alpha_webp(A(a["titleArt"]), os.path.join(OUT, "banners/title", f"{gk}.webp"), 92, args.force)

        # 服装阁动态背景：`素材/视频/服装阁动态/<阁名>.webm|mp4`
        # 转码成去音轨的 mp4（见 transcode_video 的说明），命名按**编号**，和其它素材一致。
        dyn = a.get("dynamicBg")
        if dyn:
            srcv = A(dyn)
            if os.path.isfile(srcv):
                transcode_video(srcv, os.path.join(OUT, "video", f"{key}.mp4"), args.force)

        # ：`banners/bg`（16MB）、`banners/layers`（5.5MB）、`ui/gifs`（1.1MB）
        # 三批已停止产出 —— 前端只读 `bgClean` / `bgVideo`，`assets.bg` / `layers` / `gifs`
        # 在 .vue 里一次都没被取过（已随归档移入 `归档素材/`）。要恢复见那里的 README。

        ms_list = a.get("milestones", [])
        for m, mname in zip(ms_list, milestone_names(ms_list)):
            if not m.get("file"):   # 低档共用图，无独立源文件（见 build-pool-map.low_tier_fill）
                continue
            to_webp(A(m["file"]),
                    os.path.join(OUT, milestone_target(b, m, mname)), 88, args.force)

        # 深海回响左边的摆饰 / 礼盒大图（数据源：Rewards Introduction.md 的「对应套装」列）
        d = b.get("decor")
        if d and d.get("file") and gk:
            to_webp(A(d["file"]), os.path.join(OUT, "decor", f"{gk}.webp"), 88, args.force)

        # ---------- 2. 套装素材（官方部位代号命名）
        for s in b["sets"]:
            sid = s["id"] or s["name"]
            sa = s["assets"]
            sdir = os.path.join(OUT, "sets", sid)

            # 整体立绘 OV-lv0..lv4（每阶段一张）
            for o in sa.get("ov", []):
                to_webp(A(o["file"]), os.path.join(sdir, f"{o['code']}.webp"), 90, args.force)

            # 老结构兜底：单独一张 portrait.webp
            if not sa.get("ov") and sa.get("portrait"):
                to_webp(A(sa["portrait"]), os.path.join(sdir, "portrait.webp"), 90, args.force)

            # 部件图标：cards/<代号>-<套装ID>.webp
            for ic in sa.get("icons", []):
                to_webp(A(ic["file"]),
                        os.path.join(sdir, "icons", f"{ic['code']}-{sid}.webp"), 88, args.force)

            # 部件卡片图：cards/<代号>-<套装ID>.webp
            for c in sa.get("cards", []):
                to_webp(A(c["file"]),
                        os.path.join(sdir, "cards", f"{c['code']}-{sid}.webp"), 86, args.force)

    # ---------- 3. 3★ 散件（全池通用，只收一次）
    # 元数据来自 pool-map.stars3（解析 三星散件清单.yaml），图片按 file 字段定位
    s3meta = {x.get("file"): x for x in pool_map.get("stars3", []) if x.get("file")}
    s3dir = A("所有卡池通用三星散件")
    if os.path.isdir(s3dir):
        print("  [3★] 通用散件")
        for f in os.listdir(s3dir):
            if f.lower().endswith(".png"):
                to_webp(os.path.join(s3dir, f),
                        os.path.join(OUT, "stars3", f"{os.path.splitext(f)[0]}.webp"), 88, args.force)

    # 3★ 部件图标（256×256 透明单品）：source/1.0·探索季（公测）/常驻·遥远之海/三星散件/
    # 试穿图是 520×724 人物图；「恭喜获得」弹窗与图鉴需要的是单品图标（实机口径，用户 2026-10-26 补充素材）
    s3_icon_dir = A("source", "1.0·探索季（公测）", "常驻·遥远之海", "三星散件")
    if os.path.isdir(s3_icon_dir):
        print("  [3★] 散件图标（256 透明）")
        for f in os.listdir(s3_icon_dir):
            if f.lower().endswith(".png"):
                to_webp(os.path.join(s3_icon_dir, f),
                        os.path.join(OUT, "stars3", "icons", f"{os.path.splitext(f)[0]}.webp"), 92, args.force)

    # 3b. 全量部件图标补全（--icons / --all）：pool-map 里全部套装的 部件图标 → sets/<id>/icons/
    # manifest 早已声明这些 src（sets[].assets.icons），此前只有归集过的池才有文件，
    # 未归集池的「恭喜获得」弹窗 / 图鉴会缺图标 → 只拷图标（256 透明），不动横幅/立绘/深忆
    if args.icons or args.all:
        print("  [icons] 全量套装部件图标补全")
        n_new = 0
        for b in pool_map.get("banners", []):
            for st in b.get("sets", []):
                sid = st.get("id") or st.get("name")
                for ic in st.get("assets", {}).get("icons", []):
                    # ：icons 是 [{name, code, file}]，源路径直接给在 file 里
                    src_rel = ic.get("file")
                    if not src_rel:
                        continue
                    dst = os.path.join(OUT, "sets", sid, "icons", f"{ic['code']}-{sid}.webp")
                    if os.path.isfile(dst) and not args.force:
                        continue
                    srcf = A(src_rel)
                    if os.path.isfile(srcf):
                        to_webp(srcf, dst, 92, args.force)
                        n_new += 1
        print(f"    新拷 {n_new} 个套装图标")

    # ---------- 4. 抽卡视频（4 段，必收）
    if not args.no_video:
        print("  [视频] 4 段抽卡动画")
        for name in ("RPs-1-N", "RPs-1-Y", "RPm-10-N", "RPm-10-Y"):
            copy_as(A("视频素材", f"{name}.webm"),
                    os.path.join(OUT, "video", f"{name}.webm"), args.force)
        # 开机动画：5s，带 opus 音轨（抽卡那 4 段是无音轨的）
        copy_as(A("视频素材", "Login_Title_ShowUp_Onlylogo_带配音.webm"),
                os.path.join(OUT, "video", "login.webm"), args.force)

    # ---------- 5. UI 素材（主页 / 深海回响 / 单抽详情 / 十连 / 套装）
    print("  [UI] 界面素材")
    for item in UI_ASSETS:
        # 三元组 (源, 成品, 质量)；第四项可选，是 (w, h) 缩放（ 鼠标用）
        rel, out_rel, q = item[0], item[1], item[2]
        to_webp(A(rel), os.path.join(OUT, out_rel), q, args.force,
                item[3] if len(item) > 3 else None)

    # 深海回响 V2（奖励轨道界面）
    for dk, (rel, q) in DEEPSEA_ASSETS.items():
        src_p = A(rel)
        dst_p = os.path.join(OUT, f"ui/deepsea/{dk}.webp")
        if dk in DEEPSEA_MASKS:
            mask_webp(src_p, dst_p, args.force)
        else:
            to_webp(src_p, dst_p, q, args.force)

    # 专属套名横幅（332×96，右侧渐隐）。命名有四种写法，**同一池可能只出现其中一种**：
    #   `_name.png`（004 那批）/ `_name_01.png`（030 那批）/ `name01.png`（042、043、053 那批）
    #   001 常驻池还有 `_name_03/_04` —— 它有 4 个 5★，各一张。
    # 编号的含义**不是星级**，而是「该池套装按 5★ 在前、同级按 manifest 顺序」的序号：
    #   001 有 8 套却只有 4 张（4 个 5★ 各一张，4★ 没有专属）；030 两张 = 5★ 一张 + 4★ 一张。
    # 同目录里还混着两类**必须排除**的东西（ 用户报 043 铭牌错，就是第一类）：
    #   - 套装图标：也叫 `_name` / `name01`，但尺寸是 60×60 / 96×96 / 112×112
    #   - 特效图：文件名带 `_effect_`
    # 过滤按尺寸：铭牌那档是 332×96（021 的 340×120、036/046 的 409×100 也属这一档）。
    name_plates = {}
    pic_dir = A(U, "SysResonance", "texture", "Pic")
    if MANIFEST_ONLY:
        # 发行版没有 UI 源（`素材/界面` 已砍）→ 铭牌成品就在 banners/name/，
        # 按 `<池号>.webp` / `<池号>-<序号>.webp` 反解回原结构。
        nd = os.path.join(OUT, "banners/name")
        if os.path.isdir(nd):
            for f in sorted(os.listdir(nd)):
                m = re.match(r"^(\d{3,4})(?:-(\d+))?\.webp$", f)
                if not m:
                    continue
                name_plates.setdefault(m.group(1), {})[m.group(2) or "any"] = f"banners/name/{f}"
    if not MANIFEST_ONLY and os.path.isdir(pic_dir):
        # 3~4 位都收： 起编号分「001~999 官方 / 1000~9999 自定义」两段
        name_re = re.compile(r"^T_UI_resonance_gacha_(\d{3,4})_name(?:_)?(\d*)\.png$", re.I)
        for d in sorted(os.listdir(pic_dir)):
            dp = os.path.join(pic_dir, d)
            if not (d.isdigit() and os.path.isdir(dp)):
                continue
            picked = {}
            for f in sorted(os.listdir(dp)):
                if "_effect_" in f.lower():
                    continue
                m = name_re.match(f)
                if not m:
                    continue
                src = os.path.join(dp, f)
                try:
                    from PIL import Image as _Img
                    w, h = _Img.open(src).size
                except Exception:
                    continue
                if w < 300 or not (2.4 <= w / h <= 4.3):
                    continue  # 套装图标 / 特效图标，不是铭牌
                key = "any" if not m.group(2) else str(int(m.group(2)))
                # 同编号可能有多张（036 目录里混了 039 的素材）：优先「文件名池号 = 目录号」那张
                score = 0 if m.group(1) == d else 1
                if key not in picked or score < picked[key][0]:
                    picked[key] = (score, src)
            entry = {}
            for key, (_, src) in picked.items():
                fname = f"{d}.webp" if key == "any" else f"{d}-{key}.webp"
                # ：从 `ui/banner/name/` 挪到 `banners/name/` —— 它本来就属于
                # 「按阁的素材」（和 banners/thumb、banners/bg、banners/title 同一族），
                # 放在 ui/banner 下是和界面通用件混在一起了（用户 2026-11-08 要求归位）。
                out_rel = f"banners/name/{fname}"
                if to_webp(src, os.path.join(OUT, out_rel), 94, args.force):
                    entry[key] = out_rel
            if entry:
                name_plates[d] = entry
    if name_plates:
        n_any = sum(1 for v in name_plates.values() if "any" in v)
        n_num = sum(1 for v in name_plates.values() if any(k.isdigit() for k in v))
        n_max = max((len([k for k in v if k.isdigit()]) for v in name_plates.values()), default=0)
        print(f"  [UI] 专属套名横幅 {len(name_plates)} 池（通用 {n_any} / 带编号 {n_num}，单池最多 {n_max} 张）")

    # 大版本图标：工坊「版本」任务写进来的 `信息表/大版本图标/<major>.png`。
    # 内置的 1/2 两组仍是 tower-1/2.webp；新增的大版本走 major-<号>.webp，
    # 前端 `ui.ver.majorIcons[大版本号]` 优先取它，取不到再退回 tower 数组。
    major_icons = {}
    mi_dir = A("信息表", "大版本图标")
    if os.path.isdir(mi_dir):
        for f in sorted(os.listdir(mi_dir)):
            if not f.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                continue
            major = os.path.splitext(f)[0]
            rel_out = f"ui/ver/major-{major}.webp"
            if to_webp(os.path.join(mi_dir, f), os.path.join(OUT, rel_out), 92, args.force):
                major_icons[major] = rel_out
        print(f"  [UI] 大版本图标 {len(major_icons)} 个")

    # 版本卡（版本选择页）：Friends 672×188 = 缩略图；Pear = 版本大图
    # ⚠ Pear 后缀不统一：_M（1532×860）只有 001/008~013；其余是 _L，1.8 只有 _L1
    print(f"  [UI] 版本卡 {len(VERSION_CARDS)} 张（缩略图 + 大图）")
    card_dir = A("朋友分享素材/UI/Image/Card")

    def _card_src(prefix, num, sufs=("",)):
        """按编号找卡图：`001` / `1` 两种写法都试，再试各种后缀。

        ⚠ 官方文件名是三位补零（`T_UI_Friends_Card_img_001.png`），
        但版本表里大版本（1 / 2）的 cardNo 写成不补零的 `1` / `2`，
        直接拼会得到不存在的 `_img_1.png` → 大版本缩略图 404（v1.9.02 修）。
        """
        cands = []
        for n in (num, str(num).zfill(3), str(num).zfill(2)):
            for suf in sufs:
                cands.append(os.path.join(card_dir, f"{prefix}_{n}{suf}.png"))
        return next((p for p in cands if os.path.exists(p)), None)

    # 兜底图：版本卡 / 版本大图缺失时用。工坊新建一个还没配卡的版本、
    # 或者某张卡图损坏，都落到这两张上，而不是留一块空白（用户 2026-11-08 要求）。
    card_def = os.path.join(card_dir, "T_UI_Friends_Card_img_default.png")
    big_def = os.path.join(card_dir, "T_UI_Pear_Card_img_default_M.png")
    if os.path.exists(card_def):
        to_webp(card_def, os.path.join(OUT, "ui/ver/card-default.webp"), 90, args.force)
    if os.path.exists(big_def):
        to_webp(big_def, os.path.join(OUT, "ui/ver/big-default.webp"), 90, args.force)

    for ver, num in VERSION_CARDS:
        # ⚠ 兜底只**填空**，不覆盖已有文件。
        #   0.1「祈愿星」/ 0.2「魂灵生」是工坊自建版本，官方没有对应编号的卡图，
        #   用户手动放了正确的 `card/0.2.webp`、`big/0.2.webp` —— 无条件写 default
        #   会把它们冲掉。所以：有源就用源；没源且目标还不存在，才铺一张默认图。
        card_dst = os.path.join(OUT, f"ui/ver/card/{ver}.webp")
        src_card = _card_src("T_UI_Friends_Card_img", num)
        if src_card:
            to_webp(src_card, card_dst, 90, args.force)
        elif not os.path.exists(card_dst) and os.path.exists(card_def):
            to_webp(card_def, card_dst, 90, args.force)

        big_dst = os.path.join(OUT, f"ui/ver/big/{ver}.webp")
        big_src = _card_src("T_UI_Pear_Card_img", num, ("_M", "_L", "_L1"))
        if big_src:
            to_webp(big_src, big_dst, 90, args.force)
        elif not os.path.exists(big_dst) and os.path.exists(big_def):
            to_webp(big_def, big_dst, 90, args.force)

    # 版本徽记（星座）已于废除：设定取消，VersionView 不再有徽记，
    # 这里也不再转码 ui/ver/logo/*。源 PNG 仍留在素材库里，不删。

    # 版本大图底边文案条：tuning_txtbg04 原图 alpha 峰值只有 119，直接当 50% 不透明度
    # 用会淡到看不见 → 走 mask_webp 把 alpha 拉满，CSS 再给 opacity .5
    mask_webp(A(U, "SysResonance/texture/V2/T_UI_resonance_reward_tuning_txtbg04.png"),
              os.path.join(OUT, "ui/ver/desc-band.webp"), args.force)

    # 版本号容器：tuning_txtbg01（380×48 紫色软边缎带，两端各 28px 全透明）
    # → 按 alpha 裁到实体（335×48），否则角标左边会空一块，贴不到缩略图左上角
    trim_alpha_to_webp(A(U, "SysResonance/texture/V2/T_UI_resonance_reward_tuning_txtbg01.png"),
                       os.path.join(OUT, "ui/ver/ver-tag.webp"), 94, args.force, th=8)

    # 小版本容器底板：btn_title_l/h 原图 550×144，实体只占 (54,21)-(502,129)，
    # 直接摆会凭空多出 42px 透明边距（容器看起来比大版本小一圈）→ 统一裁到 (40,10)-(513,138)
    # 同一个框同时保留 h 态的外发光，保证常态/悬停态实体等大
    if not MANIFEST_ONLY:
        for name, out_rel in (
            ("T_UI_common_btn_title_l.png", "ui/ver/title-panel-n.webp"),
            ("T_UI_common_btn_title_h.png", "ui/ver/title-panel-h.webp"),
        ):
            src = A(U, "Common/Textures", name)
            dst = os.path.join(OUT, out_rel)
            if os.path.exists(dst) and not args.force:
                STATS["skipped"] += 1
            elif os.path.exists(src):
                from PIL import Image
                im = Image.open(src).convert("RGBA").crop((40, 10, 513, 138))
                ensure_dir(os.path.dirname(dst))
                im.save(dst, "WEBP", quality=94, method=6)
                STATS["converted"] += 1
            else:
                STATS["missing"] += 1
                MISSING.append(src)

    # 共鸣按钮
    # ⚠ 两张 PNG 的透明留白不对称（单次右边留 17px、十连左边留 15px），
    # 直接摆会凭空多出 30px 视觉间距，所以按 alpha 裁到实体再输出。
    for rel, out_rel in RES_BUTTONS:
        trim_alpha_to_webp(A(rel), os.path.join(OUT, out_rel), 92, args.force)

    # 主页水晶碎块（ 起不再产出：导航在换成了 navSys 系统图标，
    # `ui.home.crystals` 已从 manifest 与 types 摘除，素材移入 归档素材/）

    # ---------- 6. 货币图标
    print("  [道具] 货币图标")
    currency_manifest = {}
    for name, (rel, slug) in CURRENCY_ICONS.items():
        src = A(rel)
        if to_webp(src, os.path.join(OUT, "currency", f"{slug}.webp"), 90, args.force):
            meta = pool_map.get("currency", {}).get(name, {})
            currency_manifest[name] = {
                "icon": f"currency/{slug}.webp",
                "kind": meta.get("kind", ""),
                "type": meta.get("type", ""),
                "usage": meta.get("usage", ""),
                "infinite": True,
            }

    # ---------- 7. 音效
    print("  [音效] 转 OGG")
    sfx_idx = build_sfx_index()
    sfx_manifest = {}
    for ev, out_name in SFX_EVENTS:
        hit = sfx_idx.get(ev)
        if not hit:
            # 事件名可能带后缀（如 Paper_Fadein_a 的大小写差异），做一次忽略大小写匹配
            low = ev.lower()
            for k, v in sfx_idx.items():
                if k.lower() == low:
                    hit = v
                    break
        if not hit:
            # 发行版没有音频源（`素材/卡池音频` 已砍）。manifest-only 时以**产物**为准，
            # 否则全部音效都会被判成「事件未找到」，界面静音。
            sfx_dst = os.path.join(OUT, "sfx", f"{out_name}.ogg")
            if MANIFEST_ONLY and os.path.exists(sfx_dst):
                sfx_manifest[out_name] = f"sfx/{out_name}.ogg"
                continue
            STATS["missing"] += 1
            MISSING.append(f"音效事件未找到: {ev}")
            continue
        cat, fn = hit
        src = A("卡池音频", cat, fn)
        dst = os.path.join(OUT, "sfx", f"{out_name}.ogg")
        if to_ogg(src, dst, args.force):
            sfx_manifest[out_name] = f"sfx/{out_name}.ogg"

    # BGM / 抽卡动画音效
    for rel, out_rel, br in AUDIO_FILES:
        src = A(rel)
        key = os.path.splitext(os.path.basename(out_rel))[0]
        if to_ogg(src, os.path.join(OUT, out_rel), args.force, br):
            sfx_manifest[key] = out_rel

    # 各卡池进入音：**始终遍历全部 80 座阁**
    # ⚠ 早先这里用的是 `targets`，跑过 `--pool xxx` 之后 manifest 的 `bannerEnter`
    # 就只剩那一座阁（和 .x 那次 banners 被截断是同一个坑）。转码本身
    #   「文件已存在就跳过」，全量遍历的代价只是一轮 stat。
    print("  [音效] 服装阁进入音")
    enter_idx = build_banner_enter_index()
    manual_enter = build_manual_enter_index()
    if manual_enter:
        print(f"    手工指定 {len(manual_enter)} 条（优先于自动匹配）")
    banner_enter = {}
    for b in banners:
        # 手工指定优先；没有再按「卡池进入·<版本> <阁名>」自动匹配
        src_enter = manual_enter.get(b["name"])
        if not src_enter:
            fn = enter_idx.get(b["name"])
            if fn:
                src_enter = A("卡池音频", "01_卡池界面", fn)
        slug = b.get("gachaKey") or b["id"]
        dst = os.path.join(OUT, "sfx/banner-enter", f"{slug}.ogg")
        if not src_enter:
            # 发行版没有音频源（`素材/卡池音频` 已砍）→ manifest-only 按产物判断
            if MANIFEST_ONLY and os.path.exists(dst):
                banner_enter[b["id"]] = f"sfx/banner-enter/{slug}.ogg"
            continue
        # to_ogg 默认「存在就跳过」，但手工换了进入音时源文件比产物新 —— 得让它重转
        stale = (os.path.exists(dst) and os.path.getmtime(src_enter) > os.path.getmtime(dst))
        if to_ogg(src_enter, dst, args.force or stale, "112k"):
            banner_enter[b["id"]] = f"sfx/banner-enter/{slug}.ogg"
        elif os.path.exists(dst):
            banner_enter[b["id"]] = f"sfx/banner-enter/{slug}.ogg"
    # 目录里还躺着早期按 legacyId 命名（`list-1.0-03.ogg` …）的孤儿文件，不再产生
    missing_enter = [b.get("gachaKey") or b["id"] for b in banners if b["id"] not in banner_enter]
    if missing_enter:
        print(f"    ⚠ 仍无进入音的阁：{', '.join(missing_enter)}")

    # ---------- 8. 字体
    print("  [字体] 复制")
    font_manifest = {}
    for fname, alias in FONT_MAP:
        ext = os.path.splitext(fname)[1]
        dst_name = f"{alias}{ext}"
        dst = os.path.join(OUT, "fonts", dst_name)
        # 发行版没有 `素材/字体`（成品已在 fonts/）→ manifest-only 按产物判断
        if MANIFEST_ONLY:
            if os.path.exists(dst):
                font_manifest[alias] = f"fonts/{dst_name}"
            continue
        src = font_src(fname)
        if os.path.exists(src):
            if copy_as(src, dst, args.force):
                font_manifest[alias] = f"fonts/{dst_name}"

    # ---------- 9. manifest.json（前端索引）
    print("  [manifest] 生成")
    out_banners = []

    # 旧 manifest 当**视频基线**用。
    #
    # 为什么需要： 起大视频拆成**可选包**（发行版不带 `video/*.mp4`）。
    # manifest 里若按「文件存在」判 bgVideo，文件不在 → 条目被抹掉 →
    # 玩家把视频包拖回来后还得重跑管线才能看到动态背景。
    #
    # 所以这里反过来：**旧 manifest 说有就保留**，哪怕文件此刻不在。
    # 前端本来就处理得了 404（`BannerView.onBgVideoError` → 退回静态背景），
    # 视频包装回去后立刻生效。
    prev_manifest = {}
    try:
        _pm = os.path.join(OUT, "manifest.json")
        if os.path.exists(_pm):
            prev_manifest = json.load(open(_pm, encoding="utf-8")) or {}
    except Exception:
        prev_manifest = {}
    prev_bgvideo = {}
    for _b in prev_manifest.get("banners") or []:
        _v = (_b.get("assets") or {}).get("bgVideo")
        if _v:
            prev_bgvideo[_b.get("id")] = _v

    # ⚠ manifest 必须写**全部卡池**，不能只写 targets：
    #   `--pool banner-xxx` 只决定「这轮搬哪些素材」，不是「manifest 里有哪些池」。
    #   早先按 targets 写，导致只跑一个池就把 manifest 截成一条，前端只剩那个池可用。
    for b in banners:
        a = b["assets"]
        key = b.get("gachaKey") or b["id"]
        gk = b["gachaKey"]
        entry = {
            "id": b["id"],
            # 版本内序号（ 起由 build-pool-map 计算）：
            #   含 5★ 在前 → gachaKey 升序 → 常驻最后。前端按它排版本内的阁。
            "seq": b["seq"],
            "name": b["name"],
            "version": b["version"],
            "versionName": b["versionName"],
            # 阁型：内置三值原样；工坊自定义的收成 `custom` + typeLabel（中文名）
            "type": b["type"] if b["type"] in ("limited", "standard", "collab") else "custom",
            **({"typeLabel": b["type"]} if b["type"] not in ("limited", "standard", "collab") else {}),
            "star": b["star"],
            "gachaKey": gk,
            "assets": {
                # ：`bg` / `layers` / `gifs` 三项已移除（前端从未取用，
                # 素材随本轮归档；`.vue` 只认 bgClean / bgVideo）
                # ：阁里没有背景图时，**直接指向默认背景** `ui/ver/bg.webp`
                # （版本页那张整屏背景，前端 `ui.banner.fallbackBg` 也是它）。
                # 不再为「缺背景」的阁单独复制一份默认图 —— 复制出来的那些将来换默认图
                # 不会跟着变，还会白白多占几百 KB。
                "bgClean": (f"banners/bg/{key}.webp" if a.get("bgClean")
                            else ("ui/ver/bg.webp" if os.path.exists(os.path.join(OUT, "ui/ver/bg.webp")) else None)),
                # 没给缩略图时上面会从背景裁一张，所以按「文件存在」判定
                "thumb": f"banners/thumb/{key}.webp"
                if os.path.exists(os.path.join(OUT, "banners/thumb", f"{key}.webp")) else None,
                "title": f"banners/title/{gk}.webp" if a.get("titleArt") and gk else None,
                # 服装阁动态背景：`素材/视频/服装阁动态/<阁名>.webm|mp4`
                #   按编号落成 `video/<编号>.webm|mp4`；webm 优先（体积小）
                #
                # ：大视频拆成可选包后文件可能不在 → 退回**旧 manifest** 的记录，
                #   保住条目，玩家把视频包装回去就能直接看到动态背景。
                "bgVideo": (
                    next((f"video/{key}{ext}" for ext in (".webm", ".mp4")
                          if os.path.exists(os.path.join(OUT, "video", f"{key}{ext}"))), None)
                    or prev_bgvideo.get(b["id"])
                ),
            },
            "milestones": [{"pulls": m["pulls"], "reward": m["reward"], "img": milestone_target(b, m, mname)}
                           for m, mname in zip(a.get("milestones", []),
                                               milestone_names(a.get("milestones", [])))],
            # 深海回响左侧摆饰：有文案没图也保留（img 为空，前端只显示文案）
            "decor": ({
                "name": b["decor"]["name"],
                "desc": b["decor"].get("desc", ""),
                "img": f"decor/{gk}.webp" if (b["decor"].get("file") and gk
                                              and os.path.exists(os.path.join(OUT, "decor", f"{gk}.webp"))) else None,
            } if b.get("decor") else None),
            "sets": [],
        }
        for s in b["sets"]:
            sid = s["id"] or s["name"]
            sa = s["assets"]
            entry["sets"].append({
                "id": sid,
                "name": s["name"],
                "star": s["star"],
                "origin": s.get("origin", ""),
                "firstVersion": s.get("firstVersion", ""),
                "parts": s.get("parts", []),
                # 完整套装文案（来自 素材/套装文案/<版本>/<稀有度>-<来源>-《套装名》.txt）
                "desc": s.get("desc", ""),
                "styles": s.get("styles", []),
                "textSource": s.get("textSource", ""),
                # ：**不再**把 formTexts 写进 manifest。
                #   它在 pool-map 里存的是「每部位第 1 条 + 进化形态」的完整文案表，
                #   而第 1 条与 parts[].desc 重复 —— 前端零引用，却占 manifest 的 29%（385KB）。
                #   需要这份数据时读 素材/套装库/<套装ID_套装名>/套装.yaml（已按部件分好形态）。
                # 专属铭牌序号：前端按它去 ui.banner.namePlates[编号][序号] 取名牌；
                # 没有就别写这个键（前端类型是 `number | undefined`，null 会踩 TS）
                **({"plateIdx": s["plateIdx"]} if s.get("plateIdx") else {}),
                "assets": {
                    # ：立绘统一是 `sets/<id>/OV-lv0.webp`（老结构回落 portrait.webp）
                    "portrait": (f"sets/{sid}/OV-lv0.webp"
                                 if any(o["code"] == "OV-lv0" for o in sa.get("ov", []))
                                 else (f"sets/{sid}/portrait.webp" if sa.get("portrait") else None)),
                    # 每一阶整体立绘（OV-lv0..lv4），前端目前只用 portrait，留着供后续扩展
                    "awaken": [f"sets/{sid}/{o['code']}.webp" for o in sa.get("ov", [])
                               if o["code"] != "OV-lv0"],
                    # name 是**中文部件名**（前端按它匹配属性表），src 是代号路径
                    "icons": [{"name": ic["name"],
                               "src": f"sets/{sid}/icons/{ic['code']}-{sid}.webp"}
                              for ic in sa.get("icons", [])],
                    # 卡片图按**进化阶段**分组：
                    #   · 初始阶段 → 全部部位卡（图鉴详情、试穿配对都读 stages[0]）
                    #   · 其余阶段 → 只有一张「整体-<阶段>」，指向对应的 OV-lvN
                    # 素材每部位只有一张卡，所以后几段复用同一批部件图不现实；
                    # 但「获得套装」弹窗底部的形态卡只需要每阶段一张整体图（formThumbs），
                    # 这样既不丢功能，manifest 也只多几条。
                    "stages": _build_stages(s, sid),
                },
            })
        out_banners.append(entry)

    # 3★ 散件清单：图片 + 文案/五维/标签（来自 三星散件清单.yaml）
    stars3 = []
    if os.path.isdir(os.path.join(OUT, "stars3")):
        for f in sorted(os.listdir(os.path.join(OUT, "stars3"))):
            if not f.endswith(".webp"):
                continue
            stem = os.path.splitext(f)[0]
            meta = s3meta.get(f"{stem}.png") or s3meta.get(f"{stem}.webp") or {}
            e3 = {
                "name": meta.get("name") or stem.split("-", 1)[-1],
                "src": f"stars3/{f}",
                "slot": meta.get("slot", ""),
                "style": meta.get("style", ""),
                "tags": meta.get("tags", []),
                "stats": meta.get("stats", {}),
                "top": meta.get("top", []),
                "desc": meta.get("desc", ""),
                "comment": meta.get("comment", ""),
                "code": meta.get("code", ""),
            }
            icon_rel = f"stars3/icons/{stem}.webp"
            if os.path.isfile(os.path.join(OUT, icon_rel)):
                e3["icon"] = icon_rel
            stars3.append(e3)

    # UI 资源表：只登记磁盘上真实存在的，避免前端 404
    def exists(rel):
        return os.path.exists(os.path.join(OUT, rel))

    # 首页轮播动态背景：`素材/视频/主页/*.webm` 里挑两条，进首页时随机二选一。
    #   · 视频一律 720p / crf32 —— 首页是全屏背景，1080p 的收益看不见，体积却是三倍；
    # · 音轨单独抽成 ogg，配合「video 永远 muted + 独立 audio」的老机制：
    #     带声音的视频会被自动播放策略拦，静音视频一定能起，声音再单独补。
    # (文件名, 音轨音量系数)。系数 1.0 = 原样；伊始那条录音偏响，用户 2026-11-08 要求降到 0.6
    HOME_VIDEO_SRC = (
        ("StarSeaPublicSpace_Wing_001.webm", 1.0),   # 星海（原有）
        ("伊始.webm", 0.6),                          # 新增
    )
    home_videos = []
    for idx, (fname, again) in enumerate(HOME_VIDEO_SRC, 1):
        srcv = os.path.join(ASSET, "视频", "主页", fname)
        vrel = f"ui/home/bg-video-{idx}.mp4"
        arel = f"ui/home/bg-audio-{idx}.ogg"
        prel = f"ui/home/bg-poster-{idx}.webp"
        # 发行版没有视频源（省掉 2.4G）。只重建 manifest 时以**产物**为准 ——
        # 否则这里 `源不存在 → continue`，首页轮播会被整块判成「没有视频」。
        #
        # ：大视频拆成可选包后，`bg-video-2.mp4` 不在发行版里 →
        # 光看「文件存在」会把这一条整个抹掉。退回**旧 manifest** 的记录保住条目，
        # 玩家把视频包装回去就直接生效；没装视频包时前端 404 → 静默退回静态底图。
        if MANIFEST_ONLY:
            _hit = next((v for v in (prev_manifest.get("ui") or {}).get("home", {}).get("bgVideos") or []
                         if v.get("video") == vrel), None)
            if os.path.exists(os.path.join(OUT, vrel)):
                home_videos.append({
                    "video": vrel,
                    "audio": arel if os.path.exists(os.path.join(OUT, arel)) else None,
                    "poster": prel if os.path.exists(os.path.join(OUT, prel)) else None,
                })
            elif _hit:
                home_videos.append({
                    "video": vrel,
                    "audio": arel if os.path.exists(os.path.join(OUT, arel)) else (_hit.get("audio") or None),
                    "poster": prel if os.path.exists(os.path.join(OUT, prel)) else (_hit.get("poster") or None),
                })
            continue
        if not os.path.isfile(srcv):
            print(f"  [首页视频] 缺少 {fname}，跳过这一条")
            continue
        # 保持原分辨率（用户 2026-11-08）。首页是全屏背景，降分辨率只会糊；
        # 体积靠编码质量（cq30）和裁掉的黑边来控制。
        if not transcode_video(srcv, os.path.join(OUT, vrel), args.force, crf=30):
            continue
        # poster：体积大、解码慢，先垫一张首帧，避免首页黑屏等视频
        poster_ok = video_poster(srcv, os.path.join(OUT, prel), force=args.force)
        # 抽音轨：视频本身是 `-an` 的，声音单独一条轨，两条必须同源**且同区间**。
        # 视频剪掉了首尾黑屏，音轨必须跟着剪同样一刀，否则循环周期不等长，
        # 每转一圈就多错几秒（音画不同步的根因）。
        vinfo = probe_video(srcv)
        trim = (vinfo.get("trimStart") or 0.0, vinfo.get("trimEnd"))
        audio_ok = to_ogg(srcv, os.path.join(OUT, arel),
                          args.force or not os.path.exists(os.path.join(OUT, arel)),
                          bitrate="96k", gain=again, trim=trim)
        home_videos.append({
            "video": vrel,
            "audio": arel if audio_ok else None,
            "poster": prel if poster_ok else None,
        })
    if home_videos:
        print(f"  [首页视频] {len(home_videos)} 条已就绪：" +
              "、".join(v["video"] for v in home_videos))

    ui_manifest = {
        "home": {
            "bg": "ui/home/bg.webp" if exists("ui/home/bg.webp") else None,
            "bgMain": "ui/home/bg-main.webp" if exists("ui/home/bg-main.webp") else None,
            "logo": "ui/home/logo.webp" if exists("ui/home/logo.webp") else None,
            "logoCenter": "ui/home/logo-center.webp" if exists("ui/home/logo-center.webp") else None,
            # bgVideo / bgAudio 保留单条字段（旧 .vue 与验收脚本还在读），指向第一条；
            # 新的轮播逻辑读 bgVideos
            "bgVideo": home_videos[0]["video"] if home_videos else None,
            # 从视频里拆出来的音轨：视频本身永远 muted 播，
            # 声音单独走 <audio> —— 否则「切回主页」时带声音的视频会被自动播放策略拦住，静音到下一次点击
            "bgAudio": home_videos[0]["audio"] if home_videos else None,
            "bgVideos": home_videos,
            "nav": {
                k: f"ui/home/nav-{k}.webp"
                for k in ("ver", "codex", "almanac", "banner", "gloria")
                if exists(f"ui/home/nav-{k}.webp")
            },
            "navSys": {
                k: f"ui/home/sys-{k}.webp"
                for k in ("ver", "banner", "almanac", "codex", "gloria", "home")
                if exists(f"ui/home/sys-{k}.webp")
            },
            # ：`textures` / `crystals` / 四张 deco 已移除 —— 主页的水晶导航
            # 在就换成了 `navSys` 系统图标，这几组 .vue 里零引用。
            "deco": {
                k: f"ui/home/deco-{k}.webp"
                for k in ("starlight", "halo", "ribbon", "stars", "glow", "beam")
                if exists(f"ui/home/deco-{k}.webp")
            },
        },
        "banner": {
            "listLine": "ui/banner/list-line.webp",
            "glowTitle": "ui/banner/glow-title.webp",
            "tagStandard": "ui/banner/tag-standard.webp",
            "tagLimited": "ui/banner/tag-limited.webp",
            "tagCollab": "ui/banner/tag-collab.webp",
            "cardFrame": "ui/banner/card-frame.webp",
            "longBar": "ui/banner/long-bar.webp",
            "switch": "ui/banner/switch.webp",
            "switchH": "ui/banner/switch-h.webp",
            "switchIco": "ui/banner/switch-ico.webp",
            "goldenEdge": "ui/banner/golden-edge.webp",
            "divider": "ui/banner/divider.webp",
            "socialBg": "ui/banner/social-bg.webp",
            "wishN": "ui/banner/wish-n.webp",
            "wishH": "ui/banner/wish-h.webp",
            "pullWhite": "ui/banner/pull-white.webp",
            "pullYellow": "ui/banner/pull-yellow.webp",
            "bg076": "ui/banner/bg-076.webp",
            "longDetailsN": "ui/banner/long-details-n.webp",
            "giftFlower": "ui/banner/gift-flower.webp",
            # 套名横幅（底板；文字与星级由 CSS 叠）
            "setName1": "ui/banner/set-name-01.webp",
            "setName2": "ui/banner/set-name-02.webp",
            # 各池专属套名横幅（键是三位池编号）
            "namePlates": name_plates,
            # 共鸣详情弹窗（羊皮纸底 + 金线框）
            "winBg": "ui/window/bg-01.webp",
            "winLine1": "ui/window/bg-01-line.webp",
            "winLine4": "ui/window/bg-04-line.webp",
            "winLine3": "ui/window/bg-03-line.webp",
            # 服装阁背景兜底：该阁没给背景图、或背景/动态背景加载失败时用它，
            # 不再留黑块。复用版本页那张 2560×1440 的通用风景（用户指定）。
            "fallbackBg": "ui/ver/bg.webp" if exists("ui/ver/bg.webp") else None,
            # ：`thumbs`（6 张通用缩略图）已删除 —— 列表全部按阁取
            # `banners/thumb/<编号>.webp`，这 6 张只在「该阁连背景都没有」时轮播，
            # 现在那种情况改用统一的兜底图（`fallbackBg`）。
        },
        # 套装详情弹层（按主属性选图）
        "popup": {
            "art": {k: f"ui/popup/art-{k}.webp" for k in ("elegant", "fresh", "sexy", "cool", "sweet")},
            "plate": {k: f"ui/popup/plate-{k}.webp" for k in ("elegant", "fresh", "sexy", "cool", "sweet")},
            "slot": "ui/popup/slot.webp",
            "slotHover": "ui/popup/slot-hover.webp",
            # 外框 / 装饰（pxdesk 里用户实际用的素材）
            "bg": "ui/popup/bg.webp",
            "glow": "ui/popup/glow.webp",
            "nameN": "ui/popup/name-n.webp",
            "nameH": "ui/popup/name-h.webp",
            "star": "ui/popup/star.webp",
            "ribbon1": "ui/popup/ribbon-1.webp",
            "ribbon2": "ui/popup/ribbon-2.webp",
            "pocky": "ui/popup/pocky.webp",
            "light": "ui/popup/light.webp",
            "line1": "ui/popup/line-1.webp",
            "line2": "ui/popup/line-2.webp",
            "diamond": "ui/popup/diamond.webp",
            "band": "ui/popup/band.webp",
            "slotFrame": "ui/popup/slot-frame.webp",
            "slotBg": "ui/popup/slot-bg.webp",
            "formCard": "ui/popup/form-card.webp",
            "label": "ui/popup/label.webp",
            "stages": [f"ui/popup/stage-{i}.webp" for i in (1, 2, 3, 4)],
            "stagesOn": [f"ui/popup/stage-{i}-on.webp" for i in (1, 2, 3, 4)],
            "labels": {f"{i:02d}": f"ui/popup/label-{i:02d}.webp" for i in (1, 2, 3, 4, 5, 6, 7, 8, 9, 10)},
        },
        "cursor": "ui/cursor/mouse.webp" if exists("ui/cursor/mouse.webp") else None,
        "btn": {
            "resSingle": "ui/btn/res-single.webp",
            "resTen": "ui/btn/res-ten.webp",
            "skip": "ui/btn/skip.webp",
            "backN": "ui/btn/back-n.webp",
            "backH": "ui/btn/back-h.webp",
            "closeN": "ui/btn/close-n.webp",
            "closeH": "ui/btn/close-h.webp",
            "keyF": "ui/btn/key-f.webp",
            "keyMouse": "ui/btn/key-mouse.webp",
            # 套装详情 → 服装图鉴 的跳转键（74×74）
            "jump": "ui/btn/jump.webp",
        },
        # 主页彩蛋弹窗的左右翻页键（，74×74，与跳转键同款圆钮）
        "egg": {
            "skipN": "ui/egg/skip-n.webp",
            "skipH": "ui/egg/skip-h.webp",
        },
        # 主页信封弹窗：信封正面 / 信封背 / 信纸
        "mail": {
            "env": "ui/mail/env.webp",
            "back": "ui/mail/back.webp",
            "paper": "ui/mail/paper.webp",
        },
        # 深海回响奖励轨道界面（V2）
        "deepsea": {k: f"ui/deepsea/{k}.webp" for k in DEEPSEA_ASSETS},
        "detail": {
            "bg": "ui/detail/bg.webp",
            "bgPlate": "ui/detail/bg-plate.webp",
            "bgRight": "ui/detail/bg-right.webp",
            "frame": "ui/detail/frame.webp",
            "board": [f"ui/detail/board-{i}.webp" for i in range(1, 5) if exists(f"ui/detail/board-{i}.webp")],
            "orname": [f"ui/detail/orname-{i}.webp" for i in range(1, 3) if exists(f"ui/detail/orname-{i}.webp")],
            "ring": "ui/detail/ring.webp",
            "logo": "ui/detail/logo.webp",
            "deco": [f"ui/detail/deco-{i}.webp" for i in range(1, 4) if exists(f"ui/detail/deco-{i}.webp")],
            "line": "ui/detail/line-2.webp",
            "lineThin": "ui/detail/line-1.webp",
            "iconItem": "ui/detail/icon-item.webp",
            "clothBlank": "ui/detail/cloth-blank.webp",
            "orname3": "ui/detail/orname-3.webp",
            "silkRibbon": "ui/detail/silk-ribbon.webp",
            "ornameText": "ui/detail/orname-text.webp",
            "ornameText2": "ui/detail/orname-text-2.webp",
            "ornament3": "ui/detail/ornament-3.webp",
            "tips": [f"ui/detail/tips-{i}.webp" for i in range(1, 4) if exists(f"ui/detail/tips-{i}.webp")],
            "star": "ui/detail/star.webp",
            "labelBg": "ui/detail/label-bg.webp",
            "labels": [f"ui/detail/label-{i}.webp" for i in (1, 2, 3, 4, 5, 6, 7, 9, 10)
                       if exists(f"ui/detail/label-{i}.webp")],
            # 属性标签：甜美/典雅/清新/性感/帅气 各一张彩色长条
            "tags": [f"ui/detail/tag-{i}.webp" for i in range(1, 6) if exists(f"ui/detail/tag-{i}.webp")],
        },
        "result": {
            "bg": "ui/result/bg.webp",
            "char": [f"ui/result/char-{i}.webp" for i in (1, 2, 3)],
            "glowPurple": "ui/result/glow-purple.webp",
            "glowPink": "ui/result/glow-pink.webp",
            "newBadge": "ui/result/new-badge.webp",
            "newSuit": "ui/result/new-suit.webp",
            "mat3": "ui/result/mat-3.webp",
            "mat4": "ui/result/mat-4.webp",
            "soft": "ui/result/soft.webp",
            "line": "ui/result/line.webp",
        },
        "ver": {
            "bg": "ui/ver/bg.webp",
            "nextN": "ui/ver/next-n.webp",
            "nextH": "ui/ver/next-h.webp",
            "optN": "ui/ver/opt-n.webp",
            "optS": "ui/ver/opt-s.webp",
            "tower": ["ui/ver/tower-1.webp", "ui/ver/tower-2.webp"],
            # 工坊新增大版本时自带图标（键 = 大版本号字符串）
            "majorIcons": major_icons,
            "titleN": "ui/ver/title-n.webp",
            "titleH": "ui/ver/title-h.webp",
            "titlePanelN": "ui/ver/title-panel-n.webp",
            "titlePanelH": "ui/ver/title-panel-h.webp",
            "picFrame": "ui/ver/pic-frame.webp",
            "pinkH": "ui/ver/pink-h.webp",
            "descBand": "ui/ver/desc-band.webp",
            "descOrn": "ui/ver/desc-orn.webp",
            "verTag": "ui/ver/ver-tag.webp",
            "cards": {ver: f"ui/ver/card/{ver}.webp" for ver, _ in VERSION_CARDS},
            "bigCards": {ver: f"ui/ver/big/{ver}.webp" for ver, _ in VERSION_CARDS},
            # 兜底图：某张卡图损坏 / 新版本还没配卡时前端换这两张，
            # 不要再留空白（图片 onerror 也回落到这里）
            "cardDefault": "ui/ver/card-default.webp" if exists("ui/ver/card-default.webp") else None,
            "bigDefault": "ui/ver/big-default.webp" if exists("ui/ver/big-default.webp") else None,
            # 版本元数据（版本名 / 介绍文案 / 大版本归属）—— 版本页与图鉴赛季栏都读它，
            # 数据源是 素材/信息表/版本表.csv。新增版本只需往那张表加一行。
            "versions": [
                {
                    "v": _v["version"],
                    "name": _v.get("name", ""),
                    "major": _v.get("major", ""),
                    "majorName": _v.get("majorName", ""),
                    "desc": _v.get("desc", ""),
                }
                for _v in pool_map.get("versions", [])
            ],
        },
        "reward": {
            "section": "ui/reward/section.webp",
            "word": "ui/reward/word.webp",
            "arrow": "ui/reward/arrow.webp",
            "item3": "ui/reward/item-3.webp",
            "item4": "ui/reward/item-4.webp",
            "item5": "ui/reward/item-5.webp",
            "strip": "ui/reward/strip.webp",
            "bar": "ui/reward/bar.webp",
            "lineH": "ui/reward/line-h.webp",
        },
        "museum": {
            "bgWish": "ui/museum/bg-wish.webp",
            "bgYizan": "ui/museum/bg-yizan.webp",
            "btnBackH": "ui/museum/btn-back-h.webp",
            "btnMenu": "ui/museum/btn-menu.webp",
            "btnCloseN": "ui/museum/btn-close-n.webp",
            "btnCloseH": "ui/museum/btn-close-h.webp",
            "searchBg": "ui/museum/search-bg.webp",
            "searchBar": "ui/museum/search-bar.webp",
            "searchIcon": "ui/museum/search-icon.webp",
            "nextBtn": "ui/museum/next-btn.webp",
            "split": {
                f"{r}-{k}": f"ui/museum/split/{r}-{k}.webp"
                for r in ("wish", "yizan")
                for k in ("clothes", "story", "reading", "search")
            },
            "clothes": {
                "bg": "ui/museum/clothes/bg.webp",
                "showTexture": "ui/museum/clothes/show-texture.webp",
                "plog": "ui/museum/clothes/plog.webp",
                "setItem": "ui/museum/clothes/set-item.webp",
                "btnWhite": "ui/museum/clothes/btn-white.webp",
                "btnGray": "ui/museum/clothes/btn-gray.webp",
                "arrowN": "ui/museum/clothes/arrow-n.webp",
                "arrowH": "ui/museum/clothes/arrow-h.webp",
                "backN": "ui/museum/clothes/back-n.webp",
                "backH": "ui/museum/clothes/back-h.webp",
                "tag": {
                    "甜美": "ui/museum/clothes/tag-sweet.webp",
                    "典雅": "ui/museum/clothes/tag-elegant.webp",
                    "清新": "ui/museum/clothes/tag-fresh.webp",
                    "性感": "ui/museum/clothes/tag-sexy.webp",
                    "帅气": "ui/museum/clothes/tag-cool.webp",
                },
                "tagOn": "ui/museum/clothes/tag-on.webp",
                "tagOff": "ui/museum/clothes/tag-off.webp",
                "itemEmpty": "ui/museum/clothes/item-empty.webp",
                "regionTab": "ui/museum/clothes/region-tab.webp",
                "paper": "ui/museum/clothes/paper.webp",
                "petals": "ui/museum/clothes/petals.webp",
                "collage": "ui/museum/clothes/collage.webp",
                "radarFrame": "ui/museum/clothes/radar-frame.webp",
                "decor": "ui/museum/clothes/decor.webp",
                "showBg": "ui/museum/clothes/show-bg.webp",
            },
            "readings": {
                "bgWish": "ui/museum/readings/bg-wish.webp",
                "bgYizan": "ui/museum/readings/bg-yizan.webp",
                "reelWish": "ui/museum/readings/reel-wish.webp",
                "reelYizan": "ui/museum/readings/reel-yizan.webp",
                "paperWish": "ui/museum/readings/paper-wish.webp",
                "paperYizan": "ui/museum/readings/paper-yizan.webp",
                "tabWish": "ui/museum/readings/tab-wish.webp",
                "tabYizan": "ui/museum/readings/tab-yizan.webp",
                "tabSelN": "ui/museum/readings/tab-sel-n.webp",
                "tabSelH": "ui/museum/readings/tab-sel-h.webp",
                "labelWish": "ui/museum/readings/label-wish.webp",
                "labelYizan": "ui/museum/readings/label-yizan.webp",
                "labelShadow": "ui/museum/readings/label-shadow.webp",
                "tabLine": "ui/museum/readings/tab-line.webp",
                "topLine": "ui/museum/readings/top-line.webp",
                "magnifierWish": "ui/museum/readings/magnifier-wish.webp",
                "magnifierYizan": "ui/museum/readings/magnifier-yizan.webp",
                "papercranes": "ui/museum/readings/papercranes.webp",
                "lace": "ui/museum/readings/lace.webp",
                "maple": "ui/museum/readings/maple.webp",
                "spiral": "ui/museum/readings/spiral.webp",
                "lock01": "ui/museum/readings/lock-01.webp",
                "lock02": "ui/museum/readings/lock-02.webp",
                "lock03": "ui/museum/readings/lock-03.webp",
                "lockChain": "ui/museum/readings/lock-chain.webp",
                "lock04": "ui/museum/readings/lock-04.webp",
                "emptySticker": "ui/museum/readings/empty-sticker.webp",
                "placename": "ui/museum/readings/placename.webp",
                "keyQ": "ui/museum/readings/key-q.webp",
                "keyE": "ui/museum/readings/key-e.webp",
                "stickersWish": [f"ui/museum/readings/sticker-wish-{i:02d}.webp" for i in range(1, 11)],
                "stickersYizan": [f"ui/museum/readings/sticker-yizan-{i:02d}.webp" for i in range(1, 11)],
            },
        },
        "almanac": {
            "bg": "ui/almanac/bg.webp",
            "desk": "ui/almanac/desk.webp",
            "backN": "ui/almanac/back-n.webp",
            "backH": "ui/almanac/back-h.webp",
            "basket": {
                "eu": "ui/almanac/basket-eu.webp",
                "cn": "ui/almanac/basket-cn.webp",
            },
            "btn": {
                "eu": {
                    "past": "ui/almanac/btn-eu-past.webp",
                    "today": "ui/almanac/btn-eu-today.webp",
                    "future": "ui/almanac/btn-eu-future.webp",
                    "bazi": "ui/almanac/btn-eu-bazi.webp",
                },
                "cn": {
                    "past": "ui/almanac/btn-cn-past.webp",
                    "today": "ui/almanac/btn-cn-today.webp",
                    "future": "ui/almanac/btn-cn-future.webp",
                    "bazi": "ui/almanac/btn-cn-bazi.webp",
                },
            },
            "inkstand": {
                "eu": "ui/almanac/inkstand-eu.webp",
                "cn": "ui/almanac/inkstand-cn.webp",
            },
            "quill": {
                "eu": "ui/almanac/quill-eu.webp",
                "cn": "ui/almanac/quill-cn.webp",
            },
            "bookmarkBack": "ui/almanac/bookmark-back.webp",
            "bookmarkFront": "ui/almanac/bookmark-front.webp",
            "paper": ["ui/almanac/paper-1.webp", "ui/almanac/paper-2.webp", "ui/almanac/paper-3.webp"],
            "axle": ["ui/almanac/axle-1.webp", "ui/almanac/axle-2.webp", "ui/almanac/axle-3.webp"],
            "tier": {
                "great": "ui/almanac/tier-great.webp",
                "good": "ui/almanac/tier-good.webp",
                "minorGood": "ui/almanac/tier-minor-good.webp",
                "neutral": "ui/almanac/tier-neutral.webp",
                "minorBad": "ui/almanac/tier-minor-bad.webp",
                "bad": "ui/almanac/tier-bad.webp",
            },
            "title": "ui/almanac/title.webp",
            "arrowN": "ui/almanac/arrow-n.webp",
        },
        "gloria": {
            "bg": "ui/gloria/bg.webm",
            "poster": "ui/gloria/poster.webp",
            "backN": "ui/gloria/back-n.webp",
            "backH": "ui/gloria/back-h.webp",
            "closeN": "ui/gloria/close-n.webp",
            "closeH": "ui/gloria/close-h.webp",
            "board": "ui/gloria/board.webp",
            "tab": "ui/gloria/tab.webp",
            "confirm": "ui/gloria/confirm.webp",
            "entry": {
                "stage": "ui/gloria/ic-stage.webp",
                "volume": "ui/gloria/ic-volume.webp",
                "quick": "ui/gloria/ic-quick.webp",
                "save": "ui/gloria/ic-save.webp",
            },
        },
        # 黑屏加载过渡：进度条双态 + 精灵群 + 右下角奔跑动图 + 六张指向性装饰
        "loading": {
            "bg": "ui/loading/bg.webp" if exists("ui/loading/bg.webp") else None,
            "sliderOff": "ui/loading/slider-off.webp" if exists("ui/loading/slider-off.webp") else None,
            "sliderOn": "ui/loading/slider-on.webp" if exists("ui/loading/slider-on.webp") else None,
            "spirits": "ui/loading/spirits.webp" if exists("ui/loading/spirits.webp") else None,
            "runner": "ui/loading/nikki-run.webp" if exists("ui/loading/nikki-run.webp") else None,
            "photo": {
                k: f"ui/loading/photo-{k}.webp"
                for k in ("home", "ver", "banner", "codex", "almanac", "gloria")
                if exists(f"ui/loading/photo-{k}.webp")
            },
        },
        "suit": {
            "bg": "ui/suit/bg.webp",
            "frames": [f"ui/suit/frame-{i}.webp" for i in (1, 2, 4) if exists(f"ui/suit/frame-{i}.webp")],
            "light": "ui/suit/light.webp",
            "imgLight": "ui/suit/img-light.webp",
            "ornament": [f"ui/suit/orn-{i}.webp" for i in (1, 2) if exists(f"ui/suit/orn-{i}.webp")],
            "orn3": "ui/suit/orn-3.webp",
            # 套装获得页卡右上角的贴身纹样
            "ornClothes3": "ui/suit/orn-clothes-3.webp",
            "spark": "ui/suit/spark.webp",
            "glow1": "ui/suit/glow-1.webp",
            "glow2": "ui/suit/glow-2.webp",
            "glow3": "ui/suit/glow-3.webp",
            "line": [f"ui/suit/line-{i}.webp" for i in (1, 2, 3) if exists(f"ui/suit/line-{i}.webp")],
            "board": "ui/suit/board-4.webp",
            "boards": [f"ui/suit/board-{i}.webp" for i in (1, 2, 3, 4) if exists(f"ui/suit/board-{i}.webp")],
            "sched": {
                "fill": "ui/suit/sched-1.webp",
                "step": "ui/suit/sched-1.webp",
                "bg": "ui/suit/sched-bg.webp",
                "full": "ui/suit/sched-full.webp",
                "fullBg": "ui/suit/sched-fullbg.webp",
                "slot": "ui/suit/sched-2.webp",
                "star": "ui/suit/sched-star.webp",
            },
        },
    }

    # 背景音场景表：只登记磁盘上真的存在的曲目
    bgm_manifest = {}
    for scene_key, items in BGM_SCENES.items():
        arr = []
        for key, weight in items:
            rel_src = f"sfx/{key}.ogg" if key == "bgm" else f"bgm/{key}.ogg"
            if exists(rel_src):
                arr.append({"src": rel_src, "w": weight})
        if arr:
            bgm_manifest[scene_key] = arr

    manifest = {
        "generatedAt": __import__("datetime").datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "rules": pool_map["rules"],
        "currency": currency_manifest,
        "sfx": sfx_manifest,
        "bannerEnter": banner_enter,
        "bgm": bgm_manifest,
        "fonts": font_manifest,
        "ui": ui_manifest,
        "loginVideo": "video/login.webm" if exists("video/login.webm") else None,
        "video": VIDEO_FILES if all(
            os.path.exists(os.path.join(OUT, p))
            for grp in VIDEO_FILES.values()
            for p in grp.values()
        ) else None,
        "stars3": stars3,
        "banners": out_banners,
    }
    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # ---------- 9.5 自检
    def collect_paths(node, out):
        if isinstance(node, dict):
            for v in node.values():
                collect_paths(v, out)
        elif isinstance(node, list):
            for v in node:
                collect_paths(v, out)
        elif isinstance(node, str) and re.match(
            r"^(banners|sets|stars3|milestones|video|sfx|fonts|currency|ui)/", node
        ):
            out.append(node)

    refs = []
    collect_paths(manifest, refs)
    bad = [p for p in dict.fromkeys(refs) if not os.path.exists(os.path.join(OUT, p))]
    if bad:
        print(f"\n  [自检] manifest 有 {len(bad)} 条路径不存在：")
        for p in bad[:10]:
            print(f"         {p}")
    else:
        print(f"\n  [自检] manifest {len(dict.fromkeys(refs))} 条路径全部有效")

    # ---------- 汇总
    total = 0
    for dirpath, _, files in os.walk(OUT):
        for f in files:
            total += os.path.getsize(os.path.join(dirpath, f))
    print("\n" + "=" * 56)
    print(f"转换 {STATS['converted']}  复制 {STATS['copied']}  跳过 {STATS['skipped']}  缺失 {STATS['missing']}")
    print(f"输出总体积 {total/1024/1024:.1f} MB  →  {OUT}")
    if MISSING:
        print(f"\n缺失/失败 {len(MISSING)} 条:")
        for m in MISSING[:25]:
            print("  " + m)
    return 0


if __name__ == "__main__":
    sys.exit(main())
