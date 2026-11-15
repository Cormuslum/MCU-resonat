# -*- coding: utf-8 -*-
"""
gen-asset-table.py —— 把「界面标注档案」的 5 套坐标表汇总成一份素材路径总表

输入：
  布局坐标/界面标注/<界面>/<界面>_素材路径.md   （图层总表 + 素材完整路径）
  tools/collect-assets.py                       （素材名 → 前端归集路径）
输出：
  界面素材路径总表.md（工作区根目录）

用法：python tools/gen-asset-table.py
"""
import os, re, glob

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
ANN = os.path.join(ROOT, "布局坐标", "界面标注")
OUT = os.path.join(ROOT, "界面素材路径总表.md")

# (目录名, 显示名, 对应 UMG, 当前实现的视图文件)
INTERFACES = [
    ("01-共鸣主界面", "01 共鸣主界面", "WBP_Resonance_Main_New + Tab / SuitInfo_V2", "src/views/BannerView.vue"),
    ("02-十连结果", "02 十连结果", "WBP_Resonance_RewarPanel_PC_V2 + RewardItem_PC_V2", "src/views/GachaView.vue（.result）"),
    ("03-部件详情", "03 部件详情（单抽展示）", "WBP_Reward_NewClothes（Cloth 分支）", "src/views/GachaView.vue（.detail）"),
    ("04-深海回响", "04 深海回响", "WBP_Resonance_Bouns_Main + Bonus_List / Bonus_Item", "src/components/EchoView.vue"),
    ("05-单抽-重复部件", "05 单抽·重复部件态", "WBP_Reward_NewClothes（重复分支）+ ExtraReward_Item", "src/views/GachaView.vue（.detail + .dt-extra）"),
]


def load_asset_map():
    """从 collect-assets.py 里抓 UI_ASSETS 的 (源路径, 输出路径) 对"""
    src = open(os.path.join(TOOL_ROOT, "tools", "collect-assets.py"), encoding="utf-8").read()
    pairs = re.findall(r'\(\s*f?"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*\d+\s*\)', src)
    m = {}
    for p, out in pairs:
        base = os.path.basename(p)
        m.setdefault(base, out)
        m.setdefault(os.path.splitext(base)[0], out)
    # 非 UI_ASSETS 表里的（特殊生成 / 手工补）
    m.update({
        "T_UI_common_btn_back_n.png": "ui/btn/back-n.webp",
        "T_UI_common_btn_back_h.png": "ui/btn/back-h.webp",
        "T_UI_common_btn_close_n.png": "ui/btn/close-n.webp",
        "T_UI_common_btn_close_h.png": "ui/btn/close-h.webp",
        "共鸣按钮-单次.png": "ui/btn/res-single.webp",
        "共鸣按钮-十连.png": "ui/btn/res-ten.webp",
        "T_UI_resonance_gacha_048_list_PNG.png": "banners/thumb/<listKey>.webp",
        "T_UI_resonance_gacha_001_name01.png": "banners/layers/<gachaKey>/gacha_NNN_name_01.webp",
    })
    return m


def parse_interface(folder):
    """解析一个界面的 md，返回图层行列表"""
    fs = glob.glob(os.path.join(ANN, folder, "*素材路径.md"))
    if not fs:
        return [], ""
    txt = open(fs[0], encoding="utf-8").read()

    # 限定在「图层总表」段内
    def section(start_kw, end_kw):
        i = txt.find(start_kw)
        if i < 0:
            return ""
        j = txt.find(end_kw, i + len(start_kw))
        return txt[i:j if j > 0 else len(txt)]

    lay = section("## 二、图层总表", "## 三、")
    path = section("## 三、素材完整路径", "## 四、")

    # 素材完整路径：L## → 相对路径
    rel = {}
    for line in path.splitlines():
        m = re.match(r"^\|\s*(L\d+)\s*\|\s*`([^`]+)`\s*\|\s*`([^`]*)`", line)
        if m:
            rel[m.group(1)] = m.group(3).strip()

    rows = []
    for line in lay.splitlines():
        if not re.match(r"^\|\s*L\d+\s*\|", line):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 10:
            continue
        rows.append({
            "id": cells[0],
            "cat": cells[1],
            "desc": cells[2],
            "file": cells[3].strip("`"),
            "orig": cells[4],
            "xy": cells[5],
            "wh": cells[6],
            "src": cells[9] if len(cells) > 9 else "",
            "rel": rel.get(cells[0], ""),
        })
    return rows, fs[0]


