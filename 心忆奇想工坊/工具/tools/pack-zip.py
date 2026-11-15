#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把已组装好的发行版打成 zip（release/_dist/），供 GitHub Release 上传。

只打包，不构建、不清理、不调用 pack-release.mjs —— 那个脚本会先把
release/无限暖暖发行版/ 整个清空，连 心忆共鸣/userdata/ 里的存档一起删。

五种包（单个都在 GitHub 2 GiB 单资产上限内）：
  sim      心忆共鸣（zip 顶层就是 心忆共鸣/，解压即得到程序目录）
  shop     心忆奇想工坊（顶层 心忆奇想工坊/，含教学文件与启动.bat）
  base     sim + shop 合包（zip 内保留「无限暖暖发行版/」外壳，兼容旧分发）
  clothes  服装阁动态背景视频包（28 条 mp4）
  home     主页轮播视频包（bg-video-2 + bg-audio-2）

拆分模式的目录层级与视频包的 `双击自动安装.bat` 对齐：视频包与 心忆共鸣/
放在同一层时，脚本第二个候选 `..\\心忆共鸣\\public` 命中。

用法：
    python tools/pack-zip.py                     # 版本号从 CHANGELOG 首条取
    python tools/pack-zip.py v2.3.00 --split     # 只打 sim + shop（推荐）
    python tools/pack-zip.py v2.3.00 --dry-run   # 只统计不写盘
    python tools/pack-zip.py v2.3.00 --only base --force
