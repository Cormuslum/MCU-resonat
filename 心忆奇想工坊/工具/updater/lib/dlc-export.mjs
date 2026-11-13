/**
 * DLC 导出器：把库里的自建内容切成一个**自包含**的包。
 *
 * 「自包含」是关键词：包里带自己的素材副本，路径改写成 `/dlc/<id>/assets/...`。
 * 所以这个包拷给任何装了本模拟器的人都能直接用 —— 不依赖对方机器上的素材库。
 *
 * 五个挂载接口，各自对应包里 `data/` 下的一个 JSON 文件：
 *
 *   服装阁     pool.banner    整座阁（含套装）→ 共鸣页多一座阁
 *   套装       pool.set       一套服装 → 挂进指定服装阁
 *   故事       codex.story    一篇套装故事 → 故事图鉴
 *   阅读物     codex.reading  一篇 → 阅读物图鉴
 *   版本       version.banner 一个小版本（含缩略图 / 大图）→ 版本页
 *
 * v2.0.05：一次导出可以**多选**，所有选中的同类内容装进**同一个包**；
 * 每个接口的数据文件统一是**数组**（兼容老包里的单对象，见 src/core/dlc.ts）。
 * 另外三条关联规则：
 *   - 打包服装阁 / 套装 → 自动附带这些套装的故事（故事与套装强关联）；
 *   - 打包版本 → 自动附带该版本内的自建服装阁，以及这些阁里套装的故事；
 *   - 故事仍可**单独打包**（kind = 'story'，不附带阁）。
 * 「附带」找不到内容一律跳过、不报错（用户明确要求版本里没有阁也要能打包）。
 *
 * 素材从 `public/assets/` 里取**已转码好的 webp** —— 不重新转码，包里直接就是
 * 模拟器能用的格式。
 */
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { ASSET, PUBLIC, exists, readJson, writeJson, rel } from './util.mjs'
import { readCustom } from './meta.mjs'
import { newManifest, slugId, uniqueId, srcDir, writeManifest, INTERFACES } from './dlc.mjs'

const ASSETS = path.join(PUBLIC, 'assets')
const MANIFEST = path.join(ASSETS, 'manifest.json')

/** 接口 → 数据文件名（与 src/core/dlc-interfaces.ts 的 DLC_INTERFACES 一致） */
const IFACE_FILE = {
  'pool.banner': 'pool.banner.json',
  'pool.set': 'pool.set.json',
  'codex.story': 'codex.story.json',
  'codex.reading': 'codex.reading.json',
  'version.banner': 'version.banner.json',
}
/** 写 provides 时的固定顺序 —— 前端按这个顺序挂载（先阁、再套装、再图鉴、最后版本） */
const IFACE_ORDER = Object.keys(IFACE_FILE)

const KIND_LABEL = { banner: '服装阁', set: '套装', story: '故事', reading: '阅读物', version: '版本' }

/**
 * 自建编号段的起点（v2.0.04）。
 *
 * 编号区间是既定约定：`001~099` 官方、`100~499` 留给未来官方、`500+` 自建/DLC
 * （工坊 `nextFreeGacha()` 从 500 起取空号，见 meta.mjs）。所以「编号 ≥ 500」
 * 就是一套可靠的「不是内置内容」判据，不用依赖白名单是否登记过。
 */
const DLC_GACHA_FROM = 500

/** 去掉书名号、收空格 —— 阅读物在文件里带《》，在候选里不带 */
const bareName = (s) => String(s || '').replace(/^《|》$/g, '').trim()

/** `gachaKey` → 数值（认 `1206` / `banner-1206` / `106` 这几种写法） */
function gachaNum(v) {
  const m = /\d+/.exec(String(v || ''))
  return m ? Number(m[0]) : NaN
}

const clone = (o) => JSON.parse(JSON.stringify(o))

/** manifest 里出现的资源路径前缀（用来判断一个字符串是不是素材路径） */
const ASSET_PREFIXES = ['sets/', 'banners/', 'ui/', 'decor/', 'milestones/', 'stars3/', 'gifs/']

function isAssetPath(v) {
  return typeof v === 'string' && !v.startsWith('/') && ASSET_PREFIXES.some((p) => v.startsWith(p))
}

/**
 * 递归改写 JSON 里的素材路径，并把文件复制进包内。
 *
 *   `sets/S0438/portrait.webp` → `/dlc/<id>/assets/sets/S0438/portrait.webp`
 */
