/** 验收 */
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
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

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--color-profile=srgb', '--autoplay-policy=no-user-gesture-required'],
})
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

// 开局：清空存档 + 跳过全部演出（点抽即结算，方便造流水）
await page.addInitScript(() => {
  if (sessionStorage.getItem('__v2504_seeded')) return
  sessionStorage.setItem('__v2504_seeded', '1')
  localStorage.setItem('nikki-resonance-save-v1', JSON.stringify({
    version: 1,
    selectedVersion: '2.10',
    pity: {},
    codex: {},
    milestoneClaimed: {},
    history: [],
    settings: {
      skipAnim: true,
      volume: 0.7,
      bgm: false,
      bgmVol: 0,
      bgmScene: { home: 1, versions: 1, banner: 1, codex: 1, almanac: 1, gloria: 1 },
      uiVol: 0.8,
      skipSingleAnim: true,
      skipReward: true,
      skipOpening: true,
      skipGacha: true,
      lucky: false,
    },
  }))
})

const pageErrors = []
const isAbort = (t) => /net::ERR_ABORTED/.test(t) && /\.(webm|ogg|mp3|mp4|webp)\b/.test(t)
const push = (t) => { if (!isAbort(t)) pageErrors.push(t) }
page.on('console', (m) => { if (m.type() === 'error') push(m.text()) })
page.on('pageerror', (e) => push(e.message))
page.on('requestfailed', (r) => push(`reqfail ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => { if (r.status() >= 400) push(`http${r.status()} ${r.url()}`) })

const rows = () => page.$$eval('.ph-item .ph-name', (els) => els.map((e) => e.textContent.trim()))
const countText = () => page.$eval('.eg-count', (e) => e.textContent.replace(/\s+/g, ' ').trim())
const eggHead = () => page.$eval('.eg-text', (e) => (e.textContent || '').trim().slice(0, 30))

/** 打开「共鸣详情」并切到抽取记录页 */
async function openHistory() {
  await page.click('.detail-btn')
  await page.waitForTimeout(520)
  await page.click('.pn.next')
  await page.waitForTimeout(520)
}
/** 关掉详情弹窗（只按一次 ESC：再按一次会 leave() 退回主页） */
async function closeDetail() {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(480)
}

await page.goto(`${BASE}/#/banner`)
await page.waitForTimeout(2800)

/* ═════════════ A 分池记录 ═════════════ */

/** 按名字点卡池。卡池列表从硬编码 6 项变成 manifest 全量 80 项，`nth(5)` 不再等于「遥远之海」常驻池 */
async function clickPoolByName(name) {
  const hit = await page.evaluate((nm) => {
    const el = [...document.querySelectorAll('.pool-item')]
      .find((x) => x.getAttribute('title')?.startsWith(nm))
    if (!el) return false
    el.scrollIntoView({ block: 'center' })
    el.click()
    return true
  }, name)
  if (!hit) throw new Error('找不到卡池：' + name)
  await page.waitForTimeout(1300)
}

/** 切当前版本：共鸣页只列当前版本的池，切版本 = 写存档 + reload。跨版本造流水（限定池 2.10 ↔ 常驻池 1.0）必须经过它 */
async function useVersion(v) {
  await page.evaluate((ver) => {
    const KEY = 'nikki-resonance-save-v1'
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    s.selectedVersion = ver
    localStorage.setItem(KEY, JSON.stringify(s))
  }, v)
  await page.reload()
  await page.waitForTimeout(2600)
}

let limitedRows = []
let standardRows = []
await step('A 限定池十连 → 本池 10 条', async () => {
  await page.click('.pull-btn.ten')
  await page.waitForTimeout(1300)
  await openHistory()
  limitedRows = await rows()
  check('A1 限定池记录 10 条', limitedRows.length === 10, `实际 ${limitedRows.length}`)
  await closeDetail()
})

await step('A 常驻池单抽 → 只有本池 1 条', async () => {
  await useVersion('1.0') // 常驻池属于 1.0
  await clickPoolByName('遥远之海') // 常驻池
  await page.click('.pull-btn.single')
  await page.waitForTimeout(1300)
  await openHistory()
  standardRows = await rows()
  check('A2 常驻池记录 1 条（不含限定池那 10 条）', standardRows.length === 1, `实际 ${standardRows.length}`)
  check('A3 两池记录内容不同', standardRows[0] !== limitedRows[0], `${standardRows[0]} ≠ ${limitedRows[0]}`)
  const note = await page.$eval('.pp-note.dim', (e) => e.textContent.replace(/\s+/g, ' ').trim())
  check('A4 底部说明写出当前池名', /最近 50 条/.test(note), note.slice(0, 46))
  await closeDetail()
})

/* ═════════════ B 刷新后仍各看各的 ═════════════ */

await step('B 刷新后持久化且分池', async () => {
  await page.reload()
  await page.waitForTimeout(2800)
  // 刷新后 bannerId 回到默认（限定池），先显式切常驻池
  await clickPoolByName('遥远之海')
  await openHistory()
  const std = await rows()
  check('B1 刷新后常驻池仍 1 条', std.length === 1, `实际 ${std.length}`)
  await closeDetail()

  await useVersion('2.10')
  await clickPoolByName('执律的流金')
  await openHistory()
  const lim = await rows()
  check('B2 刷新后限定池仍 10 条', lim.length === 10, `实际 ${lim.length}`)
  await closeDetail()
})

/* ═════════════ C 存档结构 ═════════════ */

await step('C 存档里两条流水分属两个 banner', async () => {
  const stored = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('nikki-resonance-save-v1') || '{}')
    const by = {}
    for (const h of s.history || []) by[h.banner] = (by[h.banner] || 0) + 1
    return { total: (s.history || []).length, by }
  })
  const keys = Object.keys(stored.by)
  check('C1 history 持久化在存档里', stored.total === 11, `总 ${stored.total} 条`)
  // 起卡池主键是**官方号**（banner-076 / banner-001），流水里存的也是新 id
  check('C2 分属两个卡池', keys.length === 2 && stored.by['banner-076'] === 10 && stored.by['banner-001'] === 1,
    JSON.stringify(stored.by))
})

