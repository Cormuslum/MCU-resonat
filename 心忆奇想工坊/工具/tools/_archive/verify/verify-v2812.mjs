/**
 * v1.6.09 验收 · 服装图鉴的版本分组与大版本名
 *
 * 用户报的两件事，根因完全不同：
 *
 *   A. 大版本「奇迹传说」在服装图鉴里**不显示名字**，只剩一个「0」。
 *      根因：`MuseumClothes.vue` 里写死 `{ 1: 心愿原野, 2: 伊赞之土 }`，
 *      版本名也写死 24 个官方版本 —— 工坊新建的 0.1 只能显示成「0.1」。
 *
 *   B. 0.1「祈愿星」的两套被归到 1.0「探索季」，于是 0.1 整版空白。
 *      根因有两层：
 *        ① 工坊早期把这两套的 `首发` 记成了 `1.0探索季`；
 *        ② `meta.upsertSet()` 的更新分支**从不刷新 `首发`**，再导一次也改不回来；
 *        ③ `build-pool-map.load_set_info()` 虽然注释写「CSV 优先」，
 *           实际 xlsx 后读且会覆盖初始行 —— CSV 改对了也被旧值顶回去。
 *
 * 所以本脚本三层都验：数据自洽 → 页面渲染 → 采集脚本的优先级。
 *
 * ⚠️ v1.7.00 起图鉴**分组口径变了**：不再按「套装首发版本」分组，改按「阁所在版本」分组
 *    （0.1 / 0.2 是工坊自建阁，里面的套装首发都在正式版本 —— 用户要的是「这些阁里有什么」）。
 *    因此本脚本的 K2 / U7 判据同步改成「每个有阁的版本，套装栏 = 该版本各阁的套装并集」，
 *    原来那句「纯复刻版本为空属正常」不再成立。
 *
 * 用法：先 `npx vite`（5178），再 `node tools/verify-v2812.mjs`
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const SAVE_KEY = 'nikki-resonance-save-v1'
const ROOT = path.resolve('.')
const OUT = '.shots'

fs.mkdirSync(OUT, { recursive: true })

let pass = 0
let fail = 0
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? `  ${detail}` : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${detail ? `  ${detail}` : ''}`) }
}
function head(t) { console.log(`\n${t}`) }

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/manifest.json'), 'utf8'))
const VERSIONS = manifest.ui.ver.versions ?? []

/** 版本号比较（"0.1" < "1.0" < "1.10"） */
function cmpVer(a, b) {
  const x = String(a).split('.').map(Number)
  const y = String(b).split('.').map(Number)
  return (x[0] - y[0]) || ((x[1] ?? 0) - (y[1] ?? 0))
}
/** 精确前缀匹配（避免 1.1 命中 1.10） */
function inVersion(label, v) {
  return label.startsWith(v) && !/^\d/.test(label.slice(v.length))
}
/** `首批/首发` 这类标签前面那段版本号 */
function verOfLabel(label) {
  return (String(label).match(/^\d+\.\d+/) || [''])[0]
}

/**
 * 图鉴里某版本能看到多少套。
 *
 * ⚠ v1.7.00 改了分组口径：以前按**套装首发版本**分组，现在按**阁所在版本**分组
 * （0.1 祈愿星 / 0.2 魂灵生 是工坊自建阁，阁里的套装首发都在正式版本）。
 * 所以这里直接把「该版本的阁里出现过的套装」按 id 去重。
 */
function suitsOfVersion(v) {
  const out = []
  const seen = new Set()
  for (const b of manifest.banners) {
    if (b.version !== v) continue
    for (const s of b.sets ?? []) {
      if (!s.id || seen.has(s.id)) continue
      seen.add(s.id)
      out.push({ set: s, banner: b })
    }
  }
  return out
}

/* ═══════════════════════════ 一、数据自洽 ═══════════════════════════ */

head('【一、数据：套装的首发版本必须自洽】')

