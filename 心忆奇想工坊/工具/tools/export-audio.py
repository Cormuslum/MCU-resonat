# -*- coding: utf-8 -*-
"""
export-audio.py —— 把「卡池界面 / 通用 UI / 抽卡机演出」三类音频导出到 素材/卡池音频/

用法：
  python tools/export-audio.py            # 导出
  python tools/export-audio.py --dry-run  # 只打印清单，不复制

产出：
  素材/卡池音频/
  ├── 01_卡池界面/     共鸣界面按钮、各卡池专属进入音、奖励面板、赠送弹窗
  ├── 02_通用UI/       通用按钮 / 解锁 / 奖励 / 纸张 / 窗口
  ├── 03_抽卡机演出/   抽卡机开合、演出起止、星光粉尘、共鸣演出音
  ├── 索引.csv         序号 / 文件名 / 中文名 / 原始事件名 / wem_id / 时长 / 大小
  └── 试听.html        双击打开，逐个点着听，可标记、可筛选、可导出结果

命名规则：`{序号}_{中文名}.mp3`，同一文件被多个事件引用时只导一次，
         原始事件名全部记在 索引.csv 里。

卡池进入音的中文名靠 pypinyin 把事件后缀（拼音首字母）反查回卡池名；
没有 pypinyin 时自动降级为显示代号，不影响导出。
"""
import os
import re
import csv
import sys
import json
import shutil
import subprocess
import argparse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：心忆共鸣（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "心忆共鸣")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
AUDIO = os.path.join(ROOT, "素材", "音频素材")
OUT = os.path.join(ROOT, "素材", "卡池音频")
POOL_MAP = os.path.join(ROOT, "素材", "pool-map.json")

FFPROBE = "ffprobe"

# ---------------------------------------------------------------- 拼音（可选）
try:
    from pypinyin import lazy_pinyin, Style

    def initials(s):
        out = ""
        for ch in s:
            if "\u4e00" <= ch <= "\u9fff":
                out += lazy_pinyin(ch, style=Style.FIRST_LETTER)[0].upper()
            elif ch.isalnum():
                out += ch.upper()
        return out

    HAS_PINYIN = True
except Exception:  # noqa: BLE001
    HAS_PINYIN = False

    def initials(s):
        return ""


