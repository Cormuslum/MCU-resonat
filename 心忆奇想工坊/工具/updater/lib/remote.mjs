/** 远端适配器：DLC 包的上传 / 下载 / 列包，三种远端同一套接口 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { ROOT, WORKSPACE, TOOL_ROOT, exists, readJson, writeJson, pythonBin } from './util.mjs'
import { packZip, unpackZip, srcDir } from './dlc.mjs'

const CONF = path.join(TOOL_ROOT, 'updater', 'remote.json')

export const REMOTE_TYPES = {
  local: { label: '本地目录', desc: '网盘同步盘 / 共享盘 / U 盘都能用' },
  http: { label: 'HTTP 云端', desc: '自建接口或网盘分享 API（POST 上传 / GET 下载）' },
  git: { label: 'Git 仓库', desc: '把包当普通文件 push 进仓库，互相 pull' },
}

/* ────────────────────────────── 配置 ────────────────────────────── */

export function readConfig() {
  const c = readJson(CONF, null)
  if (c && c.remotes) return c
  return {
    active: 'local',
    remotes: {
      local: { dir: path.join(WORKSPACE, 'DLC仓库') },
      http: { base: '', token: '' },
      git: { repo: 'https://github.com/Cormuslum/MCU-resonat.git', branch: 'dlc', dir: 'dlc' },
    },
  }
}

export function writeConfig(cfg) {
  writeJson(CONF, cfg)
  return cfg
}

/** 某个远端的当前状态（给界面显示「已就绪 / 还差什么」） */
export function remoteStatus(type, cfg = readConfig()) {
  const r = cfg.remotes?.[type] || {}
  if (type === 'local') {
    const dir = r.dir || ''
    return {
      ok: !!dir,
      label: '本地目录',
      target: dir,
      hint: dir ? `目录：${dir}` : '先在「远端」里填一个目录',
    }
  }
  if (type === 'http') {
    const base = (r.base || '').replace(/\/+$/, '')
    return {
      ok: !!base,
      label: 'HTTP 云端',
      target: base,
      hint: base ? `地址：${base}` : '填一个能接收 POST 的地址',
    }
  }
  if (type === 'git') {
    const repo = r.repo || ''
    const inRepo = gitInfo()
    return {
      ok: !!repo && !!inRepo.remote,
      label: 'Git 仓库',
      target: repo,
      hint: !repo
        ? '先填仓库地址'
        : (!inRepo.remote
          ? '本项目还没关联 git 仓库（git remote -v 为空），先 git remote add origin <地址>'
          : `仓库：${repo}（分支 ${r.branch || 'main'}）`),
    }
  }
  return { ok: false, label: '未知远端类型', target: '', hint: '未知远端类型' }
}

/* ────────────────────────────── git 探测 ────────────────────────────── */

function git(args, cwd = ROOT) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 30000 })
  return { code: r.status, out: (r.stdout || '').trim(), err: (r.stderr || '').trim() }
}

/** 本项目的 git 状态（有没有仓库、有没有远端） */
export function gitInfo() {
  const inside = git(['rev-parse', '--is-inside-work-tree'])
  if (inside.code !== 0 || inside.out !== 'true') return { repo: false, remote: '', branch: '' }
  const rem = git(['remote', 'get-url', 'origin'])
  const br = git(['rev-parse', '--abbrev-ref', 'HEAD'])
  return {
    repo: true,
    remote: rem.code === 0 ? rem.out : '',
    branch: br.code === 0 ? br.out : '',
  }
}

/* ────────────────────────────── git 分发用的临时工作区 ────────────────────────────── */

/** 推送/拉取时临时检出的工作区：包只在分支里提交，主工作区不落文件、不产生改动 */
const GIT_WT = path.join(TOOL_ROOT, 'updater', '.dist', 'dlc-wt')

/** 清掉临时工作区（没注册成 worktree 时只删目录） */
function gitDropWorktree() {
  const r = git(['worktree', 'remove', '--force', GIT_WT])
  if (r.code !== 0) fs.rmSync(GIT_WT, { recursive: true, force: true })
}

/** 检出 `origin/<branch>` 到临时工作区；分支不存在就在那里开一条空的 */
function gitPrepareWorktree(branch) {
  gitDropWorktree()
  git(['fetch', 'origin', branch])
  const has = git(['rev-parse', '--verify', `refs/remotes/origin/${branch}`]).code === 0
  const add = has
    ? git(['worktree', 'add', '--force', '--detach', GIT_WT, `origin/${branch}`])
    : git(['worktree', 'add', '--force', '--orphan', GIT_WT])
  if (add.code !== 0) throw new Error('git 临时工作区创建失败：' + (add.err || add.out))
  return GIT_WT
}

/** 读分支里某个文件的原始字节（不 checkout，主工作区不受影响） */
function gitBlob(spec) {
  const r = spawnSync('git', ['show', spec], { cwd: ROOT, encoding: 'buffer', timeout: 60000 })
  if (r.status !== 0) return null
  return r.stdout
}

