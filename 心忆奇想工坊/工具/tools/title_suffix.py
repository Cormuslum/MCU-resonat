# -*- coding: utf-8 -*-
"""同名条目的内容消歧（v2.0.05）。

问题：`素材/故事/` 与 `素材/阅读物/` 里存在**标题相同但正文不同**的条目
（例如「玛缇亚与巨人王的往来书信」有 3 篇完全不同的书信）。图鉴列表只显示标题，
读者点开之前分不出是哪一篇；搜索里也一样。

做法：按标题分组 → 组内做内容比对 → 只有**确实不同**的变体才在标题后加
`·01` / `·02` …；内容完全相同（或只差一两个错别字的近似重复）保持原名，
不给它们编无意义的号。

比对用三种互相独立的视角，取最大值判定：

  1. 归一化 SHA-256 —— 完全相同（空白 / 标点差异不算不同）直接判定为同一变体；
  2. 字符 bigram 的 TF-IDF 余弦 —— 词频视角，高频虚词自动降权；
  3. 行级相似度 —— 段落视角，用行序列的 SequenceMatcher；
     另加整体字符 SequenceMatcher 兜住「只差一个错别字」这种情况。

`similarity()` 返回 `max(余弦, 行级, 字符级)`：只要任一视角高度相似就判为同一变体。
阈值 0.995 是照实机数据标定的：《于湖底盛放的蔷薇》两篇仅差「桠 / 丫」（0.9985）→ 同一篇；
《梅妲伊尔的笔记》两篇有 10 处实质增删（0.9205）→ 不同篇。

纯标准库，无第三方依赖。两个生成脚本共用，保证故事 / 阅读物口径一致。
"""
from __future__ import annotations

import difflib
import hashlib
import math
import re
from collections import Counter, defaultdict

# 「同一个内容」的相似度门槛
SAME_THRESHOLD = 0.995

# 已加过的后缀
_SUFFIX = re.compile(r"·\d{2,}$")

# 归一化时折叠的标点：全角 ↔ 半角、不同引号、破折号等
_TRANS = str.maketrans({
    "，": ",", "。": ".", "！": "!", "？": "?", "；": ";", "：": ":",
    "（": "(", "）": ")", "【": "[", "】": "]", "《": "<", "》": ">",
    "“": '"', "”": '"', "‘": "'", "’": "'", "、": ",",
    "—": "-", "－": "-", "…": ".", "·": ".", "\u3000": " ",
    "\t": "", "\r": "", "\n": " ",
})


def base_title(title: str) -> str:
    """去掉已有的 `·NN` 后缀，返回分组用的基准标题。"""
    return _SUFFIX.sub("", str(title or "").strip()).strip()


def normalize(text: str) -> str:
    """归一化正文：折叠空白与全角标点，用于哈希与相似度比较。"""
    s = str(text or "").translate(_TRANS)
    return re.sub(r"\s+", " ", s).strip()


def content_hash(text: str) -> str:
    """归一化后的 SHA-256。空白 / 标点差异不会造成不同的哈希。"""
    return hashlib.sha256(normalize(text).encode("utf-8")).hexdigest()


def _bigrams(text: str) -> Counter:
    s = normalize(text)
    return Counter(s[i:i + 2] for i in range(len(s) - 1)) if len(s) > 1 else Counter()


def _tfidf_cosine(texts: list[str], i: int, j: int) -> float:
    """组内 TF-IDF 余弦。IDF 只在**这一组同名条目**内统计，高频虚词自动降权。"""
    docs = [_bigrams(t) for t in texts]
    df = Counter()
    for d in docs:
        df.update(d.keys())
    n = len(docs)
    idf = {g: math.log((n + 1) / (c + 1)) + 1.0 for g, c in df.items()}

    def vec(d: Counter) -> dict:
        return {g: (1 + math.log(c)) * idf[g] for g, c in d.items()}

    a, b = vec(docs[i]), vec(docs[j])
    if not a or not b:
        return 0.0
    dot = sum(v * b.get(g, 0.0) for g, v in a.items())
    na = math.sqrt(sum(v * v for v in a.values()))
    nb = math.sqrt(sum(v * v for v in b.values()))
    return dot / (na * nb) if na and nb else 0.0


def _lines(text: str) -> list[str]:
    return [normalize(x) for x in str(text or "").splitlines() if normalize(x)]


