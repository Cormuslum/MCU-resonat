/** 心忆奇想工坊 · 本地服务（零依赖，只用 node 内置模块）：`node updater/server.mjs [端口]`，默认 http://localhost:5199。独立于抽卡模拟器：只读取模拟器的 public/assets 当皮肤，写入后调用既有的 python 管线 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROOT, TOOL_ROOT, PUBLIC, ASSET, rel, exists, readText, stamp, readJson, dataLabel, outLabel } from './lib/util.mjs'
import { inspectFile, KINDS } from './lib/identify.mjs'
import { jobsWithCopy, formOptions, applyJob, pruneEmpty } from './lib/jobs.mjs'
import { copyWithPaths } from './lib/copy.mjs'
import { scanBundle, applyBundle } from './lib/bundle.mjs'
import {
  Snapshot, archive, inboxDir, listSnapshots, restoreSnapshot, gc, normalizePath, walkFiles,
  resetPassthrough, passthroughMap, isInInbox,
} from './lib/archive.mjs'
import { buildSteps, runSteps, devServerAlive, restartDevServer, pythonBin } from './lib/pipeline.mjs'
import { overview, readStoryOf } from './lib/meta.mjs'
import {
  applyFingerprint, readLastApply, writeLastApply, clearLastApply,
  resetWriteStats, getWriteStats,
} from './lib/incremental.mjs'
import {
  INTERFACES, listSrc, readLiveIndex, install, uninstall, setMount,
  srcDir, rmTree,
} from './lib/dlc.mjs'
import {
  exportMany, exportCandidates,
} from './lib/dlc-export.mjs'
import {
  REMOTE_TYPES, readConfig, writeConfig, remoteStatus, upload, download, listRemote,
  shareRef, pack, gitInfo,
} from './lib/remote.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const WEB = path.join(HERE, 'web')
const PORT = Number(process.argv[2] || process.env.UPDATER_PORT || 5199)

/** 管线产物也必须进快照（pool-map / manifest / 图鉴数据是管线写的，撤回后要跟着回去） */
const PIPELINE_OUTPUTS = [
  // 数据根的产物（开发版 = 素材/，发行版 = 工坊/data/）
  path.join(ASSET, 'pool-map.json'),
  // 成品根的产物（发行版 = 模拟器/public/assets）
  path.join(ROOT, 'public', 'assets', 'manifest.json'),
  // 图鉴数据是**运行时 JSON**（不编译进前端），落在成品里，撤回要一起还原
  path.join(ROOT, 'public', 'assets', 'data', 'stories.json'),
  path.join(ROOT, 'public', 'assets', 'data', 'readings.json'),
  // 开发版仍有源码形态的图鉴 TS（发行版没有这几个文件，touch 会跳过）
  path.join(ROOT, 'src', 'data', 'stories.ts'),
  path.join(ROOT, 'src', 'data', 'readings.ts'),
]

/** 直转模式（发行版专用）：不落 `素材/`，外部文件经 `--overrides` / `NIKKI_OVERRIDES` 直接转进 `public/assets` */
const DIST_MODE = !!process.env.NIKKI_DIST_MODE
/** 本次写入的重定向表落地位置（管线跑完就删，不留痕） */
const OVERRIDES_FILE = path.join(HERE, '.passthrough.json')

/** 扫描文件夹时收哪些扩展名（与前端拖拽的 `ACCEPT_RE` 保持一致：图 / 视频 / 音频 / 文本） */
const SCAN_EXT_RE = /\.(png|jpe?g|webp|gif|bmp|tiff?|webm|mp4|mov|mkv|ogg|mp3|wav|flac|m4a|md|txt|ya?ml)$/i

/** 直转模式下，本次写入会覆盖哪些 **成品** 文件 */
function touchPoolOutputs(snap, poolIds = []) {
  const pm = readJson(path.join(ASSET, 'pool-map.json'), null)
  const byId = new Map((pm?.banners || []).map((b) => [b.id, b]))
  const outRoot = path.join(ROOT, 'public', 'assets')
  const touch = (p) => { try { if (exists(p)) snap.touch(p) } catch { /* ignore */ } }
  for (const id of poolIds) {
    const key = String(id).replace(/^banner-/, '')
    for (const sub of ['bg', 'thumb', 'title']) touch(path.join(outRoot, 'banners', sub, `${key}.webp`))
    touch(path.join(outRoot, 'video', `${key}.mp4`))
    const b = byId.get(id)
    const gk = b?.gachaKey
    if (gk) {
      try {
        const nd = path.join(outRoot, 'banners', 'name')
        if (fs.existsSync(nd)) {
          for (const f of fs.readdirSync(nd)) {
            if (f === `${gk}.webp` || f.startsWith(`${gk}-`)) touch(path.join(nd, f))
          }
        }
      } catch { /* ignore */ }
    }
    // 套装产物按目录整片备份（立绘/各进化阶/部件图标/卡片图）
    for (const s of b?.sets || []) {
      const sid = s.id
      if (!sid) continue
      const sd = path.join(outRoot, 'sets', sid)
      if (!fs.existsSync(sd)) continue
      try {
        for (const f of fs.readdirSync(sd)) touch(path.join(sd, f))
        const ic = path.join(sd, 'icons')
        if (fs.existsSync(ic)) for (const f of fs.readdirSync(ic)) touch(path.join(ic, f))
      } catch { /* ignore */ }
    }
  }
}

