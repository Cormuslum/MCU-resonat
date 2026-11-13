/** 主页「信封」弹窗 · 版本更新日志（类型 + 运行时加载），数据在 `public/assets/data/mail-changelog.json`； 生成器 `node tools/gen-mail-changelog.mjs`（已挂 `prebuild`），取最近三版各前 5 条 bullet */
import { loadAssetJson } from '@/core/asset-data'

export interface MailLog {
  version: string
  date: string
  title: string
  lines: string[]
}

/** 数据文件（相对 `public/assets/data/`）—— 手改、工坊改都直接生效 */
export const MAIL_CHANGELOG_FILE = 'mail-changelog.json'

export function loadMailLogs(): Promise<MailLog[]> {
  return loadAssetJson<MailLog>(MAIL_CHANGELOG_FILE)
}
