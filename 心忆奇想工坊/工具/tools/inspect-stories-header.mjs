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

// 故事图鉴（含提示条：点未解锁项）
await p.goto(BASE + '/#/codex/stories', { waitUntil: 'networkidle' })
await p.waitForSelector('.readings', { timeout: 20000 })
await p.waitForTimeout(900)

const geo = await p.evaluate(() => {
  const R = (s) => {
    const e = document.querySelector(s)
    if (!e) return null
    const b = e.getBoundingClientRect()
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
  }
  const z = (s) => {
    const e = document.querySelector(s)
    return e ? getComputedStyle(e).zIndex : null
  }
  const fs = (s) => {
    const e = document.querySelector(s)
    return e ? getComputedStyle(e).fontSize : null
  }
  const ts = (s) => {
    const e = document.querySelector(s)
    return e ? getComputedStyle(e).textShadow : null
  }
  return {
    rows: document.querySelectorAll('.rd-row').length,
    label: document.querySelector('.rd-labeltxt')?.textContent?.trim(),
    tabFont: fs('.tb-txt'),
    tabShadow: ts('.tb-txt'),
    dim: R('.rd-dim'),
    dimBg: document.querySelector('.rd-dim') ? getComputedStyle(document.querySelector('.rd-dim')).backgroundImage.slice(0, 80) : null,
    topLineZ: z('.rd-topline'),
    decZ: z('.rd-dec'),
    dimZ: z('.rd-dim'),
  }
})
console.log('GEO:', JSON.stringify(geo, null, 1))

// 点未解锁条目 → 出提示条
await p.click('.rd-row')
await p.waitForTimeout(500)
const toast = await p.evaluate(() => {
  const t = document.querySelector('.rd-toast')
  if (!t) return null
  const b = t.getBoundingClientRect()
  const img = t.querySelector('.rd-toast-bg')
  const txt = t.querySelector('.rd-toast-txt')
  return {
    box: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) },
    imgSrc: img?.getAttribute('src') || '',
    text: txt?.textContent?.trim(),
    txtCenter: txt ? Math.round(txt.getBoundingClientRect().x + txt.getBoundingClientRect().width / 2) : null,
    boxCenter: Math.round(b.x + b.width / 2),
  }
})
console.log('TOAST:', JSON.stringify(toast, null, 1))
await p.screenshot({ path: '.shots/st-v2104.png' })

// 阅读物页同款（含心愿原野纸鹤 + 分割线）
await p.goto(BASE + '/#/codex/readings', { waitUntil: 'networkidle' })
await p.waitForSelector('.readings', { timeout: 20000 })
await p.waitForTimeout(900)
await p.screenshot({ path: '.shots/rd-v2104.png' })

// 顶部裁切（看分割线与纸鹤关系）
await p.evaluate(() => window.scrollTo(0, 0))
console.log('errors =', errs)
await b.close()
