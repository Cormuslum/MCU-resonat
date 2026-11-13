/**
 * 阅读物图鉴 pxdesk 坐标一致性校验：`图片工程-{心愿原野,伊赞之土}.pxdesk` → `tools/gen-readings-layout.py` → `src/data/readings-layout.ts`。
 * 断言每个素材层渲染 bbox 与 `RD_LAYOUT` 声明一致（±2px），另含层序 / 区域专属装饰 / 标签旋转 / 正文两步加载 / 区域瞬切 / menu 不遮挡选项卡。
 */
import { chromium } from 'playwright-core'

/* ⚠ 现状口径：本脚本是「博物图鉴重构」之前的旧巡检，
 * 断言的入口（`.mz-hit` / `.rd-collect` 等）在重构后已不存在，跑起来只会报超时。
 * 现行验收统一看 tools/verify-readings.mjs（按《博物图鉴重构计划书.md》§8 M3）。
 * 文件保留仅作历史参考，不再执行。 */
console.log('[已并入 verify-readings.mjs] 本脚本为重构前的旧巡检，不再执行。')
process.exit(0)


const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const TOL = 2

const pass = []
const fail = []
const ok = (c, m) => (c ? pass.push(m) : fail.push(m))

const b = await chromium.launch({ executablePath: CHROME, headless: true })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()) })

  // 现状口径：主页自 .x 起循环播 bg-video.webm + bg-audio.ogg，
  // 网络永远不会「空闲」→ waitUntil 必须用 domcontentloaded，不能用 networkidle
await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
await p.evaluate(() => localStorage.removeItem('nikki-resonance-save-v1'))
await p.goto(BASE + '/#/codex/readings', { waitUntil: 'domcontentloaded' })
await p.waitForSelector('.readings', { timeout: 20000 })
await p.waitForTimeout(600)

// 读取组件内的 RD_LAYOUT（模块已打包，直接从 DOM 反推 + 与预期表比对）
const EXPECT = {
  wish: {
    bg: { x: -334, y: -165, w: 2566, h: 1425 },
    reel: { x: 91, y: 115, w: 1934, h: 904 },
    paper: { x: 212, y: 165, w: 1507, h: 774 },
    tabpanel: { x: 228, y: 97, w: 481, h: 889 },
    magnifier: { x: -152, y: 455, w: 421, h: 722 },
    papercranes: { x: 1334, y: -151, w: 511, h: 414 },
  },
  yizan: {
    bg: { x: -194, y: -54, w: 2304, h: 1308 },
    maple: { x: 1363, y: 0, w: 472, h: 418 },
    reel: { x: 79, y: 41, w: 2010, h: 996 },
    lace: { x: 23, y: 689, w: 1120, h: 543 },
    paper: { x: 212, y: 164, w: 1530, h: 782 },
    tabpanel: { x: 231, y: 101, w: 475, h: 902 },
    magnifier: { x: -143, y: 437, w: 435, h: 749 },
    spiral: { x: 1833, y: 989, w: 87, h: 80 },
  },
}

/** 按 DOM 顺序取「素材层」的 bbox（.rd-bg/.rd-layer/.rd-dec/.rd-mag/.rd-key） */
async function layers() {
  return p.evaluate(() => {
    const sel = '.rd-bg, .rd-layer, .rd-dec, .rd-mag, .rd-key, .rd-egg'
    return [...document.querySelectorAll(sel)].map((e) => {
      const r = e.getBoundingClientRect()
      return {
        cls: e.className,
        src: (e.querySelector('img') || e).getAttribute?.('src') || '',
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
      }
    })
  })
}

function near(a, bb) {
  return Math.abs(a - bb) <= TOL
}

/** 用 src 文件名识别层 */
function pick(list, kw) {
  return list.find((l) => l.src.includes(kw))
}

const wish = await layers()
console.log('— 心愿原野层数:', wish.length, '—')
for (const [name, exp] of Object.entries(EXPECT.wish)) {
  const kw = {
    bg: 'bg-wish',
    reel: 'reel-wish',
    paper: 'paper-wish',
    tabpanel: 'tab-wish',
    magnifier: 'magnifier-wish',
    papercranes: 'papercranes',
  }[name]
  const l = pick(wish, kw)
  if (!l) {
    fail.push(`[wish] 缺少层 ${name}（src~${kw}）`)
    continue
  }
  const good = near(l.x, exp.x) && near(l.y, exp.y) && near(l.w, exp.w) && near(l.h, exp.h)
  ok(good, `[wish] ${name} = (${l.x},${l.y}) ${l.w}×${l.h} — 期望 (${exp.x},${exp.y}) ${exp.w}×${exp.h}`)
}
ok(!pick(wish, 'maple'), '[wish] 不应有枫叶')
ok(!pick(wish, 'lace'), '[wish] 不应有蕾丝')
ok(!pick(wish, 'spiral'), '[wish] 不应有螺旋')

