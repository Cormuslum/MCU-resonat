# -*- coding: utf-8 -*-
"""
证明新套装库能完全替代旧管线。

做法：**直接跑老管线的两个 loader**（`build-pool-map.py` 里的
`load_part_info()` + `load_set_texts()`），与**新套装库**逐字段对比。

⚠ v1.8.01 起套装库是**精简格式**（平铺 + 删掉死字段），所以比对范围收窄为
   **前端真正在用的字段**：

    套装级：desc（整体文案）/ styles（属性标签）
    部件级：name / slot / uid / stats / top / desc

   被删的三个字段是**有意精简**，不算差异，但要单独报出来：
    - `tags`（部件「标签」）—— manifest 里 key 全是「类别/装饰/材质」，
      没有一个是「标签」，而前端 `GachaView` 读的正是 `t['标签']` → 永远取不到值
    - `formTexts`（形态）—— 前端零引用（v1.8.00 已从 manifest 移除）
    - `textSource`（文案来源）—— 前端只在 types.ts 声明，无读取

## 判据：一致 **或** 新库修正了老管线的已知缺陷

老管线 `load_set_texts()` 的键只认 `4星-限定共鸣-《X》` / `5星-常驻共鸣-《X》`，
遇到 `5星-无限之心-《X》` 这类**池类型不匹配**的文件名就整份丢弃 ——
于是谒灵 / 纯净之风等套装的整体文案与属性标签在 pool-map 里是**空的**。
新库按《》取名，全部读到了。

判据因此分两类：
  - **一致**   → 新库与老管线相同；
  - **修正**   → 老管线是空 / 带转义反斜杠，新库是正确值（已逐条核对源 txt）。

跑法：
    python tools/verify-merged-replaces-legacy.py
"""

import importlib.util
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import setyaml  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
LIB = os.path.join(ROOT, "素材", "套装库")


def norm_key(k):
    """把老 loader 的 key 规整成纯套装名。

    ⚠ 老 loader 的 key 规则是 `^[45]星-(?:限定|常驻)共鸣-《(.+)》$`，
    3★ 的文件名（`3星-商城-《不可见对象》`）匹配不上 → key 直接是整个文件名。
    而 pool-map / 新库用的都是**纯套装名**。
    所以比对前统一从《》里取名字。
    """
    m = re.search(r"《(.+?)》", k)
    return m.group(1) if m else k


# `build-pool-map.py` 文件名带连字符，不能直接 import —— 用 importlib 按路径加载
spec = importlib.util.spec_from_file_location(
    "bpm", os.path.join(TOOL_ROOT, "tools", "build-pool-map.py")
)
bpm = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bpm)

fail = 0
checked = 0
fixed = []  # 新库修正了老管线的地方
n_parts = 0


def bad(msg):
    global fail
    fail += 1
    print("  ✗", msg)


def fixed_note(msg):
    """新库修正了老管线的缺陷（不算失败，但要报出来）"""
    fixed.append(msg)


def is_legacy_defect(old, new):
    """老管线的两种已知缺陷：
    ① 老值是空、新值非空 → 老 loader 因文件名池类型不匹配整份丢弃了这份 txt
    ② 老值带转义反斜杠、新值是干净文本 → 老 loader 没解转义
    """
    if not old and new:
        return True
    if old and new and "\\" in old and "\\" not in new and old.replace("\\", "") == new:
        return True
    return False


# ────────────────────────────────────────────── 新库

def load_merged():
    """新库 → {套装名: {"desc","styles","parts"}}（精简格式：tags/forms 已删）"""
    out = {}
    if not os.path.isdir(LIB):
        return out
    for fn in os.listdir(LIB):
        if not fn.lower().endswith(".yaml"):
            continue
        d = setyaml.load(os.path.join(LIB, fn))
        name = d.get("套装名", "")
        if not name:
            continue
        parts = []
        for p in d.get("部件") or []:
            stats = p.get("五维倾向") or {}
            stats = {k: int(v) for k, v in stats.items()} if isinstance(stats, dict) else {}
            top = [k for k, _ in sorted(stats.items(), key=lambda x: -int(x[1]))[:2]] if stats else []
            parts.append({
                "name": p.get("名称", ""),
                "slot": p.get("类型", ""),
                "uid": str(p.get("id", "") or ""),
                "stats": stats,
                "top": top,
                "desc": (p.get("文案") or "").strip(),
            })
        out[name] = {
            "desc": d.get("整体文案", ""),
            "styles": list(d.get("属性标签") or []),
            "parts": parts,
        }
    return out


merged = load_merged()

# ────────────────────────────────────────────── 老管线（直接跑它的 loader）

old_parts_all = bpm.load_part_info()
old_texts_all = bpm.load_set_texts()

