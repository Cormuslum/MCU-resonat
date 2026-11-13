/** 元数据读写：版本表 / 服装阁索引 / 套装序列 / 属性 yaml / 故事 / 阅读物 */
import fs from 'node:fs'
import path from 'node:path'
import {
  ASSET, PUBLIC, exists, readText, writeText, readJson, writeJson, rel,
  parseCsv, toCsv, sortVersions, verKey, safeName,
} from './util.mjs'
import { archive } from './archive.mjs'

const INFO = path.join(ASSET, '信息表')

/* ────────────────────────────── 版本表 ────────────────────────────── */

// 列顺序即写入顺序
const VER_HEAD = ['版本', '版本名', '大版本', '大版本名', '介绍', '版本卡编号']
const VER_FILE = path.join(INFO, '版本表.csv')

export function readVersionTable() {
  const txt = readText(VER_FILE)
  if (!txt) return []
  return sortVersions(parseCsv(txt).map((r) => ({
    v: r['版本'] || '',
    name: r['版本名'] || '',
    major: r['大版本'] || (r['版本'] || '').split('.')[0],
    majorName: r['大版本名'] || '',
    desc: r['介绍'] || '',
    cardNo: r['版本卡编号'] || '',
  })).filter((x) => x.v))
}

/** 版本表整表写入前的唯一性检查。版本号是**字符串键**：`1.10` 与 `1.1` 是两个不同版本，撞键即抛错 */
function assertUniqueVersionRows(list, where = '写入前') {
  const seen = new Map()
  for (const x of list) {
    const v = String(x.v ?? '').trim()
    if (!v || !/^\d+(?:\.\d+)?$/.test(v)) {
      throw new Error(`版本表${where}：有一行版本号为空或格式不对（收到「${v}」，应形如 1.10 / 2.11）`)
    }
    if (seen.has(v)) {
      throw new Error(
        `版本表${where}：版本 ${v} 出现两次（「${seen.get(v)}」与「${x.name || ''}」）。`
        + ' 版本号是文本键，`1.10` 不能写成 `1.1`；常见原因是用 Excel 打开 CSV 保存时被数值化。'
        + ' 请先把重复行改回正确的版本号再写入。',
      )
    }
    seen.set(v, x.name || '')
  }
}

function writeVersionTable(list) {
  assertUniqueVersionRows(list)
  const rows = sortVersions(list).map((x) => ({
    版本: x.v, 版本名: x.name, 大版本: x.major, 大版本名: x.majorName,
    介绍: x.desc, 版本卡编号: x.cardNo,
  }))
  writeText(VER_FILE, toCsv(VER_HEAD, rows))
}

/** 新增或更新一个版本行（存在则只覆盖传入的字段） */
export function upsertVersion(patch) {
  // 版本号必须一路以文本传递
  if (patch.v != null && typeof patch.v !== 'string') {
    throw new Error(`版本号必须以文本传入（收到 ${typeof patch.v}：${String(patch.v)}）—— `
      + '数字 1.10 会变成 1.1 并覆盖已有版本，请检查上游是否把版本号做了数值转换')
  }
  const v = String(patch.v ?? '').trim()
  if (!/^\d+(?:\.\d+)?$/.test(v)) {
    throw new Error(`版本号格式不对：「${v || '(空)'}」，应形如 1.10 / 2.11（文本）`)
  }
  const list = readVersionTable()
  assertUniqueVersionRows(list, '读取时')
  const i = list.findIndex((x) => x.v === v)
  // 大版本号以**版本号首位**为准：`0.2` 必然属于大版本 `0`
  const inferred = v.split('.')[0]
  const fixed = { ...patch, v, major: inferred || patch.major }
  if (i >= 0) list[i] = { ...list[i], ...fixed }
  else {
    const major = fixed.major || inferred
    list.push({
      v, name: patch.name || '', major, majorName: patch.majorName || '',
      desc: patch.desc || '', cardNo: patch.cardNo || '',
    })
  }
  writeVersionTable(list)
  return list
}

/** 新增 / 改名一个大版本；大版本名在版本表里是冗余列，改名要遍历所有同 major 的行一起写 */
export function upsertMajor(major, majorName) {
  const m = String(major || '').trim()
  if (!m) return readVersionTable()
  const name = String(majorName || '').trim()
  const list = readVersionTable()
  let hit = 0
  for (const x of list) {
    if (x.major === m && name) { x.majorName = name; hit += 1 }
  }
  writeVersionTable(list)
  return { list, hit }
}

