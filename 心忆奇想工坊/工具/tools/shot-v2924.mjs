/**
 * 真机截图（一次性验收用）：① 版本页用临时静态服务（5188）serve `dist/`，展开折叠的大版本读 26 个版本号；
 * ② 工坊拓展包多选，直接渲染工坊 CSS 片段看四行四列 + 滚动条。
 * 用法：先 `npm run build`，再起 `python -m http.server 5188 --directory dist --bind 127.0.0.1`，然后 `node tools/shot-v2924.mjs`。
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const ROOT = process.cwd()
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SIM = 'http://127.0.0.1:5188/#/versions'
const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })

/* ── 1. 版本页 ── */
{
  const p = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
  await p.goto(SIM, { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForSelector('.vr-minor', { timeout: 30000 })
  await p.evaluate(() => document.querySelectorAll('.vr-minors').forEach((el) => el.classList.add('open')))
  // 左栏本身是固定高度 + 内部滚动，全页截图只能拍到前 6 个版本。
  // 验收用：临时放开高度，把 26 张版本卡完整摊开（只在截图进程里生效，不改源码）。
  await p.addStyleTag({ content: `
    .vr-rail { height: auto !important; max-height: none !important; overflow: visible !important; }
    .vr-minors { max-height: none !important; overflow: visible !important; }
    body, #app { overflow: visible !important; height: auto !important; }
  ` })
  await p.waitForTimeout(400)
  const rows = await p.$$eval('.vr-minor', (els) => els.map((el) => ({
    v: el.querySelector('.vn-ver b')?.textContent?.trim() || '',
    name: el.querySelector('.vn-name .vn-run b')?.textContent?.trim() || '',
  })))
  const want = { '1.1': '流星季', '1.10': '丰收季', '2.1': '若生命如诗', '2.10': '金羽的裁决' }
  const got = Object.fromEntries(rows.filter((r) => r.v in want).map((r) => [r.v, r.name]))
  const good = rows.length === 26 && Object.entries(want).every(([v, n]) => got[v] === n)
  console.log(`版本页：${rows.length} 个版本 | 1.1=${got['1.1']} 1.10=${got['1.10']} `
    + `2.1=${got['2.1']} 2.10=${got['2.10']} → ${good ? 'PASS' : 'FAIL'}`)
  // 左栏是固定高度 + 内部滚动，一张页面图拍不全 26 张卡。
  // 额外出一张「真机 DOM 读数」核对图：数据全部来自上面读到的 rows，不另造数据。
  const shot = path.join(ROOT, 'tools', 'v2924-versions.png')
  const hl = new Set(['1.1', '1.10', '2.1', '2.10'])
  const cells = rows.map((r) => `<div class="cell${hl.has(r.v) ? ' hot' : ''}">
      <span class="v">${r.v}</span><span class="n">${r.name}</span></div>`).join('')
  const p2 = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 1 })
  await p2.setContent(`<style>
    body{margin:0;padding:28px 32px;background:#faf6ec;color:#3b2f22;font-family:"Microsoft YaHei",sans-serif}
    h1{font-size:20px;margin:0 0 6px} .sub{font-size:13px;color:#8a7658;margin-bottom:18px}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
    .cell{display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid #e2d6bd;border-radius:7px;background:#fffdf7}
    .cell.hot{border:2px solid #c2603f;background:#fff0e6}
    .v{font-weight:700;color:#8a6a3a;min-width:38px} .n{font-size:14px}
    .tag{margin-top:16px;font-size:13px;color:#8a7658}
  </style><h1>版本页 · 真机 DOM 读数（${rows.length} 个版本）</h1>
  <div class="sub">红色描边 = 本次修复的四个易撞号：1.1 / 1.10 / 2.1 / 2.10</div>
  <div class="grid">${cells}</div>
  <div class="tag">读取自 http://127.0.0.1:5188/#/versions 的 .vr-minor，构建产物 dist/</div>`)
  await p2.screenshot({ path: shot, fullPage: true })
  console.log('截图 ->', shot)
  await p2.close()
  await p.close()
  if (!good) process.exitCode = 1
}

/* ── 2. 工坊拓展包多选（4×4 + 滚动） ── */
{
  const css = fs.readFileSync(path.join(ROOT, 'updater/web/style.css'), 'utf8')
  const p = await browser.newPage({ viewport: { width: 1100, height: 820 }, deviceScaleFactor: 1 })
  const picks = Array.from({ length: 24 }, (_, i) =>
    `<label class="dlc-pick"><input type="checkbox"${i < 3 ? ' checked' : ''}/><span>自建服装阁候选 ${i + 1}</span></label>`).join('')
  await p.setContent(`<style>body{margin:24px;background:#faf6ec}${css}</style>
    <div style="width:760px"><div class="dlc-picks">
      <div class="dlc-pick-bar"><button class="link">全选</button><button class="link">清空</button>
        <span class="hint">已选 3 / 24 项</span></div>
      <div class="dlc-pick-list">${picks}</div></div></div>`)
  await p.waitForTimeout(200)
  const shot = path.join(ROOT, 'tools', 'v2924-dlc-picks.png')
  await p.locator('.dlc-picks').screenshot({ path: shot })
  console.log('截图 ->', shot)
  // 再滚到底截一张，证明多出来的候选确实能靠滚动看到
  await p.evaluate(() => { const el = document.querySelector('.dlc-pick-list'); el.scrollTop = el.scrollHeight })
  await p.waitForTimeout(200)
  const shot2 = path.join(ROOT, 'tools', 'v2924-dlc-picks-scrolled.png')
  await p.locator('.dlc-picks').screenshot({ path: shot2 })
  console.log('截图 ->', shot2)
  await p.close()
}

await browser.close()
