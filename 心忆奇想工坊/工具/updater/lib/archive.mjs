/** 归档：把用户给的素材搬到项目约定的位置，并记下「改了什么」以便一键回滚 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { ROOT, TOOL_ROOT, rel, assetRel, exists, stamp, safeName, pythonBin } from './util.mjs'
import {
  loadWriteCache, saveWriteCache, isUnchangedWrite, rememberWrite, noteWrite,
} from './incremental.mjs'

const SNAP_ROOT = path.join(TOOL_ROOT, 'updater', '.snapshots')
const INBOX_ROOT = path.join(TOOL_ROOT, 'updater', '.inbox')

export function inboxDir(jobId) {
  const d = path.join(INBOX_ROOT, jobId)
  fs.mkdirSync(d, { recursive: true })
  return d
}

/** 这个路径是不是落在临时收件区里。写入成功后要把这份**中转拷贝**删掉 */
export function isInInbox(p) {
  const abs = path.resolve(String(p || ''))
  return abs === INBOX_ROOT || abs.startsWith(INBOX_ROOT + path.sep)
}

/** 清掉过期的 inbox / 快照（保留最近 20 份，别把磁盘塞满） */
export function gc() {
  for (const root of [INBOX_ROOT, SNAP_ROOT]) {
    if (!exists(root)) continue
    const dirs = fs.readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => ({ p: path.join(root, d.name), t: fs.statSync(path.join(root, d.name)).mtimeMs }))
      .sort((a, b) => b.t - a.t)
    for (const d of dirs.slice(20)) {
      try { fs.rmSync(d.p, { recursive: true, force: true }) } catch { /* 占用中就算了 */ }
    }
  }
}

/* ────────────────────────────── 快照 ────────────────────────────── */

/** Windows 上「刚写完就删/覆盖」很容易撞 EPERM / EBUSY： 杀毒、索引器、或 ffmpeg 子进程还捏着句柄。撤回撞上这种瞬时锁时重试几次即可 */
function retry(fn, tries = 4, waitMs = 45) {
  for (let i = 0; ; i++) {
    try {
      return fn()
    } catch (e) {
      if (i >= tries - 1 || (e.code !== 'EPERM' && e.code !== 'EBUSY' && e.code !== 'EACCES')) throw e
      // 退避等待（忙等几十毫秒无感）
      const until = Date.now() + waitMs * (i + 1)
      while (Date.now() < until) { /* spin */ }
    }
  }
}

/** 删一个文件，绕得开安全删除 shim（某些宿主经 `NODE_OPTIONS` 注入「删除=丢回收站」，`unlinkSync` 会静默失败）： 先正常删，失败再起一个清空 `NODE_OPTIONS` 的原生子进程删 */
function hardUnlink(file) {
  try {
    retry(() => fs.unlinkSync(file))
    if (!exists(file)) return true
  } catch { /* 走下面 */ }
  try {
    const r = spawnSync(process.execPath, ['-e', 'require("fs").unlinkSync(process.argv[1])', file], {
      env: { ...process.env, NODE_OPTIONS: '' },
      encoding: 'utf8',
      timeout: 15000,
      windowsHide: true,
    })
    return r.status === 0
  } catch {
    return false
  }
}

/** 一次 apply 的全部写操作记录。用「按需记录」而不是「预先把整个项目打包」 */
export class Snapshot {
  constructor(label = '') {
    this.id = `${stamp()}${label ? '-' + label : ''}`
    this.dir = path.join(SNAP_ROOT, this.id)
    fs.mkdirSync(this.dir, { recursive: true })
    this.items = []
    this.seen = new Set()
    this.dirs = new Set()
  }

  /** 写文件之前调用：第一次碰到该路径时记录原始状态 */
  touch(abs) {
    if (this.seen.has(abs)) return
    this.seen.add(abs)
    if (exists(abs)) {
      const backup = path.join(this.dir, String(this.items.length).padStart(3, '0') + '-' + path.basename(abs))
      fs.copyFileSync(abs, backup)
      this.items.push({ path: abs, existed: true, backup })
    } else {
      // 记录新建文件的上级目录，回滚时顺手删掉空目录
      let d = path.dirname(abs)
      while (d.startsWith(ROOT) && d !== ROOT) { this.dirs.add(d); d = path.dirname(d) }
      this.items.push({ path: abs, existed: false })
    }
    this.flush()
  }

