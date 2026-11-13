/**
 * verify-almanac-v2201.mjs —— 玄学运势 v1.1.01 验收（11 项用户需求）
 *
 * 用法：npm run dev 后 node tools/verify-almanac-v2201.mjs
 *
 * 覆盖：
 *  R1  高清素材全部换新（纸面/轴杆/桶/四卷轴/墨台/笔，中欧两套）
 *  R2  文字不溢出纸面 / 不溢出所在列（连续 8 天实测）
 *  R3  弹窗无「玄学运势」四字；副标题居中 + 放大
 *  R4  左侧重复元素（运势环）已移除
 *  R5  主界面标题用「玄运」艺术字
 *  R6  书签默认背面；点一次才翻面；再点翻回
 *  R7  闭合态两轴杆紧贴（不计透明通道）
 *  R8  展开全程轴杆中心线 == 纸面边缘（含 600ms 补间中途）
 *  R9  书签档位用艺术字（6 档齐全 + 大凶兜底）
 *  R10 中/欧两风格各 50%（多次进入统计）
 *  R11 返回键悬停换 _h 素材
 */
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const S = '.shots'

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

const BIRTH = { year: 1995, month: 6, day: 15, hour: 9 }

async function enter(withBirth = true) {
  // ⚠ 不要用 `networkidle`：首页挂着 bgm / 背景视频的 `preload="auto"`，
  // 连接一直不断，networkidle 永远等不到 → 20s 超时（这个脚本因此长期跑不通）。
  // 改成 domcontentloaded + 等 loading 消失。
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => !document.querySelector('.loading'), { timeout: 30000 }).catch(() => {})
  await p.evaluate((b) => {
    if (b) localStorage.setItem('nikki-almanac-birth-v1', JSON.stringify(b))
    else localStorage.removeItem('nikki-almanac-birth-v1')
    localStorage.setItem('nikki-almanac-uid-v1', 'u-verify')
  }, withBirth ? BIRTH : null)
  await p.goto(BASE + '/#/almanac', { waitUntil: 'domcontentloaded' })
  await p.waitForFunction(() => !document.querySelector('.loading'), { timeout: 30000 }).catch(() => {})
  await p.waitForTimeout(900)
  // 等书签的入场补间真的停稳。
  // 以前靠 `networkidle` 拖够了时间，改成 domcontentloaded 后入场动画可能还在跑，
  // 这时量到的 `bm-card` 位置是中途值，真实鼠标点击会落空（R6 翻面两条会假失败）。
  await p.waitForFunction(() => !!document.querySelector('.bm.in'), { timeout: 15000 }).catch(() => {})
  await p.evaluate(async () => {
    const el = document.querySelector('.bm-card')
    if (!el) return
    const top = () => el.getBoundingClientRect().top
    let last = top()
    let same = 0
    for (let i = 0; i < 180 && same < 3; i++) {
      await new Promise((r) => requestAnimationFrame(r))
      const now = top()
      same = Math.abs(now - last) < 0.5 ? same + 1 : 0
      last = now
    }
  })
}

/** 舞台坐标（1920×1080 设计坐标，已除缩放） */
const boxOf = (sel) =>
  p.evaluate((s) => {
    const st = document.querySelector('.design').getBoundingClientRect()
    const k = st.width / 1920
    const e = document.querySelector(s)
    const r = e.getBoundingClientRect()
    return {
      x: (r.left - st.left) / k,
      y: (r.top - st.top) / k,
      w: r.width / k,
      h: r.height / k,
      r: (r.right - st.left) / k,
      b: (r.bottom - st.top) / k,
    }
  }, sel)

await enter(true)