/** 已有的大版本（去重，供下拉用） */
export function listMajors() {
  const seen = new Map()
  for (const x of readVersionTable()) {
    if (!x.major) continue
    if (!seen.has(x.major)) seen.set(x.major, x.majorName || '')
  }
  return [...seen.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([major, name]) => ({ major, name }))
}

/* ────────────────────────────── 服装阁索引 ────────────────────────────── */

/** `素材/信息表/服装阁索引.json` */
const POOL_INDEX = path.join(INFO, '服装阁索引.json')

export function readPoolIndex() {
  return readJson(POOL_INDEX, {}) || {}
}

function writePoolIndex(obj) {
  writeJson(POOL_INDEX, obj)
}

/** 服装阁编号规范化：001~999 官方 / 1000~9999 自定义，两段并存且允许不连续；`7` → `007`，空 / 0 / 5 位以上 → 空串 */
export function normalizeGacha(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  const n = Number(digits)
  if (!n || n > 9999) return ''
  return n < 1000 ? String(n).padStart(3, '0') : String(n)
}

/** 已被占用的编号集合（服装阁索引 + pool-map 都算，后者含旧数据） */
function usedGachaSet() {
  const set = new Set()
  for (const v of Object.values(readPoolIndex())) {
    const g = normalizeGacha(v?.gachaKey)
    if (g) set.add(g)
  }
  const pm = readJson(path.join(ASSET, 'pool-map.json'), { banners: [] }) || { banners: [] }
  for (const b of pm.banners || []) {
    const g = normalizeGacha(b.gachaKey)
    if (g) set.add(g)
  }
  return set
}

/** 下一个可用编号：从 500 起找空号 */
export function nextFreeGacha() {
  const used = usedGachaSet()
  for (let i = 500; i <= 999; i++) {
    const g = String(i)
    if (!used.has(g)) return g
  }
  for (let i = 1000; i <= 9999; i++) {
    const g = String(i)
    if (!used.has(g)) return g
  }
  throw new Error('服装阁编号已用尽（500~9999 全占）')
}

export function upsertPool(name, cfg) {
  const idx = readPoolIndex()
  const prev = idx[name] || {}
  const next = { ...prev, ...cfg }
  delete next.seq
  idx[name] = next
  writePoolIndex(idx)
  return idx[name]
}

/* ────────────────────────────── 套装序列 ────────────────────────────── */

const SET_HEAD = ['序号', '套装ID', '星级', '套装名', '进化等阶', '来源/阁名', '首发', '复刻']
const SET_FILE = path.join(INFO, '套装序列.csv')

export function readSetSeq() {
  const txt = readText(SET_FILE)
  return txt ? parseCsv(txt) : []
}

/** 追加 / 更新套装（同名「初始」等阶已存在则更新）：同阁视为修正登记信息，异阁按复刻把这次版本记到 `复刻` 列 */
export function upsertSet({ id, star, name, pool, versionLabel }) {
  const rows = readSetSeq()
  const i = rows.findIndex((r) => r['套装名'] === name && (r['进化等阶'] || '初始') === '初始')
  if (i >= 0) {
    const row = rows[i]
    const origin = String(row['来源/阁名'] || '').trim()
    const sameOrigin = !origin || !pool || origin === String(pool).trim()
    const next = {
      ...row,
      套装ID: id || row['套装ID'],
      星级: star || row['星级'],
    }
    if (sameOrigin) {
      next['来源/阁名'] = pool || origin
      if (versionLabel) next['首发'] = versionLabel
    } else if (versionLabel && versionLabel !== row['首发']) {
      next['复刻'] = row['复刻'] || versionLabel
    }
    rows[i] = next
  } else {
    const maxSeq = Math.max(0, ...rows.map((r) => Number(r['序号']) || 0))
    rows.push({
      序号: String(maxSeq + 1), 套装ID: id, 星级: star, 套装名: name,
      进化等阶: '初始', '来源/阁名': pool || '', 首发: versionLabel || '', 复刻: '',
    })
  }
  writeText(SET_FILE, toCsv(SET_HEAD, rows))
  return rows
}

