/**
 * v2.0.02 验收：编号改号 + 废掉旧兼容链 + seq 重新定义 + 版本内按 seq 排序
 *
 * 用户四条要求：
 *   ① 繁星织梦 1002 → **1207**，繁花映愿 1003 → **1208**
 *   ② 舍弃 legacyId 拼接、舍弃老素材回落、舍弃 `前后名称对照表.md`（老素材已废弃）
 *   ③ seq 重新定义：含 5★ 在前 → 同星级按 gachaKey 数值升序 → 常驻阁永远最后
 *   ④ 模拟器里版本内的阁按 seq 排序
 *
 * 校验：A 数据 / B 旧链路确实没了 / C 浏览器里的实际顺序 / D 报错
 *
 * 依赖：`npm run up`（5178 + 5199）。
 * 跑法：node tools/verify-v2920.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SIM = 'http://127.0.0.1:5178'
const ROOT = process.cwd()

let pass = 0
let fail = 0
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`) }
}

const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/manifest.json'), 'utf8'))
const IDX = JSON.parse(fs.readFileSync(path.join(ROOT, '素材/信息表/卡池索引.json'), 'utf8'))
const onDisk = (rel) => !!rel && fs.existsSync(path.join(ROOT, 'public/assets', rel))
const byName = (n) => M.banners.find((b) => b.name === n)
const seqOf = (ver) => M.banners.filter((b) => b.version === ver).sort((a, b) => a.seq - b.seq).map((b) => b.name)

/* ═════════════ A. 编号与 seq ═════════════ */
console.log('\n════ A 编号与版本内序号 ════')
for (const [name, gk, ver] of [
  ['繁星织梦', '1207', '0.1'],
  ['繁花映愿', '1208', '0.2'],
]) {
  const b = byName(name)
  ok(`A ${name} 编号 ${gk} / id banner-${gk}`,
    !!b && b.gachaKey === gk && b.id === `banner-${gk}`,
    b ? `${b.id} gacha=${b.gachaKey}` : '未找到')
  ok(`A ${name} 是纯 4★ 池 → seq 4（版本内混池之后）`,
    !!b && b.seq === 4 && b.version === ver, b ? `seq=${b.seq} ${b.version}` : '')
}

ok('A 新编号素材已生成（bg / thumb / title）',
  ['1207', '1208'].every((k) => onDisk(`banners/bg/${k}.webp`) && onDisk(`banners/thumb/${k}.webp`) && onDisk(`banners/title/${k}.webp`)),
  '1207/1208')
ok('A 旧编号 1002 / 1003 的产物已清空',
  ['1002', '1003'].every((k) => !onDisk(`banners/bg/${k}.webp`) && !onDisk(`banners/thumb/${k}.webp`) && !onDisk(`banners/title/${k}.webp`)),
  ['1002', '1003'].map((k) => (onDisk(`banners/bg/${k}.webp`) ? k + ' 残留' : k + ' 已清')).join(' / '))
ok('A 旧编号的深海回响目录也清空',
  ['banner-1002', 'banner-1003'].every((d) => !fs.existsSync(path.join(ROOT, 'public/assets/milestones', d))))

// 每个版本 seq 必须是 1..n 连续、不重号
const byVer = {}
for (const b of M.banners) (byVer[b.version] ||= []).push(b.seq)
const badVer = Object.entries(byVer).filter(([, arr]) => {
  const s = [...arr].sort((a, b) => a - b)
  return s.some((v, i) => v !== i + 1)
})
ok('A 每个版本的 seq 都是 1..n 连续且不重号', badVer.length === 0,
  badVer.map(([v, a]) => `${v}:${a.join(',')}`).join(' | '))

ok('A 0.1 顺序 = 心愿栖金蕊(1) 银羽衔月歌(2) 心轮曳星河(3) 繁星织梦(4)',
  seqOf('0.1').join('/') === '心愿栖金蕊/银羽衔月歌/心轮曳星河/繁星织梦',
  seqOf('0.1').join(' → '))
ok('A 0.2 顺序 = 曦光渡魂处 织光为约 静默于枯荣之刻 繁花映愿',
  seqOf('0.2').join('/') === '曦光渡魂处/织光为约/静默于枯荣之刻/繁花映愿',
  seqOf('0.2').join(' → '))

const std = byName('遥远之海')
ok('A 常驻「遥远之海」在 1.0 里排最后（seq = 该版本池数）',
  !!std && std.type === 'standard' && std.seq === byVer['1.0'].length,
  std ? `seq=${std.seq} / 1.0 共 ${byVer['1.0'].length} 池` : '')
