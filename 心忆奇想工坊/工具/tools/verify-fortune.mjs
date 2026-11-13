/**
 * verify-fortune.mjs —— 三合一运势核心算法单测（走 Vite dev server 动态 import）
 *
 * 覆盖《玄学运势-详细设定》§10 第 6 条「三合一测试清单」。
 * 用法：先 npm run dev（端口 5178），再 node tools/verify-fortune.mjs
 */
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const pass = []
const fail = []
const ok = (c, m) => (c ? pass.push(m) : fail.push(m))
const eq = (a, b, m) => ok(a === b, `${m}（期望 ${b}，实际 ${a}）`)

const b = await chromium.launch({ executablePath: CHROME, headless: true })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => {
  if (m.type() === 'error') errs.push('console: ' + m.text())
})
  // v1.6.00 现状口径：主页自 v2.3.x 起循环播 bg-video.webm + bg-audio.ogg，
  // 网络永远不会「空闲」→ waitUntil 必须用 domcontentloaded，不能用 networkidle
await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' })

/* ─────────────── 1. 日柱基准 / 节气边界 ─────────────── */
const base = await p.evaluate(async () => {
  const B = await import('/src/core/bazi.ts')
  const d = (y, m, dd) => new Date(y, m - 1, dd)
  return {
    d1949: B.GAN[B.dayIndex60(d(1949, 10, 1)) % 10] + B.ZHI[B.dayIndex60(d(1949, 10, 1)) % 12],
    d2000: B.GAN[B.dayIndex60(d(2000, 1, 1)) % 10] + B.ZHI[B.dayIndex60(d(2000, 1, 1)) % 12],
    d1984: B.GAN[B.dayIndex60(d(1984, 2, 2)) % 10] + B.ZHI[B.dayIndex60(d(1984, 2, 2)) % 12],
    // 立春边界：2024 立春 2/4 → 2/3 属癸卯年，2/4 起甲辰年
    yBefore: B.baziOf({ year: 2024, month: 2, day: 3, hour: null }).pillars.year.text,
    yAfter: B.baziOf({ year: 2024, month: 2, day: 4, hour: null }).pillars.year.text,
    // 惊蛰 2024 3/5 → 月柱 寅→卯
    mBefore: B.baziOf({ year: 2024, month: 3, day: 4, hour: null }).pillars.month.text,
    mAfter: B.baziOf({ year: 2024, month: 3, day: 5, hour: null }).pillars.month.text,
    // 月干五虎遁：甲年寅月必为丙寅
    jiaYin: B.baziOf({ year: 2024, month: 2, day: 10, hour: null }).pillars.month.text,
    // 时柱五鼠遁：甲日子时 = 甲子
    hourZi: (() => {
      const z = B.baziOf({ year: 2024, month: 2, day: 10, hour: 0 })
      return z.pillars.hour ? z.pillars.hour.text : null
    })(),
    partial: B.baziOf({ year: 1995, month: 6, day: 15, hour: null }).partial,
    full: B.baziOf({ year: 1995, month: 6, day: 15, hour: 9 }).partial,
  }
})
eq(base.d1949, '甲子', '日柱基准 1949-10-01 = 甲子')
eq(base.d2000, '戊午', '日柱互校 2000-01-01 = 戊午')
eq(base.d1984, '丙寅', '日柱 1984-02-02 = 丙寅（旧代码把该日当甲子，偏 2 天）')
eq(base.yBefore, '癸卯', '立春前（2024-02-03）年柱 = 癸卯')
eq(base.yAfter, '甲辰', '立春后（2024-02-04）年柱 = 甲辰')
eq(base.mBefore, '丙寅', '惊蛰前（2024-03-04）月柱 = 丙寅')
eq(base.mAfter, '丁卯', '惊蛰后（2024-03-05）月柱 = 丁卯')
eq(base.jiaYin, '丙寅', '五虎遁：甲年寅月 = 丙寅')
eq(base.partial, true, '缺时辰 → partial')
eq(base.full, false, '有时辰 → 非 partial')

/* ─────────────── 2. 纳音表 ─────────────── */
const ny = await p.evaluate(async () => {
  const N = await import('/src/core/nayin.ts')
  const pick = (i) => N.nayinOf(i)
  const all = []
  for (let i = 0; i < 60; i++) all.push(N.nayinOf(i).name)
  return {
    jiazi: pick(0).name + '/' + pick(0).element,
    bingyin: pick(2).name + '/' + pick(2).element,
    renxu: pick(59).name + '/' + pick(59).element,
    pairs: all.every((v, i) => i % 2 === 1 ? v === all[i - 1] : true),
    distinct: new Set(all).size,
  }
})
eq(ny.jiazi, '海中金/金', '纳音 甲子 = 海中金·金')
eq(ny.bingyin, '炉中火/火', '纳音 丙寅 = 炉中火·火')
eq(ny.renxu, '大海水/水', '纳音 壬戌/癸亥 = 大海水·水')
ok(ny.pairs, '纳音每 2 干支同一条')
eq(ny.distinct, 30, '纳音共 30 条')