"""
import argparse
import os
import re
import sys
import time
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
RELEASE = os.path.join(ROOT, "release")
SRC = os.path.join(RELEASE, "无限暖暖发行版")
OUT = os.path.join(RELEASE, "_dist")
LIMIT = 2 * 1024 ** 3  # GitHub Release 单资产上限

# 不进行压缩的扩展名：实测已压缩的内容（webp/ogg 压不动 0~1%），deflate 只是白烧 CPU。
# exe/dll 反而能压掉 55~60%，所以不在此列。
STORED_EXT = {
    ".mp4", ".webm", ".m4v", ".ogg", ".mp3", ".wav", ".m4a",
    ".webp", ".png", ".jpg", ".jpeg", ".gif", ".avif",
    ".woff2", ".pak", ".zip", ".7z",
}

# 运行期产物：不进包（userdata 里是真实存档与浏览器指纹）
SKIP_DIRS = {"userdata", "__pycache__", "node_modules", ".git", ".snapshots", ".inbox", ".dist"}
SKIP_FILES = {
    "debug.log", "DevToolsActivePort", ".write-cache.json", ".last-apply.json",
    ".passthrough.json", ".e2e-server.log", "desktop.ini", "Thumbs.db", ".DS_Store",
    ".video-probe.json",  # collect-assets.py 的视频裁剪缓存，不是运行时文件
}
SKIP_EXT = {".pyc", ".log", ".tmp"}

# zip 内写入的启动器（UTF-8 无 BOM + CRLF，writestr 会自动置 0x800 中文名标志）
START_SIM = (
    "@echo off\r\n"
    "chcp 65001 >nul\r\n"
    "cd /d \"%~dp0\"\r\n"
    "start \"\" \"无限暖暖模拟器.exe\"\r\n"
)
START_SHOP = (
    "@echo off\r\n"
    "chcp 65001 >nul\r\n"
    "cd /d \"%~dp0\"\r\n"
    "start \"\" \"心忆奇想工坊.exe\"\r\n"
)

JOBS = [
    {
        "key": "sim",
        "name": "心忆共鸣-{ver}",
        "roots": [(os.path.join(SRC, "心忆共鸣"), "心忆共鸣")],
        "license": "心忆共鸣/LICENSE.txt",
        "virtuals": [("心忆共鸣/启动游戏.bat", START_SIM)],
    },
    {
        "key": "shop",
        "name": "心忆奇想工坊-{ver}",
        "roots": [
            (os.path.join(SRC, "心忆奇想工坊"), "心忆奇想工坊"),
            (os.path.join(ROOT, "素材", "教学文件"), "心忆奇想工坊/教学文件"),
        ],
        "extras": [(os.path.join(ROOT, "心忆奇想工坊", "工具", "updater", "README.md"),
                    "心忆奇想工坊/教学文件/README.md")],
        "license": "心忆奇想工坊/LICENSE.txt",
        "virtuals": [("心忆奇想工坊/启动工坊.bat", START_SHOP)],
    },
    {
        "key": "base",
        "name": "心忆共鸣-{ver}-win64",
        "roots": [
            (os.path.join(SRC, "心忆共鸣"), "无限暖暖发行版/心忆共鸣"),
            (os.path.join(SRC, "心忆奇想工坊"), "无限暖暖发行版/心忆奇想工坊"),
        ],
        "license": "无限暖暖发行版/LICENSE.txt",
    },
    {
        "key": "clothes",
        "name": "心忆共鸣-{ver}-动态背景包",
        "roots": [(os.path.join(RELEASE, "动态背景视频包"), "动态背景视频包")],
        "license": "动态背景视频包/LICENSE.txt",
    },
    {
        "key": "home",
        "name": "心忆共鸣-{ver}-主页轮播包",
        "roots": [(os.path.join(RELEASE, "主页轮播背景视频包"), "主页轮播背景视频包")],
        "license": "主页轮播背景视频包/LICENSE.txt",
    },
]

# 拆分模式只打这两个（视频包按需单独打）
SPLIT_KEYS = ("sim", "shop")

# 打包前必须存在的文件（缺一个说明上游构建没做完）
NEED = [
    "release/无限暖暖发行版/心忆共鸣/无限暖暖模拟器.exe",
    "release/无限暖暖发行版/心忆共鸣/resources/app.asar",
    "release/无限暖暖发行版/心忆共鸣/dist/index.html",
    "release/无限暖暖发行版/心忆共鸣/public/assets/manifest.json",
    "release/无限暖暖发行版/心忆奇想工坊/心忆奇想工坊.exe",
    "release/无限暖暖发行版/心忆奇想工坊/运行时/python.exe",
    "release/无限暖暖发行版/心忆奇想工坊/工具/updater/server.mjs",
]


def human(n):
    return f"{n / 1024 ** 2:.0f} MB" if n < 1024 ** 3 else f"{n / 1024 ** 3:.2f} GB"


def detect_version():
    """CHANGELOG 首条 `## [vX.Y.Z]`"""
    p = os.path.join(ROOT, "CHANGELOG.md")
    if os.path.isfile(p):
        with open(p, encoding="utf-8") as f:
            m = re.search(r"^## \[v([\d.]+)\]", f.read(), re.M)
        if m:
            return "v" + m.group(1)
    return ""


def warn_stale():
    """src 比 dist 新时提示忘了构建（不阻断）"""
    pub = os.path.join(SRC, "心忆共鸣")
    idx = os.path.join(pub, "dist", "index.html")
    srcdir = os.path.join(pub, "src")
    if not (os.path.isfile(idx) and os.path.isdir(srcdir)):
        return
    newest = 0.0
    for dirpath, dirnames, filenames in os.walk(srcdir):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if os.path.splitext(fn)[1].lower() in (".ts", ".vue"):
                newest = max(newest, os.path.getmtime(os.path.join(dirpath, fn)))
    if newest > os.path.getmtime(idx):
        print("  ! 提示：src 比 dist/index.html 新，可能忘了 npm run build")


def collect(root, prefix):
    """遍历一个根，产出 (磁盘路径, zip 内路径)"""
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in SKIP_DIRS)
        reldir = os.path.relpath(dirpath, root)
        for fn in sorted(filenames):
            if fn in SKIP_FILES or os.path.splitext(fn)[1].lower() in SKIP_EXT:
                continue
            full = os.path.join(dirpath, fn)
            rel = fn if reldir == "." else os.path.join(reldir, fn)
            yield full, prefix + "/" + rel.replace(os.sep, "/")


def build(job, ver, force, dry):
    dest = os.path.join(OUT, job["name"].format(ver=ver) + ".zip")
    items = []
    for root, prefix in job["roots"]:
        if not os.path.isdir(root):
            print(f"  ! 跳过缺失目录 {os.path.relpath(root, ROOT)}")
            continue
        items.extend(collect(root, prefix))
    for src, arc in job.get("extras", []):
        if os.path.isdir(src):
            items.extend(collect(src, arc))
        elif os.path.isfile(src):
            items.append((src, arc))
        else:
            print(f"  ! 跳过缺失附件 {os.path.relpath(src, ROOT)}")

    virtuals = job.get("virtuals", [])
    if not items:
        sys.exit(f"✗ {job['key']}：输入目录为空 {job['roots'][0][0]}")

    total = sum(os.path.getsize(p) for p, _ in items) + sum(len(d.encode("utf-8")) for _, d in virtuals)
    print(f"\n== {job['key']}  {len(items) + len(virtuals)} 个文件  {human(total)}")
    if dry:
        return {"key": job["key"], "name": os.path.basename(dest),
                "n": len(items) + len(virtuals), "total": total, "zip": 0, "sec": 0}

    if os.path.exists(dest) and not force:
        sys.exit(f"✗ 已存在 {os.path.basename(dest)}（加 --force 覆盖）")
    os.makedirs(OUT, exist_ok=True)

    tmp = dest + ".part"
    t0 = time.time()
    done = 0
    try:
        with zipfile.ZipFile(tmp, "w", allowZip64=True) as z:
            lic = os.path.join(ROOT, "LICENSE")
            if os.path.isfile(lic):
                z.write(lic, job["license"], compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)
            for full, arc in items:
                ext = os.path.splitext(full)[1].lower()
                ct = zipfile.ZIP_STORED if ext in STORED_EXT else zipfile.ZIP_DEFLATED
                z.write(full, arc, compress_type=ct,
                        compresslevel=6 if ct == zipfile.ZIP_DEFLATED else None)
                done += 1
                if done % 200 == 0 or done == len(items) + len(virtuals):
                    print(f"\r   {done}/{len(items) + len(virtuals)}  {human(total * done / (len(items) + len(virtuals)))}  {time.time() - t0:.0f}s",
                          end="", flush=True)
            for arc, data in virtuals:
                z.writestr(arc, data, compress_type=zipfile.ZIP_DEFLATED, compresslevel=6)
                done += 1
        print()
    except (OSError, PermissionError) as e:
        try:
            os.remove(tmp)
        except OSError:
            pass
        sys.exit(f"✗ 写入失败：{e}\n  先关掉 无限暖暖模拟器.exe / 心忆奇想工坊.exe 再打包")

    size = os.path.getsize(tmp)
    if size > LIMIT:
        os.remove(tmp)
        sys.exit(f"✗ {job['key']} 超过 GitHub 单资产 2 GiB 上限（{human(size)}）")

    # 自检：运行期文件与「本机路径」不该出现在包里
    with zipfile.ZipFile(tmp) as z:
        names = z.namelist()
    leak = [n for n in names if "/userdata/" in n or n.endswith("/debug.log")]
    if leak:
        os.remove(tmp)
        sys.exit(f"✗ 打进了运行期文件：{leak[:5]}")
    lnk = [n for n in names if n.lower().endswith(".lnk")]
    if lnk:
        os.remove(tmp)
        sys.exit(f"✗ 打进了快捷方式（写死绝对路径，换机器必失效）：{lnk[:5]}")

    os.replace(tmp, dest)
    sec = time.time() - t0
    print(f"   → {os.path.basename(dest)}  {human(size)}  {sec:.0f}s")
    return {"key": job["key"], "name": os.path.basename(dest),
            "n": len(items) + len(virtuals), "total": total, "zip": size, "sec": sec}


def main():
    ap = argparse.ArgumentParser(description="把发行版打成 zip")
    ap.add_argument("ver", nargs="?", default="", help="版本号，缺省取 CHANGELOG 首条")
    ap.add_argument("--only", default="", help="只打某一个：" + " / ".join(j["key"] for j in JOBS))
    ap.add_argument("--split", action="store_true", help="只打 心忆共鸣 + 心忆奇想工坊 两个包（不含视频包）")
    ap.add_argument("--dry-run", action="store_true", help="只统计，不写盘")
    ap.add_argument("--force", action="store_true", help="覆盖已存在的 zip")
    a = ap.parse_args()

    ver = a.ver or detect_version()
    if not ver:
        sys.exit("✗ 没拿到版本号：显式传一个，例如 v2.3.00")

    miss = [p for p in NEED if not os.path.isfile(os.path.join(ROOT, p))]
    if miss:
        sys.exit("✗ 发行版不完整，缺少：\n   " + "\n   ".join(miss) +
                 "\n   先 npm run build → 打包 exe/asar → node 心忆奇想工坊/工具/tools/pack-release.mjs")
    warn_stale()

    keys = SPLIT_KEYS if a.split else tuple(j["key"] for j in JOBS)
    jobs = [j for j in JOBS if j["key"] in keys and (not a.only or j["key"] == a.only)]
    if not jobs:
        sys.exit(f"✗ --only 只接受 {' / '.join(keys)}")

    rows = [build(j, ver, a.force, a.dry_run) for j in jobs]

    print("\n== 汇总")
    print(f"  {'文件':<42}{'条目':>6}{'原始':>10}{'zip':>10}{'耗时':>7}")
    for r in rows:
        print(f"  {r['name']:<42}{r['n']:>6}{human(r['total']):>10}{(human(r['zip']) if r['zip'] else '-'):>10}{r['sec']:>6.0f}s")
    if not a.dry_run:
        print(f"  合计 zip {human(sum(r['zip'] for r in rows))} → {os.path.relpath(OUT, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