function rewire(node, pkgId, stats) {
  if (typeof node === 'string') {
    if (!isAssetPath(node)) return node
    const src = path.join(ASSETS, node)
    if (!exists(src)) return node
    const dst = path.join(srcDir(pkgId), 'assets', node)
    fs.mkdirSync(path.dirname(dst), { recursive: true })
    if (!exists(dst)) fs.copyFileSync(src, dst)
    stats.files++
    return `/dlc/${pkgId}/assets/${node}`
  }
  if (Array.isArray(node)) return node.map((x) => rewire(x, pkgId, stats))
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) out[k] = rewire(v, pkgId, stats)
    return out
  }
  return node
}

/** 读内置 manifest（导出只认已转码好的产物） */
function readManifestJson() {
  const m = readJson(MANIFEST, null)
  if (!m) throw new Error(`${rel(MANIFEST)} 不存在 —— 先跑一次数据管线`)
  return m
}

/* ────────────────────────────── 自建内容范围 ────────────────────────────── */

/**
 * 算出「哪些内容算自建（可进拓展包）」（v2.0.04，用户要求）。
 *
 * 内置的 88 座服装阁、134 篇故事、595 篇阅读物本来就随模拟器一起发布，
 * 把它们再切进包里没有意义：包体积暴涨、接收方装上会多出一份重复的阁。
 *
 * 判据（能反推的用结构，反推不了的用白名单）：
 *   阁     编号 ≥ 500（自建段）**或** 登记在 `自建内容.json` 的 pools
 *   套装   属于上面这些阁 **或** 在 sets 白名单里
 *   故事   它的套装是自建套装
 *   阅读物 在 readings 白名单里（工坊写入时自动登记）
 *   版本   该版本下的阁**全部**是自建阁（0.x 这种整版自建的情况）
 */
function dlcScope(m) {
  const custom = readCustom()
  const banners = m.banners || []

  const isDlcPool = (b) => {
    const n = gachaNum(b?.gachaKey)
    if (Number.isFinite(n) && n >= DLC_GACHA_FROM) return true
    return custom.pools.includes(String(b?.name || ''))
  }

  const dlcBanners = banners.filter(isDlcPool)

  const dlcSets = new Set(custom.sets.map(bareName))
  for (const b of dlcBanners) for (const s of b.sets || []) dlcSets.add(bareName(s.name))

  const dlcVersions = new Set()
  for (const v of new Set(banners.map((b) => b.version))) {
    const own = banners.filter((b) => b.version === v)
    if (own.length && own.every(isDlcPool)) dlcVersions.add(v)
  }

  const dlcReadings = new Set(custom.readings.map(bareName))

  return { custom, isDlcPool, dlcBanners, dlcSets, dlcVersions, dlcReadings }
}

/** 导出时拦下内置内容 —— 直接打 API 也不该能绕过去 */
function rejectBuiltin(what, extra = '') {
  throw new Error(
    `${what}是模拟器自带内容，不能打进拓展包（包里只装自建内容，服装阁编号 ≥ ${DLC_GACHA_FROM}）。${extra}`,
  )
}

/* ────────────────────────────── 单条内容的取数（纯函数，不写盘） ────────────────────────────── */

/** 在全库里按套装名找它所属的阁与套装对象 */
function findSet(m, name) {
  for (const b of m.banners || []) {
    const s = (b.sets || []).find((x) => x.name === name)
    if (s) return { set: s, pool: b }
  }
  return null
}

/** 故事源目录：v1.9.00 素材重构把 `套装故事/` 改名成 `故事/`，两者都认。 */
function storyRoot() {
  for (const n of ['故事', '套装故事']) {
    const d = path.join(ASSET, n)
    if (fs.existsSync(d)) return d
  }
  return path.join(ASSET, '故事')
}

/**
 * 读一篇套装故事（`素材/故事/故事-{星级}-{套装名}.md`）。
 *
 * 找不到 md 时返回 **null** —— 这是「附带」路径的正常情况，不该让整包导出失败。
 * 与 gen-stories.py 同源：第一行标题、跳过 `---`、正文压缩 3 个以上空行。
 */
