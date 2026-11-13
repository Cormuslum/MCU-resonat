/**
 * 验证模拟器 EXE 的存档（localStorage）能跨重启保留。
 * 复现：启动 → 写 localStorage → 关闭 → 再启动 → 读回。固定端口 51800 应保证同 origin。
 */
import { spawn, execFileSync } from 'node:child_process'
import path from 'node:path'
import http from 'node:http'
import { chromium } from 'playwright-core'

const ROOT = process.cwd()
const EXE = path.join(ROOT, 'release', '无限暖暖发行版', '无限暖暖模拟器', '无限暖暖模拟器.exe')
const CDP = 9338
const ORIGIN_PORT = 51800
const KEY = 'nikki-save-persist-test'

function getJson(port, p = '/json') {
  return new Promise((res) => {
    const req = http.get({ host: '127.0.0.1', port, path: p, timeout: 1500 }, (r) => {
      let d = ''; r.on('data', (c) => d += c); r.on('end', () => res(d))
    })
    req.on('error', () => res(null)); req.on('timeout', () => { req.destroy(); res(null) })
  })
}

async function waitCDP(totalMs = 20000) {
  const t0 = Date.now()
  while (Date.now() - t0 < totalMs) {
    const d = await getJson(CDP)
    if (d) { try { const j = JSON.parse(d); if (j.length) return true } catch { /* ignore */ } }
    await new Promise((r) => setTimeout(r, 400))
  }
  return false
}

async function launch() {
  const env = { ...process.env }
  delete env.ELECTRON_RUN_AS_NODE
  env.HTTP_PROXY = ''; env.HTTPS_PROXY = ''; env.NO_PROXY = '127.0.0.1,localhost'
  const p = spawn(EXE, [`--remote-debugging-port=${CDP}`], { env, stdio: 'ignore' })
  if (!(await waitCDP())) throw new Error('CDP 未就绪')
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${CDP}`)
  const ctx = browser.contexts()[0]
  let page = null
  for (let i = 0; i < 30 && !page; i++) {
    page = ctx.pages().find((pg) => pg.url().includes(`:${ORIGIN_PORT}`))
    if (!page) await new Promise((r) => setTimeout(r, 400))
  }
  if (!page) throw new Error('未找到页面')
  return { p, browser, page }
}

let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ✅', m) } else { fail++; console.log('  ❌', m) } }

let a = await launch()
console.log('第一次启动，origin =', await a.page.evaluate(() => location.origin))
await a.page.evaluate((k) => localStorage.setItem(k, 'PERSIST_OK'), KEY)
const v1 = await a.page.evaluate((k) => localStorage.getItem(k), KEY)
ok(v1 === 'PERSIST_OK', '写入 localStorage 成功')
// 优雅关闭窗口（触发 window-all-closed → app.quit → localStorage flush）
try { await a.page.evaluate(() => window.close()) } catch { /* ignore */ }
await new Promise((r) => setTimeout(r, 4000))
try { execFileSync('taskkill', ['/PID', String(a.p.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* ignore */ }
await new Promise((r) => setTimeout(r, 1500))

let b = await launch()
console.log('第二次启动，origin =', await b.page.evaluate(() => location.origin))
const v2 = await b.page.evaluate((k) => localStorage.getItem(k), KEY)
ok(v2 === 'PERSIST_OK', `重启后读回存档（实际=${v2}）`)
// 清理测试键
await b.page.evaluate((k) => localStorage.removeItem(k), KEY)
try { await b.page.evaluate(() => window.close()) } catch { /* ignore */ }
await new Promise((r) => setTimeout(r, 2500))
try { execFileSync('taskkill', ['/PID', String(b.p.pid), '/T', '/F'], { stdio: 'ignore' }) } catch { /* ignore */ }

console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