/* ─────────────── 3. 七档边界 ─────────────── */
const tiers = await p.evaluate(async () => {
  const A = await import('/src/core/almanac.ts')
  const t = (s) => A.getVerdict(s).label
  return [88, 87, 76, 75, 66, 65, 50, 49, 38, 37, 28, 27, 0, 100].map((s) => `${s}:${t(s)}`)
})
eq(
  tiers.join(' '),
  '88:大吉 87:吉 76:吉 75:小吉 66:小吉 65:平 50:平 49:小凶 38:小凶 37:凶 28:凶 27:大凶 0:大凶 100:大吉',
  '七档边界（88/76/66/50/38/28）',
)

/* ─────────────── 4. 纳音辅参 ─────────────── */
const nb = await p.evaluate(async () => {
  const N = await import('/src/core/nayin.ts')
  const today = N.nayinOf(0) // 海中金·金
  const self = N.nayinOf(0)
  const hit = N.nayinBonus(today, self, ['金'], [], 0)
  const bad = N.nayinBonus(today, self, [], ['金'], 0)
  // 冲突降级：正五行主项为 +10，纳音算出 -7（忌神 -4 + 相克 -3）
  const clash = N.nayinBonus(N.nayinOf(2) /* 炉中火 */, N.nayinOf(0) /* 海中金 */, [], ['火'], 10)
  return {
    hit: hit.score,
    bad: bad.score,
    clash: clash.score,
    noSelf: N.nayinBonus(today, null, ['金'], [], 0).score,
    cap: Math.abs(N.nayinBonus(today, self, ['金'], [], 0).score) <= 8,
  }
})
eq(nb.hit, 5, '纳音：喜用 +4 + 比和 +1 = +5')
eq(nb.bad, -3, '纳音：忌神 -4 + 比和 +1 = -3')
ok(nb.clash <= 3 && nb.clash >= -3, `纳音与正五行相左 → 降级 ≤±3（实际 ${nb.clash}）`)
eq(nb.noSelf, 0, '未填出生日期 → 纳音辅参 0')
ok(nb.cap, '纳音辅参 ≤ ±8')

/* ─────────────── 5. 多动爻口径 / 种子隔离 / D 映射 ─────────────── */
const hex = await p.evaluate(async () => {
  const H = await import('/src/core/hexagram.ts')
  // 找一个各动爻数都出现的日期集合
  const found = {}
  const list = []
  for (let i = 0; i < 12000; i++) {
    const d = new Date(2026, 0, 1 + i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dv = H.divinationOf(key)
    list.push(dv)
    if (found[dv.movingAt.length] === undefined) found[dv.movingAt.length] = dv
  }
  const d0 = H.divinationOf('2026-10-29')
  const d1 = H.divinationOf('2026-10-29')
  // 种子隔离：不同前缀必然不同序列（用同日期两库各取一次比较）
  const seedDiff = H.hashStr('almanac-v1|2026-10-29') !== H.hashStr('hexagram-v1|2026-10-29')
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const v of list) counts[v.movingAt.length]++
  return {
    stable: d0.primary.id === d1.primary.id && d0.d === d1.d,
    seedDiff,
    rule0: found[0] ? found[0].rule : null,
    rule6: found[6] ? found[6].rule : null,
    // 五动：主爻必为唯一不变爻
    rule5ok: found[5]
      ? !found[5].movingAt.includes(found[5].mainLine) && found[5].mainLine >= 1 && found[5].mainLine <= 6
      : null,
    // 二动：主爻 = 最上方动爻
    rule2ok: found[2] ? found[2].mainLine === Math.max(...found[2].movingAt) : null,
    // 四动：主爻 = 最下方动爻
    rule4ok: found[4] ? found[4].mainLine === Math.min(...found[4].movingAt) : null,
    // 三动：主爻 = 排序后第 2 个
    rule3ok: found[3] ? found[3].mainLine === [...found[3].movingAt].sort((a, b) => a - b)[1] : null,
    // 六动：无主爻
    rule6ok: found[6] ? found[6].mainLine === 0 : null,
    dRange: list.every((v) => v.d >= -5 && v.d <= 5),
    dMap: [-2, -1, 0, 1, 2].map((t) => H.tendencyToD(t)).join(','),
    counts,
  }
})
ok(hex.stable, '日课卦同天恒定')
ok(hex.seedDiff, 'almanac / hexagram 种子命名空间独立')
ok(hex.rule2ok, '二动爻 → 取最上方动爻为主爻')
ok(hex.rule3ok, '三动爻 → 取中间动爻为主爻')
ok(hex.rule4ok, '四动爻 → 取最下方动爻为主爻')
ok(hex.rule5ok, '五动爻 → 取唯一不变爻为主爻')
ok(hex.rule6ok, '六动爻 → 无主爻，只看变卦')
ok(hex.dRange, 'D 恒在 -5~+5')
eq(hex.dMap, '-5,-3,0,3,5', 'tendency → D 映射表')
ok(hex.counts[0] > 0 && hex.counts[6] > 0, `12000 天动爻分布 ${hex.counts.join('/')}`)

