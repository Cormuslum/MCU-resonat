import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
await p.goto('http://localhost:5178/#/versions', { waitUntil: 'domcontentloaded' })
await p.waitForSelector('.vr-minor', { timeout: 20000 })
await p.waitForTimeout(1000)
const r = await p.evaluate(() => ({
  majors: [...document.querySelectorAll('.vr-major')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
  minors: document.querySelectorAll('.vr-minor').length,
  last: [...document.querySelectorAll('.vr-minor')].slice(-2).map((e) => e.textContent.replace(/\s+/g, ' ').trim()),
}))
console.log(JSON.stringify(r, null, 1))
console.log('errs', errs)
await b.close()
