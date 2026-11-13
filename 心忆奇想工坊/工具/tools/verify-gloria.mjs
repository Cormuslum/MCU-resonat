/**
 * 「辉煌心光」设置页验收：`npm run dev` 后 `node tools/verify-gloria.mjs`。
 * 覆盖 R1 背景视频 / R2 退出键 / R3 四个交互区 / R4 弹窗版式 / R5 关闭键 / R6 音量 / R7 演出开关 / R8 快捷 /
 * R9 存档清理 / R10 存档统计 / R11 二级确认 / R12 左上标题 / R13 主界面彩蛋。
 */
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const S = '.shots'
const KEY = 'nikki-resonance-save-v1'

let pass = 0
let fail = 0
const rows = []
function ok(name, cond, extra = '') {
  if (cond) {
    pass++
    rows.push(`  ✓ ${name}${extra ? '  ' + extra : ''}`)
  } else {
    fail++
    rows.push(`  ✗ ${name}${extra ? '  ' + extra : ''}`)
  }
}

const b = await chromium.launch({ executablePath: CHROME, headless: true })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
p.on('pageerror', (e) => errs.push(e.message))
p.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('bgm.ogg')) errs.push('console: ' + m.text())
})

const SAVE = {
  version: 1,
  selectedVersion: '2.10',
  // 现状口径：卡池主键 = 官方 gachaKey
  //   banner-076 = 2.10 执律的流金（当前版本 2.10 的第一池 = 当前卡池）
  //   banner-003 = 1.0 留于花间的浮想（别的版本，用来验「只清当前版本」）
  // 旧写法 banner-2.10-02 / banner-1.0-03 只剩 legacyId，迁移路径由 verify-v2702 覆盖。
  pity: {
    'banner-076': { p5: 3, p4: 2, total: 12 },
    'banner-003': { p5: 0, p4: 0, total: 5 },
  },
  codex: { 'x:测试件': { count: 1, firstAt: 1 }, 'reading:read_L_book_010100001': { count: 1, firstAt: 1 } },
  milestoneClaimed: {},
  history: [{ banner: 'banner-076', rarity: 3, part: 'x:测试件', at: 1 }],
  settings: {
    skipAnim: false,
    volume: 0.7,
    bgm: true,
    bgmVol: 0.7,
    uiVol: 0.8,
    skipSingleAnim: false,
    skipReward: false,
    skipOpening: true,
    skipGacha: false,
    lucky: false,
  },
}

async function boot(save = SAVE) {
  // 先落一份干净存档，再**整页重载**进设置页：
  // 只改 hash 属于同文档跳转，路由首次导航可能把地址覆盖回 #/
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await p.evaluate(
    ([k, v]) => {
      localStorage.clear()
      localStorage.setItem(k, JSON.stringify(v))
      localStorage.setItem('nikki-almanac-uid-v1', 'u-gloria')
    },
    [KEY, save],
  )
  await p.goto('about:blank')
  await p.goto(BASE + '/#/settings', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1400)
}

const readSave = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? '{}'), KEY)

await boot()

/* ── R1 背景视频 ── */
const vid = await p.evaluate(() => {
  const v = document.querySelector('.gl-bg')
  return v
    ? {
        w: v.videoWidth,
        h: v.videoHeight,
        paused: v.paused,
        loop: v.loop,
        muted: v.muted,
        poster: v.getAttribute('poster') ?? '',
        src: v.currentSrc.split('/').pop(),
      }
    : null
})
ok('R1 背景视频 1920×1080 且正在播放', vid?.w === 1920 && vid?.h === 1080 && !vid?.paused, JSON.stringify(vid))
ok('R1 视频循环 / 静音 / 有海报帧', vid?.loop && vid?.muted && vid?.poster.includes('poster.webp'), vid?.src)

