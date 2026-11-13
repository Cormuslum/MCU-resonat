/** 管线执行：把素材变成前端能读的数据 */
import { spawn, spawnSync } from 'node:child_process'
import path from 'node:path'
import { ROOT, WORKSPACE, TOOL_ROOT, ASSET, readJson, pythonBin } from './util.mjs'

// 原样再导出，保持旧调用点不变
export { pythonBin }

/** 借一个已存在的池 id 当「引子」（只为触发版本卡 / 大图转码段，那一池的素材已转好会被跳过） */
function seedPoolId() {
  // 用 ASSET 而不是 ROOT：发行版数据根在工坊目录，ROOT 是模拟器目录（那儿没有 pool-map）
  const pm = readJson(path.join(ASSET, 'pool-map.json'), null)
  const first = pm?.banners?.[0]?.id
  return first || ''
}

/** 跑一条命令，stdout/stderr 按行回调 */
function run(cmd, args, { cwd = TOOL_ROOT, onLog = () => {}, timeoutMs = 600000 } = {}) {
  return new Promise((resolve) => {
    onLog({ kind: 'cmd', text: `$ ${cmd} ${args.join(' ')}` })
    let child
    try {
      child = spawn(cmd, args, { cwd, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } })
    } catch (e) {
      onLog({ kind: 'err', text: String(e.message || e) })
      resolve({ code: -1, ok: false })
      return
    }
    const timer = setTimeout(() => {
      onLog({ kind: 'err', text: `超时 ${Math.round(timeoutMs / 1000)}s，已终止` })
      try { child.kill('SIGKILL') } catch { /* ignore */ }
    }, timeoutMs)

    const pipe = (stream, kind) => {
      let buf = ''
      stream.on('data', (d) => {
        buf += d.toString('utf8')
        const lines = buf.split(/\r?\n/)
        buf = lines.pop() || ''
        for (const line of lines) if (line.trim()) onLog({ kind, text: line })
      })
      stream.on('end', () => { if (buf.trim()) onLog({ kind, text: buf }) })
    }
    pipe(child.stdout, 'out')
    pipe(child.stderr, 'err')

    child.on('error', (e) => {
      clearTimeout(timer)
      onLog({ kind: 'err', text: String(e.message || e) })
      resolve({ code: -1, ok: false })
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({ code, ok: code === 0 })
    })
  })
}

/** 组装本次更新要跑的步骤 */
export function buildSteps({
  job = '', poolIds = [], force = false, story = false, reading = false,
  version = false, versionOnly = false,
  transcode = true, storyWritten = false, readingWritten = false,
} = {}) {
  const py = pythonBin()
  const steps = []
  const DIST = !!process.env.NIKKI_DIST_MODE

  /* ── 按任务裁剪 ── 故事只进 `stories.json`、阅读物只进 `readings.json`，版本 / 服装阁 / 套装才改 pool-map 与 manifest； `gen-stories` / `gen-readings` 只在这批真的写了对应内容时跑，纯元数据编辑不跑转码 */
  const pureStory = job === 'story' && !poolIds.length
  const pureReading = job === 'reading' && !poolIds.length

  if (pureStory) {
    if (DIST) return []       // 已经直写成品 stories.json，管线无事可做
    return [{
      key: 'stories',
      label: '生成故事图鉴数据（只重算故事）',
      cmd: py,
      args: ['tools/gen-stories.py'],
      optional: true,
    }]
  }
  if (pureReading) {
    if (DIST) return []       // 已经直写成品 readings.json
    return [{
      key: 'readings',
      label: '生成阅读物图鉴数据（只重算阅读物）',
      cmd: py,
      args: ['tools/gen-readings.py'],
      optional: true,
    }]
  }

  // 没有 job（撤回后的全量兜底）→ 老行为，两步都跑
  const needStories = !job || (storyWritten && !DIST)
  const needReadings = !job || (readingWritten && !DIST)

  steps.push({
    key: 'pool-map',
    label: '整理服装阁索引（pool-map.json）',
    cmd: py,
    args: ['tools/build-pool-map.py'],
  })

  if (transcode && poolIds.length) {
    steps.push({
      key: 'assets',
      label: `转码 ${poolIds.length} 只新服装阁的素材`,
      cmd: py,
      args: ['tools/collect-assets.py', ...poolIds.flatMap((id) => ['--pool', id]), ...(force ? ['--force'] : [])],
      timeoutMs: 900000,
    })
  } else if (transcode && versionOnly) {
    const seed = seedPoolId()
    if (seed) {
      steps.push({
        key: 'assets',
        label: '转码版本卡 / 版本大图',
        cmd: py,
        args: ['tools/collect-assets.py', '--pool', seed, ...(force ? ['--bust', 'ui/ver'] : [])],
        timeoutMs: 900000,
      })
    }
  }

  steps.push({
    key: 'manifest',
    label: '重建资源清单（manifest.json）',
    cmd: py,
    args: ['tools/collect-assets.py', '--all', '--manifest-only',
      ...(force ? ['--bust', 'banners/title,banners/name,ui/ver'] : [])],
    timeoutMs: 900000,
  })

  if (needStories) {
    steps.push({
      key: 'stories',
      label: '生成故事图鉴数据（stories.json）',
      cmd: py,
      args: ['tools/gen-stories.py'],
      optional: true,
    })
  }

  if (needReadings) {
    steps.push({
      key: 'readings',
      label: '生成阅读物图鉴数据（readings.json）',
      cmd: py,
      args: ['tools/gen-readings.py'],
      optional: true,
    })
  }

  return steps
}

