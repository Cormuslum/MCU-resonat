# -*- coding: utf-8 -*-
"""
合并三份套装源文件 → 一份精简的套装 YAML。

## 要解决的问题

现在同一个套装的信息散在三处，而且**大量重复**：

| 源 | 内容 | 重复情况 |
|---|---|---|
| `图片素材/<版本>/<套装目录>/属性-*.yaml` | 部件的名称/类型/id/五维倾向/**文案**/标签 | 部件「文案」与 txt 第 1 条 **99.3% 逐字相同** |
| `套装文案/<版本>/<星级>-<池类型>-《套装名》.txt` | 整体文案 / 属性标签 / 每部位 5 个进化形态的文案 | 每部位第 1 条 = yaml 的「文案」；第 2~5 条（占 txt 的 57%）**前端从不读** |
| `信息表/套装部件.csv` | 每个进化等阶的部位→部件名 | 与 txt 的形态名 **100% 一致**，整表可派生 |

合并后每套装只剩一份 YAML，**平铺**在 `素材/套装库/<套装ID>.yaml`，字段如下：

```
套装名 / 套装ID / 星级 / 来源阁 / 首发版本   ← 套装序列.csv
整体文案 / 属性标签                          ← txt（yaml 没有）
部件[].名称/类型/id/五维倾向/文案            ← 属性 yaml
```

**只写模拟器真正读的字段**（v1.8.01 精简）：部件的 `标签` / `形态`、套装的
`妆容` / `复刻版本` / `文案来源` 全部不写 —— 前端零引用，详见 `setyaml.py` 的字段取舍表。

## 用法

```bash
python tools/merge-set-yaml.py --out 素材/套装库          # 生成
python tools/merge-set-yaml.py --out 素材/套装库 --check  # 只校验，不写盘
```

写盘前会做一致性检查（部件名/文案/五维与源逐项比对），不一致就中止。
"""

import argparse
import csv
import io
import json
import os
import re
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import setyaml  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：无限暖暖模拟器（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "无限暖暖模拟器")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
ASSET = os.path.join(ROOT, "素材")

SLOTS = [
    "发型", "连衣裙", "上衣", "下装", "外套", "袜子", "鞋子",
    "饰品·发饰", "饰品·帽子", "饰品·耳饰", "饰品·颈饰", "饰品·项圈", "饰品·胸饰",
    "饰品·背饰", "饰品·腕饰", "饰品·臂饰", "饰品·手套", "饰品·手持物",
    "饰品·面饰", "饰品·挂饰", "饰品·肤绘", "饰品·戒指",
]


# ────────────────────────────────────────────── 读源

def read_set_texts():
    """套装名 → txt 解析结果"""
    out = {}
    base = os.path.join(ASSET, "套装文案")
    if not os.path.isdir(base):
        return out
    for ver in os.listdir(base):
        vp = os.path.join(base, ver)
        if not os.path.isdir(vp):
            continue
        for fn in os.listdir(vp):
            if not fn.lower().endswith(".txt"):
                continue
            try:
                info = setyaml.parse_text(os.path.join(vp, fn))
            except Exception as e:  # noqa: BLE001
                print(f"[跳过] 文案读取失败 {ver}/{fn}: {e}")
                continue
            out[info["套装名"]] = info
    return out


def read_part_yaml():
    """套装名 → (yaml 路径, 部件列表)"""
    out = {}
    base = os.path.join(ASSET, "图片素材")
    if not os.path.isdir(base):
        return out
    for ver in os.listdir(base):
        vp = os.path.join(base, ver)
        if not os.path.isdir(vp):
            continue
        for sd in os.listdir(vp):
            sp = os.path.join(vp, sd)
            if not os.path.isdir(sp):
                continue
            yml = next((f for f in os.listdir(sp) if f.lower().endswith(".yaml")), None)
            if not yml:
                continue
            m = re.search(r"《(.+?)》", sd)
            name = m.group(1) if m else sd
            try:
                sname, parts = setyaml.parse_part_yaml(os.path.join(sp, yml))
            except Exception as e:  # noqa: BLE001
                print(f"[跳过] 属性 yaml 读取失败 {ver}/{sd}: {e}")
                continue
            out[name or sname] = (os.path.join(sp, yml), parts)
    return out


