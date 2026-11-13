/**
 * 把 electron-builder 的产物 + 项目数据组装成「免安装发行版」。v2.1.00
 *
 *   node tools/pack-release.mjs
 *
 * 前置：先跑
 *   npx electron-builder --config electron-builder-sim.yml --win --dir
 *   npx electron-builder --config electron-builder-updater.yml --win --dir
 * 它们输出到 release/_build/{simulator,updater}/win-unpacked。
 *
 * 产出（两个目录**职责分离**）：
 *
 *   release/无限暖暖发行版/
 *     无限暖暖模拟器/          ← 纯静态，玩家只需要这一个
 *       无限暖暖模拟器.exe + resources/
 *       dist/                 只含代码（js/css/html/svg）
 *       public/               成品素材 + manifest + data/*.json
 *       userdata/             存档（跟着包走）
 *
 *     心忆奇想工坊/            ← 编辑器，运行时/工具/数据都在这里
 *       心忆奇想工坊.exe + resources/
 *       运行时/               python.exe + Pillow + ffmpeg.exe
 *       工具/updater/         工坊服务代码
 *       工具/tools/           Python 管线
 *       工具/data/            信息表 / 套装库 / 故事 / 阅读物 / pool-map.json
 *       工具/文案.json
 *
 * 为什么这么分：玩家可能只想玩（只下载「无限暖暖模拟器」），
 * Python/ffmpeg/编辑数据对他全是负担；反过来工坊要把成品写进模拟器的 public。
 */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

// 三个根（开发版与发行版同构）：
//   ROOT      = 仓库根（开发版）/ 发行版根（发行版）—— 两者都含「无限暖暖模拟器」与「心忆奇想工坊」
//   SIM_ROOT  = 成品根：无限暖暖模拟器/（public/assets 与 src/ 在这）
//   TOOL_ROOT = 工具根：心忆奇想工坊/工具/（updater 与 tools 在这）
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const SIM_ROOT = path.join(ROOT, '无限暖暖模拟器')
const TOOL_ROOT = path.join(ROOT, '心忆奇想工坊', '工具')
const TOOLS_DIR = path.join(TOOL_ROOT, 'tools')
const OUT = path.join(ROOT, 'release', '无限暖暖发行版')
const SIM = path.join(OUT, '无限暖暖模拟器')
const UPD = path.join(OUT, '心忆奇想工坊')
const BUILD = path.join(ROOT, 'release', '_build')

// dist 里只留代码：媒体一律由 public/assets 提供，避免 1.7G 重复
const MEDIA = ['*.webp', '*.ogg', '*.mp4', '*.webm', '*.png', '*.jpg', '*.jpeg', '*.gif', '*.avif', '*.mp3', '*.wav', '*.m4a']

/**
 * 编辑数据：只带这几样（约 0.3M）。
 *
 * v2.1.02 起**不再随包发 `故事/` `套装库/` `阅读物/`**（合计 4.5M）：
 * 它们的成品（stories.json / readings.json / pool-map 里的套装文案）已经在
 * 模拟器的 `public/assets/data/` 与 `data/pool-map.json` 里，而这三个目录在
 * 发行版只当**增量补丁** —— 用户拖进来的新文件覆盖对应那一条，其余原样保留。
 * 用户在工坊里拖文件时目录会自动重建（写入端 mkdir -p）。
 */
const DATA_KEEP = ['信息表']

/**
 * 信息表 / 阅读物里这些是**开发期遗留**，不进发行包：
 *   - `前后名称对照表.md`：v2.0.02 起管线已不再读它
 *   - `desktop.ini`：Windows 资源管理器自动生成的文件夹个性化文件（纯垃圾，40KB）
 *   - `系列分类说明.md`：描述的是早已不存在的「系列子目录」，已过时
 *   （`2872新增阅读物清单.txt` 是用户的工作清单，**保留**）
 */
const DATA_XF = ['前后名称对照表.md', 'desktop.ini', '系列分类说明.md']

/**
 * 工坊代码里这些不进发行包：
 *   - 快照 / 缓存 / 扩展包源 / 临时重定向表：运行时状态，每次写入重新生成（实测快照能占 20M）
 *   - `dlc/`：扩展包源区，玩家自己的包不该随包分发
 * README 是**开发服务器版**的说明（端口 5178/5199、`node updater/server.mjs`），
 * 与发行版的双击 exe 启动方式不符，留着会误导 → 不进制发行包。
 * 发行版用户看的是工坊界面里的「帮助」弹窗。
 */
