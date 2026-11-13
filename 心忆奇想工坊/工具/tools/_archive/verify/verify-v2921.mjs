/**
 * 验收：缺背景兜底 + 工坊文案全量外置 + 新建编号 500 起
 *
 * 用户三条：
 * ① 服装阁缺背景 → 自动用默认背景 `ui/ver/bg.webp`；默认也没了才打 [缺图]
 * ② 工坊左栏 / 底部控制台 / 拖拽遮罩 / 表单字段标签 等固定文案 → `文案.json`
 * ③ 工坊新建阁默认编号 500、501、502…
 *
 * 校验：A 默认背景兜底 / B 文案外置 / C 编号 500 / D 浏览器实际渲染 / E 报错
 *
 * 依赖：`npm run up`（5178 + 5199）。
 * 跑法：node tools/verify-v2921.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { nextFreeGacha } from '../updater/lib/meta.mjs'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const UPD = 'http://127.0.0.1:5199'
const ROOT = process.cwd()
const A = path.join(ROOT, 'public/assets')

let pass = 0
let fail = 0
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`) }
}

const COPY = JSON.parse(fs.readFileSync(path.join(ROOT, '文案.json'), 'utf8'))
const M = JSON.parse(fs.readFileSync(path.join(A, 'manifest.json'), 'utf8'))
const BPM = fs.readFileSync(path.join(ROOT, 'tools/build-pool-map.py'), 'utf8')
const COL = fs.readFileSync(path.join(ROOT, 'tools/collect-assets.py'), 'utf8')
const APP = fs.readFileSync(path.join(ROOT, 'updater/web/app.js'), 'utf8')
const HTML = fs.readFileSync(path.join(ROOT, 'updater/web/index.html'), 'utf8')

/* ═════════════ A. 缺背景的兜底 ═════════════ */
console.log('\n════ A 缺背景 → 默认背景 ════')
ok('A 管线有默认背景常量与判定函数',
  BPM.includes('DEFAULT_BG_SRC') && BPM.includes('def default_bg_exists') && BPM.includes('ui/ver/bg.webp'),
  'DEFAULT_BG_SRC / default_bg_exists')
ok('A 缺背景不再直接报 [缺图]（只有默认背景也缺才报）',
  !/\[缺图\] 无背景图/.test(BPM) && BPM.includes('默认背景也缺'),
  '告警条件已改')
ok('A collect-assets 在缺背景时把 manifest 指到 ui/ver/bg.webp',
  COL.includes('ui/ver/bg.webp') && COL.includes('用默认背景'),
  'manifest 回落已接')
ok('A 默认背景产物存在', fs.existsSync(path.join(A, 'ui/ver/bg.webp')))

const badBg = M.banners.filter((b) => !b.assets?.bgClean)
ok('A 88 阁全部有 bgClean（缺的已被默认背景补上）', badBg.length === 0,
  badBg.map((b) => b.name).join(',') || '0 条为空')
const missingBg = M.banners.filter((b) => {
  const src = String(b.assets?.bgClean || '')
  return src && !fs.existsSync(path.join(A, src))
})
ok('A 所有 bgClean 指向的文件都真实存在', missingBg.length === 0,
  missingBg.slice(0, 3).map((b) => `${b.name}:${b.assets.bgClean}`).join(' / ') || '0 条缺失')
const usingDefault = M.banners.filter((b) => b.assets?.bgClean === 'ui/ver/bg.webp')
console.log(`     （当前走默认背景的阁：${usingDefault.length} 个${usingDefault.length ? ' — ' + usingDefault.map((b) => b.name).join('、') : ''}）`)

/* ═════════════ B. 文案外置 ═════════════ */
console.log('\n════ B 工坊固定文案 → 文案.json ════')
const up = COPY.updater || {}
for (const k of ['rail', 'console', 'drop', 'panel', 'status', 'bundle', 'precheck', 'rollback', 'dlc', 'jobs']) {
  ok(`B 文案.json 有 updater.${k}`, !!up[k], up[k] ? Object.keys(up[k]).length + ' 键' : '缺')
}
ok('B 左栏标题', up.rail?.jobs === '要更新什么' && up.rail?.history === '最近改动')
ok('B 底部控制台', up.console?.check === '预检' && up.console?.apply === '写入并更新'
  && up.console?.restart === '完成后重启模拟器' && up.console?.force === '强制重转已有素材')
