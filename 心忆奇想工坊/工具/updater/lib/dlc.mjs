/**
 * DLC（延迟包）核心库：源包区 `updater/dlc/<id>/`（工坊编辑 / 打包 / 上传）、运行区 `public/dlc/<id>/`（模拟器直接 fetch）。
 * 一个包 = `dlc.json`（清单 + 提供哪些接口）+ `data/*.json`（每接口一份）+ `assets/**`（已转码 webp）。
 * 「接口」是包与模拟器之间唯一的契约：模拟器只认接口名，包不直接改模拟器。
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { TOOL_ROOT, PUBLIC, exists, readJson, writeJson, pythonBin, pyFailText } from './util.mjs'

/** 源包区（工坊编辑用）—— 跟着工具根走：发行版里 expansion 包存在工坊目录，不是模拟器 */
const DLC_SRC = path.join(TOOL_ROOT, 'updater', 'dlc')
/** 运行区（模拟器 fetch 用；public 下会被 vite 原样服务） */
const DLC_LIVE = path.join(PUBLIC, 'dlc')

const LIVE_INDEX = path.join(DLC_LIVE, 'index.json')

/** 模拟器认识的挂载接口（前端 src/core/dlc-interfaces.ts 是同一份契约） */
export const INTERFACES = {
  'pool.banner': { label: '服装阁', desc: '往共鸣页挂一整只新服装阁（含套装）' },
  'pool.set': { label: '套装', desc: '往指定服装阁里追加一套服装' },
  'codex.story': { label: '故事', desc: '往故事图鉴追加一篇套装故事' },
  'codex.reading': { label: '阅读物', desc: '往阅读物图鉴追加一篇' },
  'version.banner': { label: '版本', desc: '往版本页追加一个小版本' },
}

/* ────────────────────────────── 索引 ────────────────────────────── */

export function readLiveIndex() {
  return readJson(LIVE_INDEX, { updatedAt: '', packages: [] }) || { updatedAt: '', packages: [] }
}

function writeLiveIndex(idx) {
  writeJson(LIVE_INDEX, { updatedAt: new Date().toISOString(), packages: idx.packages || [] })
}

/* ────────────────────────────── 包身份 ────────────────────────────── */

/**
 * 包 id：只允许小写字母 / 数字 / 短横线（会进 URL `/dlc/<id>/…` 与文件名，必须能转写成 ASCII）；
 * 调用方传稳定 ASCII 底名（`banner-080` / `set-s0438`），拿不到时才退回内容短 hash。
 */
export function slugId(name) {
  const base = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (base) return base.slice(0, 48)
  let h = 0
  for (const ch of String(name || '')) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return `dlc-${h.toString(36)}`
}

/** 唯一化：目录已存在就加 -2 / -3 …（源包区与运行区都算，两边不能同名） */
export function uniqueId(base, dirOf) {
  let id = base
  let n = 2
  while (exists(dirOf(id)) || exists(path.join(PUBLIC, 'dlc', id))) id = `${base}-${n++}`
  return id
}

/* ────────────────────────────── 读写 ────────────────────────────── */

export function srcDir(id) {
  return path.join(DLC_SRC, id)
}

function liveDir(id) {
  return path.join(DLC_LIVE, id)
}

/** 读包的 dlc.json（源包区优先，回落到运行区） */
export function writeManifest(dir, manifest) {
  writeJson(path.join(dir, 'dlc.json'), manifest)
}

/** 列出源包区里的所有包（含元信息） */
export function listSrc() {
  if (!exists(DLC_SRC)) return []
  const out = []
  for (const e of fs.readdirSync(DLC_SRC, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith('.')) continue
    const mf = readJson(path.join(DLC_SRC, e.name, 'dlc.json'), null)
    if (!mf) continue
    out.push({
      id: mf.id || e.name,
      dir: e.name,
      name: mf.name || mf.id || e.name,
      version: mf.version || '0.0.0',
      author: mf.author || '',
      description: mf.description || '',
      createdAt: mf.createdAt || '',
      provides: (mf.provides || []).map((p) => p.interface),
      mounted: isInstalled(mf.id || e.name),
    })
  }
  return out.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
}

