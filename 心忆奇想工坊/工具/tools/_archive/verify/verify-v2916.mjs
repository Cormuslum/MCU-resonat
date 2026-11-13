/**
 * v1.9.11 验收：常规池 4★ 规则按实机对齐
 *
 * 实机口径（`布局坐标/抽卡记录统计/stats_0.json` → `fourStarType2Distribution`，
 * 7043 人 / 1245 万抽 / 1,015,269 个 4★ 间隔）：
 *   · 1~9 抽条件概率恒 3.4%（3.51/3.48/3.44/3.46/3.38/3.42/3.37/3.33/3.32）
 *   · 第 10 抽 94.49%，第 11 抽 98.47%，11~13 抽还有 4% 尾巴
 *   · 平均间隔 8.625 抽 → 综合 11.595%
 * 结论：**5★ 不重置 4★ 计数**（只顺延一抽），4★ 基础 3.6801%、10 抽必出。
 *
 * 本脚本校验三段：A 规则参数 / B 概率函数 / C 真跑引擎 20 万抽的间隔分布 / D 界面。
 *
 * 依赖：模拟器 dev server（127.0.0.1:5178）在跑。
 * 跑法：node tools/verify-v2916.mjs
 */
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
ok('A1 主池 4★ 基础 3.6801%', Math.abs(rules.rates.base['4'] - 0.036801) < 1e-9,
  `${(rules.rates.base['4'] * 100).toFixed(4)}%`)
ok('A2 主池 4★ 综合 11.595%', Math.abs(rules.rates.effective['4'] - 0.11595) < 1e-9,
  `${(rules.rates.effective['4'] * 100).toFixed(3)}%`)
ok('A3 4★ 10 抽必出', rules.pity['4'].hard === 10, String(rules.pity['4'].hard))
ok('A4 主池 4★ 没有软保底', !rules.pity['4'].softStart, JSON.stringify(rules.pity['4']))
ok('A5 3★ 基础 = 1 − 5★ − 4★',
  Math.abs(rules.rates.base['3'] - (1 - rules.rates.base['5'] - rules.rates.base['4'])) < 1e-9,
  `${(rules.rates.base['3'] * 100).toFixed(4)}%`)
ok('A6 说明写清「5★ 不重置 4★ 计数」', /不重置/.test(rules.rates.note || ''), '')

console.log('\n════ B 概率函数（实际调 pity.ts） ════')
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

/* C：真跑引擎 —— 这是唯一能验证「5★ 不清零 p4」的地方 */
const sim = await page.evaluate(async () => {
  const { drawOne, newPity } = await import('/src/core/engine.ts')
  const { Rng } = await import('/src/core/rng.ts')
  const { Codex } = await import('/src/core/inventory.ts')
  const mf = await (await fetch('/assets/manifest.json')).json()

  const part = (rarity, id) => ({ id, name: id, rarity, setId: 'x', slot: 'ov' })
  const pool = { '3': [part(3, 'p3')], '4': [part(4, 'p4')], '5': [part(5, 'p5')] }
  const codex = new Codex()
  const rng = new Rng(20261110)
  const pity = newPity()
  const rules = mf.rules

  const N = 200000
  const cnt = { 3: 0, 4: 0, 5: 0 }
  const gaps = []
  let since4 = 0
  let maxGap = 0
  for (let i = 0; i < N; i++) {
    const r = drawOne({ rules, pool, codex, pity, rng })
    cnt[r.rarity]++
    since4++
    if (r.rarity === 4) { gaps.push(since4); maxGap = Math.max(maxGap, since4); since4 = 0 }
  }
  // 间隔分布 → 条件概率
  const hist = {}
  for (const g of gaps) hist[g] = (hist[g] || 0) + 1
  let alive = gaps.length
  const cond = {}
  for (let k = 1; k <= 13; k++) {
    const c = hist[k] || 0
    cond[k] = alive ? +(c / alive * 100).toFixed(2) : 0
    alive -= c
  }
  const pct = (x) => +(x * 100).toFixed(3)
  const pityMod = await import('/src/core/pity.ts')
  return {
    rates: { 3: pct(cnt[3] / N), 4: pct(cnt[4] / N), 5: pct(cnt[5] / N) },
    cond,
    maxGap,
    over10: gaps.filter((g) => g > 10).length,
    meanGap: +(gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(3),
    four: [1, 9, 10].map((n) => +(pityMod.fourStarRate(n, mf.rules) * 100).toFixed(2)),
  }
})

ok('B1 主池 4★ 1/9/10 抽 = 3.68/3.68/100',
  Math.abs(sim.four[0] - 3.68) < 0.02 && Math.abs(sim.four[1] - 3.68) < 0.02 && Math.abs(sim.four[2] - 100) < 0.01,
  sim.four.join(' / '))

console.log('\n════ C 引擎实跑 20 万抽 ════')
console.log(`  出率 3★ ${sim.rates[3]}%  4★ ${sim.rates[4]}%  5★ ${sim.rates[5]}%`)
console.log(`  4★ 间隔条件概率: ${Object.entries(sim.cond).map(([k, v]) => `${k}:${v}%`).join('  ')}`)
console.log(`  平均间隔 ${sim.meanGap} 抽  最长 ${sim.maxGap}  超过 10 抽的 ${sim.over10} 次`)
ok('C1 4★ 综合 11.3~11.9%', sim.rates[4] > 11.3 && sim.rates[4] < 11.9, `${sim.rates[4]}%`)
ok('C2 4★ 1~9 抽条件概率 3.0~3.9%',
  [1, 2, 3, 4, 5, 6, 7, 8, 9].every((k) => sim.cond[k] > 3.0 && sim.cond[k] < 3.9),
  '1~9 抽')
ok('C3 4★ 第 10 抽 92~97%', sim.cond[10] > 92 && sim.cond[10] < 97, `${sim.cond[10]}%`)
ok('C4 4★ 第 11 抽 ≥ 90%', sim.cond[11] >= 90, `${sim.cond[11]}%`)
ok('C5 存在 >10 抽的间隔（5★ 未清零 4★ 计数）', sim.over10 > 0 && sim.maxGap > 10,
  `${sim.over10} 次 / 最长 ${sim.maxGap}`)

console.log('\n════ D 界面 ════')
const names = await page.$$eval('.pool-item .pi-name', (els) => els.map((e) => e.textContent.trim()))
const readRule = async (name) => {
  const i = names.indexOf(name)
  if (i < 0) return null
  await page.locator('.pool-item').nth(i).click()
  await page.waitForTimeout(1600)
  return page.evaluate(() => document.querySelector('.rule-text')?.textContent.trim() || '')
}
const mainText = await readRule('执律的流金')
ok('D1 主池仍显示「每十次」', !!mainText && /每十次|每\s*10\s*次/.test(mainText), mainText || '（未找到该阁）')
ok('D2 主池文案不提「第 4 抽」', !!mainText && !/第\s*4\s*抽/.test(mainText), mainText || '')

await page.click('.detail-btn')
await page.waitForTimeout(500)
const panel = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('.pp-table tbody tr')]
  return rows.map((t) => t.textContent.replace(/\s+/g, '')).find((x) => x.startsWith('4★')) ?? ''
})
ok('D3 概率表 4★ base 3.68%', panel.includes('3.68%'), panel.slice(0, 60))
await page.keyboard.press('Escape')
ok('D4 没有抛页面异常', errs.length === 0, errs.slice(0, 2).join(' / '))

await browser.close()
console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