def read_sequence_csv():
    """套装名 → {套装ID, 星级, 来源阁, 首发版本, 复刻版本}（只取「初始」行）"""
    out = {}
    path = os.path.join(ASSET, "信息表", "套装序列.csv")
    if not os.path.exists(path):
        return out
    rows = csv.DictReader(io.open(path, encoding="utf-8-sig"))
    for r in rows:
        if (r.get("进化等阶") or "").strip() != "初始":
            continue
        name = (r.get("套装名") or "").strip()
        if not name:
            continue
        star = (r.get("星级") or "").strip().replace("★", "")
        out[name] = {
            "套装ID": (r.get("套装ID") or "").strip(),
            "星级": int(star) if star.isdigit() else 0,
            "来源阁": (r.get("来源/阁名") or "").strip(),
            "首发版本": (r.get("首发") or "").strip(),
            "复刻版本": (r.get("复刻") or "").strip(),
        }
    return out


# ────────────────────────────────────────────── 合并

def build_one(name, texts, partyaml, seq):
    """合并单个套装 → 精简版 dict

    ⚠ 两种套装要分开处理（部件骨架的来源不同）：

    **4★ / 5★**（131 套）：有 `属性-*.yaml`。
        部件列表来自 yaml（名称/类型/id/五维倾向/文案），
        txt 里同部位的第 1 条是它自己的文案（yaml 为准，txt 补空）。

    **3★**（183 套，商城/宝箱/搭配势力/主线任务…）：**没有** 属性 yaml ——
        3★ 不进图鉴，官方也没导出部件属性表。
        所以部件列表改由 txt 的部位反推：每个部位 = 一个部件，
        名称取该部位第 1 条，文案取第 1 条。

    **只产出模拟器真正读的字段**（v1.8.01）：
    部件的 `标签`（前端读的 key 不存在）、`形态`（formTexts 前端零引用）、
    套装的 `妆容` / `复刻版本` / `文案来源` 全部丢弃 —— 它们仍能从
    `图片素材/` 与 `套装文案/` 的源文件重新派生。

    ## 两条对齐规则（实测踩出来的，别改）

    1. **txt 的部位名 ≠ yaml 的类型名**：txt 独有「妆容-原色 / 妆容-进化」
       （妆容的两套配色，yaml 里对应的是「饰品·面饰 / 饰品·肤绘」）。
       这两个部位在 yaml 里没有对应部件 → 前端不读，直接丢弃。
    2. **txt 第 1 条的文案可能为空**，此时 yaml 的「文案」才是有效值
       （例：白夜长旋舞的「袜子」）。所以部件文案以 **yaml 为准**，
       yaml 没有才用 txt 补 —— 反过来会把空值写进去。
    """
    txt = texts.get(name, {})
    meta = seq.get(name, {})
    forms_by_slot = txt.get("形态", {})  # 部位 → [{名称, 文案}]
    has_yaml = name in partyaml
    parts_src = partyaml.get(name, (None, []))[1]

    if has_yaml:
        # ── 4★/5★：yaml 是骨架 ──
        parts = []
        for p in parts_src:
            slot = (p.get("类型") or "").strip()
            part = {
                "名称": (p.get("名称") or "").strip(),
                "类型": slot,
            }
            if p.get("id"):
                part["id"] = str(p["id"]).strip()
            stats = p.get("五维倾向") or {}
            if isinstance(stats, dict) and stats:
                clean = {}
                for k, v in stats.items():
                    try:
                        clean[k] = int(v)
                    except (TypeError, ValueError):
                        continue
                if clean:
                    part["五维倾向"] = clean
            # 部件文案：yaml 优先，txt 第 1 条补空（txt 有时是空的）
            desc = (p.get("文案") or "").strip()
            if not desc:
                first = next((f for f in forms_by_slot.get(slot, []) if f.get("名称")), None)
                if first and first.get("文案"):
                    desc = first["文案"].strip()
            if desc:
                part["文案"] = desc
            parts.append(part)
    else:
        # ── 3★：txt 是唯一来源，按部位反推部件 ──
        parts = []
        for slot, entries in forms_by_slot.items():
            named = [f for f in entries if f.get("名称")]
            if not named:
                continue
            part = {"名称": named[0]["名称"], "类型": slot}
            if named[0].get("文案"):
                part["文案"] = named[0]["文案"]
            parts.append(part)

    return {
        "套装名": name,
        "套装ID": meta.get("套装ID", ""),
        "星级": meta.get("星级", 0),
        "来源阁": meta.get("来源阁", ""),
        "首发版本": meta.get("首发版本", ""),
        "整体文案": txt.get("整体文案", ""),
        "属性标签": txt.get("属性标签", []),
        "部件": parts,
    }


# ────────────────────────────────────────────── 校验

