/**
 * 验收
 *
 * A. 故事分区归位：0 号「奇迹传说」= 0.1 / 0.2 两版 8 座阁的 14 篇
 * （这 14 套里有 10 套是从官方旧版本借调的，按「套装首发版本」归区会散掉）
 * B. 故事图鉴 / 阅读物图鉴：换一条就回到正文开头
 * C. 拓展包只装自建内容：内置 88 座阁 / 134 篇故事 / 596 篇阅读物都不进候选
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SIM = 'http://127.0.0.1:5178'
const UPD = 'http://127.0.0.1:5199'
const SAVE_KEY = 'nikki-resonance-save-v1'
const ROOT = process.cwd()

const pass = []
const fail = []
function ok(name, cond, extra = '') {
  if (cond) pass.push(name)
  else fail.push(`${name}${extra ? '  ← ' + extra : ''}`)
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? `  (${extra})` : ''}`)
}

/* ═════════════════ A. 故事分区 ═════════════════ */
console.log('\n════ A 故事分区 ════')

const read = (p) => fs.readFileSync(p, 'utf8')
const storiesTs = read('src/data/stories.ts')
const poolMap = JSON.parse(read('素材/pool-map.json'))
const manifest = JSON.parse(read('public/assets/manifest.json'))

/** setName → major（生成文件的字段顺序固定：setName → star → major） */
const majorOf = new Map()
for (const m of storiesTs.matchAll(/setName: "([^"]+)",\n {4}star: (\d+),\n {4}major: (\d+),/g)) {
  majorOf.set(m[1], Number(m[3]))
}
ok('A1 解析出全部故事条目（134 篇）', majorOf.size === 134, `${majorOf.size} 篇`)

const dist = {}
for (const v of majorOf.values()) dist[v] = (dist[v] || 0) + 1
ok('A2 分区计数 0=14 / 1=64 / 2=56', dist[0] === 14 && dist[1] === 64 && dist[2] === 56, JSON.stringify(dist))

// 0.1 / 0.2 两版的全部套装都应落在 0 号
const miracle = poolMap.banners.filter((b) => b.version.split('.')[0] === '0')
const miracleSets = miracle.flatMap((b) => b.sets.map((s) => s.name))
ok('A3 0.x 两版共 8 座阁 / 14 套', miracle.length === 8 && miracleSets.length === 14,
  `${miracle.length} 阁 / ${miracleSets.length} 套`)
const wrong = miracleSets.filter((n) => majorOf.get(n) !== 0)
ok('A4 这 14 套的故事全部归 0 号', wrong.length === 0, wrong.join('、') || '全部正确')

// 借调套装：首发版本不是 0.x，却被 0.x 的阁收着 —— 正是以前散出去的那 10 篇
const borrowed = miracle
  .flatMap((b) => b.sets)
  .filter((s) => !String(s.firstVersion || '').startsWith('0.'))
ok('A5 借调套装 10 套（首发在 1.x / 2.x）', borrowed.length === 10,
  borrowed.map((s) => `${s.name}@${s.firstVersion}`).join(' / '))
ok('A6 借调套装的 major 也跟着归 0（不按首发版本）',
  borrowed.every((s) => majorOf.get(s.name) === 0), borrowed.map((s) => majorOf.get(s.name)).join(','))

const gen = read('tools/gen-stories.py')
ok('A7 gen-stories 用「阁的版本」算 major（不再用 firstVersion）',
  /major = int\(mm\.group\(1\)\) if mm else 1/.test(gen) &&
  /for b in pm\["banners"\]:\n\s+mm = re\.match/.test(gen) &&
  !/fv = str\(s\.get\("firstVersion"\)/.test(gen))

/* ═════════════════ 浏览器（B） ═════════════════ */
const BASE_SAVE = {
  version: 1,
  selectedVersion: '2.10',
  pity: {},
  codex: {},
  milestoneClaimed: {},
  history: [],
  settings: { skipAnim: true, skipOpening: true },
}

/**
 * 造一份「全部解锁」的存档。
 *
 * 不手工拼 codex —— 部件 id 是 `S0062:发型-翠金花藤` 这种由图标名派生的，
 * 还带一层「没有卡片图的部件不算」的过滤（见 inventory.expandSet），
 * 在测试里重写一遍必然对不上。直接点设置页的两个「执行」，让应用自己算。
 */
async function forgeSave() {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, JSON.stringify(BASE_SAVE)])
  const page = await ctx.newPage()
  await page.goto(`${SIM}/#/settings`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('.gl-hot', { timeout: 60000 })
  await page.locator('.gl-hot[aria-label="快捷"]').click()
  await page.waitForSelector('.gm-btn', { timeout: 30000 })
  await page.locator('.gm-btn').nth(0).click() // 集齐全部套装
  await page.waitForTimeout(1500)
  await page.locator('.gm-btn').nth(1).click() // 集齐全部阅读（异步拉正文）
  await page.waitForTimeout(3500)
  const save = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), SAVE_KEY)
  await ctx.close()
  const parts = Object.keys(save?.codex || {}).filter((k) => !k.startsWith('reading:')).length
  const books = Object.keys(save?.codex || {}).filter((k) => k.startsWith('reading:')).length
  ok('B0 造出全解锁存档（部件 / 阅读物）', parts > 500 && books > 500, `${parts} 件 / ${books} 本`)
  return save
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const errs = []

