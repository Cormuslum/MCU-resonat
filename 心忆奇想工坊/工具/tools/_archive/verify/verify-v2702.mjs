/** 验收 —— 只覆盖本轮实际改动的项目及其关联项 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const UP = 'http://localhost:5199'
const ROOT = process.cwd()
const A = path.join(ROOT, 'public/assets')

let pass = 0
const fails = []
function ok(name, cond, detail = '') {
  if (cond) { pass += 1; console.log(`  ✓ ${name}`) }
  else { fails.push(name); console.log(`  ✗ ${name}${detail ? '  → ' + detail : ''}`) }
}

const manifest = JSON.parse(fs.readFileSync(path.join(A, 'manifest.json'), 'utf8'))

/* ══════════ A. 编号与素材 ══════════ */
console.log('\nA. 卡池编号统一官方号')
ok('80 只池 id 全是 banner-<三位官方号>',
  manifest.banners.every((b) => /^banner-\d{3,4}$/.test(b.id)),
  manifest.banners.filter((b) => !/^banner-\d{3,4}$/.test(b.id)).map((b) => b.id).join(','))
ok('每只池都带版本内 seq（1 起的整数，版本内不重号）',
  (() => {
    if (!manifest.banners.every((b) => Number.isInteger(b.seq) && b.seq >= 1)) return false
    const byVer = {}
    for (const b of manifest.banners) (byVer[b.version] ||= []).push(b.seq)
    return Object.values(byVer).every((arr) => new Set(arr).size === arr.length)
  })(),
  manifest.banners.filter((b) => !Number.isInteger(b.seq)).length + ' 缺失')
ok('manifest 不再产出 legacyId / prevId',
  manifest.banners.every((b) => !('legacyId' in b) && !('prevId' in b)),
  '残留 ' + manifest.banners.filter((b) => 'legacyId' in b || 'prevId' in b).length + ' 条')

const v10 = manifest.banners.filter((b) => b.version === '1.0').map((b) => b.id)
ok('1.0 按官方号排序（004=呱呱轻语 在 005=泡泡心诉 之前）',
  v10.indexOf('banner-004') < v10.indexOf('banner-005'), v10.join(','))

const b76 = manifest.banners.find((b) => b.id === 'banner-076')
const low = (b76.milestones || []).filter((m) => m.pulls <= 100)
ok('20~100 抽五档共用一张图（milestones/shared/low.webp）',
  low.length === 5 && low.every((m) => m.img === 'milestones/shared/low.webp'),
  low.map((m) => m.img).join('|'))
ok('共用图文件存在', fs.existsSync(path.join(A, 'milestones/shared/low.webp')))
ok('120 抽起仍是每池独立',
  (b76.milestones || []).filter((m) => m.pulls > 100).every((m) => m.img.startsWith('milestones/banner-076/')))
ok('manifest 不再有 ui.ver.logos / logoChip',
  !('logos' in manifest.ui.ver) && !('logoChip' in manifest.ui.ver))

/* ══════════ F. 工坊（先在 HTTP 层查一遍） ══════════ */
console.log('\nF. 工坊')
const html = await (await fetch(`${UP}/`)).text()
ok('页面标题已是「心忆奇想工坊」', html.includes('心忆奇想工坊') && !html.includes('心忆更新工坊'))
for (const f of ['rule-n', 'rule-h', 'reset-n', 'reset-h', 'seal', 'close']) {
  const r = await fetch(`${UP}/assets/ui/updater/${f}.webp`)
  ok(`工坊图标 ${f}.webp 可访问`, r.ok, String(r.status))
}
const state = await (await fetch(`${UP}/api/state`)).json()
const vf = state.jobs.version.fields.map((f) => f.key)
ok('版本表单已删上线/结束时间', !vf.includes('start') && !vf.includes('end'))
ok('版本表单有大版本号 + 大版本名', vf.includes('major') && vf.includes('majorName'))
ok('卡池表单已删「版本内序号」', !state.jobs.pool.fields.some((f) => f.key === 'seq'))
// ：立绘 / 整体图 / 进化立绘已合并成一个「整体图（OV）」槽位
ok('套装槽位合并为「整体图（OV）」',
  state.jobs.suit.groups.some((g) => g.slots.some((s) => s.key === 'ov')))
ok('卡池奖励槽位改名「深海回响奖励图」',
  state.jobs.pool.groups.some((g) => g.slots.some((s) => s.label === '深海回响奖励图')))