# ---------------------------------------------------------------- 中文名映射
EXACT = {
    # 抽卡机演出
    "ui_lottery_machine_open": "打开抽卡机",
    "ui_lottery_machine_draw_show_start": "演出开始",
    "ui_lottery_machine_1draw_show": "单抽展示",
    "ui_lottery_machine_10draw_show": "十连展示",
    "ui_lottery_machine_draw_show_pixiedust": "星光粉尘",
    "ui_lottery_machine_draw_show_end_1ball": "单抽收尾",
    "ui_lottery_machine_draw_show_end_10ball": "十连收尾",
    "ls_resonance_performance_y": "共鸣演出·出5星",
    "ls_resonance_performance_n": "共鸣演出·未出5星",
    # 卡池界面按钮
    "ui_resonance_1_button_hover": "共鸣按钮·悬停",
    "ui_resonance_1_button_select": "共鸣按钮·点击",
    "ui_resonance_10_button_hover": "十连按钮·悬停",
    "ui_resonance_10_button_select": "十连按钮·点击",
    "ui_wbp_resonance_rewarpanel_fadein_ten": "十连奖励面板·淡入",
    "ui_resonance_sendgift_show_popup": "赠送·弹窗",
    "ui_resonance_sendgift_campaign_popup": "赠送活动·弹窗",
    # 通用 UI
    "ui_common_button_big_a_select": "通用按钮·大·点击",
    "ui_common_button_big_a_hover": "通用按钮·大·悬停",
    "ui_common_button_medium_a_select": "通用按钮·中·点击",
    "ui_common_button_medium_a_hover": "通用按钮·中·悬停",
    "ui_common_npc_dialogue": "NPC 对话",
    "ui_common_qte_interaction_miss": "QTE 失败",
    "ui_common_tab_icon_left_smal_hover": "标签图标·悬停",
    "ui_common_tab_icon_left_smal_click": "标签图标·点击",
    "ui_general_button_unlock": "按钮·解锁",
    "ui_general_unlock": "解锁",
    "ui_general_unlock_big": "解锁·大",
    "ui_general_unlock_small": "解锁·小",
    "ui_general_lock": "锁定",
    "ui_general_button_lock": "按钮·锁定",
    "ui_general_button_big_a_select": "按钮·大A·点击",
    "ui_general_button_big_a_hover": "按钮·大A·悬停",
    "ui_general_button_big_b_select": "按钮·大B·点击",
    "ui_general_button_big_b_hover": "按钮·大B·悬停",
    "ui_general_button_big_c_select": "按钮·大C·点击",
    "ui_general_button_big_c_hover": "按钮·大C·悬停",
    "ui_general_button_big_d_select": "按钮·大D·点击",
    "ui_general_button_big_d_hover": "按钮·大D·悬停",
    "ui_general_button_medium_a_select": "按钮·中A·点击",
    "ui_general_button_medium_a_hover": "按钮·中A·悬停",
    "ui_general_button_medium_b_select": "按钮·中B·点击",
    "ui_general_button_medium_b_hover": "按钮·中B·悬停",
    "ui_general_button_medium_b_deny": "按钮·中B·取消",
    "ui_general_button_medium_b_cloth": "按钮·中B·布料",
    "ui_general_button_medium_c_select": "按钮·中C·点击",
    "ui_general_button_medium_c_hover": "按钮·中C·悬停",
    "ui_general_button_medium_d_select": "按钮·中D·点击",
    "ui_general_button_medium_d_hover": "按钮·中D·悬停",
    "ui_general_button_small_a_select": "按钮·小A·点击",
    "ui_general_button_small_a_hover": "按钮·小A·悬停",
    "ui_general_button_small_b_select": "按钮·小B·点击",
    "ui_general_button_small_b_hover": "按钮·小B·悬停",
    "ui_general_button_small_c_select": "按钮·小C·点击",
    "ui_general_button_small_c_hover": "按钮·小C·悬停",
    "ui_general_button_paper_select": "纸质按钮·点击",
    "ui_general_button_paper_hover": "纸质按钮·悬停",
    "ui_general_window_a_open": "窗口打开",
    "ui_general_window_b_open": "窗口打开（B）",
    "ui_general_paper_flip": "纸质·翻页",
    "ui_general_paper_slide": "纸质·滑动",
    "ui_general_paper_slide_envelope": "纸质·信封滑动",
    "ui_general_paper_book": "纸质·书本",
    "ui_general_paper_fadein_a": "纸质·淡入",
    "ui_general_reward_a": "奖励A",
    "ui_general_reward_b": "奖励B",
    "ui_general_reward_new": "奖励·新物品",
    "ui_general_reward_diamond": "奖励·钻石",
    "ui_general_reward_points_increase": "奖励·积分增加",
    "ui_general_reward_points_slide": "奖励·积分滑动",
    "ui_general_reward_cloth_single": "奖励·服装单件",
    "ui_general_reward_cloth_single_star": "奖励·服装单件（星级）",
    "ui_general_reward_cloth_suite": "奖励·服装整套",
    "ui_general_reward_cloth_progress_complete": "奖励·服装进度完成",
    "ui_general_reward_cloth_progress_loop": "奖励·服装进度循环",
    "ui_general_reward_designdrawing": "奖励·设计图",
    "ui_general_reward_designdrawing_single": "奖励·设计图单张",
    "ui_general_interact_target_select": "交互目标·点击",
    "ui_general_interact_target_hover": "交互目标·悬停",
    "ui_general_materialexchange_click": "材料兑换·点击",
    "ui_general_materialexchange_hover": "材料兑换·悬停",
    "ui_general_button_videorecord": "录像按钮",
    "ui_general_button_videorecord_stop": "录像·停止",
    "ui_general_ani_big_hover_a": "大动画·悬停",
    "ui_general_ani_big_selected_a": "大动画·选中",
}

# 后缀代号反查不到卡池时，原样显示代号（不做猜测，避免误导）


def cn_suffix(s):
    """把 snake_case 后缀翻成中文，翻不出就原样返回"""
    table = {
        "select": "点击", "hover": "悬停", "click": "点击", "deny": "取消",
        "lock": "锁定", "open": "打开", "stop": "停止", "miss": "失败",
        "big": "大", "medium": "中", "small": "小", "paper": "纸质",
        "new": "新物品", "diamond": "钻石", "cloth": "服装",
    }
    return table.get(s, s)


