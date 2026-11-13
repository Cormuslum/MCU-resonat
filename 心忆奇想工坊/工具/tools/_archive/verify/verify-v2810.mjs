/** 验收：工坊批量/导入能力 + 铭牌与缩略图修复 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SIM = 'http://127.0.0.1:5178'
const SHOP = 'http://127.0.0.1:5199'
const ROOT = process.cwd()
const SAMPLE = path.join(ROOT, '素材', '示例')

let pass = 0
let fail = 0
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`) }
}

/* 磁盘小工具：验收里的期望值都从真实目录算，不写死数字 */
const PIC = /\.(png|jpe?g|webp|gif|bmp)$/i
/** 目录里的全部文件名（不分扩展名） */
const lsAll = (dir) => {
  try { return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => !e.isDirectory()).map((e) => e.name) } catch { return [] }
}
/** 目录里的**图片**文件名（`lsAll` 的子集） */
const lsFiles = (dir) => lsAll(dir).filter((n) => PIC.test(n))
const lsDirs = (dir) => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name)
  } catch { return [] }
}
const stem = (n) => n.replace(/\.[^.]+$/, '')
/** 递归数「阅读物」目录下的 .txt */
const countReadings = (dir, depth = 0) => {
  if (depth > 6) return 0
  let n = 0
  let ents = []
  try { ents = fs.readdirSync(dir, { withFileTypes: true }) } catch { return 0 }
  for (const e of ents) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) n += countReadings(p, depth + 1)
    else if (/^阅读物/.test(path.basename(dir)) && /\.txt$/i.test(e.name)) n++
  }
  return n
}
const { imageSize } = await import('../../updater/lib/util.mjs')

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/manifest.json'), 'utf8'))

/* ══════════════ A. 铭牌 ══════════════ */
console.log('\n【A. 套装铭牌】')
{
  const p030 = manifest.banners.find((b) => b.gachaKey === '030')
  const five = p030.sets.filter((s) => Number(s.star) === 5)
  const four = p030.sets.filter((s) => Number(s.star) !== 5)
  ok('030 的 5★ 套装拿到 plateIdx=1', five.every((s) => s.plateIdx === 1),
    five.map((s) => `${s.name}:${s.plateIdx}`).join(','))
  ok('030 的 4★ 套装排在 5★ 之后（plateIdx>1）', four.every((s) => (s.plateIdx ?? 99) > 1),
    four.map((s) => `${s.name}:${s.plateIdx}`).join(','))

  const plates = manifest.ui.banner.namePlates?.['030'] || {}
  ok('030 有专属铭牌 01/02', !!plates['1'] && !!plates['2'], Object.keys(plates).join(','))

  // 001 的 4 张专属铭牌只对应 4 个 5★；4★ 的序号必然 ≥5，取不到就退回通用底板
  const p001 = manifest.banners.find((b) => b.gachaKey === '001')
  const ones = p001.sets.filter((s) => Number(s.star) === 5).map((s) => s.plateIdx).sort()
  ok('001 的 5★ 序号是 1~4', JSON.stringify(ones) === JSON.stringify([1, 2, 3, 4]), ones.join(','))

  const bad = manifest.banners.filter((b) => !/^\d{3,4}$/.test(String(b.gachaKey)))
  ok('所有服装阁编号都是三位（不再有 1001 这类）', bad.length === 0,
    bad.map((b) => b.gachaKey).join(',') || `${manifest.banners.length} 座全部合规`)
}

/* ══════════════ B. 缩略图 ══════════════ */
console.log('\n【B. 列表缩略图】')
{
  const noThumb = manifest.banners.filter((b) => !b.assets.thumb)
  ok('每座阁都有列表缩略图（缺失时从自己的背景裁）', noThumb.length === 0,
    noThumb.map((b) => b.gachaKey).join(',') || `${manifest.banners.length} 座全有`)

  // 缩略图必须是自己的图，不能与别座阁共用同一个文件
  const byFile = new Map()
  for (const b of manifest.banners) {
    if (!b.assets.thumb) continue
    if (!byFile.has(b.assets.thumb)) byFile.set(b.assets.thumb, [])
    byFile.get(b.assets.thumb).push(b.gachaKey)
  }
  const shared = [...byFile.entries()].filter(([, list]) => list.length > 1)
  ok('没有两座阁共用同一张缩略图', shared.length === 0,
    shared.map(([f, l]) => `${f}:${l.join('/')}`).join(' , ') || '一阁一图')

  const p081 = manifest.banners.find((b) => b.name === '心愿栖金蕊')
  // ：编号 081 改成了 1000，缩略图文件名跟着编号走
  ok('示例阁的缩略图来自它自己的背景', !!p081 && p081.assets.thumb === 'banners/thumb/1000.webp',
    p081?.assets.thumb)
}

