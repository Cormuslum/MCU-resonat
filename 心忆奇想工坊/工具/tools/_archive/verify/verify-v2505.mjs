/** 验收 */
import { chromium } from 'playwright-core'
import { readFileSync } from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
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

/* ═════════════ 静态：manifest ═════════════ */

const man = JSON.parse(readFileSync('public/assets/manifest.json', 'utf8'))
const home = man.ui.home
check('A0 manifest 有 ui.home.bgAudio', typeof home.bgAudio === 'string' && home.bgAudio.endsWith('.ogg'), home.bgAudio)
check('A0 视频与音轨是两个文件', home.bgVideo !== home.bgAudio, `${home.bgVideo} + ${home.bgAudio}`)

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--color-profile=srgb'],
})
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()

const pageErrors = []
const isAbort = (t) => /net::ERR_ABORTED/.test(t) && /\.(webm|ogg|mp3|mp4|webp)\b/.test(t)
const push = (t) => { if (!isAbort(t)) pageErrors.push(t) }
page.on('console', (m) => { if (m.type() === 'error') push(m.text()) })
page.on('pageerror', (e) => push(e.message))
page.on('requestfailed', (r) => push(`reqfail ${r.url()} ${r.failure()?.errorText}`))
page.on('response', (r) => { if (r.status() >= 400) push(`http${r.status()} ${r.url()}`) })

await page.addInitScript(() => {
  // 「本次会话已经看过开屏」
  sessionStorage.setItem('nikki-boot-played', '1')
  if (sessionStorage.getItem('__v2505')) return
  sessionStorage.setItem('__v2505', '1')
  const names = ['星霜之诺', '甜梦泡芙', '月影轻纱', '薄雾花序', '晨光序曲']
  const hist = Array.from({ length: 25 }, (_, i) => ({
    banner: 'banner-2.10-02',
    rarity: i % 7 === 0 ? 5 : i % 3 === 0 ? 4 : 3,
    part: `S0290:分页样张${i}`,
    name: `${names[i % 5]}${i}`,
    star: i % 7 === 0 ? 5 : i % 3 === 0 ? 4 : 3,
    at: Date.now() - (30 - i) * 1000,
  }))
  localStorage.setItem('nikki-resonance-save-v1', JSON.stringify({
    version: 1,
    selectedVersion: '2.10',
    pity: { 'banner-2.10-02': { p5: 12, p4: 3, total: 108 } },
    codex: {},
    milestoneClaimed: {},
    history: hist,
    settings: {
      skipAnim: true,
      volume: 0.7,
      bgm: true,
      bgmVol: 0.7,
      bgmScene: { home: 1, versions: 1, banner: 1, codex: 1, almanac: 1, gloria: 1 },
      uiVol: 0.8,
      skipSingleAnim: true,
      skipReward: true,
      skipOpening: true,
      skipGacha: true,
      lucky: false,
    },
  }))
})

const audioState = () => page.evaluate(() => {
  const a = document.querySelector('.hm-bg-audio')
  const v = document.querySelector('.hm-bg-video')
  return {
    hasAudio: !!a,
    src: a ? (a.getAttribute('src') || '').split('/assets/')[1] : null,
    paused: a ? a.paused : null,
    t: a ? Math.round(a.currentTime * 100) / 100 : null,
    vol: a ? Math.round(a.volume * 1000) / 1000 : null,
    ready: a ? a.readyState : null,
    videoMuted: v ? v.muted : null,
    videoPaused: v ? v.paused : null,
  }
})

/* ═════════════ A 元素结构 ═════════════ */

await page.goto(`${BASE}/#/`)
await page.waitForTimeout(2800)

await step('A 主页音轨是独立元素', async () => {
  const s = await audioState()
  // 起首页是「两条动态背景轮播」（星海 / 伊始），音轨文件名带序号
  check('A1 页面里有 .hm-bg-audio 且指向 bg-audio-N.ogg',
    s.hasAudio && /^ui\/home\/bg-audio-\d\.ogg$/.test(s.src || ''), `${s.src}`)
  check('A2 视频始终 muted（自动播放不会被拦）', s.videoMuted === true && s.videoPaused === false, `muted=${s.videoMuted}`)
  // 冷启动没有任何手势 → 被策略拦住是正常的，等第一次交互补放
  check('A3 音轨音量走 bgmGain(home)（0.34×0.7×0.7×1.4 ≈ 0.233）',
    s.vol !== null && Math.abs(s.vol - 0.233) < 0.02, `${s.vol}`)
})

/* ═════════════ B 切回主页立刻有声 ═════════════ */

await step('B 从二级页返回主页后立刻有声', async () => {
  // ① 先离开主页（真实点击主页右缘入口 → 时隙遗光）
  // 起主页不再有左侧栏，离开主页改走右缘的 `.dy-ver`（真实点击，一样能解锁自动播放）
  await page.locator('.dy-ver').click()
  await page.waitForTimeout(2300)
  const left = await page.evaluate(() => location.hash)
  check('B1 已离开主页', left === '#/versions', left)
  check('B2 离开后音轨元素销毁（主页音不再残留）', (await audioState()).hasAudio === false)

  // ② 点版本页的退出键回主页
  await page.locator('.vr-back').click()
  await page.waitForTimeout(450)
  const at450 = await audioState()
  check('B3 回主页 450ms 内已经开始播放（无需再点一次）',
    at450.hasAudio && at450.paused === false && at450.ready >= 2,
    `paused=${at450.paused} ready=${at450.ready}`)

  await page.waitForTimeout(1400)
  const at1900 = await audioState()
  check('B4 播放进度在增长', at1900.t > at450.t && at1900.t > 0.5, `${at450.t}s → ${at1900.t}s`)
  check('B5 全程没有额外点击（视频与音轨都按预期）',
    at1900.videoMuted === true && at1900.videoPaused === false, `video muted=${at1900.videoMuted}`)
})

