/**
 * 服装图鉴子界面（M2）验收 · 断言式：先 `npm run dev`（5178），再 `node tools/verify-clothes.mjs`。
 * 覆盖 10 项改动 + 2 项布局守护，逐条 try/catch 互不中断，末尾打印 PASS/FAIL 汇总并按失败数退出。
 * 搜索弹窗用 `sp-*` 前缀选择器；`fill` 前先等 `.sp-mask` 可见 + `.sp-sbg` 解码，再点输入框拿焦点。
 */
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

const pageErrors = []
/**
 * `ERR_ABORTED` 不算错：BGM 是 `new Audio(url)` 现造的离屏元素，元素回收时会被报成 aborted；
 * 真正的坏请求（404 / 5xx）仍然照记。
 */
const isAbortedAudio = (t) => /net::ERR_ABORTED/.test(t) && /\/assets\/(sfx|bgm)\//.test(t)
const pushErr = (t) => { if (!isAbortedAudio(t)) pageErrors.push(t) }

page.on('console', (m) => { if (m.type() === 'error') pushErr(m.text()) })
page.on('pageerror', (e) => pushErr(e.message))
page.on('requestfailed', (r) => pushErr(`reqfail ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => { if (r.status() >= 400) pushErr(`http${r.status()} ${r.url()}`) })

/* ══════════════════════════ 断言框架 ══════════════════════════ */

const results = []
/** 记一条断言。detail 会打印在结论后面，方便对不上时直接看实测值 */
function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail })
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${detail ? `  ${detail}` : ''}`)
}
/** 包一层 try/catch：抛异常记 FAIL，不中断后面的项 */
async function step(name, fn) {
  try {
    await fn()
  } catch (e) {
    check(name, false, `异常 → ${String(e.message ?? e).split('\n')[0].slice(0, 120)}`)
  }
}
const near = (a, b, tol = 0.5) => Math.abs(Number(a) - Number(b)) <= tol
const round = (v) => Math.round(Number(v) * 100) / 100

/* ══════════════════════════ 准备：注入全解锁存档 ══════════════════════════ */

await page.goto(`${BASE}/#/codex/clothes`)
await page.evaluate(async () => {
  const m = await (await fetch('/assets/manifest.json')).json()
  const codex = {}
  for (const b of m.banners) {
    for (const s of b.sets || []) {
      if (!s.parts?.length) continue
      for (const p of s.parts) codex[`${s.id}:${p.name}`] = { count: 2, firstAt: Date.now() }
    }
  }
  localStorage.setItem('nikki-resonance-save-v1', JSON.stringify({
    version: 1, selectedVersion: '2.10', pity: {}, codex, milestoneClaimed: {}, history: [],
    settings: { pvEnabled: false, skipAnim: false, volume: 0.7, bgm: true, bgmVol: 0.7, uiVol: 0.8, particles: true },
  }))
})
await page.reload()
await page.waitForSelector('.cl-sets .cl-set', { timeout: 15000 })
await page.waitForTimeout(800)
await page.screenshot({ path: `${OUT}/cl-01-default.png` })

console.log('\n=== 服装图鉴 10 项 + 2 项守护 ===')

/* ── R1 放大镜热区是正圆（200×200，border-radius:50%） ── */
await step('R1 搜索热区', async () => {
  const r = await page.$eval('.cl-search', (el) => {
    const b = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return {
      w: Math.round(b.width), h: Math.round(b.height),
      radius: cs.borderRadius,
      cx: Math.round(b.left + b.width / 2), cy: Math.round(b.top + b.height / 2),
    }
  })
  check('R1 搜索热区 200×200 正圆', near(r.w, 200, 1) && near(r.h, 200, 1) && /50%/.test(r.radius),
    `${r.w}×${r.h} radius=${r.radius} 中心=${r.cx},${r.cy}`)
})

/* ── R2 立绘层序：sh-img 必须排在 sh-frame 之前（先渲染 → 被框盖住） ── */
await step('R2 立绘层序', async () => {
  const cls = await page.$eval('.cl-show', (el) => [...el.children].map((c) => c.className.split(' ')[0]))
  const iImg = cls.indexOf('sh-img')
  const iFrame = cls.indexOf('sh-frame')
  check('R2 立绘在容器框之下', iImg >= 0 && iFrame >= 0 && iImg < iFrame, `DOM 顺序 = ${cls.join(' < ')}`)
})

/* ── R3 半身像：选部件 → .sh-img 加 .half；再点一次复原 ── */
await step('R3 半身像', async () => {
  const parts = page.locator('.cl-parts .cl-part')
  const n = await parts.count()
  if (n === 0) return check('R3 半身像切换', false, '没有可点部件')
  const before = await page.$eval('.sh-img', (el) => el.className)
  await parts.nth(0).click()
  await page.waitForTimeout(300)
  const after = await page.$eval('.sh-img', (el) => el.className)
  await parts.nth(0).click()
  await page.waitForTimeout(250)
  const back = await page.$eval('.sh-img', (el) => el.className)
  check('R3 半身像切换 .half',
    !before.includes('half') && after.includes('half') && !back.includes('half'),
    `${before.includes('half') ? 'half' : '整体'} → ${after.includes('half') ? 'half' : '整体'} → ${back.includes('half') ? 'half' : '整体'}`)
})

