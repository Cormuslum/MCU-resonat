/** 彩蛋弹窗截图巡检 */
import { chromium } from 'playwright-core'
const b = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true })
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } })
p.on('pageerror', (e) => console.log('PAGEERR', e.message))
p.on('console', (m) => m.type() === 'error' && console.log('CONSOLE', m.text()))
await p.goto('http://localhost:5178/', { waitUntil: 'domcontentloaded' })
await p.evaluate(() => {
  localStorage.clear()
  localStorage.setItem('nikki-resonance-save-v1', JSON.stringify({ version: 1, selectedVersion: '2.10', pity: {}, codex: {}, milestoneClaimed: [], history: [],
    settings: { skipAnim: false, volume: 0.7, bgm: true, bgmVol: 0.7, uiVol: 0.8, skipSingleAnim: false, skipReward: false, skipOpening: true, skipGacha: false, lucky: false } }))
})
await p.goto('about:blank')
await p.goto('http://localhost:5178/#/', { waitUntil: 'networkidle' })
await p.waitForTimeout(2600)
await p.screenshot({ path: '.shots/egg-home.png' })
const hot = await p.evaluate(() => { const r = document.querySelector('.hm-egg').getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height } })
console.log('hot', hot)
await p.mouse.click(hot.x + 100, hot.y + 50)
await p.waitForTimeout(700)
await p.screenshot({ path: '.shots/egg-1.png' })
console.log('panel', await p.evaluate(() => {
  const st = document.querySelector('.design').getBoundingClientRect(); const k = st.width / 1920
  const e = document.querySelector('.eg-panel'); const r = e.getBoundingClientRect()
  const sc = document.querySelector('.eg-scroll')
  return { x: +((r.left - st.left) / k).toFixed(0), y: +((r.top - st.top) / k).toFixed(0), w: +r.width.toFixed(0), h: +r.height.toFixed(0),
    scroll: [sc.scrollHeight, sc.clientHeight], text: document.querySelector('.eg-text').textContent.slice(0, 20) }
}))
// 切下一条
await p.click('.eg-nav.next')
await p.waitForTimeout(400)
await p.screenshot({ path: '.shots/egg-2.png' })
console.log('after next', await p.evaluate(() => [document.querySelector('.eg-text').className, document.querySelector('.eg-count b').textContent]))
// 滚到底
await p.evaluate(() => { const s = document.querySelector('.eg-scroll'); s.scrollTop = s.scrollHeight })
await p.waitForTimeout(300)
await p.screenshot({ path: '.shots/egg-scroll.png' })
// 点空白关闭
await p.mouse.click(200, 200)
await p.waitForTimeout(400)
console.log('closed', await p.evaluate(() => !document.querySelector('.eg-panel')))
await b.close()