/** 删掉本轮写出的 `套装库/*.yaml`（仅发行版）：它们只是把 YAML 交给管线的中转文件， 管线读完就删 */
function cleanSuitYamls(list, log) {
  let n = 0
  for (const p of list || []) {
    try {
      if (fs.existsSync(p)) { fs.unlinkSync(p); n += 1 }
    } catch (e) {
      log({ kind: 'warn', text: `中转 YAML 删除失败：${rel(p)}（${e.message || e}）` })
    }
  }
  if (!n) return
  try { pruneEmpty(path.join(ASSET, '套装库')) } catch { /* 目录非空或占用 */ }
  log({ kind: 'out', text: `中转用套装 YAML 已清理 ${n} 份（信息已编进 pool-map）` })
}

/** 临时目录清单（顶栏垃圾桶只清这三个固定目录，不做成「传什么删什么」）： `.dist` 扩展包打包输出 / `.inbox` 拖入上传中转 / `.snapshots` 写入快照（删掉等于放弃「撤回」） */
const TEMP_DIRS = [
  {
    key: 'dist',
    name: '.dist',
    dir: () => path.join(TOOL_ROOT, 'updater', '.dist'),
    label: '扩展包打包输出',
    note: '打包好的 .dlc.zip，随时可以重新打包',
  },
  {
    key: 'inbox',
    name: '.inbox',
    dir: () => path.join(TOOL_ROOT, 'updater', '.inbox'),
    label: '拖入 / 上传中转区',
    note: '拖文件夹与上传时的临时副本，写入成功后会自动删',
  },
  {
    key: 'snapshots',
    name: '.snapshots',
    dir: () => path.join(TOOL_ROOT, 'updater', '.snapshots'),
    label: '写入快照',
    note: '删掉后「撤回」历史一起消失（已写进模拟器的内容不受影响）',
    warn: true,
  },
]

/** 递归量一个目录（含隐藏名字），返回 { exists, files, bytes } */
function dirStat(p) {
  if (!fs.existsSync(p)) return { exists: false, files: 0, bytes: 0 }
  let files = 0
  let bytes = 0
  const walk = (dir, depth) => {
    if (depth > 8) return
    let ents = []
    try { ents = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const e of ents) {
      const q = path.join(dir, e.name)
      if (e.isDirectory()) { walk(q, depth + 1); continue }
      files += 1
      try { bytes += fs.statSync(q).size } catch { /* 占用中 */ }
    }
  }
  walk(p, 0)
  return { exists: true, files, bytes }
}

/** 临时目录现状（给「清理」弹窗用） */
async function apiTemp(res) {
  json(res, 200, {
    ok: true,
    dirs: TEMP_DIRS.map((t) => {
      const p = t.dir()
      const s = dirStat(p)
      return {
        key: t.key, name: t.name, label: t.label, note: t.note, warn: !!t.warn,
        path: rel(p), exists: s.exists, files: s.files, bytes: s.bytes,
      }
    }),
  })
}

/** 删除勾选的临时目录（keys 缺省 = 三个都删） */
async function apiCleanTemp(req, res) {
  const body = JSON.parse((await readBody(req)).toString('utf8') || '{}')
  const want = Array.isArray(body.keys) && body.keys.length
    ? body.keys.map(String)
    : TEMP_DIRS.map((t) => t.key)
  const removed = []
  const skipped = []
  let freed = 0
  let files = 0
  for (const t of TEMP_DIRS) {
    if (!want.includes(t.key)) continue
    const p = t.dir()
    if (!fs.existsSync(p)) { skipped.push(t.key); continue }
    const s = dirStat(p)
    try {
      fs.rmSync(p, { recursive: true, force: true })
      removed.push(t.key)
      freed += s.bytes
      files += s.files
    } catch (e) {
      skipped.push(`${t.key}（${e.message || e}）`)
    }
  }
  json(res, 200, { ok: true, removed, skipped, freed, files })
}

