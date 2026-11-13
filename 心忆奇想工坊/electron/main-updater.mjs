/** 心忆奇想工坊 · Electron 主进程（发行版启动器）：`<发行版>/心忆共鸣/`（纯静态）与 `心忆奇想工坊/`（本 exe、运行时、工具） */
import { app, BrowserWindow, dialog, shell } from 'electron'
import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import { fileURLToPath } from 'node:url'

const BASE_PORT = Number(process.env.NIKKI_UPDATER_PORT || 5199)
/** 端口冲突时向后找几个：先问对方一句「你是谁」（`/api/state` 的 toolRoot）， 只有同一个工具目录才复用，否则换端口起自己的实例 —— 绝不连错数据根 */
const PORT_SPAN = 8

const isDir = (p) => { try { return fs.statSync(p).isDirectory() } catch { return false } }
const isFile = (p) => { try { return fs.statSync(p).isFile() } catch { return false } }

/** 解析三个根。返回 null 表示这份安装不完整（缺 server 或找不到模拟器目录） */
function findLayout() {
  const exeDir = path.dirname(app.getPath('exe'))

  // ── 新布局：exe 同级有 `工具/updater/server.mjs`
  const toolRootNew = path.join(exeDir, '工具')
  const serverNew = path.join(toolRootNew, 'updater', 'server.mjs')
  if (isFile(serverNew)) {
    const targetCands = [
      process.env.NIKKI_ROOT,
      path.join(exeDir, '..', '心忆共鸣'),
      path.join(exeDir, '心忆共鸣'),
    ].filter(Boolean)
    const targetRoot = targetCands.find((p) => isDir(path.join(p, 'public'))) || targetCands[1]
    const rt = path.join(exeDir, '运行时')
    return {
      toolRoot: toolRootNew,
      dataDir: path.join(toolRootNew, 'data'),
      targetRoot,
      py: path.join(rt, 'python.exe'),
      ffmpeg: path.join(rt, 'ffmpeg.exe'),
      distMode: true,
    }
  }

  // ── 老布局：exe 同级或上一级有 updater/server.mjs
  for (const base of [exeDir, path.join(exeDir, '..')]) {
    if (isFile(path.join(base, 'updater', 'server.mjs'))) {
      return {
        toolRoot: base,
        dataDir: path.join(base, '素材'),
        targetRoot: base,
        py: '',
        ffmpeg: '',
        distMode: false,
      }
    }
  }
  return null
}

function portReady(port, timeoutMs = 800) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host: '127.0.0.1', port })
    const done = (v) => { try { s.destroy() } catch { /* ignore */ } resolve(v) }
    s.setTimeout(timeoutMs)
    s.once('connect', () => done(true))
    s.once('timeout', () => done(false))
    s.once('error', () => done(false))
  })
}

async function waitReady(port, totalMs = 25000) {
  const start = Date.now()
  while (Date.now() - start < totalMs) {
    if (await portReady(port)) return true
    await new Promise((r) => setTimeout(r, 350))
  }
  return false
}

/** 问一句「这个端口上的工坊是哪个目录的」；拿不到 / 不是工坊就返回 null */
function probeStudio(port, timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/api/state', timeout: timeoutMs }, (res) => {
      if (res.statusCode !== 200) { res.resume(); resolve(null); return }
      let buf = ''
      res.setEncoding('utf8')
      res.on('data', (c) => { if (buf.length < 200000) buf += c })
      res.on('end', () => {
        try { resolve(JSON.parse(buf)) } catch { resolve(null) }
      })
    })
    req.on('timeout', () => { req.destroy(); resolve(null) })
    req.on('error', () => resolve(null))
  })
}

/** 选一个能用的端口：空着 → 起新实例；占着但是同一套布局（toolRoot 相同）→ 复用；占着别人的 → 换下一个 */
async function pickPort(L) {
  const mine = path.resolve(L.toolRoot)
  for (let i = 0; i < PORT_SPAN; i++) {
    const port = BASE_PORT + i
    if (!(await portReady(port))) return { port, reuse: false }
    const st = await probeStudio(port)
    if (st && st.toolRoot && path.resolve(st.toolRoot) === mine) return { port, reuse: true }
  }
  return null
}

