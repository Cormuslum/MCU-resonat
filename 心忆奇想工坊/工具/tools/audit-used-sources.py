# -*- coding: utf-8 -*-
"""
审计：跑一遍管线，记录它**实际读到**的每一个源文件路径。

用途：确定「模拟器需要哪些源素材」的精确清单 ——
不靠猜、不靠硬编码表，直接看管线真正碰了哪些文件。

用法：
    python tools/audit-used-sources.py            # 只统计
    python tools/audit-used-sources.py --json out.json
"""

import io
import json
import os
import sys
import builtins

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：无限暖暖模拟器（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "无限暖暖模拟器")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
ASSET = os.path.join(ROOT, "素材")

# 只记录「素材」根下的读取（管线只该读素材/）
touched = set()   # 被 exists/isfile/open 探过的路径（文件或目录）
listed = set()    # 被 listdir 的目录
scanned = set()   # 被 walk 的目录

_real_open = builtins.open
_real_listdir = os.listdir
_real_walk = os.walk
_real_exists = os.path.exists
_real_isfile = os.path.isfile


def _norm(p):
    try:
        return os.path.abspath(p)
    except Exception:  # noqa: BLE001
        return str(p)


def _record(p):
    try:
        q = _norm(p)
        if q.startswith(ASSET):
            touched.add(q)
    except Exception:  # noqa: BLE001
        pass


def traced_open(file, *a, **kw):
    _record(file)
    return _real_open(file, *a, **kw)


def traced_listdir(path="."):
    try:
        q = _norm(path)
        if q.startswith(ASSET):
            listed.add(q)
    except Exception:  # noqa: BLE001
        pass
    return _real_listdir(path)


def traced_walk(top, *a, **kw):
    try:
        q = _norm(top)
        if q.startswith(ASSET):
            scanned.add(q)
    except Exception:  # noqa: BLE001
        pass
    return _real_walk(top, *a, **kw)


def traced_exists(path):
    _record(path)
    return _real_exists(path)


def traced_isfile(path):
    _record(path)
    return _real_isfile(path)


builtins.open = traced_open
os.listdir = traced_listdir
os.walk = traced_walk
os.path.exists = traced_exists
os.path.isfile = traced_isfile


def run(script):
    """跑一个管线脚本并记录它读过的路径。

    ⚠ 这两个脚本都用 `if __name__ == "__main__":` 包着主流程，
    所以必须把模块名设成 `__main__` 才会真的执行。
    """
    import importlib.util
    path = os.path.join(TOOL_ROOT, "tools", script)
    spec = importlib.util.spec_from_file_location("__main__", path)
    mod = importlib.util.module_from_spec(spec)
    # 关键：模块名必须是 __main__，否则脚本的 main() 不会跑
    spec.loader.exec_module(mod)
    return mod


def main():
    print("▶ 跑 build-pool-map.py …")
    try:
        run("build-pool-map.py")
    except SystemExit:
        pass
    except Exception as e:  # noqa: BLE001
        print("  (build-pool-map 异常，继续):", e)

    print("▶ 跑 collect-assets.py …")
    argv = sys.argv
    sys.argv = ["collect-assets.py", "--all", "--manifest-only"]
    try:
        run("collect-assets.py")
    except SystemExit:
        pass
    except Exception as e:  # noqa: BLE001
        print("  (collect-assets 异常，继续):", e)
    finally:
        sys.argv = argv

    # 汇总：凡是被探过的目录，其下所有文件都算「用到」
    # （管线用 exists() 探的是文件，但探目录时会把整个目录树算进来）
    used_files = set()
    for p in touched:
        if os.path.isfile(p):
            used_files.add(p)
        elif os.path.isdir(p):
            for root, _dirs, files in os.walk(p):
                for f in files:
                    used_files.add(os.path.join(root, f))
    for d in scanned:
        for root, _dirs, files in os.walk(d):
            for f in files:
                used_files.add(os.path.join(root, f))
    for d in listed:
        if os.path.isdir(d):
            for root, _dirs, files in os.walk(d):
                for f in files:
                    used_files.add(os.path.join(root, f))

    used_files = {p for p in used_files if os.path.isfile(p)}

    # 按「素材/ 下的相对路径第一段」归类
    by_top = {}
    for p in used_files:
        rel = os.path.relpath(p, ASSET).replace("\\", "/")
        top = rel.split("/", 1)[0]
        by_top.setdefault(top, []).append(rel)

    print(f"\n管线实际用到 {len(used_files)} 个文件（素材根下）")
    print(f"探过 {len(touched)} 个路径 · 列举 {len(listed)} 个 · 递归扫描 {len(scanned)} 个\n")
    for top, rels in sorted(by_top.items(), key=lambda x: -len(x[1])):
        size = sum(os.path.getsize(os.path.join(ASSET, r)) for r in rels)
        print(f"  {top:<32} {len(rels):>6} 文件  {size/1024/1024:>8.1f} MB")

    if "--json" in sys.argv:
        out = sys.argv[sys.argv.index("--json") + 1]
        json.dump(sorted(os.path.relpath(p, ASSET).replace("\\", "/")
                         for p in used_files),
                  io.open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print(f"\n清单已写：{out}")


if __name__ == "__main__":
    main()