/** 删掉「拖文件夹」时落下的中转目录树 */
function cleanStagedTree(root, log) {
  if (!root || !isInInbox(root)) return
  try {
    // root 是拖进来的那个文件夹，它外面还套着一层 `<stamp>-<job>-tree`
    // 那是我们造的壳，一并删掉
    const shell = path.dirname(root)
    fs.rmSync(root, { recursive: true, force: true })
    // 只删我们自己造的那层壳（名字带 `-tree`），绝不删 .inbox 根
    if (/-tree$/.test(path.basename(shell)) && fs.existsSync(shell) && !fs.readdirSync(shell).length) {
      fs.rmSync(shell, { recursive: true, force: true })
    }
    log({ kind: 'out', text: `拖入用的中转目录已清理：${rel(root)}` })
  } catch (e) {
    log({ kind: 'warn', text: `中转目录没删掉（不影响写入）：${e.message || e}` })
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
  '.webm': 'video/webm', '.mp4': 'video/mp4',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
}

/* ────────────────────────────── 响应工具 ────────────────────────────── */

function json(res, code, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(body)
}

function serveFile(res, file, req) {
  if (!exists(file)) { res.writeHead(404); res.end('not found'); return }
  const ext = path.extname(file).toLowerCase()
  const st = fs.statSync(file)
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': st.size,
    'Cache-Control': 'no-cache',
  })
  if (req.method === 'HEAD') { res.end(); return }
  fs.createReadStream(file).pipe(res)
}

function readBody(req, limit = 200 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > limit) { reject(new Error('请求体过大（>200MB）')); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/** 极简 multipart/form-data 解析：只支持若干普通字段 + 若干文件、单层边界 */
function parseMultipart(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || '')
  if (!m) return { fields: {}, files: [] }
  const boundary = Buffer.from('--' + (m[1] || m[2]))
  const fields = {}
  const files = []

  let i = buf.indexOf(boundary)
  while (i !== -1) {
    const start = i + boundary.length
    if (buf.slice(start, start + 2).toString() === '--') break
    const headEnd = buf.indexOf('\r\n\r\n', start)
    if (headEnd === -1) break
    const next = buf.indexOf(boundary, headEnd)
    if (next === -1) break

    const head = buf.slice(start + 2, headEnd).toString('utf8')
    const body = buf.slice(headEnd + 4, next - 2) // 去掉末尾 \r\n
    const nameM = /name="([^"]*)"/i.exec(head)
    const fileM = /filename="([^"]*)"/i.exec(head)
    if (nameM) {
      if (fileM && fileM[1]) {
        files.push({ field: nameM[1], filename: decodeURIComponent(fileM[1]), data: body })
      } else {
        fields[nameM[1]] = body.toString('utf8')
      }
    }
    i = next
  }
  return { fields, files }
}

/* ────────────────────────────── API ────────────────────────────── */

async function apiState(res) {
  const alive = await devServerAlive()
  json(res, 200, {
    ok: true,
    root: ROOT,
    // 把自己是谁报出去：
    // · 启动器（main-updater.mjs）用它判断「5199 上这个工坊是不是我这套布局」
    // · 前端顶栏用它显示真实数据根
    toolRoot: TOOL_ROOT,
    dataRoot: ASSET,
    labels: { data: dataLabel(), out: outLabel() },
    python: pythonBin(),
    assetsBase: '/assets/',
    overview: overview(),
    jobs: jobsWithCopy(),
    kinds: KINDS,
    options: formOptions(),
    devServer: { alive, port: 5178 },
    snapshots: listSnapshots().slice(0, 8),
    now: new Date().toISOString(),
    dlc: dlcState(),
  })
}

/** DLC 面板需要的全部状态 */
function dlcState() {
  const cfg = readConfig()
  const live = readLiveIndex()
  const remotes = {}
  for (const t of Object.keys(REMOTE_TYPES)) {
    remotes[t] = { ...REMOTE_TYPES[t], ...remoteStatus(t, cfg) }
  }
  return {
    interfaces: INTERFACES,
    src: listSrc(),
    live: live.packages || [],
    candidates: exportCandidates(),
    remotes,
    active: cfg.active || 'local',
    config: cfg.remotes || {},
    git: gitInfo(),
  }
}

/** 扫路径→ 识别清单 */
async function apiInspect(req, res) {
  const body = JSON.parse((await readBody(req)).toString('utf8') || '{}')
  const raw = Array.isArray(body.paths) ? body.paths : [body.path || '']
  const out = []
  const missing = []

  for (const p of raw) {
    const abs = normalizePath(p)
    if (!abs) continue
    if (!exists(abs)) { missing.push(p); continue }
    for (const f of walkFiles(abs)) {
      const ext = path.extname(f).toLowerCase()
      if (!SCAN_EXT_RE.test(ext)) continue
      // 相对路径必须带上：「半身像 / 图标 / 进化等阶」三个目录里的文件名长得一样
      out.push(inspectFile(f, path.basename(f), path.relative(abs, f)))
    }
  }
  json(res, 200, { ok: true, files: out, missing })
}

