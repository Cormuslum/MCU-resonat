/** 玄学运势全流程验收：`npm run dev` 后 `node tools/verify-almanac.mjs` */
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const pass = []
const fail = []
const ok = (c, m) => (c ? pass.push(m) : fail.push(m))
const eq = (a, b, m) => ok(a === b, `${m}（期望 ${b}，实际 ${a}）`)

/** 桶内四个卷轴的命中点（nx,ny 为桶框归一化坐标；已避开彼此掩码） */
const P = {
  past: { nx: 0.388, ny: 0.388 },
  today: { nx: 0.487, ny: 0.263 },
  future: { nx: 0.613, ny: 0.338 },
  bazi: { nx: 0.563, ny: 0.512 },
  empty: { nx: 0.9, ny: 0.1 },
}

const b = await chromium.launch({ executablePath: CHROME, headless: true })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => {
  if (m.type() === 'error') errs.push('console: ' + m.text())
})

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
    basket: one('.sc-basket'),
    sheet: one('.sheet'),
    axles: many('.axle'),
    bm: one('.bm'),
    bmClass: document.querySelector('.bm')?.className ?? '',
    bmArt: document.querySelector('.bm-tier-art')?.getAttribute('src') ?? '',
    bmFlipped: !!document.querySelector('.bm-card')?.classList.contains('flipped'),
    sheetClip: (() => {
      const e = document.querySelector('.sheet')
      return e ? getComputedStyle(e).clipPath : ''
    })(),
    colTops: [...document.querySelectorAll('.col')].map((e) => Math.round(e.getBoundingClientRect().top)),
    colBottoms: [...document.querySelectorAll('.col')].map((e) => Math.round(e.getBoundingClientRect().bottom)),
    sceneOp: +getComputedStyle(document.querySelector('.alm-scene')).opacity,
    scrollOp: +getComputedStyle(document.querySelector('.scroll')).opacity,
    hover: document.querySelectorAll('.bs-btn.on').length,
    guaText: document.querySelector('[data-w="guaText"]')?.textContent ?? '',
    guaFull: document.querySelector('.gua-text')?.getAttribute('data-full') ?? '',
    tier: document.querySelector('.bm-col')?.textContent?.trim(),
    total: document.querySelector('.bm-num')?.textContent?.trim(),
    pgDisabled: [...document.querySelectorAll('.pg')].map((e) => e.disabled),
    dis: document.querySelector('.dis') ? document.querySelector('.dis').textContent.replace(/\s+/g, '') : null,
    bdOpen: !!document.querySelector('.bd-mask'),
    scrollShown: document.querySelector('.scroll').classList.contains('show'),
    written: [...document.querySelectorAll('[data-w]')].reduce((a, e) => a + (e.textContent || '').length, 0),
    scrollChildren: document.querySelectorAll('.scroll .qa').length,
    hasCloseX: [...document.querySelectorAll('.scroll button')].some((e) => /×|✕|✖/.test(e.textContent || '')),
  }
}

async function gotoAlmanac() {
  await p.goto(BASE + '/#/almanac', { waitUntil: 'domcontentloaded' })
  // 起一级 ↔ 二级切换会铺 1.4s 黑屏加载层（整屏拦截指针）
  // 等待时间必须盖过它，否则悬停检测全落空
  await p.waitForTimeout(1900)
}
async function clickBasket(key) {
  const s = await p.evaluate(SNAP)
  await p.mouse.click(s.basket.x + s.basket.w * P[key].nx, s.basket.y + s.basket.h * P[key].ny)
}
async function esc(n = 1) {
  for (let i = 0; i < n; i++) {
    await p.keyboard.press('Escape')
    await p.waitForTimeout(750)
  }
}

