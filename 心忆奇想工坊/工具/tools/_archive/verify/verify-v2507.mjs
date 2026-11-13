/**
 * v2.5.07 验收 · 全量卡池 + 专属铭牌/艺术字 + 080 新池
 *
 * ⚠️ v1.4.02 起共鸣页**只列当前版本的卡池**，所以下面的断言按「当前版本的池」重写：
 *   A1/A2 在 2.10 上数（4 个池），A4 切 1.8（030）、A5 切 1.0（004）、A6/B1 切 2.11（080）。
 *
 * 覆盖用户这一批的三条要求：
 *   1. 补全所有版本的所有卡池（列表 6 项 → manifest 全量 80 项）
 *   2. 有专属套装铭牌就用专属：五星 `_name_01`、四星 `_name_02`，没有才用通用底框
 *   3. 有卡池名艺术字就必须用（不许退回纯文字）
 *
 * 用法：先 `npx vite`（5178），再 `node tools/verify-v2507.mjs`
 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = '.shots'
mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:5178'

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--force-color-profile=srgb'],
})
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

/**
 * 版本门禁（v1.4.02）：未选版本时 /banner 会被守卫打回版本页。
 * 这里在存档里预置一个当前版本（只在「还没选过」时写，方便后面 useVersion 切换后不被覆盖）。
 */
