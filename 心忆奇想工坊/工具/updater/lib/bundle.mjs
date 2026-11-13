/**
 * 整套导入：素材按「大版本 / 版本号+版本名 / 服装阁 / S 编号套装 / 阅读物」的固定结构整理好再丢进来。
 * 两个函数：`scanBundle(path)` 把目录读成一份计划（不写任何文件），`applyBundle(...)` 按计划一次性写完。
 */
import fs from 'node:fs'
import path from 'node:path'
import { ASSET, exists, readText, safeName, uiRoot, imageSize, verKey } from './util.mjs'
import {
  readVersionTable, upsertVersion, upsertMajor, listMajors,
  readPoolIndex, upsertPool, upsertSet, writeStory, writeReading,
  writeSuitLibYaml, SUIT_LIB, poolDirOf, writeSetImages, SLOTS,
  normalizeGacha, nextFreeGacha, readSetSeq,
  upsertStoryJson, upsertReadingJson,
} from './meta.mjs'
import { archive } from './archive.mjs'

/**
 * 发行版（启动器设 `NIKKI_DIST_MODE=1`）：故事 / 阅读物**直写成品 JSON**，
 * 不在 `工具/data/{故事,阅读物}/` 里留副本。
 */
const DIST_MODE = !!process.env.NIKKI_DIST_MODE