/* ═════════════ C 静态 / 动态切换 ═════════════ */

await step('C 切换静态背景时音轨跟着停', async () => {
  await page.click('.hm-switch')
  await page.waitForTimeout(700)
  const still = await audioState()
  check('C1 切静态后音轨元素被移除', still.hasAudio === false)

  await page.click('.hm-switch')
  await page.waitForTimeout(1200)
  const back = await audioState()
  check('C2 切回动态后音轨重新播放', back.hasAudio && back.paused === false && back.t > 0, `t=${back.t}`)
})

/* ═════════════ D/E 抽取记录分页 ═════════════ */

await page.goto(`${BASE}/#/banner`)
await page.waitForTimeout(2600)

const snap = () => page.evaluate(() => ({
  rows: [...document.querySelectorAll('.ph-item .ph-name')].map((e) => e.textContent.trim()),
  noCount: document.querySelectorAll('.ph-no').length,
  num: document.querySelector('.hp-num')?.textContent.replace(/\s+/g, ' ').trim(),
  prevDisabled: document.querySelectorAll('.hp-pg')[0]?.disabled,
  nextDisabled: document.querySelectorAll('.hp-pg')[1]?.disabled,
  listH: (() => { const l = document.querySelector('.ph-list'); return l ? { scroll: l.scrollHeight, client: l.clientHeight } : null })(),
}))

await step('D 抽取记录分页', async () => {
  await page.click('.detail-btn')
  await page.waitForTimeout(480)
  await page.click('.pn.next') // 切到抽取记录
  await page.waitForTimeout(520)

  const s1 = await snap()
  check('D1 单页 10 条', s1.rows.length === 10, `${s1.rows.length} 行`)
  check('D2 25 条 → 3 页', /^1\s*\/\s*3$/.test(s1.num ?? ''), s1.num)
  check('D3 列表不显示序号', s1.noCount === 0)
  check('D4 10 行不打滚动条', s1.listH.scroll <= s1.listH.client + 1, `scroll ${s1.listH.scroll} / client ${s1.listH.client}`)
  check('D5 第一页左键禁用、右键可用', s1.prevDisabled === true && s1.nextDisabled === false)

  await page.click('.hp-pg >> nth=1')
  await page.waitForTimeout(450)
  const s2 = await snap()
  check('D6 翻到第 2 页接续第 1 页', s2.rows.length === 10 && s2.rows[0] === '晨光序曲14' && /^2\s*\/\s*3$/.test(s2.num ?? ''),
    `${s2.num} | 首行「${s2.rows[0]}」`)

  await page.click('.hp-pg >> nth=1')
  await page.waitForTimeout(450)
  const s3 = await snap()
  check('D7 末页只剩 5 条且右键禁用', s3.rows.length === 5 && s3.nextDisabled === true, `${s3.rows.length} 行`)

  await page.click('.hp-pg >> nth=0')
  await page.waitForTimeout(450)
  const s4 = await snap()
  check('D8 左键回上一页', /^2\s*\/\s*3$/.test(s4.num ?? ''), s4.num)

  // 切回概率页再切回来 → 页码重置到 1
  await page.click('.pn.prev')
  await page.waitForTimeout(400)
  await page.click('.pn.next')
  await page.waitForTimeout(500)
  const s5 = await snap()
  check('D9 重进页签后回到第 1 页', /^1\s*\/\s*3$/.test(s5.num ?? ''), s5.num)
})

await step('E 分页按钮造型（32px 圆钮 / 淡蓝底）', async () => {
  const st = await page.evaluate(() => {
    const el = document.querySelector('.hp-pg')
    if (!el) return null
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return { w: Math.round(r.width), h: Math.round(r.height), radius: cs.borderRadius, bg: cs.backgroundImage, color: cs.color }
  })
  if (!st) throw new Error('没找到 .hp-pg')
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(st.bg)
  const [r, g, bl] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0]
  check('E1 32×32 圆形', st.w === 32 && st.h === 32 && st.radius === '50%', `${st.w}×${st.h} ${st.radius}`)
  check('E2 底色偏蓝（淡蓝渐变）', !!m && bl > r + 8 && bl > g, `rgb(${r},${g},${bl})`)
})

check('Z 无控制台报错 / 4xx', pageErrors.length === 0, pageErrors.slice(0, 3).join(' ; ') || 'clean')

await browser.close()
const pass = results.filter((r) => r.ok).length
console.log('\n' + '─'.repeat(44))
console.log(`${pass === results.length ? '✓' : '✗'} ${pass} / ${results.length} PASS`)
process.exit(pass === results.length ? 0 : 1)
