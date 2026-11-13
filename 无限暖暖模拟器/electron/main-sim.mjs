/**
 * 《无限暖暖》共鸣抽卡模拟器 · Electron 主进程（自包含发行版）
 *
 * 设计要点（v2.0.10 起）：
 *  1) **固定端口**：localStorage 按 origin 隔离，端口一变就是新域名、存档全丢。
 *     这里固定 51800（可用 NIKKI_SIM_PORT 覆盖），保证存档跨启动保留。
 *  2) **素材与代码分离**：打包后 dist 只放编译产物（js/css/html），
 *     素材（webp/ogg/mp4/manifest）放在同级 `public/assets`。
 *     `/assets/x` 先查 public/assets（工坊写入处，改了立即生效），再回落 dist/assets（js/css）。
 *  3) 数据根：打包版 = exe 所在目录（发行根）；开发版 = 项目根。
 */
import { app, BrowserWindow, dialog, shell } from 'electron'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const isPackaged = app.isPackaged
const ROOT_DIR = isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath()

// 存档/缓存放发行根下的 userdata/：① 避开 %APPDATA% 权限问题（写不进去会让 localStorage 不落盘）
// ② 整包拷走时存档也跟着走，真正自包含。
try { app.setPath('userData', path.join(ROOT_DIR, 'userdata')) } catch { /* 设不了就沿用默认 */ }

const DIST = path.join(ROOT_DIR, 'dist')
const ASSETS = path.join(ROOT_DIR, 'public', 'assets')

// 固定端口 —— 存档（localStorage）靠它稳定
const PORT = Number(process.env.NIKKI_SIM_PORT || 51800)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.bmp': 'image/bmp', '.avif': 'image/avif',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4',
  '.webm': 'video/webm', '.mp4': 'video/mp4', '.m4v': 'video/mp4',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
}

function isFile(p) {
  try { return fs.existsSync(p) && fs.statSync(p).isFile() } catch { return false }
}

/** 把 URL 解析成磁盘文件：/assets/* 先 public/assets（素材），再 dist/assets（js/css）；其余走 dist */
function resolveFile(urlPath) {
  const rel = urlPath.replace(/^\/+/, '')
  if (rel.startsWith('assets/')) {
    const tail = rel.slice('assets/'.length)
    const pub = path.join(ASSETS, tail)
    if (isFile(pub)) return pub            // 素材 / manifest（工坊写入处）
    const dst = path.join(DIST, 'assets', tail)
    if (isFile(dst)) return dst            // 编译产物 js/css
    return null
  }
  const p = path.join(DIST, rel)
  if (isFile(p)) return p
  return path.join(DIST, 'index.html')     // SPA 兜底
}

function serve(req, res) {
  try {
    let urlPath = decodeURIComponent((req.url || '/').split('?')[0])
    if (urlPath === '/' || urlPath === '') urlPath = '/index.html'
    const file = resolveFile(urlPath)
    if (!file || !isFile(file)) { res.writeHead(404); res.end('not found'); return }

    const st = fs.statSync(file)
    const ext = path.extname(file).toLowerCase()
    const type = MIME[ext] || 'application/octet-stream'

    const range = req.headers.range
    if (range && /^bytes=/.test(range)) {
      const m = /^bytes=(\d*)-(\d*)$/.exec(range)
      let start = m && m[1] ? parseInt(m[1], 10) : 0
      let end = m && m[2] ? parseInt(m[2], 10) : st.size - 1
      if (Number.isNaN(start)) start = 0
      if (Number.isNaN(end) || end >= st.size) end = st.size - 1
      if (start > end) { res.writeHead(416); res.end(); return }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${st.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Cache-Control': 'no-cache',
      })
      if (req.method === 'HEAD') { res.end(); return }
      fs.createReadStream(file, { start, end }).pipe(res)
      return
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': st.size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    })
    if (req.method === 'HEAD') { res.end(); return }
    fs.createReadStream(file).pipe(res)
  } catch (e) {
    try { res.writeHead(500); res.end('server error: ' + String((e && e.message) || e)) } catch { /* ignore */ }
  }
}

let server = null
let win = null

function createWindow() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 640,
    backgroundColor: '#0d0f1a', autoHideMenuBar: true,
    title: '无限暖暖 · 共鸣抽卡模拟器',
    webPreferences: {
      autoplayPolicy: 'no-user-gesture-required',
      contextIsolation: true, nodeIntegration: false, backgroundThrottling: false,
    },
  })
  win.loadURL(`http://127.0.0.1:${PORT}/`)
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.on('closed', () => { win = null })
}

app.whenReady().then(() => {
  server = http.createServer(serve)
  server.on('error', (e) => {
    if (e && e.code === 'EADDRINUSE') {
      dialog.showErrorBox('端口被占用', `模拟器需要固定端口 ${PORT}（用于保留存档）。\n该端口已被占用，可能已有一个模拟器实例在运行。\n请关闭后重试，或设置环境变量 NIKKI_SIM_PORT 换一个端口。`)
      app.quit()
      return
    }
    dialog.showErrorBox('启动失败', String((e && e.message) || e))
    app.quit()
  })
  server.listen(PORT, '127.0.0.1', () => createWindow())
})

app.on('window-all-closed', () => {
  if (server) { try { server.close() } catch { /* ignore */ } }
  app.quit()
})
app.on('before-quit', () => {
  if (server) { try { server.close() } catch { /* ignore */ } }
})