/* ── R2 返回键 ── */
const backN = await p.getAttribute('.gl-back', 'src')
await p.hover('.gl-back')
await p.waitForTimeout(200)
const backH = await p.getAttribute('.gl-back', 'src')
ok('R2 返回键常态/悬停换图', backN.includes('back-n') && backH.includes('back-h'), `${backN.split('/').pop()} → ${backH.split('/').pop()}`)
await p.mouse.move(5, 5)

/* ── R3 四个交互区（全画布叠图 + 透明热区） ── */
const stageBox = () =>
  p.evaluate(() => {
    const st = document.querySelector('.design').getBoundingClientRect()
    const k = st.width / 1920
    const f = (r) => [
      Math.round((r.left - st.left) / k),
      Math.round((r.top - st.top) / k),
      Math.round(r.width / k),
      Math.round(r.height / k),
    ]
    return {
      hots: [...document.querySelectorAll('.gl-hot')].map((e) => ({ label: e.getAttribute('aria-label') ?? '', box: f(e.getBoundingClientRect()) })),
      ics: [...document.querySelectorAll('.gl-ic')].map((e) => ({
        src: (e.getAttribute('src') ?? '').split('/').pop(),
        nw: e.naturalWidth,
        nh: e.naturalHeight,
        box: f(e.getBoundingClientRect()),
        op: getComputedStyle(e).opacity,
      })),
      head: document.querySelector('.gl-head')?.textContent?.replace(/\s+/g, '') ?? '',
      h1: !!document.querySelector('.gl-head h1'),
    }
  })

const r3 = await stageBox()
ok('R3 四个交互热区齐全（演出/音量/快捷/存档）', r3.hots.map((h) => h.label).join() === '演出,音量,快捷,存档', r3.hots.map((h) => h.label).join('/'))
ok('R3 叠加图不裁剪：整张 1920×1080 铺满', r3.ics.length === 4 && r3.ics.every((i) => i.nw === 1920 && i.nh === 1080 && i.box.join() === '0,0,1920,1080'), r3.ics.map((i) => `${i.nw}×${i.nh}`).join(' '))
ok('R3 图标素材全部加载（ic-*.webp）', r3.ics.every((i) => /^ic-/.test(i.src)), r3.ics.map((i) => i.src).join(','))
ok('R3 图标常态不可见', r3.ics.every((i) => i.op === '0'), r3.ics.map((i) => i.op).join(','))

await p.hover('.gl-hot >> nth=1')
await p.waitForTimeout(280)
const opHover = await p.evaluate(() => [...document.querySelectorAll('.gl-ic')].map((e) => getComputedStyle(e).opacity))
ok('R3 悬停时只有对应图标显形', opHover[1] === '1' && opHover.filter((o) => o === '1').length === 1, opHover.join(','))
await p.mouse.move(300, 980)
await p.waitForTimeout(240)
ok('R3 移开后图标重新隐藏', (await p.evaluate(() => [...document.querySelectorAll('.gl-ic')].every((e) => getComputedStyle(e).opacity === '0'))))

/* R12 左上角只剩 Settings·设置 一行 */
ok('R12 左上角已去掉「辉煌心光」四字', !r3.h1 && /Settings·设置/i.test(r3.head), r3.head)

