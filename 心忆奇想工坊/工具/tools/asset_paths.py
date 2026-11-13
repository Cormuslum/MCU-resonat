# -*- coding: utf-8 -*-
"""
素材路径解析 —— 新旧结构通吃的单一入口。

## 为什么需要它

v1.9.00 把 `素材/` 从「按来源分」重组成「按实体分」，旧目录名全部消失：

| 旧名 | 新名 |
|---|---|
| `source/` | `服装阁/` |
| `图片素材/` | `套装卡片图/` |
| `套装故事/` | `故事/` |
| `部分UI及道具图片/` | `界面/通用UI/` |
| `卡池背景图/`、`卡池背景图（纯图片，无艺术字）/`、`卡池界面缩略图/` | `卡池背景/` |
| `卡池音频/`、`音频素材/` | `音频/` |
| `视频素材/` | `视频/` |
| `字体库/` | `字体/` |
| `所有卡池通用三星散件/` | `通用散件/` |
| `主页/` | `界面/主页/` |
| `博物图鉴/` | `界面/博物图鉴/` |
| `玄学运势/` | `界面/玄学运势/` |
| `辉煌心光/` | `界面/辉煌心光/` |
| `深海回响奖励/` | `界面/深海回响/` |
| `0主素材/` | `界面/UI整包/` |
| `抽卡奖励界面/`、`抽卡道具/`、`游戏内实机展示/` | `界面/抽卡演出/` |
| `朋友分享素材/` | `界面/UI整包/` |

同时 `prep-*` 这类**一次性预处理脚本**读的源文件（辉煌心光的 1-演出.png、
主页的彩蛋文本*.txt 等）在重构时只搬了「工程产出」，源文件留在 `原始素材/`。

## 用法

```python
from asset_paths import ASSET, RAW, resolve, resolve_file, find_any

p = resolve("辉煌心光")            # → 素材/界面/辉煌心光（不存在则回落 原始素材/辉煌心光）
p = resolve("UI/Common/Textures") # → 素材/界面/UI整包/UI/Common/Textures
f = resolve_file("辉煌心光", "1-演出.png")   # 单个文件，跨三处找
```

**回落顺序**：`素材/<新名>` → `素材/<旧名>` → `原始素材/<旧名>` → `原始素材/<新名>`。
先查 `素材/` 是因为那是管线真正读的地方；`原始素材/` 是只读源头档案。
"""

import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
ASSET = os.path.join(ROOT, "素材")
RAW = os.path.join(ROOT, "原始素材")

# 旧目录名 → 新目录名
OLD2NEW = {
    "source": "服装阁",
    "图片素材": "套装卡片图",
    "套装故事": "故事",
    "部分UI及道具图片": "界面/通用UI",
    "卡池背景图": "卡池背景",
    "卡池背景图（纯图片，无艺术字）": "卡池背景",
    "卡池界面缩略图": "卡池背景",
    "卡池音频": "音频",
    "音频素材": "音频",
    "视频素材": "视频",
    "字体库": "字体",
    "所有卡池通用三星散件": "通用散件",
    "主页": "界面/主页",
    "博物图鉴": "界面/博物图鉴",
    "玄学运势": "界面/玄学运势",
    "辉煌心光": "界面/辉煌心光",
    "深海回响奖励": "界面/深海回响",
    "0主素材": "界面/UI整包",
    "朋友分享素材": "界面/UI整包",
    "抽卡奖励界面": "界面/抽卡演出",
    "抽卡道具": "界面/抽卡演出",
    "游戏内实机展示": "界面/抽卡演出",
    "版本名": "界面/通用UI",
    # `UI/...` 是 `0主素材/UI/...` 的简写（脚本里常这么写）
    "UI": "界面/UI整包/UI",
}

# 新结构 → 旧结构（回落用）。
# 例：`素材/界面/博物图鉴/...` 在 `原始素材/` 里的对应位置是 `原始素材/博物图鉴/...`。
NEW2OLD = {
    "界面/博物图鉴": "博物图鉴",
    "界面/主页": "主页",
    "界面/玄学运势": "玄学运势",
    "界面/辉煌心光": "辉煌心光",
    "界面/深海回响": "深海回响奖励",
    "界面/抽卡演出": "抽卡奖励界面",
    "界面/通用UI": "部分UI及道具图片",
    "界面/UI整包": "0主素材",
    "界面/UI整包/UI": "0主素材/UI",
}


def _candidates(rel):
    """给定素材内相对路径，产出所有候选绝对路径（按优先级）。

    相对路径可以是多段的。目录重命名只发生在顶层，但用户也可能直接写新结构
    （如 `界面/博物图鉴/...`），所以这里对**每一段前缀**都试一次映射，
    命中的候选排在前面。
    """
    rel = str(rel).replace("\\", "/").strip("/")
    if not rel:
        return [ASSET]

    segs = rel.split("/")
    # 找出最长可映射的前缀：OLD2NEW 只登记顶层单段名
    new_head = None
    for i in range(len(segs) - 1, 0, -1):
        head = "/".join(segs[:i])
        if head in OLD2NEW:
            new_head = OLD2NEW[head]
            segs = [new_head] + segs[i:]
            break
    else:
        if segs[0] in OLD2NEW:
            new_head = OLD2NEW[segs[0]]
            segs = [new_head] + segs[1:]

    rest = "/".join(segs[1:])
    top = segs[0]

    # 新结构 → 旧结构（`原始素材/` 回落用）
    old_head = None
    for i in range(len(segs) - 1, 0, -1):
        head = "/".join(segs[:i])
        if head in NEW2OLD:
            old_head = NEW2OLD[head]
            old_segs = [old_head] + segs[i:]
            break
    else:
        old_segs = None

    out = []
    # 1) 素材/ + 新名
    if new_head:
        out.append(os.path.join(ASSET, *segs))
    # 2) 素材/ + 原名（用户可能还没搬）
    out.append(os.path.join(ASSET, top, rest) if rest else os.path.join(ASSET, top))
    # 3) 原始素材/ + 原名（源文件大多留在这里）
    if old_segs:
        out.append(os.path.join(RAW, *old_segs))
    else:
        out.append(os.path.join(RAW, top, rest) if rest else os.path.join(RAW, top))
    # 4) 原始素材/ + 新名
    if new_head:
        out.append(os.path.join(RAW, *segs))
    return out


def resolve(rel):
    """解析素材内相对路径 → 第一个真实存在的绝对路径。

    都不存在时返回**优先级最高**的候选（素材/新名），让报错信息指向正确位置。
    """
    cands = _candidates(rel)
    for c in cands:
        if os.path.exists(c):
            return c
    return cands[0]


def resolve_file(*parts):
    """解析单个文件（多段拼接），语义同 resolve()。"""
    return resolve(os.path.join(*parts))


def find_any(*rels):
    """在多个候选里挑第一个存在的文件。用于「同一素材可能在多处」的场合。"""
    for r in rels:
        p = resolve(r)
        if os.path.isfile(p):
            return p
    return resolve(rels[0]) if rels else ASSET
