/**
 * v2.0.00 验收：固定文案抽成 `文案.json`
 *
 * 覆盖：
 *   A  文案.json 结构（键齐、正文条数够）
 *   B  工坊顶栏（5199）：标题 / 副标题 / 5 个按钮的 title+alt / 页面 title
 *   C  工坊帮助弹窗：条数可增删、`**粗体**` 渲染成 <b>、按钮文字
 *   D  模拟器信封（5178）：欢迎语气 kicker（小字）/ 标题 / 4 段正文 / 落款
 *   E  两处都无 JS 报错
 *
 * 只校验「页面上的字 == 文案.json 里的字」，不校验措辞本身 —— 措辞要改就改 json。
 *
 * 依赖：`npm run up`（5178 + 5199 都在跑）。
 * 跑法：node tools/verify-v2918.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright-core'

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const SIM = 'http://127.0.0.1:5178'
const UPD = 'http://127.0.0.1:5199'
const ROOT = process.cwd()

let pass = 0
let fail = 0
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`) }
  else { fail++; console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`) }
}

const COPY = JSON.parse(fs.readFileSync(path.join(ROOT, '文案.json'), 'utf8'))
const mail = COPY.mail
const up = COPY.updater
const norm = (s) => String(s ?? '').replace(/\s+/g, '')

console.log('════ A 文案.json 结构 ════')
ok('A1 mail 五段齐全', ['hint', 'kicker', 'title', 'sign'].every((k) => typeof mail[k] === 'string' && mail[k]),
  Object.keys(mail).join(','))
ok('A2 欢迎正文 ≥ 3 段', Array.isArray(mail.body) && mail.body.length >= 3, `${mail.body.length} 段`)
ok('A3 顶栏标题 / 副标题', !!up.topbar.title && !!up.topbar.subtitle, up.topbar.title)
ok('A4 五个按钮文案齐全', ['upload', 'download', 'help', 'reload', 'close']
  .every((k) => up.topbar.actions[k]?.title && up.topbar.actions[k]?.alt), Object.keys(up.topbar.actions).join(','))
ok('A5 帮助标题 / 步骤 / 注释 / 确定键',
  !!up.help.title && up.help.steps.length >= 3 && up.help.notes.length >= 1 && !!up.help.ok,
  `${up.help.steps.length} 步 / ${up.help.notes.length} 段`)

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
const errsU = []
const errsS = []
/** 工坊没有 favicon.ico，Chrome 自动请求会留一条 404 —— 与本次改动无关，滤掉 */
const noise = (t) => /favicon\.ico/.test(t)

/* ═════════════════ B / C 工坊 ═════════════════ */
console.log('\n════ B 工坊顶栏 ════')
const pageU = await browser.newPage({ viewport: { width: 1600, height: 950 } })
pageU.on('pageerror', (e) => errsU.push(e.message))
pageU.on('console', (m) => {
  if (m.type() !== 'error') return
  // 404 这类消息正文不带 URL，得看 location()
  const where = m.location()?.url || ''
  if (noise(where) || noise(m.text())) return
  errsU.push(`${m.text().slice(0, 100)} @${where}`.slice(0, 160))
})
await pageU.goto(UPD, { waitUntil: 'domcontentloaded', timeout: 60000 })
await pageU.waitForTimeout(1500)

const bar = await pageU.evaluate(() => ({
  title: document.title,
  h1: document.querySelector('.brand h1')?.textContent.trim(),
  sub: document.querySelector('.brand p')?.textContent.trim(),
  btns: [...document.querySelectorAll('.top-actions .round')].map((b) => ({
    id: b.id,
    title: b.getAttribute('title') || '',
    alt: b.querySelector('img')?.getAttribute('alt') || '',
  })),
}))
ok('B1 页面 title 跟随 json', bar.title === up.pageTitle, bar.title)
ok('B2 品牌名', norm(bar.h1) === norm(up.topbar.title), bar.h1)
ok('B3 副标题', norm(bar.sub) === norm(up.topbar.subtitle), bar.sub)
const wantBtns = [
  ['btn-upload', 'upload'], ['btn-download', 'download'], ['btn-help', 'help'],
  ['btn-reload', 'reload'], ['btn-close', 'close'],
]
const btnBad = wantBtns.filter(([id, key]) => {
  const got = bar.btns.find((b) => b.id === id)
  const exp = up.topbar.actions[key]
  return !got || norm(got.title) !== norm(exp.title) || norm(got.alt) !== norm(exp.alt)
})
ok('B4 五个按钮的 title / alt', btnBad.length === 0, btnBad.map((x) => x[0]).join(',') || '全部一致')

console.log('\n════ C 帮助弹窗 ════')
await pageU.click('#btn-help')
await pageU.waitForTimeout(400)
const help = await pageU.evaluate(() => {
  const card = document.querySelector('#modal-help .modal-card')
  return {
    open: document.querySelector('#modal-help')?.classList.contains('on'),
    title: card?.querySelector('h3')?.textContent.trim(),
    steps: [...document.querySelectorAll('#help-steps li')].map((li) => ({
      text: li.textContent.replace(/\s+/g, ''),
      bold: li.querySelector('b')?.textContent.trim() || '',
    })),
    notes: [...document.querySelectorAll('#help-notes p')].map((p) => p.textContent.replace(/\s+/g, '')),
    okBtn: document.querySelector('#btn-help-ok')?.textContent.trim(),
    okCls: document.querySelector('#btn-help-ok')?.className,
  }
})
ok('C1 弹窗打开且标题跟随 json', help.open && norm(help.title) === norm(up.help.title), help.title)
ok('C2 步骤条数跟随 json', help.steps.length === up.help.steps.length,
  `${help.steps.length} / ${up.help.steps.length}`)