/* ────────────────────────────── 打包 ────────────────────────────── */

/** 把源包打成 zip */
export function pack(id) {
  const dir = srcDir(id)
  if (!exists(dir)) throw new Error('源包不存在：' + id)
  const out = path.join(TOOL_ROOT, 'updater', '.dist', `${id}.dlc.zip`)
  packZip(dir, out)
  return out
}

/* ────────────────────────────── 上传 ────────────────────────────── */

export async function upload(type, id, cfg = readConfig()) {
  const r = cfg.remotes?.[type] || {}
  const zip = pack(id)
  const base = path.basename(zip)

  if (type === 'local') {
    const dir = r.dir
    if (!dir) throw new Error('本地远端还没设置目录')
    fs.mkdirSync(dir, { recursive: true })
    const dst = path.join(dir, base)
    fs.copyFileSync(zip, dst)
    return { ok: true, target: dst, message: `已复制到 ${dst}` }
  }

  if (type === 'http') {
    const root = (r.base || '').replace(/\/+$/, '')
    if (!root) throw new Error('HTTP 远端还没设置地址')
    const buf = fs.readFileSync(zip)
    const form = new FormData()
    form.append('file', new Blob([buf]), base)
    form.append('id', id)
    if (r.token) form.append('token', r.token)
    const res = await fetch(`${root}/upload`, { method: 'POST', body: form })
    const text = await res.text()
    if (!res.ok) throw new Error(`上传失败 HTTP ${res.status}：${text.slice(0, 200)}`)
    let shareUrl = ''
    try { shareUrl = JSON.parse(text).url || '' } catch { /* 非 JSON 就当纯文本 */ }
    return { ok: true, target: `${root}/${base}`, message: `已上传到 ${root}/${base}`, shareUrl }
  }

  if (type === 'git') {
    const repo = r.repo
    if (!repo) throw new Error('Git 远端还没设置仓库地址')
    const info = gitInfo()
    if (!info.repo) throw new Error('本项目不在 git 仓库里，无法用 git 分发')
    if (!info.remote) {
      throw new Error('本项目尚未关联 git 仓库 —— 先执行：git remote add origin <仓库地址>，再重试')
    }
    const sub = r.dir || 'dlc'
    const branch = r.branch || 'main'
    const wt = gitPrepareWorktree(branch)
    try {
      const dstDir = path.join(wt, sub)
      fs.mkdirSync(dstDir, { recursive: true })
      const dst = path.join(dstDir, base)
      fs.copyFileSync(zip, dst)
      const st = fs.statSync(dst)
      let name = id
      let version = ''
      const nm = readZipEntry(dst, 'dlc.json')
      if (nm) {
        try {
          const j = JSON.parse(nm)
          name = j.name || id
          version = j.version || ''
        } catch { /* 读不出来就用文件名 */ }
      }
      const idxFile = path.join(dstDir, 'index.json')
      const idx = readJson(idxFile, { packages: [] }) || { packages: [] }
      const pkgs = (idx.packages || []).filter((p) => p.id !== id)
      pkgs.push({ id, name, version, file: base, size: st.size, updatedAt: new Date().toISOString() })
      pkgs.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      writeJson(idxFile, { updatedAt: new Date().toISOString(), packages: pkgs })
      const add = git(['add', '-A'], wt)
      if (add.code !== 0) throw new Error('git add 失败：' + add.err)
      const commit = git(['commit', '-m', `dlc: ${id} ${new Date().toISOString()}`], wt)
      if (commit.code !== 0 && !/nothing to commit/i.test(commit.out + commit.err)) {
        throw new Error('git commit 失败：' + (commit.err || commit.out))
      }
      const push = git(['push', 'origin', `HEAD:${branch}`], wt)
      if (push.code !== 0) throw new Error('git push 失败：' + push.err)
      return { ok: true, target: `${repo}#${branch}/${sub}/${base}`, message: `已推送到 ${branch}/${sub}/${base}` }
    } finally {
      gitDropWorktree()
    }
  }

  throw new Error('未知远端类型：' + type)
}

/* ────────────────────────────── 列出远端可下载的包 ────────────────────────────── */

/** 列远端上有哪些包：统一读远端根目录下的 `index.json`（`{ "packages": [{ id, name, version, file, size, updatedAt }] }`） */
export async function listRemote(type, cfg = readConfig()) {
  const r = cfg.remotes?.[type] || {}
  if (type === 'local') {
    const dir = r.dir
    if (!dir) return []
    if (!exists(dir)) return []
    return scanLocal(dir)
  }
  if (type === 'http') {
    const root = (r.base || '').replace(/\/+$/, '')
    if (!root) return []
    try {
      const res = await fetch(`${root}/index.json`, { cache: 'no-cache' })
      if (!res.ok) return []
      const j = await res.json()
      return j.packages || []
    } catch {
      return []
    }
  }
  if (type === 'git') {
    const info = gitInfo()
    if (!info.repo || !info.remote) return []
    const branch = r.branch || 'main'
    const sub = r.dir || 'dlc'
    git(['fetch', 'origin', branch])
    const show = git(['show', `origin/${branch}:${sub}/index.json`])
    if (show.code !== 0) return []
    try { return JSON.parse(show.out).packages || [] } catch { return [] }
  }
  return []
}

