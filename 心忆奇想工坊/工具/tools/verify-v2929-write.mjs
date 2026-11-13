/**
 * v2.1.00 验收：发行版工坊「外部源 → 成品」直转（不落内部源）
 *
 *   node tools/verify-v2929-write.mjs [端口]
 *
 * 前置：发行版工坊 exe 已启动（默认 5200），模拟器目录在旁边。
 * 干什么：对「心愿栖金蕊」换一张背景图，然后核对
 *   ① 服务没报 9009（自带 Python 生效）
 *   ② public/assets/banners/bg/1000.webp 的内容确实变了
 *   ③ 工坊的数据目录里**没有**多出 `服装阁/` 或任何图片副本
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const PORT = Number(process.argv[2] || 5200)
const BASE = `http://127.0.0.1:${PORT}`

const ROOT = process.cwd()
const OUT = path.join(ROOT, 'release', '无限暖暖发行版')
const SIM = path.join(OUT, '无限暖暖模拟器')
const TOOL = path.join(OUT, '心忆奇想工坊', '工具')
const DATA = path.join(TOOL, 'data')

const TARGET = '心愿栖金蕊'
const KEY = '1000'

const hash = (p) => {
  try { return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').slice(0, 16) } catch { return 'missing' }
}

const bgWebp = path.join(SIM, 'public', 'assets', 'banners', 'bg', `${KEY}.webp`)
const before = hash(bgWebp)
console.log(`· 现状  banners/bg/${KEY}.webp = ${before}`)

// 用另一座阁的背景冒充「用户从 E 盘选的新图」
const srcCands = [
  path.join(ROOT, '素材', '服装阁', '0.1·祈愿星', '心轮曳星河', '背景图.jpg'),
  path.join(ROOT, '素材', '服装阁'),
]
let src = srcCands[0]
if (!fs.existsSync(src)) {
  console.error('✗ 找不到测试用图:', src)
  process.exit(1)
}
console.log('· 外部源 =', path.relative(ROOT, src))

const payload = {
  job: 'pool',
  fields: {
    mode: 'edit', target: TARGET, version: '0.1', name: TARGET,
    gachaKey: KEY, type: 'limited', typeName: '', setRemove: '', setAdd: '',
  },
  files: [{ slot: 'bg', setIndex: null, src, name: '背景图.jpg', kind: 'image' }],
  options: { restartDev: false, force: true },
}

// 内置 88 座阁是只读的（工坊只允许改「自建内容」）。测试时先把目标阁临时标记为自建，
// 跑完立刻还原 —— 否则这个测试没法验证「改已有阁」的真实链路。
const CUSTOM = path.join(DATA, '信息表', '自建内容.json')
const origCustom = fs.readFileSync(CUSTOM, 'utf8')
try {
  const cur = JSON.parse(origCustom)
  if (!Array.isArray(cur.pools)) cur.pools = []
  if (!cur.pools.includes(TARGET)) cur.pools.push(TARGET)
  fs.writeFileSync(CUSTOM, JSON.stringify(cur, null, 2))
  console.log('· 临时标记为自建:', TARGET)

  const res = await fetch(`${BASE}/api/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    console.error('✗ /api/apply HTTP', res.status)
    process.exit(1)
  }
  globalThis.__applyText = await res.text()
} finally {
  fs.writeFileSync(CUSTOM, origCustom)
}

const text = globalThis.__applyText
const logs = []
let done = null
for (const line of text.split('\n')) {
  if (!line.startsWith('data: ')) continue
  try {
    const o = JSON.parse(line.slice(6))
    if (o.type === 'log') logs.push(o)
    if (o.type === 'done') done = o
  } catch { /* 半截行 */ }
}

// ── ① 关键日志
const flatLog = logs.map((l) => String(l.text || ''))
const has9009 = flatLog.some((t) => t.includes('9009'))
const direct = flatLog.find((t) => t.startsWith('直转：'))
const pipelineOk = done?.ok === true
console.log('\n== 管线日志 ==')
for (const l of logs) {
  const tag = l.kind === 'err' ? 'ERR ' : l.kind === 'warn' ? 'WARN' : l.kind === 'step' ? 'STEP' : '    '
  console.log(`  ${tag} ${String(l.text || '').slice(0, 150)}`)
}
console.log('  done.ok =', done?.ok, '| rolledBack =', done?.rolledBack ?? false)

// ── ② 产物
const after = hash(bgWebp)
console.log('\n== 核对 ==')
console.log('  [1] 无 9009 错误      :', has9009 ? '✗ 出现 9009' : '✓')
console.log('  [2] 走了直转通道      :', direct ? '✓ ' + direct : '✗ 没看到「直转：」日志')
console.log('  [3] 管线整体成功      :', pipelineOk ? '✓' : '✗ 失败并可能已回滚')
console.log(`  [4] 背景 webp 已更新  : ${after !== before ? '✓' : '✗'}  ${before} -> ${after}`)

// ── ③ 数据目录不该被写进媒体（信息表/故事/阅读物里的点缀图不算）
const dumbDirs = ['服装阁', '界面', '视频', '音频', '通用散件', '字体']
const leaked = dumbDirs.filter((d) => fs.existsSync(path.join(DATA, d)))
const mediaInData = []
const walk = (d) => {
  if (!fs.existsSync(d)) return
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, f.name)
    if (f.isDirectory()) walk(p)
    else if (/\.(png|jpe?g|webp|mp4|webm|ogg|mp3|wav)$/i.test(f.name)) mediaInData.push(path.relative(DATA, p))
  }
}
walk(DATA)
const mediaLeak = mediaInData.filter((m) => !m.startsWith('信息表') && !m.startsWith('故事') && !m.startsWith('阅读物'))
console.log('  [5] 数据目录无媒体副本:', (mediaLeak.length === 0 ? '✓' : `✗ ${mediaLeak.length} 个`))
if (mediaLeak.length) for (const m of mediaLeak.slice(0, 6)) console.log('      -', m)
console.log('  [6] 数据目录无媒体子目录:', leaked.length ? '✗ ' + leaked.join(', ') : '✓')

const ok = !has9009 && !!direct && pipelineOk && after !== before && mediaLeak.length === 0 && leaked.length === 0
console.log('\n结果:', ok ? 'ALL PASS' : 'FAIL')
process.exitCode = ok ? 0 : 1
