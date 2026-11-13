/**
 * v2.8.13 验收 · 共鸣页「进入界面音」的播放时机与音量
 *
 * 用户口径：进入共鸣页时播一次（原始音量 1.0），**在缩略图栏切到另一座阁时再播一次，
 * 音量 0.7**；点当前这座不算切换，不该重复播。
 *
 * 覆盖：
 *   E1 进页播 1 次，且是该阁自己的音（manifest.bannerEnter 里那只文件）
 *   E2 切池后播新阁的音，音量 = 进页那次的 0.7 倍
 *   E3 点当前阁不重复播
 *   E4 切池时上一首被淡出（不会两首进入音叠着响）
 *   E5 未收录的阁点击不播（只有「尚未收录」提示）
 *   E6 无控制台报错
 *
 * 用法：先 `npx vite`（5178），再 `node tools/verify-v2813.mjs`
 *
 * ⚠ 别和 `npm run build` 串在一条命令里跑：build 会写 `public/`，dev server 监听到就**整页 reload**，
 *   `addInitScript` 会重跑、`window.__enter` 归零，计数断言会莫名报红（实测踩过一次）。
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const SAVE_KEY = 'nikki-resonance-save-v1'

let pass = 0
let fail = 0
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? `  ${detail}` : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${detail ? `  ${detail}` : ''}`) }
}

const manifest = JSON.parse(fs.readFileSync(path.resolve('public/assets/manifest.json'), 'utf8'))
const enterOf = (bannerId) => (manifest.bannerEnter?.[bannerId] ?? '').split('/').pop()

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })

// 拦截 HTMLMediaElement.play 记录进入音；只关心 `sfx/banner-enter/*.ogg`
await ctx.addInitScript(([k, v]) => {
  localStorage.setItem(k, v)
  window.__enter = []
  // 本次文档的随机标记：用来发现「测量期间页面被 reload 了」（HMR / build 会写文件）
  window.__boot = String(Math.random())
  const orig = HTMLMediaElement.prototype.play
  HTMLMediaElement.prototype.play = function () {
    try {
      if (/\/sfx\/banner-enter\//.test(this.src)) {
        window.__enter.push({ name: this.src.split('/').pop(), el: this, t: Math.round(performance.now()) })
      }
    } catch { /* 忽略 */ }
    return orig.apply(this, arguments)
  }
}, [SAVE_KEY, JSON.stringify({
  version: 1, selectedVersion: '2.11', pity: {}, codex: {}, milestoneClaimed: [], history: [],
  settings: { skipAnim: true, skipOpening: true, skipGacha: true },
})])

const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(e.message))

