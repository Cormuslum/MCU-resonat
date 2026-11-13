/** 验收截图：`node tools/shot-v24.mjs <场景>` */
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const OUT = '.shots'
const scene = process.argv[2] || 'banner'

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
const errors = []
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console] ${m.text()}`)
})

async function goto(hash) {
  await page.goto('about:blank')
  await page.goto(`${BASE}/#${hash}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1800)
}

if (scene === 'banner') {
  await goto('/banner')
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/v24-banner.png` })
  // 左下角套名区域特写
  await page.screenshot({ path: `${OUT}/v24-plates.png`, clip: { x: 0, y: 900, width: 1300, height: 180 } })
} else if (scene === 'banner-std') {
  await goto('/banner')
  // 切到常驻池（列表第 6 个）
  await page.click('.pool-item:nth-child(6)')
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/v24-banner-std.png` })
  await page.screenshot({ path: `${OUT}/v24-plates-std.png`, clip: { x: 0, y: 900, width: 1300, height: 180 } })
} else if (scene === 'rail') {
  await goto('/banner')
  await page.screenshot({ path: `${OUT}/v24-rail-hidden.png` })
  await page.mouse.move(40, 540)
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${OUT}/v24-rail-open.png` })
  await page.screenshot({ path: `${OUT}/v24-rail-crop.png`, clip: { x: 0, y: 300, width: 400, height: 500 } })
} else if (scene === 'home') {
  await goto('/')
  // 跳过开机动画：标记本次会话已播过，再重载
  await page.evaluate(() => sessionStorage.setItem('nikki-boot-played', '1'))
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3200)
  await page.screenshot({ path: `${OUT}/v24-home.png` })
  // 切到静态背景看双 LOGO 是否恢复
  await page.click('.hm-switch')
  await page.waitForTimeout(1400)
  await page.screenshot({ path: `${OUT}/v24-home-still.png` })
} else if (scene === 'loading') {
  await goto('/banner')
  // 走侧栏跳主页 → 触发加载层，抓 600ms 时的进度
  await page.evaluate(() => {
    location.hash = '#/'
  })
  await page.waitForTimeout(620)
  await page.screenshot({ path: `${OUT}/v24-loading.png` })
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${OUT}/v24-loading2.png` })
} else if (scene === 'codex-swap') {
  await goto('/codex')
  await page.screenshot({ path: `${OUT}/v24-codex.png` })
  // 点顶栏「伊赞之土」选项卡，抓破碎/重构中间帧
  await page.locator('.mz-tab').nth(1).click()
  await page.waitForTimeout(180)
  await page.screenshot({ path: `${OUT}/v24-codex-swap-1.png` })
  await page.waitForTimeout(220)
  await page.screenshot({ path: `${OUT}/v24-codex-swap-2.png` })
  await page.waitForTimeout(340)
  await page.screenshot({ path: `${OUT}/v24-codex-swap-3.png` })
}

if (errors.length) {
  console.log('--- 控制台错误 ---')
  for (const e of [...new Set(errors)].slice(0, 12)) console.log(e)
} else {
  console.log('无控制台错误')
}
await browser.close()
