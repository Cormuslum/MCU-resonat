# -*- coding: utf-8 -*-
"""
套装 YAML 的读写（精简格式）。

为什么不用 pyyaml：本项目刻意不依赖它（环境里没装），`build-pool-map.py` 里已经有一套
`_mini_yaml`。但新格式要支持「部件 → 形态列表」这种嵌套 list-of-dict，老解析器读不了，
所以这里补一个自带的、**不依赖第三方库**的读写器。

# 格式

```yaml
套装名: 天鹅童话
套装ID: S0001
星级: 5
来源阁: 遥远之海
首发版本: 1.0探索季
整体文案: 天鹅衔来湖畔最娇美的花朵，……
属性标签: [典雅, 礼服, 舞会]
部件:
  - 名称: 曦光洒落
    类型: 发型
    id: 1020100033
    五维倾向:
      典雅: 541
      清新: 59
    文案: 晨曦洒落在粼粼湖水上，如同一个闪动的舞台，向她发出无声邀约。
```

# 字段取舍

只保留**模拟器真正读**的字段。下表里被划掉的都是死数据：

| 字段 | 前端消费点 | 结论 |
|---|---|---|
| 套装名 / 星级 / 来源阁 / 首发版本 | 图鉴分组、搜索、详情页 | ✅ 保留 |
| 整体文案 / 属性标签 | 共鸣页弹窗、图鉴详情、搜索 | ✅ 保留 |
| 部件.名称/类型/id/五维倾向/文案 | 图鉴部件栏、五维雷达图 | ✅ 保留 |
| ~~部件.标签~~ | manifest 里 1151 个部件带 tags，但 key 全是「类别/装饰/材质」，**没有「标签」**；前端 `GachaView` 读 `t['标签']` 永远取不到值 | ❌ 删 |
| ~~部件.形态~~ | `formTexts` 前端零引用（v1.8.00 已从 manifest 移除） | ❌ 删 |
| ~~妆容~~ | 前端零引用 | ❌ 删 |
| ~~复刻版本~~ | 前端零引用 | ❌ 删 |
| ~~文案来源~~ | `textSource` 前端只在 types.ts 声明，无读取 | ❌ 删 |

### 与旧三份文件的关系

| 新字段 | 来自 |
|---|---|
| 套装名 / 星级 / 来源阁 / 首发版本 | `信息表/套装序列.csv`（初始行） |
| 整体文案 / 属性标签 | `套装文案/<版本>/*.txt` 的『整体』与〖属性：…〗 |
| 部件.名称 / 类型 / id / 五维倾向 / 文案 | `图片素材/<版本>/<套装目录>/属性-*.yaml` |

`套装部件.csv` 整表可派生（形态名与 txt 100% 一致），不再作为源。
"""

import re


# ────────────────────────────────────────────── 低层工具

def _indent_of(line):
    return len(line) - len(line.lstrip())


def _is_item(line):
    return line.strip().startswith("- ")


def _unescape(s):
    out = []
    i = 0
    while i < len(s):
        c = s[i]
        if c == "\\" and i + 1 < len(s):
            nxt = s[i + 1]
            out.append({"n": "\n", '"': '"', "\\": "\\"}.get(nxt, nxt))
            i += 2
            continue
        out.append(c)
        i += 1
    return "".join(out)


def _scalar(v):
    """标量：行内数组 [a, b]、去引号、去转义"""
    v = v.strip()
    if v.startswith("[") and v.endswith("]"):
        inner = v[1:-1].strip()
        if not inner:
            return []
        return [_unescape(x.strip().strip("\"'")) for x in inner.split(",")]
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
        return _unescape(v[1:-1])
    return v


def _scalar_or_int(v):
    """数字字符串转 int（写盘时五维是裸数字，读回来要还原成 int）"""
    v = _scalar(v)
    if isinstance(v, str):
        try:
            return int(v)
        except (TypeError, ValueError):
            return v
    return v


def _split_kv(line):
    """拆 `key: value`（只按第一个冒号切）"""
    body = line.strip()
    if body.startswith("- "):
        body = body[2:].strip()
    k, v = body.split(":", 1)
    return k.strip(), v.strip()


# ────────────────────────────────────────────── 读取

def loads(text):
    """解析套装 YAML 文本 → dict"""
    lines = [ln.rstrip() for ln in text.split("\n")]
    lines = [ln for ln in lines if ln.strip() and not ln.lstrip().startswith("#")]
    if not lines:
        return {}
    value, _ = _parse_block(lines, 0, _indent_of(lines[0]))
    return _normalize(value)


def _normalize(data):
    """读回后的规范化：
    - 「五维倾向」的值是数字字符串 → 转 int（写盘时写的是裸数字）
    """
    parts = data.get("部件") if isinstance(data, dict) else None
    if not isinstance(parts, list):
        return data
    for p in parts:
        if not isinstance(p, dict):
            continue
        stats = p.get("五维倾向")
        if isinstance(stats, dict):
            p["五维倾向"] = {
                k: (int(v) if str(v).lstrip("-").isdigit() else v)
                for k, v in stats.items()
            }
    return data


def _parse_block(lines, i, indent):
    """按缩进解析一个块：dict 或 list"""
    if _is_item(lines[i]):
        return _parse_list(lines, i, indent)
    return _parse_dict(lines, i, indent)


def _parse_dict(lines, i, indent):
    d = {}
    while i < len(lines):
        ln = lines[i]
        if _indent_of(ln) != indent or _is_item(ln):
            break
        k, rest = _split_kv(ln)
        i += 1
        if rest != "":
            d[k] = _scalar(rest)
            continue
        if i < len(lines):
            nind = _indent_of(lines[i])
            if nind > indent:
                v, i = _parse_block(lines, i, nind)
                d[k] = v
            elif nind == indent and _is_item(lines[i]):
                v, i = _parse_list(lines, i, nind)
                d[k] = v
            else:
                d[k] = {}
        else:
            d[k] = {}
    return d, i


