# -*- coding: utf-8 -*-
"""扫描 素材/故事/*.md → src/data/stories.ts

规则：
- 文件名 `故事-{星级}-{套装名}.md`，星级取「4星/5星」，套装名取最后一段
- 正文 = 去掉开头 `# 标题` 与紧随的 `---` 分隔线后的全部内容
- 排序：按 `set.id`（S0001…）数字正序；匹配不到套装的排最后（按名）
- 同时写入 set.star / setName，供故事图鉴「按套装编号正序」展示与解锁判断
- 同名但正文确实不同的故事，标题加 `·01 / ·02`（见 tools/title_suffix.py）
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from title_suffix import disambiguate_rows, print_report  # noqa: E402

def _env_dir(name, default):
    """目录可被环境变量覆盖（发行版：数据在工坊目录、成品在模拟器目录）。"""
    v = os.environ.get(name)
    return os.path.abspath(v) if v else default


ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：无限暖暖模拟器（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "无限暖暖模拟器")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
# 数据根：信息表 / 故事 / 阅读物（发行版由 NIKKI_DATA_DIR 指到工坊下的 data/）
ASSET = _env_dir("NIKKI_DATA_DIR", os.path.join(ROOT, "素材"))
# 成品根：public/assets（发行版由 NIKKI_OUT_DIR 指到模拟器目录）
PUB = _env_dir("NIKKI_OUT_DIR", os.path.join(SIM, "public", "assets"))

# 素材重构：旧目录名 `套装故事` → 新结构 `故事`
SRC = os.path.join(ASSET, "故事")
POOL = os.path.join(ASSET, "pool-map.json")
# ：输出改成运行时 JSON（`public/assets/data/stories.json`）。
# 以前写 `src/data/stories.ts`，正文被编译进 JS —— 发行版里没有 vite，
# 工坊改完故事永远不会生效。改成 JSON 后刷新浏览器就能看到。
OUT = os.path.join(PUB, "data", "stories.json")

# ：**基线模式**（发行版）。
#
# 发行版不再随包发 `素材/故事/`（那是 1.2M 的内置正文）——
# 故事的主数据源变成 `stories.json` 本身，`素材/故事/` 只当**增量补丁**：
# 用户拖进来的新故事 / 改写的故事会覆盖基线里对应的那一条，其余原样保留。
#
# 开关用环境变量而不是「目录在不在」判断：
#   - 开发版不设 → 纯源模式（`素材/故事/` 是唯一真源，删一篇就是删一篇）
#   - 发行版设 1 → 基线模式（JSON 是主数据源，源目录只放增量）
BASELINE_MODE = os.environ.get("NIKKI_JSON_BASELINE") == "1"

# ⚠ 非基线模式下找不到源目录必须报错退出，否则会把数据写成空数组、
# 悄悄丢掉全部故事（ 踩过这个坑）。基线模式下目录可以不存在。
if not BASELINE_MODE and not os.path.isdir(SRC):
    raise SystemExit(f"✗ 找不到故事源目录：{SRC}")


def load_set_map():
    """套装名 → (setId, star, major)

    major = **故事出现在哪个大版本**，即它所属**服装阁的版本号**主号
    （0 = 奇迹传说 / 1 = 心愿原野 / 2 = 伊赞之土）。

    ⚠ 不能用套装的 `firstVersion`（v2.0.04 修）：0.1 祈愿星 / 0.2 魂灵生 两座
    自建大版本里的 14 套，有 10 套是从官方旧版本借调的（咏叹银夜莺首发 1.1、
    深林遥梦首发 2.0 …）。按首发版本归区，这 10 篇就会散到心愿原野 / 伊赞之土，
    奇迹传说只剩 4 篇（用户 2026-11-11 反馈）。故事的展示语境是它所在的阁，
    所以按阁的版本归区才对。
    """
    pm = json.load(open(POOL, encoding="utf-8"))
    m = {}
    for b in pm["banners"]:
        mm = re.match(r"(\d+)", str(b.get("version") or ""))
        major = int(mm.group(1)) if mm else 1
        for s in b["sets"]:
            m.setdefault(s["name"], (s["id"], s["star"], major))
    return m


def parse(path):
    raw = open(path, encoding="utf-8").read().replace("\r\n", "\n")
    lines = raw.split("\n")
    # 标题行
    title = ""
    i = 0
    while i < len(lines) and not lines[i].strip():
        i += 1
    if i < len(lines) and lines[i].startswith("#"):
        title = lines[i].lstrip("#").strip()
        i += 1
    # 跳过分隔线与空行
    while i < len(lines) and (not lines[i].strip() or lines[i].strip() == "---"):
        i += 1
    text = "\n".join(lines[i:]).strip()
    # 压缩 3 个以上连续空行为 1 个（原文排版用空行分段）
    text = re.sub(r"\n{3,}", "\n\n", text)
    return title, text


def load_baseline():
    """读现有 stories.json 作基线（发行版：JSON 才是故事的主数据源）。

    读不到 / 格式不对时按空基线处理 —— 宁可退化成「只剩源目录里的」，
    也不要因为一个坏 JSON 把整个图鉴清空。
    """
    if not os.path.exists(OUT):
        return []
    try:
        with open(OUT, encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:  # noqa: BLE001
        print(f"  [基线] 读取 {OUT} 失败（{type(e).__name__}: {e}），按空基线处理")
        return []
    if not isinstance(data, list):
        print(f"  [基线] {OUT} 不是数组，按空基线处理")
        return []
    return [r for r in data if isinstance(r, dict) and r.get("id")]


def main():
    setmap = load_set_map()
    files = sorted(f for f in os.listdir(SRC) if f.endswith(".md")) if os.path.isdir(SRC) else []
    rows = []
    miss = []
    for f in files:
        stem = f[:-3]
        m = re.match(r"故事-(\d)星-(.+)$", stem)
        if not m:
            miss.append((f, "文件名不匹配"))
            continue
        star = int(m.group(1))
        name = m.group(2).strip()
        title, text = parse(os.path.join(SRC, f))
        if not title:
            title = name
        sid, setstar, major = setmap.get(name, ("", 0, 1))
        if not sid:
            miss.append((f, f"套装名「{name}」在 pool-map 里找不到"))
        rows.append(
            {
                "id": name,  # 稳定 id（套装名唯一，避免依赖 pool-map 命中）
                "setId": sid,
                "setName": name,
                "star": setstar or star,
                "major": major,
                "title": title,
                "text": text,
                "_num": int(sid[1:]) if sid else 9999,
            }
        )

    # 基线模式：把源目录当**增量补丁**，不是全集。
    #   源里有同 id 的 → 用源的（用户改过/新建的）
    #   基线里有源没有的 → 保留（内置故事不受影响）
    # 源目录为空或不存在 → 结果就是基线本身，一条都不丢。
    base = load_baseline() if BASELINE_MODE else []
    if base:
        merged = {r["id"]: dict(r) for r in base}
        for r in rows:
            merged[r["id"]] = r          # 源覆盖基线
        rows = list(merged.values())
        for r in rows:
            # 基线条目来自 JSON，排序用的 `_num` 已被剥掉 → 按 setId 补算，
            # 否则它们会全落到 9999、排序整个乱掉。
            if "_num" not in r:
                sid = str(r.get("setId") or "")
                r["_num"] = int(sid[1:]) if sid[1:].isdigit() else 9999
            r.setdefault("setName", r.get("id", ""))
        print(f"  [基线] 合并 {len(base)} 条内置 + {len(files)} 个源文件 → {len(rows)} 条")
    elif BASELINE_MODE:
        print("  [基线] 无基线 JSON（首次生成），本次完全由源目录决定")

    # 排序：套装编号正序；未命中的按名排在最后
    rows.sort(key=lambda r: (r["_num"], r.get("setName") or ""))

    # 同名不同正文 → 标题加 ·01 / ·02。
    # 用内容比对确认「真的不同」，完全相同的重复件不编号。
    rows, suffix_report = disambiguate_rows(rows, label="故事")
    print_report(suffix_report, "故事")

    def q(s):
        """转义成合法的 JS 双引号字符串：反斜杠 / 双引号 / 换行 / U+2028 U+2029"""
        t = (
            s.replace("\\", "\\\\")
            .replace('"', '\\"')
            .replace("\n", "\\n")
            .replace("\u2028", "\\u2028")
            .replace("\u2029", "\\u2029")
        )
        return '"' + t + '"'

    out = [
        "/* AUTO-GENERATED —— python tools/gen-stories.py，勿手改。",
        f" * 来源：素材/故事/*.md（{len(rows)} 篇）",
        " * 排序：按 pool-map 的 set.id（S0001…）数字**正序**；未匹配到套装的排末尾。",
        " */",
        "export interface StoryEntry {",
        "  /** 稳定 id（= 套装名，唯一） */",
        "  id: string",
        "  /** pool-map 的套装 id（S0001…），用于「抽齐该套即解锁」判断 */",
        "  setId: string",
        "  setName: string",
        "  star: number",
        "  /** 大版本号：0 = 奇迹传说（0.x）/ 1 = 心愿原野（1.x）/ 2 = 伊赞之土（2.x）",
        "   *  取**所属服装阁**的版本主号 —— 0.x 的阁会借调官方旧版本的套装，",
        "   *  按套装首发版本归区会把它们散到别的分区去。 */",
        "  major: number",
        "  title: string",
        "  text: string",
        "}",
        "",
        "export const stories: StoryEntry[] = [",
    ]
    for r in rows:
        out.append("  {")
        out.append(f"    id: {q(r['id'])},")
        out.append(f"    setId: {q(r['setId'])},")
        out.append(f"    setName: {q(r['setName'])},")
        out.append(f"    star: {r['star']},")
        out.append(f"    major: {r['major']},")
        out.append(f"    title: {q(r['title'])},")
        out.append(f"    text: {q(r['text'])},")
        out.append("  },")
    out.append("]")
    out.append("")

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    # 剥掉下划线开头的内部字段（`_num` 只用来排序），前端结构里没有它们
    clean = [{k: v for k, v in r.items() if not k.startswith("_")} for r in rows]
    with open(OUT, "w", encoding="utf-8", newline="\n") as f:
        json.dump(clean, f, ensure_ascii=False, separators=(",", ":"))

    print(f"OK -> {OUT}")
    from collections import Counter
    dist = Counter(r["major"] for r in rows)
    print(f"   共 {len(rows)} 篇；未匹配 {len(miss)} 条；分区 {dict(sorted(dist.items()))}")
    for f, why in miss[:12]:
        print(f"   ! {f}  —— {why}")
    if rows:
        print(f"   首条：{rows[0]['setId']} {rows[0]['setName']} / {rows[0]['title']}")
        print(f"   末条：{rows[-1]['setId']} {rows[-1]['setName']} / {rows[-1]['title']}")


if __name__ == "__main__":
    main()
