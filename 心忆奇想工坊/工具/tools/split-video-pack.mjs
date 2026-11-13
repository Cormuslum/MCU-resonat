#!/usr/bin/env node
/** 把大视频拆成可选包：`node tools/split-video-pack.mjs`（拆开发版 public/assets）/ `--release`（拆发行版目录） */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = process.cwd()
const RELEASE = path.join(ROOT, 'release', '无限暖暖发行版')
const SIM = path.join(RELEASE, '心忆共鸣')
const PACK = path.join(ROOT, 'release', '无限暖暖视频包')

const isRelease = process.argv.includes('--release')

/** 成品根（模拟器 / 开发版） */
const SIM_ROOT = isRelease ? SIM : ROOT
/** 视频包根 */
const PACK_ROOT = PACK

/** 要拆走的文件（相对成品根 `public/assets`）：服装阁动态背景 = `video/` 下编号命名的 mp4； 抽卡演出 `RPs-*.webm` / `RPm-*.webm` 与登录 `login.webm` 都是 webm，不碰 */
function pickFiles(assetsDir) {
  const out = []
  const vdir = path.join(assetsDir, 'video')
  if (fs.existsSync(vdir)) {
    for (const f of fs.readdirSync(vdir)) {
      if (!/^\d+\.mp4$/.test(f)) continue          // 只拆编号命名的（服装阁动态背景）
      out.push(path.join('video', f))
    }
  }

  // 主页轮播里最大的那条 + 它的音轨（配对走，单独留音轨没意义）
  //
  // 「最大的那条」会变成仅剩的那条，把本该留在基础包里的 bg-video-1 也拆走
  const home = path.join(assetsDir, 'ui', 'home')
  const packHome = path.join(PACK_ROOT, 'public', 'assets', 'ui', 'home')
  const cands = []
  for (const dir of [home, packHome]) {
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir)) {
      if (!/^bg-video-\d+\.mp4$/.test(f)) continue
      const p = path.join(dir, f)
      cands.push({ f, size: fs.statSync(p).size, dir })
    }
  }
  if (cands.length) {
    const big = cands.sort((a, b) => b.size - a.size)[0]
    const n = big.f.match(/bg-video-(\d+)\.mp4/)[1]
    const rel = path.join('ui', 'home', big.f)
    if (fs.existsSync(path.join(home, big.f))) {
      out.push(rel)
      const audio = `bg-audio-${n}.ogg`
      if (fs.existsSync(path.join(home, audio))) out.push(path.join('ui', 'home', audio))
    } else {
      // 已经在视频包里了（之前拆过）→ 记进清单，但不重复搬
      out.push(rel)
    }
  }
  return out
}

function move(src, dst) {
  fs.mkdirSync(path.dirname(dst), { recursive: true })
  fs.renameSync(src, dst)
}

const assetsDir = path.join(SIM_ROOT, 'public', 'assets')

if (!fs.existsSync(assetsDir)) {
  console.error('✗ 找不到成品目录:', assetsDir)
  process.exit(1)
}

const files = pickFiles(assetsDir)

console.log('== 拆出可选视频包 ==')
console.log('  成品根：', path.relative(ROOT, assetsDir))
console.log('  视频包：', path.relative(ROOT, PACK_ROOT))

let total = 0
let n = 0
for (const rel of files) {
  const src = path.join(assetsDir, rel)
  const dst = path.join(PACK_ROOT, 'public', 'assets', rel)
  if (!fs.existsSync(src)) continue                 // 已经在包里了
  const size = fs.statSync(src).size
  total += size
  n += 1
  move(src, dst)
}

// 安装说明
fs.mkdirSync(PACK_ROOT, { recursive: true })
const readme = path.join(PACK_ROOT, '安装说明.txt')
fs.writeFileSync(readme, [
  '《无限暖暖》可选视频包',
  '',
  '这个包里是**动态背景视频**（约 ' + (total / 1048576).toFixed(0) + ' MB）。',
  '不装也能玩：模拟器会静默退回静态背景，不报错、不影响任何功能。',
  '',
  '想看动态背景？',
  '  ① 把本文件夹里的【public】整个拖进【心忆共鸣】文件夹；',
  '  ② Windows 问「是否合并」时选「是」—— 文件会自动归位到 public/assets 里；',
  '  ③ 重新打开模拟器即可。',
  '',
  '也可以直接跑本文件夹里的【安装视频包.bat】，效果一样。',
  '',
  '文件清单：',
  ...files.map((f) => '  public/assets/' + f.replace(/\\/g, '/')),
  '',
].join('\n'), 'utf8')

// 一键安装脚本
const bat = path.join(PACK_ROOT, '安装视频包.bat')
fs.writeFileSync(bat, [
  '@echo off',
  'chcp 65001 >nul',
  'set "SRC=%~dp0public"',
  'set "DST=%~dp0..\\无限暖暖发行版\\心忆共鸣\\public"',
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

console.log('  拆走', n, '个文件，' + (total / 1048576).toFixed(1) + ' MB')
console.log('  →', path.relative(ROOT, PACK_ROOT))
console.log('  安装说明：', path.relative(ROOT, readme))