// 预热一次再开始测量。
// dev server 冷启动时，第一个页面加载会触发 vite 的依赖预打包并**整页 reload** ——
// `addInitScript` 随之重跑、`window.__enter` 归零，后面所有计数断言都会错位
// （实测：刚重启 dev server 后第一次跑必红，第二次就绿）。
// 先空跑一轮把 reload 消化掉，再重新导航开始正式测量。
await page.goto(`${BASE}/#/banner`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !document.querySelector('.loading'), { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(1500)

await page.goto(`${BASE}/#/banner`, { waitUntil: 'domcontentloaded' })
await page.waitForFunction(() => !document.querySelector('.loading'), { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(2200)

/**
 * 测量期间的「文档标记」。页面一旦被整页 reload（HMR / `npm run build` 都会写文件触发），
 * `addInitScript` 会重跑、`__enter` 归零 —— 这时所有计数断言都会错位，
 * 报出来的是一堆看不懂的 ✗。与其让人去猜，不如**直接说明是 reload 干扰，重跑**。
 */
const BOOT = await page.evaluate(() => window.__boot ?? '')
async function reloaded() {
  const now = await page.evaluate(() => window.__boot ?? '').catch(() => '')
  return !!BOOT && now !== BOOT
}

/* ── E1 进页播一次 ── */
const first = await page.evaluate(() => {
  const a = (window.__enter ?? []).slice(-1)[0]
  return {
    n: (window.__enter ?? []).length,
    name: a?.name ?? '',
    vol: a ? +a.el.volume.toFixed(3) : 0,
    bannerId: document.querySelector('.pool-item .pi-frame')?.closest('.pool-item')?.querySelector('.pi-name')?.textContent?.trim() ?? '',
  }
})
const curId = await page.evaluate(() => document.querySelector('.pool-item .pi-frame')?.closest('.pool-item')
  ? [...document.querySelectorAll('.pool-item')].findIndex((e) => e.querySelector('.pi-frame')) : -1)
const curPoolId = await page.evaluate((i) => {
  const el = document.querySelectorAll('.pool-item')[i]
  return el ? el.querySelector('.pi-name')?.textContent?.trim() : ''
}, curId)
// 用「当前阁名 → manifest 里对应 banner id」的进入音文件名核对
const byName = manifest.banners.find((b) => b.name === curPoolId)
ok(first.n === 1, 'E1a 进共鸣页只播 1 次进入音', `实际 ${first.n} 次`)
ok(!!byName && first.name === enterOf(byName.id), 'E1b 播的是当前这座阁自己的进入音',
  `${curPoolId} → ${first.name}（期望 ${byName ? enterOf(byName.id) : '?'}）`)
ok(first.vol > 0.3, 'E1c 进页音量按原始音量走（不是打折后的）', `vol=${first.vol}`)

if (await reloaded()) {
  console.log('\n⚠ 页面在测量期间被 reload 了（HMR / 构建写文件导致），计数已作废。请重跑一次。')
  await browser.close()
  process.exit(2)
}

/* ── E2 切池播新阁的音，音量 0.7 倍 ── */
const pick = await page.evaluate((self) => {
  const items = [...document.querySelectorAll('.pool-item')]
  const i = items.findIndex((e, idx) => idx !== self && !e.classList.contains('locked'))
  if (i < 0) return null
  items[i].click()
  return { i, name: items[i].querySelector('.pi-name')?.textContent?.trim() ?? '' }
}, curId)
ok(!!pick, 'E2a 找到了另一座可切换的阁', pick ? pick.name : '列表里没有第二座可用阁')

if (pick) {
  await page.waitForTimeout(900)
  const after = await page.evaluate(() => {
    const list = window.__enter ?? []
    const a = list.slice(-1)[0]
    const prev = list.slice(-2)[0]
    return {
      n: list.length,
      name: a?.name ?? '',
      vol: a ? +a.el.volume.toFixed(3) : 0,
      prevVol: prev ? +prev.el.volume.toFixed(3) : null,
      prevPaused: prev ? prev.el.paused : null,
    }
  })
  const target = manifest.banners.find((b) => b.name === pick.name)
  ok(after.n === 2, 'E2b 切池后多播了 1 次', `累计 ${after.n} 次`)
  ok(!!target && after.name === enterOf(target.id), 'E2c 播的是新阁的进入音',
    `${pick.name} → ${after.name}（期望 ${target ? enterOf(target.id) : '?'}）`)

  const ratio = after.vol / first.vol
  ok(Math.abs(ratio - 0.7) < 0.03, 'E2d 切换音量 = 进页音量的 0.7 倍',
    `${after.vol} / ${first.vol} = ${ratio.toFixed(3)}`)

  ok(after.prevVol !== null && (after.prevPaused === true || after.prevVol < 0.05),
    'E4 上一首进入音已淡出（不会两首叠着响）',
    `prev vol=${after.prevVol} paused=${after.prevPaused}`)

  /* ── E3 点当前阁不重复播 ── */
  const before = await page.evaluate(() => (window.__enter ?? []).length)
  await page.evaluate((i) => document.querySelectorAll('.pool-item')[i].click(), pick.i)
  await page.waitForTimeout(700)
  const again = await page.evaluate(() => (window.__enter ?? []).length)
  ok(again === before, 'E3 点当前这座阁不重复播进入音', `新增 ${again - before} 次`)
}

/* ── E5 未收录的阁：只有提示，不播 ── */
{
  const locked = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.pool-item')]
    const i = items.findIndex((e) => e.classList.contains('locked'))
    if (i < 0) return null
    const before = (window.__enter ?? []).length
    items[i].click()
    return { i, before }
  })
  if (locked) {
    await page.waitForTimeout(600)
    const after = await page.evaluate(() => (window.__enter ?? []).length)
    ok(after === locked.before, 'E5 点未收录的阁不播进入音', `新增 ${after - locked.before} 次`)
  } else {
    console.log('  · E5 跳过：当前列表里没有被锁住的阁')
  }
}

if (await reloaded()) {
  console.log('\n⚠ 页面在测量期间被 reload 了（HMR / 构建写文件导致），上面的计数结论不可信。请重跑一次。')
  await browser.close()
  process.exit(2)
}

ok(errors.length === 0, 'E6 无控制台报错', errors.slice(0, 2).join(' | '))

await browser.close()

console.log('\n──────────────────────────────────────────')
if (fail === 0) console.log(`✓ ${pass} / ${pass} PASS`)
else console.log(`✗ ${pass} 通过 · ${fail} 失败（共 ${pass + fail}）`)
console.log('=== 验证完成 ===')
process.exit(fail === 0 ? 0 : 1)
