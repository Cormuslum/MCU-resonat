/**
 * 验收：把「所有弹窗一个音」拆成按场景各用各的
 *
 * 背景：`panel-fadein`（`UI_WBP_Resonance_RewarPanel_Fadein_Ten`，4.85s）以前被 21 处共用，
 * 用户听起来就是「所有弹窗一个味」。这轮按场景换成 6 个新音效，`panel-fadein` 只留给抽卡奖励弹窗。
 *
 * 覆盖：
 * A 6 个新音效都进了 manifest 且能取到（HTTP 200 + 非 HTML）
 * B `panel-fadein` 只剩 RewardPopup 一处、volume 0.4（源码静态）
 * C 辉煌心光：点图标弹面板 = window-open / 一键解锁阅读物 = unlock-big
 * D 主页彩蛋弹窗 = window-open
 * E 抽卡：跳过演出 = sendgift-popup
 * F 图鉴主界面：切大版本 = big-b-select / 搜索 = nav-select / 进子图鉴 = nav-select
 * G 服装图鉴搜索 = btn-deny
 * H 阅读 / 故事图鉴搜索 = points-slide
 *
 * 用法：先 npm run dev（5178），再 node tools/verify-v2502.mjs
 */
import { chromium } from 'playwright-core'
import { mkdirSync, readFileSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = '.shots'
mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:5178'

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? `  ${detail}` : ''}`)
}
async function step(name, fn) {
  try {
    await fn()
  } catch (e) {
    check(name, false, `异常 → ${String(e.message ?? e).split('\n')[0].slice(0, 140)}`)
  }
}

/* ══════════════════════ A 新音效已转码并登记 ══════════════════════ */

const NEW_SFX = ['window-open', 'unlock-big', 'sendgift-popup', 'btn-deny', 'points-slide', 'big-b-select']
const man = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8'))
for (const k of NEW_SFX) {
  check(`A manifest.sfx.${k}`, man.sfx?.[k] === `sfx/${k}.ogg`, man.sfx?.[k] ?? '(缺)')
}

/* ══════════════════════ B 源码静态：panel-fadein 只剩一处 ══════════════════════ */

const SRC = [
  'src/components/EggPopup.vue',
  'src/components/RewardPopup.vue',
  'src/views/SettingsView.vue',
  'src/views/GachaView.vue',
  'src/views/MuseumView.vue',
  'src/views/MuseumClothes.vue',
  'src/views/MuseumReadings.vue',
  'src/views/MuseumStories.vue',
]
const all = SRC.map((f) => [f, readFileSync(f, 'utf8')])

const pf = all.flatMap(([f, t]) => t.split('\n').filter((l) => l.includes("play('panel-fadein'")).map(() => f))
check('B panel-fadein 只剩 RewardPopup 一处', pf.length === 1 && pf[0].endsWith('RewardPopup.vue'), `共 ${pf.length} 处：${pf.join(', ')}`)

const rp = readFileSync('src/components/RewardPopup.vue', 'utf8')
check('B 奖励弹窗 panel-fadein volume 0.4', /play\('panel-fadein',\s*\{\s*volume:\s*0\.4\s*\}\)/.test(rp))

/** 检查某文件里是否有一行同时含 a 与 b */
function hasLine(file, ...subs) {
  const t = readFileSync(file, 'utf8')
  return t.split('\n').some((l) => subs.every((s) => l.includes(s)))
}
const staticCases = [
  ['C 辉煌页弹面板 window-open', 'src/views/SettingsView.vue', "play('window-open'", 'volume: 0.7'],
  ['C 一键解锁阅读物 unlock-big', 'src/views/SettingsView.vue', "play('unlock-big'", 'volume: 0.8'],
  ['D 彩蛋弹窗 window-open', 'src/components/EggPopup.vue', "play('window-open'"],
  ['E 抽卡跳过演出 sendgift-popup', 'src/views/GachaView.vue', "play('sendgift-popup'", 'volume: 0.8'],
  ['F 切大版本 big-b-select', 'src/views/MuseumView.vue', "play('big-b-select'", 'volume: 0.6'],
  ['F 图鉴搜索 nav-select', 'src/views/MuseumView.vue', "play('nav-select'", 'volume: 0.7'],
  ['G 服装图鉴搜索 btn-deny', 'src/views/MuseumClothes.vue', "play('btn-deny'", 'volume: 0.7'],
  ['H 阅读图鉴 points-slide', 'src/views/MuseumReadings.vue', "play('points-slide'"],
  ['H 故事图鉴 points-slide', 'src/views/MuseumStories.vue', "play('points-slide'"],
]
for (const [name, f, ...subs] of staticCases) check(name, hasLine(f, ...subs))

/* ══════════════════════ 运行时 ══════════════════════ */

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--force-color-profile=srgb', '--autoplay-policy=no-user-gesture-required'],
})
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

await page.addInitScript(() => {
  const Orig = window.Audio
  /** 每次 play() 瞬间的 src / volume 快照（预热元素从不 play，不会混进来） */
  window.__played = []
  window.Audio = function (src) {
    const a = new Orig(src)
    const origPlay = a.play.bind(a)
    a.play = function () {
      window.__played.push({ src: a.src, vol: a.volume })
      return origPlay()
    }
    return a
  }
})

/* 版本门禁：未选版本时 /banner 会被守卫打回版本页，这里预置一个当前版本 */
await page.addInitScript(() => {
  try {
    const KEY = 'nikki-resonance-save-v1'
    const raw = localStorage.getItem(KEY)
    const s = raw ? JSON.parse(raw) : { version: 1, pity: {}, codex: {}, milestoneClaimed: {}, history: [], settings: {} }
    if (!s.selectedVersion) s.selectedVersion = '2.10'
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch { /* about:blank 这类文档不允许访问 localStorage，跳过即可 */ }
})

const pageErrors = []
const isAbortedMedia = (t) => /net::ERR_ABORTED/.test(t) && /\.(webm|ogg|mp3|mp4)\b/.test(t)
const pushErr = (t) => { if (!isAbortedMedia(t)) pageErrors.push(t) }
page.on('console', (m) => { if (m.type() === 'error') pushErr(m.text()) })
page.on('pageerror', (e) => pushErr(e.message))
page.on('requestfailed', (r) => pushErr(`reqfail ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => { if (r.status() >= 400) pushErr(`http${r.status()} ${r.url()}`) })

