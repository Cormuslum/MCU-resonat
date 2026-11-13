# -*- coding: utf-8 -*-
"""
build-pool-map.py —— 把卡池编号 / 套装库跑成统一的 pool-map.json

数据源：
  1. 素材/服装阁/<版本>/<阁>/              → 版本、卡池目录结构、阁级素材（背景/缩略图/艺术字）
  2. 素材/部分UI及道具图片/艺术字重命名映射表.xlsx → gacha 全局编号（官方编号的来源）
  3. 素材/视频素材/ResonanceDisplay_NNN.webm  → 卡池展示动画
  4. 素材/部分UI及道具图片/paper_frames/NNN/  → 卡池 UI 分层件
  5. 素材/部分UI及道具图片/paper_frames/_gifs/→ 卡池动效 GIF
  6. 素材/图片素材/<版本>/<星级>-<池型>共鸣-《套装》/ → 卡片图、进化阶段
  7. 素材/信息表/套装信息表.xlsx                    → 套装ID、版本时间表（版本表.csv 存在时以它为准）
  8. 素材/信息表/版本表.csv                         → 版本名/介绍/大版本/版本卡编号（更新程序写这里）
  9. 素材/信息表/卡池索引.json                      → 更新程序新增卡池的 gacha 编号 / 阁型（覆盖 2）

⚠ 2 / 7 是**可选补充源**，文件不在就跳过（`xlsx_rows()` 返回空表）。
  但 版本表.csv 与 套装序列.csv **至少要在**，两个源都空会直接 SystemExit。

版本内序号 `seq` 由本脚本按「含 5★ 在前 → gachaKey 升序 → 常驻最后」自动计算。

用法：
  python tools/build-pool-map.py            # 生成 素材/pool-map.json
  python tools/build-pool-map.py --report   # 只打印核对报告，不写文件
"""
import os, re, sys, json, html, zipfile, io
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import part_code  # noqa: E402  部位代号（读 素材/信息表/部位代号对照表.csv）

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")


def _env_dir(name, default):
    """目录可被环境变量覆盖（发行版：编辑数据在工坊目录、成品在模拟器目录，两者不同根）。"""
    v = os.environ.get(name)
    return os.path.abspath(v) if v else default


# 编辑数据根（信息表 / 套装库 / 故事 / 阅读物）。发行版里它指向工坊目录下的 `data/`。
ASSET = _env_dir("NIKKI_DATA_DIR", os.path.join(ROOT, "素材"))
# pool-map 落在数据根旁边 —— 它是索引，不是成品。
OUT = _env_dir("NIKKI_POOL_MAP", os.path.join(ASSET, "pool-map.json"))

# UI 整包根目录的候选名（按顺序试，哪个存在用哪个）
UI_ROOTS = ("界面/UI整包", "0主素材", "朋友分享素材")
# 同一次整理里被改名的其它素材目录（旧名 → 新名）
DIR_ALIASES = {
    # 旧名 → 新名。P()/A() 会按顺序试，哪个存在用哪个。
    "抽卡奖励界面": ("界面/抽卡演出",),
    "抽卡道具": ("界面/抽卡演出",),
    "游戏内实机展示": ("界面/抽卡演出",),
    # 顶层重命名
    "source": ("服装阁",),
    "图片素材": ("套装卡片图",),
    "套装故事": ("故事",),
    "部分UI及道具图片": ("界面/通用UI",),
    "卡池背景图": ("卡池背景",),
    "卡池背景图（纯图片，无艺术字）": ("卡池背景",),
    "卡池界面缩略图": ("卡池背景",),
    "卡池音频": ("音频",),
    "音频素材": ("音频",),
    "视频素材": ("视频",),
    "字体库": ("字体",),
    "所有卡池通用三星散件": ("通用散件",),
    "主页": ("界面/主页",),
    "博物图鉴": ("界面/博物图鉴",),
    "玄学运势": ("界面/玄学运势",),
    "辉煌心光": ("界面/辉煌心光",),
    "深海回响奖励": ("界面/深海回响",),
    "0主素材": ("界面/UI整包",),
}


def _norm_key(s):
    return str(s).replace("\\", "/").strip().lstrip("./")


def _load_overrides():
    """`NIKKI_OVERRIDES` 指向的 JSON：{虚拟素材路径: 真实文件}。

    发行版不发 `素材/`，用户选的图就在原地 —— 目录扫描根本看不到它们。
    这层把「本次写入登记过的虚拟文件」当成存在，好让 pool-map 里仍然记下
    `服装阁/<版本>/<阁>/背景图.jpg` 这样的虚拟路径（产物名靠它推算）。
    """
    p = os.environ.get("NIKKI_OVERRIDES", "")
    if not p:
        return {}
    try:
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
        if isinstance(d, dict) and isinstance(d.get("overrides"), dict):
            d = d["overrides"]
        return {_norm_key(k): v for k, v in (d or {}).items() if v}
    except Exception as e:
        print(f"[overrides] 读取失败（按空处理）：{e}")
        return {}


OVERRIDES = _load_overrides()


def virtual_exists(p):
    """磁盘上有，或本次写入登记过 → 都算"在"。"""
    if os.path.exists(p):
        return True
    if not OVERRIDES:
        return False
    try:
        return _norm_key(os.path.relpath(p, ASSET)) in OVERRIDES
    except Exception:
        return False


def virtual_listdir(d):
    """目录下的文件名：磁盘真实存在的 + overrides 里登记到该目录的。"""
    names = set()
    if os.path.isdir(d):
        try:
            names.update(os.listdir(d))
        except Exception:
            pass
    if OVERRIDES:
        dkey = _norm_key(os.path.relpath(d, ASSET)) if os.path.abspath(d).startswith(
            os.path.abspath(ASSET)) else ""
        if dkey:
            prefix = dkey + "/"
            for k in OVERRIDES:
                if k.startswith(prefix):
                    rest = k[len(prefix):]
                    if "/" not in rest:
                        names.add(rest)
    return sorted(names)


def virtual_subdirs(d):
    """目录下的子目录名：磁盘实际的 + overrides 里登记的（新建版本/阁/套装靠它）。"""
    names = set()
    if os.path.isdir(d):
        try:
            for n in os.listdir(d):
                if os.path.isdir(os.path.join(d, n)):
                    names.add(n)
        except Exception:
            pass
    if OVERRIDES:
        try:
            dkey = _norm_key(os.path.relpath(d, ASSET))
        except Exception:
            dkey = ""
        prefix = (dkey + "/") if dkey and dkey != "." else ""
        for k in OVERRIDES:
            if prefix and not k.startswith(prefix):
                continue
            rest = k[len(prefix):] if prefix else k
            head = rest.split("/", 1)[0]
            if "/" in rest and head:
                names.add(head)
    return sorted(names)


def virtual_is_dir(d):
    if os.path.isdir(d):
        return True
    if not OVERRIDES:
        return False
    try:
        dkey = _norm_key(os.path.relpath(d, ASSET))
    except Exception:
        return False
    if not dkey or dkey == ".":
        return False
    prefix = dkey + "/"
    return any(k.startswith(prefix) for k in OVERRIDES)


def P(*a):
    """素材相对路径 → 绝对路径；旧目录名自动换到实际存在的那个。"""
    a = [str(x) for x in a]
    if not a:
        return os.path.join(ASSET, *a)
    first = a[0].replace("\\", "/")
    head = first.split("/", 1)[0]
    rest = first.split("/", 1)[1] if "/" in first else ""
    tail = ([rest] if rest else []) + a[1:]

    roots = UI_ROOTS if head in ("朋友分享素材", "0主素材") else ((head,) + DIR_ALIASES.get(head, ()))
    cands = [os.path.join(ASSET, r, *tail) for r in roots]
    for c in cands:
        if os.path.exists(c):
            return c
    return cands[0]
rel = lambda p: os.path.relpath(p, ASSET).replace("\\", "/")

# ---------------------------------------------------------------- xlsx 读取
def xlsx_rows(path, sheet="xl/worksheets/sheet1.xml"):
    """读 xlsx 单表 → list[list[str]]，兼容 inlineStr 与 sharedStrings

    文件不存在返回 `[]`：xlsx 全是**可选补充源**（CSV 才是主源）。
    发行版不带 `信息表/套装信息表.xlsx` 与 `部分UI及道具图片/艺术字重命名映射表.xlsx`
    （v2.1.05：前者内容已拆进 套装序列.csv / 版本表.csv），缺了就该安静跳过 ——
    以前这里直接 `ZipFile(path)` 抛 FileNotFoundError，被外层 try 吞掉后
    `load_set_info()` 整体返回空，88 阁里最新那批套装的 ID/星级/首发放方全丢。
    """
    if not os.path.isfile(path):
        return []
    z = zipfile.ZipFile(path)
    shared = []
    if "xl/sharedStrings.xml" in z.namelist():
        sx = z.read("xl/sharedStrings.xml").decode("utf-8")
        shared = [html.unescape(m) for m in re.findall(r"<t[^>]*>(.*?)</t>", sx, re.S)]
    xml = z.read(sheet).decode("utf-8")
    out = []
    for r in re.findall(r"<row[^>]*>(.*?)</row>", xml, re.S):
        cells = []
        for c in re.findall(r"<c[^>]*>(.*?)</c>", r, re.S):
            t = re.search(r'<t[^>]*>(.*?)</t>', c, re.S)
            v = re.search(r"<v>(.*?)</v>", c, re.S)
            if t:
                cells.append(html.unescape(t.group(1)))
            elif v:
                val = v.group(1)
                if val.isdigit() and int(val) < len(shared):
                    cells.append(shared[int(val)])
                else:
                    cells.append(val)
            else:
                cells.append("")
        out.append(cells)
    return out


# ---------------------------------------------------------------- 1. 版本时间表
def norm_ver(v):
    """xlsx 里大版本写作「1」「2」，目录里写作「1.0」「2.0」，统一成后者"""
    v = str(v).strip()
    return v + ".0" if re.fullmatch(r"\d+", v) else v


