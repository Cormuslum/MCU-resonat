/** 验收 A. 同名内容消歧：比对方式真的可用 + 只对「确实不同」 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SIM = 'http://127.0.0.1:5178'
const UPD = 'http://127.0.0.1:5199'
const SAVE_KEY = 'nikki-resonance-save-v1'
const ROOT = process.cwd()
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')

const pass = []
const fail = []
function ok(name, cond, extra = '') {
  if (cond) pass.push(name)
  else fail.push(`${name}${extra ? '  ← ' + extra : ''}`)
  console.log(`${cond ? '✓' : '✗'} ${name}${extra ? `  (${extra})` : ''}`)
}

/** 本次验收产生的包，最后统一用 /api/dlc/delete 清掉（rmtree 会被 safe-delete 钩子拦） */
const made = []
async function deletePack(id) {
  try {
    await fetch(`${UPD}/api/dlc/delete`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  } catch { /* 清理失败不掩盖验收结论，最后再列出来 */ }
}
process.on('exit', () => {
  for (const id of new Set(made)) {
    try {
      execFileSync('curl', ['-s', '-X', 'POST', `${UPD}/api/dlc/delete`,
        '-H', 'Content-Type: application/json', '-d', JSON.stringify({ id })],
      { stdio: 'ignore', timeout: 15000 })
    } catch { /* 服务没起就算了 */ }
  }
})

const exp = await import('../../updater/lib/dlc-export.mjs')

/* ═════════════════ A. 同名内容消歧 ═════════════════ */
console.log('\n════ A 同名内容消歧 ════')

const storiesTs = read('src/data/stories.ts')
const readingsTs = read('src/data/readings.ts')
// ：`src/data/reading-titles.ts` / `story-titles.ts` 已删（标题并入运行时 JSON）
// 改读现行真源 —— 否则 `read()` 直接 ENOENT，整份验收跑不起来
const readingTitles = read('public/assets/data/readings.json')
const storyTitles = read('public/assets/data/stories.json')

ok('A1 title_suffix.py 存在', fs.existsSync(path.join(ROOT, 'tools/title_suffix.py')))

// 用 Python 直接探比对函数，确认三种视角都真的算了、阈值判定符合预期
const pyProbe = execFileSync('python', ['-c', `
import sys, json
sys.path.insert(0, 'tools')
from title_suffix import content_hash, similarity, same_variant, SAME_THRESHOLD, base_title, disambiguate_rows
a = '阴天。很糟糕，我已经明白，这种感觉，就是绝望。'
b = '晴天。有一点开心。不，应该说是超级开心。'
c = '阴天。很糟糕，我已经明白，这种感觉，就是绝望！'
long_a = '风从高地的缺口灌下来，掀得篝火压低了又抬起。桠枝上挂着露水。' + '湖水一路漫过石阶，孩子们把纸鹤放进风里。' * 20
long_b = '风从高地的缺口灌下来，掀得篝火压低了又抬起。丫枝上挂着露水。' + '湖水一路漫过石阶，孩子们把纸鹤放进风里。' * 20
print(json.dumps({
  'hash_ws': content_hash('a  b\\nc') == content_hash('a b c'),
  'hash_diff': content_hash(a) != content_hash(b),
  'sim_keys': sorted(similarity([a,b],0,1).keys()),
  'same_exact': same_variant([a,a],0,1)[0],
  'same_typo': same_variant([long_a,long_b],0,1)[0],
  'diff': same_variant([a,b],0,1)[0],
  'threshold': SAME_THRESHOLD,
  'idempotent_base': base_title('纯净之风·01'),
}, ensure_ascii=False))
`], { cwd: ROOT, encoding: 'utf8' })
const probe = JSON.parse(pyProbe.trim())
ok('A2 归一化哈希可用（空白差异不算不同）', probe.hash_ws && probe.hash_diff)
ok('A3 相似度三种视角齐全（cosine / line / char）',
  ['char', 'cosine', 'line', 'score'].every((k) => probe.sim_keys.includes(k)), probe.sim_keys.join(','))
ok('A4 完全相同 → 判为同一内容', probe.same_exact === true)
ok('A5 只差一个错别字 → 判为同一内容（不编无意义的号）', probe.same_typo === true)
ok('A6 内容完全不同 → 判为不同', probe.diff === false)

// 重名处理结果
const count = (s, re) => (s.match(re) || []).length
ok('A7 故事 134 篇、无重名（保持原样）',
  count(storiesTs, /major: \d+,/g) === 134 && !/title: "[^"]*·\d{2}"/.test(storiesTs), '134 篇')
ok('A8 阅读物 595 篇', count(readingsTs, /\{ id: '/g) === 595, String(count(readingsTs, /\{ id: '/g)))

const suffixed = [
  '阿芙芙玻的日记·01', '阿芙芙玻的日记·02',
  '《梅妲伊尔的笔记》·01', '《梅妲伊尔的笔记》·02',
  '玛缇亚与巨人王的往来书信·01', '玛缇亚与巨人王的往来书信·02', '玛缇亚与巨人王的往来书信·03',
]
ok('A9 3 组确实不同的重名 → 7 条加了后缀',
  suffixed.every((t) => readingsTs.includes(`title: '${t}'`)),
  suffixed.filter((t) => !readingsTs.includes(`title: '${t}'`)).join('、') || '全部正确')

ok('A10 完全一致的两篇保持原名（不加后缀）',
  count(readingsTs, /title: '《寄给搭配师协会总部的信》'/g) === 2 &&
  !readingsTs.includes('《寄给搭配师协会总部的信》·01'), '两条同名同内容')
ok('A11 只差「桠/丫」的两篇也保持原名',
  count(readingsTs, /title: '《于湖底盛放的蔷薇》'/g) === 2 &&
  !readingsTs.includes('《于湖底盛放的蔷薇》·01'), '两条近似重复')
ok('A12 阅读物标题索引同步带后缀', suffixed.every((t) => readingTitles.includes(t)))
ok('A13 故事标题索引存在且未受影响',
  (JSON.parse(storyTitles) || []).length === 134,
  String((JSON.parse(storyTitles) || []).length))

// 幂等：已加后缀的数据再跑一次不会叠成 ·01·01
const idem = execFileSync('python', ['-c', `
import sys
sys.path.insert(0, 'tools')
from title_suffix import disambiguate_rows
rows = [{'id':'a','title':'纯净之风·01','text':'AAA'}, {'id':'b','title':'纯净之风·02','text':'BBB'}]
out, rep = disambiguate_rows(rows)
print('|'.join(x['title'] for x in out))
`], { cwd: ROOT, encoding: 'utf8' }).trim()
ok('A14 重复运行不叠加后缀', idem === '纯净之风·01|纯净之风·02', idem)

/* ═════════════════ B/C. 拓展包多选与关联打包 ═════════════════ */
console.log('\n════ B 多选打包 / C 关联规则 ════')

const cands = exp.exportCandidates()
const pickJson = (id, file) => JSON.parse(read(`updater/dlc/${id}/data/${file}`))
const manifestOf = (id) => JSON.parse(read(`updater/dlc/${id}/dlc.json`))

/** 跑一个场景并登记待清理的包 id */
function run(label, opt) {
  const r = exp.exportMany(opt)
  made.push(r.id)
  console.log(`  ${label} → ${r.id} | ${r.provides.join(',')} | ${JSON.stringify(r.counts)}`)
  return r
}

// ① 多选服装阁
{
  const keys = cands.banners.slice(0, 3).map((b) => b.id)
  const r = run('多选服装阁 3 座', { kind: 'banner', keys })
  const pools = pickJson(r.id, 'pool.banner.json')
  const stories = pickJson(r.id, 'codex.story.json')
  ok('B1 三座阁装进同一个包（数组长度 3）', Array.isArray(pools) && pools.length === 3, String(pools.length))
  ok('B2 每个接口声明了数据文件', manifestOf(r.id).provides.every((p) => p.data && p.mount === true))
  ok('C1 自动附带对应故事', stories.length >= 3 && r.attached.stories === stories.length,
    `${stories.length} 篇`)
  const setNames = new Set(keys.flatMap((k) => pools.find((p) => p.id === k)?.sets.map((s) => s.name) || []))
  ok('C2 附带的故事都属于选中的套装', stories.every((s) => setNames.has(s.setName)),
    stories.map((s) => s.setName).join('、'))
  ok('C3 包内素材路径已改写到 /dlc/',
    JSON.stringify(pools).includes(`/dlc/${r.id}/assets/`))
}

// ② 多选套装
{
  const keys = cands.sets.slice(0, 2).map((s) => s.name)
  const r = run('多选套装 2 套', { kind: 'set', keys })
  const sets = pickJson(r.id, 'pool.set.json')
  const stories = pickJson(r.id, 'codex.story.json')
  ok('B3 两套服装装进同一个包（数组长度 2）', Array.isArray(sets) && sets.length === 2, String(sets.length))
  ok('C4 套装也附带各自的故事', stories.length === 2 && stories.every((s) => keys.includes(s.setName)),
    `${stories.length} 篇`)
}

// ③ 多选版本（连带阁 + 故事）
{
  const keys = cands.versions.map((v) => v.v)
  const r = run('多选版本 2 个', { kind: 'version', keys })
  const vers = pickJson(r.id, 'version.banner.json')
  const pools = pickJson(r.id, 'pool.banner.json')
  const stories = pickJson(r.id, 'codex.story.json')
  ok('B4 两个版本装进同一个包', Array.isArray(vers) && vers.length === keys.length, String(vers.length))
  ok('C5 版本内的自建阁一并打包', pools.length === cands.banners.length && r.attached.banners === pools.length,
    `${pools.length} 座 / 候选 ${cands.banners.length} 座`)
  ok('C6 这些阁的故事也一并打包', stories.length === cands.stories.length, `${stories.length} 篇`)
  ok('C7 版本包同时声明三个接口',
    ['version.banner', 'pool.banner', 'codex.story'].every((i) => r.provides.includes(i)),
    r.provides.join(','))
}

// ④ 故事仍可单独打包（不带阁）
{
  const keys = cands.stories.slice(0, 2)
  const r = run('故事单独多选 2 篇', { kind: 'story', keys })
  const stories = pickJson(r.id, 'codex.story.json')
  ok('C8 故事单独打包只声明 codex.story', r.provides.length === 1 && r.provides[0] === 'codex.story', r.provides.join(','))
  ok('C9 单独打包的故事是数组且不附带阁', Array.isArray(stories) && stories.length === 2 && r.attached.banners === 0)
}

// ⑤ 单选兼容（老 API 的包 id / 单项目行为）
{
  const r = exp.exportBanner(cands.banners[0].id)
  made.push(r.id)
  ok('B5 旧的单项目 API 仍可用且包 id 沿用旧规则',
    r.id === cands.banners[0].id || r.id.startsWith(cands.banners[0].id + '-'), r.id)
  ok('B6 单选也写成数组（前端 loader 统一口径）',
    Array.isArray(pickJson(r.id, 'pool.banner.json')))
}

// ⑥ 内置内容仍被拒，多选里混入一个也不行（且不留下半个包）
{
  const before = new Set(fs.readdirSync(path.join(ROOT, 'updater/dlc')).filter((n) => n.startsWith('dlc-')))
  let msg = ''
  try { exp.exportMany({ kind: 'banner', keys: [cands.banners[0].id, 'banner-080'] }) }
  catch (e) { msg = String(e.message || e) }
  ok('B7 多选里混入内置阁 → 整包拒绝', msg.includes('自带内容'), msg.slice(0, 40))
  const after = fs.readdirSync(path.join(ROOT, 'updater/dlc')).filter((n) => n.startsWith('dlc-'))
  ok('B7b 校验前置：被拒绝时没有留下残包', after.every((n) => before.has(n)),
    after.filter((n) => !before.has(n)).join(','))
}

// ⑦ 附带内容缺失不报错（关键路径：找不到的故事返回 null 直接跳过）
{
  const src = read('updater/lib/dlc-export.mjs')
  ok('C10 「有则打包、没有也不报错」的兜底路径存在',
    src.includes('if (!hit) return null') && src.includes('if (e) buckets') &&
    src.includes('const own = scope.dlcBanners.filter((b) => list.includes(b.version))'))
}

// ⑧ 前端 loader 兼容数组（单对象老包也能装）
{
  const dlcTs = read('src/core/dlc.ts')
  ok('B8 模拟器端三个接口都用 asArray 兼容（数组 + 老包单对象）',
    dlcTs.includes('const asArray') &&
    ['pool.banner', 'pool.set', 'version.banner'].every((i) =>
      new RegExp(`id === '${i.replace('.', '\\.')}'[\\s\\S]{0,220}asArray`).test(dlcTs)))
}

/* ═════════════════ 服务端真实 API ═════════════════ */
{
  const res = await fetch(`${UPD}/api/dlc/export`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'version', keys: ['0.1', '0.2'] }),
  })
  const d = await res.json()
  ok('B9 /api/dlc/export 接收 keys 数组', d.ok === true && d.counts?.['version.banner'] === 2,
    d.error || JSON.stringify(d.counts))
  if (d.ok) made.push(d.id)
  // 旧的单选 key 也仍收
  const old = await (await fetch(`${UPD}/api/dlc/export`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind: 'story', key: cands.stories[0] }),
  })).json()
  ok('B10 老的 key 单选请求仍兼容', old.ok === true, old.error || '')
  if (old.ok) made.push(old.id)
}

