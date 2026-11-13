/** 验收 */
import { chromium } from 'playwright-core'
import { mkdirSync, readFileSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
mkdirSync('.shots', { recursive: true })

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? `  ${detail}` : ''}`)
}

/* 造一份存档：把指定套装的部件全部标成已获得（id = `${setId}:${icon.name}`） */
const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8'))
function partsOf(setId) {
  const ids = []
  for (const b of manifest.banners) {
    for (const s of b.sets) {
      if (s.id !== setId) continue
      for (const ic of s.assets.icons ?? []) ids.push(`${s.id}:${ic.name}`)
    }
  }
  return ids
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--force-color-profile=srgb'] })
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

const pageErrors = []
const isNoise = (t) =>
  /net::ERR_ABORTED/.test(t) && (/\/assets\/(sfx|bgm|video)\//.test(t) || /bg-video(-\d+)?\.(webm|mp4)/.test(t) || /bg-audio(-\d+)?\.ogg/.test(t))
const pushErr = (t) => { if (!isNoise(t)) pageErrors.push(t) }
page.on('console', (m) => { if (m.type() === 'error') pushErr(m.text()) })
page.on('pageerror', (e) => pushErr(e.message))
page.on('requestfailed', (r) => pushErr(`reqfail ${r.url()} ${r.failure()?.errorText}`))

/** 写存档 + 强制重载（同 hash 导航不会重读 localStorage） */
async function loadWith(save, hash) {
  await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate((s) => localStorage.setItem('nikki-resonance-save-v1', JSON.stringify(s)), save)
  await page.goto('about:blank')
  await page.goto(`${BASE}/#${hash}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
}

const baseSave = (extra = {}) => ({
  version: 1,
  selectedVersion: '2.11',
  pity: {},
  codex: {},
  milestoneClaimed: {},
  history: [],
  settings: { skipAnim: true, skipSingleAnim: true, skipReward: true },
  ...extra,
})

/* ══════════════════════ A. 图鉴未获得态 ══════════════════════ */
console.log('\n【A. 故事&阅读物图鉴：未获得态的贴纸与提示】')
await loadWith(baseSave(), '/codex/readings')
await page.waitForSelector('.rd-row', { timeout: 20000 })

const emptyVisible = () =>
  page.evaluate(() => {
    const st = document.querySelector('.rd-empty-sticker')
    const tx = document.querySelector('.rd-empty-txt')
    const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0
    return { sticker: vis(st), text: vis(tx) }
  })

// A1/A2 点一本未解锁的
await page.locator('.rd-row').nth(1).click()
await page.waitForTimeout(450)
{
  const v = await emptyVisible()
  check('A1 阅读物：未解锁条目 → 空态贴纸显示', v.sticker)
  check('A2 阅读物：未解锁条目 → 提示文字显示', v.text)
}

// A3 双击解锁一本，再点另一本未解锁
await page.locator('.rd-row').nth(0).click()
await page.waitForTimeout(120)
await page.locator('.rd-row').nth(0).click()
await page.waitForTimeout(700)
const unlockedOne = await page.evaluate(() => !document.querySelectorAll('.rd-row')[0]?.querySelector('.rd-lock'))
check('A3a 双击确实解锁了一本', unlockedOne)
await page.locator('.rd-row').nth(2).click()
await page.waitForTimeout(450)
{
  const v = await emptyVisible()
  check('A3b 解锁一本后再点未解锁条目 → 贴纸仍显示', v.sticker)
  check('A3c 提示文字也仍在', v.text)
}

// A4 选中已解锁的那本 → 空态应隐藏
await page.locator('.rd-row').nth(0).click()
await page.waitForTimeout(500)
{
  const v = await emptyVisible()
  check('A4 已解锁条目 → 空态隐藏', !v.sticker && !v.text)
}

// A5/A6 故事：先给一套套装全部部件 → 该套装的故事解锁
const storySetId = manifest.banners.find((b) => b.version === '2.11')?.sets?.[0]?.id
const storyCodex = {}
for (const id of partsOf(storySetId)) storyCodex[id] = { count: 1, firstAt: 1 }
await loadWith(baseSave({ codex: storyCodex }), '/codex/stories')
await page.waitForSelector('.rd-row', { timeout: 20000 })
// 2.11 的套装故事属于「伊赞之土」，先切区域（默认落在心愿原野）
await page.evaluate(() => {
  const tab = [...document.querySelectorAll('.rd-tab')].find((b) => /伊赞之土/.test(b.textContent || ''))
  tab?.click()
})
await page.waitForTimeout(900)
const rowsInfo = await page.evaluate(() =>
  [...document.querySelectorAll('.rd-row')].map((r, i) => ({ i, locked: !!r.querySelector('.rd-lock') })),
)
const lockedIdx = rowsInfo.find((r) => r.locked)?.i ?? -1
const openIdx = rowsInfo.find((r) => !r.locked)?.i ?? -1
check('A5a 故事页同时存在已解锁/未解锁行', lockedIdx >= 0 && openIdx >= 0, `locked=${lockedIdx} open=${openIdx}`)
if (lockedIdx >= 0) {
  await page.locator('.rd-row').nth(lockedIdx).click()
  await page.waitForTimeout(450)
  const v = await emptyVisible()
  check('A5b 故事：未解锁条目 → 贴纸 + 提示显示', v.sticker && v.text)
}
if (openIdx >= 0) {
  await page.locator('.rd-row').nth(openIdx).click()
  await page.waitForTimeout(500)
  const v = await emptyVisible()
  check('A6 故事：已解锁条目 → 空态隐藏', !v.sticker && !v.text)
}