def load_version_table():
    """`素材/信息表/版本表.csv` → 版本元数据（更新程序写的就是这张表）。

    列：版本,版本名,大版本,大版本名,介绍,版本卡编号

    为什么要有这张表：版本名 / 版本介绍 / 版本卡编号（Card 目录的 NNN）原先分散在
    VersionView.vue 的常量、collect-assets.py 的 VERSION_CARDS、xlsx 的 sheet2 三处，
    更新程序想加一个版本得同时改三个地方。统一到这里之后，只写一行 CSV 就够了。
    """
    path = P("信息表", "版本表.csv")
    if not os.path.exists(path):
        return None
    import csv as _csv
    out = {}
    with open(path, encoding="utf-8-sig", newline="") as f:
        for r in _csv.DictReader(f):
            raw = (r.get("版本") or "").strip()
            if not raw:
                continue
            # 版本号规范化：`1` → `1.0`、`2` → `2.0`。
            # ⚠ 大版本行（探索季 / 祷声起诸大地）在表里常写成裸数字，
            #   不归一化的话 `ui.ver.cards` 会多出 `1`/`2` 两个键，
            # 指向不存在的 `ui/ver/card/1.webp`（ 修）。
            v = norm_ver(raw)
            maj = (r.get("大版本") or v.split(".")[0]).strip()
            if v in out:
                # 重复键会**静默覆盖**前一行 —— `1.10 丰收季` 被写成 `1.1` 时，
                # 整条「流星季」就被顶掉，版本页少一栏且毫无提示（ 事故）。
                # 只 warn 是不够的：工坊会接着生成一份残缺的 pool-map / manifest，
                # 用户看到的是「版本页错乱」，很难倒推到这张 CSV。这里直接失败，
                # 让工坊的 /api/apply 走自动回滚，并把修复方法写在报错里。
                raise SystemExit(
                    f"\n[版本表重复键] 版本 {v} 出现两次："
                    f"「{out[v].get('name', '')}」与「{(r.get('版本名') or '').strip()}」。\n"
                    "  版本号是**字符串键**，`1.10` 与 `1.1`（`2.10` 与 `2.1`）是两个不同版本；\n"
                    "  一旦被等价成同一个键，后一行就会静默覆盖前一行，版本页直接少一栏。\n"
                    "  常见原因：用 Excel 打开 素材/信息表/版本表.csv 后保存 —— Excel 会把\n"
                    "  `1.10` / `2.10` 当数字存成 `1.1` / `2.1`。\n"
                    "  请把这两行改回 `1.10`、`2.10`（以文本格式保存），再重跑管线。"
                )
            out[v] = {
                "version": v,
                "name": (r.get("版本名") or "").strip(),
                "major": maj,
                "majorName": (r.get("大版本名") or "").strip(),
                "desc": (r.get("介绍") or "").strip(),
                "cardNo": (r.get("版本卡编号") or "").strip(),
            }
    return out


def load_versions():
    """版本表 CSV 优先（含 desc / major / cardNo），没有才回退 xlsx。"""
    tbl = load_version_table()
    if tbl:
        return tbl
    rows = xlsx_rows(P("信息表", "套装信息表.xlsx"), "xl/worksheets/sheet2.xml")
    if not rows:
        raise SystemExit(
            "\n[缺 版本表] `信息表/版本表.csv` 与 `信息表/套装信息表.xlsx` 都不在，"
            "版本名 / 大版本 / 版本卡编号无处可读。\n"
            "  发行版：确认 工具/data/信息表/版本表.csv 存在。\n"
            "  开发版：确认 素材/信息表/版本表.csv 存在。"
        )
    vers = {}
    for r in rows[1:]:
        if len(r) < 2 or not r[0]:
            continue
        key = norm_ver(r[0])
        vers[key] = {
            "version": key,
            "name": r[1].strip(),
        }
    return vers


# ---------------------------------------------------------------- 2. 套装ID 与星级
def load_set_info():
    """套装名 → {id, star, origin, firstVersion, reprintVersion}（取「初始」等阶那一行）

    两个来源，**套装序列.csv 优先**（更新程序写它，纯文本、不依赖 Excel）：
      1. `素材/信息表/套装序列.csv` —— 列与 xlsx sheet1 前 8 列完全一致（优先级 2）
      2. `素材/信息表/套装信息表.xlsx` sheet1 —— 只补 CSV 里没有的（优先级 1）
    新套装只要往 CSV 追加一行（序号/套装ID/星级/套装名/进化等阶/来源阁名/首发/复刻）就能进池。

    ⚠ **优先级必须真的生效**（v1.6.09 修）：以前两者顺序读、xlsx 在后，
    而判定条件写成「`stage == '初始'` 就覆盖」，于是 xlsx 的初始行会**盖掉 CSV**，
    「CSV 优先」只是注释里的一句话。实测后果：工坊把 0.1 祈愿星两套的
    `首发` / `来源` 写对了，重建后仍被 xlsx 的旧值（`1.0探索季` / `无限之心`）顶回去，
    服装图鉴里 0.1 整版空白、套装挂到了 1.0 上。
    现在用显式优先级：低优先级永远不许覆盖高优先级；同优先级时才按「初始行优先」。
    """
    info = {}
    prio = {}

    def take(sid, star, name, stage, origin, first, reprint, p=1):
        if not (sid and star and name):
            return
        cur = prio.get(name, 0)
        if cur > p:
            return                      # 已有更高优先级的登记（CSV），别覆盖
        if cur == p and stage != "初始":
            return                      # 同源：只有「初始」行能改写已有条目
        info[name] = {
            "id": sid,
            "star": star,
            "starNum": int(re.sub(r"\D", "", star) or 0),
            "origin": origin,
            "firstVersion": first,
            "reprintVersion": reprint,
        }
        prio[name] = p

    path = P("信息表", "套装序列.csv")
    if os.path.exists(path):
        import csv as _csv
        with open(path, encoding="utf-8-sig", newline="") as f:
            for r in _csv.DictReader(f):
                take(
                    (r.get("套装ID") or "").strip(),
                    (r.get("星级") or "").strip(),
                    (r.get("套装名") or "").strip(),
                    (r.get("进化等阶") or "").strip(),
                    (r.get("来源/阁名") or "").strip(),
                    (r.get("首发") or "").strip(),
                    (r.get("复刻") or "").strip(),
                    p=2,        # 工坊维护的 CSV 说了算，xlsx 只补缺
                )

    rows = xlsx_rows(P("信息表", "套装信息表.xlsx"), "xl/worksheets/sheet1.xml")
    for r in rows[1:]:
        if not r or not any(r):
            continue
        # 整行 8 列：序号/套装ID/星级/套装名/进化等阶/来源阁名/首发/复刻
        if len(r) >= 5:
            take(
                r[1].strip() if len(r) > 1 else "",
                r[2].strip() if len(r) > 2 else "",
                r[3].strip() if len(r) > 3 else "",
                r[4].strip() if len(r) > 4 else "",
                r[5].strip() if len(r) > 5 else "",
                r[6].strip() if len(r) > 6 else "",
                r[7].strip() if len(r) > 7 else "",
                p=1,            # 历史数据，只补 CSV 没有的套装
            )
    if not info:
        raise SystemExit(
            "\n[缺 套装清单] `信息表/套装序列.csv` 与 `信息表/套装信息表.xlsx` 都没读到套装行，"
            "套装ID / 星级 / 首发版本会全空（图鉴整版空白）。已中止，避免写出残缺 pool-map。\n"
            "  发行版：确认 工具/data/信息表/套装序列.csv 存在且有表头「序号,套装ID,星级,…」。"
        )
    return info


# ---------------------------------------------------------------- 4. gacha 编号
# xlsx 未收录的 gacha 编号 → 卡池名（2026-10-26 依据朋友分享素材 Pic title 图逐张识别确认）
GACHA_EXTRA = {
    "010": "献给夜空的花束", "027": "自由的第二章",
    "029": "千重云墨千重缘", "030": "缘起绘笔万念生", "031": "烟雨侠客行", "032": "绮梦讹兽语",
    "033": "梦尽于无终幕处", "034": "向星光奔赴", "035": "趁夜色叛逃",
    "036": "风中奏鸣之花", "037": "远方与花期", "038": "遥遥晴雨天",
    "039": "我所行之途", "040": "菇灯萤梦", "041": "何处寻青羽",
    "042": "何人消隐于祷声", "043": "何梦破碎于无瑕", "044": "甜花絮语的午后", "045": "鹿与远森之歌",
    "046": "如一叶长青的诗", "047": "孤影栖薄枝", "048": "白影织林梦",
    "049": "千靥万相长夜赋", "050": "万般尘相入玉心", "051": "灯花欲语暖", "052": "唯塑此间意",
    "053": "如我斑斓", "054": "梦游者的谜底", "055": "悲欢秘宴",
    "056": "以森林唤她之名", "057": "万声终末的回响", "058": "契约终末之时",
    "078": "不灭的幽旅", "079": "以长夜为誓",
    "080": "雪落颂愿时",
}

# ---------------------------------------------------------------- 手工补充池
# `素材/source/` 只整理到 2.10。2.11「时光缝合的扉页」目前只有：
#   · 素材/图片素材/2.11时光缝合的扉页/<星级>-限定共鸣-《套装》/   → 部件卡 + 属性 yaml
#   · 素材/套装文案/2.11时光缝合的扉页/                            → 整体文案 + 部件文案
#   · 素材/朋友分享素材/UI/SysResonance/texture/Pic/080/            → 只有卡池名艺术字（多语言）
# 没有卡池背景 / 列表缩略图 / 标题横幅 / 深忆奖励，也没有套装立绘与部件图标
# （5★ 能在 Showpic/S0438 找到 520×724 试穿图，4★ 只能用卡片里的「整体」图兜底）。
# 所以这里显式补一条池定义，套装其余字段仍走和常规池完全相同的组装逻辑。
EXTRA_POOLS = [
    {
        # 官方编号即主键（080）
        "id": "banner-080",
        "name": "雪落颂愿时",
        "version": "2.11",
        "gachaKey": "080",
        "type": "limited",
        "sets": ["绽若颂愿心", "奶酪与剑"],
        # ：`bgClean` / `thumbnail` / `titleArt` 三个「指向老素材」的补位已删除 ——
        # 2.11 的阁目录里（服装阁/2.11时光缝合的扉页/雪落颂愿时/）背景图、列表缩略图、
        # 艺术字齐全，扫描阶段就能取到，这里只需提供套装清单。
        # ：原来给绽若颂愿心指了 `T_showpic_clothes_S0438H.png`，那是**错误的试穿图**
        # （红发内衣底模，520×724 不透明），弹窗里既不对版又溢出。现在不再指定 —— 扫描路径
        # 统一按「套装立绘.png → 初始/整体-初始.png」取，和其余套装立绘同规格。
    },
]

