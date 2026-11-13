# -*- coding: utf-8 -*-
"""生成 src/data/readings.ts（阅读物图鉴数据，供 M3 子界面使用）。

扫描：
  素材/阅读物/{心愿原野,伊赞之土}/{系列}/*.txt

每个文件结构（举例）：
  第 1 行：书名（如 《关于尾巴的烦恼》）
  随后若干元数据行：【图鉴分区】心愿原野 / 【编号】read_L_book_010203011 / 【类型】书籍
  空行后：正文

输出 ReadingEntry[]：
  - id      = 【编号】原值（read_L_book_010203011），全局唯一
  - region  = 由【图鉴分区】映射：心愿原野→wish，伊赞之土→yizan（兜底用父目录名）
  - series  = 系列子目录名（如 埋骨地）
  - title   = 书名（去首尾空白，保留《》）；同名且正文确实不同时追加 ·01 / ·02
  - text    = 正文（元数据块之后、空行之后全部内容，保留换行）

排序：按 id 正序（id 结构 region(4)+series(2)+book(3) 自带区域/系列/编号序）。
标题消歧见 tools/title_suffix.py：内容比对确认「真的不同」才编号，完全相同的重复件保持原名。
"""
import os
import re
import json
import glob
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from title_suffix import disambiguate_rows, print_report  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
# 数据根：发行版由 NIKKI_DATA_DIR 指到工坊下的 data/（模拟器目录保持纯静态）
_data = os.environ.get('NIKKI_DATA_DIR')
ASSET = os.path.abspath(_data) if _data else os.path.join(ROOT, '素材')
READING_ROOT = os.path.join(ASSET, '阅读物')
# 成品根：public/assets（发行版由 NIKKI_OUT_DIR 指到模拟器目录）
pub = os.environ.get('NIKKI_OUT_DIR') or os.path.join(SIM, 'public', 'assets')
OUT_PATH = os.path.join(pub, 'data', 'readings.json')

# ：**基线模式**（发行版）
#
# 发行版不再随包发 `素材/阅读物/`（2.6M 的内置正文）
# 阅读物的主数据源变成 `readings.json` 本身，`素材/阅读物/` 只当**增量补丁**：
#
# 开关用环境变量而不是「目录在不在」判断：
#   - 开发版不设 → 纯源模式（`素材/阅读物/` 是唯一真源，删一本就是删一本）
#   - 发行版设 1 → 基线模式（JSON 是主数据源，源目录只放增量）
BASELINE_MODE = os.environ.get('NIKKI_JSON_BASELINE') == '1'

# 悄悄丢掉全部阅读物（踩过这个坑）
if not BASELINE_MODE and not os.path.isdir(READING_ROOT):
    raise SystemExit(f'✗ 找不到阅读物源目录：{READING_ROOT}')

REGION_MAP = {'心愿原野': 'wish', '伊赞之土': 'yizan'}
# 分区目录本身不是「系列」
REGION_DIRS = set(REGION_MAP)


def parse_file(path: str) -> dict | None:
    try:
        with open(path, 'r', encoding='utf-8') as f:
            raw = f.read()
    except Exception:
        return None
    # 统一换行
    lines = raw.replace('\r\n', '\n').split('\n')

    # 区域由顶层目录决定（心愿原野 / 伊赞之土），100% 可靠
    parts = os.path.normpath(path).split(os.sep)
    region_dir = parts[-3] if len(parts) >= 3 else ''
    region = REGION_MAP.get(region_dir, None)

    # 跳过开头空行找标题
    idx = 0
    while idx < len(lines) and not lines[idx].strip():
        idx += 1
    if idx >= len(lines):
        return None
    title = lines[idx].strip()
    idx += 1

    rid = None
    # 跳过标题后的空行，再读【...】元数据块（可能为空），随后空行即正文起点
    while idx < len(lines) and not lines[idx].strip():
        idx += 1
    while idx < len(lines):
        line = lines[idx]
        if not line.strip():
            # 空行：元数据块结束，正文从这里之后开始
            idx += 1
            break
        m = re.match(r'^【(图鉴分区|编号|类型)】(.*)$', line.strip())
        if m:
            key, val = m.group(1), m.group(2).strip()
            if key == '编号':
                rid = val
            elif key == '图鉴分区' and not region:
                region = REGION_MAP.get(val, val)
            idx += 1
        else:
            # 遇到非元数据非空行 → 元数据块已结束，此行即正文起点
            break

    # 正文：从当前 idx 起，去掉首尾空行
    body_lines = lines[idx:]
    while body_lines and not body_lines[0].strip():
        body_lines.pop(0)
    while body_lines and not body_lines[-1].strip():
        body_lines.pop()
    text = '\n'.join(body_lines).strip()

    if not rid:
        # 兜底：用「目录+文件名」拼一个稳定且唯一的 id
        rid = f"{region or 'wish'}/{os.path.basename(os.path.dirname(path))}/{os.path.splitext(os.path.basename(path))[0]}"

    # series = 父目录名（起允许直接放在分区根下，此时没有系列）
    parent = os.path.basename(os.path.dirname(path))
    series = '' if parent in REGION_DIRS else parent

    return {
        'id': rid,
        'region': region or 'wish',
        'series': series,
        'title': title,
        'text': text,
    }