/* ══════════════════════ B. 套装获得页装饰 + 层级 ══════════════════════ */
console.log('\n【B. 套装获得页：装饰层与立绘层级】')
await loadWith(baseSave(), '/gacha?banner=banner-2.11-01&suit=绽若颂愿心')
await page.waitForSelector('.suit', { timeout: 20000 })
await page.waitForTimeout(600)

{
  const b = await page.evaluate(() => {
    const card = document.querySelector('.su-card')
    const cr = card.getBoundingClientRect()
    const pick = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return { x: r.x, y: r.y, w: r.width, h: r.height, op: Number(cs.opacity), src: el.getAttribute('src') }
    }
    const order = [...card.children].map((el) => el.className || el.tagName.toLowerCase())
    return {
      card: { x: cr.x, y: cr.y },
      light: pick('.sc-deco-light'),
      orn: pick('.sc-deco-orn'),
      order,
    }
  })
  const near = (a, b, tol = 2) => Math.abs(a - b) <= tol
  check('B1 柔光装饰存在（suit.light）', !!b.light && /ui\/suit\/light/.test(b.light.src || ''), b.light?.src)
  check('B2 纹样装饰存在（ornClothes3）', !!b.orn && /orn-clothes-3/.test(b.orn.src || ''), b.orn?.src)
  check('B3 柔光不透明度 0.36', !!b.light && near(b.light.op, 0.36, 0.005), `op=${b.light?.op}`)
  check('B4 纹样不透明度 0.42', !!b.orn && near(b.orn.op, 0.42, 0.005), `op=${b.orn?.op}`)
  // pxdesk
  check(
    'B5 柔光坐标/尺寸与 pxdesk 一致',
    !!b.light && near(b.light.x, 1100, 2) && near(b.light.y, 160, 2) && near(b.light.w, 150, 2) && near(b.light.h, 132, 2),
    b.light ? `${Math.round(b.light.x)},${Math.round(b.light.y)} ${Math.round(b.light.w)}×${Math.round(b.light.h)}` : '',
  )
  check(
    'B6 纹样坐标/尺寸与 pxdesk 一致',
    !!b.orn && near(b.orn.x, 1125, 2) && near(b.orn.y, 170, 2) && near(b.orn.w, 117, 2) && near(b.orn.h, 100, 2),
    b.orn ? `${Math.round(b.orn.x)},${Math.round(b.orn.y)} ${Math.round(b.orn.w)}×${Math.round(b.orn.h)}` : '',
  )
  const iBody = b.order.findIndex((c) => /sc-body/.test(c))
  const iLight = b.order.findIndex((c) => /sc-deco-light/.test(c))
  const iOrn = b.order.findIndex((c) => /sc-deco-orn/.test(c))
  check('B7 两层装饰都在 frame-2 之下（DOM 顺序）', iLight >= 0 && iOrn >= 0 && iLight < iBody && iOrn < iBody, b.order.join(' > '))
  const iPort = b.order.findIndex((c) => /sc-portrait/.test(c))
  const iFrame = b.order.findIndex((c) => /sc-frame/.test(c))
  check('B8 立绘夹在 frame-2 与 frame-1 之间', iBody < iPort && iPort < iFrame, b.order.join(' > '))
}

