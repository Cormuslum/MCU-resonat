/** 验收：动态背景（首页轮播 / 服装阁去音轨 / 缺失兜底） */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SIM = 'http://127.0.0.1:5178'
const ROOT = process.cwd()
const ASSETS = path.join(ROOT, 'public', 'assets')

let pass = 0
let fail = 0
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`) }
}

const manifest = JSON.parse(fs.readFileSync(path.join(ASSETS, 'manifest.json'), 'utf8'))
const SAVE = {
  version: 1, selectedVersion: '0.1', pity: {}, codex: {},
  milestoneClaimed: {}, history: [], settings: { skipAnim: true },
}

/* ───────────────────────── A/B：首页轮播 ───────────────────────── */
console.log('\n════ A/B 首页动态背景轮播 ════')

// F 段要测音轨相位，必须放行自动播放：冷启动直接落在主页时没有任何用户手势
// 默认策略会把 <audio> 拦下来，drift 就永远是 null
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const ROUNDS = 12
const hits = {}
let playable = 0

for (let i = 0; i < ROUNDS; i++) {
  // 每轮一个全新 context = 干净的 sessionStorage，等于「冷启动一次」
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addInitScript((s) => {
    localStorage.setItem('nikki-resonance-save-v1', JSON.stringify(s))
  }, SAVE)
  const page = await ctx.newPage()
  await page.goto(`${SIM}/#/`, { waitUntil: 'domcontentloaded' })
  // 等到「有尺寸 且 真的开始播」为止
  // 还没进 playing 的那一刻就返回，读到的 paused 是 true
  await page.waitForFunction(
    () => {
      const v = document.querySelector('.hm-bg-video')
      return !!v && v.videoWidth > 0 && !v.paused
    },
    { timeout: 25000 },
  ).catch(() => {})
  await page.waitForTimeout(300)
  const s = await page.evaluate(() => {
    const v = document.querySelector('.hm-bg-video')
    if (!v) return null
    return {
      src: (v.getAttribute('src') || '').split('/assets/')[1] || '',
      w: v.videoWidth,
      paused: v.paused,
      muted: v.muted,
    }
  })
  if (s?.src) {
    hits[s.src] = (hits[s.src] || 0) + 1
    if (s.w > 0 && !s.paused && s.muted) playable++
  }
  await ctx.close()
}

const keys = Object.keys(hits)
ok(`首页有 2 条动态背景（实际 ${keys.length} 条）`, keys.length === 2, keys.join(' / '))
ok(`12 次冷启动都命中了某一条（${ROUNDS - Object.values(hits).reduce((a, b) => a + b, 0)} 次空）`,
  Object.values(hits).reduce((a, b) => a + b, 0) === ROUNDS)
const counts = keys.map((k) => hits[k])
ok('两条都出现过（随机确实在轮）', counts.every((n) => n > 0), JSON.stringify(hits))
ok('比例不畸形（每条至少占 1/6）', counts.every((n) => n >= ROUNDS / 6), JSON.stringify(hits))
ok(`每次都能解码播放且 muted（${playable}/${ROUNDS}）`, playable === ROUNDS)

/* ───────────────────────── C：服装阁视频无音轨 ───────────────────────── */
console.log('\n════ C 服装阁动态背景去音轨 ════')

const vids = manifest.banners.filter((b) => b.assets?.bgVideo).map((b) => b.assets.bgVideo)
ok(`manifest 里已接入动态背景的阁（${vids.length} 个）`, vids.length > 0)

const withAudio = []
for (const rel of vids) {
  const p = path.join(ASSETS, rel)
  if (!fs.existsSync(p)) { withAudio.push(`${rel}（文件缺失）`); continue }
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a',
    '-show_entries', 'stream=index', '-of', 'csv=p=0', p], { encoding: 'utf8' })
  if ((r.stdout || '').trim()) withAudio.push(rel)
}
ok('全部视频都没有音轨', withAudio.length === 0, withAudio.slice(0, 5).join(', '))

const homeVids = manifest.ui?.home?.bgVideos || []
const homeAudio = homeVids.filter((v) => v.audio).map((v) => v.audio)
const homeAudioMiss = homeAudio.filter((a) => !fs.existsSync(path.join(ASSETS, a)))
ok(`首页 ${homeVids.length} 条视频各配了独立音轨`, homeAudio.length === homeVids.length,
  homeVids.map((v) => `${v.video}+${v.audio}`).join(' | '))
ok('首页音轨文件都在', homeAudioMiss.length === 0, homeAudioMiss.join(', '))

