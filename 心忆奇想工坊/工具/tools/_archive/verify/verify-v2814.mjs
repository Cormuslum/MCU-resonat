/**
 * v1.7.00 验收 · 服装图鉴改按「阁所在版本」分组 + 故事图鉴加「奇迹传说」栏
 *
 * 用户的两条要求：
 *   ① 服装图鉴改成按**阁所在版本**分组（0.1 祈愿星 / 0.2 魂灵生 是工坊自建阁，
 *      游戏里没有这两个版本，阁里放的是可免费获取的套装）——以前按「套装首发版本」
 *      分组，自建阁那两版在图鉴里是空的，套装还会被算到 1.0/1.5 那些正式版本里。
 *   ② 故事图鉴顶部的大版本切换栏加「奇迹传说」按钮（图鉴主界面 / 阅读物图鉴不动）。
 *
 * 覆盖：
 *   一、服装图鉴分组（数据 + 页面）
 *   二、故事图鉴三分区（栏位几何 / 切栏 / 深链 / 解锁正文）
 *   三、阅读物图鉴不受影响（仍两栏）
 *
 * 用法：先 `npx vite`（5178），再 `node tools/verify-v2814.mjs`
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const SAVE_KEY = 'nikki-resonance-save-v1'
const ROOT = path.resolve('.')
const OUT = '.shots'

fs.mkdirSync(OUT, { recursive: true })

let pass = 0
let fail = 0
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? `  ${detail}` : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${detail ? `  ${detail}` : ''}`) }
}
function head(t) { console.log(`\n${t}`) }

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/manifest.json'), 'utf8'))

/** 某版本的阁里出现过的套装（按 id 去重），与 MuseumClothes 的 SUITS 同算法 */
function setsOfVersion(v) {
  const out = []
  const seen = new Set()
  for (const b of manifest.banners) {
    if (b.version !== v) continue
    for (const s of b.sets ?? []) {
      if (!s.id || seen.has(s.id)) continue
      seen.add(s.id)
      out.push(s)
    }
  }
  return out
}

/** stories.ts 的条目（自动生成的固定格式，直接正则解析，免得起 vite 插件） */
const storiesSrc = fs.readFileSync(path.join(ROOT, 'src/data/stories.ts'), 'utf8')
const STORIES = [...storiesSrc.matchAll(
  /id: "([^"]+)",\s*setId: "([^"]*)",\s*setName: "([^"]*)",\s*star: (\d+),\s*major: (\d+),\s*title: "([^"]*)",/g,
)].map((m) => ({ id: m[1], setId: m[2], setName: m[3], star: Number(m[4]), major: Number(m[5]), title: m[6] }))

/** 种子存档：把给定套装的图标全部塞进 codex（部件 id = `${setId}:${icon.name}`） */
function codexOf(setIds) {
  const codex = {}
  const want = new Set(setIds)
  for (const b of manifest.banners) {
    for (const s of b.sets ?? []) {
      if (!want.has(s.id)) continue
      for (const ic of s.assets?.icons ?? []) codex[`${s.id}:${ic.name}`] = { count: 1, firstAt: 1 }
    }
  }
  return codex
}
const ALL_SET_IDS = [...new Set(manifest.banners.flatMap((b) => (b.sets ?? []).map((s) => s.id)))]

function saveWith(codex) {
  return JSON.stringify({
    version: 1,
    selectedVersion: '2.11',
    pity: {},
    codex,
    milestoneClaimed: [],
    history: [],
    settings: { skipAnim: true, skipOpening: true, skipGacha: true },
  })
}

async function newPage(browser, save) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addInitScript(([k, v]) => {
    if (localStorage.getItem(`${k}-seeded`)) return
    localStorage.setItem(k, v)
    localStorage.setItem(`${k}-seeded`, '1')
  }, [SAVE_KEY, save])
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  return { ctx, page, errors }
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })

/* ═══════════════════════════ 一、服装图鉴按阁分组 ═══════════════════════════ */

head('【一、服装图鉴：按阁所在版本分组】')

const CUSTOM = ['0.1', '0.2'] // 工坊自建版本
for (const v of CUSTOM) {
  const want = setsOfVersion(v).map((s) => s.name)
  ok(want.length > 0, `C1.${v} 数据侧该版本有套装`, `${want.length} 套（${want.join('、')}）`)
}

