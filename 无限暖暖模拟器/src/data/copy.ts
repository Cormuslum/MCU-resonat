/**
 * 固定文案的唯一来源：工坊侧的 `心忆奇想工坊/工具/文案.json`（v2.0.00）
 *
 * 为什么不放 `public/`：那里是素材目录，会被 `collect-assets.py` 当成管线产物扫描。
 * 这里用**静态 import**，Vite 会把它打进 bundle —— 代价是改完要让它热更新一次
 * （保存即触发 HMR，不用重启 dev server）。
 *
 * 工坊（`updater/`）读的是同一个文件，只是换成运行时 `fetch('/copy.json')`，
 * 因为工坊没有打包步骤。改文案时两边都不需要动代码。
 */
import raw from '@copy'

/** 段落样式（v2.0.01）：'' = 普通左对齐；h2 = 居中且字号两倍；warn = 居中且红色 */
export type MailStyle = '' | 'h2' | 'warn'

export interface MailBlock {
  text: string
  style: MailStyle
}

/** json 里一段可以是纯字符串，也可以是 `{ "text": "…", "style": "h2" }` */
export type MailBlockInput = string | { text: string; style?: string }

export interface MailCopy {
  hint: string
  kicker: string
  title: string
  body: MailBlockInput[]
  sign: string
}

/**
 * 把「纯字符串 / {text,style}」统一成 `MailBlock`。
 *
 * 只认 h2 / warn 两种样式，其余（含拼错的值）一律按普通段落 —— 文案是手写的，
 * 写错一个字形不该让整页崩掉或变成怪样式。
 */
export function mailBlocks(list: readonly MailBlockInput[]): MailBlock[] {
  return list.map((b) => {
    if (typeof b === 'string') return { text: b, style: '' as MailStyle }
    const style: MailStyle = b?.style === 'h2' || b?.style === 'warn' ? b.style : ''
    return { text: String(b?.text ?? ''), style }
  })
}

/**
 * 把信封正文里的 `**粗体**` 渲染成 `<b>`；其余内容**先转义再注入**（`v-html`）。
 *
 * 与工坊 `app.js` 的 `rich()` 同规则 —— `文案.json` 的 `_note` 已写明这套约定：
 * 「每段文字里的 **粗体** 会被渲染成加粗（只支持这一种标记）」。
 * 以前这里用 `{{ b.text }}` 纯文本渲染，星号就原样显示出来了；改成 `v-html="mailRich(...)"`。
 * 内容来自可信的 文案.json，但仍先转义 HTML，避免正文里的 `<`/`>` 被当标签。
 */
export function mailRich(text: string): string {
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
    )
  return esc(text ?? '').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
}

export const MAIL_COPY = raw.mail as MailCopy

export const COPY = raw
