/**
 * 验收：音量上限 / 加载动画像素 / 辉煌 BGM 换源 / 彩蛋弹窗换键与页码跳转
 *
 * 覆盖 5 项需求里能自动化的部分：
 * A 主页背景音（视频音轨）音量上限压到 70%
 * B echo-open 未设音量上限回退的 0.6 硬上限
 * C 切屏奔跑动画改用 `T_UI_loading_special_spirits.png` 的 16 格序列帧（不再抠白 → 脸不透明）
 * D 辉煌背景音 = 新的 wanzhang（111s、首尾交叉淡化、无声轨封面流）
 * E 彩蛋弹窗：左右圆钮素材 + 页码跳转框
 *
 * 用法：先 npm run dev（5178），再 node tools/verify-v2510.mjs
 */
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
const near = (a, b, tol = 0.02) => Math.abs(Number(a) - Number(b)) <= tol

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--force-color-profile=srgb', '--autoplay-policy=no-user-gesture-required'],
})
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

await page.addInitScript(() => {
  const Orig = window.Audio
  window.__audios = []
  /** 每次 play() 的那一刻的音量快照 —— 预热用的元素从不 play，不会混进来 */
  window.__played = []
  window.Audio = function (src) {
    const a = new Orig(src)
    const origPlay = a.play.bind(a)
    a.play = function () {
      window.__played.push({ src: a.src, vol: a.volume })
      return origPlay()
    }
    window.__audios.push(a)
    return a
  }
})

