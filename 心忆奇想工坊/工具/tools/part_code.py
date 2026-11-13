# -*- coding: utf-8 -*-
"""
部位代号 —— 中文部位名 ↔ 官方两字母代号。

## 权威来源

`素材/信息表/部位代号对照表.csv`（用户维护，唯一真源）。
**不要在代码里再抄一份映射表** —— 新增部位时只改 CSV，不用碰代码。


v1.9.02 起套装素材改成「代号命名」：

```
sets/<套装ID>/cards/HA-S0438.webp      ← 发型（Hair）
sets/<套装ID>/icons/DR-S0438.webp      ← 连衣裙（Dress）
sets/<套装ID>/OV-lv0.webp              ← 整体造型（Overall）初始形态
```

好处是**跨语言无歧义**（原文件名是中文「发型-愿景回旋」），且部位一眼可数。

## 整体（OV）阶段

对照表里 `整体·X` 各自有代号 `OV-lv0..lv4`：

| 中文阶段 | 代号 | 说明 |
|---|---|---|
| 整体·初始 | OV-lv0 | 初始形态 |
| 整体·焕新 | OV-lv1 | 焕新形态 |
| 整体·一进 | OV-lv2 | 一进形态（**5★**） |
| 整体·进化 | OV-lv2 | 进化形态（**4★**，与一进同槽位） |
| 整体·二进 | OV-lv3 | 二进形态（5★） |
| 整体·满进 | OV-lv4 | 满进形态（5★） |

⚠️ 4★ 只有「初始/焕新/进化」三段，5★ 是「初始/焕新/一进/二进/满进」五段 ——
   两者的第 3 段都落在 `OV-lv2`，所以映射是**多对一**，不能反向唯一还原。

## 用法

```python
from part_code import code_of, strip_part, OV_CODE_OF_FILE

code_of("饰品·发饰")            # → "HP"（查不到返回 None）
strip_part("饰品·发饰-飘曳星辉")  # → ("饰品·发饰", "飘曳星辉")
OV_CODE_OF_FILE["整体-焕新.png"] # → "OV-lv1"
```
"""

import csv
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
CSV_PATH = os.path.join(ROOT, "素材", "信息表", "部位代号对照表.csv")

# 整体阶段的文件名 → 代号。文件名来自 `进化等阶/整体-XXX.png`
# 4★ 的「进化」与 5★ 的「一进」同槽（都是 lv2），见模块 docstring
OV_CODE_OF_FILE = {
    "整体-初始.png": "OV-lv0",
    "整体-焕新.png": "OV-lv1",
    "整体-一进.png": "OV-lv2",
    "整体-进化.png": "OV-lv2",
    "整体-二进.png": "OV-lv3",
    "整体-满进.png": "OV-lv4",
}

# 代号 → 中文阶段名（写 manifest 的 stage 字段用）
OV_STAGE_NAME = {
    "OV-lv0": "初始",
    "OV-lv1": "焕新",
    "OV-lv2": "一进",
    "OV-lv3": "二进",
    "OV-lv4": "满进",
}

_cache = None


def _load():
    """读对照表 → {中文部位名: 代号}。找不到文件时退化成空表（调用方自行兜底）。"""
    global _cache
    if _cache is not None:
        return _cache
    table = {}
    if os.path.isfile(CSV_PATH):
        # utf-8-sig：用户用 Excel 存的 CSV 带 BOM
        with open(CSV_PATH, encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                part = (row.get("部位") or "").strip()
                code = (row.get("代号") or "").strip()
                if part and code:
                    table[part] = code
    _cache = table
    return table


def code_of(part):
    """中文部位名 → 代号。查不到返回 None。"""
    return _load().get(str(part).strip())


def strip_part(basename):
    """`饰品·发饰-飘曳星辉.png` → ("饰品·发饰", "飘曳星辉")。

    用**第一个** `-` 切分：部位名里不含 `-`，但部件名可能有
    （如「雪境长歌-旧梦」这类带后缀的写法）。
    """
    b = os.path.splitext(os.path.basename(basename))[0]
    if "-" not in b:
        return "", b
    part, name = b.split("-", 1)
    return part.strip(), name.strip()


def ov_code(filename):
    """`整体-焕新.png` → `OV-lv1`；不是整体图返回 None。"""
    return OV_CODE_OF_FILE.get(os.path.basename(filename))


def ov_stage_raw(filename):
    """`整体-进化.png` → `进化`（保留素材里的**原始阶段名**）。

    为什么不用 OV_STAGE_NAME 反查：4★ 的第 3 段素材叫「进化」，5★ 叫「一进」，
    两者都映射到 OV-lv2 —— 反查只能得到一个名字，会让 4★ 的形态卡
    错显示成「一进」。前端的 FORM_ORDER 两个名字都认，所以直传原始名最准。
    """
    b = os.path.splitext(os.path.basename(filename))[0]
    if not b.startswith("整体-"):
        return ""
    return b[len("整体-"):]


def stage_name(code):
    """`OV-lv2` → `一进`。"""
    return OV_STAGE_NAME.get(code, code or "")


def stage_order(code):
    """OV 代号 → 数值序号（排序用）。"""
    try:
        return int(str(code).split("lv")[-1])
    except (ValueError, IndexError):
        return 99