/* ────────────────────────────── 自建内容 ────────────────────────────── */

/** `素材/信息表/自建内容.json`。新建时自动登记；历史内容手动加一行：`{"pools":["某某阁"],"sets":["某某套装"]}` */
const CUSTOM_FILE = path.join(INFO, '自建内容.json')
// `readings`：阅读物没有归属阁可反推「是不是自建」
const CUSTOM_KINDS = ['pools', 'sets', 'readings']

export function readCustom() {
  const j = readJson(CUSTOM_FILE, null) || {}
  const out = {}
  for (const k of CUSTOM_KINDS) {
    const arr = Array.isArray(j[k]) ? j[k] : []
    out[k] = [...new Set(arr.map((x) => String(x).trim()).filter(Boolean))]
  }
  return out
}

function writeCustom(obj) {
  const clean = {}
  for (const k of CUSTOM_KINDS) {
    const arr = Array.isArray(obj?.[k]) ? obj[k] : []
    clean[k] = [...new Set(arr.map((x) => String(x).trim()).filter(Boolean))]
  }
  writeJson(CUSTOM_FILE, clean)
  return clean
}

/** 登记为自建（幂等）。kind: `pools` / `sets` */
export function markCustom(kind, name) {
  if (!CUSTOM_KINDS.includes(kind)) throw new Error('未知的自建类型：' + kind)
  const n = String(name || '').trim()
  if (!n) return readCustom()
  const cur = readCustom()
  if (!cur[kind].includes(n)) {
    cur[kind].push(n)
    writeCustom(cur)
  }
  return readCustom()
}

export function unmarkCustom(kind, name) {
  if (!CUSTOM_KINDS.includes(kind)) throw new Error('未知的自建类型：' + kind)
  const cur = readCustom()
  cur[kind] = cur[kind].filter((x) => x !== String(name || '').trim())
  writeCustom(cur)
  return readCustom()
}

export function isCustom(kind, name) {
  return readCustom()[kind]?.includes(String(name || '').trim()) ?? false
}

export function renameCustom(kind, from, to) {
  const cur = readCustom()
  const i = cur[kind].indexOf(String(from || '').trim())
  if (i >= 0) {
    cur[kind][i] = String(to || '').trim()
    writeCustom(cur)
  }
  return readCustom()
}

/** 服装阁索引里换一个键名（阁改名时用） */
export function renamePoolIndex(from, to) {
  const idx = readPoolIndex()
  if (!idx[from] || from === to) return idx
  const next = {}
  for (const [k, v] of Object.entries(idx)) next[k === from ? to : k] = v
  writePoolIndex(next)
  return next
}

export function renameSetSeqPool(from, to) {
  const rows = readSetSeq()
  let hit = 0
  for (const r of rows) {
    if (String(r['来源/阁名'] || '').trim() === String(from).trim()) {
      r['来源/阁名'] = to
      hit += 1
    }
  }
  if (hit) writeText(SET_FILE, toCsv(SET_HEAD, rows))
  return hit
}

/** 套装改名：初始行与它的进化子行（`名·焕新`）一起改 */
export function renameSetSeqName(from, to) {
  const rows = readSetSeq()
  let hit = 0
  for (const r of rows) {
    const n = String(r['套装名'] || '')
    if (n === from) { r['套装名'] = to; hit += 1 }
    else if (n.startsWith(from + '·')) { r['套装名'] = to + n.slice(from.length); hit += 1 }
  }
  if (hit) writeText(SET_FILE, toCsv(SET_HEAD, rows))
  return hit
}

/** 把一套服装改挂到另一座阁（「修改套装 → 换所属阁」用）。直接改来源那一行，不走 `upsertSet`（后者按「来源不同」判成**复刻**） */
export function moveSetToPool(name, pool, versionLabel) {
  const rows = readSetSeq()
  const i = rows.findIndex((r) => r['套装名'] === name && (r['进化等阶'] || '初始') === '初始')
  if (i < 0) return 0
  rows[i]['来源/阁名'] = pool
  if (versionLabel) rows[i]['首发'] = versionLabel
  writeText(SET_FILE, toCsv(SET_HEAD, rows))
  return 1
}

