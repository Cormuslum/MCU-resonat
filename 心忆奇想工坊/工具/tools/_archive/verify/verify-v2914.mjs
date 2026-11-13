/** 验收 —— 静态背景替换 / 动态背景替换 / 素材路径归位 / */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const ROOT = process.cwd()
const ASSET = path.join(ROOT, '素材')
const PUB = path.join(ROOT, 'public', 'assets')
const UP = 'http://127.0.0.1:5199'

let pass = 0
const fails = []
function ok(name, cond, detail = '') {
  if (cond) { pass += 1; console.log(`  ✓ ${name}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? '  → ' + detail : ''}`) }
}

const manifest = JSON.parse(fs.readFileSync(path.join(PUB, 'manifest.json'), 'utf8'))
const poolMap = JSON.parse(fs.readFileSync(path.join(ASSET, 'pool-map.json'), 'utf8'))
const byName = new Map(manifest.banners.map((b) => [b.name, b]))
const pmByName = new Map(poolMap.banners.map((b) => [b.name, b]))

/* ══════════ A. 静态背景 ══════════ */
console.log('\nA. 七座阁的静态背景')
const SEVEN = ['往日鼓声', '不灭的幽旅', '千万次相逢的理由', '如我斑斓', '在属于孩子的故事里', '未息歌咏之夜', '雪落颂愿时']
for (const n of SEVEN) {
  const pm = pmByName.get(n)
  const src = String(pm?.assets?.bgClean || '')
  ok(`${n}：源指向阁目录的背景图`, src.startsWith('服装阁/') && fs.existsSync(path.join(ASSET, src)), src || '（空）')
  const b = byName.get(n)
  ok(`${n}：产物存在`, !!b && fs.existsSync(path.join(PUB, b.assets.bgClean)), b?.assets?.bgClean || '（无）')
}
// 这四座以前被 BG_HIRES / BG_COMPOSE 盖住，换图完全不生效
const shadowed = ['如我斑斓', '千万次相逢的理由', '不灭的幽旅', '雪落颂愿时']
ok('曾被旧覆盖表盖住的四座已改为「阁目录优先」',
  shadowed.every((n) => String(pmByName.get(n)?.assets?.bgClean || '').startsWith('服装阁/')),
  shadowed.map((n) => `${n}=${pmByName.get(n)?.assets?.bgClean}`).join(' | '))

/* ══════════ B. 动态背景 ══════════ */
console.log('\nB. 两座阁的动态背景')
for (const n of ['织光为约', '千万次相逢的理由']) {
  const b = byName.get(n)
  const rel = b?.assets?.bgVideo
  const p = rel ? path.join(PUB, rel) : ''
  ok(`${n}：视频产物存在`, !!rel && fs.existsSync(p), rel || '（无）')
  if (!rel || !fs.existsSync(p)) continue
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,width,height',
    '-of', 'csv=p=0', p], { encoding: 'utf8' })
  const out = (r.stdout || '').trim()
  ok(`${n}：没有音轨`, !out.includes('audio'), out)
  const w = Number((out.match(/video,(\d+),(\d+)/) || [])[1])
  ok(`${n}：保持原分辨率（宽 ≥ 1920）`, w >= 1920, `${w}px`)
}

/* ══════════ C. UI 整包路径 ══════════ */
console.log('\nC. 素材路径归位')
ok('废弃的 素材/0主素材 已不存在', !fs.existsSync(path.join(ASSET, '0主素材')))
ok('素材/界面/UI整包 存在', fs.existsSync(path.join(ASSET, '界面', 'UI整包')))
ok('0.2 的版本大图在正确目录（081_L）',
  fs.existsSync(path.join(ASSET, '界面', 'UI整包', 'UI', 'Image', 'Card', 'T_UI_Pear_Card_img_081_L.png')))

/* ══════════ D. 工坊「修改已有」 ══════════ */
console.log('\nD. 工坊修改功能')
const state = await (await fetch(`${UP}/api/state`)).json().catch(() => null)
ok('工坊可访问', !!state)
if (state) {
  const pf = (state.jobs.pool.fields || []).map((f) => f.key)
  const sf = (state.jobs.suit.fields || []).map((f) => f.key)
  ok('服装阁表单有「操作 / 目标 / 移出套装 / 追加套装」',
    ['mode', 'target', 'setRemove', 'setAdd'].every((k) => pf.includes(k)), pf.join(','))
  ok('套装表单有「操作 / 目标」', ['mode', 'target'].every((k) => sf.includes(k)), sf.join(','))
  ok('mode 选项含「修改已建的」',
    (state.jobs.pool.fields.find((f) => f.key === 'mode')?.options || []).some(([v]) => v === 'edit'))
  ok('目标下拉只列自建内容（官方阁不在其中）',
    (state.options.customPools || []).every((p) => !['雪落颂愿时', '如我斑斓'].includes(p.name)),
    JSON.stringify((state.options.customPools || []).map((p) => p.name)))
  ok('/api/state 带空的自建名单（还没建过自建内容）',
    Array.isArray(state.options.customPools) && Array.isArray(state.options.customSets))
}

// 官方内容必须被后端拒绝（前端置灰只是提示，拦不住手改请求）
const { applyJob } = await import('../../updater/lib/jobs.mjs')
const { Snapshot } = await import('../../updater/lib/archive.mjs')
for (const [job, fields, label] of [
  ['pool', { mode: 'edit', target: '雪落颂愿时', version: '2.11', name: '雪落颂愿时' }, '官方服装阁'],
  ['suit', { mode: 'edit', target: '绽若颂愿心', version: '2.11', pool: '雪落颂愿时', name: '绽若颂愿心' }, '官方套装'],
]) {
  let blocked = false
  const snap = new Snapshot('verify-guard')
  try {
    await applyJob({ job, snap, log: () => {}, files: [], fields })
  } catch (e) {
    blocked = /不是工坊自建/.test(String(e.message))
  } finally {
    // 拒绝路径没写任何东西，别在「最近改动」里留一条空记录
    fs.rmSync(snap.dir, { recursive: true, force: true })
  }
  ok(`${label}：修改请求被拒绝`, blocked)
}

console.log('\n' + '─'.repeat(52))
console.log(`通过 ${pass} / ${pass + fails.length}`)
if (fails.length) {
  console.log('失败：')
  for (const f of fails) console.log('  · ' + f)
  process.exit(1)
}
