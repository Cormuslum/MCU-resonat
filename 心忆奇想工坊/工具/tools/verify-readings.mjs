/** M3 阅读物图鉴 Playwright 验收（开发期巡检，不打包进应用）：`node tools/verify-readings.mjs`。覆盖列表进度、区域切换（Q/E）、解锁三阶段动画、空态贴纸与随机彩蛋、深链 `?name=`、搜索弹窗、无报错 */
import fs from 'node:fs'
import { chromium } from 'playwright-core'

// 期望条数**从数据文件现算**，不写死 —— 阅读物随时会随素材增减而变
const _data = fs.readFileSync('src/data/readings.ts', 'utf8')
// 只数**数据行**（`id: '…', region: 'wish'`），别把 interface 里的类型声明算进去
const WISH = (_data.match(/id: '[^']+', region: 'wish'/g) || []).length
const YIZAN = (_data.match(/id: '[^']+', region: 'yizan'/g) || []).length

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const OUT = '.shots'

const results = []
function check(name, cond, detail = '') {
  results.push({ name, ok: !!cond, detail })
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console.error] ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) => {
  const u = r.url()
  if (u.includes('favicon')) return
  // ERR_ABORTED = 页面导航/路由切换时被取消的请求（如 BGM 正在加载时切页），非真实错误
  if (r.failure()?.errorText === 'net::ERR_ABORTED') return
  errors.push(`[reqfail] ${u} :: ${r.failure()?.errorText}`)
})
page.on('response', (r) => {
  if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(`[${r.status()}] ${r.url()}`)
})

async function gotoReadings(query = '') {
  const url = `${BASE}/#/codex/readings${query ? '?' + query : ''}`
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.readings', { timeout: 15000 })
  await page.waitForTimeout(600)
}

// 清空存档 → 阅读物全锁
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.removeItem('nikki-resonance-save-v1'))
await page.goto('about:blank')

await gotoReadings()

// 1) 列表进度（心愿原野默认）
const wishRows = await page.$$eval('.rd-row', (els) => els.length)
const label0 = await page.$eval('.rd-labeltxt', (e) => e.textContent.trim())
check(`心愿原野列表 ${WISH} 行`, wishRows === WISH, `实际 ${wishRows}`)
check(`标签=书籍 (0/${WISH})`, label0 === `书籍 (0/${WISH})`, `实际 "${label0}"`)

// 2) 空态：贴纸 13% + 提示文字（录屏报告 §6.1：形象在下、文字在上/居中，同区域展示）
await page.waitForTimeout(320) // 等 0.1s delay + 0.15s 动画走完
const emptyOp = await page.$eval('.rd-empty-sticker', (e) => getComputedStyle(e).opacity).catch(() => null)
const emptyTxt = await page.$eval('.rd-empty-txt', (e) => e.textContent.trim()).catch(() => null)
check('空态贴纸存在', emptyOp !== null)
check('空态贴纸 opacity≈0.15', emptyOp !== null && Math.abs(parseFloat(emptyOp) - 0.15) < 0.02, `实际 ${emptyOp}`)
check('空态提示文字存在', emptyTxt === '暂未获得阅读物，快去世界探索吧~', `实际 "${emptyTxt}"`)

// 3) 随机彩蛋： 起「未获取阅读物不显示」→ 空态必须没有
const eggEmpty = await page.$('.rd-egg')
check('空态不显示随机彩蛋（未获取阅读物）', eggEmpty === null)

// 4) 点击未获取条目 → 解锁三阶段动画 + 播放后锁消失
await page.click('.rd-row')
await page.waitForTimeout(80)
await page.click('.rd-row')
await page.waitForTimeout(120)
const unlockVisible = await page.$('.rd-unlock')
check('解锁三阶段覆盖层出现', unlockVisible !== null)
await page.waitForTimeout(900) // 等 760ms 动画结束 + 余量
const lockAfter = await page.$('.rd-row.sel .rd-lock')
const label1 = await page.$eval('.rd-labeltxt', (e) => e.textContent.trim())
check('解锁后锁消失（选中行无 .rd-lock）', lockAfter === null)
check(`解锁后标签=书籍 (1/${WISH})`, label1 === `书籍 (1/${WISH})`, `实际 "${label1}"`)
const ctitle = await page.$eval('.rd-ctitle', (e) => e.textContent.trim()).catch(() => '')
check('正文标题已展示', ctitle.length > 0, `标题="${ctitle}"`)