/** 从套装序列里整段删掉一套（含进化子行），返回删掉的行数 */
export function removeSetRows(name) {
  const rows = readSetSeq()
  const keep = rows.filter((r) => {
    const n = String(r['套装名'] || '')
    return !(n === name || n.startsWith(name + '·'))
  })
  const removed = rows.length - keep.length
  if (removed) writeText(SET_FILE, toCsv(SET_HEAD, keep))
  return removed
}

/* ────────────────────────────── 目录解析 ────────────────────────────── */

/** 图鉴里的部位顺序（与 套装部件.csv 表头一致，前端按这个顺序排） */
export const SLOTS = [
  '发型', '连衣裙', '上衣', '下装', '外套', '袜子', '鞋子',
  '饰品·发饰', '饰品·帽子', '饰品·耳饰', '饰品·颈饰', '饰品·项圈', '饰品·胸饰',
  '饰品·背饰', '饰品·腕饰', '饰品·臂饰', '饰品·手套', '饰品·手持物',
  '饰品·面饰', '饰品·挂饰', '饰品·肤绘', '饰品·戒指',
]

/* ────────────────────────────── 目录解析 ────────────────────────────── */

/** 版本目录：`素材/服装阁/<版本号><版本名>/`，三种写法都要认（`1.0·探索季（公测）` / `0.1·祈愿星` / `2.11时光缝合的扉页`）； 判据是「版本号之后不能紧跟数字」 */
function versionPoolDir(version, versionName, { create = false } = {}) {
  const root = path.join(ASSET, '服装阁')
  const want = String(version)
  if (exists(root)) {
    const names = fs.readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
    const exact = names.find((n) => n === want)
    const dotted = names.find((n) => n.startsWith(want + '·'))
    const plain = names.find((n) => n.startsWith(want) && !/^\d/.test(n.slice(want.length)))
    const hit = exact || dotted || plain
    if (hit) return path.join(root, hit)
  }
  const made = path.join(root, `${want}${versionName ? '·' + safeName(versionName) : ''}`)
  if (create) fs.mkdirSync(made, { recursive: true })
  return made
}

/** 某座阁的目录：`<版本目录>/<阁名>`。常驻池的目录名带 `常驻·` 前缀（`常驻·遥远之海`），build-pool-map 靠这个前缀判 standard */
export function poolDirOf(version, versionName, poolName, { create = false, standard = false } = {}) {
  const root = versionPoolDir(version, versionName, { create })
  const plain = String(poolName || '').replace(/^常驻·/, '')
  const dir = path.join(root, standard ? `常驻·${plain}` : plain)
  if (create) fs.mkdirSync(dir, { recursive: true })
  return dir
}

/** 兼容层：老代码按 `resolveVerDirs(...).{sourceDir,picDir,textDir}` 取目录 */
function resolveVerDirs(version, versionName, { createSource = false } = {}) {
  const dir = versionPoolDir(version, versionName, { create: createSource })
  return { poolDir: dir, sourceDir: dir, picDir: dir, textDir: dir }
}

/** 套装素材落盘 */
const EVOLVE_STAGES = ['焕新', '一进', '二进', '满进']

/** 从一个文件名判断它属于哪个进化阶段 */
function ovStageOf(filename) {
  const base = path.basename(String(filename || ''), path.extname(String(filename || '')))
  const m = /^整体[-_]?\s*(初始|焕新|一进|二进|满进)/.exec(base)
  if (m) return m[1]
  const lv = /(?:觉醒|进化)\s*LV\s*(\d+)/i.exec(base)
  if (lv) return EVOLVE_STAGES[Math.min(Number(lv[1]), 4) - 1] || '满进'
  // 没有阶段信息的，一律当初始
  return '初始'
}