def verify(data, texts, partyaml):
    """把合并结果与源逐项比对，返回问题列表"""
    problems = []
    name = data["套装名"]
    txt = texts.get(name) or {}

    # 1. 整体文案 / 属性标签 必须与 txt 一致
    if txt:
        if (txt.get("整体文案") or "") != (data.get("整体文案") or ""):
            problems.append(f"{name}: 整体文案与 txt 不一致")
        if list(txt.get("属性标签") or []) != list(data.get("属性标签") or []):
            problems.append(f"{name}: 属性标签与 txt 不一致")

    # 2. 部件必须与源一致
    #    4★/5★：部件来自属性 yaml（名称/类型/文案/五维逐项比）
    #    3★：没有 yaml，部件由 txt 的部位反推（名称/文案来自 txt 第 1 条）
    src = partyaml.get(name)
    if src:
        _, src_parts = src
        if len(src_parts) != len(data["部件"]):
            problems.append(f"{name}: 部件数 {len(data['部件'])} ≠ 源 {len(src_parts)}")
        # yaml 的每个部件都要能在结果里按 (类型, 名称) 找到
        got_pairs = {(p.get("类型", ""), p.get("名称", "")) for p in data["部件"]}
        for a in src_parts:
            pair = ((a.get("类型") or "").strip(), (a.get("名称") or "").strip())
            if pair not in got_pairs:
                problems.append(f"{name}: yaml 部件 {pair[1]}（{pair[0]}）在结果里丢了")
        # yaml 部件的字段逐项比对（按 pair 找对应项）
        by_pair = {(p.get("类型", ""), p.get("名称", "")): p for p in data["部件"]}
        for a in src_parts:
            pair = ((a.get("类型") or "").strip(), (a.get("名称") or "").strip())
            b = by_pair.get(pair)
            if not b:
                continue
            if (a.get("文案") or "").strip() != b.get("文案", "") and (a.get("文案") or "").strip():
                problems.append(f"{name}/{b['名称']}: 文案与源不一致")
            sa = a.get("五维倾向") or {}
            sb = b.get("五维倾向") or {}
            if isinstance(sa, dict):
                for k, v in sa.items():
                    try:
                        if sb.get(k) != int(v):
                            problems.append(f"{name}/{b['名称']}: 五维 {k} 不一致")
                    except (TypeError, ValueError):
                        pass
    else:
        # 3★：部件数应等于 txt 的部位数
        want_slots = len([s for s, f in (txt.get("形态") or {}).items()
                          if any(x.get("名称") for x in f)])
        if want_slots and len(data["部件"]) != want_slots:
            problems.append(f"{name}: 3★ 部件数 {len(data['部件'])} ≠ txt 部位数 {want_slots}")

    # 3. 整体文案不该和部件文案串位
    #    ⚠ 官方数据本身就有「套装整体文案 == 连衣裙文案」的情况（星之海就是），
    #    所以只在**多个**部件文案同时等于整体文案时才判为串位。
    if data.get("整体文案"):
        same = [p for p in data["部件"] if (p.get("文案") or "").strip() == data["整体文案"].strip()]
        if len(same) >= 2:
            problems.append(f"{name}: {len(same)} 个部件文案都等于整体文案（疑似串位）")

    # 4. 精简后不该残留被删掉的字段
    for dead in ("复刻版本", "文案来源", "妆容"):
        if dead in data:
            problems.append(f"{name}: 仍残留已废弃字段「{dead}」")
    for p in data["部件"]:
        for dead in ("标签", "形态"):
            if dead in p:
                problems.append(f"{name}/{p.get('名称')}: 仍残留已废弃字段「{dead}」")

    return problems


# ────────────────────────────────────────────── 主流程

