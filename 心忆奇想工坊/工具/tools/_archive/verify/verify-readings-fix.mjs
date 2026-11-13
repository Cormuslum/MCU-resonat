import { chromium } from 'playwright-core'

/* ⚠ v1.6.00 现状口径：本脚本是「博物图鉴重构」之前的旧巡检，
 *   断言的入口（`.mz-hit` / `.rd-collect` 等）在重构后已不存在，跑起来只会报超时。
 *   现行验收统一看 tools/verify-readings.mjs（按《博物图鉴重构计划书.md》§8 M3）。
 *   文件保留仅作历史参考，不再执行。 */
console.log('[已并入 verify-readings.mjs] 本脚本为重构前的旧巡检，不再执行。')
process.exit(0)


const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const pass = []
const fail = []
const ok = (c, m) => (c ? pass.push(m) : fail.push(m))

const b = await chromium.launch({ executablePath: CHROME, headless: true })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()) })

  // v1.6.00 现状口径：主页自 v2.3.x 起循环播 bg-video.webm + bg-audio.ogg，
  // 网络永远不会「空闲」→ waitUntil 必须用 domcontentloaded，不能用 networkidle
await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await p.evaluate(() => localStorage.removeItem('nikki-resonance-save-v1'))
await p.goto(BASE + '/#/codex/readings', { waitUntil: 'domcontentloaded' })
await p.waitForSelector('.readings', { timeout: 20000 })
await p.waitForTimeout(700)

/* 1) 选项卡容器 = menu_s，且常态不显示 */
const tabInfo = await p.evaluate(() => {
  const t = document.querySelector('.rd-tab')
  const hi = t.querySelector('.tb-hi')
  return {
    src: hi?.getAttribute('src') || '',
    hasBgImg: !!t.querySelector('.tb-bg'),
    onOpacity: getComputedStyle(hi).opacity,
    box: (() => { const r = t.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) } })(),
  }
})
ok(tabInfo.src.includes('btn-menu'), `选项卡容器用 menu_s（src=${tabInfo.src}）`)
ok(!tabInfo.hasBgImg, '选项卡不再有 tabSelN 底色层')
ok(parseFloat(tabInfo.onOpacity) === 1, `选中态高亮框显示（opacity=${tabInfo.onOpacity}）`)

// 未选中那一个常态应不显示
const offOpacity = await p.evaluate(() => {
  const t = [...document.querySelectorAll('.rd-tab')].find((e) => !e.classList.contains('on'))
  return getComputedStyle(t.querySelector('.tb-hi')).opacity
})
ok(parseFloat(offOpacity) === 0, `未选中态高亮框不显示（opacity=${offOpacity}）`)

/* 2) 右上角 menu 已移除 */
const menuGone = await p.evaluate(() => ({
  menu: !!document.querySelector('.rd-menu'),
  back: !!document.querySelector('.rd-back'),
}))
ok(!menuGone.menu, '右上角 menu 按钮已移除')
ok(menuGone.back, '返回键仍在')

/* 3) 列表底边距：距 tabpanel 底 ≥ 30px */
const gap = await p.evaluate(() => {
  const list = document.querySelector('.rd-list').getBoundingClientRect()
  // tabpanel 是第二个 rd-layer（reel/paper/tabpanel 顺序）→ 用坐标推算
  return { listBottom: Math.round(list.bottom) }
})
ok(gap.listBottom <= 957, `列表底边 y=${gap.listBottom}（≤957，较原先 943 上移后与面板底留 ≥30px）`)

/* 4) 锁在书名之后 */
const lockOrder = await p.evaluate(() => {
  const row = document.querySelector('.rd-row')
  const kids = [...row.children].map((e) => e.className)
  const ti = kids.indexOf('rd-title')
  const li = kids.indexOf('rd-lock')
  return { kids, ti, li }
})
ok(lockOrder.li > lockOrder.ti, `锁在书名之后（顺序 ${JSON.stringify(lockOrder.kids)}）`)

// 锁的 x 应大于书名的 x
const lockPos = await p.evaluate(() => {
  const row = document.querySelector('.rd-row')
  const t = row.querySelector('.rd-title').getBoundingClientRect()
  const l = row.querySelector('.rd-lock')?.getBoundingClientRect()
  return l ? { titleRight: Math.round(t.right), lockLeft: Math.round(l.left) } : null
})
ok(lockPos && lockPos.lockLeft >= lockPos.titleRight - 2, `锁位于书名右侧（title.right=${lockPos?.titleRight}, lock.left=${lockPos?.lockLeft}）`)

/* 5) 空态不显示彩蛋 */
const eggEmpty = await p.$('.rd-egg')
ok(eggEmpty === null, '空态（未选中）不显示随机彩蛋')

/* 6) 彩蛋：切书才换；重复点同一本不换 */
await p.click('.rd-row')
await p.waitForTimeout(80)
await p.click('.rd-row')
await p.waitForTimeout(900)
const egg1 = await p.$eval('.rd-egg', (e) => e.getAttribute('src')).catch(() => null)
ok(egg1 !== null, `选中后显示彩蛋（${egg1}）`)

// 反复点同一本 5 次
for (let i = 0; i < 5; i++) {
  await p.locator('.rd-row').first().click()
  await p.waitForTimeout(120)
}
await p.waitForTimeout(400)
const eggSame = await p.$eval('.rd-egg', (e) => e.getAttribute('src')).catch(() => null)
ok(eggSame === egg1, `重复点同一本彩蛋不变（${egg1} → ${eggSame}）`)

// 换一本（先双击解锁第二本，v1.0.05 起未解锁不显示彩蛋）
await p.locator('.rd-row').nth(1).click()
await p.waitForTimeout(80)
await p.locator('.rd-row').nth(1).click()
await p.waitForTimeout(900)
const egg2 = await p.$eval('.rd-egg', (e) => e.getAttribute('src')).catch(() => null)
ok(egg2 !== null, `切换阅读物后彩蛋仍存在（${egg2}）`)
console.log(`  （彩蛋换书：${egg1} → ${egg2}，可能随机相同）`)

// 切区域 → 彩蛋隐藏（空态）
await p.locator('.rd-tab').nth(1).click()
await p.waitForTimeout(600)
const eggAfterRegion = await p.$('.rd-egg')
ok(eggAfterRegion === null, '切换大版本后（空态）彩蛋隐藏')

await p.screenshot({ path: '.shots/rd-v2101-yizan.png' })

// 回心愿原野截图
await p.locator('.rd-tab').nth(0).click()
await p.waitForTimeout(400)
await p.click('.rd-collect')
await p.waitForTimeout(300)
await p.locator('.rd-row').first().click()
await p.waitForTimeout(900)
await p.screenshot({ path: '.shots/rd-v2101-wish.png' })

console.log('\n==== 结果 ====')
pass.forEach((m) => console.log('PASS  ' + m))
if (fail.length) fail.forEach((m) => console.log('FAIL  ' + m))
console.log(`\n通过 ${pass.length} / ${pass.length + fail.length}`)
console.log('errors =', errs)
await b.close()
process.exit(fail.length ? 1 : 0)