{
  const { page, errors, ctx } = await newPage(browser, saveWith(codexOf(ALL_SET_IDS)))
  await page.goto(`${BASE}/#/codex/clothes`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.cl-vers', { timeout: 30000 })
  await page.waitForTimeout(1200)

  // 展开全部大版本，才能点到 0.1 / 0.2 的小版本行
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('.cl-vmajor')) {
      if (!el.classList.contains('open')) el.click()
    }
  })
  await page.waitForTimeout(700)
  const minors = await page.$$eval('.cl-vminor', (els) =>
    els.map((e) => e.querySelector('.vn-ver b')?.textContent?.trim() ?? ''))

  const got = {}
  for (const v of ['0.1', '0.2', '1.0', '1.1', '1.5', '2.0', '2.5', '2.11']) {
    const idx = minors.indexOf(v)
    if (idx < 0) { got[v] = null; continue }
    // 小版本行会互相压住 → 用下标在页面里直接 click，别用真实鼠标
    await page.evaluate((i) => document.querySelectorAll('.cl-vminor')[i]?.click(), idx)
    await page.waitForTimeout(220)
    got[v] = await page.$$eval('.st-name', (els) => els.map((e) => e.textContent.trim()))
  }

  for (const v of CUSTOM) {
    const want = setsOfVersion(v).map((s) => s.name)
    const have = got[v] ?? []
    const miss = want.filter((n) => !have.includes(n))
    ok(have.length === want.length && miss.length === 0, `C2.${v} 图鉴套装栏 = 该版本各阁的套装并集`,
      `页面 ${have.length} / 期望 ${want.length}${miss.length ? `（缺 ${miss.join('、')}）` : ''}`)
  }

  // 0.1 那两套「首发就是 0.1」的套装必须在里面（用户报障的主角）
  {
    const home = setsOfVersion('0.1').filter((s) => String(s.firstVersion || '').startsWith('0.1')).map((s) => s.name)
    const have = got['0.1'] ?? []
    ok(home.every((n) => have.includes(n)) && home.length > 0,
      'C3 0.x 首发的套装出现在 0.1 图鉴里', home.join('、') || '（数据里没有 0.x 首发套装）')
  }

  // 分组口径的关键差异：套装出现在**哪座阁**，就归到那座阁的版本 ——
  // 不再按「首发版本」归类（星之海首发 1.5 泡泡季，但它的阁在 0.1 心轮曳星河里，
  // 按旧口径会跑到 1.5 去，1.5 那一版又没有它）。
  {
    const s0 = setsOfVersion('0.1').find((s) => {
      const num = (String(s.firstVersion || '').match(/^\d+\.\d+/) || [''])[0]
      return num && num !== '0.1'
    })
    const fv = s0 ? (String(s0.firstVersion || '').match(/^\d+\.\d+/) || [''])[0] : ''
    const inCustom = s0 ? (got['0.1'] ?? []).includes(s0.name) : false
    const inFirst = s0 && got[fv] ? got[fv].includes(s0.name) : null
    ok(!!s0 && inCustom && inFirst === false,
      'C4 套装归到「阁所在版本」，不跟首发版本走',
      s0 ? `${s0.name}（首发 ${fv}）→ 0.1 ${inCustom ? '有' : '无'} / ${fv} ${inFirst === null ? '未取样' : inFirst ? '有' : '无'}` : '数据里没有跨版本的套装')
  }

  // 搜索不能因为「一套在多阁」而出现重复条目
  {
    await page.evaluate(() => document.querySelector('.cl-search')?.click())
    await page.waitForTimeout(200)
    await page.fill('.sp-sinput', '星之海')
    await page.waitForTimeout(300)
    const names = await page.$$eval('.sp-sname', (els) => els.map((e) => e.textContent.trim()))
    ok(names.filter((n) => n === '星之海').length === 1, 'C5 搜索结果里同一套不会重复出现',
      `命中 ${names.filter((n) => n === '星之海').length} 条（全部结果 ${JSON.stringify(names)}）`)
    await page.evaluate(() => document.querySelector('.sp-sclose')?.click())
    await page.waitForTimeout(200)
  }

  // 服装图鉴 → 套装故事：0.1 的套装跳过去应该落在「奇迹传说」栏
  {
    const minorIdx = minors.indexOf('0.1')
    await page.evaluate((i) => document.querySelectorAll('.cl-vminor')[i]?.click(), minorIdx)
    await page.waitForTimeout(250)
    const first = setsOfVersion('0.1')[0]
    await page.evaluate((n) => {
      for (const el of document.querySelectorAll('.cl-set')) {
        if (el.textContent.trim() === n) { el.click(); return }
      }
    }, first.name)
    await page.waitForTimeout(300)
    await page.evaluate(() => document.querySelector('.cl-plog')?.click())
    await page.waitForSelector('.readings', { timeout: 20000 })
    await page.waitForTimeout(500)
    const st = await page.evaluate(() => ({
      on: [...document.querySelectorAll('.rd-tab')].find((e) => e.classList.contains('on'))?.textContent?.trim(),
      sel: document.querySelector('.rd-row.sel .rd-title')?.textContent?.trim(),
    }))
    ok(st.on === '奇迹传说' && st.sel === first.name, 'C6 服装图鉴的「套装故事」跳到奇迹传说并定位到该套装',
      `选中栏 ${st.on} / 选中条 ${st.sel} / 期望 ${first.name}`)
  }

  ok(errors.length === 0, 'C7 无控制台报错', errors.slice(0, 2).join(' | '))
  await ctx.close()
}

