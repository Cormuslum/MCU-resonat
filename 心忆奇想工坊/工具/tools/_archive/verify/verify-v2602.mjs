/** 验收 · 共鸣页按版本收窄 + 首次必须选版本 + 080 卡池 */
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
const hash = () => page.evaluate(() => location.hash)
const poolNames = () => page.$$eval('.pool-item', (els) => els.map((e) => e.getAttribute('title') ?? ''))

/** 版本页选一个版本（大版本分组 → 小版本 → 读标签） */
async function pickVersion(ver) {
  await page.goto(`${BASE}/#/versions`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.vr-minor', { timeout: 20000 })
  await page.waitForTimeout(700)
  const major = Number(ver.split('.')[0]) - 1
  await page.evaluate((i) => document.querySelectorAll('.vr-major')[i]?.click(), major)
  await page.waitForTimeout(500)
  const ok = await page.evaluate((v) => {
    const el = [...document.querySelectorAll('.vr-minor')].find(
      (x) => x.querySelector('.vn-ver b')?.textContent.trim() === v,
    )
    if (!el) return false
    el.scrollIntoView({ block: 'center' })
    el.click()
    return true
  }, ver)
  if (!ok) throw new Error('找不到版本 ' + ver)
  await page.waitForTimeout(500)
  return page.evaluate(() => {
    const t = document.querySelector('.vr-pool')?.textContent?.trim() ?? ''
    // 起界面称呼由「卡池」改为「服装阁」，前缀跟着改
    return t.replace(/^服装阁\s*/, '')
  })
}

/** 从版本页点进入键进共鸣页 */
async function enterPool() {
  await page.click('.vr-enter')
  await page.waitForTimeout(1400)
}

/* ══════════════════════ 一、全新存档：共鸣入口置灰 + 直链被拦 */

console.log('\n【一、未选版本 → 共鸣不可入】')
await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(5600)

const gate = await page.evaluate(() => ({
  nav: [...document.querySelectorAll('.hm-nav')].map((e) => ({
    cls: e.className,
    dis: e.disabled,
  })),
  dyn: [...document.querySelectorAll('.dy-btn')].map((e) => ({ cls: e.className, dis: e.disabled })),
  rail: [...document.querySelectorAll('.rail-btn')].map((e) => ({
    txt: e.querySelector('.rb-txt')?.textContent?.trim(),
    dis: e.disabled,
  })),
}))
const navBanner = gate.nav.find((x) => x.cls.includes('nv-banner'))
const dynBanner = gate.dyn.find((x) => x.cls.includes('dy-banner'))

check('A1 主页星芒「心忆共鸣」置灰 + disabled',
  !!navBanner && navBanner.dis && navBanner.cls.includes('is-locked'), navBanner?.cls ?? '缺失')
check('A2 主页右缘竖排「心忆共鸣」置灰 + disabled',
  !!dynBanner && dynBanner.dis && dynBanner.cls.includes('is-locked'), dynBanner?.cls ?? '缺失')
const others = gate.nav.filter((x) => !x.cls.includes('nv-banner'))
check('A3 其余入口不受影响（4 个都还能点）',
  others.length === 4 && others.every((x) => !x.dis), `${others.length} 个正常`)
// 起主页**不再有侧边栏**（信封移到左上角、左缘感应区一并撤掉）
// 置灰这道闸只剩「居中星芒 + 右缘竖排」两套入口
check('A4 主页已无侧栏（v1.6.06 删除），闸门只由星芒 + 右缘承担',
  gate.rail.length === 0,
  gate.rail.length ? gate.rail.map((x) => `${x.txt}:${x.dis ? '禁' : '可'}`).join(' ') : '无 .rail-btn')

/* 视觉：置灰是真的变了样（灰度 + 压暗），不是只加了个 class */
const look = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const cs = getComputedStyle(el)
    return { filter: cs.filter, opacity: Number(cs.opacity), cursor: cs.cursor }
  }
  return { spot: pick('.nv-banner.is-locked'), dyn: pick('.dy-btn.is-locked') }
})
const greyOk = (r) => !!r && /grayscale\(1\)/.test(r.filter) && /brightness\(0\.5\)/.test(r.filter)
// 默认是动态背景 → 星芒 `v-show` 关着（opacity 0），可见的是右缘那枚，用它的不透明度判「没被藏起来」
check('A5 两套入口都置灰（灰度 + 压暗），可见的那枚仍看得见',
  greyOk(look.spot) && greyOk(look.dyn) && look.dyn.opacity > 0.05 && look.dyn.opacity < 0.5,
  `星芒 ${look.spot?.filter ?? '缺失'} / 右缘 opacity ${look.dyn?.opacity ?? '缺失'}`)

/* 点了不该跳 */
await page.evaluate(() => document.querySelector('.nv-banner.is-locked')?.click())
await page.waitForTimeout(600)
check('A6 点置灰的星芒不跳转', (await hash()) === '#/' || (await hash()) === '', await hash())

const dynClick = await page.evaluate(() => {
  const el = document.querySelector('.dy-btn.is-locked')
  el?.click()
  return !!el
})
await page.waitForTimeout(600)
check('A7 点右缘置灰项不跳转', dynClick && ((await hash()) === '#/' || (await hash()) === ''), await hash())

/* 直链打回版本页 */
await page.goto(`${BASE}/#/banner`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1200)
check('A8 直链 /#/banner 被守卫打回时隙遗光', (await hash()) === '#/versions', await hash())

/* ══════════════════════ 二、选版本 → 解锁 + 列表按版本收窄 */

console.log('\n【二、选版本后：只列当前版本的池】')
const manifest = await page.evaluate(async () => await (await fetch('/assets/manifest.json')).json())

