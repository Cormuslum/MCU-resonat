import { chromium } from 'playwright-core'

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

  // 现状口径：主页自 .x 起循环播 bg-video.webm + bg-audio.ogg
  // 网络永远不会「空闲」→ waitUntil 必须用 domcontentloaded，不能用 networkidle
await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await p.evaluate(() => localStorage.removeItem('nikki-resonance-save-v1'))
await p.goto(BASE + '/#/codex/readings', { waitUntil: 'domcontentloaded' })
await p.waitForSelector('.readings', { timeout: 20000 })
await p.waitForTimeout(600)

// 全解锁，方便随便点
await p.click('.rd-collect')
await p.waitForTimeout(500)

// 找一本正文溢出的
let found = -1
for (let i = 0; i < 40; i++) {
  await p.locator('.rd-row').nth(i).click()
  await p.waitForTimeout(320)
  const scrollable = await p.evaluate(() => {
    const w = document.querySelector('.rd-cbody-wrap')
    return w ? w.scrollHeight > w.clientHeight + 4 : false
  })
  if (scrollable) {
    found = i
    break
  }
}
ok(found >= 0, `找到正文溢出的条目（第 ${found + 1} 本）`)

if (found >= 0) {
  await p.waitForTimeout(400)
  const before = await p.evaluate(() => {
    const t = document.querySelector('.rd-ctitle').getBoundingClientRect()
    const w = document.querySelector('.rd-cbody-wrap')
    return { titleY: Math.round(t.y), scrollTop: w.scrollTop, sh: w.scrollHeight, ch: w.clientHeight }
  })

  // 滚动正文容器
  await p.evaluate(() => {
    const w = document.querySelector('.rd-cbody-wrap')
    w.scrollTop = 220
  })
  await p.waitForTimeout(300)

  const after = await p.evaluate(() => {
    const t = document.querySelector('.rd-ctitle').getBoundingClientRect()
    const w = document.querySelector('.rd-cbody-wrap')
    return { titleY: Math.round(t.y), scrollTop: Math.round(w.scrollTop) }
  })

  ok(after.scrollTop > 100, `正文可滚动（scrollTop ${before.scrollTop} → ${after.scrollTop}）`)
  ok(before.titleY === after.titleY, `标题固定不动（y ${before.titleY} → ${after.titleY}）`)

  await p.screenshot({ path: '.shots/rd-fix-scroll.png' })

  // 滚动条宽度
  const sbw = await p.evaluate(() => {
    const w = document.querySelector('.rd-cbody-wrap')
    const before = w.offsetWidth
    return { offsetW: before }
  })
  ok(sbw.offsetW > 0, `正文容器宽 ${sbw.offsetW}px`)
}

// 切区域黑屏
await p.locator('.rd-tab').nth(1).click()
const onNow = await p.evaluate(() => document.querySelector('.rd-blackout')?.classList.contains('on'))
await p.waitForTimeout(500)
const offAfter = await p.evaluate(() => document.querySelector('.rd-blackout')?.classList.contains('on'))
ok(onNow === true, '切换大版本瞬间黑屏遮罩开启')
ok(offAfter === false, '160ms 后黑屏遮罩关闭（已淡出）')

// 空态贴纸底边对齐纸面底
await p.waitForTimeout(500)
const stick = await p.evaluate(() => {
  const s = document.querySelector('.rd-empty-sticker')
  if (!s) return null
  const r = s.getBoundingClientRect()
  return { y: Math.round(r.y), bottom: Math.round(r.bottom), h: Math.round(r.height), op: getComputedStyle(s).opacity }
})
ok(stick !== null, '空态贴纸存在')
ok(stick && Math.abs(stick.bottom - 946) <= 3, `贴纸底边 ${stick?.bottom} ≈ 纸面底 946（紧贴下边缘）`)
ok(stick && Math.abs(parseFloat(stick.op) - 0.15) < 0.02, `贴纸 opacity=${stick?.op} ≈ 0.15`)
ok(stick && Math.abs(stick.h - 622) <= 3, `贴纸高 ${stick?.h} ≈ 622（已放大）`)

// 锁位置：应在行右端（滚动条左侧）
const lockInfo = await p.evaluate(() => {
  const row = document.querySelector('.rd-row')
  const l = row.querySelector('.rd-lock')
  if (!l) return null
  const rb = row.getBoundingClientRect()
  const lb = l.getBoundingClientRect()
  return { rowRight: Math.round(rb.right), lockLeft: Math.round(lb.left), lockRight: Math.round(lb.right), w: Math.round(lb.width) }
})
ok(lockInfo !== null, '未获取条目有锁')
ok(lockInfo && lockInfo.rowRight - lockInfo.lockRight <= 20, `锁贴行右端（行右 ${lockInfo?.rowRight}，锁右 ${lockInfo?.lockRight}）`)
ok(lockInfo && lockInfo.w <= 32, `锁容器宽 ${lockInfo?.w} ≤ 32（已缩小）`)

console.log('\n==== 结果 ====')
pass.forEach((m) => console.log('PASS  ' + m))
if (fail.length) fail.forEach((m) => console.log('FAIL  ' + m))
console.log(`\n通过 ${pass.length} / ${pass.length + fail.length}`)
console.log('errors =', errs)
await b.close()