ok('/api/state 带 majors 列表', (state.options.majors || []).length >= 2)
// ：版本下拉必须按版本号**数值**排序（0.1 < 0.2 < 1.0 < 1.10 < 2.11）
// 否则 readdir / 写表顺序会把 0.2 排到 2.11 后面，新建版本还会默认选中它
{
  const vs = (state.options.versions || []).map((v) => v.v)
  const key = (s) => s.split('.').map((n) => Number(n) || 0)
  let sorted = true
  for (let i = 1; i < vs.length; i++) {
    const a = key(vs[i - 1])
    const b = key(vs[i])
    const d = a[0] - b[0] || (a[1] ?? 0) - (b[1] ?? 0)
    if (d > 0) { sorted = false; break }
  }
  ok('版本下拉按版本号排序', sorted && vs.length > 0, vs.join(' '))
  ok('版本下拉末位是最新版本（作为默认值）', vs.at(-1) === '2.11', vs.at(-1) || '（空）')

  // 磁盘上的 版本表.csv 也必须按版本号排好 —— 工坊写入时会重排
  // 但外部手改 / 追加行很容易又把 0.1 之类塞到末尾
  const csvV = fs.readFileSync(path.join(ROOT, '素材/信息表/版本表.csv'), 'utf8')
    .replace(/^\uFEFF/, '').trim().split(/\r?\n/).slice(1)
    .map((l) => l.split(',')[0].trim()).filter(Boolean)
  let csvSorted = true
  for (let i = 1; i < csvV.length; i++) {
    const a = key(csvV[i - 1])
    const b = key(csvV[i])
    if ((a[0] - b[0] || (a[1] ?? 0) - (b[1] ?? 0)) > 0) { csvSorted = false; break }
  }
  ok('版本表.csv 行序按版本号', csvSorted && csvV.length === vs.length, `${csvV.length} 行 | ${csvV.join(' ')}`)
}

/* ══════════ 浏览器部分 ══════════ */
const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
const errs = []
page.on('pageerror', (e) => errs.push(e.message))

const SAVE_KEY = 'nikki-resonance-save-v1'
function baseSave(extra = {}) {
  return {
    version: 1, selectedVersion: '', pity: {}, codex: {}, milestoneClaimed: {}, history: [],
    settings: { skipAnim: true, skipSingleAnim: true, skipReward: true, skipGacha: false },
    ...extra,
  }
}
async function loadWith(save, hash) {
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, JSON.stringify(save)])
  await page.goto('about:blank')
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1600)
}

/* ── B. 存档不再迁移删掉了 migrateBannerIds ── */
console.log('\nB. 存档 id 不做迁移（旧 key 原样留着，也不报错）')
await loadWith(baseSave({
  selectedVersion: '2.10',
  pity: { 'banner-2.10-02': { p5: 7, p4: 3, total: 47 } },
  milestoneClaimed: { 'banner-2.10-02': [20, 40] },
  history: [{ banner: 'banner-2.10-02', rarity: 3, part: 'x', at: 1 }],
}), '#/banner')
const untouch = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), SAVE_KEY)
ok('旧 key 原样保留（不再搬到 banner-076）',
  untouch.pity['banner-2.10-02']?.total === 47 && !untouch.pity['banner-076'])
ok('旧 key 的领取记录也没被搬走', JSON.stringify(untouch.milestoneClaimed['banner-2.10-02']) === '[20,40]')
ok('带旧 key 的存档能正常进共鸣页（不抛错）',
  (await page.locator('.pool-item').count()) > 0)

/* ── C. 版本页无徽记 ── */
console.log('\nC. 版本页徽记已删')
await loadWith(baseSave({ selectedVersion: '2.11' }), '#/versions')
ok('页面无 .vs-logo', (await page.locator('.vs-logo').count()) === 0)
ok('页面无 .vl-chip / .vl-badge', (await page.locator('.vl-chip, .vl-badge').count()) === 0)

/* ── D. 深海回响摆饰 ── */
console.log('\nD. 深海回响摆饰')
async function openEcho(version, poolName) {
  await loadWith(baseSave({ selectedVersion: version }), '#/banner')
  // 在池列表里点名字匹配的那一只
  const clicked = await page.evaluate((name) => {
    const els = [...document.querySelectorAll('.pool-item')]
    const t = els.find((el) => (el.textContent || '').includes(name))
    if (t) { t.click(); return true }
    return false
  }, poolName)
  await page.waitForTimeout(500)
  await page.locator('.wish-card').click()
  await page.waitForTimeout(600)
  return clicked
}

