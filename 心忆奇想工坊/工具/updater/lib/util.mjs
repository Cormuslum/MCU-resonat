/**
 * 基础工具：路径、文件读写、图片尺寸、CSV。
 *
 * 零依赖 —— 「心忆奇想工坊」要能在没装任何 npm 包的情况下 `node updater/server.mjs` 起来。
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
/**
 * 工具根：`updater/` 与 `tools/` 所在的目录。
 *
 * 开发版 = `<仓库根>/心忆奇想工坊/工具`，发行版 = `<发行根>/心忆奇想工坊/工具` ——
 * **两者同构**，所以下面所有 `TOOL_ROOT/updater/...` 的拼法在两个环境里都成立。
 */
export const TOOL_ROOT = path.resolve(HERE, '..', '..')
/**
 * 工作区根：`心忆奇想工坊/` 与 `无限暖暖模拟器/` 的公共父目录。
 * 开发版 = 仓库根，发行版 = 发行根。开发期产物（归档素材 / .dev-guard.json）落在它下面。
 */
export const WORKSPACE = path.resolve(TOOL_ROOT, '..', '..')
/**
 * 成品根：`public/assets` 与 `src/` 所在的目录（= 无限暖暖模拟器/）。
 * 开发版与发行版同构；发行版启动器也可用 `NIKKI_ROOT` 显式覆盖。
 */
export const ROOT = process.env.NIKKI_ROOT
  ? path.resolve(process.env.NIKKI_ROOT)
  : path.join(WORKSPACE, '无限暖暖模拟器')
/**
 * 编辑数据根（信息表 / 套装库 / 故事 / 阅读物 / pool-map）。
 *
 * 开发版在 `<仓库根>/素材/`；发行版由启动器设 `NIKKI_DATA_DIR` 指到**工坊工具目录**下的
 * `data/` —— 玩家只下载模拟器时，编辑数据不会跟着走。
 */
export const ASSET = process.env.NIKKI_DATA_DIR
  ? path.resolve(process.env.NIKKI_DATA_DIR)
  : path.join(WORKSPACE, '素材')
/**
 * 成品根 `public/`。发行版里成品在**模拟器**目录，由 `NIKKI_OUT_DIR`
 * （= 模拟器/public/assets，给 Python 管线用）反推上一级。
 */
export const PUBLIC = process.env.NIKKI_OUT_DIR
  ? path.dirname(path.resolve(process.env.NIKKI_OUT_DIR))
  : path.join(ROOT, 'public')

/** 两个路径的最长公共祖先（用于算「发行根」） */
function commonAncestor(a, b) {
  const as = a.split(path.sep)
  const bs = b.split(path.sep)
  let i = 0
  while (i < as.length && i < bs.length && as[i] === bs[i]) i++
  return as.slice(0, i).join(path.sep) || path.sep
}

/**
 * 「发行根」：数据根与成品根的公共祖先。
 *
 * 开发版 = 项目根（`素材/` 与 `public/assets/` 都在它下面）；
 * 发行版 = `无限暖暖发行版/`（工坊的 `工具/data/` 与模拟器的 `public/assets/` 是兄弟）。
 *
 * 所有**给人看的路径**都相对于它 ——
 * 于是开发版显示 `素材/信息表/版本表.csv`、`public/assets/manifest.json`，
 * 发行版显示 `心忆奇想工坊/工具/data/信息表/版本表.csv`、`无限暖暖模拟器/public/assets/manifest.json`，
 * 两边都是磁盘上的真实位置，不会误导。
 */
const DISPLAY_ROOT = commonAncestor(ASSET, path.join(PUBLIC, 'assets'))

/** 项目内相对路径（统一正斜杠，方便展示与写进 JSON） */
export function rel(p) {
  return path.relative(DISPLAY_ROOT, p).split(path.sep).join('/')
}

/** 数据根的展示前缀（开发版 `素材`，发行版 `心忆奇想工坊/工具/data`） */
export function dataLabel() {
  return path.relative(DISPLAY_ROOT, ASSET).split(path.sep).join('/')
}

/** 成品根的展示前缀（开发版 `public/assets`，发行版 `无限暖暖模拟器/public/assets`） */
export function outLabel() {
  return path.relative(DISPLAY_ROOT, path.join(PUBLIC, 'assets')).split(path.sep).join('/')
}

/**
 * 工具根的展示前缀。
 *
 * 只有**归档目录**（移出套装 / 删掉的素材）落在工具根而不是数据根
 * （`jobs.mjs` 的 `归档素材/`），所以文案里需要一个 `{T}` 占位符。
 * 开发版工具根 = 展示根 → 返回空串（`{T}归档素材/` 就显示 `归档素材/`）；
 * 发行版 → `心忆奇想工坊/工具/`。
 */
