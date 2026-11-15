// 局部截图：立绘容器（整体立绘 vs 半身像）对比
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = '.shots'
mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:5178'

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--force-color-profile=srgb'] })
const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })).newPage()

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
await page.waitForSelector('.cl-parts .cl-part', { timeout: 10000 })
await page.waitForTimeout(900)

// 展示区局部：整体立绘
const clip = { x: 280, y: 180, width: 340, height: 470 }
await page.screenshot({ path: `${OUT}/cl-05-portrait.png`, clip })
console.log('整体立绘 class:', await page.$eval('.sh-img', (e) => e.className))

// 选第一个部件 → 半身像
await page.locator('.cl-parts .cl-part').nth(0).click()
await page.waitForTimeout(500)
await page.screenshot({ path: `${OUT}/cl-06-halfbody.png`, clip })
console.log('半身像 class:', await page.$eval('.sh-img', (e) => e.className))
console.log('半身像 natural:', await page.$eval('.sh-img', (e) => `${e.naturalWidth}x${e.naturalHeight}`))
console.log('半身像盒:', await page.$eval('.sh-img', (e) => { const r = e.getBoundingClientRect(); return `${Math.round(r.width)}x${Math.round(r.height)}` }))

// 部件栏局部（Req6 高亮框等大）
await page.locator('.cl-parts .cl-part').nth(0).hover()
await page.waitForTimeout(400)
const pbox = await page.locator('.cl-parts').boundingBox()
await page.screenshot({ path: `${OUT}/cl-07-parts-hover.png`, clip: { x: pbox.x, y: pbox.y - 20, width: 700, height: 180 } })

await browser.close()
console.log('done')
