/** 五类更新任务：版本 / 服装阁 / 套装 / 故事 / 阅读物 */
import fs from 'node:fs'
import path from 'node:path'
import {
  ASSET, TOOL_ROOT, WORKSPACE, exists, readText, readJson, rel, safeName, uiRoot,
  dataLabel, outLabel, toolLabel,
} from './util.mjs'
import {
  readVersionTable, upsertVersion, upsertMajor, listMajors, upsertPool,
  upsertSet, writeSuitLibYaml, writeStory, writeReading, SLOTS, SUIT_LIB,
  poolDirOf, writeSetImages, normalizeGacha, nextFreeGacha,
  readCustom, markCustom, unmarkCustom, isCustom, renameCustom,
  renamePoolIndex, renameSetSeqPool, renameSetSeqName, removeSetRows, readSetSeq, moveSetToPool,
  upsertStoryJson, upsertReadingJson,
} from './meta.mjs'
import { archive, walkFiles, isMedia } from './archive.mjs'
import { readCopy } from './copy.mjs'

// UI 整包根目录：用 uiRoot() 探测
const UI = uiRoot()
const CARD_DIR = path.join(ASSET, UI, 'UI', 'Image', 'Card')
/** 自建名录：写它之前必须先 snap.touch，否则回滚不回来（改名/移出会留脏名单） */
const CUSTOM_FILE = path.join(ASSET, '信息表', '自建内容.json')
function touchCustom(snap) { snap.touch(CUSTOM_FILE) }
const PIC_DIR = path.join(ASSET, UI, 'UI', 'SysResonance', 'texture', 'Pic')

/** 「这次会写入」清单里的路径前缀：开发版 D = `素材/`、O = `public/assets/`； 发行版 D = `心忆奇想工坊/工具/data/`、O = `心忆共鸣/public/assets/` */
const D = `${dataLabel()}/`
const O = `${outLabel()}/`
// 归档目录（移出套装 / 删掉的素材）落在**工具根**，不是数据根
const T = toolLabel()
/** 发行版模式（启动器设 `NIKKI_DIST_MODE=1`）：差别只有一件事 */
const DIST_MODE = !!process.env.NIKKI_DIST_MODE

/* ────────────────────────────── 工具 ────────────────────────────── */

function maxCardNo() {
  const vers = readVersionTable()
  let max = 0
  for (const v of vers) {
    const n = Number(String(v.cardNo || '').replace(/\D/g, ''))
    if (n) max = Math.max(max, n)
  }
  if (exists(CARD_DIR)) {
    for (const f of fs.readdirSync(CARD_DIR)) {
      const m = f.match(/img_(\d{3})(?:_[ML]1?)?\.png$/i)
      if (m) max = Math.max(max, Number(m[1]))
    }
  }
  return max
}

const pad3 = (n) => String(n).padStart(3, '0')

/** 从 files 里按槽位取文件（setIndex 用于「多套装」重复组） */
function pick(files, slot, setIndex = null) {
  return (files || []).filter(
    (f) => f.slot === slot && (setIndex === null || f.setIndex === setIndex),
  )
}

function one(files, slot, setIndex = null) {
  return pick(files, slot, setIndex)[0] || null
}

/** 这次给的文件里有没有媒体（图 / 视频 / 音频） */
function hasMedia(files) {
  return (files || []).some((f) => isMedia(f.src || f.name))
}