export function toolLabel() {
  const r = path.relative(DISPLAY_ROOT, TOOL_ROOT).split(path.sep).join('/')
  return r ? `${r}/` : ''
}

/**
 * 素材根内的相对路径 —— 写进 pool-map / overrides 的键必须用这个。
 *
 * 不能用 `rel()`：发行版的数据根在工坊目录，`rel()` 会得到 `../../心忆奇想工坊/data/…`，
 * 而管线那边算出来的键是 `服装阁/…`（相对素材根），两边对不上，重定向就全落空。
 */
export function assetRel(p) {
  return path.relative(ASSET, p).split(path.sep).join('/')
}

/**
 * UI 整包根目录名。探测顺序：`界面/UI整包` → `0主素材` → `朋友分享素材`。
 *
 * 三代名字都出现过：最早 `朋友分享素材/UI/...`，2026-11-02 并进 `0主素材/`，
 * 之后用户又把整包归位到 `素材/界面/UI整包/`（v1.9.07 起是**唯一正确**的位置）。
 * 前两代已废弃，这里保留只为了老素材包还能跑；新写入一律落 `界面/UI整包`。
 */
export function uiRoot() {
  for (const name of ['界面/UI整包', '0主素材', '朋友分享素材']) {
    if (exists(path.join(ASSET, name))) return name
  }
  return '界面/UI整包'
}

export function exists(p) {
  try {
    fs.accessSync(p)
    return true
  } catch {
    return false
  }
}

export function readText(p, fallback = '') {
  try {
    return fs.readFileSync(p, 'utf8')
  } catch {
    return fallback
  }
}

export function writeText(p, text) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, text, 'utf8')
}

export function readJson(p, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return fallback
  }
}

export function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true })
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8')
}

export function stamp() {
  const d = new Date()
  const p = (n, w = 2) => String(n).padStart(w, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
}

/* ────────────────────────────── 图片尺寸 ────────────────────────────── */

/**
 * 读图片宽高（PNG / JPEG / WebP / GIF / BMP），读不出来返回 null。
 *
 * 只解析文件头，不解码像素 —— 拖进几百张图做归类时这是唯一现实的方案
 * （sharp / jimp 都要装包，而更新工坊的第一步「识别」必须秒回）。
 */
export function imageSize(file) {
  let fd
  try {
    fd = fs.openSync(file, 'r')
    const st = fs.fstatSync(fd)
    if (st.size < 32) return null
    const buf = Buffer.alloc(Math.min(65536, st.size))
    fs.readSync(fd, buf, 0, buf.length, 0)

    // PNG：8 字节签名后是 IHDR，宽高各 4 字节大端
    if (buf.readUInt32BE(0) === 0x89504e47) {
      return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), type: 'png' }
    }

    // GIF：逻辑屏幕宽高各 2 字节小端
    if (buf.toString('ascii', 0, 3) === 'GIF') {
      return { w: buf.readUInt16LE(6), h: buf.readUInt16LE(8), type: 'gif' }
    }

    // BMP
    if (buf.toString('ascii', 0, 2) === 'BM') {
      return { w: buf.readInt32LE(18), h: Math.abs(buf.readInt32LE(22)), type: 'bmp' }
    }

    // WebP：RIFF....WEBP + 子块（VP8X 有显式画布尺寸；VP8 / VP8L 要挖帧头）
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const chunk = buf.toString('ascii', 12, 16)
      if (chunk === 'VP8X') {
        const w = 1 + buf.readUIntLE(24, 3)
        const h = 1 + buf.readUIntLE(27, 3)
        return { w, h, type: 'webp' }
      }
      if (chunk === 'VP8 ') {
        // 帧头：起始码 9d 01 2a 之后 2 字节宽、2 字节高（各 14 位有效）
        const i = buf.indexOf(Buffer.from([0x9d, 0x01, 0x2a]), 20)
        if (i > 0) {
          return {
            w: buf.readUInt16LE(i + 3) & 0x3fff,
            h: buf.readUInt16LE(i + 5) & 0x3fff,
            type: 'webp',
          }
        }
      }
      if (chunk === 'VP8L') {
        // 无损：14 位宽、14 位高，紧跟在 0x2f 之后
        const b = buf.readUInt32LE(21)
        return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1, type: 'webp' }
      }
      return null
    }

    // JPEG：扫段找 SOFn
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2
      while (i < buf.length - 9) {
        if (buf[i] !== 0xff) {
          i++
          continue
        }
        const m = buf[i + 1]
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
          return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5), type: 'jpeg' }
        }
        const len = buf.readUInt16BE(i + 2)
        i += 2 + len
      }
    }
    return null
  } catch {
    return null
  } finally {
    if (fd !== undefined) try { fs.closeSync(fd) } catch { /* ignore */ }
  }
}

/* ────────────────────────────── CSV ────────────────────────────── */

