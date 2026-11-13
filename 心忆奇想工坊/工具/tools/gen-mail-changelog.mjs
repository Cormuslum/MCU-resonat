/**
 * 把 `CHANGELOG.md` 最近三次更新，抽成主页信封弹窗用的**运行时 JSON**。
 *
 * 为什么生成而不是运行时解析：
 *   CHANGELOG 已经 300KB+，整份塞进前端不现实；这里只取
 *   「版本号 / 日期 / 标题 / 最多 5 条要点」，产物 1~2KB。
 *
 * 为什么是 JSON 而不是 .ts（v2.2.03）：
 *   以前写 `src/data/mail-changelog.ts`，内容会被编译进 JS —— 改一段版本说明
 *   就得回项目 `npm run build`，发行版里（没有 vite）根本做不到。
 *   现在写成 `public/assets/data/mail-changelog.json`，模拟器运行时 fetch，
 *   **改这份 JSON 刷新页面就生效**，信封验收只动这一个文件。
 *
 * 用法：node tools/gen-mail-changelog.mjs
 * 已挂到 `prebuild`，`npm run build` 会自动重生成。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const SRC = path.join(ROOT, 'CHANGELOG.md')
const OUT = path.join(ROOT, '无限暖暖模拟器', 'public/assets/data/mail-changelog.json')

const md = fs.readFileSync(SRC, 'utf8')
const lines = md.split(/\r?\n/)

const HEAD = /^## \[v([\d.]+)\]\s*(\S+)\s*[—-]\s*(.+)$/
const logs = []
let cur = null
let buf = null // 正在累积的 bullet

function flush() {
  if (cur && buf) {
    const text = clean(buf).replace(/\s+/g, ' ').trim()
    if (text && !/^→/.test(text)) cur.lines.push(text)
  }
  buf = null
}

function clean(s) {
  return s
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*[-*]\s*/, '')
    .trim()
}

for (const raw of lines) {
  const m = HEAD.exec(raw.trim())
  if (m) {
    flush()
    cur = { version: 'v' + m[1], date: m[2], title: m[3].trim(), lines: [] }
    logs.push(cur)
    continue
  }
  if (!cur || logs.indexOf(cur) > 2) continue // 只留最近三次
  if (/^##\s/.test(raw) && !HEAD.test(raw.trim())) { flush(); continue }

  const bullet = /^\s*[-*]\s+(.*)$/.exec(raw)
  if (bullet) {
    flush()
    buf = bullet[1]
    continue
  }
  // 缩进续行（同一段落换行）
  if (buf && /^\s{2,}\S/.test(raw) && !/^#{3,}\s/.test(raw.trim())) {
    buf += raw.trim()
    continue
  }
  if (/^\s*$/.test(raw) || /^#{3,}\s/.test(raw.trim()) || /^---/.test(raw.trim())) flush()
  else if (buf && /^\s*\S/.test(raw) && !/^>/.test(raw.trim())) buf += raw.trim()
}
flush()

const top = logs.slice(0, 3).map((l) => ({
  version: l.version,
  date: l.date,
  title: l.title,
  lines: l.lines.filter((x) => x).slice(0, 5).map((x) => clip(x)),
}))

/** 长句按标点断，别把引号 / 括号截半个（`（bu…` 那种读起来像乱码） */
function clip(text, max = 70) {
  if (text.length <= max) return text
  const head = text.slice(0, max)
  const cut = Math.max(
    head.lastIndexOf('，'),
    head.lastIndexOf('。'),
    head.lastIndexOf('；'),
    head.lastIndexOf('、'),
  )
  return (cut > max * 0.55 ? head.slice(0, cut) : head.slice(0, max - 1)) + '…'
}

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, JSON.stringify(top, null, 2) + '\n', 'utf8')
console.log(`[mail] ${top.map((t) => t.version).join(' / ')} → ${path.relative(ROOT, OUT)}`)