function storyEntry(setName, m) {
  const src = storyRoot()
  if (!exists(src)) return null
  // 精确匹配文件名，避免「星之海」误命中「星之海·改」
  const hit = fs.readdirSync(src).find((f) => new RegExp(`^故事-\\d星-${escapeRe(setName)}\\.md$`).test(f))
  if (!hit) return null

  const raw = fs.readFileSync(path.join(src, hit), 'utf8').replace(/\r\n/g, '\n')
  const lines = raw.split('\n')
  let title = ''
  let i = 0
  while (i < lines.length && !lines[i].trim()) i++
  if (i < lines.length && lines[i].startsWith('#')) { title = lines[i].replace(/^#+\s*/, '').trim(); i++ }
  while (i < lines.length && (!lines[i].trim() || lines[i].trim() === '---')) i++
  const text = lines.slice(i).join('\n').replace(/\n{3,}/g, '\n\n').trim()

  const found = findSet(m, setName)
  return {
    id: setName,
    setId: found?.set?.id || '',
    setName,
    star: Number(found?.set?.star || 5),
    // 故事的分区跟着**阁**走（v2.0.04），不跟套装首发版本
    major: Number(String(found?.pool?.version || '1').split('.')[0]) || 1,
    title: title || setName,
    text,
  }
}

/** 正则转义（套装名里可能有括号 / 点号） */
function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 读一篇阅读物（正文文件在 `素材/阅读物/<分区>/[系列/]<书名>.txt`） */
function readingEntry(title) {
  const root = path.join(ASSET, '阅读物')
  const bare = bareName(title)
  const names = new Set([`《${bare}》.txt`, `${bare}.txt`])
  let hit = null
  const walk = (d) => {
    if (hit) return
    if (!exists(d)) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (names.has(e.name)) hit = p
    }
  }
  walk(root)
  if (!hit) return null

  const raw = fs.readFileSync(hit, 'utf8').replace(/\r\n/g, '\n')
  const lines = raw.split('\n')
  let rid = ''
  let region = 'yizan'
  let series = path.basename(path.dirname(hit))
  let bodyStart = 0
  let i = 0
  while (i < lines.length && !lines[i].trim()) i++
  const t = lines[i] || bare
  i++
  while (i < lines.length && !lines[i].trim()) i++
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; bodyStart = i; break }
    const mm = /^【(图鉴分区|编号|类型)】(.*)$/.exec(line.trim())
    if (mm) {
      if (mm[1] === '编号') rid = mm[2].trim()
      else if (mm[1] === '图鉴分区') region = mm[2].trim() === '心愿原野' ? 'wish' : 'yizan'
      i++
      continue
    }
    bodyStart = i
    break
  }
  const text = lines.slice(bodyStart).join('\n').trim()
  return { id: rid || t, region, series, title: t, text }
}

/* ────────────────────────────── 统一导出（多选 / 关联故事） ────────────────────────────── */

/** 单选时沿用旧的包 id 规则，保证老脚本 / 老 URL 不失效 */
function legacyPackageId(kind, key, m, hasName) {
  switch (kind) {
    case 'banner': return hasName ? `dlc-${key}` : key
    case 'set': {
      const sid = findSet(m, key)?.set?.id || key
      return hasName ? `dlc-${sid}` : `set-${sid}`
    }
    case 'story': {
      const sid = findSet(m, key)?.set?.id || key
      return hasName ? `dlc-story-${sid}` : `story-${sid}`
    }
    case 'reading': {
      const base = readingEntry(key)?.id || bareName(key)
      return hasName ? `dlc-${base}` : `reading-${base}`
    }
    case 'version': return hasName ? `dlc-${key}` : `version-${key}`
    default: return null
  }
}

/** 多选时按「类目 + 选中键集合」取一个稳定短哈希，同一组合重复导出会由 uniqueId 顺延 */
function multiPackageId(kind, keys) {
  const h = crypto.createHash('sha1')
    .update(`${kind}|${[...keys].sort().join('|')}`)
    .digest('hex').slice(0, 8)
  return `dlc-${kind}-${h}`
}

/**
 * 选中项的**纯校验**，必须在建目录 / 复制素材之前跑完。
 *
 * 否则「前 3 项合法、第 4 项是内置阁」这种混合选择，会在第 4 项抛错时
 * 留下一个已经复制了几百个素材却没有 dlc.json 的残包。
 */
function validateSelection(kind, list, m, scope) {
  for (const key of list) {
    switch (kind) {
      case 'banner': {
        const b = (m.banners || []).find((x) => x.id === key)
        if (!b) throw new Error('找不到服装阁：' + key)
        if (!scope.isDlcPool(b)) rejectBuiltin(`服装阁《${b.name}》`)
        break
      }
      case 'set':
        if (!findSet(m, key)) throw new Error('找不到套装：' + key)
        if (!scope.dlcSets.has(bareName(key))) rejectBuiltin(`套装《${key}》`)
        break
      case 'story':
        if (!scope.dlcSets.has(bareName(key))) rejectBuiltin(`故事《${key}》`)
        if (!storyEntry(key, m)) throw new Error('找不到故事文件：' + key)
        break
      case 'reading':
        if (!scope.dlcReadings.has(bareName(key))) {
          rejectBuiltin(`阅读物《${bareName(key)}》`, '想打包自己写的阅读物，用「阅读物」任务写一遍再导。')
        }
        if (!readingEntry(key)) throw new Error('找不到阅读物：' + key)
        break
      case 'version': {
        const meta = (m.ui?.ver?.versions || []).find((x) => x.v === key)
        if (!meta) throw new Error('找不到版本：' + key)
        if (!scope.dlcVersions.has(key)) rejectBuiltin(`版本 ${key}`, '只有整版自建（如 0.x）的版本才能打包。')
        break
      }
    }
  }
}