// 标签旋转
const labelRot = await p.$eval('.rd-label', (e) => getComputedStyle(e).transform).catch(() => '')
ok(labelRot.includes('matrix'), '[wish] 标签头有旋转矩阵（-3.33°）')
ok(Math.abs(await p.$eval('.rd-label', (e) => {
  const m = getComputedStyle(e).transform.match(/matrix\(([^)]+)\)/)
  if (!m) return 0
  const v = m[1].split(',').map(Number)
  return (Math.atan2(v[1], v[0]) * 180) / Math.PI
}) - -3.33) < 0.2, '[wish] 标签旋转角 = -3.33°')

// 层序：paper 必须在 reel 之后、tabpanel 之前
const idxOf = (kw) => wish.findIndex((l) => l.src.includes(kw))
ok(idxOf('reel-wish') < idxOf('paper-wish'), '[wish] 层序 reel < paper')
ok(idxOf('paper-wish') < idxOf('tab-wish'), '[wish] 层序 paper < tabpanel')
ok(idxOf('magnifier-wish') > idxOf('tab-wish'), '[wish] 层序 tabpanel < 放大镜')
ok(idxOf('papercranes') > idxOf('magnifier-wish'), '[wish] 层序 放大镜 < 纸鹤')

// 列表几何
const listGeo = await p.evaluate(() => {
  const l = document.querySelector('.rd-list').getBoundingClientRect()
  const r = document.querySelector('.rd-row').getBoundingClientRect()
  return { lx: Math.round(l.x), ly: Math.round(l.y), lw: Math.round(l.width), rh: Math.round(r.height) }
})
ok(near(listGeo.lx, 243) && near(listGeo.ly, 189), `[wish] 列表原点 (${listGeo.lx},${listGeo.ly}) ≈ (243,189)`)
ok(near(listGeo.lw, 410), `[wish] 列表宽 ${listGeo.lw} ≈ 410`)
ok(near(listGeo.rh, 72), `[wish] 行高 ${listGeo.rh} ≈ 71.5`)

// ：右上角 menu 已移除（与返回键功能重合）；选项卡容器改为 common_img_menu_s，仅高亮时出现
const menuGone = await p.evaluate(() => !document.querySelector('.rd-menu'))
ok(menuGone, '[wish] 右上角 menu 已移除（与返回键重合）')

const tabCfg = await p.evaluate(() => {
  const tabs = [...document.querySelectorAll('.rd-tab')]
  return tabs.map((t) => {
    const hi = t.querySelector('.tb-hi')
    return {
      src: hi?.getAttribute('src') || '',
      hasBg: !!t.querySelector('.tb-bg'),
      on: t.classList.contains('on'),
      opacity: hi ? getComputedStyle(hi).opacity : null,
    }
  })
})
ok(tabCfg.every((t) => t.src.includes('btn-menu')), '[wish] 选项卡容器用 common_img_menu_s（btn-menu）')
ok(tabCfg.every((t) => !t.hasBg), '[wish] 选项卡无常态底色层（tabSelN 已移除）')
ok(tabCfg.filter((t) => t.on).every((t) => parseFloat(t.opacity) === 1), '[wish] 选中态高亮容器显示')
ok(tabCfg.filter((t) => !t.on).every((t) => parseFloat(t.opacity) === 0), '[wish] 未选中态高亮容器不显示')

// 正文两步加载：点选后立即有标题、正文 opacity 0 → 300ms 后 1
await p.click('.rd-row')
await p.waitForTimeout(80)
await p.click('.rd-row')
await p.waitForTimeout(90)
const t0 = await p.$eval('.rd-ctitle', (e) => e.textContent.trim()).catch(() => null)
const body0 = await p.$eval('.rd-cbody', (e) => getComputedStyle(e).opacity).catch(() => null)
await p.waitForTimeout(420)
const body1 = await p.$eval('.rd-cbody', (e) => getComputedStyle(e).opacity).catch(() => null)
ok(t0 !== null, `[正文] 标题立即显示（"${t0}"）`)
ok(body0 !== null && parseFloat(body0) < 0.6, `[正文] 90ms 时正文未完全显示（opacity=${body0}）`)
ok(body1 !== null && parseFloat(body1) > 0.95, `[正文] 510ms 时正文已显示（opacity=${body1}）`)

