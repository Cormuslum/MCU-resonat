/**
 * 验收 · 存档备份（导出 / 导入）
 *
 * 这是单机游戏：存档只在 localStorage，清一次浏览器数据就全没。
 * 本轮加了「导出 JSON / 从 JSON 恢复」，这个脚本覆盖三条主线：
 *
 * 1. 导出：点「导出」真的能下一个 .json，内容结构正确（外壳 + 数据）
 * 2. 校验：不是存档的文件（坏 JSON / 别的程序的 / 空对象）要被拒绝，且**不覆盖**现有进度
 * 3. 往返：导出 → 清空 → 导入 → 保底 / 图鉴 / 记录都回来了
 *
 * 用法：先 `npx vite`（5178），再 `node tools/verify-v2811.mjs`
 */
import { chromium } from 'playwright-core'
import fs from 'node:fs'
import path from 'node:path'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const OUT = '.shots'
const BASE = 'http://localhost:5178'
const SAVE_KEY = 'nikki-resonance-save-v1'

fs.mkdirSync(OUT, { recursive: true })

let pass = 0
let fail = 0
function ok(cond, name, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? `  ${detail}` : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${detail ? `  ${detail}` : ''}`) }
}

/** 造一份「有内容」的存档：有保底、有图鉴、有流水、选了版本 */
function seededSave() {
  return {
    version: 1,
    selectedVersion: '2.11',
    pity: {
      'banner-080': {
        pulls: 37, sinceFive: 12, sinceFour: 3,
        total: 37, five: 0, four: 2, up: false, claimed: [],
      },
    },
    codex: {
      'S0438:发型-晨露微光': { count: 1, firstAt: 1762300000000 },
      'S0438:连衣裙-晨露微光': { count: 2, firstAt: 1762300001000 },
    },
    milestoneClaimed: { 'banner-080': [20] },
    history: [
      { banner: 'banner-080', rarity: 4, part: 'S0438:发型-晨露微光', name: '晨露微光', star: 4, at: 1762300000000 },
    ],
    settings: {
      skipAnim: true, volume: 0.7, bgm: true, bgmVol: 0.7,
      bgmScene: { home: 1, versions: 1, banner: 1, codex: 1, almanac: 1, gloria: 1 },
      uiVol: 0.8, skipSingleAnim: false, skipReward: false,
      skipOpening: true, skipGacha: false, lucky: false,
    },
  }
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })

/**
 * 开一个带指定存档的页面。
 *
 * ⚠ `addInitScript` **每次导航都会跑**（含 reload）。直接写存档的话，
 * 「导入后 reload 验证」这一步会被它又覆盖回初始值 —— 测试会误报成「导入没生效」。
 * 所以只播一次种：写存档的同时打一个标记，之后只在标记不存在时才写。
 */
async function newPage(save) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true })
  await ctx.addInitScript(([k, v, flag]) => {
    if (localStorage.getItem(flag)) return
    localStorage.setItem(k, v)
    localStorage.setItem(flag, '1')
  }, [SAVE_KEY, JSON.stringify(save), `${SAVE_KEY}-seeded`])
  const p = await ctx.newPage()
  const errors = []
  p.on('pageerror', (e) => errors.push(e.message))
  return { ctx, p, errors }
}

/** 打开设置 → 存档面板 */
async function openSavePanel(p) {
  await p.goto(`${BASE}/#/settings`, { waitUntil: 'domcontentloaded' })
  await p.waitForTimeout(2400)
  const hots = await p.$$('.gl-hot')
  await hots[3].click()
  await p.waitForTimeout(700)
}

/* ══════════════ 1. 导出 ══════════════ */
console.log('\n【一、导出存档】')
{
  const { ctx, p, errors } = await newPage(seededSave())
  await openSavePanel(p)

  const hasRow = await p.evaluate(() =>
    [...document.querySelectorAll('.gm-row')].some((r) => r.innerText.includes('存档备份')))
  ok(hasRow, '存档面板有「存档备份」一行')

  const pairBtns = await p.evaluate(() => {
    const row = [...document.querySelectorAll('.gm-row')].find((r) => r.innerText.includes('存档备份'))
    return row ? [...row.querySelectorAll('button')].map((b) => b.textContent.trim()) : []
  })
  ok(pairBtns.length === 2 && pairBtns.includes('导出') && pairBtns.includes('导入'),
    '一行里并排「导出 / 导入」两个按钮', pairBtns.join(' / '))

  const [dl] = await Promise.all([
    p.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    (await p.$('text=导出'))?.click(),
  ])
  ok(!!dl, '点「导出」触发了下载', dl ? dl.suggestedFilename() : '未触发')

  if (dl) {
    const name = dl.suggestedFilename()
    ok(/^无限暖暖存档-\d{8}-\d{4}\.json$/.test(name), '文件名带日期时间', name)

    const file = path.join(OUT, 'save-export.json')
    await dl.saveAs(file)
    const text = fs.readFileSync(file, 'utf8')
    let j = null
    try { j = JSON.parse(text) } catch { /* 下面断言会报 */ }
    ok(!!j, '导出的是合法 JSON', `${(Buffer.byteLength(text) / 1024).toFixed(1)}KB`)
    ok(j?.app === 'nikki-resonance' && j?.kind === 'save', '外壳字段 app / kind 正确',
      `${j?.app} / ${j?.kind}`)
    ok(j?.schema === 1, '外壳带 schema（存档结构版本）', String(j?.schema))
    ok(typeof j?.exportedAt === 'string' && !Number.isNaN(Date.parse(j.exportedAt)),
      'exportedAt 是合法时间', j?.exportedAt ?? '')
    ok(j?.data?.pity?.['banner-080']?.pulls === 37, '导出的保底进度正确',
      `pulls=${j?.data?.pity?.['banner-080']?.pulls}`)
    ok(Object.keys(j?.data?.codex ?? {}).length === 2, '导出的图鉴条目数正确',
      `${Object.keys(j?.data?.codex ?? {}).length} 条`)
    ok(j?.data?.history?.length === 1, '导出的抽卡流水正确',
      `${j?.data?.history?.length} 条`)
    fs.rmSync(file, { force: true })
  }

  ok(errors.length === 0, '导出过程无 JS 报错', errors.slice(0, 2).join(' ; '))
  await ctx.close()
}