/* ── R4 弹窗几何 / 共用容器 ── */
const shapes = []
for (const [i, name] of ['演出', '音量', '快捷', '存档'].entries()) {
  await p.click(`.gl-hot >> nth=${i}`)
  await p.waitForTimeout(520) // 弹窗 pop 动画 220ms，等落定再量
  const info = await p.evaluate(() => {
    const st = document.querySelector('.design').getBoundingClientRect()
    const k = st.width / 1920
    const m = document.querySelector('.gl-modal')
    const r = m.getBoundingClientRect()
    return {
      box: [Math.round((r.left - st.left) / k), Math.round((r.top - st.top) / k), Math.round(r.width / k), Math.round(r.height / k)],
      tab: document.querySelector('.gm-tab')?.textContent?.trim(),
      tabImg: document.querySelector('.gm-tab-ring')?.getAttribute('src')?.split('/').pop(),
      board: document.querySelector('.gm-board')?.getAttribute('src')?.split('/').pop(),
      rows: document.querySelectorAll('.gm-row').length,
      close: !!document.querySelector('.gm-close'),
      sep: [...document.querySelectorAll('.gm-row')].every((e) => getComputedStyle(e).borderBottomWidth === '1px'),
    }
  })
  shapes.push({ name, ...info })
  if (i < 3) {
    await p.keyboard.press('Escape')
    await p.waitForTimeout(260)
  }
}
ok('R4 四类弹窗共用同一容器尺寸', new Set(shapes.map((s) => s.box.join(','))).size === 1, shapes.map((s) => s.box.join(',')).join(' | '))
ok('R4 弹窗在屏幕中心（1920×1080）', Math.abs(shapes[0].box[0] + shapes[0].box[2] / 2 - 960) <= 2 && Math.abs(shapes[0].box[1] + shapes[0].box[3] / 2 - 540) <= 2, JSON.stringify(shapes[0].box))
ok('R4 左上角名牌 = 该项设置名', shapes.map((s) => s.tab).join() === '演出,音量,快捷,存档', shapes.map((s) => s.tab).join('/'))
ok('R4 设置项之间金线分隔', shapes.every((s) => s.sep && s.rows > 0))
ok('R4 关闭键在容器右上角', shapes.every((s) => s.close))
ok('R4 容器 = 评分板 1240×839', shapes[0].box[2] === 1240 && shapes[0].box[3] === 839, shapes[0].box.join(','))
ok('R4 容器底图 = 评分板 board.webp', shapes.every((s) => s.board === 'board.webp'), shapes.map((s) => s.board).join(','))
ok('R4 左上角名牌 = 十字准星 tab.webp', shapes.every((s) => s.tabImg === 'tab.webp'), shapes.map((s) => s.tabImg).join(','))

/* ── R5 关闭方式（当前停在存档面板） ── */
await p.mouse.click(960, 500) // 容器内
await p.waitForTimeout(200)
const stillOpen = await p.evaluate(() => !!document.querySelector('.gl-modal'))
ok('R5 点容器内部不关闭', stillOpen === true)

await p.click('.gm-close')
await p.waitForTimeout(320)
const closedByX = await p.evaluate(() => !!document.querySelector('.gl-modal'))
ok('R5 点右上角关闭键关闭', closedByX === false)

await p.click('.gl-hot >> nth=1')
await p.waitForTimeout(300)
await p.mouse.click(160, 940) // 容器外
await p.waitForTimeout(300)
const closedByBg = await p.evaluate(() => !!document.querySelector('.gl-modal'))
ok('R5 点容器外空白关闭', closedByBg === false)

/* ── R3/R5 存档面板打开，供后续用 ── */
await p.click('.gl-hot >> nth=3')
await p.waitForTimeout(360)

/* ── R10 统计 ── */
const stats = await p.evaluate(() => [...document.querySelectorAll('.gs-item')].map((e) => ({
  n: Number(e.querySelector('.num')?.textContent?.trim()),
  label: e.querySelector('span')?.textContent?.trim(),
})))
ok(
  'R10 存档显示累计抽数 / 服装部件 / 阅读物',
  stats.length === 3 && stats[0].n === 17 && stats[1].n === 1 && stats[2].n === 1,
  JSON.stringify(stats),
)

/**
 * 点某一行的按钮 —— 按标题文本找，不按行下标（存档面板加行会让下标整体偏移）。
 */