# ---------------------------------------------------------------- 高清整屏背景（已废弃）
# ：`BG_HIRES` / `TITLEART_EXTRA` 两张「从 Pic 里翻老图兜底」的表已删除。
#   88 座阁的 `素材/服装阁/<版本>/<阁>/` 里都自带 `背景图.*` 与 `艺术字.*`，
#   这两张表从来没命中过；留着只会在缺图时静默拿老图顶上，掩盖问题。
#   现在缺图走 `[缺图]` 告警，缺就明说缺。

# ---------------------------------------------------------------- 默认背景
# 服装阁没有 `背景图.*` 时，界面拿**版本页那张整屏背景**顶上（`ui/ver/bg.webp`，
# 运行时按 manifest 的 `ui.banner.fallbackBg` 取）。这里是它的源图 + 产物路径，
# 两边都找不到才算「默认背景也丢了」，才打 `[缺图]` 告警。
DEFAULT_BG_SRC = "朋友分享素材/UI/SysLogin/Texture/T_UI_login_bg.png"
DEFAULT_BG_OUT = os.path.join(SIM, "public", "assets", "ui", "ver", "bg.webp")


def default_bg_exists():
    return virtual_exists(P(DEFAULT_BG_SRC)) or os.path.exists(DEFAULT_BG_OUT)



def load_gacha_map():
    """gacha 编号 → 卡池名"""
    path = P("部分UI及道具图片", "艺术字重命名映射表.xlsx")
    rows = xlsx_rows(path)
    out = {}
    for r in rows[1:]:
        if len(r) < 3:
            continue
        src, dst = r[1].strip(), r[2].strip()
        if not src.startswith("T_UI_resonance"):
            continue
        m = re.search(r"gacha[_-]?(\d{3})", src, re.I)
        if not m:
            m = re.search(r"(\d{3})", src)
        if m:
            out[m.group(1)] = dst.replace(".png", "")
    out.update(GACHA_EXTRA)   # xlsx 未收录编号的补充映射
    return out


# ---------------------------------------------------------------- 4.5 更新工坊的卡池索引
def norm_gacha(v):
    """服装阁编号规范化（v1.9.03）。

    两段区间并存：**001~999 官方 / 1000~9999 自定义**，且允许不连续
    （999 / 1000 / 1206 / 2233 同时存在）。所以只按数值规范：

      · 小于 1000 → 补足三位（`7` → `007`、`999` → `999`）
      · 1000~9999 → 原样（`1206`）
      · 空 / 0 / 超过 4 位 → 空串（视为没编号）
    """
    digits = re.sub(r"\D", "", str(v or ""))
    if not digits:
        return ""
    n = int(digits)
    if n <= 0 or n > 9999:
        return ""
    return f"{n:03d}" if n < 1000 else str(n)


def load_pool_index():
    """读 `素材/信息表/卡池索引.json`（心忆更新工坊 updater 写的）→ (gacha_map, cfg_map)。

    这是**唯一**的阁级配置来源：编号、阁型、星级都从这里取，不再读
    「前后名称对照表.md / 艺术字重命名映射表.xlsx」（v2.0.02 起老素材与那套
    按 `list-<版本>-<序号>` 命名的目录已废弃，对照表只剩存档价值）。

    - gacha_map：官方编号 → 阁名
    - cfg_map：阁名 → 原始配置，供 `type`（阁型）、`star`（套装缺失时的星级兜底）使用

    `seq` 不在这里读取 —— 版本内序号由 `assign_seq()` 按
    「含 5★ 在前 → gachaKey 升序 → 常驻最后」自动算。
    """
    path = P("信息表", "卡池索引.json")
    if not os.path.exists(path):
        return {}, {}
    try:
        data = json.load(open(path, encoding="utf-8"))
    except Exception:
        return {}, {}
    gm, pc = {}, {}
    for name, cfg in (data or {}).items():
        if not isinstance(cfg, dict) or not name:
            continue
        pc[name] = cfg
        gk = norm_gacha(cfg.get("gachaKey"))
        if gk:
            gm[gk] = name
    return gm, pc


# ---------------------------------------------------------------- 5. 视频
def load_videos():
    """服装阁动态背景（v1.9.03）：`素材/视频/服装阁动态/<阁名>.(webm|mp4)` → 阁名 → 相对路径。

    文件名**就是阁名**（不带编号），因为编号会改（v1.9.03 就有 6 座阁改过号），
    而视频是按阁配的。同名的 webm 优先于 mp4（体积小、浏览器支持面够）。
    """
    d = P("视频", "服装阁动态")
    out = {}
    if not virtual_is_dir(d):
        return out
    for f in virtual_listdir(d):
        stem, ext = os.path.splitext(f)
        if ext.lower() not in (".webm", ".mp4"):
            continue
        if ext.lower() == ".webm" or stem not in out:
            out[stem] = f"视频/服装阁动态/{f}"
    return out


# ---------------------------------------------------------------- 6. UI 分层件
def load_ui_layers():
    """gacha 编号 → {layers:[], gifs:[], titleArt:path}"""
    base = P("部分UI及道具图片", "paper_frames")
    out = {}
    if not virtual_is_dir(base):
        return out
    for d in virtual_subdirs(base):
        dp = os.path.join(base, d)
        if not (virtual_is_dir(dp) and re.fullmatch(r"\d{3}", d)):
            continue
        files = sorted(f for f in virtual_listdir(dp) if f.lower().endswith(".png"))
        out[d] = {"layers": [f"部分UI及道具图片/paper_frames/{d}/{f}" for f in files]}
    gifdir = os.path.join(base, "_gifs")
    if virtual_is_dir(gifdir):
        for f in virtual_listdir(gifdir):
            if not f.lower().endswith(".gif"):
                continue
            m = re.match(r"(\d{3})_", f)
            if m:
                out.setdefault(m.group(1), {"layers": []})
                out[m.group(1)].setdefault("gifs", []).append(
                    f"部分UI及道具图片/paper_frames/_gifs/{f}"
                )
    return out


# ---------------------------------------------------------------- 7. 图片素材（卡片图）
def _scalar(v):
    """标量：支持行内数组 [a, b] 与去引号"""
    v = v.strip()
    if v.startswith("[") and v.endswith("]"):
        inner = v[1:-1].strip()
        return [x.strip().strip("\"'") for x in inner.split(",")] if inner else []
    return v.strip("\"'")


def _mini_yaml(path):
    """解析 属性-*.yaml（结构固定，故意不依赖 pyyaml）

    结构：顶层 `套装名称` + `部件:` 列表；每个部件是 4 空格缩进的字段，
    `五维倾向` / `标签` 是再缩进两格的子字典。
    """
    set_name = ""
    parts = []
    cur = None
    sub = None
    for raw in open(path, encoding="utf-8"):
        line = raw.rstrip("\n")
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        indent = len(line) - len(line.lstrip())
        body = line.strip()

        if body.startswith("- "):
            cur = {}
            parts.append(cur)
            sub = None
            body = body[2:]
            indent += 2

        if ":" not in body:
            continue
        k, v = body.split(":", 1)
        k, v = k.strip(), v.strip()

        if cur is None:                      # 顶层
            if k == "套装名称":
                set_name = _scalar(v)
            continue

        if indent <= 4:                      # 部件级字段
            sub = None
            if v == "":
                sub = {}
                cur[k] = sub
            else:
                cur[k] = _scalar(v)
        elif sub is not None:                # 五维倾向 / 标签 的子项
            sub[k] = _scalar(v)
    return set_name, parts


def load_set_texts():
    """套装名 → 完整套装文案（来自 素材/套装文案/<版本>/<稀有度>-<来源>-《套装名》.txt）

    txt 结构固定：
        名称：《蒙尘之罪》
        【来源：2.10金羽的裁决-限定共鸣-执律的流金】
        〖属性：性感；神谕；绮想〗
        套装文案：
        『整体』……            ← 套装整体文案（详情页顶部用）
        『发型』
        1. 「信念初咏间」……    ← 每个进化形态一个部件，名字带「·明律」等后缀
        2. 「信念初咏间·明律」……

    返回 {套装目录名: {"desc":整体文案, "styles":[属性标签], "source":来源, "forms":{部位:[{name,text}]}}}
    目录名与 图片素材/<版本>/<套装目录> 完全一致，可以直接按 key 取。
    """
    base = P("套装文案")
    out = {}
    if not os.path.isdir(base):
        return out
    for ver in os.listdir(base):
        vp = os.path.join(base, ver)
        if not os.path.isdir(vp):
            continue
        for fn in os.listdir(vp):
            if not fn.lower().endswith(".txt"):
                continue
            stem = os.path.splitext(fn)[0]
            try:
                text = open(os.path.join(vp, fn), encoding="utf-8").read()
            except Exception as e:  # noqa: BLE001
                warnings.append(f"[文案读取失败] {ver}/{fn}: {e}")
                continue

            desc, source, styles = "", "", []
            forms = {}
            cur_slot = None
            # `套装文案：` 之后、第一个 `『部位』` 之前的那段，是**裸写的整体文案**
            # （2.5 的《栖骨生花》就是这样，没有 `『整体』` 标记，只按标记取会拿到空串）
            in_set_text = False
            for raw in text.splitlines():
                line = raw.strip()
                if not line:
                    continue
                m = re.match(r"^【来源[:：](.+?)】$", line)
                if m:
                    source = m.group(1).strip()
                    continue
                m = re.match(r"^〖属性[:：](.+?)〗$", line)
                if m:
                    styles = [x.strip() for x in re.split(r"[；;、,，]", m.group(1)) if x.strip()]
                    continue
                m = re.match(r"^套装文案[:：]\s*(.*)$", line)
                if m:
                    in_set_text = True
                    rest = m.group(1).strip()
                    if rest:
                        desc = (desc + rest).strip()
                    continue
                m = re.match(r"^『([^』]+)』(.*)$", line)
                if m:
                    in_set_text = False
                    cur_slot = m.group(1).strip()
                    rest = m.group(2).strip()
                    if cur_slot == "整体":
                        desc = rest
                    elif rest:
                        forms.setdefault(cur_slot, []).append({"name": "", "text": rest})
                    else:
                        forms.setdefault(cur_slot, [])
                    continue
                m = re.match(r"^\d+[.、]\s*「([^」]+)」(.*)$", line)
                if m and cur_slot:
                    forms.setdefault(cur_slot, []).append(
                        {"name": m.group(1).strip(), "text": m.group(2).strip()}
                    )
                    continue
                # 兜底：`套装文案：` 之后、`『部位』` 之前的裸文本，整段都算整体文案
                if in_set_text:
                    desc = (desc + line).strip()
            # 键用「纯套装名」（与 source/<池>/<套装> 目录名一致），
            # 否则会和 set_dirs 的 蒙尘之罪 对不上
            mm = re.match(r"^[45]星-(?:限定|常驻)共鸣-《(.+)》$", stem)
            out[mm.group(1) if mm else stem] = {
                "desc": desc, "styles": styles, "source": source, "forms": forms,
            }
    return out