def load_baseline() -> list:
    """读现有 readings.json 作基线（发行版：JSON 才是阅读物的主数据源）。

    读不到 / 格式不对时按空基线处理 —— 宁可退化成「只剩源目录里的」，
    也不要因为一个坏 JSON 把整个图鉴清空。
    """
    if not os.path.exists(OUT_PATH):
        return []
    try:
        with open(OUT_PATH, encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:  # noqa: BLE001
        print(f'  [基线] 读取 {OUT_PATH} 失败（{type(e).__name__}: {e}），按空基线处理')
        return []
    if not isinstance(data, list):
        print(f'  [基线] {OUT_PATH} 不是数组，按空基线处理')
        return []
    return [r for r in data if isinstance(r, dict) and r.get('id')]


def main() -> None:
    entries = []
    # ：工坊不再收「系列」，新文件直接落在分区根下（`<分区>/<书名>.txt`）
    # 老的 `<分区>/<系列>/<书名>.txt` 仍要认，两种层级一起扫
    for pat in ('*/*.txt', '*/*/*.txt'):
        for p in sorted(glob.glob(os.path.join(READING_ROOT, pat))):
            e = parse_file(p)
            if e:
                entries.append(e)
    n_src = len(entries)
    # 去重（同名同 id 保护），按 id 正序
    seen = set()
    uniq = []
    for e in entries:
        if e['id'] in seen:
            continue
        seen.add(e['id'])
        uniq.append(e)

    # 基线模式：把源目录当**增量补丁**，不是全集
    #   源里有同 id 的 → 用源的（用户改过/新建的）
    #   基线里有源没有的 → 保留（内置阅读物不受影响）
    # 源目录为空或不存在 → 结果就是基线本身，一条都不丢
    base = load_baseline() if BASELINE_MODE else []
    if base:
        merged = {r['id']: dict(r) for r in base}
        collided = []
        for e in uniq:
            old = merged.get(e['id'])
            if old is not None and (old.get('title') or '').strip() != (e.get('title') or '').strip():
                collided.append((e['id'], old.get('title'), e.get('title')))
                continue
            merged[e['id']] = e          # 源覆盖基线
        uniq = list(merged.values())
        print(f'  [基线] 合并 {len(base)} 条内置 + {n_src} 个源文件 → {len(uniq)} 条')
        for rid, old_t, new_t in collided[:10]:
            print(f'  ! 编号冲突 {rid}：内置《{old_t}》与新增《{new_t}》同号，'
                  f'已保留内置那条（新增的没进去）')
    elif BASELINE_MODE:
        print('  [基线] 无基线 JSON（首次生成），本次完全由源目录决定')
    uniq.sort(key=lambda x: x['id'])

    # 同名不同正文 → 标题加 ·01 / ·02
    # 比对用归一化哈希 + TF-IDF 余弦 + 行级/字符级相似度，只有确实不同才编号
    # 完全相同的重复件（或只差一两个错别字的近似重复）保持原名
    uniq, suffix_report = disambiguate_rows(uniq, label='阅读物')
    print_report(suffix_report, '阅读物')

    rows = ',\n'.join(
        '  ' + '{ '
        + ', '.join(
            [
                f'id: {e["id"]!r}',
                f'region: {e["region"]!r}',
                f'series: {e["series"]!r}',
                f'title: {e["title"]!r}',
                f'text: {e["text"]!r}',
            ]
        )
        + ' }'
        for e in uniq
    )
    ts = (
        '// AUTO-GENERATED by tools/gen-readings.py — do not edit by hand.\n'
        '// 阅读物图鉴数据：扫描 素材/阅读物/{心愿原野,伊赞之土}/[系列/]*.txt。\n'
        'export interface ReadingEntry {\n'
        "  id: string        // 【编号】原值（全局唯一）\n"
        "  region: 'wish' | 'yizan'\n"
        "  series: string    // 系列子目录名\n"
        "  title: string     // 书名（含《》）\n"
        "  text: string      // 正文\n"
        '}\n\n'
        f'export const readings: ReadingEntry[] = [\n{rows}\n]\n'
    )
    # ：输出改成运行时 JSON（`public/assets/data/readings.json`）
    # 工坊改完阅读物永远不会生效
    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(uniq, f, ensure_ascii=False, separators=(',', ':'))

    by_region = {}
    for e in uniq:
        by_region[e['region']] = by_region.get(e['region'], 0) + 1
    print(f'readings={len(uniq)} by_region={by_region} -> {OUT_PATH}')


if __name__ == '__main__':
    main()