function isInstalled(id) {
  return exists(path.join(liveDir(id), 'dlc.json'))
}

/* ────────────────────────────── 安装 / 卸载 ────────────────────────────── */

/**
 * 把源包（或任意目录）安装进运行区：只是拷贝，运行区是静态目录，模拟器 fetch 到的就是最新内容。
 */
export function install(id, { from = null, log = () => {} } = {}) {
  const src = from || srcDir(id)
  const mf = readJson(path.join(src, 'dlc.json'), null)
  if (!mf) throw new Error('包里没有 dlc.json：' + src)
  if (!mf.id) mf.id = id
  mf.id = id

  const dst = liveDir(id)
  // 先清干净再拷，避免旧版本残留文件（包更新后多出来的文件要消失）
  if (exists(dst)) rmTree(dst)
  copyTree(src, dst)

  // 运行区索引：默认全开，接口级开关留空 = 跟随包内默认
  const idx = readLiveIndex()
  const prev = (idx.packages || []).find((p) => p.id === id)
  const entry = {
    id,
    name: mf.name || id,
    version: mf.version || '0.0.0',
    author: mf.author || '',
    enabled: prev?.enabled ?? true,
    interfaces: prev?.interfaces ?? {},
    source: 'local',
    installedAt: prev?.installedAt || new Date().toISOString(),
  }
  idx.packages = (idx.packages || []).filter((p) => p.id !== id)
  idx.packages.push(entry)
  writeLiveIndex(idx)
  log(`已安装到运行区：public/dlc/${id}`)
  return entry
}

/** 卸载：运行区删掉 + 索引移除。源包区保留（还能再装回去） */
export function uninstall(id, { log = () => {} } = {}) {
  const dst = liveDir(id)
  // 运行区目录删不掉时也要把索引条目摘掉
  let dirError = null
  try {
    if (exists(dst)) rmTree(dst)
  } catch (e) {
    dirError = String(e.message || e)
  }
  const idx = readLiveIndex()
  idx.packages = (idx.packages || []).filter((p) => p.id !== id)
  writeLiveIndex(idx)
  if (dirError) {
    throw new Error(`已从索引移除，但运行区目录删不掉：${dirError}`)
  }
  log(`已从运行区卸载：${id}`)
}

/** 改挂载开关：总开关 / 单接口开关 */
export function setMount(id, { enabled, interfaces } = {}) {
  const idx = readLiveIndex()
  const p = (idx.packages || []).find((x) => x.id === id)
  if (!p) throw new Error('运行区里没有这个包：' + id)
  if (typeof enabled === 'boolean') p.enabled = enabled
  if (interfaces && typeof interfaces === 'object') p.interfaces = { ...p.interfaces, ...interfaces }
  writeLiveIndex(idx)
  return p
}

/* ────────────────────────────── zip 打包 / 解包 ────────────────────────────── */

/**
 * 打包成 zip（交给 python 的 zipfile —— 项目本来就依赖 python 管线，
 * 不为这一个功能引入 npm 依赖）。
 */
