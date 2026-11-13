/**
 * 一条命令起两个常驻服务，关终端（或 Ctrl+C）时一起退。
 *
 *   npm run up
 *
 * 为什么要有这个：模拟器（5178）和更新工坊（5199）是两个独立进程，
 * 以前要么开两个终端、要么靠记住两行命令。更麻烦的是——**由别的程序代起的进程
 * 会随那个程序退出而消失，但端口上会留一个只回 502 的死壳**，
 * 于是「明明显示在监听，页面却打不开」。自己终端里跑这一条，进程就归你管。
 *
 * 端口被占时不会静默失败：先探一下，占着就直接说清楚怎么清。
 *
 * ⚠ 模拟器退出**不再**连坐工坊（2026-11-08）：
 *   工坊的「写入并更新 → 重启模拟器 dev server」会主动 Stop-Process 掉 5178 上的 vite。
 *   以前这里把它当成「意外崩溃」直接 shutdown，于是工坊正在等端口就绪的那 20 秒里，
 *   自己也被这条 exit 回调杀死 —— 前端 SSE 断开，界面只显示一句 `network error`，
 *   看上去像「因为版本大图报错才终止」，实际管线早已跑完、文件也写好了。
 *   现在模拟器改成**守护重启**：谁杀的就再拉起来，工坊不受影响。
 *
 * ⚠ 并且落一个 `.dev-guard.json`（2026-11-08 第二版）：
 *   光让这边重启还不够。工坊那边杀完 vite 会「等一下，看有没有人接手」，
 *   等不到就自己 spawn 一个 —— 可 vite 首次启动要 2.4s，叠上这里的 0.9s 延迟，
 *   机器一忙就超过那点等待，于是两边各起一个，为 5178 打起来：
 *   输的那个 exit 1，这边再重启，再撞，五轮后守护放弃，工坊也跟着没了。
 *   所以这里把「我在守着」写成文件，工坊读它就能确定**该不该自己拉**。
 */
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import net from 'node:net'
import fs from 'node:fs'

/** 工具根：`updater/` 与 `tools/` 的公共父目录（心忆奇想工坊/工具/） */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
/** 工作区根：仓库根（开发版）/ 发行根 —— 「心忆奇想工坊」与「无限暖暖模拟器」的公共父 */
const WORKSPACE = path.resolve(ROOT, '..', '..')
/** 模拟器根：vite 的工程目录（vite.config.ts / index.html 在这） */
const SIM_ROOT = path.join(WORKSPACE, '无限暖暖模拟器')
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
 * 写下/抹掉「守护在位」标记。工坊的 restartDevServer 会读它：
 *   有标记 → kill 完乖乖等这边重启，绝不自己 spawn（否则两边抢 5178）
 *   没标记 → 说明模拟器是单独 `npm run dev` 起的，它自己拉
 * 用 pid 判定而非只看文件存在 —— 被强杀时 exit 处理器不一定跑得到，
 * 留个旧文件在就会让工坊永远等一个不存在的守护。
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
