/** 心忆奇想工坊 · 前端（原生 JS，无框架） */

const $ = (s, r = document) => r.querySelector(s)
const $$ = (s, r = document) => [...r.querySelectorAll(s)]

const S = {
  jobs: {},
  kinds: {},
  options: { versions: [], pools: [], suitNames: [], suitList: [], slots: [], customPools: [], customSets: [] },
  overview: {},
  snapshots: [],
  job: 'version',
  fields: {},         // 当前任务的表单值（切换任务时存进 cache）
  cache: {},          // 每个任务各自的 fields / files，切来切去不丢
  files: [],          // [{slot, setIndex, src, name, w, h, kind, file?}]
  pending: [],        // 识别了但没自动归位的
  picked: new Set(),  // 待分配里勾选的下标（批量操作用）
  bundlePlan: null,   // 「整套导入」的扫描结果
  fixNote: null,      // 「去服装阁补全」时顶部的对账单（已带入 / 还缺什么）
  busy: false,
  dlc: null,          // DLC 面板的数据（src 包 / 运行区 / 候选 / 远端）
}

/* ────────────────────────────── 音效 ────────────────────────────── */
const SFX = {}
let audioReady = false
function sfx(name, vol = 0.4) {
  try {
    if (!audioReady) return
    if (!SFX[name]) SFX[name] = new Audio(`/assets/sfx/${name}.ogg`)
    const a = SFX[name].cloneNode()
    a.volume = vol
    a.play().catch(() => {})
  } catch { /* 静音失败无所谓 */ }
}
function unlockAudio() {
  if (audioReady) return
  audioReady = true
  sfx('nav-hover', 0.2)
}

/* ────────────────────────────── 基础 UI ────────────────────────────── */

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

function setStatus(text, cls = '') {
  $('#status-text').textContent = text
  $('#status').className = 'status ' + cls
}

function log(kind, text) {
  const el = document.createElement('div')
  el.className = 'l ' + (kind || '')
  el.textContent = text
  const box = $('#log')
  box.appendChild(el)
  box.scrollTop = box.scrollHeight
}

function clearLog() { $('#log').innerHTML = '' }

/* ────────────────────────────── 文案（项目根 文案.json） ────────────────────────────── */
/** 固定文案的真源是项目根的 `文案.json`（`server.mjs` 挂在 `/copy.json`）：顶栏按 `data-copy*` 覆盖， 帮助弹窗整段重建；`index.html` 里的中文是同名兜底 */
let COPY = null

/** 'updater.help.title' → COPY.updater.help.title */
function pick(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj)
}

/** 取 `updater.<key>` 的文案，取不到就用第二参数（页面/代码里的原文）。第二参数是唯一的兜底：`文案.json` 缺键、读失败时靠它 */
function C(key, fallback) {
  const v = pick(COPY, 'updater.' + key)
  return typeof v === 'string' && v ? v : fallback
}

/** 同上，顺带把 `{name}` 占位换成实际值 */
function CT(key, fallback, vars) {
  let out = C(key, fallback)
  for (const [k, v] of Object.entries(vars || {})) out = out.split(`{${k}}`).join(String(v))
  return out
}