/**
 * 1. 「首发阁」与「首发版本」必须自洽。
 *
 * 判据不是「首发不能晚于所在阁」——那会把**常驻/兑换套装被放进限时阁**误判成错
 * （用户样本里 0.1 的阁放的是 1.5 首发的星之海，来源写的是「无限之心」，完全合法）。
 * 真正的不自洽只有一种：**这套的来源阁就是它现在这座阁，但首发版本却不是这座阁的版本**。
 * 2026-11-05 那次「0.1 两套挂到 1.0」正是这个形态（来源=心愿栖金蕊，首发=1.0探索季）。
 */
{
  const bannerByName = new Map(manifest.banners.map((b) => [b.name, b]))
  const bad = []
  let checked = 0
  for (const b of manifest.banners) {
    for (const s of b.sets ?? []) {
      const num = verOfLabel(s.firstVersion || '')
      if (!num) { bad.push(`${b.id}/${s.id} 首发为空或不可解析：${JSON.stringify(s.firstVersion)}`); continue }
      const originBanner = bannerByName.get(String(s.origin || '').trim())
      if (!originBanner || originBanner.id !== b.id) continue // 常驻/兑换来源、或是复刻，跳过
      checked++
      if (!inVersion(s.firstVersion, b.version)) {
        bad.push(`${b.id}/${s.id} ${s.name} 来源就是本阁，首发却是 ${s.firstVersion}（本阁是 ${b.version}）`)
      }
    }
  }
  ok(bad.length === 0, 'K1 套装的首发版本与「首发阁」一致',
    bad.length ? bad.slice(0, 3).join('；') : `校验 ${checked} 套（来源=本阁的那些）`)
}

// 2. 每个「有阁」的版本在图鉴里都不能空 —— 否则那一版就是空白页（用户 11-05 报的就是这个）。
//    v1.7.00 起分组口径改成「阁所在版本」，所以**任何有阁的版本都必然有内容**，
//    「纯复刻版本为空」这个借口不再成立。
{
  const vers = [...new Set(manifest.banners.map((b) => b.version))].sort(cmpVer)
  const empty = vers.filter((v) => suitsOfVersion(v).length === 0)
  ok(empty.length === 0, 'K2 有阁的版本在图鉴里都不为空',
    empty.length ? `空白版本：${empty.map((v) => `${v}(${manifest.banners.filter((b) => b.version === v).length} 阁)`).join(' / ')}` : `${vers.length} 个版本`)
}

// 3. 首发标签里的版本号必须是**版本表里真实存在的版本**，否则图鉴里会挂到不存在的版本上
{
  const known = new Set(VERSIONS.map((x) => x.v))
  const bad = []
  for (const b of manifest.banners) {
    for (const s of b.sets ?? []) {
      const num = verOfLabel(s.firstVersion || '')
      if (num && !known.has(num)) bad.push(`${s.id} ${s.name} → ${s.firstVersion}`)
    }
  }
  ok(bad.length === 0, 'K3 首发版本号都在版本表里', bad.length ? bad.slice(0, 3).join('；') : `${known.size} 个版本`)
}

// 4. 套装序列.csv 里「来源阁名 = 某个阁」的初始行，`首发` 必须以那个阁的版本开头
//    （这条正是 0.1 那次错的形态：来源=心愿栖金蕊，首发却写 1.0探索季）
{
  const bannerByName = new Map(manifest.banners.map((b) => [b.name, b]))
  const txt = fs.readFileSync(path.join(ROOT, '素材/信息表/套装序列.csv'), 'utf8').replace(/^\uFEFF/, '')
  const lines = txt.split(/\r?\n/).filter(Boolean)
  const head0 = lines[0].split(',')
  const col = (k) => head0.indexOf(k)
  const bad = []
  let checked = 0
  for (const ln of lines.slice(1)) {
    const c = ln.split(',')
    if ((c[col('进化等阶')] || '初始') !== '初始') continue
    const b = bannerByName.get((c[col('来源/阁名')] || '').trim())
    if (!b) continue // 商城 / 宝箱 / 限时活动 这类来源没有对应阁，跳过
    checked++
    const label = (c[col('首发')] || '').trim()
    if (!label.startsWith(b.version)) bad.push(`${c[col('套装名')]} 首发=${label} 但它在 ${b.version} 的阁「${b.name}」`)
  }
  ok(bad.length === 0, 'K4 CSV 里「来源阁」与「首发版本」对得上',
    bad.length ? bad.slice(0, 3).join('；') : `校验 ${checked} 套`)
}

/* ═══════════════════════════ 二、页面渲染 ═══════════════════════════ */