ok('B 拖拽遮罩', up.drop?.title === '松手就好' && !!up.drop?.sub)
ok('B 面板：预检/写入/待分配/路径框文案齐',
  ['pending', 'willWrite', 'pathPlaceholder', 'read', 'slotEmpty', 'slotMulti', 'addSet']
    .every((k) => typeof up.panel?.[k] === 'string' && up.panel[k]))

const jobIds = ['version', 'pool', 'suit', 'story', 'bundle', 'reading']
ok('B 六个任务的标题/副标题都在 json',
  jobIds.every((id) => up.jobs?.[id]?.title && typeof up.jobs[id].subtitle === 'string'),
  jobIds.filter((id) => !up.jobs?.[id]?.title).join(',') || '6/6')
const fieldCount = (id) => Object.keys(up.jobs?.[id]?.fields || {}).length
ok('B 表单字段标签都在 json（pool 9 / suit 6 / version 6）',
  fieldCount('pool') >= 9 && fieldCount('suit') >= 6 && fieldCount('version') >= 6,
  `${fieldCount('pool')}/${fieldCount('suit')}/${fieldCount('version')}`)
ok('B 槽位标签都在 json（pool.poolArt 的 bg / thumb / titleArt / video / enterSfx / milestone）',
  ['bg', 'thumb', 'titleArt', 'video', 'enterSfx', 'milestone']
    .every((k) => up.jobs?.pool?.groups?.poolArt?.slots?.[k]?.label),
  Object.keys(up.jobs?.pool?.groups?.poolArt?.slots || {}).join(','))
ok('B 写入清单也在 json（每任务都有 writes）',
  jobIds.every((id) => Array.isArray(up.jobs?.[id]?.writes) && up.jobs[id].writes.length))

ok('B index.html 用 data-copy 接管静态文案（≥15 处）',
  (HTML.match(/data-copy/g) || []).length >= 15, String((HTML.match(/data-copy/g) || []).length) + ' 处')
ok('B 左栏 / 控制台 / 遮罩都已挂 data-copy',
  HTML.includes('data-copy="updater.rail.jobs"') && HTML.includes('data-copy="updater.console.apply"')
  && HTML.includes('data-copy="updater.drop.title"'))