/** 依次执行，任一步失败即停（optional 的除外） */
export async function runSteps(steps, onLog) {
  const results = []
  for (const s of steps) {
    onLog({ kind: 'step', text: s.label, key: s.key })
    const r = await run(s.cmd, s.args, { onLog, timeoutMs: s.timeoutMs })
    results.push({ key: s.key, label: s.label, ok: r.ok, code: r.code })
    if (!r.ok) {
      if (s.optional) {
        onLog({ kind: 'warn', text: `「${s.label}」失败，但不是必需步骤，继续` })
        continue
      }
      onLog({ kind: 'err', text: `「${s.label}」失败（exit ${r.code}），已停止` })
      return { ok: false, results }
    }
    onLog({ kind: 'ok', text: `✓ ${s.label}` })
  }
  return { ok: true, results }
}

/* ────────────────────────────── dev server ────────────────────────────── */

/** 探测模拟器 dev server（5178）是否在跑 */
export async function devServerAlive(port = 5178) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) })
    return res.ok || res.status === 404
  } catch {
    return false
  }
}

/** 重启 dev server（vite 的 `watch.ignored` 排除了 `public/assets/**`，新转的 webp 不会触发刷新）。顺序：停 → 等端口释放 → 先等守护 → 等不到才自己拉 */
async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/** 端口上是否还有进程在 LISTEN（TIME_WAIT 不算，它不挡监听） */
function portListening(port) {
  try {
    const r = spawnSync('powershell', ['-NoProfile', '-Command',
      `$c=(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue); if($c){'1'}else{'0'}`,
    ], { encoding: 'utf8', timeout: 8000 })
    return (r.stdout || '').trim() === '1'
  } catch {
    return false
  }
}

/** `npm run up` 是否正在守着？ 用 pid 探活而不是只看文件在不在 */
function guardAlive() {
  try {
    const g = readJson(path.join(WORKSPACE, '.dev-guard.json'), null)
    if (!g?.pid) return false
    process.kill(g.pid, 0)     // 只探存在，不发信号；进程没了会抛 ESRCH
    return true
  } catch {
    return false
  }
}

export async function restartDevServer({ port = 5178, onLog = () => {} } = {}) {
  // 反过来做会在机器忙的时候双开：两个 vite 抢 5178，输的那个 exit 1
  const guarded = guardAlive()

  // ① 停掉占着端口的进程（杀的是 vite 本身）
  try {
    const r = spawnSync('powershell', ['-NoProfile', '-Command',
      `$c=(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue); if($c){$c|ForEach-Object{Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue}; 'killed'}else{'none'}`,
    ], { encoding: 'utf8', timeout: 15000 })
    onLog({ kind: 'out', text: `停止旧服务：${(r.stdout || '').trim() || 'none'}` })
  } catch (e) {
    onLog({ kind: 'warn', text: '停止旧服务失败：' + (e.message || e) })
  }

  // ② 交给守护：只等，**绝不自己 spawn**
  if (guarded) {
    onLog({ kind: 'out', text: '检测到 npm run up 守护，由它重启（这里只等）' })
    for (let i = 0; i < 60; i++) {          // 最多 30s
      await sleep(500)
      if (await devServerAlive(port)) {
        onLog({ kind: 'ok', text: `dev server 已由守护进程拉起：http://localhost:${port}` })
        return { ok: true, port, adopted: true }
      }
    }
    onLog({ kind: 'err', text: '守护进程 30s 内没能把 dev server 拉起来，看 npm run up 那个终端的输出' })
    return { ok: false, port, reason: 'guard-timeout' }
  }

  // ③ 没有守护（单独 npm run dev 起的）→ 等端口松开，自己拉
  for (let i = 0; i < 25; i++) {
    if (!portListening(port)) break
    await sleep(200)
  }

  // 直接跑 vite 的入口，不经 npx（Windows 上 npx 会多一层 cmd
  // kill 不干净，还容易留一个只回 502 的空壳）
  const simRoot = path.join(WORKSPACE, '心忆共鸣')
  // vite 的依赖被 npm workspaces 提升到了工作区根，子目录里没有 node_modules
  const viteBin = path.join(WORKSPACE, 'node_modules', 'vite', 'bin', 'vite.js')
  const child = spawn(process.execPath, [viteBin, '--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: simRoot,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })
  child.unref()
  onLog({ kind: 'out', text: `已启动 vite（pid ${child.pid}），等待端口就绪…` })

  for (let i = 0; i < 40; i++) {
    await sleep(500)
    if (await devServerAlive(port)) {
      onLog({ kind: 'ok', text: `dev server 就绪：http://localhost:${port}` })
      return { ok: true, port }
    }
  }
  onLog({ kind: 'err', text: '等了 20s 端口仍未就绪，请手动 npm run dev' })
  return { ok: false, port }
}
