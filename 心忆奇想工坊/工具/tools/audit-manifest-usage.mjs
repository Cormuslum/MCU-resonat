/** 找出 manifest 里前端**零引用**的素材键（死分支）：`node tools/audit-manifest-usage.mjs [--json]` */
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const ROOT = process.cwd()
const SRC = path.join(ROOT, 'src')
const MANIFEST = path.join(ROOT, 'public', 'assets', 'manifest.json')

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(vue|ts)$/.test(e.name)) out.push(p)
  }
  return out
}

/** Vue SFC 的 <script> 块 */
function scriptOf(text) {
  const m = text.match(/<script[^>]*>([\s\S]*?)<\/script>/i)
  return m ? m[1] : ''
}

/** Vue 模板里的表达式 —— 模板才是 `ui.*` 引用的大头，只扫 `<script>` 会把一堆在用的素材误判成死分支 */
function templateExprs(text) {
  const tpl = text.match(/<template[^>]*>([\s\S]*)<\/template>/i)
  if (!tpl) return []
  const body = tpl[1]
  const out = []
  const attrRe = /(?::|v-bind:|v-if=|v-else-if=|v-show=|v-model=|@|v-on:)[\w.-]+\s*=\s*"([^"]*)"/g
  let m
  while ((m = attrRe.exec(body))) out.push(m[1])
  const intRe = /\{\{([\s\S]*?)\}\}/g
  while ((m = intRe.exec(body))) out.push(m[1])
  return out
}

/** 抽出一条属性访问链的标识符数组：`ui?.bgMain` 的 `ui` 落在 expression 上、`ui.value?.banner` 的 `.value` 会把链劈成两段， 所以先摊平成标识符序列，再把尾部别名挪到最前面，`.value` 这类解包键单独剔除 */
const UNWRAP = new Set(['value'])

function chainOf(node) {
  const parts = []
  let cur = node
  let tail = null
  while (cur) {
    if (ts.isPropertyAccessExpression(cur)) {
      parts.unshift(cur.name.text)
      cur = cur.expression
      continue
    }
    if (ts.isElementAccessExpression(cur)) {
      const a = cur.argumentExpression
      parts.unshift(a && ts.isStringLiteral(a) ? a.text : '[]')
      cur = cur.expression
      continue
    }
    if (ts.isIdentifier(cur)) { tail = cur.text; break }
    break
  }
  // parts 形如 ['value','banner','fallbackBg']，tail = 'ui'
  const chain = []
  if (tail) chain.push(tail)
  for (const p of parts) {
    if (chain.length && UNWRAP.has(p)) continue   // 跳过解包键
    chain.push(p)
  }
  return chain
}

/** 算出一条属性访问链的 manifest 子路径：`chain` 从最外层到最内层（如 ['ui','deco','starlight']），`aliases` = 别名表； 返回不含开头 'ui.' 的路径，认不出来返回 null */
function chainToPath(chain, aliases) {
  if (!chain.length) return null
  const head = chain[0]
  // ① 别名优先：`const ui = computed(() => store.manifest?.ui.home)` → 'ui' 是别名
  if (Object.prototype.hasOwnProperty.call(aliases, head)) {
    const base = aliases[head]
    const rest = chain.slice(1)
    return rest.length ? (base ? base + '.' + rest.join('.') : rest.join('.')) : base
  }
  // ② 直接挂在 manifest 上：store.manifest?.ui?.cursor → 'cursor'
  // 「不经 computed 直接读 store.manifest」写法，App.vue 的光标就是这么取的
  const manIdx = chain.indexOf('manifest')
  if (manIdx >= 0) {
    const uiIdx = chain.indexOf('ui', manIdx)
    if (uiIdx >= 0) return chain.slice(uiIdx + 1).join('.')
  }
  // ③ 裸 ui 开头：ui.deco.starlight
  if (head === 'ui' && chain.length >= 2) return chain.slice(1).join('.')
  return null
}

