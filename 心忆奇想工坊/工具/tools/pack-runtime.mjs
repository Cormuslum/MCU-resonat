/** 准备「工坊运行时」：自带 Python + Pillow + ffmpeg 的便携目录（`node tools/pack-runtime.mjs`，`--force` 重新组装） */
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const RUNTIME = path.join(ROOT, '心忆奇想工坊', '运行时')
const RT = path.join(RUNTIME, 'python')
const CACHE = path.join(RUNTIME, '_cache')
const PY_VER = '3.13.12'
const ZIP = path.join(CACHE, `python-${PY_VER}-embed-amd64.zip`)
const URL = `https://mirrors.huaweicloud.com/python/${PY_VER}/python-${PY_VER}-embed-amd64.zip`

const force = process.argv.includes('--force')

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim()
}

function hasPython() {
  try { return fs.existsSync(path.join(RT, 'python.exe')) } catch { return false }
}

function runtimeOk() {
  if (!hasPython()) return false
  if (!fs.existsSync(path.join(RT, 'ffmpeg.exe'))) return false
  if (!fs.existsSync(path.join(RT, 'Lib', 'site-packages', 'PIL', '__init__.py'))) return false
  try {
    sh(path.join(RT, 'python.exe'), ['-c', 'import PIL,sys;assert sys.version_info[:2]==(3,13)'])
    return true
  } catch {
    return false
  }
}

if (!force && runtimeOk()) {
  console.log('✓ 运行时已就绪，跳过（--force 可重建）')
  process.exit(0)
}

/* 1. 找本机 Python（只用来解压、拷 Pillow；最终产物是 embeddable） */
let hostPy = ''
for (const c of ['python', 'py']) {
  try {
    const out = sh(c, ['-c', 'import sys;print(sys.executable)'])
    if (out && fs.existsSync(out)) { hostPy = out; break }
  } catch { /* 试下一个 */ }
}
if (!hostPy) {
  console.error('✗ 本机找不到可用的 Python（用来解压 Pillow）。')
  process.exit(1)
}
console.log('· 本机 Python:', hostPy)

/* 2. Python embeddable */
fs.mkdirSync(CACHE, { recursive: true })
if (!fs.existsSync(ZIP) || force) {
  console.log('· 下载 Python embeddable …')
  try {
    sh('curl', ['-L', '--fail', '--retry', '3', '-o', ZIP, URL], { stdio: 'inherit' })
  } catch {
    console.error('✗ 下载失败：', URL)
    process.exit(1)
  }
}
console.log('· 解压到', path.relative(ROOT, RT))
fs.rmSync(RT, { recursive: true, force: true })
fs.mkdirSync(RT, { recursive: true })
sh(hostPy, ['-c', [
  'import zipfile,sys',
  `zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])`,
].join('\n'), ZIP, RT])

/* 3. Pillow（拷本机已装的 PIL 目录，C 扩展必须和 Python 小版本对齐） */
const pilSrc = sh(hostPy, ['-c', 'import PIL,os;print(os.path.dirname(PIL.__file__))'])
const pilVer = sh(hostPy, ['-c', 'import PIL;print(PIL.__version__)'])
const sp = path.join(RT, 'Lib', 'site-packages')
fs.mkdirSync(sp, { recursive: true })
fs.cpSync(pilSrc, path.join(sp, 'PIL'), { recursive: true })
console.log(`· Pillow ${pilVer} -> Lib/site-packages/PIL`)

/* 4. 让 embeddable 认 Lib/site-packages */
const pth = path.join(RT, 'python313._pth')
if (fs.existsSync(pth)) {
  let t = fs.readFileSync(pth, 'utf8')
  if (!t.includes('Lib\\site-packages')) {
    t = t.replace('python313.zip', 'python313.zip\nLib\\site-packages')
    fs.writeFileSync(pth, t, 'utf8')
    console.log('· python313._pth 已加入 Lib\\site-packages')
  }
}

/* 5. ffmpeg（webp / ogg / mp4 转码都靠它） */
let ffSrc = process.env.NIKKI_FFMPEG || ''
if (!ffSrc) {
  try { ffSrc = sh('where', ['ffmpeg']).split(/\r?\n/)[0] } catch { /* 交给下面报错 */ }
}
if (!ffSrc || !fs.existsSync(ffSrc)) {
  console.error('✗ 本机找不到 ffmpeg.exe（可设 NIKKI_FFMPEG 指向它）')
  process.exit(1)
}
fs.copyFileSync(ffSrc, path.join(RT, 'ffmpeg.exe'))
console.log('· ffmpeg -> runtime/python/ffmpeg.exe')

/* 6. 自检 */
try {
  const v = sh(path.join(RT, 'python.exe'), ['-c', 'import PIL,subprocess,sys,os;print(PIL.__version__)'])
  console.log(`✓ 运行时就绪（Python ${PY_VER} / Pillow ${v}）`)
} catch (e) {
  console.error('✗ 自检失败：', String(e.message || e))
  process.exit(1)
}