/* ═══════════════════════════ 二、故事图鉴三分区 ═══════════════════════════ */

head('【二、故事图鉴：奇迹传说栏】')

const MIRACLE = STORIES.filter((s) => s.major === 0)

{
  const { page, errors, ctx } = await newPage(browser, saveWith({}))
  await page.goto(`${BASE}/#/codex/stories`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.readings', { timeout: 20000 })
  await page.waitForTimeout(600)

  const tabs = await page.$$eval('.rd-tab', (els) => els.map((e) => {
    const b = e.getBoundingClientRect()
    return { t: e.textContent.trim(), x: b.x, w: b.width, on: e.classList.contains('on') }
  }))
  ok(tabs.length === 3, 'S1 顶部是三栏', `实际 ${tabs.length} 栏：${tabs.map((t) => t.t).join(' / ')}`)
  {
    const want = ['奇迹传说', '心愿原野', '伊赞之土']
    ok(JSON.stringify(tabs.map((t) => t.t)) === JSON.stringify(want), 'S2 栏位顺序 = 大版本升序（0 / 1 / 2）',
      tabs.map((t) => t.t).join(' → '))
  }
  {
    // 整组居中：首栏左边距应与末栏右边距对称（±2px）
    const l = tabs[0].x
    const r = 1920 - (tabs[tabs.length - 1].x + tabs[tabs.length - 1].w)
    ok(Math.abs(l - r) <= 2, 'S3 三栏整组水平居中', `左 ${l.toFixed(1)} / 右 ${r.toFixed(1)}`)
  }
  {
    // 键帽不能压住按钮：Q 在最左栏左侧、E 在最右栏右侧
    const keys = await page.$$eval('.rd-key', (els) => els.map((e) => {
      const b = e.getBoundingClientRect()
      return { src: e.getAttribute('src') || '', x: b.x, r: b.x + b.width }
    }))
    const q = keys.find((k) => /key-q/.test(k.src))
    const e = keys.find((k) => /key-e/.test(k.src))
    const lastR = tabs[tabs.length - 1].x + tabs[tabs.length - 1].w
    ok(!!q && !!e && q.r <= tabs[0].x && e.x >= lastR, 'S4 Q / E 键帽在三栏整组外侧、不压按钮',
      q && e ? `Q 右缘 ${q.r.toFixed(1)} ≤ 首栏 ${tabs[0].x.toFixed(1)}；E 左缘 ${e.x.toFixed(1)} ≥ 末栏 ${lastR.toFixed(1)}` : '没找到键帽')
  }

  // 默认停在 心愿原野
  {
    const on = tabs.find((t) => t.on)
    ok(on?.t === '心愿原野', 'S5 默认栏位仍是心愿原野', on?.t ?? '（无选中）')
  }

  // 点「奇迹传说」→ 列表 = 数据里 major 0 的那些
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('.rd-tab')) if (el.textContent.trim() === '奇迹传说') el.click()
  })
  await page.waitForTimeout(600)
  {
    const rows = await page.$$eval('.rd-title', (els) => els.map((e) => e.textContent.trim()))
    const want = MIRACLE.map((s) => s.title)
    const miss = want.filter((n) => !rows.includes(n))
    ok(rows.length === want.length && miss.length === 0, 'S6 奇迹传说栏的条目 = 数据里 major 0 的故事',
      `页面 ${rows.length} / 期望 ${want.length}${miss.length ? `（缺 ${miss.join('、')}）` : ''}`)
    const label = await page.$eval('.rd-labeltxt', (e) => e.textContent.trim())
    ok(label === `故事 (0/${want.length})`, 'S7 标签头计数与条目数一致', label)
  }

  // Q / E 改成左右翻栏（三栏循环）
  {
    const seq = []
    await page.keyboard.press('e') // 奇迹传说 → 心愿原野
    await page.waitForTimeout(300)
    seq.push(await page.$eval('.rd-tab.on', (e) => e.textContent.trim()))
    await page.keyboard.press('q') // 心愿原野 → 奇迹传说
    await page.waitForTimeout(300)
    seq.push(await page.$eval('.rd-tab.on', (e) => e.textContent.trim()))
    await page.keyboard.press('q') // 奇迹传说 → 伊赞之土（循环）
    await page.waitForTimeout(300)
    seq.push(await page.$eval('.rd-tab.on', (e) => e.textContent.trim()))
    ok(JSON.stringify(seq) === JSON.stringify(['心愿原野', '奇迹传说', '伊赞之土']),
      'S8 Q / E 在三栏之间左右循环', seq.join(' → '))
  }

  ok(errors.length === 0, 'S9 无控制台报错', errors.slice(0, 2).join(' | '))
  await page.screenshot({ path: path.join(OUT, 'v2814-stories-miracle.png') })
  await ctx.close()
}