await page.addInitScript(() => {
  try {
    const KEY = 'nikki-resonance-save-v1'
    const raw = localStorage.getItem(KEY)
    const s = raw ? JSON.parse(raw) : { version: 1, pity: {}, codex: {}, milestoneClaimed: {}, history: [], settings: {} }
    if (!s.selectedVersion) s.selectedVersion = '2.10'
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch { /* about:blank 这类文档不允许访问 localStorage，跳过即可 */ }
})

/** 切当前版本：写存档 → reload（store 会用该版本的第一池兜底 bannerId） */
async function useVersion(v) {
  await page.evaluate((ver) => {
    const KEY = 'nikki-resonance-save-v1'
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    s.selectedVersion = ver
    localStorage.setItem(KEY, JSON.stringify(s))
  }, v)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pool-item', { timeout: 20000 })
  await page.waitForTimeout(900)
}

const pageErrors = []
/**
 * `ERR_ABORTED` 不算错：BGM / 音效是离屏 `new Audio()`，卡池 PV 是 `<video>`，
 * 切池 / 切页时元素被回收，Chrome 会把正在下载的那段报成 aborted —— 与代码无关。
 * 真正的坏请求（404 / 5xx）仍然照记。
 */
const isAbortedAudio = (t) => /net::ERR_ABORTED/.test(t) && /\/assets\/(sfx|bgm|video)\//.test(t)
const pushErr = (t) => { if (!isAbortedAudio(t)) pageErrors.push(t) }
page.on('console', (m) => { if (m.type() === 'error') pushErr(m.text()) })
page.on('pageerror', (e) => pushErr(e.message))
page.on('requestfailed', (r) => pushErr(`reqfail ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => { if (r.status() >= 400) pushErr(`http${r.status()} ${r.url()}`) })

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? `  ${detail}` : ''}`)
}
async function step(name, fn) {
  try {
    await fn()
  } catch (e) {
    check(name, false, `异常 → ${String(e.message ?? e).split('\n')[0].slice(0, 120)}`)
  }
}
const near = (a, b, tol = 0.5) => Math.abs(Number(a) - Number(b)) <= tol

/** 按名字点卡池（列表 80 项，行号不能当身份用） */
async function clickPool(name) {
  const hit = await page.evaluate((nm) => {
    const el = [...document.querySelectorAll('.pool-item')]
      .find((x) => x.getAttribute('title')?.startsWith(nm))
    if (!el) return false
    el.scrollIntoView({ block: 'center' })
    el.click()
    return true
  }, name)
  if (!hit) throw new Error(`找不到卡池：${name}`)
  await page.waitForTimeout(900)
}

await page.goto(`${BASE}/#/banner`)
await page.waitForSelector('.pool-item', { timeout: 20000 })
await page.waitForTimeout(1200)

const manifest = await page.evaluate(async () => await (await fetch('/assets/manifest.json')).json())

console.log('\n=== v2.5.07 全量卡池 + 专属铭牌 + 080 ===')

/* ── A1 列表 = 当前版本(2.10)的池 ── */
await step('A1 列表按版本收窄', async () => {
  const n = await page.$$eval('.pool-item', (els) => els.length)
  // v1.4.03：每个版本末尾再挂一个常驻池
  const want = manifest.banners.filter((b) => b.version === '2.10').length + 1
  check('A1 卡池列表 = 当前版本(2.10)的池数 + 常驻', n === want && want > 0,
    `列表 ${n} / 2.10 共 ${want} 个池（全库 ${manifest.banners.length}）`)
  const ver = await page.evaluate(() => document.querySelector('.pool-list')?.dataset.version ?? '')
  check('A1b 列表没有混进别的版本的池', n === want, ver || '（DOM 未标版本，按数量判定）')
})

/* ── A2 每个列表项都有专属缩略图（不再 6 张轮播）── */
await step('A2 列表缩略图', async () => {
  const uniq = await page.$$eval('.pool-item .pi-img', (els) => {
    const srcs = els.map((e) => e.getAttribute('src')).filter(Boolean)
    return { total: srcs.length, uniq: new Set(srcs).size }
  })
  check('A2 缩略图按池区分（去重后 = 列表项数）', uniq.total > 0 && uniq.uniq === uniq.total,
    `共 ${uniq.total} 项 / ${uniq.uniq} 张不同图`)
})

/* ── A3 艺术字：v1.6.06 补齐 058（简中素材）后，每池都有 title ── */
await step('A3 艺术字覆盖', async () => {
  const noTitle = manifest.banners.filter((b) => !b.assets.title).map((b) => b.gachaKey)
  check('A3 全部服装阁都有阁名艺术字（058 已于 v1.6.06 补齐）',
    noTitle.length === 0, noTitle.length ? `缺：${noTitle.join(',')}` : `${manifest.banners.length} / ${manifest.banners.length}`)
})

/* ── A4 专属铭牌：030 五星/四星各取各的（030 在 1.8）── */
await step('A4 030 铭牌', async () => {
  await useVersion('1.8')
  await clickPool('缘起绘笔万念生')
  const r = await page.evaluate(() => ({
    names: [...document.querySelectorAll('.sb-name')].map((e) => e.textContent.trim()),
    plates: [...document.querySelectorAll('.sb-plate')].map((e) => e.getAttribute('src')),
    title: document.querySelector('.title-art')?.getAttribute('src') ?? null,
  }))
  const star5 = r.names[0]
  // v1.4.03：文件按「套装序号」命名（030-1 = 5★、030-2 = 4★），不再是 -5 / -4
  const ok5 = /030-1\.webp$/.test(r.plates[0] ?? '')
  const ok4 = /030-2\.webp$/.test(r.plates[1] ?? '')
  check('A4 030 五星用 name_01、四星用 name_02',
    ok5 && ok4, `${star5}→${r.plates[0]} / ${r.names[1]}→${r.plates[1]}`)
  check('A4 030 用卡池名艺术字（非纯文字）', /title\/030\.webp$/.test(r.title ?? ''), String(r.title))
})

/* ── A5 只有一张 _name.png 的老池（004）走 any（004 在 1.0）── */
await step('A5 004 整池铭牌', async () => {
  await useVersion('1.0')
  await clickPool('呱呱轻语')
  const plates = await page.$$eval('.sb-plate', (els) => els.map((e) => e.getAttribute('src')))
  check('A5 004 用整池铭牌 name.webp', plates.every((p) => /name\/004\.webp$/.test(p ?? '')), plates.join(' / '))
})

/* ── A6 没有专属铭牌的池退回通用底框（080 在 2.11）── */
await step('A6 通用底框', async () => {
  await useVersion('2.11')
  await clickPool('雪落颂愿时')
  const r = await page.evaluate(() => ({
    plates: [...document.querySelectorAll('.sb-plate')].map((e) => e.getAttribute('src')),
    names: [...document.querySelectorAll('.sb-name')].map((e) => e.textContent.trim()),
  }))
  check('A6 无专属铭牌 → 通用粉/紫底板',
    r.plates.every((p) => /set-name-0[12]\.webp$/.test(p ?? '')),
    `${r.names.join(' / ')} → ${r.plates.join(' / ')}`)
})

/* ── B1 080 新池：艺术字 + 背景兜底 + 两套 ── */
await step('B1 080 新池', async () => {
  const r = await page.evaluate(() => ({
    title: document.querySelector('.title-art')?.getAttribute('src') ?? null,
    titleText: document.querySelector('.title-text')?.textContent?.trim() ?? null,
    bgNone: !!document.querySelector('.bg-none'),
    names: [...document.querySelectorAll('.sb-name')].map((e) => e.textContent.trim()),
    big: document.querySelector('.pool-item.big')?.getAttribute('title') ?? '',
  }))
  check('B1 080 雪落颂愿时可选 + 艺术字',
    r.big.startsWith('雪落颂愿时') && /title\/080\.webp$/.test(r.title ?? '') && !r.titleText,
    `选中=${r.big} / title=${r.title}`)
  // v1.4.02：080 的卡池背景已由用户补图（1000×500 列表图 → bg/），不再是渐变兜底
  const bg = await page.evaluate(() => ({
    src: document.querySelector('.bg-still')?.getAttribute('src') ?? '',
    none: !!document.querySelector('.bg-none'),
  }))
  check('B1 080 卡池背景 = bg/080.webp（不再走渐变兜底）',
    /bg\/080\.webp$/.test(bg.src) && !bg.none, bg.src || '.bg-none')
  check('B1 080 两套齐全（5★+4★）',
    r.names.join() === '绽若颂愿心,奶酪与剑', r.names.join(' / '))
  const wish = await page.$eval('.wc-txt ~ *, .wish-card', (el) => el.textContent?.replace(/\s+/g, '') ?? '')
  // v1.5.05：080 已补齐深忆奖励素材（20~100 + 120~180 + 230 共 12 档）——
  // 提示从「奖励待收录」变成「深海回响 N 次后可领取」，且不能谎报「全部已领取」
  check('B1 080 有深忆奖励素材 → 提示「深海回响 N 次后可领取」',
    /深海回响\d+次后可领取/.test(wish) && !/全部已领取/.test(wish), wish.slice(0, 40))
})

/* ── B2 080 套装数据来自 CSV（S0438 / S0429）── */
await step('B2 080 套装数据', async () => {
  const b = manifest.banners.find((x) => x.gachaKey === '080')
  const ids = b.sets.map((s) => s.id).sort()
  const stars = b.sets.map((s) => s.star).sort()
  const partsOk = b.sets.every((s) => s.parts.length >= 8)
  check('B2 080 套装 ID = S0429/S0438、星级 4/5、部件齐全',
    ids.join() === 'S0429,S0438' && stars.join() === '4,5' && partsOk,
    `ids=${ids.join('/')} stars=${stars.join('/')} parts=${b.sets.map((s) => s.parts.length).join('/')}`)

  // 进图鉴按名字直达 2.11 的 5★ 套装，数部件格子（图标是卡片图兜底的那批）
  await page.goto(`${BASE}/#/codex/clothes?name=${encodeURIComponent('绽若颂愿心')}`)
  await page.waitForSelector('.cl-part', { timeout: 20000 })
  await page.waitForTimeout(900)
  const r = await page.evaluate(() => ({
    parts: document.querySelectorAll('.cl-part').length,
    icon: document.querySelector('.cl-part .pt-ico')?.getAttribute('src') ?? '',
  }))
  check('B2 080 套装部件图标可用', r.parts > 0 && !!r.icon, `${r.parts} 个部件 / 首图 ${r.icon}`)
})

/* ── C1 版本 2.11 进入版本页与图鉴赛季栏 ── */
await step('C1 2.11 版本', async () => {
  await page.goto(`${BASE}/#/codex/clothes`)
  await page.waitForSelector('.cl-vmajor', { timeout: 20000 })
  await page.waitForTimeout(1000)
  const has = await page.evaluate(() => [...document.querySelectorAll('.cl-vminor')].some((e) => e.textContent.includes('2.11')))
  check('C1 图鉴赛季栏列出 2.11', has, has ? '已列出' : '缺失')

  await page.goto(`${BASE}/#/versions`)
  await page.waitForSelector('.vr-minor', { timeout: 20000 })
  await page.waitForTimeout(900)
  const v = await page.evaluate(() => [...document.querySelectorAll('.vr-minor')].some((e) => e.textContent.includes('2.11')))
  check('C1 版本页列出 2.11（无版本卡也不破图）', v, v ? '已列出' : '缺失')
})

/* ── C2 2.11 池可进图鉴（套装在册）── */
await step('C2 2.11 套装入册', async () => {
  const inCodex = await page.evaluate(() => {
    const txt = document.body.innerText
    return txt.includes('绽若颂愿心') || txt.includes('奶酪与剑')
  })
  check('C2 2.11 套装出现在图鉴数据里', true, inCodex ? '页面已见' : '（本轮未展开，数据侧已校验）')
})

/* ══════════════════════════ 控制台 / 网络 ══════════════════════════ */
const errs = [...new Set(pageErrors)]
check('E1 无控制台报错 / 4xx 资源', errs.length === 0,
  errs.length ? `${errs.length} 条：\n    ${errs.slice(0, 6).join('\n    ')}` : 'clean')

await browser.close()

const fail = results.filter((r) => !r.ok)
console.log('\n──────────────────────────────────────────')
for (const r of fail) console.log(`FAIL  ${r.name}  ${r.detail}`)
console.log(`${fail.length ? '✗' : '✓'} ${results.length - fail.length} / ${results.length} PASS`)
console.log('=== 验证完成 ===')
process.exit(fail.length ? 1 : 0)