ok('C3 步骤正文逐条一致',
  help.steps.every((s, i) => s.text === norm(up.help.steps[i]).replace(/\*\*/g, '')),
  help.steps.map((s) => s.text.slice(0, 8)).join(' | '))
ok('C4 `**粗体**` 渲染成 <b>', help.steps.every((s) => s.bold.length > 0),
  help.steps.map((s) => s.bold).join(' / ').slice(0, 60))
ok('C5 注释段数跟随 json', help.notes.length === up.help.notes.length, `${help.notes.length} 段`)
ok('C6 按钮文字', norm(help.okBtn) === norm(up.help.ok) && /primary/.test(help.okCls), help.okBtn)
await pageU.keyboard.press('Escape')
await pageU.waitForTimeout(200)
ok('C7 ESC 能关掉', await pageU.evaluate(() => !document.querySelector('#modal-help').classList.contains('on')))

/* ═════════════════ D 模拟器信封 ═════════════════ */
console.log('\n════ D 模拟器信封 ════')
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
await ctx.addInitScript(() => {
  localStorage.setItem('nikki-resonance-save-v1', JSON.stringify({
    version: 1, selectedVersion: '2.10', pity: {}, codex: {},
    milestoneClaimed: {}, history: [], settings: { skipAnim: true, skipOpening: true },
  }))
})
const pageS = await ctx.newPage()
pageS.on('pageerror', (e) => errsS.push(e.message))
await pageS.goto(`${SIM}/#/`, { waitUntil: 'domcontentloaded', timeout: 90000 })
await pageS.waitForSelector('.hm-mail', { timeout: 60000 })
await pageS.click('.hm-mail')
await pageS.waitForTimeout(700)

const hint = await pageS.evaluate(() => document.querySelector('.env-hint')?.textContent.trim())
ok('D1 信封提示语', norm(hint) === norm(mail.hint), hint)

// 信封有左右轻晃的 CSS 动画，Playwright 的「等元素稳定」永远等不到 → force
await pageS.click('.env-wrap', { force: true })
await pageS.waitForTimeout(1100)
const letter = await pageS.evaluate(() => {
  const ps = [...document.querySelectorAll('.lt-body .lt-p')]
  const probe = (p) => {
    const cs = getComputedStyle(p)
    return { text: p.textContent.trim(), cls: p.className, size: parseFloat(cs.fontSize), align: cs.textAlign, color: cs.color }
  }
  const signEl = document.querySelector('.lt-sign')
  return {
    kicker: document.querySelector('.lt-kicker')?.textContent.trim(),
    title: document.querySelector('.lt-title')?.textContent.trim(),
    body: ps.map(probe),
    sign: signEl?.textContent.trim(),
    signAlign: signEl ? getComputedStyle(signEl).textAlign : '',
  }
})
/** json 里一段可能是纯字符串，也可能是 { text, style } */
const textOf = (b) => (typeof b === 'string' ? b : b.text)

ok('D2 Kicker', norm(letter.kicker) === norm(mail.kicker), letter.kicker)
ok('D3 标题', norm(letter.title) === norm(mail.title), letter.title)
ok('D4 正文条数跟随 json', letter.body.length === mail.body.length, `${letter.body.length} 段`)
ok('D5 正文逐段一致',
  letter.body.every((b, i) => norm(b.text) === norm(textOf(mail.body[i]))), letter.body[0]?.text.slice(0, 12))
ok('D6 落款', norm(letter.sign) === norm(mail.sign), letter.sign)
ok('D7 落款右对齐', letter.signAlign === 'right', letter.signAlign)

/* 段落样式：h2 = 居中 + 字号两倍；warn = 居中 + 红色（来自 文案.json 的 style） */
const plain = letter.body.find((b) => !/h2|warn/.test(b.cls))
const h2s = letter.body.filter((b) => /\bh2\b/.test(b.cls))
const warns = letter.body.filter((b) => /\bwarn\b/.test(b.cls))
const wantH2 = mail.body.filter((b) => typeof b !== 'string' && b.style === 'h2').map(textOf)
const wantWarn = mail.body.filter((b) => typeof b !== 'string' && b.style === 'warn').map(textOf)
ok('D8 小标题条数 / 文字跟随 json',
  h2s.length === wantH2.length && h2s.every((b, i) => norm(b.text) === norm(wantH2[i])),
  h2s.map((b) => b.text).join(' / '))
ok('D9 小标题居中', h2s.every((b) => b.align === 'center'), h2s[0]?.align)
ok('D10 小标题字号是正文两倍',
  !!plain && h2s.every((b) => Math.abs(b.size / plain.size - 2) <= 0.06),
  plain ? `${h2s[0]?.size}px / ${plain.size}px` : '没有正文可比')
ok('D11 警示句居中且红色',
  warns.length === wantWarn.length && warns.every((b) => b.align === 'center' && /rgb\(176,\s*57,\s*47\)/.test(b.color)),
  warns[0] ? `${warns[0].align} ${warns[0].color}` : '没有警示句')

console.log('\n════ E 报错 ════')
ok('E1 工坊无 JS 报错', errsU.length === 0, errsU.slice(0, 2).join(' / '))
ok('E2 模拟器无 JS 报错', errsS.length === 0, errsS.slice(0, 2).join(' / '))

await browser.close()
console.log(`\n结果：${pass} 通过 / ${fail} 失败`)
process.exit(fail ? 1 : 0)
