# -*- coding: utf-8 -*-
"""
prep-easter.py —— 「彩蛋」文本入库

来源：
  素材/辉煌心光/彩蛋文本1.txt  —— 左对齐（段内保留换行）
  素材/辉煌心光/彩蛋文本2.txt  —— 居中（歌词 / 祈祷文）
  素材/主页/彩蛋文本3.txt      —— 左对齐（剧情吐槽，v1.3.05 新增）
  素材/主页/彩蛋文本1-补充.txt —— 左对齐（《奇迹之旅》/《番外》选段，v1.5.02 补，并入 file 1）
多头文本都用整行 `════════`（U+2550）包裹每一段：
    ════════
    正文……
    ════════
按「被分割线包裹的一段」切一个条目（用户口径）。

⚠ 彩蛋文本3 的条目**不参与打开弹窗时的随机**（用户要求：只能通过左右切换键
或页码跳转到达），所以同时导出一份 `EGG_RANDOM_POOL`（file != 3 的下标）。

产出：src/data/easterEgg.ts

用法：python tools/prep-easter.py
"""
import io
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from asset_paths import resolve  # noqa: E402

# 素材重构后目录名变了：
#   `辉煌心光/` → `素材/界面/辉煌心光/`、`主页/` → `素材/界面/主页/`
# 且源文件（彩蛋文本*.txt）留在 `原始素材/` 下，`素材/` 里只有工程产出
# 用 resolve() 逐个文件找，命中新结构就用新结构，否则回落原始素材
OUT = os.path.join(SIM, "src", "data", "easterEgg.ts")

FILES = [
    (1, os.path.join("辉煌心光", "彩蛋文本1.txt"), "left"),
    (2, os.path.join("辉煌心光", "彩蛋文本2.txt"), "center"),
    (3, os.path.join("主页", "彩蛋文本3.txt"), "left"),
    # 2026-11-03 用户补的 9 段（《奇迹之旅》/《番外》选段）：按「彩蛋文本1 的补充」处理 ——
    # 左对齐、进随机池（file 记 1，与正文同一条编号口径）
    (1, os.path.join("主页", "彩蛋文本1-补充.txt"), "left"),
]

SEP_CHARS = {"═", "="}


def is_sep(line: str) -> bool:
    t = line.strip()
    return bool(t) and set(t) <= SEP_CHARS


def parse(path: str):
    with io.open(path, encoding="utf-8") as f:
        raw = f.read().replace("\r\n", "\n").replace("\r", "\n")
    blocks, cur = [], []
    for ln in raw.split("\n"):
        if is_sep(ln):
            if cur:
                blocks.append("\n".join(cur).strip())
            cur = []
            continue
        cur.append(ln.rstrip())
    if cur:
        blocks.append("\n".join(cur).strip())
    return [b for b in blocks if b]


def main():
    entries = []
    for file_no, name, align in FILES:
        blocks = parse(resolve(name))
        print(f"== {name}  {len(blocks)} 条（{align}） ==")
        for b in blocks:
            lines = b.split("\n")
            title = next((l.strip() for l in lines if l.strip()), "")
            # 标题行太长时截断，只用于左右切换时的提示
            if len(title) > 18:
                title = title[:18] + "…"
            entries.append(
                {
                    "file": file_no,
                    "align": align,
                    "title": title,
                    "text": b,
                }
            )

    total = len(entries)
    # 打开弹窗时随机可选的池：彩蛋文本3（剧情吐槽）只在手动翻页/跳转时出现
    pool = [i for i, e in enumerate(entries) if e["file"] != 3]
    print(f"合计 {total} 条（随机池 {len(pool)} 条，file 3 共 {total - len(pool)} 条不可随机）")

    head = '''/**
 * 「彩蛋 / 碎碎念 / 发癫」条目（**自动生成，勿手改**）
 *
 * 由 `tools/prep-easter.py` 从下面几份文本切分而来：
 *   `素材/辉煌心光/彩蛋文本1.txt`   → 左对齐（吐槽 / 发癫）
 *   `素材/辉煌心光/彩蛋文本2.txt`   → 居中（歌词 / 祈祷文）
 *   `素材/主页/彩蛋文本3.txt`       → 左对齐（剧情吐槽）
 *   `素材/主页/彩蛋文本1-补充.txt`  → 左对齐（《奇迹之旅》/《番外》选段，并入 file 1）
 * 切分口径：整行 `════════` 包裹的一段 = 一个条目（用户定）。
 *
 * ⚠ 彩蛋文本3 的条目**不进随机池**：打开弹窗时只会从 `EGG_RANDOM_POOL` 里抽，
 *    要看到 file 3 只能左右切换或页码跳转（用户要求）。
 */

export interface EggEntry {
  /** 来源文件：1 = 彩蛋文本1（左对齐），2 = 彩蛋文本2（居中），3 = 彩蛋文本3（左对齐） */
  file: 1 | 2 | 3
  /** 段落对齐方式 */
  align: 'left' | 'center'
  /** 首行，左右切换时用作提示 */
  title: string
  /** 正文，保留换行（渲染用 white-space: pre-wrap） */
  text: string
}

export const EGG_ENTRIES: EggEntry[] = '''

    body = json.dumps(entries, ensure_ascii=False, indent=2)
    with io.open(OUT, "w", encoding="utf-8", newline="\n") as f:
        f.write(head + body + "\n")
        f.write(
            "\n/** 打开弹窗时随机可选的条目下标（不含彩蛋文本3） */\n"
            "export const EGG_RANDOM_POOL: number[] = "
            + json.dumps(pool, ensure_ascii=False)
            + "\n"
        )

    print(f"→ {os.path.relpath(OUT, ROOT)}")


if __name__ == "__main__":
    main()
