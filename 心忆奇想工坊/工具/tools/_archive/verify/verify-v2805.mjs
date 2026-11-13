/**
 * v1.6.02 验收：高分辨率适配。
 *
 * A. 布局缩放正确（各种视口下 .design 铺满 / 正确 letterbox）
 * B. 指针位移换算正确（拖拽在 4K 下不再跑得快 2 倍）
 * C. 各页面无 JS 报错
 */
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'

let pass = 0
let fail = 0
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`) }
}

const SIZES = [
  { w: 1920, h: 1080, name: '1080p' },
  { w: 2560, h: 1440, name: '1440p' },
  { w: 3840, h: 2160, name: '4K' },
  { w: 2560, h: 1080, name: '21:9' },
  { w: 1366, h: 768, name: '笔记本' },
]

const PAGES = [
  { hash: '#/', name: '主页' },
  { hash: '#/banner', name: '共鸣' },
  { hash: '#/versions', name: '版本' },
  { hash: '#/codex', name: '图鉴' },
  { hash: '#/almanac', name: '玄学' },
  { hash: '#/settings', name: '设置' },
]

const browser = await chromium.launch({ executablePath: CHROME, headless: true })

/* ══════════════ A. 布局缩放 ══════════════ */
console.log('\n【A. 布局缩放】')
for (const sz of SIZES) {
  const page = await browser.newPage({ viewport: { width: sz.w, height: sz.h } })
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2200)

  const r = await page.evaluate(() => {
    const d = document.querySelector('.design')
    const dr = d.getBoundingClientRect()
    const scale = Math.min(innerWidth / 1920, innerHeight / 1080)
    return {
      vw: innerWidth, vh: innerHeight, scale,
      dw: dr.width, dh: dr.height,
      dl: dr.left, dt: dr.top,
      expectW: 1920 * scale, expectH: 1080 * scale,
      expectL: (innerWidth - 1920 * scale) / 2,
      expectT: (innerHeight - 1080 * scale) / 2,
    }
  })

  const fit = Math.abs(r.dw - r.expectW) < 1.5 && Math.abs(r.dh - r.expectH) < 1.5
  const centered = Math.abs(r.dl - r.expectL) < 1.5 && Math.abs(r.dt - r.expectT) < 1.5
  ok(`${sz.name} ${sz.w}×${sz.h}：design 尺寸 = 1920×1080 × scale`,
    fit, `${Math.round(r.dw)}×${Math.round(r.dh)}（期望 ${Math.round(r.expectW)}×${Math.round(r.expectH)}）`)
  ok(`${sz.name}：design 居中（黑边对称）`, centered,
    `left=${Math.round(r.dl)}（期望 ${Math.round(r.expectL)}）`)

  // 16:9 应完全铺满；非 16:9 应留对称黑边
  const ratio = sz.w / sz.h
  if (Math.abs(ratio - 16 / 9) < 0.01) {
    ok(`${sz.name}：16:9 铺满（无黑边）`,
      Math.abs(r.dl) < 1.5 && Math.abs(r.dw - sz.w) < 1.5, `left=${Math.round(r.dl)}`)
  } else {
    ok(`${sz.name}：非 16:9 留对称黑边`,
      r.dl > 0 && Math.abs(r.dl - (sz.w - r.dw) / 2) < 1.5, `左右各 ${Math.round(r.dl)}px`)
  }
  ok(`${sz.name}：无 JS 报错`, errs.length === 0, errs.slice(0, 2).join(' | '))
  await page.close()
}

/* ══════════════ B. 指针位移换算 ══════════════ */
console.log('\n【B. 指针位移 → 设计位移的换算】')
for (const sz of SIZES) {
  const page = await browser.newPage({ viewport: { width: sz.w, height: sz.h } })
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)

  const r = await page.evaluate(() => {
    const design = document.querySelector('.design')
    const dr = design.getBoundingClientRect()
    const s = dr.width / 1920          // 实际缩放（design 的渲染宽 / 设计宽）
    const stageScale = Math.min(innerWidth / 1920, innerHeight / 1080)  // core/stage.ts 的算法

    // 复刻 core/stage.ts 的 toDesignX：
    //   (clientX − 黑边偏移) / scale
    const blackL = (innerWidth - 1920 * stageScale) / 2
    const toDesignX = (clientX) => (clientX - blackL) / stageScale

    // 取两个相距 200 屏幕像素的点，算它们的设计坐标差 —— 这才是「位移」
    const x0 = dr.left + dr.width / 2
    const x1 = x0 - 200
    const d0 = toDesignX(x0)
    const d1 = toDesignX(x1)

    return {
      s, stageScale,
      designDelta: d1 - d0,
      expect: -200 / stageScale,
    }
  })

  ok(`${sz.name}（scale=${r.stageScale.toFixed(2)}）：屏幕位移换算成设计位移`,
    Math.abs(r.designDelta - r.expect) < 0.5,
    `-200 屏幕px → ${r.designDelta.toFixed(1)} 设计px（期望 ${r.expect.toFixed(1)}）`)

  ok(`${sz.name}：stageScale 与实际缩放一致`, Math.abs(r.stageScale - r.s) < 0.01,
    `${r.stageScale.toFixed(4)} vs ${r.s.toFixed(4)}`)
  await page.close()
}

/* ══════════════ C. 拖拽在 4K 下不再跑得快 ══════════════ */
console.log('\n【C. 拖拽位移比（4K vs 1080p）】')
{
  /**
   * 用共鸣页的「套名横幅」（.set-banners）做真实拖拽：
   *   BannerView.onPlatesMove 直接改 scrollLeft，拖完读 scrollLeft 变化。
   *
   * 期望：指针在屏幕上移 N 物理像素 → 内容移 N/scale 设计像素。
   * 修复前：4K 下内容移 N 设计像素（跑得快 2 倍）。
   */
  // 遥远之海（banner-001）有 8 套 → 套名横幅一定横排溢出
  const POOL = 'banner-001'

  const measure = async (w, h) => {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    // 共鸣页要先选定版本才进池详情 —— 塞一份带 selectedVersion 的存档
    const SAVE = {
      version: 1, selectedVersion: '1.0', pity: {}, codex: {}, milestoneClaimed: {}, history: [],
      settings: { skipAnim: true, skipSingleAnim: true, skipReward: true, skipGacha: true, skipOpening: true },
    }
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), ['nikki-resonance-save-v1', JSON.stringify(SAVE)])
    await page.goto('about:blank')
    await page.goto(BASE + '/#/banner', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2800)
    // 切到指定池
    await page.evaluate((pid) => {
      const st = window.__store
      if (st) st.bannerId = pid
    }, POOL)
    await page.waitForTimeout(1600)

    const r = await page.evaluate(() => {
      const el = document.querySelector('.set-banners')
      if (!el) return { err: 'no .set-banners' }
      const canScroll = el.scrollWidth > el.clientWidth + 20
      const before = el.scrollLeft
      const hb = el.getBoundingClientRect()
      const x0 = hb.left + hb.width / 2
      const y0 = hb.top + hb.height / 2

      el.dispatchEvent(new PointerEvent('pointerdown', {
        clientX: x0, clientY: y0, bubbles: true, cancelable: true,
        pointerId: 1, isPrimary: true, button: 0, buttons: 1,
      }))
      for (let i = 1; i <= 10; i++) {
        el.dispatchEvent(new PointerEvent('pointermove', {
          clientX: x0 - (200 * i) / 10, clientY: y0, bubbles: true,
          pointerId: 1, isPrimary: true, buttons: 1,
        }))
      }
      el.dispatchEvent(new PointerEvent('pointerup', {
        clientX: x0 - 200, clientY: y0, bubbles: true, pointerId: 1,
      }))

      // ⚠ scrollLeft 是**设计坐标**（CSS px）—— transform: scale 不改变元素自己的
      // 布局坐标系，所以它已经是设计 px 了，不能再除以 scale。
      const movedDesign = Math.abs(el.scrollLeft - before)
      const scale = Math.min(innerWidth / 1920, innerHeight / 1080)
      return {
        movedDesign, scale,
        // 指针移动 200 **屏幕像素** → 应换算成 200/scale 设计像素
        expectDesign: 200 / scale,
        canScroll, sw: el.scrollWidth, cw: el.clientWidth,
      }
    })
    await page.close()
    return r
  }

  const a = await measure(1920, 1080)
  const b = await measure(3840, 2160)

  if (a.err || b.err || !a.canScroll) {
    console.log(`  （套名横幅不可横滚：${a.err || `sw=${a.sw} cw=${a.cw}`}，跳过实测）`)
  } else {
    console.log(`  1080p: 指针移 200 屏幕px → 内容移 ${a.movedDesign.toFixed(1)} 设计px（期望 ${a.expectDesign.toFixed(1)}）`)
    console.log(`  4K   : 指针移 200 屏幕px → 内容移 ${b.movedDesign.toFixed(1)} 设计px（期望 ${b.expectDesign.toFixed(1)}）`)
    ok('1080p：拖拽位移 1:1（200 屏幕px → 200 设计px）',
      Math.abs(a.movedDesign - a.expectDesign) <= 4,
      `${a.movedDesign.toFixed(1)} vs ${a.expectDesign.toFixed(1)}`)
    ok('4K：拖拽位移按 1/scale 换算（不再跑得快 2 倍）',
      Math.abs(b.movedDesign - b.expectDesign) <= 4,
      `${b.movedDesign.toFixed(1)} vs ${b.expectDesign.toFixed(1)}`)
    ok('4K 的设计位移 ≈ 1080p 的一半（正是 1/scale 的效果）',
      Math.abs(b.movedDesign - a.movedDesign / 2) <= 4,
      `${b.movedDesign.toFixed(1)} vs ${(a.movedDesign / 2).toFixed(1)}`)
  }
}

/* ══════════════ D. 点击交互命中 ══════════════ */
console.log('\n【D. 点击交互在高分屏上命中正确元素】')
for (const [w, h, tag] of [[1920, 1080, '1080p'], [2560, 1440, '1440p'], [3840, 2160, '4K']]) {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  const SAVE = {
    version: 1, selectedVersion: '2.10', pity: {}, codex: {}, milestoneClaimed: {}, history: [],
    settings: { skipAnim: true, skipSingleAnim: true, skipReward: true, skipGacha: true, skipOpening: true },
  }
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), ['nikki-resonance-save-v1', JSON.stringify(SAVE)])
  await page.goto('about:blank')
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2200)

  // 主页入口（图标按钮）
  const homeOk = await page.evaluate(() => {
    const el = document.querySelector('.dy-btn.dy-banner')
    if (!el) return { err: 'no .dy-btn.dy-banner' }
    const r = el.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return {
      hit: hit === el || el.contains(hit),
      box: `${Math.round(r.width)}×${Math.round(r.height)}`,
    }
  })
  ok(`${tag}：主页入口点击命中正确元素`, homeOk.err ? false : homeOk.hit,
    homeOk.err || `按钮 ${homeOk.box}`)

  // 左边缘唤出侧边导航
  // v1.6.06 起**主页不显示侧边栏**（信封入口搬到了左上角，左缘感应区会让位），
  // 所以这里改成两条：主页左缘**不该**冒出来；换到二级页面左缘**仍然**能唤出。
  await page.mouse.move(6, Math.round(h / 2))
  await page.waitForTimeout(500)
  const railOnHome = await page.evaluate(() => document.querySelectorAll('.rail').length)
  ok(`${tag}：主页左边缘不再唤出侧边栏`, railOnHome === 0, `找到 ${railOnHome} 个 .rail`)

  await page.goto(BASE + '/#/codex/clothes', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  await page.mouse.move(6, Math.round(h / 2))
  await page.waitForTimeout(600)
  const railW = await page.evaluate(() => {
    const rail = document.querySelector('.rail')
    return rail ? Math.round(rail.getBoundingClientRect().width) : 0
  })
  ok(`${tag}：二级页面左边缘移入仍能唤出侧边导航`, railW > 0, `宽 ${railW}px`)

  // 图鉴套装卡
  await page.goto(BASE + '/#/codex/clothes?name=%E7%BB%92%E8%8B%A5%E8%A5%9F%E8%B5%9E%E6%84%BF%E5%BF%83',
    { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2400)
  const cardOk = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.cl-set')]
    if (cards.length < 2) return { err: 'cards<2' }
    const t = cards[1]
    const r = t.getBoundingClientRect()
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return { hit: hit === t || t.contains(hit), n: cards.length }
  })
  ok(`${tag}：图鉴套装卡点击命中正确元素`, cardOk.err ? false : cardOk.hit,
    cardOk.err || `${cardOk.n} 张卡`)

  ok(`${tag}：无 JS 报错`, errs.length === 0, errs.slice(0, 2).join(' | '))
  await page.close()
}

await browser.close()
console.log(`\n通过 ${pass} / 失败 ${fail}`)
process.exit(fail ? 1 : 0)