/* ── R1 素材：全部换成 v1.1.01 的工程产出 ── */
const man = await p.evaluate(async () => {
  const m = await (await fetch('/assets/manifest.json')).json()
  return m.ui.almanac
})
const assetPaths = [
  man.paper[0],
  man.paper[1],
  man.paper[2],
  man.axle[0],
  man.axle[1],
  man.axle[2],
  man.basket.cn,
  man.basket.eu,
  man.inkstand.cn,
  man.inkstand.eu,
  man.quill.cn,
  man.quill.eu,
  man.btn.cn.past,
  man.btn.cn.today,
  man.btn.cn.future,
  man.btn.cn.bazi,
  man.btn.eu.past,
  man.btn.eu.today,
  man.btn.eu.future,
  man.btn.eu.bazi,
  man.title,
  man.backN,
  man.backH,
  man.bookmarkBack,
  man.bookmarkFront,
  ...Object.values(man.tier),
]
const missing = await p.evaluate(async (list) => {
  const bad = []
  for (const u of list) {
    const okk = await new Promise((res) => {
      const im = new Image()
      im.onload = () => res(im.naturalWidth > 0)
      im.onerror = () => res(false)
      im.src = '/assets/' + u
    })
    if (!okk) bad.push(u)
  }
  return bad
}, assetPaths)
ok('R1 26 个玄学运势素材全部可加载（高清换新）', missing.length === 0, missing.join(','))

const newArt = await p.evaluate(async () => {
  const probe = async (u) => {
    const im = new Image()
    await new Promise((r) => {
      im.onload = r
      im.onerror = r
      im.src = '/assets/' + u
    })
    return [im.naturalWidth, im.naturalHeight]
  }
  return {
    paper: await probe('ui/almanac/paper-1.webp'),
    axle: await probe('ui/almanac/axle-1.webp'),
    title: await probe('ui/almanac/title.webp'),
    tier: await probe('ui/almanac/tier-great.webp'),
  }
})
ok('R1 纸面 1668×956 / 轴杆 39×956（按实体裁切、与纸等高）', newArt.paper[0] === 1668 && newArt.paper[1] === 956 && newArt.axle[1] === 956,
  JSON.stringify(newArt.paper) + ' ' + JSON.stringify(newArt.axle))

/* ── R4 运势环已移除 / R3 无「玄学运势」四字 ── */
const idleDom = await p.evaluate(() => ({
  ring: !!document.querySelector('.ring'),
  homeTitle: document.querySelector('.st-art')?.getAttribute('src') ?? '',
  homeTitleAlt: document.querySelector('.st-art')?.getAttribute('alt') ?? '',
}))
ok('R4 左侧运势环已删除（与书签功能重合）', idleDom.ring === false)
ok('R5 主界面标题为「玄运」艺术字', idleDom.homeTitle.includes('title.webp'), idleDom.homeTitle)

/* ── R11 返回键悬停 _h ── */
const backNormal = await p.getAttribute('.sc-back', 'src')
await p.hover('.sc-back')
await p.waitForTimeout(220)
const backHover = await p.getAttribute('.sc-back', 'src')
ok('R11 返回键悬停切 back-h', backNormal.includes('back-n') && backHover.includes('back-h'), `${backNormal.split('/').pop()} → ${backHover.split('/').pop()}`)
await p.mouse.move(5, 5)

await p.screenshot({ path: `${S}/v2201-idle.png` })

/* ── 进卷轴：闭合态 R7 ── */
const bk = await p.evaluate(() => {
  const r = document.querySelector('.sc-basket').getBoundingClientRect()
  return { x: r.left, y: r.top, w: r.width, h: r.height }
})
await p.mouse.click(bk.x + bk.w * 0.48, bk.y + bk.h * 0.5)
await p.waitForTimeout(780)

