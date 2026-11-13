/** 验收 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SIM = 'http://127.0.0.1:5178'
const ROOT = process.cwd()

let pass = 0
let fail = 0
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`) }
}

const rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/manifest.json'), 'utf8')).rules

console.log('════ A 规则参数（manifest） ════')
ok('A1 主池 5★ 基础 1.60%', Math.abs(rules.rates.base['5'] - 0.016) < 1e-9,
  `${(rules.rates.base['5'] * 100).toFixed(2)}%`)
ok('A2 5★ 软保底从第 18 抽起', rules.pity['5'].softStart === 18, String(rules.pity['5'].softStart))
ok('A3 5★ 硬保底 20 抽', rules.pity['5'].hard === 20, String(rules.pity['5'].hard))
ok('A4 5★ 软保底斜率 0.3506', Math.abs(rules.pity['5'].softSlope - 0.3506) < 1e-9,
  String(rules.pity['5'].softSlope))
ok('A5 主池 4★ 没有软保底（softStart 缺省）', !rules.pity['4'].softStart,
  JSON.stringify(rules.pity['4']))
ok('A6 综合 5★ 6.11%', Math.abs(rules.rates.effective['5'] - 0.0611) < 1e-9,
  `${(rules.rates.effective['5'] * 100).toFixed(2)}%`)

const p4 = rules.pure4 || {}
ok('A7 纯 4★ 池基础 10.21%', Math.abs((p4.base4 ?? 0) - 0.1021) < 1e-9, String(p4.base4))
ok('A8 纯 4★ 池第 4 抽起提升', p4.softStart4 === 4 && Math.abs((p4.softSlope4 ?? 0) - 0.0994) < 1e-9,
  `${p4.softStart4} / ${p4.softSlope4}`)
ok('A9 纯 4★ 池 5 抽必出', p4.hard4 === 5, String(p4.hard4))
ok('A10 纯 4★ 综合 24.96%', Math.abs((p4.effective4 ?? 0) - 0.2496) < 1e-9,
  `${((p4.effective4 ?? 0) * 100).toFixed(2)}%`)

/* ───────────────── 前端实际生效的概率（直接调 pity.ts） ───────────────── */
console.log('\n════ B 前端映射（实际调 fourStarRate / fiveStarRate） ════')

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
await ctx.addInitScript(() => {
  localStorage.setItem('nikki-resonance-save-v1', JSON.stringify({
    version: 1, selectedVersion: '2.10', pity: {}, codex: {},
    milestoneClaimed: {}, history: [], settings: { skipAnim: true, skipOpening: true },
  }))
})
const page = await ctx.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.goto(`${SIM}/#/banner`, { waitUntil: 'domcontentloaded', timeout: 90000 })
await page.waitForSelector('.pool-item', { timeout: 60000 })

const probed = await page.evaluate(async () => {
  const m = await import('/src/core/pity.ts')
  const mf = await (await fetch('/assets/manifest.json')).json()
  const pure = m.pure4Rules(mf.rules)
  const pct = (x) => +(x * 100).toFixed(2)
  return {
    main4: [1, 9, 10].map((n) => pct(m.fourStarRate(n, mf.rules))),
    main5: [1, 17, 18, 19, 20].map((n) => pct(m.fiveStarRate(n, mf.rules))),
    pure4: [1, 2, 3, 4, 5].map((n) => pct(m.fourStarRate(n, pure))),
    pure5: [1, 18, 20].map((n) => pct(m.fiveStarRate(n, pure))),
  }
})

const near = (a, b, tol = 0.02) => Math.abs(a - b) <= tol
ok('B1 主池 4★ 1/9/10 抽 = 3.68/3.68/100',
  near(probed.main4[0], 3.68) && near(probed.main4[1], 3.68) && near(probed.main4[2], 100),
  probed.main4.join(' / '))
ok('B2 主池 5★ 1/17 抽 = 1.60', near(probed.main5[0], 1.6) && near(probed.main5[1], 1.6),
  probed.main5.slice(0, 2).join(' / '))
ok('B3 主池 5★ 18/19/20 抽 = 36.66/71.72/100',
  near(probed.main5[2], 36.66, 0.05) && near(probed.main5[3], 71.72, 0.05) && near(probed.main5[4], 100),
  probed.main5.slice(2).join(' / '))
ok('B4 纯 4★ 池 1~3 抽 = 10.21',
  probed.pure4.slice(0, 3).every((v) => near(v, 10.21)),
  probed.pure4.slice(0, 3).join(' / '))
ok('B5 纯 4★ 池第 4 抽 = 20.15', near(probed.pure4[3], 20.15, 0.05), String(probed.pure4[3]))
ok('B6 纯 4★ 池第 5 抽必出', near(probed.pure4[4], 100), String(probed.pure4[4]))
ok('B7 纯 4★ 池没有 5★（恒 0）', probed.pure5.every((v) => v === 0), probed.pure5.join(' / '))

/* ───────────────── 界面文案跟随规则 ───────────────── */
console.log('\n════ C 界面文案 ════')

const names = await page.$$eval('.pool-item .pi-name', (els) => els.map((e) => e.textContent.trim()))
const readRule = async (name) => {
  const i = names.indexOf(name)
  if (i < 0) return null
  await page.locator('.pool-item').nth(i).click()
  await page.waitForTimeout(1600)
  return page.evaluate(() => document.querySelector('.rule-text')?.textContent.trim() || '')
}

const pureText = await readRule('不灭的幽旅')
ok('C1 纯 4★ 池显示「每 5 次」保底', !!pureText && /每\s*5\s*次/.test(pureText), pureText || '（未找到该阁）')
ok('C2 纯 4★ 池文案提到第 4 抽提升', !!pureText && /第\s*4\s*抽/.test(pureText), pureText || '')

const mainText = await readRule('执律的流金')
ok('C3 主池仍显示「每十次」', !!mainText && /每十次|每 10 次/.test(mainText), mainText || '（未找到该阁）')
ok('C4 主池文案不出现「第 4 抽」', !!mainText && !/第\s*4\s*抽/.test(mainText), mainText || '')
ok('C5 没有抛页面异常', errs.length === 0, errs.slice(0, 2).join(' / '))

await browser.close()

console.log(`\n结果：${pass} 过 / ${fail} 挂`)
process.exit(fail ? 1 : 0)