def main():
    amap = load_asset_map()
    all_rows = {}
    for folder, _, _, _ in INTERFACES:
        rows, _ = parse_interface(folder)
        all_rows[folder] = rows

    total = sum(len(v) for v in all_rows.values())
    used = set()

    lines = []
    lines.append("# 界面素材路径总表")
    lines.append("")
    lines.append("> 由 `tools/gen-asset-table.py` 从 `布局坐标/界面标注/` 的 5 套坐标表汇总生成，改完标注重跑即可刷新。")
    lines.append(">")
    lines.append("> **坐标系**：1920×1080 设计基准，`画布 x,y` 为左上角绝对像素。")
    lines.append("> 项目自 v0.8.0 起把所有界面钉在这个坐标系里（`App.vue` 外层只做一次 `scale`），")
    lines.append("> 所以表里的 px 可以直接写进 CSS。")
    lines.append(">")
    lines.append("> **前端路径**列以 `public/assets/` 为根，`—` 表示该层是材质/文字渲染，没有独立贴图。")
    lines.append("")
    lines.append("---")
    lines.append("")

    # 速览
    lines.append("## 一、速览")
    lines.append("")
    lines.append("| 界面 | 图层数 | 有独立贴图 | 已归集 | 未归集 | 对应 UMG |")
    lines.append("|---|---|---|---|---|---|")
    tot_tex = tot_ok = tot_miss = 0
    for folder, name, umg, view in INTERFACES:
        rows = all_rows[folder]
        with_tex = [r for r in rows if r["file"] and not r["file"].startswith("（")]
        mapped = [r for r in with_tex if amap.get(r["file"])]
        miss = len(with_tex) - len(mapped)
        for r in mapped:
            used.add(amap[r["file"]])
        tot_tex += len(with_tex); tot_ok += len(mapped); tot_miss += miss
        lines.append(f"| {name} | {len(rows)} | {len(with_tex)} | {len(mapped)} | {miss} | `{umg}` |")
    lines.append(f"| **合计** | **{total}** | **{tot_tex}** | **{tot_ok}** | **{tot_miss}** | |")
    lines.append("")
    lines.append("---")
    lines.append("")

    # 分界面详表
    sec = 1
    for folder, name, umg, view in INTERFACES:
        rows = all_rows[folder]
        lines.append(f"## 二.{sec} {name}")
        lines.append("")
        lines.append(f"> UMG：`{umg}`　｜　实现：`{view}`")
        lines.append("")
        lines.append("| 图层 | 分类 | 素材说明 | 素材文件 | 原始相对路径 | 前端路径 | 画布 x,y | 画布 w×h | 来源 |")
        lines.append("|---|---|---|---|---|---|---|---|---|")
        for r in rows:
            f = r["file"] or "—"
            orig = r["rel"] or "—"
            is_mat = (not f) or f.startswith("（")
            out = amap.get(f) if not is_mat else None
            if is_mat:
                out_s = "—（材质/文字）"
            elif out and "<" in out:
                out_s = f"`{out}`（按池生成）"
            elif out:
                out_s = f"`{out}`"
            else:
                out_s = "⚠ 未归集"
            f_s = f if is_mat else f"`{f}`"
            o_s = orig if orig == "—" else f"`{orig}`"
            lines.append(
                f"| {r['id']} | {r['cat']} | {r['desc']} | {f_s} "
                f"| {o_s} | {out_s} | {r['xy']} | {r['wh']} | {r['src']} |"
            )
        lines.append("")
        sec += 1

    lines.append("---")
    lines.append("")

    # 前端索引
    lines.append("## 三、前端素材索引（按归集路径排序）")
    lines.append("")
    lines.append("| 前端路径 | 出现的界面 |")
    lines.append("|---|---|")
    idx = {}
    for folder, name, _, _ in INTERFACES:
        short = name.split(" ")[0]          # 01 / 02 / …
        for r in all_rows[folder]:
            out = amap.get(r["file"]) if r["file"] and not r["file"].startswith("（") else None
            if out:
                idx.setdefault(out, set()).add(f"{short}·{r['id']}")
    for out in sorted(idx):
        where = "、".join(sorted(idx[out]))
        lines.append(f"| `{out}` | {where} |")
    lines.append("")
    lines.append(f"> 共 **{len(idx)}** 个独立前端素材被这 5 个界面引用。")
    lines.append("")

    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"写入 {OUT}")
    print(f"  5 个界面 / {total} 层 / {len(idx)} 个前端素材")


if __name__ == "__main__":
    main()
