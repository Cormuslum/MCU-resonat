/**
 * 验收 —— 版本序号覆盖修复 / 撤回含产物 / 拓展包四行四列 / 重复阅读物删除 / 写入只检验改动项。
 * 纯离线（不连 5178 / 5199）：浏览器只用 `page.setContent` 渲染工坊那段 CSS，测真实的 4×4 与滚动。
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ROOT = process.cwd()
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const abs = (p) => path.join(ROOT, p)

const pass = []
const fail = []
function ok(name, cond, extra = '') {
  if (cond) pass.push(name)
  else fail.push(`${name}${extra ? '  ← ' + extra : ''}`)
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? `  (${extra})` : ''}`)
}

const csv = read('素材/信息表/版本表.csv')
const pm = JSON.parse(read('素材/pool-map.json'))
const manifest = JSON.parse(read('public/assets/manifest.json'))
// ：`src/data/reading-titles.ts` 已删，改读运行时真源（标题在里面）
const titles = read('public/assets/data/readings.json')
const readingsTs = read('src/data/readings.ts')
const server = read('updater/server.mjs')
const appjs = read('updater/web/app.js')
const css = read('updater/web/style.css')
const copy = JSON.parse(read('文案.json'))

/* ═══════════════ A · 版本序号：数据已修复 ═══════════════ */
console.log('\n════ A 版本序号 ════')

const verRows = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/).slice(1)
const verKeys = verRows.map((l) => l.split(',')[0].trim())
ok('A1 版本表 26 行且版本号无重复', verRows.length === 26 && new Set(verKeys).size === 26,
  `${verRows.length} 行 / ${new Set(verKeys).size} 个不同键`)
ok('A2 版本表同时有 1.1 与 1.10、2.1 与 2.10',
  ['1.1', '1.10', '2.1', '2.10'].every((v) => verKeys.includes(v)),
  verKeys.filter((v) => /^(1\.10|2\.10)$/.test(v)).join(',') || '缺 1.10/2.10')
const rowOf = (v) => verRows.find((l) => l.startsWith(v + ',')) || ''
ok('A3 1.1 流星季 / 1.10 丰收季 各归其位',
  rowOf('1.1').includes('流星季') && rowOf('1.10').includes('丰收季'))

const pmVer = Object.fromEntries(pm.versions.map((v) => [String(v.version), v.name]))
ok('A4 pool-map 26 版本', pm.versions.length === 26, String(pm.versions.length))
ok('A5 pool-map 四个易撞号版本名正确',
  pmVer['1.1'] === '流星季' && pmVer['1.10'] === '丰收季'
  && pmVer['2.1'] === '若生命如诗' && pmVer['2.10'] === '金羽的裁决',
  JSON.stringify({ '1.1': pmVer['1.1'], '1.10': pmVer['1.10'], '2.1': pmVer['2.1'], '2.10': pmVer['2.10'] }))

const mv = Object.fromEntries(manifest.ui.ver.versions.map((v) => [String(v.v), v.name]))
ok('A6 manifest 26 版本且四个版本名正确',
  manifest.ui.ver.versions.length === 26
  && mv['1.1'] === '流星季' && mv['1.10'] === '丰收季'
  && mv['2.1'] === '若生命如诗' && mv['2.10'] === '金羽的裁决')
ok('A7 版本卡 26 张，1.10 / 2.10 都在',
  Object.keys(manifest.ui.ver.cards).length === 26
  && !!manifest.ui.ver.cards['1.10'] && !!manifest.ui.ver.cards['2.10'])
ok('A8 版本页读的表与版本卡键一一对应',
  manifest.ui.ver.versions.every((v) => !!manifest.ui.ver.cards[String(v.v)]))

/* ═══════════════ B · 版本序号：防护真的会拦 ═══════════════ */
console.log('\n════ B 防覆盖 ════')

