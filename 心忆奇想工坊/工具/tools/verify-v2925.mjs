/**
 * v2.0.07 验收（本次两项前端修复，纯离线，不依赖 5178/5199 守护）
 *
 *   A. 信封正文粗体：`**…**` 必须渲染成 <b>，且正文里不再出现字面 "**"
 *   B. 服装图鉴雷达：未选部件=套装整体五维之和；选中部件=该部件自己的五维
 *      （用真实 manifest 的 stats 复算多边形，与页面 .rd-area 实测对比）
 *
 * 用 `dist`（已 build）静态托管 + 本机 Chrome 无头。改完前端后先 `npm run build`。
 */
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SIM = 'http://127.0.0.1:5189'
const SAVE_KEY = 'nikki-resonance-save-v1'
const ROOT = process.cwd()
const DIST = path.join(ROOT, 'dist')
const m = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/manifest.json'), 'utf8'))

/* 自带 SPA 静态服务：dist 内真实文件优先，其余回退到 index.html（否则 /codex/clothes 深链 404） */
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4',
  '.webm': 'video/webm', '.ico': 'image/x-icon',
}
const server = http.createServer((req, res) => {
  const u = decodeURIComponent((req.url || '/').split('?')[0])
  let f = path.join(DIST, u)
  if (!fs.existsSync(f) || !fs.statSync(f).isFile()) f = path.join(DIST, 'index.html')
  const ext = path.extname(f).toLowerCase()
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
await new Promise((r) => server.listen(5189, '127.0.0.1', r))

const pass = []
const fail = []
function ok(name, cond, extra = '') {
  if (cond) pass.push(name)
  else fail.push(`${name}${extra ? '  ← ' + extra : ''}`)
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? `  (${extra})` : ''}`)
}

/* ───── 真实套装数据：版本 0.1 / S0062 心愿金蔷薇 ───── */
const banner = (m.banners || []).find((b) => b.version === '0.1')
const set = (banner?.sets || []).find((s) => s.id === 'S0062')
const DIMS = ['典雅', '清新', '甜美', '性感', '帅气']
function expectedRadar(parts) {
  const sum = {}
  for (const d of DIMS) sum[d] = 0
  for (const p of parts) for (const d of DIMS) sum[d] += Number(p.stats?.[d] ?? 0)
  const vals = DIMS.map((d) => sum[d])
  const max = Math.max(1, ...vals)
  const cx = 120, cy = 118, R = 92
  return vals.map((v, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180
    const rr = R * (v / max)
    return `${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`
  }).join(' ')
}

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})

/* ═══════════════ A. 信封粗体 ═══════════════ */
console.log('\n════ A 信封粗体 ════')
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  await p.goto(SIM + '/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  // 等「boot」动画结束、信封按钮出现
  await p.waitForSelector('.hm-mail', { state: 'visible', timeout: 30000 })
  await p.click('.hm-mail')
  // 信件弹窗里还要再点一次信封本体才能拆开（phase: closed → opening → open）
  await p.waitForSelector('.env-wrap', { state: 'visible', timeout: 10000 })
  await p.click('.env-wrap', { force: true })
  await p.waitForSelector('.lt-body', { state: 'visible', timeout: 10000 })
  await p.waitForTimeout(700) // 等拆信动画 + 字体

  const bodyText = await p.locator('.lt-body').innerText()
  ok('A1 正文不再含字面 "**"', !bodyText.includes('**'), `含**? ${bodyText.includes('**')}`)
  const bCount = await p.locator('.lt-body b').count()
  ok('A2 正文存在 <b> 加粗元素', bCount > 0, `count=${bCount}`)
  if (bCount > 0) {
    const firstB = await p.locator('.lt-body b').first().innerText()
    ok('A3 首条加粗内容正确（免责声明强调句）',
      firstB.includes('仅复刻《无限暖暖》游戏界面的交互体验'), firstB.slice(0, 30))
  }
  ok('A4 信封页无 pageerror', errs.length === 0, errs.join(' | '))
  await p.locator('.mail-paper').screenshot({ path: path.join(ROOT, 'tools', 'v2925-mail.png') }).catch(() => {})
  await ctx.close()
}

/* ═══════════════ B. 服装图鉴雷达切换 ═══════════════ */
console.log('\n════ B 服装图鉴雷达 ════')
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  // 预置存档：解锁 S0062 的一个部件，使该套装可在图鉴查看
  await ctx.addInitScript((key) => {
    const codex = { 'S0062:翠金花藤': { count: 1, firstAt: Date.now() } }
    localStorage.setItem(key, JSON.stringify({ codex }))
  }, SAVE_KEY)

  await p.goto(SIM + '/#/codex/clothes?name=心愿金蔷薇', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForSelector('.cl', { timeout: 30000 })
  await p.waitForFunction(() => {
    const el = document.querySelector('.in-name')
    return el && el.textContent.includes('心愿金蔷薇')
  }, { timeout: 20000 })

  const sumExpected = expectedRadar(set.parts)
  const sumActual = await p.locator('.rd-area').getAttribute('points')
  ok('B1 整体雷达 = 各部件五维之和（多边形匹配复算）', sumActual === sumExpected,
    `\n    期望 ${sumExpected}\n    实际 ${sumActual}`)

  // 点击第一个部件（翠金花藤）
  await p.waitForSelector('.cl-part', { timeout: 10000 })
  await p.locator('.cl-part').first().click()
  await p.waitForTimeout(400)
  const nameAfter = await p.locator('.in-name').innerText()
  ok('B2 点击部件后名称切到该部件', nameAfter.includes('翠金花藤'), nameAfter)
  const partExpected = expectedRadar([set.parts[0]])
  const partActual = await p.locator('.rd-area').getAttribute('points')
  ok('B3 选中部件雷达 = 该部件五维（多边形匹配复算）', partActual === partExpected,
    `\n    期望 ${partExpected}\n    实际 ${partActual}`)
  ok('B4 选中部件 ≠ 整体（确实切换了）', partActual !== sumActual)
  ok('B5 服装图鉴无 pageerror', errs.length === 0, errs.join(' | '))
  await p.locator('.cl-info').screenshot({ path: path.join(ROOT, 'tools', 'v2925-radar-part.png') }).catch(() => {})
  await ctx.close()
}

await browser.close()
server.close()

console.log(`\n结果：${pass.length} 通过 / ${fail.length} 失败`)
if (fail.length) {
  console.log('失败项：')
  for (const f of fail) console.log('  ✗ ' + f)
  process.exitCode = 1
}