/* ═════════════════ D. 浏览器 ═════════════════ */
console.log('\n════ D 界面 ════')

const browser = await chromium.launch({
  executablePath: CHROME, headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const errs = []

// 工坊：多选列表 / 全选 / 清空 / 切类目 / 真实导出
{
  const ctx = await browser.newContext({ viewport: { width: 1500, height: 940 } })
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errs.push('updater: ' + e.message))
  await p.goto(UPD, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await p.waitForSelector('.rail-item', { timeout: 30000 })
  await p.locator('.rail-item[data-job="dlc"]').click()
  await p.waitForSelector('#dlc-kind', { timeout: 30000 })
  await p.waitForTimeout(600)

  ok('D1 扩展包候选是复选框（8 座自建阁）',
    (await p.locator('[data-pick]').count()) === 8, String(await p.locator('[data-pick]').count()))
  ok('D2 未选时显示「已选 0 / 8 项」',
    (await p.locator('#dlc-pick-count').textContent()).includes('0 / 8'))
  await p.locator('#dlc-pick-all').click(); await p.waitForTimeout(250)
  ok('D3 全选 → 8 / 8', (await p.locator('#dlc-pick-count').textContent()).includes('8 / 8'))
  await p.locator('#dlc-pick-none').click(); await p.waitForTimeout(250)
  ok('D4 清空 → 0 / 8', (await p.locator('#dlc-pick-count').textContent()).includes('0 / 8'))

  await p.locator('#dlc-kind').selectOption('set'); await p.waitForTimeout(350)
  ok('D5 切到「套装」→ 14 个候选', (await p.locator('[data-pick]').count()) === 14,
    String(await p.locator('[data-pick]').count()))
  await p.locator('#dlc-kind').selectOption('version'); await p.waitForTimeout(350)
  ok('D6 切到「版本」→ 2 个候选', (await p.locator('[data-pick]').count()) === 2,
    String(await p.locator('[data-pick]').count()))
  ok('D7 版本类目显示「会一并带上版本内的服装阁」提示',
    (await p.locator('.field .hint').allTextContents()).some((t) => t.includes('版本内的服装阁')))

  // 真实点两座阁 → 导出
  await p.locator('#dlc-kind').selectOption('banner'); await p.waitForTimeout(350)
  await p.locator('[data-pick]').nth(0).check()
  await p.locator('[data-pick]').nth(1).check()
  ok('D8 勾选 2 项后计数同步', (await p.locator('#dlc-pick-count').textContent()).includes('2 / 8'))
  // 记录导出前的包集合，用差集定位界面刚生成的那一个
  const srcBefore = new Set((await (await fetch(`${UPD}/api/state`)).json()).dlc?.src?.map((x) => x.id) || [])
  await p.locator('#dlc-make').click()
  await p.waitForTimeout(1500)
  const logTxt = (await p.locator('#log').textContent()) || ''
  ok('D9 界面导出成功并打印附带信息',
    logTxt.includes('已导出') && logTxt.includes('附带'), logTxt.slice(0, 90))
  const st = await (await fetch(`${UPD}/api/state`)).json()
  const fresh = (st.dlc?.src || []).filter((x) => !srcBefore.has(x.id))
  const latest = fresh[0]
  if (latest) {
    made.push(latest.id)
    ok('D10 界面导出的是多选包（声明了 pool.banner + codex.story）',
      (latest.provides || []).includes('codex.story') && (latest.provides || []).includes('pool.banner'),
      JSON.stringify(latest.provides))
  } else {
    ok('D10 界面导出的是多选包（声明了 pool.banner + codex.story）', false, '没找到新包')
  }

  await p.screenshot({ path: '.shots/v2923-dlc-multi.png' })
  await ctx.close()
}

// 全解锁存档（用设置页自己的「执行」，别手工拼 codex）
const BASE_SAVE = {
  version: 1, selectedVersion: '2.10', pity: {}, codex: {},
  milestoneClaimed: {}, history: [], settings: { skipAnim: true, skipOpening: true },
}
let SAVE = BASE_SAVE
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, JSON.stringify(BASE_SAVE)])
  const p = await ctx.newPage()
  await p.goto('about:blank')
  await p.goto(`${SIM}/#/settings`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  try {
    await p.waitForSelector('.gl-hot', { timeout: 45000 })
  } catch {
    // 冷启动偶发首帧不渲染
    await p.goto('about:blank')
    await p.goto(`${SIM}/#/settings`, { waitUntil: 'domcontentloaded', timeout: 90000 })
    await p.waitForSelector('.gl-hot', { timeout: 60000 })
  }
  await p.locator('.gl-hot[aria-label="快捷"]').click()
  await p.waitForSelector('.gm-btn', { timeout: 30000 })
  await p.locator('.gm-btn').nth(0).click(); await p.waitForTimeout(1400)
  await p.locator('.gm-btn').nth(1).click(); await p.waitForTimeout(3000)
  SAVE = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), SAVE_KEY)
  await ctx.close()
}

