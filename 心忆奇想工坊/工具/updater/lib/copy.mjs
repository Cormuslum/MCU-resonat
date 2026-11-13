/**
 * 读项目根的 `文案.json`（工坊侧）。
 *
 * 与前端 `/copy.json` 的区别：那边是浏览器自己 fetch；这里是**服务端**用
 * （任务的标题 / 副标题 / 字段标签 / 占位符 / 提示 / 槽位 / 写入清单）。
 * 带 mtime 缓存：改完 json 刷新页面就生效，不用重启工坊。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { dataLabel, outLabel, toolLabel } from './util.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const COPY_FILE = path.resolve(HERE, '..', '..', '文案.json')

let cache = { mtime: 0, data: null }

export function readCopy() {
  try {
    const st = fs.statSync(COPY_FILE)
    if (cache.data && cache.mtime === st.mtimeMs) return cache.data
    cache = { mtime: st.mtimeMs, data: JSON.parse(fs.readFileSync(COPY_FILE, 'utf8')) }
    return cache.data
  } catch {
    // 文案坏了不该让工坊起不来：沿用上一次读到的（或 null → 页面用 index.html 的兜底）
    return cache.data || null
  }
}

/**
 * 文案里出现的路径前缀 —— 把 `{D}` / `{O}` 换成**磁盘上的真实目录**。
 *
 * 与 `jobs.mjs` 的「这次会写入」同一套规则：开发版 `{D}` = `素材/`、
 * `{O}` = `public/assets/`；发行版 `{D}` = `心忆奇想工坊/工具/data/`、
 * `{O}` = `无限暖暖模拟器/public/assets/`。
 *
 * 必须在**服务端**换：前端只认表单字段，`{D}` / `{O}` 会被当成未知字段。
 * `/copy.json` 走这里，于是「打开 素材/信息表/… 手工登记」这类提示
 * 在发行版会指向 `data/信息表/…`，不会让玩家去找一个不存在的目录。
 */
export function copyWithPaths() {
  const src = readCopy()
  if (!src) return null
  const D = `${dataLabel()}/`
  const O = `${outLabel()}/`
  const T = toolLabel()
  const walk = (v) => {
    if (typeof v === 'string') {
      return /\{D\}|\{O\}|\{T\}/.test(v)
        ? v.replace(/\{D\}|\{O\}|\{T\}/g, (m) => (m === '{D}' ? D : m === '{O}' ? O : T))
        : v
    }
    if (Array.isArray(v)) return v.map(walk)
    if (v && typeof v === 'object') {
      const out = {}
      for (const k of Object.keys(v)) out[k] = walk(v[k])
      return out
    }
    return v
  }
  return walk(src)
}