const pyProbe = `
import importlib.util, sys, tempfile, os
sys.path.insert(0, 'tools')
spec = importlib.util.spec_from_file_location('bpm', 'tools/build-pool-map.py')
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
fd, tmp = tempfile.mkstemp(suffix='.csv'); os.close(fd)
open(tmp, 'w', encoding='utf-8-sig').write(
  '版本,版本名,大版本,大版本名,介绍,版本卡编号\\n'
  '1.1,流星季,1,心愿原野,x,10\\n'
  '1.1,丰收季,1,心愿原野,y,23\\n')
m.P = lambda *a: tmp
try:
    m.load_version_table()
    print('NO_RAISE')
except SystemExit as e:
    print('RAISED', '版本表重复键' in str(e))
finally:
    os.remove(tmp)
`
let pyOut = ''
try { pyOut = execFileSync('python', ['-c', pyProbe], { cwd: ROOT, encoding: 'utf8' }).trim() } catch (e) { pyOut = 'ERR ' + e.message }
ok('B1 build-pool-map 遇重复键直接失败（不再静默生成残缺产物）', pyOut.includes('RAISED True'), pyOut.slice(0, 120))

const meta = await import('../updater/lib/meta.mjs')
let dupBlocked = false
try { meta.assertUniqueVersionRows([{ v: '1.1', name: '流星季' }, { v: '1.1', name: '丰收季' }]) } catch { dupBlocked = true }
ok('B2 meta.writeVersionTable 前置唯一性检查挡住重复键', dupBlocked)
let numBlocked = false
try { meta.upsertVersion({ v: 1.1, name: '丰收季' }) } catch { numBlocked = true }
ok('B3 upsertVersion 拒绝数字版本号（Number(1.10)===1.1 的元凶）', numBlocked)
let badFmt = false
try { meta.upsertVersion({ v: '1.1.0' }) } catch { badFmt = true }
ok('B4 upsertVersion 拒绝非法版本号', badFmt)
ok('B5 版本号仍按数值口径排序（1.9 < 1.10 < 1.11）',
  JSON.stringify(pm.versions.map((v) => String(v.version))).includes('"1.9","1.10","1.11"'))

/* ═══════════════ C · 撤回会连产物一起回退 ═══════════════ */
console.log('\n════ C 撤回 ════')

const outs = ['素材/pool-map.json', 'public/assets/manifest.json',
  'public/assets/data/stories.json', 'public/assets/data/readings.json',
  'src/data/stories.ts', 'src/data/readings.ts']
ok('C1 六个管线产物都列进 PIPELINE_OUTPUTS', outs.every((f) => server.includes(`'${f}'`)))
ok('C2 写入前就 snap.touch 这些产物', /for \(const f of PIPELINE_OUTPUTS\) snap\.touch/.test(server))
ok('C3 撤回后清掉写入指纹（不会把「改回同一批」误判成没改动）',
  /restoreSnapshot\(body\.id\)[\s\S]{0,400}clearLastApply\(\)/.test(server))
ok('C4 apiRollback 仍补跑管线，失败与否都返回给界面', /pipelineOk: run\.ok/.test(server))

/* ═══════════════ D · 拓展包四行四列 ═══════════════ */
console.log('\n════ D 拓展包多选布局 ════')