/** 拖进来的 md 头部的 `# 标题` 与 `---` 不是正文，直写 JSON 时必须剥掉 */
function stripMd(s) {
  return String(s || '')
    .replace(/\r\n/g, '\n')
    .replace(/^#\s.*(\n|$)/, '')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .trim()
}

const PIC = /\.(png|jpe?g|webp|gif|bmp)$/i

/* ────────────────────────────── 扫描 ────────────────────────────── */

/** 文件名去扩展名（判名时用） */
const stem = (n) => path.basename(n, path.extname(n))

function listDir(p) {
  if (!exists(p)) return []
  return fs.readdirSync(p, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.'))
    .map((e) => ({ name: e.name, dir: e.isDirectory(), path: path.join(p, e.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans-CN'))
}

/** 版本目录名 → { v, name }：`0.1祈愿星` / `2.11 时光缝合的扉页` / `2.11·雪落` 都认 */
function parseVersionDir(dirName) {
  const m = /^(\d+(?:\.\d+)?)\s*[·.、\s-]?\s*(.*)$/.exec(dirName)
  if (m) {
    const v = m[1]
    // `2.11时光缝合的扉页` 会命中「2.11」+「时光缝合的扉页」
    const name = (m[2] || '').replace(/^[·.\s-]+/, '').trim()
    return { v, name }
  }
  /**
   * 兜底：版本号没写在开头也要认，从名字里捞一个 `x.y` 出来。
   */
  const m2 = /(\d+\.\d+)/.exec(dirName)
  if (m2) {
    const v = m2[1]
    const name = dirName.replace(v, '').replace(/[（）()]/g, ' ').replace(/[·.、\s-]+/g, ' ').trim()
    return { v, name }
  }
  return null
}

/** 从 `属性-5星-心愿金蔷薇.yaml` / `故事-4星-祈愿新生.md` 取星级与套装名 */
function parseSetFile(fileName) {
  const base = path.basename(fileName, path.extname(fileName))
  const m = /^(?:属性|故事)[-－]\s*([45])\s*星\s*[-－]\s*(.+)$/.exec(base)
  if (m) return { star: m[1], name: m[2].trim() }
  return null
}

/** 文件名 → 深海回响档位（`120抽-XXX.png`） */
function parseMilestone(fileName) {
  const base = path.basename(fileName, path.extname(fileName))
  const m = /^(\d+)\s*抽/.exec(base)
  return m ? Number(m[1]) : null
}

const VIDEO_RE = /\.(mp4|webm|mov|mkv)$/i
const AUDIO_RE = /\.(ogg|mp3|wav|flac|m4a)$/i

/** 目录名是不是「阅读物」那一层（示例里写作「阅读物（归属于这个大版本的阅读物）」） */
const isReadingDirName = (n) => /^阅读物/.test(n)

/** 递归收一个目录下所有 .txt（阅读物允许再套「系列」子目录） */
function collectReadingsDeep(dir) {
  const out = []
  for (const e of listDir(dir)) {
    if (e.dir) out.push(...collectReadingsDeep(e.path))
    else if (/\.txt$/i.test(e.name)) out.push(e.path)
  }
  return out
}

/**
 * 这个目录**自己**是哪一层？
 * 路径末尾那一层对得上就该能认，不硬性要求再套一层。
 */
function classifySelf(dir) {
  const base = path.basename(dir)
  const asDir = { name: base, dir: true, path: dir }

  if (isReadingDirName(base)) return { level: 'reading' }

  const v = parseVersionDir(base)
  if (v) {
    const ver = collectVersion(asDir, { majorName: '', majorIcon: null })
    if (ver) return { level: 'version', v, ver }
  }

  // 套装要排在服装阁之前判：「进化等阶/整体-初始.png」这种顶层大图会被
  // collectPool 当成「16:9 背景」认走
  if (isSetDir(asDir)) {
    const set = collectSet(asDir)
    if (set) return { level: 'set', set }
  }

  const pool = collectPool(asDir)
  if (pool) return { level: 'pool', pool }

  return { level: '' }
}

/**
 * 往上找 1~2 层里的「版本目录名」，猜出版本号 / 版本名 / 大版本名；只用于预填表单，绝不拿它当写入依据。
 */
function guessContext(dir) {
  const parent = path.dirname(dir)
  if (!parent || parent === dir) return {}
  const pv = parseVersionDir(path.basename(parent))
  if (!pv) return {}
  const gp = path.dirname(parent)
  const majorName = gp && gp !== parent && !parseVersionDir(path.basename(gp))
    ? path.basename(gp)
    : ''
  return {
    version: pv.v,
    versionName: pv.name,
    major: String(pv.v).split('.')[0],
    majorName,
  }
}

/**
 * 扫描一个整理好的文件夹：允许指到大版本 / 版本 / 服装阁 / 套装 / 阅读物任意一层，指到哪层就认哪层；
 * 缺上级归属的收成 `orphans`（界面可一键填进「服装阁」表单）。
 * @returns {{ok:boolean, plan?:object, error?:string, code?:string}}
 */
export function scanBundle(root) {
  if (!exists(root)) return { ok: false, error: '路径不存在' }
  if (!fs.statSync(root).isDirectory()) return { ok: false, error: '这不是文件夹' }

  const majors = []
  const warnings = []
  let readings = []
  /** 认不出上级归属的条目：交给界面提示玩家去别的栏目补 */
  const orphans = []

  /** 把「只有阁这一层」的目录收成待补归属（带上全部已识别的素材） */
  const pushPoolOrphan = (pool, reason) => {
    orphans.push({
      level: 'pool',
      name: pool.name,
      dir: pool.dir,
      pools: [pool.name],
      reason,
      guess: { ...guessContext(pool.dir), pools: [pool] },
    })
  }

  const self = classifySelf(root)

  /* ① 自己就是「阅读物」目录：这是最常见的一种「只改了几本书」的导入 */
  if (self.level === 'reading') {
    readings = collectReadingsDeep(root)
    if (!readings.length) return { ok: false, code: 'empty', error: '这个「阅读物」目录里没有 .txt' }
    return { ok: true, plan: { root, majors, readings, warnings, orphans } }
  }

  /* ② 自己就是版本目录 —— 大版本号从版本号推（1.0 → 1） */
  if (self.level === 'version') {
    const ver = self.ver
    ver.v = self.v.v
    ver.name = self.v.name || self.v.v
    const majorNum = String(self.v.v).split('.')[0]
    majors.push({
      major: majorNum,
      name: guessContext(root).majorName || '',
      icon: null,
      versions: [ver],
    })
    readings = collectReadingsDeep(root)
    return { ok: true, plan: { root, majors, readings, warnings, orphans } }
  }

  /* ③ 自己就是服装阁 / 套装 */
  if (self.level === 'pool') {
    pushPoolOrphan(self.pool, '只有服装阁这一层，缺版本号与大版本名')
    readings = collectReadingsDeep(root)
    return { ok: true, plan: { root, majors, readings, warnings, orphans } }
  }
  if (self.level === 'set') {
    orphans.push({
      level: 'set',
      name: self.set.name,
      dir: root,
      pools: [],
      reason: '只有一套服装，缺所属服装阁 / 版本 / 大版本',
      guess: { ...guessContext(root), pools: [], sets: [self.set] },
    })
    return { ok: true, plan: { root, majors, readings, warnings, orphans } }
  }

  /* ④ 自己就是「大版本」目录（里面直接是版本目录）→ 别再往里剥一层 */
  const verDirsAtRoot = listDir(root)
    .filter((e) => e.dir && !isReadingDirName(e.name))
    .filter((e) => {
      const pv = parseVersionDir(e.name)
      return pv && collectVersion(e, { majorName: '', majorIcon: null })
    })
  const majorRoots = verDirsAtRoot.length
    ? [{ name: path.basename(root), path: root, dir: true }]
    : listDir(root).filter((e) => e.dir)

  if (!majorRoots.length) {
    // 只有散文件：整套导入靠目录结构定位归属，散文件无法判断该挂到哪
    const files = listDir(root).filter((e) => !e.dir)
    return {
      ok: false,
      code: files.length ? 'loose-files' : 'empty',
      error: files.length
        ? '整套导入不支持散文件，请到其他地方操作'
        : '文件夹里没有子目录',
    }
  }

  for (const majorDir of majorRoots) {
    // 大版本图标（可选）
    const majorIconFile = listDir(majorDir.path).find(
      (e) => !e.dir && PIC.test(e.name) && /^(大版本图标|版本塔|major)/i.test(stem(e.name)),
    )

    // 「阅读物」目录不属于版本层级，单独收
    // 顺带按版本号数值排序：readdir 是文件系统顺序，`1.10` 会排在 `1.2` 前面
    const verDirs = listDir(majorDir.path)
      .filter((e) => e.dir && !isReadingDirName(e.name))
      .sort((a, b) => {
        const x = verKey(parseVersionDir(a.name)?.v || a.name)
        const y = verKey(parseVersionDir(b.name)?.v || b.name)
        for (let i = 0; i < Math.max(x.length, y.length); i++) {
          const d = (x[i] ?? 0) - (y[i] ?? 0)
          if (d) return d
        }
        return 0
      })
    if (!verDirs.length) {
      // 顶层直接是版本目录（用户少套了一层）—— 也认
      const maybe = parseVersionDir(majorDir.name)
      if (maybe) {
        const m = collectVersion(majorDir, { majorName: '', majorIcon: null })
        if (m) {
          m.v = maybe.v
          m.name = maybe.name || maybe.v
          majors.push({
            major: String(maybe.v).split('.')[0],
            name: guessContext(majorDir.path).majorName || '',
            icon: majorIconFile?.path || null,
            versions: [m],
          })
        }
        continue
      }
      // 名字里没有版本号 → 不硬猜上级，收成「待补归属」
      const selfPool = collectPool(majorDir)
      if (selfPool) {
        pushPoolOrphan(selfPool, '只有服装阁这一层，缺版本号与大版本名')
        continue
      }
      const pools = listDir(majorDir.path)
        .filter((e) => e.dir && !isReadingDirName(e.name))
        .map((e) => collectPool(e))
        .filter(Boolean)
      if (pools.length) {
        orphans.push({
          level: 'pool',
          name: majorDir.name,
          dir: majorDir.path,
          pools: pools.map((p) => p.name),
          reason: '目录里全是服装阁，但没有版本层（缺版本号与大版本名）',
          guess: { ...guessContext(majorDir.path), pools },
        })
      }
      continue
    }

    const versions = []
    for (const verDir of verDirs) {
      const parsed = parseVersionDir(verDir.name)
      if (!parsed) { warnings.push(`跳过：${verDir.name}（看不出是版本目录）`); continue }
      const v = collectVersion(verDir, { majorName: majorDir.name, majorIcon: majorIconFile?.path || null })
      if (!v) continue
      v.v = parsed.v
      v.name = parsed.name || parsed.v
      versions.push(v)
    }
    if (!versions.length) {
      // 这一层没有可识别的版本目录：它自己可能是服装阁，也可能是「一堆阁」的容器
      const selfPool = collectPool(majorDir)
      if (selfPool) {
        pushPoolOrphan(selfPool, '只有服装阁这一层，缺版本号与大版本名')
        continue
      }
      const loosePools = verDirs.map((e) => collectPool(e)).filter(Boolean)
      if (loosePools.length) {
        orphans.push({
          level: 'pool',
          name: majorDir.name,
          dir: majorDir.path,
          pools: loosePools.map((x) => x.name),
          reason: '目录里是服装阁，但缺版本层（版本号与大版本名都补一下）',
          guess: { ...guessContext(majorDir.path), pools: loosePools },
        })
        continue
      }
      continue
    }

    const majorNum = String(versions[0].v || '').split('.')[0]
    if (!majorNum) {
      warnings.push(`跳过：${majorDir.name}（里面的版本目录都没有版本号）`)
      continue
    }
    majors.push({
      major: majorNum,
      name: majorDir.name,
      icon: majorIconFile?.path || null,
      versions,
    })
  }

  // 阅读物：任意层级下的「阅读物」目录
  const walkReadings = (dir) => {
    for (const e of listDir(dir)) {
      if (e.dir) {
        if (isReadingDirName(e.name)) readings.push(...collectReadingsDeep(e.path))
        else walkReadings(e.path)
      }
    }
  }
  walkReadings(root)

  if (!majors.length && !readings.length && !orphans.length) {
    return { ok: false, code: 'no-structure', error: '没认出结构：应该是「大版本名/版本号+版本名/服装阁名/…」' }
  }

  // 已经收成「待补归属」的目录，不必再报一遍「跳过：看不出是版本目录」
  if (orphans.length) {
    const kept = warnings.filter((w) => !/看不出是版本目录/.test(w))
    warnings.length = 0
    warnings.push(...kept)
  }

  return {
    ok: true,
    plan: { root, majors, readings, warnings, orphans },
  }
}

/** 扫描一个版本目录 */
function collectVersion(verDir, { majorName, majorIcon }) {
  const entries = listDir(verDir.path)

  // 版本级素材（可选）
  const card = entries.find((e) => !e.dir && PIC.test(e.name) && /^版本缩略图/.test(stem(e.name)))
  const big = entries.find((e) => !e.dir && PIC.test(e.name) && /^版本大图/.test(stem(e.name)))
  const descFile = entries.find((e) => !e.dir && /^版本介绍\.(txt|md)$/i.test(e.name))

  const pools = []
  for (const e of entries) {
    if (!e.dir || /^阅读物/.test(e.name)) continue
    const pool = collectPool(e)
    if (pool) pools.push(pool)
  }
  if (!pools.length) return null

  return {
    v: '',
    name: '',
    desc: descFile ? readText(descFile.path).trim() : '',
    card: card?.path || null,
    big: big?.path || null,
    majorIcon,
    pools,
  }
}

/** 扫描一个服装阁目录 */
function collectPool(poolDir) {
  const entries = listDir(poolDir.path)
  const pickBy = (re) => entries.find((e) => !e.dir && PIC.test(e.name) && re.test(stem(e.name)))

  const thumb = pickBy(/^(列表)?缩略图$/)
  const titleArt = pickBy(/^(艺术字|标题艺术字|titleart)$/i)
  // 动态背景 / 进入音
  const video = entries.find((e) => !e.dir && VIDEO_RE.test(e.name)) || null
  const audio = entries.find((e) => !e.dir && AUDIO_RE.test(e.name)) || null
  // 「标题横幅」已废弃（模拟器从不显示），不再识别、不再归档

  /**
   * 背景：先认文件名（`背景图.*` / `bg.*`），认不到再按尺寸兜底（16:9 且宽 ≥1900），必须排除已认出的缩略图 / 艺术字。
   */
  let bg = pickBy(/^(背景图?|bg)$/i)
  if (!bg) {
    const used = new Set([thumb, titleArt].filter(Boolean).map((e) => e.path))
    for (const e of entries) {
      if (e.dir || !PIC.test(e.name) || used.has(e.path)) continue
      const size = imageSize(e.path)
      if (!size?.w || !size?.h) continue
      const ar = size.w / size.h
      if (ar >= 1.7 && ar <= 1.85 && size.w >= 1900) { bg = e; break }
    }
  }

  // 深海回响
  const milestones = []
  const msDir = entries.find((e) => e.dir && /^(深海回响|深忆奖励)$/.test(e.name))
  if (msDir) {
    for (const f of listDir(msDir.path)) {
      if (f.dir || !PIC.test(f.name)) continue
      const pulls = parseMilestone(f.name)
      if (pulls == null) continue
      milestones.push({ pulls, path: f.path, name: f.name })
    }
  }

  // 套装
  const sets = []
  for (const e of entries) {
    if (!e.dir) continue
    if (/^(深海回响|深忆奖励|阅读物)$/.test(e.name)) continue
    if (!isSetDir(e)) continue
    const set = collectSet(e)
    if (set) sets.push(set)
  }
  // 一「阁」的判据：只要看得出是阁级素材/套装，就认
  if (!sets.length && !bg && !titleArt && !thumb && !milestones.length && !video && !audio) return null

  return { name: poolDir.name, dir: poolDir.path, bg: bg?.path || null, thumb: thumb?.path || null,
    titleArt: titleArt?.path || null, video: video?.path || null, audio: audio?.path || null,
    milestones, sets }
}

/**
 * 这个目录是不是「一套服装」：S 编号目录 / 带 `属性-5星-XXX.yaml`、`故事-*.md` / 带 `半身像/` `图标/` `进化等阶/`
 * / 直接放 `整体-初始.png`。
 */
function isSetDir(e) {
  if (/^S\d{2,}$/i.test(e.name)) return true
  const entries = listDir(e.path)
  if (entries.some((x) => !x.dir && /^(属性|故事)[-－]\s*[45]\s*星/.test(stem(x.name)))) return true
  if (entries.some((x) => x.dir && /^(半身像|图标|部件图标|进化等阶)$/.test(x.name))) return true
  if (entries.some((x) => !x.dir && /^整体[-_]/.test(stem(x.name)))) return true
  return false
}

/** 扫描一个套装目录（S0062） */
function collectSet(setDir) {
  const entries = listDir(setDir.path)
  const set = {
    id: setDir.name.toUpperCase(),
    name: '',
    star: '5',
    busts: [],
    icons: [],
    evos: [],
    yaml: null,
    story: null,
  }

  for (const e of entries) {
    if (e.dir) {
      if (e.name === '半身像') set.busts = listDir(e.path).filter((f) => !f.dir && PIC.test(f.name)).map((f) => f.path)
      if (e.name === '图标' || e.name === '部件图标') set.icons = listDir(e.path).filter((f) => !f.dir && PIC.test(f.name)).map((f) => f.path)
      if (e.name === '进化等阶') set.evos = listDir(e.path).filter((f) => !f.dir && PIC.test(f.name)).map((f) => f.path)
      continue
    }
    const parsed = parseSetFile(e.name)
    if (parsed) {
      set.star = parsed.star
      set.name = set.name || parsed.name
      if (/^属性/.test(e.name)) set.yaml = e.path
      else set.story = e.path
      continue
    }
    if (/^整体[-_]/.test(e.name) && PIC.test(e.name)) set.evos.push(e.path)
  }

  // 星级：`属性-4星-XXX.yaml` 最准；没有就看目录名（示例结构是「四星套装名」「五星套装名」）
  if (/四星|4\s*星/.test(setDir.name)) set.star = '4'
  else if (/五星|5\s*星/.test(setDir.name)) set.star = '5'

  // 目录名本身可能就是套装名。`S0062` 这类编号目录不能当名字 —— 那是 ID，不是套名。
  if (!set.name && !/^S\d+$/i.test(setDir.name)) set.name = setDir.name
  if (!set.name) return null   // 没有 属性/故事 文件、目录名又是纯编号 → 认不出套装名，跳过
  // 一个素材都没有的空壳（或被 isSetDir 误判进来的普通目录）不算套装
  if (!set.busts.length && !set.icons.length && !set.evos.length && !set.yaml && !set.story) return null
  return set
}

/* ────────────────────────────── 写入 ────────────────────────────── */

const pad3 = (n) => String(n).padStart(3, '0')

/**
 * 把一个阁的旧编号「搬」到新编号（修非数字 / 超范围这类脏数据）。
 * 只搬 Pic 目录（艺术字 + 铭牌在那）；其余素材按名称定位，不受编号影响。
 */
function rekeyPool(snap, oldKey, newKey, log) {
  if (!oldKey || oldKey === newKey) return
  const picRoot = path.join(ASSET, uiRoot(), 'UI', 'SysResonance', 'texture', 'Pic')
  const oldPic = path.join(picRoot, oldKey)
  const newPic = path.join(picRoot, newKey)
  if (exists(oldPic) && !exists(newPic)) {
    try {
      fs.renameSync(oldPic, newPic)
      log({ kind: 'warn', text: `编号修正：Pic/${oldKey} → Pic/${newKey}` })
    } catch (e) {
      log({ kind: 'warn', text: `Pic 目录改名失败（不影响其余写入）：${e.message || e}` })
    }
  }
  // 背景图已收进阁目录（`<阁>/背景图.jpg`），不再按编号命名；
  // 视频是按阁名命名的 —— 两者都不用跟着编号搬。
}

/** 阅读物：有元数据头就用现成的，没有就按正文生成 */
function importReading(file, snap) {
  const raw = readText(file)
  if (!raw.trim()) return null
  const titleM = /^《(.+?)》\s*$/m.exec(raw.split('\n')[0] || '') || /^《(.+?)》/.exec(raw)
  const title = titleM ? titleM[1] : path.basename(file, '.txt').replace(/^《|》$/g, '')
  const regionM = /【图鉴分区】\s*(\S+)/.exec(raw)
  const typeM = /【类型】\s*(\S+)/.exec(raw)
  const region = regionM ? (regionM[1].includes('心愿') ? 'wish' : 'yizan') : 'yizan'
  const body = raw
    .replace(/^《.*?》\s*/, '')
    .replace(/【(图鉴分区|编号|类型)】.*$/gm, '')
    .trim()
  if (!body) return null
  if (DIST_MODE) {
    const r = upsertReadingJson({ region, title, body })
    snap.touch(r.file)
    return { file: r.file, id: r.id, dist: true, created: r.created }
  }
  const r = writeReading({ region, title, type: typeM?.[1] || '书籍', body })
  snap.touch(r.file)
  return { ...r, dist: false }
}

/**
 * 按扫描结果一次性写入。
 * @param {{plan:object, snap:object, log:Function, force?:boolean}} p
 */
export async function applyBundle({ plan, snap, log = () => {} }) {
  const notes = []
  const poolIds = []
  let versionTouched = null
  let storyWritten = false
  let readingWritten = false
  /** 这次写出的 `套装库/*.yaml`（发行版跑完管线就删） */
  const suitYamls = []

  const existingMajors = new Map(listMajors().map((m) => [String(m.major), m.name]))

  for (const major of plan.majors) {
    /* ── 大版本 ── */
    const majorNum = String(major.major)
    snap.touch(path.join(ASSET, '信息表', '版本表.csv'))
    if (major.name) {
      const hit = existingMajors.get(majorNum)
      if (hit !== major.name) {
        upsertMajor(majorNum, major.name)
        log({ kind: 'ok', text: hit ? `大版本 ${majorNum} 改名 → ${major.name}` : `大版本 ${majorNum} · ${major.name} 新建` })
      }
    }
    if (major.icon) {
      const dst = path.join(ASSET, '信息表', '大版本图标', `${majorNum}.png`)
      snap.touch(dst)
      archive(snap, [{ src: major.icon, target: dst }])
      notes.push(`大版本 ${majorNum} 图标已收`)
    }

    /* ── 版本 ── */
    for (const ver of major.versions) {
      const cardNoAuto = autoCardNo()
      upsertVersion({
        v: ver.v,
        name: ver.name,
        major: majorNum,
        majorName: major.name || existingMajors.get(majorNum) || '',
        desc: ver.desc || '',
        cardNo: cardNoAuto,
      })
      log({ kind: 'ok', text: `版本：${ver.v} ${ver.name}（大版本 ${majorNum}，卡号 ${cardNoAuto}）` })

      const cardDir = path.join(ASSET, uiRoot(), 'UI', 'Image', 'Card')
      if (ver.card) {
        const dst = path.join(cardDir, `T_UI_Friends_Card_img_${cardNoAuto}.png`)
        snap.touch(dst)
        archive(snap, [{ src: ver.card, target: dst }])
      }
      if (ver.big) {
        const dst = path.join(cardDir, `T_UI_Pear_Card_img_${cardNoAuto}_L.png`)
        snap.touch(dst)
        archive(snap, [{ src: ver.big, target: dst }])
      }
      versionTouched = ver.v

      /* ── 服装阁 ── */
      for (const pool of ver.pools) {
        const idx = readPoolIndex()
        const prev = idx[pool.name]
        // 编号两段区间（001~999 官方 / 1000~9999 自定义）且允许不连续，
        // 只做数值规范化；真的不合法（空 / 0 / 5 位以上）才重新分配。
        let gachaKey = normalizeGacha(prev?.gachaKey)
        let rekeyFrom = ''
        if (!gachaKey) {
          if (String(prev?.gachaKey || '').trim()) rekeyFrom = String(prev.gachaKey)
          gachaKey = nextFreeGacha()
        }
        snap.touch(path.join(ASSET, '信息表', '卡池索引.json'))
        upsertPool(pool.name, {
          version: ver.v, gachaKey,
          star: pool.sets.map((s) => `${s.star}★`).filter((x, i, a) => a.indexOf(x) === i).join('+'),
          type: prev?.type || 'limited',
        })
        if (rekeyFrom) {
          log({ kind: 'warn', text: `「${pool.name}」的旧编号 ${rekeyFrom} 不合规，已重排为 ${gachaKey}` })
          rekeyPool(snap, rekeyFrom, gachaKey, log)
        }
        log({ kind: 'ok', text: `服装阁：${pool.name} → ${gachaKey}` })

        // 素材已按「实体」重构：一座阁一个目录，图片/文案都在里面。
        // 常驻阁的目录名带 `常驻·` 前缀（build-pool-map 靠它判 standard）；
        // 扫描结果里没有 type，沿用索引里已登记的阁型。
        const poolDir = poolDirOf(ver.v, ver.name, pool.name, {
          create: true, standard: prev?.type === 'standard',
        })

        // 背景（1000×500 列表图与 4K 成品都收，collect 的 bg_webp 会自己裁 16:9）
        if (pool.bg) {
          const ext = (path.extname(pool.bg) || '.png').toLowerCase()
          const dst = path.join(poolDir, `背景图${['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png'}`)
          archive(snap, [{ src: pool.bg, target: dst }])
        }
        if (pool.thumb) {
          const dst = path.join(poolDir, '列表缩略图.png')
          archive(snap, [{ src: pool.thumb, target: dst }])
        }
        if (pool.titleArt) {
          const dst = path.join(poolDir, '艺术字.png')
          archive(snap, [{ src: pool.titleArt, target: dst }])
        }
        // 动态背景 / 进入音：按**阁名**存（编号会变，阁名不会），与 jobs.mjs 的「服装阁」任务一致。
        if (pool.video) {
          const ext = (path.extname(pool.video) || '.webm').toLowerCase()
          const dst = path.join(ASSET, '视频', '服装阁动态', `${safeName(pool.name)}${ext === '.mp4' ? '.mp4' : '.webm'}`)
          archive(snap, [{ src: pool.video, target: dst }])
          notes.push(`${pool.name}：动态背景已收`)
        }
        if (pool.audio) {
          const ext = (path.extname(pool.audio) || '.mp3').toLowerCase()
          const dst = path.join(ASSET, '音频', '服装阁进入音', `${safeName(pool.name)}${ext}`)
          archive(snap, [{ src: pool.audio, target: dst }])
          notes.push(`${pool.name}：进入音已收`)
        }
        for (const m of pool.milestones) {
          const dst = path.join(poolDir, '深海回响', safeName(m.name))
          archive(snap, [{ src: m.path, target: dst }])
        }

        /* ── 套装 ── */
        let plateIdx = 0
        for (const set of pool.sets) {
          const sid = resolveSetId(set)
          snap.touch(path.join(ASSET, '信息表', '套装序列.csv'))
          upsertSet({
            id: sid, star: `${set.star}★`, name: set.name,
            pool: pool.name, versionLabel: `${ver.v}${ver.name}`,
          })

          const setDir = path.join(poolDir, set.name)
          // 半身像 / 图标 / 整体图（立绘与进化立绘都折算成阶段整体图）
          writeSetImages({
            snap, setDir,
            busts: set.busts.map((p) => ({ src: p, name: path.basename(p) })),
            icons: set.icons.map((p) => ({ src: p, name: path.basename(p) })),
            ovs: set.evos.map((p) => ({ src: p, name: path.basename(p) })),
            notes,
          })

          // 套装数据（属性 + 文案合并成一份 YAML）→ 素材/套装库/<套装ID>.yaml
          // 发行版里它只是**中转**：管线把信息编进 pool-map 之后就删（见 server.mjs）
          if (set.yaml) {
            const dst = path.join(SUIT_LIB, `${sid}.yaml`)
            archive(snap, [{ src: set.yaml, target: dst }])
            suitYamls.push(dst)
          } else if (set.icons.length) {
            const dst = path.join(SUIT_LIB, `${sid}.yaml`)
            snap.touch(dst)
            writeSuitLibYaml({
              setName: set.name, star: set.star, setId: sid,
              origin: pool.name, firstVersion: `${ver.v}${ver.name}`,
              parts: set.icons.map((p, k) => {
                const base = path.basename(p, path.extname(p))
                const i = base.indexOf('-')
                const head = i > 0 ? base.slice(0, i) : ''
                return {
                  name: i > 0 ? base.slice(i + 1) : base,
                  slot: SLOTS.includes(head) ? head : '饰品·挂饰',
                  id: `${9000000000 + Number(gachaKey) * 100 + k + 1}`,
                }
              }),
            })
            suitYamls.push(dst)
            notes.push(`${set.name}：没给套装 YAML，已按图标生成`)
          }

          // 故事（发行版直写成品 stories.json）
          if (set.story) {
            const body = stripMd(readText(set.story))
            if (body.trim()) {
              if (DIST_MODE) {
                const r = upsertStoryJson({ name: set.name, star: set.star, body })
                snap.touch(r.file)
              } else {
                const dst = writeStory({ name: set.name, star: set.star, body })
                snap.touch(dst)
              }
              storyWritten = true
              notes.push(`故事：${set.name}`)
            }
          }

          // 专属铭牌（按顺序编号，5★ 在前）
          plateIdx += 1
          notes.push(`${set.name}（${set.star}★ ${sid}）：半身像 ${set.busts.length} / 图标 ${set.icons.length}`)
        }

        poolIds.push(`banner-${gachaKey}`)
        log({ kind: 'ok', text: `服装阁 ${pool.name} 归档完成（${pool.sets.length} 套）` })
      }
    }
  }

  /* ── 阅读物 ── */
  const readingResults = []
  for (const f of plan.readings) {
    const r = importReading(f, snap)
    if (r) readingResults.push(r)
  }
  if (readingResults.length) {
    readingWritten = true
    log({
      kind: 'ok',
      text: `阅读物：写入 ${readingResults.length} 篇${DIST_MODE ? '（直接写成品 readings.json）' : ''}`,
    })
  }

  return {
    ok: true, notes,
    poolIds: poolIds.filter(Boolean),
    version: versionTouched,
    readingCount: readingResults.length,
    // 整套导入必然有新素材：转码那一趟照跑
    transcode: true,
    storyWritten,
    readingWritten,
    suitYamls,
  }
}

/**
 * 决定这一套的套装 ID：序列里已有则沿用原 ID、目录名是 S 编号则直接用、都没有则取现有最大 S 编号 + 1。
 */
function resolveSetId(set) {
  const rows = readSetSeq()
  const hit = rows.find((r) => r['套装名'] === set.name && (r['进化等阶'] || '初始') === '初始')
  if (hit && String(hit['套装ID'] || '').trim()) return String(hit['套装ID']).trim()
  if (/^S\d{2,}$/i.test(set.id)) return set.id.toUpperCase()
  let max = 0
  for (const r of rows) {
    const m = /^S(\d+)$/i.exec(String(r['套装ID'] || '').trim())
    if (m) max = Math.max(max, Number(m[1]))
  }
  return `S${String(max + 1).padStart(4, '0')}`
}

/** 版本卡编号：现有最大值 +1（扫 Card 目录，避免撞号） */
function autoCardNo() {
  const vers = readVersionTable()
  let max = 0
  for (const v of vers) {
    const n = Number(String(v.cardNo || '').replace(/\D/g, ''))
    if (n) max = Math.max(max, n)
  }
  const cardDir = path.join(ASSET, uiRoot(), 'UI', 'Image', 'Card')
  if (exists(cardDir)) {
    for (const f of fs.readdirSync(cardDir)) {
      const m = f.match(/img_(\d{3})(?:_[ML]1?)?\.png$/i)
      if (m) max = Math.max(max, Number(m[1]))
    }
  }
  return pad3(max + 1)
}