/** 扫本地目录里的 *.dlc.zip，同步写出 index.json */
function scanLocal(dir) {
  const pkgs = []
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.dlc.zip')) continue
    const id = f.replace(/\.dlc\.zip$/, '')
    const st = fs.statSync(path.join(dir, f))
    let name = id
    let version = ''
    // zip 里读 dlc.json 拿名字（用 python 的 zipfile 读，不解包）
    const nm = readZipEntry(path.join(dir, f), 'dlc.json')
    if (nm) {
      try {
        const j = JSON.parse(nm)
        name = j.name || id
        version = j.version || ''
      } catch { /* 读不出来就用文件名 */ }
    }
    pkgs.push({ id, name, version, file: f, size: st.size, updatedAt: new Date(st.mtimeMs).toISOString() })
  }
  pkgs.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
  writeJson(path.join(dir, 'index.json'), { updatedAt: new Date().toISOString(), packages: pkgs })
  return pkgs
}

/** 从 zip 里读一个文本条目（不解包） */
function readZipEntry(zip, entry) {
  const py = [
    'import sys, zipfile',
    'z = zipfile.ZipFile(sys.argv[1])',
    'try:',
    '    sys.stdout.write(z.read(sys.argv[2]).decode("utf-8"))',
    'except KeyError:',
    '    pass',
  ].join('\n')
  const r = spawnSync(pythonBin(), ['-c', py, zip, entry], { encoding: 'utf8', timeout: 20000 })
  if (r.status !== 0) return ''
  return (r.stdout || '').replace(/^\uFEFF/, '')
}

/* ────────────────────────────── 下载 ────────────────────────────── */

/** 从远端下载一个包并装进运行区：zip → 临时目录 → 校验 dlc.json → 装进 `public/dlc/<id>/`，校验不过整个丢弃 */
export async function download(type, id, cfg = readConfig()) {
  const r = cfg.remotes?.[type] || {}
  const tmp = path.join(TOOL_ROOT, 'updater', '.inbox', `dlc-${Date.now()}`)
  fs.mkdirSync(tmp, { recursive: true })
  const zip = path.join(tmp, `${id}.dlc.zip`)

  if (type === 'local') {
    const dir = r.dir
    if (!dir) throw new Error('本地远端还没设置目录')
    const src = path.join(dir, `${id}.dlc.zip`)
    if (!exists(src)) throw new Error('远端目录里没有这个包：' + id)
    fs.copyFileSync(src, zip)
  } else if (type === 'http') {
    const root = (r.base || '').replace(/\/+$/, '')
    if (!root) throw new Error('HTTP 远端还没设置地址')
    const res = await fetch(`${root}/${id}.dlc.zip`)
    if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`)
    fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()))
  } else if (type === 'git') {
    const info = gitInfo()
    if (!info.repo) throw new Error('本项目不在 git 仓库里，无法用 git 拉取')
    if (!info.remote) {
      throw new Error('本项目尚未关联 git 仓库 —— 先执行：git remote add origin <仓库地址>，再重试')
    }
    const branch = r.branch || 'main'
    const sub = r.dir || 'dlc'
    const fetch = git(['fetch', 'origin', branch])
    if (fetch.code !== 0) throw new Error('git fetch 失败：' + fetch.err)
    const blob = gitBlob(`origin/${branch}:${sub}/${id}.dlc.zip`)
    if (!blob) throw new Error(`远端分支 ${branch} 里没有 ${id}.dlc.zip`)
    fs.writeFileSync(zip, blob)
  } else {
    throw new Error('未知远端类型：' + type)
  }

  const unpackDir = path.join(tmp, 'unpacked')
  unpackZip(zip, unpackDir)
  const mf = readJson(path.join(unpackDir, 'dlc.json'), null)
  if (!mf) {
    fs.rmSync(tmp, { recursive: true, force: true })
    throw new Error('包里没有 dlc.json —— 不是有效的 DLC')
  }
  const realId = mf.id || id
  return { unpackDir, id: realId, tmp }
}

/* ────────────────────────────── 分享链接 ────────────────────────────── */

/** 生成一个「别人能拿到的」引用。本地远端给文件路径；HTTP 远端给下载 URL；git 远端给仓库地址 + 路径 */
export function shareRef(type, id, cfg = readConfig()) {
  const r = cfg.remotes?.[type] || {}
  if (type === 'local') return r.dir ? `${r.dir}\\${id}.dlc.zip` : ''
  if (type === 'http') {
    const root = (r.base || '').replace(/\/+$/, '')
    return root ? `${root}/${id}.dlc.zip` : ''
  }
  if (type === 'git') {
    const branch = r.branch || 'main'
    const sub = r.dir || 'dlc'
    return r.repo ? `${r.repo}#${branch}/${sub}/${id}.dlc.zip` : ''
  }
  return ''
}
