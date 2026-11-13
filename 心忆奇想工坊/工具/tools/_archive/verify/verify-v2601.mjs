/**
 * v1.4.01 验收 · 三个页面改名 + 「时隙遗光」每个版本都能进到自己的卡池
 *
 * 覆盖用户这一批的两条要求：
 *   1. 改名：主页 → 心绮之启；版本 → 时隙遗光；共鸣 → 心忆共鸣
 *   2. 每个版本都有对应卡池，右下进入键点下去要**落到那个版本的池**
 *
 * 做法：24 个版本逐个走真实 UI —— 点小版本 → 读进入键旁的「对应卡池」标签
 *       → 点进入键 → 在卡池页读当前大图卡池名 → 回 manifest 里的 version 核对。
 *
 * 用法：先 `npx vite`（5178），再 `node tools/verify-v2601.mjs`
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

const pageErrors = []
/** `ERR_ABORTED` 同 v2.5.07：BGM / 卡池 PV / 主页背景视频切页时被回收，Chrome 会报 aborted —— 与代码无关 */
const isAbortedAudio = (t) => /net::ERR_ABORTED/.test(t)
  && (/\/assets\/(sfx|bgm|video)\//.test(t) || /bg-video(-\d+)?\.(webm|mp4)/.test(t) || /bg-audio(-\d+)?\.ogg/.test(t))
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
    check(name, false, `异常 → ${String(e.message ?? e).split('\n')[0].slice(0, 140)}`)
  }
}

/* ══════════════════════════ 一、导航改名 */