def _line_similarity(a: str, b: str) -> float:
    """行序列的最长匹配占比（段落视角）。"""
    la, lb = _lines(a), _lines(b)
    if not la and not lb:
        return 1.0
    if not la or not lb:
        return 0.0
    return difflib.SequenceMatcher(None, la, lb, autojunk=False).ratio()


def _char_similarity(a: str, b: str) -> float:
    """整体字符序列相似度（专门兜住「只差一两个错别字」）。"""
    x, y = normalize(a), normalize(b)
    if x == y:
        return 1.0
    if not x or not y:
        return 0.0
    return difflib.SequenceMatcher(None, x, y, autojunk=False).ratio()


def similarity(texts: list[str], i: int, j: int) -> dict:
    """返回三种视角的明细，以及用于判定的 `score`。"""
    cos = _tfidf_cosine(texts, i, j)
    line = _line_similarity(texts[i], texts[j])
    char = _char_similarity(texts[i], texts[j])
    return {"cosine": cos, "line": line, "char": char, "score": max(cos, line, char)}


def same_variant(texts: list[str], i: int, j: int) -> tuple[bool, str]:
    """这两篇是不是「同一内容」？返回 (结论, 判据说明)。"""
    if content_hash(texts[i]) == content_hash(texts[j]):
        return True, "归一化哈希相同"
    s = similarity(texts, i, j)
    return s["score"] >= SAME_THRESHOLD, (
        f"cos={s['cosine']:.4f} line={s['line']:.4f} char={s['char']:.4f} "
        f"→ max={s['score']:.4f} {'≥' if s['score'] >= SAME_THRESHOLD else '<'} {SAME_THRESHOLD}"
    )


def disambiguate_rows(rows: list[dict], *, label: str = "条目") -> tuple[list[dict], list[dict]]:
    """给同名但内容确实不同的条目加 `·NN` 后缀。

    - `rows` 每项须有 `title` 与 `text`；顺序决定编号顺序（调用方应先排好序）。
    - 就地修改 `title`（复制一层 dict，不碰调用方原对象以外的字段）。
    - 返回 `(rows, report)`，report 每组一条，含各变体的判定明细，便于打印 / 验收。
    """
    groups: dict[str, list[int]] = defaultdict(list)
    for idx, r in enumerate(rows):
        groups[base_title(r.get("title", ""))].append(idx)

    report = []
    for base, idxs in groups.items():
        if len(idxs) < 2:
            continue
        texts = [str(rows[k].get("text", "")) for k in idxs]

        variants: list[dict] = []
        for pos, k in enumerate(idxs):
            placed = False
            for v in variants:
                same, why = same_variant(texts, v["first_pos"], pos)
                if same:
                    v["indices"].append(k)
                    v["checks"].append((k, why))
                    placed = True
                    break
            if not placed:
                variants.append({"first_pos": pos, "indices": [k], "checks": []})

        if len(variants) > 1:
            for n, v in enumerate(variants, 1):
                for k in v["indices"]:
                    rows[k]["title"] = f"{base}·{n:02d}"

        report.append({
            "base": base,
            "total": len(idxs),
            "variants": [
                {
                    "no": n,
                    "title": rows[v["indices"][0]]["title"],
                    "items": [rows[k].get("id", "") for k in v["indices"]],
                    "checks": v["checks"],
                }
                for n, v in enumerate(variants, 1)
            ],
            "suffixed": len(variants) > 1,
            "hashes": [content_hash(texts[p])[:10] for p in range(len(texts))],
        })

    return rows, report


def print_report(report: list[dict], label: str = "条目") -> None:
    """把判定明细打到 stdout —— 让用户能复核「为什么这篇加了 / 没加后缀」。"""
    if not report:
        print(f"   同名{label}：0 组")
        return
    print(f"   同名{label}：{len(report)} 组")
    for g in report:
        mark = "加后缀" if g["suffixed"] else "内容相同，保持原名"
        print(f"     · {g['base']}（{g['total']} 条，{len(g['variants'])} 个变体）→ {mark}")
        for v in g["variants"]:
            print(f"        变体 {v['no']:02d} → {v['title']}  [{', '.join(map(str, v['items']))}]")
        shown = 0
        for v in g["variants"]:
            for _item, why in v["checks"]:
                if shown >= 3:
                    break
                print(f"        判据：{why}")
                shown += 1