def load_merged_sets():
    """读合并后的套装库 `素材/套装库/<套装ID>.yaml`（平铺，纯编号文件名）

    返回 {套装名: {"desc", "styles", "source", "forms", "parts"}}，
    字段名与旧的 load_part_info() / load_set_texts() **完全对齐**，
    这样 main() 里可以无缝替换。

    ⚠ v1.8.01 起套装库是**精简格式**：不含部件「标签」「形态」与套装「妆容」。
      - 部件 `tags` → 空 dict（前端读的 `t['标签']` 在 manifest 里本就不存在）
      - `forms` → 空 dict（formTexts 前端零引用，v1.8.00 已从 manifest 移除）
      这两处**只影响 pool-map.json 的中间产物**，不进 manifest，前端零感知。

    库不存在（还没跑 merge-set-yaml.py）时返回空 dict → 自动回落旧路径。
    """
    base = P("套装库")
    if not os.path.isdir(base):
        return {}
    try:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import setyaml
    except Exception as e:  # noqa: BLE001
        warnings.append(f"[套装库读取失败] {e}")
        return {}

    out = {}
    for fn in os.listdir(base):
        if not fn.lower().endswith(".yaml"):
            continue
        path = os.path.join(base, fn)
        try:
            d = setyaml.load(path)
        except Exception as e:  # noqa: BLE001
            warnings.append(f"[套装库解析失败] {fn}: {e}")
            continue
        name = d.get("套装名") or ""
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
                # ：精简格式不再带「标签」→ 空 dict
                "tags": {},
            })

        out[name] = {
            "desc": d.get("整体文案", ""),
            "styles": list(d.get("属性标签") or []),
            # ：精简格式不再带「文案来源」→ 空串
            "source": "",
            # ：精简格式不再带「形态」→ 空 dict
            "forms": {},
            "parts": parts,
        }
    return out


def load_part_info():
    """套装名 → 部件属性列表（来自 图片素材/<版本>/<套装目录>/属性-*.yaml）

    每个部件含：名称 / 类型 / id / 五维倾向 / 文案 / 标签。
    3★ 散件没有 YAML，只有 116 套 5★/4★ 套装。
    """
    base = P("图片素材")
    out = {}
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
            try:
                sname, raw = _mini_yaml(os.path.join(sp, yml))
            except Exception as e:  # noqa: BLE001
                warnings.append(f"[yaml解析失败] {ver}/{sd}: {e}")
                continue
            m = re.match(r"([45])星-(限定|常驻)共鸣-《(.+)》$", sd)
            if not sname and m:
                sname = m.group(3)
            parts = []
            for q in raw:
                stats = q.get("五维倾向") or {}
                if not isinstance(stats, dict):
                    stats = {}
                top = [k for k, _ in sorted(stats.items(), key=lambda x: -int(x[1]))[:2]]
                parts.append({
                    "name": q.get("名称", ""),
                    "slot": q.get("类型", ""),
                    "uid": str(q.get("id", "")),
                    "stats": {k: int(v) for k, v in stats.items()},
                    "top": top,
                    "desc": (q.get("文案") or "").strip(),
                    "tags": q.get("标签") or {},
                })
            out[sname] = parts
    return out


def load_stars3():
    """解析 `所有卡池通用三星散件/三星散件清单.yaml`（30 个 3★ 散件）

    键名是中文：名称/部位/版本/获取方式/风格/标签/五维/game-code/图片/描述/评论。
    `标签` 是行内数组 `[清凉]`，`五维` 是行内 map `{ 典雅: 24, ... }`。
    之前误以为 3★ 散件没有文案，所以面板一直是空的 —— 其实数据全在。
    """
    # 用 P 走目录别名（ 后目录改名成 `通用散件/`）
    path = P("所有卡池通用三星散件", "三星散件清单.yaml")
    if not os.path.exists(path):
        return []

    def val(v):
        v = v.strip()
        if v.startswith("[") and v.endswith("]"):
            inner = v[1:-1].strip()
            return [x.strip().strip("\"'") for x in inner.split(",")] if inner else []
        if v.startswith("{") and v.endswith("}"):
            inner = v[1:-1].strip()
            d = {}
            for kv in inner.split(","):
                if ":" in kv:
                    k, x = kv.split(":", 1)
                    x = x.strip()
                    d[k.strip()] = int(x) if x.isdigit() else x
            return d
        return v.strip("\"'")

    items, cur = [], None
    for raw in open(path, encoding="utf-8"):
        line = raw.rstrip("\n")
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        s = line.strip()
        if s.startswith("- "):
            if cur:
                items.append(cur)
            cur = {}
            s = s[2:]
        if cur is None or ":" not in s:
            continue
        k, v = s.split(":", 1)
        cur[k.strip()] = val(v)
    if cur:
        items.append(cur)

    out = []
    for it in items:
        stats = it.get("五维") or {}
        if not isinstance(stats, dict):
            stats = {}
        stats = {k: int(v) for k, v in stats.items()}
        top = [k for k, _ in sorted(stats.items(), key=lambda x: -x[1])[:2]]
        out.append({
            "name": it.get("名称", ""),
            "slot": it.get("部位", ""),
            "style": it.get("风格", ""),
            "tags": it.get("标签", []) if isinstance(it.get("标签"), list) else [],
            "stats": stats,
            "top": top,
            "desc": it.get("描述", ""),
            "comment": it.get("评论", ""),
            "code": str(it.get("game-code", "")),
            "file": it.get("图片", ""),
            "version": it.get("版本", ""),
            "source": it.get("获取方式", ""),
        })
    return out


def load_card_sets():
    """套装名 → {star, poolType, dir, stages:[{stage, dir, parts:[...]}]}"""
    base = P("图片素材")
    out = {}
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
            m = re.match(r"([45])星-(限定|常驻)共鸣-《(.+)》$", sd)
            if not m:
                continue
            star, ptype, name = int(m.group(1)), m.group(2), m.group(3)
            stages = []
            for st in os.listdir(sp):
                stp = os.path.join(sp, st)
                if not os.path.isdir(stp):
                    continue
                mm = re.match(r"(.+?)\s+l\s+(.+)$", st)
                stages.append({
                    "stage": mm.group(1) if mm else st,
                    "stageSetName": mm.group(2) if mm else st,
                    "dir": rel(stp),
                    "parts": sorted(
                        f for f in os.listdir(stp)
                        if f.lower().endswith((".png", ".webp"))
                    ),
                })
            out[name] = {
                "star": star,
                "poolType": "standard" if ptype == "常驻" else "limited",
                "dir": rel(sp),
                "stages": stages,
            }
    return out


# ---------------------------------------------------------------- 7.5 深海回响的摆饰 / 礼盒
# 权威源：`0主素材/UI/SysResonance/texture/Rewards Introduction.md`（用户维护的一张表，
# 文件名 / 摆饰名 / 文案 / 对应套装），图片在旁边的 `Rewards/` 里。
# 一个套装最多一件摆饰；「文件名」写成「缺失」的有文案没图（保留文案、图留空）。
DECOR_DIR = "0主素材/UI/SysResonance/texture/Rewards"
DECOR_MD = "0主素材/UI/SysResonance/texture/Rewards Introduction.md"


def load_decor():
    """套装名 → {name, desc, file}。file 是素材相对路径，没图时为 None。"""
    path = P(DECOR_MD)
    if not os.path.exists(path):
        return {}
    out = {}
    for line in open(path, encoding="utf-8").read().splitlines():
        if not line.startswith("|"):
            continue
        cells = [x.strip() for x in line.strip("|").split("|")]
        if len(cells) < 4:
            continue
        # 表头与分隔行（`|-|-|-|-|`）要跳过
        if all(re.fullmatch(r":?-{2,}:?", c) for c in cells if c) or cells[0] in ("文件名",):
            continue
        stem, name, desc, suit = cells[0], cells[1], cells[2], cells[3]
        if not suit or not name:
            continue
        src = None
        if stem != "缺失":
            # md 里的下划线被转义过（`T\_UI\_balloon\_bg`）
            f = os.path.join(DECOR_DIR, stem.replace("\\_", "_") + ".png")
            if virtual_exists(P(f)):
                src = f
        out[suit] = {"name": name, "desc": desc, "file": src}
    return out


def banner_decor(decor, sets):
    """取这个池第一件有摆饰的套装（5★ 排在前，天然优先）。"""
    for s in sets:
        d = decor.get(s["name"])
        if d:
            return dict(d, suit=s["name"])
    return None


# ---------------------------------------------------------------- 8. 深忆奖励
def load_milestones(pool_dir):
    """深忆奖励（深海回响）档位。

    v1.9.02：素材已按「实体」归到阁目录下，目录名从 `深忆奖励` 改为 `深海回响`。
    两种都认，老的素材包照常可用。

    文件名有两种写法：
      · `120抽-Golden Law Light.png`（老池，带英文奖励名）
      · `120抽.png`（2.11 用户只给了图，没给奖励名）
    后者的 reward 留空，前端 `rewardName('')` 会兜底成「深海回响礼盒」。
    """
    d = next((os.path.join(pool_dir, n)
              for n in ("深海回响", "深忆奖励")
              if virtual_is_dir(os.path.join(pool_dir, n))), None)
    if d is None:
        return []
    out = []
    for f in virtual_listdir(d):
        m = re.match(r"(\d+)抽(?:-(.+?))?\.png$", f)
        if m:
            raw = (m.group(2) or "").strip()
            out.append({
                "pulls": int(m.group(1)),
                "reward": re.sub(r"\s+", " ", raw.replace("_", " ")).strip(),
                "file": rel(os.path.join(d, f)),
            })
    # 保持原有顺序（按抽数稳定排序），不要改成按奖励名排 —— `230-1/2/3` 的落盘序号
    # 由这里的顺序决定，改了会让既有池的图与名字错位（collect-assets 不覆盖已存在的 webp）。
    return sorted(out, key=lambda x: x["pulls"])