let child = null
let win = null

function createWindow(port) {
  win = new BrowserWindow({
    width: 1500, height: 950, minWidth: 1080, minHeight: 680,
    backgroundColor: '#f5efe4', autoHideMenuBar: true, title: '心忆奇想工坊',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      // 只为了把「拖进来的文件的绝对路径」交给页面（见 preload-updater.cjs）
      // 有了它，整套导入拖文件夹不必再把整棵树复制进 .inbox 中转
      preload: fileURLToPath(new URL('./preload-updater.cjs', import.meta.url)),
    },
  })
  win.loadURL(`http://127.0.0.1:${port}/`)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.on('closed', () => { win = null })
}

function spawnServer(L, port) {
  const serverPath = path.join(L.toolRoot, 'updater', 'server.mjs')
  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    UPDATER_NO_OPEN: '1',
    NIKKI_TOOLROOT: L.toolRoot,
    NIKKI_DATA_DIR: L.dataDir,
    NIKKI_ROOT: L.targetRoot,
  }
  // 自带运行时：python 与 ffmpeg 都在工坊目录，系统 PATH 上那个 `python`
  // 很可能是 Microsoft Store 的假存根（一跑就 exit 9009）
  if (L.py && isFile(L.py)) env.NIKKI_PY = L.py
  if (L.ffmpeg && isFile(L.ffmpeg)) env.NIKKI_FFMPEG = L.ffmpeg
  // 成品写到**模拟器**的 public（不是工坊自己）—— 少了这个，管线会把 webp
  // 转进工坊目录，模拟器那边的图反而永远不变
  if (L.targetRoot) env.NIKKI_OUT_DIR = path.join(L.targetRoot, 'public', 'assets')
  // 发行版不落 `素材/`：用户选的图直接从原位置转进 public
  if (L.distMode) env.NIKKI_DIST_MODE = '1'
  // 基线模式：发行版不随包发 `数据/{故事,套装库,阅读物}`（成品已在模拟器里），这三个目录只当增量补丁
  // 少了 `NIKKI_JSON_BASELINE` 管线会把 stories.json 写成空数组
  if (L.distMode) env.NIKKI_JSON_BASELINE = '1'

  child = spawn(process.execPath, [serverPath, String(port)], {
    cwd: L.toolRoot,
    env,
    stdio: 'ignore',
    windowsHide: true,
  })
  child.on('exit', () => { child = null })
}

app.whenReady().then(async () => {
  const L = findLayout()
  if (!L) {
    dialog.showErrorBox(
      '找不到工坊数据目录',
      '请把「心忆奇想工坊」与「心忆共鸣」放在同一个发行文件夹里\n' +
      '（工坊目录下应有 `工具/updater/server.mjs` 与 `运行时/python.exe`）。\n' +
      '也可以设置环境变量 NIKKI_ROOT 指向模拟器目录。'
    )
    app.quit()
    return
  }

  // 先认领端口：已有**同一套布局**的实例就复用，否则（开发版工坊 / 别的程序）换一个
  const pick = await pickPort(L)
  if (!pick) {
    dialog.showErrorBox(
      '工坊无法启动',
      `端口 ${BASE_PORT}~${BASE_PORT + PORT_SPAN - 1} 都被占用了（可能是别的程序或另一个工坊）。\n` +
      '请关掉占用端口的程序后重试。'
    )
    app.quit()
    return
  }

  if (pick.reuse) { createWindow(pick.port); return }

  spawnServer(L, pick.port)
  const ok = await waitReady(pick.port)
  if (!ok) {
    dialog.showErrorBox(
      '工坊启动失败',
      `工坊服务未能在 25 秒内就绪（端口 ${pick.port}）。\n` +
      `工具目录：${L.toolRoot}\n数据目录：${L.dataDir}\n目标目录：${L.targetRoot}`
    )
    app.quit()
    return
  }
  createWindow(pick.port)
})

app.on('window-all-closed', () => {
  if (child && !child.killed) { try { child.kill() } catch { /* ignore */ } }
  app.quit()
})
app.on('before-quit', () => {
  if (child && !child.killed) { try { child.kill() } catch { /* ignore */ } }
})