/** 拖进来的 md 常带 `# 标题` 与 `---` 分隔线，正文只留内容本身 */
function stripMd(s) {
  return String(s || '')
    .replace(/\r\n/g, '\n')
    .replace(/^#\s.*(\n|$)/, '')
    .replace(/^\s*-{3,}\s*$/gm, '')
    .trim()
}

/** 现网 pool-map 里这一套的元数据（找不到返回 null）；发行版的 `套装库/*.yaml` 是中转文件， 生成「最小版 YAML」时要把已有的文案 / 五维带上 */
function poolMapSet(name) {
  const pm = readJson(path.join(ASSET, 'pool-map.json'), { banners: [] }) || { banners: [] }
  for (const b of pm.banners || []) {
    const s = (b.sets || []).find((x) => x.name === name)
    if (s) return s
  }
  return null
}

/** 按部件图标生成 `writeSuitLibYaml` 的 parts，并把已有的五维 / 文案沿过来 */
function partsFromIcons(icons, gachaKey, setName) {
  const prev = poolMapSet(setName)
  const byName = new Map((prev?.parts || []).map((p) => [p.name, p]))
  return icons.map((ic, k) => {
    const base = path.basename(String(ic.name || ic.src), path.extname(String(ic.name || ic.src)))
    const i = base.indexOf('-')
    const head = i > 0 ? base.slice(0, i) : ''
    const p = {
      name: i > 0 ? base.slice(i + 1) : base,
      slot: SLOTS.includes(head) ? head : '饰品·挂饰',
      id: `${9000000000 + Number(gachaKey || 0) * 100 + k + 1}`,
    }
    const old = byName.get(p.name)
    if (old?.stats && Object.keys(old.stats).length) p.stats = old.stats
    if (old?.desc) p.desc = old.desc
    return p
  })
}

/** 写一篇套装故事：发行版直写成品 `stories.json`，开发版写 md 交给 `gen-stories.py` */
function saveStory({ snap, name, star, body }) {
  if (DIST_MODE) {
    const r = upsertStoryJson({ name, star, body })
    snap.touch(r.file)
    return { file: r.file, dist: true, created: r.created }
  }
  const dst = path.join(ASSET, '故事', `故事-${star}星-${safeName(name)}.md`)
  snap.touch(dst)
  writeStory({ name, star, body })
  return { file: dst, dist: false }
}

/** 写一篇阅读物。发行版直写成品 `readings.json`（理由同上） */
function saveReading({ snap, region, title, type = '书籍', body }) {
  // 两条路都会 markCustom（拓展包候选按它过滤）→ 自建名录也得进快照
  touchCustom(snap)
  if (DIST_MODE) {
    const r = upsertReadingJson({ region, title, body })
    snap.touch(r.file)
    return { file: r.file, id: r.id, dist: true, created: r.created }
  }
  const r = writeReading({ region, title, type, body })
  snap.touch(r.file)
  return { ...r, dist: false }
}

/* ── 移动 / 移除（编辑已有内容时用；都要能回滚） ── */

/** 删掉一棵子树里的空目录（搬完文件之后收尾；直转模式也靠它清掉没落盘的空壳） */
export function pruneEmpty(root) {
  if (!exists(root)) return
  let entries = []
  try { entries = fs.readdirSync(root, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (e.isDirectory()) pruneEmpty(path.join(root, e.name))
  }
  try { if (fs.readdirSync(root).length === 0) fs.rmdirSync(root) } catch { /* 非空或占用 */ }
}

/** 把目录搬走（`src` → `dst`）并让快照能回滚：快照只认文件级 touch(path)，逐文件记录两侧再搬 */
function moveTree(snap, src, dst) {
  if (!exists(src)) return 0
  const files = walkFiles(src)
  let n = 0
  for (const f of files) {
    const target = path.join(dst, path.relative(src, f))
    snap.touch(f)
    snap.touch(target)
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.renameSync(f, target)
    n += 1
  }
  pruneEmpty(src)
  return n
}

/** 单个文件搬家（改名用） */
function moveFile(snap, src, dst) {
  if (!exists(src) || src === dst) return false
  snap.touch(src)
  snap.touch(dst)
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.renameSync(src, dst)
  return true
}

/** 在磁盘上找一座阁 / 一套服装（pool-map 的兜底）。服装阁的目录结构本身就是权威的（`<版本>/<阁>/<套装>/`） */
function findOnDisk(kind, name) {
  const root = path.join(ASSET, '服装阁')
  if (!exists(root)) return null
  const verDirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory())
  for (const vd of verDirs) {
    const verPath = path.join(root, vd.name)
    const ver = (vd.name.match(/^\d+(?:\.\d+)?/) || [])[0] || ''
    for (const pd of fs.readdirSync(verPath, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const poolPath = path.join(verPath, pd.name)
      const poolName = pd.name.replace(/^常驻·/, '')
      if (kind === 'pool' && pd.name === name) return { version: ver, poolName, poolDir: poolPath }
      if (kind === 'set' && exists(path.join(poolPath, name))) {
        return { version: ver, poolName, poolDir: poolPath, setDir: path.join(poolPath, name) }
      }
    }
  }
  return null
}

/** 服装阁素材落盘：背景 / 缩略图 / 艺术字 / 动态背景 / 进入音 / 深海回响；给了哪张就覆盖哪张，没给的一律不动 */
function writePoolAssets({ snap, poolDir, name, files, notes }) {
  const bg = one(files, 'bg')
  if (bg) {
    const ext = (path.extname(bg.name || bg.src) || '.png').toLowerCase()
    const dst = path.join(poolDir, `背景图${['.png', '.jpg', '.jpeg', '.webp'].includes(ext) ? ext : '.png'}`)
    archive(snap, [{ src: bg.src, target: dst }])
    notes.push(`服装阁背景 → ${rel(dst)}`)
  }

  const thumb = one(files, 'thumb')
  if (thumb) {
    const dst = path.join(poolDir, '列表缩略图.png')
    archive(snap, [{ src: thumb.src, target: dst }])
    notes.push(`列表缩略图 → ${rel(dst)}`)
  }

  const art = one(files, 'titleArt')
  if (art) {
    const dst = path.join(poolDir, '艺术字.png')
    archive(snap, [{ src: art.src, target: dst }])
    notes.push(`艺术字 → ${rel(dst)}`)
  }

  // 动态背景：按**阁名**存，编号改了也不用改名
  const video = one(files, 'video')
  if (video) {
    const ext = (path.extname(video.name || video.src) || '.webm').toLowerCase()
    const dst = path.join(ASSET, '视频', '服装阁动态', `${safeName(name)}${ext === '.mp4' ? '.mp4' : '.webm'}`)
    archive(snap, [{ src: video.src, target: dst }])
    notes.push(`动态背景 → ${rel(dst)}`)
  }

  // 服装阁进入音：按**阁名**存
  const enterSfx = one(files, 'enterSfx')
  if (enterSfx) {
    const ext = (path.extname(enterSfx.name || enterSfx.src) || '.mp3').toLowerCase()
    const dst = path.join(ASSET, '音频', '服装阁进入音', `${safeName(name)}${ext}`)
    archive(snap, [{ src: enterSfx.src, target: dst }])
    notes.push(`进入音 → ${rel(dst)}`)
  }

  // 深海回响奖励图（20~100 抽全池共用一张，这里只收 120 抽之后的）
  for (const m of pick(files, 'milestone')) {
    const dst = path.join(poolDir, '深海回响', safeName(m.name))
    archive(snap, [{ src: m.src, target: dst }])
  }
  if (pick(files, 'milestone').length) notes.push(`深海回响奖励 ${pick(files, 'milestone').length} 张`)
}

/** 服装阁编号规范化：001~999 官方 + 1000~9999 自定义两段并存、允许不连续 */
function normalizeGachaKey(raw) {
  return normalizeGacha(raw)
}

/** 从 `部位-部件名.png` 拆出部件信息：部位优先按文件名前缀判，不认识时退回图鉴固定的部位顺序 */

/* ────────────────────────────── 任务定义 ────────────────────────────── */

const JOBS = {
  /* ── 1. 版本 ───────────────────────────────────────────── */
  version: {
    id: 'version',
    icon: '❖',
    title: '版本',
    subtitle: '新增或修改一个赛季：版本名、大版本归属、介绍文案、版本缩略图与大图',
    fields: [
      { key: 'v', label: '版本号', required: true, placeholder: '2.12', width: 'short' },
      { key: 'name', label: '版本名', required: true, placeholder: '雪落颂愿时' },
      // 大版本：填已有号 = 归到那一版（可顺手改名）；填新号 + 名字 = 新增大版本
      { key: 'major', label: '大版本号', type: 'major', placeholder: '2', width: 'short' },
      { key: 'majorName', label: '大版本名', placeholder: '伊赞之土', width: 'short' },
      { key: 'desc', label: '版本介绍', type: 'textarea', placeholder: '一两句话，显示在版本页底部的文案条上' },
      { key: 'cardNo', label: '版本卡编号', placeholder: '留空自动，如 071', width: 'short' },
    ],
    groups: [
      {
        key: 'art',
        label: '版本图',
        hint: '拖进来的图会按尺寸自动归位',
        slots: [
          { key: 'card', label: '版本缩略图', kinds: ['versionCard'], hint: '672×188，版本栏与图鉴赛季栏都用它' },
          { key: 'big', label: '版本大图', kinds: ['versionBig'], hint: '1532×860，右侧大图' },
          // 大版本图标（版本页左侧那座塔）
          { key: 'majorIcon', label: '大版本图标', kinds: ['majorIcon'], hint: '可选；只在该大版本新建时需要，之后同组共用' },
        ],
      },
    ],
    summary: { 版本: 'v', 版本名: 'name' },
    writes: [
      `${D}信息表/版本表.csv（新增或更新 {v}；大版本名同步到该大版本的所有版本）`,
      `${D}${UI}/UI/Image/Card/T_UI_Friends_Card_img_{cardNo}.png`,
      `${D}${UI}/UI/Image/Card/T_UI_Pear_Card_img_{cardNo}_L.png`,
      `${O}ui/ver/card|big/{v}.webp（重新转码）`,
      `${O}manifest.json（ui.ver.versions / cards / bigCards）`,
    ],
  },

  /* ── 2. 服装阁 ───────────────────────────────────────────── */
  pool: {
    id: 'pool',
    icon: '◈',
    title: '服装阁',
    subtitle: '新建服装阁，或修改工坊自建的那些：背景、缩略图、艺术字、阁内套装',
    fields: [
      {
        key: 'mode', label: '操作', type: 'select', width: 'short', default: 'new',
        options: [['new', '新建服装阁'], ['edit', '修改已建的阁']],
        hint: '只有**工坊自建**的阁能改；官方素材是只读的',
      },
      {
        key: 'target', label: '要修改的阁', type: 'customPools', width: 'short',
        when: { mode: 'edit' }, hint: '选一个自建的阁，下面的字段会按它回填',
      },
      { key: 'version', label: '所属版本', type: 'versions', required: true, width: 'short' },
      { key: 'name', label: '服装阁名', required: true, placeholder: '雪落颂愿时' },
      { key: 'gachaKey', label: '服装阁编号', placeholder: '留空自动；从 500 起取空号（001~499 留给官方）', width: 'short' },
      { key: 'type', label: '阁型', type: 'select', options: [['limited', '限定'], ['standard', '常驻'], ['custom', '自定义']], default: 'limited', width: 'short' },
      { key: 'typeName', label: '自定义阁型名', placeholder: '选了「自定义」才填，如 联动 / 复刻', width: 'short' },
      {
        key: 'setRemove', label: '移出阁内的套装', type: 'setlist', when: { mode: 'edit' },
        hint: '勾选的套装会连同目录、序列行一起移到「{T}归档素材/」下（可回滚）',
      },
      {
        key: 'setAdd', label: '追加已有套装', type: 'customSets', when: { mode: 'edit' },
        hint: '把库里另一套自建服装挪进这座阁；新建套装仍走左侧「套装」任务',
      },
    ],
    groups: [
      {
        key: 'poolArt',
        label: '服装阁素材',
        slots: [
          { key: 'bg', label: '服装阁背景', kinds: ['bannerBg'], hint: '1920×1080；或 1000×500 的列表图（自动裁 16:9 放大）' },
          { key: 'thumb', label: '列表缩略图', kinds: ['bannerThumb'], hint: '不填就用背景图中心裁一张' },
          { key: 'titleArt', label: '服装阁名艺术字', kinds: ['titleArt'], hint: '透明底书法字，不填则显示纯文字标题' },
          { key: 'video', label: '动态背景（视频）', kinds: ['bannerVideo'], hint: 'webm / mp4，循环播放；不填则用静态背景' },
          { key: 'enterSfx', label: '服装阁进入音（音频）', kinds: ['bannerEnter'], hint: '进阁时那一下的音效；不填则按阁名自动匹配官方进入音' },
          // 20~100 抽在所有五星池里是同一件「流光自选礼盒」（共用一张图），只有 120 抽起要单独给
          { key: 'milestone', label: '深海回响奖励图', kinds: ['milestone'], multiple: true, hint: '只放 120 抽及之后的，文件名「120抽-XXX.png」；20~100 抽已共用一张' },
        ],
      },
      {
        key: 'sets',
        label: '阁内套装',
        repeat: true,
        hint: '一座阁通常 1 套 5★ + 1 套 4★；铭牌按这里的顺序编号（5★ 在前）',
        slots: [
          { key: 'ov', label: '整体图（OV）', kinds: ['setPortrait', 'setCardEvo', 'awaken'], multiple: true,
            hint: '整体-初始/焕新/一进/二进/满进.png；也可直接丢「套装立绘」或「进化LVn」——都按阶段归位' },
          { key: 'bust', label: '部件试穿图（半身像）', kinds: ['setBust'], multiple: true, hint: '520×724，文件名 = 部位-部件名；图鉴详情页的部件大图' },
          { key: 'icons', label: '部件图标', kinds: ['partIcon'], multiple: true, hint: '一次拖整个「图标」文件夹，文件名 = 部位-部件名' },
          { key: 'suitLib', label: '套装数据（YAML）', kinds: ['suitYaml'], hint: '属性 + 文案合并成的一份 YAML；不给则按图标生成最小版' },
          { key: 'plate', label: '专属铭牌', kinds: ['namePlate'], multiple: true, hint: '可选，按套装顺序编号' },
          { key: 'story', label: '套装故事 (.md)', kinds: ['story'], hint: '可选，拖 .md 进来就一并写入' },
        ],
      },
    ],
    summary: { 服装阁: 'name', 版本: 'version' },
    writes: [
      `${D}信息表/服装阁索引.json（{name} → 版本 {version} / 编号 {gachaKey} / 阁型 {type}）`,
      `${D}信息表/自建内容.json（登记为自建；只有自建内容能在工坊里改）`,
      `${D}信息表/套装序列.csv（阁内每套追加一行）`,
      `${D}服装阁/{version}·…/{name}/（背景图 / 列表缩略图 / 艺术字 / 深海回响 / 套装）`,
      `${D}视频/服装阁动态/{name}.webm|mp4（动态背景）`,
      `${D}套装库/{套装ID}.yaml（属性 + 文案）`,
      `${D}${UI}/UI/SysResonance/texture/Pic/{gachaKey}/（铭牌）`,
      `${O}manifest.json · ${O}**（转码）`,
    ],
  },

  /* ── 3. 套装 ───────────────────────────────────────────── */
  suit: {
    id: 'suit',
    icon: '✿',
    title: '套装',
    subtitle: '新建套装挂进已有服装阁，或修改工坊自建的那几套',
    fields: [
      {
        key: 'mode', label: '操作', type: 'select', width: 'short', default: 'new',
        options: [['new', '新建套装'], ['edit', '修改已建的套装']],
        hint: '只有**工坊自建**的套装能改',
      },
      {
        key: 'target', label: '要修改的套装', type: 'customSets', width: 'short',
        when: { mode: 'edit' }, hint: '选一套自建的，下面的字段会按它回填',
      },
      { key: 'version', label: '所属版本', type: 'versions', required: true, width: 'short' },
      { key: 'pool', label: '所属服装阁', type: 'pools', required: true, dependsOn: 'version' },
      { key: 'name', label: '套装名', required: true, placeholder: '绽若颂愿心' },
      { key: 'star', label: '星级', type: 'select', options: [['5', '5★'], ['4', '4★']], default: '5', width: 'short' },
      { key: 'setId', label: '套装ID', placeholder: 'S0438 / 留空自动', width: 'short' },
    ],
    groups: [
      {
        key: 'suitArt',
        label: '套装素材',
        slots: [
          { key: 'ov', label: '整体图（OV）', kinds: ['setPortrait', 'setCardEvo', 'awaken'], multiple: true,
            hint: '整体-初始/焕新/一进/二进/满进.png；也可直接丢「套装立绘」或「进化LVn」' },
          { key: 'bust', label: '部件试穿图（半身像）', kinds: ['setBust'], multiple: true, hint: '520×724，文件名 = 部位-部件名' },
          { key: 'icons', label: '部件图标', kinds: ['partIcon'], multiple: true, hint: '整个「图标」文件夹拖进来，文件名 = 部位-部件名' },
          { key: 'suitLib', label: '套装数据（YAML）', kinds: ['suitYaml'], hint: '属性 + 文案合并成的一份 YAML' },
          { key: 'story', label: '套装故事 (.md)', kinds: ['story'], hint: '可选，拖 .md 进来就一并写入' },
        ],
      },
    ],
    summary: { 套装: 'name', 阁: 'pool' },
    writes: [
      `${D}信息表/套装序列.csv（{name} 追加一行）`,
      `${D}信息表/自建内容.json（登记为自建；只有自建内容能在工坊里改）`,
      `${D}服装阁/{version}·…/{pool}/{name}/（整体图 / 半身像 / 图标）`,
      `${D}套装库/{套装ID}.yaml（属性 + 文案）`,
      `${O}sets/…（转码）· manifest.json`,
    ],
  },

  /* ── 4. 故事 ───────────────────────────────────────────── */
  story: {
    id: 'story',
    icon: '❦',
    title: '故事',
    subtitle: '套装故事：一段正文，进「故事图鉴」按套装编号排列',
    fields: [
      { key: 'name', label: '套装名', required: true, type: 'sets', placeholder: '与套装名完全一致才能挂上' },
      { key: 'star', label: '星级', type: 'select', options: [['5', '5★'], ['4', '4★']], default: '5', width: 'short' },
      // 搜索框：拖 md 进来或手动挑套装都行，放在「星级」右边
      // 不是写入字段
      { key: 'setSearch', label: '搜索套装', type: 'setsearch',
        placeholder: '套装名或星级（如 5、雪境）' },
      { key: 'body', label: '故事正文', type: 'textarea', tall: true, placeholder: '直接粘贴正文；也可以拖一个 .md 进来' },
    ],
    groups: [
      {
        key: 'storyFile',
        label: '故事文件',
        hint: '有现成的 .md 直接拖进来，正文填不填都行',
        slots: [{ key: 'storyMd', label: '故事 Markdown', kinds: ['story'] }],
      },
    ],
    summary: { 故事: 'name' },
    writes: [
      `${D}故事/故事-{star}星-{name}.md`,
      `${O}data/stories.json（重新生成，故事图鉴运行时读它）`,
    ],
  },

  /* ── 5. 整套导入 ─────────────────────────────── */
  bundle: {
    id: 'bundle',
    icon: '⧉',
    title: '整套导入',
    subtitle: '指向一个整理好的文件夹，一次写完「大版本 + 版本 + 服装阁 + 套装 + 故事 + 阅读物」',
    fields: [
      {
        key: 'root', label: '文件夹路径', required: true,
        placeholder: 'D://…//素材//示例（也可以直接把文件夹拖进来：只读路径，不复制）',
        hint: '结构：大版本名 / 版本号+版本名 / 服装阁名 / S编号 / …；'
          + '指到**任意一层**都能认（只给服装阁这一层会列进下面的「待补归属」）',
      },
      { key: 'majorName', label: '大版本名（可改）', width: 'short', placeholder: '留空按文件夹名' },
      { key: 'majorNo', label: '大版本号（可改）', width: 'short', placeholder: '留空按版本号推断' },
    ],
    groups: [],
    summary: { 导入: 'root' },
    writes: [
      `${D}信息表/版本表.csv（版本 + 大版本名）`,
      `${D}信息表/服装阁索引.json（服装阁 → 编号）`,
      `${D}信息表/套装序列.csv（每套追加一行）`,
      `${D}服装阁/{版本}·{版本名}/{阁}/（背景 / 缩略图 / 艺术字 / 深海回响）`,
      `${D}服装阁/{版本}·{版本名}/{阁}/{套装}/（整体图 / 半身像 / 图标）`,
      `${D}套装库/{套装ID}.yaml · ${D}故事/ · ${D}阅读物/`,
      '一次「写入并更新」跑完整条管线',
    ],
  },

  /* ── 6. 阅读物 ─────────────────────────────────────────── */
  reading: {
    id: 'reading',
    icon: '❧',
    title: '阅读物',
    subtitle: '书籍 / 信件 / 告示：正文 + 区域，进「阅读物图鉴」',
    fields: [
      { key: 'title', label: '书名', required: true, placeholder: '《关于尾巴的烦恼》' },
      { key: 'region', label: '图鉴分区', type: 'select', options: [['wish', '心愿原野'], ['yizan', '伊赞之土']], default: 'yizan', width: 'short' },
      { key: 'type', label: '类型', type: 'select', options: [['书籍', '书籍'], ['信件', '信件'], ['告示', '告示'], ['手记', '手记']], default: '书籍', width: 'short' },
      { key: 'body', label: '正文', type: 'textarea', tall: true, placeholder: '直接粘贴；也可以拖一个 .txt 进来' },
    ],
    groups: [
      {
        key: 'readingFile',
        label: '阅读物文件',
        hint: '有现成 txt 直接拖进来',
        slots: [{ key: 'readingTxt', label: '阅读物 txt', kinds: ['reading'] }],
      },
    ],
    summary: { 阅读物: 'title' },
    writes: [
      `${D}阅读物/{region}/{title}.txt`,
      `${O}data/readings.json（重新生成，阅读物图鉴运行时读它）`,
    ],
  },
}

/* ────────────────────────────── 表单辅助数据 ────────────────────────────── */

/** 把 `文案.json` 的 `updater.jobs` 覆盖到任务定义上（`title` / `subtitle` / `fields.*` / `groups.*` / `writes[]`）， 每次从 `JOBS` 深拷贝出发，json 缺某个键时保留代码里的原文 */
export function jobsWithCopy() {
  const jobs = structuredClone(JOBS)
  const c = readCopy()?.updater?.jobs
  if (!c) return jobs
  for (const [id, over] of Object.entries(c)) {
    const job = jobs[id]
    if (!job || !over || typeof over !== 'object') continue
    if (over.title) job.title = over.title
    if (over.subtitle) job.subtitle = over.subtitle

    for (const f of job.fields || []) {
      const o = over.fields?.[f.key]
      if (!o) continue
      for (const k of ['label', 'placeholder', 'hint']) {
        if (typeof o[k] === 'string' && o[k]) f[k] = o[k]
      }
    }
    for (const g of job.groups || []) {
      const o = over.groups?.[g.key]
      if (!o) continue
      if (o.label) g.label = o.label
      if (typeof o.hint === 'string' && o.hint) g.hint = o.hint
      for (const s of g.slots || []) {
        const so = o.slots?.[s.key]
        if (!so) continue
        if (so.label) s.label = so.label
        if (typeof so.hint === 'string' && so.hint) s.hint = so.hint
      }
    }
    // `writesDist`：发行版的「这次会写入」和开发版不是一回事（媒体直转成品
    if (DIST_MODE && Array.isArray(over.writesDist) && over.writesDist.length) job.writes = over.writesDist
    else if (Array.isArray(over.writes) && over.writes.length) job.writes = over.writes
  }
  // 写入清单里的路径前缀：`{D}` / `{O}` 是**布局占位符**，在服务端换成真实目录名
  // 必须在**服务端**替换：前端 `fillTemplate()` 只认表单字段
  for (const job of Object.values(jobs)) {
    if (!Array.isArray(job.writes)) continue
    job.writes = job.writes.map((w) => String(w).replace(/\{D\}|\{O\}|\{T\}/g,
      (m) => (m === '{D}' ? D : m === '{O}' ? O : T)))
  }
  return jobs
}

/** 给前端下拉用：版本列表 + 池列表 + 自建名单（带编辑表单要回填的字段）；只有自建名单里的能进「修改」模式 */
export function formOptions() {
  const vers = readVersionTable()
  const pm = readJson(path.join(ASSET, 'pool-map.json'), { banners: [] }) || { banners: [] }
  const pools = (pm.banners || []).map((b) => ({
    name: b.name, id: b.id, version: b.version, gachaKey: b.gachaKey, type: b.type || 'limited',
    sets: (b.sets || []).map((s) => s.name),
  }))

  const custom = readCustom()
  const byName = new Map(pools.map((p) => [p.name, p]))
  const seq = readSetSeq()

  /** 套装清单：按套装序号排列（带 `seq/id/star/version/pool`）；未登记进 CSV 的自建套装 seq=0，统一排最后 */
  const seqOf = new Map()
  for (const r of seq) {
    const n = String(r['套装名'] || '').trim()
    if (!n || (r['进化等阶'] || '初始') !== '初始') continue
    const no = Number(String(r['序号'] || '').replace(/\D/g, ''))
    if (no) seqOf.set(n, no)
  }
  const ownerOf = new Map()
  for (const b of pm.banners || []) {
    for (const s of b.sets || []) {
      if (!ownerOf.has(s.name)) ownerOf.set(s.name, b)
    }
  }
  const suitList = [...ownerOf.keys()].map((name) => {
    const b = ownerOf.get(name)
    const row = seq.find((r) => r['套装名'] === name && (r['进化等阶'] || '初始') === '初始')
    return {
      name,
      seq: seqOf.get(name) || 0,
      id: String(row?.['套装ID'] || ''),
      star: String(row?.['星级'] || '').replace(/\D/g, ''),
      version: b?.version || '',
      pool: b?.name || '',
    }
  }).sort((a, b) => (a.seq || 99999) - (b.seq || 99999) || a.name.localeCompare(b.name, 'zh-Hans-CN'))
  const suitNames = suitList.map((s) => s.name)

  const customPools = custom.pools
    .map((n) => byName.get(n))
    .filter(Boolean)
    .map((p) => ({
      name: p.name, version: p.version, gachaKey: p.gachaKey, type: p.type, sets: p.sets,
    }))
  const customSets = custom.sets
    .map((n) => {
      const owner = pools.find((p) => p.sets.includes(n))
      const row = seq.find((r) => r['套装名'] === n && (r['进化等阶'] || '初始') === '初始')
      return {
        name: n,
        star: String(row?.['星级'] || '5★').replace(/\D/g, '') || '5',
        id: String(row?.['套装ID'] || ''),
        pool: owner?.name || '',
        version: owner?.version || '',
      }
    })
    .filter((s) => s.pool)   // 已经不在任何阁里的（被移出）就不列了

  return {
    versions: vers, majors: listMajors(), pools, suitNames, suitList, slots: SLOTS,
    custom: { pools: custom.pools, sets: custom.sets },
    customPools, customSets,
  }
}

/* ────────────────────────────── 执行 ────────────────────────────── */

/** 应用一个任务 */
export async function applyJob({ job, fields, files = [], snap, log = () => {} }) {
  const def = JOBS[job]
  if (!def) throw new Error('未知任务：' + job)

  const notes = []
  const poolIds = []
  let versionTouched = null
  /** 这次新建了一个版本行？新版本的卡图/大图产物不存在，必须跑一趟转码补默认图 */
  let versionCreated = false
  /** 这次有没有给媒体文件 */
  let mediaTouched = hasMedia(files)
  /** 这次写了故事 / 阅读物？只有写了才需要重算对应的 JSON */
  let storyWritten = false
  let readingWritten = false
  /** 这次写出的 `套装库/*.yaml` */
  const suitYamls = []

  /* ── 版本 ── */
  if (job === 'version') {
    const v = String(fields.v || '').trim()
    if (!v) throw new Error('版本号必填')
    const major = String(fields.major || v.split('.')[0]).trim() || v.split('.')[0]
    const majorName = String(fields.majorName || '').trim()
    let cardNo = String(fields.cardNo || '').replace(/\D/g, '')
    if (!cardNo) {
      cardNo = pad3(maxCardNo() + 1)
      notes.push(`版本卡编号留空 → 自动取 ${cardNo}`)
    }
    snap.touch(path.join(ASSET, '信息表', '版本表.csv'))
    // 大版本名是冗余列：给了名字就同步到该大版本下所有版本（新号 = 顺手新建一个大版本）
    if (majorName) {
      const { hit } = upsertMajor(major, majorName)
      notes.push(hit ? `大版本 ${major} 改名 → ${majorName}（影响 ${hit} 个版本）` : `大版本 ${major} · ${majorName} 新建`)
    }
    const prev = readVersionTable().find((x) => x.v === v)
    versionCreated = !prev
    upsertVersion({
      v, name: String(fields.name || '').trim(), major,
      majorName: majorName || prev?.majorName || '',
      desc: String(fields.desc || '').trim(), cardNo,
    })
    log({ kind: 'ok', text: `版本表已写入：${v} ${fields.name || ''}（卡号 ${cardNo}，大版本 ${major}）` })

    // 版本图
    const card = one(files, 'card')
    const big = one(files, 'big')
    if (card) {
      const dst = path.join(CARD_DIR, `T_UI_Friends_Card_img_${cardNo}.png`)
      snap.touch(dst)
      archive(snap, [{ src: card.src, target: dst }])
      notes.push(`版本缩略图 → ${rel(dst)}`)
    }
    if (big) {
      const dst = path.join(CARD_DIR, `T_UI_Pear_Card_img_${cardNo}_L.png`)
      snap.touch(dst)
      archive(snap, [{ src: big.src, target: dst }])
      notes.push(`版本大图 → ${rel(dst)}`)
    }
    // 大版本图标（版本页左侧的塔）：按大版本号存，同组共用一个
    const majorIcon = one(files, 'majorIcon')
    if (majorIcon) {
      const dst = path.join(ASSET, '信息表', '大版本图标', `${major}.png`)
      snap.touch(dst)
      archive(snap, [{ src: majorIcon.src, target: dst }])
      notes.push(`大版本 ${major} 图标 → ${rel(dst)}`)
    }
    versionTouched = v
  }

  /* ── 服装阁：修改已有（只允许自建内容） ── */
  if (job === 'pool' && String(fields.mode || 'new') === 'edit') {
    const target = String(fields.target || '').trim()
    if (!target) throw new Error('请先选一个要修改的服装阁')
    if (!isCustom('pools', target)) {
      throw new Error(`「${target}」不是工坊自建内容，不能就地修改（官方素材是只读的）`)
    }

    const pm = readJson(path.join(ASSET, 'pool-map.json'), { banners: [] }) || { banners: [] }
    let old = (pm.banners || []).find((b) => b.name === target)
    if (!old) {
      // 刚建完还没跑管线 → pool-map 里没有，退回磁盘扫描
      const disk = findOnDisk('pool', target)
      if (!disk) throw new Error('找不到这座阁（素材里没有对应目录）')
      old = {
        name: target, version: disk.version, versionName: disk.version,
        gachaKey: '', type: 'limited', star: '', sets: [],
      }
      notes.push('pool-map 里还没有这座阁，按磁盘目录推断（首次改完会补齐）')
    }

    const version = String(fields.version || old.version).trim()
    const name = String(fields.name || target).trim()
    const vers = readVersionTable()
    const versionName = vers.find((x) => x.v === version)?.name || version

    let poolType = String(fields.type || old.type || 'limited').trim() || 'limited'
    if (poolType === 'custom') {
      poolType = String(fields.typeName || '').trim() || '限定'
      notes.push(`阁型 → 自定义「${poolType}」`)
    }

    const oldDir = poolDirOf(old.version, old.versionName || old.version, target,
      { standard: (old.type || 'limited') === 'standard' })
    const newDir = poolDirOf(version, versionName, name, { create: true, standard: poolType === 'standard' })

    // ① 目录搬迁：改名或换版本，都是同一个「阁目录整体搬家」
    if (oldDir !== newDir) {
      if (exists(newDir) && fs.readdirSync(newDir).length) {
        throw new Error(`目标目录已存在且不为空：${rel(newDir)}`)
      }
      const moved = moveTree(snap, oldDir, newDir)
      snap.trackDir(newDir)
      notes.push(`阁目录 → ${rel(newDir)}（搬入 ${moved} 个文件）`)
    }

    // ② 编号：铭牌目录与文件名里的编号都跟着换
    const gachaKey = normalizeGachaKey(fields.gachaKey) || normalizeGachaKey(old.gachaKey)
    if (!gachaKey) throw new Error('服装阁编号无效')
    const oldKey = normalizeGachaKey(old.gachaKey)
    if (oldKey && gachaKey !== oldKey) {
      const picOld = path.join(PIC_DIR, oldKey)
      const picNew = path.join(PIC_DIR, gachaKey)
      if (exists(picOld)) {
        if (exists(picNew)) throw new Error(`编号 ${gachaKey} 的铭牌目录已存在：${rel(picNew)}`)
        moveTree(snap, picOld, picNew)
        for (const f of walkFiles(picNew)) {
          if (!f.includes(`_${oldKey}_`)) continue
          moveFile(snap, f, f.replace(`_${oldKey}_`, `_${gachaKey}_`))
        }
      }
      notes.push(`服装阁编号 ${oldKey} → ${gachaKey}`)
      // 产物是按**编号**命名的（`banners/bg/<key>.webp`、`video/<key>.mp4`…）
      // 换了编号就必须重转一遍，否则新编号在成品里一个文件都没有 → 前端 404
      mediaTouched = true
    }

    if (name !== target) {
      for (const ext of ['.webm', '.mp4']) {
        moveFile(snap, path.join(ASSET, '视频', '服装阁动态', `${safeName(target)}${ext}`),
          path.join(ASSET, '视频', '服装阁动态', `${safeName(name)}${ext}`))
      }
      for (const ext of ['.mp3', '.wav', '.ogg', '.m4a', '.flac']) {
        moveFile(snap, path.join(ASSET, '音频', '服装阁进入音', `${safeName(target)}${ext}`),
          path.join(ASSET, '音频', '服装阁进入音', `${safeName(name)}${ext}`))
      }
    }

    // ④ 索引 / 序列 / 自建名录
    snap.touch(path.join(ASSET, '信息表', '服装阁索引.json'))
    if (name !== target) {
      renamePoolIndex(target, name)
      touchCustom(snap)
      renameCustom('pools', target, name)
      const hit = renameSetSeqPool(target, name)
      notes.push(`服装阁改名：${target} → ${name}${hit ? `（序列 ${hit} 行跟着改）` : ''}`)
    }
    upsertPool(name, { version, gachaKey, star: old.star || '', type: poolType })
    log({ kind: 'ok', text: `服装阁索引：${name} → 编号 ${gachaKey}` })

    // ⑤ 素材：给了哪张就换哪张，没给的一律不动
    writePoolAssets({ snap, poolDir: newDir, name, files, notes })

    // ⑥ 移出套装：目录进「归档素材」，序列行删除，YAML / 故事一起归档
    const dropDir = path.join(WORKSPACE, '归档素材', `${new Date().toISOString().slice(0, 10)}-移出套装`)
    for (const sName of String(fields.setRemove || '').split(',').map((s) => s.trim()).filter(Boolean)) {
      const from = path.join(newDir, sName)
      // 目录在就算数：pool-map 是上一次管线的快照，刚追加进来的套装还没进去
      if (!exists(from) && !(old.sets || []).some((s) => s.name === sName)) {
        notes.push(`⚠ 阁内没有「${sName}」，已跳过`)
        continue
      }
      const to = path.join(dropDir, sName)
      if (exists(from)) {
        if (exists(to)) throw new Error(`归档目录已有同名套装：${rel(to)}`)
        moveTree(snap, from, to)
      }
      const removed = removeSetRows(sName)
      touchCustom(snap)
      unmarkCustom('sets', sName)
      notes.push(`移出套装「${sName}」→ ${rel(to)}${removed ? `（序列 -${removed} 行）` : ''}`)
    }

    // ⑦ 追加套装：把库里另一套（自建）挪进来
    const addName = String(fields.setAdd || '').trim()
    if (addName) {
      const owner = (pm.banners || []).find((b) => (b.sets || []).some((s) => s.name === addName))
      if (owner && owner.name !== name) {
        const from = path.join(
          poolDirOf(owner.version, owner.versionName || owner.version, owner.name,
            { standard: (owner.type || 'limited') === 'standard' }), addName)
        const to = path.join(newDir, addName)
        if (exists(from)) {
          if (exists(to)) throw new Error(`本阁已有同名套装：${addName}`)
          const moved = moveTree(snap, from, to)
          if (!moved) fs.mkdirSync(to, { recursive: true })
          const hit = moveSetToPool(addName, name, `${version}${versionName}`)
          notes.push(`追加套装「${addName}」← 「${owner.name}」（${moved} 个文件${hit ? '' : '，序列里没找到初始行'}）`)
        } else {
          notes.push(`⚠ 追加套装「${addName}」：在「${owner.name}」下找不到目录，已跳过`)
        }
      } else if (owner && owner.name === name) {
        notes.push(`「${addName}」本来就在这座阁里`)
      } else if (!owner) {
        notes.push(`⚠ 追加套装「${addName}」：库里找不到这套所属的阁（先跑一次管线）`)
      }
    }

    poolIds.push(`banner-${gachaKey}`)
    versionTouched = version
    log({ kind: 'ok', text: `服装阁 ${name} 已更新（${rel(newDir)}）` })
  }

  /* ── 服装阁 ── */
  if (job === 'pool' && String(fields.mode || 'new') !== 'edit') {
    const version = String(fields.version || '').trim()
    const name = String(fields.name || '').trim()
    if (!version || !name) throw new Error('版本与服装阁名必填')

    const vers = readVersionTable()
    const vMeta = vers.find((x) => x.v === version)
    const versionName = vMeta?.name || version

    // 阁型：内置「限定 / 常驻」，或工坊自定义（type=custom + typeName）
    let poolType = String(fields.type || 'limited').trim() || 'limited'
    if (poolType === 'custom') {
      poolType = String(fields.typeName || '').trim() || '限定'
      notes.push(`阁型 → 自定义「${poolType}」`)
    }
    const isStandard = poolType === 'standard'

    let gachaKey = normalizeGachaKey(fields.gachaKey)
    if (!gachaKey) {
      if (String(fields.gachaKey || '').trim()) {
        notes.push(`⚠ 编号「${fields.gachaKey}」不在 001~9999 内，已按自动编号重排`)
      }
      gachaKey = nextFreeGacha()
      notes.push(`服装阁编号留空 → 自动取 ${gachaKey}`)
    }

    // 素材已按「实体」重构：一座阁就是一个目录
    // 背景 / 缩略图 / 艺术字 / 深海回响 / 套装全在同一层
    const poolDir = poolDirOf(version, versionName, name, { create: true, standard: isStandard })

    snap.touch(path.join(ASSET, '信息表', '服装阁索引.json'))
    upsertPool(name, { version, gachaKey, star: '', type: poolType })
    log({ kind: 'ok', text: `服装阁索引：${name} → 编号 ${gachaKey}（id banner-${gachaKey}）` })

    // 背景 / 缩略图 / 艺术字 / 动态背景 / 进入音 / 深海回响（与「修改」共用同一段落盘）
    writePoolAssets({ snap, poolDir, name, files, notes })
    if (!one(files, 'bg') && !['背景图.jpg', '背景图.png', '背景图.webp']
      .some((f) => exists(path.join(poolDir, f)))) {
      notes.push('⚠ 没给服装阁背景：共鸣页会用深色渐变兜底')
    }

    // 套装
    const setCount = Number(fields.setCount || 0)
    let plateIdx = 0
    for (let i = 0; i < setCount; i++) {
      const setName = String(fields[`set${i}Name`] || '').trim()
      if (!setName) continue
      const star = String(fields[`set${i}Star`] || '5')
      const setId = String(fields[`set${i}Id`] || '').trim() || autoSetId(name, i)
      const setDir = path.join(poolDir, setName)

      snap.touch(path.join(ASSET, '信息表', '套装序列.csv'))
      upsertSet({ id: setId, star: `${star}★`, name: setName, pool: name, versionLabel: `${version}${versionName}` })

      const ovs = pick(files, 'ov', i)
      const busts = pick(files, 'bust', i)
      const icons = pick(files, 'icons', i)
      writeSetImages({ snap, setDir, busts, icons, ovs, notes })

      // 套装数据（属性 + 文案已合并成一份 YAML）→ 素材/套装库/<套装ID>.yaml
      const lib = one(files, 'suitLib', i)
      if (lib) {
        const dst = path.join(SUIT_LIB, `${setId}.yaml`)
        archive(snap, [{ src: lib.src, target: dst }])
        suitYamls.push(dst)
        notes.push(`${setName}：套装 YAML 已收 → ${setId}.yaml`)
      } else if (icons.length) {
        const dst = path.join(SUIT_LIB, `${setId}.yaml`)
        snap.touch(dst)
        // 已有的文案 / 五维沿着旧的走：这份 YAML 只是中转
        const prevSet = poolMapSet(setName)
        writeSuitLibYaml({
          setName, star, setId,
          origin: name, firstVersion: `${version}${versionName}`,
          desc: prevSet?.desc || '', styles: prevSet?.styles || [],
          parts: partsFromIcons(icons, gachaKey, setName),
        })
        suitYamls.push(dst)
        notes.push(`${setName}：未给套装 YAML → 按图标生成（沿用已有五维/文案）`)
      }

      // 套装故事
      const storyFile = one(files, 'story', i)
      if (storyFile) {
        const body = stripMd(readText(storyFile.src))
        if (body.trim()) {
          const r = saveStory({ snap, name: setName, star, body })
          storyWritten = true
          notes.push(`${setName}：故事已写入${r.dist ? '（直写成品）' : ''}`)
        }
      }

      // 专属铭牌：按套装顺序编号（5★ 在前，由前端排序后传入）
      for (const p of pick(files, 'plate', i)) {
        plateIdx += 1
        const dst = path.join(PIC_DIR, gachaKey, `T_UI_resonance_gacha_${gachaKey}_name0${plateIdx}.png`)
        archive(snap, [{ src: p.src, target: dst }])
      }

      notes.push(`${setName}（${star}★，${setId}）已归档`)
      touchCustom(snap)
      markCustom('sets', setName)
    }

    // 新建的阁与套装登记进「自建内容」白名单
    touchCustom(snap)
    markCustom('pools', name)
    snap.trackDir(poolDir)
    poolIds.push(`banner-${gachaKey}`)
    versionTouched = version
    log({ kind: 'ok', text: `服装阁 ${name} 已归档到 ${rel(poolDir)}` })
  }

  /* ── 套装：修改已有（只允许自建内容） ── */
  if (job === 'suit' && String(fields.mode || 'new') === 'edit') {
    const target = String(fields.target || '').trim()
    if (!target) throw new Error('请先选一套要修改的套装')
    if (!isCustom('sets', target)) {
      throw new Error(`「${target}」不是工坊自建套装，不能就地修改（官方素材是只读的）`)
    }

    const pm = readJson(path.join(ASSET, 'pool-map.json'), { banners: [] }) || { banners: [] }
    let owner = (pm.banners || []).find((b) => (b.sets || []).some((s) => s.name === target))
    const ownerFromMap = !!owner
    if (!owner) {
      const disk = findOnDisk('set', target)
      if (!disk) throw new Error('找不到这套服装（素材里没有对应目录）')
      owner = {
        id: '', name: disk.poolName, version: disk.version, versionName: disk.version,
        gachaKey: '', type: 'limited', sets: [{ name: target }],
      }
      notes.push('pool-map 里还没有这套服装，按磁盘目录推断')
    }

    const version = String(fields.version || owner.version).trim()
    const poolName = String(fields.pool || owner.name).trim()
    const setName = String(fields.name || target).trim()
    const star = String(fields.star || '5').replace(/\D/g, '') || '5'
    const vers = readVersionTable()
    const versionName = vers.find((x) => x.v === version)?.name || version
    const versionLabel = `${version}${versionName}`

    const destPool = (pm.banners || []).find((b) => b.name === poolName) || owner
    const fromDir = path.join(
      poolDirOf(owner.version, owner.versionName || owner.version, owner.name,
        { standard: (owner.type || 'limited') === 'standard' }), target)
    const toDir = path.join(
      poolDirOf(destPool.version, destPool.versionName || destPool.version, destPool.name,
        { standard: (destPool.type || 'limited') === 'standard' }), setName)

    /** 源目录可能**本来就不存在**：发行版直转模式下工坊数据目录里只有空壳 */
    const hasSourceDir = exists(fromDir)
    if (!hasSourceDir && !ownerFromMap) throw new Error(`找不到套装目录：${rel(fromDir)}`)

    // ① 目录：改名和换阁都是整体搬家（源不在时只建新目录，文件靠后面的 writeSetImages 落）
    if (fromDir !== toDir) {
      if (exists(toDir)) throw new Error(`目标目录已存在：${rel(toDir)}`)
      if (hasSourceDir) {
        const moved = moveTree(snap, fromDir, toDir)
        notes.push(`套装目录 → ${rel(toDir)}（搬入 ${moved} 个文件）`)
      } else {
        fs.mkdirSync(toDir, { recursive: true })
        notes.push(`套装目录 → ${rel(toDir)}（源不在本地，只更新索引）`)
      }
      snap.trackDir(toDir)
    }

    // ② 套装 ID：YAML 按 ID 命名，换了就要跟着改
    const seq = readSetSeq()
    const oldRow = seq.find((r) => r['套装名'] === target && (r['进化等阶'] || '初始') === '初始')
    const oldId = String(oldRow?.['套装ID'] || '')
    const setId = String(fields.setId || '').trim() || oldId || autoSetId(poolName, 0)

    snap.touch(path.join(ASSET, '信息表', '套装序列.csv'))
    if (setName !== target) {
      const hit = renameSetSeqName(target, setName)
      touchCustom(snap)
      renameCustom('sets', target, setName)
      const oldStory = path.join(ASSET, '故事', `故事-${oldRow?.['星级']?.replace(/\D/g, '') || star}星-${safeName(target)}.md`)
      if (exists(oldStory)) {
        moveFile(snap, oldStory, path.join(ASSET, '故事', `故事-${star}星-${safeName(setName)}.md`))
        notes.push('故事文件跟着改名')
      }
      notes.push(`套装改名：${target} → ${setName}${hit ? `（序列 ${hit} 行）` : ''}`)
    }
    if (oldId && setId && oldId !== setId) {
      const yOld = path.join(SUIT_LIB, `${oldId}.yaml`)
      const yNew = path.join(SUIT_LIB, `${setId}.yaml`)
      if (exists(yOld)) {
        snap.touch(yNew)
        moveFile(snap, yOld, yNew)
        notes.push(`套装 ID ${oldId} → ${setId}（YAML 跟着改名）`)
      }
      // 产物是按 ID 命名的（`sets/<ID>/OV-lv0.webp`…），换 ID 必须重转
      mediaTouched = true
    }

    upsertSet({ id: setId, star: `${star}★`, name: setName, pool: poolName, versionLabel })
    if (owner.name !== poolName) {
      moveSetToPool(setName, poolName, versionLabel)
      notes.push(`所属阁：${owner.name} → ${poolName}`)
    }

    // ④ 素材：给了才覆盖（只换图标就只动图标）
    writeSetImages({ snap, setDir: toDir, busts: pick(files, 'bust'), icons: pick(files, 'icons'), ovs: pick(files, 'ov'), notes })

    const lib = one(files, 'suitLib')
    if (lib) {
      const y = path.join(SUIT_LIB, `${setId}.yaml`)
      archive(snap, [{ src: lib.src, target: y }])
      suitYamls.push(y)
      notes.push(`套装 YAML → ${setId}.yaml`)
    }

    const storyFile = one(files, 'story')
    if (storyFile) {
      const body = stripMd(readText(storyFile.src))
      if (body.trim()) {
        const r = saveStory({ snap, name: setName, star, body })
        storyWritten = true
        notes.push(`故事已更新${r.dist ? '（直写成品）' : ''}`)
      }
    }

    // ⑤ 换阁时，新阁必须还在（否则管线不知道往哪挂）
    snap.touch(path.join(ASSET, '信息表', '服装阁索引.json'))
    upsertPool(poolName, { version: destPool.version, gachaKey: destPool.gachaKey, type: destPool.type || 'limited' })

    poolIds.push(destPool.id || '')
    versionTouched = version
    log({ kind: 'ok', text: `套装 ${setName} 已更新（${rel(toDir)}）` })
  }

  /* ── 套装（往已有服装阁里补） ── */
  if (job === 'suit' && String(fields.mode || 'new') !== 'edit') {
    const version = String(fields.version || '')
    const poolName = String(fields.pool || '')
    const setName = String(fields.name || '').trim()
    if (!version || !poolName || !setName) throw new Error('版本 / 服装阁 / 套装名都要填')
    const star = String(fields.star || '5')
    const vers = readVersionTable().find((x) => x.v === version)

    const pm = readJson(path.join(ASSET, 'pool-map.json'), { banners: [] }) || { banners: [] }
    const banner = (pm.banners || []).find((b) => b.name === poolName)
    const setId = String(fields.setId || '').trim() || autoSetId(poolName, (banner?.sets || []).length)
    const gachaKey = String(banner?.gachaKey || '')
    const isStandard = banner?.type === 'standard'

    // 保证 build-pool-map 认得出这座阁：没登记过 服装阁索引.json 的阁
    // source 扫描会给它一个「banner-<版本>」的错 id
    if (banner) {
      snap.touch(path.join(ASSET, '信息表', '服装阁索引.json'))
      upsertPool(poolName, { version, gachaKey, type: banner.type || 'limited' })
    }

    snap.touch(path.join(ASSET, '信息表', '套装序列.csv'))
    upsertSet({ id: setId, star: `${star}★`, name: setName, pool: poolName, versionLabel: `${version}${vers?.name || ''}` })

    const poolDir = poolDirOf(version, vers?.name || version, poolName, { create: true, standard: isStandard })
    const setDir = path.join(poolDir, setName)

    const ovs = pick(files, 'ov')
    const busts = pick(files, 'bust')
    const icons = pick(files, 'icons')
    writeSetImages({ snap, setDir, busts, icons, ovs, notes })

    const lib = one(files, 'suitLib')
    if (lib) {
      const dst = path.join(SUIT_LIB, `${setId}.yaml`)
      archive(snap, [{ src: lib.src, target: dst }])
      suitYamls.push(dst)
      notes.push(`套装 YAML → ${setId}.yaml`)
    } else if (icons.length) {
      const dst = path.join(SUIT_LIB, `${setId}.yaml`)
      snap.touch(dst)
      const prevSet = poolMapSet(setName)
      writeSuitLibYaml({
        setName, star, setId,
        origin: poolName, firstVersion: `${version}${vers?.name || ''}`,
        desc: prevSet?.desc || '', styles: prevSet?.styles || [],
        parts: partsFromIcons(icons, gachaKey, setName),
      })
      suitYamls.push(dst)
      notes.push('未给套装 YAML → 按图标生成（沿用已有五维/文案）')
    }

    const storyFile = one(files, 'story')
    if (storyFile) {
      const body = stripMd(readText(storyFile.src))
      if (body.trim()) {
        const r = saveStory({ snap, name: setName, star, body })
        storyWritten = true
        notes.push(`故事已一并写入${r.dist ? '（直写成品）' : ''}`)
      }
    }

    touchCustom(snap)
    markCustom('sets', setName)
    snap.trackDir(setDir)
    notes.push(`${setName}（${star}★，${setId}）已挂到「${poolName}」`)
    poolIds.push(banner?.id || '')
    versionTouched = version
  }

  /* ── 故事 ── */
  if (job === 'story') {
    const name = String(fields.name || '').trim()
    if (!name) throw new Error('套装名必填')
    const star = String(fields.star || '5').replace(/\D/g, '') || '5'
    const md = one(files, 'storyMd')
    let body = String(fields.body || '')
    if (!body && md) body = stripMd(readText(md.src))
    if (!body.trim()) throw new Error('正文为空：填进文本框，或拖一个 .md 进来')

    const r = saveStory({ snap, name, star, body })
    storyWritten = true
    if (r.dist) {
      notes.push(`故事 → ${rel(r.file)}（直接写成品，工坊数据目录不留副本）`)
      log({ kind: 'ok', text: `故事已更新：${name}${r.created ? '（新增）' : ''}` })
    } else {
      notes.push(`故事 → ${rel(r.file)}`)
      log({ kind: 'ok', text: `故事已写入：${name}` })
    }
  }

  /* ── 阅读物 ── */
  if (job === 'reading') {
    const title = String(fields.title || '').trim()
    if (!title) throw new Error('书名必填')
    const txt = one(files, 'readingTxt')
    let body = String(fields.body || '')
    if (!body && txt) {
      body = readText(txt.src).replace(/^《.*?》\s*/, '').replace(/【(图鉴分区|编号|类型)】.*$/gm, '').trim()
    }
    if (!body.trim()) throw new Error('正文为空：填进文本框，或拖一个 .txt 进来')

    const region = String(fields.region || 'yizan')
    const r = saveReading({ snap, region, title, type: fields.type || '书籍', body })
    readingWritten = true
    notes.push(`阅读物 → ${rel(r.file)}（编号 ${r.id}）${r.dist ? '· 直接写成品' : ''}`)
    log({ kind: 'ok', text: `阅读物已写入：${r.dist ? `《${title.replace(/^《|》$/g, '')}》` : title}` })
  }

  /** 转码那一趟要不要跑：给了媒体文件、或新建版本 / 阁 / 套装、或整套导入时要；只改元数据不用 */
  const createdSomething = versionCreated || job === 'bundle'
    || (job === 'pool' && String(fields.mode || 'new') !== 'edit')
    || (job === 'suit' && String(fields.mode || 'new') !== 'edit')
  const transcode = mediaTouched || createdSomething

  return {
    ok: true, notes,
    poolIds: poolIds.filter(Boolean),
    version: versionTouched,
    versionOnly: job === 'version',
    versionCreated,
    transcode,
    /** 这批写了新素材：产物按「存在即跳过」判断，必须强制重转才会更新 */
    mediaTouched,
    storyWritten,
    readingWritten,
    suitYamls,
  }
}

/** 套装 ID 兜底：S + 版本无关的四位流水（与官方 S0xxx 同形，够前端当唯一键） */
function autoSetId(poolName, index) {
  const pm = readJson(path.join(ASSET, 'pool-map.json'), { banners: [] }) || { banners: [] }
  let max = 0
  for (const b of pm.banners || []) {
    for (const s of b.sets || []) {
      const m = String(s.id || '').match(/^S(\d+)$/)
      if (m) max = Math.max(max, Number(m[1]))
    }
  }
  return `S${String(max + 1 + index).padStart(4, '0')}`
}