# ---------------------------------------------------------------- 7b. 套装素材扫描
def scan_set_assets(suit_dir, warns=None):
    """扫描一个套装目录 → `{portrait, ov, cards, icons}`。

    ## 新结构（v1.9.02，按「实体」组织）

    ```
    <套装名>/
        半身像/<部位>-<部件>.png      → cards（每个部位一张卡片图）
        图标/<部位>-<部件>.png        → icons（每个部位一张图标）
        进化等阶/整体-<阶段>.png       → ov（OV-lv0..lv4 整体立绘）
    ```

    ## 命名转换

    素材用**中文**命名，产物用**官方代号**（`HA-S0438.webp`），
    映射由 `part_code` 读 `素材/信息表/部位代号对照表.csv` 提供。
    manifest 里 `name` 仍是中文（前端靠它匹配部件），只有 `src` 是代号路径。

    ## 老结构兼容

    `套装立绘.png` / `部件图标/` / `觉醒LVN.png` 都还认，方便老素材包直接用。
    """
    out = {"portrait": None, "ov": [], "cards": [], "icons": []}

    # ---------- 整体立绘（OV-lv0..lv4）
    # virtual_* 版本：目录/文件可能只存在于本次写入的 overrides 里（发行版不落盘）
    ov_dir = os.path.join(suit_dir, "进化等阶")
    if virtual_is_dir(ov_dir):
        picked = {}
        for f in virtual_listdir(ov_dir):
            if not f.lower().endswith((".png", ".webp")):
                continue
            code = part_code.ov_code(f)
            if not code:
                continue
            # 4★ 的「整体-进化」与 5★ 的「整体-一进」同槽（都 OV-lv2），
            # 排序后取先出现的那张，避免同槽两张互相覆盖。
            picked.setdefault(code, {
                "code": code,
                # 两套名字都留：`stage` 是代号反查的规范名，`stageRaw` 是素材原名。
                # 4★ 第 3 段叫「进化」、5★ 叫「一进」，都落 OV-lv2 —— 前端的形态卡
                # 要显示素材原名才不会把 4★ 错标成「一进」。
                "stage": part_code.stage_name(code),
                "stageRaw": part_code.ov_stage_raw(f) or part_code.stage_name(code),
                "file": rel(os.path.join(ov_dir, f)),
            })
        out["ov"] = [picked[k] for k in sorted(picked, key=part_code.stage_order)]

    # ---------- 卡片图（半身像）
    for dname in ("半身像",):
        d = os.path.join(suit_dir, dname)
        if not virtual_is_dir(d):
            continue
        for f in virtual_listdir(d):
            if not f.lower().endswith((".png", ".webp")):
                continue
            part, name = part_code.strip_part(f)
            code = part_code.code_of(part)
            if not code:
                if warns is not None:
                    warns.append(f"[代号缺] {rel(os.path.join(d, f))} —— 部位「{part}」不在对照表")
                continue
            out["cards"].append({
                "name": f"{part}-{name}",   # 前端 parseCardName 用第一个 - 切 slot/part
                "code": code,
                "file": rel(os.path.join(d, f)),
            })

    # ---------- 部件图标
    icon_dir = os.path.join(suit_dir, "图标")
    if not virtual_is_dir(icon_dir):
        icon_dir = os.path.join(suit_dir, "部件图标")   # 老结构
    if virtual_is_dir(icon_dir):
        for f in virtual_listdir(icon_dir):
            if not f.lower().endswith((".png", ".webp")):
                continue
            part, name = part_code.strip_part(f)
            code = part_code.code_of(part)
            if not code:
                if warns is not None:
                    warns.append(f"[代号缺] {rel(os.path.join(icon_dir, f))} —— 部位「{part}」不在对照表")
                continue
            out["icons"].append({
                "name": name,               # manifest 里 icons[].name = 纯部件名
                "code": code,
                "file": rel(os.path.join(icon_dir, f)),
            })

    # ---------- 立绘：优先 OV-lv0，其次老结构的 `套装立绘.png`
    out["portrait"] = next((o["file"] for o in out["ov"] if o["code"] == "OV-lv0"), None)
    if not out["portrait"]:
        legacy = os.path.join(suit_dir, "套装立绘.png")
        if virtual_exists(legacy):
            out["portrait"] = rel(legacy)
    return out


# 五星限时池 20/40/60/80/100 抽送的都是同一件「流光自选礼盒」，图也逐字节相同
# （ 起五档共用 `milestones/shared/low.webp`）。
LOW_TIER_PULLS = (20, 40, 60, 80, 100)
LOW_TIER_REWARD = "Flowing Spectrum Selectable"


def low_tier_fill(milestones, has5):
    """补齐 20~100 抽的低档节点。

    2.11「雪落颂愿时」用户只补了 120 抽起的素材 —— 不补的话深海回响轨道会从 120 起跳，
    和实机（20/40/60/80/100 + 120/140/160/180 + 230）对不上。低档五件是固定礼物，
    图走共用 webp，所以这里只补节点、`file` 留空（collect-assets 遇到空 file 直接跳过）。
    """
    if not has5 or not milestones:
        return milestones
    if any(m["pulls"] <= 100 for m in milestones):
        return milestones
    low = [{"pulls": p, "reward": LOW_TIER_REWARD, "file": None} for p in LOW_TIER_PULLS]
    return low + milestones


# ---------------------------------------------------------------- 9. 抽卡道具图标
def load_currency():
    """抽卡道具与货币图标（用户 2026-10-19 补充）"""
    d = P("抽卡道具")
    out = {}
    if not os.path.isdir(d):
        return out
    for name, meta in (
        ("启示水晶", {"kind": "pull", "type": "贵重品", "usage": "限定共鸣", "infinite": True}),
        ("无垠星石", {"kind": "currency", "type": "付费充值货币", "usage": "购买各类珍稀道具", "infinite": True}),
        ("钻石",     {"kind": "currency", "type": "游戏内任务获取货币", "usage": "兑换启示水晶（120:1）", "infinite": True}),
    ):
        png = os.path.join(d, f"{name}.png")
        webp = os.path.join(d, f"{name}.webp")
        if not (os.path.exists(png) or os.path.exists(webp)):
            continue
        entry = dict(meta)
        entry["icon"] = rel(png) if os.path.exists(png) else rel(webp)
        if os.path.exists(webp):
            entry["iconWebp"] = rel(webp)
        out[name] = entry
    return out


# ---------------------------------------------------------------- 主流程
# 套装信息表（素材/套装信息表.xlsx）停在 2.10 之前，2.10 的两个四星池套装没有 S 编号。
# 用户 2026-10-26 给了官方值，这里兜底（只在新套装缺 id 时生效）。
SET_ID_OVERRIDE = {
    "幽影嬉夜时": "S0431",
    "永眠的伫望": "S0455",
}


# ---------------------------------------------------------------- 基线合并
#
# 发行版不发 `素材/`（3.9G 的源图/视频），只发 `data/`（约 7M：信息表 + 套装库 +
# 故事 + 阅读物）和 `public/assets`（成品）。没有 `服装阁/` 目录，本脚本就一个阁
# 也扫不到 —— 那 88 座内置阁的清单只能来自**上一版冻结的 pool-map**。
#
# 合并规则（刻意做得笨，因为 pool-map 是 88 阁的唯一索引，写坏就是全崩）：
#   · 扫到的阁 → 用它，基线里同 id 的只在**字段为空时**补（补 assets，不覆盖新扫描）
#   · 基线独有（无源目录）的阁 → 原样追加，但套装文案/属性用最新 YAML 刷新
# 开发版有全套 `素材/`：扫出 88 座，基线全部被覆盖，行为与合并前完全一致。

def load_baseline():
    """读上一次的 pool-map 当基线；不存在/损坏就返回 None（首次生成时正常扫目录）。"""
    try:
        with open(OUT, encoding="utf-8") as f:
            d = json.load(f)
        if isinstance(d.get("banners"), list) and d["banners"]:
            return d
    except Exception:
        pass
    return None


# 基线里这些字段是「源文件相对路径」，发行版里源文件已不在，但路径仍是
# 推算产物名（banners/bg/<gachaKey>.webp）的唯一依据 —— 必须原样保留。
_POOL_ASSET_KEYS = ("thumbnail", "bgClean", "titleArt", "bg", "dynamicBg", "milestones")
_SET_ASSET_KEYS = ("portrait", "ov", "cards", "icons")


def _fill_assets(target, base):
    """扫描结果缺的素材字段，用基线补（不覆盖已有值）。"""
    ta, ba = target.get("assets") or {}, base.get("assets") or {}
    for k in _POOL_ASSET_KEYS:
        if not ta.get(k) and ba.get(k):
            ta[k] = ba[k]
    base_sets = {s.get("name"): s for s in (base.get("sets") or []) if s.get("name")}
    # ① 扫描不到的套装整条补回来。
    #    发行版只发一张阁图时（用户只换了背景），套装目录根本不存在 ——
    #    不补的话这座阁的 sets 会变成 0，套装、故事、图鉴全跟着少一批。
    have = {s.get("name") for s in (target.get("sets") or [])}
    for name, bs in base_sets.items():
        if name not in have:
            target.setdefault("sets", []).append(json.loads(json.dumps(bs)))
            have.add(name)
    # ② 补回来的套装再补各自的立绘/图标字段
    for s in (target.get("sets") or []):
        bs = base_sets.get(s.get("name"))
        if not bs:
            continue
        sa, bsa = s.get("assets") or {}, bs.get("assets") or {}
        for k in _SET_ASSET_KEYS:
            if not sa.get(k) and bsa.get(k):
                sa[k] = bsa[k]
        # 专属铭牌序号：来自 `banners/name/<池号>-<序号>.webp` 的反查，
        # 发行版没有 UI 源 → 用基线里冻结的那个（否则铭牌会退回通用名）。
        if s.get("plateIdx") is None and bs.get("plateIdx"):
            s["plateIdx"] = bs["plateIdx"]
        # ③ 文案与部件属性兜底。
        #    发行版删掉 `套装库/` 后，**手工池**（EXTRA_POOLS 里的
        #    「绽若颂愿心」「奶酪与剑」等）只带套装名，文案 / 部件属性
        #    全在 YAML 里 —— YAML 一没，这两条会整条变空（实测 134 → 132）。
        #    基线 pool-map 里存着完整值，目标为空时用它补；
        #    YAML 有值（用户改过）时不覆盖。
        for k in ("desc", "styles", "parts", "formTexts", "textSource"):
            if not s.get(k) and bs.get(k):
                s[k] = json.loads(json.dumps(bs[k]))