/* ═════════════ D 星级衬托 ═════════════ */

await step('D 星级有衬底 + 描边投影', async () => {
  await clickPoolByName('执律的流金')
  await openHistory()
  const st = await page.evaluate(() => {
    const pill = document.querySelector('.ph-stars')
    const img = pill?.querySelector('img')
    if (!pill || !img) return null
    const cs = getComputedStyle(pill)
    const ci = getComputedStyle(img)
    const r = img.getBoundingClientRect()
    return {
      bg: cs.backgroundImage,
      shadow: cs.boxShadow,
      filter: ci.filter,
      w: Math.round(r.width),
      h: Math.round(r.height),
      rowH: Math.round(document.querySelector('.ph-item').getBoundingClientRect().height),
    }
  })
  if (!st) throw new Error('没找到 .ph-stars')
  check('D1 星级有深色衬底', /gradient|rgb/.test(st.bg) && st.bg !== 'none', st.bg.slice(0, 44))
  check('D2 衬底带内阴影', /inset/.test(st.shadow), st.shadow.slice(0, 40))
  check('D3 每颗星有描边投影', /drop-shadow/.test(st.filter), st.filter.slice(0, 44))
  // ：行高 34 → 33（不出滚动条）
  check('D4 星级图标 19px 且不撑破行高', st.w === 19 && st.h === 19 && st.rowH <= 34, `${st.w}×${st.h} / row ${st.rowH}`)
  await closeDetail()
})

/* ═════════════ E/F 彩蛋文本3 ═════════════ */

await step('E 随机池不含彩蛋文本3', async () => {
  await page.goto(`${BASE}/#/`)
  await page.waitForTimeout(4200)
  await page.click('.hm-egg')
  await page.waitForTimeout(500)
  const totalText = await countText()
  const total = Number(totalText.split('/')[1].trim())
  // ：并入 10 段《奇迹之旅》/《番外》补充文本（原 74 → 84）
  check('E1 彩蛋总条数 84', total === 84, totalText)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(320)

  const seen = []
  for (let i = 0; i < 12; i++) {
    await page.click('.hm-egg')
    await page.waitForTimeout(380)
    seen.push(Number(await page.$eval('.eg-count b', (e) => e.textContent.trim())))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
  // file 3 的条目下标从 easterEgg.ts 里读，不写死区间随机池变成 1..44 + 75..84 两段
  const eggSrc = readFileSync('src/data/easterEgg.ts', 'utf8')
  const eggArr = JSON.parse(/export const EGG_ENTRIES: EggEntry\[\] = (\[[\s\S]*?\])\n\n/.exec(eggSrc)[1])
  const file3 = new Set(eggArr.flatMap((e, i) => (e.file === 3 ? [i + 1] : [])))
  check('E2 连续打开 12 次都不落在彩蛋文本3', seen.every((n) => n >= 1 && n <= eggArr.length && !file3.has(n)), seen.join(','))
})

await step('F 页码跳转 → 彩蛋文本3 → 左右切换', async () => {
  await page.click('.hm-egg')
  await page.waitForTimeout(450)
  await page.click('.eg-jinput')
  await page.keyboard.type('45')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(500)
  const c45 = await countText()
  const h45 = await eggHead()
  check('F1 跳到 45 → 45/84', /^45/.test(c45), c45)
  check('F2 45 是彩蛋文本3 的首条（剧情吐槽说明）', h45.includes('负面评价'), h45)

  await page.click('.eg-nav.prev')
  await page.waitForTimeout(400)
  const c44 = await countText()
  const h44 = await eggHead()
  check('F3 45 ← 回到 44（仍是彩蛋文本2 歌词）', /^44/.test(c44) && !h44.includes('负面评价'), `${c44} | ${h44}`)

  await page.click('.eg-nav.next')
  await page.waitForTimeout(300)
  await page.click('.eg-nav.next')
  await page.waitForTimeout(400)
  const c46 = await countText()
  const h46 = await eggHead()
  check('F4 44 → → 走到 46（彩蛋文本3 第 2 条）', /^46/.test(c46) && !h46.includes('会怀念'), `${c46} | ${h46}`)
})

check('Z 无控制台报错 / 4xx', pageErrors.length === 0, pageErrors.slice(0, 3).join(' ; ') || 'clean')

await browser.close()
const pass = results.filter((r) => r.ok).length
console.log('\n' + '─'.repeat(44))
console.log(`${pass === results.length ? '✓' : '✗'} ${pass} / ${results.length} PASS`)
process.exit(pass === results.length ? 0 : 1)
