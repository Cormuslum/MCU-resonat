// 验证 服装图鉴子界面 + 主界面 的 8 项新改动（目标 ）
import { chromium } from 'playwright-core'
import { mkdirSync, readFileSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = '.shots'
mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:5178'

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--force-color-profile=srgb'] })
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
const pageErrors = []
page.on('console', (m) => { if (m.type() === 'error') pageErrors.push(m.text()) })
page.on('pageerror', (e) => pageErrors.push(e.message))
page.on('requestfailed', (r) => pageErrors.push(`reqfail ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => { if (r.status() >= 400) pageErrors.push(`http${r.status()} ${r.url()}`) })

const log = (k, v) => console.log(`\n## ${k}\n${typeof v === 'string' ? v : JSON.stringify(v, null, 2)}`)
const ok = (b) => (b ? 'PASS' : 'FAIL')

// 注入存档：解锁全部套装部件，便于搜索出结果
const manifest = JSON.parse(readFileSync('public/assets/manifest.json', 'utf-8'))
const nameStyles = {}
for (const b of manifest.banners) for (const s of b.sets || []) if (s.name) nameStyles[s.name] = s.styles || []
await page.goto(`${BASE}/#/codex/clothes`)
await page.evaluate(async () => {
  const m = await (await fetch('/assets/manifest.json')).json()
  const codex = {}
  for (const b of m.banners) for (const s of b.sets || []) if (s.parts?.length)
    for (const p of s.parts) codex[`${s.id}:${p.name}`] = { count: 2, firstAt: Date.now() }
  localStorage.setItem('nikki-resonance-save-v1', JSON.stringify({
    version: 1, selectedVersion: '2.10', pity: {}, codex, milestoneClaimed: {}, history: [],
    settings: { pvEnabled: false, skipAnim: false, volume: 0.7, bgm: true, particles: true },
  }))
})
await page.reload()
await page.waitForSelector('.cl-sets .cl-set', { timeout: 10000 })
await page.waitForTimeout(900)

// ===== Req1 部件数移到左下方 =====
const req1 = await page.evaluate(() => {
  const p = document.querySelector('.in-prog')
  const info = document.querySelector('.cl-info')
  if (!p || !info) return { exists: false }
  const pr = p.getBoundingClientRect(), ir = info.getBoundingClientRect()
  return {
    exists: true,
    text: p.textContent.trim(),
    inTags: !!document.querySelector('.in-tags .in-prog'),
    relTop: Math.round(pr.top - ir.top),
    relLeft: Math.round(pr.left - ir.left),
    lowerLeft: pr.top - ir.top > 400 && pr.left - ir.left < 200,
  }
})
log('Req1 部件数左下', { ...req1, verdict: ok(req1.exists && !req1.inTags && req1.lowerLeft) })

// ===== Req2 立绘背景图 + 调色 =====
const req2 = await page.evaluate(() => {
  const show = document.querySelector('.cl-show')
  const bg = document.querySelector('.sh-bg')
  if (!show || !bg) return { exists: false }
  const cs = getComputedStyle(bg)
  return {
    exists: true,
    order: [...show.children].map((c) => c.className),
    bgFirst: show.children[0] === bg,
    srcEnds: bg.getAttribute('src')?.includes('show-bg.webp'),
    filterHasSepia: cs.filter.includes('sepia'),
    filter: cs.filter,
  }
})
log('Req2 立绘背景图', { ...req2, verdict: ok(req2.exists && req2.bgFirst && req2.srcEnds && req2.filterHasSepia) })

// ===== Req3 赛季栏上移到 12px =====
const req3 = await page.$eval('.cl-vers', (el) => Math.round(el.getBoundingClientRect().top))
log('Req3 赛季栏 top', { top: req3, verdict: ok(req3 >= 8 && req3 <= 16) })

// ===== Req4 雷达热区 r=20 =====
const req4 = await page.$$eval('.rd-hot', (els) => els.map((e) => +e.getAttribute('r')))
log('Req4 雷达热区 r', { rs: req4, verdict: ok(req4.length > 0 && req4.every((r) => r === 20)) })

// ===== Req5 星级间隔缩到 2/5 =====
const req5 = await page.evaluate(() => {
  const head = document.querySelector('.in-stars img')
  const part = document.querySelector('.pt-stars img')
  return {
    headMargin: head ? parseFloat(getComputedStyle(head).marginRight) : null,
    partMargin: part ? parseFloat(getComputedStyle(part).marginRight) : null,
  }
})
log('Req5 星级间隔', { ...req5, verdict: ok(req5.headMargin <= -10 && req5.headMargin >= -12 && req5.partMargin <= -2 && req5.partMargin >= -3) })

// ===== Req6 服装搜索扩展（属性标签 + 星级变体）=====
const curName = (await page.$eval('.in-name', (el) => el.textContent.trim()))
const curTags = await page.$$eval('.in-tags .in-tag', (els) => els.map((e) => e.textContent.trim()))
// 6a 属性标签命中：搜当前套装的某个标签，返回结果中应包含该标签的套装
await page.click('.cl-search'); await page.waitForTimeout(300)
const tag = curTags[0] || '甜美'
await page.fill('.sp-sinput', tag); await page.waitForTimeout(400)
const tagRes = await page.$$eval('.sp-sname', (els) => els.map((e) => e.textContent.trim()))
await page.screenshot({ path: `${OUT}/v05-search-tag.png` })
// 用 manifest 反查：返回结果里至少有一个确实带该属性标签（证明是按标签命中的）
const req6a = tagRes.length > 0 && tagRes.some((nm) => (nameStyles[nm] || []).includes(tag))
// 6b 星级变体：搜 "5★" 全部应为 5★
await page.fill('.sp-sinput', '5★'); await page.waitForTimeout(400)
const star5 = await page.$$eval('.sp-sstar', (els) => els.map((e) => e.textContent.trim()))
const req6b = star5.length > 0 && star5.every((s) => s === '5★')
// 6c 中文变体 "五星" 同样命中 5★
await page.fill('.sp-sinput', '五星'); await page.waitForTimeout(400)
const star5b = await page.$$eval('.sp-sstar', (els) => els.map((e) => e.textContent.trim()))
const req6c = star5b.length > 0 && star5b.every((s) => s === '5★')
// 6d 数字变体 "5星"
await page.fill('.sp-sinput', '5星'); await page.waitForTimeout(400)
const star5c = await page.$$eval('.sp-sstar', (els) => els.map((e) => e.textContent.trim()))
const req6d = star5c.length > 0 && star5c.every((s) => s === '5★')
log('Req6 搜索扩展', { curName, curTags, tag, tagResCount: tagRes.length, req6a, star5Count: star5.length, req6b, req6c, req6d, verdict: ok(req6a && req6b && req6c && req6d) })
await page.click('.sp-sclose'); await page.waitForTimeout(300)

// ===== Req7 套装栏下移对齐 =====
const req7 = await page.$eval('.cl-sets', (el) => Math.round(el.getBoundingClientRect().top))
const infoTop = await page.$eval('.cl-info', (el) => Math.round(el.getBoundingClientRect().top))
const setsH = await page.$eval('.cl-sets', (el) => Math.round(el.getBoundingClientRect().height))
const gapScreen = req7 // 屏顶到套装栏
const gapInfo = infoTop - (req7 + setsH) // 套装栏底到信息栏顶
log('Req7 套装栏对齐', { setsTop: req7, infoTop, setsH, gapScreen, gapInfo, verdict: ok(Math.abs(gapScreen - gapInfo) <= 3) })

// ===== Req8 主界面跨子界面搜索 =====
await page.goto(`${BASE}/#/codex`); await page.waitForSelector('.museum', { timeout: 10000 }); await page.waitForTimeout(600)
// 通过搜索热区的 clip-path 多边形质心点击，确保命中（tip 坐标不可靠）
const searchPt = await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.mz-hit')].find((h) => h.querySelector('.mz-tip')?.textContent?.includes('搜索'))
  if (!btn) return null
  const clip = getComputedStyle(btn).clipPath
  const pts = [...clip.matchAll(/([\d.]+)px\s+([\d.]+)px/g)].map((m) => [+m[1], +m[2]])
  if (!pts.length) return null
  const cx = Math.round(pts.reduce((a, p) => a + p[0], 0) / pts.length)
  const cy = Math.round(pts.reduce((a, p) => a + p[1], 0) / pts.length)
  return { x: cx, y: cy }
})
await page.mouse.click(searchPt.x, searchPt.y); await page.waitForTimeout(400)
const searchOpened = (await page.$('.sp-sinput')) !== null
await page.fill('.sp-sinput', '小王子'); await page.waitForTimeout(500)
const mainRes = await page.$$eval('.sp-sname', (els) => els.map((e) => e.textContent.trim()))
await page.screenshot({ path: `${OUT}/v05-main-search.png` })
const hasClothes = mainRes.some((t) => t.includes('｜服装页'))
const hasStory = mainRes.some((t) => t.includes('｜故事页'))
const hasReading = mainRes.some((t) => t.includes('小王子') && t.includes('｜阅读页'))
const legacyGone = (await page.$('.mz-sitem')) === null && (await page.$('.cl-sitem')) === null
log('Req8 主界面跨子界面', { searchOpened, count: mainRes.length, sample: mainRes.slice(0, 6), hasClothes, hasStory, hasReading, legacyGone, verdict: ok(searchOpened && hasClothes && hasStory && hasReading && legacyGone) })

log('PAGE ERRORS', pageErrors.length ? [...new Set(pageErrors)].slice(0, 20).join('\n') : 'clean')
await browser.close()
console.log('\n=== 验证完成 ===')
