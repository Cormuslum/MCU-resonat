/**
 * verify-v2400.mjs —— 六项改动验收
 *
 * 覆盖：
 * 1 侧边栏 常态隐藏 / 左缘 100px 唤起 / 移开收起 / 左下角切换键不误触
 * 2 主页 LOGO 动态背景只有「心忆共鸣」/ 静态背景双 LOGO 恢复
 * 3 套装名版式 星级 32.4（54 的 3/5）/ 间距 −3（−6 的 1/2）/ 名称牌 300×86
 * 4 图鉴切换 整屏碎裂（600 块）→ 虚空 → 重构
 * 5 加载过渡 三类跳转触发 / 进度条 bottom 100 / 装饰底边 932 / 结束后销毁
 * 6 套装名列表 常驻池 8 套全列出 / 同屏 3 套 / 滚轮与拖动都能滚
 *
 * 运行：node tools/verify-v2400.mjs（需 dev server 在 5178）
 */
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:5178'
let pass = 0
let fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}${extra ? '  · ' + extra : ''}`)
  } else {
    fail++
    console.log(`  ✗ ${name}${extra ? '  · ' + extra : ''}`)
  }
}

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const p = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })

/* 版本门禁：未选版本时 /banner 会被守卫打回版本页，这里预置一个当前版本 */
await p.addInitScript(() => {
  try {
    const KEY = 'nikki-resonance-save-v1'
    const raw = localStorage.getItem(KEY)
    const s = raw ? JSON.parse(raw) : { version: 1, pity: {}, codex: {}, milestoneClaimed: {}, history: [], settings: {} }
    if (!s.selectedVersion) s.selectedVersion = '2.10'
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch { /* about:blank 这类文档不允许访问 localStorage，跳过即可 */ }
})
const errs = []
p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message))
p.on('console', (m) => m.type() === 'error' && errs.push('CONSOLE ' + m.text().slice(0, 120)))

const go = async (hash) => {
  await p.goto('about:blank')
  await p.goto(`${BASE}/#${hash}`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(1500)
}

const style = (sel, prop) =>
  p.evaluate(([s, pr]) => {
    const el = document.querySelector(s)
    return el ? getComputedStyle(el)[pr] : null
  }, [sel, prop])

const rect = (sel) =>
  p.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y, w: r.width, h: r.height, bottom: r.bottom, right: r.right }
  }, sel)

/* ═══════════════════════ 1 · 侧边栏 */
console.log('\n1) 侧边栏：常态隐藏 + 左缘 100px 唤起')
await go('/banner')
ok('常态 opacity = 0', (await style('.rail', 'opacity')) === '0')
ok('常态整体在屏幕左侧之外', (await rect('.rail')).right <= 0, `right ${Math.round((await rect('.rail')).right)}`)
// (50,540) 压在共鸣页卡池列表上（.pool-list 带 data-no-rail，故意让位），
// 取 y=1000 的空白背景才是在测「100px 感应宽度」本身
await p.mouse.move(50, 1000)
await p.waitForTimeout(500)
ok('指针在 x=50（空白处）→ 展开', await p.evaluate(() => !!document.querySelector('.rail.open')))
const railR = await rect('.rail')
ok('面板宽 158', Math.round(railR.w) === 158, `实际 ${Math.round(railR.w)}`)
await p.mouse.move(420, 540)
await p.waitForTimeout(500)
ok('指针移到 x=420 → 收起', await p.evaluate(() => !document.querySelector('.rail.open')))
await p.mouse.move(50, 1022)
await p.waitForTimeout(400)
ok('左下角切换键区域不误触', await p.evaluate(() => !document.querySelector('.rail.open')))