/* ── R4 区域选项卡已删除 ── */
await step('R4 区域选项卡', async () => {
  const n = await page.$$eval('.cl-regiontab', (e) => e.length)
  check('R4 区域选项卡已删除', n === 0, `命中 ${n} 个 .cl-regiontab`)
})

/* ── R5 标签 / 星级对调：namerow 里装标签，星级提到 head 直属 ── */
await step('R5 头部结构', async () => {
  const r = await page.evaluate(() => {
    const nr = document.querySelector('.in-namerow')
    const head = document.querySelector('.in-head')
    return {
      namerowHasTags: !!nr?.querySelector('.in-tags'),
      headDirectHasStars: !!head && [...head.children].some((c) => c.classList.contains('in-stars')),
    }
  })
  check('R5 标签入名称行、星级直属 head', r.namerowHasTags && r.headDirectHasStars,
    `namerow 含 tags=${r.namerowHasTags} / head 直属 stars=${r.headDirectHasStars}`)
})

/* ── R6 部件高亮框与底板等大（inset:-3px） ── */
await step('R6 高亮框', async () => {
  const r = await page.$eval('.pt-hi', (el) => {
    const cs = getComputedStyle(el)
    return { inset: cs.inset, w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }
  })
  const insets = r.inset.split(' ').map((v) => parseFloat(v))
  check('R6 高亮框 inset:-3px', insets.every((v) => near(v, -3, 0.6)), `inset=${r.inset} 实际 ${r.w}×${r.h}`)
})

/* ── R7 雷达热区：5 个 r=20 的圆，圆心取标签坐标 ── */
await step('R7 雷达热区', async () => {
  const hits = await page.$$eval('.rd-hot', (els) => els.map((e) => ({
    cx: +e.getAttribute('cx'), cy: +e.getAttribute('cy'), r: +e.getAttribute('r'),
  })))
  check('R7 雷达 5 个 r=20 圆热区',
    hits.length === 5 && hits.every((h) => h.r === 20 && Number.isFinite(h.cx) && Number.isFinite(h.cy)),
    `n=${hits.length} r=${[...new Set(hits.map((h) => h.r))].join('/')}`)
})

/* ── R8 套装栏显示区 = 3 格 + 2×2px = 1045 ── */
await step('R8 套装栏宽度', async () => {
  const w = await page.$eval('.cl-sets', (el) => el.getBoundingClientRect().width)
  check('R8 套装栏 1045（3 格 + 2×2px）', near(w, 1045, 1), `实测 ${round(w)}`)
})

/* ── R8b 赛季栏：大版本 option 的可见实体与小版本底板等大 ──
 opt 素材 437×132、实体 (15,16)-(421,116)；title-panel 473×128、实体 (16,13)-(459,117)。
 img 用 object-fit:fill 拉伸，所以实体尺寸 = img 尺寸 × 实体占比。
 两者「可见实体」宽高必须相等（容差 1px），否则又会出现大版本小一圈。 */
await step('R8b 赛季栏等大', async () => {
  const r = await page.evaluate(() => {
    const solid = (img, w, h, bx0, by0, bx1, by1) => {
      const b = img.getBoundingClientRect()
      return {
        w: (bx1 - bx0) / w * b.width,
        h: (by1 - by0) / h * b.height,
        cx: b.left + (bx0 + bx1) / 2 / w * b.width,
        cy: b.top + (by0 + by1) / 2 / h * b.height,
      }
    }
    const maj = document.querySelector('.cl-vmajor')
    const min = document.querySelector('.cl-vminor')
    return {
      major: solid(maj.querySelector('.vm-bg'), 437, 132, 15, 16, 421, 116),
      minor: solid(min.querySelector('.vn-bg'), 473, 128, 16, 13, 459, 117),
    }
  })
  const { major: a, minor: b } = r
  const ok = near(a.w, b.w, 1) && near(a.h, b.h, 1) && near(a.cx, b.cx, 1)
  check('R8b 大版本实体 = 小版本实体（等大）', ok,
    `大 ${round(a.w)}×${round(a.h)} 小 ${round(b.w)}×${round(b.h)} 中心x ${round(a.cx)}/${round(b.cx)}`)
})

/* ── R9 / R10 搜索弹窗 ── */
const defName = (await page.$eval('.in-name', (el) => el.textContent.trim())).slice(0, 2)