/** 清空并取走自上次以来播放过的音效（只留 sfx/ 里的，BGM 与视频音轨不算） */
async function drain() {
  return page.evaluate(() => {
    const x = window.__played.slice()
    window.__played = []
    return x
      .map((p) => ({ key: (p.src.split('/assets/')[1] || '').replace(/^sfx\//, '').replace(/\.ogg.*$/, ''), vol: Math.round(p.vol * 1000) / 1000 }))
      .filter((p) => p.key && !p.key.includes('/'))
  })
}
async function go(hash, ms = 2600) {
  await page.evaluate((h) => { location.hash = h }, hash)
  await page.waitForTimeout(ms)
  await drain()
}
/** 本轮是否播过某个音效（可带音量断言） */
const played = (list, key) => list.some((p) => p.key === key)

await page.goto(`${BASE}/#/`)
await page.waitForTimeout(4200)
await drain()

/* D 主页彩蛋 */
await step('D 彩蛋弹窗', async () => {
  await page.click('.hm-egg')
  await page.waitForTimeout(800)
  const l = await drain()
  check('D 彩蛋弹窗弹出 = window-open', played(l, 'window-open'), l.map((p) => `${p.key}@${p.vol}`).join(' | '))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await drain()
})

/* C 辉煌心光 */
await step('C 辉煌页弹面板', async () => {
  await go('/settings', 2800)
  await page.locator('.gl-hot').nth(1).click()
  await page.waitForTimeout(800)
  const l = await drain()
  check('C 点图标弹设置面板 = window-open', played(l, 'window-open'), l.map((p) => `${p.key}@${p.vol}`).join(' | '))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await drain()
})

await step('C 一键解锁阅读物', async () => {
  await page.locator('.gl-hot').nth(2).click()
  await page.waitForTimeout(900)
  await drain()
  const btns = await page.$$('.gm-body .gm-btn')
  if (btns.length < 2) throw new Error(`快捷面板只有 ${btns.length} 个按钮`)
  await btns[1].click()
  await page.waitForTimeout(900)
  const l = await drain()
  check('C 一键解锁全部阅读物 = unlock-big', played(l, 'unlock-big'), l.map((p) => `${p.key}@${p.vol}`).join(' | '))
})

/* E 抽卡跳过演出 */
await step('E 抽卡跳过演出', async () => {
  await go('/gacha', 2200)
  if (!(await page.$('.anim-skip'))) throw new Error('没找到「跳过」按钮')
  await page.click('.anim-skip')
  await page.waitForTimeout(900)
  const l = await drain()
  check('E 跳过抽卡演出 = sendgift-popup', played(l, 'sendgift-popup'), l.map((p) => `${p.key}@${p.vol}`).join(' | '))
})

/* F 图鉴主界面 */
await step('F 切大版本', async () => {
  await go('/codex', 2600)
  const tabs = await page.$$('.mz-tab')
  if (tabs.length < 2) throw new Error(`只有 ${tabs.length} 个版本 tab`)
  await tabs[1].click()
  await page.waitForTimeout(2200)
  const l = await drain()
  check('F 切大版本 = big-b-select', played(l, 'big-b-select'), l.map((p) => `${p.key}@${p.vol}`).join(' | '))
})

await step('F 图鉴主界面搜索', async () => {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.mz-hit')].find((e) => e.textContent.includes('搜索'))
    if (b) b.click()
  })
  await page.waitForTimeout(800)
  const l = await drain()
  check('F 图鉴主界面搜索 = nav-select', played(l, 'nav-select'), l.map((p) => `${p.key}@${p.vol}`).join(' | '))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  await drain()
})

await step('F 进服装子图鉴', async () => {
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.mz-hit')].find((e) => e.textContent.includes('服装'))
    if (b) b.click()
  })
  await page.waitForTimeout(1800)
  const l = await drain()
  check('F 进服装子图鉴 = nav-select', played(l, 'nav-select'), l.map((p) => `${p.key}@${p.vol}`).join(' | '))
})

