/**
 * 归档：把用户给的素材搬到项目约定的位置，并记下「改了什么」以便一键回滚。
 *
 * 两条通道最后都汇到这里：
 *   - 拖拽/上传 → updater/.inbox/<jobId>/…（临时落地）
 *   - 粘贴路径   → 原地读取（不复制，直接复制到目标）
 */
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

/**
 * 这个路径是不是落在临时收件区里（v2.2.02）。
 *
 * 「拖文件夹」进工坊时，浏览器只给相对路径，所以先把整棵目录树落到 inbox 再扫描。
 * 写入成功后要把这份**中转拷贝**删掉 —— 否则大视频会被平白多存一份。
 */
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

/**
 * Windows 上「刚写完就删/覆盖」很容易撞 EPERM / EBUSY：
 * 杀毒、索引器、或 ffmpeg 子进程还捏着句柄，几毫秒后才放。
 * 撤回操作是用户手点的，撞上这种瞬时锁不该直接判定失败 —— 重试几次即可。
 */
function retry(fn, tries = 4, waitMs = 45) {
  for (let i = 0; ; i++) {
    try {
      return fn()
    } catch (e) {
      if (i >= tries - 1 || (e.code !== 'EPERM' && e.code !== 'EBUSY' && e.code !== 'EACCES')) throw e
      // 退避等待（只在这三种瞬时锁上走到，忙等几十毫秒无感）
      const until = Date.now() + waitMs * (i + 1)
      while (Date.now() < until) { /* spin */ }
    }
  }
}

/**
 * 删一个文件，**绕得开安全删除 shim**（v1.6.07）。
 *
 * 某些宿主（含本项目在 WorkBuddy 里自测时）会通过 `NODE_OPTIONS` 注入一个
 * 「删除=丢回收站」的 shim，`fs.unlinkSync` 于是变成异步语义甚至静默失败 ——
 * 表现是「撤回」时新加的文件删不掉，目录永远留着。
 * 这里先正常删，失败再起一个清空 NODE_OPTIONS 的原生子进程删。
 */
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

/**
 * 一次 apply 的全部写操作记录。
 *
 * 用「按需记录」而不是「预先把整个项目打包」：一次更新通常只碰几十个文件，
 * 全量打包 470MB 的 public/assets 会让每次点「写入」都卡半分钟。
 */
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

  /**
   * 登记一个**新建的空目录**，回滚时若它还是空的就删掉。
   *
   * 为什么需要：`touch()` 只认文件。新建一座阁 / 一套衣服时，如果这次没塞素材，
   * 目录里一个文件都没有，快照就完全不知道它的存在 —— 回滚后磁盘上留一个空壳，
   * 管线下次会把空壳当成「一套没有素材的服装」收进图鉴。
   */
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
          // 目录也要落盘：新建又没塞文件的阁 / 套装没有任何 items，
          // 只靠 items 反推路径的话回滚后会在磁盘上留一个空壳
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

/**
 * 统一落成 PNG。
 *
 * 下游脚本按扩展名硬编码找文件（`服装阁/<阁>/背景图.png`、`套装立绘.png`…），
 * 所以用户丢进来的 jpg/webp 必须先转成 png，否则「明明放了图却没生效」。
 */
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
/**
 * 是不是媒体文件（图片 / 视频 / 音频）。只有这些才值得转码，别的都是文本数据。
 *
 * 也用来判断「这次要不要跑转码那一趟」：只改元数据（改名 / 星级 / 介绍）时
 * 一个媒体文件都没有，`collect-assets` 那趟必然全 skipped，白等十几秒。
 */
export const isMedia = (p) => MEDIA_RE.test(String(p || ''))

/**
 * 直转模式（v2.1.00，发行版专用）。
 *
 * 以前是三级链路：外部源 → 复制进 `素材/`（内部源）→ Python 转码 → `public/assets`。
 * 内部源那 3.9G 是纯冗余 —— 用户给的文件、以及"这个文件演什么角色"，工坊本来就知道
 * （表单里的槽位 + pool-map 里的虚拟路径），不需要先在磁盘上排一遍目录结构。
 *
 * 打开后 `archive()` 不再复制媒体文件，只登记一条「虚拟素材路径 → 真实源文件」；
 * `collect-assets.py --overrides` 拿这张表直接把外部文件转进成品目录。
 * 磁盘上从头到尾只有用户原来那份文件 + 成品，没有中间副本。
 *
 * 注意只看**媒体**：`.yaml` / `.md` / `.txt` / `.csv` 是编辑数据，本来就要落盘。
 */
const PASSTHROUGH = { enabled: false, map: {} }

export function resetPassthrough(enabled) {
  PASSTHROUGH.enabled = !!enabled
  PASSTHROUGH.map = {}
}

/** 本次写入登记的重定向表（虚拟素材路径 → 绝对源路径） */
export function passthroughMap() {
  return { ...PASSTHROUGH.map }
}

/**
 * 归档一批素材。
 *
 * v2.0.06：只处理**改动项**。源内容没变、且上次写完之后目标也没被动过的项，
 * 直接跳过 —— 不识别、不校验、不复制、也不进快照（它本来就没变，撤回不该碰它）。
 * 判据是内容哈希，不是文件名或时间戳，所以「同一份素材重新拖一次」也算未改动。
 *
 * v2.1.00：`PASSTHROUGH.enabled` 时媒体文件改走「登记重定向」而不是复制；
 * 数据文件（yaml/md/txt/csv/json）照旧复制 —— 它们是唯一真源，不能只留在用户机器上。
 *
 * @param {Snapshot} snap
 * @param {{src:string,target:string}[]} items
 */
export function archive(snap, items) {
  const cache = loadWriteCache()
  const done = []
  let dirty = false
  for (const it of items) {
    if (!exists(it.src)) { done.push({ ...it, ok: false, error: '源文件不存在' }); continue }
    try {
      if (PASSTHROUGH.enabled && isMedia(it.src)) {
        // 不落盘：目标路径只作为「产物怎么算」的索引键，交给 collect 去转码。
        // 也不 touch 快照 —— 磁盘上没有新文件，撤回没什么可还原的。
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