/** 极简标记：`**粗体**` → `<b>`；其余全部转义（文案不该被当 HTML 执行） */
function rich(text) {
  return esc(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
}

function applyCopy() {
  if (!COPY) return
  for (const el of $$('[data-copy]')) {
    const v = pick(COPY, el.dataset.copy)
    if (typeof v === 'string' && v) el.innerHTML = rich(v)
  }
  for (const el of $$('[data-copy-title]')) {
    const v = pick(COPY, el.dataset.copyTitle)
    if (typeof v === 'string' && v) el.title = v
  }
  for (const el of $$('[data-copy-alt]')) {
    const v = pick(COPY, el.dataset.copyAlt)
    if (typeof v === 'string' && v) el.alt = v
  }

  const steps = pick(COPY, 'updater.help.steps')
  if (Array.isArray(steps) && steps.length) {
    $('#help-steps').innerHTML = steps.map((t) => `<li>${rich(t)}</li>`).join('')
  }
  const notes = pick(COPY, 'updater.help.notes')
  if (Array.isArray(notes) && notes.length) {
    $('#help-notes').innerHTML = notes.map((t) => `<p class="muted">${rich(t)}</p>`).join('')
  }

  const title = pick(COPY, 'updater.pageTitle')
  if (typeof title === 'string' && title) document.title = title
}

async function loadCopy() {
  try {
    const r = await fetch('/copy.json', { cache: 'no-cache' })
    if (!r.ok) throw new Error('HTTP ' + r.status)
    COPY = await r.json()
    applyCopy()
  } catch (e) {
    // 只影响文字：index.html 的兜底还在，功能不受影响，不要打断启动
    console.error('[updater] 文案.json 读取失败（沿用页面里的兜底文字）', e)
  }
}

/* ────────────────────────────── 载入 ────────────────────────────── */

async function loadState() {
  setStatus(pick(COPY, 'updater.topbar.statusLoading') || '正在读取素材库…')
  const r = await fetch('/api/state')
  const d = await r.json()
  if (!d.ok) throw new Error(C('status.readFail', '读取失败'))
  S.jobs = d.jobs
  S.kinds = d.kinds
  S.options = d.options
  S.overview = d.overview
  S.snapshots = d.snapshots
  S.dlc = d.dlc

  // 顶栏悬停提示：这次到底在改**哪一份**数据
  // 发行版和开发版都叫「心忆奇想工坊」，端口也都默认 5199
  // 光看界面分不出连的是哪个
  {
    const lb = d.labels || {}
    const tip = []
    if (lb.data) tip.push(`数据：${lb.data}`)
    if (lb.out) tip.push(`成品：${lb.out}`)
    if (d.dataRoot) tip.push(`绝对路径：${d.dataRoot}`)
    if (tip.length) $('#status').title = tip.join('\n')
  }

  const o = d.overview
  setStatus(
    CT('status.overview', '{versions} 个版本 · {banners} 座服装阁 · {sets} 套服装 · {stories} 篇故事 · {readings} 篇阅读物', o),
    'live',
  )
  renderRail()
  renderHistory()
  renderPanel()
  $('#app').classList.remove('boot')
}

function renderRail() {
  const wrap = $('#rail-jobs')
  const jobs = Object.values(S.jobs).map((j) => `
    <button class="rail-item${j.id === S.job ? ' on' : ''}" data-job="${j.id}">
      <span class="ic">${j.icon || '·'}</span><span>${esc(j.title)}</span>
    </button>`).join('')
  // 「扩展包」不是一种更新任务，是分发面板
  const dlc = `    <button class="rail-item rail-dlc${S.job === 'dlc' ? ' on' : ''}" data-job="dlc">
      <span class="ic">⬓</span><span>${C('rail.dlc', '扩展包')}</span>
    </button>`
  wrap.innerHTML = jobs + dlc
  $$('.rail-item', wrap).forEach((b) => {
    b.onclick = () => switchJob(b.dataset.job)
    b.onmouseenter = () => sfx('nav-hover', 0.25)
  })
}

function renderHistory() {
  const wrap = $('#rail-history')
  if (!S.snapshots.length) {
    wrap.innerHTML = `<div class="empty">${C('rail.empty', '还没有改动记录')}</div>`
    return
  }
  wrap.innerHTML = S.snapshots.map((s) => `
    <div class="h-item" data-id="${esc(s.id)}">
      <b>${esc(s.id.split('-').slice(0, 2).join(' '))}</b>
      <span>${CT('rail.item', '{count} 个文件 · 点击撤回', { count: s.count })}</span>
    </div>`).join('')
  $$('.h-item', wrap).forEach((el) => {
    el.onclick = () => rollback(el.dataset.id)
  })
}

/* ────────────────────────────── 任务切换 ────────────────────────────── */

function switchJob(id) {
  if (S.busy) return
  // 先存现场
  S.cache[S.job] = { fields: S.fields, files: S.files, pending: S.pending, bundlePlan: S.bundlePlan }
  S.job = id
  const keep = S.cache[id]
  S.fields = keep?.fields || {}
  S.files = keep?.files || []
  S.pending = keep?.pending || []
  S.picked = new Set()
  S.bundlePlan = keep?.bundlePlan || null
  S.fixNote = null
  sfx('nav-select', 0.3)
  renderRail()
  renderPanel()
}

/** DLC 面板不是 jobs 里的任务，单独渲染 */
function isDlc() { return S.job === 'dlc' }

/* ────────────────────────────── 渲染：表单 ────────────────────────────── */

function optionsOf(f) {
  if (f.type === 'versions') return S.options.versions.map((v) => [v.v, `${v.v} · ${v.name}`])
  if (f.type === 'pools') {
    const ver = S.fields.version
    return S.options.pools.filter((p) => !ver || p.version === ver).map((p) => [p.name, p.name])
  }
  return []
}

function fieldHtml(f) {
  // 条件字段：`when: {mode:'edit'}`
  if (f.when) {
    for (const [k, v] of Object.entries(f.when)) {
      if (String(S.fields[k] ?? '') !== String(v)) return ''
    }
  }
  let val = S.fields[f.key] ?? ''
  // 大版本号默认取现有的最新一个大版本（新增小版本时不用手改）
  if (f.type === 'major' && !val) {
    const list = S.options.majors || []
    val = list.length ? list[list.length - 1].major : '1'
    S.fields[f.key] = val
  }
  const cls = ['field', f.width === 'short' ? 'w-short' : '', f.type === 'textarea' ? 'w-full' : ''].join(' ')
  const label = `<label for="f-${f.key}">${esc(f.label)}${f.required ? '<span class="req">*</span>' : ''}</label>`
  let input

  if (f.type === 'setlist') {
    // 阁内套装清单：勾上 = 移出
    // 值是逗号分隔的套装名（后端按这个删）
    const pool = (S.options.customPools || []).find((p) => p.name === String(S.fields.target || ''))
    const cur = new Set(String(S.fields[f.key] || '').split(',').map((s) => s.trim()).filter(Boolean))
    if (!pool) {
      input = `<div class="hint" style="padding:6px 0">${C('panel.emptyPickPool', '先在上面选一座阁')}</div>`
    } else if (!pool.sets.length) {
      input = `<div class="hint" style="padding:6px 0">${C('panel.emptyPoolSets', '这座阁里还没有套装')}</div>`
    } else {
      input = `<div class="setlist">${pool.sets.map((n) => `
        <label class="setrow"><input type="checkbox" data-setpick="${esc(n)}"${cur.has(n) ? ' checked' : ''} />
          <span>${esc(n)}</span><span class="tag">${C('panel.tagRemove', '移出')}</span></label>`).join('')}</div>`
    }
  } else if (f.type === 'select' || f.type === 'versions' || f.type === 'pools' || f.type === 'sets'
    || f.type === 'customPools' || f.type === 'customSets') {
    let opts = []
    if (f.type === 'select') opts = f.options || []
    // 套装下拉按**套装序号**排：suitList 已由后端按 套装序列.csv 的序号排好
    else if (f.type === 'sets') {
      const list = S.options.suitList || []
      opts = list.length ? list.map((s) => [s.name, s.name]) : (S.options.suitNames || []).map((n) => [n, n])
    }
    else if (f.type === 'customPools') {
      opts = (S.options.customPools || []).map((p) => [p.name, `${p.version} · ${p.name}（${p.gachaKey}）`])
    } else if (f.type === 'customSets') {
      opts = (S.options.customSets || []).map((s) => [s.name, `${s.name} · ${s.star}★ · ${s.pool}`])
    } else opts = optionsOf(f)
    // sets 类型（如故事要挂哪一套）必须显式选择，不能默认第一项
    // 版本下拉默认**最新版本**（列表已按版本号升序）
    // 「要修改的阁 / 套装」不自动选：它一选中就要回填整张表单
    let auto = ''
    if (f.type !== 'sets' && f.type !== 'customPools' && f.type !== 'customSets' && opts.length) {
      auto = f.type === 'versions' ? opts[opts.length - 1][0] : opts[0][0]
    }
    const cur = val || f.default || auto
    if (!val && cur) S.fields[f.key] = cur
    input = `<select id="f-${f.key}" data-key="${f.key}">
      ${f.type === 'sets' ? `<option value="">${C('panel.optSet', '— 选一个已有套装 —')}</option>` : ''}
      ${f.type === 'customPools' ? `<option value="">${C('panel.optCustomPool', '— 选一座自建的阁 —')}</option>` : ''}
      ${f.type === 'customSets' ? `<option value="">${C('panel.optCustomSet', '— 选一套自建的服装 —')}</option>` : ''}
      ${(f.type === 'customPools' || f.type === 'customSets') ? (
        opts.length ? '' : `<option value="">${C('panel.optNoCustom', '（还没有自建内容：先新建一个）')}</option>`
      ) : ''}
      ${(cur && !opts.some(([v]) => String(v) === String(cur)))
        ? `<option value="${esc(cur)}" selected>${esc(cur)}（不在套装列表）</option>` : ''}
      ${opts.map(([v, t]) => `<option value="${esc(v)}"${String(cur) === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}
    </select>`
  } else if (f.type === 'major') {
    // 大版本号：datalist 给已有的号可选，也允许直接敲一个新号（= 新增大版本）
    const list = S.options.majors || []
    input = `<input type="text" id="f-${f.key}" data-key="${f.key}" list="major-list"
      value="${esc(val)}" placeholder="${esc(f.placeholder || '')}" />
      <datalist id="major-list">
        ${list.map((m) => `<option value="${esc(m.major)}">${esc(m.name)}</option>`).join('')}
      </datalist>`
  } else if (f.type === 'setsearch') {
    // 套装搜索：输名字或星级（5 / 5星 / 4）即时筛，**结果全列**（容器高度固定 10 行）
    input = `<div class="combo" data-combo="set">
      <input type="text" id="f-${f.key}" data-key="${f.key}" data-search="set"
        value="${esc(val)}" placeholder="${esc(f.placeholder || '')}" autocomplete="off" />
      <div class="combo-list" hidden></div>
    </div>`
  } else if (f.type === 'textarea') {
    input = `<textarea id="f-${f.key}" data-key="${f.key}" class="${f.tall ? 'tall' : ''}" placeholder="${esc(f.placeholder || '')}">${esc(val)}</textarea>`
  } else {
    input = `<input type="text" id="f-${f.key}" data-key="${f.key}" value="${esc(val)}" placeholder="${esc(f.placeholder || '')}" />`
  }
  return `<div class="${cls}" data-field="${f.key}">${label}${input}${f.hint ? `<span class="hint">${rich(f.hint)}</span>` : ''}</div>`
}

function bindFields(root) {
  // 「阁内套装」勾选框：勾上就是移出（拼成逗号串交给后端）
  $$('[data-setpick]', root).forEach((el) => {
    el.addEventListener('change', () => {
      const cur = new Set(String(S.fields.setRemove || '').split(',').map((s) => s.trim()).filter(Boolean))
      if (el.checked) cur.add(el.dataset.setpick)
      else cur.delete(el.dataset.setpick)
      S.fields.setRemove = [...cur].join(',')
    })
  })

  /* ── 套装搜索框── 输名字或星级 → 立即筛，**全部列出**（容器固定 10 行高，超出滚动）； 点中一条 = 把它写进「套装名」「星级」，并把这篇故事的正文取回来 */
  const sb = $('[data-search="set"]', root)
  if (sb) {
    const wrap = sb.closest('.combo')
    const listEl = $('.combo-list', wrap)
    const close = () => { listEl.hidden = true; listEl.innerHTML = '' }
    const pick = (name) => {
      const item = (S.options.suitList || []).find((s) => s.name === name)
      S.fields.name = name
      if (item?.star) S.fields.star = item.star
      sb.value = ''
      close()
      renderPanel()
      previewStory(name)
    }
    const render = () => {
      const q = sb.value.trim()
      if (!q) { close(); return }
      const all = S.options.suitList || []
      const starOnly = /^([45])\s*星?$/.exec(q)     // 只输了星级 → 按星级筛
      let hits = all
      if (starOnly) hits = all.filter((s) => String(s.star) === starOnly[1])
      else {
        const low = q.toLowerCase()
        hits = all.filter((s) => s.name.toLowerCase().includes(low)
          || String(s.id || '').toLowerCase().includes(low))
      }
      listEl.innerHTML = hits.length
        ? hits.map((s) => `<button type="button" class="combo-item" data-pick="${esc(s.name)}">
             <span class="ci-name">${esc(s.name)}</span>
             <span class="ci-meta">${esc(s.star ? `${s.star}★` : '')}${s.seq ? ` · #${s.seq}` : ''}</span>
           </button>`).join('')
        : `<div class="combo-empty">没有匹配的套装</div>`
      listEl.hidden = false
      // 超过一屏时在底部注明总数（列表本身可滚，不截断）
      listEl.dataset.more = hits.length > 10 ? `共 ${hits.length} 条，滚动查看` : ''
    }
    sb.addEventListener('input', render)
    sb.addEventListener('focus', render)
    sb.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { close(); return }
      if (e.key === 'Enter') {
        const first = $('.combo-item', listEl)
        if (first) { e.preventDefault(); pick(first.dataset.pick) }
      }
    })
    // mousedown 而不是 click：失焦会先收起列表，click 就点不到了
    listEl.addEventListener('mousedown', (e) => {
      const b = e.target.closest('.combo-item')
      if (!b) return
      e.preventDefault()
      pick(b.dataset.pick)
    })
    sb.addEventListener('blur', () => setTimeout(close, 160))
  }

  $$('[data-key]', root).forEach((el) => {
    const k = el.dataset.key
    const ev = el.tagName === 'SELECT' ? 'change' : 'input'
    el.addEventListener(ev, () => {
      S.fields[k] = el.value
      const fdef = (S.jobs[S.job].fields || []).find((x) => x.key === k) || {}

      if (k === 'name' && fdef.type === 'sets' && el.value) previewStory(el.value)

      // 切换「新建 / 修改」：把上一种模式留下的目标与名字清掉
      if (k === 'mode') {
        for (const key of ['target', 'name', 'gachaKey', 'setId', 'setRemove', 'setAdd']) delete S.fields[key]
        renderPanel()
        return
      }

      // 选了要修改的目标 → 整张表单按它回填
      if (k === 'target' && (fdef.type === 'customPools' || fdef.type === 'customSets')) {
        if (fdef.type === 'customPools') {
          const tgt = (S.options.customPools || []).find((x) => x.name === el.value)
          if (tgt) {
            S.fields.version = tgt.version
            S.fields.name = tgt.name
            S.fields.gachaKey = tgt.gachaKey
            const isCustomType = !['limited', 'standard'].includes(tgt.type)
            S.fields.type = isCustomType ? 'custom' : tgt.type
            S.fields.typeName = isCustomType ? tgt.type : ''
            S.fields.setRemove = ''
          }
        } else {
          const tgt = (S.options.customSets || []).find((x) => x.name === el.value)
          if (tgt) {
            S.fields.version = tgt.version
            S.fields.pool = tgt.pool
            S.fields.name = tgt.name
            S.fields.star = tgt.star
            S.fields.setId = tgt.id
          }
        }
        renderPanel()
        return
      }
      // 选了 / 敲了一个已有的大版本号 → 自动带出它的名字
      if (k === 'major') {
        const hit = (S.options.majors || []).find((m) => String(m.major) === String(el.value).trim())
        const nameEl = $$('[data-field="majorName"] [data-key]', root)[0]
        if (nameEl && hit) { nameEl.value = hit.name; S.fields.majorName = hit.name }
      }
      // 版本变了，池下拉要跟着重算
      if (k === 'version') {
        const poolField = $$('[data-field="pool"]', root)[0]
        if (poolField) {
          const f = (S.jobs[S.job].fields || []).find((x) => x.key === 'pool')
          poolField.outerHTML = fieldHtml(f)
          bindFields(root)
        }
      }
    })
    if (el.tagName !== 'SELECT') {
      el.addEventListener('focus', () => sfx('nav-hover', 0.2))
    }
  })
}

/* ────────────────────────────── 渲染：槽位 ────────────────────────────── */

function filesAt(slot, setIndex) {
  return S.files.filter((f) => f.slot === slot && (f.setIndex ?? null) === (setIndex ?? null))
}

function thumbUrl(f) {
  if (f.file) return URL.createObjectURL(f.file)
  return `/api/thumb?p=${encodeURIComponent(f.src)}`
}

function slotHtml(def, setIndex = null) {
  const list = filesAt(def.key, setIndex)
  const filled = list.length > 0
  const body = filled
    ? list.map((f, i) => `
        <div class="thumb">
          ${/\.(png|jpe?g|webp|gif|bmp)$/i.test(f.name) ? `<img src="${thumbUrl(f)}" alt="" loading="lazy" />` : `<div style="width:42px;height:42px;display:grid;place-items:center;color:#b08a4a;font-size:18px">✎</div>`}
          <div class="meta">
            <div class="fn" title="${esc(f.name)}">${esc(f.name)}</div>
            <div class="dim">${f.w ? `${f.w}×${f.h}` : (f.kind ? S.kinds[f.kind]?.label : '')}</div>
          </div>
          <button class="del" data-del="${def.key}" data-idx="${setIndex ?? ''}" data-i="${i}" title="${C('panel.remove', '移除')}">×</button>
        </div>`).join('')
    : `<div class="slot-empty">${C('panel.slotEmpty', '拖到这里 / 点右侧按路径读取')}</div>`

  return `<div class="slot${filled ? ' filled' : ''}" data-slot="${def.key}" data-set="${setIndex ?? ''}">
    <div class="slot-top">
      <span class="slot-name">${esc(def.label)}</span>
      ${def.multiple ? `<span class="slot-must">${C('panel.slotMulti', '可多张')}</span>` : ''}
    </div>
    <div class="slot-body">${body}</div>
    ${def.hint ? `<div class="slot-hint">${rich(def.hint)}</div>` : ''}
  </div>`
}

function bindSlots(root) {
  $$('[data-del]', root).forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation()
      const slot = b.dataset.del
      const si = b.dataset.idx === '' ? null : Number(b.dataset.idx)
      const i = Number(b.dataset.i)
      const target = S.files.filter((f) => f.slot === slot && (f.setIndex ?? null) === si)
      const victim = target[i]
      S.files = S.files.filter((f) => f !== victim)
      sfx('paper-flip', 0.3)
      renderPanel()
    }
  })

  // 槽位可点：弹出「按路径读取」并指定落点
  $$('.slot', root).forEach((el) => {
    el.ondragover = (e) => { e.preventDefault(); el.classList.add('hot') }
    el.ondragleave = () => el.classList.remove('hot')
    el.ondrop = (e) => {
      e.preventDefault()
      e.stopPropagation()
      el.classList.remove('hot')
      handleDrop(e.dataTransfer, {
        slot: el.dataset.slot,
        setIndex: el.dataset.set === '' ? null : Number(el.dataset.set),
      })
    }
    el.onclick = () => {
      const fi = $('#path-input')
      if (!fi) return
      fi.dataset.slot = el.dataset.slot
      fi.dataset.set = el.dataset.set
      fi.focus()
      fi.placeholder = CT('panel.slotPaste', '粘贴「{label}」的完整路径后回车', {
        label: S.jobs[S.job].groups.flatMap((g) => g.slots).find((s) => s.key === el.dataset.slot)?.label || '',
      })
    }
  })
}

/* ────────────────────────────── 渲染：整体 ────────────────────────────── */

function renderPanel() {
  if (isDlc()) { renderDlcPanel(); return }
  const def = S.jobs[S.job]
  if (!def) return
  $('#job-title').textContent = def.title
  $('#job-sub').textContent = def.subtitle || ''
  $('#log-title').textContent = CT('console.idleWith', '等待开始 · {title}', { title: def.title })

  const fields = (def.fields || []).map(fieldHtml).join('')

  // 「修改已有」时不显示重复的套装组，增删走上面的「移出 / 追加」
  const editMode = String(S.fields.mode || 'new') === 'edit'
  const groups = (def.groups || []).filter((g) => !(editMode && g.repeat)).map((g) => {
    if (g.repeat) return setGroupHtml(g)
    return `<div class="group">
      <div class="group-head">
        <span class="gt">${esc(g.label)}</span>
        ${g.hint ? `<span class="gh">${rich(g.hint)}</span>` : ''}
        <span class="line"></span>
      </div>
      <div class="slots">${g.slots.map((s) => slotHtml(s)).join('')}</div>
    </div>`
  }).join('')

  const slotOptions = allSlotDefs()
    .map((s) => `<option value="${s.key}|${s.setIndex ?? ''}">${esc(s.label)}${s.setIndex !== null ? ` #${s.setIndex + 1}` : ''}</option>`)
    .join('')
  const pending = S.pending.length ? `
    <div class="inbox">
      <h4>
        ${CT('panel.pending', '待分配 · {count} 个', { count: S.pending.length })}
        <span class="inbox-ops">
          <label class="pk-all"><input type="checkbox" id="pk-all"${S.picked.size && S.picked.size === S.pending.length ? ' checked' : ''} /> ${C('panel.selectAll', '全选')}</label>
          <select id="pk-target"><option value="">${C('panel.pickPlaceholder', '放到…')}</option>${slotOptions}</select>
          <button class="btn tiny" id="pk-assign">${C('panel.assign', '应用')}</button>
          <button class="btn tiny ghost" id="pk-del">${C('panel.deleteSelected', '删除选中')}</button>
          <button class="btn tiny ghost" id="pk-clear">${C('panel.clear', '清空')}</button>
        </span>
      </h4>
      ${S.pending.map((f, i) => `
        <div class="row${S.picked.has(i) ? ' on' : ''}">
          <input type="checkbox" class="pk-box" data-pick="${i}"${S.picked.has(i) ? ' checked' : ''} />
          <span class="fn" title="${esc(f.src || f.name)}">${esc(f.name)}</span>
          <span class="kind">${esc(S.kinds[f.kind]?.label || f.kind)}</span>
          <select data-assign="${i}">
            <option value="">${C('panel.pickPlaceholder', '放到…')}</option>
            ${slotOptions}
          </select>
          <button class="del" data-pkdel="${i}" title="${C('panel.remove', '移除')}">×</button>
        </div>`).join('')}
    </div>` : ''

  const writes = (def.writes || []).length ? `
    <div class="writes">
      <h4>${C('panel.willWrite', '这次会写入')}</h4>
      ${def.writes.map((w) => `<div class="w">${esc(fillTemplate(w))}</div>`).join('')}
    </div>` : ''

  const isBundle = S.job === 'bundle'

  const fixNote = (S.fixNote || []).length ? `<div class="fix-note">
    ${S.fixNote.map((x) => `<div class="fx${x.kind === 'bad' ? ' bad' : ''}">${x.kind === 'bad' ? '⚠' : '✓'} ${esc(x.text)}</div>`).join('')}
  </div>` : ''

  $('#panel').innerHTML = `
    ${fixNote}
    <div class="fields">${fields}</div>
    ${isBundle ? bundleHtml() : ''}
    ${groups}
    ${pending}
    ${writes}
    ${isBundle ? '' : `<div class="pathbox">
      <input id="path-input" type="text" placeholder="${C('panel.pathPlaceholder', '也可以直接粘贴完整文件路径（或文件夹路径）后回车')}" />
      <button class="btn ghost" id="btn-path">${C('panel.read', '读取')}</button>
    </div>`}`

  bindFields($('#panel'))
  bindSlots($('#panel'))
  bindPending()
  if (isBundle) bindBundle()
  if ($('#btn-path')) {
    $('#btn-path').onclick = () => readPaths()
    $('#path-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') readPaths()
    })
  }
}

function setGroupHtml(g) {
  const count = Math.max(1, Number(S.fields.setCount || 1))
  S.fields.setCount = count
  const cards = []
  for (let i = 0; i < count; i++) {
    cards.push(`<div class="set-card" data-setcard="${i}">
      <div class="set-head">
        <span class="set-idx">${i + 1}</span>
        <div class="set-fields">
          <div class="field"><label>${C('panel.setName', '套装名')}<span class="req">*</span></label>
            <input type="text" data-key="set${i}Name" value="${esc(S.fields[`set${i}Name`] || '')}" placeholder="${C('panel.setNamePlaceholder', '绽若颂愿心')}" /></div>
          <div class="field w-short"><label>${C('panel.setStar', '星级')}</label>
            <select data-key="set${i}Star">
              <option value="5"${(S.fields[`set${i}Star`] || '5') === '5' ? ' selected' : ''}>5★</option>
              <option value="4"${S.fields[`set${i}Star`] === '4' ? ' selected' : ''}>4★</option>
            </select></div>
          <div class="field w-short"><label>${C('panel.setId', '套装ID')}</label>
            <input type="text" data-key="set${i}Id" value="${esc(S.fields[`set${i}Id`] || '')}" placeholder="${C('panel.setIdPlaceholder', '留空自动')}" /></div>
        </div>
        ${count > 1 ? `<button class="set-del" data-setdel="${i}" title="${C('panel.deleteSet', '删掉这套')}">×</button>` : ''}
      </div>
      <div class="slots">${g.slots.map((s) => slotHtml(s, i)).join('')}</div>
    </div>`)
  }
  return `<div class="group">
    <div class="group-head">
      <span class="gt">${esc(g.label)}</span>
      ${g.hint ? `<span class="gh">${rich(g.hint)}</span>` : ''}
      <span class="line"></span>
      <button class="group-add" id="btn-addset">${C('panel.addSet', '＋ 再加一套')}</button>
    </div>
    ${cards.join('')}
  </div>`
}

/* ────────────────────────────── 整套导入 ────────────────────────────── */

/** 「整套导入」的预览：把扫描结果按 大版本 / 版本 / 阁 / 套装 列出来， 写入前就能看出缺了什么，不用先写一遍再回滚 */
function bundleHtml() {
  const plan = S.bundlePlan
  const head = `
    <div class="bundle-bar">
      <button class="btn" id="btn-scan">${C('bundle.scan', '扫描文件夹')}</button>
      <span class="bundle-tip">${plan ? C('bundle.tipReady', '确认无误后直接点右下角「写入并更新」，一次跑完') : C('bundle.tipBefore', '先粘贴文件夹路径，再点「扫描文件夹」')}</span>
    </div>`
  if (!plan) return `<div class="bundle">${head}</div>`

  const rows = []
  for (const m of plan.majors) {
    rows.push(`<div class="b-major"><b>${CT('bundle.major', '大版本 {major}', { major: esc(m.major) })}</b> · ${esc(m.name)}${m.icon ? ' ' + C('bundle.hasIcon', '· 含图标') : ''}</div>`)
    for (const v of m.versions) {
      rows.push(`<div class="b-ver">　${CT('bundle.version', '版本 {v} {name}', { v: esc(v.v), name: esc(v.name) })}${v.card ? ' ' + C('bundle.hasCard', '· 缩略图') : ''}${v.big ? ' ' + C('bundle.hasBig', '· 大图') : ''}</div>`)
      for (const p of v.pools) {
        rows.push(`<div class="b-pool">　　▸ ${esc(p.name)}
          <span class="b-tags">
            ${p.bg ? C('bundle.bg', '背景') + ' ' : `<i>${C('bundle.lackBg', '缺背景')}</i>`}
            ${p.thumb ? C('bundle.thumb', '缩略图') + ' ' : ''}
            ${p.titleArt ? C('bundle.titleArt', '艺术字') + ' ' : `<i>${C('bundle.lackTitle', '缺艺术字')}</i>`}
            ${p.milestones.length ? CT('bundle.milestones', '深海 {n}', { n: p.milestones.length }) + ' ' : ''}
          </span></div>`)
        for (const st of p.sets) {
          rows.push(`<div class="b-set">　　　· ${esc(st.id)} ${esc(st.name)}（${st.star}★）
            ${CT('bundle.busts', '半身像 {n}', { n: st.busts.length })} · ${CT('bundle.icons', '图标 {n}', { n: st.icons.length })} · ${CT('bundle.evos', '进化 {n}', { n: st.evos.length })}
            ${st.yaml ? C('bundle.hasYaml', '· 属性') : `<i>${C('bundle.noYaml', '· 无属性(自动生成)')}</i>`}
            ${st.story ? C('bundle.hasStory', '· 故事') : ''}</div>`)
        }
      }
    }
  }
  const n = {
    major: plan.majors.length,
    ver: plan.majors.reduce((a, m) => a + m.versions.length, 0),
    pool: plan.majors.reduce((a, m) => a + m.versions.reduce((k, v) => k + v.pools.length, 0), 0),
    set: plan.majors.reduce((a, m) => a + m.versions.reduce((k, v) => k + v.pools.reduce((j, p) => j + p.sets.length, 0), 0), 0),
  }
  const orphans = plan.orphans || []
  const orphanHtml = orphans.length ? `<div class="b-orphan">
    <div class="b-orphan-h">${CT('bundle.orphanTitle', '这 {n} 项认不出归属，去对应栏目补一下缺的信息', { n: `<b>${orphans.length}</b>` })}</div>
    ${orphans.map((o, i) => `<div class="b-orphan-row">
      <div class="b-orphan-main"><b>${esc(o.name)}</b>
        <span class="b-orphan-why">${esc(o.reason || '')}</span></div>
      ${(o.pools || []).filter((x) => x !== o.name).length
        ? `<div class="b-orphan-pools">${o.pools.filter((x) => x !== o.name).map((p) => esc(p)).join(' · ')}</div>`
        : ''}
      <button class="btn mini" data-orphan="${i}">${C('bundle.orphanGo', '去「服装阁」填写')}</button>
    </div>`).join('')}
  </div>` : ''

  return `<div class="bundle">
    ${head}
    <div class="b-sum">${(n.major || n.ver || n.pool || n.set || plan.readings.length)
      ? CT('bundle.sum', '识别到 {major} 个大版本 · {ver} 个版本 · {pool} 座服装阁 · {set} 套服装 · {reading} 篇阅读物', { major: `<b>${n.major}</b>`, ver: `<b>${n.ver}</b>`, pool: `<b>${n.pool}</b>`, set: `<b>${n.set}</b>`, reading: `<b>${plan.readings.length}</b>` })
      : C('bundle.onlyOrphan', '没认出完整的「大版本 / 版本 / 服装阁」层级 —— 下面列出能认出来的部分，去对应栏目补齐信息就能写入')}</div>
    ${orphanHtml}
    <div class="b-list">${rows.join('')}</div>
    ${(plan.warnings || []).length ? `<div class="b-warn">${plan.warnings.map((w) => `⚠ ${esc(w)}`).join('<br />')}</div>` : ''}
  </div>`
}

async function bindBundle() {
  const btn = $('#btn-scan')
  if (!btn) return
  // 「认不出归属」的条目：一键跳到「服装阁」，把扫描到的素材全部带过去
  $$('[data-orphan]').forEach((b) => {
    b.onclick = () => {
      const o = (S.bundlePlan?.orphans || [])[Number(b.dataset.orphan)]
      if (o) jumpToOrphan(o)
    }
  })
  btn.onclick = async () => {
    const root = String(S.fields.root || '').trim()
    if (!root) { log('warn', '先填文件夹路径（或把整个文件夹拖进来）'); return }
    btn.disabled = true
    try { await scanBundleRoot(root) } finally { btn.disabled = false }
  }
}

/** 扫一个文件夹并把计划挂到界面上（扫描按钮与「拖文件夹」共用这一条路） */
async function scanBundleRoot(root) {
  if (!root) return false
  setStatus(C('status.scanBusy', '正在扫描文件夹…'), 'busy')
  try {
    const r = await fetch('/api/scan-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: root }),
    })
    const d = await r.json()
    if (!d.ok) {
      S.bundlePlan = null
      log('err', d.error || '扫描失败')
      setStatus(C('status.scanFail', '扫描失败'), 'busy')
      // 只有散文件 → 明确弹窗
      if (d.code === 'loose-files' || /不是文件夹|没有子目录/.test(String(d.error || ''))) {
        showTip(C('bundle.looseTitle', '整套导入不支持散文件'),
          d.code === 'loose-files' ? d.error : C('bundle.looseBody', '整套导入不支持散文件，请到其他地方操作'))
      }
      return false
    }
    S.bundlePlan = d.plan
    const nv = d.plan.majors.reduce((a, m) => a + m.versions.length, 0)
    const np = d.plan.majors.reduce((a, m) => a + m.versions.reduce((k, v) => k + v.pools.length, 0), 0)
    log('ok', `扫描完成：${d.plan.majors.length} 个大版本 / ${nv} 个版本 / ${np} 座服装阁 / `
      + `${d.plan.readings.length} 篇阅读物${(d.plan.orphans || []).length ? ` / ${d.plan.orphans.length} 项待补归属` : ''}`)
    for (const w of d.plan.warnings || []) log('warn', w)
    setStatus(C('status.scanDone', '扫描完成，可以写入'), 'live')
    return true
  } catch (e) {
    log('err', String(e.message || e))
    setStatus(C('status.scanError', '扫描出错'), 'busy')
    return false
  } finally {
    renderPanel()
  }
}

/** 把「待补归属」这一项能认出来的东西**整批**带进「服装阁」表单 */
function jumpToOrphan(o) {
  const g = o.guess || {}
  const pool = (g.pools || [])[0]

  switchJob('pool')
  S.files = []
  S.pending = []
  S.picked = new Set()
  S.fields = { mode: 'new', type: 'limited' }

  if (!pool) {
    // 只认出一套服装（没有阁级信息）：至少把套装名 / 星级填好
    const set = (g.sets || [])[0]
    if (set) {
      S.fields.setCount = 1
      S.fields.set0Name = set.name
      S.fields.set0Star = set.star || '5'
      log('out', `已带入套装「${set.name}」（${set.star}★）—— 还需要选版本、填服装阁名`)
    } else {
      log('warn', `这一项没法自动填：${o.reason || '结构太残缺'}`)
    }
    renderRail(); renderPanel()
    return
  }

  S.fields.name = pool.name
  const vHit = (S.options.versions || []).find((v) => String(v.v) === String(g.version))
  if (vHit) S.fields.version = vHit.v

  if ((g.pools || []).length > 1) {
    log('warn', `这一层有 ${g.pools.length} 座阁：${g.pools.map((p) => p.name).join('、')}；`
      + '工坊一次只能填一座，已带入第一座，其余的请单独把各自文件夹拖进来')
  }

  let nFiles = 0
  const push = (slot, src, name, kind, setIndex = null) => {
    if (!src) return
    S.files.push({
      slot, setIndex, src, kind,
      name: name || String(src).split(/[\\/]/).pop(),
    })
    nFiles += 1
  }
  push('bg', pool.bg, null, 'bannerBg')
  push('thumb', pool.thumb, null, 'bannerThumb')
  push('titleArt', pool.titleArt, null, 'titleArt')
  push('video', pool.video, null, 'bannerVideo')
  push('enterSfx', pool.audio, null, 'bannerEnter')
  for (const m of pool.milestones || []) push('milestone', m.path, m.name, 'milestone')

  const sets = pool.sets || []
  if (sets.length) {
    S.fields.setCount = sets.length
    sets.forEach((s, i) => {
      S.fields[`set${i}Name`] = s.name
      S.fields[`set${i}Star`] = s.star || '5'
      if (/^S\d+$/i.test(String(s.id || ''))) S.fields[`set${i}Id`] = s.id
      for (const p of s.busts || []) push('bust', p, null, 'setBust', i)
      for (const p of s.icons || []) push('icons', p, null, 'partIcon', i)
      for (const p of s.evos || []) push('ov', p, null, 'setCardEvo', i)
      push('suitLib', s.yaml, null, 'suitYaml', i)
      push('story', s.story, null, 'story', i)
    })
  }

  /* ── 先算出「还缺什么」，再渲染：顶部那块对账单要跟字段一起出现 ── */
  const lack = []
  if (!vHit) {
    lack.push(g.version
      ? `所属版本：目录名看是 ${g.version}，但版本表里没有这一版 —— 下拉默认选了最新版，请确认；`
        + `确实要新建的话先去「版本」建 ${g.version}`
      : '所属版本：目录名里没有版本号，请自己选一个')
  }
  for (const [k, label] of [['bg', '阁背景'], ['thumb', '列表缩略图'], ['titleArt', '阁名艺术字'],
    ['video', '动态背景（视频）'], ['audio', '阁进入音（音频）']]) {
    if (!pool[k]) lack.push(label)
  }
  for (const s of sets) {
    const own = []
    if (!s.busts.length) own.push('半身像')
    if (!s.icons.length) own.push('图标')
    if (!s.yaml) own.push('属性 YAML')
    if (!s.evos.length) own.push('整体图')
    if (own.length) lack.push(`${s.name}：${own.join(' / ')}`)
  }

  S.fixNote = [
    { text: `已带入：阁名「${pool.name}」· ${sets.length} 套服装 · ${nFiles} 个素材` },
    ...lack.map((t) => ({ kind: 'bad', text: t })),
  ]

  renderRail()
  renderPanel()

  log('ok', `已带入：阁名「${pool.name}」、${sets.length} 套服装、${nFiles} 个素材`)
  if (lack.length) log('warn', `还缺 ${lack.length} 项：${lack.join(' · ')}`)
  else log('ok', '这一项已经齐了，直接点「写入并更新」')
}

/** 把 "…{version}…" 里的字段占位换成当前值，没填就用省略号 */
function fillTemplate(tpl) {
  return String(tpl).replace(/\{(\w+)\}/g, (_, k) => {
    const v = String(S.fields[k] ?? '').trim()
    if (!v) return '…'
    if (k === 'region') return v === 'wish' ? '心愿原野' : '伊赞之土'
    return v
  })
}

function allSlotDefs() {
  const def = S.jobs[S.job]
  const out = []
  for (const g of def.groups || []) {
    if (g.repeat) {
      const n = Math.max(1, Number(S.fields.setCount || 1))
      for (let i = 0; i < n; i++) for (const s of g.slots) out.push({ ...s, setIndex: i })
    } else {
      for (const s of g.slots) out.push({ ...s, setIndex: null })
    }
  }
  return out
}

function bindPending() {
  // 单条：选中目标后立刻归位
  $$('[data-assign]').forEach((sel) => {
    sel.onchange = () => {
      if (!sel.value) return
      placeOne(sel.dataset.assign, sel.value)
    }
  })

  // 单条删除
  $$('[data-pkdel]').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation()
      const i = Number(b.dataset.pkdel)
      S.pending.splice(i, 1)
      S.picked.clear()
      sfx('paper-flip', 0.25)
      renderPanel()
    }
  })

  // 勾选
  $$('[data-pick]').forEach((box) => {
    box.onchange = () => {
      const i = Number(box.dataset.pick)
      if (box.checked) S.picked.add(i)
      else S.picked.delete(i)
      renderPanel()
    }
  })
  const all = $('#pk-all')
  if (all) {
    all.onchange = () => {
      S.picked = all.checked ? new Set(S.pending.map((_, i) => i)) : new Set()
      renderPanel()
    }
  }

  // 批量：放到指定槽位
  const assign = $('#pk-assign')
  if (assign) {
    assign.onclick = () => {
      const target = $('#pk-target')?.value
      if (!target) { log('warn', '先选一个目标槽位'); return }
      if (!S.picked.size) { log('warn', '先勾选要放的文件'); return }
      const idx = [...S.picked].sort((a, b) => b - a)
      for (const i of idx) placeOneSilent(i, target)
      S.picked.clear()
      sfx('paper-fadein', 0.35)
      renderPanel()
      log('ok', `已批量放入 ${idx.length} 个文件`)
    }
  }

  // 批量删除
  const del = $('#pk-del')
  if (del) {
    del.onclick = () => {
      if (!S.picked.size) { log('warn', '先勾选要删的文件'); return }
      const idx = [...S.picked].sort((a, b) => b - a)
      for (const i of idx) S.pending.splice(i, 1)
      S.picked.clear()
      sfx('paper-flip', 0.3)
      renderPanel()
      log('ok', `已移除 ${idx.length} 个待分配文件`)
    }
  }

  // 全部清空
  const clear = $('#pk-clear')
  if (clear) {
    clear.onclick = () => {
      if (!S.pending.length) return
      const n = S.pending.length
      S.pending = []
      S.picked.clear()
      sfx('paper-flip', 0.3)
      renderPanel()
      log('ok', `已清空待分配（${n} 个）`)
    }
  }
}

/** 把第 i 个待分配文件放进 `slot|setIndex`，带音效与日志（单条用） */
function placeOne(i, value) {
  const f = window.__placeOne(i, value)
  if (!f) return
  sfx('paper-slide', 0.3)
  renderPanel()
}

/** 静默版本（批量用，最后统一重绘） */
function placeOneSilent(i, value) {
  window.__placeOne(i, value)
}

/** 真正的放置逻辑：从 pending 里取出第 i 个，push 进 files。返回放进去的对象（拿不到返回 null） */
window.__placeOne = function (i, value) {
  const f = S.pending[Number(i)]
  if (!f || !value) return null
  const [slot, si] = String(value).split('|')
  S.pending.splice(Number(i), 1)
  S.files.push({ ...f, slot, setIndex: si === '' ? null : Number(si) })
  // 下标变了，勾选集合失效，直接清空最省事
  S.picked.clear()
  return f
}

// 套装增删（事件委托，重绘后依然有效）
document.addEventListener('click', (e) => {
  const add = e.target.closest('#btn-addset')
  if (add) {
    S.fields.setCount = Math.max(1, Number(S.fields.setCount || 1)) + 1
    sfx('paper-slide', 0.3)
    renderPanel()
    return
  }
  const del = e.target.closest('[data-setdel]')
  if (del) {
    const i = Number(del.dataset.setdel)
    const n = Math.max(1, Number(S.fields.setCount || 1))
    // 后面的套装整体前移，连素材一起搬
    for (let k = i; k < n - 1; k++) {
      S.fields[`set${k}Name`] = S.fields[`set${k + 1}Name`] || ''
      S.fields[`set${k}Star`] = S.fields[`set${k + 1}Star`] || '5'
      S.fields[`set${k}Id`] = S.fields[`set${k + 1}Id`] || ''
    }
    delete S.fields[`set${n - 1}Name`]
    delete S.fields[`set${n - 1}Star`]
    delete S.fields[`set${n - 1}Id`]
    S.files = S.files.filter((f) => (f.setIndex ?? null) !== i).map((f) => (
      f.setIndex > i ? { ...f, setIndex: f.setIndex - 1 } : f
    ))
    S.fields.setCount = n - 1
    renderPanel()
  }
})

/* ────────────────────────────── 文件处理 ────────────────────────────── */

/** 可多张的类目：同一批里应全部塞进同一个套装卡，不能一有空槽就散过去 */
const MULTI_KINDS = new Set(['partIcon', 'setBust', 'setCardEvo', 'awaken', 'setPortrait', 'milestone', 'plate'])

/** 把一批已识别的文件放进槽位：可多张的类目先找「同类已放过」的槽再找空槽，单值类目找第一个空槽， 都没有则进待分配 */
function placeFiles(list) {
  /* ── 1. 先按路径里的 `S0062` 目录聚类 ── 同一个文件夹里常同时放着两套（S0062 / S0083），文件名又完全一样 （都叫「发型-XXX.png」） */
  const groupOrder = []
  const groupOf = new Map()
  for (const f of list) {
    const m = /(?:^|[\\/])(S\d{2,})(?:[\\/]|$)/i.exec(String(f.rel || ''))
    const key = m ? m[1].toUpperCase() : ''
    groupOf.set(f, key)
    if (key && !groupOrder.includes(key)) groupOrder.push(key)
  }

  const repeatGroup = (S.jobs[S.job].groups || []).find((g) => g.repeat)
  const canGroup = !!repeatGroup && groupOrder.length > 0
  if (canGroup) {
    // 有几组就保证有几张套装卡（不够就自动加，够就不动）
    const need = groupOrder.length
    if (Number(S.fields.setCount || 1) < need) {
      S.fields.setCount = need
      log('note', `按目录识别到 ${need} 套服装，已自动加至 ${need} 张套装卡`)
    }
    // 顺手把套装名 / 星级从 `属性-5星-心愿金蔷薇.yaml`、`故事-4星-…` 里读出来填好
    for (let i = 0; i < groupOrder.length; i++) {
      if (String(S.fields[`set${i}Name`] || '').trim()) continue
      const f = list.find((x) => groupOf.get(x) === groupOrder[i] && /^(属性|故事)-/.test(x.name))
      const m = f && /^(?:属性|故事)-([45])星-(.+)$/.exec(f.name.replace(/\.[^.]+$/, ''))
      if (m) {
        S.fields[`set${i}Name`] = m[2].trim()
        S.fields[`set${i}Star`] = m[1]
      }
    }
  }

  let placed = 0
  for (const f of list) {
    const cands = allSlotDefs().filter((s) => (s.kinds || []).includes(f.kind))
    if (!cands.length) { S.pending.push(f); continue }
    const occupied = (s) => filesAt(s.key, s.setIndex).length > 0

    // 有分组就锁定到对应的套装卡（该卡若不存在则退回全量候选）
    const gi = canGroup && groupOf.get(f) ? groupOrder.indexOf(groupOf.get(f)) : -1
    const pool = gi >= 0 ? (cands.filter((s) => s.setIndex === gi).length ? cands.filter((s) => s.setIndex === gi) : cands) : cands

    let target
    if (MULTI_KINDS.has(f.kind)) {
      target = pool.find(occupied) || pool.find((s) => !occupied(s))
    } else {
      target = pool.find((s) => !occupied(s)) || pool.find((s) => s.multiple)
    }
    if (target) {
      S.files.push({ ...f, slot: target.key, setIndex: target.setIndex })
      placed++
    } else {
      S.pending.push(f)
    }
  }
  if (placed) sfx('paper-fadein', 0.35)
  renderPanel()
  log('note', `识别 ${list.length} 个文件，自动归位 ${placed} 个，待分配 ${list.length - placed} 个`)
}

/** 上传（浏览器只给 File，没有绝对路径） */
/* ────────────────────────────── 故事预览 ────────────────────────────── */

/** 把一篇故事的正文取回来填进「故事正文」框：`previewStory('雪境长歌')` 按套装名从成品 stories.json 取， `previewStory` 直接读拖进来的 md；只改文本框、不整页重渲染 */
async function previewStory(name, src) {
  const q = src ? `src=${encodeURIComponent(src)}` : `name=${encodeURIComponent(name || '')}`
  if (!src && !name) return
  try {
    const r = await fetch(`/api/story?${q}`)
    const d = await r.json()
    if (!d.ok) return
    if (!src) {
      if (d.star && !String(S.fields.star || '').trim()) S.fields.star = d.star
      S.fields.body = d.body || ''
      log('out', d.body
        ? `已载入「${name}」的正文（${d.body.length} 字），可以直接改`
        : `「${name}」还没有故事，正文从空白开始`)
    } else if (d.body) {
      S.fields.body = d.body
    }
    const ta = $('#f-body')
    if (ta) ta.value = S.fields.body || ''
  } catch { /* 预览失败不该挡住写入 */ }
}

/** 从 markdown 文件名里认套装 */
function matchStorySet(fileName) {
  const base = String(fileName || '').replace(/\.md$/i, '').trim()
  const list = S.options.suitList || []
  const m = /^故事[-－]\s*([45])\s*星\s*[-－]\s*(.+)$/.exec(base)
  if (m) return { name: m[2].trim(), star: m[1] }

  // 长名优先：「雪境长歌的旅途」里也含「雪境」，短的会抢先命中
  const byLongest = [...list]
    .sort((a, b) => String(b.name).length - String(a.name).length)
    .find((s) => s.name && base.includes(s.name))
  if (byLongest) return { name: byLongest.name, star: byLongest.star || '' }

  const idm = /(?:^|[^0-9A-Za-z])(S?\d{3,4})(?:[^0-9]|$)/i.exec(base)
  if (idm) {
    const raw = idm[1].toUpperCase()
    const hit = list.find((s) => String(s.id || '').toUpperCase() === raw
      || (String(s.id || '').replace(/\D/g, '') && String(s.id).replace(/\D/g, '') === raw.replace(/\D/g, '')))
    if (hit) return { name: hit.name, star: hit.star || '' }
  }
  return null
}

/** 上传完一批文件后：故事面板里如果来了一篇 md，自动挂到对应套装并回填正文 */
async function autoStoryFromFiles(list) {
  if (S.job !== 'story') return
  const md = list.find((f) => f.kind === 'story')
  if (!md) return
  const hit = matchStorySet(md.name)
  if (hit) {
    S.fields.name = hit.name
    if (hit.star) S.fields.star = hit.star
    log('ok', `按文件名认出套装：${hit.name}${hit.star ? `（${hit.star}★）` : ''}`)
  } else {
    // 认不出就清空
    S.fields.name = ''
    log('warn', `没能从「${md.name}」认出套装，请在「套装名」里手动选一套`)
  }
  await previewStory(hit?.name || '', md.src)
  renderPanel()
}

const ACCEPT_RE = /\.(png|jpe?g|webp|gif|bmp|webm|mp4|mov|mkv|ogg|mp3|wav|flac|m4a|md|txt|yaml|yml)$/i

/** 上传一批文件 */
async function uploadFiles(fileList, relList = null) {
  const kept = [...fileList]
    .map((f, i) => ({ f, rel: relList?.[i] || f.webkitRelativePath || f.name }))
    .filter((x) => ACCEPT_RE.test(x.f.name))
  if (!kept.length) { log('warn', '这批里没有可用的图片或文本'); return }
  log('out', `上传 ${kept.length} 个文件…`)
  const fd = new FormData()
  for (const { f, rel } of kept) fd.append('files', f, rel)
  const r = await fetch(`/api/upload?job=${S.job}`, { method: 'POST', body: fd })
  const d = await r.json()
  if (!d.ok) { log('err', '上传失败'); return }

  // 保留 File 引用，缩略图直接走 blob，不用再请求后端
  const list = d.files.map((x, i) => ({ ...x, file: kept[i].f }))
  placeFiles(list)
  await autoStoryFromFiles(list)
}

/** 按路径读取（支持文件夹，递归） */
async function readPaths() {
  const input = $('#path-input')
  const raw = input.value.trim()
  if (!raw) return
  // 一行一个路径也支持
  const paths = raw.split(/\n+/).map((s) => s.trim()).filter(Boolean)

  log('out', `读取路径：${paths.length > 1 ? paths.length + ' 条' : paths[0]}`)
  const r = await fetch('/api/inspect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paths }),
  })
  const d = await r.json()
  if (!d.ok) { log('err', '读取失败'); return }
  if (d.missing?.length) log('warn', `这些路径不存在：${d.missing.join('、')}`)

  if (!d.files.length) { log('warn', '目录里没有可用的图片或文本'); return }

  const forcedSlot = input.dataset.slot
  const forcedSet = input.dataset.set
  if (forcedSlot) {
    const si = forcedSet === '' || forcedSet === undefined ? null : Number(forcedSet)
    const def = allSlotDefs().find((s) => s.key === forcedSlot && (s.setIndex ?? null) === si)
    const list = def?.multiple || d.files.length === 1 ? d.files : [d.files[0]]
    for (const f of list) S.files.push({ ...f, slot: forcedSlot, setIndex: si })
    log('ok', `已放入「${def?.label || forcedSlot}」${list.length} 个`)
    input.dataset.slot = ''
    input.dataset.set = ''
    input.value = ''
    renderPanel()
    return
  }

  placeFiles(d.files)
  await autoStoryFromFiles(d.files)
  input.value = ''
}

/* ────────────────────────────── 拖拽 ────────────────────────────── */

let dragDepth = 0
window.addEventListener('dragenter', (e) => {
  if (!e.dataTransfer?.types?.length) return
  dragDepth++
  $('#drop-veil').classList.add('on')
})
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1)
  if (!dragDepth) $('#drop-veil').classList.remove('on')
})
window.addEventListener('dragover', (e) => e.preventDefault())
window.addEventListener('drop', async (e) => {
  e.preventDefault()
  dragDepth = 0
  $('#drop-veil').classList.remove('on')
  await handleDrop(e.dataTransfer, null)
})

function readEntryFile(entry) {
  return new Promise((res) => entry.file((f) => res(f), () => res(null)))
}
function readAllEntries(reader) {
  // readEntries 一次最多回 100 条，必须循环读到空
  return new Promise((res) => {
    const out = []
    const step = () => reader.readEntries((batch) => {
      if (!batch.length) { res(out); return }
      out.push(...batch)
      step()
    }, () => res(out))
    step()
  })
}
async function collectEntry(entry, prefix = '') {
  if (entry.isFile) {
    const f = await readEntryFile(entry)
    return f ? [{ file: f, rel: prefix + entry.name }] : []
  }
  if (!entry.isDirectory) return []
  // 这里已经拿到 entry，递归读就是安全的
  const kids = await readAllEntries(entry.createReader())
  const out = []
  for (const k of kids) out.push(...await collectEntry(k, `${prefix}${entry.name}/`))
  return out
}

/**
 * 从 dataTransfer 里取出目录树；没有文件夹就返回 null
 */
async function droppedTree(dt) {
  const items = [...(dt.items || [])]
  const entries = []
  for (const it of items) {
    if (it.kind && it.kind !== 'file') continue
    const e = it.webkitGetAsEntry?.()
    if (e) entries.push(e)
  }
  if (!entries.some((e) => e.isDirectory)) return null
  const out = []
  for (const e of entries) out.push(...await collectEntry(e))
  return out
}

/** 拖进来的东西的绝对路径：Electron 壳由 preload 暴露 `window.nikki.getPathForFile(file)`， 拿到资源管理器里的真路径（文件夹也给）；拿不到则返回空数组，调用方退回目录树上传 */
function droppedPaths(dt) {
  const api = window.nikki
  if (!api || typeof api.getPathForFile !== 'function') return []
  const out = []
  for (const f of [...(dt.files || [])]) {
    let p = ''
    try { p = api.getPathForFile(f) || '' } catch { p = '' }
    // Chromium 拖放给的路径可能带重复分隔符、也可能正反斜杠混着（`D://a//b`、`D:/a\b`）
    // 统一成 `/`（Windows 两种都认，服务端再 path.normalize 一次）
    if (p) out.push(p.replace(/[\\/]+/g, '/'))
  }
  return out
}

/** 按绝对路径处理一次拖放 */
async function dropByPaths(paths, target) {
  /* 整套导入：填进方框 → 直接扫（不复制、不中转） */
  if (S.job === 'bundle' && !target) {
    if (paths.length > 1) {
      log('warn', `整套导入一次只认一个文件夹，已用第一个：${paths[0]}`)
    }
    const root = paths[0]
    S.fields.root = root
    log('out', `拖入路径：${root}`)
    await scanBundleRoot(root)
    return
  }

  const input = $('#path-input')
  if (!input) { log('warn', '这个任务没有路径框，请把文件拖到具体槽位'); return }
  input.value = paths.join('\n')
  if (target) {
    input.dataset.slot = target.slot
    input.dataset.set = target.setIndex ?? ''
  }
  await readPaths()
}

/** 把「这一次」新加进 S.files 的那批挪进指定槽位（单值槽只留第一张） */
function assignToSlot(before, target) {
  if (!target) return
  const def = allSlotDefs().find(
    (s) => s.key === target.slot && (s.setIndex ?? null) === (target.setIndex ?? null),
  )
  const added = S.files.splice(before)
  const take = def?.multiple ? added : added.slice(0, 1)
  for (const f of take) { f.slot = target.slot; f.setIndex = target.setIndex }
  S.files.push(...take, ...added.slice(take.length))
  renderPanel()
}

async function handleTreeDrop(tree, target = null) {
  if (!tree.length) { log('warn', '文件夹里没有文件'); return }
  const dirs = new Set(tree.map((t) => String(t.rel).split('/')[0]))
  log('out', `拖入文件夹：${[...dirs].join('、')}（${tree.length} 个文件）`)

  /* 整套导入：整棵树落到工坊中转区，再走与「粘贴路径」完全一样的扫描 → 预览 → 写入 */
  if (S.job === 'bundle') {
    setStatus(C('status.scanBusy', '正在接收文件夹…'), 'busy')
    const fd = new FormData()
    for (const { file, rel } of tree) fd.append('files', file, rel)
    const r = await fetch('/api/upload-tree?job=bundle', { method: 'POST', body: fd })
    const d = await r.json().catch(() => ({ ok: false, error: '上传失败' }))
    if (!d.ok) { log('err', d.error || '上传失败'); setStatus(C('status.scanFail', '扫描失败'), 'busy'); return }
    S.fields.root = d.root
    log('ok', `已就位 ${d.count} 个文件（中转目录，写入后自动删除）`)
    await scanBundleRoot(d.root)
    return
  }

  /* 其它任务：拆成「文件 + 相对路径」，和普通拖文件一样自动归位 */
  const before = S.files.length
  await uploadFiles(tree.map((t) => t.file), tree.map((t) => t.rel))
  // 拖到具体槽位（比如把整个「图标」文件夹拖进「部件图标」）→ 整批放进那一格
  assignToSlot(before, target)
}

async function handleDrop(dt, target) {
  if (!dt) return
  // Electron 壳：能拿到绝对路径就直接用路径，不再复制整棵树
  const abs = droppedPaths(dt)
  if (abs.length) { await dropByPaths(abs, target); return }

  // 浏览器（无 preload）：先看有没有文件夹：有就必须走目录树那条路
  // （FileList 里的文件夹条目会被扩展名筛掉）
  const tree = await droppedTree(dt)
  if (tree) { await handleTreeDrop(tree, target); return }

  const files = [...(dt.files || [])]
  if (files.length) {
    const before = S.files.length
    await uploadFiles(files)
    // 拖到具体槽位：把**这一次**放进去的挪过来（可多张的槽位整批挪，单值槽只挪第一张）
    assignToSlot(before, target)
    return
  }
  // 从资源管理器拖文件时，某些浏览器只给路径文本
  const txt = dt.getData('text/plain') || dt.getData('text/uri-list')
  if (txt) {
    const paths = txt.split(/\r?\n/).map((s) => s.replace(/^file:\/\//, '').trim()).filter(Boolean)
    if (paths.length) {
      // 拖进来的是文件夹路径（文本形式）→ 整套导入直接扫它
      if (S.job === 'bundle' && !target) {
        S.fields.root = paths[0]
        await scanBundleRoot(paths[0])
        return
      }
      if (target) {
        const input = $('#path-input')
        input.value = paths.join('\n')
        input.dataset.slot = target.slot
        input.dataset.set = target.setIndex ?? ''
        await readPaths()
      } else {
        $('#path-input').value = paths.join('\n')
        await readPaths()
      }
    }
  }
}

/* ────────────────────────────── 预检 ────────────────────────────── */

/** 本次表单的内容签名：与上一次成功写入完全一致时，不必再重复检验一遍 */
const LAST_SIG_KEY = 'nikki-updater-last-apply-sig'
function payloadSig() {
  const files = S.files.map((f) => [f.slot, f.setIndex ?? null, f.src, f.name, f.kind].join('|')).sort()
  const { setSearch, ...rest } = S.fields
  return JSON.stringify({ job: S.job, fields: rest, files })
}

function precheck() {
  const def = S.jobs[S.job]
  const problems = []
  const warns = []
  const repeat = localStorage.getItem(LAST_SIG_KEY) === payloadSig()
  // 只检验改动项：与上一次写入完全一致的素材不再重复报一遍同样的提示
  // 必填项（problems）始终检查
  const warn = (...args) => { if (!repeat) warns.push(...args) }
  if (repeat) {
    warns.push(C('precheck.sameAsLast',
      '与上一次写入完全一致：跳过重复的素材检验（勾选「强制重转已有素材」可全量重检）'))
  }

  if (S.job === 'bundle') {
    if (!String(S.fields.root || '').trim()) problems.push(C('precheck.bundleNoRoot', '「文件夹路径」没填'))
    if (!S.bundlePlan) warn(C('precheck.bundleNoScan', '还没扫描；写入时会现扫一遍'))
  }

  for (const f of def.fields || []) {
    if (f.required && !String(S.fields[f.key] || '').trim()) {
      problems.push(CT('precheck.missing', '「{label}」没填', { label: f.label }))
    }
  }
  // 「修改已有」时不再要求「至少一套套装」
  // 这次可能只是换张背景
  const editMode = String(S.fields.mode || 'new') === 'edit'
  if (S.job === 'pool' && !editMode) {
    const n = Number(S.fields.setCount || 1)
    let anySet = false
    for (let i = 0; i < n; i++) {
      const nm = String(S.fields[`set${i}Name`] || '').trim()
      if (!nm) continue
      anySet = true
      // 槽位已合并成 ov（立绘 = 初始整体图）
      if (!filesAt('ov', i).length) warn(CT('precheck.setNoOv', '套装「{name}」没有整体图，图鉴里会缺一张主图', { name: nm }))
      if (!filesAt('icons', i).length) warn(CT('precheck.setNoIcons', '套装「{name}」没有部件图标，图鉴里这一套没有部件行', { name: nm }))
    }
    if (!anySet) problems.push(C('precheck.noSet', '一座阁至少要有一套套装（填套装名）'))
    if (!filesAt('bg').length) warn(C('precheck.poolNoBg', '没有服装阁背景，共鸣页会用默认背景顶上'))
    if (!filesAt('titleArt').length) warn(C('precheck.poolNoTitle', '没有服装阁名艺术字，标题会显示为纯文字'))
  }
  if (S.job === 'pool' && editMode) {
    if (!String(S.fields.target || '').trim()) problems.push(C('precheck.editNoTarget', '「要修改的阁」没选'))
    const anyFile = ['bg', 'thumb', 'titleArt', 'video', 'enterSfx', 'milestone'].some((k) => filesAt(k).length)
    if (!anyFile && !String(S.fields.setRemove || '').trim() && !String(S.fields.setAdd || '').trim()
      && String(S.fields.name || '') === String(S.fields.target || '')) {
      warn(C('precheck.noChange', '这次既没换素材、也没改名字/增删套装 —— 写入后什么都不会变'))
    }
  }
  if (S.job === 'suit' && !editMode) {
    if (!filesAt('ov').length) warn(C('precheck.suitNoOv', '没有整体图，图鉴里会缺主图'))
    if (!filesAt('icons').length) warn(C('precheck.suitNoIcons', '没有部件图标，图鉴里这一套没有部件行'))
  }
  if (S.job === 'suit' && editMode && !String(S.fields.target || '').trim()) {
    problems.push(C('precheck.suitEditNoTarget', '「要修改的套装」没选'))
  }
  if (S.job === 'version') {
    if (!filesAt('card').length && !filesAt('big').length) warn(C('precheck.verNoArt', '没有版本图，版本页会是空白底板'))
  }

  if (S.pending.length) warn(CT('precheck.pendingLeft', '还有 {n} 个文件没分配，会被忽略', { n: S.pending.length }))

  // 标红缺失的必填项
  $$('.field').forEach((el) => el.classList.remove('bad'))
  for (const f of def.fields || []) {
    if (f.required && !String(S.fields[f.key] || '').trim()) {
      $(`[data-field="${f.key}"]`)?.classList.add('bad')
    }
  }

  clearLog()
  log('step', CT('precheck.step', '预检 · {title}', { title: def.title }))
  problems.forEach((p) => log('err', C('precheck.prefixMissing', '缺：') + p))
  warns.forEach((w) => log('warn', C('precheck.prefixWarn', '注意：') + w))
  if (!problems.length) log('ok', C('precheck.okReady', '必填项齐全，可以写入'))
  if (!problems.length && !warns.length) log('ok', C('precheck.okAll', '素材也齐了'))

  $('#log-title').textContent = problems.length
    ? CT('precheck.titleFail', '预检未通过 · {n} 项缺失', { n: problems.length })
    : C('precheck.titlePass', '预检通过')
  return problems.length === 0
}

/* ────────────────────────────── 写入 ────────────────────────────── */

async function apply() {
  if (S.busy) return
  const def = S.jobs[S.job]
  if (!precheck()) {
    setStatus(C('status.precheckFail', '预检没过，先补必填项'), 'busy')
    return
  }

  // 现场还在（S.files 没清），先记下本次内容签名，成功后存起来供下次预检比对
  const sig = payloadSig()
  S.busy = true
  $('#btn-apply').disabled = true
  $('#btn-check').disabled = true
  setStatus(C('status.write', '正在写入…'), 'busy')

  const payload = {
    job: S.job,
    fields: (() => {
      // `setSearch` 是搜索框，不是写入内容
      const { setSearch, ...rest } = S.fields
      return rest
    })(),
    files: S.files.map((f) => ({
      slot: f.slot, setIndex: f.setIndex ?? null, src: f.src, name: f.name, kind: f.kind,
    })),
    options: {
      force: $('#opt-force').checked,
    },
  }

  try {
    const res = await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.body) throw new Error('服务没有返回流')

    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    let done = null

    while (true) {
      const { done: end, value } = await reader.read()
      if (end) break
      buf += dec.decode(value, { stream: true })
      const parts = buf.split('\n\n')
      buf = parts.pop() || ''
      for (const p of parts) {
        const line = p.replace(/^data: /, '').trim()
        if (!line) continue
        let ev
        try { ev = JSON.parse(line) } catch { continue }
        if (ev.type === 'log') log(ev.kind, ev.text)
        else if (ev.type === 'done') done = ev
      }
    }

    if (done?.ok && done.skipped) {
      // 服务端判定「与上一次写入完全一致」：没有改动项，未检验、未写盘、未跑管线
      setStatus(C('status.noChange', '与上一次写入完全一致，已跳过'), 'live')
      await refreshMeta()
    } else if (done?.ok) {
      log('ok', '全部完成')
      setStatus(C('status.writeDone', '更新完成'), 'live')
      sfx('set-complete', 0.45)
      localStorage.setItem(LAST_SIG_KEY, sig)
      delete S.cache[S.job]
      S.files = []
      S.pending = []
      S.picked = new Set()
      S.bundlePlan = null
      S.fixNote = null
      await refreshMeta()
      renderPanel()
    } else {
      log('err', done?.rolledBack ? '失败，已回滚' : '失败')
      setStatus(done?.rolledBack ? C('status.writeFailRollback', '失败（已回滚）') : C('status.writeFail', '失败'), 'busy')
      sfx('paper-flip', 0.4)
      await refreshMeta()
    }
  } catch (e) {
    const msg = String(e?.message || e)
    // 连接被重置时浏览器只给一句 "network error" / "Failed to fetch"
    // 素材和 manifest 都写好了，只是结果没能送回来
    if (/network error|failed to fetch|terminated|aborted|networkerror/i.test(msg)) {
      log('err', '与工坊的连接中断了（工坊进程可能刚被重启）。')
      log('warn', '素材与管线多半已写入完成，请刷新页面确认——不要直接重跑，避免重复写入。')
    } else {
      log('err', msg)
    }
    setStatus(C('status.error', '出错'), 'busy')
  } finally {
    S.busy = false
    $('#btn-apply').disabled = false
    $('#btn-check').disabled = false
  }
}

async function refreshMeta() {
  const r = await fetch('/api/state')
  const d = await r.json()
  if (d.ok) {
    S.overview = d.overview
    S.snapshots = d.snapshots
    S.options = d.options
    const o = d.overview
    setStatus(CT('status.overview', '{versions} 个版本 · {banners} 座服装阁 · {sets} 套服装 · {stories} 篇故事 · {readings} 篇阅读物', o), 'live')
    renderHistory()
  }
}

/* ────────────────────────────── 回滚 ────────────────────────────── */

async function rollback(id) {
  if (S.busy) return
  const ok = await showConfirm({
    title: CT('rollback.confirmTitle', '撤回这次改动？'),
    body: CT('rollback.confirm', '会把这批文件恢复成更新前的样子（包括新加的素材），并重跑一次数据管线。\n撤回记录：{id}', { id }),
    okText: CT('rollback.confirmOk', '确认撤回'),
    primary: true,
  })
  if (!ok) return
  S.busy = true
  setStatus(C('status.rollback', '正在撤回…'), 'busy')
  clearLog()
  log('step', `撤回 ${id}`)
  const r = await fetch('/api/rollback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  const d = await r.json()
  if (d.ok) {
    for (const l of d.logs || []) log('out', l)
    log('ok', `已撤回 ${d.restored} 个文件`)
    if (d.pipelineOk === false) log('warn', '管线重跑失败，请手动跑一次 python tools/build-pool-map.py')
    sfx('back-select', 0.4)
    await refreshMeta()
    setStatus(C('status.rolledBack', '已撤回'), 'live')
  } else {
    log('err', d.error || '撤回失败')
    setStatus(C('status.rollbackFail', '撤回失败'), 'busy')
  }
  S.busy = false
}

/* ────────────────────────────── 事件绑定 ────────────────────────────── */

window.addEventListener('pointerdown', unlockAudio, { once: true })
$('#btn-check').onclick = precheck
$('#btn-apply').onclick = apply
$('#btn-clear-log').onclick = () => { clearLog(); log('out', '日志已清空') }
$('#btn-reload').onclick = () => { refreshMeta(); log('out', '已重新读取素材库') }
$('#btn-close').onclick = () => { window.close(); log('out', '浏览器不允许脚本关自己，请直接关标签页') }
$('#btn-help').onclick = () => $('#modal-help').classList.add('on')
$('#btn-help-ok').onclick = () => $('#modal-help').classList.remove('on')
$('#modal-help').addEventListener('click', (e) => {
  if (e.target.id === 'modal-help') $('#modal-help').classList.remove('on')
})
// 通用提示弹窗：整套导入只给散文件这类「必须让用户知道」的事
function showTip(title, body) {
  const t = $('#modal-tip-title')
  const b = $('#modal-tip-body')
  if (!t || !b) return
  t.textContent = title
  b.textContent = body
  $('#modal-tip').classList.add('on')
}
$('#modal-tip-ok').onclick = () => $('#modal-tip').classList.remove('on')
$('#modal-tip').addEventListener('click', (e) => {
  if (e.target.id === 'modal-tip') $('#modal-tip').classList.remove('on')
})

/* ── 通用确认弹窗（替掉 `window.confirm`）── 确定 → resolve(true)；取消 / 点遮罩 / ESC → resolve(false)；只留一个 pending，后开的覆盖先开的 */
let confirmResolve = null
function showConfirm({ title, body, okText, primary = false }) {
  const m = $('#modal-confirm')
  if (!m) return Promise.resolve(false)
  $('#modal-confirm-title').textContent = title || '确认'
  $('#modal-confirm-body').textContent = body || ''
  const ok = $('#modal-confirm-ok')
  ok.textContent = okText || '确定'
  ok.className = primary ? 'btn primary' : 'btn danger'
  m.classList.add('on')
  if (confirmResolve) { const prev = confirmResolve; confirmResolve = null; prev(false) }
  return new Promise((res) => { confirmResolve = res })
}
function closeConfirm(v) {
  const m = $('#modal-confirm')
  if (m) m.classList.remove('on')
  const r = confirmResolve
  confirmResolve = null
  if (r) r(v)
}
$('#modal-confirm-ok').onclick = () => closeConfirm(true)
$('#modal-confirm-cancel').onclick = () => closeConfirm(false)
$('#modal-confirm').addEventListener('click', (e) => {
  if (e.target.id === 'modal-confirm') closeConfirm(false)
})

/* ── 清理临时文件（顶栏垃圾桶）── 列出 `.dist` / `.inbox` / `.snapshots` 的条目数与体积，勾选后二次确认再删；`.snapshots` 删了就没有「撤回」 */
function fmtBytes(n) {
  const v = Number(n || 0)
  if (v < 1024) return `${v} B`
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`
  if (v < 1024 * 1024 * 1024) return `${(v / 1024 / 1024).toFixed(1)} MB`
  return `${(v / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function cleanRowHtml(x) {
  const off = x.exists ? '' : ' off'
  const disabled = x.exists ? '' : ' disabled'
  const meta = x.exists ? `${x.files} 个文件 · ${fmtBytes(x.bytes)}` : '（不存在）'
  return `<label class="clean-row${off}">
    <input type="checkbox" data-clean="${esc(x.key)}"${x.exists ? ' checked' : ''}${disabled} />
    <span class="clean-name"><b>${esc(x.label)}</b><code>${esc(x.name)}</code>
      <i${x.warn ? ' class="warn"' : ''}>${esc(x.note)}</i></span>
    <span class="clean-meta">${esc(meta)}</span>
  </label>`
}

async function openClean() {
  const box = $('#clean-list')
  const total = $('#clean-total')
  if (!box) return
  box.innerHTML = '<div class="clean-row off">正在读取…</div>'
  total.textContent = ''
  $('#modal-clean').classList.add('on')
  const d = await fetch('/api/temp').then((r) => r.json()).catch(() => null)
  if (!d?.ok) {
    box.innerHTML = '<div class="clean-row off">读取失败：工坊服务可能已退出</div>'
    return
  }
  box.innerHTML = d.dirs.map(cleanRowHtml).join('')
  const sum = d.dirs.filter((x) => x.exists).reduce((a, x) => a + x.bytes, 0)
  const n = d.dirs.filter((x) => x.exists).reduce((a, x) => a + x.files, 0)
  total.textContent = n
    ? `合计 ${n} 个文件 · ${fmtBytes(sum)}`
    : '没有可清理的临时文件'
  $('#modal-clean-ok').disabled = !n
}

async function doClean() {
  const keys = $$('#clean-list [data-clean]').filter((el) => el.checked && !el.disabled)
    .map((el) => el.dataset.clean)
  if (!keys.length) { log('warn', '没勾选任何一项'); return }
  const btn = $('#modal-clean-ok')
  btn.disabled = true
  const r = await fetch('/api/clean', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys }),
  }).then((x) => x.json()).catch(() => null)
  btn.disabled = false
  if (!r?.ok) { log('err', '清理失败：工坊服务没有响应'); return }
  $('#modal-clean').classList.remove('on')
  const names = (r.removed || []).join('、') || '（无）'
  log('ok', `已清理临时目录：${names}，释放 ${fmtBytes(r.freed)}（${r.files} 个文件）`)
  if ((r.skipped || []).length) log('warn', `跳过：${r.skipped.join('、')}`)
  setStatus('临时文件已清理', 'live')
}

$('#btn-clean').onclick = () => { void openClean() }
$('#modal-clean-cancel').onclick = () => $('#modal-clean').classList.remove('on')
$('#modal-clean-ok').onclick = () => { void doClean() }
$('#modal-clean').addEventListener('click', (e) => {
  if (e.target.id === 'modal-clean') $('#modal-clean').classList.remove('on')
})
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    // 确认框压在最上层，ESC 先撤它（等于点「取消」）
    if ($('#modal-confirm')?.classList.contains('on')) { closeConfirm(false); return }
    $('#modal-help').classList.remove('on')
    $('#modal-tip')?.classList.remove('on')
    $('#modal-clean')?.classList.remove('on')
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') apply()
})

// 全局按钮音效
document.addEventListener('mouseover', (e) => {
  if (e.target.closest('.btn, .rail-item, .round, .group-add')) sfx('common-hover', 0.18)
})

// 先取文案再取素材库：顶栏 / 帮助的字要一次到位，不然会闪一下旧字
await loadCopy()
loadState().catch((e) => {
  console.error('[updater] loadState failed', e)
  setStatus(CT('status.loadFail', '读取素材库失败：{error}', { error: e.message || e }), 'busy')
  log('err', '无法连接到更新服务。请确认 `node updater/server.mjs` 还在运行。')
  log('err', String(e.stack || e).split('\n').slice(0, 4).join(' | '))
})

/* ════════════════════════════════════════════════════════════════
   DLC 面板（扩展包）
   ────────────────────────────────────────────────────────────────
   面板分三块：

     ① 做一个包    从现有库里切出一个自包含的包（带自己的素材副本）
     ② 本机的包    源包区 + 运行区；每个接口一个开关（挂不挂由包自己说了算）
     ③ 云端 / 网盘 远端配置 + 上传 + 下载安装

   上传 / 下载也挂在顶栏两个按钮上 —— 那是同一个面板的快捷入口。
   ════════════════════════════════════════════════════════════════ */

const DLC_KINDS = [
  ['banner', '服装阁', '整座阁（含套装）→ 共鸣页多一座阁'],
  ['set', '套装', '一套服装 → 挂进指定服装阁'],
  ['story', '故事', '一篇套装故事 → 故事图鉴'],
  ['reading', '阅读物', '一篇 → 阅读物图鉴'],
  ['version', '版本', '一个小版本（含缩略图 / 大图）→ 版本页'],
]

/** 类目的标签 / 说明：文案.json `updater.dlc.kinds.<key>` 优先，缺了用上面的原文 */
function dlcKindLabel(key, fb) { return C(`dlc.kinds.${key}.label`, fb) }
function dlcKindDesc(key, fb) { return C(`dlc.kinds.${key}.desc`, fb) }

/** DLC 面板自己的表单状态（跟 S.fields 分开，别跟任务表单串味） */
const D = {
  kind: 'banner',
  /** 选中的候选项起多选，一次导成一个包 */
  keys: [],
  name: '',
  author: '',
  description: '',
  poolId: '',
  remote: 'local',
  remoteTab: 'upload',
  remoteList: null,
  busy: false,
}

function dlcData() { return S.dlc || { src: [], live: [], candidates: {}, remotes: {}, interfaces: {}, config: {} } }

/** 候选下拉的选项（随 kind 变） */
function dlcCandidates(kind) {
  const c = dlcData().candidates || {}
  if (kind === 'banner') return (c.banners || []).map((b) => [b.id, `${b.name}（${b.id} · ${b.version}）`])
  if (kind === 'set') return (c.sets || []).map((s) => [s.name, `${s.name}（${s.star}★ · ${s.poolName}）`])
  if (kind === 'story') return (c.stories || []).map((n) => [n, n])
  if (kind === 'reading') return (c.readings || []).map((n) => [n, n])
  if (kind === 'version') return (c.versions || []).map((v) => [v.v, `${v.v} · ${v.name}`])
  return []
}

function renderDlcPanel() {
  const d = dlcData()
  const dlcTitle = C('dlc.title', '扩展包')
  $('#job-title').textContent = dlcTitle
  $('#job-sub').textContent = C('dlc.subtitle', '把更新做成自包含的包：自带素材、声明接口，由包自己决定挂不挂')
  $('#log-title').textContent = CT('console.idleWith', '等待开始 · {title}', { title: dlcTitle })

  /* ① 做一个包 */
  const cands = dlcCandidates(D.kind)
  // 切类目后旧的选择不属于新类目
  const picked = D.keys.filter((k) => cands.some(([v]) => v === k))
  D.keys = picked
  const kindEntry = DLC_KINDS.find((k) => k[0] === D.kind)
  const kindDesc = dlcKindDesc(D.kind, kindEntry?.[2] || '')
  const attachHint = D.kind === 'version'
    ? C('dlc.attachVersion', '会一并带上版本内的服装阁和它们的故事；版本里没有阁也能正常打包')
    : (D.kind === 'banner' || D.kind === 'set')
      ? C('dlc.attachStory', '会自动附带所选套装的故事（故事与套装强关联）')
      : C('dlc.attachNone', '这一项单独打包，不附带其它内容')
  const pickBlock = cands.length ? `
    <div class="dlc-picks">
      <div class="dlc-pick-bar">
        <button type="button" class="link" id="dlc-pick-all">${C('dlc.pickAll', '全选')}</button>
        <button type="button" class="link" id="dlc-pick-none">${C('dlc.pickNone', '清空')}</button>
        <span class="hint" id="dlc-pick-count">${CT('dlc.pickCount', '已选 {n} / {total} 项', { n: picked.length, total: cands.length })}</span>
      </div>
      <div class="dlc-pick-list">
        ${cands.map(([v, t]) => `<label class="dlc-pick"><input type="checkbox" data-pick="${esc(v)}"${picked.includes(v) ? ' checked' : ''} /><span>${esc(t)}</span></label>`).join('')}
      </div>
    </div>` : `<div class="dlc-empty">${C('dlc.keyEmpty', '还没有自建内容可导出 —— 内置的阁 / 套装 / 故事 / 版本不进拓展包')}</div>`
  const make = `
    <div class="group">
      <div class="group-head">
        <span class="gt">${C('dlc.makeTitle', '做一个包')}</span>
        <span class="gh">${C('dlc.makeHint', '从自建内容里切出来（内置的 88 座阁不进包）；可多选，一次打成一个包')}</span>
        <span class="line"></span>
      </div>
      <div class="fields">
        <div class="field">
          <label>${C('dlc.kindLabel', '包里放什么')}</label>
          <select id="dlc-kind">
            ${DLC_KINDS.map(([k, l, d2]) => `<option value="${k}"${D.kind === k ? ' selected' : ''}>${esc(dlcKindLabel(k, l))} — ${esc(dlcKindDesc(k, d2))}</option>`).join('')}
          </select>
          <span class="hint">${esc(kindDesc)}</span>
        </div>
        <div class="field w-full">
          <label>${C('dlc.keyLabel', '选内容（可多选）')}</label>
          ${pickBlock}
          <span class="hint">${esc(attachHint)}</span>
        </div>
        ${D.kind === 'set' ? `
        <div class="field">
          <label>${C('dlc.poolLabel', '挂到哪座服装阁')}</label>
          <select id="dlc-pool">
            ${(d.candidates?.banners || []).map((b) => `<option value="${esc(b.id)}"${D.poolId === b.id ? ' selected' : ''}>${esc(b.name)}（${esc(b.id)}）</option>`).join('')}
          </select>
          <span class="hint">${C('dlc.poolHint', '别人装上这个包时，套装就挂进这座阁')}</span>
        </div>` : ''}
        <div class="field">
          <label>${C('dlc.nameLabel', '包名')}</label>
          <input type="text" id="dlc-name" value="${esc(D.name)}" placeholder="${C('dlc.namePlaceholder', '留空就用内容原名')}" />
        </div>
        <div class="field">
          <label>${C('dlc.authorLabel', '作者')}</label>
          <input type="text" id="dlc-author" value="${esc(D.author)}" placeholder="${C('dlc.authorPlaceholder', '署名')}" />
        </div>
        <div class="field w-full">
          <label>${C('dlc.descLabel', '说明')}</label>
          <input type="text" id="dlc-desc" value="${esc(D.description)}" placeholder="${C('dlc.descPlaceholder', '一句话说明这个包做什么')}" />
        </div>
      </div>
      <div class="dlc-actions">
        <button class="btn primary" id="dlc-make">${C('dlc.export', '导出成包')}</button>
        <span class="muted">${C('dlc.exportNote', '导出后还要「安装」，模拟器下次启动才看得见')}</span>
      </div>
    </div>`

  /* ② 本机的包 */
  const liveMap = new Map((d.live || []).map((p) => [p.id, p]))
  const packs = (d.src || []).map((p) => {
    const live = liveMap.get(p.id)
    const enabled = live ? live.enabled !== false : false
    const ifaces = p.provides || []
    const ifRow = ifaces.map((i) => {
      const on = live ? (live.interfaces?.[i] ?? true) : true
      return `<label class="dlc-if"><input type="checkbox" data-iface="${esc(p.id)}|${esc(i)}"${on ? ' checked' : ''} /><span>${esc(d.interfaces?.[i]?.label || i)}</span></label>`
    }).join('')
    return `
      <div class="dlc-pack${enabled ? ' on' : ''}" data-pack="${esc(p.id)}">
        <div class="dlc-pack-head">
          <b>${esc(p.name)}</b>
          <span class="dim">v${esc(p.version)}${p.author ? ' · ' + esc(p.author) : ''}</span>
          <label class="dlc-master">
            <input type="checkbox" data-master="${esc(p.id)}"${enabled ? ' checked' : ''} /><span>${enabled ? C('dlc.mounted', '已挂载') : C('dlc.unmounted', '未挂载')}</span>
          </label>
        </div>
        ${p.description ? `<div class="dlc-desc">${esc(p.description)}</div>` : ''}
        <div class="dlc-ifaces">${ifRow}</div>
        <div class="dlc-btns">
          <button class="btn ghost" data-act="install" data-id="${esc(p.id)}">${live ? C('dlc.reinstall', '重新安装') : C('dlc.install', '安装')}</button>
          ${live ? '<button class="btn ghost" data-act="uninstall" data-id="' + esc(p.id) + '">' + C('dlc.uninstall', '卸载') + '</button>' : ''}
          <button class="btn ghost" data-act="pack" data-id="${esc(p.id)}">${C('dlc.packZip', '打包 zip')}</button>
          <button class="btn ghost" data-act="upload" data-id="${esc(p.id)}">${C('dlc.upload', '上传')}</button>
          <button class="btn ghost danger" data-act="delete" data-id="${esc(p.id)}">${C('dlc.delete', '删除')}</button>
        </div>
      </div>`
  }).join('')

  const mine = `
    <div class="group">
      <div class="group-head">
        <span class="gt">${C('dlc.localTitle', '本机的包')}</span>
        <span class="gh">${CT('dlc.localHint', '源包区 {src} 个 · 运行区 {live} 个已装', { src: (d.src || []).length, live: (d.live || []).length })}</span>
        <span class="line"></span>
      </div>
      ${packs ? `<div class="dlc-packs">${packs}</div>` : `<div class="dlc-empty">${C('dlc.localEmpty', '还没有包。上面「做一个包」可以切一个出来。')}</div>`}
    </div>`

  /* ③ 远端 */
  const rem = d.remotes || {}
  const cfg = d.config || {}
  const rc = cfg[D.remote] || {}
  const rLabel = rem[D.remote]?.label || D.remote
  const rHint = rem[D.remote]?.hint || ''
  const rOk = rem[D.remote]?.ok
  const rTarget = rem[D.remote]?.target || ''

  const remoteCfg = `
    <div class="dlc-remcfg">
      <div class="field w-short">
        <label>${C('dlc.remoteType', '远端类型')}</label>
        <select id="dlc-remote">
          ${Object.entries(rem).map(([k, v]) => `<option value="${k}"${D.remote === k ? ' selected' : ''}>${esc(v.label)}</option>`).join('')}
        </select>
        <span class="hint">${esc(rTarget || rLabel)}</span>
      </div>
      ${D.remote === 'local' ? `
        <div class="field">
          <label>${C('dlc.remoteDir', '目录')}</label>
          <input type="text" id="dlc-r-dir" value="${esc(rc.dir || '')}" placeholder="${C('dlc.remoteDirPlaceholder', 'D:/DLC仓库（网盘同步盘也行）')}" />
        </div>` : ''}
      ${D.remote === 'http' ? `
        <div class="field">
          <label>${C('dlc.remoteBase', '地址')}</label>
          <input type="text" id="dlc-r-base" value="${esc(rc.base || '')}" placeholder="https://example.com/dlc" />
        </div>
        <div class="field w-short">
          <label>${C('dlc.remoteToken', 'Token')}</label>
          <input type="text" id="dlc-r-token" value="${esc(rc.token || '')}" placeholder="${C('dlc.remoteTokenPlaceholder', '可留空')}" />
        </div>` : ''}
      ${D.remote === 'git' ? `
        <div class="field">
          <label>${C('dlc.remoteRepo', '仓库地址')}</label>
          <input type="text" id="dlc-r-repo" value="${esc(rc.repo || '')}" placeholder="https://github.com/…/…git" />
        </div>
        <div class="field w-short">
          <label>${C('dlc.remoteBranch', '分支')}</label>
          <input type="text" id="dlc-r-branch" value="${esc(rc.branch || 'main')}" />
        </div>
        <div class="field w-short">
          <label>${C('dlc.remoteRepoDir', '仓库内目录')}</label>
          <input type="text" id="dlc-r-dir2" value="${esc(rc.dir || 'dlc')}" />
        </div>` : ''}
      <div class="dlc-actions">
        <button class="btn ghost" id="dlc-r-save">${C('dlc.remoteSave', '保存远端配置')}</button>
        <span class="muted${rOk ? '' : ' warn'}">${esc(rHint)}</span>
      </div>
    </div>`

  const tabs = `
    <div class="dlc-tabs">
      <button class="dlc-tab${D.remoteTab === 'upload' ? ' on' : ''}" data-tab="upload">${C('dlc.tabUpload', '上传')}</button>
      <button class="dlc-tab${D.remoteTab === 'download' ? ' on' : ''}" data-tab="download">${C('dlc.tabDownload', '下载')}</button>
    </div>`

  let tabBody = ''
  if (D.remoteTab === 'upload') {
    tabBody = `
      <div class="dlc-empty">${CT('dlc.uploadTip', '在上面的「本机的包」里点某个包的 <b>上传</b>，就会打包成 zip 发到「{remote}」。<br />本地远端就是拷到那个目录（网盘同步盘会自动同步上去）；git 远端会 push 到仓库。', { remote: esc(rLabel) })}</div>`
  } else {
    const list = D.remoteList
    tabBody = list === null
      ? `<div class="dlc-empty">${C('dlc.downloadEmpty', '点上面的「列出远端包」看看有什么可装的。')}</div>`
      : (list.length
        ? `<div class="dlc-remote-list">${list.map((p) => `
            <div class="dlc-rp">
              <b>${esc(p.name || p.id)}</b>
              <span class="dim">v${esc(p.version || '?')} · ${(p.size / 1024).toFixed(0)} KB</span>
              <button class="btn ghost" data-act="download" data-id="${esc(p.id)}">${C('dlc.downloadInstall', '下载并安装')}</button>
            </div>`).join('')}</div>`
        : `<div class="dlc-empty">${C('dlc.remoteListEmpty', '远端还没有包。先上传一个。')}</div>`)
  }

  const remote = `
    <div class="group">
      <div class="group-head">
        <span class="gt">${C('dlc.remoteTitle', '云端 / 网盘')}</span>
        <span class="gh">${C('dlc.remoteHint', '包发出去 / 拉回来')}</span>
        <span class="line"></span>
      </div>
      ${remoteCfg}
      ${tabs}
      <div class="dlc-remote-body">
        ${tabBody}
        ${D.remoteTab === 'download' ? `<div class="dlc-actions"><button class="btn ghost" id="dlc-r-list">${C('dlc.listRemote', '列出远端包')}</button></div>` : ''}
      </div>
    </div>`

  $('#panel').innerHTML = make + mine + remote

  bindDlcPanel()
}

/* ────────────────────────────── DLC 面板交互 ────────────────────────────── */

function bindDlcPanel() {
  const root = $('#panel')

  $('#dlc-kind', root)?.addEventListener('change', (e) => {
    D.kind = e.target.value
    D.keys = []            // 换了类目，旧选择失效
    renderDlcPanel()
  })
  $('#dlc-pick-all', root)?.addEventListener('click', () => {
    D.keys = dlcCandidates(D.kind).map(([v]) => v)
    renderDlcPanel()
  })
  $('#dlc-pick-none', root)?.addEventListener('click', () => {
    D.keys = []
    renderDlcPanel()
  })
  $$('[data-pick]', root).forEach((el) => {
    el.onchange = () => {
      D.keys = $$('[data-pick]:checked', root).map((x) => x.dataset.pick)
      const cnt = $('#dlc-pick-count', root)
      if (cnt) cnt.textContent = CT('dlc.pickCount', '已选 {n} / {total} 项', {
        n: D.keys.length, total: dlcCandidates(D.kind).length,
      })
    }
  })
  $('#dlc-pool', root)?.addEventListener('change', (e) => { D.poolId = e.target.value })
  $('#dlc-name', root)?.addEventListener('input', (e) => { D.name = e.target.value })
  $('#dlc-author', root)?.addEventListener('input', (e) => { D.author = e.target.value })
  $('#dlc-desc', root)?.addEventListener('input', (e) => { D.description = e.target.value })
  $('#dlc-remote', root)?.addEventListener('change', (e) => { D.remote = e.target.value; renderDlcPanel() })

  $('#dlc-make', root)?.addEventListener('click', dlcMake)
  $('#dlc-r-save', root)?.addEventListener('click', dlcSaveRemote)
  $('#dlc-r-list', root)?.addEventListener('click', dlcListRemote)

  $$('.dlc-tab', root).forEach((b) => {
    b.onclick = () => { D.remoteTab = b.dataset.tab; renderDlcPanel() }
  })

  // 接口级开关
  $$('[data-iface]', root).forEach((el) => {
    el.onchange = async () => {
      const [id, iface] = el.dataset.iface.split('|')
      await dlcMount(id, { interfaces: { [iface]: el.checked } })
    }
  })

  // 整包开关
  $$('[data-master]', root).forEach((el) => {
    el.onchange = async () => {
      await dlcMount(el.dataset.master, { enabled: el.checked })
    }
  })

  // 各种动作
  $$('[data-act]', root).forEach((b) => {
    b.onclick = () => {
      const id = b.dataset.id
      const act = b.dataset.act
      if (act === 'install') dlcPost('/api/dlc/install', { id }, '已安装')
      else if (act === 'uninstall') dlcPost('/api/dlc/uninstall', { id }, '已卸载')
      else if (act === 'pack') dlcPost('/api/dlc/pack', { id }, '已打包')
      else if (act === 'upload') dlcUpload(id)
      else if (act === 'download') dlcDownload(id)
      else if (act === 'delete') {
        void dlcDelete(id)
      }
    }
  })
}

/** 删除源包（走工坊自己的确认弹窗，不再用 window.confirm） */
async function dlcDelete(id) {
  const ok = await showConfirm({
    title: CT('dlc.confirmDeleteTitle', '删除扩展包'),
    body: CT('dlc.confirmDelete', '源包「{id}」和运行区里的副本会一起删除，删掉后只能重新下载。', { id }),
    okText: CT('dlc.confirmDeleteOk', '确认删除'),
  })
  if (ok) await dlcPost('/api/dlc/delete', { id }, '已删除')
}

/** 统一的后端调用：成功就把新的 state 换回去并重绘 */
async function dlcPost(url, body, okMsg) {
  if (D.busy) return
  D.busy = true
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const d = await r.json()
    if (!d.ok) { log('err', d.error || '失败'); return }
    if (d.state) S.dlc = d.state
    // 部分成功也要如实说：后端可能返回 ok=true 但 notes 里带着某一步的失败
    if (Array.isArray(d.notes) && d.notes.length) {
      log('err', d.notes.join('；'))
      renderDlcPanel()
      return
    }
    if (okMsg) log('ok', okMsg)
    renderDlcPanel()
  } catch (e) {
    log('err', String(e.message || e))
  } finally {
    D.busy = false
  }
}