/* ══════════════════════ C. 第二套 + 跳过全部 ══════════════════════ */
console.log('\n【C. 第二套同第一套处理 + 跳过全部连续揭示】')
// C1/C2 用调试口直接看揭示序列（十连）
{
  const allParts = {}
  for (const b of manifest.banners) {
    if (b.version !== '2.11') continue
    for (const s of b.sets) for (const id of partsOf(s.id)) allParts[id] = { count: 1, firstAt: 1 }
  }
  await loadWith(baseSave({ codex: allParts }), '/gacha?banner=banner-2.11-01&times=10')
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => !!window.__gacha)) break; await page.waitForTimeout(250) }
  const c = await page.evaluate(() => {
    const g = window.__gacha
    for (let k = 0; k < 30; k++) {
      g.pull()
      const seq = g.seq()
      const si = seq.findIndex((s) => s.second)
      if (si >= 0) {
        return {
          found: true,
          detailBeforeSecond: seq[si - 1]?.kind === 'detail' ? seq[si - 1] : null,
          second: seq[si],
          seq: seq.map((s) => (s.kind === 'detail' ? `d${s.forced ? '!' : ''}` : s.second ? 'S2' : 'S')),
        }
      }
    }
    return { found: false }
  })
  check('C1 十连能产出「第二套」步骤', c.found, c.found ? c.seq.join(' ') : '30 次十连未出现')
  check('C2 第二套前的单抽界面被标记为强制（不跳过）', c.found && !!c.detailBeforeSecond?.forced)
}

// C3/C4 行为：新部件场景下按「跳过全部」→ 按钮消失、之后逐级点击前进
{
  await loadWith(baseSave(), '/gacha?banner=banner-2.11-01&times=10')
  for (let i = 0; i < 40; i++) { if (await page.evaluate(() => !!window.__gacha)) break; await page.waitForTimeout(250) }
  // 走一次真实十连：点「跳过」动画 → 进揭示
  await page.evaluate(() => document.querySelector('.anim-skip')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await page.waitForTimeout(900)
  const before = await page.evaluate(() => document.querySelectorAll('.dh-skip').length)
  check('C3a 揭示开始时「跳过全部」按钮存在', before > 0, `数量 ${before}`)
  await page.evaluate(() => document.querySelector('.detail .dh-skip')?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  await page.waitForTimeout(700)
  const after = await page.evaluate(() => document.querySelectorAll('.dh-skip').length)
  check('C3b 按过之后按钮消失', after === 0, `数量 ${after}`)
  const p1 = await page.evaluate(() => document.querySelector('.detail') ? 'detail' : document.querySelector('.suit') ? 'suit' : document.querySelector('.result') ? 'grid' : '?')
  // 空白处点一下：应当前进到下一步（单抽界面或套装页），而不是直接进网格
  await page.mouse.click(960, 540)
  await page.waitForTimeout(900)
  const p2 = await page.evaluate(() => document.querySelector('.detail') ? 'detail' : document.querySelector('.suit') ? 'suit' : document.querySelector('.result') ? 'grid' : '?')
  check('C4 点击后仍在逐件揭示（未直接跳网格）', p2 !== 'grid' || p1 === 'grid', `${p1} → ${p2}`)
}

/* ══════════════════════ D. 彩蛋补充文本 ══════════════════════ */
console.log('\n【D. 主页彩蛋：补充文本】')
{
  const src = readFileSync('src/data/easterEgg.ts', 'utf8')
  const m = /export const EGG_ENTRIES: EggEntry\[\] = (\[[\s\S]*?\])\n\n/.exec(src)
  const arr = JSON.parse(m[1])
  check('D1 彩蛋条目数 = 84（原 74 + 补充 10）', arr.length === 84, `实际 ${arr.length}`)
  const added = arr.filter((x) => /《奇迹之旅》|《番外·落幕之日》/.test(x.text))
  check('D2 补充的剧情章节已入库', added.length === 10, `实际 ${added.length} 条`)
  check('D3 补充条目为左对齐且进随机池', added.every((x) => x.align === 'left'), '')
  const pool = /EGG_RANDOM_POOL: number\[\] = (\[[^\]]*\])/.exec(src)
  const poolArr = JSON.parse(pool[1])
  check('D4 随机池包含补充条目下标', poolArr.length === arr.length - 30, `pool=${poolArr.length}`)
}

/* ══════════════════════ E. 版本页徽记起废除该设定 ══════════════════════ */
console.log('\n【E. 版本页徽记 —— v1.5.03 起废除，改为反向核对】')
await loadWith(baseSave(), '/versions')
await page.waitForTimeout(1200)
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => /2\.11/.test(b.textContent || ''))
  btn?.click()
})
await page.waitForTimeout(1200)
check('E1 版本页不再有徽记容器（.vs-logo）', (await page.locator('.vs-logo').count()) === 0)
check('E2 不再有徽记底板 / 状态角标', (await page.locator('.vl-chip, .vl-badge').count()) === 0)

/* ══════════════════════ F. 报错 ══════════════════════ */
console.log('\n【F. 全程报错】')
check('F1 无 JS 报错 / 坏请求', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '))

const pass = results.filter((r) => r.ok).length
console.log(`\n${'='.repeat(52)}\n${pass}/${results.length} PASS`)
await browser.close()
process.exit(pass === results.length ? 0 : 1)