/** 写一套的图片素材。`busts` / `icons` / `ovs` 都是 `{src, name}` */
export function writeSetImages({ snap, setDir, busts = [], icons = [], ovs = [], notes = [] }) {
  const stem = (f) => path.basename(String(f.name || f.src), path.extname(String(f.name || f.src)))

  let bustCount = 0
  for (const b of busts) {
    const dst = path.join(setDir, '半身像', `${safeName(stem(b))}.png`)
    snap.touch(dst)
    archive(snap, [{ src: b.src, target: dst }])
    bustCount++
  }
  for (const ic of icons) {
    const dst = path.join(setDir, '图标', `${safeName(stem(ic))}.png`)
    snap.touch(dst)
    archive(snap, [{ src: ic.src, target: dst }])
  }

  // 同一阶段可能给了好几张 → 只留第一张
  const stages = new Map()
  for (const o of ovs) {
    const st = ovStageOf(o.name || o.src)
    if (!stages.has(st)) stages.set(st, o)
  }
  for (const [stage, o] of stages) {
    const dst = path.join(setDir, '进化等阶', `整体-${stage}.png`)
    snap.touch(dst)
    archive(snap, [{ src: o.src, target: dst }])
  }

  if (bustCount) notes.push(`半身像 ${bustCount} 张`)
  if (stages.size) notes.push(`整体图 ${[...stages.keys()].join('/')}`)
  return { stageCount: stages.size, bustCount, iconCount: icons.length }
}

/* ────────────────────────────── 新套装库 ────────────────────────────── */

/** 新套装库根目录 */
export const SUIT_LIB = path.join(ASSET, '套装库')

/** 单行标量转义（与 tools/setyaml.py 的 _esc 保持一致） */
function yamlScalar(v) {
  const s = String(v ?? '')
  if (s === '') return '""'
  if (/[:#"'\[\]{}\n]/.test(s) || s.trim() !== s) {
    return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"'
  }
  return s
}

/** 写新格式的套装 YAML 到套装库 */
export function writeSuitLibYaml({
  setName, star, setId = '', origin = '', firstVersion = '',
  desc = '', styles = [], parts = [],
}) {
  fs.mkdirSync(SUIT_LIB, { recursive: true })

  const lines = []
  const put = (k, v) => { if (v !== '' && v !== null && v !== undefined) lines.push(`${k}: ${yamlScalar(v)}`) }
  put('套装名', setName)
  put('套装ID', setId)
  put('星级', star)
  put('来源阁', origin)
  put('首发版本', firstVersion)
  put('整体文案', desc)
  if (styles.length) lines.push(`属性标签: [${styles.map(yamlScalar).join(', ')}]`)
  if (parts.length) {
    lines.push('部件:')
    for (const p of parts) {
      lines.push(`  - 名称: ${yamlScalar(p.name ?? '')}`)
      if (p.slot) lines.push(`    类型: ${yamlScalar(p.slot)}`)
      if (p.id) lines.push(`    id: ${yamlScalar(p.id)}`)
      const stats = p.stats ?? {}
      if (Object.keys(stats).length) {
        lines.push('    五维倾向:')
        for (const [k, v] of Object.entries(stats)) lines.push(`      ${k}: ${v}`)
      }
      if (p.desc) lines.push(`    文案: ${yamlScalar(p.desc)}`)
      lines.push('')
    }
  }
  // 文件名是**纯编号**；无 ID 时用套装名兜底
  const fname = setId ? `${setId}.yaml` : `__${setName}.yaml`
  const file = path.join(SUIT_LIB, fname)
  writeText(file, lines.join('\n').replace(/\n+$/, '\n'))
  return { file, folder: fname }
}

/* ────────────────────────────── 故事 ────────────────────────────── */

export function writeStory({ name, star, body }) {
  const file = path.join(ASSET, '故事', `故事-${star}星-${safeName(name)}.md`)
  const clean = String(body || '').replace(/\r\n/g, '\n').trim()
  // 已经有 `# 标题` 就不重复加
  const text = /^#\s/.test(clean) ? clean + '\n' : `# ${name}\n\n---\n\n${clean}\n`
  writeText(file, text)
  return file
}

/* ────────────────────────────── 故事 · 成品直写（发行版） ────────────────────────────── */

/** 成品故事的落点：发行版（`NIKKI_DIST_MODE=1`）直接改 `stories.json`，开发版走 md → `gen-stories.py` */
const storyJsonFile = () => path.join(PUBLIC, 'assets', 'data', 'stories.json')

/** 从成品 stories.json 里取一篇（按套装名，兼容按标题） */
export function readStoryOf(name) {
  const list = readJson(storyJsonFile(), null)
  if (!Array.isArray(list)) return null
  const want = String(name || '').trim()
  if (!want) return null
  return list.find((s) => s.setName === want) || list.find((s) => s.title === want) || null
}

/** 把正文直接写进成品 `stories.json`（新增或覆盖），不产生中间 md：紧凑 JSON，与 `gen-stories.py` 的 `separators=(",", ":")` 一致； `setId` / `major` 从 pool-map 反查 */
export function upsertStoryJson({ name, star, body }) {
  const file = storyJsonFile()
  const list = readJson(file, null)
  if (!Array.isArray(list)) throw new Error('成品 stories.json 不存在或已损坏 —— 先跑一次数据管线')

  const clean = String(body || '').replace(/\r\n/g, '\n').trim()
  const setName = String(name || '').trim()
  const nStar = Number(String(star || '').replace(/\D/g, '')) || 5
  const hit = list.find((s) => s.setName === setName)

  if (hit) {
    hit.text = clean
    hit.title = setName
    hit.star = nStar
  } else {
    const pm = readJson(path.join(ASSET, 'pool-map.json'), { banners: [] }) || { banners: [] }
    let setId = ''
    let major = 0
    for (const b of pm.banners || []) {
      const s = (b.sets || []).find((x) => x.name === setName)
      if (!s) continue
      setId = s.id || ''
      major = Number(String(b.version || '').split('.')[0]) || 0
      break
    }
    list.push({ id: setName, setId, setName, star: nStar, major, title: setName, text: clean })
  }

  fs.writeFileSync(file, JSON.stringify(list), 'utf8')
  return { file, created: !hit }
}

/* ────────────────────────────── 阅读物 ────────────────────────────── */

const REGION_DIR = { wish: '心愿原野', yizan: '伊赞之土' }

/** 现有阅读物里最大的编号，用来自增 */
function nextReadingId(regionPrefix) {
  const root = path.join(ASSET, '阅读物')
  let max = 0
  const consider = (rid) => {
    const tail = String(rid || '').replace(/\D/g, '').slice(-3)
    max = Math.max(max, Number(tail) || 0)
  }
  // ① 源目录里已有的编号
  const walk = (d) => {
    if (!exists(d)) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) { walk(p); continue }
      if (!e.name.endsWith('.txt')) continue
      const m = readText(p).match(/【编号】\s*(\S+)/)
      if (!m) continue
      consider(m[1])
    }
  }
  walk(root)
  // ② 成品 JSON 里已有的编号。发行版不随包发 `阅读物/` 源目录
  // 内置阅读物只存在于 `public/assets/data/readings.json`，两处都看才唯一
  const jf = path.join(PUBLIC, 'assets', 'data', 'readings.json')
  if (exists(jf)) {
    for (const r of readJson(jf, []) || []) {
      if (r && r.id) consider(r.id)
    }
  }
  return `read_L_book_${regionPrefix}${String(max + 1).padStart(3, '0')}`
}