async function dlcMount(id, patch) {
  await dlcPost('/api/dlc/mount', { id, ...patch }, '挂载状态已改（模拟器重启后生效）')
}

async function dlcMake() {
  if (!D.keys.length) { log('err', C('dlc.pickRequired', '先在上面勾选至少一项')); return }
  clearLog()
  log('step', CT('dlc.exporting', '导出 {n} 项…', { n: D.keys.length }))
  const r = await fetch('/api/dlc/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind: D.kind, keys: D.keys, name: D.name, author: D.author,
      description: D.description, poolId: D.poolId,
    }),
  })
  const d = await r.json()
  if (!d.ok) { log('err', d.error || '导出失败'); return }
  if (d.state) S.dlc = d.state
  log('ok', CT('dlc.exported', '已导出「{id}」（{files} 个素材文件）', { id: d.id, files: d.files }))
  const att = d.attached || {}
  if (att.banners || att.stories) {
    log('ok', CT('dlc.attachLog', '包里附带：服装阁 {banners} 座 · 故事 {stories} 篇', {
      banners: att.banners || 0, stories: att.stories || 0,
    }))
  }
  sfx('set-complete', 0.4)
  D.keys = []
  renderDlcPanel()
}

async function dlcSaveRemote() {
  const root = $('#panel')
  const cfg = {}
  if (D.remote === 'local') cfg.dir = $('#dlc-r-dir', root)?.value.trim() || ''
  if (D.remote === 'http') {
    cfg.base = $('#dlc-r-base', root)?.value.trim() || ''
    cfg.token = $('#dlc-r-token', root)?.value.trim() || ''
  }
  if (D.remote === 'git') {
    cfg.repo = $('#dlc-r-repo', root)?.value.trim() || ''
    cfg.branch = $('#dlc-r-branch', root)?.value.trim() || 'main'
    cfg.dir = $('#dlc-r-dir2', root)?.value.trim() || 'dlc'
  }
  const r = await fetch('/api/dlc/remote/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ active: D.remote, remotes: { [D.remote]: cfg } }),
  })
  const d = await r.json()
  if (!d.ok) { log('err', d.error || '保存失败'); return }
  if (d.state) S.dlc = d.state
  log('ok', '远端配置已保存')
  renderDlcPanel()
}

