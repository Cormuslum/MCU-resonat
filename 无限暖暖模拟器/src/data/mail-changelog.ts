/**
 * 主页「信封」弹窗 · 版本更新日志（**类型 + 运行时加载**）。
 *
 * v2.2.03：数据从编译期搬到了 `public/assets/data/mail-changelog.json`。
 * 以前 `tools/gen-mail-changelog.mjs` 生成 `src/data/mail-changelog.ts`，
 * 内容被编译进 JS —— 改一段版本说明就得回项目 `npm run build`，
 * 发行版里（没有 vite）根本做不到。现在改成运行时 JSON：
 * 直接改那份 JSON 或重跑生成器，**刷新浏览器就生效**，
 * 信封验收只动这一个文件，不必重新构建。
 *
 * 生成器：`node tools/gen-mail-changelog.mjs`（已挂 `prebuild`），
 * 从 `CHANGELOG.md` 取最近三版，每版前 5 条 bullet（每版开头的 `### 摘要`）。
 */
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