// 阅读物图鉴：重名标题确实带后缀，且不重复叠加
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, JSON.stringify(SAVE)])
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errs.push('readings: ' + e.message))
  await p.goto(`${SIM}/#/codex/readings`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await p.waitForSelector('.rd-row', { timeout: 60000 })
  await p.waitForTimeout(900)
  const titles = await p.locator('.rd-row .rd-title').allTextContents()
  ok('D11 阅读物图鉴里出现「阿芙芙玻的日记·01 / ·02」',
    titles.some((t) => t.includes('阿芙芙玻的日记·01')) && titles.some((t) => t.includes('阿芙芙玻的日记·02')),
    titles.filter((t) => t.includes('阿芙芙玻')).join(' | '))
  ok('D11b 只差一个错别字的《于湖底盛放的蔷薇》仍是两条同名',
    titles.filter((t) => t.trim() === '《于湖底盛放的蔷薇》').length === 2,
    String(titles.filter((t) => t.includes('于湖底盛放的蔷薇')).length))

  // 换到「伊赞之土」分区
  await p.locator('.rd-tab').nth(1).click(); await p.waitForTimeout(600)
  const t2 = await p.locator('.rd-row .rd-title').allTextContents()
  ok('D12 完全相同的《寄给搭配师协会总部的信》仍保持原名（2 条）',
    t2.filter((t) => t.trim() === '《寄给搭配师协会总部的信》').length === 2,
    String(t2.filter((t) => t.includes('寄给搭配师协会')).length))
  ok('D13 伊赞之土的 3 篇同名书信分别带 ·01/·02/·03',
    ['·01', '·02', '·03'].every((suf) => t2.some((t) => t.includes('玛缇亚与巨人王的往来书信' + suf))),
    t2.filter((t) => t.includes('玛缇亚')).join(' | '))
  ok('D13b 《梅妲伊尔的笔记》也有 ·01/·02',
    t2.some((t) => t.includes('《梅妲伊尔的笔记》·01')) && t2.some((t) => t.includes('《梅妲伊尔的笔记》·02')))
  await ctx.close()
}