const SAVE = await forgeSave()

async function openPage(hash) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, JSON.stringify(SAVE)])
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errs.push(`${hash}: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (/favicon|Failed to load resource/.test(t)) return
    errs.push(`${hash}: ${t.slice(0, 140)}`)
  })
  await page.goto(`${SIM}/#${hash}`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('.rd-row', { timeout: 60000 })
  await page.waitForTimeout(1200)
  return { ctx, page }
}

/**
 * 在某一篇上把正文滚到底，再切到另一篇，检查 scrollTop 是否归零。
 *
 * 只有「本文溢出容器」时才有意义 —— 所以先逐行点过去找一篇真溢出的。
 */
async function testScrollReset(page, { label, tabIndex }) {
  if (tabIndex !== undefined) {
    await page.locator('.rd-tab').nth(tabIndex).click()
    await page.waitForTimeout(500) // 黑屏过渡 160ms + 换区
  }

  const rows = await page.locator('.rd-row').count()
  const info = await page.evaluate(() => {
    const w = document.querySelector('.rd-cbody-wrap')
    return {
      label: document.querySelector('.rd-labeltxt')?.textContent?.trim() || '',
      overflow: w ? w.scrollHeight - w.clientHeight : 0,
      title: document.querySelector('.rd-ctitle')?.textContent?.trim() || '',
    }
  })
  console.log(`  ${label}：${rows} 行 / ${info.label}`)

  // 找第一篇溢出的
  let firstIdx = -1
  for (let i = 0; i < Math.min(rows, 12); i++) {
    await page.locator('.rd-row').nth(i).click()
    await page.waitForTimeout(750) // 240ms 正文淡入 + 余量
    const ov = await page.evaluate(() => {
      const w = document.querySelector('.rd-cbody-wrap')
      return w ? w.scrollHeight - w.clientHeight : 0
    })
    if (ov > 80) { firstIdx = i; break }
  }
  ok(`${label} 找到一篇正文溢出的`, firstIdx >= 0, firstIdx >= 0 ? `第 ${firstIdx + 1} 行` : '12 行内都没溢出')

  if (firstIdx < 0) return { firstIdx }

  const first = await page.evaluate(() => {
    const w = document.querySelector('.rd-cbody-wrap')
    w.scrollTop = w.scrollHeight
    return {
      top: w.scrollTop,
      max: w.scrollHeight - w.clientHeight,
      title: document.querySelector('.rd-ctitle')?.textContent?.trim() || '',
    }
  })
  ok(`${label} 第一篇已滚到底`, first.top > 0, `scrollTop=${Math.round(first.top)} / max=${Math.round(first.max)}`)

  // 切到另一篇（也要溢出，才证明「两篇长文互相切」）
  let secondIdx = -1
  for (let i = 0; i < Math.min(rows, 12); i++) {
    if (i === firstIdx) continue
    await page.locator('.rd-row').nth(i).click()
    await page.waitForTimeout(750)
    const r = await page.evaluate(() => {
      const w = document.querySelector('.rd-cbody-wrap')
      const t = document.querySelector('.rd-ctitle')?.textContent?.trim() || ''
      return { ov: w ? w.scrollHeight - w.clientHeight : 0, top: w ? w.scrollTop : -1, title: t }
    })
    if (r.ov > 80 && r.title && r.title !== first.title) {
      secondIdx = i
      ok(`${label} 切到另一篇长文后 scrollTop 归零`, r.top === 0, `第 ${i + 1} 行 scrollTop=${Math.round(r.top)}`)
      return { firstIdx, secondIdx, secondTop: r.top }
    }
  }
  ok(`${label} 切到另一篇长文后 scrollTop 归零`, false, '没找到第二篇溢出的')
  return { firstIdx, secondIdx }
}

console.log('\n════ B 图鉴滚动复位 ════')
{
  const { ctx, page } = await openPage('/codex/stories')
  // 顶部三栏：0 = 奇迹传说
  await page.locator('.rd-tab').nth(0).click()
  await page.waitForTimeout(600)
  const m = await page.evaluate(() => ({
    label: document.querySelector('.rd-labeltxt')?.textContent?.trim() || '',
    rows: document.querySelectorAll('.rd-row').length,
    titles: [...document.querySelectorAll('.rd-row .rd-title')].map((e) => e.textContent.trim()),
  }))
  ok('B1 故事图鉴 · 奇迹传说 显示 14 篇', m.rows === 14 && /\(14\/14\)/.test(m.label), `${m.rows} 行 / ${m.label}`)
  ok('B2 心愿金蔷薇 / 暖歌花纪 都在奇迹传说里',
    m.titles.includes('心愿金蔷薇') && m.titles.includes('暖歌花纪'), m.titles.join('、'))
  ok('B3 咏叹银夜莺 / 深林遥梦 也已归位（以前在别的分区）',
    m.titles.includes('咏叹银夜莺') && m.titles.includes('深林遥梦'), '')

  await testScrollReset(page, { label: '故事图鉴' })
  await ctx.close()
}

