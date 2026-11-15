/** 读项目根的 `文案.json`（工坊侧，服务端用）：任务标题 / 副标题 / 字段标签 / 槽位 / 写入清单；带 mtime 缓存 */
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

/** `{D}` / `{O}` / `{T}` 占位符：数据根 / 成品根 / 工具根（服务端替换） */
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