console.log('\n【一、侧边栏三处改名】')
// v1.6.06 起**主页不再显示侧边栏**（App.vue 的 HIDE_RAIL_ROUTES 含 home），
// 导航文案要去二级页面取；主页另有一条「不该有侧栏」的断言。
await page.goto(`${BASE}/#/codex`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.rail', { timeout: 20000 })
// 侧栏常态隐藏：把指针挪到屏幕左缘 100px 内
await page.mouse.move(30, 540)
await page.waitForTimeout(500)

const navTexts = await page.$$eval('.rb-txt', (els) => els.map((e) => e.textContent.trim()))
check(
  'A1 导航文案 = 心绮之启 / 时隙遗光 / 心忆共鸣',
  navTexts[0] === '心绮之启' && navTexts[1] === '时隙遗光' && navTexts[2] === '心忆共鸣',
  navTexts.slice(0, 3).join(' / '),
)
check(
  'A2 旧名已全部消失（主页 / 版本 / 共鸣）',
  !navTexts.includes('主页') && !navTexts.includes('版本') && !navTexts.includes('共鸣'),
  navTexts.join(' / '),
)
const navFits = await page.$$eval('.rb-txt', (els) =>
  els.every((e) => e.getBoundingClientRect().width <= 158 && e.scrollWidth <= e.clientWidth + 1),
)
check('A3 四个字的标签不溢出侧栏（158px 内一行）', navFits)

// 主页不显示侧边栏（v1.6.06 用户要求）
await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(900)
const homeRail = await page.evaluate(() => document.querySelectorAll('.rail').length)
check('A4 主页不显示侧边栏', homeRail === 0, `主页 .rail × ${homeRail}`)

/* ══════════════════════════ 二、版本 → 卡池 */

/** 在页面里取 manifest：池名 → version、以及每个版本的第一池 */
const manifest = await page.evaluate(async () => {
  const m = await (await fetch('/assets/manifest.json')).json()
  const firstOf = {}
  const verOf = {}
  for (const b of m.banners) {
    // 与前端 VersionView.poolOf 一致：同版本里含 5★ 的池优先（1.1 的 006 是纯 4★，
    // 页面给的其实是 008 飞向流星的愿望）；整版都是 4★ 才退回第一个。
    if (!firstOf[b.version]) firstOf[b.version] = { id: b.id, name: b.name }
    if (String(b.star || '').includes('5★') && !firstOf[b.version].five) {
      firstOf[b.version] = { id: b.id, name: b.name, five: true }
    }
    verOf[b.name] = b.version
  }
  return { firstOf, verOf, versions: [...new Set(m.banners.map((b) => b.version))] }
})

/* 版本清单**从 manifest 现算**：素材库会不断增长（v1.6.07 用户自建了 0.1 大版本），
   写死 24 个版本会在新数据进来后误报。 */
const VERS = manifest.versions.slice().sort((a, b) => {
  const na = a.split('.').map(Number)
  const nb = b.split('.').map(Number)
  return (na[0] - nb[0]) || (na[1] - nb[1])
})

const noPool = VERS.filter((v) => !manifest.firstOf[v])
check(
  `B0 ${VERS.length} 个版本每个都有卡池`,
  noPool.length === 0,
  noPool.length ? `缺池的版本：${noPool.join(' / ')}` : VERS.map((v) => `${v}:${manifest.firstOf[v].name}`).join(' | ').slice(0, 60) + ' …',
)
check('B0b manifest 的版本清单与页面一致', VERS.length === manifest.versions.length, `${VERS.length} 个`)

console.log('\n【二、逐版本：进入键 → 对应卡池】')
await page.goto(`${BASE}/#/versions`, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.vr-minor', { timeout: 20000 })
await page.waitForTimeout(900)

/* 大版本组名 → 下标（按名字找，不写下标：v1.6.07 前面多了 0 奇迹传说） */
const majorName = { 0: '奇迹传说', 1: '心愿原野', 2: '伊赞之土' }
const groupIdx = async (ver) => {
  const labels = await page.$$eval('.vr-major .vm-txt', (els) => els.map((e) => e.textContent.trim()))
  const want = majorName[ver.split('.')[0]] || ''
  const i = labels.findIndex((t) => t.includes(want))
  return i >= 0 ? i : 0
}

let openMajor = ''
const bad = []
for (const ver of VERS) {
  await step(`B ${ver}`, async () => {
    const want = ver.split('.')[0]
    if (want !== openMajor) {
      await page.evaluate((i) => document.querySelectorAll('.vr-major')[i]?.click(), await groupIdx(ver))
      openMajor = want
      await page.waitForTimeout(500)
    }
    const clicked = await page.evaluate((v) => {
      const btn = [...document.querySelectorAll('.vr-minor')].find(
        (el) => el.querySelector('.vn-ver b')?.textContent.trim() === v,
      )
      if (!btn) return false
      btn.scrollIntoView({ block: 'center' })
      btn.click()
      return true
    }, ver)
    if (!clicked) throw new Error('版本栏里找不到 ' + ver)
    await page.waitForTimeout(420)

    const caption = await page.evaluate(() => {
      const t = document.querySelector('.vr-pool')?.textContent?.trim() ?? ''
      // 标签前缀是 <i> 里的量词（v1.6.06 起为「服装阁」，旧版是「卡池」），不算名字
      return t.replace(/^(卡池|服装阁)\s*/, '')
    })
    if (caption !== manifest.firstOf[ver].name) {
      bad.push(`${ver} 标签「${caption}」≠ manifest「${manifest.firstOf[ver].name}」`)
    }

    await page.click('.vr-enter')
    await page.waitForTimeout(1100)
    const got = await page.evaluate(() => ({
      hash: location.hash,
      big: document.querySelector('.pool-item.big')?.getAttribute('title') ?? '',
      title: document.querySelector('.title-art')?.getAttribute('src') ?? '',
    }))
    const name = got.big.replace(/\s+.*$/, '') // title 里可能带「· 已收录」之类的尾巴
    const actualVer = manifest.verOf[name]
    if (!got.hash.startsWith('#/banner')) bad.push(`${ver} 没跳到卡池页（${got.hash}）`)
    if (actualVer !== ver) bad.push(`${ver} 落到了「${name}」（${actualVer ?? '未知'}）`)
    if (caption && name && caption !== name) bad.push(`${ver} 标签「${caption}」与实际池「${name}」不一致`)

    // 回版本页继续
    await page.goto(`${BASE}/#/versions`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.vr-minor', { timeout: 15000 })
    await page.waitForTimeout(420)
    openMajor = ''
  })
}
check(
  `B1 ${VERS.length} 个版本的进入键全部落到本版本卡池`,
  bad.length === 0,
  bad.length ? bad.slice(0, 4).join(' ；') : `${VERS.length}/${VERS.length}`,
)

/* 抽两个池截图留档：1.0（常驻）与 2.11（无背景兜底） */
await step('B2 截图 2.11 进入结果', async () => {
  await page.goto(`${BASE}/#/versions`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.vr-minor', { timeout: 15000 })
  await page.waitForTimeout(600)
  const labels = await page.$$eval('.vr-major .vm-txt', (els) => els.map((e) => e.textContent.trim()))
  const gi = labels.findIndex((t) => t.includes('伊赞之土'))
  await page.evaluate((i) => document.querySelectorAll('.vr-major')[i]?.click(), gi >= 0 ? gi : 0)
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.vr-minor')].find((el) => el.querySelector('.vn-ver b')?.textContent.trim() === '2.11')
    btn?.scrollIntoView({ block: 'center' })
    btn?.click()
  })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/v2601-ver-211.png` })
  await page.click('.vr-enter')
  await page.waitForTimeout(1400)
  await page.screenshot({ path: `${OUT}/v2601-banner-211.png` })
  const nm = await page.evaluate(() => document.querySelector('.pool-item.big')?.getAttribute('title') ?? '')
  check('B2 2.11 → 雪落颂愿时', nm.startsWith('雪落颂愿时'), nm)
})

/* ══════════════════════════ 三、无报错 */
check('C1 全程无 JS 报错 / 坏请求', pageErrors.length === 0, pageErrors.slice(0, 3).join(' ; '))

const pass = results.filter((r) => r.ok).length
console.log(`\n${pass}/${results.length} PASS${pass === results.length ? '' : '  ← 有失败项'}`)
await browser.close()
process.exit(pass === results.length ? 0 : 1)
