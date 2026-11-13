/** 验收：0.1「繁星织梦」/ 0.2「繁花映愿」两座自建阁接入 */
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
const NEW = [
  { name: '繁星织梦', gacha: '1207', ver: '0.1', setId: 'S0177', setName: '星愿璨梦', parts: 9 },
  { name: '繁花映愿', gacha: '1208', ver: '0.2', setId: 'S0348', setName: '暖歌花纪', parts: 9 },
]
const onDisk = (rel) => !!rel && fs.existsSync(path.join(ROOT, 'public/assets', rel))

console.log('════ A manifest ════')
ok('A1 阁总数 88（+2）', M.banners.length === 88, String(M.banners.length))
for (const n of NEW) {
  const b = M.banners.find((x) => x.name === n.name)
  ok(`A2 ${n.name} 已入库`, !!b, b ? `${b.id} · ${b.version} · ${b.star}` : '未找到')
  if (!b) continue
  ok(`A3 ${n.name} 编号 / 版本 / 版本内序号 4（纯 4★ 垫在混池后面）`,
    b.gachaKey === n.gacha && b.version === n.ver && b.seq === 4,
    `${b.gachaKey} / ${b.version} / seq=${b.seq}`)
  ok(`A4 ${n.name} 阁型 limited`, b.type === 'limited', b.type)
  const s = b.sets[0] || {}
  ok(`A5 ${n.name} 套装 ${n.setId} ${n.setName}`,
    b.sets.length === 1 && s.id === n.setId && s.name === n.setName && s.star === 4,
    `${s.id} / ${s.name} / ${s.star}★`)
  ok(`A6 ${n.name} 部件 ${n.parts} 件`, (s.parts || []).length === n.parts, String((s.parts || []).length))
  ok(`A7 ${n.name} 五维与部件文案已带上`,
    (s.parts || []).every((p) => p.stats && Object.keys(p.stats).length === 5 && p.desc),
    Object.keys((s.parts || [])[0]?.stats || {}).join('/'))
  const a = b.assets || {}
  ok(`A8 ${n.name} 背景 / 缩略图 / 艺术字都已生成`,
    onDisk(a.bgClean) && onDisk(a.thumb) && onDisk(a.title),
    [a.bgClean, a.thumb, a.title].map((x) => (onDisk(x) ? '✓' : '✗')).join(' '))
  ok(`A9 ${n.name} 深海回响 3 档`, (b.milestones || []).length === 3 && (b.milestones || []).every((m) => onDisk(m.img)),
    (b.milestones || []).map((m) => `${m.pulls}抽`).join(' / '))
  ok(`A10 ${n.name} 套装封面（OV-lv0..2）已生成`,
    ['OV-lv0', 'OV-lv1', 'OV-lv2'].every((k) => onDisk(`sets/${n.setId}/${k}.webp`)),
    'lv0/lv1/lv2')
}

console.log('\n════ D 图鉴与故事（静态） ════')
const stories = fs.readFileSync(path.join(ROOT, 'src/data/stories.ts'), 'utf8')
for (const n of NEW) {
  ok(`D1 ${n.setName} 进了故事数据`,
    stories.includes(n.setName) && stories.includes(n.setId), n.setId)
}
const setTotal = M.banners.reduce((a, b) => a + (b.sets || []).length, 0)
ok('D2 套装总数 134', setTotal === 134, String(setTotal))

/* ═════════════════ 浏览器 ═════════════════ */
const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
const errs = []

for (const n of NEW) {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
  await ctx.addInitScript((ver) => {
    localStorage.setItem('nikki-resonance-save-v1', JSON.stringify({
      version: 1, selectedVersion: ver, pity: {}, codex: {},
      milestoneClaimed: {}, history: [], settings: { skipAnim: true, skipOpening: true },
    }))
  }, n.ver)
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errs.push(`${n.name}: ${e.message}`))
  await page.goto(`${SIM}/#/banner`, { waitUntil: 'domcontentloaded', timeout: 90000 })
  await page.waitForSelector('.pool-item', { timeout: 60000 })
  await page.waitForTimeout(1500)

  console.log(`\n════ B/C ${n.name}（版本 ${n.ver}） ════`)
  const items = await page.evaluate(() => [...document.querySelectorAll('.pool-item')].map((el) => ({
    title: el.getAttribute('title') || '',
    text: el.textContent.replace(/\s+/g, ''),
    img: el.querySelector('img')?.getAttribute('src') || '',
    loaded: (() => { const i = el.querySelector('img'); return !i ? null : i.complete && i.naturalWidth > 0 })(),
  })))
  const hit = items.find((x) => x.title.startsWith(n.name))
  ok(`B1 ${n.name} 出现在 ${n.ver} 的阁列表`, !!hit,
    hit ? hit.text.slice(0, 20) : `本版本只有：${items.map((x) => x.title.split('（')[0]).join('/')}`)
  if (hit) ok(`B2 ${n.name} 列表缩略图已加载`, hit.img.includes(`banners/thumb/${n.gacha}.webp`) && hit.loaded !== false, hit.img)

  if (hit) {
    const idx = items.indexOf(hit)
    await page.locator('.pool-item').nth(idx).click()
    await page.waitForTimeout(1800)
    const st = await page.evaluate(() => {
      const bg = document.querySelector('.bg-still')
      return {
        bgSrc: bg?.getAttribute('src') || '',
        bgLoaded: bg ? bg.complete && bg.naturalWidth > 0 : false,
        rule: document.querySelector('.rule-text')?.textContent.trim() || '',
      }
    })
    ok(`C1 ${n.name} 背景图已加载`, st.bgSrc.includes(`banners/bg/${n.gacha}.webp`) && st.bgLoaded, st.bgSrc)
    ok(`C2 ${n.name} 走纯 4★ 规则（每 5 次必出）`, /每\s*5\s*次/.test(st.rule), st.rule)
  }
  await ctx.close()
}

console.log('\n════ E 报错 ════')
ok('E1 无 JS 报错', errs.length === 0, errs.slice(0, 2).join(' / '))

await browser.close()
console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
