import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'

const b = await chromium.launch({ executablePath: CHROME, headless: true })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()) })

await p.goto(BASE + '/', { waitUntil: 'networkidle' })
await p.evaluate(() => localStorage.removeItem('nikki-resonance-save-v1'))

// 心愿原野 · 全解锁 · 选中第一本 → 对齐实机截图状态（书籍 212/212）
await p.goto(BASE + '/#/codex/readings', { waitUntil: 'networkidle' })
await p.waitForSelector('.readings', { timeout: 20000 })
await p.waitForTimeout(500)
await p.click('.rd-collect')
await p.waitForTimeout(400)
await p.locator('.rd-row').first().click()
await p.waitForTimeout(900)
await p.screenshot({ path: '.shots/rd-new-wish.png' })

const st = await p.evaluate(() => {
  const q = (s) => document.querySelector(s)
  const r = (s) => {
    const e = q(s)
    if (!e) return null
    const b = e.getBoundingClientRect()
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
  }
  return {
    label: q('.rd-labeltxt')?.textContent?.trim(),
    rows: document.querySelectorAll('.rd-row').length,
    paper: r('.rd-layer:nth-of-type(2)'),
    content: r('.rd-content'),
    title: r('.rd-ctitle'),
    list: r('.rd-list'),
    labelBox: r('.rd-label'),
    tab: [...document.querySelectorAll('.rd-tab')].map((e) => {
      const b = e.getBoundingClientRect()
      return { t: e.textContent.trim(), x: Math.round(b.x), y: Math.round(b.y), on: e.classList.contains('on') }
    }),
  }
})
console.log('WISH:', JSON.stringify(st, null, 1))

// 伊赞之土 · 空态（书籍 0/372）
await p.evaluate(() => localStorage.removeItem('nikki-resonance-save-v1'))
await p.goto(BASE + '/#/codex/readings', { waitUntil: 'networkidle' })
await p.waitForSelector('.readings', { timeout: 20000 })
await p.waitForTimeout(500)
await p.locator('.rd-tab').nth(1).click()
await p.waitForTimeout(700)
await p.screenshot({ path: '.shots/rd-new-yizan.png' })
const st2 = await p.evaluate(() => {
  const q = (s) => document.querySelector(s)
  const r = (s) => {
    const e = q(s)
    if (!e) return null
    const b = e.getBoundingClientRect()
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
  }
  return {
    label: q('.rd-labeltxt')?.textContent?.trim(),
    rows: document.querySelectorAll('.rd-row').length,
    maple: !!q('.rd-dec'),
    emptyTxt: q('.rd-empty-txt')?.textContent?.trim(),
    emptyImg: r('.rd-empty-img'),
    menu: r('.rd-menu'),
    labelBox: r('.rd-label'),
  }
})
console.log('YIZAN:', JSON.stringify(st2, null, 1))
console.log('errors=', errs)
await b.close()