// 区域切换瞬切：transition 不含 opacity/transform 长时长
const tabTrans = await p.$eval('.rd-tab', (e) => getComputedStyle(e).transition)
ok(!/opacity\s+0?\.[2-9]/.test(tabTrans), `[切换] 选项卡无慢过渡（transition="${tabTrans}"）`)

// 伊赞之土
await p.locator('.rd-tab').nth(1).click()
await p.waitForTimeout(600)
const yizan = await layers()
console.log('— 伊赞之土层数:', yizan.length, '—')
for (const [name, exp] of Object.entries(EXPECT.yizan)) {
  const kw = {
    bg: 'bg-yizan',
    maple: 'maple',
    reel: 'reel-yizan',
    lace: 'lace',
    paper: 'paper-yizan',
    tabpanel: 'tab-yizan',
    magnifier: 'magnifier-yizan',
    spiral: 'spiral',
  }[name]
  const l = pick(yizan, kw)
  if (!l) {
    fail.push(`[yizan] 缺少层 ${name}（src~${kw}）`)
    continue
  }
  const good = near(l.x, exp.x) && near(l.y, exp.y) && near(l.w, exp.w) && near(l.h, exp.h)
  ok(good, `[yizan] ${name} = (${l.x},${l.y}) ${l.w}×${l.h} — 期望 (${exp.x},${exp.y}) ${exp.w}×${exp.h}`)
}
ok(!pick(yizan, 'papercranes'), '[yizan] 不应有千纸鹤')

// 伊赞层序：枫叶 < reel < 蕾丝 < paper
const yi = (kw) => yizan.findIndex((l) => l.src.includes(kw))
ok(yi('maple') < yi('reel-yizan'), '[yizan] 层序 枫叶 < reel')
ok(yi('reel-yizan') < yi('lace'), '[yizan] 层序 reel < 蕾丝')
ok(yi('lace') < yi('paper-yizan'), '[yizan] 层序 蕾丝 < paper')

// 空态
const emptyOp = await p.$eval('.rd-empty-sticker', (e) => getComputedStyle(e).opacity).catch(() => null)
const emptyTxt = await p.$eval('.rd-empty-txt', (e) => e.textContent.trim()).catch(() => null)
ok(emptyOp !== null && Math.abs(parseFloat(emptyOp) - 0.15) < 0.02, `[空态] 贴纸 opacity=${emptyOp} ≈ 0.13`)
ok(emptyTxt === '暂未获得阅读物，快去世界探索吧~', `[空态] 提示文字 = "${emptyTxt}"`)

// 彩蛋 opacity
// ：彩蛋仅在「已获取的阅读物」展示时出现；空态隐藏
const eggEmpty = await p.$('.rd-egg')
ok(eggEmpty === null, '[彩蛋] 空态不显示（未获取阅读物）')
await p.click('.rd-row')
await p.waitForTimeout(80)
await p.click('.rd-row')
await p.waitForTimeout(600)
const eggBox = await p.evaluate(() => {
  const e = document.querySelector('.rd-egg')
  if (!e) return null
  const r = e.getBoundingClientRect()
  return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), op: getComputedStyle(e).opacity }
})
ok(eggBox !== null, '[彩蛋] 选中已获取阅读物后显示')
// 此时已切到伊赞之土，用伊赞的 pxdesk 彩蛋坐标 (1395,618)
ok(eggBox && near(eggBox.x, 1395) && near(eggBox.y, 618) && near(eggBox.w, 329), `[彩蛋] 位置 (${eggBox?.x},${eggBox?.y}) ${eggBox?.w}×${eggBox?.h} ≈ pxdesk (1395,618) 329×329`)
ok(eggBox && Math.abs(parseFloat(eggBox.op) - 0.25) < 0.02, `[彩蛋] opacity=${eggBox?.op} ≈ 0.25`)

console.log('\n==== 结果 ====')
pass.forEach((m) => console.log('PASS  ' + m))
if (fail.length) fail.forEach((m) => console.log('FAIL  ' + m))
console.log(`\n通过 ${pass.length} / ${pass.length + fail.length}`)
console.log('errors =', errs)
await b.close()
process.exit(fail.length ? 1 : 0)