// 集齐套装后：正文可读 + 标签头 2/2（解锁判定不能用「区域」写死）
{
  const { page, ctx } = await newPage(browser, saveWith(codexOf(MIRACLE.map((s) => s.setId))))
  const name = encodeURIComponent(MIRACLE[0].title)
  await page.goto(`${BASE}/#/codex/stories?name=${name}`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.readings', { timeout: 20000 })
  await page.waitForTimeout(800)
  {
    const st = await page.evaluate(() => ({
      on: [...document.querySelectorAll('.rd-tab')].find((e) => e.classList.contains('on'))?.textContent?.trim(),
      sel: document.querySelector('.rd-row.sel .rd-title')?.textContent?.trim(),
      label: document.querySelector('.rd-labeltxt')?.textContent?.trim(),
      body: document.querySelector('.rd-cbody')?.textContent?.trim() ?? '',
    }))
    ok(st.on === '奇迹传说' && st.sel === MIRACLE[0].title, 'S10 深链 ?name=奇迹传说里的故事 → 落在奇迹传说栏',
      `栏 ${st.on} / 条 ${st.sel}`)
    ok(st.label === `故事 (2/${MIRACLE.length})`, 'S11 集齐后标签头计数更新', st.label)
    ok(st.body.length > 50, 'S12 集齐套装后正文可读', `${st.body.length} 字`)
  }
  await ctx.close()
}

/* ═══════════════════════════ 三、阅读物图鉴不动 ═══════════════════════════ */

head('【三、阅读物图鉴仍两栏（本次不动）】')

{
  const { page, ctx } = await newPage(browser, saveWith({}))
  await page.goto(`${BASE}/#/codex/readings`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.readings', { timeout: 20000 })
  await page.waitForTimeout(500)
  const tabs = await page.$$eval('.rd-tab', (els) => els.map((e) => e.textContent.trim()))
  ok(tabs.length === 2 && tabs[0] === '心愿原野' && tabs[1] === '伊赞之土', 'R1 阅读物图鉴仍只有两栏',
    tabs.join(' / '))
  await ctx.close()
}

await browser.close()

/* ═══════════════════════════ 汇总 ═══════════════════════════ */

console.log('\n──────────────────────────────────────────')
if (fail === 0) console.log(`✓ ${pass} / ${pass} PASS`)
else console.log(`✗ ${pass} 通过 · ${fail} 失败（共 ${pass + fail}）`)
console.log('=== 验证完成 ===')
process.exit(fail === 0 ? 0 : 1)
