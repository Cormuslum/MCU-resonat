#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""打包备份：源码 + 文档 + 记忆 + public/assets/manifest.json（不含素材二进制）。

**全局约定（2026-11-10 用户要求）：每执行一次修改前，先打包上一个版本。**

用法：
    python tools/backup.py                # 版本号自动探测
    python tools/backup.py v1.9.10        # 显式指定（推荐）

命名沿用 备份/ 的约定：抽卡模拟器-v{ver}-{YYYY-MM-DD}.zip
"""
import glob
import os
import re
import sys
import zipfile
from datetime import date, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")

# 根目录固定要收的文件（* .md 另外全量收）
TOP_FILES = [
    "package.json",
    "package-lock.json",
    "心忆共鸣/tsconfig.json",
    "心忆共鸣/tsconfig.node.json",
    "心忆共鸣/vite.config.ts",
    "心忆共鸣/index.html",
    "心忆共鸣/package.json",
    "心忆共鸣/electron-builder-sim.yml",
    "心忆奇想工坊/package.json",
    "心忆奇想工坊/electron-builder-updater.yml",
]
# 收「少量文件」的目录（按下面的扩展名过滤）
TOP_DIRS = [
    "心忆共鸣/src",
    "心忆共鸣/electron",
    "心忆奇想工坊/工具/tools",
    "心忆奇想工坊/工具/updater",
    "心忆奇想工坊/electron",
    "布局坐标",
    "notes",
    ".workbuddy/memory",
]
EXTRA = [
    "心忆共鸣/public/assets/manifest.json",
    # 固定文案（信封欢迎语 / 工坊顶栏 / 帮助弹窗的唯一真源）
    "心忆奇想工坊/工具/文案.json",
    # 玄学运势的规格/笔记（纯 Markdown，体积小；素材二进制不收）
    "素材/玄学运势/玄学运势重构计划书.md",
    "素材/玄学运势/玄学运势-详细设定.md",
    "素材/玄学运势/玄学运势-学习笔记与实施建议.md",
]

SKIP_DIRS = {".git", "node_modules", "dist", ".shots", ".workbuddy-ai", "备份", "素材", "解包", "shots"}
# 工坊临时目录：.inbox（上传落地）/ .snapshots（回滚备份）都不收
UPDATER_SKIP = {".inbox", ".snapshots"}
# tools/ 只收脚本（沿用备份约定：不含 shots/*.png 截图产物）
TOOLS_EXT = {".py", ".mjs", ".sh", ".json"}
# 布局坐标/ 只收 Markdown 文档（pxdesk / png 素材体积大且可再生）
LAYOUT_EXT = {".md"}

# 目录 → 允许的扩展名（None = 全收）
DIR_EXT = {
    "心忆共鸣/src": None,
    "心忆共鸣/electron": {".mjs"},
    "心忆奇想工坊/工具/tools": TOOLS_EXT,
    "心忆奇想工坊/工具/updater": None,
    "心忆奇想工坊/electron": {".mjs", ".cjs"},
    "布局坐标": LAYOUT_EXT,
    "notes": LAYOUT_EXT,
    ".workbuddy/memory": {".md"},
}


def detect_ver() -> str:
    """版本号自动探测：优先「记忆日志里最新的 vX.Y.ZZ」，其次 CHANGELOG 首个条目。

    记忆日志是唯一每次都保持最新的地方（CHANGELOG 曾长期停在 v1.9.03）。
    """
    best = None
    files = glob.glob(os.path.join(ROOT, ".workbuddy", "memory", "*.md"))
    for p in files:
        try:
            text = open(p, encoding="utf-8").read()
        except OSError:
            continue
        for m in re.finditer(r"\bv(\d+)\.(\d+)\.(\d+)", text):
            key = tuple(int(x) for x in m.groups())
            if best is None or key > best[0]:
                best = (key, f"v{key[0]}.{key[1]}.{key[2]:02d}")
    if best:
        return best[1]
    cl = os.path.join(ROOT, "CHANGELOG.md")
    if os.path.isfile(cl):
        m = re.search(r"^## \[(v[\d.]+)\]", open(cl, encoding="utf-8").read(), re.M)
        if m:
            return m.group(1)
    return date.today().isoformat()


def collect():
    out = []
    for f in TOP_FILES:
        p = os.path.join(ROOT, f)
        if os.path.isfile(p):
            out.append((p, f))
    for p in glob.glob(os.path.join(ROOT, "*.md")):
        out.append((p, os.path.basename(p)))
    for d in TOP_DIRS:
        base = os.path.join(ROOT, d)
        allow = DIR_EXT.get(d)
        for dirpath, dirnames, filenames in os.walk(base):
            dirnames[:] = [x for x in dirnames if x not in SKIP_DIRS and x not in UPDATER_SKIP]
            for fn in filenames:
                if allow is not None and os.path.splitext(fn)[1].lower() not in allow:
                    continue
                p = os.path.join(dirpath, fn)
                rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
                out.append((p, rel))
    for f in EXTRA:
        p = os.path.join(ROOT, f)
        if os.path.isfile(p):
            out.append((p, f))
    return out


def pick_name(ver: str, stamp: str) -> str:
    """同名不覆盖：已存在就依次加 -b / -c / -d …（v2.4.01）。

    同一天同一版本号很容易被打包两次（改前留基线、改完再打一次），
    直接 write 会把先前的基线悄悄覆盖掉 —— 2026-11-01 就这样丢过一次。
    """
    base = os.path.join(ROOT, "备份", f"抽卡模拟器-{ver}-{stamp}")
    if not os.path.exists(base + ".zip"):
        return base + ".zip"
    for suffix in "bcdefghijklmnopqrstuvwxyz":
        cand = f"{base}-{suffix}.zip"
        if not os.path.exists(cand):
            return cand
    # 26 个后缀也用完了：退回时间戳，绝不覆盖
    return f"{base}-{datetime.now().strftime('%H%M%S')}.zip"


def main():
    ver = sys.argv[1] if len(sys.argv) > 1 else detect_ver()
    if not ver.startswith("v"):
        ver = "v" + ver
    items = collect()
    stamp = date.today().isoformat()
    dest = pick_name(ver, stamp)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with zipfile.ZipFile(dest, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for p, rel in items:
            z.write(p, rel)
    print(f"OK -> {dest}")
    print(f"entries: {len(items)}, size: {os.path.getsize(dest)/1024/1024:.2f} MB")


if __name__ == "__main__":
    main()