await openEcho('2.10', '执律的流金')
ok('执律的流金：摆饰名 = 万金之上',
  (await page.locator('.ds-name').innerText().catch(() => '')) === '万金之上')
const scene76 = await page.locator('.ds-scene').getAttribute('src').catch(() => '')
ok('执律的流金：大图指向 decor/076', /decor\/076\.webp/.test(scene76 || ''), scene76 || '')
ok('执律的流金：文案含「巨人的黄金时代」',
  (await page.locator('.ds-desc').innerText().catch(() => '')).includes('巨人的黄金时代'))
await page.screenshot({ path: '.shots/v2702-echo-076.png' })

await openEcho('2.9', '初醒的花庭')
const name73 = await page.locator('.ds-name').innerText().catch(() => '')
const scene73 = await page.locator('.ds-scene').getAttribute('src').catch(() => '')
ok('初醒的花庭：显示自己的摆饰（不再写死万金之上）', name73 && name73 !== '万金之上', name73)
ok('初醒的花庭：大图指向 decor/073', /decor\/073\.webp/.test(scene73 || ''), scene73 || '')
await page.screenshot({ path: '.shots/v2702-echo-073.png' })

await openEcho('1.0', '遥远之海')
ok('常驻池：没有摆饰块（无 .ds-info / .ds-scene）',
  (await page.locator('.ds-info').count()) === 0 && (await page.locator('.ds-scene').count()) === 0)

/* ── E. 跳过全部 ── */
console.log('\nE. 跳过全部只播新部件 / 第二套件')
await loadWith(baseSave({ selectedVersion: '2.10' }), '#/gacha?banner=banner-076&times=10')
for (let i = 0; i < 40; i++) {
  if (await page.evaluate(() => !!window.__gacha)) break
  await page.waitForTimeout(300)
}
const seqInfo = await page.evaluate(() => {
  const g = window.__gacha
  const seq = g.seq()
  const forced = {}
  seq.forEach((s) => {
    if (s.kind === 'detail') forced[s.idx] = !!s.forced
  })
  return {
    len: seq.length,
    kinds: seq.map((s) => (s.kind === 'detail' ? `d${s.idx}${s.forced ? '!' : ''}` : s.second ? 'S2' : 'S')),
    newFlags: g.store.lastResults.map((r) => !!r.isNew),
    forced,
    forcedCount: Object.values(forced).filter(Boolean).length,
  }
})
ok('十连揭示序列已生成', seqInfo.len > 0, `${seqInfo.len} 步 · ${seqInfo.kinds.join(' ')}`)

// 等单抽界面入场锁（DETAIL_INTRO_MS 1520）解除后再按，否则点击会被拦掉
await page.waitForTimeout(1700)
// 按「跳过全部」之前，当前正显示的这一件（若不可跳过）也要计入「应播放」
const visited = []
const pre = await page.evaluate(() => ({ phase: window.__gachaDbg?.phase, cur: window.__gachaDbg?.cur }))
if (pre.phase === 'detail' && seqInfo.forced[pre.cur]) {
  visited.push({ idx: pre.cur, isNew: seqInfo.newFlags[pre.cur], forced: true })
}
await page.locator('.dh-skip').click()
await page.waitForTimeout(300)

let suitTextBad = 0
for (let step = 0; step < 60; step++) {
  const st = await page.evaluate(() => ({
    phase: window.__gachaDbg?.phase,
    cur: window.__gachaDbg?.cur,
  }))
  if (st.phase !== 'detail' && st.phase !== 'suit') break
  if (st.phase === 'detail' && !visited.some((v) => v.idx === st.cur)) {
    visited.push({ idx: st.cur, isNew: seqInfo.newFlags[st.cur], forced: !!seqInfo.forced[st.cur] })
  }
  if (st.phase === 'suit') {
    const txt = await page.evaluate(() => {
      const el = document.querySelector('.suit')
      if (!el) return null
      return {
        hasSkipBtn: !!el.querySelector('.dh-skip'),
        hasSkipTxt: (el.textContent || '').includes('跳过全部'),
      }
    })
    if (txt && (txt.hasSkipBtn || txt.hasSkipTxt)) suitTextBad += 1
  }
  // 单抽界面有 1520ms 入场锁（DETAIL_INTRO_MS），等它解锁再点，否则点击被拦
  await page.waitForTimeout(1600)
  await page.evaluate(() => {
    const target = document.querySelector('.suit') || document.querySelector('.detail')
    if (target) target.click()
  })
  await page.waitForTimeout(260)
}