/* ═══════════════════════ 2 · 主页 LOGO */
console.log('\n2) 主页：动态背景只留「心忆共鸣」')
await go('/')
await p.evaluate(() => sessionStorage.setItem('nikki-boot-played', '1'))
await p.reload({ waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2600)
ok('动态背景有竖版 LOGO', await p.evaluate(() => !!document.querySelector('.hm-logo')))
ok('动态背景无横版「无限暖暖」', await p.evaluate(() => !document.querySelector('.hm-logo-center')))
ok('底部存在背景切换键', await p.evaluate(() => !!document.querySelector('.hm-switch')))
await p.click('.hm-switch')
await p.waitForTimeout(1200)
ok('切静态后双 LOGO 恢复', await p.evaluate(() => !!document.querySelector('.hm-logo-center')))

/* ═══════════════════════ 3 & 6 · 共鸣页套装名 */
console.log('\n3) 套装名：星级 3/5 + 间距 1/2 + 名称牌放大')
await go('/banner')
await p.waitForTimeout(600)
const starW = await p.evaluate(() => {
  const el = document.querySelector('.sb-stars img')
  return el ? getComputedStyle(el).width : null
})
ok('星级 32.4px（54 的 3/5）', Math.abs(parseFloat(starW) - 32.4) < 0.05, `实际 ${starW}`)
// 期间用户手动把星间距从 −3 改成 −12（CSS 注释同步写着「原来 −24 的一半」）
ok('星间距 −12px（−24 的 1/2）', (await style('.sb-stars img', 'marginRight')) === '-12px')
const plate = await rect('.sb-plate')
ok('名称牌 300×86（按可见区放大）', Math.round(plate.w) === 300 && Math.round(plate.h) === 86,
  `实际 ${Math.round(plate.w)}×${Math.round(plate.h)}`)

console.log('\n6) 套装名：多套 + 同屏 3 套 + 滚动')
// ：卡池列表改成 manifest 全量，`nth-child(6)` 不再等于常驻池 → 按名字点
// ：共鸣页只列**当前版本**的池，常驻池在 1.0 → 先把当前版本切到 1.0 再点
await p.evaluate(() => {
  const KEY = 'nikki-resonance-save-v1'
  const s = JSON.parse(localStorage.getItem(KEY) || '{}')
  s.selectedVersion = '1.0'
  localStorage.setItem(KEY, JSON.stringify(s))
})
await go('/banner')
await p.waitForTimeout(900)
await p.evaluate(() => {
  const el = [...document.querySelectorAll('.pool-item')]
    .find((x) => x.getAttribute('title')?.startsWith('遥远之海'))
  el?.scrollIntoView({ block: 'center' })
  el?.click()
})
await p.waitForTimeout(1000)
const plates = await p.evaluate(() => {
  const el = document.querySelector('.set-banners')
  return {
    count: document.querySelectorAll('.set-banner').length,
    scrollW: el.scrollWidth,
    clientW: el.clientWidth,
  }
})
ok('常驻池 8 套全部列出', plates.count === 8, `实际 ${plates.count}`)
ok('同屏 3 套（容器 920 = 3×300 + 2×10）', plates.clientW === 920, `实际 ${plates.clientW}`)
ok('内容总宽 2470（8 套）', plates.scrollW === 2470, `实际 ${plates.scrollW}`)
await p.mouse.move(600, 1000)
await p.mouse.wheel(0, 420)
await p.waitForTimeout(400)
const wheeled = await p.evaluate(() => document.querySelector('.set-banners').scrollLeft)
ok('滚轮可滚动', wheeled > 300, `scrollLeft ${wheeled}`)
await p.mouse.move(600, 990)
await p.mouse.down()
await p.mouse.move(320, 990, { steps: 10 })
await p.mouse.up()
await p.waitForTimeout(300)
const dragged = await p.evaluate(() => document.querySelector('.set-banners').scrollLeft)
ok('拖动可滚动', dragged > wheeled + 100, `scrollLeft ${dragged}`)
ok('拖动后不误触套装详情', (await p.locator('.sheet-mask').count()) === 0)

/* ═══════════════════════ 4 · 图鉴切换 */
console.log('\n4) 图鉴：原界面破碎成粒子 → 重构新界面')
await go('/codex')
await p.locator('.mz-tab').nth(1).click()
await p.waitForTimeout(120)
const cells = await p.evaluate(() => document.querySelectorAll('.mz-cell').length)
ok('破碎层已生成（600 块 = 30×20）', cells === 600, `实际 ${cells}`)
ok('碎裂阶段类名 break', await p.evaluate(() => !!document.querySelector('.mz-cell.break')))
ok('虚空层存在', await p.evaluate(() => !!document.querySelector('.mz-void')))
await p.waitForTimeout(500)
ok('重构阶段类名 rebuild', await p.evaluate(() => !!document.querySelector('.mz-cell.rebuild')))
await p.waitForTimeout(900)
ok('动画结束清场', await p.evaluate(() => !document.querySelector('.mz-cell')))
ok('区域已切换', await p.evaluate(() => {
  const img = document.querySelector('.mz-bg')
  return !!img && img.src.includes('yizan')
}), await p.evaluate(() => document.querySelector('.mz-bg')?.src?.split('/').pop()))

/* ═══════════════════════ 5 · 黑屏加载过渡 */
console.log('\n5) 加载过渡：进度条 / 装饰 / 三类跳转')
const photoOf = async () =>
  p.evaluate(() => document.querySelector('.ld-photo')?.getAttribute('src')?.split('/').pop() ?? null)

// 一级 → 二级
await go('/')
await p.evaluate(() => sessionStorage.setItem('nikki-boot-played', '1'))
await p.reload({ waitUntil: 'domcontentloaded' })
await p.waitForTimeout(2200)
// 背景模式可能被前一步切成静态（星芒版），两种入口都兼容
if (await p.locator('.dy-ver').count()) await p.click('.dy-ver', { force: true })
else await p.click('.nv-ver', { force: true })
await p.waitForTimeout(200)
ok('主页 → 二级 出现加载层', await p.evaluate(() => !!document.querySelector('.ld')))
ok('指向性装饰随目标界面变化（版本=photo-ver）', (await photoOf()) === 'photo-ver.webp', String(await photoOf()))
const bar = await rect('.ld-bar')
ok('进度条距屏底 100px', Math.round(1080 - bar.bottom) === 100, `实际 ${Math.round(1080 - bar.bottom)}`)
ok('进度条宽 1920 / 高 28', Math.round(bar.w) === 1920 && Math.round(bar.h) === 28)
const deco = await rect('.ld-deco')
// 进度条顶边 = 1080 − 100(距底) − 28(高)；装饰底边与它相距 20
ok('装饰底边在进度条上方 20px', Math.round(1080 - 100 - 28 - deco.bottom) === 20,
  `实际间距 ${Math.round(1080 - 100 - 28 - deco.bottom)}`)
const fill = await p.evaluate(() => {
  const el = document.querySelector('.lb-on')
  return el ? getComputedStyle(el).clipPath : null
})
ok('已加载段按进度裁切', !!fill && fill.includes('inset'), String(fill))
await p.waitForTimeout(1600)
ok('加载层自行销毁', await p.evaluate(() => !document.querySelector('.ld')))
ok('已进入版本页', (await p.evaluate(() => location.hash)) === '#/versions')

// 二级 → 二级（侧栏）
// 版本页左栏整列都是版本卡（button），压着按钮时侧栏会让位；
// 必须进到最左 32px 的贴边死区才能强制叫出侧栏的导航兜底
await p.mouse.move(24, 540)
await p.waitForTimeout(500)
await p.locator('.rail-btn').nth(2).click()
await p.waitForTimeout(220)
ok('二级 → 二级（侧栏切换）出现加载层', await p.evaluate(() => !!document.querySelector('.ld')))
ok('装饰切到共鸣 photo-banner', (await photoOf()) === 'photo-banner.webp', String(await photoOf()))
await p.waitForTimeout(1600)

// 二级 → 一级
await p.keyboard.press('Escape')
await p.waitForTimeout(220)
ok('二级 → 主页 出现加载层', await p.evaluate(() => !!document.querySelector('.ld')))
ok('装饰切到主页 photo-home', (await photoOf()) === 'photo-home.webp', String(await photoOf()))
await p.waitForTimeout(1600)
ok('回到主页', (await p.evaluate(() => location.hash)) === '#/')

/* ═══════════════════════ 收尾 */
console.log('\n控制台：' + (errs.length ? errs.slice(0, 6).join('\n') : '无报错'))
console.log(`\n结果：${pass} / ${pass + fail} 通过`)
await b.close()
process.exit(fail ? 1 : 0)