/** 拖进来的文件夹：把 `webkitGetAsEntry()` 给出的相对目录树按原样落到 `.inbox/<stamp>-<job>-tree/`， 再把落盘后的根告诉前端 */
async function apiUploadTree(req, res, url) {
  const jobId = url.searchParams.get('job') || 'bundle'
  const { files } = parseMultipart(await readBody(req), req.headers['content-type'])
  const base = inboxDir(`${stamp()}-${jobId}-tree`)
  const tops = new Set()
  let n = 0
  for (const f of files) {
    const relRaw = String(f.filename || 'file').replace(/\\/g, '/')
    // 只保留相对段，`..` 一律丢掉
    const segs = relRaw.split('/').filter((s) => s && s !== '.' && s !== '..')
    if (!segs.length) continue
    const dst = path.join(base, ...segs)
    if (!dst.startsWith(base + path.sep)) continue
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    fs.writeFileSync(dst, f.data)
    tops.add(segs[0])
    n++
  }
  if (!n) return json(res, 200, { ok: false, error: '拖进来的文件夹里没有文件' })
  const list = [...tops]
  json(res, 200, {
    ok: true,
    staged: rel(base),
    // 只拖了一个文件夹 → 直接指到它；拖了好几个 → 指到它们的父目录，扫描时按多棵目录处理
    root: list.length === 1 ? path.join(base, list[0]) : base,
    tops: list,
    count: n,
  })
}

/** 扫描「整理好的文件夹」 */
async function apiScanFolder(req, res) {
  const body = JSON.parse((await readBody(req)).toString('utf8') || '{}')
  const abs = normalizePath(body.path || '')
  if (!abs) return json(res, 400, { ok: false, error: '没给路径' })
  const r = scanBundle(abs)
  if (!r.ok) return json(res, 200, r)
  json(res, 200, { ok: true, root: abs, plan: r.plan })
}

/** 上传文件 → 落到 .inbox/<jobId>/ → 返回识别清单 */
async function apiUpload(req, res, url) {
  const jobId = url.searchParams.get('job') || 'job'
  const { files } = parseMultipart(await readBody(req), req.headers['content-type'])
  const dir = inboxDir(`${stamp()}-${jobId}`)
  const out = []
  const used = new Set()
  for (const f of files) {
    // 同一次上传里经常有一批**同名文件**（半身像 / 图标 都叫「发型-XXX.png」）
    // 直接落盘会互相覆盖 → 给重名的加 -2 / -3，返回的顺序仍与上传顺序一致
    const relRaw = String(f.filename || 'file').replace(/\\/g, '/')
    const raw = path.basename(relRaw) || 'file'
    const ext = path.extname(raw)
    const base = path.basename(raw, ext)
    let name = raw
    for (let i = 2; used.has(name); i++) name = `${base}-${i}${ext}`
    used.add(name)
    const dst = path.join(dir, name)
    fs.writeFileSync(dst, f.data)
    out.push({ ...inspectFile(dst, name, relRaw), uploaded: true })
  }
  json(res, 200, { ok: true, files: out, inbox: rel(dir) })
}

