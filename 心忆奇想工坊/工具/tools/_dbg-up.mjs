import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const p = await b.newPage({ viewport: { width: 1600, height: 1000 } })
await p.goto('http://localhost:5199/', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
const r = await p.evaluate(() => {
  const app = document.querySelector('#app')
  const cs = getComputedStyle(app)
  const box = (sel) => {
    const el = document.querySelector(sel)
    if (!el) return null
    const s = getComputedStyle(el)
    const b = el.getBoundingClientRect()
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), area: s.gridArea, display: s.display }
  }
  return {
    cols: cs.gridTemplateColumns,
    rows: cs.gridTemplateRows,
    areas: cs.gridTemplateAreas,
    top: box('.topbar'), rail: box('.rail'), stage: box('.stage'), console: box('.console'), panel: box('.panel'),
  }
})
console.log(JSON.stringify(r, null, 1))
await b.close()
