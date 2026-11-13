# -*- coding: utf-8 -*-
"""
把 `原始素材/` 里模拟器真正需要的素材，**复制**到 `素材/` 的新结构里。

## 目标结构（按「实体」组织，不按文件类型）

```
素材/
├── 套装库/           ← 已有：132 份 <套装ID>.yaml（管线唯一真源的套装数据）
├── 服装阁/           ← 一座阁一个目录（86 座）：卡池横幅/深忆奖励/套装立绘/部件图标
├── 套装卡片图/        ← 132 套的卡片图与属性 yaml
├── 套装文案/          ← 套装文案 txt（合并套装库的原料）
├── 故事/             ← 套装故事 md
├── 阅读物/           ← 图鉴的书籍 / 阅读物
├── 界面/             ← 主页/博物图鉴/玄学运势/辉煌心光/抽卡演出/深海回响/通用UI/UI整包
├── 卡池背景/          ← 卡池整屏背景 + 卡池列表缩略图
├── 音频/             ← 音效/BGM/卡池进入音
├── 视频/             ← 登录动画、卡池动态背景
├── 字体/             ← ttf
├── 信息表/            ← 版本表/套装序列/卡池索引/前后名称对照
└── 通用散件/          ← 3★ 通用散件（全卡池共用）
```

## 判据：「模拟器需要」= 管线实际读到

用 `tools/audit-used-sources.py` 插桩跑一遍 `build-pool-map.py` +
`collect-assets.py`，记录它们**真正打开/列举/扫描**过的路径 —— 不靠猜。

## 两条裁剪规则

1. **服装阁 / 套装卡片图 只收套装库里那 132 套**涉及的阁与套装；
2. 其余目录按「审计用到的子项」裁剪（管线扫目录的，整目录搬）。

## 用法

    python tools/collect-materials.py            # 执行复制
    python tools/collect-materials.py --dry-run  # 只列计划
"""

import argparse
import io
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
SRC = os.path.join(ROOT, "原始素材")
DST = os.path.join(ROOT, "素材")
AUDIT = os.path.join(ROOT, ".audit-used.json")

sys.path.insert(0, os.path.join(TOOL_ROOT, "tools"))


# ────────────────────────────────────────────── 结构定义

# (源目录, 目标目录, 裁剪方式, 备注)
#   裁剪方式：'all' = 整个目录搬 / 'sets' = 按 132 套裁剪 / 'used' = 按审计用到的文件搬
PLAN = [
    ("source", "服装阁", "sets", "阁级素材 + 132 套的立绘/图标"),
    ("图片素材", "套装卡片图", "sets", "132 套的卡片图与属性 yaml"),
    ("套装文案", "套装文案", "all", "套装文案 txt（合并套装库的原料）"),
    ("套装故事", "故事", "all", "套装故事 md"),
    ("阅读物", "阅读物", "all", "图鉴的书籍 / 阅读物"),

    ("主页", "界面/主页", "used", "主页"),
    ("博物图鉴", "界面/博物图鉴", "used", "图鉴三个子界面"),
    ("玄学运势", "界面/玄学运势", "used", "玄学运势"),
    ("辉煌心光", "界面/辉煌心光", "used", "辉煌心光"),
    ("界面", "界面/抽卡演出", "used", "抽卡演出界面"),
    ("游戏内实机展示", "界面/抽卡演出", "used", "抽卡过程实录"),
    ("深海回响奖励", "界面/深海回响", "used", "深海回响奖励图"),
    ("部分UI及道具图片", "界面/通用UI", "used", "通用按钮/纸框/艺术字映射"),
    ("0主素材", "界面/UI整包", "used", "官方 UI 整包"),

    ("卡池背景图", "卡池背景", "used", "卡池整屏背景"),
    ("卡池背景图（纯图片，无艺术字）", "卡池背景", "used", "卡池整屏背景（纯图片版）"),
    ("卡池界面缩略图", "卡池背景", "used", "卡池列表缩略图"),

    ("卡池音频", "音频", "used", "音效与卡池进入音"),
    ("音频素材", "音频", "used", "BGM / 抽卡音效"),
    ("视频素材", "视频", "used", "登录动画、卡池动态背景"),

    ("字体库", "字体", "used", "字体 ttf"),
    ("信息表", "信息表", "used", "版本表 / 套装序列 / 卡池索引"),
    ("所有卡池通用三星散件", "通用散件", "used", "3★ 通用散件（全卡池共用）"),
]


def load_used():
    """审计出来的「管线实际用到」清单（相对 素材/ 的路径）"""
    if not os.path.exists(AUDIT):
        print("找不到审计清单，先跑：python tools/audit-used-sources.py --json .audit-used.json")
        sys.exit(1)
    return set(json.load(io.open(AUDIT, encoding="utf-8")))


# ────────────────────────────────────────────── 过滤规则

# 阁级目录（不是套装）
LEVEL_DIRS = {"卡池横幅", "深忆奖励", "妆容展示", "三星散件",
              "卡池界面缩略图", "背景图", "卡池缩略图"}


def load_live_sets():
    """套装库里的 132 套（模拟器真实有的）"""
    import setyaml
    lib = os.path.join(DST, "套装库")
    out = set()
    for fn in os.listdir(lib):
        if fn.lower().endswith(".yaml"):
            d = setyaml.load(os.path.join(lib, fn))
            if d.get("套装名"):
                out.add(d["套装名"])
    return out


