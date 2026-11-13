/**
 * verify-v2302.mjs —— v1.2.02 十九项改动验收
 *
 * 覆盖：
 *   主页   双 LOGO 并存 / 动态背景与切换键 / 右缘系统图标（50% → 100%+放大 10px）
 *   全局   侧边栏（#C39C7A 圆角金边 + 系统图标）/ 二级界面 ESC 返回
 *   版本   1.0 大版本按钮 sticky
 *   共鸣   首末卡池放大不被裁 / 星级 3× / 纯 4★ 概率 / 十连「跳过全部只跳重复」
 *   图鉴   赛季栏下边界 1030 / 未获得容器背景灰
 *   辉煌   清空卡池记忆真正清部件（故事随之回锁）
 *
 * 运行：node tools/verify-v2302.mjs（需 dev server 在 5178）
 */
import { chromium } from 'playwright-core'

const BASE = 'http://localhost:5178'
const KEY = 'nikki-resonance-save-v1'
let pass = 0
let fail = 0
const ok = (name, cond, extra = '') => {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}${extra ? '  · ' + extra : ''}`)
  } else {
    fail++
    console.log(`  ✗ ${name}${extra ? '  · ' + extra : ''}`)
  }
}

const SAVE = {
  version: 1,
  selectedVersion: '2.10',
  pity: {},
  codex: {},
  milestoneClaimed: {},
  history: [],
  settings: {
    skipAnim: false,
    volume: 0.7,
    bgm: true,
    bgmVol: 0.7,
    uiVol: 0.8,
    skipSingleAnim: true,
    skipReward: true,
    skipOpening: true,
    skipGacha: false,
    lucky: false,
  },
}

const b = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
})
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message))
p.on('console', (m) => m.type() === 'error' && errs.push('CONSOLE ' + m.text().slice(0, 120)))

/**
 * 按名字点卡池（v2.5.07）。
 * 卡池列表从硬编码 6 项改成 manifest 全量 80 项后，行号再也不能当身份用 ——
 * 以前 `nth=3` 是「不灭的幽旅」、`nth=1` 是「执律的流金」，现在分别是别的池。
 */
async function clickPool(name) {
  const hit = await p.evaluate((nm) => {
    const el = [...document.querySelectorAll('.pool-item')]
      .find((x) => x.getAttribute('title')?.startsWith(nm))
    if (!el) return false
    el.scrollIntoView({ block: 'center' })
    el.click()
    return true
  }, name)
  if (!hit) throw new Error('找不到卡池：' + name)
}

/** 舞台坐标（1920×1080，已除缩放） */
const box = (sel) =>
  p.evaluate((s) => {
    const st = document.querySelector('.design')?.getBoundingClientRect()
    const e = document.querySelector(s)
    if (!st || !e) return null
    const k = st.width / 1920
    const r = e.getBoundingClientRect()
    return {
      x: Math.round((r.left - st.left) / k),
      y: Math.round((r.top - st.top) / k),
      w: Math.round(r.width / k),
      h: Math.round(r.height / k),
      r: Math.round((r.right - st.left) / k),
      b: Math.round((r.bottom - st.top) / k),
    }
  }, sel)

async function boot(save = SAVE, hash = '/', extra = () => {}) {
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await p.evaluate(
    ([k, v]) => {
      localStorage.clear()
      sessionStorage.clear()
      localStorage.setItem(k, JSON.stringify(v))
      sessionStorage.setItem('nikki-almanac-uid-v1', 'u-2302')
      localStorage.setItem('nikki-almanac-birth-v1', JSON.stringify({ year: 1995, month: 6, day: 15, hour: 9 }))
    },
    [KEY, save],
  )
  await extra()
  await p.goto('about:blank')
  await p.goto(BASE + '/#' + hash, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(1800)
}

/* ══════════════════════ 一、主页 */
console.log('\n【一、主页】')
await boot(SAVE, '/')
await p.waitForTimeout(1200)

const logos = await p.evaluate(() =>
  [...document.querySelectorAll('.hm-logo, .hm-logo-center')].map((e) => {
    const st = document.querySelector('.design').getBoundingClientRect()
    const k = st.width / 1920
    const r = e.getBoundingClientRect()
    return {
      cls: e.className,
      x: Math.round((r.left - st.left) / k),
      y: Math.round((r.top - st.top) / k),
      w: Math.round(r.width / k),
      op: Number(getComputedStyle(e).opacity),
    }
  }),
)
// v1.3.00 起：动态背景**只留**竖版「心忆共鸣」，横版「无限暖暖」只在静态背景出现
ok(
  'R1 动态背景下只有竖版「心忆共鸣」',
  logos.length === 1 && logos[0].cls === 'hm-logo',
  logos.map((l) => `${l.cls}@${l.x},${l.y}`).join(' | '),
)
await p.click('.hm-switch')
await p.waitForTimeout(1200)
const stillLogos = await p.evaluate(() =>
  Array.from(document.querySelectorAll('.hm-logo, .hm-logo-center')).map((e) => {
    const r = e.getBoundingClientRect()
    return { cls: e.className, x: Math.round(r.x), w: Math.round(r.width) }
  }),
)
ok('R1 静态背景下双 LOGO 并存', stillLogos.length === 2, stillLogos.map((l) => l.cls).join(' | '))
const center = stillLogos.find((l) => l.cls.includes('hm-logo-center'))
ok('R1 居中 LOGO 在一级版式原位（730,76 460 宽）', !!center && center.x === 730 && center.w === 460, center && `${center.x},${center.w}`)
await p.click('.hm-switch')
await p.waitForTimeout(900)

ok('R2 动态背景默认播放', await p.evaluate(() => !!document.querySelector('.hm-bg-video')))
const sw = await box('.hm-switch')
ok('R2 切换键在左下角（24,996 52×52）', !!sw && sw.x === 24 && sw.y === 996 && sw.w === 52, sw && `${sw.x},${sw.y}`)

const dyn = await p.evaluate(() =>
  [...document.querySelectorAll('.dy-btn')].map((e) => {
    const st = document.querySelector('.design').getBoundingClientRect()
    const k = st.width / 1920
    const r = e.getBoundingClientRect()
    return { x: Math.round((r.left - st.left) / k), y: Math.round((r.top - st.top) / k), w: Math.round(r.width / k), op: getComputedStyle(e).opacity }
  }),
)
ok('R3 动态背景右缘竖排 5 个系统图标', dyn.length === 5 && dyn.every((d) => d.x === 1820 && d.w === 76), dyn.map((d) => d.y).join(','))
ok('R3 图标常态不透明度 50%', dyn.every((d) => d.op === '0.5'), dyn.map((d) => d.op).join(','))
const midY = dyn.reduce((n, d) => n + d.y + 38, 0) / dyn.length
ok('R3 竖排垂直居中（中心≈540）', Math.abs(midY - 540) <= 6, `中心 ${Math.round(midY)}`)

await p.hover('.dy-btn >> nth=2')
await p.waitForTimeout(420)
const hov = await p.evaluate(() => {
  const e = document.querySelectorAll('.dy-btn')[2]
  const cs = getComputedStyle(e)
  const m = cs.transform.match(/matrix\(([^)]+)\)/)
  const sc = m ? Number(m[1].split(',')[0]) : 1
  return { op: cs.opacity, sc: Number(sc.toFixed(3)), others: [...document.querySelectorAll('.dy-btn')].filter((x, i) => i !== 2).map((x) => getComputedStyle(x).opacity) }
})
ok('R3 悬停 100% 且放大 10px（76 → 86）', hov.op === '1' && Math.abs(hov.sc - 86 / 76) < 0.01, `op ${hov.op} scale ${hov.sc}`)
ok('R3 其余图标保持 50%', hov.others.every((o) => o === '0.5'))

await p.click('.hm-switch')
await p.waitForTimeout(900)
const still = await p.evaluate(() => ({
  video: !!document.querySelector('.hm-bg-video'),
  img: !!document.querySelector('.hm-bg-img'),
  stars: [...document.querySelectorAll('.hm-nav')].map((e) => getComputedStyle(e).display),
  dyn: !!document.querySelector('.hm-dyn'),
}))
ok('R2 切静态背景：视频卸载、底图接管、星芒入口出现', !still.video && still.img && still.stars.every((d) => d === 'block') && !still.dyn, JSON.stringify(still))

await p.click('.hm-switch')
await p.waitForTimeout(700)
ok('R2 再切回动态背景', await p.evaluate(() => !!document.querySelector('.hm-bg-video')))

/* ══════════════════════ 二、侧边栏 + ESC */
console.log('\n【二、侧边栏 / 二级界面 ESC】')
await boot(SAVE, '/banner')
const rail = await p.evaluate(() => {
  const el = document.querySelector('.rail')
  const cs = getComputedStyle(el, '::before')
  return { bg: cs.backgroundColor, radius: cs.borderRadius, border: cs.borderWidth, imgs: document.querySelectorAll('.rb-ico img').length }
})
ok('R5 侧边栏底色 #C39C7A', rail.bg === 'rgb(195, 156, 122)', rail.bg)
ok(
  'R5 侧边栏圆角 + 金边',
  /(1[48])px\s+1[48]px\s+0/.test(rail.radius) || /0px (1[48])px (1[48])px 0px/.test(rail.radius),
  `${rail.radius} / ${rail.border}`,
)
ok('R5 侧边栏图标用系统素材（6 枚）', rail.imgs === 6, String(rail.imgs))

const escTargets = [
  ['/versions', '版本'],
  ['/banner', '共鸣'],
  ['/almanac', '玄学运势'],
  ['/codex', '博物图鉴'],
  ['/settings', '辉煌心光'],
]
for (const [route, label] of escTargets) {
  await p.goto('about:blank')
  await p.goto(BASE + '/#' + route, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(1500)
  await p.keyboard.press('Escape')
  await p.waitForTimeout(600)
  const h = await p.evaluate(() => location.hash)
  ok(`R4 ${label}页 ESC 返回上一级`, h === '#/' || h === '', h)
}

/* ══════════════════════ 三、版本页 sticky */
console.log('\n【三、版本页】')
await boot(SAVE, '/versions')
const vTop0 = await box('.vr-major')
// v1.4.02：版本页会记住「当前版本」并展开它所在的大版本（存档里是 2.10 → 展的是伊赞之土），
// 这条测的是 1.0 那颗按钮的 sticky，所以先把它那一组展开回来
await p.evaluate(() => document.querySelectorAll('.vr-major')[0]?.click())
await p.waitForTimeout(500)
await p.evaluate(() => {
  document.querySelector('.vr-rail').scrollTop = 520
})
await p.waitForTimeout(320)
const vTop1 = await box('.vr-major')
const vRail = await box('.vr-rail')
ok('R6 1.0 大版本按钮滚动时不跟着走（sticky）', !!vTop0 && !!vTop1 && Math.abs(vTop1.y - vRail.y) <= 1, `rail ${vRail.y} / 按钮 ${vTop0.y} → ${vTop1.y}`)

/* ══════════════════════ 四、共鸣页 */
console.log('\n【四、共鸣页】')
await boot(SAVE, '/banner')
await p.evaluate(() => document.querySelector('video')?.pause())

const poolGeo = () =>
  p.evaluate(() => {
    const st = document.querySelector('.design').getBoundingClientRect()
    const k = st.width / 1920
    const g = (e) => {
      if (!e) return null
      const r = e.getBoundingClientRect()
      return {
        x: Math.round((r.left - st.left) / k),
        y: Math.round((r.top - st.top) / k),
        r: Math.round((r.right - st.left) / k),
        b: Math.round((r.bottom - st.top) / k),
      }
    }
    const big = document.querySelector('.pool-item.big')
    return { list: g(document.querySelector('.pool-list')), big: g(big), frame: big ? g(big.querySelector('.pi-frame')) : null }
  })

await p.click('.pool-item >> nth=0')
await p.waitForTimeout(400)
const first = await poolGeo()
ok(
  'R7 首卡池选中放大后金框完整在列表内',
  !!first.frame && first.frame.x >= first.list.x && first.frame.r <= first.list.r && first.frame.y >= first.list.y && first.frame.b <= first.list.b,
  `frame ${first.frame?.x},${first.frame?.y}-${first.frame?.r},${first.frame?.b} / list ${first.list.x}..${first.list.r}`,
)
await p.evaluate(() => {
  const l = document.querySelector('.pool-list')
  l.scrollTop = l.scrollHeight
})
await p.waitForTimeout(320)
const n = await p.$$eval('.pool-item', (els) => els.length)
await p.click(`.pool-item >> nth=${n - 1}`)
await p.waitForTimeout(420)
const last = await poolGeo()
ok(
  'R7 末卡池选中放大后金框完整在列表内',
  !!last.frame && last.frame.x >= last.list.x && last.frame.r <= last.list.r && last.frame.b <= last.list.b,
  `frame ${last.frame?.x}..${last.frame?.r} / list ${last.list.x}..${last.list.r}`,
)

const starW = await p.evaluate(() => {
  const i = document.querySelector('.sb-stars img')
  return i ? Number(i.getBoundingClientRect().width.toFixed(1)) : 0
})
// v1.3.00：54 → 32.4（缩回 3/5），名称牌同步放大到 300×86
ok('R8 套装星级图标 32.4px / 间距 −3px', Math.abs(starW - 32.4) < 0.1, starW + 'px')

/* 纯 4★ 池：不灭的幽旅（按名字点，别用行号） */
await clickPool('不灭的幽旅')
await p.waitForTimeout(500)
const pureTxt = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.pp-table tbody tr')].map((tr) =>
    [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()).join('|'),
  )
  return { rows, note: document.querySelector('.pp-note')?.textContent?.trim() ?? '', has5: !!document.querySelector('.pp-table .r5') }
})
await p.click('.detail-btn')
await p.waitForTimeout(450)
const purePanel = await p.evaluate(() => {
  const rows = [...document.querySelectorAll('.pp-table tbody tr')].map((tr) =>
    [...tr.querySelectorAll('td')].map((td) => td.textContent.trim()).join('|'),
  )
  return {
    rows,
    note: document.querySelector('.pp-note')?.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    has5: !!document.querySelector('.pp-table .r5'),
  }
})
const r4 = purePanel.rows.find((x) => x.startsWith('4★')) ?? ''
ok('R9 纯 4★ 池：4★ 基础 10.21% / 综合 24.96%',
  r4.includes('10.21%') && r4.includes('24.96%'), r4)
ok('R9 纯 4★ 池：不显示 5★ 行、文案为「每 5 抽必出」', !purePanel.has5 && /每 5 抽必出/.test(purePanel.note), purePanel.note.slice(0, 40))
await p.keyboard.press('Escape')
await p.waitForTimeout(300)

/* 主池仍是老三档 */
await clickPool('执律的流金')
await p.waitForTimeout(500)
await p.click('.detail-btn')
await p.waitForTimeout(450)
const mainPanel = await p.evaluate(() => ({
  has5: !!document.querySelector('.pp-table .r5'),
  r4: [...document.querySelectorAll('.pp-table tbody tr')].map((t) => t.textContent.replace(/\s+/g, '')).find((x) => x.startsWith('4★')) ?? '',
}))
ok('R9 主池概率（5★ 行仍在、4★ 3.68/11.59）',
  mainPanel.has5 && mainPanel.r4.includes('3.68%') && /11\.(59|60)%/.test(mainPanel.r4),
  mainPanel.r4)
await p.keyboard.press('Escape')
await p.waitForTimeout(300)

/* ══════════════════════ 五、十连「跳过全部」只跳重复 */
console.log('\n【五、十连跳过】')
await boot(SAVE, '/banner')
await p.click('.pull-btn.ten')
// 等揭示序列出现（全部新部件）
let inDetail = false
for (let i = 0; i < 160 && !inDetail; i++) {
  await p.waitForTimeout(120)
  inDetail = await p.evaluate(() => window.__gachaDbg?.phase === 'detail')
}
ok('R10 十连进入逐件揭示（首个新部件详情页）', inDetail, await p.evaluate(() => window.__gachaDbg?.phase))
// 跳过入场锁定后按「跳过全部」：仍应停在新部件详情页（不能直接进网格）
await p.waitForTimeout(1700)
await p.keyboard.press('Escape')
await p.waitForTimeout(500)
const afterSkip = await p.evaluate(() => ({ phase: window.__gachaDbg?.phase, ids: window.__gachaDbg?.resultIds ?? [] }))
const newCount = afterSkip.ids.filter((x) => x.endsWith('|N')).length
ok(
  'R10 新部件未播完时「跳过全部」不会跳过（停在新部件详情）',
  afterSkip.phase === 'detail' || newCount === 1,
  `phase ${afterSkip.phase} · 新件 ${newCount}/10`,
)

/* ══════════════════════ 六、图鉴 */
console.log('\n【六、图鉴】')
await boot(SAVE, '/codex/clothes')
const vers = await box('.cl-vers')
ok('R11 赛季栏下边界到屏幕底部 50px（y=1030）', !!vers && Math.abs(vers.b - 1030) <= 1, vers && `bottom ${vers.b}`)
const lockedBg = await p.evaluate(() => {
  const e = document.querySelector('.cl-show.locked .sh-bg')
  return e ? getComputedStyle(e).filter : ''
})
ok('R12 未获得套装的容器背景为灰色', /grayscale\(1\)/.test(lockedBg), lockedBg)

/* ══════════════════════ 七、辉煌心光：清空记忆真的清部件 */
console.log('\n【七、辉煌心光存档清理】')
await boot(SAVE, '/settings')
// 先集齐全部套装
await p.click('.gl-hot >> nth=2')
await p.waitForTimeout(400)
await p.click('.gm-row >> nth=0 >> .gm-btn')
await p.waitForTimeout(2600)
const before = await p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('nikki-resonance-save-v1')).codex).length)
// 关掉「快捷」面板，再开「存档」→ 按**行标题**找「当前服装阁记忆」
// （v1.6.08 存档面板顶部多了「存档备份」一行，行下标不再固定）
await p.keyboard.press('Escape')
await p.waitForTimeout(320)
await p.click('.gl-hot >> nth=3')
await p.waitForTimeout(420)
await p.evaluateHandle(() => {
  const row = [...document.querySelectorAll('.gm-row')].find((r) =>
    r.querySelector('.gr-txt b')?.textContent?.trim() === '当前服装阁记忆')
  row?.querySelector('.gm-btn')?.click()
})
await p.waitForTimeout(300)
await p.click('.cf-btn.ok')
await p.waitForTimeout(900)
const afterClear = await p.evaluate(() => {
  const c = JSON.parse(localStorage.getItem('nikki-resonance-save-v1')).codex
  return { total: Object.keys(c).length, toast: document.querySelector('.gl-toast')?.textContent ?? '' }
})
ok('R13 清空当前卡池记忆会删掉该池套装部件', afterClear.total < before, `${before} → ${afterClear.total} · ${afterClear.toast}`)
ok('R13 提示里写明回收部件数', /回收\s*\d+\s*件/.test(afterClear.toast), afterClear.toast)

// 该池套装对应的故事应回到上锁
const lockedStory = await (async () => {
  await p.goto('about:blank')
  await p.goto(BASE + '/#/codex/stories', { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(1500)
  // 被清的池（执律的流金 / 2.10 金羽的裁决）属于伊赞之土，必须切到该区域再数。
  // ⚠ 按**文本**定位，不要写死下标：v1.7.00 在顶部加了「奇迹传说」栏之后，
  //   原来的 nth=1 从「伊赞之土」变成了「心愿原野」，断言会静默失效。
  await p.getByText('伊赞之土', { exact: true }).first().click()
  await p.waitForTimeout(700)
  return p.evaluate(() => document.querySelectorAll('.rd-lock, .rd-item.locked').length)
})()
ok('R14 清空后对应故事回到上锁状态', lockedStory > 0, `上锁 ${lockedStory} 条`)

await p.screenshot({ path: '.shots/v2302-check.png' })
ok('无页面报错', errs.length === 0, errs.slice(0, 3).join(' | '))

await b.close()
console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