async function clickRowBtn(title, sel = '.gm-btn') {
  const h = await p.evaluateHandle(([t, s]) => {
    const row = [...document.querySelectorAll('.gm-row')].find((r) =>
      r.querySelector('.gr-txt b')?.textContent?.trim() === t)
    return row?.querySelector(s) ?? null
  }, [title, sel])
  const el = h.asElement()
  if (!el) throw new Error(`找不到「${title}」这一行的 ${sel}`)
  await el.click()
}

/* ── R11 二级确认 ── */
await clickRowBtn('当前服装阁记忆', '.gm-btn')
await p.waitForTimeout(360)
const cf = await p.evaluate(() => {
  const st = document.querySelector('.design').getBoundingClientRect()
  const k = st.width / 1920
  const bar = document.querySelector('.cf-bar').getBoundingClientRect()
  const art = document.querySelector('.cf-art')
  const m = document.querySelector('.gl-modal').getBoundingClientRect()
  return {
    art: (art?.getAttribute('src') ?? '').split('/').pop(),
    artW: art?.naturalWidth,
    artH: art?.naturalHeight,
    alt: art?.getAttribute('alt'),
    box: [Math.round(bar.width / k), Math.round(bar.height / k)],
    btns: [...document.querySelectorAll('.cf-btn')].length,
    cy: (bar.top - st.top) / k + bar.height / k / 2,
    my: (m.top - st.top) / k + m.height / k / 2,
  }
})
ok('R11 确认条 = 《二级确认弹窗.pxdesk》成品图', cf.art === 'confirm.webp' && cf.artW === 837 && cf.artH === 183, `${cf.art} ${cf.artW}×${cf.artH}`)
ok('R11 确认条文案「该操作不可逆，是否执行？」', cf.alt === '该操作不可逆，是否执行？', cf.alt)
ok('R11 条上两个圆钮（✕ / ✓）可点', cf.btns === 2 && cf.box.join() === '900,197', `${cf.box.join(',')} · ${cf.btns} 个`)
ok('R11 确认条在弹窗中部偏上', cf.cy < cf.my - 40, `确认中心 ${Math.round(cf.cy)} / 弹窗中心 ${Math.round(cf.my)}`)
await p.screenshot({ path: `${S}/gl-confirm.png` })

/* 取消 → 存档不变 */
await p.click('.cf-btn.cancel')
await p.waitForTimeout(300)
ok('R11 取消后不执行清理', (await readSave()).pity['banner-076']?.total === 12)

/* 回到存档面板并确认清理当前卡池 */
await clickRowBtn('当前服装阁记忆', '.gm-btn')
await p.waitForTimeout(300)
await p.click('.cf-btn.ok')
await p.waitForTimeout(500)
const s1 = await readSave()
ok('R9 当前卡池记忆已清空', !s1.pity['banner-076'] && s1.pity['banner-003']?.total === 5)

/* 当前版本记忆 */
await clickRowBtn('当前版本记忆', '.gm-btn')
await p.waitForTimeout(300)
await p.click('.cf-btn.ok')
await p.waitForTimeout(500)
const s2 = await readSave()
ok('R9 当前版本记忆已清空（其余版本保留）', !s2.pity['banner-076'] && s2.pity['banner-003']?.total === 5, JSON.stringify(s2.pity))

await p.screenshot({ path: `${S}/gl-save.png` })
await p.keyboard.press('Escape')
await p.waitForTimeout(300)

/* ── R6 音量 ── */
await p.click('.gl-hot >> nth=1')
await p.waitForTimeout(360)
await p.evaluate(() => {
  const s = document.querySelectorAll('.gr-slider input')[2]
  s.value = '35'
  s.dispatchEvent(new Event('input', { bubbles: true }))
})
await p.waitForTimeout(300)
const sv = await readSave()
ok('R6 三个音量滑杆齐全且可调（UI 音效 35）', sv.settings.uiVol === 0.35, JSON.stringify({ v: sv.settings.volume, b: sv.settings.bgmVol, u: sv.settings.uiVol }))
await p.screenshot({ path: `${S}/gl-volume.png` })
await p.keyboard.press('Escape')
await p.waitForTimeout(260)