/** 写阅读物 txt */
export function writeReading({ region, title, type = '书籍', body, id }) {
  const regionDir = REGION_DIR[region] || region
  // 不再分「系列」子目录
  const dir = path.join(ASSET, '阅读物', regionDir)
  fs.mkdirSync(dir, { recursive: true })
  const prefix = region === 'yizan' ? '010203' : '010101'
  const rid = id || nextReadingId(prefix)
  const name = title.startsWith('《') ? title : `《${title}》`
  const text = `${name}\n\n【图鉴分区】${regionDir}\n【编号】${rid}\n【类型】${type}\n\n${String(body || '').replace(/\r\n/g, '\n').trim()}\n`
  const file = path.join(dir, `${safeName(name)}.txt`)
  writeText(file, text)
  // 登记为自建（标题不带书名号，与导出候选里的名字同口径）
  markCustom('readings', String(title || '').replace(/^《|》$/g, '').trim())
  return { file, id: rid }
}

/* ────────────────────────────── 阅读物 · 成品直写（发行版） ────────────────────────────── */

/** 成品阅读物的落点：发行版（`NIKKI_DIST_MODE=1`）直接改 `readings.json`，开发版走 txt → `gen-readings.py` */
const readingJsonFile = () => path.join(PUBLIC, 'assets', 'data', 'readings.json')

