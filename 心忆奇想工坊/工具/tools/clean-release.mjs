/**
 * 清理发行版里的冗余文件。v2.1.01
 *
 *   node tools/clean-release.mjs
 *
 * 为什么需要：`pack-release.mjs` 已经改成只复制「管线依赖闭包」，但**已经打好的**
 * 发行目录里还留着上一版的全量 tools/（110 个文件、验收脚本、截图、Python 缓存）。
 * 这个脚本按同一套规则就地清理，不用重新打包（重新打包要重拷 2.6G）。
 *
 * 清理三类：
 *   ① 工具/tools/  → 只留管线依赖闭包（其余 99 个开发期脚本）
 *   ② 截图 / 缓存  → tools/shots/、tools/*.png、tools/__pycache__/
 *   ③ 开发期遗留   → data/信息表/前后名称对照表.md、updater/README.md
 *
 * 保留：数据（信息表 / 套装库 / 故事 / 阅读物 / pool-map.json）、
 *      运行时（python + Pillow + ffmpeg）、成品（public/assets）、存档（userdata）。
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const UPD = path.join(ROOT, 'release', '无限暖暖发行版', '心忆奇想工坊')
const TOOLS = path.join(UPD, '工具', 'tools')
const DATA = path.join(UPD, '工具', 'data')

if (!fs.existsSync(TOOLS)) {
  console.error('✗ 找不到发行版工坊目录:', TOOLS)
  process.exit(1)
}

/** 管线入口（与 pack-release.mjs 一致） */
const PIPELINE_ENTRIES = [
  'build-pool-map.py', 'collect-assets.py', 'gen-stories.py', 'gen-readings.py',
]

/** 依赖闭包：与 pack-release.mjs 同一套算法 */
function pipelineClosure() {
  const dir = path.join(ROOT, 'tools')
  const files = fs.readdirSync(dir).filter((f) => /\.(py|mjs)$/.test(f))
  const need = new Set()
  const scan = (name) => {
    if (need.has(name)) return
    need.add(name)
    const p = path.join(dir, name)
    if (!fs.existsSync(p)) return
    const s = fs.readFileSync(p, 'utf8')
    for (const m of s.matchAll(/^\s*(?:from\s+([A-Za-z_]\w*)\s+import|import\s+([A-Za-z_]\w*))/gm)) {
      const mod = m[1] || m[2]
      for (const cand of [mod + '.py', mod + '.mjs']) if (files.includes(cand)) scan(cand)
    }
    for (const m of s.matchAll(/['"]([\w-]+\.py)['"]/g)) {
      if (files.includes(m[1])) scan(m[1])
    }
  }
  for (const e of PIPELINE_ENTRIES) scan(e)
  return [...need].sort()
}

/** 删除一个文件/目录（存在才删），返回是否删了 */
function rm(p) {
  if (!fs.existsSync(p)) return false
  const st = fs.statSync(p)
  if (st.isDirectory()) fs.rmSync(p, { recursive: true, force: true })
  else fs.rmSync(p, { force: true })
  return true
}

/** 数一棵子树里的文件数（用于报告删了多少个源文件） */
function countFiles(root) {
  let n = 0
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else n++
    }
  }
  if (fs.existsSync(root)) walk(root)
  return n
}

/**
 * 删掉一棵子树里的**空目录**（自底向上）。
 *
 * 为什么需要：`pack-release.mjs` 用 robocopy 的 /XF 排除媒体文件，但 robocopy
 * **只排文件、保留空目录** —— 于是发行版的 dist/ 里会留下 392 个空壳
 * （banners/bg、milestones/banner-001…），体积是 0 但纯属垃圾。
 */
function pruneEmpty(root) {
  let n = 0
  const walk = (d) => {
    if (!fs.existsSync(d)) return
    let empty = true
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) {
        walk(p)
        if (fs.existsSync(p) && fs.readdirSync(p).length === 0) { fs.rmSync(p, { recursive: true, force: true }); n++ }
        else empty = false
      } else empty = false
    }
    return empty
  }
  walk(root)
  return n
}

let removedFiles = 0
let removedDirs = 0
let freed = 0

function sizeOf(p) {
  let n = 0
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const q = path.join(d, e.name)
      if (e.isDirectory()) walk(q)
      else { try { n += fs.statSync(q).size } catch { /* ignore */ } }
    }
  }
  if (fs.existsSync(p)) {
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p)
    else n = st.size
  }
  return n
}

console.log('== 清理发行版冗余 ==')
console.log('  目标:', path.relative(ROOT, UPD))