/* ── R7 演出开关 ── */
await p.click('.gl-hot >> nth=0')
await p.waitForTimeout(360)
const stageRows = await p.evaluate(() => [...document.querySelectorAll('.gm-row .gr-txt b')].map((e) => e.textContent?.trim()))
ok(
  'R7 演出 5 个开关齐全',
  stageRows.join() === '跳过抽卡动画,跳过单抽动画,跳过奖励弹窗,跳过开屏动画,跳过抽卡',
  stageRows.join('/'),
)
// 打开「跳过抽卡」
await clickRowBtn('跳过抽卡', '.sw')
await p.waitForTimeout(300)
ok('R7 开关落盘（skipGacha=true）', (await readSave()).settings.skipGacha === true)
await p.screenshot({ path: `${S}/gl-stage.png` })
await p.keyboard.press('Escape')
await p.waitForTimeout(260)

/* ── R8 快捷：欧皇 + 集齐阅读 ── */
await p.click('.gl-hot >> nth=2')
await p.waitForTimeout(360)
await clickRowBtn('欧皇模式', '.sw')
await p.waitForTimeout(300)
ok('R8 欧皇模式开关落盘', (await readSave()).settings.lucky === true)

const beforeRead = await p.evaluate(() => document.querySelectorAll('.gm-row').length)
await clickRowBtn('集齐全部阅读', '.gm-btn')
await p.waitForTimeout(1600)
const readCnt = await p.evaluate((k) => {
  const s = JSON.parse(localStorage.getItem(k) ?? '{}')
  return Object.keys(s.codex ?? {}).filter((x) => x.startsWith('reading:')).length
}, KEY)
ok('R8 集齐全部阅读（两个区域全解锁）', readCnt >= 593, `已解锁 ${readCnt} 本 / 面板行 ${beforeRead}`)
ok('R8 阅读页「收集全部」按钮已移除', await p.evaluate(async () => {
  const res = await fetch('/src/views/MuseumReadings.vue')
  const txt = await res.text()
  return !txt.includes('rd-collect') && !txt.includes('collectAll')
}))
await p.screenshot({ path: `${S}/gl-quick.png` })
await p.keyboard.press('Escape')
await p.waitForTimeout(260)

/* ── R8 欧皇 ×3（直接跑引擎统计） ── */
const luck = await p.evaluate(async () => {
  const { drawOne, newPity } = await import('/src/core/engine.ts')
  const { Rng } = await import('/src/core/rng.ts')
  const { Codex } = await import('/src/core/inventory.ts')
  const rules = (await (await fetch('/assets/manifest.json')).json()).rules
  const parts = Array.from({ length: 30 }, (_, i) => ({ id: 'p' + i }))
  const pool = { 3: parts, 4: parts.slice(0, 6), 5: parts.slice(0, 2) }
  const run = (lucky) => {
    const pity = newPity()
    const codex = new Codex()
    const rng = new Rng(12345)
    let five = 0
    let four = 0
    for (let i = 0; i < 120000; i++) {
      const r = drawOne({ rules, pool, codex, pity, rng, lucky }, 1)
      if (r.rarity === 5) five++
      else if (r.rarity === 4) four++
    }
    return { five: five / 1200, four: four / 1200 }
  }
  return { off: run(false), on: run(true) }
})
const ratio5 = luck.on.five / luck.off.five
ok('R8 欧皇模式 5★ 概率约 ×3', ratio5 > 2.5 && ratio5 < 3.4, `${luck.off.five.toFixed(2)}% → ${luck.on.five.toFixed(2)}%（×${ratio5.toFixed(2)}）`)