// 获取后才有彩蛋（opacity 0.25）
const eggSrc0 = await page.$eval('.rd-egg', (e) => e.getAttribute('src')).catch(() => null)
const eggOp = await page.$eval('.rd-egg', (e) => getComputedStyle(e).opacity).catch(() => null)
check('获取后显示随机彩蛋', eggSrc0 !== null)
check('随机彩蛋 opacity=0.25', eggOp !== null && Math.abs(parseFloat(eggOp) - 0.25) < 0.02, `实际 ${eggOp}`)

await page.screenshot({ path: `${OUT}/readings-wish-unlocked.png` })

// 5) 区域切换 E → 伊赞之土 372
await page.keyboard.press('e')
await page.waitForTimeout(400)
const yizanRows = await page.$$eval('.rd-row', (els) => els.length)
const labelY = await page.$eval('.rd-labeltxt', (e) => e.textContent.trim())
const eggSrcE = await page.$eval('.rd-egg', (e) => e.getAttribute('src')).catch(() => null)
check(`伊赞之土列表 ${YIZAN} 行`, yizanRows === YIZAN, `实际 ${yizanRows}`)
check(`标签=书籍 (0/${YIZAN})`, labelY === `书籍 (0/${YIZAN})`, `实际 "${labelY}"`)
check('切换区域后（空态）彩蛋隐藏', eggSrcE === null, `实际 ${eggSrcE?.slice(-20) ?? 'null'}`)

// 6) 区域切换 Q → 心愿原野
await page.keyboard.press('q')
await page.waitForTimeout(400)
const backRows = await page.$$eval('.rd-row', (els) => els.length)
check(`Q 切回心愿原野 ${WISH} 行`, backRows === WISH, `实际 ${backRows}`)

// 7) 深链 ?name=
await gotoReadings('name=' + encodeURIComponent('恩泽纪·卷七'))
await page.waitForTimeout(500)
// ：未解锁不显示正文，深链只做「定位到该行」
const deepTitle = await page.$eval('.rd-row.sel .rd-title', (e) => e.textContent.trim()).catch(() => '')
check('深链 ?name= 定位到对应阅读物', deepTitle.includes('恩泽纪·卷七'), `选中行="${deepTitle}"`)
await page.screenshot({ path: `${OUT}/readings-deeplink.png` })

// 8) 搜索弹窗：命中、≤6 条、ESC/空白关闭
await gotoReadings()
await page.click('.rd-mag')
await page.waitForTimeout(300)
const searchOpen = await page.$('.sp-mask')
check('放大镜打开搜索弹窗', searchOpen !== null)
await page.fill('.sp-sinput', '奇想')
await page.waitForTimeout(400)
const resCount = await page.$$eval('.sp-sitem', (els) => els.length)
check('搜索命中结果 ≤6 条', resCount > 0 && resCount <= 6, `实际 ${resCount} 条`)
// 选第一条 → 跳转
const firstResult = await page.$('.sp-sitem')
const firstName = await firstResult.$eval('.sp-sname', (e) => e.textContent.trim()).catch(() => '')
await firstResult.click()
await page.waitForTimeout(500)
const afterSelectTitle = await page.$eval('.rd-row.sel .rd-title', (e) => e.textContent.trim()).catch(() => '')
check('搜索选中后跳转到阅读物', afterSelectTitle.length > 0, `"${firstName}" → 选中行="${afterSelectTitle}"`)
// ESC 关闭
await page.click('.rd-mag')
await page.waitForTimeout(200)
await page.fill('.sp-sinput', 'zzz无匹配')
await page.waitForTimeout(300)
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
const closedByEsc = await page.$('.sp-mask')
check('ESC 关闭搜索弹窗', closedByEsc === null)

await page.screenshot({ path: `${OUT}/readings-final.png` })

// 9) 报错汇总
check('无 console / 资源加载报错', errors.length === 0, errors.slice(0, 5).join(' | '))

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\n==== 汇总：${results.length - failed.length}/${results.length} 通过 ====`)
if (failed.length) {
  console.log('FAILED:')
  for (const f of failed) console.log(' - ' + f.name + (f.detail ? `  (${f.detail})` : ''))
  process.exit(1)
}
console.log('ALL PASS')