ok('跳过之后只出现「新部件 / 第二套件」的单抽界面',
  visited.length > 0 && visited.every((v) => v.isNew || v.forced),
  visited.map((v) => `${v.idx}:${v.isNew ? 'N' : v.forced ? 'S2' : 'DUP'}`).join(','))
ok('新部件与 4★/5★ 第 1、2 份一件都没被跳过',
  visited.length === seqInfo.forcedCount,
  `${visited.length} / ${seqInfo.forcedCount}`)
ok('套装获得页不再有「跳过全部」按钮或文字', suitTextBad === 0, `${suitTextBad} 次残留`)
ok('放完最后一件再点一下进入结算（result）',
  (await page.evaluate(() => window.__gachaDbg?.phase)) === 'result',
  await page.evaluate(() => window.__gachaDbg?.phase))

/* ── E2. 第二套页在跳过模式下不跨过 ── */
console.log('\nE2. 跳过模式：第二套页不跨过（4★/5★ 第 1、2 份都放）')
{
  // codex 每件 count=1 → 第一套已集齐，十连里任何 4★/5★ 部件都是「第 2 份」→ 必触发第二套页
  const codexFull = {}
  for (const s of b76.sets) {
    for (const ic of s.assets?.icons ?? []) codexFull[`${s.id}:${ic.name}`] = { count: 1, firstAt: 1 }
  }
  await loadWith(baseSave({ codex: codexFull, selectedVersion: '2.10' }), '#/gacha?banner=banner-076&times=10')
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => !!window.__gacha)) break
    await page.waitForTimeout(250)
  }
  const info = await page.evaluate(() => {
    const seq = window.__gacha.seq()
    const forced = {}
    seq.forEach((s) => { if (s.kind === 'detail') forced[s.idx] = !!s.forced })
    return {
      forced,
      forcedCount: Object.values(forced).filter(Boolean).length,
      secondSuits: seq.filter((s) => s.kind === 'suit' && s.second).length,
    }
  })
  ok('第一套集齐后十连必出「第二套」步骤', info.secondSuits > 0, `${info.secondSuits} 个第二套页`)

  await page.waitForTimeout(1700)
  const seen = []
  const pre2 = await page.evaluate(() => ({ phase: window.__gachaDbg?.phase, cur: window.__gachaDbg?.cur }))
  if (pre2.phase === 'detail' && info.forced[pre2.cur]) seen.push(pre2.cur)
  await page.locator('.dh-skip').click()
  await page.waitForTimeout(300)

  let scSecond = 0
  let dupDetail = 0
  for (let step = 0; step < 60; step++) {
    const st = await page.evaluate(() => ({ phase: window.__gachaDbg?.phase, cur: window.__gachaDbg?.cur }))
    if (st.phase !== 'detail' && st.phase !== 'suit') break
    if (st.phase === 'detail' && !seen.includes(st.cur)) {
      seen.push(st.cur)
      if (!info.forced[st.cur]) dupDetail += 1
    }
    if (st.phase === 'suit') scSecond += await page.locator('.sc-second').count()
    await page.waitForTimeout(1600)
    await page.evaluate(() => {
      const t = document.querySelector('.suit') || document.querySelector('.detail')
      if (t) t.click()
    })
    await page.waitForTimeout(260)
  }
  ok('跳过模式下重复件（非第 2 份 / 3★ 散件）单抽界面不出现', dupDetail === 0, `${dupDetail} 件`)
  ok('第二套页照常播放（未被跨过）', scSecond > 0, `.sc-second 出现 ${scSecond} 次`)
  ok('不可跳过部件全部播放', seen.length === info.forcedCount, `${seen.length} / ${info.forcedCount}`)
}

ok('全流程无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | '))

await browser.close()

console.log('\n' + '─'.repeat(52))
console.log(`通过 ${pass} / ${pass + fails.length}`)
if (fails.length) {
  console.log('失败：')
  for (const f of fails) console.log('  · ' + f)
  process.exit(1)
}
