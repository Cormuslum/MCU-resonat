/**
 * 素材识别：拖进来的文件属于哪一类、大概是什么、建议归档到哪。
 *
 * 原则：**只做建议，不做决定**。
 *   尺寸/文件名能 90% 猜准（游戏素材规格极其规整），但「这是哪个套装」「哪个池」
 *   必须由表单字段提供 —— 猜错一个字就会写进错误目录，比让用户点一下下拉贵得多。
 */
import path from 'node:path'
import { imageSize } from './util.mjs'

/** 素材类别表：key → 中文名 / 说明 / 归类分组（界面上按分组显示） */
export const KINDS = {
  versionCard: { label: '版本缩略图', group: '版本', hint: 'Card 目录 T_UI_Friends_Card_img_NNN.png（672×188）' },
  versionBig: { label: '版本大图', group: '版本', hint: 'Card 目录 T_UI_Pear_Card_img_NNN_L.png（1532×860）' },
  majorIcon: { label: '大版本图标', group: '版本', hint: '版本页左侧那座塔的图标（方形或竖图都行）' },
  bannerBg: { label: '服装阁背景', group: '服装阁', hint: '1920×1080，或 1000×500 的服装阁列表图（会自动裁 16:9）' },
  bannerThumb: { label: '服装阁缩略图', group: '服装阁', hint: '列表里那张小图，常见 320×140' },
  bannerVideo: { label: '服装阁动态背景', group: '服装阁', hint: 'webm / mp4，循环播放的阁背景' },
  bannerEnter: { label: '服装阁进入音', group: '服装阁', hint: 'mp3 / ogg / wav，进阁时那一下的音效' },
  titleArt: { label: '服装阁名艺术字', group: '服装阁', hint: '透明背景的书法字，如 T_UI_resonance_gacha_081_title.png' },
  namePlate: { label: '套装铭牌', group: '服装阁', hint: '332×96，带专属花纹的套名底板' },
  milestone: { label: '深海回响奖励图', group: '服装阁', hint: '文件名形如「120抽-XXX.png」（20~100 抽全池共用一张）' },
  setPortrait: { label: '套装立绘', group: '套装', hint: '448×656 竖图' },
  setBust: { label: '部件试穿图（半身像）', group: '套装', hint: '520×724（2 倍图也行），文件名 = 部位-部件名' },
  // 「立绘 / 整体图 / 进化立绘」在素材侧已合并成同一类（OV），
  // 三个 kind 都指向「整体图（OV）」这一个槽位，识别时按文件名区分阶段即可。
  setCardEvo: { label: '整体图（OV）', group: '套装', hint: '整体-初始/焕新/一进/二进/满进.png' },
  awaken: { label: '进化立绘（并入整体图）', group: '套装', hint: '进化LV1~n.png → 折算成焕新/一进/二进/满进' },
  partIcon: { label: '部件图标', group: '套装', hint: '256×256，文件名 = 部件名' },
  setIcon: { label: '套装图标', group: '套装', hint: '套装列表用的小图' },
  suitYaml: { label: '套装数据 YAML', group: '套装', hint: '属性 + 文案合并成的一份 YAML' },
  story: { label: '套装故事', group: '故事', hint: '「故事-X星-套装名.md」' },
  reading: { label: '阅读物', group: '阅读物', hint: '「《书名》.txt」，含【图鉴分区】【编号】头' },
  unknown: { label: '未识别', group: '其它', hint: '请手动选择类别' },
}

const PIC = /\.(png|jpe?g|webp|gif|bmp)$/i

/**
 * 猜类别。
 * @param {{name:string,w?:number,h?:number}} f  文件名与尺寸
 * @returns {{kind:string, confidence:'high'|'mid'|'low', note:string}}
 */