def load_live_banners():
    """模拟器里的阁：{阁名: {套装名}}

    ⚠ **不能用 pool-map.json 当判据** —— pool-map 是 build-pool-map 的**产物**，
    用它来裁剪 source 就是循环依赖：一旦某次跑坏了 pool-map（少了阁），
    下次复制就会把那座阁也删掉，越跑越少。

    正确的判据是**源头**：`原始素材/source/<版本>/<阁名>/` 的目录名
    （build-pool-map 也是扫它建阁的，所以两者天然一致）。
    """
    src = os.path.join(SRC, "source")
    out = {}
    if not os.path.isdir(src):
        return out
    for ver in os.listdir(src):
        vp = os.path.join(src, ver)
        if not os.path.isdir(vp):
            continue
        for bd in os.listdir(vp):
            bp = os.path.join(vp, bd)
            if not os.path.isdir(bp):
                continue
            if not any(os.path.isdir(os.path.join(bp, x))
                       for x in ("卡池横幅", "深忆奖励")):
                continue
            # 阁名去掉 `常驻·` 这类前缀（管线里也是这么剥的）
            name = bd[3:] if bd.startswith("常驻·") else bd
            sets = set()
            for sd in os.listdir(bp):
                sp = os.path.join(bp, sd)
                if os.path.isdir(sp) and sd not in LEVEL_DIRS:
                    sets.add(sd)
            out[name] = sets
    return out


# ────────────────────────────────────────────── 过滤规则

def keep_source(rel, live_sets, banner_sets):
    """source/<版本>/<阁名>/<套装名>/<文件> → 留不留

    - 阁级素材（卡池横幅/深忆奖励…）：阁在模拟器里就留
    - 套装目录：套装名要在 132 套里，且这座阁在模拟器里

    ⚠ 阁目录名可能带前缀（如 `常驻·遥远之海`），而 pool-map 里存的是纯名（`遥远之海`）
       —— 所以匹配时要**去掉前缀再比**，否则整座阁会被漏掉。
    """
    parts = rel.split("/")
    if len(parts) < 3:
        return True
    banner = parts[2]
    if len(parts) == 3 or parts[3] in LEVEL_DIRS:
        return in_banner(banner, banner_sets)
    if parts[3] not in live_sets:
        return False
    return in_banner(banner, banner_sets)


def in_banner(dir_name, banner_sets):
    """source 里的阁目录名 → 是否是模拟器里的那座阁（兼容 `常驻·` 这类前缀）"""
    if dir_name in banner_sets:
        return True
    return dir_name.split("·")[-1] in banner_sets


def keep_pictures(rel, live_sets):
    """图片素材/<版本>/<套装目录>/… → 套装名要在 132 套里

    套装目录名形如 `5星-常驻共鸣-《天鹅童话》`，套装名在《》里。
    """
    parts = rel.split("/")
    if len(parts) < 3:
        return True
    d = parts[2]
    if "《" in d and "》" in d:
        return d[d.index("《") + 1: d.index("》")] in live_sets
    return True


# ────────────────────────────────────────────── 复制

def copy_file(src_path, dst_path, dry):
    """复制单个文件（内容一致就跳过，避免白占一份磁盘）"""
    if os.path.exists(dst_path):
        try:
            if os.path.getsize(src_path) == os.path.getsize(dst_path):
                with open(src_path, "rb") as a, open(dst_path, "rb") as b:
                    if a.read() == b.read():
                        return "skip"
        except OSError:
            pass
    if dry:
        return "plan"
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    shutil.copy2(src_path, dst_path)
    return "copy"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="只列计划，不复制")
    args = ap.parse_args()

    used = load_used()
    live_sets = load_live_sets()
    banner_sets = load_live_banners()
    print(f"套装库 {len(live_sets)} 套 · 模拟器 {len(banner_sets)} 座阁\n")

    total_copy = total_skip = 0
    total_bytes = 0

    for src_dir, dst_rel, mode, note in PLAN:
        src_root = os.path.join(SRC, src_dir)
        if not os.path.isdir(src_root):
            print(f"  [跳过] 源目录不存在：{src_dir}")
            continue
        dst_root = os.path.join(DST, dst_rel.replace("/", os.sep))

        n_copy = n_skip = n_skip_rule = 0
        size = 0
        for root, _dirs, files in os.walk(src_root):
            for fn in files:
                abs_src = os.path.join(root, fn)
                inner = os.path.relpath(abs_src, src_root).replace("\\", "/")

                if mode == "sets":
                    rel = f"{src_dir}/{inner}"
                    if src_dir == "source":
                        ok = keep_source(rel, live_sets, banner_sets)
                    else:
                        ok = keep_pictures(rel, live_sets)
                    if not ok:
                        n_skip_rule += 1
                        continue
                elif mode == "used":
                    if f"{src_dir}/{inner}" not in used:
                        n_skip_rule += 1
                        continue

                dst = os.path.join(dst_root, inner.replace("/", os.sep))
                act = copy_file(abs_src, dst, args.dry_run)
                if act in ("copy", "plan"):
                    n_copy += 1
                    size += os.path.getsize(abs_src)
                elif act == "skip":
                    n_skip += 1

        total_copy += n_copy
        total_skip += n_skip
        total_bytes += size
        rule = {"all": "", "sets": "（按132套裁剪）", "used": "（按审计裁剪）"}[mode]
        print(f"  {src_dir:<22} → {dst_rel:<16} 复制 {n_copy:>5}  已存在 {n_skip:>4}  "
              f"规则排除 {n_skip_rule:>5}  {size/1024/1024:>7.1f} MB {rule}")

    print(f"\n合计：复制 {total_copy} 文件 / 已存在跳过 {total_skip} / {total_bytes/1024/1024:.1f} MB")
    if args.dry_run:
        print("（--dry-run：未实际复制）")


if __name__ == "__main__":
    main()
