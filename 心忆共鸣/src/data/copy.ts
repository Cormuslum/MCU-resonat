/**
 * 固定文案的唯一来源：工坊侧的 `心忆奇想工坊/工具/文案.json`（不放 `public/` —— 那里是素材目录）。
 */
import raw from '@copy'

/** 段落样式：'' = 普通左对齐；h2 = 居中且字号两倍；warn = 居中且红色 */
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
 * 只认 h2 / warn 两种样式，其余（含拼错的值）一律按普通段落。
 */
export function mailBlocks(list: readonly MailBlockInput[]): MailBlock[] {
  return list.map((b) => {
    if (typeof b === 'string') return { text: b, style: '' as MailStyle }
    const style: MailStyle = b?.style === 'h2' || b?.style === 'warn' ? b.style : ''
    return { text: String(b?.text ?? ''), style }
  })
}

/**
 * 把信封正文里的 `**粗体**` 渲染成 `<b>`，其余内容先转义再注入；与工坊 `app.js` 的 `rich()` 同规则。
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