def read_live_sets():
    """模拟器里真实存在的套装名集合（= 86 座服装阁里的那些）

    判据取 `素材/source/<版本>/<阁名>/<套装目录>` 的目录名 ——
    这是**管线的权威源**：`build-pool-map.py` 就是扫它建阁的。
    归档时（v1.8.02）用同一判据把没有对应服装阁的套装挪进 `归档素材/`。

    `素材/source` 不存在时返回空集 → 调用方据此不做过滤（保持旧行为）。
    """
    base = os.path.join(ASSET, "source")
    if not os.path.isdir(base):
        return set()
    # 阁目录里这些是阁级素材，不是套装
    NOT_SET = {"卡池横幅", "深忆奖励", "妆容展示", "三星散件",
               "卡池界面缩略图", "背景图", "卡池缩略图"}
    out = set()
    for ver in os.listdir(base):
        vp = os.path.join(base, ver)
        if not os.path.isdir(vp):
            continue
        for banner in os.listdir(vp):
            bp = os.path.join(vp, banner)
            if not os.path.isdir(bp):
                continue
            # 阁目录的判据：含「卡池横幅」或「深忆奖励」
            if not any(os.path.isdir(os.path.join(bp, x))
                       for x in ("卡池横幅", "深忆奖励")):
                continue
            for sd in os.listdir(bp):
                sp = os.path.join(bp, sd)
                if os.path.isdir(sp) and sd not in NOT_SET:
                    out.add(sd)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ASSET, "套装库"), help="输出目录")
    ap.add_argument("--check", action="store_true", help="只校验，不写盘")
    ap.add_argument("--all", action="store_true",
                    help="生成全部套装（含没有对应服装阁的），不按 --live 过滤")
    ap.add_argument("--live", action="store_true",
                    help="只生成模拟器 86 座服装阁里有的套装（默认行为）")
    ap.add_argument("--archive", action="store_true",
                    help="只生成**没有**对应服装阁的套装（写进归档目录用）")
    args = ap.parse_args()

    texts = read_set_texts()
    partyaml = read_part_yaml()
    seq = read_sequence_csv()

    all_names = set(texts) | set(partyaml)
    names = sorted(all_names)
    print(f"源：txt {len(texts)} 套 / 属性 yaml {len(partyaml)} 套 / 套装序列 {len(seq)} 套")
    print(f"待合并：{len(names)} 套")

    # v1.8.02：默认只生成模拟器里真实存在的套装（没有对应服装阁的已归档到 归档素材/）
    live = set()
    if not args.all:
        live = read_live_sets()
        if live:
            if args.archive:
                names = [n for n in names if n not in live]
                print(f"（--archive）只生成没有对应服装阁的 {len(names)} 套")
            else:
                names = [n for n in names if n in live]
                print(f"（--live）只生成模拟器 86 座阁里的 {len(names)} 套；"
                      f"其余 {len(all_names) - len(names)} 套见 归档素材/")

    merged = {}
    problems = []
    for name in names:
        data = build_one(name, texts, partyaml, seq)
        problems += verify(data, texts, partyaml)
        merged[name] = data

    # 统计
    n_parts = sum(len(d["部件"]) for d in merged.values())
    n_desc = sum(1 for d in merged.values() if d.get("整体文案"))
    n_styles = sum(1 for d in merged.values() if d.get("属性标签"))
    n_meta = sum(1 for d in merged.values() if d.get("套装ID"))
    print(f"\n合并结果：部件 {n_parts} 个")
    print(f"  有整体文案 {n_desc} 套 · 有属性标签 {n_styles} 套 · 有套装ID {n_meta} 套")

    if problems:
        print(f"\n❌ 校验不通过（{len(problems)} 项）：")
        for p in problems[:20]:
            print("   ", p)
        if len(problems) > 20:
            print(f"    … 还有 {len(problems) - 20} 项")
        return 1

    print("\n✓ 校验全部通过")

    if args.check:
        return 0

    # 写盘：素材库/<套装ID>.yaml（平铺，纯编号）
    # ⚠ 文件名必须是**纯编号**（S0001.yaml），套装名只留在 YAML 内部字段里。
    out = args.out
    os.makedirs(out, exist_ok=True)

    # 目标目录不是默认的「素材/套装库」时**不清空**（如归档目录：清空会删掉
    # 用户自己补的文件）。只有默认目录才「先清后写」——
    # 否则旧结构（v1.8.00 的 `<ID_套装名>/套装.yaml` 子目录）与过期文件会残留。
    is_default_out = os.path.abspath(out) == os.path.abspath(os.path.join(ASSET, "套装库"))
    if is_default_out:
        for entry in os.listdir(out):
            p = os.path.join(out, entry)
            if os.path.isdir(p):
                shutil.rmtree(p)
            elif entry.endswith(".yaml"):
                os.remove(p)

    written = 0
    used = set()
    for name, data in merged.items():
        sid = (data.get("套装ID") or "").strip()
        if not sid:
            print(f"[警告] 套装「{name}」没有 ID，跳过")
            continue
        fname = f"{sid}.yaml"
        if fname in used:  # 理论上不会（ID 唯一），防一手
            print(f"[警告] 文件名冲突，跳过：{fname}")
            continue
        used.add(fname)
        setyaml.dump(data, os.path.join(out, fname))
        written += 1
    print(f"\n已写出 {written} 份 → {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