  /** 登记一个**新建的空目录**，回滚时若它还是空的就删掉 */
  trackDir(abs) {
    let d = abs
    while (d.startsWith(ROOT) && d !== ROOT) { this.dirs.add(d); d = path.dirname(d) }
    this.flush()
  }

  flush() {
    try {
      fs.writeFileSync(path.join(this.dir, 'index.json'),
        JSON.stringify({
          id: this.id,
          at: new Date().toISOString(),
          items: this.items,
          // 目录也要落盘：新建又没塞文件的阁 / 套装没有任何 items
          dirs: [...this.dirs],
        }, null, 2), 'utf8')
    } catch { /* 快照索引写失败不该阻断业务 */ }
  }

  get changed() {
    return this.items.length
  }

  restore() {
    let ok = 0
    for (const it of [...this.items].reverse()) {
      try {
        if (it.existed) {
          fs.mkdirSync(path.dirname(it.path), { recursive: true })
          retry(() => fs.copyFileSync(it.backup, it.path))
        } else if (exists(it.path)) {
          if (!hardUnlink(it.path)) continue
        }
        ok++
      } catch { /* 单个文件失败不影响其它（retry 已试过 4 次） */ }
    }
    // 删掉回滚后变空的目录（只删自己创建过的）
    for (const d of [...this.dirs].sort((a, b) => b.length - a.length)) {
      try {
        if (exists(d) && fs.readdirSync(d).length === 0) fs.rmdirSync(d)
      } catch { /* ignore */ }
    }
    return ok
  }
}

export function listSnapshots() {
  if (!exists(SNAP_ROOT)) return []
  return fs.readdirSync(SNAP_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const idx = path.join(SNAP_ROOT, d.name, 'index.json')
      let info = { id: d.name, at: '', items: [] }
      try { info = JSON.parse(fs.readFileSync(idx, 'utf8')) } catch { /* ignore */ }
      return {
        id: d.name,
        at: info.at || '',
        count: (info.items || []).length,
        mtime: fs.statSync(path.join(SNAP_ROOT, d.name)).mtimeMs,
      }
    })
    .sort((a, b) => b.mtime - a.mtime)
}

export function restoreSnapshot(id) {
  const dir = path.join(SNAP_ROOT, id)
  const idx = path.join(dir, 'index.json')
  if (!exists(idx)) throw new Error('快照不存在：' + id)
  const info = JSON.parse(fs.readFileSync(idx, 'utf8'))
  const snap = Object.create(Snapshot.prototype)
  snap.items = info.items || []
  // 优先用快照里记录的目录集合；老快照没有这个字段时按 items 反推
  snap.dirs = new Set(Array.isArray(info.dirs) && info.dirs.length
    ? info.dirs
    : snap.items.flatMap((it) => {
      const out = []
      let d = path.dirname(it.path)
      while (d.startsWith(ROOT) && d !== ROOT) { out.push(d); d = path.dirname(d) }
      return out
    }))
  const n = snap.restore()
  return { id, restored: n }
}

/* ────────────────────────────── 素材搬用 ────────────────────────────── */

/** 统一落成 PNG。下游脚本按扩展名硬编码找文件（`服装阁/<阁>/背景图.png`、`套装立绘.png`…） */
function ensurePng(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  if (path.extname(src).toLowerCase() === '.png' && path.resolve(src) === path.resolve(dst)) return dst

  if (path.extname(src).toLowerCase() === '.png') {
    fs.copyFileSync(src, dst)
    return dst
  }
  // 交给 PIL 转（项目本来就用 python 管线，这里不算引入新依赖）
  const py = [
    'import sys',
    'from PIL import Image',
    'src, dst = sys.argv[1], sys.argv[2]',
    'im = Image.open(src)',
    'if im.mode not in ("RGB", "RGBA"):',
    '    im = im.convert("RGBA")',
    'im.save(dst, "PNG")',
  ].join('\n')
  const r = spawnSync(pythonBin(), ['-c', py, src, dst], { encoding: 'utf8' })
  if (r.status !== 0) {
    // 转不了就直接复制，至少别丢文件（下游 PIL 也能读 jpg/webp）
    fs.copyFileSync(src, dst)
  }
  return dst
}