const cCalls = (APP.match(/\bC\('/g) || []).length
ok('B app.js 走 C()/CT() 取文案（≥40 处）', cCalls >= 40, cCalls + ' 处')
ok('B app.js 里不再硬编码「这次会写入 / 待分配 / 全选」（只剩 C() 的兜底参数）',
  !APP.includes('>这次会写入<') && !APP.includes('} /> 全选</label>')
  && (APP.match(/待分配 · /g) || []).length === 1
  && (APP.match(/这次会写入/g) || []).length === 1)
ok('B jobs.mjs 会把 json 覆盖到任务定义上',
  fs.readFileSync(path.join(ROOT, 'updater/lib/jobs.mjs'), 'utf8').includes('export function jobsWithCopy'))

/* ═════════════ C. 编号 500 起 ═════════════ */
console.log('\n════ C 自建编号从 500 起 ════')
const next = nextFreeGacha()
ok('C nextFreeGacha() 现在返回 500', next === '500', next)
ok('C 占位提示已改（提到 500）',
  String(up.jobs?.pool?.fields?.gachaKey?.placeholder || '').includes('500'),
  up.jobs?.pool?.fields?.gachaKey?.placeholder)

/* ═════════════ D. 浏览器里的实际渲染 ═════════════ */
console.log('\n════ D 工坊页面实际渲染 ════')
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const page = await browser.newPage({ viewport: { width: 1500, height: 940 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
page.on('console', (m) => {
  const t = m.text()
  if (m.type() === 'error' && !/favicon|404/i.test(t)) errs.push(t.slice(0, 140))
})
await page.goto(UPD, { waitUntil: 'domcontentloaded' })
await page.waitForSelector('.rail-item', { timeout: 60000 })
await page.waitForTimeout(800)

const dom = await page.evaluate(() => ({
  railJobs: document.querySelector('.rail-title')?.textContent.trim(),
  railHistory: document.querySelector('.rail-title.small')?.textContent.trim(),
  check: document.querySelector('#btn-check')?.textContent.trim(),
  apply: document.querySelector('#btn-apply')?.textContent.trim(),
  restart: document.querySelector('#opt-restart')?.parentElement.textContent.trim(),
  force: document.querySelector('#opt-force')?.parentElement.textContent.trim(),
  dropTitle: document.querySelector('.drop-t')?.textContent.trim(),
  dropSub: document.querySelector('.drop-s')?.textContent.trim(),
  jobTitle: document.querySelector('#job-title')?.textContent.trim(),
  railItems: [...document.querySelectorAll('.rail-item')].map((b) => (b.querySelector('span:last-child')?.textContent || '').trim()),
}))
ok('D 左栏标题来自 json', dom.railJobs === up.rail.jobs && dom.railHistory === up.rail.history,
  `${dom.railJobs} / ${dom.railHistory}`)
ok('D 控制台按钮来自 json', dom.check === up.console.check && dom.apply === up.console.apply,
  `${dom.check} / ${dom.apply}`)
ok('D 两个勾选来自 json',
  dom.restart === up.console.restart && dom.force === up.console.force,
  `${dom.restart} / ${dom.force}`)
ok('D 拖拽遮罩来自 json', dom.dropTitle === up.drop.title && dom.dropSub === up.drop.sub, dom.dropTitle)
ok('D 任务标题来自 json（当前是版本任务）', dom.jobTitle === up.jobs.version.title, dom.jobTitle)
ok('D 左栏任务名依次 = 版本/服装阁/套装/故事/整套导入/阅读物/扩展包',
  dom.railItems.join('/') === '版本/服装阁/套装/故事/整套导入/阅读物/扩展包', dom.railItems.join('/'))

// 切到「服装阁」：验证字段标签 / 槽位名来自 json
await page.locator('.rail-item', { hasText: '服装阁' }).first().click()
await page.waitForTimeout(600)
const poolDom = await page.evaluate(() => ({
  title: document.querySelector('#job-title')?.textContent.trim(),
  labels: [...document.querySelectorAll('#panel .field > label')].map((l) => l.textContent.replace('*', '').trim()),
  slots: [...document.querySelectorAll('#panel .slot-name')].map((s) => s.textContent.trim()),
  writeHead: document.querySelector('#panel .writes h4')?.textContent.trim(),
  addSet: document.querySelector('#btn-addset')?.textContent.trim(),
  pathBtn: document.querySelector('#btn-path')?.textContent.trim(),
}))
ok('D 任务切到服装阁，标题来自 json', poolDom.title === up.jobs.pool.title, poolDom.title)
ok('D 字段标签来自 json（含「所属版本 / 服装阁名 / 服装阁编号」）',
  ['所属版本', '服装阁名', '服装阁编号'].every((x) => poolDom.labels.includes(x)),
  poolDom.labels.join(' / ').slice(0, 60))
ok('D 槽位名来自 json（含「服装阁背景 / 列表缩略图 / 服装阁名艺术字」）',
  ['服装阁背景', '列表缩略图', '服装阁名艺术字'].every((x) => poolDom.slots.includes(x)),
  poolDom.slots.join(' / ').slice(0, 60))
ok('D 「这次会写入」/「读取」/「再加一套」来自 json',
  poolDom.writeHead === up.panel.willWrite && poolDom.pathBtn === up.panel.read
  && poolDom.addSet === up.panel.addSet,
  `${poolDom.writeHead} / ${poolDom.pathBtn} / ${poolDom.addSet}`)

// 预检：应能读到 json 里的前缀与「必填项齐全」
await page.click('#btn-check')
await page.waitForTimeout(400)
const logText = await page.evaluate(() => document.querySelector('#log')?.textContent || '')
ok('D 预检日志用的是 json 里的前缀', logText.includes(up.precheck.prefixMissing) || logText.includes(up.precheck.okReady),
  logText.replace(/\s+/g, ' ').slice(0, 50))

// 状态接口里 jobs 已合并 json
const state = await (await fetch(`${UPD}/api/state`)).json()
ok('D /api/state 的 jobs 已合并文案（标题/字段/写入清单）',
  state.jobs.pool.title === up.jobs.pool.title
  && state.jobs.pool.fields[0].label === String(up.jobs.pool.fields[state.jobs.pool.fields[0].key]?.label || state.jobs.pool.fields[0].label)
  && state.jobs.pool.writes.length === up.jobs.pool.writes.length,
  `${state.jobs.pool.title} · ${state.jobs.pool.writes.length} 条写入`)

await browser.close()

/* ═════════════ E. 报错 ═════════════ */
console.log('\n════ E 报错 ════')
ok('E 工坊页面没有 JS 异常', errs.length === 0, errs.slice(0, 2).join(' / '))

console.log(`\n通过 ${pass} / 失败 ${fail}`)
process.exit(fail ? 1 : 0)
