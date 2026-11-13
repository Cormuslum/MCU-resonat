import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const S = '.shots'

const b = await chromium.launch({ executablePath: CHROME, headless: true })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })

/* 首登：免责声明 + 八字弹窗 */
await p.goto(BASE + '/', { waitUntil: 'networkidle' })
await p.evaluate(() => {
  localStorage.removeItem('nikki-almanac-birth-v1')
  localStorage.removeItem('nikki-almanac-uid-v1')
})
await p.goto(BASE + '/#/almanac', { waitUntil: 'networkidle' })
await p.waitForTimeout(2600)
await p.screenshot({ path: `${S}/alm-final-disclaimer.png` })
await p.waitForTimeout(4200)
await p.screenshot({ path: `${S}/alm-final-guide.png` })

const bk = await p.evaluate(() => {
  const r = document.querySelector('.sc-basket').getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
})
await p.mouse.click(bk.x + bk.w * 0.563, bk.y + bk.h * 0.512)
await p.waitForTimeout(700)
await p.screenshot({ path: `${S}/alm-final-bazi.png` })
await p.click('.bd-ok')
await p.waitForTimeout(500)

/* 展开态 */
await p.mouse.click(bk.x + bk.w * 0.487, bk.y + bk.h * 0.263)
await p.waitForTimeout(900)
await p.screenshot({ path: `${S}/alm-final-collapsed.png` })
await p.click('.qa-open')
await p.waitForTimeout(1200)
await p.screenshot({ path: `${S}/alm-final-writing.png` })
await p.waitForTimeout(11000)
await p.screenshot({ path: `${S}/alm-final-open.png` })

/* 待机（带标题） */
await p.keyboard.press('Escape')
await p.waitForTimeout(800)
await p.keyboard.press('Escape')
await p.waitForTimeout(900)
await p.screenshot({ path: `${S}/alm-final-idle.png` })

await b.close()
console.log('shots ok')