function classify(f) {
  const name = f.name
  const base = name.replace(/\.[^.]+$/, '')
  const ext = path.extname(name).toLowerCase()
  const { w = 0, h = 0 } = f
  const ar = w && h ? w / h : 0
  const hit = (kind, confidence, note) => ({ kind, confidence, note })

  /* ── 先看路径 / 文件名（「已整理好的文件夹」里这些词最可靠） ── */
  const rel = String(f.rel || f.dir || '').replace(/\\/g, '/')
  if (/半身像/.test(rel)) return hit('setBust', 'high', '在「半身像」目录里')
  if (/进化等阶/.test(rel)) return hit('setCardEvo', 'high', '在「进化等阶」目录里')
  if (/(部件)?图标/.test(rel) && PIC.test(ext)) return hit('partIcon', 'high', '在「图标」目录里')
  if (/^整体[-_]/.test(base)) return hit('setCardEvo', 'high', '文件名以「整体-」开头')
  if (/^(背景图?|bg)$/i.test(base) && PIC.test(ext)) return hit('bannerBg', 'high', '文件名是「背景图」')
  if (/^(列表)?缩略图$/.test(base)) return hit('bannerThumb', 'high', '文件名是「列表缩略图」')
  if (/^(艺术字|标题艺术字|titleart)$/i.test(base)) return hit('titleArt', 'high', '文件名是「艺术字」')
  if (/大版本(图标|图)$|版本塔/.test(base)) return hit('majorIcon', 'high', '文件名是「大版本图标」')

  // 动态背景：视频文件（webm / mp4）
  if (/\.(webm|mp4)$/i.test(ext)) return hit('bannerVideo', 'high', '视频文件 = 服装阁动态背景')

  // 进入音：音频文件。服装阁任务里拖音频进来，语义就是「这座阁的进入音」。
  // 给 mid 而不是 high —— .ogg/.mp3 也可能是别处的音效，允许手动改回去。
  if (/\.(mp3|ogg|wav|m4a|flac)$/i.test(ext)) return hit('bannerEnter', 'mid', '音频文件 = 服装阁进入音')

  if (/\.ya?ml$/i.test(ext)) return hit('suitYaml', 'high', 'YAML = 套装数据（属性 + 文案）')

  if (/\.md$/i.test(ext)) return hit('story', 'high', 'Markdown 文本')

  if (/\.txt$/i.test(ext)) {
    // 老式「X星-限定共鸣-《套装》.txt」已并入套装库 YAML（v1.9.03），这里只提示、不再自动归类
    if (/^\d星-/.test(base) || /共鸣/.test(base)) {
      return hit('unknown', 'mid', '套装文案已并入 套装库 YAML，这份 txt 不会单独登记')
    }
    if (base.startsWith('《')) return hit('reading', 'high', '书名以《》包裹')
    return hit('reading', 'mid', '纯文本，按阅读物处理（可改）')
  }

  if (!PIC.test(ext)) return hit('unknown', 'low', '不是图片/文本')

  // ── 精确尺寸优先（游戏素材规格很稳）
  if (w === 672 && h === 188) return hit('versionCard', 'high', '672×188 = Card 缩略图')
  if (w === 1532 && h === 860) return hit('versionBig', 'high', '1532×860 = Pear 版本大图')
  if (w === 1920 && h === 1080) return hit('bannerBg', 'high', '1920×1080 = 服装阁背景成品')
  if (w === 520 && h === 724) return hit('setBust', 'high', '520×724 = 部件试穿图（半身像）')
  if (w === 1040 && h === 1448) return hit('setBust', 'high', '1040×1448 = 2 倍半身像')
  if (w === 1000 && h === 500) return hit('bannerBg', 'high', '1000×500 = 服装阁列表图（裁 16:9 放大）')
  if (w === 332 && h === 96) return hit('namePlate', 'high', '332×96 = 套装铭牌')
  if (w === 256 && h === 256) {
    if (/^\d+抽[-_]/.test(base)) return hit('milestone', 'high', '「N抽-」前缀 = 深海回响奖励')
    return hit('partIcon', 'mid', '256×256，默认按部件图标（也可能是深海回响奖励）')
  }

  // ── 文件名线索
  if (/_title\.png$/i.test(name) || /_title$/i.test(base)) return hit('titleArt', 'high', '文件名含 _title')
  if (/_name(?:_?\d*)?\.png$/i.test(name) && ar > 2.2) return hit('namePlate', 'high', '文件名含 _name 且横长')
  if (/(觉醒|进化)\s*LV\d+/i.test(base)) return hit('awaken', 'high', '文件名含「觉醒LV / 进化LV」')
  if (/深海回响|深忆|^\d+抽/.test(base)) return hit('milestone', 'mid', '文件名像深海回响奖励')

  // ── 比例兜底
  // 16:9 但明显比版本大图（1532×860）大 → 只能是服装阁背景（4K 源图很常见）
  if (ar >= 1.7 && ar <= 1.85 && w >= 1900) return hit('bannerBg', 'high', `${w}×${h} 16:9 大图 = 服装阁背景`)
  if (ar >= 1.7 && ar <= 1.85 && w >= 1400) return hit('versionBig', 'mid', `${w}×${h} 接近 16:9 大图`)
  if (ar >= 1.7 && ar <= 1.85 && w >= 900) return hit('bannerBg', 'mid', `${w}×${h} 接近 16:9`)
  if (ar >= 2.1 && ar <= 2.45 && h >= 110 && h <= 150) return hit('bannerThumb', 'mid', `${w}×${h} 像列表缩略图`)
  if (ar >= 2.3 && ar <= 5 && h >= 80 && h <= 140) return hit('namePlate', 'mid', `${w}×${h} 像铭牌`)
  if (ar > 1.6 && ar < 5 && w >= 400) return hit('titleArt', 'low', '横长透明图，可能是艺术字')
  if (ar > 0 && ar < 1 && w >= 400) return hit('setPortrait', 'mid', `${w}×${h} 竖图，像套装立绘`)
  if (w >= 100 && w <= 512 && Math.abs(ar - 1) < 0.05) return hit('setIcon', 'low', '方形小图')

  return hit('unknown', 'low', `${w || '?'}×${h || '?'} 未匹配已知规格`)
}

/**
 * 识别一个磁盘文件。
 * @param {string} file        绝对路径
 * @param {string} [displayName] 展示名（默认取文件名）
 * @param {string} [relPath]     相对路径（「已整理好的文件夹」里靠它判断半身像/图标/进化等阶）
 */
export function inspectFile(file, displayName, relPath) {
  const size = imageSize(file)
  const name = displayName || path.basename(file)
  const rel = relPath || ''
  const c = classify({ name, w: size?.w, h: size?.h, rel })
  return {
    src: file,
    name,
    rel,
    w: size?.w ?? null,
    h: size?.h ?? null,
    type: size?.type ?? path.extname(file).slice(1).toLowerCase(),
    ...c,
  }
}