{
  const { ctx, page } = await openPage('/codex/readings')
  await testScrollReset(page, { label: '阅读物图鉴' })
  await ctx.close()
}

/* ═════════════════ C. 拓展包只装自建内容 ═════════════════ */
console.log('\n════ C 拓展包范围 ════')

const dlcExport = await import('../../updater/lib/dlc-export.mjs')
const meta = await import('../../updater/lib/meta.mjs')
const cands = dlcExport.exportCandidates()

ok('C1 manifest 仍是 88 座内置阁（对照组）', manifest.banners.length === 88, `${manifest.banners.length} 座`)
ok('C2 服装阁候选 = 8 座自建阁', cands.banners.length === 8,
  cands.banners.map((b) => `${b.name}(${b.version})`).join(' / '))
ok('C3 候选里没有任何官方编号（全部 ≥ 500）',
  cands.banners.every((b) => Number(String(b.id).replace(/\D/g, '')) >= 500),
  cands.banners.map((b) => b.id).join(' '))
ok('C4 套装候选 14 套（= 0.1/0.2 的套装）', cands.sets.length === 14, `${cands.sets.length} 套`)
ok('C5 故事候选 14 篇', cands.stories.length === 14, cands.stories.join('、'))
ok('C6 阅读物候选为空（内置 596 篇未登记，不参与打包）', cands.readings.length === 0, `${cands.readings.length} 篇`)
ok('C7 版本候选 = 0.1 / 0.2（整版自建）',
  cands.versions.length === 2 && cands.versions.every((v) => v.v.startsWith('0.')),
  cands.versions.map((v) => v.v).join(' '))
ok('C8 自建内容清单已含 readings 维度', Array.isArray(meta.readCustom().readings))

/** 导出内置内容必须被拦下（直接打 API 也绕不过去） */
const guards = [
  ['服装阁', () => dlcExport.exportBanner('banner-080')],
  ['套装', () => dlcExport.exportSet('绽若颂愿心')],
  ['故事', () => dlcExport.exportStory('绽若颂愿心')],
  ['版本', () => dlcExport.exportVersion('2.11')],
  ['阅读物', () => dlcExport.exportReading('《恩泽纪·卷七》')],
]
for (const [what, fn] of guards) {
  let msg = ''
  try { fn() } catch (e) { msg = String(e.message || e) }
  ok(`C9 导出内置${what}被拒绝`, msg.includes('自带内容'), msg.slice(0, 40))
}

// 服务端 /api/state 里的候选也必须是过滤后的（工坊界面读的是这一份）
const state = await (await fetch(`${UPD}/api/state`)).json()
const sc = state.dlc?.candidates || {}
ok('C10 工坊 /api/state 的候选同样只剩 8 座自建阁',
  (sc.banners || []).length === 8, `${(sc.banners || []).length} 座`)
ok('C11 /api/state 里没有内置阁（雪落颂愿时不在候选里）',
  !(sc.banners || []).some((b) => b.name === '雪落颂愿时'))

// 真实界面：进「扩展包」面板看下拉
{
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 940 } })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errs.push(`updater: ${e.message}`))
  await page.goto(UPD, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForSelector('.rail-item', { timeout: 30000 })
  await page.locator('.rail-item[data-job="dlc"]').click()
  await page.waitForSelector('#dlc-kind', { timeout: 30000 })
  await page.waitForTimeout(800)
  const ui = await page.evaluate(() => {
    // 起候选从单选下拉改成多选复选框
    const picks = [...document.querySelectorAll('[data-pick]')].map((el) => ({
      v: el.dataset.pick || '',
      t: el.closest('label')?.textContent?.trim() || '',
    }))
    return {
      kind: document.querySelector('#dlc-kind')?.value,
      opts: picks,
      hint: document.querySelector('.fields .hint')?.textContent?.trim() || '',
    }
  })
  ok('C12 界面「包里放什么」默认服装阁', ui.kind === 'banner', ui.kind)
  const real = ui.opts.filter((o) => o.v)
  ok('C13 候选只剩 8 座自建阁', real.length === 8, real.map((o) => o.t).join(' / '))
  ok('C14 候选里没有内置阁', !real.some((o) => /雪落颂愿时|绽若颂愿心|心愿金蔷薇/.test(o.v + o.t)))

  await page.screenshot({ path: '.shots/v2922-dlc.png' })
  await ctx.close()
}

/* ═════════════════ 收尾 ═════════════════ */
ok('D1 两个应用都没有 JS 报错', errs.length === 0, errs.slice(0, 2).join(' / '))

await browser.close()
console.log(`\n════ 结果：${pass.length} 通过 / ${fail.length} 失败 ════`)
if (fail.length) {
  for (const f of fail) console.log('  ✗ ' + f)
  process.exit(1)
}