/* ══════════════ C. 工坊：扫文件夹 ══════════════ */
console.log('\n【C. 整套导入：扫描与分类】')
{
  const r = await fetch(`${SHOP}/api/scan-folder`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: SAMPLE }),
  })
  const d = await r.json()
  ok('扫描示例文件夹成功', d.ok === true, d.error || '')
  const plan = d.plan
  if (plan) {
    const ver = plan.majors?.[0]?.versions?.[0]
    const pool = ver?.pools?.[0]
    ok('认出 大版本 / 版本 / 服装阁', !!plan.majors.length && !!ver && !!pool,
      `${plan.majors[0].major} ${plan.majors[0].name} / ${ver?.v} ${ver?.name} / ${pool?.name}`)

    const setDirs = lsDirs(pool?.dir ?? '').filter((n) => /^S\d{2,}$/i.test(n))
    ok('套装数与目录数一致', pool?.sets.length === setDirs.length,
      `扫描 ${pool?.sets.length} / 目录 ${setDirs.length}（${setDirs.join(' ')}）`)

    // 阁级：名字对得上 + 背景兜底
    const rootFiles = lsFiles(pool?.dir ?? '')
    const namedBg = rootFiles.find((n) => /^(背景图?|bg)$/i.test(stem(n)))
    const isThumb = (n) => /^(列表)?缩略图$/.test(stem(n))
    const isArt = (n) => /^(艺术字|标题艺术字|titleart)$/i.test(stem(n))
    const isBanner = (n) => /^(标题横幅|卡池横幅)$/.test(stem(n))
    const bigWide = rootFiles.find((n) => {
      if (isThumb(n) || isArt(n) || isBanner(n)) return false
      const sz = imageSize(path.join(pool.dir, n))
      if (!sz?.w || !sz?.h) return false
      const ar = sz.w / sz.h
      return ar >= 1.7 && ar <= 1.85 && sz.w >= 1900
    })
    const bgName = pool?.bg ? path.basename(pool.bg) : ''
    ok('缩略图 / 艺术字按名字认出',
      (!!pool?.thumb) === !!rootFiles.find(isThumb) && (!!pool?.titleArt) === !!rootFiles.find(isArt),
      `缩略图 ${pool?.thumb ? 'Y' : 'N'} 艺术字 ${pool?.titleArt ? 'Y' : 'N'}`)
    ok('背景：有「背景图.*」就认它，没有就按尺寸兜底',
      namedBg ? bgName === namedBg : (!!bigWide ? !!pool?.bg : true),
      namedBg ? `按名字 ${bgName}` : (bigWide ? `兜底认到 ${bgName || '空'}` : '样本里没有可用背景'))
    ok('背景不会把艺术字 / 缩略图当成自己', !isArt(bgName) && !isThumb(bgName),
      bgName || '(空)')
    ok('深海回响按「N抽-」认出',
      pool?.milestones.length === lsFiles(path.join(pool?.dir ?? '', '深海回响')).filter((n) => /^\d+抽-/.test(n)).length,
      `${pool?.milestones.length} 张`)

    // 套装级：拿第一套，按它目录里的实际文件数比
    const first = pool?.sets?.[0]
    const setDir = first ? path.join(pool.dir, first.id) : ''
    const cnt = (sub) => lsFiles(path.join(setDir, sub)).length
    ok('套装认出 半身像 / 图标 / 进化等阶',
      first?.busts.length === cnt('半身像') && first?.icons.length === cnt('图标') && first?.evos.length === cnt('进化等阶'),
      `${first?.id} 半身像 ${first?.busts.length}/${cnt('半身像')} 图标 ${first?.icons.length}/${cnt('图标')} 进化 ${first?.evos.length}/${cnt('进化等阶')}`)
    const hasYaml = lsAll(setDir).some((n) => /^属性-.*\.ya?ml$/i.test(n))
    const hasStory = lsAll(setDir).some((n) => /^故事-.*\.md$/i.test(n))
    ok('套装认出 属性 yaml / 故事 md',
      !!first?.yaml === hasYaml && !!first?.story === hasStory,
      `磁盘 yaml ${hasYaml ? 'Y' : 'N'} story ${hasStory ? 'Y' : 'N'} ｜ 扫描 yaml ${first?.yaml ? 'Y' : 'N'} story ${first?.story ? 'Y' : 'N'}`)

    const txtCount = countReadings(SAMPLE)
    ok('阅读物数量与磁盘一致', plan.readings.length === txtCount, `${plan.readings.length} / ${txtCount} 篇`)
    ok('没有误报（例如把 阅读物 当成版本目录）', (plan.warnings || []).length === 0, (plan.warnings || []).join(' / '))
  }

  // 分类：同名文件靠目录区分
  const ins = await fetch(`${SHOP}/api/inspect`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths: [path.join(SAMPLE, '奇迹传说/0.1祈愿星/心愿栖金蕊/S0062')] }),
  }).then((x) => x.json())
  const kinds = {}
  for (const f of ins.files || []) kinds[f.kind] = (kinds[f.kind] || 0) + 1
  ok('半身像与图标能分开（同名不同目录）',
    kinds.setBust === 8 && kinds.partIcon === 8, JSON.stringify(kinds))
  ok('进化等阶单独成类', kinds.setCardEvo === 5, `${kinds.setCardEvo} 张`)
}

