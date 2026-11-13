// 验证工坊前端字段 hint 的 **粗体** 是否渲染成 <b>（而非字面星号）。
// 连已在跑的工坊 5199；不依赖构建。
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const UP = 'http://127.0.0.1:5199/'
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✅', m) } else { fail++; console.log('  ❌', m) } }

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })
const errs = []
page.on('pageerror', (e) => errs.push('PAGEERR ' + e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()) })

await page.goto(UP, { waitUntil: 'domcontentloaded', timeout: 60000 })
await page.waitForSelector('[data-job="pool"]', { state: 'visible', timeout: 30000 })

async function checkJob(job, label) {
  await page.click(`[data-job="${job}"]`)
  await page.waitForSelector('.hint', { state: 'visible', timeout: 10000 })
  await page.waitForTimeout(300)
  const hints = await page.$$eval('.hint', (els) => els.map((e) => e.innerHTML))
  const joined = hints.join(' || ')
  console.log(`\n[${label}] 命中 ${hints.length} 个 .hint`)
  hints.forEach((h, i) => console.log(`  hint[${i}] =`, h))
  ok(/<b>工坊自建<\/b>/.test(joined), `${label}：hint 内渲染出 <b>工坊自建</b>`)
  ok(!/\*\*/.test(joined), `${label}：hint 内无字面 ** 星号`)
}

await checkJob('pool', '新建服装图')
await checkJob('suit', '新建套装')

ok(errs.length === 0, '页面无 JS 报错' + (errs.length ? '：' + errs.slice(0, 5).join(' | ') : ''))

await browser.close()
console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
