# -*- coding: utf-8 -*-
"""
合并结果的往返验证：写出去的 YAML 读回来，必须与源文件逐字段一致。

单测性质（不是验收脚本），跑法：
    python tools/verify-merge-set-yaml.py

v1.8.01：套装库改为**平铺**（`素材/套装库/<套装ID>.yaml`）+ **精简字段**
（无部件「标签」「形态」、无套装「妆容」「复刻版本」「文案来源」）。
所以这里只校验**保留下来的字段**，并额外断言被删字段确实不在文件里。
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import setyaml  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：无限暖暖模拟器（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "无限暖暖模拟器")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
LIB = os.path.join(ROOT, "素材", "套装库")

# `merge-set-yaml.py` 文件名带连字符，不能直接 import —— 用 importlib 按路径加载
import importlib.util  # noqa: E402
spec = importlib.util.spec_from_file_location(
    "msy", os.path.join(TOOL_ROOT, "tools", "merge-set-yaml.py")
)
msy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(msy)

fail = 0
checked = 0
n_parts = 0

# v1.8.01 起被删掉的字段（不该再出现在任何文件里）
DEAD_TOP = ("复刻版本", "文案来源", "妆容")
DEAD_PART = ("标签", "形态")


def bad(msg):
    global fail
    fail += 1
    print("  ✗", msg)


texts = msy.read_set_texts()
partyaml = msy.read_part_yaml()
seq = msy.read_sequence_csv()

files = sorted(f for f in os.listdir(LIB) if f.lower().endswith(".yaml"))
dirs = [d for d in os.listdir(LIB) if os.path.isdir(os.path.join(LIB, d))]
if dirs:
    bad(f"套装库里还有 {len(dirs)} 个子目录（应平铺）：{dirs[:3]}")

# v1.8.02：套装库只保留模拟器 86 座阁里的套装，其余在归档目录
ARCHIVE = os.path.join(ROOT, "归档素材", "2026-11-06-非模拟器套装")
arch_files = sorted(f for f in os.listdir(ARCHIVE) if f.lower().endswith(".yaml")) \
    if os.path.isdir(ARCHIVE) else []
arch_names = set()
for fn in arch_files:
    try:
        arch_names.add(setyaml.load(os.path.join(ARCHIVE, fn)).get("套装名", ""))
    except Exception:  # noqa: BLE001
        pass

print(f"读回 {len(files)} 份（+归档 {len(arch_files)} 份），逐字段比对…\n")

for fname in files:
    path = os.path.join(LIB, fname)
    data = setyaml.load(path)
    name = data.get("套装名", "")
    checked += 1
    has_yaml = name in partyaml
    txt = texts.get(name) or {}

    # ── 文件名必须是纯编号 ──
    stem = fname[:-5]
    if not stem.startswith("S"):
        bad(f"{fname}: 文件名不是纯编号（应以 S 开头）")

    dst_parts = data.get("部件", [])
    n_parts += len(dst_parts)

    # ── 已删字段不该残留 ──
    for dead in DEAD_TOP:
        if dead in data:
            bad(f"{name}: 仍残留已废弃字段「{dead}」")
    for p in dst_parts:
        for dead in DEAD_PART:
            if dead in p:
                bad(f"{name}/{p.get('名称')}: 仍残留已废弃字段「{dead}」")

    # ── 与 txt 比：整体文案 / 属性标签 ──
    if txt:
        if data.get("整体文案", "") != txt.get("整体文案", ""):
            bad(f"{name}: 整体文案往返不一致")
        if list(data.get("属性标签") or []) != list(txt.get("属性标签") or []):
            bad(f"{name}: 属性标签往返不一致")

        # ── 逐部位：部件名 / 文案 ──
        # 妆容两部位（妆容-原色 / 妆容-进化）v1.8.01 起**不写**（前端零引用）
        for slot, forms in (txt.get("形态") or {}).items():
            named = [f for f in forms if f.get("名称")]
            if not named:
                continue
            dst = [p for p in dst_parts if p.get("类型") == slot]
            if not dst:
                # 妆容部位没有对应部件是**预期**（yaml 里也没有）
                continue
            base = dst[0]
            # 部件名 = txt 第 1 条的名字
            if base.get("名称") != named[0]["名称"]:
                bad(f"{name}/{slot}: 部件名往返不一致 {base.get('名称')!r} ≠ {named[0]['名称']!r}")
            # 部件文案：yaml 优先（可能与 txt 不同），yaml 没有才用 txt
            if not has_yaml and (base.get("文案") or "") != (named[0].get("文案") or ""):
                bad(f"{name}/{slot}: 部件文案往返不一致")

    # ── 与属性 yaml 比（只有 4★/5★ 有）──
    src = partyaml.get(name)
    if src:
        _, src_parts = src
        by_pair = {(p.get("类型", ""), p.get("名称", "")): p for p in dst_parts}
        for a in src_parts:
            pair = ((a.get("类型") or "").strip(), (a.get("名称") or "").strip())
            b = by_pair.get(pair)
            if not b:
                bad(f"{name}: yaml 部件 {pair[1]}（{pair[0]}）往返后丢了")
                continue
            if (a.get("文案") or "").strip() != b.get("文案", ""):
                bad(f"{name}/{b.get('名称')}: 部件文案往返不一致")
            if str(a.get("id", "")).strip() != str(b.get("id", "")).strip():
                bad(f"{name}/{b.get('名称')}: id 往返不一致")
            sa = a.get("五维倾向") or {}
            sb = b.get("五维倾向") or {}
            if isinstance(sa, dict):
                for k, v in sa.items():
                    try:
                        if sb.get(k) != int(v):
                            bad(f"{name}/{b.get('名称')}: 五维 {k} 往返不一致")
                    except (TypeError, ValueError):
                        pass

    # ── 与套装序列.csv 比 ──
    meta = seq.get(name)
    if meta:
        for key in ("套装ID", "来源阁", "首发版本"):
            if str(meta.get(key, "")) != str(data.get(key, "")):
                bad(f"{name}: {key} 往返不一致 {data.get(key)!r} ≠ {meta.get(key)!r}")

# ── 完整性：库内 + 归档 == 全集，且两者不重叠 ──
lib_names = set()
for fn in files:
    try:
        lib_names.add(setyaml.load(os.path.join(LIB, fn)).get("套装名", ""))
    except Exception:  # noqa: BLE001
        pass
lib_names.discard("")
full = set(texts) | set(partyaml)
if lib_names & arch_names:
    bad(f"库与归档目录重叠 {len(lib_names & arch_names)} 套：{sorted(lib_names & arch_names)[:3]}")
missing = full - lib_names - arch_names
if missing:
    bad(f"全集里既不在库也不在归档的有 {len(missing)} 套：{sorted(missing)[:3]}")
extra = (lib_names | arch_names) - full
if extra:
    bad(f"库/归档里有源里不存在的 {len(extra)} 套：{sorted(extra)[:3]}")

print(f"\n检查 {checked} 份 / 部件 {n_parts} 个")
print(f"完整性：库 {len(lib_names)} 套 + 归档 {len(arch_names)} 套 = {len(lib_names | arch_names)} 套"
      f"（源可合并 {len(full)} 套，重叠 {len(lib_names & arch_names)}）")
if fail == 0:
    print("✓ 全部往返一致")
else:
    print(f"✗ {fail} 处不一致")
sys.exit(0 if fail == 0 else 1)