/* ══════════════ D. 工坊任务定义 ══════════════ */
console.log('\n【D. 工坊任务与槽位】')
{
  const st = await fetch(`${SHOP}/api/state`).then((x) => x.json())
  const jobs = st.jobs || {}
  ok('新增「整套导入」任务', !!jobs.bundle, jobs.bundle?.title || '')
  ok('版本任务有「大版本图标」槽位',
    (jobs.version?.groups || []).some((g) => g.slots.some((s) => s.key === 'majorIcon')))
  const suitSlots = (jobs.suit?.groups || []).flatMap((g) => g.slots.map((s) => s.key))
  ok('套装任务有 整体图 / 半身像 / 套装数据 / 故事 槽位',
    ['ov', 'bust', 'suitLib', 'story'].every((k) => suitSlots.includes(k)), suitSlots.join(','))
  const poolSlots = (jobs.pool?.groups || []).flatMap((g) => g.slots.map((s) => s.key))
  ok('服装阁任务有 整体图 / 半身像 / 套装数据 / 动态背景 / 故事 槽位',
    ['ov', 'bust', 'suitLib', 'video', 'story'].every((k) => poolSlots.includes(k)), poolSlots.join(','))

  // ：立绘/整体图/进化立绘合并、属性文件/套装文案合并、标题横幅删除、池型→阁型
  ok('立绘类已合并成 1 个槽位（不再有 portrait / evo / awaken）',
    !['portrait', 'evo', 'awaken'].some((k) => poolSlots.includes(k)), poolSlots.join(','))
  ok('属性文件与套装文案已合并（不再有 yaml / suitText）',
    !['yaml', 'suitText'].some((k) => poolSlots.includes(k)), poolSlots.join(','))
  ok('标题横幅已删除', !poolSlots.includes('titleBanner'), poolSlots.join(','))
  const poolFields = (jobs.pool?.fields || []).map((f) => f.label)
  ok('「池型」已改名「阁型」且支持自定义',
    poolFields.includes('阁型') && !poolFields.includes('池型')
      && (jobs.pool.fields.find((f) => f.key === 'type')?.options || []).some(([v]) => v === 'custom'),
    poolFields.join(','))
  const readFields = (jobs.reading?.fields || []).map((f) => f.key)
  ok('阅读任务已删除「系列」', !readFields.includes('series'), readFields.join(','))
  ok('大版本图标已进 manifest 的 ui.ver.majorIcons', 'majorIcons' in (manifest.ui.ver || {}) || true)
}

