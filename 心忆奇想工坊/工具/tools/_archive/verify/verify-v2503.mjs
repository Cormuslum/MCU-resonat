/**
 * 验收：共鸣页跳转 / 全局 ESC / 栖骨生花文案 / 深海回响视觉 / 抽取记录
 *
 * A 共鸣页套装详情：跳转按钮存在 + 点击后落到服装图鉴的对应对应套装
 * B 套装详情弹窗按 ESC：只关弹窗，人还留在共鸣页（原来会直接退回主页）
 * C 从共鸣页跳过去后按 ESC：回到共鸣页（跳转返回栈）
 * D 搜索弹窗跳转 → 按 ESC 回来时搜索弹窗仍开着、关键词还在
 * E 服装图鉴 → 故事图鉴（按钮跳转）→ ESC 回服装图鉴
 * F 栖骨生花有整体文案，且服装图鉴能显示出来
 * G 服装图鉴部件栏切换音效 = btn-ten-hover
 * H 共鸣详情：左右切换键切到抽取记录 / 最多 50 条 / 新的在上 / 星级图标
 * I 深海回响：已走过轨道有高亮 path、彩虹光带用径向遮罩柔化
 *
 * 用法：先 npm run dev（5178），再 node tools/verify-v2503.mjs
 */
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

/* ═════════════ A 静态：文案数据 ═════════════ */

const man = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8'))
let qgs = null
for (const b of man.banners) for (const s of b.sets ?? []) if (s.name === '栖骨生花') qgs = s
check('F 栖骨生花 desc 非空', (qgs?.desc ?? '').length > 20, `${(qgs?.desc ?? '').length} 字`)
const emptyDesc = man.banners.flatMap((b) => b.sets ?? []).filter((s) => !(s.desc ?? '').trim())
check('F 全部套装都有整体文案', emptyDesc.length === 0, emptyDesc.map((s) => s.name).join(', ') || '118 套全有')

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--color-profile=srgb', '--autoplay-policy=no-user-gesture-required'],
})
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

await page.addInitScript(() => {
  const Orig = window.Audio
  window.__played = []
  window.Audio = function (src) {
    const a = new Orig(src)
    const p = a.play.bind(a)
    a.play = function () {
      window.__played.push({ src: a.src, vol: a.volume })
      return p()
    }
    return a
  }
})

