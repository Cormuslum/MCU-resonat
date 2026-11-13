/** 验收：按界面分配背景音 + 音量总控修复 + 生辰弹窗 + 卷轴 */
import { chromium } from 'playwright-core'
import { mkdirSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = '.shots'
mkdirSync(OUT, { recursive: true })
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
const near = (a, b, tol = 1) => Math.abs(Number(a) - Number(b)) <= tol

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  // 验收要读 BGM 的真实音量，必须让浏览器允许无手势自动播放
  args: ['--force-color-profile=srgb', '--autoplay-policy=no-user-gesture-required'],
})
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

/* 版本门禁：未选版本时 /banner 会被守卫打回版本页，这里预置一个当前版本 */
await page.addInitScript(() => {
  try {
    const KEY = 'nikki-resonance-save-v1'
    const raw = localStorage.getItem(KEY)
    const s = raw ? JSON.parse(raw) : { version: 1, pity: {}, codex: {}, milestoneClaimed: {}, history: [], settings: {} }
    if (!s.selectedVersion) s.selectedVersion = '2.10'
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch { /* about:blank 这类文档不允许访问 localStorage，跳过即可 */ }
})

/** 把 new Audio() 的实例留下来，才能读到 BGM 的真实 volume / src */
await page.addInitScript(() => {
  const Orig = window.Audio
  window.__audios = []
  window.Audio = function (src) {
    const a = new Orig(src)
    window.__audios.push(a)
    return a
  }
})

const pageErrors = []
// 音频 / 视频是 `new Audio()` / <video> 现造的，切页时浏览器会取消未完成的取流
// 报成 ERR_ABORTED —— 跟代码无关；真正的 404 / 5xx 仍然照记
const isAbortedAudio = (t) => /net::ERR_ABORTED/.test(t) && /\/assets\/(sfx|bgm|video|ui\/home)\//.test(t)
const pushErr = (t) => { if (!isAbortedAudio(t)) pageErrors.push(t) }
page.on('console', (m) => { if (m.type() === 'error') pushErr(m.text()) })
page.on('pageerror', (e) => pushErr(e.message))
page.on('requestfailed', (r) => pushErr(`reqfail ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => { if (r.status() >= 400) pushErr(`http${r.status()} ${r.url()}`) })

/* ══════════════════════ 通用小工具 ══════════════════════ */

const ALMANAC_KEYS = ['nikki-almanac-birth-v1', 'nikki-almanac-bazi-asked-v1', 'nikki-almanac-uid-v1']

/** 走 hash 跳转（同文档），等加载层过去 */
async function go(path, wait = 2000) {
  await page.evaluate((p) => { location.hash = '#' + p }, path)
  await page.waitForTimeout(wait)
}

/** 收纳桶热区（归一化坐标，与 verify-almanac 保持一致） */
const P = {
  past: { nx: 0.388, ny: 0.388 },
  today: { nx: 0.487, ny: 0.263 },
  future: { nx: 0.613, ny: 0.338 },
  bazi: { nx: 0.563, ny: 0.512 },
}
async function clickBasket(key) {
  const box = await page.evaluate(() => {
    const st = document.querySelector('.design').getBoundingClientRect()
    const k = st.width / 1920
    const b = document.querySelector('.sc-basket').getBoundingClientRect()
    return { x: (b.left - st.left) / k, y: (b.top - st.top) / k, w: b.width / k, h: b.height / k }
  })
  await page.mouse.click(box.x + box.w * P[key].nx, box.y + box.h * P[key].ny)
}

/** 设计坐标系下的元素矩形 */
async function rectOf(sel) {
  return page.evaluate((s) => {
    const el = document.querySelector(s)
    if (!el) return null
    const st = document.querySelector('.design').getBoundingClientRect()
    const k = st.width / 1920
    const b = el.getBoundingClientRect()
    return {
      x: Math.round((b.left - st.left) / k), y: Math.round((b.top - st.top) / k),
      w: Math.round(b.width / k), h: Math.round(b.height / k),
      bottom: Math.round((b.bottom - st.top) / k),
    }
  }, sel)
}

/** 当前 BGM 元素（最后一个匹配 bgm 的 Audio） */
async function bgmNow() {
  return page.evaluate(() => {
    const list = (window.__audios || []).filter((a) => /\/assets\/bgm\/|\/assets\/sfx\/bgm\.ogg$/.test(a.src))
    const a = list[list.length - 1]
    if (!a) return null
    return {
      src: a.src.split('/assets/')[1],
      volume: Math.round(a.volume * 1000) / 1000,
      paused: a.paused,
      loop: a.loop,
    }
  })
}

const readSave = () =>
  page.evaluate(() => JSON.parse(localStorage.getItem('nikki-resonance-save-v1') || 'null'))

console.log('\n=== v1.3.01 验收 ===')

/* ══════════════════════ A 玄学 · 生辰 ══════════════════════ */

await page.goto(`${BASE}/#/`)
await page.evaluate((keys) => {
  for (const k of keys) localStorage.removeItem(k)
  localStorage.removeItem('nikki-resonance-save-v1')
}, ALMANAC_KEYS)
await page.reload()
await page.waitForTimeout(800)

await step('A1 首次进入弹免责声明', async () => {
  await go('/almanac', 1200)
  const has = (await page.$('.dis')) !== null
  check('A1 首次进入出现免责声明 .dis', has, has ? '已出现' : '没出现')
  await page.screenshot({ path: `${OUT}/v25-almanac-first.png` })
})

// 免责打字 + 停留 + 淡出 ≈ 5.6s；结束后 guiding=true，生辰热区才可点
await page.waitForTimeout(6400)

await step('A2 生辰默认 2020/2/20', async () => {
  await clickBasket('bazi')
  await page.waitForSelector('.bd-mask', { timeout: 4000 })
  const vals = await page.$$eval('.bd-row select', (els) => els.slice(0, 3).map((e) => Number(e.value)))
  check('A2 生辰弹窗默认 2020 / 2 / 20', vals[0] === 2020 && vals[1] === 2 && vals[2] === 20, `实测 ${vals.join(' / ')}`)
  await page.screenshot({ path: `${OUT}/v25-bazi.png` })
})

await step('A3 点「不填写」写入已问过标记', async () => {
  await page.click('.bd-skip')
  await page.waitForTimeout(300)
  const asked = await page.evaluate(() => localStorage.getItem('nikki-almanac-bazi-asked-v1'))
  const gone = (await page.$('.bd-mask')) === null
  check('A3 「不填写，直接进入」→ 落盘 asked=1 且弹窗关闭', asked === '1' && gone, `asked=${asked} 弹窗${gone ? '已关' : '未关'}`)
})

await step('A4 二次进入不再弹', async () => {
  await go('/', 1800)
  await go('/almanac', 1800)
  const dis = (await page.$('.dis')) !== null
  const bd = (await page.$('.bd-mask')) !== null
  // 免责声明结束后会有常驻的 .dis-corner，所以只判 .dis 与弹窗
  check('A4 二次进入既不弹免责也不弹生辰', !dis && !bd, `免责=${dis} 生辰=${bd}`)
  await page.screenshot({ path: `${OUT}/v25-almanac-second.png` })
})

/* ══════════════════════ B 玄学 · 卷轴时隐藏侧栏 ══════════════════════ */

await step('B1 待机态侧栏存在', async () => {
  const has = (await page.$('.rail')) !== null
  check('B1 书桌待机态侧栏可用', has)
})

await step('B2 点卷轴后侧栏消失', async () => {
  await clickBasket('today')
  await page.waitForTimeout(600)
  const has = (await page.$('.rail')) !== null
  const collapsed = await page.evaluate(() => !!document.querySelector('.qa-open.show'))
  check('B2 点「今日」卷轴后侧栏整块不渲染', !has && collapsed, `卷轴收起=${collapsed} / 侧栏=${has ? '还在' : '已隐藏'}`)
})

await step('B3 卷轴收起时贴左缘也不弹侧栏', async () => {
  const stage = await page.evaluate(() => {
    const b = document.querySelector('.design').getBoundingClientRect()
    return { left: b.left, top: b.top, k: b.width / 1920 }
  })
  await page.mouse.move(stage.left + 30 * stage.k, stage.top + 540 * stage.k)
  await page.waitForTimeout(700)
  const has = (await page.$('.rail')) !== null
  check('B3 指针贴左缘 30px 仍不弹侧栏', !has)
  await page.screenshot({ path: `${OUT}/v25-almanac-scroll.png` })
})

await step('B4 版本页贴边死区能叫出侧栏', async () => {
  await go('/versions', 2200)
  // 版本页左栏整列是版本卡（button），压着按钮时侧栏会让位
  // 贴到最左 32px 的「死区」必须能强制叫出来，否则这一页的跨页导航就没有入口
  await page.mouse.move(960, 500)
  await page.waitForTimeout(300)
  await page.mouse.move(24, 540)
  await page.waitForTimeout(500)
  const open = (await page.$('.rail.open')) !== null
  check('B4 版本页指针贴左缘 24px → 侧栏仍能展开', open)
})

await step('B5 回主页后侧栏保持隐藏', async () => {
  // 起主页**不再有侧边栏**（信封入口在左上角，左缘感应区会让位）
  // 所以这里反过来验：从二级页 ESC 回主页后，`.rail` 必须不在
  await go('/almanac', 2000)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
  const has = (await page.$('.rail')) !== null
  check('B4 ESC 回主页后侧栏保持隐藏', !has)
})

/* ══════════════════════ C 加载层底图 ══════════════════════ */

await step('C 加载层用 T_UI_loading_bg', async () => {
  await go('/', 2200)
  await page.evaluate(() => { location.hash = '#/versions' })
  await page.waitForSelector('.ld', { timeout: 3000 })
  const info = await page.evaluate(() => {
    const bg = document.querySelector('.ld-bg')
    return {
      hasBg: !!bg,
      src: bg?.getAttribute('src') ?? '',
      loaded: !!bg && bg.complete && bg.naturalWidth === 1920,
      hasFoot: !!document.querySelector('.ld-foot'),
      bodyBg: getComputedStyle(document.querySelector('.ld')).backgroundColor,
    }
  })
  check('C1 加载层铺 1920×1080 底图且不再是纯黑',
    info.hasBg && info.src.includes('ui/loading/bg.webp') && info.loaded,
    `${info.src.split('/').pop()} decode=${info.loaded} 兜底底色=${info.bodyBg}`)
  const bar = await rectOf('.ld-bar')
  const deco = await rectOf('.ld-deco')
  check('C2 进度条距底 100px、装饰距进度条 20px',
    near(1080 - bar.bottom, 100, 1) && near(1080 - deco.bottom, 148, 1),
    `进度条底距 ${1080 - bar.bottom} / 装饰底距 ${1080 - deco.bottom}`)
  await page.screenshot({ path: `${OUT}/v25-loading.png` })
  // 让加载层自然结束
  await page.waitForTimeout(1600)
})

/* ══════════════════════ D 背景音 ══════════════════════ */

await step('D1 manifest 场景表', async () => {
  const m = await page.evaluate(async () => (await (await fetch('/assets/manifest.json')).json()).bgm)
  const codex = m?.codex ?? []
  const sum = codex.reduce((s, t) => s + t.w, 0)
  check('D1 五个界面有曲目，图鉴 5 首权重和 100',
    Object.keys(m ?? {}).sort().join() === 'almanac,banner,codex,gloria,versions'
      && codex.length === 5 && sum === 100,
    `场景=${Object.keys(m ?? {}).join('/')} 图鉴 ${codex.length} 首 权重和=${sum}`)
})

const SCENE_EXPECT = [
  ['/versions', 'bgm/qiji.ogg'],
  ['/banner', 'sfx/bgm.ogg'],
  ['/settings', 'bgm/wanzhang.ogg'],
]
for (const [path, want] of SCENE_EXPECT) {
  await step(`D2 背景音 ${path}`, async () => {
    await go(path, 2200)
    const b = await bgmNow()
    check(`D2 ${path} → ${want}`, b?.src === want, `实测 ${b?.src} vol=${b?.volume} paused=${b?.paused}`)
  })
}

await step('D2 背景音 图鉴/玄学 是随机池', async () => {
  const seen = new Set()
  for (let i = 0; i < 4; i++) {
    await go('/', 1500)
    await go('/codex', 2000)
    const b = await bgmNow()
    if (b?.src.startsWith('bgm/')) seen.add(b.src)
  }
  const codexPool = ['bgm/qixiang.ogg', 'bgm/langhua.ogg', 'bgm/yunhai.ogg', 'bgm/mengjing.ogg', 'bgm/qianwan.ogg']
  check('D2 图鉴只从 5 首池里挑', [...seen].every((s) => codexPool.includes(s)) && seen.size >= 1,
    `出现 ${[...seen].join(' / ') || '无'}`)
  await go('/almanac', 2000)
  const a = await bgmNow()
  check('D2 玄学只从村中无事 / 缘起丹青里挑',
    ['bgm/cunzhong.ogg', 'bgm/yuanqi.ogg'].includes(a?.src ?? ''), `实测 ${a?.src}`)
})

await step('D2 单曲界面 loop / 多曲界面不 loop（播完换下一首）', async () => {
  await go('/versions', 2200)
  const single = await bgmNow()
  await go('/codex', 2200)
  const multi = await bgmNow()
  check('D2 版本 loop=true、图鉴 loop=false（ended 里换曲）',
    single?.loop === true && multi?.loop === false,
    `版本 loop=${single?.loop} / 图鉴 loop=${multi?.loop}`)
})

await step('D3 主音量归零后换界面不复活', async () => {
  await go('/settings', 2200)
  await page.click('.gl-hot >> nth=1')
  await page.waitForTimeout(420)
  const sliders = await page.$$eval('.gr-slider input', (els) => els.length)
  check('D3 音量面板 = 主音量 + 背景音总控 + UI 音效 + 六界面', sliders === 9, `滑杆 ${sliders} 根`)
  // 主音量拖到 0
  await page.evaluate(() => {
    const s = document.querySelectorAll('.gr-slider input')[0]
    s.value = '0'
    s.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(350)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  // 换到另一个界面，重点看新起的 BGM 是不是还是 0
  await go('/versions', 2400)
  const b = await bgmNow()
  check('D3 主音量 0 时换界面 BGM 仍为静音（原 bug）',
    !!b && b.volume <= 0.001 && !b.paused, `vol=${b?.volume} paused=${b?.paused}`)
  await page.screenshot({ path: `${OUT}/v25-vol-zero.png` })
})

await step('D4 分界面滑杆生效', async () => {
  // 主音量恢复 100，把「版本」那根拉到 30，再去版本页量音量
  await go('/settings', 2200)
  await page.click('.gl-hot >> nth=1')
  await page.waitForTimeout(420)
  await page.evaluate(() => {
    const ins = document.querySelectorAll('.gr-slider input')
    ins[0].value = '100'
    ins[0].dispatchEvent(new Event('input', { bubbles: true }))
    // [3..8] = 主页/版本/共鸣/图鉴/玄学/辉煌，取「版本」= index 4
    ins[4].value = '30'
    ins[4].dispatchEvent(new Event('input', { bubbles: true }))
  })
  await page.waitForTimeout(300)
  const sv = await readSave()
  check('D4 分界面滑杆落盘', near(sv?.settings?.bgmScene?.versions, 0.3, 0.02),
    `bgmScene.versions=${sv?.settings?.bgmScene?.versions}`)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await go('/versions', 2600)
  const b = await bgmNow()
  // 基准 0.34 × 背景音 0.7 × 版本 0.3 × 主音量 1.0 = 0.0714
  check('D4 版本页音量 ≈ 0.34×0.7×0.3×1.0', near(b?.volume, 0.0714, 0.012), `实测 ${b?.volume}`)
  await page.screenshot({ path: `${OUT}/v25-vol-scene.png` })
})

/* ══════════════════════ E 主页音轨 ══════════════════════ */

await step('E 主页动态有音轨 / 静态静音', async () => {
  await go('/', 2600)
  // 浏览器要先有一次真实交互才允许出声，点一下站着不动的地方
  await page.mouse.click(960, 1040)
  /* 开场动画（本次会话第一次进主页时）跑完才进 reveal，音轨是这时才起播的 —— 所以不能死等固定毫秒，直接等 audio 真正开始播（最多 12s，够 boot 5s + reveal 1.9s） */
  await page
    .waitForFunction(() => {
      const a = document.querySelector('.hm-bg-audio')
      return !!a && !a.paused
    }, null, { timeout: 12000 })
    .catch(() => {})
  await page.waitForTimeout(400)
  // ：视频永远 muted，声音改由独立的 <audio> 承担（切回主页不必再点一次）
  const dyn = await page.evaluate(() => {
    const v = document.querySelector('.hm-bg-video')
    const a = document.querySelector('.hm-bg-audio')
    return {
      video: v ? { muted: v.muted, paused: v.paused } : null,
      audio: a ? { vol: Math.round(a.volume * 1000) / 1000, paused: a.paused } : null,
    }
  })
  check('E1 动态背景：video 常驻 muted + 独立音轨在播',
    !!dyn.video && dyn.video.muted === true && !!dyn.audio && dyn.audio.paused === false,
    `video muted=${dyn.video?.muted} / audio vol=${dyn.audio?.vol} paused=${dyn.audio?.paused}`)
  // 切静态
  await page.click('.hm-switch')
  await page.waitForTimeout(600)
  const still = await page.evaluate(() => ({
    video: !!document.querySelector('.hm-bg-video'),
    audio: !!document.querySelector('.hm-bg-audio'),
    img: !!document.querySelector('.hm-bg-img'),
  }))
  check('E2 静态背景不渲染 video / audio（无音轨）',
    !still.video && !still.audio && still.img,
    `video=${still.video} audio=${still.audio} 静态底图=${still.img}`)
  await page.screenshot({ path: `${OUT}/v25-home-still.png` })
})

/* ══════════════════════ F 控制台 ══════════════════════ */

const errs = [...new Set(pageErrors)]
check('F 无控制台报错 / 4xx 资源', errs.length === 0,
  errs.length ? `${errs.length} 条：\n    ${errs.slice(0, 6).join('\n    ')}` : 'clean')

await browser.close()

const fail = results.filter((r) => !r.ok)
console.log('\n──────────────────────────────────────────')
for (const r of fail) console.log(`FAIL  ${r.name}  ${r.detail}`)
console.log(`${fail.length ? '✗' : '✓'} ${results.length - fail.length} / ${results.length} PASS`)
console.log('=== 验证完成 ===')
process.exit(fail.length ? 1 : 0)
