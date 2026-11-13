/** 验收 · 铭牌取图修正 + 2.11 版本卡 + 版本徽记 + */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = '.shots'
mkdirSync(OUT, { recursive: true })
const BASE = 'http://localhost:5178'

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--force-color-profile=srgb'],
})
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

await page.addInitScript(() => {
  try {
    const KEY = 'nikki-resonance-save-v1'
    const raw = localStorage.getItem(KEY)
    const s = raw ? JSON.parse(raw) : { version: 1, pity: {}, codex: {}, milestoneClaimed: {}, history: [], settings: {} }
    if (!s.selectedVersion) s.selectedVersion = '2.10'
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch { /* about:blank 之类 */ }
})

// 先在真实页面上站住（about:blank 读 localStorage 会抛 SecurityError）
await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(800)

const pageErrors = []
const isAborted = (t) => /net::ERR_ABORTED/.test(t)
  && (/\/assets\/(sfx|bgm|video)\//.test(t) || /bg-video(-\d+)?\.(webm|mp4)/.test(t) || /bg-audio(-\d+)?\.ogg/.test(t))
const pushErr = (t) => { if (!isAborted(t)) pageErrors.push(t) }
page.on('console', (m) => { if (m.type() === 'error') pushErr(m.text()) })
page.on('pageerror', (e) => pushErr(e.message))
page.on('requestfailed', (r) => pushErr(`reqfail ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => { if (r.status() >= 400) pushErr(`http${r.status()} ${r.url()}`) })

const results = []
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? `  ${detail}` : ''}`)
}
async function step(name, fn) {
  try {
    await fn()
  } catch (e) {
    check(name, false, `异常 → ${String(e.message ?? e).split('\n')[0].slice(0, 150)}`)
  }
}

/** 切当前版本 */
async function useVersion(v) {
  if (!/#\/banner/.test(page.url())) {
    await page.goto(`${BASE}/#/banner`, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.pool-item', { timeout: 20000 })
  }
  await page.evaluate((ver) => {
    const KEY = 'nikki-resonance-save-v1'
    const s = JSON.parse(localStorage.getItem(KEY) || '{}')
    s.selectedVersion = ver
    localStorage.setItem(KEY, JSON.stringify(s))
  }, v)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pool-item', { timeout: 20000 })
  await page.waitForTimeout(700)
}

const plates = () => page.$$eval('.sb-plate', (els) => els.map((e) => e.getAttribute('src') ?? ''))
const names = () => page.$$eval('.sb-name', (els) => els.map((e) => e.textContent.trim()))
const pools = () => page.$$eval('.pool-item', (els) => els.map((e) => e.getAttribute('title') ?? ''))

async function clickPool(name) {
  const hit = await page.evaluate((nm) => {
    const el = [...document.querySelectorAll('.pool-item')].find((x) => x.getAttribute('title')?.startsWith(nm))
    if (!el) return false
    el.scrollIntoView({ block: 'center' })
    el.click()
    return true
  }, name)
  if (!hit) throw new Error('找不到卡池：' + name)
  await page.waitForTimeout(1000)
}

/* ══════════════════════ 1 · 铭牌取图 ══════════════════════ */
console.log('\n【一、专属铭牌按套装序号取】')

await step('043', async () => {
  await useVersion('2.0')
  await clickPool('何梦破碎于无瑕')
  const r = { names: await names(), plates: await plates() }
  check('A1 043 五星→043-1、四星→043-2',
    /043-1\.webp$/.test(r.plates[0] ?? '') && /043-2\.webp$/.test(r.plates[1] ?? ''),
    `${r.names.join(' / ')} → ${r.plates.map((p) => p.split('/').pop()).join(' / ')}`)
  // 素材必须是 332×96 那一档
  const dim = await page.evaluate(async () => {
    const img = document.querySelector('.sb-plate')
    if (!img) return null
    if (!img.complete) await new Promise((res) => { img.onload = img.onerror = res })
    return [img.naturalWidth, img.naturalHeight]
  })
  check('A2 043 铭牌是 332×96 的横幅，不是套装图标', !!dim && dim[0] === 332 && dim[1] === 96, dim ? dim.join('×') : '取不到')
})

await step('030', async () => {
  await useVersion('1.8')
  await clickPool('缘起绘笔万念生')
  const p = await plates()
  check('A3 030（_name_01/_02 写法）仍然对', /030-1\.webp$/.test(p[0] ?? '') && /030-2\.webp$/.test(p[1] ?? ''), p.map((x) => x.split('/').pop()).join(' / '))
})

await step('001', async () => {
  await useVersion('1.0')
  await clickPool('遥远之海')
  const r = { names: await names(), plates: await plates() }
  const five = r.plates.slice(0, 4).map((p) => /001-([1-4])\.webp$/.test(p))
  const four = r.plates.slice(4).every((p) => /set-name-0[12]\.webp$/.test(p))
  check('A4 001 四个 5★ 各取各的铭牌（1~4），4★ 退回通用底框',
    five.every(Boolean) && four && r.plates.length === 8,
    `${r.plates.length} 套 → ${r.plates.map((p) => p.split('/').pop()).join(' / ')}`)
})

await step('004', async () => {
  await clickPool('呱呱轻语')
  const p = await plates()
  check('A5 004 只有 _name.png → 用 any', p.every((x) => /name\/004\.webp$/.test(x)), p.join(' / '))
})

/* ══════════════════════ 2 · 2.11 版本卡 ══════════════════════ */
console.log('\n【二、2.11 版本缩略图 + 大图】')
await step('2.11 卡', async () => {
  await page.goto(`${BASE}/#/versions`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.vr-minor', { timeout: 20000 })
  await page.waitForTimeout(700)
  await page.evaluate(() => document.querySelectorAll('.vr-major')[1]?.click())
  await page.waitForTimeout(500)
  const thumb = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.vr-minor')].find((x) => x.querySelector('.vn-ver b')?.textContent.trim() === '2.11')
    const img = btn?.querySelector('.vn-thumb')
    return img ? { src: img.getAttribute('src'), w: img.naturalWidth, h: img.naturalHeight } : null
  })
  check('B1 版本页 2.11 有缩略图（672×188）',
    !!thumb && /ui\/ver\/card\/2\.11\.webp$/.test(thumb.src) && thumb.w === 672 && thumb.h === 188,
    thumb ? `${thumb.src} ${thumb.w}×${thumb.h}` : '没有 .vn-thumb')

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.vr-minor')].find((x) => x.querySelector('.vn-ver b')?.textContent.trim() === '2.11')
    btn?.scrollIntoView({ block: 'center' })
    btn?.click()
  })
  await page.waitForTimeout(900)
  const big = await page.evaluate(() => {
    const img = document.querySelector('.vs-card')
    return img ? { src: img.getAttribute('src'), w: img.naturalWidth, h: img.naturalHeight } : null
  })
  check('B2 版本大图 = ui/ver/big/2.11.webp（1532×860）',
    !!big && /ui\/ver\/big\/2\.11\.webp$/.test(big.src) && big.w === 1532 && big.h === 860,
    big ? `${big.src} ${big.w}×${big.h}` : '没有 .vs-card')
  await page.screenshot({ path: `${OUT}/v2603-ver211.png` })

  // 图鉴赛季栏
  await page.goto(`${BASE}/#/codex/clothes`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.cl-vmajor', { timeout: 20000 })
  await page.waitForTimeout(900)
  await page.evaluate(() => document.querySelectorAll('.cl-vmajor')[1]?.click())
  await page.waitForTimeout(600)
  const codexThumb = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.cl-vminor')].find((x) => x.textContent.includes('2.11'))
    const img = btn?.querySelector('.vn-thumb')
    return img ? img.getAttribute('src') : null
  })
  check('B3 图鉴赛季栏 2.11 有缩略图', /ui\/ver\/card\/2\.11\.webp$/.test(codexThumb ?? ''), codexThumb ?? '缺失')
})

