# -*- coding: utf-8 -*-
"""
verify-rates.py —— 校验 pool-map.json 里的抽卡概率参数

两条独立路径互相印证：
  A. 精确递推：按规则算出期望抽数与综合概率（无随机误差）
  B. 蒙特卡洛：真跑 N 次抽卡，统计实际出率与保底分布

用法：
  python tools/verify-rates.py                 # 默认 20 万抽
  python tools/verify-rates.py --pulls 1000000 # 自定义规模
"""
import os, sys, json, random, argparse
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
# 成品根：无限暖暖模拟器（开发版 = 项目根下的它；发行版 = 发行版根下的它）
SIM = os.path.join(ROOT, "无限暖暖模拟器")
# 工具根：心忆奇想工坊/工具（开发版与发行版同构）
TOOL_ROOT = os.path.join(ROOT, "心忆奇想工坊", "工具")
MAP = os.path.join(ROOT, "素材", "pool-map.json")
REAL = os.path.join(ROOT, "布局坐标", "抽卡记录统计", "stats_0.json")


def real_gap4():
    """实机 4★ 间隔分布的条件概率（gongeo 汇总，7043 人 / 1245 万抽）。

    取 `fourStarType2Distribution`（主池的 4★ 间隔），换成条件概率后与模拟直接可比。
    """
    try:
        p = json.load(open(REAL, encoding="utf-8"))["payload"]["fourStarType2Distribution"]
    except (OSError, KeyError):
        return {}
    alive = sum(p.values())
    out = {}
    for k in sorted(p, key=int):
        out[int(k)] = p[k] / alive if alive else 0.0
        alive -= p[k]
    return out


# ---------------------------------------------------------------- A. 精确求解
def rate_at(n, base, hard, soft_start=None, slope=0.0):
    """第 n 抽的条件概率（n 从 1 开始）"""
    if n >= hard:
        return 1.0
    if soft_start and n >= soft_start:
        return min(1.0, base + (n - soft_start + 1) * slope)
    return base


def exact_effective(cfg):
    """马尔可夫链精确求解稳态出率。

    状态 = (距上次 5★ 的抽数 a, 距上次 4★ 的抽数 b)。

    两条规则决定转移（v1.9.11 按实机统计改）：
      · 5★ **不重置** b，但照常把 b 推进 1（实机表现为「4★ 顺延一抽」）；
        所以第 10 抽撞上 5★ 时 4★ 会落在第 11 抽 —— 实机 `fourStarType2Distribution`
        的 11~13 抽尾巴（4%）就是这么来的。
      · 4★ 只重置 b，不动 a。
    必须二维建模：5★ 的判定在前，5★ 越多，4★ 的实际机会越少。
    """
    base5 = cfg["rates"]["base"]["5"]
    base4 = cfg["rates"]["base"]["4"]
    h5 = cfg["pity"]["5"]["hard"]
    h4 = cfg["pity"]["4"]["hard"]
    s_start = cfg["pity"]["5"]["softStart"]
    s_slope = cfg["pity"]["5"]["softSlope"]
    # 4★ 的可选软保底（目前只有纯 4★ 池用，主池没这段）
    s4_start = cfg["pity"]["4"].get("softStart")
    s4_slope = cfg["pity"]["4"].get("softSlope", 0.0)

    states = [(a, b) for a in range(1, h5 + 1) for b in range(1, h4 + 1)]
    idx = {s: i for i, s in enumerate(states)}
    n = len(states)
    dist = [1.0 / n] * n

    for _ in range(5000):
        nd = [0.0] * n
        for i, (a, b) in enumerate(states):
            w = dist[i]
            if w == 0.0:
                continue
            p5 = rate_at(a, base5, h5, s_start, s_slope)
            nb = min(b + 1, h4)
            nd[idx[(1, nb)]] += w * p5                     # 出 5★：只重置 5★ 计数
            rest = w * (1.0 - p5)
            p4 = rate_at(b, base4, h4, s4_start, s4_slope)
            na = a + 1 if a + 1 <= h5 else h5
            nd[idx[(na, 1)]] += rest * p4                  # 出 4★，4★ 保底重置
            nd[idx[(na, nb)]] += rest * (1.0 - p4)         # 出 3★，两个计数都推进
        diff = max(abs(x - y) for x, y in zip(dist, nd))
        dist = nd
        if diff < 1e-16:
            break

    r5 = r4 = 0.0
    for i, (a, b) in enumerate(states):
        w = dist[i]
        p5 = rate_at(a, base5, h5, s_start, s_slope)
        r5 += w * p5
        r4 += w * (1.0 - p5) * rate_at(b, base4, h4, s4_start, s4_slope)
    return r5, r4, 1.0 - r5 - r4