/** 剥掉 `?? null` / `|| undefined` 这类包裹，露出真正的取值表达式（否则箭头函数体里的别名解析不出来） */
function unwrapInit(node) {
  let cur = node
  for (let i = 0; i < 6 && cur; i++) {
    if (ts.isParenthesizedExpression(cur)) { cur = cur.expression; continue }
    if (ts.isBinaryExpression(cur) &&
        (cur.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken ||
         cur.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
      cur = cur.left
      continue
    }
    break
  }
  return cur
}

/** 收集「别名 → manifest 子路径」的绑定：直接取 manifest / 从别的别名派生 / 从局部变量派生； 后两种依赖先解析出来的别名，所以迭代到不动点为止 */
function aliasesIn(code, file) {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const aliases = {}
  /** 待解析的绑定：名字 → 源表达式 */
  const pending = []

  const collect = (node) => {
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isIdentifier(node.name)) {
      const name = node.name.getText(sf)
      const init = node.initializer
      let src = null
      if (ts.isCallExpression(init) && init.arguments.length) {
        // computed(() => store.manifest?.ui.xxx)  —— 函数体可能带 `?? null` 包裹
        const arg = init.arguments[0]
        if (ts.isArrowFunction(arg) || ts.isFunctionExpression(arg)) {
          src = unwrapInit(arg.body)
        }
      } else if (ts.isPropertyAccessExpression(init) || ts.isElementAccessExpression(init)) {
        // const b = ui.value?.banner
        src = init
      } else if (ts.isBinaryExpression(init)) {
        // const x = store.manifest?.ui.cursor ?? null
        src = unwrapInit(init)
      }
      if (src) pending.push([name, src])
    }
    ts.forEachChild(node, collect)
  }
  collect(sf)

  // 迭代到不动点：`b = ui.value?.banner` 要等 `ui` 先解析出来
  for (let round = 0; round < 8; round++) {
    let changed = false
    for (const [name, src] of pending) {
      if (aliases[name] !== undefined) continue
      const chain = chainOf(src)
      // ① 直接挂在 manifest 上：store.manifest?.ui.home → 'home'
      const manIdx = chain.indexOf('manifest')
      if (manIdx >= 0) {
        const uiIdx = chain.indexOf('ui', manIdx)
        if (uiIdx >= 0) {
          aliases[name] = chain.slice(uiIdx + 1).join('.')
          changed = true
          continue
        }
      }
      // ② 从别的别名派生：ui.value?.banner → 去掉解包键后接在别名后面
      const head = chain[0]
      const rest = chain.slice(1).filter((k) => !UNWRAP.has(k))
      const base = aliases[head]
      if (base === undefined) continue
      aliases[name] = rest.length ? (base ? base + '.' + rest.join('.') : rest.join('.')) : base
      changed = true
    }
    if (!changed) break
  }
  return aliases
}

/** 从一段代码里收集「用到的 manifest 路径」与「被动态下标污染的组」 */
function pathsIn(code, file, aliases) {
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
  const used = new Set()
  const dirtyGroups = new Set()

  const visit = (node) => {
    if (ts.isPropertyAccessExpression(node)) {
      const chain = chainOf(node)
      const p = chainToPath(chain, aliases)
      if (p) used.add(p)
      ts.forEachChild(node, visit)
      return
    }
    if (ts.isElementAccessExpression(node)) {
      const a = node.argumentExpression
      if (a && ts.isStringLiteral(a)) {
        // 常量下标：还能当路径用
        const chain = chainOf(node.expression)
        const p = chainToPath(chain, aliases)
        if (p) used.add(p + '.' + a.text)
      } else {
        // 动态下标：整组标脏 → 保守保留
        const chain = chainOf(node.expression)
        const p = chainToPath(chain, aliases)
        if (p) dirtyGroups.add(p.split('.')[0] || p)
      }
      ts.forEachChild(node, visit)
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)

  return { used, dirtyGroups }
}

const allUsed = new Set()
const allDirty = new Set()
for (const f of walk(SRC)) {
  const text = fs.readFileSync(f, 'utf8')
  let aliases = {}
  if (f.endsWith('.vue')) {
    const s = scriptOf(text)
    if (s.trim()) aliases = aliasesIn(s, f)
    const snippets = [s, ...templateExprs(text)]
    for (const code of snippets) {
      if (!code.trim()) continue
      const { used, dirtyGroups } = pathsIn(code, f, aliases)
      for (const u of used) allUsed.add(u)
      for (const d of dirtyGroups) allDirty.add(d)
    }
  } else if (text.trim()) {
    aliases = aliasesIn(text, f)
    const { used, dirtyGroups } = pathsIn(text, f, aliases)
    for (const u of used) allUsed.add(u)
    for (const d of dirtyGroups) allDirty.add(d)
  }
}

/* ── 对照 manifest ─────────────────────────────────────────────────── */
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'))

function leaves(node, p, out) {
  if (typeof node === 'string') out.push([p, node])
  else if (Array.isArray(node)) node.forEach((v, i) => leaves(v, `${p}[${i}]`, out))
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) leaves(v, `${p}.${k}`, out)
  }
}

const dead = []
const L = []
leaves(manifest, '', L)
for (const [p, v] of L) {
  if (!p.startsWith('.ui.')) continue
  const sub = p.slice('.ui.'.length)               // 如 'home.deco.starlight'
  const base = sub.split('.')[0]                  // 组名
  if (allUsed.has(sub)) continue
  if (allDirty.has(base)) continue
  dead.push({ manifestPath: p, file: v, group: base, key: sub.split('.').pop() })
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(dead, null, 1))
} else {
  console.log('== manifest 里前端零引用的 ui.* 条目 ==')
  for (const d of dead) console.log(`  ${d.manifestPath} → ${d.file}`)
  console.log(`\n合计 ${dead.length} 条`)
  console.log(`（已用路径 ${allUsed.size} 个 / 动态下标保守保留的组 ${[...allDirty].join(', ')}）`)
}