/* ══════════════════════ 3 · 版本徽记起该设定废除 → 反向核对 ══════════════════════ */
console.log('\n【三、版本徽记 —— v1.5.03 起废除，改反向核对】')
await step('徽记', async () => {
  await page.goto(`${BASE}/#/versions`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.vr-minor', { timeout: 20000 })
  await page.waitForTimeout(700)
  await page.evaluate(() => document.querySelectorAll('.vr-major')[1]?.click())
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.vr-minor')].find((x) => x.querySelector('.vn-ver b')?.textContent.trim() === '2.11')
    btn?.scrollIntoView({ block: 'center' })
    btn?.click()
  })
  await page.waitForTimeout(900)

  // 用户 2026-11-03 明确「删除版本页的徽记及其相关内容（这个设定废除）」——
  // 所以这里不再验徽记长什么样，只验「确实一个都不剩」
  const r = await page.evaluate(() => ({
    logo: document.querySelectorAll('.vs-logo').length,
    layers: document.querySelectorAll('.vl-lock, .vl-on').length,
    chip: document.querySelectorAll('.vl-chip, .vl-badge').length,
    verCard: document.querySelectorAll('.vs-card').length,
  }))
  check('C1 版本页没有徽记容器（.vs-logo）', r.logo === 0, `${r.logo} 个`)
  check('C2 版本页没有徽记暗/亮层（.vl-lock / .vl-on）', r.layers === 0, `${r.layers} 个`)
  check('C3 版本页没有徽记底板与状态角标（.vl-chip / .vl-badge）', r.chip === 0, `${r.chip} 个`)
  check('C4 版本大图本体仍在（.vs-card）', r.verCard > 0, `${r.verCard} 个`)

  const man = await page.evaluate(async () => await (await fetch('/assets/manifest.json')).json())
  check('C5 manifest 里也没有版本徽记素材（ui.ver.logos）',
    !('logos' in (man.ui?.ver ?? {})) && !('logoChip' in (man.ui?.ver ?? {})))

  await page.screenshot({ path: `${OUT}/v2603-logo.png` })
})