def _parse_list(lines, i, indent):
    out = []
    while i < len(lines):
        ln = lines[i]
        if _indent_of(ln) != indent or not _is_item(ln):
            break
        body = ln.strip()[2:].strip()
        i += 1
        item = {}
        if body:
            k, rest = _split_kv(body)
            if rest != "":
                item[k] = _scalar(rest)
            else:
                item[k], i = _parse_child(lines, i, indent + 2)
        # 同一元素的后续键（缩进 = 列表缩进 + 2）
        while i < len(lines):
            ln2 = lines[i]
            if _indent_of(ln2) != indent + 2 or _is_item(ln2):
                break
            k, rest = _split_kv(ln2)
            i += 1
            if rest != "":
                item[k] = _scalar(rest)
            else:
                item[k], i = _parse_child(lines, i, indent + 2)
        out.append(item)
    return out, i


def _parse_child(lines, i, parent_indent):
    """空值后面跟着的子块"""
    if i >= len(lines):
        return {}, i
    nind = _indent_of(lines[i])
    if nind > parent_indent:
        return _parse_block(lines, i, nind)
    if nind == parent_indent and _is_item(lines[i]):
        return _parse_list(lines, i, nind)
    return {}, i


def load(path):
    with open(path, encoding="utf-8") as f:
        return loads(f.read())


# ────────────────────────────────────────────── 写出

_SPECIAL = ":#\"'{}[]\n"


def _esc(v):
    """单行标量转义：含特殊字符就加双引号"""
    s = str(v)
    if s == "":
        return '""'
    if any(c in s for c in _SPECIAL) or s.strip() != s:
        return '"' + s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n") + '"'
    return s


def _inline_list(items):
    """行内数组：元素逐个转义，但**整体不加引号**（加了整串会被读成字符串）"""
    return "[" + ", ".join(_esc(x) for x in items) + "]"


def dumps(data):
    """套装 dict → YAML 文本（精简格式：只写模拟器真正读的字段）"""
    out = []
    for key in ("套装名", "套装ID", "星级", "来源阁", "首发版本"):
        if data.get(key) not in (None, ""):
            out.append(f"{key}: {_esc(data[key])}")
    if data.get("整体文案"):
        out.append(f"整体文案: {_esc(data['整体文案'])}")
    if data.get("属性标签"):
        out.append(f"属性标签: {_inline_list(data['属性标签'])}")

    parts = data.get("部件") or []
    if parts:
        out.append("部件:")
        for p in parts:
            out.append(f"  - 名称: {_esc(p.get('名称', ''))}")
            for key in ("类型", "id"):
                if p.get(key) not in (None, ""):
                    out.append(f"    {key}: {_esc(p[key])}")
            if p.get("五维倾向"):
                out.append("    五维倾向:")
                for k, v in p["五维倾向"].items():
                    out.append(f"      {k}: {v}")
            if p.get("文案"):
                out.append(f"    文案: {_esc(p['文案'])}")
            out.append("")

    return "\n".join(out).rstrip() + "\n"


def dump(data, path):
    with open(path, "w", encoding="utf-8") as f:
        f.write(dumps(data))


# ────────────────────────────────────────────── 旧格式解析（迁移时读源）

_NAME_RE = re.compile(r"^[45]星-(?:限定|常驻)共鸣-《(.+)》$")


def parse_text(path):
    """解析 `套装文案/<版本>/<星级>-<池类型>-《套装名》.txt`

    返回 {"套装名", "整体文案", "属性标签", "来源", "形态": {部位: [{名称, 文案}]}}
    """
    with open(path, encoding="utf-8") as f:
        text = f.read()

    desc, source, styles = "", "", []
    forms = {}
    cur_slot = None
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
                forms.setdefault(cur_slot, []).append({"名称": "", "文案": rest})
            else:
                forms.setdefault(cur_slot, [])
            continue
        m = re.match(r"^\d+[.、]\s*「([^」]+)」(.*)$", line)
        if m and cur_slot:
            forms.setdefault(cur_slot, []).append(
                {"名称": m.group(1).strip(), "文案": m.group(2).strip()}
            )
            continue
        if in_set_text:
            desc = (desc + line).strip()

    stem = path.replace("\\", "/").rsplit("/", 1)[-1][:-4]
    # 文件名形如 `5星-限定共鸣-《天鹅童话》` 或 `3星-商城-《不可见对象》`
    # 套装名一律取《》里的内容（3★ 的池类型有多个，_NAME_RE 覆盖不到）
    m = re.search(r"《(.+?)》", stem)
    if m:
        name = m.group(1)
    else:
        m2 = _NAME_RE.match(stem)
        name = m2.group(1) if m2 else stem
    return {
        "套装名": name,
        "整体文案": desc,
        "属性标签": styles,
        "来源": source,
        "形态": forms,
    }


def parse_part_yaml(path):
    """解析 `属性-*.yaml` → (套装名, 部件列表)"""
    set_name = ""
    parts = []
    cur = None
    sub = None
    with open(path, encoding="utf-8") as f:
        for raw in f:
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
            if cur is None:
                if k == "套装名称":
                    set_name = v
                continue
            if indent <= 4:
                sub = None
                #   不能当字符串存（老解析器 build-pool-map.py 里显式防过这坑）
                if v == "" or v == "{}":
                    sub = {}
                    cur[k] = sub          # 同一对象引用，子项才能回填进来
                else:
                    cur[k] = _scalar(v)
            elif sub is not None:
                sub[k] = _scalar(v)
    return set_name, parts