const UPD_XD = ['.snapshots', '.inbox', '.dist', 'dlc', 'node_modules']
const UPD_XF = [
  '.last-apply.json', '.write-cache.json', '.passthrough.json',
  'README.md',
]

/**
 * 工坊「写入并更新」会跑的管线入口。
 * 发行版只带这些脚本**及其依赖闭包**，其余（验收脚本 / 截图 / 预处理工具 /
 * 打包工具 / 一次性探针）一律不进发行包 —— 它们对终端玩家是纯垃圾。
 */
const PIPELINE_ENTRIES = [
  'build-pool-map.py',   // 生成 pool-map（阁 / 套装清单）
  'collect-assets.py',   // 转码 + 重建 manifest
  'gen-stories.py',      // 故事图鉴数据 → public/assets/data/stories.json
  'gen-readings.py',     // 阅读物图鉴数据 → public/assets/data/readings.json
]

/**
 * 算出管线脚本的**依赖闭包**（本地 import / 被调用的同目录脚本）。
 * 比手写白名单可靠：以后给管线加了新依赖会自动跟上，不会漏；反之无关脚本不会混进来。
 */
function pipelineClosure() {
  const dir = TOOLS_DIR
  const files = fs.readdirSync(dir).filter((f) => /\.(py|mjs)$/.test(f))
  const need = new Set()
  const scan = (name) => {
    if (need.has(name)) return
    need.add(name)
    const p = path.join(dir, name)
    if (!fs.existsSync(p)) return
    const s = fs.readFileSync(p, 'utf8')
    // import xxx / from xxx import
    for (const m of s.matchAll(/^\s*(?:from\s+([A-Za-z_]\w*)\s+import|import\s+([A-Za-z_]\w*))/gm)) {
      const mod = m[1] || m[2]
      for (const cand of [mod + '.py', mod + '.mjs']) if (files.includes(cand)) scan(cand)
    }
    // 脚本里以字符串形式引用的同目录脚本（'xxx.py'）
    for (const m of s.matchAll(/['"]([\w-]+\.py)['"]/g)) {
      if (files.includes(m[1])) scan(m[1])
    }
  }
  for (const e of PIPELINE_ENTRIES) scan(e)
  // 入口缺失就是打包配置错了，直接报错，别做出一个写不了素材的发行包
  for (const e of PIPELINE_ENTRIES) {
    if (!need.has(e)) {
      console.error('✗ 管线入口缺失:', e)
      process.exit(1)
    }
  }
  return [...need].sort()
}

function robocopy(args) {
  try {
    execFileSync('robocopy', args, { stdio: 'ignore' })
  } catch (e) {
    if (typeof e.status === 'number' && e.status < 8) return
    throw new Error('robocopy 失败(' + e.status + '): ' + args.slice(0, 2).join(' -> '))
  }
}

/**
 * 删掉一棵目录树。
 *
 * 为什么不用 `fs.rmSync(p, { recursive: true })`：
 * 发行版目录里有 2.6G / 上万个文件，Node 的递归删在 Windows 上很慢且容易
 * 撞上「文件被占用」；robocopy 把它镜像到一个空目录再删，快且能重试。
 */
function rmTree(p) {
  if (!fs.existsSync(p)) return
  const st = fs.lstatSync(p)
  if (!st.isDirectory()) {
    try { fs.unlinkSync(p) } catch { /* 占用中就跳过 */ }
    return
  }
  // 先把内容镜像到一个临时空目录，等于「清空」
  const empty = path.join(path.dirname(p), '.empty-' + path.basename(p))
  fs.mkdirSync(empty, { recursive: true })
  try {
    robocopy([empty, p, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/R:1', '/W:1', '/NP'])
  } catch { /* 镜像失败就退回逐文件删 */ }
  try { fs.rmdirSync(empty) } catch { /* ignore */ }
  // 再从深到浅删目录
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const c = path.join(d, e.name)
      if (e.isDirectory()) { walk(c); try { fs.rmdirSync(c) } catch { /* ignore */ } }
      else { try { fs.unlinkSync(c) } catch { /* ignore */ } }
    }
  }
  walk(p)
  try { fs.rmdirSync(p) } catch { /* ignore */ }
}

function rcopy(src, dst, { exFiles = [], exDirs = [] } = {}) {
  if (!fs.existsSync(src)) { console.warn('  [跳过] 源不存在:', src); return }
  fs.mkdirSync(dst, { recursive: true })
  const args = [src, dst, '/E', '/MT:16', '/NFL', '/NDL', '/NJH', '/NJS', '/R:1', '/W:1', '/NP']
  if (exFiles.length) args.push('/XF', ...exFiles)
  if (exDirs.length) args.push('/XD', ...exDirs)
  robocopy(args)
  console.log('  ✓', path.relative(ROOT, src), '->', path.relative(OUT, dst))
}

console.log('== 组装发行版 ==')
const simUn = path.join(BUILD, 'simulator', 'win-unpacked')
const updUn = path.join(BUILD, 'updater', 'win-unpacked')
if (!fs.existsSync(simUn) || !fs.existsSync(updUn)) {
  console.error('✗ 缺少 electron-builder 产物（release/_build/*/win-unpacked）。先跑打包命令。')
  process.exit(1)
}

// 旧发行版：不能整目录改名（Windows 上「非空目录改名」常被系统/安全钩子拒），
// 也不能直接递归删（大目录删不动）。改成**逐层清空**再往里拷。
if (fs.existsSync(OUT)) {
  console.log('  清空旧发行版内容…')
  for (const entry of fs.readdirSync(OUT)) {
    const p = path.join(OUT, entry)
    rmTree(p)
  }
}
fs.mkdirSync(SIM, { recursive: true })
fs.mkdirSync(UPD, { recursive: true })

// ───────────────────────── 模拟器（纯静态） ─────────────────────────
rcopy(simUn, SIM)
rcopy(path.join(SIM_ROOT, 'dist'), path.join(SIM, 'dist'), { exFiles: MEDIA })
rcopy(path.join(SIM_ROOT, 'public'), path.join(SIM, 'public'))
fs.mkdirSync(path.join(SIM, 'userdata'), { recursive: true })
console.log('  ✓ userdata/（空存档目录）')

// ───────────────────────── 可选视频包 ─────────────────────────
// 大视频（服装阁动态背景 28 条 + 最大的主页轮播）拆成独立包，
// 玩家自己决定下载不下载 —— 基础包能小 1.3 GB。
// 拆走后 manifest 仍保留视频条目（collect-assets 有旧 manifest 基线），
// 玩家把包里的 public 拖回模拟器目录即自动归位、立刻生效。
{
  const packRoot = path.join(ROOT, 'release', '无限暖暖视频包')
  const packAssets = path.join(packRoot, 'public', 'assets')
  const simAssets = path.join(SIM, 'public', 'assets')
  const moved = []
  const vdir = path.join(simAssets, 'video')
  if (fs.existsSync(vdir)) {
    for (const f of fs.readdirSync(vdir)) {
      if (!/^\d+\.mp4$/.test(f)) continue           // 只拆编号命名的（服装阁动态背景）
      const src = path.join(vdir, f)
      const dst = path.join(packAssets, 'video', f)
      fs.mkdirSync(path.dirname(dst), { recursive: true })
      fs.renameSync(src, dst)
      moved.push({ rel: `video/${f}`, size: fs.statSync(dst).size })
    }
  }
  // 主页轮播里最大的那条 + 配套音轨
  const home = path.join(simAssets, 'ui', 'home')
  const packHome = path.join(packAssets, 'ui', 'home')
  if (fs.existsSync(home)) {
    const cands = fs.readdirSync(home)
      .filter((f) => /^bg-video-\d+\.mp4$/.test(f))
      .map((f) => ({ f, size: fs.statSync(path.join(home, f)).size }))
      .sort((a, b) => b.size - a.size)
    if (cands.length) {
      const big = cands[0].f
      const n = big.match(/bg-video-(\d+)\.mp4/)[1]
      for (const name of [big, `bg-audio-${n}.ogg`]) {
        const src = path.join(home, name)
        if (!fs.existsSync(src)) continue
        const dst = path.join(packHome, name)
        fs.mkdirSync(path.dirname(dst), { recursive: true })
        fs.renameSync(src, dst)
        moved.push({ rel: `ui/home/${name}`, size: fs.statSync(dst).size })
      }
    }
  }
  if (moved.length) {
    const total = moved.reduce((s, m) => s + m.size, 0)
    fs.mkdirSync(packRoot, { recursive: true })
    fs.writeFileSync(path.join(packRoot, '安装说明.txt'), [
      '《无限暖暖》可选视频包',
      '',
      '这个包里是**动态背景视频**（约 ' + (total / 1048576).toFixed(0) + ' MB）。',
      '不装也能玩：模拟器会静默退回静态背景，不报错、不影响任何功能。',
      '',
      '想看动态背景？',
      '  ① 把本文件夹里的【public】整个拖进【无限暖暖模拟器】文件夹；',
      '  ② Windows 问「是否合并」时选「是」—— 文件会自动归位到 public/assets 里；',
      '  ③ 重新打开模拟器即可。',
      '',
      '文件清单：',
      ...moved.map((m) => '  public/assets/' + m.rel.replace(/\\/g, '/')),
      '',
    ].join('\n'), 'utf8')
    fs.writeFileSync(path.join(packRoot, '安装视频包.bat'), [
      '@echo off',
      'chcp 65001 >nul',
      'set "SRC=%~dp0public"',
      'set "DST=%~dp0..\\无限暖暖发行版\\无限暖暖模拟器\\public"',
      'if not exist "%DST%" (',
      '  echo [x] 找不到模拟器目录，请把本文件夹放到「无限暖暖发行版」旁边再运行',
      '  pause',
      '  exit /b 1',
      ')',
      'echo 正在安装视频包...',
      'xcopy /E /I /Y "%SRC%" "%DST%" >nul',
      'echo [OK] 视频包已安装，重新打开模拟器即可看到动态背景。',
      'pause',
      '',
    ].join('\r\n'), 'utf8')
    console.log(`  ✓ 可选视频包：${moved.length} 个文件 / ${(total / 1048576).toFixed(0)} MB`)
    console.log('     → release/无限暖暖视频包/（拖 public 进模拟器目录即自动归位）')
  }
}

// ───────────────────────── 工坊（自带运行时 + 编辑数据） ─────────────────────────
rcopy(updUn, UPD)

// 运行时：python.exe + Pillow + ffmpeg.exe，由 tools/pack-runtime.mjs 预先备好
const RT = path.join(ROOT, '心忆奇想工坊', '运行时')
if (!fs.existsSync(path.join(RT, 'python.exe'))) {
  console.error('✗ 缺少运行时：electron/runtime/python/python.exe（先跑 node tools/pack-runtime.mjs）')
  process.exit(1)
}
rcopy(RT, path.join(UPD, '运行时'))

// 工具：server 代码 + Python 管线
rcopy(path.join(TOOL_ROOT, 'updater'), path.join(UPD, '工具', 'updater'), { exDirs: UPD_XD, exFiles: UPD_XF })

// Python 管线：**只带依赖闭包**（其余是开发期脚本，不进制发行包）
const keepScripts = pipelineClosure()
const toolsDst = path.join(UPD, '工具', 'tools')
fs.mkdirSync(toolsDst, { recursive: true })
for (const f of keepScripts) {
  fs.copyFileSync(path.join(TOOLS_DIR, f), path.join(toolsDst, f))
}
console.log(`  ✓ tools（管线依赖闭包 ${keepScripts.length} 个）-> 工具/tools`)
console.log('     ', keepScripts.join(', '))

// 编辑数据（约 7M）
for (const d of DATA_KEEP) {
  rcopy(path.join(ROOT, '素材', d), path.join(UPD, '工具', 'data', d), { exFiles: DATA_XF })
}
const pm = path.join(ROOT, '素材', 'pool-map.json')
if (fs.existsSync(pm)) {
  fs.copyFileSync(pm, path.join(UPD, '工具', 'data', 'pool-map.json'))
  console.log('  ✓ 素材/pool-map.json -> 工具/data/pool-map.json')
}

// 文案（工坊 /copy.json 读它）
const copyFile = path.join(TOOL_ROOT, '文案.json')
if (fs.existsSync(copyFile)) {
  fs.mkdirSync(path.join(UPD, '工具'), { recursive: true })
  fs.copyFileSync(copyFile, path.join(UPD, '工具', '文案.json'))
  console.log('  ✓ 文案.json -> 工具/文案.json')
}

console.log('== 完成 ==')
console.log('  ', SIM)
console.log('  ', UPD)
