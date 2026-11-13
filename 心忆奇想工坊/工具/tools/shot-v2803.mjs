import { chromium } from 'playwright-core'
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()) })

await page.goto('http://localhost:5199/', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
await page.screenshot({ path: '.shots/v2803-updater-home.png' })

// 点顶栏的下载按钮 → 应该切到 DLC 面板
await page.click('#btn-download')
await page.waitForTimeout(1200)
await page.screenshot({ path: '.shots/v2803-updater-dlc.png' })

const info = await page.evaluate(() => ({
  title: document.querySelector('#job-title')?.textContent,
  hasKind: !!document.querySelector('#dlc-kind'),
  hasRemote: !!document.querySelector('#dlc-remote'),
  tabs: [...document.querySelectorAll('.dlc-tab')].map((b) => b.textContent.trim()),
  groups: [...document.querySelectorAll('.group-head .gt')].map((b) => b.textContent.trim()),
}))
console.log(JSON.stringify(info, null, 1))

// 切到上传 tab
await page.click('.dlc-tab[data-tab="upload"]')
await page.waitForTimeout(600)
await page.screenshot({ path: '.shots/v2803-updater-upload.png' })

// 顶栏上传按钮
await page.click('#btn-upload')
await page.waitForTimeout(600)
const tab2 = await page.evaluate(() => document.querySelector('.dlc-tab.on')?.textContent.trim())
console.log('upload tab active:', tab2)

console.log('errors', errs.slice(0, 5))
await browser.close()