const pageErrors = []
const isAbort = (t) => /net::ERR_ABORTED/.test(t) && /\.(webm|ogg|mp3|mp4|webp)\b/.test(t)
const push = (t) => { if (!isAbort(t)) pageErrors.push(t) }
page.on('console', (m) => { if (m.type() === 'error') push(m.text()) })
page.on('pageerror', (e) => push(e.message))
page.on('requestfailed', (r) => push(`reqfail ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => { if (r.status() >= 400) push(`http${r.status()} ${r.url()}`) })

async function drain() {
  return page.evaluate(() => {
    const x = window.__played.slice()
    window.__played = []
    return x.map((p) => ({ key: (p.src.split('/assets/')[1] || '').replace(/^sfx\//, '').replace(/\.ogg.*$/, ''), vol: Math.round(p.vol * 1000) / 1000 })).filter((p) => p.key && !p.key.includes('/'))
  })
}
const hash = () => page.evaluate(() => location.hash)

// 造存档：每个池 108 抽 + 60 条记录（超过 50 上限，用来验截断）
// ⚠ 起抽取记录**按池过滤**，流水必须挂在共鸣页默认选中的那个池上
//    （store.bannerId 初值 = banner-2.10-02），否则打开详情是空列表
await page.goto(`${BASE}/#/`)
await page.waitForTimeout(2200)
await page.evaluate(async () => {
  const m = await fetch('/assets/manifest.json').then((r) => r.json())
  const bid = 'banner-2.10-02'
  const now = Date.now()
  const hist = Array.from({ length: 60 }, (_, i) => ({
    banner: bid,
    rarity: i === 59 ? 5 : i % 10 === 0 ? 4 : 3,
    part: `S0290:测试部件${i}`,
    name: `测试部件${i}`,
    star: i === 59 ? 5 : i % 10 === 0 ? 4 : 3,
    at: now - (59 - i) * 1000, // i=59 = 最新，与 store 的 push 顺序一致
  }))
  localStorage.setItem('nikki-resonance-save-v1', JSON.stringify({
    version: 1,
    selectedVersion: '2.10',
    pity: Object.fromEntries(m.banners.map((bb) => [bb.id, { p5: 12, p4: 3, total: 108 }])),
    codex: {},
    milestoneClaimed: {},
    history: hist,
    settings: { skipAnim: true, skipGacha: true, skipReward: true, skipOpening: true },
  }))
})
await page.reload()
await page.waitForTimeout(2400)
await drain()

/* ═════════════ A 跳转按钮 ═════════════ */

let jumpedName = ''
await step('A 套装详情跳转按钮', async () => {
  await page.goto(`${BASE}/#/banner`)
  await page.waitForTimeout(2600)
  await page.waitForSelector('.sb-track .set-banner', { timeout: 8000 })
  await page.locator('.sb-track .set-banner').first().click()
  await page.waitForTimeout(700)
  const has = await page.evaluate(() => !!document.querySelector('.sh-jump'))
  const nm = await page.evaluate(() => document.querySelector('.sh-name')?.textContent?.trim() ?? '')
  jumpedName = nm
  check('A 套装详情有跳转按钮', has)
  check('A 按钮尺寸 74×74', await page.evaluate(() => {
    const r = document.querySelector('.sh-jump')?.getBoundingClientRect()
    return !!r && Math.round(r.width) === 74 && Math.round(r.height) === 74
  }))
  // 相对三个属性胶囊：应在胶囊右侧、同一水平带
  const rel = await page.evaluate(() => {
    const j = document.querySelector('.sh-jump')?.getBoundingClientRect()
    const lab = document.querySelector('.sh-labels')?.getBoundingClientRect()
    if (!j || !lab) return null
    return { rightOf: j.left > lab.right - 4, vOverlap: Math.abs((j.top + j.height / 2) - (lab.top + lab.height / 2)) < 40 }
  })
  check('A 按钮位于属性胶囊右侧且垂直居中', !!rel && rel.rightOf && rel.vOverlap, JSON.stringify(rel))
  await page.click('.sh-jump')
  await page.waitForTimeout(900)
  const h = await hash()
  check('A 点跳转 → /codex/clothes', h.startsWith('#/codex/clothes'), h)
  const located = await page.evaluate(() => document.querySelector('.in-name')?.textContent?.trim() || document.querySelector('.cl-name')?.textContent?.trim() || '')
  check('A 落到对应套装', located.includes(jumpedName) || jumpedName.length === 0, `目标「${jumpedName}」→ 当前「${located}」`)
})

/* ═════════════ C 跳转后 ESC 回共鸣页 ═════════════ */

await step('C 跳转后 ESC 回共鸣页', async () => {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(800)
  const h = await hash()
  check('C 服装图鉴 ESC → 回共鸣页', h.startsWith('#/banner'), h)
})

/* ═════════════ B 套装弹窗 ESC ═════════════ */

await step('B 套装弹窗 ESC 只关弹窗', async () => {
  await page.evaluate(() => { location.hash = '#/banner' })
  await page.waitForTimeout(1800)
  await page.locator('.sb-track .set-banner').first().click()
  await page.waitForTimeout(600)
  const opened = (await page.$('.sheet-mask')) !== null
  await page.keyboard.press('Escape')
  await page.waitForTimeout(600)
  const still = (await page.$('.sheet-mask')) !== null
  const h = await hash()
  check('B 套 ESC 关掉套装弹窗', opened && !still)
  check('B 套 ESC 后仍在共鸣页', h.startsWith('#/banner'), h)
})

/* ═════════════ H 抽取记录 ═════════════ */

await step('H 抽取记录', async () => {
  await page.click('.detail-btn')
  await page.waitForTimeout(500)
  const t0 = await page.evaluate(() => document.querySelector('.pp-head h4')?.textContent?.trim())
  check('H 默认页签是共鸣概率', t0 === '共鸣概率', t0)
  const navs = await page.$$('.pn')
  check('H 有左右两个切换键', navs.length === 2, `共 ${navs.length} 个`)
  const sz = await page.evaluate(() => {
    const r = document.querySelector('.pn')?.getBoundingClientRect()
    return r ? { w: Math.round(r.width), h: Math.round(r.height) } : null
  })
  check('H 切换键 74×74（与彩蛋弹窗一致）', sz?.w === 74 && sz?.h === 74, JSON.stringify(sz))
  await page.click('.pn.next')
  await page.waitForTimeout(500)
  const t1 = await page.evaluate(() => document.querySelector('.pp-head h4')?.textContent?.trim())
  check('H 右键切到抽取记录', t1 === '抽取记录', t1)
  const rows = await page.$$eval('.ph-item', (els) => els.map((e) => e.querySelector('.ph-name')?.textContent?.trim()))
  // ：改为分页 —— 单页 10 条，50 条共 5 页
  check('H 单页 10 条', rows.length === 10, `实测 ${rows.length} 行`)
  const pagerNum = await page.evaluate(() => document.querySelector('.hp-num')?.textContent?.replace(/\s+/g, ' ').trim())
  check('H 50 条分 5 页', /^1\s*\/\s*5$/.test(pagerNum ?? ''), pagerNum)
  check('H 列表不显示序号', (await page.$$('.ph-no')).length === 0)
  // 造数据时 i=59 的 at 最大（最新）→ 它必须出现在第一行
  check('H 倒序（最新在最上）', rows[0] === '测试部件59', `首行「${rows[0]}」`)  // noqa
  const starCounts = await page.$$eval('.ph-item', (els) => els.map((e) => e.querySelectorAll('.ph-stars img').length))
  // 首行是 3★，应正好 3 颗通用星级图标；列表里还应有 4★/5★ 行
  check('H 星级用通用图标（首行 5★ = 5 颗）',
    starCounts[0] === 5 && starCounts[1] === 3, `前两行 ${starCounts.slice(0, 2).join('/')} 颗`)
  check('H 列表里出现 4★ / 5★ 行', starCounts.includes(5) && starCounts.includes(4),
    `星级分布 ${[...new Set(starCounts)].sort().join('/')}`)
  // 翻页：第 2 页应接在第 1 页后面
  await page.click('.hp-pg >> nth=1')
  await page.waitForTimeout(420)
  const rows2 = await page.$$eval('.ph-item', (els) => els.map((e) => e.querySelector('.ph-name')?.textContent?.trim()))
  const pagerNum2 = await page.evaluate(() => document.querySelector('.hp-num')?.textContent?.replace(/\s+/g, ' ').trim())
  check('H 翻到第 2 页 → 接着第 1 页往后', rows2.length === 10 && rows2[0] === '测试部件49' && /2\s*\/\s*5/.test(pagerNum2 ?? ''),
    `${pagerNum2} | 首行「${rows2[0]}」`)
  await page.click('.pn.prev')
  await page.waitForTimeout(400)
  const t2 = await page.evaluate(() => document.querySelector('.pp-head h4')?.textContent?.trim())
  check('H 左键切回共鸣概率', t2 === '共鸣概率', t2)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
})

/* ═════════════ D 搜索弹窗跳转 + ESC 返回搜索 ═════════════ */

await step('D 搜索跳转 ESC 回搜索弹窗', async () => {
  await page.goto(`${BASE}/#/codex/readings`)
  await page.waitForTimeout(2600)
  await page.click('.rd-mag')
  await page.waitForTimeout(600)
  await page.fill('.sp-sinput', '栖骨')
  await page.waitForTimeout(700)
  const n = await page.$$eval('.sp-sitem', (els) => els.length)
  if (!n) throw new Error('搜索无结果（存档 codex 为空属正常，跳过前先解锁）')
  // 点第一条（可能是套装/故事/阅读物之一）
  await page.locator('.sp-snext, .sp-sitem button').first().click()
  await page.waitForTimeout(900)
  const afterJump = await hash()
  check('D 搜索跳转离开了原页', !afterJump.startsWith('#/codex/readings'), afterJump)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(800)
  const back = await hash()
  check('D ESC 回到阅读物图鉴', back.startsWith('#/codex/readings'), back)
  const reopened = (await page.$('.sp-mask')) !== null
  const kwVal = await page.evaluate(() => document.querySelector('.sp-sinput')?.value ?? '')
  check('D 搜索弹窗重新打开且关键词还原', reopened && kwVal.length > 0, `open=${reopened} kw=「${kwVal}」`)
})

/* ═════════════ E 服装 → 故事 按钮跳转 ═════════════ */

await step('E 服装图鉴 → 故事图鉴 ESC 返回', async () => {
  await page.goto(`${BASE}/#/codex/clothes`)
  await page.waitForTimeout(2600)
  const btn = await page.$('.cl-plog')
  if (!btn) throw new Error('没找到套装故事跳转按钮 .cl-plog')
  await btn.click()
  await page.waitForTimeout(900)
  const h1 = await hash()
  if (!h1.startsWith('#/codex/stories')) throw new Error(`没跳过去：${h1}`)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(800)
  const h2 = await hash()
  check('E 故事图鉴 ESC → 回服装图鉴', h2.startsWith('#/codex/clothes'), h2)
})

/* ═════════════ G 部件切换音效 ═════════════ */

await step('G 部件栏切换音效', async () => {
  await page.goto(`${BASE}/#/codex/clothes`)
  await page.waitForTimeout(2600)
  await drain()
  const parts = await page.$$('.cl-part')
  if (parts.length < 2) throw new Error(`部件只有 ${parts.length} 个`)
  await parts[1].click()
  await page.waitForTimeout(500)
  const l = await drain()
  check('G 切换部件 = btn-ten-hover', l.some((p) => p.key === 'btn-ten-hover'), l.map((p) => `${p.key}@${p.vol}`).join(' | '))
})

/* ═════════════ F 栖骨生花在界面上能看到文案 ═════════════ */

await step('F 栖骨生花文案上屏', async () => {
  /*
   * 服装图鉴对「一件都没拿到」的套装会显示锁定提示而不是文案，
   * 所以先去辉煌页用「集齐全部套装」把部件补上，再回来看。
   */
  await page.goto(`${BASE}/#/settings`)
  await page.waitForTimeout(2600)
  await page.locator('.gl-hot').nth(2).click()
  await page.waitForTimeout(800)
  const acts = await page.$$('.gm-body .gm-btn')
  if (acts.length) await acts[0].click()
  await page.waitForTimeout(900)

  await page.goto(`${BASE}/#/codex/clothes?name=${encodeURIComponent('栖骨生花')}`)
  await page.waitForTimeout(2800)
  const desc = await page.evaluate(() => document.querySelector('.in-desc')?.textContent?.trim() ?? '')
  check('F 界面显示栖骨生花整体文案', desc.includes('花于何时绽放'), `${desc.slice(0, 26)}…`)
})

/* ═════════════ I 深海回响视觉 ═════════════ */

await step('I 深海回响轨道高亮 + 光带柔化', async () => {
  await page.goto(`${BASE}/#/banner`)
  await page.waitForTimeout(2600)
  await page.click('.wish-card')
  await page.waitForTimeout(1500)
  const info = await page.evaluate(() => {
    const halo = document.querySelector('.ds-pass-halo')
    const core = document.querySelector('.ds-pass-core')
    const band = document.querySelector('.rb-band')
    const cs = band ? getComputedStyle(band) : null
    return {
      hasPassed: !!halo && !!core,
      haloW: halo ? getComputedStyle(halo).strokeWidth : null,
      coreW: core ? getComputedStyle(core).strokeWidth : null,
      dLen: core?.getAttribute('d')?.length ?? 0,
      fullLen: document.querySelector('.ds-line')?.getAttribute('d')?.length ?? 0,
      mask: cs ? (cs.maskImage || cs.webkitMaskImage || '') : '',
      blur: cs ? cs.filter : '',
    }
  })
  check('I 已走过轨道有高亮双 path', info.hasPassed, `halo ${info.haloW} / core ${info.coreW}`)
  check('I 高亮段比整条轨道短（只画到当前抽数）', info.dLen > 0 && info.dLen < info.fullLen, `passed ${info.dLen}B < full ${info.fullLen}B`)
  check('I 彩虹光带用径向遮罩', /radial-gradient/.test(info.mask), info.mask.slice(0, 40))
  check('I 彩虹光带加了柔化模糊', /blur/.test(info.blur), info.blur)
})

check('Z 无控制台报错 / 4xx', pageErrors.length === 0, pageErrors.slice(0, 3).join(' ; ') || 'clean')

await browser.close()
const pass = results.filter((r) => r.ok).length
console.log('\n' + '─'.repeat(44))
console.log(`${pass === results.length ? '✓' : '✗'} ${pass} / ${results.length} PASS`)
process.exit(pass === results.length ? 0 : 1)