/* ── R7 跳过抽卡直出（去共鸣页点十连） ── */
await p.goto(BASE + '/#/banner', { waitUntil: 'networkidle' })
await p.waitForTimeout(1400)
const beforePull = (await readSave()).history.length
const hasTen = await p.$('.pull-btn.ten')
if (hasTen) {
  await p.click('.pull-btn.ten')
  await p.waitForTimeout(900)
  const after = await readSave()
  const hash = await p.evaluate(() => location.hash)
  ok('R7 跳过抽卡：直接结算且不进演出', after.history.length === beforePull + 10 && hash.includes('/banner'), `history ${beforePull}→${after.history.length}, hash=${hash}`)
} else {
  ok('R7 跳过抽卡：直接结算且不进演出', false, '未找到十连按钮')
}

/* ── R7 跳过单抽动画：双击立即解锁 ── */
await p.evaluate(
  ([k, v]) => localStorage.setItem(k, JSON.stringify(v)),
  [KEY, { ...SAVE, settings: { ...SAVE.settings, skipSingleAnim: true, skipGacha: false } }],
)
await p.goto('about:blank')
await p.goto(BASE + '/#/banner', { waitUntil: 'networkidle' })
await p.waitForTimeout(1200)
await p.click('.pull-btn.single')
let detailOn = false
for (let i = 0; i < 150 && !detailOn; i++) {
  await p.waitForTimeout(120)
  detailOn = await p.evaluate(() => !!document.querySelector('.detail'))
}
if (detailOn) {
  const before = await p.evaluate(() => document.querySelector('.detail')?.className ?? '')
  await p.mouse.dblclick(960, 540)
  await p.waitForTimeout(120)
  const after = await p.evaluate(() => document.querySelector('.detail')?.className ?? '')
  ok('R7 跳过单抽动画：双击立即结束入场锁定', before.includes('locked') && !after.includes('locked'), `${before} → ${after}`)
} else {
  ok('R7 跳过单抽动画：双击立即结束入场锁定', false, '单抽详情未出现')
}

/* ── R7 跳过开屏（fixture 里 skipOpening=true） ── */
await p.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' })
await p.waitForTimeout(700)
const bootGone = await p.evaluate(() => !document.querySelector('.boot'))
ok('R7 跳过开屏动画生效（无 boot 层）', bootGone === true)

/* ── R13 主界面右下角彩蛋 ── */
const eggHot = await p.evaluate(() => {
  const st = document.querySelector('.design').getBoundingClientRect()
  const k = st.width / 1920
  const e = document.querySelector('.hm-egg')
  if (!e) return null
  const r = e.getBoundingClientRect()
  return {
    x: Math.round((r.left - st.left) / k),
    y: Math.round((r.top - st.top) / k),
    w: Math.round(r.width / k),
    h: Math.round(r.height / k),
    visible: r.width > 0,
  }
})
ok('R13 主界面右下角 200×100 热区', eggHot?.w === 200 && eggHot?.h === 100 && eggHot.x === 1720 && eggHot.y === 980, JSON.stringify(eggHot))

