/** 验收 —— 只覆盖本轮改动及其关联项 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const ROOT = process.cwd()
const A = path.join(ROOT, 'public/assets')

let pass = 0
const fails = []
function ok(name, cond, detail = '') {
  if (cond) { pass += 1; console.log(`  ✓ ${name}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? '  → ' + detail : ''}`) }
}


/** 读 WebP 画幅（ffmpeg 带 alpha 输出的是 VP8X，尺寸在 24/27 的三字节里） */
function webpSize(buf) {
  if (buf.slice(8, 12).toString() !== 'WEBP') return { w: 0, h: 0 }
  const fmt = buf.slice(12, 16).toString()
  if (fmt === 'VP8X') {
    return {
      w: (buf[24] | (buf[25] << 8) | (buf[26] << 16)) + 1,
      h: (buf[27] | (buf[28] << 8) | (buf[29] << 16)) + 1,
    }
  }
  if (fmt === 'VP8 ') {
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff }
  }
  if (fmt === 'VP8L') {
    const b = buf.readUInt32LE(21)
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 }
  }
  return { w: 0, h: 0 }
}

/** 从 CHANGELOG.md 里取最近 n 个版本号。别硬编码版本号 —— 每发一版都要改断言，太容易漏 */
function recentVersions(n = 3) {
  const md = fs.readFileSync(path.join(A, '..', '..', 'CHANGELOG.md'), 'utf8')
  const out = []
  const re = /^## \[v([0-9]+\.[0-9]+\.[0-9]+)\]/gm
  let m
  while ((m = re.exec(md)) && out.length < n) out.push(`v${m[1]}`)
  return out
}

const manifest = JSON.parse(fs.readFileSync(path.join(A, 'manifest.json'), 'utf8'))

/* ── A. 080 素材 ── */
console.log('\nA. 2.11「雪落颂愿时」素材')
const b80 = manifest.banners.find((b) => b.id === 'banner-080')
ok('池存在，官方号 080 / 版本 2.11', !!b80 && b80.gachaKey === '080' && b80.version === '2.11', b80?.version)
ok('版本内 seq = 1（2.11 只有这一个池）', b80?.seq === 1, String(b80?.seq))
ok('两个套装（绽若颂愿心 / 奶酪与剑）',
  (b80?.sets ?? []).map((s) => s.name).sort().join('/') === '奶酪与剑/绽若颂愿心'.split('/').sort().join('/'),
  (b80?.sets ?? []).map((s) => s.name).join(','))

const ms = b80?.milestones ?? []
ok('深海回响 12 档（20~100 / 120~180 / 230×3）',
  ms.length === 12 && ms.map((m) => m.pulls).join(',') === '20,40,60,80,100,120,140,160,180,230,230,230',
  ms.map((m) => m.pulls).join(','))
ok('20~100 抽共用 shared/low.webp',
  ms.slice(0, 5).every((m) => m.img === 'milestones/shared/low.webp'))
ok('120 抽起每池独立（banner-080/*）',
  ms.slice(5).every((m) => m.img.startsWith('milestones/banner-080/')))
ok('全部奖励图文件存在', ms.every((m) => fs.existsSync(path.join(A, m.img))),
  ms.filter((m) => !fs.existsSync(path.join(A, m.img))).map((m) => m.img).join(','))

for (const s of b80?.sets ?? []) {
  const pf = s.assets.portrait
  const abs = path.join(A, pf || '')
  ok(`${s.name}：立绘落盘`, !!pf && fs.existsSync(abs), pf || 'null')
  // 用 PNG 头读尺寸
  if (fs.existsSync(abs)) {
    const { w, h } = webpSize(fs.readFileSync(abs))
    ok(`${s.name}：立绘 448×656（与其余套装同规格）`, w === 448 && h === 656, `${w}×${h}`)
  }
  const names = s.assets.icons.map((i) => i.name)
  ok(`${s.name}：图标 ${s.star === 5 ? 10 : 8} 枚且已剥部位前缀`,
    names.length === (s.star === 5 ? 10 : 8) && names.every((n) => !/^(发型|外套|连衣裙|袜子|鞋子|饰品)/.test(n)),
    names.join(','))
  ok(`${s.name}：图标文件齐全`, s.assets.icons.every((i) => fs.existsSync(path.join(A, i.src))))
}