def _refresh_set_from_data(s, set_texts, part_info, set_info):
    """用最新的套装库 YAML / 信息表刷新一个套装的文案与属性。

    基线条目是冻结的，不和 YAML 联动的话 —— 用户改完 `S0020.yaml` 的文案，
    发行版里重建 pool-map 也不会生效，而这正是工坊最常见的修改。
    """
    name = s.get("name")
    tx = set_texts.get(name)
    if tx:
        if tx.get("desc"):
            s["desc"] = tx["desc"]
        if tx.get("styles"):
            s["styles"] = tx["styles"]
        if tx.get("forms"):
            s["formTexts"] = tx["forms"]
        if tx.get("source"):
            s["textSource"] = tx["source"]
    pi = part_info.get(name)
    if pi:
        s["parts"] = pi
    si = set_info.get(name)
    if si:
        for src_k, dst_k in (("id", "id"), ("starNum", "star"), ("star", "starLabel"),
                             ("origin", "origin"), ("firstVersion", "firstVersion"),
                             ("reprintVersion", "reprintVersion")):
            if si.get(src_k):
                s[dst_k] = si[src_k]


def merge_baseline(banners, baseline, set_texts, part_info, set_info, versions):
    """把基线里扫描不到（无源目录）的阁补回来。返回 (banners, 补回的条目列表)。"""
    if not baseline:
        return banners, []
    scan_ids = {b["id"] for b in banners}
    base_by_id = {b["id"]: b for b in baseline.get("banners", [])}

    # ① 扫到的阁：缺的素材字段用基线补
    for b in banners:
        bb = base_by_id.get(b["id"])
        if not bb:
            continue
        _fill_assets(b, bb)
        # 深海回响摆饰：发行版没有图源，md 表还能读到名字/描述但 `file` 是空的
        if bb.get("decor") and not (b.get("decor") or {}).get("file"):
            b["decor"] = bb["decor"]
        # 套装顺序以基线为准。同一座阁可能从两条路生成 —— 目录扫描（名字序）或
        # EXTRA_POOLS 手工池（官方宣传序）—— 顺序一变，前端套装标签就换位置。
        bs, ss = bb.get("sets") or [], b.get("sets") or []
        order = {s.get("name"): i for i, s in enumerate(bs)}
        if len(bs) == len(ss) and ss and all(s.get("name") in order for s in ss):
            ss.sort(key=lambda s: order[s["name"]])

    # ② 基线独有的阁：整条追加，并把套装文案刷到最新
    added = []
    for bb in baseline.get("banners", []):
        if bb["id"] in scan_ids:
            continue
        entry = json.loads(json.dumps(bb))     # 深拷贝，别改到基线对象
        for s in entry.get("sets") or []:
            _refresh_set_from_data(s, set_texts, part_info, set_info)
        # 版本名以版本表为准（目录名可能带「（公测）」这类后缀，版本表才是权威）
        vm = versions.get(entry.get("version"))
        if vm and vm.get("name"):
            entry["versionName"] = vm["name"]
        banners.append(entry)
        added.append(entry)
    return banners, added