/** 打开搜索弹窗并等到「真的能用」：mask 可见 + 底图 decode + 输入框拿到焦点 */
async function openSearch() {
  await page.click('.cl-search')
  await page.waitForSelector('.sp-mask', { state: 'visible', timeout: 8000 })
  await page.waitForFunction(() => {
    const bg = document.querySelector('.sp-sbg')
    return !!bg && bg.complete && bg.naturalWidth > 0
  }, null, { timeout: 8000 })
  await page.click('.sp-sinput')
  await page.waitForFunction(() => document.activeElement?.classList.contains('sp-sinput'), null, { timeout: 4000 })
}

await step('R9 点空白关闭', async () => {
  await openSearch()
  await page.screenshot({ path: `${OUT}/cl-02-search-empty.png` })
  // 弹窗左上角（搜索板之外）点一下 → @click.self 关掉
  await page.mouse.click(12, 12)
  await page.waitForTimeout(260)
  const gone = (await page.$('.sp-mask')) === null
  check('R9 点弹窗外空白关闭', gone, gone ? '已关闭' : '弹窗仍在')
})

await step('R10 搜索结果结构', async () => {
  await openSearch()
  await page.fill('.sp-sinput', defName)
  await page.waitForTimeout(420)
  const s = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.sp-sitem')]
    const first = items[0]
    const star = first?.querySelector('.sp-sstar')
    return {
      n: items.length,
      nNext: document.querySelectorAll('.sp-snext').length,
      starMargin: star ? getComputedStyle(star).marginLeft : null,
      order: first ? [...first.children].map((c) => c.className.split(' ')[0]) : [],
    }
  })
  // 顺序守护：名称 → 星级 → 跳转键（图标有无都成立）
  const order = s.order
  const orderOk = order.indexOf('sp-sname') < order.indexOf('sp-sstar')
    && order.indexOf('sp-sstar') < order.indexOf('sp-snext')
  check('R10 有结果、每条一个跳转键、星级右移 10px、顺序 名→星→跳转',
    s.n > 0 && s.nNext === s.n && near(parseFloat(s.starMargin ?? -1), 10, 0.6) && orderOk,
    `结果 ${s.n} 条 / 跳转键 ${s.nNext} 个 / star margin=${s.starMargin} / 顺序=${order.join('<')}`)
  await page.screenshot({ path: `${OUT}/cl-03-search-results.png` })
})

await step('R10 跳转键生效', async () => {
  // 上一段可能已经把弹窗关掉（或没开），这里统一重开，避免依赖执行顺序
  if ((await page.$('.sp-mask')) === null) await openSearch()
  await page.fill('.sp-sinput', defName)
  await page.waitForTimeout(360)
  const target = await page.$eval('.sp-sitem .sp-sname', (el) => el.textContent.trim())
  await page.locator('.sp-snext').first().click()
  await page.waitForTimeout(450)
  const closed = (await page.$('.sp-mask')) === null
  const now = (await page.$eval('.in-name', (el) => el.textContent.trim()))
  check('R10 点跳转键 → 关闭弹窗并切到目标套装',
    closed && now === target, `目标「${target}」→ 当前「${now}」 / 弹窗${closed ? '已关' : '未关'}`)
  await page.screenshot({ path: `${OUT}/cl-04-after-jump.png` })
})

/* ── L1/L2 布局守护搜索框下移 20px 的成果别被改回去 ── */
await step('L1 搜索框位置', async () => {
  const need = (await page.$('.sp-mask')) === null
  if (need) await openSearch()
  const r = await page.$eval('.sp-sbar', (el) => {
    const b = el.getBoundingClientRect()
    return { left: Math.round(b.left), top: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }
  })
  check('L1 搜索条 @474,176 · 972×156', r.left === 474 && r.top === 176 && r.w === 972 && r.h === 156,
    `实测 @${r.left},${r.top} · ${r.w}×${r.h}`)
})

await step('L2 放大镜图标', async () => {
  const r = await page.$eval('.sp-sicon', (el) => {
    const b = el.getBoundingClientRect()
    return { left: b.left, top: b.top, w: Math.round(b.width) }
  })
  check('L2 搜索图标 100px @65.5,28', r.w === 100 && near(r.left, 539.5, 1) && near(r.top, 204, 1),
    `100px 检查=${r.w} 实际绝对位置 @${round(r.left)},${round(r.top)}（相对条 65.5,28）`)
})

/* ══════════════════════════ 控制台 / 网络 ══════════════════════════ */

const errs = [...new Set(pageErrors)]
check('E1 无控制台报错 / 4xx 资源', errs.length === 0, errs.length ? `${errs.length} 条：\n    ${errs.slice(0, 6).join('\n    ')}` : 'clean')

/* ══════════════════════════ 汇总 ══════════════════════════ */

await browser.close()

const fail = results.filter((r) => !r.ok)
console.log('\n──────────────────────────────────────────')
for (const r of results) if (!r.ok) console.log(`FAIL  ${r.name}  ${r.detail}`)
console.log(`${fail.length ? '✗' : '✓'} ${results.length - fail.length} / ${results.length} PASS`)
console.log('=== 验证完成 ===')
process.exit(fail.length ? 1 : 0)