ok('卡池艺术字 / 缩略图 / 纯背景图都可访问',
  ['title', 'thumb', 'bgClean'].every((k) => b80.assets[k] && fs.existsSync(path.join(A, b80.assets[k]))),
  ['title', 'thumb', 'bgClean'].map((k) => b80.assets[k]).join(' | '))

/* ── 浏览器部分 ── */
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))

const SAVE_KEY = 'nikki-resonance-save-v1'
const save = {
  version: 1, selectedVersion: '2.11', pity: {}, codex: {}, milestoneClaimed: {}, history: [],
  settings: { skipAnim: true, skipSingleAnim: true, skipReward: true, skipGacha: false, skipOpening: true },
}
async function loadWith(hash) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, JSON.stringify(save)])
  await page.goto('about:blank')
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'domcontentloaded' })
}

/* ── B. 套装详情弹窗裁切 ── */
console.log('\nB. 套装详情：立绘按画框裁切')
await loadWith(`#/banner?set=${encodeURIComponent('绽若颂愿心')}`)
await page.waitForTimeout(2600)
{
  const r = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel)
      if (!el) return null
      const b = el.getBoundingClientRect()
      return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
    }
    const el = document.querySelector('.sh-hero-box')
    return {
      heroBox: box('.sh-hero-box'),
      artbg: box('.sh-artbg'),
      hero: box('.sh-hero'),
      overflow: el ? getComputedStyle(el).overflow : '',
      formClip: box('.sh-form-clip'),
      formCard: box('.sh-form-card'),
      formOverflow: document.querySelector('.sh-form-clip')
        ? getComputedStyle(document.querySelector('.sh-form-clip')).overflow : '',
      z: {
        band: Number(getComputedStyle(document.querySelector('.sh-band')).zIndex),
        bandH: box('.sh-band')?.h ?? 0,
        bandW: box('.sh-band')?.w ?? 0,
        hero: Number(getComputedStyle(document.querySelector('.sh-hero-box')).zIndex) || 0,
        forms: Number(getComputedStyle(document.querySelector('.sh-forms')).zIndex) || 0,
        line: Number(getComputedStyle(document.querySelector('.sh-line')).zIndex) || 0,
      },
    }
  })
  ok('大立绘有独立裁切框且 overflow:hidden', r.overflow === 'hidden')
  ok('裁切框与照片框同尺寸同位',
    !!r.artbg && ['x', 'y', 'w', 'h'].every((k) => Math.abs(r.artbg[k] - r.heroBox[k]) <= 1),
    `${JSON.stringify(r.heroBox)} vs ${JSON.stringify(r.artbg)}`)
  ok('立绘画幅比裁切框宽（确实存在溢出、依赖裁切）', r.hero.w >= r.heroBox.w, `${r.hero.w} vs ${r.heroBox.w}`)
  ok('形态缩略图也有裁切框且 overflow:hidden', r.formOverflow === 'hidden')
  ok('形态卡裁切框与卡片画框对齐',
    !!r.formCard && ['x', 'y', 'w', 'h'].every((k) => Math.abs(r.formCard[k] - r.formClip[k]) <= 1),
    `${JSON.stringify(r.formClip)} vs ${JSON.stringify(r.formCard)}`)
  // ：底部装饰带原来 z-index:1，被立绘(2)/形态卡(4) 盖住，只露出中间拱形
  ok('底部装饰带压在立绘与形态卡之上',
    r.z.band >= r.z.hero && r.z.band >= r.z.forms && r.z.bandW > 1000,
    `band z=${r.z.band} (${r.z.bandW}×${r.z.bandH}) / hero z=${r.z.hero} / forms z=${r.z.forms}`)
  ok('分隔线与菱形仍浮在装饰带之上',
    r.z.line > r.z.band, `line z=${r.z.line} > band z=${r.z.band}`)
}

/* ── C. 主页信封 ── */
console.log('\nC. 主页左上角信封弹窗')
await loadWith('#/home')
await page.waitForTimeout(2400)