# ---------------------------------------------------------------- 分类
CATS = [
    ("01_卡池界面", "卡池界面"),
    ("02_通用UI", "通用 UI"),
    ("03_抽卡机演出", "抽卡机演出"),
]


def classify(ev):
    """返回 (目录名, 排序组, 组内排序键) 或 None"""
    low = ev.lower()
    if low.startswith("ui_lottery_machine") or low.startswith("ls_resonance_performance"):
        order = {
            "ui_lottery_machine_open": 1,
            "ui_lottery_machine_draw_show_start": 2,
            "ui_lottery_machine_1draw_show": 3,
            "ui_lottery_machine_10draw_show": 4,
            "ui_lottery_machine_draw_show_pixiedust": 5,
            "ui_lottery_machine_draw_show_end_1ball": 6,
            "ui_lottery_machine_draw_show_end_10ball": 7,
            "ls_resonance_performance_n": 8,
            "ls_resonance_performance_y": 9,
        }
        return ("03_抽卡机演出", 1, order.get(low, 50))
    if "resonance" in low:
        if "pagefadein" in low.replace("fadeln", "fadein"):
            return ("01_卡池界面", 2, 0)
        if "button" in low:
            return ("01_卡池界面", 1, 0)
        return ("01_卡池界面", 3, 0)
    if low.startswith("ui_common") or low.startswith("ui_general"):
        if "button" in low:
            return ("02_通用UI", 1, 0)
        if "unlock" in low or "lock" in low:
            return ("02_通用UI", 2, 0)
        if "reward" in low:
            return ("02_通用UI", 3, 0)
        if "paper" in low or "window" in low:
            return ("02_通用UI", 4, 0)
        return ("02_通用UI", 5, 0)
    return None