export function packZip(dir, outZip) {
  fs.mkdirSync(path.dirname(outZip), { recursive: true })
  const py = [
    'import sys, os, zipfile',
    'src, out = sys.argv[1], sys.argv[2]',
    'if os.path.exists(out): os.remove(out)',
    'zf = zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9)',
    'for root, dirs, files in os.walk(src):',
    '    for f in files:',
    '        p = os.path.join(root, f)',
    '        zf.write(p, os.path.relpath(p, src).replace(os.sep, "/"))',
    'zf.close()',
  ].join('\n')
  const r = spawnSync(pythonBin(), ['-c', py, dir, outZip], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(pyFailText('打包失败', r, `（源：${path.basename(dir)}）`))
  return outZip
}

/**
 * 解包到目标目录；成员名逐个校验（zip 里可以写 `../../evil`，不拦就是任意写文件）。
 */
export function unpackZip(zipFile, destDir) {
  const py = [
    'import sys, os, zipfile',
    'zf_path, dest = sys.argv[1], sys.argv[2]',
    'zf = zipfile.ZipFile(zf_path)',
    'dest = os.path.abspath(dest)',
    'for name in zf.namelist():',
    '    if name.endswith("/"): continue',
    '    target = os.path.abspath(os.path.join(dest, name))',
    '    if not (target == dest or target.startswith(dest + os.sep)):',
    '        raise SystemExit("非法路径: " + name)',
    'zf.extractall(dest)',
  ].join('\n')
  const r = spawnSync(pythonBin(), ['-c', py, zipFile, destDir], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(pyFailText('解包失败', r))
  return destDir
}

/* ────────────────────────────── 杂项 ────────────────────────────── */

/** 递归拷贝目录 */
function copyTree(src, dst) {
  fs.mkdirSync(dst, { recursive: true })
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue
    const s = path.join(src, e.name)
    const d = path.join(dst, e.name)
    if (e.isDirectory()) copyTree(s, d)
    else fs.copyFileSync(s, d)
  }
}

/** 同步等一小会儿（ms）—— Node 没有同步 sleep，用 Atomics.wait */
function sleep(ms) {
  try {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
  } catch {
    const end = Date.now() + ms
    while (Date.now() < end) { /* busy wait */ }
  }
}

/**
 * 递归删除（只对包目录用）：原生子进程 → `fs.rmSync` → 手写逐层 unlink/rmdir 三级兜底，每级之后轮询确认目录真的消失。
 */
export function rmTree(dir, { budgetMs = 60000 } = {}) {
  if (!exists(dir)) return

  const deadline = Date.now() + budgetMs

  /** ① 原生子进程（绕开 shim 的回收站包装） */
  const nativeChild = () => {
    const script = 'require("fs").rmSync(process.argv[1], { recursive: true, force: true })'
    const r = spawnSync(process.execPath, ['-e', script, path.resolve(dir)], {
      env: { ...process.env, NODE_OPTIONS: '' },
      encoding: 'utf8',
      timeout: Math.max(1000, Math.min(30000, deadline - Date.now())),
      windowsHide: true,
    })
    return r.status === 0
  }

  /** ③ 手写逐层删（慢路径） */
  const walk = (d) => {
    let entries = []
    try { entries = fs.readdirSync(d, { withFileTypes: true }) } catch { return }
    for (const e of entries) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else {
        try { fs.unlinkSync(p) } catch { /* 占用 → 下一轮再来 */ }
      }
    }
    try { fs.rmdirSync(d) } catch { /* 非空 → 下一轮 */ }
  }

  let round = 0
  while (exists(dir) && Date.now() < deadline) {
    // ① 原生子进程
    if (nativeChild() && !exists(dir)) break

    // ② 直接删（正常环境走这条）
    try {
      fs.rmSync(dir, { recursive: true, force: true })
    } catch {
      /* 回收站语义失败 → 走慢路径 */
    }
    if (!exists(dir)) break

    // ③ 手动逐层删
    walk(dir)
    if (!exists(dir)) break

    round++
    sleep(Math.min(50 * round, 400))
  }

  if (exists(dir)) {
    throw new Error(`目录删不掉（可能有文件被占用）：${dir}`)
  }
}

/** 新包的骨架 */
export function newManifest(id, name) {
  return {
    schema: 'nikki-dlc/1',
    id,
    name: name || id,
    version: '1.0.0',
    author: '',
    description: '',
    createdAt: new Date().toISOString(),
    requires: { simulator: '>=2.8.03' },
    mount: { enabled: true },
    provides: [],
  }
}