head('【二、服装图鉴：大版本名与版本名来自 manifest】')

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
await ctx.addInitScript(([k, v]) => {
  if (localStorage.getItem(`${k}-seeded`)) return
  localStorage.setItem(k, v)
  localStorage.setItem(`${k}-seeded`, '1')
}, [SAVE_KEY, JSON.stringify({
  version: 1, selectedVersion: '2.11', pity: {}, codex: {}, milestoneClaimed: [], history: [],
  settings: { skipAnim: true, skipOpening: true, skipGacha: true },
})])
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

await page.goto(`${BASE}/#/codex/clothes`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !document.querySelector('.loading'), { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(1500)

const majors = await page.$$eval('.cl-vmajor', (els) =>
  els.map((e) => e.querySelector('.vm-txt')?.textContent?.trim() ?? ''))

// 期望：每个大版本 id 的名称 = manifest 里该组第一个带 majorName 的版本
// 大版本 id 取**版本号首位**（0.1 → 0），不看 `major` 列：
// 该列是冗余数据，曾经被填错（0.2 写成大版本 2），按它取会把「伊赞之土」的标签弄丢。
const wantMajors = new Map()
for (const m of VERSIONS) {
  const id = String(m.v || '').split('.')[0]
  if (id && m.majorName && !wantMajors.has(id)) wantMajors.set(id, m.majorName)
}
const wantLabels = [...wantMajors.values()]
{
  const missing = wantLabels.filter((l) => !majors.includes(l))
  ok(missing.length === 0, 'U1 大版本按钮显示 manifest 里的 majorName',
    missing.length ? `缺：${missing.join(' / ')}（实际 ${JSON.stringify(majors)}）` : majors.join(' / '))
}
// 纯数字标签 = 没取到名字（用户截图里的那个「0」）
{
  const numeric = majors.filter((l) => /^\d+$/.test(l))
  ok(numeric.length === 0, 'U2 没有只剩数字的大版本标签', numeric.length ? `纯数字：${numeric.join(',')}` : '全部有名字')
}
// 大版本顺序 = 数字升序（0 在最前）
{
  const ids = [...wantMajors.keys()].map(Number).sort((a, b) => a - b)
  const gotIds = majors.map((l) => [...wantMajors.entries()].find(([, n]) => n === l)?.[0]).filter(Boolean).map(Number)
  ok(JSON.stringify(gotIds) === JSON.stringify(ids), 'U3 大版本按数字升序排（0 在最前）', `页面 ${gotIds.join(',')} / 期望 ${ids.join(',')}`)
}

// 展开每个大版本组，收集所有小版本的「版本号 + 版本名」
await page.evaluate(() => {
  for (const el of document.querySelectorAll('.cl-vmajor')) {
    if (!el.classList.contains('open')) el.click()
  }
})
await page.waitForTimeout(800)
const minors = await page.$$eval('.cl-vminor', (els) => els.map((e) => ({
  ver: e.querySelector('.vn-ver b')?.textContent?.trim() ?? '',
  name: e.querySelector('.vn-name')?.textContent?.trim() ?? '',
})))

{
  const nameOf = new Map(VERSIONS.map((x) => [x.v, x.name]))
  const bad = minors.filter((m) => nameOf.has(m.ver) && nameOf.get(m.ver) && m.name !== nameOf.get(m.ver))
  ok(bad.length === 0, 'U4 小版本的版本名与 manifest 一致',
    bad.length ? bad.slice(0, 3).map((m) => `${m.ver} 显示「${m.name}」应为「${nameOf.get(m.ver)}」`).join('；') : `${minors.length} 个版本`)
}
{
  // 版本号本身必须出现在列表里（不能因为没版本卡素材就整行消失）
  const vers = [...new Set(manifest.banners.map((b) => b.version))]
  const miss = vers.filter((v) => !minors.some((m) => m.ver === v))
  ok(miss.length === 0, 'U5 有阁的版本都出现在赛季栏', miss.length ? `缺：${miss.join(',')}` : `${vers.length} 个`)
}
{
  const zero = minors.filter((m) => m.ver.split('.')[0] === '0')
  const named = zero.every((m) => m.name && m.name !== m.ver)
  ok(zero.length > 0 && named, 'U6 新大版本 0 的版本行有名字（不是只剩版本号）',
    zero.map((m) => `${m.ver} ${m.name}`).join(' / ') || '没找到 0.x 版本')
}

// 点进每个版本，确认套装栏出来的正好是「该版本的阁里出现过的套装」
// ⚠ 用小版本在列表里的**下标**点（`page.evaluate` 里直接 `.click()`）：
//    三个大版本组同时展开时，小版本行会互相压住，Playwright 的真实鼠标点击
//    会被上层 `.vm-bg` 拦住（报 "intercepts pointer events"）。
{
  const vers = [...new Set(manifest.banners.map((b) => b.version))].sort(cmpVer)
  const bad = []
  for (const v of vers) {
    const idx = minors.findIndex((m) => m.ver === v)
    if (idx < 0) { bad.push(`${v}(赛季栏行缺失)`); continue }
    await page.evaluate((i) => document.querySelectorAll('.cl-vminor')[i]?.click(), idx)
    await page.waitForTimeout(180)
    const names = await page.$$eval('.st-name', (els) => els.map((e) => e.textContent.trim()))
    const want = suitsOfVersion(v).map((r) => r.set.name)
    const miss = want.filter((n) => !names.includes(n))
    if (miss.length || names.length !== want.length) {
      bad.push(`${v} 页面 ${names.length} 套 / 期望 ${want.length} 套${miss.length ? `（缺 ${miss.slice(0, 2).join('、')}）` : ''}`)
    }
  }
  ok(bad.length === 0, 'U7 每个版本的套装栏 = 该版本各阁的套装并集',
    bad.length ? bad.slice(0, 4).join('；') : `${vers.length} 个版本`)
}

ok(errors.length === 0, 'U8 无控制台报错', errors.slice(0, 2).join(' | '))

await page.screenshot({ path: path.join(OUT, 'v2812-clothes.png') })
await browser.close()

/* ═══════════════════════════ 三、采集脚本的优先级 ═══════════════════════════ */

head('【三、build-pool-map：CSV 必须真的压过 xlsx】')

{
  const src = fs.readFileSync(path.join(ROOT, 'tools/build-pool-map.py'), 'utf8')
  // CSV 与 xlsx 两次 take() 必须带不同优先级，且 CSV 更高
  const csvPrio = /p=2,/.test(src)
  const xlsPrio = /p=1,/.test(src)
  ok(csvPrio && xlsPrio, 'S1 两个数据源都显式声明了优先级（CSV=2 / xlsx=1）',
    `csv=${csvPrio} xlsx=${xlsPrio}`)
  ok(/cur > p/.test(src), 'S2 低优先级不许覆盖高优先级', /cur > p/.test(src) ? '已实现' : '缺失')
}

{
  // 实测：CSV 改一个值，跑一次 load_set_info，确认读到的是 CSV 的值
  const { execFileSync } = await import('node:child_process')
  const probe = `
import io, os, sys, importlib.util
spec = importlib.util.spec_from_file_location('bpm', r'${path.join(ROOT, 'tools/build-pool-map.py').replace(/\\/g, '\\\\')}')
m = importlib.util.module_from_spec(spec)
sys.argv = ['bpm']
spec.loader.exec_module(m)
info = m.load_set_info()
bad = [n for n, v in info.items() if v.get('firstVersion') == '1.0探索季' and v.get('origin') == '心愿栖金蕊']
print('PROBE', len(info), len(bad))
`
  let out = ''
  try {
    out = execFileSync('python', ['-c', probe], { encoding: 'utf8', timeout: 120000 })
  } catch (e) {
    out = String(e.stdout || '')
  }
  const mm = out.match(/PROBE (\d+) (\d+)/)
  ok(!!mm, 'S3 能执行 load_set_info 取样', mm ? `返回 ${mm[1]} 套` : out.slice(0, 200))
  if (mm) ok(Number(mm[2]) === 0, 'S4 心愿栖金蕊两套的首发不再是 1.0探索季', `命中 ${mm[2]} 条`)
}

/* ═══════════════════════════ 汇总 ═══════════════════════════ */

console.log('\n──────────────────────────────────────────')
if (fail === 0) console.log(`✓ ${pass} / ${pass} PASS`)
else console.log(`✗ ${pass} 通过 · ${fail} 失败（共 ${pass + fail}）`)
console.log('=== 验证完成 ===')
process.exit(fail === 0 ? 0 : 1)