def exact_pure4(cfg):
    """纯 4★ 池的综合出率（单维递推：池内没有 5★，只有 4★ 保底）。

    这类池子的规则是 4★ 基础 + 可选的第 N 抽软提升 + 每 hard4 抽必出，
    与主池的二维模型无关，单独算才准。
    """
    p = cfg.get("pure4")
    if not p:
        return None
    base4 = p["base4"]
    h4 = p["hard4"]
    s = p.get("softStart4")
    sl = p.get("softSlope4", 0.0)
    surv, expect = 1.0, 0.0
    for k in range(1, h4 + 1):
        pr = rate_at(k, base4, h4, s, sl)
        expect += k * surv * pr
        surv *= (1.0 - pr)
    return 1.0 / expect


# ---------------------------------------------------------------- B. 蒙特卡洛
def simulate(cfg, pulls, seed=20261019):
    """模拟 pulls 次单抽，返回各级实际出率、5★ 间隔、4★ 间隔"""
    rng = random.Random(seed)
    base5, base4 = cfg["rates"]["base"]["5"], cfg["rates"]["base"]["4"]
    h5, h4 = cfg["pity"]["5"]["hard"], cfg["pity"]["4"]["hard"]
    s_start, s_slope = cfg["pity"]["5"]["softStart"], cfg["pity"]["5"]["softSlope"]

    pity5 = pity4 = 0
    cnt = Counter()
    gap5 = []           # 每次 5★ 的间隔
    gap4 = []           # 每次 4★ 的间隔（与引擎一致：5★ 只顺延、不清零）
    since5 = 0
    since4 = 0

    for _ in range(pulls):
        pity5 += 1
        pity4 += 1
        since5 += 1
        since4 += 1

        p5 = rate_at(pity5, base5, h5, s_start, s_slope)
        if rng.random() < p5:
            rarity = 5
        elif pity4 >= h4 or rng.random() < base4:
            rarity = 4
        else:
            rarity = 3

        cnt[rarity] += 1
        if rarity == 5:
            gap5.append(since5)
            since5 = 0
            pity5 = 0
        if rarity == 4:
            gap4.append(since4)
            since4 = 0
            pity4 = 0

    return cnt, gap5, gap4


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pulls", type=int, default=200000)
    args = ap.parse_args()

    cfg = json.load(open(MAP, encoding="utf-8"))["rules"]
    tgt = cfg["rates"]["effective"]

    print("=" * 66)
    print(" 抽卡概率校验")
    print("=" * 66)
    print(f"规则来源: {os.path.relpath(MAP, ROOT)}")
    print(f"消耗: {cfg['cost']['perPull']} × {cfg['cost']['item']}/抽  "
          f"无限={cfg['cost']['infinite']}  不足弹窗={cfg['cost']['insufficientPopup']}")
    print(f"保底: 5★ {cfg['pity']['5']['hard']} 抽硬保底（第 {cfg['pity']['5']['softStart']} 抽起软保底 "
          f"+{cfg['pity']['5']['softSlope']*100:.3f}%/抽），4★ {cfg['pity']['4']['hard']} 抽硬保底"
          f"（5★ 只顺延、不清零 4★ 计数）")
    print(f"跨池继承: {cfg['pity']['inheritAcrossBanners']}   海风祝颂: {cfg['wishSelect']['enabled']}")

    # ---- A
    print("\n【A】马尔可夫链精确解（状态 = 5★计数 × 4★计数）")
    e5, e4, e3 = exact_effective(cfg)
    print(f"  5★ {e5*100:.4f}%  (目标 {tgt['5']*100:.2f}%)  偏差 {(e5-tgt['5'])*100:+.4f}pp")
    print(f"  4★ {e4*100:.4f}%  (目标 {tgt['4']*100:.2f}%)  偏差 {(e4-tgt['4'])*100:+.4f}pp")
    print(f"  3★ {e3*100:.4f}%  (目标 {tgt['3']*100:.2f}%)  偏差 {(e3-tgt['3'])*100:+.4f}pp")
    print(f"  5★ 期望间隔 {1/e5:.3f} 抽/个   4★ 期望间隔 {1/e4:.3f} 抽/个")

    # 纯 4★ 池（池内没有 5★）单独一套规则，不参与上面的二维模型
    ep4 = exact_pure4(cfg)
    if ep4 is not None:
        p4 = cfg["pure4"]
        soft = (f"，第 {p4['softStart4']} 抽起 +{p4.get('softSlope4', 0)*100:.2f}%/抽"
                if p4.get("softStart4") else "")
        print(f"\n  纯 4★ 池: 4★ 基础 {p4['base4']*100:.2f}%{soft}，"
              f"{p4['hard4']} 抽必出")
        print(f"  综合 {ep4*100:.4f}%  (目标 {p4['effective4']*100:.2f}%)  "
              f"偏差 {(ep4-p4['effective4'])*100:+.4f}pp  平均 {1/ep4:.3f} 抽/个")

    # ---- B
    print(f"\n【B】蒙特卡洛 {args.pulls:,} 抽")
    cnt, gap5, gap4 = simulate(cfg, args.pulls)
    total = sum(cnt.values())
    print(f"  5★ {cnt[5]/total*100:.4f}%  ({cnt[5]:,} 个)  偏差 {(cnt[5]/total-tgt['5'])*100:+.4f}pp")
    print(f"  4★ {cnt[4]/total*100:.4f}%  ({cnt[4]:,} 个)  偏差 {(cnt[4]/total-tgt['4'])*100:+.4f}pp")
    print(f"  3★ {cnt[3]/total*100:.4f}%  ({cnt[3]:,} 个)  偏差 {(cnt[3]/total-tgt['3'])*100:+.4f}pp")

    if gap5:
        gap5.sort()
        n = len(gap5)
        print(f"\n  5★ 间隔分布（{n:,} 次）: 平均 {sum(gap5)/n:.2f}  中位 {gap5[n//2]}  "
              f"最大 {gap5[-1]}  最短 {gap5[0]}")
        dist = Counter(gap5)
        print("  间隔直方图:")
        for k in sorted(dist):
            bar = "█" * max(1, round(dist[k] / n * 60))
            print(f"    {k:2} 抽 | {bar} {dist[k]/n*100:5.1f}%")

    # ---- C
    print("\n【C】4★ 间隔分布（条件概率）— 模拟 vs 实机")
    real4 = real_gap4()
    g4 = Counter(gap4)
    alive4 = sum(g4.values())
    shape4 = {}
    print("    抽      模拟      实机")
    for k in range(1, 14):
        c = (g4.get(k, 0) / alive4) if alive4 else 0.0
        shape4[k] = c
        r = real4.get(k)
        print(f"    {k:>2}  {c*100:7.2f}%  " + (f"{r*100:7.2f}%" if r is not None else "      —"))
        alive4 -= g4.get(k, 0)

    # ---- 判定
    print("\n【判定】")
    ok = True
    for name, got, want, tol in (
        ("5★ 精确", e5, tgt["5"], 0.0005),
        ("4★ 精确", e4, tgt["4"], 0.0005),
        ("3★ 精确", e3, tgt["3"], 0.0005),
    ):
        good = abs(got - want) <= tol
        ok &= good
        print(f"  {name} {'PASS' if good else 'FAIL'}  "
              f"(|{got*100:.3f}% - {want*100:.2f}%| = {abs(got-want)*100:.4f}pp ≤ {tol*100:.2f}pp)")
    for name, got, want, tol in (
        ("5★ 模拟", cnt[5]/total, tgt["5"], 0.002),
        ("4★ 模拟", cnt[4]/total, tgt["4"], 0.003),
    ):
        good = abs(got - want) <= tol
        ok &= good
        print(f"  {name} {'PASS' if good else 'FAIL'}  "
              f"(|{got*100:.3f}% - {want*100:.2f}%| = {abs(got-want)*100:.4f}pp ≤ {tol*100:.1f}pp)")

    if ep4 is not None:
        want = cfg["pure4"]["effective4"]
        good = abs(ep4 - want) <= 0.0005
        ok &= good
        print(f"  纯 4★ 精确 {'PASS' if good else 'FAIL'}  "
              f"(|{ep4*100:.3f}% - {want*100:.2f}%| = {abs(ep4-want)*100:.4f}pp ≤ 0.05pp)")

    # 4★ 间隔形状：实机 1~9 抽恒 3.4%、第 10 抽 94.5%、11 抽 98.5%
    lo = min(shape4[k] for k in range(1, 10))
    hi = max(shape4[k] for k in range(1, 10))
    good = 0.030 <= lo and hi <= 0.039
    ok &= good
    print(f"  4★ 1~9 抽条件概率 {'PASS' if good else 'FAIL'}  ({lo*100:.2f}%~{hi*100:.2f}%，实机 3.3%~3.5%)")
    good = 0.92 <= shape4[10] <= 0.97
    ok &= good
    print(f"  4★ 第 10 抽条件概率 {'PASS' if good else 'FAIL'}  ({shape4[10]*100:.2f}%，实机 94.49%)")
    good = shape4[11] >= 0.90
    ok &= good
    print(f"  4★ 第 11 抽条件概率 {'PASS' if good else 'FAIL'}  ({shape4[11]*100:.2f}%，实机 98.47%)")

    print("\n" + ("全部通过 ✓" if ok else "存在偏差 ✗"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
