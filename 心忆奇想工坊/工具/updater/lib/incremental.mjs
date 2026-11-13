/** 增量写入判定：`applyFingerprint()` 是整次写入的内容指纹（任务 + 字段 + 每个源文件的内容哈希）， `isUnchangedWrite()` 是单个素材的「上次写入结果」缓存；指纹只看内容，不看路径与时间。状态落在 `updater/` 下、不参与管线，删掉这两个 json 只是让下次全量跑一遍 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { TOOL_ROOT } from './util.mjs'

const LAST_APPLY = path.join(TOOL_ROOT, 'updater', '.last-apply.json')
const WRITE_CACHE = path.join(TOOL_ROOT, 'updater', '.write-cache.json')

const CHUNK = 1024 * 1024

function exists(p) {
  try { fs.accessSync(p); return true } catch { return false }
}

/** 文件内容签名：全文 SHA-256 + 字节数 */
function contentSig(abs) {
  if (!exists(abs)) return 'missing'
  let fd
  try {
    const st = fs.statSync(abs)
    if (!st.isFile()) return 'not-file'
    const h = crypto.createHash('sha256')
    const buf = Buffer.allocUnsafe(CHUNK)
    fd = fs.openSync(abs, 'r')
    let read = 0
    while (read < st.size) {
      const n = fs.readSync(fd, buf, 0, Math.min(CHUNK, st.size - read), read)
      if (n <= 0) break
      h.update(buf.subarray(0, n))
      read += n
    }
    return `${st.size}-${h.digest('hex')}`
  } catch {
    return 'unreadable'
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd) } catch { /* ignore */ }
  }
}

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

/** 一次写入的内容指纹：`files` 每项都带源文件的内容签名，换了任何一张图或一个字段，指纹就变 */
export function applyFingerprint({ job, fields = {}, files = [], options = {} }) {
  const normFields = Object.fromEntries(
    Object.keys(fields).sort().map((k) => [k, String(fields[k] ?? '')]),
  )
  const normFiles = files.map((f) => ({
    slot: String(f.slot ?? ''),
    setIndex: f.setIndex ?? null,
    name: String(f.name ?? ''),
    kind: String(f.kind ?? ''),
    content: contentSig(String(f.src ?? '')),
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  return sha256(JSON.stringify({
    job: String(job ?? ''), fields: normFields, files: normFiles,
    force: !!options.force, restartDev: !!options.restartDev,
  }))
}

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) } catch { return fallback }
}

function writeJson(p, obj) {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8')
  } catch { /* 缓存写失败不该阻断写入 */ }
}

export function readLastApply() {
  const d = readJson(LAST_APPLY, null)
  return d && typeof d.fp === 'string' ? d : null
}

export function writeLastApply(fp, meta = {}) {
  writeJson(LAST_APPLY, { fp, at: new Date().toISOString(), ...meta })
}

/** 撤回之后必须清掉指纹，否则用户撤回完再写同一批会被误判成「没改动」 */
export function clearLastApply() {
  try { if (exists(LAST_APPLY)) fs.unlinkSync(LAST_APPLY) } catch { /* ignore */ }
}

/* ────────────────────────── 单素材写入缓存 ────────────────────────── */

const cacheKey = (abs) => path.relative(TOOL_ROOT, abs).split(path.sep).join('/')

export function loadWriteCache() {
  const d = readJson(WRITE_CACHE, {})
  return d && typeof d === 'object' && !Array.isArray(d) ? d : {}
}

export function saveWriteCache(cache) {
  const keys = Object.keys(cache)
  const trimmed = keys.length > 2000
    ? Object.fromEntries(keys.slice(-2000).map((k) => [k, cache[k]]))
    : cache
  writeJson(WRITE_CACHE, trimmed)
}

/** 这一项是不是「与上一次写入完全一致」： 源内容没变，且上次写完之后目标也没被别人动过 → 不必再检验/复制 */
export function isUnchangedWrite(cache, src, target) {
  const k = cacheKey(target)
  const prev = cache[k]
  if (!prev) return false
  return prev.src === contentSig(src) && prev.dst === contentSig(target)
}

export function rememberWrite(cache, src, target) {
  cache[cacheKey(target)] = { src: contentSig(src), dst: contentSig(target) }
}

/* ────────────────────────── 本次写入的增量统计 ────────────────────────── */

let stats = { written: 0, skipped: 0 }

export function resetWriteStats() { stats = { written: 0, skipped: 0 } }
export function noteWrite(unchanged) {
  if (unchanged) stats.skipped++
  else stats.written++
}
export function getWriteStats() { return { ...stats } }