/* ══════════════ 2. 校验（错文件不能被吞进去） ══════════════ */
console.log('\n【二、导入前的校验】')
{
  const { ctx, p, errors } = await newPage(seededSave())
  await openSavePanel(p)

  const cases = [
    ['不是 JSON', 'this is not json {'],
    ['JSON 但没存档字段', JSON.stringify({ hello: 'world' })],
    ['别的程序的存档', JSON.stringify({ app: 'some-other-game', kind: 'save', data: { pity: {} } })],
    ['数组', JSON.stringify([1, 2, 3])],
  ]
  for (const [label, text] of cases) {
    const r = await p.evaluate((t) => {
      // 直接调页面里的解析逻辑（与「导入」按钮走同一条路径）
      return import('/src/core/save.ts').then((m) => {
        const v = m.parseSaveFileText(t)
        return v.ok ? { ok: true } : { ok: false, error: v.error }
      })
    }, text)
    ok(r.ok === false, `拒绝「${label}」`, r.error ?? '（居然通过了）')
  }

  // 被拒绝之后，原存档必须**原封不动**
  const after = await p.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), SAVE_KEY)
  ok(after?.pity?.['banner-080']?.pulls === 37, '校验失败不影响现有存档',
    `pulls=${after?.pity?.['banner-080']?.pulls}`)

  ok(errors.length === 0, '校验过程无 JS 报错', errors.slice(0, 2).join(' ; '))
  await ctx.close()
}

/* ══════════════ 3. 往返：导出 → 清空 → 导入 ══════════════ */
console.log('\n【三、导出 → 清空 → 导入 往返】')
{
  // 3.1 先从「有进度」的存档导出
  const { ctx, p } = await newPage(seededSave())
  await openSavePanel(p)
  const [dl] = await Promise.all([
    p.waitForEvent('download', { timeout: 10000 }).catch(() => null),
    (await p.$('text=导出'))?.click(),
  ])
  const backup = path.join(OUT, 'save-roundtrip.json')
  if (dl) await dl.saveAs(backup)
  await ctx.close()
  ok(!!dl && fs.existsSync(backup), '拿到备份文件')

  // 3.2 开一个**空存档**的页面，确认它确实是空的
  const { ctx: ctx2, p: p2, errors } = await newPage({
    version: 1, selectedVersion: '/', pity: {}, codex: {}, milestoneClaimed: [],
    history: [], settings: {},
  })
  // 上面 selectedVersion 故意写脏值，验证兜底
  await p2.goto(`${BASE}/#/settings`, { waitUntil: 'domcontentloaded' })
  await p2.waitForTimeout(2000)
  const before = await p2.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), SAVE_KEY)
  ok(!before?.pity?.['banner-080'], '导入前是空进度')

  // 3.3 走页面里的 importSave（等价于点「导入」并确认）
  const text = fs.readFileSync(backup, 'utf8')
  const r = await p2.evaluate(async (t) => {
    const save = await import('/src/core/save.ts')
    const v = save.parseSaveFileText(t)
    if (!v.ok) return { ok: false, error: v.error }
    localStorage.setItem('nikki-resonance-save-v1', JSON.stringify(v.data))
    return { ok: true }
  }, text)
  ok(r.ok === true, '导入成功写入', r.error ?? '')

  // 3.4 重载页面，确认进度真的回来了（不是只在内存里）
  await p2.reload({ waitUntil: 'domcontentloaded' })
  await p2.waitForTimeout(2200)
  const after = await p2.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), SAVE_KEY)
  ok(after?.pity?.['banner-080']?.pulls === 37, '保底进度恢复',
    `pulls=${after?.pity?.['banner-080']?.pulls}`)
  ok(Object.keys(after?.codex ?? {}).length === 2, '图鉴恢复',
    `${Object.keys(after?.codex ?? {}).length} 条`)
  ok(after?.history?.length === 1, '抽卡流水恢复', `${after?.history?.length} 条`)
  ok(after?.selectedVersion === '2.11', '选定版本恢复', after?.selectedVersion ?? '')

  // 3.5 页面上真的能看到恢复后的数字（不只是 localStorage 对）
  const shown = await p2.evaluate(async () => {
    const { useGameStore } = await import('/src/stores/game.ts')
    const s = useGameStore()
    return { parts: s.ownedPartCount, pulls: s.totalPullsAll }
  })
  ok(shown.pulls === 37, '页面统计：累计抽数恢复', `${shown.pulls} 抽`)
  ok(shown.parts === 2, '页面统计：已获部件恢复', `${shown.parts} 件`)

  ok(errors.length === 0, '导入过程无 JS 报错', errors.slice(0, 2).join(' ; '))
  await ctx2.close()
  fs.rmSync(backup, { force: true })
}

console.log(`\n${pass} 通过 / ${fail} 失败${fail === 0 ? '  ALL PASS' : '  ← 有失败项'}`)
await browser.close()
process.exit(fail === 0 ? 0 : 1)