/* 首帧 poster：视频几十 MB，解码出首帧前那块区域是黑的 */
const posterMiss = homeVids.filter((v) => !v.poster || !fs.existsSync(path.join(ASSETS, v.poster)))
ok('首页每条都带首帧 poster', posterMiss.length === 0,
  homeVids.map((v) => v.poster || '（无）').join(' | '))

/* 星海那条原始画面是 1920×800，转码时应裁掉而不是铺回来 */
const homeH = homeVids.map((v) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=height', '-of', 'csv=p=0', path.join(ASSETS, v.video)], { encoding: 'utf8' })
  return Number((r.stdout || '0').trim())
})
ok('首页视频没有被降分辨率（高度 ≥720）', homeH.every((h) => h >= 720), homeH.join(' / '))
ok('星海那条的黑边已裁掉（高度 <1080）', homeH[0] > 0 && homeH[0] < 1080, `height=${homeH[0]}`)

/* ───────────────────────── D：缺失兜底 ───────────────────────── */
console.log('\n════ D 视频缺失兜底 ════')

// D1：首页第一条 404 → 应该换到另一条，而不是黑屏
{
  const first = homeVids[0]?.video
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addInitScript((s) => {
    localStorage.setItem('nikki-resonance-save-v1', JSON.stringify(s))
    sessionStorage.setItem('nikki-home-bg-pick', '0')   // 强制先抽第一条
  }, SAVE)
  await ctx.route(`**/${path.basename(first)}`, (route) => route.fulfill({ status: 404, body: '' }))
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(`${SIM}/#/`, { waitUntil: 'domcontentloaded' })
  // 起开屏阶段不挂载视频
  await page.waitForFunction(
    () => (document.querySelector('.hm-bg-video')?.videoWidth || 0) > 0,
    { timeout: 30000 },
  ).catch(() => {})
  await page.waitForTimeout(600)
  const s = await page.evaluate(() => {
    const v = document.querySelector('.hm-bg-video')
    return {
      src: (v?.getAttribute('src') || '').split('/assets/')[1] || '',
      w: v?.videoWidth || 0,
      still: !!document.querySelector('.hm-bg-img'),
    }
  })
  ok('D1 第一条 404 后换到了另一条动态背景', s.src === homeVids[1]?.video && s.w > 0, s.src || '（无 video）')
  ok('D1 没有抛页面异常', errs.length === 0, errs.slice(0, 2).join(' / '))
  await ctx.close()
}

// D2：两条首页视频都 404 → 落静态底图
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addInitScript((s) => {
    localStorage.setItem('nikki-resonance-save-v1', JSON.stringify(s))
  }, SAVE)
  for (const v of homeVids) {
    await ctx.route(`**/${path.basename(v.video)}`, (route) => route.fulfill({ status: 404, body: '' }))
  }
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(`${SIM}/#/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(4500)
  const still = await page.evaluate(() => {
    const im = document.querySelector('.hm-bg-img')
    return { has: !!im, w: im?.naturalWidth || 0 }
  })
  ok('D2 两条都 404 → 落到静态底图', still.has && still.w > 0, `naturalWidth=${still.w}`)
  ok('D2 没有抛页面异常', errs.length === 0, errs.slice(0, 2).join(' / '))
  await ctx.close()
}

// D3：服装阁的视频 404 → 落该阁静态背景
{
  const withVid = manifest.banners.find((b) => b.assets?.bgVideo)
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addInitScript((s) => {
    localStorage.setItem('nikki-resonance-save-v1', JSON.stringify(s))
  }, SAVE)
  await ctx.route(`**/${path.basename(withVid.assets.bgVideo)}`, (route) => route.fulfill({ status: 404, body: '' }))
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(`${SIM}/#/banner`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pool-item', { timeout: 25000 }).catch(() => {})
  // 点开这座阁
  const idx = await page.evaluate((n) =>
    [...document.querySelectorAll('.pool-item .pi-name')].findIndex((e) => e.textContent.trim() === n),
  withVid.name)
  if (idx >= 0) await page.locator('.pool-item').nth(idx).click()
  await page.waitForTimeout(3500)
  const s = await page.evaluate(() => {
    const im = document.querySelector('.bg-still')
    return {
      hasStill: !!im,
      w: im?.naturalWidth || 0,
      video: !!document.querySelector('video.bg-video'),
    }
  })
  ok(`D3 服装阁视频 404 → 落静态背景（${withVid.name}）`, s.hasStill && s.w > 0, `naturalWidth=${s.w} video=${s.video}`)
  ok('D3 没有抛页面异常', errs.length === 0, errs.slice(0, 2).join(' / '))
  await ctx.close()
}

/* ───────────────────────── E：开屏动画期间不抢跑 ───────────────────────── */
console.log('\n════ E 开屏动画与背景起播时机 ════')

