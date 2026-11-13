/** 开发期截图 / 巡检脚本（不打包进应用）：`node tools/shot.mjs {banner|codex|gacha}`，`gacha` 会先点十连再等演出。依赖本机 Chrome + playwright-core，不下载浏览器 */
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const OUT = '.shots'

const target = process.argv[2] || 'banner'

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`)
})
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) => errors.push(`[failed] ${r.url()} :: ${r.failure()?.errorText}`))
page.on('response', (r) => {
  if (r.status() >= 400) errors.push(`[${r.status()}] ${r.url()}`)
})

async function goto(hash) {
  await page.goto(`${BASE}/#/${hash}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1200)
}

if (target === 'banner') {
  await goto('banner')
  await page.screenshot({ path: `${OUT}/banner.png` })

  // 深忆奖励抽屉
  await page.click('.ms-entry')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/banner-milestone.png` })
  await page.click('.echo-x')
  await page.waitForTimeout(400)

  // 套装详情
  await page.click('.set-card')
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/banner-set.png` })
} else if (target === 'codex') {
  await goto('codex')
  await page.screenshot({ path: `${OUT}/codex.png` })
} else if (target === 'gacha') {
  await goto('banner')
  await page.click('.pull-btn.ten')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/gacha-anim.png` })
  await page.click('.skip-btn')
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${OUT}/gacha-result.png` })
  // 点第一张牌看详情
  await page.click('.rcard')
  await page.waitForTimeout(600)
  await page.screenshot({ path: `${OUT}/gacha-detail.png` })
} else if (target === 'pv') {
  await goto('banner')
  await page.click('.pv-toggle')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/pv-panel.png` })
} else if (target === 'settings') {
  await goto('banner')
  await page.click('.gear')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/settings.png` })
} else if (target === 'single') {
  await goto('banner')
  await page.click('.pull-btn.single')
  await page.waitForTimeout(800)
  await page.click('.skip-btn')
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${OUT}/gacha-single.png` })
} else if (target === 'soak') {
  // 连续十连，把图鉴抽满一部分，再截图图鉴页
  await goto('banner')
  await page.click('.pull-btn.ten')
  for (let i = 0; i < 7; i++) {
    await page.waitForTimeout(600)
    await page.click('.skip-btn')
    await page.waitForTimeout(1600)
    await page.click('.rf-again.ten')
  }
  await page.waitForTimeout(600)
  await page.click('.skip-btn')
  await page.waitForTimeout(1800)
  await page.screenshot({ path: `${OUT}/soak-result.png` })
  await goto('codex')
  await page.screenshot({ path: `${OUT}/codex-soak.png` })
  // 点第一个部件看详情
  await page.click('.tile')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/codex-detail.png` })
  // 切到 3★ 通用散件
  const groups = await page.$$('.grp')
  if (groups[groups.length - 1]) {
    await groups[groups.length - 1].click()
    await page.waitForTimeout(600)
    await page.screenshot({ path: `${OUT}/codex-stars3.png` })
  }
}

if (errors.length) {
  console.log('=== 控制台问题 ===')
  for (const e of [...new Set(errors)].slice(0, 40)) console.log(e)
} else {
  console.log('=== 控制台干净 ===')
}

await browser.close()
