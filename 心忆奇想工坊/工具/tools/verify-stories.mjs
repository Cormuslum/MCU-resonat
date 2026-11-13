import fs from 'node:fs'
import { chromium } from 'playwright-core'

// 阅读物条数**从数据文件现算**（故事页底部的「书籍 (n/m)」是阅读物计数）
const _rd = fs.readFileSync('src/data/readings.ts', 'utf8')
const WISH = (_rd.match(/id: '[^']+', region: 'wish'/g) || []).length

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

await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await p.evaluate(() => localStorage.removeItem('nikki-resonance-save-v1'))
await p.goto('about:blank')

/* ── 1. 主界面「故事图鉴」入口 */
await p.goto(BASE + '/#/codex', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(1200)
const hits = await p.$$('.mz-hit')
ok(hits.length === 4, `主界面热区 4 个（实际 ${hits.length}）`)
await hits[1].dispatchEvent('click') // ITEMS: clothes, story, reading, search
await p.waitForTimeout(1000)
ok(p.url().includes('/codex/stories'), `点「故事图鉴」→ ${p.url()}`)
ok((await p.$('.readings')) !== null, '故事图鉴页渲染（复用 .readings 容器）')

/* ── 2. 列表条数 + 排序 + 文案 */
const info = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.rd-row')]
  const titles = rows.slice(0, 4).map((r) => r.querySelector('.rd-title')?.textContent?.trim())
  return {
    count: rows.length,
    label: document.querySelector('.rd-labeltxt')?.textContent?.trim(),
    emptyTxt: document.querySelector('.rd-empty-txt')?.textContent?.trim(),
    hasCollect: !!document.querySelector('.rd-collect'),
    first4: titles,
    tab: [...document.querySelectorAll('.rd-tab')].map((e) => e.textContent.trim()),
  }
})
// ：篇数随新版本增长，改为「列表条数 = 标签里的总数」自校验
const xyShown = Number((info.label || '').match(/\(0\/(\d+)\)/)?.[1] ?? -1)
ok(info.count > 0 && info.count === xyShown, `心愿原野故事数与标签一致（${info.count} / "${info.label}"）`)
ok(info.emptyTxt === '暂未获得故事书，快去收集套装吧～', `空态文案 = "${info.emptyTxt}"`)
ok(!info.hasCollect, '无「收集全部」按钮')
// ：顶部改成三栏（奇迹传说 / 心愿原野 / 伊赞之土）
ok(info.tab.length === 3 && info.tab.includes('奇迹传说'), `顶部三栏：${info.tab.join(' / ')}`)
console.log('  前 4 条:', info.first4.join(' | '))

// 排序：从 DOM 读全部标题，与 stories 数据顺序（setId 正序）比对前几条
const order = await p.evaluate(() => {
  return [...document.querySelectorAll('.rd-row .rd-title')].map((e) => e.textContent.trim())
})
ok(order[0] === '绽响黎明前', `首条 = 绽响黎明前（S0001），实际 "${order[0]}"`)
await p.screenshot({ path: '.shots/st-fresh.png' })

/* ── 3. 未解锁点击：只提示、不解锁 */
await p.click('.rd-row')
await p.waitForTimeout(500)
const afterClick = await p.evaluate(() => ({
  hasTitle: !!document.querySelector('.rd-ctitle'),
  toast: document.querySelector('.rd-toast')?.textContent?.trim() ?? null,
  label: document.querySelector('.rd-labeltxt')?.textContent?.trim(),
}))
ok(!afterClick.hasTitle, '未集齐时点击不显示正文')
ok((afterClick.toast || '').includes('集齐'), `点击提示集齐套装（"${afterClick.toast}"）`)
ok(/^故事 \(0\/\d+\)$/.test(afterClick.label || ''), `未解锁不改变计数（"${afterClick.label}"）`)

/* ── 4. 伊赞之土分区（篇数随版本增长，按标签自校验） */
await p.locator('.rd-tab', { hasText: '伊赞之土' }).first().click()
await p.waitForTimeout(800)
const yz = await p.evaluate(() => ({
  count: document.querySelectorAll('.rd-row').length,
  label: document.querySelector('.rd-labeltxt')?.textContent?.trim(),
  first: document.querySelector('.rd-row .rd-title')?.textContent?.trim(),
}))
const yzShown = Number((yz.label || '').match(/\(0\/(\d+)\)/)?.[1] ?? -1)
ok(yz.count > 0 && yz.count === yzShown, `伊赞之土故事数与标签一致（${yz.count} / "${yz.label}"）`)
await p.screenshot({ path: '.shots/st-yizan.png' })