def main():
    report_only = "--report" in sys.argv

    # 发行版只发数据（信息表/套装库/故事/阅读物），不发源图源视频。
    # 下面这些 loader 里有一半是去源目录捞文件的（艺术字重命名表、动态背景、
    # UI 分层件、卡片图、三星散件、货币图标…），文件不在时不能让它把整个管线带崩 ——
    # 缺的那部分本来也冻结在基线的 pool-map 里。
    def _safe(fn, default, label):
        try:
            return fn()
        except Exception as e:
            print(f"[pool-map] 跳过 {label}：{type(e).__name__}: {e}")
            return default

    baseline = load_baseline()

    versions = _safe(load_versions, {}, "load_versions")
    set_info = _safe(load_set_info, {}, "load_set_info")
    gacha_map = _safe(load_gacha_map, {}, "load_gacha_map")
    # 心忆更新工坊写的索引优先：新池只在那里登记过（覆盖同名老条目）
    upd_gm, pool_cfg = _safe(lambda: load_pool_index(), ({}, {}), "load_pool_index")
    gacha_map = {**gacha_map, **upd_gm}
    # 没有源目录时无法从「艺术字重命名映射表.xlsx」反查编号 → 用基线里的阁反推，
    # 否则 gacha_map 为空会让每座阁都判成「无官方编号」而被跳过。
    if baseline:
        for _b in baseline.get("banners", []):
            if _b.get("gachaKey") and _b.get("name"):
                gacha_map.setdefault(_b["gachaKey"], _b["name"])
    videos = _safe(load_videos, {}, "load_videos")
    ui = _safe(load_ui_layers, {}, "load_ui_layers")
    decor = _safe(load_decor, {}, "load_decor")
    cards = _safe(load_card_sets, {}, "load_card_sets")
    part_info = _safe(load_part_info, {}, "load_part_info")
    set_texts = _safe(load_set_texts, {}, "load_set_texts")

    # ：优先读合并后的新套装库（素材/套装库/<套装ID_套装名>/套装.yaml）
    #   一份 YAML 同时含「部件属性」与「整体文案/属性标签/进化形态」，
    #   取代原先分散在 图片素材/<版本>/属性-*.yaml 与 套装文案/<版本>/*.txt 两处的数据。
    #   库不存在时自动回落旧路径（旧素材目录照常可用，不破坏现有流程）。
    merged = _safe(load_merged_sets, {}, "load_merged_sets")
    if merged:
        part_info = {n: m["parts"] for n, m in merged.items()}
        set_texts = {
            n: {"desc": m["desc"], "styles": m["styles"], "source": m["source"], "forms": m["forms"]}
            for n, m in merged.items()
        }
        print(f"[pool-map] 用新套装库：{len(merged)} 套（素材/套装库）")
    else:
        print("[pool-map] 新套装库不存在，改用旧的 属性-yaml + 套装文案-txt")

    # gacha 反查：卡池名 → 编号
    name2gacha = {v: k for k, v in gacha_map.items()}

    banners = []
    warnings = []
    used_gacha = set()

    # 发行版布局：`素材/服装阁/` 整个不存在 → 扫不到任何阁，全靠基线 + overrides。
    src = P("服装阁")
    ver_dirs = sorted(virtual_subdirs(src), key=lambda x: (
        [int(n) for n in re.findall(r"\d+", x)] or [999]
    )) if virtual_is_dir(src) else []
    if not ver_dirs:
        print(f"[pool-map] 无 服装阁/ 目录（{src}）→ 不扫素材，改用 pool-map 基线"
              + ("" if baseline else "（基线也没有，将生成空清单）"))

    # 套装名 → 套装目录的全局索引（供 EXTRA_POOLS 定位素材用）。
    # 建一次，避免手工池反查时重复遍历整棵树。
    suit_index = {}
    for _v in ver_dirs:
        _vp = os.path.join(src, _v)
        if not virtual_is_dir(_vp):
            continue
        for _g in virtual_subdirs(_vp):
            _gp = os.path.join(_vp, _g)
            if not virtual_is_dir(_gp):
                continue
            for _s in virtual_subdirs(_gp):
                _sp = os.path.join(_gp, _s)
                if virtual_is_dir(_sp):
                    suit_index.setdefault(_s, _sp)
    for ver_dir in ver_dirs:
        vp = os.path.join(src, ver_dir)
        if not virtual_is_dir(vp) or ver_dir.startswith("卡池艺术字"):
            continue
        # 版本目录名不统一：多数是 `2.10·金羽的裁决`，2.11 是用户手放的
        # `2.11时光缝合的扉页`（没有间隔号）。两种都要认，否则 version 会变成整串目录名，
        # 版本页分组、版本内 seq、前端排序全跟着出错。
        vm = re.match(r"([\d.]+)[·\s]*(.+)$", ver_dir)
        ver_no = norm_ver(vm.group(1)) if vm else ver_dir
        ver_name = (vm.group(2) or "").strip() if vm else ""
        # 版本名以**版本表**为准。目录名常带「（公测）」「（联机玩法上线）」这类补充语，
        # 而版本表才是工坊里维护的唯一真源 —— 发行版没有目录名可用，两边不统一的话
        # 同一座阁在开发版和发行版会显示成两个名字。
        _vm = versions.get(ver_no) or {}
        if _vm.get("name"):
            ver_name = _vm["name"]

        for pool_dir in virtual_subdirs(vp):
            pp = os.path.join(vp, pool_dir)
            if not virtual_is_dir(pp):
                continue
            raw_name = pool_dir
            is_std = raw_name.startswith("常驻·")
            pool_name = raw_name[3:] if is_std else raw_name

            # 套装目录
            # 三星散件不是「套装」：它是全池通用的散件池，由 pool-map.stars3 单独处理。
            # source 里 1.0 常驻池新增了这个目录，若不排除会变成第 9 个空套装（star=0、无部件）。
            # ：`深海回响` 是阁级素材目录（深忆奖励图），同理要排除 ——
            #   不排除会被当成第 3 个套装，让每个池的 sets 数从 2 变 3。
            skip = {"卡池横幅", "深忆奖励", "深海回响", "妆容展示", "三星散件"}
            set_dirs = sorted(
                d for d in virtual_subdirs(pp)
                if d not in skip and virtual_is_dir(os.path.join(pp, d))
            )

            gk = name2gacha.get(pool_name)
            pcfg = pool_cfg.get(pool_name, {}) or {}
            # 阁型：卡池索引里登记的优先（工坊可写自定义值），否则按目录名推断常驻/限定
            pool_type = str(pcfg.get("type") or "").strip() or ("standard" if is_std else "limited")

            if gk is None:
                warnings.append(f"[gacha缺] {ver_dir}/{pool_dir}")
            else:
                used_gacha.add(gk)

            # 没有官方编号的池**不进 manifest**。
            # 2026-11-04 的一次批量导入往 source 里塞了 12 个「半截池」
            # （1.0 心愿金蔷薇/祈愿新生/纯净之风/轻盈泡泡/飞花的追忆、1.1 咏叹银夜莺、
            #  1.5 星之海、2.0 深林遥梦/谒灵、2.5 梦隙灵语/眠于花畔、2.11 重逢之约）：
            # 只有套装目录，没有背景 / 缩略图 / 艺术字，也没有 gacha 编号。
            # 官方编号是池的主键，缺编号就没法建 id，列表会重复渲染、保底记录也会串。
            # 补齐编号（写进 卡池索引.json）后自动回来，无需改代码。
            if gk is None:
                warnings.append(f"[跳过] 无官方编号，暂不入库：{ver_dir}/{pool_dir}")
                continue

            # 卡池 id 一律用**官方编号**（`banner-076`）。
            banner_id = f"banner-{gk}"

            # 套装
            sets = []
            for sd in set_dirs:
                ci = cards.get(sd, {})
                si = set_info.get(sd, {})
                tx = set_texts.get(sd, {})
                # ：套装素材统一由 scan_set_assets 扫（半身像/图标/进化等阶），
                # 产物用官方部位代号命名，映射见 素材/信息表/部位代号对照表.csv
                sa = scan_set_assets(os.path.join(pp, sd), warnings)
                sets.append({
                    # 套装信息表（xlsx）没收录的新套装，用手工补的官方 ID 兜底
                    "id": si.get("id") or SET_ID_OVERRIDE.get(sd, ""),
                    "name": sd,
                    "star": si.get("starNum") or ci.get("star") or 0,
                    "starLabel": si.get("star") or (f"{ci.get('star')}★" if ci.get("star") else ""),
                    "origin": si.get("origin", ""),
                    "firstVersion": si.get("firstVersion", ""),
                    "reprintVersion": si.get("reprintVersion", ""),
                    "parts": part_info.get(sd, []),
                    # 完整套装文案（ 起来自合并后的 素材/套装库，不再读 txt）
                    "desc": tx.get("desc", ""),
                    "styles": tx.get("styles", []),
                    "textSource": tx.get("source", ""),
                    "formTexts": tx.get("forms", {}),
                    "assets": sa,
                })

            # 铭牌序号：Pic 目录里的 `_name01/_name02/...` 编号 =
            # 「该池套装按 5★ 在前、同级按目录顺序」的名次，**不是星级**。
            # 前端按 `set.plateIdx` 去 `<gachaKey>-<idx>.webp` 取名牌，
            # 取不到才退回通用底板 —— 之前这里没写，导致所有带编号的专属铭牌从未生效。
            for _rank, _i in enumerate(sorted(range(len(sets)),
                                             key=lambda i: (-(sets[i]["star"] or 0), i)), start=1):
                sets[_i]["plateIdx"] = _rank

            # 星级组合
            stars = sorted({s["star"] for s in sets if s["star"]}, reverse=True)
            star_label = "+".join(f"{x}★" for x in stars) if stars else str(pcfg.get("star") or "")

            # 资源
            # 起素材按「实体」重组：阁级素材（背景 / 缩略图 / 艺术字）就在阁目录下。
            # ：`卡池横幅/`、`卡池背景图/`、`卡池背景图（纯图片，无艺术字）/`
            # 这些老结构的回落**全部删除** —— 用户已确认老素材废弃，88 座阁目录里
            # 背景图 / 列表缩略图 / 艺术字齐全，回落链从来没命中过，留着只是隐患
            # （少一张图就会静默串到别人的老图上）。

            def pool_file(*names):
                """在阁目录下按候选名找第一个存在的文件，返回绝对路径或 None。
                「存在」包括本次写入登记的外部源（发行版里图不落盘）。"""
                for n in names:
                    p = os.path.join(pp, n)
                    if virtual_exists(p):
                        return p
                return None

            pool_bg = pool_file("背景图.jpg", "背景图.png", "背景图.webp")
            pool_thumb = pool_file("列表缩略图.png", "列表缩略图.webp", "列表缩略图.jpg")
            pool_title = pool_file("艺术字.png", "艺术字.webp")
            # 缺背景不再立刻报错：界面会用默认背景顶上（见 DEFAULT_BG_*）。
            # 只有**默认背景也找不到**时才真的没东西可显示 —— 那时才告警。
            if not pool_bg and not default_bg_exists():
                warnings.append(
                    f"[缺图] 背景图缺、默认背景也缺（{DEFAULT_BG_SRC} / ui/ver/bg.webp）："
                    f"{ver_dir}/{pool_dir}"
                )

            assets = {
                # 列表缩略图（200×…，阁目录下的 `列表缩略图.*`）
                "thumbnail": rel(pool_thumb) if pool_thumb else None,
                # 去艺术字版整屏背景 —— 界面**只**认这一张。
                "bgClean": rel(pool_bg) if pool_bg else None,
                # 卡池名艺术字（透明 PNG / WebP）
                "titleArt": rel(pool_title) if pool_title else None,
                "layers": ui.get(gk, {}).get("layers", []) if gk else [],
                "gifs": ui.get(gk, {}).get("gifs", []) if gk else [],
                # 服装阁动态背景：按**阁名**配视频，编号改了也不影响
                "dynamicBg": videos.get(pool_name),
                "milestones": low_tier_fill(load_milestones(pp), any(s["star"] >= 5 for s in sets)),
            }

            entry = {
                "id": banner_id,
                "name": pool_name,
                "dirName": raw_name,
                "version": ver_no,
                "versionName": ver_name,
                "type": pool_type,
                "star": star_label,
                "gachaKey": gk,
                "setCount": len(sets),
                "sets": sets,
                "decor": banner_decor(decor, sets),
                "assets": assets,
            }
            banners.append(entry)

    # ---------- 手工补充池（source 目录尚未整理到的新版本，见 EXTRA_POOLS）
    for cfg in EXTRA_POOLS:
        used_gacha.add(cfg["gachaKey"])
        sets = []
        for sname in cfg["sets"]:
            ci = cards.get(sname, {})
            si = set_info.get(sname, {})
            tx = set_texts.get(sname, {})

            # ：手工池也走同一套扫描。素材已按实体收进
            # `服装阁/<版本>/<阁>/<套装>`，按套装名在全局索引里取目录。
            suit_dir = suit_index.get(sname)
            sa = scan_set_assets(suit_dir, warnings) if suit_dir else {
                "portrait": None, "ov": [], "cards": [], "icons": []
            }
            if not sa["portrait"]:
                portrait = cfg.get("portrait", {}).get(sname)
                if portrait and os.path.exists(P(portrait)):
                    sa["portrait"] = rel(P(portrait))

            sets.append({
                "id": si.get("id") or SET_ID_OVERRIDE.get(sname, ""),
                "name": sname,
                "star": si.get("starNum") or ci.get("star") or 0,
                "starLabel": si.get("star") or (f"{ci.get('star')}★" if ci.get("star") else ""),
                "origin": si.get("origin", ""),
                "firstVersion": si.get("firstVersion", ""),
                "reprintVersion": si.get("reprintVersion", ""),
                "parts": part_info.get(sname, []),
                "desc": tx.get("desc", ""),
                "styles": tx.get("styles", []),
                "textSource": tx.get("source", ""),
                "formTexts": tx.get("forms", {}),
                "assets": sa,
            })

        stars = sorted({s["star"] for s in sets if s["star"]}, reverse=True)
        title_art = cfg.get("titleArt")
        entry = {
            "id": cfg["id"],
            "name": cfg["name"],
            "dirName": cfg["name"],
            "version": cfg["version"],
            "versionName": versions.get(cfg["version"], {}).get("name", ""),
            "type": cfg.get("type", "limited"),
            "star": "+".join(f"{x}★" for x in stars),
            "gachaKey": cfg["gachaKey"],
            "setCount": len(sets),
            "sets": sets,
            "decor": banner_decor(decor, sets),
            "assets": {
                # 2.11 没有卡池横幅 / 深忆奖励素材（前端已兜底）；背景与缩略图见 EXTRA_POOLS 配置
                "thumbnail": cfg.get("thumbnail"),
                "bg": cfg.get("bg"),
                "bgClean": cfg.get("bgClean"),
                "titleArt": title_art if title_art and os.path.exists(P(title_art)) else None,
                "layers": [],
                "gifs": [],
                "dynamicBg": videos.get(cfg["name"]),
                "milestones": [],
            },
        }

        # 合并而非追加：更新程序往 2.11 补套装时会创建 source/2.11·…/<池>/<套装>/，
        # 上面的 source 扫描已经生成了一个同 id 的池（只有新套装）。两个同 id 的池
        # 会让前端索引撞车、版本页出现重复卡池 —— 所以把 EXTRA 的套装并进扫描结果，
        # 扫描结果没有的素材（2.11 的 bgClean / 列表缩略图）再用 EXTRA 的补位。
        exist = next((b for b in banners if b["id"] == cfg["id"]), None)
        if exist is None:
            banners.append(entry)
        else:
            have = {s["name"] for s in exist["sets"]}
            for s in entry["sets"]:
                if s["name"] not in have:
                    exist["sets"].append(s)
                    have.add(s["name"])
            exist["setCount"] = len(exist["sets"])
            stars = sorted({s["star"] for s in exist["sets"] if s["star"]}, reverse=True)
            if stars:
                exist["star"] = "+".join(f"{x}★" for x in stars)
            for k, v in entry["assets"].items():
                if v and not exist["assets"].get(k):
                    exist["assets"][k] = v

    # ---------- 基线合并：把「本次没扫到素材目录」的阁补回来
    # 发行版没有 `素材/服装阁/`，扫描结果天然为空 —— 88 座内置阁全靠这一步。
    # 开发版扫得到全部 88 座，这里补 0 个，行为与合并前一致。
    banners, _added = merge_baseline(
        banners, baseline, set_texts, part_info, set_info, versions
    )
    for _b in _added:
        if _b.get("gachaKey"):
            used_gacha.add(_b["gachaKey"])
    if _added:
        print(f"[pool-map] 基线补回 {len(_added)} 座阁（本次未扫到其素材目录）")

    # ---------- seq：版本内序号（ 起**由管线计算**，不再手写、不再读对照表）
    #
    #   主依据：**星级** —— 含 5★ 的阁在前，纯 4★ 的阁在后；
    #   辅依据：**gachaKey 数值**升序（不是字符串，见下面的坑）；
    #   特别的：**常驻阁永远排最后**（在 1.0 自己那组里垫底，
    #           其它版本由前端把常驻池追加到列表末尾）。
    #
    #   例（用户口径）：0.1 → 心愿栖金蕊(1)、银羽衔月歌(2)、心轮曳星河(3)、繁星织梦(4)；
    #                  常驻「遥远之海」在 1.0 组里是第 5 个。
    #
    # ⚠ ：编号是「001~999 官方 + 1000~9999 自定义」两段并存，且允许不连续
    #   （999 / 1000 / 1206 / 2233 同时存在）。所以必须按**数值**比，
    #   不能按字符串 —— 字符串会把 "999" 排到 "1206" 后面。
    def gacha_num(b):
        m = re.search(r"\d+", str(b.get("gachaKey") or ""))
        return int(m.group()) if m else 10 ** 6   # 没编号的排最后

    def has_five(b):
        """含 5★？套装星级缺失时退回卡池索引里登记的 `star` 文字（如 `5★+4★`）。"""
        if any((s.get("star") or 0) >= 5 for s in (b.get("sets") or [])):
            return True
        return "5★" in str(b.get("star") or "")

    by_ver = {}
    for b in banners:
        by_ver.setdefault(b["version"], []).append(b)

    for _group in by_ver.values():
        _group.sort(key=lambda b: (
            1 if b.get("type") == "standard" else 0,   # 常驻永远垫底
            0 if has_five(b) else 1,                   # 含 5★ 在前
            gacha_num(b),                              # 同星级按编号数值升序
            b["name"],
        ))
        for _i, b in enumerate(_group, start=1):
            b["seq"] = _i

    # 整体顺序：版本号升序 → 版本内 seq
    def sort_key(b):
        v = [int(n) for n in re.findall(r"\d+", b["version"])] or [999]
        return (v, b["seq"], b["name"])

    banners.sort(key=sort_key)

    # 索引
    index = {"byGacha": {}, "byName": {}, "byVersion": {}}
    for b in banners:
        if b["gachaKey"]:
            index["byGacha"][b["gachaKey"]] = b["id"]
        index["byName"][b["name"]] = b["id"]
        index["byVersion"].setdefault(b["version"], []).append(b["id"])

    unused_gacha = sorted(set(gacha_map) - used_gacha)

    # 抽卡规则（用户 2026-10-19 拍板 + 概率反解校验）
    rules = {
        "_comment": "概率参数由实机统计反解（不用公示值），改动前请跑 tools/verify-rates.py",
        "cost": {
            "item": "启示水晶",
            "perPull": 1,
            "perTenPull": 10,
            "infinite": True,
            "insufficientPopup": False,
            "note": "模拟器内道具与货币均为无限，不做不足弹窗",
        },
        "currencies": {
            "无垠星石": {"type": "paid", "infinite": True, "rateToCrystal": None},
            "钻石": {"type": "earned", "infinite": True, "rateToCrystal": 120,
                     "note": "120 钻石兑换 1 颗启示水晶（实机文案）"},
        },
        "rates": {
            "base": {"5": 0.016, "4": 0.036801, "3": 0.947199},
            "effective": {"5": 0.0611, "4": 0.11595, "3": 0.82295},
            "note": (
                "4★ 的 3.6801% 是「5★ 未命中后」的条件概率，由实机间隔分布反解："
                "1~9 抽恒 3.68%、第 10 抽必出，综合 11.595%（=1/平均间隔 8.625 抽）。"
                "注意 5★ **不重置** 4★ 计数（只是把 4★ 顺延一抽，实机 11~13 抽还有 4% 尾巴），"
                "所以重置条件是 rarity === 4，不是 >= 4。"
                "旧参数（8.5763% + 5★ 重置 4★）综合同为 11.5%，但分布完全不同 ——"
                "1~9 抽均匀 8.58%、第 10 抽才必出，与实机「1~9 抽 3.4%」对不上。"
                "5★ 基础 1.60% 与软保底两档同样来自实机统计（见 pity.5.note），综合 6.118%。"
            ),
        },
        "pity": {
            "5": {
                "hard": 20,
                "softStart": 18,
                "softSlope": 0.3506,
                "curve": "linear",
                "note": (
                    "第 1~17 抽 1.60%，第 18 抽 36.66%、第 19 抽 71.72%，第 20 抽必出。"
                    "依据：实机公共统计（gongeo 追踪站，7043 名玩家 / 1245 万抽）的"
                    "出金间隔分布 —— 1~17 抽条件概率稳定在 1.6%，第 18 抽骤升到 36.7%、"
                    "19 抽 71.6%。旧参数（12 抽起每抽 +1.048%）会把 51% 的出金堆到第 20 抽，"
                    "实机只有 13.7%，出金手感明显偏钝。"
                ),
            },
            "4": {"hard": 10, "note": "每十次共鸣必出四星或以上服装"},
            "inheritAcrossBanners": False,
            "note": "各池独立计数，不跨池继承",
        },
        "standardPoolSamePity": True,
        # 纯 4★ 卡池（池内没有 5★ 套装，如 2.10「不灭的幽旅」/「以长夜为誓」）
        # ⚠ 踩坑：这段以前只存在于 pool-map.json 里（手工补的），脚本里的 rules 常量没同步，
        #    重跑构建就丢了 —— 纯 4★ 池会静悄悄退回主池的 3.6801% / 10 抽保底。
        "pure4": {
            "base4": 0.1021,
            "hard4": 5,
            "softStart4": 4,
            "softSlope4": 0.0994,
            "effective4": 0.2496,
            "note": (
                "纯 4★ 池按实机统计对齐（7043 人 / 1245 万抽的 fourStarType3Distribution）："
                "1~3 抽条件概率 10.21%、第 4 抽升到 20.15%、第 5 抽必出，综合 24.96%。"
                "官方公示的「基础 10%、每 5 抽必出」只描述了前 3 抽，"
                "漏掉了第 4 抽那段提升 —— 按公示值算综合只有 24.0%，比实机低近 1 个百分点。"
            ),
        },
        "noDuplicate": True,
        "wishSelect": {"enabled": False, "note": "「海风的祝颂」按用户要求不实现"},
        "milestonePulls": [20, 40, 60, 80, 100, 120, 140, 160, 180, 230],
    }

    # 三星散件 / 货币图标同样来自源目录（通用散件、界面整包）—— 发行版没有源，
    # 就用基线里冻结的那份，别把这两块写成空数组（前端会没有图标可显示）。
    stars3 = _safe(load_stars3, [], "load_stars3")
    currency = _safe(load_currency, [], "load_currency")
    if baseline:
        if not stars3:
            stars3 = baseline.get("stars3") or []
        if not currency:
            currency = baseline.get("currency") or []

    out = {
        "meta": {
            "generatedAt": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "assetRoot": os.path.basename(ASSET) + "/",
            "bannerCount": len(banners),
            "setCount": len({s["name"] for b in banners for s in b["sets"]}),
            "versionCount": len({b["version"] for b in banners}),
            "withGacha": sum(1 for b in banners if b["gachaKey"]),
            "withTitleArt": sum(1 for b in banners if b["assets"].get("titleArt")),
            "withLayers": sum(1 for b in banners if b["assets"].get("layers")),
            "withDynamicBg": sum(1 for b in banners if b["assets"].get("dynamicBg")),
            "withMilestones": sum(1 for b in banners if b["assets"].get("milestones")),
            "withDecor": sum(1 for b in banners if b.get("decor")),
            "stars3Count": len(stars3),
            "note": "卡池唯一编号 = 游戏官方 gachaKey（001~999 官方 / 1000~9999 自建），id 形如 banner-076；版本内序号 seq 由管线按「含 5★ 在前 → gachaKey 升序 → 常驻最后」计算。",
        },
        "currency": currency,
        "rules": rules,
        "versions": sorted(
            versions.values(),
            key=lambda v: [int(n) for n in re.findall(r"\d+", v["version"])] or [999]
        ),
        "banners": banners,
        "index": index,
        "stars3": stars3,
    }

    # 报告
    print("=" * 64)
    print(f"卡池 {len(banners)}  |  套装 {out['meta']['setCount']}  |  版本 {out['meta']['versionCount']}")
    print(f"有 gacha 编号 {out['meta']['withGacha']}  有艺术字 {out['meta']['withTitleArt']}")
    print(f"有分层件 {out['meta']['withLayers']}  有动态背景 {out['meta']['withDynamicBg']}")
    print(f"有深忆奖励 {out['meta']['withMilestones']}")
    print(f"常驻池 {sum(1 for b in banners if b['type']=='standard')}"
          f"  限定池 {sum(1 for b in banners if b['type']=='limited')}"
          f"  自定义阁型 {sum(1 for b in banners if b['type'] not in ('standard','limited','collab'))}")
    print("=" * 64)
    if unused_gacha:
        print(f"未使用的 gacha 编号（{len(unused_gacha)}）: {', '.join(unused_gacha)}")
    if warnings:
        print(f"\n警告 {len(warnings)} 条:")
        for w in warnings[:40]:
            print("  " + w)
    # 抽样
    print("\n抽样 3 池:")
    for b in banners[:1] + banners[44:45] + banners[-1:]:
        print(f"  {b['id']:16} {b['name']:12} gacha={b['gachaKey']} "
              f"sets={b['setCount']} video={'Y' if b['assets'].get('dynamicBg') else '-'}")

    if report_only:
        print("\n[report 模式] 未写入文件")
        return 0

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    size = os.path.getsize(OUT) / 1024
    print(f"\n已写入 {OUT}  ({size:.1f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