async function dlcListRemote() {
  log('step', `列出「${D.remote}」上的包 …`)
  const r = await fetch(`/api/dlc/remote/list?type=${encodeURIComponent(D.remote)}`)
  const d = await r.json()
  if (!d.ok) { log('err', d.error || '列不出来'); return }
  D.remoteList = d.list || []
  if (d.state) S.dlc = d.state
  log('ok', `远端有 ${D.remoteList.length} 个包`)
  renderDlcPanel()
}

async function dlcUpload(id) {
  log('step', `上传「${id}」到 ${D.remote} …`)
  const r = await fetch('/api/dlc/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type: D.remote }),
  })
  const d = await r.json()
  if (!d.ok) { log('err', d.error || '上传失败'); return }
  if (d.state) S.dlc = d.state
  log('ok', d.message || '已上传')
  if (d.shareUrl) log('out', `分享链接：${d.shareUrl}`)
  sfx('set-complete', 0.4)
  renderDlcPanel()
}

async function dlcDownload(id) {
  log('step', `下载「${id}」 …`)
  const r = await fetch('/api/dlc/download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type: D.remote }),
  })
  const d = await r.json()
  if (!d.ok) { log('err', d.error || '下载失败'); return }
  if (d.state) S.dlc = d.state
  log('ok', `已装上「${d.id}」`)
  sfx('set-complete', 0.4)
  renderDlcPanel()
}

/* 顶栏两个按钮：只是把面板切到 DLC 并定位到对应分区 */
$('#btn-upload')?.addEventListener('click', () => {
  switchJob('dlc')
  D.remoteTab = 'upload'
  renderDlcPanel()
  log('out', '上传：在「本机的包」里点某个包的「上传」')
})
$('#btn-download')?.addEventListener('click', () => {
  switchJob('dlc')
  D.remoteTab = 'download'
  renderDlcPanel()
  log('out', '下载：切到「云端 / 网盘」→ 点「列出远端包」')
})