function apiStory(res, url) {
  /** 只留正文：md 的 `# 标题` 与分隔线不该出现在正文框里 */
  const stripMd = (s) => String(s || '')
    .replace(/\r\n/g, '\n')
    .replace(/^#\s.*(\n|$)/, '')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .trim()

  const src = String(url.searchParams.get('src') || '').trim()
  if (src) {
    const abs = path.resolve(src)
    // 只允许读工坊自己收进来的 md
    if (!abs.startsWith(TOOL_ROOT) || !/\.md$/i.test(abs) || !exists(abs)) {
      return json(res, 403, { ok: false, error: '不允许读取这个路径' })
    }
    return json(res, 200, { ok: true, from: 'file', name: '', star: '', body: stripMd(readText(abs)) })
  }

  const name = String(url.searchParams.get('name') || '').trim()
  if (!name) return json(res, 400, { ok: false, error: '缺少 name 或 src' })

  const hit = readStoryOf(name)
  if (hit) {
    return json(res, 200, {
      ok: true, from: 'json', name: hit.setName || name,
      star: String(hit.star || ''), body: String(hit.text || '').trim(),
    })
  }
  // 成品里没有 → 退回源 md（开发版，或发行版里还没跑过管线的新故事）
  const mdDir = path.join(ASSET, '故事')
  if (exists(mdDir)) {
    for (const f of fs.readdirSync(mdDir)) {
      if (!f.endsWith('.md')) continue
      const m = /^故事-([45])星-(.+)\.md$/.exec(f)
      if (!m || m[2] !== name) continue
      return json(res, 200, { ok: true, from: 'md', name, star: m[1], body: stripMd(readText(path.join(mdDir, f))) })
    }
  }
  return json(res, 200, { ok: true, from: 'none', name, star: '', body: '' })
}

/** 执行更新（SSE 流式日志） */
async function apiApply(req, res) {
  const payload = JSON.parse((await readBody(req)).toString('utf8') || '{}')
  const { job, fields = {}, files = [], options = {} } = payload

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  const send = (obj) => {
    try { res.write(`data: ${JSON.stringify(obj)}\n\n`) } catch { /* 客户端断开 */ }
  }
  const log = (o) => send({ type: 'log', ...o })

  send({ type: 'start', job, at: new Date().toISOString() })

  // 增量：整次写入的内容与上一次完全一致 → 没有改动项，不检验、不写盘、不跑管线
  const fp = applyFingerprint({ job, fields, files, options })
  const last = readLastApply()
  if (!options.force && last?.fp === fp) {
    log({ kind: 'warn', text: '本次内容与上一次写入完全一致：没有需要检验的改动项，已跳过。'
      + '（勾选「强制重转已有素材」可强制执行）' })
    send({ type: 'done', ok: true, skipped: true, snapshot: null, overview: overview() })
    res.end()
    return
  }

  resetWriteStats()
  const snap = new Snapshot(job)
  for (const f of PIPELINE_OUTPUTS) snap.touch(f)
  // 直转模式：媒体文件不落盘，只登记「虚拟路径 → 外部源」
  resetPassthrough(DIST_MODE)
  let result
  try {
    log({ kind: 'step', text: '① 归档素材与元数据' })
    if (job === 'bundle') {
      // 整套导入：先扫一遍（保证拿到的是**当前**目录内容），再一次性写完
      const rootPath = normalizePath(String(fields.root || ''))
      // 拖进来的那棵中转树在写入成功后就删了
      if (!exists(rootPath) && isInInbox(rootPath)) {
        throw new Error('这些文件是上次「拖文件夹」留下的中转拷贝，写入成功后已自动清理。'
          + '请重新把文件夹拖进来，或直接粘贴它的原始路径。')
      }
      const scanned = scanBundle(rootPath)
      if (!scanned.ok) throw new Error(scanned.error || '扫描失败')
      const plan = scanned.plan
      // 允许在界面上改名 / 改大版本号
      for (const m of plan.majors) {
        if (String(fields.majorName || '').trim()) m.name = String(fields.majorName).trim()
        if (String(fields.majorNo || '').trim()) m.major = String(fields.majorNo).replace(/\D/g, '') || m.major
      }
      log({ kind: 'out', text: `扫描到 ${plan.majors.length} 个大版本 / ${plan.majors.reduce((n, m) => n + m.versions.length, 0)} 个版本 / ${plan.majors.reduce((n, m) => n + m.versions.reduce((k, v) => k + v.pools.length, 0), 0)} 座服装阁 / ${plan.readings.length} 篇阅读物` })
      for (const w of plan.warnings || []) log({ kind: 'warn', text: w })
      result = await applyBundle({ plan, snap, log })
    } else {
      result = await applyJob({ job, fields, files, snap, log })
    }
    for (const n of result.notes || []) log({ kind: 'note', text: n })
    const ws = getWriteStats()
    if (ws.skipped) {
      log({ kind: 'out', text: `素材增量：改动 ${ws.written} 项 · 跳过 ${ws.skipped} 项（与上一次完全一致，未重复检验）` })
    }
    log({ kind: 'ok', text: `快照已记录 ${snap.changed} 个文件（其中 ${PIPELINE_OUTPUTS.length} 个是管线产物，撤回时会一起还原）` })

    // 直转模式：把「外部源 → 虚拟素材路径」交给管线
    // 当成"已经在素材目录里"，collect-assets 拿它直接转码到 public
    if (DIST_MODE) {
      const ovMap = passthroughMap()
      const n = Object.keys(ovMap).length
      if (n) {
        fs.writeFileSync(OVERRIDES_FILE, JSON.stringify(ovMap, null, 1), 'utf8')
        process.env.NIKKI_OVERRIDES = OVERRIDES_FILE
        log({ kind: 'out', text: `直转：${n} 个素材从原位置直接转码，不复制进数据目录` })
        // 成品被新图覆盖后没有源可以重建
        touchPoolOutputs(snap, result.poolIds || [])
      }
    }

    log({ kind: 'step', text: '② 跑数据管线' })
    const steps = buildSteps({
      job,
      poolIds: result.poolIds || [],
      versionOnly: !!result.versionOnly,
      force: !!options.force,
      // 纯元数据编辑 / 直写成品的任务由 applyJob 判定要不要转码、要不要重算故事
      transcode: result.transcode !== false,
      storyWritten: !!result.storyWritten,
      readingWritten: !!result.readingWritten,
    })
    if (!steps.length) {
      log({ kind: 'ok', text: '这次没有需要重跑的管线步骤（成品已直接写好）' })
    } else if (!steps.some((s) => s.key === 'assets')) {
      log({ kind: 'out', text: '本次没有新素材 → 跳过转码，只重建索引与清单' })
    }
    const run = await runSteps(steps, log)
    // 重定向表只服务这一轮管线，跑完就撤（成功失败都要清，别让下一轮继承旧映射）
    if (DIST_MODE) {
      try { delete process.env.NIKKI_OVERRIDES } catch { /* ignore */ }
      try { fs.unlinkSync(OVERRIDES_FILE) } catch { /* ignore */ }
      // 直转模式下 jobs 仍会按老逻辑 mkdir 出 `<数据根>/服装阁/<版本>/<阁>` 这类空壳
      // 里面一个字节都没有，清掉
      for (const d of ['服装阁', '视频', '音频', '界面', '通用散件', '字体']) {
        try { pruneEmpty(path.join(ASSET, d)) } catch { /* ignore */ }
      }
    }

    if (!run.ok) {
      log({ kind: 'err', text: '管线失败，自动回滚本次改动' })
      const n = snap.restore()
      log({ kind: 'warn', text: `已回滚 ${n} 个文件` })
      send({ type: 'done', ok: false, rolledBack: true, snapshot: snap.id })
      res.end()
      return
    }

    // 发行版：套装库 YAML 是中转文件，信息已经进 pool-map，跑完就删
    if (DIST_MODE) cleanSuitYamls(result.suitYamls, log)

    // 发行版（`NIKKI_DIST_MODE=1`）里没有 vite，也没有 5178
    // 发行版模拟器是 Electron 静态壳，`public/` 里的文件换掉刷新即生效
    if (DIST_MODE) {
      log({ kind: 'ok', text: '素材已写入：回到模拟器按 Ctrl+R（或 F5）刷新即可看到' })
    } else {
      log({ kind: 'step', text: '③ 重启模拟器 dev server（新素材不在 vite 的 watch 范围）' })
      const rr = await restartDevServer({ onLog: log })
      // 重启失败不回滚：素材与管线产物都已经落盘写好了
      if (!rr?.ok) log({ kind: 'warn', text: '模拟器未能自动拉起，请手动执行 npm run dev，或直接刷新页面' })
    }

    writeLastApply(fp, { job, snapshot: snap.id })
    // 拖文件夹进来的那棵中转树用完就删（放在成功之后：失败回滚时还要留着它重试）
    if (job === 'bundle') cleanStagedTree(fields.root, log)
    const ov = overview()
    send({ type: 'done', ok: true, snapshot: snap.id, overview: ov })
  } catch (e) {
    log({ kind: 'err', text: String(e.message || e) })
    try {
      const n = snap.restore()
      if (n) log({ kind: 'warn', text: `已回滚 ${n} 个文件` })
    } catch { /* ignore */ }
    send({ type: 'done', ok: false, rolledBack: true, snapshot: snap.id })
  }
  res.end()
}

async function apiRollback(req, res) {
  const body = JSON.parse((await readBody(req)).toString('utf8') || '{}')
  if (!body.id) return json(res, 400, { ok: false, error: '缺少快照 id' })
  try {
    const r = restoreSnapshot(body.id)
    clearLastApply()
    // pool-map / manifest / stories / readings 现在也在快照里，即使下面这次管线失败
    // 产物也已经回到写入前的状态
    const logs = []
    const steps = buildSteps({})
    const run = await runSteps(steps, (o) => logs.push(o.text || ''))
    json(res, 200, {
      ok: true, ...r, pipelineOk: run.ok, logs,
      overview: overview(),
    })
  } catch (e) {
    json(res, 500, { ok: false, error: String(e.message || e) })
  }
}

/** 缩略图：把本地图片直接吐给 `<img>`（用于「按路径读取」、前端拿不到 File 对象的场景）； 只放行图片扩展名，路径必须在项目内 */
async function apiThumb(req, res, url) {
  const p = url.searchParams.get('p') || ''
  const abs = normalizePath(p)
  if (!abs.startsWith(ROOT)) return json(res, 403, { ok: false, error: '路径越界' })
  if (!/\.(png|jpe?g|webp|gif|bmp)$/i.test(abs)) return json(res, 400, { ok: false, error: '不是图片' })
  if (!exists(abs)) return json(res, 404, { ok: false })
  serveFile(res, abs, req)
}


/* ────────────────────────────── DLC 接口 ────────────────────────────── */

/** 从请求体里取参数（JSON） */
async function bodyOf(req) {
  const raw = (await readBody(req)).toString('utf8')
  return raw ? JSON.parse(raw) : {}
}

/** 导出：从库里切一个自包含的包 */
async function apiDlcExport(req, res) {
  const b = await bodyOf(req)
  const opt = { name: b.name, author: b.author, description: b.description }
  try {
    const keys = Array.isArray(b.keys) ? b.keys : (b.key ? [b.key] : [])
    const r = exportMany({ kind: b.kind, keys, ...opt, poolId: b.poolId })
    json(res, 200, { ok: true, ...r, state: dlcState() })
  } catch (e) {
    json(res, 400, { ok: false, error: String(e.message || e) })
  }
}

/** 安装：把源包拷进运行区（模拟器下次启动就能读到） */
async function apiDlcInstall(req, res) {
  const b = await bodyOf(req)
  try {
    const entry = install(b.id, { from: b.from || null })
    json(res, 200, { ok: true, entry, state: dlcState() })
  } catch (e) {
    json(res, 400, { ok: false, error: String(e.message || e) })
  }
}

/** 卸载：从运行区移除（源包保留，可再装回去） */
async function apiDlcUninstall(req, res) {
  const b = await bodyOf(req)
  try {
    uninstall(b.id)
    json(res, 200, { ok: true, state: dlcState() })
  } catch (e) {
    // 索引已经摘掉了（包不再挂载），只是目录没删干净
    json(res, 200, {
      ok: true,
      notes: [String(e.message || e)],
      state: dlcState(),
    })
  }
}

/** 改挂载开关（整包 / 单接口） */
async function apiDlcMount(req, res) {
  const b = await bodyOf(req)
  try {
    const p = setMount(b.id, { enabled: b.enabled, interfaces: b.interfaces })
    json(res, 200, { ok: true, entry: p, state: dlcState() })
  } catch (e) {
    json(res, 400, { ok: false, error: String(e.message || e) })
  }
}

/** 删除源包 */
async function apiDlcDelete(req, res) {
  const b = await bodyOf(req)
  const notes = []
  // 先卸运行区，再删源包
  try {
    uninstall(b.id)
  } catch (e) {
    notes.push('卸载运行区失败：' + String(e.message || e))
  }
  try {
    rmTree(srcDir(b.id))
  } catch (e) {
    notes.push('删除源包失败：' + String(e.message || e))
  }
  json(res, 200, { ok: true, notes, state: dlcState() })
}

/** 打包成 zip（放在 updater/.dist/） */
async function apiDlcPack(req, res) {
  const b = await bodyOf(req)
  try {
    const zip = pack(b.id)
    json(res, 200, { ok: true, file: rel(zip), state: dlcState() })
  } catch (e) {
    json(res, 400, { ok: false, error: String(e.message || e) })
  }
}

/** 上传到远端 */
async function apiDlcUpload(req, res) {
  const b = await bodyOf(req)
  try {
    const r = await upload(b.type || readConfig().active, b.id)
    json(res, 200, { ok: true, ...r, state: dlcState() })
  } catch (e) {
    json(res, 400, { ok: false, error: String(e.message || e) })
  }
}

/** 列出远端可下载的包 */
async function apiDlcRemoteList(req, res, url) {
  const type = url.searchParams.get('type') || readConfig().active
  try {
    const list = await listRemote(type)
    json(res, 200, { ok: true, list, state: dlcState() })
  } catch (e) {
    json(res, 400, { ok: false, error: String(e.message || e) })
  }
}

/** 从远端下载并安装 */
async function apiDlcDownload(req, res) {
  const b = await bodyOf(req)
  const type = b.type || readConfig().active
  let tmp = null
  try {
    const r = await download(type, b.id)
    tmp = r.tmp
    install(r.id, { from: r.unpackDir })
    json(res, 200, { ok: true, id: r.id, state: dlcState() })
  } catch (e) {
    json(res, 400, { ok: false, error: String(e.message || e) })
  } finally {
    if (tmp) rmTree(tmp)
  }
}

/** 远端配置读写 */
async function apiDlcRemoteConfig(req, res) {
  if (req.method === 'GET') {
    json(res, 200, { ok: true, config: readConfig(), state: dlcState() })
    return
  }
  const b = await bodyOf(req)
  const cfg = readConfig()
  if (b.active) cfg.active = b.active
  if (b.remotes) {
    for (const [k, v] of Object.entries(b.remotes)) {
      cfg.remotes[k] = { ...(cfg.remotes[k] || {}), ...v }
    }
  }
  writeConfig(cfg)
  json(res, 200, { ok: true, config: cfg, state: dlcState() })
}

/** 分享引用（本地路径 / URL / 仓库路径） */
async function apiDlcShare(req, res, url) {
  const id = url.searchParams.get('id') || ''
  const type = url.searchParams.get('type') || readConfig().active
  json(res, 200, { ok: true, ref: shareRef(type, id) })
}

/* ────────────────────────────── 路由 ────────────────────────────── */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const p = url.pathname

  // 录制 CORS 不需要（同源），但允许本地其它端口调试
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return }

  try {
    if (p === '/api/state') return await apiState(res)
    if (p === '/api/story') return apiStory(res, url)
    if (p === '/api/inspect' && req.method === 'POST') return await apiInspect(req, res)
    if (p === '/api/upload' && req.method === 'POST') return await apiUpload(req, res, url)
    if (p === '/api/upload-tree' && req.method === 'POST') return await apiUploadTree(req, res, url)
    if (p === '/api/scan-folder' && req.method === 'POST') return await apiScanFolder(req, res)
    if (p === '/api/apply' && req.method === 'POST') return await apiApply(req, res)
    if (p === '/api/rollback' && req.method === 'POST') return await apiRollback(req, res)
    if (p === '/api/thumb') return await apiThumb(req, res, url)
    if (p === '/api/dlc/export' && req.method === 'POST') return await apiDlcExport(req, res)
    if (p === '/api/dlc/install' && req.method === 'POST') return await apiDlcInstall(req, res)
    if (p === '/api/dlc/uninstall' && req.method === 'POST') return await apiDlcUninstall(req, res)
    if (p === '/api/dlc/mount' && req.method === 'POST') return await apiDlcMount(req, res)
    if (p === '/api/dlc/delete' && req.method === 'POST') return await apiDlcDelete(req, res)
    if (p === '/api/dlc/pack' && req.method === 'POST') return await apiDlcPack(req, res)
    if (p === '/api/dlc/upload' && req.method === 'POST') return await apiDlcUpload(req, res)
    if (p === '/api/dlc/remote/list' && req.method === 'GET') return await apiDlcRemoteList(req, res, url)
    if (p === '/api/dlc/download' && req.method === 'POST') return await apiDlcDownload(req, res)
    if (p === '/api/dlc/remote/config') return await apiDlcRemoteConfig(req, res)
    if (p === '/api/dlc/share' && req.method === 'GET') return await apiDlcShare(req, res, url)
    if (p === '/api/temp' && req.method === 'GET') return await apiTemp(res)
    if (p === '/api/clean' && req.method === 'POST') return await apiCleanTemp(req, res)

    // 固定文案：**工具根**下的 `文案.json`（发行版里在工坊目录，模拟器那边保持纯静态）
    if (p === '/copy.json') {
      // 必须在这里换成磁盘上的真实目录（开发版 `素材/`、发行版 `工具/data/`）
      const copy = copyWithPaths()
      if (copy) {
        const body = JSON.stringify(copy)
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(body),
          'Cache-Control': 'no-cache',
        })
        res.end(body)
        return
      }
      return serveFile(res, path.join(TOOL_ROOT, '文案.json'), req)
    }

    // 模拟器的素材：只读挂载，供界面取背景 / 按钮 / 音效
    if (p.startsWith('/assets/')) {
      const abs = path.join(PUBLIC, 'assets', decodeURIComponent(p.slice('/assets/'.length)))
      if (!abs.startsWith(path.join(PUBLIC, 'assets'))) { res.writeHead(403); res.end(); return }
      return serveFile(res, abs, req)
    }

    // 静态页面
    const relPath = p === '/' ? 'index.html' : decodeURIComponent(p.slice(1))
    const file = path.join(WEB, relPath)
    if (!file.startsWith(WEB)) { res.writeHead(403); res.end(); return }
    return serveFile(res, file, req)
  } catch (e) {
    console.error(e)
    if (!res.headersSent) json(res, 500, { ok: false, error: String(e.message || e) })
    else res.end()
  }
})

server.listen(PORT, () => {
  gc()
  const line = '═'.repeat(56)
  console.log(`\n${line}\n  心忆奇想工坊 已启动\n  →  http://localhost:${PORT}\n${line}`)
  console.log(`  项目根：${ROOT}`)
  console.log(`  Python：${pythonBin()}`)
  console.log(`  模拟器：http://localhost:5178 （未启动也没关系）\n`)
  // Windows 上自动开浏览器，方便双击启动
  if (process.platform === 'win32' && !process.env.UPDATER_NO_OPEN) {
    import('node:child_process').then(({ spawn }) => {
      spawn('cmd', ['/c', 'start', '', `http://localhost:${PORT}`], { detached: true, stdio: 'ignore' }).unref()
    }).catch(() => {})
  }
})