/** 新增 / 覆盖一条阅读物（直接写成品 `readings.json`）：字段仅 `id/region/series/title/text`，紧凑 JSON、按 id 正序 */
export function upsertReadingJson({ region, title, body, id }) {
  const file = readingJsonFile()
  const list = readJson(file, null)
  if (!Array.isArray(list)) throw new Error(`${rel(file)} 不存在或已损坏 —— 先跑一次数据管线`)

  const regionKey = region === 'yizan' ? 'yizan' : 'wish'
  const name = String(title || '').trim().replace(/^《|》$/g, '')
  if (!name) throw new Error('书名必填')
  const full = `《${name}》`
  const clean = String(body || '').replace(/\r\n/g, '\n').trim()
  if (!clean) throw new Error('正文为空')

  let hit = id ? list.find((r) => r.id === String(id).trim()) : null
  if (!hit) hit = list.find((r) => String(r.title || '').trim() === full)

  let rid = hit?.id || String(id || '').trim()
  if (hit) {
    hit.title = full
    hit.region = regionKey
    hit.text = clean
  } else {
    if (!rid) rid = nextReadingId(regionKey === 'yizan' ? '010203' : '010101')
    list.push({ id: rid, region: regionKey, series: '', title: full, text: clean })
    // 与 gen-readings.py 同序（它按 id 正序写盘）：码位比较，别用 localeCompare
    list.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  }

  // 拓展包只能装自建内容：不登记的话这篇在导出下拉里看不见（与 writeReading 同口径）
  markCustom('readings', name)
  fs.writeFileSync(file, JSON.stringify(list), 'utf8')
  return { file, id: rid, created: !hit }
}

/* ────────────────────────────── 概览 ────────────────────────────── */

/** 给界面用的全局概览：版本 / 服装阁 / 套装 / 故事 / 阅读物 数量 */
export function overview() {
  const pm = readJson(path.join(ASSET, 'pool-map.json'), { banners: [] }) || { banners: [] }
  const mf = readJson(path.join(PUBLIC, 'assets', 'manifest.json'), {}) || {}
  const vers = readVersionTable()

  // 发行版不随包发 `素材/{故事,阅读物}` 源目录，数源目录会得到 0
  // JSON 里的条数也更准（源目录里有重复副本）
  const storyJson = readJson(path.join(PUBLIC, 'assets', 'data', 'stories.json'), null)
  const readingJson = readJson(path.join(PUBLIC, 'assets', 'data', 'readings.json'), null)
  const storyDir = path.join(ASSET, '故事')
  const stories = Array.isArray(storyJson)
    ? storyJson.length
    : (exists(storyDir) ? fs.readdirSync(storyDir).filter((f) => f.endsWith('.md')).length : 0)

  // 阅读物计数必须与 `tools/gen-readings.py` **同口径**，否则概览和图鉴对不上
  // 管线只扫两层：`<分区>/*.txt` 与 `<分区>/<系列>/*.txt`
  // `素材/阅读物/` 根下的文件（如 `2872新增阅读物清单.txt`）不算阅读物
  let readings = 0
  const countTxt = (d) => {
    if (!exists(d)) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith('.txt')) readings++
    }
  }
  const readingRoot = path.join(ASSET, '阅读物')
  for (const region of exists(readingRoot) ? fs.readdirSync(readingRoot, { withFileTypes: true }) : []) {
    if (!region.isDirectory()) continue
    const rp = path.join(readingRoot, region.name)
    countTxt(rp)                                     // <分区>/*.txt
    for (const series of fs.readdirSync(rp, { withFileTypes: true })) {
      if (series.isDirectory()) countTxt(path.join(rp, series.name))   // <分区>/<系列>/*.txt
    }
  }
  // 成品 JSON 有数就用它（发行版无源目录；JSON 里已去重，目录统计会多算）
  if (Array.isArray(readingJson)) readings = readingJson.length

  return {
    versions: vers.length,
    majors: [...new Set(vers.map((v) => v.major))].length,
    banners: (pm.banners || []).length,
    sets: (pm.banners || []).reduce((n, b) => n + (b.sets?.length || 0), 0),
    stories,
    readings,
    manifestBanners: (mf.banners || []).length,
    generatedAt: mf.generatedAt || '',
    latestVersion: vers.length ? vers[vers.length - 1].v : '',
  }
}

export { verKey }