await p.mouse.click(eggHot.x + 100, eggHot.y + 50)
await p.waitForTimeout(600)
const egg = await p.evaluate(() => {
  const st = document.querySelector('.design').getBoundingClientRect()
  const k = st.width / 1920
  const e = document.querySelector('.eg-panel')
  if (!e) return null
  const r = e.getBoundingClientRect()
  return {
    box: [Math.round((r.left - st.left) / k), Math.round((r.top - st.top) / k), Math.round(r.width / k), Math.round(r.height / k)],
    title: document.querySelector('.eg-title')?.textContent?.trim(),
    align: document.querySelector('.eg-text')?.className,
    count: document.querySelector('.eg-count')?.textContent?.replace(/\s+/g, ''),
    navs: [...document.querySelectorAll('.eg-nav')].length,
    paper: [...document.querySelectorAll('.pw-bg,.pw-line1,.pw-line4,.pw-outer')].map((i) => (i.getAttribute('src') ?? '').split('/').pop()),
    scrollable: (() => {
      const s = document.querySelector('.eg-scroll')
      return s.scrollHeight > s.clientHeight
    })(),
  }
})
ok(
  'R13 弹窗沿用共鸣概率弹窗容器（羊皮纸 + 三道金线）',
  ['bg-01.webp', 'bg-01-line.webp', 'bg-04-line.webp', 'bg-03-line.webp'].every((f) => (egg?.paper ?? []).includes(f)),
  egg?.paper.join(','),
)
ok('R13 容器比概率弹窗更大（1045×640 > 836×512）', egg?.box[2] === 1045 && egg?.box[3] === 640, egg?.box.join(','))
ok('R13 标题固定「彩蛋 / 碎碎念 / 发癫」', egg?.title === '彩蛋 / 碎碎念 / 发癫', egg?.title)
const [eggIdx, eggTotal] = (egg?.count ?? '').split('/')
// 总条数会随素材增加因彩蛋文本3 从 44 → 74，这里只要求「序号在 1..总数内」
ok('R13 左右切换键 + 计数 n/N（首条随机）',
  egg?.navs === 2 && Number(eggIdx) >= 1 && Number(eggIdx) <= Number(eggTotal) && Number(eggTotal) >= 44,
  `${egg?.navs} · ${egg?.count}`)
// 首条随机 → 先翻到第 1 条（20 行长文）再验滚动
for (let i = 0; i < Number(eggTotal); i++) {
  const now = await p.evaluate(() => document.querySelector('.eg-count')?.textContent?.replace(/\s+/g, ''))
  if (now === `1/${eggTotal}`) break
  await p.click('.eg-nav.next')
  await p.waitForTimeout(50)
}
await p.waitForTimeout(150)
const scrollable = await p.evaluate(() => {
  const s = document.querySelector('.eg-scroll')
  return s.scrollHeight > s.clientHeight + 4
})
ok('R13 长条目可上下滚动（第 1 条）', scrollable === true)

// 以「点击前那一刻」的序号为准（前面为了验滚动已把条目翻到第 1 条）
const before = await p.evaluate(() => document.querySelector('.eg-count')?.textContent?.replace(/\s+/g, ''))
await p.click('.eg-nav.next')
await p.waitForTimeout(320)
const egg2 = await p.evaluate(() => ({
  count: document.querySelector('.eg-count')?.textContent?.replace(/\s+/g, ''),
  top: document.querySelector('.eg-scroll')?.scrollTop,
}))
const beforeN = Number((before ?? '').split('/')[0])
ok(
  'R13 右键切到下一条且回到顶部',
  egg2.count === `${beforeN === Number(eggTotal) ? 1 : beforeN + 1}/${eggTotal}` && egg2.top === 0,
  `${before} → ${egg2.count}`,
)

// 循环翻到第 24 条（彩蛋文本2 的首条，居中排版；file1 共 23 条，所以它恒为 24）
for (let i = 0; i < Number(eggTotal); i++) {
  const now = await p.evaluate(() => document.querySelector('.eg-count')?.textContent?.replace(/\s+/g, ''))
  if (now === `24/${eggTotal}`) break
  await p.click('.eg-nav.next')
  await p.waitForTimeout(60)
}
await p.waitForTimeout(400)
const eggC = await p.evaluate(() => document.querySelector('.eg-text')?.className)
ok('R13 彩蛋文本2 的条目居中排版', /center/.test(eggC ?? ''), eggC)

await p.mouse.click(180, 180)
await p.waitForTimeout(320)
ok('R13 点空白关闭彩蛋', await p.evaluate(() => !document.querySelector('.eg-panel')))

ok('无页面报错', errs.length === 0, errs.slice(0, 3).join(' | '))

await b.close()
console.log('\n═══ 辉煌心光 · 设置页验收 ═══')
console.log(rows.join('\n'))
console.log(`\n${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