# ---------------------------------------------------------------- 卡池反查
def build_pool_resolver():
    """事件名 → 卡池 banner（靠拼音首字母 / gacha 三位号）"""
    try:
        pm = json.load(open(POOL_MAP, encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return lambda ev: (None, None)

    by_id = {b["id"]: b for b in pm["banners"]}
    by_gacha = pm["index"]["byGacha"]
    pin = {}
    if HAS_PINYIN:
        for b in pm["banners"]:
            pin.setdefault(initials(b["name"]), []).append(b)

    def resolve(ev):
        toks = ev.split("_")
        for t in reversed(toks):
            if t in pin:
                return pin[t][0], "pinyin"
        for t in reversed(toks):
            if re.fullmatch(r"\d{3,4}", t) and t in by_gacha:
                return by_id[by_gacha[t]], "gacha"
        return None, None

    return resolve


def parse_version(ev):
    """UI_Resonance_210_... → 2.10 ；UI_Resonance_1_1_... → 1.1 ；UI_Resonance_23_... → 2.3"""
    toks = ev.split("_")
    low = [t.lower() for t in toks]
    if "resonance" not in low:
        return ""
    rest = toks[low.index("resonance") + 1:]
    if not rest or not rest[0].isdigit():
        return ""
    a = rest[0]
    if len(a) >= 2:
        return f"{a[0]}.{a[1:]}"
    if len(rest) > 1 and rest[1].isdigit() and len(rest[1]) == 1:
        return f"{a}.{rest[1]}"
    return a


def version_key(v):
    """'1.10' → (1, 10, 0)，保证按数字而不是字符串排序；空版本排到最后"""
    parts = [int(x) for x in re.findall(r"\d+", v or "")]
    if not parts:
        return (99, 99, 99)
    while len(parts) < 3:
        parts.append(0)
    return tuple(parts[:3])


def label_for(ev, resolve):
    low = ev.lower()
    if low in EXACT:
        return EXACT[low]

    # 卡池进入音：尽量还原成「版本 + 卡池名」
    if "pagefadein" in low.replace("fadeln", "fadein"):
        banner, _ = resolve(ev)
        tail = ev.split("_")[-1]
        suffix = ""
        if tail in ("Long", "Short"):
            suffix = "（长）" if tail == "Long" else "（短）"
        # 事件名里的版本号不可靠（`1_1` 其实是面板序号，不是 1.1）
        # 能反查到卡池时一律以 套装信息表 的版本为准
        ver = banner["version"] if banner else parse_version(ev)
        if banner:
            name = banner["name"]
        else:
            code = tail if tail not in ("Long", "Short") else ev.split("_")[-2]
            name = f"#{code}" if code.isdigit() else code
        return " ".join(x for x in ("卡池进入·", ver, name + suffix) if x).replace("卡池进入· ", "卡池进入·")

    # UI_19_Resonance_PicPanel_033_XXXX
    if "picpanel" in low:
        tail = ev.split("_")[-1]
        banner, _ = resolve(ev)
        ver = banner["version"] if banner else parse_version(ev)
        name = banner["name"] if banner else (f"#{tail}" if tail.isdigit() else tail)
        return " ".join(x for x in ("卡池图板·", ver, name) if x).replace("卡池图板· ", "卡池图板·")

    # 通用按钮兜底：ui_general_button_big_b_hover → 按钮·大B·悬停
    m = re.match(r"ui_general_button_(big|medium|small|paper)_([a-d]?)_?(\w+)$", low)
    if m:
        size, letter, act = m.groups()
        return f"按钮·{cn_suffix(size)}{letter.upper()}·{cn_suffix(act)}"

    m = re.match(r"ui_general_reward_(.+)$", low)
    if m:
        return "奖励·" + m.group(1).replace("_", " ")

    m = re.match(r"ui_general_paper_(.+)$", low)
    if m:
        return "纸质·" + m.group(1).replace("_", " ")

    return ev


# ---------------------------------------------------------------- 工具
def duration_of(path):
    try:
        p = subprocess.run(
            [FFPROBE, "-v", "error", "-show_entries", "format=duration",
             "-of", "default=nw=1:nk=1", path],
            capture_output=True, text=True,
        )
        return round(float(p.stdout.strip()), 2)
    except Exception:  # noqa: BLE001
        return 0.0


def safe_name(s):
    s = re.sub(r'[\\/:*?"<>|]', "_", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s[:56].strip(" .")


# ---------------------------------------------------------------- 主流程
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    csv_path = os.path.join(AUDIO, "音效事件名对照表.csv")
    if not os.path.exists(csv_path):
        print(f"找不到对照表：{csv_path}")
        return 1

    resolve = build_pool_resolver()
    rows = list(csv.DictReader(open(csv_path, encoding="utf-8-sig")))

    # 收集：目录 → {mp3: {...}}
    buckets = {c[0]: {} for c in CATS}
    for r in rows:
        mp3 = (r.get("mp3") or "").replace("\\", "/")
        if not mp3:
            continue
        for ev in (r.get("event_names") or "").split(";"):
            ev = ev.strip()
            if not ev:
                continue
            c = classify(ev)
            if not c:
                continue
            cat, grp, order = c
            banner, _how = resolve(ev) if "resonance" in ev.lower() else (None, None)
            # 版本以 套装信息表 为准；反查不到才退回事件名里的数字
            ver = (banner["version"] if banner else parse_version(ev)) if "resonance" in ev.lower() else ""
            slot = buckets[cat].setdefault(mp3, {
                "mp3": mp3,
                "wem": r.get("wem_id", ""),
                "events": [],
                "grp": grp,
                "order": order,
                "label": label_for(ev, resolve),
                "banner": banner["name"] if banner else "",
                "ver": ver,
            })
            slot["events"].append(ev)
            # 按钮类优先级高于兜底名
            if slot["label"] == ev:
                slot["label"] = label_for(ev, resolve)

    if not args.dry_run:
        os.makedirs(OUT, exist_ok=True)

    index_rows = []
    total = 0
    for cat, _ in CATS:
        items = list(buckets[cat].values())
        # 组内排序：先按组，再按卡池版本+名称，最后按名字
        items.sort(key=lambda x: (x["grp"], x["order"], version_key(x["ver"]), x["banner"], x["label"]))
        if not items:
            continue
        cat_dir = os.path.join(OUT, cat)
        if not args.dry_run:
            os.makedirs(cat_dir, exist_ok=True)
        print(f"\n[{cat}] {len(items)} 个")
        # 同分类里重名的加 (2)(3)，否则试听时无法区分
        seen = {}
        for it in items:
            seen[it["label"]] = seen.get(it["label"], 0) + 1
        dup = {}
        for it in items:
            if seen[it["label"]] > 1:
                dup[it["label"]] = dup.get(it["label"], 0) + 1
                if dup[it["label"]] > 1:
                    it["label"] = f'{it["label"]} ({dup[it["label"]]})'
        for i, it in enumerate(items, 1):
            src = os.path.join(AUDIO, it["mp3"])
            if not os.path.exists(src):
                print(f"  ! 源文件缺失 {it['mp3']}")
                continue
            fname = f"{i:03d}_{safe_name(it['label'])}.mp3"
            dst = os.path.join(cat_dir, fname)
            dur = duration_of(src)
            size = os.path.getsize(src)
            if not args.dry_run:
                shutil.copy2(src, dst)
            total += 1
            print(f"  {fname:<46s} {dur:6.2f}s  {size/1024:7.1f}KB")
            index_rows.append({
                "分类": cat,
                "序号": f"{i:03d}",
                "文件名": fname,
                "中文名": it["label"],
                "原始事件名": ";".join(dict.fromkeys(it["events"])),
                "wem_id": it["wem"],
                "时长秒": f"{dur:.2f}",
                "大小KB": f"{size/1024:.1f}",
                "卡池": it["banner"],
            })

    if args.dry_run:
        print(f"\n[dry-run] 共 {total} 个文件，未写入磁盘")
        return 0

    # 索引 CSV
    idx_path = os.path.join(OUT, "索引.csv")
    with open(idx_path, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(index_rows[0].keys()))
        w.writeheader()
        w.writerows(index_rows)

    # 试听页
    html_path = os.path.join(OUT, "试听.html")
    write_player(html_path, index_rows)

    print(f"\n合计 {total} 个文件")
    print(f"索引   {idx_path}")
    print(f"试听   {html_path}")
    return 0


def write_player(path, rows):
    data = json.dumps(rows, ensure_ascii=False)
    html = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>卡池音频试听</title>
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230a0e1a'/%3E%3Ccircle cx='16' cy='16' r='7' fill='none' stroke='%23e8c87a' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='2' fill='%23e8c87a'/%3E%3C/svg%3E">
<style>
  :root{
    --bg:#0a0e1a; --bg2:#121a2e; --line:rgba(232,200,122,.18);
    --gold:#e8c87a; --text:#e8ecf5; --dim:#8f9ab4; --mute:#5b6680;
  }
  *{box-sizing:border-box}
  html,body{height:100%;margin:0}
  body{background:var(--bg);color:var(--text);font:14px/1.6 "Noto Sans SC",system-ui,sans-serif;
       display:flex;flex-direction:column;overflow:hidden}
  header{display:flex;align-items:center;gap:18px;padding:14px 22px;border-bottom:1px solid var(--line);
         background:linear-gradient(180deg,#0d1322,#0a0e1a)}
  h1{margin:0;font-size:16px;letter-spacing:.16em;color:#f4e6c4;font-weight:600}
  .tabs{display:flex;gap:6px;margin-left:8px}
  .tab{padding:6px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.1);
       background:transparent;color:var(--dim);font-size:13px;cursor:pointer;transition:.15s}
  .tab:hover{color:var(--gold);border-color:rgba(232,200,122,.45)}
  .tab.on{background:linear-gradient(180deg,#f0d79a,#d4b26a);color:#1a1408;border-color:transparent;font-weight:600}
  .spacer{flex:1}
  input[type=search]{width:200px;padding:7px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.12);
       background:rgba(0,0,0,.35);color:var(--text);font-size:13px;outline:none}
  input[type=search]:focus{border-color:rgba(232,200,122,.5)}
  .chk{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--dim);cursor:pointer;user-select:none}
  .btn{padding:6px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.12);
       background:rgba(255,255,255,.03);color:var(--dim);font-size:12.5px;cursor:pointer}
  .btn:hover{color:var(--gold);border-color:rgba(232,200,122,.5)}
  main{flex:1;overflow:auto;padding:8px 0 90px}
  table{width:100%;border-collapse:collapse}
  thead th{position:sticky;top:0;background:#0c1220;text-align:left;font-size:11.5px;font-weight:500;
       letter-spacing:.12em;color:var(--mute);padding:9px 14px;border-bottom:1px solid var(--line);z-index:2}
  tbody tr{border-bottom:1px solid rgba(255,255,255,.045);cursor:pointer;transition:background .12s}
  tbody tr:hover{background:rgba(232,200,122,.055)}
  tbody tr.playing{background:rgba(232,200,122,.11)}
  tbody tr.playing td:nth-child(3){color:var(--gold)}
  tbody tr.picked td:nth-child(2){color:#8ee6b0}
  td{padding:9px 14px;font-size:13px;vertical-align:middle}
  td.no{color:var(--mute);font-variant-numeric:tabular-nums;width:56px}
  td.nm{width:38%}
  td.ev{color:var(--mute);font-size:11.5px;font-family:ui-monospace,monospace;max-width:340px;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  td.du{color:var(--dim);width:74px;font-variant-numeric:tabular-nums}
  td.sz{color:var(--mute);width:80px;text-align:right;font-variant-numeric:tabular-nums}
  td.pk{width:44px;text-align:center}
  .star{font-size:15px;color:#3a4257;transition:.15s;background:none;border:none;cursor:pointer;padding:0 4px}
  .star.on{color:var(--gold);text-shadow:0 0 10px rgba(232,200,122,.6)}
  .play{width:26px;height:26px;border-radius:50%;border:1px solid rgba(232,200,122,.35);
        color:var(--gold);display:grid;place-items:center;font-size:10px;background:rgba(232,200,122,.08)}
  tr.playing .play{background:var(--gold);color:#1a1408}
  footer{position:fixed;left:0;right:0;bottom:0;display:flex;align-items:center;gap:16px;
         padding:14px 22px 16px;background:linear-gradient(180deg,rgba(10,14,26,.72),#0a0e1a);
         border-top:1px solid var(--line);backdrop-filter:blur(8px)}
  .now{flex:1;min-width:0}
  .now .t{font-size:12px;color:var(--mute)}
  .now .n{font-size:14px;color:var(--gold);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bar{width:220px;height:3px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden}
  .bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#8b6fd4,#ffd89a)}
  .hint{font-size:11.5px;color:var(--mute)}
</style>
</head>
<body>
<header>
  <h1>卡池音频试听</h1>
  <div class="tabs" id="tabs"></div>
  <div class="spacer"></div>
  <input type="search" id="q" placeholder="搜名字 / 事件名…">
  <label class="chk"><input type="checkbox" id="only"> 只看已选</label>
  <label class="chk"><input type="checkbox" id="auto"> 连播</label>
  <button class="btn" id="copy">导出已选</button>
  <button class="btn" id="clear">清空标记</button>
</header>

<main>
  <table>
    <thead><tr>
      <th class="no">#</th><th></th><th>名称</th><th>原始事件名</th><th>时长</th><th style="text-align:right">大小</th><th></th>
    </tr></thead>
    <tbody id="tb"></tbody>
  </table>
</main>

<footer>
  <div class="now">
    <div class="t" id="nowT">未播放</div>
    <div class="n" id="nowN">点任意一行开始试听</div>
  </div>
  <div class="bar"><i id="bar"></i></div>
  <span class="hint num" id="time">0:00 / 0:00</span>
  <span class="hint" id="cnt"></span>
</footer>

<audio id="au"></audio>
<script>
const ROWS = __DATA__;
const KEY = 'nikki-audio-picked';
let picked = new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
let cat = ROWS[0] ? ROWS[0]['分类'] : '';
let cur = -1;
let view = [];

const cats = [...new Set(ROWS.map(r => r['分类']))];
const tabs = document.getElementById('tabs');
cats.forEach(c => {
  const b = document.createElement('button');
  b.className = 'tab' + (c === cat ? ' on' : '');
  b.textContent = c.replace(/^\\d+_/, '');
  b.onclick = () => { cat = c; [...tabs.children].forEach(x => x.classList.remove('on')); b.classList.add('on'); render(); };
  tabs.appendChild(b);
});

const au = document.getElementById('au');
const tb = document.getElementById('tb');
const bar = document.getElementById('bar');

function render() {
  const q = document.getElementById('q').value.trim().toLowerCase();
  const only = document.getElementById('only').checked;
  view = ROWS.filter(r => r['分类'] === cat)
    .filter(r => !q || (r['中文名'] + ' ' + r['原始事件名']).toLowerCase().includes(q))
    .filter(r => !only || picked.has(r['分类'] + '/' + r['文件名']));
  tb.innerHTML = '';
  view.forEach((r, i) => {
    const key = r['分类'] + '/' + r['文件名'];
    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td class="no">' + r['序号'] + '</td>' +
      '<td><span class="play">▶</span></td>' +
      '<td class="nm">' + esc(r['中文名']) + '</td>' +
      '<td class="ev" title="' + esc(r['原始事件名']) + '">' + esc(r['原始事件名']) + '</td>' +
      '<td class="du">' + r['时长秒'] + 's</td>' +
      '<td class="sz">' + r['大小KB'] + 'KB</td>' +
      '<td class="pk"><button class="star' + (picked.has(key) ? ' on' : '') + '">★</button></td>';
    tr.onclick = (e) => {
      if (e.target.classList.contains('star')) { toggle(key, e.target); return; }
      play(i);
    };
    if (picked.has(key)) tr.classList.add('picked');
    if (cur >= 0 && view[cur] && view[cur]['文件名'] === r['文件名'] && view[cur]['分类'] === r['分类']) tr.classList.add('playing');
    tb.appendChild(tr);
  });
  document.getElementById('cnt').textContent = view.length + ' 条 / 已选 ' + picked.size;
}

function esc(s) { return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

function play(i) {
  const r = view[i];
  if (!r) return;
  cur = i;
  au.src = encodeURI(r['分类'] + '/' + r['文件名']);
  au.play().catch(() => {});
  document.getElementById('nowT').textContent = r['分类'] + ' · ' + r['时长秒'] + 's';
  document.getElementById('nowN').textContent = r['中文名'];
  document.getElementById('time').textContent = '0:00 / ' + fmt(parseFloat(r['时长秒']));
  [...tb.children].forEach(x => x.classList.remove('playing'));
  if (tb.children[i]) tb.children[i].classList.add('playing');
}

function toggle(key, el) {
  if (picked.has(key)) { picked.delete(key); el.classList.remove('on'); }
  else { picked.add(key); el.classList.add('on'); }
  localStorage.setItem(KEY, JSON.stringify([...picked]));
  el.closest('tr').classList.toggle('picked', picked.has(key));
  document.getElementById('cnt').textContent = view.length + ' 条 / 已选 ' + picked.size;
}

const fmt = t => {
  if (!isFinite(t)) return '0:00';
  const m = Math.floor(t / 60), sec = Math.floor(t % 60);
  return m + ':' + String(sec).padStart(2, '0');
};
au.ontimeupdate = () => {
  if (au.duration) bar.style.width = (au.currentTime / au.duration * 100) + '%';
  document.getElementById('time').textContent = fmt(au.currentTime) + ' / ' + fmt(au.duration);
};
au.onended = () => {
  bar.style.width = '0';
  document.getElementById('time').textContent = '0:00 / 0:00';
  if (document.getElementById('auto').checked && cur < view.length - 1) play(cur + 1);
};

document.getElementById('q').oninput = render;
document.getElementById('only').onchange = render;

document.getElementById('copy').onclick = async () => {
  const list = ROWS.filter(r => picked.has(r['分类'] + '/' + r['文件名']))
    .map(r => r['分类'] + '/' + r['文件名'] + '\\t' + r['中文名'] + '\\t' + r['原始事件名']);
  const txt = list.join('\\n') || '（还没有标记任何音频）';
  try { await navigator.clipboard.writeText(txt); alert('已复制 ' + list.length + ' 条到剪贴板'); }
  catch { prompt('复制下面的内容：', txt); }
};

document.getElementById('clear').onclick = () => {
  if (!confirm('清空所有标记？')) return;
  picked.clear();
  localStorage.removeItem(KEY);
  render();
};

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.code === 'Space') { e.preventDefault(); au.paused ? au.play() : au.pause(); }
  if (e.code === 'ArrowDown') { e.preventDefault(); if (cur < view.length - 1) play(cur + 1); }
  if (e.code === 'ArrowUp') { e.preventDefault(); if (cur > 0) play(cur - 1); }
});

render();
</script>
</body>
</html>
"""
    with open(path, "w", encoding="utf-8") as f:
        f.write(html.replace("__DATA__", data))


if __name__ == "__main__":
    sys.exit(main())