const listRule = (css.match(/\.dlc-pick-list\s*\{([\s\S]*?)\}/) || [])[1] || ''
ok('D1 固定 4 列', /grid-template-columns:\s*repeat\(4,/.test(listRule), listRule.match(/grid-template-columns[^;]+/)?.[0])
ok('D2 固定行高 + 最多 4 行', /grid-auto-rows:\s*var\(--dlc-row-h\)/.test(listRule)
  && /max-height:\s*calc\(4\s*\*\s*var\(--dlc-row-h\)\)/.test(listRule))
ok('D3 超出部分可滚动（滚轮 + 滚动条）', /overflow-y:\s*auto/.test(listRule)
  && /overscroll-behavior:\s*contain/.test(listRule))
ok('D4 勾选项高度与行高一致', /\.dlc-pick\s*\{[\s\S]*?height:\s*var\(--dlc-row-h\)/.test(css))

let browser
try {
  browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const p = await browser.newPage({ viewport: { width: 1000, height: 800 } })
  const picks = Array.from({ length: 24 }, (_, i) =>
    `<label class="dlc-pick"><input type="checkbox"/><span>候选 ${i + 1}</span></label>`).join('')
  await p.setContent(`<style>${css}</style><div class="dlc-picks">
    <div class="dlc-pick-bar"><span class="hint">已选 0 / 24 项</span></div>
    <div class="dlc-pick-list">${picks}</div></div>`)
  const geo = await p.evaluate(() => {
    const el = document.querySelector('.dlc-pick-list')
    const cs = getComputedStyle(el)
    const row = parseFloat(cs.gridAutoRows)
    return {
      cols: cs.gridTemplateColumns.split(' ').length,
      row, client: el.clientHeight, scroll: el.scrollHeight,
      overflow: cs.overflowY,
    }
  })
  ok('D5 浏览器实测 4 列', geo.cols === 4, `实际 ${geo.cols} 列`)
  ok('D6 浏览器实测可见正好 4 行', Math.round(geo.client / geo.row) === 4,
    `client=${geo.client} row=${geo.row}`)
  ok('D7 24 项时确实出现纵向滚动', geo.scroll > geo.client && geo.overflow === 'auto',
    `scroll=${geo.scroll} client=${geo.client}`)
  await p.close()
} catch (e) {
  ok('D5-D7 浏览器实测', false, String(e.message || e).slice(0, 120))
} finally {
  if (browser) await browser.close()
}

/* ═══════════════ E · 重复阅读物 ═══════════════ */
console.log('\n════ E 重复阅读物 ════')

const gone = [
  '素材/阅读物/心愿原野/《于湖底盛放的蔷薇》_1.txt',
  '素材/阅读物/伊赞之土/《寄给搭配师协会总部的信》_1.txt',
]
ok('E1 指定的两个 _1 副本已删除', gone.every((f) => !fs.existsSync(abs(f))))
ok('E2 保留篇还在',
  fs.existsSync(abs('素材/阅读物/心愿原野/《于湖底盛放的蔷薇》.txt'))
  && fs.existsSync(abs('素材/阅读物/伊赞之土/《寄给搭配师协会总部的信》.txt')))
ok('E3 图鉴里这两篇各只剩一条、且不带 ·NN 后缀',
  titles.includes('《于湖底盛放的蔷薇》') && titles.includes('《寄给搭配师协会总部的信》')
  && !/《于湖底盛放的蔷薇》·\d\d/.test(titles)
  && !/《寄给搭配师协会总部的信》·\d\d/.test(titles))
const nReadings = (readingsTs.match(/\{ id: '/g) || []).length
ok('E4 readings.ts 条目数 = 593（删前 595）', nReadings === 593, String(nReadings))
ok('E5 其余 4 个内容确实不同的 _N 副本未被误删',
  ['《梅妲伊尔的笔记》_1.txt', '玛缇亚与巨人王的往来书信_1.txt',
    '玛缇亚与巨人王的往来书信_2.txt', '阿芙芙玻的日记_1.txt']
    .every((n) => fs.readdirSync(abs('素材/阅读物'), { recursive: true }).some((f) => String(f).endsWith(n))))

/* ═══════════════ F · 只检验改动项 ═══════════════ */
console.log('\n════ F 增量写入 ════')

const inc = await import('../updater/lib/incremental.mjs')
const { Snapshot, archive } = await import('../updater/lib/archive.mjs')
const tmp = abs('tools/.verify-v2924-tmp')
fs.mkdirSync(tmp, { recursive: true })
const cachePath = abs('updater/.write-cache.json')
const hadCache = fs.existsSync(cachePath)
const cacheBackup = hadCache ? fs.readFileSync(cachePath) : null
let snapDir = ''
try {
  const a = path.join(tmp, 'a.png')
  const b = path.join(tmp, 'b.png')
  const target = path.join(tmp, 'target.png')
  fs.writeFileSync(a, 'SAME-CONTENT')
  fs.writeFileSync(b, 'SAME-CONTENT')
  fs.writeFileSync(target, 'BEFORE')
  ok('F1 contentSig 只看内容：不同路径同一内容签名相同', inc.contentSig(a) === inc.contentSig(b))
  fs.writeFileSync(b, 'CHANGED')
  ok('F2 内容变了签名跟着变', inc.contentSig(a) !== inc.contentSig(b))

  const f1 = inc.applyFingerprint({ job: 'version', fields: { v: '1.10' }, files: [{ slot: 'card', src: a }], options: {} })
  const f2 = inc.applyFingerprint({ job: 'version', fields: { v: '1.10' }, files: [{ slot: 'card', src: a }], options: {} })
  const f3 = inc.applyFingerprint({ job: 'version', fields: { v: '1.1' }, files: [{ slot: 'card', src: a }], options: {} })
  ok('F3 同一批内容 → 整次写入指纹相同', f1 === f2)
  ok('F4 改一个字段 → 指纹变化', f1 !== f3)

  const snap = new Snapshot('verify-v2924')
  snapDir = snap.dir
  const r1 = archive(snap, [{ src: a, target }])
  ok('F5 首次写入确实落盘', r1[0].ok && !r1[0].unchanged && fs.readFileSync(target, 'utf8') === 'SAME-CONTENT')
  const changedBefore = snap.changed
  const r2 = archive(snap, [{ src: a, target }])
  ok('F6 与上一次完全一致 → 跳过，不检验、不复制、不进快照',
    r2[0].unchanged === true && snap.changed === changedBefore)
  ok('F7 撤回能把被改动的文件还原', snap.restore() > 0 && fs.readFileSync(target, 'utf8') === 'BEFORE')
} catch (e) {
  ok('F1-F7 增量写入实测', false, String(e.message || e).slice(0, 160))
} finally {
  try { fs.rmSync(tmp, { recursive: true, force: true }) } catch { /* ignore */ }
  if (snapDir) try { fs.rmSync(snapDir, { recursive: true, force: true }) } catch { /* ignore */ }
  if (hadCache) fs.writeFileSync(cachePath, cacheBackup)
  else try { fs.unlinkSync(cachePath) } catch { /* ignore */ }
}

ok('F8 apiApply 有「与上一次完全一致」短路', /\blast\?\.fp === fp\b/.test(server)
  && /skipped: true/.test(server))
ok('F9 勾了「强制重转」不会被短路', /!options\.force && last\?\.fp === fp/.test(server))
ok('F10 成功后才写入指纹', /writeLastApply\(fp/.test(server))
ok('F11 预检只跳过重复检验，必填项始终检查',
  /const warn = \(\.\.\.args\) => \{ if \(!repeat\) warns\.push/.test(appjs)
  && /f\.required[\s\S]{0,120}problems\.push/.test(appjs))
ok('F12 前端处理 skipped 结果', /done\?\.ok && done\.skipped/.test(appjs))
ok('F13 新增固定文案都进了 文案.json',
  !!copy.updater.precheck.sameAsLast && !!copy.updater.status.noChange)

/* ═══════════════ 汇总 ═══════════════ */
console.log(`\n${'═'.repeat(56)}`)
console.log(`通过 ${pass.length} / ${pass.length + fail.length}`)
if (fail.length) {
  console.log('\n失败项：')
  for (const f of fail) console.log('  ✗ ' + f)
  process.exitCode = 1
}
