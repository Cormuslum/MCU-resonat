/**
 * 死代码审计：找出 updater/ 里「导出但没人用」「定义但没人调」的符号。
 *
 * 纯静态分析（无 AST 库），用正则做符号级追踪：
 *   ① 收集每个文件的 export 名
 *   ② 收集每个文件里出现过的**导入名**（import { a, b } / import x from）
 *   ③ 收集每个文件里出现过的**本地标识符**（用于判断内部函数是否被调用）
 *
 * 输出：
 *   - 未被任何文件 import 的 export（跨文件死代码）
 *   - 未被任何文件引用的内部函数（文件内死代码）
 *   - import 了但从未使用的名字（多余导入）
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(process.argv[2] || 'updater')

function walk(dir) {
  const out = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(p))
    else if (/\.(mjs|js)$/.test(e.name)) out.push(p)
  }
  return out
}

const files = walk(ROOT)
const info = new Map()

for (const f of files) {
  const text = fs.readFileSync(f, 'utf8')
  const rel = path.relative(process.cwd(), f).replace(/\\/g, '/')

  // ── export 名 ──
  const exports = new Set()
  for (const m of text.matchAll(/^export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) exports.add(m[1])
  for (const m of text.matchAll(/^export\s+(?:const|let|var|class)\s+([A-Za-z_$][\w$]*)/gm)) exports.add(m[1])
  for (const m of text.matchAll(/^export\s*\{([^}]*)\}/gm)) {
    for (const part of m[1].split(',')) {
      const t = part.trim()
      if (!t) continue
      const as = t.match(/\bas\s+([A-Za-z_$][\w$]*)\s*$/)
      exports.add(as ? as[1] : t.replace(/^.*\s/, ''))
    }
  }
  // export default
  const hasDefault = /^export\s+default\s/m.test(text)

  // ── 导入名 ──
  const imports = new Map()   // 名字 → 来源说明
  for (const m of text.matchAll(/^import\s+(?:([A-Za-z_$][\w$]*)\s*,\s*)?\{([^}]*)\}\s*from/gm)) {
    if (m[1]) imports.set(m[1], 'default')
    for (const part of m[2].split(',')) {
      const t = part.trim()
      if (!t) continue
      const as = t.match(/\bas\s+([A-Za-z_$][\w$]*)\s*$/)
      imports.set(as ? as[1] : t.replace(/^.*\s/, ''), 'named')
    }
  }
  for (const m of text.matchAll(/^import\s+([A-Za-z_$][\w$]*)\s+from/gm)) imports.set(m[1], 'default')
  for (const m of text.matchAll(/^import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from/gm)) imports.set(m[1], 'namespace')

  // ── 本地定义（非 export） ──
  const locals = new Set()
  for (const m of text.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm)) locals.add(m[1])
  for (const m of text.matchAll(/^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)) locals.add(m[1])
  for (const m of text.matchAll(/^class\s+([A-Za-z_$][\w$]*)/gm)) locals.add(m[1])

  info.set(rel, { text, exports, imports, locals, hasDefault })
}

// ── 跨文件：谁导入了什么 ──
const importedBy = new Map()   // 导出名 → [使用它的文件]
for (const [rel, d] of info) {
  for (const name of d.imports.keys()) {
    if (!importedBy.has(name)) importedBy.set(name, [])
    importedBy.get(name).push(rel)
  }
}

// ── 跨文件死 export ──
const deadExports = []
for (const [rel, d] of info) {
  for (const name of d.exports) {
    const users = (importedBy.get(name) || []).filter((u) => u !== rel)
    if (!users.length) deadExports.push({ file: rel, name })
  }
}

// ── 文件内死函数：定义了、在本文件里出现过 ≤1 次（只有定义处）、也没被别的文件导入 ──
const deadLocals = []
for (const [rel, d] of info) {
  for (const name of d.locals) {
    if (d.exports.has(name)) continue          // export 的单独报
    // 出现次数：定义行 1 次 + 调用处
    const re = new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b', 'g')
    const hits = (d.text.match(re) || []).length
    if (hits <= 1) deadLocals.push({ file: rel, name, hits })
  }
}

// ── 多余导入：import 了但全文只出现 1 次（就是 import 那行）──
const unusedImports = []
for (const [rel, d] of info) {
  for (const name of d.imports.keys()) {
    const re = new RegExp('\\b' + name.replace(/\$/g, '\\$') + '\\b', 'g')
    const hits = (d.text.match(re) || []).length
    if (hits <= 1) unusedImports.push({ file: rel, name })
  }
}

const out = { deadExports, deadLocals, unusedImports }
if (process.argv.includes('--json')) {
  console.log(JSON.stringify(out, null, 1))
} else {
  console.log('=== 跨文件死 export（导出了但没人数用）===')
  for (const x of deadExports) console.log(`  ${x.file}  →  ${x.name}`)
  console.log('\n=== 文件内死定义（只出现 1 次 = 只有定义）===')
  for (const x of deadLocals) console.log(`  ${x.file}  →  ${x.name}  (${x.hits})`)
  console.log('\n=== 多余导入（import 了但没用）===')
  for (const x of unusedImports) console.log(`  ${x.file}  →  ${x.name}`)
}
