/**
 * 一条命令起两个常驻服务（`npm run up`）：模拟器 5178 + 更新工坊 5199，关终端或 Ctrl+C 时一起退。
 * 端口被占时先探一下、直接说清楚怎么清，不静默失败；模拟器是守护重启（谁杀的再拉起来），
 * 并在 `.dev-guard.json` 写下「守护在位」，工坊读它决定要不要自己 spawn。
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import net from 'node:net'
import fs from 'node:fs'

/** 工具根：`updater/` 与 `tools/` 的公共父目录（心忆奇想工坊/工具/） */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
/** 工作区根：仓库根（开发版）/ 发行根 —— 「心忆奇想工坊」与「心忆共鸣」的公共父 */
const WORKSPACE = path.resolve(ROOT, '..', '..')
/** 模拟器根：vite 的工程目录（vite.config.ts / index.html 在这） */
const SIM_ROOT = path.join(WORKSPACE, '心忆共鸣')
/** 工坊根：server.mjs 所在目录（updater/ 的父） */
const UPDATER_ROOT = path.join(ROOT, 'updater')
/** vite 入口：npm workspaces 把依赖提升到了工作区根 */
const VITE_BIN = path.join(WORKSPACE, 'node_modules', 'vite', 'bin', 'vite.js')

/** 守护标记：工坊靠它判断「模拟器有人守，杀完别自己再起一个」 */
const GUARD_FILE = path.join(WORKSPACE, '.dev-guard.json')

/** 某个端口是否已被占用 */
function inUse(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host: '127.0.0.1', port })
    s.setTimeout(600)
    s.once('connect', () => { s.destroy(); resolve(true) })
    s.once('timeout', () => { s.destroy(); resolve(false) })
    s.once('error', () => resolve(false))
  })
}

const SERVICES = [
  {
    name: '模拟器',
    port: 5178,
    // 用 process.execPath（就是当前 node）而不是 PATH 里的 'node' —— 后者在
    // 某些精简环境里找不到，会报 spawn node ENOENT。
    cmd: process.execPath,
    args: [VITE_BIN, '--port', '5178', '--strictPort', '--host', '127.0.0.1'],
    cwd: SIM_ROOT,
    /** 被工坊主动重启是常态 → 退出后自动拉回来，不牵连工坊 */
    guard: true,
  },
  { name: '工坊', port: 5199, cmd: process.execPath, args: ['server.mjs'], cwd: UPDATER_ROOT },
]

/** 守护重启的间隔：等上一轮的端口彻底释放 */
const RETRY_MS = 900
/** 一分钟内最多重启这么多次，超过说明 vite 自己起不来（端口被占 / 依赖坏了），别无限转圈 */
const MAX_RETRIES = 5

const busy = []
for (const svc of SERVICES) if (await inUse(svc.port)) busy.push(svc)
if (busy.length) {
  console.error('\n以下端口已被占用，先关掉占用的进程再跑：')
  for (const s of busy) {
    console.error(`  ${s.name} 端口 ${s.port}`)
    console.error(`    PowerShell: Get-NetTCPConnection -LocalPort ${s.port} -State Listen | ` +
      'ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }')
  }
  console.error('\n（提示：端口「在监听」但页面打不开，基本都是死壳，按上面清掉即可。）\n')
  process.exit(1)
}

/** port → 当前在跑的子进程 */
const running = new Map()
let shuttingDown = false

/**
 * 写下 / 抹掉「守护在位」标记（`.dev-guard.json`，工坊的 restartDevServer 读它）：
 * 有标记 → 等这边重启；没标记 → 自己拉。按 pid 判定而非只看文件存在，避免旧文件让工坊永远等。
 */
function writeGuard() {
  try {
    fs.writeFileSync(GUARD_FILE, JSON.stringify({
      pid: process.pid,
      ports: SERVICES.map((s) => s.port),
      at: Date.now(),
    }), 'utf8')
  } catch { /* 标记写不出来不影响服务本身 */ }
}

function clearGuard() {
  try { fs.unlinkSync(GUARD_FILE) } catch { /* 已经没了就算了 */ }
}

function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  clearGuard()
  for (const c of running.values()) {
    if (!c.killed) c.kill()
  }
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
// 兜底：任何路径退出（包括未捕获异常）都要把标记抹掉
process.on('exit', clearGuard)
writeGuard()

/** 守护重启的计数窗口：一分钟内连续失败太多次就放弃，避免无限转圈 */
let retryCount = 0
let retryWindowStart = Date.now()

function launch(svc) {
  const child = spawn(svc.cmd, svc.args, { cwd: svc.cwd, stdio: 'inherit', env: process.env })
  running.set(svc.port, child)
  console.log(`[${svc.name}] 启动 → http://127.0.0.1:${svc.port}/`)

  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    running.delete(svc.port)

    if (!svc.guard) {
      // 工坊是手动启动的主服务，它退出就意味着本次工作结束
      console.error(`\n[${svc.name}] 意外退出（code=${code} signal=${signal}），正在关掉另一个…`)
      shutdown(1)
      return
    }

    const now = Date.now()
    if (now - retryWindowStart > 60_000) {
      retryWindowStart = now
      retryCount = 0
    }
    retryCount++
    if (retryCount > MAX_RETRIES) {
      console.error(`\n[${svc.name}] 一分钟内已重启 ${retryCount} 次，放弃守护。` +
        `\n 多半是 5178 被别的进程占着，或 vite 自身报错 —— 看看上面的输出。`)
      shutdown(1)
      return
    }
    console.log(`[${svc.name}] 退出（code=${code} signal=${signal}），${RETRY_MS}ms 后自动重启（第 ${retryCount} 次）`)
    setTimeout(() => {
      if (!shuttingDown) launch(svc)
    }, RETRY_MS)
  })
}

for (const svc of SERVICES) launch(svc)