try {
/* ═══════════ 0. 预置生辰（跳过首登，首登流程在后面单测） ═══════════ */
await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await p.evaluate(() => {
  localStorage.setItem('nikki-almanac-birth-v1', JSON.stringify({ year: 1995, month: 6, day: 15, hour: 9 }))
  localStorage.setItem('nikki-almanac-uid-v1', 'u-verify')
})
await p.goto('about:blank')
await gotoAlmanac()

/* ═══════════ 1. 侧边栏文案 ═══════════ */
const navText = await p.evaluate(() =>
  [...document.querySelectorAll('a,button')].map((e) => e.textContent.replace(/\s+/g, '')).filter((t) => t.includes('玄学')),
)
ok(navText.some((t) => t.includes('玄学运势')), `侧边栏文案「玄学运势」（${navText[0] ?? '未找到'}）`)

/* ═══════════ 2. 待机几何 = pxdesk ═══════════ */
const idle = await p.evaluate(SNAP)
const geo = await p.evaluate(() => {
  const stage = document.querySelector('.design').getBoundingClientRect()
  const k = stage.width / 1920
  const r = (sel) => {
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
  return { desk: r('.sc-desk'), basket: r('.sc-basket'), ink: r('.sc-ink'), back: r('.sc-back') }
})
eq(JSON.stringify(geo.desk), JSON.stringify({ x: -810, y: 648, w: 1879, h: 1089 }), '方桌 (-810,648) 1879×1089')
eq(JSON.stringify(geo.basket), JSON.stringify({ x: -197, y: 439, w: 720, h: 717 }), '收纳桶 (-197,439) 720×717')
eq(JSON.stringify(geo.ink), JSON.stringify({ x: 348, y: 770, w: 329, h: 329 }), '墨台 (348,770) 329×329')
eq(JSON.stringify(geo.back), JSON.stringify({ x: 0, y: 0, w: 184, h: 169 }), '返回键 (0,0) 184×169')

/* ═══════════ 3. alpha 轮廓热区 ═══════════ */
for (const key of ['past', 'today', 'future']) {
  await p.mouse.move(idle.basket.x + idle.basket.w * P[key].nx, idle.basket.y + idle.basket.h * P[key].ny)
  // 悬停高亮有淡入动画 + 首帧资源加载，机器忙时 320ms 偶尔不够 → 轮询等它亮起来
  await p.waitForFunction(
    () => document.querySelectorAll('.sc-ink .hover, .sc-ink [data-hover]').length >= 0,
    { timeout: 1000 },
  ).catch(() => {})
  let s = await p.evaluate(SNAP)
  for (let i = 0; i < 6 && s.hover !== 1; i++) {
    await p.waitForTimeout(220)
    s = await p.evaluate(SNAP)
  }
  ok(s.hover === 1, `悬停「${key}」命中 1 个图层（实际 ${s.hover}）`)
}
await p.mouse.move(idle.basket.x + idle.basket.w * P.empty.nx, idle.basket.y + idle.basket.h * P.empty.ny)
await p.waitForTimeout(320)
const noHit = await p.evaluate(SNAP)
eq(noHit.hover, 0, '桶内空白处不命中（不做大矩形热区）')

/* ═══════════ 4. 待机 → 收起 ═══════════ */
await clickBasket('today')
await p.waitForTimeout(900)
const col = await p.evaluate(SNAP)
eq(col.sceneOp, 0, '收起态：书桌装饰 opacity 0')
ok(col.axles.length === 2 && Math.abs(col.axles[1].x - (col.axles[0].x + col.axles[0].w)) <= 1,
  `收起态：两根轴杆紧贴（${col.axles[0]?.x}+${col.axles[0]?.w} == ${col.axles[1]?.x}）`)
ok(col.axles.every((a) => a.y === 62), '收起态：两杆垂直居中 y=62（(1080−956)/2）')
ok(col.sheet.w <= 60 && /inset\((1|2)\d/.test(col.sheetClip), `收起态：纸面收进杆带（宽 ${col.sheet.w}，clip ${col.sheetClip}）`)
ok(col.scrollChildren === 2 && !col.hasCloseX, '弹窗内无退出键（只有展开/收起两个箭头）')

/* ═══════════ 5. 快速展开 → 已展开几何 ═══════════ */
await p.click('.qa-open')
await p.waitForTimeout(1500)
const mid = await p.evaluate(SNAP)
ok(mid.written > 0 && mid.written < 120, `书写逐字进行中（已写 ${mid.written} 字）`)
await p.waitForTimeout(11000)
const open = await p.evaluate(SNAP)
eq(JSON.stringify(open.sheet), JSON.stringify({ x: 105, y: 46, w: 1668, h: 956 }), '展开态：纸面 (105,46) 1668×956（v1.1.02 压高）')
ok(
  Math.abs(open.axles[0].x + open.axles[0].w / 2 - open.sheet.x) <= 1 &&
    Math.abs(open.axles[1].x + open.axles[1].w / 2 - (open.sheet.x + open.sheet.w)) <= 1,
  `展开态：轴杆中心压在纸边（左 ${open.axles[0].x}+${open.axles[0].w}/2，右 ${open.axles[1].x}+${open.axles[1].w}/2）`,
)
eq(JSON.stringify([open.axles[0].y, open.axles[1].y]), JSON.stringify([46, 46]), '展开态：轴杆 y = 46（与纸面顶边齐平）')
ok(open.guaText.length >= 20, `书写完成（${open.guaText.length} 字）`)

/* ═══════════ 6. 书签三段式落定 ═══════════ */
ok(open.bmClass.includes('bm') && open.bmClass.includes('in'), `书签书写完成后出场（${open.bmClass}）`)
ok(open.bmFlipped === false, '书签默认停在背面（玄运）')
ok(/tier-/.test(open.bmArt), `书签正面用档位艺术字（${open.bmArt.split('/').pop()}）`)
ok(open.bm.x > 1450 && open.bm.y >= 44 && open.bm.y < 80, `书签挂绳贴纸面上缘（${open.bm.x},${open.bm.y}）`)

/* ═══════════ 7. 点纸面空白不退出 ═══════════ */
await p.mouse.click(open.sheet.x + 300, open.sheet.y + 700)
await p.waitForTimeout(500)
const afterBlank = await p.evaluate(SNAP)
ok(afterBlank.scrollOp === 1 && afterBlank.sheet.w === 1668, '点击纸面空白不退出')

/* ═══════════ 8. 快速收起 → 收起态 ═══════════ */
await p.click('.qa-close')
await p.waitForTimeout(900)
const closed = await p.evaluate(SNAP)
ok(closed.sheet.w <= 60, `快速收起 → 纸面收进杆带（宽 ${closed.sheet.w}）`)
eq(closed.sceneOp, 0, '快速收起 → 仍在收起态（装饰未恢复）')

/* ═══════════ 9. ESC：收起 → 待机 ═══════════ */
await esc(1)
const idle2 = await p.evaluate(SNAP)
eq(idle2.sceneOp, 1, 'ESC 在收起态 → 回到待机（装饰恢复）')

/* ═══════════ 10. 反向拖动 ≥50% → 收起；反拖到底 → 待机 ═══════════ */
await clickBasket('today')
await p.waitForTimeout(900)
await p.click('.qa-open')
await p.waitForTimeout(1200)
let ax = await p.evaluate(() => {
  const stage = document.querySelector('.design').getBoundingClientRect()
  const k = stage.width / 1920
  const e = document.querySelectorAll('.axle')[0]
  const b = e.getBoundingClientRect()
  return { x: (b.left - stage.left) / k + b.width / k / 2, y: (b.top - stage.top) / k + b.height / k / 2 }
})
// 往左拖 55%
await p.mouse.move(ax.x, ax.y)
await p.mouse.down()
for (let i = 1; i <= 10; i++) {
  await p.mouse.move(ax.x - i * 92, ax.y)
  await p.waitForTimeout(22)
}
await p.mouse.up()
await p.waitForTimeout(900)
const drag50 = await p.evaluate(SNAP)
ok(drag50.sheet.w <= 60, `反拖 ≥50% 松手 → 卷回收起态（宽 ${drag50.sheet.w}）`)

// 再展开，拖到底
await p.click('.qa-open')
await p.waitForTimeout(1200)
ax = await p.evaluate(() => {
  const stage = document.querySelector('.design').getBoundingClientRect()
  const k = stage.width / 1920
  const e = document.querySelectorAll('.axle')[0]
  const b = e.getBoundingClientRect()
  return { x: (b.left - stage.left) / k + b.width / k / 2, y: (b.top - stage.top) / k + b.height / k / 2 }
})
await p.mouse.move(ax.x, ax.y)
await p.mouse.down()
for (let i = 1; i <= 16; i++) {
  await p.mouse.move(ax.x - i * 130, ax.y)
  await p.waitForTimeout(20)
}
await p.mouse.up()
await p.waitForTimeout(900)
const drag100 = await p.evaluate(SNAP)
eq(drag100.sceneOp, 1, '反拖到底（100%）→ 回待机')

/* ═══════════ 11. 时间范围 ═══════════ */
// ② 今日：只看当天
await clickBasket('today')
await p.waitForTimeout(900)
await p.click('.qa-open')
await p.waitForTimeout(1200)
let s = await p.evaluate(SNAP)
eq(JSON.stringify(s.pgDisabled), JSON.stringify([true, true]), '② 今日感知：前后翻页都禁用（只看当天）')
await esc(2)

// ③ 未来：最多 +5
await clickBasket('future')
await p.waitForTimeout(900)
await p.click('.qa-open')
await p.waitForTimeout(1200)
s = await p.evaluate(SNAP)
eq(JSON.stringify(s.pgDisabled), JSON.stringify([true, false]), '③ 未来预测：进入即第 1 天，只能往后翻')
for (let i = 0; i < 4; i++) {
  await p.locator('.pg').nth(1).click()
  await p.waitForTimeout(300)
}
s = await p.evaluate(SNAP)
eq(JSON.stringify(s.pgDisabled), JSON.stringify([false, true]), '③ 未来预测：翻到第 5 天即止（上限 +5）')
await esc(2)

// ① 过往：无限向前
await clickBasket('past')
await p.waitForTimeout(900)
await p.click('.qa-open')
await p.waitForTimeout(1200)
s = await p.evaluate(SNAP)
eq(JSON.stringify(s.pgDisabled), JSON.stringify([false, true]), '① 过往回顾：进入即昨日，只能往前翻')
for (let i = 0; i < 8; i++) {
  await p.locator('.pg').nth(0).click()
  await p.waitForTimeout(220)
}
s = await p.evaluate(SNAP)
ok(s.pgDisabled[0] === false, '① 过往回顾：往前翻 8 天仍可继续（无限向前）')
await esc(2)

/* ═══════════ 12. 首登流程 ═══════════ */
await p.evaluate(() => {
  localStorage.removeItem('nikki-almanac-birth-v1')
  localStorage.removeItem('nikki-almanac-uid-v1')
})
await p.reload({ waitUntil: 'domcontentloaded' })
await p.waitForTimeout(700)
const dis1 = await p.evaluate(SNAP)
ok(dis1.dis !== null && dis1.dis.length > 0 && dis1.dis.length < 40, `首登：免责声明逐字书写中（${dis1.dis?.length} 字）`)
// 书写完成前桶区不可点
const before = await p.evaluate(SNAP)
await p.mouse.click(before.basket.x + before.basket.w * P.today.nx, before.basket.y + before.basket.h * P.today.ny)
await p.waitForTimeout(500)
const lockedClick = await p.evaluate(SNAP)
ok(!lockedClick.scrollShown, '首登：声明淡出前卷轴桶完全不可点')

await p.waitForTimeout(6500)
const afterDis = await p.evaluate(SNAP)
ok(afterDis.dis === null, '首登：声明结束后收起（转常驻右下角）')
const baziBtn = await p.evaluate(() => {
  const e = document.querySelector('.bs-bazi')
  return e ? { lit: e.classList.contains('lit'), dim: [...document.querySelectorAll('.bs-btn.dim')].length } : null
})
ok(baziBtn && baziBtn.lit, '首登：引导卷轴 ④ 高亮可交互')
eq(baziBtn?.dim, 3, '首登：①②③ 三卷轴灰置')

await clickBasket('bazi')
await p.waitForTimeout(600)
const bd = await p.evaluate(SNAP)
ok(bd.bdOpen, '首登：点击 ④ 弹出八字填写弹窗')
await p.click('.bd-ok')
await p.waitForTimeout(600)
const afterSave = await p.evaluate(SNAP)
ok(!afterSave.bdOpen, '首登：保存后弹窗关闭')
const unlocked = await p.evaluate(() => ({
  dim: document.querySelectorAll('.bs-btn.dim').length,
  bazi: !!document.querySelector('.bs-bazi'),
}))
eq(unlocked.dim, 0, '首登：①②③ 解锁')
eq(unlocked.bazi, false, '首登：④ 隐藏')

/* ═══════════ 13. 清除生辰 → 降级双模式 ═══════════ */
await clickBasket('today')
await p.waitForTimeout(900)
await p.click('.qa-open')
await p.waitForTimeout(1500)
const withBazi = await p.evaluate(() => !!document.querySelector('.pz'))
ok(withBazi, '填了生辰 → 八字区显示四柱')
// 起「问过没」单独记在 nikki-almanac-bazi-asked-v1 上：
// 只删 birth 不再算首登，要模拟真首登得连标记一起删
await p.evaluate(() => {
  localStorage.removeItem('nikki-almanac-birth-v1')
  localStorage.removeItem('nikki-almanac-bazi-asked-v1')
})
await p.reload({ waitUntil: 'domcontentloaded' })
// 清掉生辰 + 标记 = 又回到首登 → 免责声明走完（约 5.6s）后仍需先过引导（①②③ 此时灰置）
await p.waitForTimeout(7000)
await clickBasket('bazi')
await p.waitForTimeout(600)
await p.click('.bd-skip')
await p.waitForTimeout(500)
await clickBasket('today')
await p.waitForTimeout(900)
await p.click('.qa-open')
await p.waitForTimeout(1500)
const noBazi = await p.evaluate(() => ({
  empty: !!document.querySelector('.bz-empty'),
  btn: !!document.querySelector('.bz-btn'),
  dis: !!document.querySelector('.dis-corner'),
}))
ok(noBazi.empty && noBazi.btn, '未填生辰 → 八字区降级为「填写生辰」入口')
ok(noBazi.dis, '非首登 → 免责声明常驻右下角')

} catch (e) {
  fail.push('异常中断：' + e.message.split('\n')[0])
}

/* ═══════════ 输出 ═══════════ */
if (errs.length) fail.push('页面报错：' + errs.slice(0, 3).join(' | '))
console.log(`\n通过 ${pass.length} 项`)
for (const m of pass) console.log('  ✓ ' + m)
if (fail.length) {
  console.log(`\n失败 ${fail.length} 项`)
  for (const m of fail) console.log('  ✗ ' + m)
}
console.log(fail.length ? '\nFAIL' : '\nALL PASS')
await b.close()
process.exit(fail.length ? 1 : 0)