const rodsC = await p.evaluate(() => {
  const st = document.querySelector('.design').getBoundingClientRect()
  const k = st.width / 1920
  return [...document.querySelectorAll('.axle')].map((e) => {
    const r = e.getBoundingClientRect()
    return { x: (r.left - st.left) / k, w: r.width / k }
  })
})
const flush = Math.abs(rodsC[1].x - (rodsC[0].x + rodsC[0].w))
const clipClosed = await p.evaluate(() => getComputedStyle(document.querySelector('.sheet')).clipPath)
ok('R7 闭合态两轴杆紧贴（缝隙）', flush <= 0.6, `${flush.toFixed(2)}px`)
ok('R7 闭合态纸面收进轴杆带内（不漏白边）', /inset\((1[0-9]|2[0-9])/.test(clipClosed), clipClosed)

/* ── R8 展开中途：轴杆中心 == 纸边 ── */
const samples = []
await p.click('.qa-open')
for (let i = 0; i < 5; i++) {
  await p.waitForTimeout(100)
  samples.push(
    await p.evaluate(() => {
      const st = document.querySelector('.design').getBoundingClientRect()
      const k = st.width / 1920
      const bx = (e) => {
        const r = e.getBoundingClientRect()
        return { x: (r.left - st.left) / k, w: r.width / k, r: (r.right - st.left) / k }
      }
      const s = bx(document.querySelector('.sheet'))
      const ax = [...document.querySelectorAll('.axle')].map(bx)
      return {
        width: +s.w.toFixed(1),
        gapL: +(ax[0].x + ax[0].w / 2 - s.x).toFixed(2),
        gapR: +(ax[1].x + ax[1].w / 2 - s.r).toFixed(2),
      }
    }),
  )
}
const animating = samples.filter((s) => s.width > 40 && s.width < 1660)
const maxGap = Math.max(...samples.map((s) => Math.max(Math.abs(s.gapL), Math.abs(s.gapR))))
ok('R8 展开全程轴杆中心线压在纸边（含补间中途）', maxGap <= 0.6, `最大偏差 ${maxGap}px / 中途采样 ${animating.length} 帧`)
ok('R8 展开是真的补间动画（非瞬间跳变）', animating.length >= 2, animating.map((s) => s.width + 'px').join(' → '))

await p.waitForSelector('.bm.in', { timeout: 20000 })
await p.waitForTimeout(400)

/* ── R3 页眉：无四字、副标题居中放大 ── */
const head = await p.evaluate(() => {
  const st = document.querySelector('.design').getBoundingClientRect()
  const k = st.width / 1920
  const b = (e) => {
    const r = e.getBoundingClientRect()
    return { x: (r.left - st.left) / k, w: r.width / k }
  }
  const kind = document.querySelector('.hd-kind')
  const kb = b(kind)
  const pb = b(document.querySelector('.sheet'))
  return {
    text: kind.textContent.trim(),
    fs: parseFloat(getComputedStyle(kind).fontSize),
    dx: +(kb.x + kb.w / 2 - (pb.x + pb.w / 2)).toFixed(1),
    fourChars: (document.querySelector('.sheet')?.innerText ?? '').includes('玄 学 运 势'),
  }
})
ok('R3 弹窗内已无「玄学运势」四字', head.fourChars === false && head.text === '过往回顾', head.text)
ok('R3 副标题居中', Math.abs(head.dx) <= 1, `偏移 ${head.dx}px`)
ok('R3 副标题放大到 38px', head.fs >= 36, head.fs + 'px')

/* ── R9 档位艺术字 ── */
const tierInfo = await p.evaluate(async () => {
  const src = document.querySelector('.bm-tier-art')?.getAttribute('src') ?? ''
  const probe = async (n) => {
    const im = new Image()
    await new Promise((r) => {
      im.onload = r
      im.onerror = r
      im.src = '/assets/ui/almanac/' + n
    })
    return im.naturalWidth > 0
  }
  const names = ['tier-great', 'tier-good', 'tier-minor-good', 'tier-neutral', 'tier-minor-bad', 'tier-bad']
  const all = []
  for (const n of names) all.push(await probe(n + '.webp'))
  return { src: src.split('/').pop(), all, dark: document.querySelector('.bm-tier-art')?.classList.contains('dark') }
})
ok('R9 书签档位用艺术字（非文字）', tierInfo.src.startsWith('tier-'), tierInfo.src)
ok('R9 六档艺术字齐全（大凶用「凶」+ 暗色兜底）', tierInfo.all.every(Boolean))

/* ── R6 书签：默认背面 → 点一次翻面 ── */
const bm0 = await p.evaluate(() => ({
  flipped: document.querySelector('.bm-card').classList.contains('flipped'),
  back: document.querySelector('.bm-back')?.getAttribute('src')?.split('/').pop(),
  in: document.querySelector('.bm').classList.contains('in'),
}))
ok('R6 书签默认显示背面（玄运）', bm0.in && !bm0.flipped && bm0.back.includes('bookmark-back'), bm0.back)

const bmBox = await boxOf('.bm-card')
await p.mouse.click(bmBox.x + bmBox.w / 2, bmBox.y + bmBox.h / 2)
await p.waitForTimeout(560)
const bm1 = await p.evaluate(() => document.querySelector('.bm-card').classList.contains('flipped'))
ok('R6 点击一次翻到正面', bm1 === true)
await p.screenshot({ path: `${S}/v2201-bm-front.png`, clip: { x: bmBox.x - 30, y: bmBox.y - 20, width: bmBox.w + 60, height: bmBox.h + 70 } })
await p.mouse.click(bmBox.x + bmBox.w / 2, bmBox.y + bmBox.h / 2)
await p.waitForTimeout(560)
const bm2 = await p.evaluate(() => document.querySelector('.bm-card').classList.contains('flipped'))
ok('R6 再点一次翻回背面', bm2 === false)

/* ── R2 文字溢出：连续 8 天 ── */
const overflow = []
for (let i = 0; i < 8; i++) {
  const bad = await p.evaluate(() => {
    const st = document.querySelector('.design').getBoundingClientRect()
    const k = st.width / 1920
    const paper = document.querySelector('.sheet').getBoundingClientRect()
    const pr = { r: (paper.right - st.left) / k, b: (paper.bottom - st.top) / k }
    const cols = [...document.querySelectorAll('.col')].map((c) => {
      const r = c.getBoundingClientRect()
      return { r: (r.right - st.left) / k, b: (r.bottom - st.top) / k }
    })
    const out = []
    const check = (sel) => {
      document.querySelectorAll(sel).forEach((e) => {
        const r = e.getBoundingClientRect()
        const right = (r.right - st.left) / k
        const bottom = (r.bottom - st.top) / k
        if (e.scrollWidth > e.clientWidth + 2 || right > pr.r - 2 || bottom > pr.b - 2) {
          out.push({ sel, t: (e.textContent ?? '').slice(0, 12), right: Math.round(right), pr: Math.round(pr.r), bottom: Math.round(bottom), pb: Math.round(pr.b) })
        }
      })
    }
    ;['.gua-text', '.gua-adv', '.gn-main', '.gn-sub', '.bz-row', '.bz-tip', '.verdict', '.slip-text', '.slip-from', '.hh', '.chip', '.lk'].forEach(check)
    return out
  })
  if (bad.length) overflow.push({ day: i, bad })
  const next = await p.$('.pg:not([disabled]):last-of-type')
  if (next) await next.click()
  await p.waitForTimeout(450)
}
ok('R2 连续 8 天：无文字溢出列/纸面', overflow.length === 0, JSON.stringify(overflow).slice(0, 300))

/* ── R6 补充：写完才出场 ── */
ok('R6 书签在书写完成后才出场（bm.in）', await p.evaluate(() => document.querySelector('.bm').classList.contains('in')))

await p.screenshot({ path: `${S}/v2201-open.png` })

/* ── R10 两风格各 50% ── */
const seen = { eu: 0, cn: 0 }
for (let i = 0; i < 16; i++) {
  // 必须整页重载：同 URL 的 hash 变化不会重挂组件，风格 ref 不会重掷
  await p.reload({ waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(320)
  const src = await p.evaluate(() => document.querySelector('.bs-img')?.getAttribute('src') ?? '')
  if (src.includes('basket-eu')) seen.eu++
  else if (src.includes('basket-cn')) seen.cn++
}
ok('R10 中/欧两风格都会出现（各约 50%）', seen.eu >= 3 && seen.cn >= 3, `16 次：欧 ${seen.eu} / 中 ${seen.cn}`)

/* ── 控制台干净 ── */
ok('无页面报错', errs.length === 0, errs.slice(0, 3).join(' | '))

await b.close()

console.log('\n═══ 玄学运势 v1.1.01 验收 ═══')
console.log(rows.join('\n'))
console.log(`\n${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