/**
 * 一次导出**一个包**（v2.0.05 主入口）。
 *
 * @param {object} p
 * @param {string} p.kind  banner | set | story | reading | version
 * @param {string[]} p.keys 选中的键（多选）
 * @param {string} [p.name] 包名；留空自动生成
 * @param {string} [p.author]
 * @param {string} [p.description]
 * @param {string} [p.poolId] kind=set 时的目标阁
 * @param {string} [p.legacyId] 单选时强制使用的旧包 id（一般不用传）
 */
export function exportMany({ kind, keys = [], name, author, description, poolId, legacyId } = {}) {
  if (!KIND_LABEL[kind]) throw new Error('未知的导出类型：' + kind)
  const list = [...new Set((Array.isArray(keys) ? keys : [keys]).filter((x) => x != null && String(x).trim()))]
    .map(String)
  if (!list.length) throw new Error('还没有选要打包的内容')

  const m = readManifestJson()
  const scope = dlcScope(m)
  // 先全量校验，再动磁盘 —— 混合选择里只要有一项不合法，就不该留下半个包
  validateSelection(kind, list, m, scope)

  // 包 id 必须先算：rewire 出的素材路径里带着它
  const base = legacyId || (list.length === 1
    ? legacyPackageId(kind, list[0], m, !!name)
    : multiPackageId(kind, list))
  const pkgId = uniqueId(slugId(base), srcDir)
  const dir = srcDir(pkgId)
  fs.mkdirSync(path.join(dir, 'data'), { recursive: true })

  const stats = { files: 0 }
  /** 接口 → 数据条目数组 */
  const buckets = new Map(IFACE_ORDER.map((i) => [i, []]))
  const labels = []
  const storyNames = new Set()
  const attached = { banners: 0, stories: 0 }

  /* ① 主内容：取数 + 改路径。
        范围校验已在 validateSelection 里全量跑过；循环里再留一道是防御，
        保证以后改了调用顺序也不会把内置内容写进包。 */
  for (const key of list) {
    if (kind === 'banner') {
      const b = (m.banners || []).find((x) => x.id === key)
      if (!b) throw new Error('找不到服装阁：' + key)
      if (!scope.isDlcPool(b)) rejectBuiltin(`服装阁《${b.name}》`)
      buckets.get('pool.banner').push(rewire(clone(b), pkgId, stats))
      labels.push(b.name)
      for (const s of b.sets || []) storyNames.add(s.name)
      continue
    }
    if (kind === 'set') {
      const found = findSet(m, key)
      if (!found) throw new Error('找不到套装：' + key)
      if (!scope.dlcSets.has(bareName(key))) rejectBuiltin(`套装《${key}》`)
      const target = poolId || found.pool.id
      buckets.get('pool.set').push({ poolId: target, set: rewire(clone(found.set), pkgId, stats) })
      labels.push(key)
      storyNames.add(key)
      continue
    }
    if (kind === 'story') {
      if (!scope.dlcSets.has(bareName(key))) rejectBuiltin(`故事《${key}》`)
      const e = storyEntry(key, m)
      if (!e) throw new Error('找不到故事文件：' + key)
      buckets.get('codex.story').push(e)
      labels.push(key)
      continue
    }
    if (kind === 'reading') {
      if (!scope.dlcReadings.has(bareName(key))) {
        rejectBuiltin(`阅读物《${bareName(key)}》`, '想打包自己写的阅读物，用「阅读物」任务写一遍再导。')
      }
      const e = readingEntry(key)
      if (!e) throw new Error('找不到阅读物：' + key)
      buckets.get('codex.reading').push(e)
      labels.push(key)
      continue
    }
    if (kind === 'version') {
      const meta = (m.ui?.ver?.versions || []).find((x) => x.v === key)
      if (!meta) throw new Error('找不到版本：' + key)
      if (!scope.dlcVersions.has(key)) rejectBuiltin(`版本 ${key}`, '只有整版自建（如 0.x）的版本才能打包。')
      const ver = m.ui.ver
      buckets.get('version.banner').push({
        version: {
          v: meta.v, name: meta.name, major: meta.major,
          majorName: meta.majorName || '', desc: meta.desc || '',
        },
        card: ver.cards?.[key] ? rewire(ver.cards[key], pkgId, stats) : null,
        big: ver.bigCards?.[key] ? rewire(ver.bigCards[key], pkgId, stats) : null,
      })
      labels.push(`${key} ${meta.name}`)
      continue
    }
  }

  /* ② 版本 → 顺带把版本内的自建阁也装进来（没有阁就什么都不加，不报错） */
  if (kind === 'version') {
    const own = scope.dlcBanners.filter((b) => list.includes(b.version))
    for (const b of own) {
      buckets.get('pool.banner').push(rewire(clone(b), pkgId, stats))
      for (const s of b.sets || []) storyNames.add(s.name)
    }
    attached.banners = own.length
  }

  /* ③ 服装阁 / 套装 / 版本 → 顺带把这些套装的故事装进来。
        故事没有对应 md 就跳过；「故事单独打包」这条路不受影响。 */
  if (kind !== 'story' && kind !== 'reading') {
    for (const n of storyNames) {
      const e = storyEntry(n, m)
      if (e) buckets.get('codex.story').push(e)
    }
    attached.stories = buckets.get('codex.story').length
  }

  /* ④ 落盘：每个非空接口一个数组文件 */
  const provides = []
  const counts = {}
  for (const iface of IFACE_ORDER) {
    const items = buckets.get(iface)
    if (!items.length) continue
    writeJson(path.join(dir, 'data', IFACE_FILE[iface]), items)
    provides.push({ interface: iface, mount: true, data: IFACE_FILE[iface] })
    counts[iface] = items.length
  }

  const kindLabel = KIND_LABEL[kind]
  const summary = list.length === 1 ? labels[0] : `${labels[0]} 等 ${list.length} 项`
  const descParts = [`${kindLabel} ${list.length} 项`]
  if (attached.banners) descParts.push(`附带服装阁 ${attached.banners} 座`)
  if (attached.stories) descParts.push(`附带故事 ${attached.stories} 篇`)

  const mf = newManifest(pkgId, name || summary)
  mf.author = author || ''
  mf.description = description || descParts.join(' · ')
  mf.provides = provides
  writeManifest(dir, mf)

  return {
    id: pkgId,
    dir,
    files: stats.files,
    provides: provides.map((p) => p.interface),
    counts,
    attached,
    keys: list,
  }
}