// ── ① tools/ 只留依赖闭包 ─────────────────────────────
const keep = new Set(pipelineClosure())
console.log(`\n[1] 工具/tools/ 只留管线依赖闭包（${keep.size} 个）`)
for (const f of fs.readdirSync(TOOLS)) {
  const p = path.join(TOOLS, f)
  const isDir = fs.statSync(p).isDirectory()
  if (isDir) {
    // 目录：__pycache__ / shots 等一律删
    freed += sizeOf(p)
    if (rm(p)) { removedDirs++; console.log('    - 目录', f) }
    continue
  }
  if (keep.has(f)) continue
  freed += sizeOf(p)
  if (rm(p)) { removedFiles++; console.log('    -', f) }
}
// 白名单文件补齐（发行版可能缺）
for (const f of keep) {
  const src = path.join(ROOT, 'tools', f)
  const dst = path.join(TOOLS, f)
  if (!fs.existsSync(dst) && fs.existsSync(src)) {
    fs.copyFileSync(src, dst)
    console.log('    + 补齐', f)
  }
}
console.log('    保留:', [...keep].join(', '))

// ── ② data/ 的开发期遗留 + 随包源目录 ──────────────────
console.log('\n[2] 编辑数据里的开发期遗留 / 随包源目录')
const legacy = [
  path.join(DATA, '信息表', '前后名称对照表.md'),   // v2.0.02 起管线不再读
  path.join(DATA, '阅读物', 'desktop.ini'),         // Windows 自动生成的文件夹个性化文件
  path.join(DATA, '阅读物', '系列分类说明.md'),     // 描述早已不存在的「系列子目录」
]
for (const p of legacy) {
  if (fs.existsSync(p)) {
    freed += sizeOf(p)
    if (rm(p)) { removedFiles++; console.log('    -', path.relative(UPD, p)) }
  }
}

// v2.1.02：`故事/` `套装库/` `阅读物/` 不再随包 ——
// 成品（stories.json / readings.json / pool-map 里的套装文案）已经在模拟器里，
// 这三个目录在发行版只当「增量补丁」（用户拖进来的文件覆盖对应那一条）。
// 用户在工坊里拖文件时目录会自动重建，所以这里删干净。
for (const d of ['故事', '套装库', '阅读物']) {
  const p = path.join(DATA, d)
  if (fs.existsSync(p)) {
    const n = countFiles(p)
    freed += sizeOf(p)
    if (rm(p)) { removedDirs++; console.log(`    - 工具/data/${d}/（${n} 个源文件，成品已在模拟器里）`) }
  }
}

// ── ③ 工坊代码里的过时说明 + 运行时状态 ─────────────────
console.log('\n[3] 工坊代码里的过时说明 / 运行时状态')
const readme = path.join(UPD, '工具', 'updater', 'README.md')
if (fs.existsSync(readme)) {
  freed += sizeOf(readme)
  if (rm(readme)) { removedFiles++; console.log('    - 工具/updater/README.md（开发服务器版说明，与发行版不符）') }
}
// 快照 / 写入指纹：每次写入都会重新生成，出厂时不该带（实测能占 20M）
const state = ['.snapshots', '.inbox', '.dist']
for (const d of state) {
  const p = path.join(UPD, '工具', 'updater', d)
  if (fs.existsSync(p)) {
    freed += sizeOf(p)
    if (rm(p)) { removedDirs++; console.log(`    - 工具/updater/${d}/（运行时状态，出厂不该带）`) }
  }
}
for (const f of ['.last-apply.json', '.write-cache.json', '.passthrough.json']) {
  const p = path.join(UPD, '工具', 'updater', f)
  if (fs.existsSync(p)) {
    freed += sizeOf(p)
    if (rm(p)) { removedFiles++; console.log(`    - 工具/updater/${f}`) }
  }
}

// ── ④ dist 里的空壳目录 + Python 缓存 ─────────────────
console.log('\n[4] 空目录与缓存')
const simDist = path.join(ROOT, 'release', '无限暖暖发行版', '无限暖暖模拟器', 'dist')
const pruned = pruneEmpty(simDist)
if (pruned) console.log('    - dist/ 空目录', pruned, '个（robocopy 排文件却留的空壳）')

const pycache = []
const findPycache = (d) => {
  if (!fs.existsSync(d)) return
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (!e.isDirectory()) continue
    if (e.name === '__pycache__') { pycache.push(p); continue }
    findPycache(p)
  }
}
findPycache(path.join(UPD, '运行时'))
for (const p of pycache) {
  if (rm(p)) { removedDirs++; console.log('    -', path.relative(UPD, p)) }
}

// ── 汇总 ──────────────────────────────────────────────
console.log('\n== 完成 ==')
console.log('  删除文件', removedFiles, '个 / 目录', removedDirs, '个')
console.log('  释放', (freed / 1048576).toFixed(1), 'MB')
console.log('  剩余 tools/:', fs.readdirSync(TOOLS).join(', '))