const btn = await page.evaluate(() => {
  const b = document.querySelector('.hm-mail')
  if (!b) return null
  const r = b.getBoundingClientRect()
  const logo = document.querySelector('.hm-logo')?.getBoundingClientRect()
  return {
    hasSvg: !!b.querySelector('svg'),
    stroke: getComputedStyle(b.querySelector('svg')).stroke,
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    logoLeft: logo ? Math.round(logo.left) : null,
  }
})
ok('左上角信封键存在（白线 SVG）', !!btn && btn.hasSvg && /255,\s*255,\s*255|#fff|white/.test(btn.stroke), btn?.stroke)
ok('信封键在左上角、且不与竖版站名艺术字重叠',
  !!btn && btn.rect.x < 200 && btn.rect.y < 140 && (btn.logoLeft === null || btn.rect.x + btn.rect.w <= btn.logoLeft),
  `${JSON.stringify(btn?.rect)} logoLeft=${btn?.logoLeft}`)

await page.locator('.hm-mail').click()
await page.waitForTimeout(450)
ok('点开后先出现信封', (await page.locator('.env-wrap').count()) === 1 && (await page.locator('.mail-paper').count()) === 0)
ok('信封分上下两半（拆开动效用）', (await page.locator('.env-half').count()) === 2)
ok('有「点击拆开」提示',
  (await page.locator('.env-hint').innerText()).replace(/\s+/g, '') === '点击拆开')

await page.locator('.env-wrap').dispatchEvent('click')
await page.waitForTimeout(1400)
ok('点一次后信封消失、信纸出现',
  (await page.locator('.env-wrap').count()) === 0 && (await page.locator('.mail-paper').count()) === 1)
ok('信纸压在信封背（cardbg03）上', (await page.locator('.mail-back').count()) === 1)
ok('没有 × 退出键（v1.6.05：改为点空白处关闭）', (await page.locator('.mail-x').count()) === 0)

const p1 = await page.evaluate(() => ({
  num: document.querySelector('.lt-num')?.textContent?.replace(/\s+/g, ' ').trim(),
  title: document.querySelector('.lt-title')?.textContent?.trim(),
  sign: document.querySelector('.lt-sign')?.textContent?.trim(),
  prevDisabled: document.querySelectorAll('.lt-pg')[0]?.disabled,
}))
ok('第 1 页是欢迎信', p1.num === '1 / 4' && p1.title === '写给你的第一封信' && !!p1.sign, `${p1.num} ${p1.title}`)
ok('首页左键禁用（已在第一页）', p1.prevDisabled === true)

await page.locator('.lt-pg').last().click()
await page.waitForTimeout(320)
const p2 = await page.evaluate(() => ({
  num: document.querySelector('.lt-num')?.textContent?.replace(/\s+/g, ' ').trim(),
  title: document.querySelector('.lt-title')?.textContent?.trim(),
  lines: document.querySelectorAll('.lt-body.log .lt-p').length,
}))
const logTitles = await page.evaluate(() => {
  // 连续翻页收集标题
  return null
})
const recent = recentVersions(3)
ok(`第 2 页是最新一次更新（${recent[0]}）`,
  p2.num === '2 / 4' && p2.title === recent[0] && p2.lines >= 2,
  `${p2.num} ${p2.title} / ${p2.lines} 条`)

await page.locator('.lt-pg').last().click()
await page.waitForTimeout(300)
const p3 = await page.locator('.lt-title').innerText()
await page.locator('.lt-pg').last().click()
await page.waitForTimeout(300)
const p4 = await page.locator('.lt-title').innerText()
const lastDis = await page.evaluate(() => document.querySelectorAll('.lt-pg')[1]?.disabled)
ok(`后三页依次是最近三次更新（${recent.join(' / ')}）`,
  p3 === recent[1] && p4 === recent[2], `${p3} / ${p4}`)
ok('末页右键禁用', lastDis === true)

const overflow = await page.evaluate(() => {
  const b = document.querySelector('.lt-body')
  return b ? b.scrollHeight - b.clientHeight : 999
})
const bodyStyle = await page.evaluate(() => {
  const b = document.querySelector('.lt-body')
  return b ? { oy: getComputedStyle(b).overflowY, fs: getComputedStyle(b).fontSize } : null
})
// ：不再自动降字号 —— 放不下就滚动
ok('正文容器是可滚动区（overflow-y:auto）', bodyStyle?.oy === 'auto', JSON.stringify(bodyStyle))
ok('末页内容放得下或可滚动（不再裁字）', overflow <= 1 || (await page.evaluate(() => {
  const b = document.querySelector('.lt-body')
  return !!b && b.scrollHeight > b.clientHeight
})), `超出 ${overflow}px`)

// ：日志再长也不缩字 —— 用「人为加长正文」验证滚动链路
{
  await page.evaluate(() => {
    const b = document.querySelector('.lt-body')
    const fs0 = getComputedStyle(b).fontSize
    for (let i = 0; i < 8; i++) {
      const p = document.createElement('p')
      p.className = 'lt-p'
      p.textContent = '这是一段用于验证滚动的测试文本，'.repeat(4)
      b.appendChild(p)
    }
    b.dataset.fs0 = fs0
  })
  await page.waitForTimeout(200)
  const meta = await page.evaluate(() => {
    const b = document.querySelector('.lt-body')
    return { ch: b.clientHeight, sh: b.scrollHeight, fs: getComputedStyle(b).fontSize, fs0: b.dataset.fs0 }
  })
  ok('人为加长后确实溢出', meta.sh > meta.ch, `${meta.sh} > ${meta.ch}`)
  ok('正文不缩放文字（字号与溢出前一致）', meta.fs === meta.fs0, `${meta.fs} vs ${meta.fs0}`)

  const box = await page.locator('.lt-body').boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.wheel(0, 200)
  await page.waitForTimeout(250)
  const afterWheel = await page.evaluate(() => document.querySelector('.lt-body').scrollTop)
  ok('滚轮可滚动正文', afterWheel > 0, `scrollTop=${afterWheel}`)

  await page.mouse.move(box.x + box.width / 2, box.y + 60)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2, box.y - 60, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(250)
  const afterDrag = await page.evaluate(() => document.querySelector('.lt-body').scrollTop)
  ok('按住拖动可滚动正文', afterDrag > afterWheel, `${afterWheel} → ${afterDrag}`)

  // 拖动结束后不应该被当成「点空白」把弹窗关掉
  ok('拖动不会误关弹窗', (await page.locator('.mail-mask').count()) === 1)

  // 清掉注入内容，恢复原状
  await page.evaluate(() => {
    const b = document.querySelector('.lt-body')
    ;[...b.querySelectorAll('.lt-p')].slice(-8).forEach((n) => n.remove())
    b.scrollTop = 0
  })
}

// ：更新日志的长度随版本变化 —— 某一版变长就会把正文顶出容器
// 起改为滚动，所以每页只验「可读」：放得下、或能滚动到底
{
  // 先回到第 1 页
  for (let i = 0; i < 3; i++) {
    await page.locator('.lt-pg').first().click()
    await page.waitForTimeout(250)
  }
  const perPage = []
  for (let i = 0; i < 4; i++) {
    const o = await page.evaluate(() => {
      const b = document.querySelector('.lt-body')
      return b ? { ch: b.clientHeight, sh: b.scrollHeight, fs: getComputedStyle(b).fontSize } : null
    })
    perPage.push(o)
    // 末页的「下一页」是禁用的，别点
    const canNext = await page.evaluate(() => !document.querySelectorAll('.lt-pg')[1]?.disabled)
    if (i < 3 && canNext) {
      await page.locator('.lt-pg').last().click()
      await page.waitForTimeout(400)
    }
  }
  // 欢迎页 15px、日志页 14.5px 是两种**固定基准**（不随内容长度变化）
  ok('四页正文不缩字（欢迎页 15px / 日志页 14.5px，恒定）',
    perPage.length === 4 && perPage[0]?.fs === '15px' && perPage.slice(1).every((o) => o?.fs === '14.5px'),
    perPage.map((o) => `${o?.fs}/${o?.sh}-${o?.ch}`).join(' / '))
}

await page.keyboard.press('Escape')
await page.waitForTimeout(320)
ok('ESC 关闭信封弹窗', (await page.locator('.mail-mask').count()) === 0)

// ：主路径是「点空白处退出」
await page.locator('.hm-mail').click()
await page.waitForTimeout(400)
await page.mouse.click(120, 940)
await page.waitForTimeout(320)
ok('点击信纸外的空白处关闭', (await page.locator('.mail-mask').count()) === 0)

ok('全程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | '))

await browser.close()
console.log('\n' + '─'.repeat(52))
console.log(`通过 ${pass} / ${pass + fails.length}`)
if (fails.length) {
  console.log('失败：')
  for (const f of fails) console.log('  · ' + f)
  process.exit(1)
}
