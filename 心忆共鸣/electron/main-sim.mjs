/** 《无限暖暖》共鸣抽卡模拟器 · Electron 主进程（自包含发行版）。3) 数据根：打包版 = exe 所在目录（发行根），开发版 = 项目根 */
import { app, BrowserWindow, dialog, screen, shell } from 'electron'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const isPackaged = app.isPackaged
const ROOT_DIR = isPackaged ? path.dirname(app.getPath('exe')) : app.getAppPath()

// 存档/缓存放发行根下的 userdata/：① 避开 %APPDATA% 权限问题（写不进去会让 localStorage 不落盘）
// ② 整包拷走时存档也跟着走，真正自包含
try { app.setPath('userData', path.join(ROOT_DIR, 'userdata')) } catch { /* 设不了就沿用默认 */ }

const DIST = path.join(ROOT_DIR, 'dist')
const ASSETS = path.join(ROOT_DIR, 'public', 'assets')

// 固定端口
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

/** 主显示器宽高比是否为 16:9（±3%，覆盖 1920×1080 / 2560×1440 / 1366×768；排除 16:10、21:9） */
function isPrimary16by9() {
  const { width, height } = screen.getPrimaryDisplay().size
  return height > 0 && Math.abs(width / height - 16 / 9) < 0.03
}

function createWindow() {
  const autoFullScreen = isPrimary16by9()
  const { width, height } = screen.getPrimaryDisplay().size
  console.log(`[窗口] 主显示器 ${width}x${height}${autoFullScreen ? '（16:9）→ 自动全屏' : '→ 窗口模式'}`)

  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 1024, minHeight: 640,
    fullscreen: autoFullScreen,
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