/* ══════════════════════ 4 · 铭牌文字位置 ══════════════════════ */
console.log('\n【四、铭牌文字右移 20px】')
await step('文字位置', async () => {
  await useVersion('2.10')
  const left = await page.evaluate(() => {
    const el = document.querySelector('.sb-name')
    return el ? getComputedStyle(el).left : null
  })
  // ：徽记已按要求移到「整个版本大图下方」并垫 220×220 底板（旧断言「在版本名下方」作废）
  check('D1 .sb-name left = 64px（v1.4.03 的 54 之后用户又右移 10）', left === '64px', String(left))
})

/* ══════════════════════ 5 · 艺术字垂直居中 ══════════════════════ */
console.log('\n【五、卡池艺术字垂直居中】')
await step('1.7 艺术字', async () => {
  await useVersion('1.7')
  await clickPool('自由的第二章')
  const r = await page.evaluate(async () => {
    const img = document.querySelector('.title-art')
    if (!img) return null
    if (!img.complete) await new Promise((res) => { img.onload = img.onerror = res })
    // 画到 canvas 上量 alpha 实体 bbox，判断素材本身是否居中
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const { data } = g.getImageData(0, 0, c.width, c.height)
    let minY = c.height, maxY = -1
    for (let y = 0; y < c.height; y++) {
      for (let x = 0; x < c.width; x++) {
        if (data[(y * c.width + x) * 4 + 3] > 8) {
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }
    const rect = img.getBoundingClientRect()
    const stage = document.querySelector('.design')?.getBoundingClientRect() ?? { width: 1920, top: 0 }
    const k = stage.width / 1920
    return {
      colorCenter: (minY + maxY) / 2 / c.height, // 0.5 = 素材自身垂直居中
      boxCenter: (rect.top + rect.height / 2 - stage.top) / k,
      gapTop: (rect.top - stage.top) / k - 80, // 距货币栏下划线（≈80）
      gapBottom: 289 - (rect.bottom - stage.top) / k, // 距提示文字（289）
    }
  })
  check('E1 艺术字素材自身垂直居中（实体中心 ≈ 画布中心）',
    !!r && Math.abs(r.colorCenter - 0.5) <= 0.02, r ? `实体中心 ${(r.colorCenter * 100).toFixed(1)}%` : '没有 .title-art')
  check('E2 盒子中心 ≈ 184.5（货币栏下划线 80 与提示文字 289 的中点）',
    !!r && Math.abs(r.boxCenter - 184.5) <= 2, r ? `盒子中心 ${r.boxCenter.toFixed(1)}px` : '—')
  check('E3 上下间距接近（|上 - 下| ≤ 6px）',
    !!r && Math.abs(r.gapTop - r.gapBottom) <= 6,
    r ? `上 ${r.gapTop.toFixed(1)} / 下 ${r.gapBottom.toFixed(1)}` : '—')
  await page.screenshot({ path: `${OUT}/v2603-title17.png` })
})

/* ══════════════════════ 6 · 常驻池排最后 ══════════════════════ */
console.log('\n【六、常驻池永远排最后】')
await step('2.10 + 常驻', async () => {
  await useVersion('2.10')
  const list = await pools()
  check('F1 2.10 列表 = 4 个限定 + 常驻（末尾）',
    list.length === 5 && /遥远之海/.test(list[list.length - 1] ?? ''),
    `${list.length} 项：${list.map((x) => x.split('·')[0].trim()).join(' / ')}`)
  const tag = await page.evaluate(() => {
    const els = [...document.querySelectorAll('.pool-item')]
    const last = els[els.length - 1]
    return last?.querySelector('.pi-tag')?.getAttribute('src') ?? ''
  })
  check('F2 末尾那项挂的是常驻标签', /tag-standard/.test(tag), tag || '取不到 tag')

  await clickPool('遥远之海')
  const big = await page.$eval('.pool-item.big', (e) => e.getAttribute('title') ?? '')
  check('F3 点常驻能真的切过去（不是被 version 夹回限定池）', /遥远之海/.test(big), big)
})

await step('1.0 不重复', async () => {
  await useVersion('1.0')
  const list = await pools()
  const hits = list.filter((x) => /遥远之海/.test(x)).length
  check('F4 1.0 版本不重复列常驻（本来就含）', list.length === 5 && hits === 1, `${list.length} 项 / 常驻出现 ${hits} 次`)
})

await step('2.11 单池 + 常驻', async () => {
  await useVersion('2.11')
  const list = await pools()
  check('F5 2.11 = 雪落颂愿时 + 常驻', list.length === 2 && /雪落颂愿时/.test(list[0]) && /遥远之海/.test(list[1]),
    list.map((x) => x.split('·')[0].trim()).join(' / '))
})

/* ══════════════════════ 7 · 退出目标 ══════════════════════ */
console.log('\n【七、从版本页进来的退出回版本页】')
await step('from=versions', async () => {
  await page.goto(`${BASE}/#/versions`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.vr-minor', { timeout: 20000 })
  await page.waitForTimeout(700)
  await page.evaluate(() => document.querySelectorAll('.vr-major')[1]?.click())
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.vr-minor')].find((x) => x.querySelector('.vn-ver b')?.textContent.trim() === '2.10')
    btn?.scrollIntoView({ block: 'center' })
    btn?.click()
  })
  await page.waitForTimeout(600)
  await page.click('.vr-enter')
  await page.waitForTimeout(1400)
  const toBanner = await page.evaluate(() => location.hash)
  check('G1 进入后带 from=versions', /#\/banner\?from=versions/.test(toBanner), toBanner)

  await page.click('.back-btn')
  await page.waitForTimeout(900)
  check('G2 点退出键回版本页', (await page.evaluate(() => location.hash)) === '#/versions', await page.evaluate(() => location.hash))
})

await step('ESC 也回版本页', async () => {
  await page.goto(`${BASE}/#/versions`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.vr-minor', { timeout: 20000 })
  await page.waitForTimeout(600)
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('.vr-minor')].find((x) => x.querySelector('.vn-ver b')?.textContent.trim() === '2.10')
    btn?.scrollIntoView({ block: 'center' })
    btn?.click()
  })
  await page.waitForTimeout(500)
  await page.click('.vr-enter')
  await page.waitForTimeout(1200)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
  check('G3 ESC 也回版本页', (await page.evaluate(() => location.hash)) === '#/versions', await page.evaluate(() => location.hash))
})

await step('其它入口不变', async () => {
  await page.goto(`${BASE}/#/banner`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pool-item', { timeout: 20000 })
  await page.waitForTimeout(700)
  await page.click('.back-btn')
  await page.waitForTimeout(900)
  const h = await page.evaluate(() => location.hash)
  check('G4 直链 / 侧栏进入的仍回主页', h === '#/' || h === '', h)
})

/* ══════════════════════ 八 · 无报错 */
check('H1 全程无 JS 报错 / 坏请求', pageErrors.length === 0, pageErrors.slice(0, 3).join(' ; '))

const pass = results.filter((r) => r.ok).length
console.log(`\n${pass}/${results.length} PASS${pass === results.length ? '' : '  ← 有失败项'}`)
await browser.close()
process.exit(pass === results.length ? 0 : 1)
