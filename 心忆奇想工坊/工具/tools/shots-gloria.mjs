/**
 * 辉煌心光截图巡检（v1.3.00）
 *
 * 产出：
 *   .shots/gl-idle.png      首页（图标全隐）
 *   .shots/gl-hover.png     悬停「音量」后的金环
 *   .shots/gl-panel-0~3.png 四类面板（评分板容器）
 *   .shots/gl-confirm.png   二级确认条
 */
import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const b = await chromium.launch({ executablePath: CHROME, headless: true })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
p.on('pageerror', (e) => console.log('PAGEERR', e.message))
p.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()))

const SAVE = {
  version: 1,
  selectedVersion: '2.10',
  pity: { 'banner-2.10-02': { p5: 7, p4: 3, total: 47 }, 'banner-1.0-03': { p5: 1, p4: 1, total: 23 } },
  codex: Object.fromEntries(
    Array.from({ length: 126 }, (_, i) => ['S00' + i + ':件' + i, { count: 1, firstAt: 1 }]).concat(
      Array.from({ length: 38 }, (_, i) => ['reading:r' + i, { count: 1, firstAt: 1 }]),
    ),
  ),
  milestoneClaimed: { 'banner-2.10-02': [20, 40] },
  history: Array.from({ length: 70 }, (_, i) => ({ banner: 'banner-2.10-02', rarity: 3, part: 'p' + i, at: i })),
  settings: { skipAnim: false, volume: 0.7, bgm: true, bgmVol: 0.55, uiVol: 0.8, skipSingleAnim: true, skipReward: false, skipOpening: true, skipGacha: false, lucky: false },
}

await p.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded' })
await p.evaluate(([k, v]) => {
  localStorage.clear()
  localStorage.setItem(k, JSON.stringify(v))
  localStorage.setItem('nikki-almanac-uid-v1', 'u-g')
}, ['nikki-resonance-save-v1', SAVE])
await p.goto('about:blank')
await p.goto('http://localhost:5178/#/settings', { waitUntil: 'networkidle' })
await p.waitForTimeout(2200)
// 冻结视频，截图才可比
await p.evaluate(() => document.querySelector('.gl-bg').pause())
await p.screenshot({ path: '.shots/gl-idle.png' })
console.log('video', await p.evaluate(() => {
  const v = document.querySelector('.gl-bg')
  return v ? { w: v.videoWidth, h: v.videoHeight, t: v.currentTime.toFixed(1), src: v.currentSrc.split('/').pop() } : null
}))

await p.hover('.gl-hot >> nth=1')
await p.waitForTimeout(360)
await p.screenshot({ path: '.shots/gl-hover.png' })
await p.mouse.move(300, 980)

for (const [i, name] of ['演出', '音量', '快捷', '存档'].entries()) {
  await p.click(`.gl-hot >> nth=${i}`)
  await p.waitForTimeout(460)
  await p.screenshot({ path: `.shots/gl-panel-${i}.png` })
  if (i < 3) {
    await p.keyboard.press('Escape')
    await p.waitForTimeout(300)
  }
}
await p.click('.gm-row >> nth=4 >> .gm-btn')
await p.waitForTimeout(460)
await p.screenshot({ path: '.shots/gl-confirm.png' })
await b.close()
