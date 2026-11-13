/** 录屏抓图鉴切换特效：`node tools/rec-v24.mjs {codex|loading}` → `.shots/rec-{codex,loading}/*.webm`，之后用 ffmpeg 抽帧分析 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const scene = process.argv[2] || 'codex'
const dir = `.shots/rec-${scene}`
fs.rmSync(dir, { recursive: true, force: true })
fs.mkdirSync(dir, { recursive: true })

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  recordVideo: { dir, size: { width: 1920, height: 1080 } },
})

if (scene === 'codex') {
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/codex`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await page.locator('.mz-tab').nth(1).click()
  await page.waitForTimeout(2200)
} else if (scene === 'loading') {
  await page.goto('about:blank')
  await page.goto(`${BASE}/#/banner`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2000)
  await page.evaluate(() => (location.hash = '#/'))
  await page.waitForTimeout(2200)
}

await page.close()
await browser.close()
console.log(fs.readdirSync(dir).map((f) => `${dir}/${f}`).join('\n'))
