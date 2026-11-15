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
await p.waitForTimeout(1200)

/* 1) 搜索弹窗（服装图鉴入口 → 放大镜） */
await p.goto(BASE + '/#/codex/clothes', { waitUntil: 'networkidle' })
await p.waitForTimeout(1500)
const mag = await p.$('.cl-search')
if (mag) {
  await mag.click()
  await p.waitForTimeout(700)
  await p.screenshot({ path: '.shots/sp-fix.png' })
  const geo = await p.evaluate(() => {
    const bar = document.querySelector('.sp-sbar').getBoundingClientRect()
    const ic = document.querySelector('.sp-sicon').getBoundingClientRect()
    const inp = document.querySelector('.sp-sinput').getBoundingClientRect()
    const cs = getComputedStyle(document.querySelector('.sp-sinput'))
    return {
      bar: { x: Math.round(bar.x), w: Math.round(bar.width), h: Math.round(bar.height) },
      icon: { x: Math.round(ic.x), y: Math.round(ic.y), w: Math.round(ic.width), h: Math.round(ic.height) },
      iconCenterInBar: { x: Math.round(ic.x + ic.width / 2 - bar.x), y: Math.round(ic.y + ic.height / 2 - bar.y) },
      inputLeftInBar: Math.round(inp.x - bar.x),
      fontSize: cs.fontSize,
    }
  })
  console.log('SEARCH:', JSON.stringify(geo))
  await p.keyboard.press('Escape')
} else {
  console.log('未找到 .cl-search')
}

/* 2) 阅读物 · 伊赞之土空态（贴纸 + 锁） */
await p.goto(BASE + '/#/codex/readings', { waitUntil: 'networkidle' })
await p.waitForSelector('.readings', { timeout: 20000 })
await p.waitForTimeout(600)
await p.locator('.rd-tab').nth(1).click()
await p.waitForTimeout(900)
await p.screenshot({ path: '.shots/rd-fix-yizan.png' })

const yi = await p.evaluate(() => {
  const R = (s) => {
    const e = document.querySelector(s)
    if (!e) return null
    const b = e.getBoundingClientRect()
    return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
  }
  const st = document.querySelector('.rd-empty-sticker')
  return {
    sticker: R('.rd-empty-sticker'),
    stickerOp: st ? getComputedStyle(st).opacity : null,
    lock: R('.rd-lock'),
    row: R('.rd-row'),
    list: R('.rd-list'),
    tab: [...document.querySelectorAll('.rd-tab')].map((e) => {
      const b = e.getBoundingClientRect()
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
    }),
  }
})
console.log('YIZAN:', JSON.stringify(yi, null, 1))

/* 3) 阅读物 · 心愿原野正文（标题固定 + 滚动条） */
await p.locator('.rd-tab').nth(0).click()
await p.waitForTimeout(900)
await p.click('.rd-collect')
await p.waitForTimeout(400)
await p.locator('.rd-row').first().click()
await p.waitForTimeout(900)
await p.screenshot({ path: '.shots/rd-fix-wish.png' })

const wish = await p.evaluate(() => {
  const wrap = document.querySelector('.rd-cbody-wrap')
  const t = document.querySelector('.rd-ctitle').getBoundingClientRect()
  return {
    titleTop: Math.round(t.y),
    wrapScrollable: wrap ? wrap.scrollHeight > wrap.clientHeight + 2 : null,
    wrapScrollH: wrap?.scrollHeight,
    wrapClientH: wrap?.clientHeight,
    sbWidth: wrap ? getComputedStyle(wrap).getPropertyValue('scrollbar-width') : null,
  }
})
console.log('WISH:', JSON.stringify(wish))

/* 4) 切区域黑屏：点击后立刻检查 .rd-blackout.on */
await p.locator('.rd-tab').nth(1).click()
const blackNow = await p.evaluate(() => document.querySelector('.rd-blackout')?.classList.contains('on'))
await p.waitForTimeout(500)
const blackAfter = await p.evaluate(() => document.querySelector('.rd-blackout')?.classList.contains('on'))
console.log('BLACKOUT: 点击瞬间 on =', blackNow, '| 500ms 后 on =', blackAfter)

console.log('errors =', errs)
await b.close()