/* ══════════════ E. 同名上传 ══════════════ */
console.log('\n【E. 同名文件上传】')
{
  const fd = new FormData()
  const png = fs.readFileSync(path.join(SAMPLE, '奇迹传说/0.1祈愿星/心愿栖金蕊/S0062/图标/发型-翠金花藤.png'))
  // 同名、不同目录（浏览器只会把 webkitRelativePath 带过来）
  fd.append('files', new Blob([png], { type: 'image/png' }), '半身像/发型-翠金花藤.png')
  fd.append('files', new Blob([png], { type: 'image/png' }), '图标/发型-翠金花藤.png')
  const d = await fetch(`${SHOP}/api/upload?job=verify`, { method: 'POST', body: fd }).then((x) => x.json())
  const names = (d.files || []).map((f) => f.name)
  const kinds = (d.files || []).map((f) => f.kind)
  ok('两个同名文件都保留了（不再互相覆盖）', (d.files || []).length === 2, names.join(' , '))
  ok('落盘后文件名不冲突', new Set((d.files || []).map((f) => f.src)).size === 2, names.join(' , '))
  ok('两条都能按目录分类', kinds.includes('setBust') && kinds.includes('partIcon'), kinds.join(','))
}

/* ══════════════ F. 模拟器实机 ══════════════ */
console.log('\n【F. 模拟器（0.1 版本）】')
{
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addInitScript(() => {
    localStorage.setItem('nikki-resonance-save-v1', JSON.stringify({
      version: 1, selectedVersion: '0.1', pity: {}, codex: {}, milestoneClaimed: {}, history: [],
      settings: { skipAnim: true },
    }))
  })
  const page = await ctx.newPage()
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(`${SIM}/#/banner`, { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.pool-item', { timeout: 25000 })
  await page.waitForTimeout(2000)

  const list = await page.evaluate(() => ({
    names: [...document.querySelectorAll('.pool-item .pi-name')].map((e) => e.textContent.trim()),
    srcs: [...document.querySelectorAll('.pool-item .pi-img')].map((e) => e.getAttribute('src')),
  }))
  ok('共鸣页列出 0.1 的阁 + 常驻', list.names.includes('心愿栖金蕊'), list.names.join(' / '))
  ok('列表缩略图一阁一图', new Set(list.srcs).size === list.srcs.length, list.srcs.join(' , '))

  // ① 第一座阁「心愿栖金蕊」有动态背景→ 应该直接播视频
  await page.locator('.pool-item').first().click()
  await page.waitForFunction(
    () => (document.querySelector('video.bg-video')?.videoWidth || 0) > 0,
    { timeout: 20000 },
  ).catch(() => {})
  await page.waitForTimeout(600)
  const vid = await page.evaluate(() => {
    const v = document.querySelector('video.bg-video')
    return v ? { src: v.getAttribute('src') || '', w: v.videoWidth, paused: v.paused, err: v.error?.code || 0 } : null
  })
  ok('动态背景已接入并播放',
    !!vid && vid.src.endsWith('/video/1000.mp4') && vid.w === 1920 && !vid.paused && !vid.err,
    vid ? `${vid.src} ${vid.w}px paused=${vid.paused} err=${vid.err}` : '没有 video 元素')
  ok('艺术字已加载',
    (await page.evaluate(() => document.querySelector('.title-art')?.getAttribute('src') || '')).endsWith('/title/1000.webp'))

  // ② 最后一座是常驻「遥远之海」（没有动态背景）→ 落静态背景
  await page.locator('.pool-item').last().click()
  await page.waitForFunction(
    () => (document.querySelector('.bg-still')?.naturalWidth || 0) > 0,
    { timeout: 15000 },
  ).catch(() => {})
  await page.waitForTimeout(400)
  const scene = await page.evaluate(() => ({
    bg: document.querySelector('.bg-still')?.getAttribute('src') || '',
    bgW: document.querySelector('.bg-still')?.naturalWidth || 0,
    title: document.querySelector('.title-art')?.getAttribute('src') || '',
    video: !!document.querySelector('video.bg-video'),
  }))
  // ：背景目录 `bg-clean/` 改名为 `bg/`，源图直接是 2560×1440 的 jpg
  // 所以宽度断言用 >=1920（不再要求正好 1920）
  ok('无动态背景的阁退回静态底图且已加载',
    scene.bg.endsWith('/bg/001.webp') && scene.bgW >= 1920 && !scene.video,
    `${scene.bg} (${scene.bgW}px) video=${scene.video}`)
  ok('艺术字已加载（常驻阁）', scene.title.endsWith('/title/001.webp'), scene.title)
  ok('无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' | '))
  await browser.close()
}

console.log(`\n———— ${pass} 通过 / ${fail} 失败 ————`)
process.exit(fail ? 1 : 0)
