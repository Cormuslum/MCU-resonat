/**
 * 深海回响界面截图（开发期巡检，不打包）
 *
 * 用法：node tools/shot-echo.mjs [pulls]
 *   pulls 可选，指定后先模拟抽卡把累计抽数推到该值再截图
 */
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const OUT = '.shots'

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) => errors.push(`[failed] ${r.url()} :: ${r.failure()?.errorText}`))
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`[${r.status()}] ${r.url()}`)
})

await page.goto(`${BASE}/#/banner`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)

await page.click('.wish-card')
await page.waitForTimeout(1400)

await page.screenshot({ path: `${OUT}/echo.png` })

// 关键元素的实际盒子，跟标注表对照
const probe = await page.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }
  }
  return {
    back: pick('.ds-back'),
    title: pick('.ds-title'),
    ribbon: pick('.ds-ribbon'),
    scene: pick('.ds-scene'),
    name: pick('.ds-name'),
    divider: pick('.ds-divider'),
    sub: pick('.ds-sub'),
    desc: pick('.ds-desc'),
    badge: pick('.ds-badge'),
    nodes: [...document.querySelectorAll('.ds-node')].map((n) => ({
      nx: n.style.getPropertyValue('--nx'),
      ny: n.style.getPropertyValue('--ny'),
      cap: n.querySelector('.ds-cap')?.textContent?.trim(),
    })),
    total: document.querySelector('.ds-badge-num')?.textContent?.trim(),
    hint: document.querySelector('.ds-hint')?.textContent?.trim(),
  }
})
console.log(JSON.stringify(probe, null, 2))
if (errors.length) console.log('--- console ---\n' + errors.join('\n'))

await browser.close()