{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, JSON.stringify(SAVE)])
  const p = await ctx.newPage()
  p.on('pageerror', (e) => errs.push('stories: ' + e.message))
  await p.goto(`${SIM}/#/codex/stories`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await p.waitForSelector('.rd-row', { timeout: 60000 })
  await p.waitForTimeout(900)
  await p.locator('.rd-tab').nth(0).click(); await p.waitForTimeout(600)
  const label = await p.locator('.rd-labeltxt').textContent()
  ok('D14 故事图鉴奇迹传说仍是 14/14', label.includes('14/14'), label.trim())
  const storyTitlesDom = await p.locator('.rd-row .rd-title').allTextContents()
  ok('D15 故事标题没有被误加后缀', storyTitlesDom.every((t) => !/·\d{2}$/.test(t.trim())),
    storyTitlesDom.filter((t) => /·\d{2}$/.test(t.trim())).join('、'))
  await ctx.close()
}

await browser.close()

/* ═════════════════ 清理 + 收尾 ═════════════════ */
for (const id of new Set(made)) await deletePack(id)
const leftover = new Set(made).size
console.log(`\n   已清理 ${leftover} 个验收包`)

ok('E1 三个应用页面都没有 JS 报错', errs.length === 0, errs.slice(0, 2).join(' / '))

console.log(`\n════ 结果：${pass.length} 通过 / ${fail.length} 失败 ════`)
if (fail.length) {
  for (const f of fail) console.log('  ✗ ' + f)
  process.exit(1)
}