await step('B 2.10', async () => {
  const cap = await pickVersion('2.10')
  // 起版本内按**官方编号**排序（不再是目录顺序）：
  // 2.10 的第一池是 076 执律的流金（原目录顺序里是「在属于孩子的故事里」）
  const first210 = manifest.banners.find((b) => b.version === '2.10')?.name ?? ''
  check('B1 2.10 进入键标签 = 该版本第一池（官方编号序）', cap === first210, `${cap}（期望 ${first210}）`)
  await enterPool()
  const names = await poolNames()
  // 起每个版本末尾都挂常驻池 → 期望 = 2.10 的 4 个 + 遥远之海
  const want = [...manifest.banners.filter((b) => b.version === '2.10').map((b) => b.name), '遥远之海']
  check('B2 共鸣页只列 2.10 的池 + 常驻（5 个，顺序一致）',
    names.length === want.length && names.every((n, i) => n.startsWith(want[i])),
    `${names.length} 个：${names.map((n) => n.split('·')[0].trim()).join(' / ')}`)
  check('B3 落点 = 2.10 第一池', (await page.$eval('.pool-item.big', (e) => e.getAttribute('title') ?? '')).startsWith(first210))
  await page.screenshot({ path: `${OUT}/v2602-210.png` })
})

await step('B4 换成 1.8', async () => {
  await pickVersion('1.8')
  await enterPool()
  const names = await poolNames()
  const want = [...manifest.banners.filter((b) => b.version === '1.8').map((b) => b.name), '遥远之海']
  check('B4 换版本后列表整组替换（1.8 的 4 个池 + 常驻）',
    names.length === want.length && names.every((n, i) => n.startsWith(want[i])),
    names.map((n) => n.split('·')[0].trim()).join(' / '))
})

/* 列表里绝不出现别的版本的池 */
await step('B5 不串版本', async () => {
  const names = await poolNames()
  const bad = names.filter((n) => {
    const hit = manifest.banners.find((b) => n.startsWith(b.name))
    // 常驻池（banner-001，legacyId = banner-1.0-01）是规则内的尾巴，不算串版本
    if (hit?.id === 'banner-001') return false
    return !hit || hit.version !== '1.8'
  })
  check('B5 列表里没有别的版本混进来（常驻除外）', bad.length === 0, bad.join(' / ') || '符合')
})

/* 回主页：入口已解锁 */
await step('B6 回主页解锁', async () => {
  await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2600)
  const r = await page.evaluate(() => ({
    locked: document.querySelectorAll('.hm-nav.is-locked, .dy-btn.is-locked').length,
    railDisabled: [...document.querySelectorAll('.rail-btn')].filter((e) => e.disabled).length,
  }))
  check('B6 选过版本后主页与侧栏都解锁', r.locked === 0 && r.railDisabled === 0,
    `置灰 ${r.locked} / 侧栏禁用 ${r.railDisabled}`)
})

/* 刷新后仍记得当前版本 */
await step('B7 持久化', async () => {
  await page.goto(`${BASE}/#/banner`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pool-item', { timeout: 20000 })
  await page.waitForTimeout(900)
  const names = await poolNames()
  // 1.8 的 4 个池 + 常驻
  check('B7 刷新后仍是 1.8 的池（版本记在存档里）', names.length === 5, `${names.length} 个`)
})

/* ══════════════════════ 三、080 卡池背景 */

console.log('\n【三、雪落颂愿时背景】')
await step('C 2.11', async () => {
  await pickVersion('2.11')
  await enterPool()
  const r = await page.evaluate(() => ({
    names: [...document.querySelectorAll('.pool-item')].map((e) => e.getAttribute('title') ?? ''),
    bg: document.querySelector('.bg-still')?.getAttribute('src') ?? '',
    none: !!document.querySelector('.bg-none'),
    thumb: document.querySelector('.pool-item.big .pi-img')?.getAttribute('src') ?? '',
  }))
  check('C1 2.11 = 080 一个池 + 常驻', r.names.length === 2 && r.names[0].startsWith('雪落颂愿时') && r.names[1].startsWith('遥远之海'),
    r.names.join(' / '))
  check('C2 背景 = bg/080.webp（不再渐变兜底）',
    /bg\/080\.webp$/.test(r.bg) && !r.none, r.bg || '.bg-none')
  check('C3 列表缩略图 = thumb/080.webp', /banners\/thumb\/080\.webp$/.test(r.thumb), r.thumb)

  // 图真的加载出来了（naturalWidth > 0），不是只挂了个 src
  const loaded = await page.evaluate(async () => {
    const img = document.querySelector('.bg-still')
    if (!img) return null
    if (!img.complete) await new Promise((res) => { img.onload = img.onerror = res })
    return { w: img.naturalWidth, h: img.naturalHeight, cw: img.clientWidth, ch: img.clientHeight }
  })
  check('C4 背景图加载成功且铺满 1920×1080',
    !!loaded && loaded.w >= 1000 && loaded.h >= 500 && loaded.cw === 1920 && loaded.ch === 1080,
    loaded ? `${loaded.w}×${loaded.h} → ${loaded.cw}×${loaded.ch}` : '取不到 img')
  await page.screenshot({ path: `${OUT}/v2602-211.png` })
})

/* ══════════════════════ 四、无报错 */
check('D1 全程无 JS 报错 / 坏请求', pageErrors.length === 0, pageErrors.slice(0, 3).join(' ; '))

const pass = results.filter((r) => r.ok).length
console.log(`\n${pass}/${results.length} PASS${pass === results.length ? '' : '  ← 有失败项'}`)
await browser.close()
process.exit(pass === results.length ? 0 : 1)
