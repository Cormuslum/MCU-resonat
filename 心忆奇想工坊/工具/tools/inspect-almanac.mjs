/**
 * 玄学运势三态截图 + 几何检查：待机 → 点卷轴（收起）→ 快速展开（已展开）→ 快速收起 → 反拖回待机。
 * 用法：`npm run dev` 后 `node tools/inspect-almanac.mjs`。
 */
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const SHOT = '.shots'

/** 在页面里取所有关键元素的实机坐标（已除掉舞台缩放） */
const SNAP = () => {
  const stage = document.querySelector('.design').getBoundingClientRect()
  const k = stage.width / 1920
  const one = (sel) => {
    const e = document.querySelector(sel)
    if (!e) return null
    const b = e.getBoundingClientRect()
    return {
      x: Math.round((b.left - stage.left) / k),
      y: Math.round((b.top - stage.top) / k),
      w: Math.round(b.width / k),
      h: Math.round(b.height / k),
    }
  }
  const many = (sel) =>
    [...document.querySelectorAll(sel)].map((e) => {
      const b = e.getBoundingClientRect()
      return {
        x: Math.round((b.left - stage.left) / k),
        y: Math.round((b.top - stage.top) / k),
        w: Math.round(b.width / k),
        h: Math.round(b.height / k),
      }
    })
  return {
    bg: one('.alm-bg'),
    desk: one('.sc-desk'),
    basket: one('.sc-basket'),
    ink: one('.sc-ink'),
    back: one('.sc-back'),
    sheet: one('.sheet'),
    axles: many('.axle'),
    bm: one('.bm'),
    btns: many('.bs-btn').length,
    hover: many('.bs-btn.on').length,
    sceneOp: getComputedStyle(document.querySelector('.alm-scene')).opacity,
    scrollOp: getComputedStyle(document.querySelector('.scroll')).opacity,
    total: document.querySelector('.ring-num')?.textContent?.trim(),
    tier: document.querySelector('.ring-tier')?.textContent?.trim(),
    gua: document.querySelector('.gn-main')?.textContent?.trim(),
    guaText: document.querySelector('[data-w="guaText"]')?.textContent ?? '',
    bmClass: document.querySelector('.bm')?.className ?? '',
    quill: document.querySelector('.quill')?.classList.contains('show'),
  }
}

const b = await chromium.launch({ executablePath: CHROME, headless: true })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => {
  if (m.type() === 'error') errs.push('console: ' + m.text())
})

// 预置生辰，跳过首登引导（首登流程单独验证）
await p.goto(BASE + '/', { waitUntil: 'networkidle' })
await p.evaluate(() => {
  localStorage.setItem('nikki-almanac-birth-v1', JSON.stringify({ year: 1995, month: 6, day: 15, hour: 9 }))
  localStorage.setItem('nikki-almanac-uid-v1', 'u-inspect')
})
await p.goto(BASE + '/#/almanac', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)

/* ── 1 待机 ── */
await p.screenshot({ path: `${SHOT}/alm-1-idle.png` })
const idle = await p.evaluate(SNAP)
console.log('① 待机：', JSON.stringify({ desk: idle.desk, basket: idle.basket, ink: idle.ink, back: idle.back, btns: idle.btns }))

/* ── 2 悬停「今日感知」 ── */
const bx = idle.basket.x + idle.basket.w * 0.48
const by = idle.basket.y + idle.basket.h * 0.5
await p.mouse.move(bx, by)
await p.waitForTimeout(500)
const hov = await p.evaluate(SNAP)
await p.screenshot({ path: `${SHOT}/alm-2-hover.png` })
console.log('② 悬停命中图层数：', hov.hover)

/* ── 3 点击 → 收起态 ── */
await p.mouse.click(bx, by)
await p.waitForTimeout(950)
await p.screenshot({ path: `${SHOT}/alm-3-collapsed.png` })
const col = await p.evaluate(SNAP)
console.log('③ 收起：', JSON.stringify({ sheet: col.sheet, axles: col.axles, sceneOp: col.sceneOp }))

/* ── 4 快速展开 ── */
await p.click('.qa-open')
await p.waitForTimeout(1100)
await p.screenshot({ path: `${SHOT}/alm-4-open-early.png` })
await p.waitForTimeout(11000)
await p.screenshot({ path: `${SHOT}/alm-5-open-done.png` })
const open = await p.evaluate(SNAP)
console.log('④ 展开：', JSON.stringify({ sheet: open.sheet, axles: open.axles, bm: open.bm, bmClass: open.bmClass, total: open.total, tier: open.tier, gua: open.gua, guaLen: open.guaText.length, quill: open.quill }))

/* ── 5 快速收起 ── */
await p.click('.qa-close')
await p.waitForTimeout(950)
const closed = await p.evaluate(SNAP)
console.log('⑤ 快速收起后纸面：', JSON.stringify(closed.sheet))

/* ── 6 再展开 → 反拖到底回待机 ── */
await p.click('.qa-open')
await p.waitForTimeout(950)
const ax = await p.evaluate(() => {
  const stage = document.querySelector('.design').getBoundingClientRect()
  const k = stage.width / 1920
  const e = document.querySelectorAll('.axle')[0]
  const b = e.getBoundingClientRect()
  return { x: (b.left - stage.left) / k + b.width / k / 2, y: (b.top - stage.top) / k + b.height / k / 2 }
})
await p.mouse.move(ax.x, ax.y)
await p.mouse.down()
for (let i = 1; i <= 14; i++) {
  await p.mouse.move(ax.x - i * 130, ax.y)
  await p.waitForTimeout(25)
}
await p.mouse.up()
await p.waitForTimeout(950)
const back = await p.evaluate(SNAP)
await p.screenshot({ path: `${SHOT}/alm-6-backidle.png` })
console.log('⑥ 反拖到底：', JSON.stringify({ sceneOp: back.sceneOp, scrollOp: back.scrollOp, sheet: back.sheet }))

if (errs.length) console.log('\n页面报错：\n' + errs.slice(0, 6).join('\n'))
await b.close()