{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  await ctx.addInitScript((s) => {
    localStorage.setItem('nikki-resonance-save-v1', JSON.stringify(s))
    // 关掉「跳过开屏」才能稳定观察到 boot 阶段
    s.settings = { skipAnim: false }
  }, SAVE)
  const page = await ctx.newPage()
  await page.goto(`${SIM}/#/`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(900)
  const during = await page.evaluate(() => ({
    hasVideo: !!document.querySelector('.hm-bg-video'),
    booting: !document.querySelector('.home')?.classList.contains('is-reveal'),
  }))
  ok('E1 开屏动画期间不挂载背景视频', !during.hasVideo && during.booting,
    `booting=${during.booting} video=${during.hasVideo}`)

  await page.waitForSelector('.home.is-reveal', { timeout: 40000 }).catch(() => {})
  await page.waitForTimeout(700)
  const after = await page.evaluate(() => {
    const v = document.querySelector('.hm-bg-video')
    return v ? { ct: v.currentTime, paused: v.paused } : null
  })
  ok('E2 开屏结束后背景从头播（currentTime < 1.5s）',
    !!after && after.ct < 1.5, after ? `currentTime=${after.ct.toFixed(2)}s` : '（无 video）')
  await ctx.close()
}

/* ───────────────────────── F：音画同步 ─────────────────────────
   视频是 muted 播的、声音走独立 <audio>。两条流必须
   ① 时长一致（管线把音轨按视频同一区间裁）；
   ② 相位不随循环累积（前端每 200ms 校正一次）。
   星海那条视频剪掉了首尾黑屏（120s → 116.5s），早期音轨没跟着剪，
   每绕一圈就差 3.6 秒 —— 这是「长时间停留后不同步」的根因。 */
console.log('\n════ F 音画同步 ════')

{
  const home = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/manifest.json'), 'utf8'))
    .ui.home
  const list = home.bgVideos || (home.bgVideo ? [{ video: home.bgVideo, audio: home.bgAudio }] : [])
  const dur = (rel) => {
    const p = path.join(ROOT, 'public/assets', rel)
    if (!fs.existsSync(p)) return 0
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1', p], { encoding: 'utf8' })
    const m = /duration=([\d.]+)/.exec(r.stdout || '')
    return m ? parseFloat(m[1]) : 0
  }
  const bad = list.filter((v) => v.audio)
    .map((v) => ({ v, d: Math.abs(dur(v.video) - dur(v.audio)) }))
    .filter((x) => x.d > 0.35)
  ok('F1 每条音轨与视频等长（差 ≤ 0.35s）',
    bad.length === 0,
    bad.length ? bad.map((x) => `${x.v.video} 差 ${x.d.toFixed(2)}s`).join(' / ')
      : list.filter((v) => v.audio).map((v) => `${dur(v.video).toFixed(2)}s`).join(' / '))

  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  await ctx.addInitScript((s) => {
    localStorage.setItem('nikki-resonance-save-v1',
      JSON.stringify({ ...s, settings: { ...s.settings, skipOpening: true } }))
    sessionStorage.setItem('nikki-home-bg-pick', '0')
  }, SAVE)
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  const drift = () => page.evaluate(() => {
    const v = document.querySelector('.hm-bg-video')
    const a = document.querySelector('.hm-bg-audio')
    if (!v || !a || v.paused || a.paused) return null
    return +(a.currentTime - v.currentTime).toFixed(3)
  })

  await page.goto(`${SIM}/#/`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => {
    const v = document.querySelector('.hm-bg-video')
    return v && v.readyState >= 2 && v.currentTime > 0.2
  }, { timeout: 45000 }).catch(() => {})
  await page.waitForTimeout(1500)
  const d1 = await drift()
  ok('F2 起播 1.5s 后音画偏差 < 0.25s', d1 !== null && Math.abs(d1) < 0.25,
    d1 === null ? '（音轨没起来）' : `${d1}s`)

  // 跳到片尾，自然跨过一次 loop，看相位有没有被带进下一圈
  await page.evaluate(() => {
    const v = document.querySelector('.hm-bg-video')
    if (v) v.currentTime = Math.max(0, v.duration - 2.2)
  })
  await page.waitForTimeout(4000)
  const d2 = await drift()
  ok('F3 跨循环后偏差不累积（< 0.25s）', d2 !== null && Math.abs(d2) < 0.25,
    d2 === null ? '（音轨没起来）' : `${d2}s`)
  ok('F3 没有抛页面异常', errs.length === 0, errs.slice(0, 2).join(' / '))
  await ctx.close()
}

await browser.close()

console.log(`\n结果：${pass} 过 / ${fail} 挂`)
process.exit(fail ? 1 : 0)
