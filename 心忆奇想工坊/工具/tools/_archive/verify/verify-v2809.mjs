/** 验收：改名 / 素材换源 / 主页侧栏 / 归档 / 合成背景 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = 'http://localhost:5178'
const ROOT = process.cwd()

let pass = 0
let fail = 0
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`) }
}

const SAVE = (ver) => ({
  version: 1, selectedVersion: ver,
  pity: {}, codex: {}, milestoneClaimed: {}, history: [],
  settings: { skipAnim: true },
})

const browser = await chromium.launch({ executablePath: CHROME, headless: true })

async function newPage(ver = '2.11') {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  await ctx.addInitScript((s) => {
    localStorage.setItem('nikki-resonance-save-v1', JSON.stringify(s))
    // 记录所有 <audio> 请求，用于验证点击音
    window.__audio = []
    const A = window.Audio
    window.Audio = function (src) { try { window.__audio.push(String(src)) } catch { /* noop */ } return new A(src) }
    window.Audio.prototype = A.prototype
  }, SAVE(ver))
  const page = await ctx.newPage()
  page.on('pageerror', () => {})
  return { ctx, page }
}

/* ══════════════ A. 改名 ══════════════ */
console.log('\n【A. 改名：卡池 → 服装阁】')
{
  const { ctx, page } = await newPage('2.11')
  const pages = [
    ['#/', '主页'],
    ['#/banner', '共鸣'],
    ['#/versions', '版本'],
    ['#/codex', '图鉴'],
    ['#/almanac', '玄学'],
    ['#/settings', '设置'],
  ]
  const hits = []
  for (const [hash, name] of pages) {
    await page.goto(BASE + '/' + hash, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1800)
    const txt = await page.evaluate(() => document.body.innerText)
    if (txt.includes('卡池')) hits.push(`${name}(${(txt.match(/卡池/g) || []).length})`)
  }
  ok('六个主要页面都不再出现「卡池」', hits.length === 0, hits.join(' / ') || '零残留')

  await page.goto(BASE + '/#/versions', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1800)
  const poolLabel = await page.evaluate(() => document.querySelector('.vr-pool')?.textContent?.trim() ?? '')
  ok('版本页进入键标签用「服装阁」称呼', /^服装阁/.test(poolLabel), poolLabel || '未渲染')

  // 工坊界面文案
  const webDir = path.join(ROOT, 'updater', 'web')
  let shopHit = 0
  if (fs.existsSync(webDir)) {
    for (const f of fs.readdirSync(webDir)) {
      if (!/\.(js|html)$/.test(f)) continue
      const s = fs.readFileSync(path.join(webDir, f), 'utf8')
      // 只统计会显示到界面上的中文文案（排除注释与变量名）
      if (/['"`>][^'"`<]*卡池/.test(s)) shopHit++
    }
  }
  ok('工坊界面文案也已改名', shopHit === 0, shopHit ? `${shopHit} 个文件仍有「卡池」` : '零残留')
  await ctx.close()
}

/* ══════════════ B. 主页无侧边栏 ══════════════ */
console.log('\n【B. 主页不显示侧边栏】')
{
  const { ctx, page } = await newPage('2.11')
  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.hm-mail', { timeout: 30000 })
  await page.waitForTimeout(3000)
  const n0 = await page.locator('.rail').count()
  ok('主页初始无 .rail', n0 === 0, `count=${n0}`)
  await page.mouse.move(4, 540)
  await page.waitForTimeout(900)
  const n1 = await page.locator('.rail').count()
  ok('左缘悬停也不唤出侧边栏', n1 === 0, `count=${n1}`)

  // 二级页仍要有返回路径
  await page.goto(BASE + '/#/versions', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  ok('版本页仍有返回键', (await page.locator('.vr-back').count()) === 1)
  await ctx.close()
}

/* ══════════════ C. 素材换源 ══════════════ */
console.log('\n【C. 素材换源（078~080 高清 / 简中艺术字）】')
{
  const cases = [
    ['2.3', '如我斑斓', '053'],
    ['2.7', '千万次相逢的理由', '066'],
    ['2.10', '不灭的幽旅', '078'],
    ['2.10', '以长夜为誓', '079'],
    ['2.11', '雪落颂愿时', '080'],
    ['2.4', '契约终末之时', '058'],
  ]
  for (const [ver, name, key] of cases) {
    const { ctx, page } = await newPage(ver)
    await page.goto(BASE + '/#/banner', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.pool-item', { timeout: 25000 })
    await page.waitForTimeout(1500)
    const names = await page.$$eval('.pool-item .pi-name', (els) => els.map((e) => e.textContent.trim()))
    const i = names.indexOf(name)
    if (i < 0) { ok(`${key} ${name} 在 ${ver} 列表里`, false, names.join(',')); await ctx.close(); continue }
    await page.locator('.pool-item').nth(i).click()
    await page.waitForTimeout(1200)
    // 有动态背景的阁渲染的是 <video>，静态阁才是 <img class="bg-still">
    await page.waitForFunction(() => {
      const v = document.querySelector('video.bg-video')
      const im = document.querySelector('.bg-still')
      return (v && v.videoWidth > 0) || (im && im.naturalWidth > 0)
    }, { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(400)
    const r = await page.evaluate(() => {
      const v = document.querySelector('video.bg-video')
      return {
        bg: document.querySelector('.bg-still')?.getAttribute('src') || '',
        bgW: document.querySelector('.bg-still')?.naturalWidth || 0,
        title: document.querySelector('.title-art')?.getAttribute('src') || '',
        titleW: document.querySelector('.title-art')?.naturalWidth || 0,
        vid: v ? { src: v.getAttribute('src') || '', w: v.videoWidth } : null,
      }
    })
    // ：`banners/bg-clean/` 改名为 `banners/bg/`；源图直接是 2560×1440 的 jpg
    // 不再经过「裁 16:9 缩到 1920」那条路，所以宽度期望放宽到 ≥1920
    // ：接了动态背景的阁直接播视频，静态底图不再渲染 —— 两种都算「铺满」
    const bgOk = r.vid
      ? (r.vid.src.endsWith(`/video/${key}.mp4`) || r.vid.src.endsWith(`/video/${key}.webm`)) && r.vid.w >= 1920
      : r.bg.endsWith(`/bg/${key}.webp`) && r.bgW >= 1920
    ok(`${key} ${name}：背景为 bg 成品且铺满`, bgOk,
      r.vid ? `video ${r.vid.src} ${r.vid.w}px` : `${r.bg} ${r.bgW}px`)
    ok(`${key} ${name}：艺术字已加载（简中素材）`,
      r.title.endsWith(`/title/${key}.webp`) && r.titleW > 0,
      `${r.title} ${r.titleW}px`)
    await ctx.close()
  }
}

/* ══════════════ D. 归档完整性 ══════════════ */
console.log('\n【D. 归档：public/assets 无孤儿】')
{
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/manifest.json'), 'utf8'))
  const used = new Set()
  const bases = new Set()
  ;(function walk(o) {
    if (typeof o === 'string') {
      if (/\.(webp|png|jpe?g|gif|ogg|mp3|webm|mp4|woff2?|ttf|otf)$/i.test(o)) {
        used.add(o); bases.add(path.basename(o))
      }
      return
    }
    if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k])
  })(manifest)

  const all = []
  ;(function walkDir(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walkDir(p)
      else all.push(path.relative(path.join(ROOT, 'public/assets'), p).replace(/\\/g, '/'))
    }
  })(path.join(ROOT, 'public/assets'))

  // `ui/updater/*` 是「更新工坊」自己的图标，被 `updater/web/index.html` 直接引用，
  // 不进模拟器的 manifest —— 归档时特意留了下来，别算作孤儿
  const orphan = all.filter((f) =>
    !used.has(f) && !bases.has(path.basename(f)) &&
    !/manifest\.json$/.test(f) && !f.startsWith('ui/updater/'))
  ok('manifest 之外没有残留素材', orphan.length === 0,
    orphan.length ? `${orphan.length} 个，例：${orphan.slice(0, 3).join(' , ')}` : `共 ${all.length} 个文件全部可达`)

  const arch = path.join(ROOT, '归档素材', '2026-11-04-未启用素材')
  ok('归档目录存在且非空', fs.existsSync(arch) && fs.readdirSync(arch).length > 0,
    fs.existsSync(arch) ? `${fs.readdirSync(arch).length} 个顶层条目` : '缺失')
}

/* ══════════════ E. 进入音覆盖 ══════════════ */
console.log('\n【E. 各阁进入音】')
{
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/manifest.json'), 'utf8'))
  const enter = manifest.bannerEnter || {}
  // ：用户自建的阁可能还没有音频（示例文件夹不带音频），只要**官方 001~080** 齐全即可
  const official = manifest.banners.filter((b) => Number(b.gachaKey) >= 1 && Number(b.gachaKey) <= 80)
  const missOfficial = official.filter((b) => !enter[b.id])
  ok('官方 001~080 都有进入音', missOfficial.length === 0,
    missOfficial.map((b) => b.gachaKey).join(',') || `${official.length} 座齐全`)
  const extraMiss = manifest.banners.filter((b) => Number(b.gachaKey) > 80 && !enter[b.id])
  if (extraMiss.length) console.log(`    · 自建阁暂无进入音（可接受）：${extraMiss.map((b) => b.gachaKey).join(',')}`)

  const missingFile = Object.values(enter).filter((p) => !fs.existsSync(path.join(ROOT, 'public/assets', p)))
  ok('进入音文件都真实存在', missingFile.length === 0, missingFile.slice(0, 3).join(' , ') || '全在')

  const v211 = manifest.banners.filter((b) => b.version === '2.11')
  ok('2.11 目前只挂「雪落颂愿时」', v211.length === 1 && v211[0].name === '雪落颂愿时',
    v211.map((b) => b.name).join(','))

  // 原始音量：playBannerEnter 默认 1，不再乘 0.85
  const audioSrc = fs.readFileSync(path.join(ROOT, 'src/composables/useAudio.ts'), 'utf8')
  ok('进入音按原始音量播放（默认 volume = 1）',
    /export function playBannerEnter\(bannerId: string, volume = 1\)/.test(audioSrc))
}

/* ══════════════ F. 版本页点击音 ══════════════ */
console.log('\n【F. 版本页点击音】')
{
  const { ctx, page } = await newPage('2.10')
  await page.goto(BASE + '/#/versions', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2800)

  const majors = await page.locator('.vr-major').count()
  ok('大版本分组已渲染', majors >= 2, `${majors} 组`)

  // 展开「心愿原野」（大版本 1）那一组： 之后前面还可能有「奇迹传说」（0）
  const groups = await page.$$eval('.vr-major .vm-txt', (els) => els.map((e) => e.textContent.trim()))
  const g1 = groups.findIndex((t) => t.includes('心愿原野'))
  await page.locator('.vr-major').nth(g1 >= 0 ? g1 : 0).click({ force: true })
  await page.waitForSelector('.vr-minors.open', { timeout: 5000 })
  await page.waitForTimeout(600)

  async function clickVer(scope, ver) {
    const item = page.locator(scope).filter({ hasText: new RegExp('^\\s*' + ver.replace(/\./g, '\\.') + '(?![\\d.])') }).first()
    if (!(await item.count())) return null
    await item.scrollIntoViewIfNeeded()
    const before = await page.evaluate(() => window.__audio.length)
    await item.click({ force: true })
    await page.waitForTimeout(600)
    return page.evaluate((i) => window.__audio.slice(i).filter((u) => u.includes('banner-enter')), before)
  }

  const got10 = await clickVer('.vr-minors.open .vr-minor', '1.0')
  ok('点 1.0 播放 001 的进入音',
    !!got10 && got10.some((u) => u.endsWith('/001.ogg')),
    (got10 || []).map((u) => u.split('/').pop()).join(',') || '无')

  // 展开「伊赞之土」（大版本 2）那一组，验证 2.11 → 080
  const g2 = groups.findIndex((t) => t.includes('伊赞之土'))
  await page.locator('.vr-major').nth(g2 >= 0 ? g2 : groups.length - 1).click({ force: true })
  await page.waitForTimeout(700)
  const got211 = await clickVer('.vr-minors.open .vr-minor', '2.11')
  ok('点 2.11 播放 080 的进入音',
    !!got211 && got211.some((u) => u.endsWith('/080.ogg')),
    (got211 || []).map((u) => u.split('/').pop()).join(',') || '无')

  // 每座阁的进入音都必须与该版本「首个含 5★ 的阁」一致
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/manifest.json'), 'utf8'))
  const firstFive = {}
  for (const b of manifest.banners) {
    if (!firstFive[b.version] && String(b.star || '').includes('5★')) firstFive[b.version] = b.gachaKey
  }
  const allVers = new Set(manifest.banners.map((b) => b.version))
  const noFive = Object.keys(firstFive).length
  ok('每个版本都能定位到「首个五星阁」', noFive === allVers.size, `${noFive} / ${allVers.size} 个版本`)
  await ctx.close()
}

await browser.close()

console.log(`\n———— ${pass} 通过 / ${fail} 失败 ————`)
process.exit(fail ? 1 : 0)