ok('A 1.0 里纯 4★（004/005）排在混池（002/003）之后',
  (() => {
    const o = seqOf('1.0')
    return o.indexOf('绘于蝶影的幻梦') < o.indexOf('呱呱轻语')
      && o.indexOf('留于花间的浮想') < o.indexOf('泡泡心诉')
  })(), seqOf('1.0').join(' → '))

ok('A 卡池索引.json 里已无手写 seq',
  Object.values(IDX).every((c) => !('seq' in c)), String(Object.keys(IDX).length) + ' 条')
ok('A 卡池索引.json 的编号已改（1207 / 1208）',
  IDX['繁星织梦']?.gachaKey === '1207' && IDX['繁花映愿']?.gachaKey === '1208',
  `${IDX['繁星织梦']?.gachaKey} / ${IDX['繁花映愿']?.gachaKey}`)

/* ═════════════ B. 旧链路确实没了 ═════════════ */
console.log('\n════ B 旧兼容链已移除 ════')
const bpm = fs.readFileSync(path.join(ROOT, 'tools/build-pool-map.py'), 'utf8')
const col = fs.readFileSync(path.join(ROOT, 'tools/collect-assets.py'), 'utf8')
ok('B build-pool-map 不再读 前后名称对照表.md',
  !/前后名称对照表\.md["']\s*\)/.test(bpm) && !bpm.includes('def load_list_map'),
  bpm.includes('load_list_map') ? '仍存在 load_list_map' : 'load_list_map 已删')
ok('B build-pool-map 不再拼 legacyId',
  !/legacy_id\s*=/.test(bpm) && !bpm.includes('"legacyId"'))
ok('B build-pool-map 不再回落老素材（无 banner_dir / 卡池背景图查找 / BG_HIRES 表）',
  !bpm.includes('banner_dir') && !bpm.includes('P("卡池背景图') && !bpm.includes('BG_HIRES ='))
ok('B collect-assets 不再合成老拆件（无 compose_bg_webp / BG_COMPOSE 分支）',
  !col.includes('def compose_bg_webp') && !col.includes('in BG_COMPOSE'))
ok('B manifest 不再产出 legacyId / prevId',
  M.banners.every((b) => !('legacyId' in b) && !('prevId' in b)),
  M.banners.filter((b) => 'legacyId' in b || 'prevId' in b).length + ' 条残留')
ok('B 全部 88 阁的 bgClean / thumb / title 都指向 banners/ 专题目录',
  M.banners.every((b) => ['bgClean', 'thumb', 'title'].every((k) => String(b.assets?.[k] || '').startsWith('banners/'))),
  M.banners.filter((b) => !String(b.assets?.bgClean || '').startsWith('banners/')).length + ' 条异常')

/* ═════════════ C. 浏览器里的实际顺序 ═════════════ */
console.log('\n════ C 版本内的阁按 seq 排序（真实 DOM） ════')
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const errs = []
for (const [ver, want] of [
  ['0.1', '心愿栖金蕊/银羽衔月歌/心轮曳星河/繁星织梦/遥远之海'],
  ['0.2', '曦光渡魂处/织光为约/静默于枯荣之刻/繁花映愿/遥远之海'],
]) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  await ctx.addInitScript((v) => {
    localStorage.setItem('nikki-resonance-save-v1', JSON.stringify({
      version: 1, selectedVersion: v, pity: {}, codex: {}, milestoneClaimed: {},
      history: [], settings: { skipAnim: true, skipOpening: true },
    }))
  }, ver)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errs.push(`${ver}: ${e.message}`))
  await page.goto(`${SIM}/#/banner`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('.pool-item', { timeout: 60000 })
  await page.waitForTimeout(1200)
  const got = await page.evaluate(() => [...document.querySelectorAll('.pool-item')]
    .map((el) => (el.getAttribute('title') || el.textContent || '').replace(/\s+/g, '').split('（')[0]))
  ok(`C ${ver} 列表顺序 = ${want.split('/').join(' → ')}`, got.join('/') === want, got.join(' → '))
  await ctx.close()
}
await browser.close()

/* ═════════════ D. 报错 ═════════════ */
console.log('\n════ D 报错 ════')
ok('D 两个版本的共鸣页都没有 JS 异常', errs.length === 0, errs.slice(0, 2).join(' / '))

console.log(`\n通过 ${pass} / 失败 ${fail}`)
process.exit(fail ? 1 : 0)