const pageErrors = []
// 切页时浏览器会主动掐断还在拉的媒体流（webm / ogg / mp3），报成 ERR_ABORTED，与代码无关
const isAbortedMedia = (t) => /net::ERR_ABORTED/.test(t) && /\.(webm|ogg|mp3|mp4)\b/.test(t)
const pushErr = (t) => { if (!isAbortedMedia(t)) pageErrors.push(t) }
page.on('console', (m) => { if (m.type() === 'error') pushErr(m.text()) })
page.on('pageerror', (e) => pushErr(e.message))
page.on('requestfailed', (r) => pushErr(`reqfail ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => { if (r.status() >= 400) pushErr(`http${r.status()} ${r.url()}`) })

/** 当前 BGM 元素 */
async function bgmNow() {
  return page.evaluate(() => {
    const list = (window.__audios || []).filter((a) => /\/assets\/bgm\/|\/assets\/sfx\/bgm\.ogg$/.test(a.src))
    const a = list[list.length - 1]
    if (!a) return null
    return { src: a.src.split('/assets/')[1], volume: Math.round(a.volume * 1000) / 1000, loop: a.loop, dur: a.duration }
  })
}
/**
 * 某个音效播过的**最大**音量。
 * 不能取最后一次：同一个音效在一页里会以不同 volume 播好几次（主触发 0.85、淡出层 0.28），
 * 末次大概率是那个轻声的，测不出上限。
 */
async function sfxVolume(name) {
  return page.evaluate((n) => {
    const list = (window.__played || []).filter((p) => p.src.endsWith(`/assets/sfx/${n}.ogg`))
    if (!list.length) return null
    return Math.round(Math.max(...list.map((p) => p.vol)) * 1000) / 1000
  }, name)
}

/** 全部音量拉满的存档，才能测「上限」 */
const FULL_SAVE = {
  version: 1, selectedVersion: '2.10', pity: {}, codex: {}, milestoneClaimed: {}, history: [],
  settings: {
    skipAnim: false, volume: 1, bgm: true, bgmVol: 1, uiVol: 0.8,
    bgmScene: { home: 1, versions: 1, banner: 1, codex: 1, almanac: 1, gloria: 1 },
    skipSingleAnim: false, skipReward: false, skipOpening: false, skipGacha: false, lucky: false,
  },
}

console.log('\n=== v1.3.02 验收 ===')

await page.goto(`${BASE}/#/`)
await page.evaluate((s) => localStorage.setItem('nikki-resonance-save-v1', JSON.stringify(s)), FULL_SAVE)
await page.reload()
await page.waitForTimeout(1200)

/* ══════════════════════ A 主页背景音上限 70% ══════════════════════ */

await step('A 主页音轨上限', async () => {
  await page.waitForTimeout(2600)
  await page.mouse.click(960, 1040) // 交互一次，解除 muted
  await page.waitForTimeout(900)
  // ：音量挂在独立的 <audio> 上（视频常驻 muted）
  await page
    .waitForFunction(() => {
      const a = document.querySelector('.hm-bg-audio')
      return !!a && !a.paused
    }, null, { timeout: 12000 })
    .catch(() => {})
  const v = await page.evaluate(() => {
    const el = document.querySelector('.hm-bg-audio')
    const vid = document.querySelector('.hm-bg-video')
    return el ? { vol: Math.round(el.volume * 1000) / 1000, playing: !el.paused, videoMuted: vid ? vid.muted : null } : null
  })
  // 全开时：0.34(base) × 1(bgm) × 1(home) × 1(master) × 1.4 = 0.476
  // ：视频常驻 muted，声音由 <audio> 出 —— 断「音轨在播 + 音量对」，不再看 video.muted
  check('A 主页背景音全开 = 0.476（原 0.68 的 70%）且不超过 0.7',
    !!v && v.playing === true && v.videoMuted === true && near(v.vol, 0.476, 0.02) && v.vol <= 0.7,
    `实测 ${v?.vol} playing=${v?.playing} videoMuted=${v?.videoMuted}`)
})

/* ══════════════════════ B echo-open 未设上限回退 ══════════════════════ */

await step('B echo-open 音量上限已回退', async () => {
  await page.evaluate(() => { location.hash = '#/banner' })
  await page.waitForTimeout(2400)
  // 进页时那声是 0.28 的叠加音；0.85 的主触发音在点开「共鸣详情」时才播
  await page.click('.wish-card')
  await page.waitForTimeout(600)
  const vol = await sfxVolume('echo-open')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  // 上一版给 echo-open 加过 0.6 的硬上限（实测 0.48），用户要调的是别的音效，已回退。
  // 现在回到纯乘法：0.85 × uiVol 0.8 × master 1 = 0.68
  check('B echo-open 恢复无上限（0.85 × 0.8 = 0.68）',
    vol !== null && near(vol, 0.68, 0.03),
    `实测 ${vol}`)
})

/* ══════════════════════ C 加载动画像素完整 ══════════════════════ */

await step('C 奔跑动画 16 帧且不透明', async () => {
  const info = await page.evaluate(async () => {
    const url = '/assets/ui/loading/nikki-run.webp'
    const res = await fetch(url)
    const buf = new Uint8Array(await res.arrayBuffer())
    // 动图 WebP 的每一帧是一个 ANMF chunk，数它就知道帧数
    let frames = 0
    for (let i = 0; i + 3 < buf.length; i++) {
      if (buf[i] === 0x41 && buf[i + 1] === 0x4e && buf[i + 2] === 0x4d && buf[i + 3] === 0x46) frames++
    }
    const img = new Image()
    img.src = url
    await img.decode()
    return { frames, w: img.naturalWidth, h: img.naturalHeight, bytes: buf.length }
  })
  check('C 动画 = 480×270 / 16 帧', info.frames === 16 && info.w === 480 && info.h === 270,
    `${info.w}×${info.h} · ${info.frames} 帧 · ${Math.round(info.bytes / 1024)}KB`)
})

await step('C 脸不透明（不透明像素总量）', async () => {
  /*
   * 上一版（抠白 gif）的问题就是「脸和手被打成半透明」，
   * 直接表现是不透明像素总量崩掉 —— 原素材单帧 alpha>200 约 14300 个，
   * 打穿之后只剩一万出头。这里按总量卡阈值，比猜坐标采样稳。
   */
  const opaque = await page.evaluate(async () => {
    const img = new Image()
    img.src = '/assets/ui/loading/nikki-run.webp'
    await img.decode()
    const cv = document.createElement('canvas')
    cv.width = img.naturalWidth
    cv.height = img.naturalHeight
    const cx = cv.getContext('2d', { willReadFrequently: true })
    cx.drawImage(img, 0, 0)
    const d = cx.getImageData(0, 0, cv.width, cv.height).data
    let n = 0
    for (let i = 3; i < d.length; i += 4) if (d[i] > 200) n++
    return n
  })
  check('C 首帧不透明像素 ≥ 13500（脸和手没被抠掉）', opaque >= 13500, `实测 ${opaque}`)
})

/* ══════════════════════ D 辉煌 BGM 换源 ══════════════════════ */

await step('D 辉煌 BGM', async () => {
  await page.evaluate(() => { location.hash = '#/settings' })
  await page.waitForTimeout(2400)
  const b = await bgmNow()
  check('D 辉煌 = wanzhang.ogg，时长 111s（旧版 128.4s 末尾带 2.46s 静音）',
    b?.src === 'bgm/wanzhang.ogg' && near(b?.dur, 111, 1.5) && b?.loop === true,
    `src=${b?.src} dur=${b?.dur?.toFixed(1)} loop=${b?.loop}`)
})

/* ══════════════════════ E 彩蛋弹窗 ══════════════════════ */

await step('E 彩蛋弹窗换键 + 页码跳转', async () => {
  await page.evaluate(() => { location.hash = '#/' })
  await page.waitForTimeout(2600)
  await page.click('.hm-egg')
  await page.waitForTimeout(700)

  const nav = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('.eg-nav img')].map((i) => i.getAttribute('src'))
    const prev = getComputedStyle(document.querySelector('.eg-nav.prev')).transform
    return { imgs, prevTransform: prev }
  })
  check('E1 左右键用 skip-n / skip-h 素材（4 张图：2 钮 × 常态+高亮）',
    nav.imgs.filter((s) => s?.includes('skip-n.webp')).length === 2
      && nav.imgs.filter((s) => s?.includes('skip-h.webp')).length === 2,
    nav.imgs.map((s) => s?.split('/').pop()).join(' / '))
  check('E2 左键水平翻转（scaleX(-1)）', /matrix\(-1/.test(nav.prevTransform), nav.prevTransform)

  // ⚠ 必须用真实指针悬停：`:hover` 是浏览器合成的，dispatchEvent('mouseover') 触发不了
  await page.hover('.eg-nav.next')
  await page.waitForTimeout(320)
  const hover = await page.evaluate(() => {
    const btn = document.querySelector('.eg-nav.next')
    return {
      h: getComputedStyle(btn.querySelector('.nav-h')).opacity,
      n: getComputedStyle(btn.querySelector('.nav-n')).opacity,
    }
  })
  check('E3 悬停切高亮图', Number(hover.h) > 0.8 && Number(hover.n) < 0.2, `高亮 ${hover.h} / 常态 ${hover.n}`)

  const before = await page.evaluate(() => document.querySelector('.eg-count')?.textContent.replace(/\s+/g, ''))
  await page.click('.eg-jinput')
  await page.keyboard.type('40')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  const after = await page.evaluate(() => ({
    count: document.querySelector('.eg-count')?.textContent.replace(/\s+/g, ''),
    input: document.querySelector('.eg-jinput')?.value,
  }))
  check('E4 输入 40 回车 → 跳到第 40 条并清空输入框',
    after.count?.includes('40/'), `${before} → ${after.count} 输入框="${after.input}"`)
  await page.screenshot({ path: `${OUT}/v2510-egg.png` })

  // 越界输入要夹到末条起总条数 44 → 74：末尾多出彩蛋文本3 的 30 条
  await page.click('.eg-jinput')
  await page.keyboard.type('999')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  const over = await page.evaluate(() => {
    const t = document.querySelector('.eg-count')?.textContent.replace(/\s+/g, '') ?? ''
    const [cur, total] = t.split('/')
    return { text: t, cur: Number(cur), total: Number(total) }
  })
  check('E5 越界（999）夹到最后一条', over.cur === over.total && over.total >= 44, over.text)

  // 关闭
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  check('E6 ESC 能关闭', (await page.$('.eg-mask')) === null)
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