/* ────────────────────────────── 候选列表（给界面多选列表用） ────────────────────────────── */

/**
 * 库里能导出的东西 —— 界面拿它填候选列表。
 *
 * v2.0.04：**只列自建内容**。内置的 88 座服装阁以前会全部出现在这里，
 * 选一座就能打出一个「把官方内容重新分发一遍」的包 —— 用户明确不要这个。
 */
export function exportCandidates() {
  const m = readJson(MANIFEST, null)
  if (!m) return { banners: [], sets: [], stories: [], readings: [], versions: [] }
  const scope = dlcScope(m)

  const banners = scope.dlcBanners.map((b) => ({ id: b.id, name: b.name, version: b.version }))

  const sets = []
  for (const b of scope.dlcBanners) {
    for (const s of b.sets || []) sets.push({ name: s.name, star: s.star, poolId: b.id, poolName: b.name })
  }

  const storyDir = storyRoot()
  const stories = exists(storyDir)
    ? fs.readdirSync(storyDir).filter((f) => f.endsWith('.md'))
      .map((f) => f.replace(/^故事-\d星-/, '').replace(/\.md$/, ''))
      .filter((n) => scope.dlcSets.has(bareName(n)))
    : []

  const readingRoot = path.join(ASSET, '阅读物')
  const readings = []
  const walk = (d) => {
    if (!exists(d)) return
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      // 「…清单.txt」是素材清单不是阅读物（gen-readings.py 也排除它）
      else if (e.name.endsWith('.txt') && !e.name.includes('清单')) {
        const t = e.name.replace(/\.txt$/, '')
        if (scope.dlcReadings.has(bareName(t))) readings.push(t)
      }
    }
  }
  walk(readingRoot)

  const versions = (m.ui?.ver?.versions || [])
    .filter((x) => scope.dlcVersions.has(x.v))
    .map((x) => ({ v: x.v, name: x.name }))

  return { banners, sets, stories, readings, versions }
}

export { INTERFACES }