/* ── 5. 搜索跨页：从故事页搜「小王子」，点阅读结果应跳阅读物页 */
await p.keyboard.press('Escape')
await p.waitForTimeout(300)

/* ── 6. 阅读物：双击解锁 */
await p.evaluate(() => localStorage.removeItem('nikki-resonance-save-v1'))
await p.goto(BASE + '/#/codex/readings', { waitUntil: 'domcontentloaded' })
await p.waitForSelector('.readings', { timeout: 20000 })
await p.waitForTimeout(700)

// 单击一次：不应解锁
await p.locator('.rd-row').first().click()
await p.waitForTimeout(450)
const once = await p.evaluate(() => ({
  label: document.querySelector('.rd-labeltxt')?.textContent?.trim(),
  hasTitle: !!document.querySelector('.rd-ctitle'),
}))
ok(once.label === `书籍 (0/${WISH})`, `单击不解锁（"${once.label}"）`)
ok(!once.hasTitle, '单击后不显示正文')

// 双击（同一行 320ms 内两次）
await p.locator('.rd-row').first().click()
await p.waitForTimeout(120)
await p.locator('.rd-row').first().click()
await p.waitForTimeout(1000)
const dbl = await p.evaluate(() => ({
  label: document.querySelector('.rd-labeltxt')?.textContent?.trim(),
  hasTitle: !!document.querySelector('.rd-ctitle'),
  title: document.querySelector('.rd-ctitle')?.textContent?.trim(),
}))
ok(dbl.label === `书籍 (1/${WISH})`, `双击后解锁（"${dbl.label}"）`)
ok(dbl.hasTitle, `双击后显示正文（"${dbl.title}"）`)
await p.screenshot({ path: '.shots/rd-dblclick.png' })

/* ── 7. 服装图鉴「套装故事」按钮 → 故事图鉴并定位 */
await p.goto(BASE + '/#/codex/clothes', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(1600)
const plog = await p.$('.cl-plog')
ok(plog !== null, '服装图鉴有「套装故事」按钮')
if (plog) {
  const setName = await p.evaluate(() => document.querySelector('.in-name')?.textContent?.trim() ?? '')
  await plog.click()
  await p.waitForTimeout(1000)
  ok(p.url().includes('/codex/stories'), `套装故事按钮 → ${p.url()}`)
  const sel = await p.$eval('.rd-row.sel .rd-title', (e) => e.textContent.trim()).catch(() => '')
  ok(sel.length > 0 || !setName, `定位到套装故事（套装"${setName}" → 选中"${sel}"）`)
  await p.screenshot({ path: '.shots/st-from-clothes.png' })
}

/* ── 8. 故事页搜索 → 阅读物结果跨页跳转 */
await p.goto(BASE + '/#/codex/stories', { waitUntil: 'domcontentloaded' })
await p.waitForSelector('.readings', { timeout: 20000 })
await p.waitForTimeout(700)
await p.click('.rd-mag')
await p.waitForTimeout(500)
const inp = await p.$('.sp-sinput')
if (inp) {
  await inp.fill('小王子')
  await p.waitForTimeout(600)
  const items = await p.$$('.sp-sitem')
  const texts = []
  for (const it of items) texts.push(((await it.textContent()) || '').trim())
  const ri = texts.findIndex((t) => t.includes('阅读页'))
  ok(ri >= 0, `故事页搜「小王子」含阅读页结果（${texts.join(' | ')}）`)
  if (ri >= 0) {
    await items[ri].dispatchEvent('click')
    await p.waitForTimeout(900)
    ok(p.url().includes('/codex/readings'), `点阅读结果跨页 → ${p.url()}`)
  }
}

console.log('\n==== 结果 ====')
pass.forEach((m) => console.log('PASS  ' + m))
if (fail.length) fail.forEach((m) => console.log('FAIL  ' + m))
console.log(`\n通过 ${pass.length} / ${pass.length + fail.length}`)
console.log('errors =', errs)
await b.close()
process.exit(fail.length ? 1 : 0)