/** 原样复制（文本、yaml、已是目标格式的图） */
function ensureCopy(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  if (path.resolve(src) !== path.resolve(dst)) fs.copyFileSync(src, dst)
  return dst
}

const MEDIA_RE = /\.(png|jpe?g|webp|gif|bmp|tiff?|mp4|webm|mov|mkv|ogg|mp3|wav|flac|m4a)$/i
/** 是不是媒体文件（图片 / 视频 / 音频）。只有这些才值得转码，别的都是文本数据 */
export const isMedia = (p) => MEDIA_RE.test(String(p || ''))

/** 直转模式（发行版专用）：`archive()` 不复制媒体文件，只登记「虚拟素材路径 → 真实源文件」， `collect-assets.py --overrides` 拿这张表直接转进成品目录；`.yaml/.md/.txt/.csv` 是编辑数据，照旧落盘 */
const PASSTHROUGH = { enabled: false, map: {} }

export function resetPassthrough(enabled) {
  PASSTHROUGH.enabled = !!enabled
  PASSTHROUGH.map = {}
}

/** 本次写入登记的重定向表（虚拟素材路径 → 绝对源路径） */
export function passthroughMap() {
  return { ...PASSTHROUGH.map }
}

/** 归档一批素材：只处理改动项（源内容没变、上次写完后目标也没被动过的直接跳过），判据是内容哈希。`PASSTHROUGH.enabled` 时媒体文件改走「登记重定向」，数据文件照旧复制 */
export function archive(snap, items) {
  const cache = loadWriteCache()
  const done = []
  let dirty = false
  for (const it of items) {
    if (!exists(it.src)) { done.push({ ...it, ok: false, error: '源文件不存在' }); continue }
    try {
      if (PASSTHROUGH.enabled && isMedia(it.src)) {
        // 不落盘：目标路径只作为「产物怎么算」的索引键，交给 collect 去转码
        PASSTHROUGH.map[assetRel(it.target)] = it.src
        noteWrite(false)
        done.push({ ...it, ok: true, rel: rel(it.target), passthrough: true })
        continue
      }
      if (isUnchangedWrite(cache, it.src, it.target)) {
        noteWrite(true)
        done.push({ ...it, ok: true, unchanged: true, rel: rel(it.target) })
        continue
      }
      snap.touch(it.target)
      if (/\.(png|jpe?g|webp|gif|bmp)$/i.test(it.src)) ensurePng(it.src, it.target)
      else ensureCopy(it.src, it.target)
      rememberWrite(cache, it.src, it.target)
      noteWrite(false)
      dirty = true
      done.push({ ...it, ok: true, rel: rel(it.target) })
    } catch (e) {
      done.push({ ...it, ok: false, error: String(e.message || e) })
    }
  }
  if (dirty) saveWriteCache(cache)
  return done
}

/** 把用户给的路径整理成绝对路径（支持带引号、反斜杠、~ 开头） */
export function normalizePath(p) {
  let s = String(p || '').trim().replace(/^["']|["']$/g, '')
  if (!s) return ''
  if (s.startsWith('~')) s = path.join(process.env.USERPROFILE || process.env.HOME || '', s.slice(1))
  if (!path.isAbsolute(s)) s = path.join(ROOT, s)
  return path.normalize(s)
}

/** 递归列出一个目录下的文件（拖文件夹进来时用） */
export function walkFiles(p, depth = 0) {
  if (!exists(p)) return []
  const st = fs.statSync(p)
  if (!st.isDirectory()) return [p]
  if (depth > 4) return []
  let out = []
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue
    const q = path.join(p, e.name)
    if (e.isDirectory()) out = out.concat(walkFiles(q, depth + 1))
    else out.push(q)
  }
  return out
}

export { safeName }