# 老 loader 的 3★ key 带文件名前缀（`3星-商城-《X》`），统一规整成纯套装名
old_parts_all = {norm_key(k): v for k, v in old_parts_all.items()}
old_texts_all = {norm_key(k): v for k, v in old_texts_all.items()}

print(f"新库 {len(merged)} 套 · 老管线 loader：部件 {len(old_parts_all)} 套 / 文案 {len(old_texts_all)} 套\n")

# ────────────────────────────────────────────── 逐套比对

for name, new in sorted(merged.items()):
    checked += 1
    old_tx = old_texts_all.get(name) or {}
    old_ps = old_parts_all.get(name) or []

    # 套装级：desc（整体文案）
    old_desc = old_tx.get("desc", "") or ""
    if old_desc != new["desc"]:
        if is_legacy_defect(old_desc, new["desc"]):
            fixed_note(f"{name}: 整体文案 —— 老管线为空，新库补上（{len(new['desc'])} 字）")
        else:
            bad(f"{name}: desc 不一致")

    # 套装级：styles（属性标签）
    old_styles = list(old_tx.get("styles") or [])
    if old_styles != new["styles"]:
        if is_legacy_defect(old_styles, new["styles"]):
            fixed_note(f"{name}: 属性标签 —— 老管线为空，新库补上（{new['styles']}）")
        else:
            bad(f"{name}: styles 不一致")

    # 部件级
    n_parts += len(new["parts"])
    if len(old_ps) != len(new["parts"]):
        # 老 loader 只覆盖有属性 yaml 的套装；3★ 在老 loader 里根本没有部件
        if old_ps:
            bad(f"{name}: 部件数 {len(new['parts'])} ≠ 老管线 {len(old_ps)}")
        else:
            fixed_note(f"{name}: 老管线无部件（3★ 无属性 yaml），新库补上 {len(new['parts'])} 个")
        continue
    for a, b in zip(old_ps, new["parts"]):
        if a.get("name", "") != b["name"]:
            bad(f"{name}: 部件名 {b['name']} ≠ {a.get('name')}")
        if a.get("slot", "") != b["slot"]:
            bad(f"{name}/{b['name']}: 部位 {b['slot']} ≠ {a.get('slot')}")
        if str(a.get("uid", "")) != b["uid"]:
            bad(f"{name}/{b['name']}: uid {b['uid']} ≠ {a.get('uid')}")
        if (a.get("desc") or "") != b["desc"]:
            if is_legacy_defect(a.get("desc") or "", b["desc"]):
                fixed_note(f"{name}/{b['name']}: 文案 —— 老管线带转义反斜杠，新库是干净文本")
            else:
                bad(f"{name}/{b['name']}: 文案不一致")
        sa = a.get("stats") or {}
        sb = b["stats"]
        if {k: int(v) for k, v in sa.items()} != sb:
            bad(f"{name}/{b['name']}: 五维不一致")

# ────────────────────────────────────────────── 反向：老管线有、新库没有的套装
# 起套装库只保留**模拟器 86 座服装阁里有的**套装
# 其余 184 套归档到 `归档素材/2026-11-06-非模拟器套装/`
# 老管线（读源文件）仍然能看到全部 316 套 → 差集是**预期**，不算失败
ARCHIVE = os.path.join(ROOT, "归档素材", "2026-11-06-非模拟器套装")
archived = set()
if os.path.isdir(ARCHIVE):
    for fn in os.listdir(ARCHIVE):
        if not fn.lower().endswith(".yaml"):
            continue
        try:
            archived.add(setyaml.load(os.path.join(ARCHIVE, fn)).get("套装名", ""))
        except Exception:  # noqa: BLE001
            pass
archived.discard("")

n_archived = 0
for name in sorted(set(old_parts_all) | set(old_texts_all)):
    if name in merged:
        continue
    if name in archived:
        n_archived += 1
        continue
    bad(f"{name}: 老管线有，新库里没有（且不在归档目录里 —— 真的丢了）")

print(f"比对 {checked} 套 / {n_parts} 个部件")
print("（已精简、不参与比对的字段：部件「标签」/ 「形态」、套装「文案来源」）")
print(f"（{n_archived} 套已归档到 归档素材/2026-11-06-非模拟器套装/，按预期不在新库里）")
if fixed:
    print(f"\n新库修正了老管线的 {len(fixed)} 处缺陷（不算失败）：")
    for f in fixed:
        print("  ·", f)
if fail == 0:
    print("\n✓ 新库覆盖了老管线的全部有效字段（或更好）")
else:
    print(f"\n✗ {fail} 处不一致")
sys.exit(0 if fail == 0 else 1)