/** 极简 CSV 解析（支持双引号包裹与 "" 转义），返回对象数组 */
export function parseCsv(text) {
  const rows = []
  let row = []
  let cur = ''
  let q = false
  const src = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') { cur += '"'; i++ } else q = false
      } else cur += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(cur); cur = '' }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
    else if (c === '\r') { /* skip */ }
    else cur += c
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row) }
  if (!rows.length) return []
  const head = rows[0].map((h) => h.trim())
  return rows.slice(1)
    .filter((r) => r.some((x) => x.trim() !== ''))
    .map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? '').trim()])))
}

/** 写 CSV：BOM + 指定列顺序（与素材/信息表里现有文件同格式，Excel 直接可读） */
export function toCsv(headers, rows) {
  const esc = (v) => {
    const s = String(v ?? '')
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '\uFEFF' + [headers.map(esc).join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n') + '\n'
}

/* ────────────────────────────── 其它 ────────────────────────────── */

/**
 * 版本号排序键：0.1 < 0.2 < 1.0 < 1.1 < 1.10 < 2.11。
 *
 * 既接受字符串（`'1.10'`）也接受版本行对象（`{ v: '1.10', ... }`）——
 * v1.9.07 之前只认字符串，而 `sortVersions()` 传进来的全是对象，
 * `String(obj)` 得到 `"[object Object]"` → 解析成 `[0]`，
 * 于是所有键相等、排序成了空操作，CSV 一直保持写入顺序（0.1 / 0.2 被追加在末尾，
 * 工坊下拉也就把 0.2 排到了 2.11 后面）。
 */
export function verKey(v) {
  const s = (v && typeof v === 'object') ? (v.v ?? v.version ?? '') : v
  return String(s).split('.').map((n) => Number(n) || 0)
}

export function sortVersions(list) {
  return [...list].sort((a, b) => {
    const x = verKey(a)
    const y = verKey(b)
    for (let i = 0; i < Math.max(x.length, y.length); i++) {
      const d = (x[i] ?? 0) - (y[i] ?? 0)
      if (d) return d
    }
    return 0
  })
}

/** 文件名净化：去掉 Windows 不允许的字符，保留中文 */
export function safeName(s) {
  return String(s).replace(/[\\/:*?"<>|\r\n]/g, '_').trim()
}

/* ────────────────────────────── Python ────────────────────────────── */

/** Windows 上 python 可能叫 py，探测一次并缓存 */
let PY = null

function probe(cmd, args) {
  try {
    const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: 8000 })
    return r.status === 0
  } catch {
    return false
  }
}

/**
 * 该用哪个 python 解释器。
 *
 * 发行版自带运行时（`工坊目录/运行时/python.exe`）**优先**。系统 PATH 上的 `python`
 * 在很多 Windows 上是 Microsoft Store 的假存根 —— 一跑就 exit 9009 且 **stderr 为空**。
 * 这就是「打包 zip 失败：」（冒号后面什么都没有）的真因（v2.2.02）：
 * 那时 dlc/archive/remote 三处还在裸调 `python`，而管线早就走这个函数了。
 */
export function pythonBin() {
  if (PY) return PY
  const builtin = process.env.NIKKI_PY
    ? path.resolve(process.env.NIKKI_PY)
    : (process.env.NIKKI_RUNTIME_DIR
      ? path.join(path.resolve(process.env.NIKKI_RUNTIME_DIR), 'python.exe')
      : '')
  if (builtin && exists(builtin)) { PY = builtin; return PY }
  for (const cand of ['python', 'py', 'python3']) {
    if (probe(cand, ['-c', 'print(1)'])) { PY = cand; return PY }
  }
  PY = 'python'
  return PY
}

/**
 * 把 `spawnSync` 的失败结果翻成一句人话。
 *
 * `status === 9009` / `error.code === 'ENOENT'` 都不是「脚本报错」，而是
 * 「根本没跑起来」—— 以前统一拼 `'…失败：' + stderr`，stderr 为空时界面上就只剩
 * 一个孤零零的冒号，用户无从下手。
 */
export function pyFailText(prefix, r, extra = '') {
  if (r?.error?.code === 'ENOENT') {
    return `${prefix}：找不到 Python（${r.error.spawnargs?.[0] || 'python'}）。`
      + '发行版请用启动器打开（它带 `运行时/python.exe`），开发版请装 Python 3。'
  }
  const err = String(r?.stderr || '').trim()
  if (err) return `${prefix}：${err}${extra}`
  const code = typeof r?.status === 'number' ? r.status : '?'
  if (code === 9009) {
    return `${prefix}：系统里的 python 是 Microsoft Store 的占位程序（exit 9009）。`
      + '发行版请用启动器打开，或设置 NIKKI_RUNTIME_DIR 指向自带运行时。'
  }
  return `${prefix}：子进程退出码 ${code}，没有输出。${extra}`
}
