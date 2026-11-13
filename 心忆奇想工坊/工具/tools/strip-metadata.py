#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""清除音频 / 视频 / 图片里的元数据。

用法：
    python tools/strip-metadata.py <目录> [<目录> …]
    python tools/strip-metadata.py --check <目录>          # 只报告，不改文件

**不重新编码**：
    · 视频 / 音频：ffmpeg `-c copy` —— 音视频流**逐字节不变**（已用 MD5 校验）。
    · 图片：webp / png / jpg 的 EXIF / XMP / ICC 等附属块整块摘掉，
      像素数据一个字节都不动（webp 走 RIFF 块级手术，不是重新编码）。

**已有元数据的文件保持原样**（`--check` 与实际处理都遵守）：
先探测有没有元数据，没有就一个字节都不碰。
"""
import argparse
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile

# ── ffmpeg 定位（发行版自带运行时在 PATH 之外）─────────────────────────
def find_ffmpeg():
    exe = "ffmpeg.exe" if os.name == "nt" else "ffmpeg"
    env = os.environ.get("NIKKI_FFMPEG")
    if env and os.path.isfile(env):
        return env
    here = os.path.dirname(os.path.abspath(__file__))
    for cand in (
        os.path.join(here, "..", "electron", "runtime", exe),
        os.path.join(here, "..", "electron", "runtime", "ffmpeg", exe),
    ):
        cand = os.path.normpath(cand)
        if os.path.isfile(cand):
            return cand
    from shutil import which
    w = which(exe) or which("ffmpeg")
    if w:
        return w
    raise SystemExit("✗ 找不到 ffmpeg（发行版自带运行时在 electron/runtime/ffmpeg.exe）")


FFMPEG = None
FFPROBE = None


# 这些是**容器结构字段**，不是元数据 —— ISO-BMFF 规定 ftyp / hdlr 里必须有它们，
# 删掉文件就废了（浏览器可能直接拒播）。它们不含任何「谁做的 / 什么时候」的信息。
_STRUCTURAL_TAGS = {
    "major_brand", "minor_version", "compatible_brands",
    "stream:handler_name", "stream:language",
}


def probe_tags(path):
    """返回该文件的元数据标签字典（没有就是空 dict）。"""
    global FFPROBE
    if FFPROBE is None:
        FFPROBE = shutil.which("ffprobe") or "ffprobe"
    try:
        r = subprocess.run(
            [FFPROBE, "-v", "quiet", "-print_format", "json",
             "-show_format", "-show_streams", path],
            capture_output=True, text=True, timeout=60,
        )
        if r.returncode != 0:
            return {}
        d = json.loads(r.stdout or "{}")
    except Exception:
        return {}
    tags = dict((d.get("format") or {}).get("tags") or {})
    for s in d.get("streams") or []:
        for k, v in (s.get("tags") or {}).items():
            tags["stream:" + k] = v
    return {k: v for k, v in tags.items() if k not in _STRUCTURAL_TAGS}


# ── 图片：块级手术（像素不动）──────────────────────────────────────────
def webp_meta(path):
    """列出 webp 里的 EXIF / XMP / ICC 块（没有就是空 list）。"""
    try:
        d = open(path, "rb").read()
    except OSError:
        return []
    if d[:4] != b"RIFF" or d[8:12] != b"WEBP":
        return []
    out, off = [], 12
    while off + 8 <= len(d):
        cid = d[off:off + 4].decode("ascii", "replace")
        sz = struct.unpack("<I", d[off + 4:off + 8])[0]
        if cid in ("EXIF", "XMP ", "ICCP"):
            out.append(cid)
        off += 8 + sz + (sz & 1)
    return out


def strip_webp(path):
    """摘掉 EXIF / XMP / ICC 块。VP8X 头的「有没有这三样」标志位也要同步清掉，
    否则浏览器会去找一个已经不在的块。"""
    d = open(path, "rb").read()
    if d[:4] != b"RIFF" or d[8:12] != b"WEBP":
        return False
    keep, off = [], 12
    while off + 8 <= len(d):
        cid = d[off:off + 4]
        sz = struct.unpack("<I", d[off + 4:off + 8])[0]
        end = off + 8 + sz + (sz & 1)
        if cid in (b"EXIF", b"XMP ", b"ICCP"):
            off = end
            continue
        keep.append(d[off:end])
        off = end
    body = b"".join(keep)
    # VP8X：flags 字节的 bit5=ICC / bit4=EXIF / bit3=XMP
    for i, chunk in enumerate(keep):
        if chunk[:4] == b"VP8X" and len(chunk) >= 10:
            flags = chunk[8]
            flags &= ~(0x20 | 0x10 | 0x08)
            keep[i] = chunk[:8] + bytes([flags]) + chunk[9:]
            body = b"".join(keep)
            break
    new = b"RIFF" + struct.pack("<I", len(body) + 4) + b"WEBP" + body
    if new == d:
        return False
    with open(path, "wb") as f:
        f.write(new)
    return True


def png_meta(path):
    """PNG 的文本块（tEXt / iTXt / zTXt）与 eXIf。"""
    try:
        d = open(path, "rb").read()
    except OSError:
        return []
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        return []
    out, off = [], 8
    while off + 8 <= len(d):
        ln = struct.unpack(">I", d[off:off + 4])[0]
        cid = d[off + 4:off + 8].decode("ascii", "replace")
        if cid in ("tEXt", "iTXt", "zTXt", "eXIf", "tIME"):
            out.append(cid)
        off += 12 + ln
    return out


def strip_png(path):
    d = open(path, "rb").read()
    if d[:8] != b"\x89PNG\r\n\x1a\n":
        return False
    out, off = [], 8
    while off + 8 <= len(d):
        ln = struct.unpack(">I", d[off:off + 4])[0]
        cid = d[off + 4:off + 8]
        end = off + 12 + ln
        if cid in (b"tEXt", b"iTXt", b"zTXt", b"eXIf"):
            off = end
            continue
        out.append(d[off:end])
        off = end
    new = b"".join(out)
    if new == d:
        return False
    with open(path, "wb") as f:
        f.write(new)
    return True


def jpg_meta(path):
    """JPEG 的 APP1（EXIF/XMP）与 APP13（IPTC）与 COM 注释段。"""
    try:
        d = open(path, "rb").read()
    except OSError:
        return []
    if d[:2] != b"\xff\xd8":
        return []
    out, off = [], 2
    while off + 4 <= len(d):
        if d[off] != 0xFF:
            break
        marker = d[off + 1]
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            off += 2
            continue
        ln = struct.unpack(">H", d[off + 2:off + 4])[0]
        if marker in (0xE1, 0xED, 0xFE):
            out.append("APP%d" % (marker - 0xE0))
        if marker == 0xDA:      # 图像数据开始，后面不用扫了
            break
        off += 2 + ln
    return out


def strip_jpg(path):
    d = open(path, "rb").read()
    if d[:2] != b"\xff\xd8":
        return False
    out, off = [d[:2]], 2
    while off + 4 <= len(d):
        if d[off] != 0xFF:
            out.append(d[off:])
            break
        marker = d[off + 1]
        if marker in (0xD8, 0x01) or 0xD0 <= marker <= 0xD7:
            out.append(d[off:off + 2])
            off += 2
            continue
        ln = struct.unpack(">H", d[off + 2:off + 4])[0]
        end = off + 2 + ln
        if marker == 0xDA:
            out.append(d[off:])
            break
        if marker in (0xE1, 0xED, 0xFE):
            off = end
            continue
        out.append(d[off:end])
        off = end
    new = b"".join(out)
    if new == d:
        return False
    with open(path, "wb") as f:
        f.write(new)
    return True


# ── 音视频：ffmpeg -c copy（流不动）────────────────────────────────────
# 这些是**容器/编码器**层面的标记（用的是哪个 ffmpeg、什么版本），
# 不是内容信息；但它们会暴露工具链指纹，清掉更干净。
MEDIA_SUFFIX = (".mp4", ".webm", ".mkv", ".mov", ".m4v",
                ".ogg", ".mp3", ".wav", ".m4a", ".flac", ".aac", ".opus")


def strip_media(path):
    """返回 True 表示已改写。"""
    global FFMPEG
    if FFMPEG is None:
        FFMPEG = find_ffmpeg()
    ext = os.path.splitext(path)[1].lower()
    tmpdir = tempfile.mkdtemp(prefix="nkmeta_")
    try:
        dst = os.path.join(tmpdir, "out" + ext)
        cmd = [FFMPEG, "-y", "-loglevel", "error", "-i", path,
               "-map", "0", "-c", "copy", "-map_metadata", "-1",
               "-map_chapters", "-1", "-fflags", "+bitexact", dst]
        if ext in (".mp4", ".m4v", ".mov"):
            cmd += ["-movflags", "+faststart"]
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
        if r.returncode != 0 or not os.path.exists(dst):
            return False
        if os.path.getsize(dst) == 0:
            return False
        shutil.move(dst, path)
        # matroska/webm 的封装器自己会再写一遍 MuxingApp / WritingApp，
        # ffmpeg 的参数管不住 —— 那一层用 EBML 手术直接摘掉。
        if ext in (".webm", ".mkv"):
            strip_ebml(path)
        return True
    finally:
        shutil.rmtree(tmpdir, ignore_errors=True)


# ── matroska / webm：EBML 块级手术 ─────────────────────────────────────
# 要摘掉的块：
#   0x1254C367 Tags（整块）  0x1043A770 Chapters
#   0x5741 WritingApp  0x4D80 MuxingApp  0x4461 DateUTC  0x7BA9/0x4485 Title
# 这些是「谁做的、什么时候做的」这类署名信息；时长 / 码率那些功能值不动。
#
# ⚠ **不能用「删掉」的方式**：matroska 内部有绝对偏移引用
# （SeekHead 指向上层元素、Cues 指向 Cluster 的位置）。删掉中间的 Tags 块，
# 后面的 Cluster 全被挪位 → Cues 索引全部失效，播放器跳帧甚至播不了。
#
# 正确做法：把要摘的块**原地换成 Void（0xEC）填充** —— EBML 专门为「占位不改偏移」
# 设计的元素。字节数不变 → 所有偏移引用继续有效，块里的元数据也彻底没了。
_EBML_DROP = {0x1254C367, 0x1043A770, 0x5741, 0x4D80, 0x4461, 0x7BA9, 0x4485}
_EBML_CONTAINERS = {0x1654AE6B, 0x18538067, 0x114D9B74, 0x1549A966,
                    0x1254C367, 0x1043A770, 0x1C53BB6B, 0xAE}
_EBML_VOID_ID = 0xEC


def _ebml_read_id(d, i):
    """读元素 ID，返回 (id值, id字节数)。"""
    b = d[i]
    n, mask = 1, 0x80
    while not (b & mask):
        n += 1
        mask >>= 1
    return int.from_bytes(d[i:i + n], "big"), n


def _ebml_read_size(d, i):
    """读长度 VINT，返回 (长度值, 该字段占的字节数)。"""
    b = d[i]
    n, mask = 1, 0x80
    while not (b & mask):
        n += 1
        mask >>= 1
    val = b & (mask - 1)
    for k in range(1, n):
        val = (val << 8) | d[i + k]
    return val, n


def _ebml_void(total_len):
    """造一个**长度正好是 total_len** 的 Void 元素。

    Void = 1 字节 ID(0xEC) + 长度 VINT + 填充内容。
    长度 VINT 占 w 字节时，填充内容就是 total_len - 1 - w；
    这个值必须放得下（不能撞上「未知长度」的全 1 保留值）。
    """
    for w in range(1, 9):
        content = total_len - 1 - w
        if content < 0 or content >= (1 << (7 * w)) - 1:
            continue
        marker = 1 << (7 * w)
        return bytes([_EBML_VOID_ID]) + (marker | content).to_bytes(w, "big") + b"\x00" * content
    return None


def _ebml_rewrite(d, start, end):
    """重写 [start, end) 里的子元素列表，把 _EBML_DROP 里的块原地换成 Void。

    返回 (新字节, 是否改动过)。
    """
    out = []
    changed = False
    i = start
    while i < end:
        eid, id_len = _ebml_read_id(d, i)
        size, size_len = _ebml_read_size(d, i + id_len)
        head = i
        body = i + id_len + size_len
        stop = body + size
        if stop > end:                      # 数据损坏 / 未知长度 → 原样保留
            out.append(d[head:end])
            return b"".join(out), changed
        if eid in _EBML_DROP:
            pad = _ebml_void(stop - head)
            if pad is not None:
                out.append(pad)
                changed = True
            else:
                out.append(d[head:stop])
            i = stop
            continue
        if eid in _EBML_CONTAINERS:
            new_body, hit = _ebml_rewrite(d, body, stop)
            if hit:
                changed = True
                out.append(d[head:body])
                out.append(new_body)
                i = stop
                continue
        out.append(d[head:stop])
        i = stop
    return b"".join(out), changed


def strip_ebml(path):
    """摘掉 matroska/webm 里的 Tags 块与 Info 里的封装器署名（原地 Void 填充）。"""
    d = open(path, "rb").read()
    if d[:4] != b"\x1a\x45\xdf\xa3":
        return False
    # 跳过 EBML 头（它的内容保持原样）
    _, id_len = _ebml_read_id(d, 0)
    size, size_len = _ebml_read_size(d, id_len)
    seg_i = id_len + size_len + size
    # Segment 头
    seg_id, seg_id_len = _ebml_read_id(d, seg_i)
    seg_size, seg_size_len = _ebml_read_size(d, seg_i + seg_id_len)
    body_start = seg_i + seg_id_len + seg_size_len
    # 长度是「未知」时（全是 1），内容就是文件剩下的部分
    if seg_size >= (1 << (7 * seg_size_len)) - 1:
        body_end = len(d)
    else:
        body_end = min(body_start + seg_size, len(d))
    new_body, changed = _ebml_rewrite(d, body_start, body_end)
    if not changed:
        return False
    new = d[:body_start] + new_body + d[body_end:]
    with open(path, "wb") as f:
        f.write(new)
    return True


def main():
    ap = argparse.ArgumentParser(description="清除音视频图片的元数据")
    ap.add_argument("dirs", nargs="+")
    ap.add_argument("--check", action="store_true", help="只报告，不改文件")
    args = ap.parse_args()

    targets = []
    for d in args.dirs:
        if not os.path.isdir(d):
            print("✗ 不是目录:", d)
            continue
        for dp, dn, fn in os.walk(d):
            for f in fn:
                targets.append(os.path.join(dp, f))

    changed = skipped = 0
    freed = 0
    report = []
    for p in sorted(targets):
        ext = os.path.splitext(p)[1].lower()
        before = os.path.getsize(p)
        if ext == ".webp":
            metas = webp_meta(p)
            if not metas:
                skipped += 1
                continue
            if args.check:
                report.append((p, metas))
                continue
            if strip_webp(p):
                changed += 1
                freed += before - os.path.getsize(p)
            else:
                skipped += 1
        elif ext == ".png":
            metas = png_meta(p)
            if not metas:
                skipped += 1
                continue
            if args.check:
                report.append((p, metas))
                continue
            if strip_png(p):
                changed += 1
                freed += before - os.path.getsize(p)
            else:
                skipped += 1
        elif ext in (".jpg", ".jpeg"):
            metas = jpg_meta(p)
            if not metas:
                skipped += 1
                continue
            if args.check:
                report.append((p, metas))
                continue
            if strip_jpg(p):
                changed += 1
                freed += before - os.path.getsize(p)
            else:
                skipped += 1
        elif ext in MEDIA_SUFFIX:
            tags = probe_tags(p)
            if not tags:
                skipped += 1
                continue
            if args.check:
                report.append((p, sorted(tags)))
                continue
            if strip_media(p):
                changed += 1
                freed += before - os.path.getsize(p)
            else:
                skipped += 1

    if args.check:
        print("== 带元数据的文件 ==")
        for p, meta in report:
            print("  %s  %s" % (os.path.basename(p), meta))
        print("\n合计 %d 个文件带元数据" % len(report))
        return

    print("== 清除完成 ==")
    print("  改写", changed, "个 / 跳过（本就无元数据）", skipped, "个")
    if freed:
        print("  释放 %.1f KB" % (freed / 1024))


if __name__ == "__main__":
    main()