/* ─────────────── 6. C 分范围 / 综合分 / 标准差 ─────────────── */
const fin = await p.evaluate(async () => {
  const F = await import('/src/core/fortune.ts')
  const d = new Date(2026, 9, 29)
  const noBirth = F.fortuneOf(d, { birth: null, uid: 'u-test' })
  // 20 组不同八字同日
  const totals = []
  for (let i = 0; i < 20; i++) {
    const y = 1970 + i * 2
    const r = F.fortuneOf(d, { birth: { year: y, month: ((i * 5) % 12) + 1, day: ((i * 7) % 27) + 1, hour: i % 24 }, uid: 'u-test' })
    totals.push(r.total)
  }
  const mean = totals.reduce((a, b) => a + b, 0) / totals.length
  const sd = Math.sqrt(totals.reduce((a, b) => a + (b - mean) ** 2, 0) / totals.length)
  // C 分极值扫描
  let cMin = 999
  let cMax = -999
  for (let i = 0; i < 200; i++) {
    const dd = new Date(2026, 0, 1 + i)
    const r = F.fortuneOf(dd, { birth: null, uid: 'u-test' })
    cMin = Math.min(cMin, r.c)
    cMax = Math.max(cMax, r.c)
  }
  const same1 = F.fortuneOf(d, { birth: { year: 1995, month: 6, day: 15, hour: 9 }, uid: 'u-a' })
  const same2 = F.fortuneOf(d, { birth: { year: 1995, month: 6, day: 15, hour: 9 }, uid: 'u-a' })
  const other = F.fortuneOf(d, { birth: { year: 1995, month: 6, day: 15, hour: 9 }, uid: 'u-b' })
  return {
    noBirthHasBazi: noBirth.bazi !== null,
    noBirthTotal: noBirth.total,
    cMin,
    cMax,
    sd: Math.round(sd * 10) / 10,
    stable: same1.total === same2.total && same1.b === same2.b,
    totalRange: [noBirth.total, ...totals].every((v) => v >= 0 && v <= 100),
    formula: same1.formula,
    partialNarrow: (() => {
      const r = F.fortuneOf(d, { birth: { year: 1995, month: 6, day: 15, hour: null }, uid: 'u-a' })
      return r.b !== null && r.b >= 35 && r.b <= 65
    })(),
  }
})
eq(fin.noBirthHasBazi, false, '未填出生日期 → 八字层为 null（降级双模式）')
ok(fin.cMin >= 29 && fin.cMax <= 83, `C 分范围 [${fin.cMin}, ${fin.cMax}] 落在 29~83`)
ok(fin.sd >= 6, `20 组八字同日综合分标准差 ${fin.sd}（要求 ≥ 6，即原 ×0.92~1.08 模型的 2 倍）`)
ok(fin.stable, '同天 + 同用户 → 结果恒定')
ok(fin.totalRange, '综合分恒在 0~100')
ok(fin.partialNarrow, '缺时辰 → B 收窄到 35~65')

/* ─────────────── 7. 文案库条数 ─────────────── */
const lib = await p.evaluate(async () => {
  const T = await import('/src/core/fortuneTexts.ts')
  const H = await import('/src/core/hexagram.ts')
  const tri = new Set()
  for (const h of T.HEXAGRAMS) tri.add(`${h.upper}|${h.lower}`)
  return {
    hex: T.HEXAGRAMS.length,
    slips: T.SLIPS.length,
    maxims: T.MAXIMS.length,
    uniqueTri: tri.size,
    idsOk: T.HEXAGRAMS.every((h, i) => h.id === i + 1),
    allMapped: T.HEXAGRAMS.every((h) => Object.keys(T.HEX_BY_TRIGRAM).length === 64),
    primaryOk: T.HEXAGRAMS.every((h) => h.keywords.length >= 1 && h.keywords[0].length > 0),
    themeOk: T.HEXAGRAMS.every((h) => h.theme.length >= 1 && h.theme.length <= 2),
    // 64 卦上下卦组合必须两两不同
    triOk: tri.size === 64,
    dOf: T.HEXAGRAMS.map((h) => H.tendencyToD(h.tendency)),
  }
})
eq(lib.hex, 64, '解卦库 64 条')
eq(lib.slips, 36, '签文库 36 条')
eq(lib.maxims, 30, '箴言库 30 条')
ok(lib.idsOk, '卦序号 1~64 连续')
ok(lib.triOk, '64 卦上下卦组合两两不同（起卦可逆）')
ok(lib.themeOk, '每卦 theme 1~2 个')
ok(lib.primaryOk, '每卦都有 primaryKeyword')

/* ─────────────── 输出 ─────────────── */
if (errs.length) fail.push('页面报错：' + errs.slice(0, 3).join(' | '))
console.log(`\n通过 ${pass.length} 项`)
for (const m of pass) console.log('  ✓ ' + m)
if (fail.length) {
  console.log(`\n失败 ${fail.length} 项`)
  for (const m of fail) console.log('  ✗ ' + m)
}
console.log(fail.length ? '\nFAIL' : '\nALL PASS')
await b.close()
process.exit(fail.length ? 1 : 0)