/* G / H 三个子图鉴的搜索入口 */
await step('G 服装图鉴搜索', async () => {
  await go('/codex/clothes', 2600)
  await page.click('.cl-search')
  await page.waitForTimeout(800)
  const l = await drain()
  check('G 服装图鉴搜索弹窗 = btn-deny', played(l, 'btn-deny'), l.map((p) => `${p.key}@${p.vol}`).join(' | '))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
})

await step('H 阅读图鉴搜索', async () => {
  await go('/codex/readings', 2600)
  await page.click('.rd-mag')
  await page.waitForTimeout(800)
  const l = await drain()
  check('H 阅读图鉴搜索弹窗 = points-slide', played(l, 'points-slide'), l.map((p) => `${p.key}@${p.vol}`).join(' | '))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
})

await step('H 故事图鉴搜索', async () => {
  await go('/codex/stories', 2600)
  await page.click('.rd-mag')
  await page.waitForTimeout(800)
  const l = await drain()
  check('H 故事图鉴搜索弹窗 = points-slide', played(l, 'points-slide'), l.map((p) => `${p.key}@${p.vol}`).join(' | '))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
})

/* Z 控制台 */
check('Z 无控制台报错 / 4xx 资源', pageErrors.length === 0, pageErrors.slice(0, 3).join(' ; ') || 'clean')

await browser.close()

const pass = results.filter((r) => r.ok).length
console.log('\n' + '─'.repeat(42))
console.log(`${pass === results.length ? '✓' : '✗'} ${pass} / ${results.length} PASS`)
console.log('=== 验证完成 ===')
process.exit(pass === results.length ? 0 : 1)
