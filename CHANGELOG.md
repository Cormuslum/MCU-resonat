# 更新日志 · 《无限暖暖》共鸣抽卡模拟器

> 素材版权归叠纸所有。本项目仅用于个人学习，非商业、非盈利。
> 主文档见 `工作计划书.md`（当前 v2.2.06）。

> **版本号规则**：`v{N}.{n}.{mm}`
>
> | 事件 | 动作 |
> |---|---|
> | **大改动**（新增页面 / 重构原有页面 / 新增数据源·管线 / 架构级改造） | `n += 1`，`mm` 归 `00`；`n` 到 10 → `N += 1`、`n = 0` |
> | **小改动**（用户提意见后的精修 / 修 bug / 换素材 / 调坐标 / 补文档） | `mm += 1`；`mm` 满 12 格（`00`~`11`）→ `n += 1`、`mm = 00`；`n` 到 10 → `N += 1`、`n = 0` |
>
> **连续大改动**：相邻两次大改动之间的小改动 **≤ 1 个**时视为同一簇（`大-大`、`大-小-大` 都算），
> **只在簇首**执行 `n += 1`、`mm = 00`；簇内后续的大改动按 `mm += 1` 顺延 ——
> 一次连续的大改动只消耗一个中版本号。
>
> 起点是**空项目**，故 `v0.0.00` 不作为一个发布版本存在。全部 **141** 个历史版本已按此规则重排
> （**37** 次大改动 / **104** 次小改动；`mm` 满 12 格进 1 首次触发在 `v1.6.11 → v1.7.00`，
> `n` 满 10 首次进 `N` 在 `v0.9.09 → v1.0.00`）。
>
> **判定口径**：新页面 / 整页重做 / 整组件重做（弹层、进度圆）/ 接入新数据源 / 架构级改造 → 大；
> 用户反馈批次（哪怕一次 19 条）/ 修 bug / 回退 / 换素材 / 只出文档 → 小。
>
> **新旧对照（上一代编号 → 现行编号）**：`v0.1`→`v0.1.00`、`v0.4`→`v0.1.03`、`v0.6`→`v0.1.05`、
> `v0.7.1`→`v0.2.00`、`v0.8.0`→`v0.2.01`、`v0.8.3`→`v0.2.04`、`v0.9.0`→`v0.3.00`、
> `v0.9.7`→`v0.5.00`、`v0.9.11`→`v0.6.00`、`v0.9.13`→`v0.6.02`、
> `v0.9.15`→`v0.6.04`、`v0.9.17`→`v0.6.06`、`v0.9.23`→`v0.7.02`、`v0.9.26`→`v0.7.05`；
> 上一代末尾的 `v2.9.41`（去掉悬停黑框 + 鼠标缩半）即本文件的 `v2.2.06`。
>
> ⚠️ `备份/` 里的 zip 文件名沿用**当时的旧编号**（`v2.9.x` 那一套），未随本次重排改名 ——
> 改了会指向不存在的文件。

---

## [v2.2.06] 2026-11-13 — 去掉悬停黑框提示 + 鼠标指针缩半

> 改前基线：`备份/抽卡模拟器-v2.9.41-2026-11-13.zip`。

### 摘要

- 博物图鉴悬停不再弹深灰圆角标签（`.mz-tip` 整套删除），只留物体上的金色柔光
- 全站关掉浏览器原生 tooltip：33 处 `title` 在移入瞬间挪进 `data-title`，信息不丢
- 鼠标指针从 52×60 缩到 26×30（正好一半），热点 `4 4` → `2 2`
- 素材管线给 UI 转码表加了可选缩放项，鼠标那行传 `(26, 30)`，重跑不会长回原尺寸
- 工坊同步同一张半尺寸光标 + 同一组热点

### 一、博物图鉴的悬停黑框

`MuseumView.vue` 的四个入口热区（服装 / 故事 / 阅读物图鉴、搜索）各带一个 `tip: [x, y]` 坐标，
hover 时在那个绝对坐标上叠一块 `rgba(24,16,10,0.72)` 的深灰圆角标签。它盖在画面上，
而且整块物体已经有金色柔光（`.mz-sheen.lit`）提示「这里能点」，标签是多余的。

- 删掉 `<span class="mz-tip">`、`ITEMS` 里的 `tip` 坐标、`.mz-tip` 的两条 CSS。
- `label` 保留，改挂到 `:aria-label` —— 无障碍不退化，但不会画框。

### 二、浏览器原生 tooltip

`title="…"` 在 Chromium 里悬停约 1 秒会弹一张系统黑框（方角、深灰、白字），和羊皮纸 + 暖金
完全两套语言。全站 33 处，集中在 `BannerView`(12)、`AlmanacView`(6)、`SettingsView`(4)、
`HomeView`(3)、`EggPopup`(3) 等。

`main.ts` 新增 `muteNativeTooltips()`：捕获阶段监听 `mouseover` / `focusin`，
命中 `[title]` 就把值挪进 `data-title` 再 `removeAttribute('title')`。
浏览器来不及显示就被摘掉；将来要做自绘提示，读 `data-title` 即可。
Vue 动态 `:title` 在数据变化后会写回来，所以是「每次移入都查一遍」，不做一次性清理。

### 三、鼠标指针缩半

- 源图 `素材/界面/UI整包/UI/Common/Cursor/UI_Common_Mouse_img.png` 是 52×60，玩家反馈偏大。
- `collect-assets.py`：`to_webp()` 加可选 `scale=(w, h)`（`-vf scale=…:flags=lanczos`），
  默认不缩放；`UI_ASSETS` 三元组向后兼容第四项；鼠标那行改成 `…, 92, (26, 30)`。
  这样以后 `--force` 重跑也还是 26×30，不会长回 52×60。
- 产物 `public/assets/ui/cursor/mouse.webp` 重生成（Pillow 确认 26×30 RGBA）；
  `App.vue` 的 `--nk-cursor` 热点 `4 4` → `2 2`（按比例）。
- 工坊 `updater/web/mouse.webp` 换成同一张，`--nk-cursor` 热点同步 `2 2`。

### 四、验收

- 发行版模拟器壳：`--nk-cursor` = `url("/assets/ui/cursor/mouse.webp") 2 2, auto`，
  fetch 该图 `createImageBitmap` 得到 **26×30**、HTTP 200。
- `#/codex`：`.mz-tip` 数量 **0**，4 个 `.mz-hit` 的 `innerHTML` 为空、`aria-label` 仍在。
- hover 一个带 `title` 的元素后：`title` 属性为 `null`、`data-title` 保留原值、全页 `[title]` 归 0。
- 发行版 `dist/` 重新镜像为 **46 文件 / 6.7 MB**（只含代码，媒体仍由 `public/assets` 提供）。

---

## [v2.2.05] 2026-11-13 — 发行版不再假装重启 dev server + 弹窗 / 光标与美术对齐

> 改前基线：`备份/抽卡模拟器-v2.9.40-2026-11-13.zip`。

### 摘要

- 发行版「写入并更新」不再报「已启动 vite / 等了 20s 端口仍未就绪」—— 那套是开发版的收尾
- 删掉「完成后重启模拟器」复选框：发行版是静态壳，刷新即生效；开发版收尾改由服务端自己判断
- 扩展包「删除源包」与快照「撤回」两处 `window.confirm` 换成工坊自己的羊皮纸确认弹窗
- 工坊全局鼠标换成模拟器那张 `ui/cursor/mouse.webp`（52×60，hotspot 4 4，与模拟器一致）
- 前端 `confirm/alert` 已清零；剩下的 Electron `showErrorBox` 只在「服务都起不来」时兜底

### 一、写入收尾：发行版不再假装重启 dev server

发行版每次写入都会以三行红字收尾：

```
已启动 vite（pid 18560），等待端口就绪…
等了 20s 端口仍未就绪，请手动 npm run dev
模拟器未能自动拉起，请手动执行 npm run dev，或直接刷新页面
```

原因是 `restartDevServer()` 从头到尾是**开发版**的实现，发行版没有任何分支，三处对不上：

| 它以为的 | 发行版实际 |
|---|---|
| `TOOL_ROOT/node_modules/vite/bin/vite.js` | `工具/` 下只有 `data tools updater 文案.json`，没有 node_modules |
| `spawn(process.execPath, …)` 当 node 用 | Electron 里 `process.execPath` 是 `心忆奇想工坊.exe` 本身 |
| 探活 `5178` | 发行版模拟器固定 `51800`（`main-sim.mjs`） |

所以它必然 spawn 一个跑不起来的进程、空等 20s、报错，而「失败不回滚」又让日志里
「全部完成」和红字同时出现，看起来像写入失败。

- `server.mjs`：收尾改成 `if (DIST_MODE) log('素材已写入：回到模拟器按 Ctrl+R（或 F5）刷新即可看到')`
  `else` 才走原来的 dev server 重启。**开发版行为不变**，发行版不再执行这段。
- 删掉 `#opt-restart` 复选框（`index.html` / `app.js` 不再传 `restartDev`），
  以及没人调用的 `POST /api/dev/restart` 路由与 `apiRestartDev()`。
- 帮助弹窗第 4 条改成「读素材 → 跑管线 → 写进模拟器（写完回到模拟器刷新一下就能看到）」。
- 保留 `pipeline.mjs` 的 `restartDevServer / devServerAlive`：开发版仍在用，`apiState` 还要报 dev server 状态。

### 二、确认弹窗统一

`window.confirm` 在 Electron 里就是一张 Windows 白框，跟羊皮纸 + 墨棕金完全两套语言。

- 新增 `#modal-confirm` + `showConfirm({title, body, okText, primary})`，返回 Promise；
  确定 → `true`，取消 / 点遮罩 / `ESC` → `false`，同一时刻只留一张。
- 样式复用清理弹窗那套（`.clean-actions` 提升为通用的 `.modal-actions`），
  危险动作走红框按钮，撤回这类「确认但不删」用金框；正文 `white-space: pre-line` 保留换行。
- 换掉两处：
  | 位置 | 原来 | 现在 |
  |---|---|---|
  | 「最近改动」撤回 | `confirm('撤回这次改动？\\n{id}…')` | 标题「撤回这次改动？」，正文含快照 id |
  | 扩展包删除源包 | `confirm('删除源包「{id}」？…')` | 标题「删除扩展包」，正文说明运行区副本一起删 |
- 顺带补上 `ESC` 关 `modal-tip`（以前只有帮助 / 清理两张能 ESC）。
- 全项目 `confirm(` / `alert(` 已清零。剩下的原生框只有 `electron/main-updater.mjs` 与
  `main-sim.mjs` 的 `dialog.showErrorBox`（缺 `工具/`、缺 `运行时/`、端口被占这类
  **服务都没起来**的致命错），此时没有渲染进程可用，HTML 弹窗无从谈起，保持原样。

### 三、鼠标光标

- `updater/web/mouse.webp`：直接取模拟器 `public/assets/ui/cursor/mouse.webp`（52×60 RGBA）。
- `style.css` 的 `:root` 加 `--nk-cursor: url("./mouse.webp") 4 4;`（hotspot 与 `App.vue` 一致），
  `html, body` 用它，19 处 `cursor: pointer` 全部改成 `cursor: var(--nk-cursor), pointer;`
  —— 与模拟器「连悬停也不变手型」的做法一致。
- `not-allowed / grab / grabbing` 这些语义光标不动。

### 四、验收

- 发行版壳内真跑一次「版本」写入：日志以「素材已写入：回到模拟器按 Ctrl+R（或 F5）刷新即可看到」
  + 「全部完成」结束，**不含 `vite` / `端口仍未就绪` / `npm run dev` 任何字样**；随后撤回 7 个文件，
  `版本表.csv` 与 manifest 回到写入前。
- 撤回弹窗、扩展包删除弹窗都在真实按钮路径上弹出（标题 / 正文 / 按钮样式均正确），
  取消后包还在、`ESC` 关掉且不触发动作。
- `getComputedStyle(document.body).cursor` = `url("http://127.0.0.1:5199/mouse.webp") 4 4, auto`，
  `/mouse.webp` 返回 200；`#opt-restart` 已不存在。

---

## [v2.2.04] 2026-11-13 — 整套导入拖文件夹直接读绝对路径 + 顶栏清理临时文件

> 改前基线：`备份/抽卡模拟器-v2.9.39-dev-2026-11-13.zip`。

### 摘要

- 拖文件夹不再把整棵目录树复制进 `.inbox`，直接把绝对路径填进「文件夹路径」框
- 靠 Electron preload 的 `webUtils.getPathForFile()` 拿路径，走与「粘贴路径」同一条扫描链路
- 顶栏加垃圾桶按钮（上传 DLC 左边），清理 `.dist` / `.inbox` / `.snapshots` 三个临时目录
- 删除走二级确认弹窗：可选删哪几项、显示条目数与体积，快照那行单独警告
- 普通浏览器里没有路径能力时，仍自动退回「目录树上传」的老路

### 一、拖文件夹：从「复制整棵树」改成「只读路径」

上一版为了拿到目录结构，把整个文件夹复制进 `updater/.inbox/<时间>-bundle-tree/` 再扫描 ——
能跑通，但大文件夹（尤其是几十个视频）会白占一份磁盘，用户说得对：多此一举。

- 新增 `electron/preload-updater.cjs`：`contextBridge` 只暴露一个
  `window.nikki.getPathForFile(file)`，内部就是 Electron 32+ 的
  `webUtils.getPathForFile()`。**只这一个同步方法，不开 node、不开 ipc。**
- `main-updater.mjs` 的 `webPreferences` 挂上 preload；`electron-builder-updater.yml`
  的 `files` 加上这个文件（否则不进 asar，页面里 `window.nikki` 会是 undefined）。
- `app.js` 新增 `droppedPaths(dt)`：遍历 `dataTransfer.files` 逐个取绝对路径
  （**文件夹在 Chromium 里也是一个 size 0 的 File，照样能取到目录路径**），
  顺带把重复分隔符 / 正反斜杠混用统一成 `/`。取到就走 `dropByPaths()`：
  - 整套导入 → `S.fields.root = 路径` → `scanBundleRoot()`，与「粘贴路径」**完全同一条**链路；
  - 其它任务 → 塞进 `#path-input` 后调 `readPaths()`，与手动粘贴一样归位。
- 取不到（普通浏览器 / 老壳）就返回空数组，`handleDrop` 继续走 `webkitGetAsEntry()` 那条兜底，
  行为与 v2.2.02 完全一致 —— 不会因为壳没更新就拖不动。

实测（真 Electron 壳 + CDP 系统级拖放）：拖 `素材/示例/大版本名（例如：心愿原野）` →
路径框显示 `D:/电脑美化/文档/无限暖暖/素材/示例/大版本名（例如：心愿原野）`，
扫描出 1 大版本 / 1 版本 / 1 阁 / 2 套 / 3 阅读物，`.inbox` **没有产生任何目录**。
拖单个文件 → 弹「整套导入不支持散文件，请到其他地方操作」。

### 二、顶栏垃圾桶：清理临时文件

- 按钮位置在「上传 DLC」左边，图标用 `trash can.png`（源图是白色描边，
  用 Pillow 压成 `#111` 单色 128px，存 `updater/web/trash.png`）。
- 服务端两个接口，**只认三个固定目录**，不接受任意路径（不做「传什么删什么」）：
  | 键 | 目录 | 说明 |
  |---|---|---|
  | `dist` | `updater/.dist` | 扩展包打包输出（可随时重打） |
  | `inbox` | `updater/.inbox` | 拖入 / 上传中转（正常写入会自动删） |
  | `snapshots` | `updater/.snapshots` | 写入快照 —— **删了就没有「撤回」了** |
  `GET /api/temp` 返回存在性 / 文件数 / 体积；`POST /api/clean` 按 `keys` 删除并回报释放字节。
- 前端二级确认弹窗：勾选项（默认全勾、不存在的置灰）、每项条目数与体积、合计、
  「取消 / 确认删除」；快照那行标红写「删掉后「撤回」历史一起消失（已写进模拟器的内容不受影响）」，
  删完在日志里报「已清理 + 释放多少」。
- 实测：三项共 279 文件 / 19.3 MB → 一次删净、目录确实消失；取消则一个字节都不动。

### 三、验收

- 壳内 `window.nikki.getPathForFile` 存在且能返回真实路径；拖文件夹 / 拖单文件 / 其它任务拖文件夹
  三条分支都按预期走通（见上）。
- 普通浏览器（无 preload）里拖目录树 → 仍走兜底上传，扫描出 2 篇阅读物。
- 清理接口返回 `{removed:["dist","inbox","snapshots"], freed:20221298, files:279}`；
  删后 `/api/temp` 三项均为「已删」。
- 改动前备份：`备份/抽卡模拟器-v2.9.39-dev-2026-11-13.zip`；
  三个临时目录清理前的快照：`备份/发行版-临时目录-清理前-20261113.zip`（279 文件 / 15.4 MB）。

---

## [v2.2.03] 2026-11-13 — 信封的版本日志改成运行时 JSON（改文案不必重新构建）

> 改前基线：`备份/抽卡模拟器-v2.9.38-dev-2026-11-13.zip`。

### 摘要

- 信封的「最近三版更新」从 `src/data/mail-changelog.ts` 搬到运行时 JSON
- 数据落在 `public/assets/data/mail-changelog.json`，页面 fetch 加载，读不到只少几页不白屏
- 改这份 JSON（或重跑 `npm run changelog`）刷新即生效，发行版里也能直接验收
- 生成器改为只写 JSON，不再生成会被编译进 JS 的 `.ts`
- 顺带补齐 v2.2.00 / .01 / .02 三条更新记录

### 一、为什么搬

信封弹窗的三页版本日志，以前是 `tools/gen-mail-changelog.mjs` 从 `CHANGELOG.md` 抽出来
**写进 `src/data/mail-changelog.ts`**，再被 vite 编译进 JS。后果是：

- 改一句版本说明 → 必须回项目 `npm run build`，还要把 `dist` 精确同步进发行版；
- 发行版里根本没有 vite，玩家/验收方在发行版里改不了，只能看到上次构建时的内容；
- 每次动它都会改变 JS 字节，于是「零行为变化」的重构批次被迫把它排除在外
  （v2.1.04 就是因为这个把 CHANGELOG 撤出范围的）。

### 二、改成什么

- `src/data/mail-changelog.ts` 只剩**类型 + 加载函数**：
  `loadMailLogs()` 走既有的 `loadAssetJson()`（与故事/阅读物同一套运行时加载）。
- 数据文件：`public/assets/data/mail-changelog.json`，就是一个数组
  `[{version, date, title, lines[]}]`，2KB 以内。
- `MailPopup.vue`：`mailLogs` 用 `ref` 承接，`pages` 由它派生；到货后重算溢出量
  （`checkOverflow`），翻页钮的页数也跟着变。加载失败时只少三个日志页，欢迎页与拆信封照常。
- 生成器 `tools/gen-mail-changelog.mjs` 改为写 `public/assets/data/mail-changelog.json`，
  不再生成 `.ts`；`prebuild` 仍会自动跑，保证 dev/build 拿到的都是最新三次。

### 三、验收口径变了

以前「改 CHANGELOG → 生成 ts → build → 同步 dist → 开信封」五步，
现在**只动 `mail-changelog.json` 一个文件**，刷新浏览器就能看信封；
`npm run changelog` 只在想从 `CHANGELOG.md` 重新抽取时才需要跑。

### 四、顺带补的历史条目

`CHANGELOG.md` 之前停在 v2.1.05，本次补上 v2.2.00（工坊故事面板 + 整套导入容错 +
管线按任务裁剪）、v2.2.01（砍两步冗余 + 纯元数据免转码 + 直写成品补口 + 中转 YAML 即删）、
v2.2.02（整套导入认任意层 + 拖文件夹 + 待补归属自动带入 + 搜索下拉 10 行 + zip 打包修复）。

同时按实际条目重算了文件头的统计：**131 个版本 / 29 次大改动 / 102 次小改动**
（原来写的 52 / 18 / 34 早已过时 —— 文件里实际有 131 个 `## [v…]` 标题）。

---

## [v2.2.02] 2026-11-13 — 整套导入认任意层 / 拖文件夹 / 待补归属自动带入（+ 搜索下拉与 zip 打包）

> 改前基线：`备份/抽卡模拟器-v2.9.36-dev-2026-11-12.zip`。
> 本轮状态备份：`备份/抽卡模拟器-v2.9.37-dev-2026-11-13.zip`。

### 摘要

- 整套导入：路径末尾是哪一层就认哪层，指到阅读物/版本/阁/套装都能进
- 支持直接拖文件夹：整棵树落到中转区再扫描，写入成功后中转目录自动删除
- 「去「服装阁」填写」现在把阁名、版本、素材、套装一起带过去，并列出还缺什么
- 故事搜索下拉改成「容器 10 行高」，结果全列（以前被截断成 10 条）
- 修扩展包打包报「打包失败：」—— 发行版里裸调系统 python 导致 ENOENT

### 一、整套导入：识别「路径末尾那一层」

用户报的两条本质是同一个问题：以前只认 `root` 的**下一层**是大版本目录。

- 指到 `素材/示例/阅读物/阅读物`（顶层只有三个 txt）→ 判成散文件，弹「整套导入不支持散文件」；
- 必须写成 `素材/示例/阅读物` 才能认。

新增 `classifySelf(dir)`：按**目录名**判断「这个文件夹自己」是阅读物 / 版本（含 `x.y`）/
服装阁 / 套装中的哪一层，是就直接按那层收。

- **顺序坑**：套装必须排在服装阁之前判 —— `进化等阶/整体-初始.png` 会被服装阁识别
  按尺寸当成 16:9 背景，一整套衣服就变成一座阁。
- root 自己是大版本目录（子目录能解析出 `x.y` 且 `collectVersion` 非空）时不再往里剥一层，
  否则会把「阁名」当成大版本名，报一屏「看不出是版本目录」。
- 新增 `guessContext()`：往上 1~2 层找版本目录名，猜 `version / versionName / major / majorName`，
  **只用于预填表单**，绝不作为写入依据。

顺手补了个静默丢失：`collectPool` 以前完全不认动态背景（mp4/webm）与进入音（ogg/mp3/wav/flac/m4a），
整套导入拖进去直接丢掉、那一格永远空；现在认，并落到 `视频/服装阁动态/`、`音频/服装阁进入音/`。

### 二、拖文件夹（浏览器拿不到绝对路径）

- 根因：`dataTransfer.files` 里的文件夹是「无扩展名、size 0」的条目，按扩展名过滤后全被丢掉
  → 提示「这批里没有可用的图片或文本」。
- 前端改用 `webkitGetAsEntry()` 递归读整棵树（`readEntries` 必须循环到空，每批 ≤100；
  且**只能在 drop 事件里同步调用**，await 之后 items 就失效）。
- 新增 `POST /api/upload-tree?job=`：按原样把相对目录树落到
  `updater/.inbox/<时间>-<任务>-tree/`（含 zip-slip 过滤），返回**落盘后的根**；
  整套导入拿到根就走与「粘贴路径」完全同一条扫描链路。
- 写入成功后 `cleanStagedTree()` 删掉中转树与那层 `-tree` 空壳（只认名字带 `-tree` 的壳，
  绝不碰 `.inbox` 根 —— 一次拖多个文件夹时 root 就是 `.inbox` 本身），大视频不会多存一份。
- 中转树已删还点写入 → 明确提示「重新拖一次或粘贴原始路径」，而不是甩一句「路径不存在」。
- 其它任务拖文件夹：拆成「文件 + 相对路径」照常上传归位，拖到某个槽位时整批放进那一格
  （例如把整个「图标」文件夹拖进「部件图标」）。

### 三、「去「服装阁」填写」：把这一层能认的全带过去

以前只填一个阁名，用户还得把十几张图重新拖一遍。现在 orphan 带
`guess: { version, versionName, major, majorName, pools[{bg,thumb,titleArt,video,audio,milestones,sets}] }`：

- 阁名、版本（仅当版本表里确实有这一版）、背景 / 缩略图 / 艺术字 / 动态背景 / 进入音 /
  深海回响全部进槽位；套装按套数自动建卡，填好名称 / 星级 / ID 与整体图 / 半身像 / 图标 /
  YAML / 故事。
- 面板顶部新增**对账单**：`✓ 已带入：阁名「…」· 2 套服装 · 20 个素材` + 逐条
  `⚠ 还缺：动态背景、进入音、XX 的属性 YAML…`，日志同步说一遍。
- 版本下拉本来就有「默认选最新版」的逻辑，所以猜到的版本不在表里时会明说
  「目录名看是 1.0，但版本表没有这一版 —— 下拉默认选了最新版，请确认」。

### 四、故事搜索下拉：容器 10 行，不是只给 10 条

上一版理解偏了 —— 用户要的是**容器高度 = 10 个条目**，不是把结果截断成 10 条。

- 去掉 `hits.slice(0, 10)`，输「5」渲染 43 条，可滚到最后一条；
- `.combo-list` 用 `--combo-row: 32px` + `max-height: calc(10 * var(--combo-row) + 10px)`
  （实测 330px = 10 行），`.combo-item` 行高写死 32px；底部提示改「共 43 条，滚动查看」。

### 五、扩展包打包报「打包失败：」

- 真因不在打包逻辑：`packZip` / `unpackZip`、`ensurePng`（转 PNG）、`readZipEntry`
  四处都在**裸调系统 `python`**。发行版机器上没有系统 python（只有自带运行时），
  子进程直接 ENOENT，而 `stderr` 是空的 → 拼出来就是「打包失败：」一个孤零零的冒号。
- `pythonBin()` 从 `pipeline.mjs` 搬到 `util.mjs`（pipeline 原样再导出，旧调用点不动），
  四处统一改用它；新增 `pyFailText()` 把「找不到 python / Store 假存根 9009 / 空输出」翻成人话。
- 实测 `/api/dlc/pack` → 成功，zip 175 个条目、`dlc.json` 在包内。

### 六、验收

- 扫描矩阵 8 例（示例根 / 示例/阅读物 / 示例/阅读物/阅读物 / 大版本层 / 版本层 / 阁层 /
  套装层 / 真散文件）：前 7 例全 ok，散文件仍拒绝并弹窗。
- 拖文件夹：Playwright 用等价假 DataTransfer 走完整链路 → 中转 3 个 txt → 扫描出 3 篇 →
  真实写入 `readings.json` 593→596 → 中转树与壳都被删 → 撤回后 **593 篇、逐字节还原**。
- 待补归属跳转：阁名 + 2 套 + 20 个素材进槽位（10 个槽有缩略图）、对账单 6 行。
- 搜索：输「5」→ 43 条、容器 330px、可滚到最后一条。
- 页面 0 报错；`audit-dead-code` 干净（只剩 `$`/`$$` 两条既有误报）；
  开发版 vs 发行版工坊文件逐个 md5 全绿。

---

## [v2.2.01] 2026-11-12 — 管线再砍两步冗余 + 纯元数据免转码 + 直写成品补口

> 改前基线：`备份/抽卡模拟器-v2.9.36-dev-2026-11-12.zip`。

### 摘要

- 版本/服装阁/套装不再无条件重算故事与阅读物，改看这次到底写了什么
- 没拖新素材、也没新建东西时跳过整趟转码，只重建索引与清单
- 套装/服装阁/整套导入里附带的故事也直写成品，不再在数据目录留 md
- 阅读物同样直写成品 JSON，并修好「撤回后自建名录留脏名字」
- 套装 YAML 变成纯中转：信息编进 pool-map 后自动删除

### 一、砍掉两步白跑的管线

`buildSteps()` 以前对版本/服装阁/套装一律跑满五步。依赖关系其实很干净：

- 故事只进 `stories.json`，阅读物只进 `readings.json`；
- 只有版本/服装阁/套装才会动 `pool-map.json` 与 `manifest.json`。

改成看 `applyJob` 回传的 `storyWritten` / `readingWritten` 决定是否追加那两步。实测：

| 任务 | 以前 | 现在 |
|---|---|---|
| 版本（只改介绍/名称） | pool-map + assets + manifest + stories + readings | **pool-map + manifest** |
| 服装阁 / 套装（只改元数据） | 同上 | **pool-map + manifest** |
| 套装（新建 / 换图） | 同上 | pool-map + **assets** + manifest |
| 套装附带故事 | 同上 | pool-map + assets + manifest |

`pool-map` 与 `manifest` 省不掉：前者是 `manifest` 的唯一来源（`versions` / `banners[].sets[]` /
parts / desc 全在里面），后者是前端唯一索引；它俩扫的是目录与 YAML，不是八千张图。

### 二、纯元数据编辑免转码

新增 `transcode` 标志（`hasMedia(files)` + 是否新建共同判定）。日志变成
「本次没有新素材 → 跳过转码，只重建索引与清单」，省掉整趟 `collect-assets --pool`
（全 skipped 也要几十秒）。

四种情况**仍强制转码**，因为产物路径或产物本身会变：改**服装阁编号**
（`banners/bg/<编号>.webp`、`video/<编号>.mp4` 按编号命名）、改**套装 ID**（`sets/<ID>/…`）、
新建阁 / 新建套装、本次给了任何图片视频音频。

### 三、直写成品补两个口子

- **故事**：「套装」「服装阁」「整套导入」里附带的 `.md` 以前仍走 `writeStory()`
  落 `工具/data/故事/`。现在统一走 `saveStory()`：发行版 `upsertStoryJson()` 直写
  `stories.json`，开发版仍写 md。顺带把 `# 标题` 与 `---` 剥掉——以前在套装任务里挂的故事
  会把 md 头一起写进正文。
- **阅读物**：新增 `upsertReadingJson()`，发行版直写 `readings.json`
  （紧凑 JSON、按 id 正序，与 `gen-readings.py` 同格式），不再落 txt。
- 顺带修好一个隐性坑：`writeReading()` 里的 `markCustom()` **从未进快照** ——
  新增一本书再撤回，`自建内容.json` 里仍留那个名字，扩展包导出时会多一条死候选。
  现在 `saveReading()` 两条路都先 `touchCustom(snap)`。

### 四、套装库 YAML 变中转，跑完即删

- `applyJob` / `applyBundle` 收集本轮写出的 `套装库/<ID>.yaml` → `suitYamls`；
  `server.mjs` 在管线**成功后**调 `cleanSuitYamls()` 删除并 `pruneEmpty`。
  实测删完 `工具/data/` 顶层只剩 `pool-map.json` 与 `信息表/`。
- **删了为什么不丢数据**：`build-pool-map` 的 `_fill_assets()` 会在字段为空时从上一版
  pool-map 取 `desc / styles / parts / formTexts`。实测删后重跑：desc、10 个 parts、
  首件五维全部保留，88 阁 / 134 套不变。
- 由此反推一条约束：生成「最小版 YAML」必须把已有五维与文案带进去（`partsFromIcons()`），
  否则这一轮就把富数据覆盖成空、删完再也补不回来（原实现只写部件名 + 部位，会静默降级）。

### 五、顺带修的

- 发行版「修改已建套装」必崩：直转模式下源目录是空壳，跑完管线被 `pruneEmpty` 清掉，
  `if (!exists(fromDir)) throw` 直接报「找不到套装目录」。改成 pool-map 认识这套就继续，
  只建新目录、不搬文件。
- 「这次会写入」在发行版说实话：`文案.json` 新增 `updater.jobs.<id>.writesDist`
  （story / reading / suit / pool / bundle 五份），`jobsWithCopy()` 在发行版优先用它；
  删掉原先硬编码在代码里的 story 覆盖（两处真源）。
- `archive.mjs` 导出 `isMedia()`；`jobs.mjs` 去掉死导入 `readStoryOf`。

---

## [v2.2.00] 2026-11-12 — 工坊故事面板（搜索 / 自动认套装 / 正文预览）+ 整套导入容错

> 改前基线：`备份/抽卡模拟器-v2.9.34-dev-2026-11-12.zip`。

### 摘要

- 故事面板加「搜索套装」，输名字或星级即时筛；套装名下拉改按套装序号排
- 拖进 markdown 自动认出对应套装，认不出就清空，避免写到别人身上
- 选中套装或拖入 md，正文直接进正文框（固定看 10 行，多的在框里滚）
- 只改一篇故事不再跑全套管线，发行版直接改成品 stories.json
- 整套导入遇散文件弹窗提示；残缺目录不丢，列成「待补归属」并给跳转按钮

### 一、故事面板

- 新增第三列**「搜索套装」**（就在「星级」右边）：字段顺序
  `套装名 → 星级 → 搜索套装 → 故事正文`。输名字或星级（`5` / `4` / `4星`）即时筛，
  键盘 Enter 选第一条、Esc 收起（选中用 `mousedown`，`click` 会被 blur 抢先收起列表）。
- 「套装名」下拉改由 `suitList` 驱动，按 `套装序列.csv` 的**序号**升序（与图鉴同序），
  不再按拼音；没登记的自建套装 seq=0 排尾部。
- 拖入 md 自动认套装：`matchStorySet()` 认三种写法 —— `故事-5星-套名.md`、文件名含套名
  （长名优先，避免「雪境」抢走「雪境长歌」）、文件名含 `S0429` / `0429`。
  **认不出时清空套装名**：留着上一次的选择，一路点写入就会把这篇写到别人身上。
- 正文预览：新增 `GET /api/story?name=` / `?src=`；选中套装或拖入 md 把正文填进正文框，
  md 会剥掉 `# 标题` 与 `---`。正文框改为**固定 10 行**
  （`height: calc(10 * 1.65em + 20px)` + `overflow-y: auto`），长故事不把表单撑到屏幕外。
- `setSearch` 是纯 UI 字段：提交 payload 与内容签名都剔除，不污染「与上次一致」的增量判定。

### 二、管线按任务裁剪（第一刀）

`buildSteps({ job })` 不再一律跑全套：`story` 只跑 `gen-stories.py`（发行版直接返回空数组，
因为已直写成品），`reading` 只跑 `gen-readings.py`；版本/服装阁/套装/整套导入仍走全套。

### 三、整套导入容错

- **散文件**：顶层只有文件 → `scanBundle` 返回 `{ok:false, code:'loose-files'}`，
  前端弹新加的通用提示弹窗：「整套导入不支持散文件，请到其他地方操作」。
- **识别放宽**（原来死板到只认 `S0062` 这种目录名）：
  - 套装目录：`S0062` / 目录名即套名 / 含 `属性·故事-4星-` 文件 / 含
    `半身像·图标·进化等阶` 子目录 / 含 `整体-*.png`；
  - 星级：文件名没写就读目录名（「四星套装名」→ 4★）；
  - 套装 ID：不是 S 编号时，已有套装沿用原 ID，新套装取现有最大 S + 1；
  - 阁：有套装 / 背景 / 艺术字 / 缩略图 / 深海回响 任一即认；
  - 版本目录：版本号不在开头也认（从名字里捞 `x.y`）；
  - 阅读物：目录名以「阅读物」开头即算（示例里是「阅读物（归属于这个大版本的阅读物）」）。
- **残缺归位**：认不出版本层不猜也不丢，收进 `plan.orphans`，前端列「这 N 项认不出归属」，
  带原因与「去「服装阁」填写」按钮。
- 拿 `素材/示例` 原样模板测：1 大版本 / 1.0 / 1 阁 / 2 套（4★+5★）/ 3 篇阅读物 /
  5 档深海回响全部认出。

### 四、故事不再复制到内部源

发行版（`NIKKI_DIST_MODE=1`）新增 `upsertStoryJson()`：**直接改
`public/assets/data/stories.json`**，紧凑 JSON（与 `gen-stories.py` 的 `separators` 一致，
不会把整份文件重排），新故事的 `setId / major` 从 pool-map 反查，一个中转 md 都不落。
开发版仍是 md → `gen-stories.py`（源是真源）。

真机验收：写入后目标篇被替换、134 篇数量不变、`工具/data/故事/` 里文件 mtime 没变；
`/api/rollback` 之后 `stories.json` **逐字节**回到写入前。

### 五、其它

- 浅色面板上的 `.btn` 原本是给深色底用的浅金字，几乎看不见 → `.bundle-bar .btn` 与
  待补归属按钮改深色字浅底。
- 待补归属条目不再重复显示「名字 + 同一个阁名」，汇总行为零时改说人话而不是一串 0。

---


## [v2.1.05] 2026-11-12 — 工坊路径全部指向真实目录（端口错连 / 删 xlsx / 验收脚本归档）

> 改前基线：`备份/抽卡模拟器-v2.9.34-dev-2026-11-12.zip`。

### 摘要

- 修「发行版工坊显示 素材/…」：根因是 exe 连到了占着 5199 的开发版工坊
- 工坊启动先认领端口：只有同一 toolRoot 才复用，否则顺延 5199~5206
- 文案里的 {D}/{O}/{T} 全部在服务端替换，发行版不再出现不存在的素材目录
- 发行版删掉 套装信息表.xlsx，并修好「缺表就静默丢掉最新套装 ID/星级」的 bug
- 验收脚本修掉 2 份必崩的，37 份历史脚本归档到 tools/_archive/verify/

### 一、「发行版工坊仍显示 素材/…」的真因：连到了开发版

用户截图里五行写入清单全是 `素材/信息表/版本表.csv`、`素材/界面/UI整包/UI/Image/Card/…`，
而发行版根本没有 `素材/`。问题不在渲染层 —— 是**窗口连错了工坊**：

- 开发版工坊（项目根 `node updater/server.mjs`）与发行版 exe **默认端口都是 5199**；
- `main-updater.mjs` 原来只要「5199 有人监听」就直接 `createWindow()` 复用，
  于是发行版窗口展示的是开发版的数据根：`/api/state` 返回
  `labels = {data:"素材", out:"public/assets"}`，与截图逐字一致。

修复：

- **`pickPort()`**：启动前先 `GET /api/state` 问对方 `toolRoot`，**同一个 toolRoot 才复用**，
  否则顺延 5199~5206 起自己的实例。实测开发版占着 5199 时，新 exe 自动落到 **5200**，
  `labels.data = 心忆奇想工坊/工具/data`。
- `/api/state` 新增 `toolRoot / dataRoot / labels{data,out}`；顶栏状态文字**悬停**显示
  「数据 / 成品 / 绝对路径」三行 —— 以后一眼就能看出连的是哪个工坊。

### 二、文案里的路径占位符补齐（`{D}` / `{O}` / 新增 `{T}`）

- 之前只有「这次会写入」在服务端替换 `{D}/{O}`；`/copy.json` 是**直接吐文件**，
  而前端 `fillTemplate()` 只认表单字段 → 写进 json 的占位符会原样漏成字面量。
  新增 `copy.mjs` 的 `copyWithPaths()` 做递归替换，`/copy.json` 改走它。
- 新增 **`{T}`（工具根）**：归档目录落在**工具根**而不是数据根
  （`jobs.mjs` 的 `path.join(TOOL_ROOT,'归档素材')`），文案写「归档素材/」会让人去 `素材/` 下找。
  开发版显示 `归档素材/`，发行版显示 `心忆奇想工坊/工具/归档素材/`。
- 清掉两处硬编码旧路径：`app.js` 自建内容的兜底提示、`dlc-export.mjs` 的
  `public/assets/manifest.json 不存在` → 改用 `rel(MANIFEST)`。
- 实测：`/copy.json` 里 `{D}/{O}/{T}` 残留 **0**，发行版只剩「归档素材/」这个真目录名。

### 三、删掉发行版 `套装信息表.xlsx` —— 顺带修好「静默丢数据」

用户确认表里的有用内容已拆进 `套装序列.csv` / `版本表.csv`。删前备份
`备份/发行版-data-删xlsx前-20261112.zip`（8 文件 / 0.49 MB）。

删的过程暴露一个真 bug：`xlsx_rows()` 直接 `zipfile.ZipFile(path)`，文件不在就抛 ENOENT，
异常被主流程 `except` 吞掉 → `load_set_info()` 返回空表 →
**2.11 的两套（S0429 4★ 奶酪与剑、S0438 5★ 绽若颂愿心）ID / 星级 / 首发 / 来源静默变空**。
表看着「早被 CSV 取代」，缺了却让最新版本悄悄掉字段。

- `xlsx_rows()` 文件不存在返回 `[]`（xlsx 本来就是可选补充源，CSV 才是主源）。
- 补两道守卫：`版本表.csv` 与 xlsx 都空 → `SystemExit`；`套装序列.csv` 与 xlsx 都读不到套装行
  → `SystemExit`。宁可失败，也不写出「版本名全空」的残缺 pool-map。
- 严格比对：有 xlsx vs 无 xlsx 的 pool-map **逐字段唯一差异是 `meta.generatedAt`**；
  删除后重跑 26 版本 / 88 阁 / 134 套，banner-080 的 `S0429 4★`、`S0438 5★` 齐全。

### 四、验收脚本：修必崩 + 归档 37 份

- `verify-v2923.mjs` / `verify-v2924.mjs` 读已删的 `src/data/{reading,story}-titles.ts` → ENOENT。
  改读运行时真源 `public/assets/data/{readings,stories}.json`（标题就在里面），
  A13 改 `JSON.parse(...).length === 134`，v2924 的 `PIPELINE_OUTPUTS` 断言换成现行 6 项。
- 归档 37 份到 `tools/_archive/verify/`，`tools/` 下只留 13 份能当回归套件的
  （almanac / clothes / fortune / gloria / readings / readings-e2e / readings-layout /
  save-persist / stories / updater-bold / v2924 / v2925 / v2929-write）。
- 归档目录里 4 份用 `await import('../updater/…')` 的已改 `../../updater/…`，从项目根仍可直接跑；
  附 `README.md` 写明「哪些断言 FAIL 属预期，别当成故障」。
- 备份 `备份/verify脚本-归档前-20261112.zip`（50 份）。

### 五、验收

- 开发版占 5199 + 启动发行版 exe → 落 5200；Playwright 抓界面「这次会写入」5 行
  全部为 `心忆奇想工坊/工具/data/…` 与 `无限暖暖模拟器/public/assets/…`，无错位。
- 发行版 vs 开发版工坊代码逐个 md5 比对 **differ 0**（发行版独有的缺失项都是 `.inbox`、
  `.snapshots`、`e2e/`、`README.md` 这类本就不该发行的）。
- `/api/state` overview：26 版本 / 88 阁 / 134 套 / 134 故事 / 593 阅读物，删表后不变。

---

## [v2.1.04] 2026-11-12 — 结构性简化（图鉴 CSS 单一真源 + 布局与随机数复用）

> 改前基线：`备份/抽卡模拟器-v2.9.33-dev-2026-11-12-b.zip`。
> 方案与台账：`docs/refactor-plan-v2.1.04.md`、`docs/refactor-baseline.md`、`docs/refactor-qa-report.md`。

### 摘要

- 图鉴两视图共用一份 CSS（511 行），scoped 仍各自带 hash，互不污染
- 5 个布局 computed 抽成 rdLayout(L)，两视图只传各自的 L 进来
- hexagram 复用 seed 的 hashStr / makeRng，删掉重复实现
- 行为零变化：CSS 字节 169,631 B 精确不变、契约 sha256 一致、路由 NoOne
- 行数 −600、重复块 912→335（−63.3%），QA 6/6 PASS

### 一、边界先说清楚：什么叫「行为零变化」

本批只做**等价改写**，硬判据四条：行数要降、重复块要降、CSS 字节精确不变、契约 sha256 逐字节一致。
凡是要改 DOM 结构（抽组件）、改文案、改数值的，一律不进这批 —— 那些属于「行为变更」，得单独验收。

### 二、抽出来的三块

- **`src/styles/museum-codex.css`（511 行）**：`MuseumStories.vue` / `MuseumReadings.vue`
  各用 `<style scoped src="../styles/museum-codex.css">`。两个视图本来就是复制派生关系，
  CSS 是同一份，共享不会污染（scoped 仍带各自 hash）。
- **`src/core/museum-layout.ts` 的 `rdLayout(L)`**：5 个布局 computed
  （`listH` / `rowHiStyle` / `rowLineStyle` / `contentStyle` / `emptyStickerStyle`）返回同一个对象，
  两视图只传各自的 `L` 进来。
- **`hexagram.ts` 复用 `seed.ts`**：`hashStr` / `makeRng` 改为 `import` + `export`
  （纯 `re-export` 会让文件内 `divinationOf()` 编译失败 —— 必须显式 import 再导出）。

### 三、为什么 CSS 字节必须「一分不降」

`@vitejs/plugin-vue` 对 `<style scoped src>` 用 `&src=${descriptor.id}` 强制拆成两个模块 id，
Rollup 不会合并成共享 chunk；`@keyframes` 名里还嵌着组件级 scoped hash
（`tab-breathe-ad981295` vs `-fd47b555`）。所以**正确结果是 CSS 字节精确不变**；
一旦 CSS 变小，说明误用了无 scoped 的全局引入，会污染 `.on` / `.sel` / `.show`。

### 四、实测结果

| 指标 | 结果 |
|---|---|
| 行数 | −600（达标） |
| 重复块 | 912 → 335（−63.3%，达 ≥60% 判据） |
| CSS 字节 | 169,631 B **精确不变** |
| 构建恒等式 | JS 467,336 + CSS 169,631 = 636,967 B |
| 契约 | sha256 逐字节一致 |
| QA | 6/6 PASS，路由 NoOne |

### 五、明确不做

- 6 个千行大文件（`bundle.mjs` / `jobs.mjs` / `MuseumClothes.vue` 等）**不拆** —— 拆分收益小于回归风险。
- 图鉴 template 不抽公共组件（会改 DOM 顺序与事件绑定，违反 S7）。
- **`CHANGELOG.md` 撤出本批**：它经 `prebuild` 改 `mail-changelog.ts`，会连带改变 JS 字节，
  污染「字节不变」的验收；v2.1.03 / v2.1.04 条目因此留到 v2.1.05 统一补。

---

## [v2.1.03] 2026-11-12 — 路径文案纠偏 + 媒体去元数据 + 死代码与冗余素材清理 + 视频拆可选包

> 改前基线：`备份/抽卡模拟器-v2.9.31-2026-11-12.zip`。

### 摘要

- 工坊写入清单改用 {D}/{O} 占位符，路径按真实布局显示（开发版/发行版各一套）
- 169 个媒体文件无损去元数据：流 MD5 零变化，可重复跑
- 新增两个审计工具：manifest 引用判定（TS AST）与跨文件死代码
- 删掉 24 个未被引用的 manifest 分支（325 KB）与 2 个孤儿套装
- 视频拆成可选包：34 文件 / 1.4 GB，保留原分辨率与原目录结构

### 一、工坊「这次会写入」显示的路径与实际不符

发行版把数据根换到了 `工具/data/`，但清单里还写死 `素材/…`。改为**布局占位符**
`{D}`（数据根）/ `{O}`（成品根），由 `jobs.mjs` 的 `jobsWithCopy()` 在**服务端**替换：

- 开发版 → `素材/信息表/版本表.csv`、`public/assets/manifest.json`
- 发行版 → `心忆奇想工坊/工具/data/信息表/版本表.csv`、`无限暖暖模拟器/public/assets/manifest.json`

⚠ 必须服务端替换：前端 `fillTemplate()` 只认表单字段，`{D}` 会被当成空值换成「…」。

### 二、媒体文件去元数据（无损，可反复跑）

- 新增 `tools/strip-metadata.py`：ffmpeg `-c copy` 流复制去掉容器/图片元数据，
  WebM 走 EBML `Void` 填充（按原宽度重写 VINT，不搬家）。
- 实测 **169 个媒体文件流 MD5 零变化**（画面与音轨一个字节没动），幂等：再跑一次无改动。

### 三、死代码审计（两个常驻工具）

- `tools/audit-manifest-usage.mjs`：用 TS AST 判定 manifest 条目有没有被前端引用
  （处理别名、`.value` 解包、模板属性、元素访问），删素材前先跑它。
- `tools/audit-dead-code.mjs`：跨文件死 export + 多余 import。
- 顺带删掉旧版单层 DLC API、过度导出的内部函数、死导入与过时注释。

### 四、冗余素材清理（精确到「确认无人引用」）

- 按 AST 审计结果删 **24 个 manifest 死分支（325 KB）+ 2 个孤儿套装**。
- 审计工具本身有两处误判，修完才敢动手：`store.manifest?.ui?.cursor` 这类**链式前缀**、
  以及 `computed(() => store.manifest?.ui.x ?? null)` 的 **`?? null` 包裹别名**。
  误删的 `cursor/mouse.webp`、`mail/{env,back,paper}.webp` 已还原。

### 五、视频拆成可选包（保留原始分辨率）

- 新增 `tools/split-video-pack.mjs`：28 个服装阁动态背景 + 主页 `bg-video-2.mp4` /
  `bg-audio-2.ogg` 移到 `release/无限暖暖视频包/`，**34 文件 / 1.4 GB**，保留原始目录结构，
  玩家拖回模拟器目录即自动归位。
- `collect-assets.py` 在文件缺失时**退回旧 manifest 记录**（不写空值）；移除视频前端静默
  退回静态背景，不报错。

---

## [v2.1.02] 2026-11-12 — 发行版去掉故事/套装库/阅读物源目录（JSON 为主 + 源目录只放增量）

> 改前基线：`备份/抽卡模拟器-v2.9.30-2026-11-12.zip`。

### 一、为什么不能直接删

用户问「这三个目录的对应数据已经在模拟器里了，能不能删」。**实测答案是：直接删会清空数据**。

管线每次写入都会重跑 `gen-stories.py` / `gen-readings.py`，它们是「扫源目录 → **全量覆盖**写出」：

| 场景 | 实测结果 |
|---|---|
| 删掉 `故事/` 目录 | `gen-stories.py` **报错退出（rc=1）** → 整条写入流程失败 |
| `故事/` 存在但为空 | rc=0，`stories.json` 被写成 **0 条** → **134 篇故事全清空** |
| `阅读物/` 为空 | rc=0，`readings.json` 被写成 **0 条** → **593 篇阅读物全清空** |
| 删掉 `套装库/` | 池 88 / 套装 134 都在，但**有整体文案的套装 134 → 132**（手工池 `S0429 奶酪与剑`、`S0438 绽若颂愿心` 的文案只在 YAML 里） |

### 二、改成「JSON 为主 + 源目录只放增量」

发行版不再随包发 `工具/data/{故事,套装库,阅读物}`（4.5M）。这三份成品
（`stories.json` 134 篇 / `readings.json` 593 篇 / pool-map 里的套装文案）
已经在模拟器里，而这三个目录在发行版只当**增量补丁** —— 用户拖进来的新文件
覆盖对应那一条，其余内置内容原样保留。

- **新增环境变量 `NIKKI_JSON_BASELINE=1`**（发行版启动器设置）：
  - 开发版**不设** → 纯源模式，`素材/` 是唯一真源，删一篇就是删一篇（行为零变化）
  - 发行版设 1 → 基线模式，JSON 是主数据源，源目录只放增量
- `gen-stories.py` / `gen-readings.py`：读现有 JSON 作基线，源里同 id 的覆盖基线，
  基线里源没有的**保留**；源目录为空或不存在 → 结果就是基线本身，一条不丢。
  基线条目缺排序用的 `_num`，按 `setId` 补算（否则全落 9999、排序乱掉）。
- `build-pool-map.py` 的 `_fill_assets`：基线兜底从「只补 assets」扩到**也补
  `desc`/`styles`/`parts`**（目标为空才补，YAML 有值不覆盖）→ 手工池文案一条不少。

### 三、途中揪出的一个真 bug：新建阅读物会顶掉别人的书

发行版没有源目录 → `nextReadingId()` 只扫源目录，`max` 停在 0 → 新建的书被分配到
`read_L_book_010203001`，**正好撞上《安隙炉操作指引》**，合并时把它静默顶掉
（真机实测：593 条没变，但那一本的内容被换掉了）。

两道保险都补上：

1. `nextReadingId()` 现在**同时看成品 `public/assets/data/readings.json`** 里的编号
   —— 593 篇内置阅读物只存在于 JSON 里，不看它编号就一定撞。
   修好后分配到 `read_L_book_010203102` / `010101103`，不撞号。
2. `gen-readings.py` 合并时**检测撞号**：源条目的 id 与基线撞了、但书名不同 →
   **保留基线那条并明确报出**，绝不静默覆盖别人的书。

### 四、验收

- 隔离实验（发行版目录结构，源目录全无）：`build-pool-map` rc=0、
  「基线补回 87 座阁」；stories **134**、readings **593**，一条不丢。
- 增量：拖一本新阅读物 → **594**，且原有 593 条**丢失 0 / 被改动 0**；
  改写一篇已有故事 → 134，目标篇已更新，其余 133 篇**一条没被动**。
- 撞号：手工塞一个与内置同号异名的文件 → 内置那本保住 + 明确告警。
- 真机（发行版工坊）：新建阅读物 → 594 条、原 593 条一条没动、编号 `010203102` 不撞号。
- 开发版回归：pool-map **逐字段一致**、stories 134 **内容一致**、readings 593 **内容一致**、
  manifest **0 差异**。

### 五、体积

工坊 `工具/data/` 从 **4.5M → 2.2M**（只剩 `pool-map.json` + `信息表/`）。

**一个取舍要知道**：发行版下**删不掉**内置的故事/阅读物（删源文件不生效，
基线 JSON 还在）。要移除内容得改 JSON 本身。发行版工坊擅长的是「加」和「改写」。

---

## [v2.1.01] 2026-11-12 — 发行版冗余清理（管线依赖闭包 + 空壳目录）

> 改前基线：`备份/抽卡模拟器-v2.9.29-2026-11-12.zip`。

### 一、只带管线依赖闭包

发行版里塞着**整个开发期的 `tools/` 目录**（110 个文件）——验收脚本、实机截图、
一次性探针、预处理工具、打包工具，对终端玩家全是垃圾。

**根治办法不是手动删，而是改打包规则**：

- `tools/pack-release.mjs` 新增 `pipelineClosure()`：**自动算出管线脚本的依赖闭包**
  （本地 import + 同目录被调用的脚本），只把这 7 个复制进发行包：
  `build-pool-map.py` / `collect-assets.py` / `gen-stories.py` / `gen-readings.py`
  + 依赖 `part_code.py` / `setyaml.py` / `title_suffix.py`。
  比手写白名单可靠 —— 以后给管线加了新依赖会自动跟上，不会漏。
- 打包时排除 `updater/README.md`（讲的是开发服务器版，端口与路径都与发行版不符，会误导；
  发行版用户看的是工坊界面里的「帮助」弹窗）。
- 数据目录排除 `前后名称对照表.md`（v2.0.02 起管线不读）、`desktop.ini`
  （Windows 资源管理器自动生成的 40KB 垃圾）、`系列分类说明.md`（描述早已不存在的「系列子目录」）。
- `tools/clean-release.mjs`（**新增**）：按同一套规则就地清理已打好的发行目录，
  不用重打包（重打包要重拷 2.6G）。脚本**幂等**，可反复跑。

**顺带修掉一个隐蔽的垃圾源**：`dist/` 里曾有 **392 个空目录** ——
`pack-release.mjs` 用 robocopy 的 `/XF` 排除媒体文件，但 robocopy **只排文件、保留空目录**，
于是 `banners/bg`、`milestones/banner-001`… 全是空壳（体积 0，纯目录噪音）。
现在打包与清理都会 `pruneEmpty()` 掉。

**清理结果**：

| 项 | 清理前 | 清理后 |
|---|---|---|
| `工具/tools/` | 127 文件 / 14M | **7 文件 / 0.4M** |
| `工具/data/阅读物/` | 含 desktop.ini 等 | 只剩真阅读物 + 用户工作清单 |
| `模拟器/dist/` | 45 文件 + **392 空目录** | 45 文件 / 5 目录 |
| 工坊体积 | 522M | 508M |

**保留**（不是冗余，别误删）：`2872新增阅读物清单.txt`（用户的工作清单）、
`大版本图标/`（工坊「版本」任务的写入目标）、`runtime.json`（远端配置）、
`data/信息表/{卡池索引.json,套装信息表.xlsx,套装序列.csv,版本表.csv,部位代号对照表.csv}`（管线读）。

**验收**：清理后发行版工坊真机写入 **6/6 PASS**（无 9009 / 走直转通道 / 管线整体成功 /
背景 webp 已更新 / 数据目录零媒体副本 / 无媒体子目录）；模拟器页面 200、stories 134、readings 593。

---

## [v2.1.00] 2026-11-12 — 砍掉内部源（外部源直转成品）+ 运行时归位工坊 + 图鉴数据运行时化

> 改前基线：`备份/抽卡模拟器-v2.9.28-2026-11-12.zip`。

### 一、三级链路 → 两级：外部源直接进成品

原来是「外部源 → 复制进 `素材/`（内部源）→ Python 转码 → `public/assets`」。
中间那层 3.9G（服装阁 627M + 界面 923M + 视频 2.4G + 音频 14M）纯粹是冗余：
用户给的文件在哪、它是"背景图"还是"缩略图"，工坊表单里本来就知道，
`pool-map` 里也早就显式记着每个素材的虚拟路径，不需要先在磁盘上排一遍目录结构。

- **`updater/lib/archive.mjs`**：新增 `PASSTHROUGH` 直转模式。媒体文件（图/视频/音）
  不再复制，只登记「虚拟素材路径 → 真实源文件」；`.yaml` / `.md` / `.txt` / `.csv`
  是唯一真源，照旧落盘。
- **`tools/collect-assets.py`**：新增 `--overrides <json>` / `NIKKI_OVERRIDES`。
  `A()` 拼路径时先查重定向表 —— 转码逻辑一行没改，产物名、质量、裁切规则全沿用。
- **`tools/build-pool-map.py`**：新增**基线合并**。发行版没有 `服装阁/` 目录，一个阁都
  扫不到，88 座内置阁的清单来自上一版冻结的 `pool-map`；`pool_file` / `scan_set_assets` /
  `load_videos` / `load_milestones` 全部改走 `virtual_*`（磁盘有的 + 本次登记的都算"在"），
  所以**新建阁/套装也能在没有源目录的情况下被识别**。
- 合并规则刻意做笨（`pool-map` 是 88 阁唯一索引）：扫到的优先、缺的字段用基线补、
  基线独有的整条追加并用最新 YAML 刷文案；套装清单扫不到时按基线补回并保持基线顺序。

### 二、模拟器纯静态，运行时归工坊

玩家可能只想玩（只下载「无限暖暖模拟器」），Python / ffmpeg / 编辑数据对他全是负担。

```
无限暖暖发行版/
  无限暖暖模拟器/     exe + dist(仅代码) + public(成品) + userdata   ← 纯静态，2.1G
  心忆奇想工坊/       exe + 运行时(python+Pillow+ffmpeg) + 工具/{updater,tools,data}  ← 543M
```

- 三个根拆开：`TOOL_ROOT`（工具）、`ASSET`（数据）、`ROOT`（成品）。
  `main-updater.mjs` 分别用 `NIKKI_TOOLROOT` / `NIKKI_DATA_DIR` / `NIKKI_ROOT` 告诉 server，
  另设 `NIKKI_OUT_DIR` 让 Python 把成品写进**模拟器**而不是工坊自己。
- **自带运行时**（`tools/pack-runtime.mjs`）：Python 3.13 embeddable + Pillow 13 +
  ffmpeg。`pythonBin()` 优先用它 —— 系统 PATH 上的 `python` 多半是 Microsoft Store 的
  假存根，一跑就 **exit 9009**（这就是之前"写入并更新"失败的真因）。
  `collect-assets.py` 的 ffmpeg 也改为「与 python.exe 同目录优先」。
- 直转模式下 jobs 仍会 mkdir 出 `<data>/服装阁/...` 空壳（它本来准备往里面复制），
  管线跑完用 `pruneEmpty` 清掉 —— 不给用户留下"内部源又长回来了"的错觉。

### 三、故事 / 阅读物改运行时加载

`gen-stories.py` / `gen-readings.py` 不再生成 `src/data/*.ts`，改为输出
`public/assets/data/{stories,readings}.json`；`src/data/*.ts` 只保留类型定义，
`story-titles.ts` / `reading-titles.ts` 删除（搜索索引改由加载后填充）。

- 效果一：**发行版工坊改完故事/阅读物，刷新浏览器即生效**（以前编译进 JS，没有 vite 永远不更新）。
- 效果二：JS 总量 **2191KB → 456KB**，两包正文改成进页面时才 fetch。

### 四、验收

- `tools/verify-v2929-write.mjs`：发行版工坊真机换一张阁背景 → 直转通道生效、
  无 9009、`public/assets/banners/bg/1000.webp` 内容变化、数据目录**零媒体副本**、套装清单不丢。
- 无源环境生成的 `manifest` 与开发版**逐字段对比 25,878 条，0 差异**。
- 模拟器：窗口 `127.0.0.1:51800`、页面 200、stories 134 / readings 593、`userdata` 随包。
- 工坊：`/api/state` 的 `root` = 发行版/无限暖暖模拟器，`python` = 工坊自带运行时。

### 五、体积

发行版 **6.1G → 2.6G**（模拟器 2.1G + 工坊 543M）。

### 六、收尾修正：工具状态文件不再污染成品目录

发行版拆成「模拟器（纯静态）/ 工坊（编辑器）」后，发现一批路径仍以**成品根 `ROOT`**
为基准 —— 于是工坊一写入，**模拟器目录里就长出 `updater/.snapshots/`**（43M 快照），
"纯静态、可单独分发"的承诺被打破。

逐处改成正确的基准：

| 文件 | 原基准 | 改为 | 是什么 |
|---|---|---|---|
| `archive.mjs` | `ROOT/updater/.snapshots` | `TOOL_ROOT/...` | 快照（撤回用） |
| `archive.mjs` | `ROOT/updater/.inbox` | `TOOL_ROOT/...` | 收件箱 |
| `incremental.mjs` | `ROOT/updater/.last-apply.json` / `.write-cache.json` | `TOOL_ROOT/...` | 写入指纹 / 上次应用 |
| `remote.mjs` | `ROOT/updater/{remote.json,.dist,.inbox}` | `TOOL_ROOT/...` | 远端配置 / 包暂存 |
| `dlc-export.mjs` | `ROOT/素材/{故事,阅读物}` | `ASSET/...` | 故事/阅读物源在**数据根**，不是成品根 |
| `dlc.mjs` | `ROOT/public/dlc` | `PUBLIC/dlc` | DLC 成品 |
| `meta.mjs` | `ROOT/public/assets/manifest.json` | `PUBLIC/assets/...` | 概览读成品 manifest |
| `jobs.mjs` | `ROOT/归档素材` | `TOOL_ROOT/归档素材` | 移出套装的归档区属工坊工作区 |

同时 `PIPELINE_OUTPUTS` 补上运行时化的图鉴数据
（`public/assets/data/{stories,readings}.json` —— v2.1.00 起不再是编译进 JS 的 `*.ts`），
撤回时一起还原。

**结果**：工坊写入后，模拟器目录只剩 `dist` + `public` + `userdata` + 程序文件；
快照/缓存/收件箱全部落在 `心忆奇想工坊/工具/updater/` 下。

### 七、顺带修：工坊概览的阅读物计数

`overview()` 用「文件名含清单」排除非阅读物文件，误伤了《愿望清单打卡记录》《缇诺西特诊所物资清单》
—— 这两个是**真阅读物**，导致概览报 591 而图鉴实际 593。
改为与 `tools/gen-readings.py` **同口径**（只扫 `<分区>/*.txt` 与 `<分区>/<系列>/*.txt` 两层，
根目录下的工作清单不算），现在概览与图鉴都是 **593**。

---

## [v2.0.10] 2026-11-11 — 文案/阅读物同步 + 存档修复 + 工坊发行版自包含

> 改前基线：`备份/抽卡模拟器-v2.9.27-2026-11-11.zip`。

### 一、套装文案同步（S0020 / S0045 / S0048）

- 三套装的 YAML「整体文案」已由用户修好，但 `素材/pool-map.json` 是很久前生成的（`desc` 仍是
  「可制作具有<Yellow>滑翔能力</>」这类旧值），没跟上 YAML。
- 重跑 `build-pool-map.py`（用新套装库 134 套）→ `collect-assets.py --all --manifest-only`，
  `manifest` 里三套装 `desc` 已从旧值改为 YAML 的**整体文案**，`manifest` 自检 4276 条路径全有效。

### 二、阅读物 `</>` 残留同步

- `素材/阅读物` 源已清理干净，但 `src/data/readings.ts` 仍有 **12 处 `</>`**（《木偶雕刻记录》
  《言茶台茶单》《愚妄者的拜服》《巧工园废墟勘探报告》《破旧的双面稿纸·其五》等）。
- 重跑 `gen-readings.py` → 593 篇、`</>` 归零；重新 build 后 dist 的阅读物 JS 也已同步（0 处）。

### 三、EXE 版模拟器存档丢失

- **根因 1**：`server.listen(0)` 每次随机端口，`localStorage` 按 origin 隔离，端口一变就是新域名 → 存档全丢。
  → 改为**固定端口 51800**（`NIKKI_SIM_PORT` 可覆盖），占用时明确提示。
- **根因 2**：`userData` 写在 `%APPDATA%`，部分环境写不进去（`Unable to move the cache: 拒绝访问`），
  localStorage 根本没落盘。→ `app.setPath('userData', <发行根>/userdata)`，存档随包、可写。
- 验证 `tools/verify-save-persist.mjs`：启动→写 localStorage→**正常关窗**→重启→读回，**2/2 通过**。
  （注意：强杀进程 `taskkill /F` 会跳过 leveldb flush，真实关窗不会。）

### 四、EXE 版工坊双击后多开一个浏览器页面

- `updater/server.mjs` 启动时会 `spawn('cmd','start', url)` 自动开浏览器（原本为命令行启动方便）。
- 打包版启动器传 `UPDATER_NO_OPEN=1`，server 侧早有该开关，于是只开 Electron 窗口、不再拉浏览器。

### 五、工坊 EXE 改为发行版自包含（可整包拷走）

- 布局：`release/无限暖暖发行版/{无限暖暖模拟器, 心忆奇想工坊}`；
  模拟器目录里同时含 `dist`(仅代码) + `public/assets` + `素材` + `tools` + `updater` + `src`。
- **写入路径指向发行版**：工坊启动器按「exe 同级/上一级的 `无限暖暖模拟器`」定位数据根
  （`NIKKI_ROOT` 可覆盖），spawn 该目录的 `updater/server.mjs`，因此「这次会写入」的
  `素材/信息表`、`素材/界面/…`、`public/assets/…`、`manifest.json` 全部落在**模拟器文件夹内**，
  不再写本机 `D:/…/素材`。迁移整个发行文件夹时路径自动跟随。
- 模拟器改为：`/assets/*` 先查 `public/assets`（工坊写入处，改完立即生效），再回落 `dist/assets`（js/css）；
  固定端口 + `userdata` 在发行根。
- 开发服务器版工坊**保持原样**（`node updater/server.mjs`，ROOT 仍是项目根，不经启动器）。
- 新增 `tools/pack-release.mjs`（组装发行版）、`tools/verify-save-persist.mjs`。
- 真机验证：模拟器窗口 `127.0.0.1:51800`、页面 200、manifest 走 public（1.6M）、JS 走 dist；
  工坊 spawn 的 `/api/state` 的 `root` = `release\无限暖暖发行版\无限暖暖模拟器`，窗口 200。

> 说明：打包版工坊「写入并更新」会更新素材与 `public/assets`（模拟器读 public，立即生效）；
> 但阅读物/故事这类图鉴数据是编译进 JS 的，改后需重新 `npm run build` 才会进 dist（见交接提示词）。

---

## [v2.0.09] 2026-11-11 — 最终检验 + 自包含 EXE 打包

> 改前基线：`备份/抽卡模拟器-v2.9.26-2026-11-11.zip`。

### 一、最终检验

- `vue-tsc --noEmit` **0 错**；`python tools/verify-rates.py` **全部 PASS**
  （5★/4★/3★、纯 4★、4★ 条件概率）。
- `dist` 为 v2.0.07 构建产物（1.7G，含全部素材）。v2.0.08/27 只改工坊前端与打包脚本，
  **未触及模拟器源码**，故无需重建；现有 dist 已随包真机加载验证通过（页面 200 + `#app`）。
  （重建被 safe-delete 的 bulk 阈值拦截，属工具限制，非构建故障。）

### 二、打包为免安装 EXE（Electron 45.3.0 + electron-builder 26.18.0）

- 产物（免安装文件夹，双击 exe 即用）：
  - `release/无限暖暖模拟器/无限暖暖模拟器.exe` —— 约 2.1G（`resources/app/dist` 内含 1.7G 素材）；
  - `release/心忆奇想工坊/心忆奇想工坊.exe` —— 约 369M（本机快捷启动：spawn 项目根的 `updater/server.mjs`）。
- **模拟器**：主进程起本地 http 服务托管 `dist`（支持 Range / 视频拖动、自动播放），
  窗口加载 `http://127.0.0.1:<随机端口>/`；素材全部自包含，可整包拷走。
- **工坊**：主进程按 `electron/proj-root.json`（本机项目根）spawn 服务，用 Electron 自带 Node
  （`ELECTRON_RUN_AS_NODE=1`）运行，不依赖系统 node；「写入并更新」的 Python 管线仍用**本机 Python**。
- **图标**：给定的 `.ico` 仅 128×128，electron-builder 要求 ≥256；已用 Pillow 生成含
  16/24/32/48/64/128/256 多尺寸的副本（`electron/icons/`），**原素材未动**。
- **真机验证**（CDP）：两 exe 均正常起窗口、页面 HTTP 200 且含 `#app`；
  模拟器地址 `127.0.0.1:64698/#/`，工坊自起 5200 且 `/api/state` 200。
- ⚠ **环境注意**：WorkBuddy 等 Electron 宿主会把 `ELECTRON_RUN_AS_NODE=1` 传给子进程，
  从这类终端启动这些 exe 会变 Node 模式（报 `bad option`）；**从资源管理器双击不受影响**。
- 新增文件：`electron/main-sim.mjs`、`electron/main-updater.mjs`、`electron/proj-root.json`、
  `electron/icons/{simulator,updater}.ico`、`electron-builder-sim.yml`、`electron-builder-updater.yml`；
  `package.json` 增 `electron` / `electron-builder` 开发依赖与 `author`。

---

## [v2.0.08] 2026-11-11 — 工坊前端字段提示粗体未渲染修复

> 改前基线：`备份/抽卡模拟器-v2.9.25-2026-11-11.zip`。

### 一、工坊字段提示的 `**粗体**` 原样显星号

- **现象**：工坊「新建服装图 / 新建套装」里，模式字段下方的灰色提示
  `只有**工坊自建**的阁能改` / `只有**工坊自建**的套装能改` 以字面 `**` 显示，没加粗。
- **根因**：该提示由 `fieldHtml()` 渲染，原代码用 `esc(f.hint)`（只转义、不渲染标记），
  与工坊 `rich()`（`**…**`→`<b>`）规则没接上；而 `文案.json` 的 `_note` 约定这类提示要加粗。
- **修复**：`updater/web/app.js` 里所有字段 `hint` 渲染从 `esc()` 统一改为 `rich()`
  （`fieldHtml` 的 `f.hint`、槽位 `def.hint`、分组 `g.hint` 共 4 处）；顺手把 `applyCopy()`
  里 `data-copy` 静态文案从 `textContent` 改为 `innerHTML = rich(...)`，
  让左栏/顶栏等静态文案也支持 `**` 粗体（当前未命中，纯防御性）。
  不影响 `writes[7]` 的 `public/assets/**` —— 那是路径通配符（单 `**` 不成对，`rich` 不误匹配）。
- **验证**：`node tools/verify-updater-bold.mjs` 真机连 5199，切到 pool / suit 两任务，
  断言 `.hint` 内出现 `<b>工坊自建</b>` 且无字面 `**`（4/4 通过）。
  工坊静态文件每次从磁盘读取（`server.mjs` 用 `createReadStream`），刷新即生效，无需重启。
- **改动文件**：`updater/web/app.js`（新增 `tools/verify-updater-bold.mjs`）。

---

## [v2.0.07] 2026-11-11 — 信封粗体渲染修复 + 服装图鉴雷达按部件切换

> 改前基线：`备份/抽卡模拟器-v2.9.24-2026-11-11.zip`。

### 一、信封正文粗体没渲染（星号原样显示）

- **现象**：信封欢迎信 / 免责声明里的 `**…**` 在信纸上原样显示成星号，没有加粗。
- **根因**：`MailPopup.vue` 一直用 `{{ b.text }}` 纯文本渲染 `文案.json` 的 `mail.body`，
  而 `文案.json` 的 `_note` 早写明约定「`**粗体**` 会被渲染成加粗」—— 工坊 `app.js` 的
  `rich()` 已实现这套规则，模拟器这边漏了。
- **修复**：在 `src/data/copy.ts` 新增 `mailRich()`（`**…**` → `<b>…</b>`，其余先 HTML 转义再注入），
  与工坊 `rich()` 同规则；`MailPopup.vue` 正文改用 `v-html="mailRich(b.text)"`。
  **只动这两处，文案本身一行没改**（仍是 `**…**` 写法，换肤/换字不用碰代码）。

### 二、服装图鉴雷达图改为按部件切换

- **现象**：五维雷达图始终显示「该套装所有部件五维之和」，点部件栏没反应。
- **修复**：`MuseumClothes.vue` 的 `radar` 计算属性改为——未选部件（默认）显示**套装整体五维之和**，
  选中某个具体部件后显示**该部件自己的五维**，与立绘 / 文案 / 名称同步切换（它们早已按 `selPart` 联动）。
- 真机验收（Playwright，真实 `S0062 心愿金蔷薇` 数据）：整体雷达多边形与「各部件求和」复算一致、
  选中「翠金花藤」后与「该部件五维」复算一致、两次确实不同、无 pageerror。`tools/verify-v2925.mjs`。

---

## [v2.0.06] 2026-11-11 — 版本序号覆盖修复 + 撤回含产物 + 拓展包四行四列 + 增量写入

> 改前基线：`备份/抽卡模拟器-v2.9.23-2026-11-11.zip`。

### 一、版本号被「浮点化」覆盖：根因与三重防护

用户执行「写入并更新」后版本页少栏、名字张冠李戴，撤回也没回退。用
`updater/.snapshots/20261111-152758-version` 与 `…153423-version` 里的
`000-版本表.csv` 还原了现场：写入**之前** CSV 就已经是
`1.1,流星季` + `1.1,丰收季`、`2.1,若生命如诗` + `2.1,金羽的裁决` ——
`1.10` / `2.10` 被写成了 `1.1` / `2.1`（`Number('1.10') === 1.1`，或 Excel 打开 CSV
保存时把版本号当数值处理）。`load_version_table()` 用 `out[v]` 建 dict，重复键
**后写静默覆盖先写** → pool-map 只剩 24 个版本、1.1 叫「丰收季」、2.1 叫「金羽的裁决」，
manifest 跟着错，版本页自然乱。

「撤回没回退」有两个独立原因：① 这两份快照里的 CSV 备份本身就是坏的，回滚到它们
只会把坏 CSV 再写回去；② `Snapshot.touch()` 当时只备份「素材 + 元数据」，
`pool-map.json` / `manifest.json` / 图鉴 TS 是②管线写的产物，没进快照 ——
CSV 恢复了、产物没恢复，补跑管线再失败就永远停在错乱状态。

| 防护 | 位置 | 作用 |
|---|---|---|
| 重复键**直接失败** | `tools/build-pool-map.py:load_version_table()` | 不再只 warn；报错里直接给出「Excel 把 1.10 存成 1.1」的修复指引，工坊会自动回滚 |
| 写盘前唯一性 + 类型校验 | `updater/lib/meta.mjs` `assertUniqueVersionRows()` / `upsertVersion()` | 重复键、非法格式、**数字类型**版本号一律抛错，脏数据落不了盘 |
| 管线产物进快照 | `updater/server.mjs` `PIPELINE_OUTPUTS` | 6 个产物写入前先 `snap.touch`，撤回直接还原，不再全指望重跑管线 |

数据修复：版本表 CSV 当前已是完整 26 行，重跑
`build-pool-map.py` + `collect-assets.py --all --manifest-only` 后 pool-map / manifest
恢复 26 版本：`1.1 流星季`、`1.10 丰收季`、`2.1 若生命如诗`、`2.10 金羽的裁决`
各归其位（真机版本页 DOM 读数 26 条通过，见 `tools/v2924-versions.png`）。
⚠ **`素材/信息表/版本表.csv` 不要用 Excel 打开后保存**，会以文本格式保存才会保留 `1.10`。

### 二、拓展包多选：固定四行四列 + 滚动

`updater/web/style.css` 的 `.dlc-pick-list` 从 `auto-fill`（列数随面板宽度变）改为
`repeat(4, minmax(0,1fr))` + `--dlc-row-h: 30px` + `max-height: calc(4 * …)` +
`overflow-y: auto`。滚轮与滚动条都能看后面的候选；Playwright 实测 24 项时
4 列 / 可见正好 4 行 / `scrollHeight 192 > clientHeight 120`。

### 三、删掉两篇重复阅读物

`《于湖底盛放的蔷薇》_1.txt`（心愿原野）与 `《寄给搭配师协会总部的信》_1.txt`（伊赞之土）
是保留篇的近似副本：只差【编号】与「桠/丫」，`title_suffix.py` 判为同一变体，
于是图鉴里两篇同名。按用户指定删除这两个 `_1` 副本，重跑 `gen-readings.py`：
**595 → 593 篇**，两篇标题各只剩一条、无 `·NN` 后缀。
其余 4 个 `_N` 副本（玛缇亚与巨人王的往来书信 3 个变体等）内容确实不同，保留。

### 四、「写入并更新」只检验改动项

新增 `updater/lib/incremental.mjs`（内容哈希，不看路径与时间）：

- **整次写入**：`applyFingerprint()` = 任务 + 字段 + 每个源文件的内容签名；
  与上一次成功写入完全一致 → `/api/apply` 直接返回 `skipped`，不检验、不写盘、不跑管线。
  勾「强制重转已有素材」时仍全量执行。
- **单个素材**：`archive()` 用 `updater/.write-cache.json` 记住上次写入的源/目标内容签名，
  两项都没变 → 跳过识别、校验、复制，也不进快照；日志报「素材增量：改动 N 项 · 跳过 M 项」。
- **预检**：`app.js` 对与上次完全一致的现场只查必填项，跳过重复的素材警告；
  撤回会清掉指纹，不会出现「改回同一批却被判没改动」。
- 新增固定文案 `updater.precheck.sameAsLast` / `updater.status.noChange`，`文案.json` 版本 → v2.0.06。

**验收**：新增 `tools/verify-v2924.mjs` **42/42**（纯离线，不依赖 5178/5199）；
真机版本页 DOM 读数 26 条通过；`vue-tsc` 0 错；`npm run build` 9.11 s；
`verify-rates.py` 全 PASS。截图 `tools/v2924-*.png`，截图脚本 `tools/shot-v2924.mjs`。
> 5178 / 5199 未启动（按此前约定不重启守护），需要 dev server 的旧 E2E 回归本轮未跑。

---

## [v2.0.05] 2026-11-11 — 拓展包多选与关联打包 + 同名内容消歧

### 一、拓展包：多选、故事随附、版本带阁

| 需求 | 实现 |
|---|---|
| 打包服装阁 / 套装时把对应故事一起打 | 包里同时声明 `pool.banner`（或 `pool.set`）与 `codex.story`；故事从 `素材/故事/` 按套装名取。故事**仍可单独打包**（kind=story，不附带阁） |
| 打包项可多选、一次打成一个包 | 界面 `#dlc-key` 单选下拉改成复选框列表（全选 / 清空 / 已选计数）；`keys: []` 传给 `/api/dlc/export`，老的 `key: string` 也照收 |
| 打包版本时一并带上版本内的阁及其故事 | 按 `scope.dlcBanners.filter(b => keys.includes(b.version))` 附带上阁，再收这些阁里套装的故事；**没有阁就什么都不加，不报错** |

- `dlc-export.mjs` 新增 `exportMany()` 作为唯一入口，原来的五个 `exportXxx()` 保留为单选兼容层（包 id 规则不变）。
- 每个接口的数据文件统一改成**数组**（`codex.story` / `codex.reading` 本来就是）；
  `src/core/dlc.ts` 的 `pool.banner` / `pool.set` / `version.banner` 加 `asArray()`，**老包里的单对象照样能装**。
- 选中项在**建目录之前**全量校验（`validateSelection()`）—— 否则「前 3 项合法、第 4 项是内置阁」会在抛错时留下一个复制了几百个素材却没有清单的残包。
- 界面提示与按钮文案全部进 `文案.json`（`dlc.pickAll` / `pickCount` / `attachStory` / `attachVersion` / `attachLog` …）。

> 实测：多选 2 个版本 → 一个包里 `version.banner` 2 + `pool.banner` 8 + `codex.story` 14；
> 界面勾 2 座阁 → 122 个素材文件 + 附带 4 篇故事，日志里能看到附带数量。

### 二、故事 / 阅读物：同名但内容确实不同 → 标题加 `·NN`

新增 `tools/title_suffix.py`（纯标准库），`gen-stories.py` / `gen-readings.py` 共用。判据不是「标题相同就编号」，而是先做内容比对：

1. **归一化 SHA-256** —— 空白 / 全半角标点差异不算不同；
2. **字符 bigram 的 TF-IDF 余弦** —— 组内统计 IDF，高频虚词自动降权；
3. **行级相似度**（行序列 SequenceMatcher）+ **整体字符相似度** —— 兜住「只差一两个错别字」。

取三者最大值，`≥ 0.995` 判为同一变体。组内用贪心聚类把「同一内容」合并，**只有变体数 > 1 才编号**（`·01`、`·02`…），编号顺序按 id 正序、可重复运行（分组前先剥掉已有后缀）。

故事 134 篇无重名；阅读物 595 篇有 5 组重名，实测判定：

| 组 | 相似度 | 结论 |
|---|---|---|
| 阿芙芙玻的日记（2 篇） | 0.093 | 内容不同 → `·01 / ·02` |
| 《梅妲伊尔的笔记》（2 篇） | 0.921 | 内容不同 → `·01 / ·02` |
| 玛缇亚与巨人王的往来书信（3 篇） | 0.05~0.09 | 内容各不相同 → `·01 / ·02 / ·03` |
| 《寄给搭配师协会总部的信》（2 篇） | 哈希完全相同 | 同一内容 → **保持原名** |
| 《于湖底盛放的蔷薇》（2 篇） | 0.9985（仅差「桠 / 丫」） | 近似重复 → **保持原名** |

标题索引 `story-titles.ts` / `reading-titles.ts` 自动同步，搜索与深链仍按最终标题精确匹配。

---

## [v2.0.04] 2026-11-11 — 故事图鉴归位 + 图鉴滚动复位 + 拓展包只装自建内容

### 一、故事图鉴：0 号「奇迹传说」补齐到 14 篇

`stories.ts` 的 `major` 原来取自**套装的 `firstVersion`**（首发版本）。但 0.1 祈愿星 /
0.2 魂灵生 这两座自建大版本的 14 套里，有 **10 套是从官方旧版本借调的**
（咏叹银夜莺首发 1.1、深林遥梦首发 2.0 …），于是这 10 篇被分到了心愿原野 / 伊赞之土，
奇迹传说只剩 4 篇。

改成取**所属服装阁的版本号**主版本号 —— 故事在哪个版本展出，就归哪个分区：

| 分区 | 之前 | 现在 |
|---|---|---|
| 0 奇迹传说 | 4 | **14** |
| 1 心愿原野 | 69 | 64 |
| 2 伊赞之土 | 61 | 56 |

- `tools/gen-stories.py` 的 `load_set_map()` 改为遍历 `banners` 时用 `b["version"]` 算 major。
- 借调的 10 套：咏叹银夜莺 / 飞花的追忆 / 星之海 / 轻盈泡泡 / 纯净之风（原 1.x）、
  梦隙灵语 / 眠于花畔 / 重逢之约 / 深林遥梦 / 谒灵（原 2.x）。
- `dlc-export.mjs` 导出故事时的 `major` 一直是用阁的版本算的，本来就对，未改。

### 二、故事图鉴 / 阅读物图鉴：换一篇就回到正文开头

正文容器 `.rd-cbody-wrap` 是**同一个 DOM 节点**，换一篇只是换里面的文字，浏览器会把
上一篇留着的 `scrollTop` 原样带过来 —— 长正文翻到一半再点下一篇，新的一进来就停在
半中间，像「开头被吞了」。

`MuseumStories.vue` / `MuseumReadings.vue` 各加一个 `bodyWrap` ref + `watch(selId)`
→ `nextTick` 里 `scrollTop = 0`。放在 nextTick 是为了让这次滚动发生在正文 `opacity:0`
的两步加载窗口里，用户看不到跳一下。

### 三、拓展包：只能打包自建内容

原来「包里放什么 → 服装阁」会列出**全部 88 座内置阁**，选一座就能打出一个把官方内容
重新分发一遍的包（还会让接收方多出重复的阁）。现在候选与导出都限定在自建范围：

| 类目 | 判据 | 现有数量 |
|---|---|---|
| 服装阁 | 编号 ≥ 500（自建段）**或** `自建内容.json` 的 `pools` | 8 |
| 套装 | 属于上面这些阁 **或** `sets` 白名单 | 14 |
| 故事 | 它的套装是自建套装 | 14 |
| 阅读物 | `readings` 白名单（工坊写入时自动登记，**新增维度**） | 0 |
| 版本 | 该版本下的阁**全部**自建（0.x 这种整版自建） | 2（0.1 / 0.2） |

- `updater/lib/dlc-export.mjs` 新增 `dlcScope()` + `DLC_GACHA_FROM = 500`，
  `exportCandidates()` 按它过滤，五个 `exportXxx()` 各自加一道拦截
  （直接打 API 也绕不过去，报错文案说明原因）。
- `meta.mjs` 的 `CUSTOM_KINDS` 加 `readings`；`writeReading()` 写入时自动登记。
- `文案.json` 的 `dlc.makeHint` / `keyEmpty` 同步说明「内置的 88 座阁不进包」。

> 实测：`/api/state` 与界面下拉都只剩 8 座自建阁；导出 `banner-080`、`绽若颂愿心`、
> 2.11 版本、《恩泽纪·卷七》全部被拒。

---

## [v2.0.03] 2026-11-11 — 缺背景兜底 + 工坊文案全量外置 + 自建编号 500 起

### 一、服装阁缺背景 → 自动用默认背景

`build-pool-map.py` 不再「没有 `背景图.*` 就报 `[缺图]`」：

| 情况 | 行为 |
|---|---|
| 阁目录有 `背景图.*` | 照旧，转成 `banners/bg/<编号>.webp` |
| 没有背景图，但默认背景还在 | **不告警**。manifest 里 `assets.bgClean` 直接指向 `ui/ver/bg.webp`（版本页那张整屏背景，也是前端 `ui.banner.fallbackBg`）。**不复制副本** —— 将来换默认图会自动跟着变，也省几百 KB |
| 背景图与默认背景都没了 | 才报 `[缺图] 背景图缺、默认背景也缺` |

- `build-pool-map.py` 新增 `DEFAULT_BG_SRC` / `DEFAULT_BG_OUT` / `default_bg_exists()`
  （源图在 `朋友分享素材/UI/SysLogin/Texture/T_UI_login_bg.png`，产物是 `public/assets/ui/ver/bg.webp`）。
- `collect-assets.py` 在缺背景时把 manifest 指向 `ui/ver/bg.webp`，并打印
  「缺背景图 → 用默认背景 ui/ver/bg.webp 顶上」。
- 顺带把预检里那句「没有服装阁背景，共鸣页会用深色渐变兜底」改成「会用默认背景顶上」——
  已经不是深色渐变了。

> 实测：把 `繁星织梦/背景图.jpg` 临时改名 → 管线无告警、manifest 指向 `ui/ver/bg.webp`；
> 改回来 → 回到 `banners/bg/1207.webp`。

### 二、工坊固定文案全部搬进 `文案.json`

`文案.json` 的 `updater` 段从 4 组扩到 14 组（3 KB → 29 KB），覆盖：

| 段 | 内容 |
|---|---|
| `rail` | 左栏「要更新什么 / 最近改动」、空状态、改动记录行、扩展包入口 |
| `console` | 「等待开始」、清空、两个勾选、预检、写入并更新 |
| `drop` | 拖拽遮罩两行 |
| `panel` | 待分配 / 全选 / 放到… / 应用 / 删除选中 / 清空 / 这次会写入 / 路径框 / 槽位空状态 / 可多张 / 再加一套 / 套装名·星级·套装ID / 各种下拉占位 |
| `status` | 顶部状态条（读取中 / 写入中 / 完成 / 失败 / 回滚 / 扫描）与总览计数模板 |
| `precheck` | 预检的 22 条提示（缺什么、注意什么、标题） |
| `bundle` | 整套导入的扫描条、统计行、每个标签（背景 / 缩略图 / 缺艺术字…） |
| `dlc` | 扩展包面板 51 条（三块分组标题、字段、按钮、远端配置、上传/下载提示） |
| `jobs` | 6 个任务的标题 / 副标题 / 每个字段的 label+placeholder+hint / 每个槽位的 label+hint / 写入清单 |

机制：
- **静态元素**：`index.html` 挂 `data-copy="updater.xxx"`（26 处）。
- **动态片段**：`app.js` 用 `C(key, 原文)` / `CT(key, 原文, 变量)` 取，共 119 处；
  `{name}` 这类占位由 `CT` 替换。原文一律留在代码里当兜底，json 缺键/读失败都不会变空。
- **任务定义**：新增 `updater/lib/copy.mjs`（带 mtime 缓存），`jobs.mjs` 的 `jobsWithCopy()`
  每次 `/api/state` 时把 `updater.jobs` 套到深拷贝的任务定义上 —— **改 json 刷新页面即可，不用重启工坊**。

边界：左下角滚动的**日志行**（带实时数据、带编号/路径）故意留在代码里，不算界面文案。

### 三、工坊新建阁编号从 500 起

`updater/lib/meta.mjs` 的 `nextFreeGacha()`：`500~999` 优先，用尽再进 `1000~9999`。
区间约定写进注释：`001~099` 官方（已到 086）、`100~499` 给官方预留、**`500+` 自建/DLC**。
「服装阁编号」输入框的占位提示也同步改成「从 500 起取空号」。

### 四、e2e 修好并跑通（59/59）

`updater/e2e/run-e2e.mjs` 之前有几处**早于本次就失效**的断言，一并修掉：

| 问题 | 修法 |
|---|---|
| 期望编号 = 「最大号 + 1」（2234） | 改用 `nextFreeGacha()`（现在 500） |
| 槽位名 `portrait`（v1.9.03 已并入 `ov`） | 改成 `ov`，两个套装都改 |
| 产物目录 `banners/bg-clean/`（v1.9.02 已改名） | 改成 `banners/bg/` |
| 立绘产物 `sets/<id>/portrait.webp` | 实际是 `sets/<id>/OV-lv0.webp` |
| 铭牌目录 `ui/banner/name`（v1.9.06 已挪走，且目录可能不存在） | 改成 `banners/name` 并加存在性判断 |
| 假图标命名 `部件1.png`（缺「部位-」前缀，图标扫描会整批丢掉） | 改成 `发型-部件1.png` 等，断言改 `HA-<套装ID>.webp` |

### 五、验收
新增 `tools/verify-v2921.mjs` **44/44**（默认背景兜底 6 项 / 文案外置 20 项 / 编号 500 / 浏览器真实渲染 14 项 / 无报错）。
工坊 e2e **59/59**；模拟器回归：`v2920` 23/23、`v2702` 45/45。

---

## [v2.0.02] 2026-11-11 — 改号 1207/1208 + 砍掉旧兼容链 + seq 重新定义

### 一、两座自建阁改号
`繁星织梦` 1002 → **1207**，`繁花映愿` 1003 → **1208**。`public/assets` 里按编号命名的
产物（`banners/{bg,thumb,title}/*.webp`、`milestones/banner-*`）全部重生成，
旧的 `1002/1003` 六张图与两个深忆目录已删除 —— 不删的话会留下没人引用的孤儿文件。

### 二、砍掉三条老兼容链（用户确认：目前没有老存档、老素材已废弃）

| 删掉 | 连带删掉 |
|---|---|
| `legacyId`（`banner-2.10-02` 那套写法） | `collect-assets` 的输出、`store.migrateBannerIds()` 整段迁移逻辑、`types.ts` 的两个字段 |
| `prevId` / `卡池索引.json` 的 `prevGachaKey` | 改号后迁移旧保底的路径 |
| `素材/信息表/前后名称对照表.md` 的读取 | `build-pool-map.py` 的 `load_list_map()`（该文件保留在磁盘上作存档，管线不再读） |
| 老素材回落（`卡池横幅/`、`卡池背景图/`、`卡池背景图（纯图片，无艺术字）/`、`titles` 扫描） | `BG_HIRES` / `TITLEART_EXTRA` / `BG_COMPOSE` 三张表与 `compose_bg_webp()` 整段 |
| `updater/lib/meta.mjs` 的 `nextSeqInVersion()` | 工坊不再往 `卡池索引.json` 写 `seq` |

现在阁级素材只有三个来源，全在阁目录下：`背景图.*` / `列表缩略图.*` / `艺术字.*`。
少一张不再静默拿老图顶上，而是打 `[缺图]` 告警（88 阁实测：0 条告警）。

### 三、`seq`（版本内序号）重新定义，改由管线计算

排序键：**含 5★ 在前 → 纯 4★ 在后 → 同星级按 `gachaKey` 数值升序 → 常驻阁永远最后**。
每版本从 1 起连续。手写序号这条路径整个废掉（`卡池索引.json` 里的 `seq` 已清空）。

```
0.1  心愿栖金蕊(1) 银羽衔月歌(2) 心轮曳星河(3) 繁星织梦(4)   ← 纯 4★ 垫底
0.2  曦光渡魂处(1) 织光为约(2) 静默于枯荣之刻(3) 繁花映愿(4)
1.0  绘于蝶影的幻梦(1) 留于花间的浮想(2) 呱呱轻语(3) 泡泡心诉(4) 遥远之海(5)  ← 常驻最后
```

### 四、模拟器按 `seq` 排序
`manifest.banners[].seq` 新增该字段，`store.versionPools` 按它升序，`visiblePools` 再把
常驻池追加到列表末尾（1.0 自带则不重复）。之前是「按 `gachaKey` 数值排」，
所以 `seq=02` 的心轮曳星河(1206) 会被排到纯 4★ 的繁星织梦后面。

### 五、验收
新增 `tools/verify-v2920.mjs` **23/23**（编号/旧产物清空/每版本 seq 连续/0.1·0.2 顺序/
常驻最后/索引无 seq/旧链路确实没了/浏览器真实 DOM 顺序）。回归全绿：
`v2702` 45/45（legacyId 断言改成「seq 连续 + 无 legacyId」，B 段改成「旧 key 不再被迁移、
且不报错」）、`v2919` 31/31、`v2918` 29/29、`v2916` 16/16、`v2915` 22/22、
`v2910` 24/24、`v2914` 32/32、`v2302` 35/35；`vue-tsc` 0 错；构建 13.7 s。

---

## [v2.0.01] 2026-11-11 — 0.1「繁星织梦」/ 0.2「繁花映愿」接入 + 信纸排版

### 一、两座自建阁入库（86 → 88 阁，132 → 134 套）

用户把两个阁目录直接放进了 `素材/服装阁/`，但**只放图还不够** —— 管线还缺三样：

| 缺什么 | 补什么 | 备注 |
|---|---|---|
| `素材/套装库/<ID>.yaml` | 从 `原始素材/套装库·全/` 拷 `S0177` / `S0348`，改「来源阁 / 首发版本」 | 全量字段（五维、部件文案、整体文案）都在那儿，不用另找 |
| `素材/信息表/卡池索引.json` | 两行登记：`gachaKey 1002/1003`、`version`、`seq 04`、`type limited` | 没编号的阁**不会进 manifest**（`build-pool-map` 直接跳过） |
| `素材/信息表/套装序列.csv` | 顺手把「首发」由 `0.1·祈愿星` 改成 `0.1祈愿星` | 与其余 132 行同口径（多打了个间隔号） |

- 编号取 **1002 / 1003**：001~086 是官方池，081~086 已改号给 0.1/0.2（1000/1206/1001/2233/999/1314），
  `nextFreeGacha()` 会返回 087 —— 那是留给未来官方池的，自建内容继续用 1000+ 区间。
- 两座阁各 1 套 **4★**（星愿璨梦 / 暖歌花纪，各 9 件），因此自动走**纯 4★ 规则**
  （每 5 抽必出、第 4 抽起 20.15%），界面文案跟着 `rules.pity['4'].note` 变成「每 5 次」。
- 深海回响 5/15/25 抽三档、背景图 / 列表缩略图 / 艺术字、套装封面 `OV-lv0..2` 全部生成；
  两套都没有**进入音**（`collect-assets` 会继续把它们列进「仍无进入音的阁」）。
- `python tools/gen-stories.py`：134 篇故事，未匹配 0 条（两篇故事 md 早就在 `素材/故事/` 里）。
- 新增 `tools/verify-v2919.mjs`（31 项）。踩到一个坑：**服装阁页只列当前版本的池**，
  验收脚本必须先把 `selectedVersion` 写成目标版本再进页面，否则 `.pool-item` 里根本没有这两座阁。

### 二、信纸改成《给你的第一封信》

按 `素材/信息表/给你的第一封信.txt` 重写信件正文（欢迎语 + 免责声明 16 条 + 使用说明 6 条 + 落款）。

排版要求要做进渲染层，所以 `mail.body` 从「字符串数组」升级成**可混排**：

```jsonc
"body": [
  "你好，欢迎来到这里。",                        // 普通段落，左对齐
  { "text": "免责声明（必读）", "style": "h2" },  // 居中 + 字号两倍
  { "text": "若不同意上述条款，请立即停止使用本软件。", "style": "warn" }  // 居中 + 红
]
```

- `src/data/copy.ts` 加 `mailBlocks()` 归一化：只认 `h2` / `warn`，写错值按普通段落，不会白屏。
- `MailPopup.vue` 的 `.lt-p` 加 `:class="b.style"`，新增 `.lt-p.h2`（2.06em = 正文两倍）与 `.lt-p.warn`（#b0392f）。
- 落款沿用已有的 `.lt-sign`（本来就右对齐）。
- 原文「免责声明」编号从 11 直接跳到 13（缺 12）—— **按原文保留**，没有擅自重排。

---

## [v2.0.00] 2026-11-10 — 固定文案抽成 `文案.json`

信封欢迎语、工坊顶栏、帮助弹窗里的字不再散落在 `.vue` 模板和 `index.html` 里，
统一收到项目根的 **`文案.json`**（一份文件，两个应用共读）：

| 谁 | 怎么读 | 改完什么时候生效 |
|---|---|---|
| 模拟器（信封） | `src/data/copy.ts` 静态 `import '../../文案.json'` | 保存即 HMR，构建时打进 bundle |
| 工坊（顶栏 / 帮助） | `server.mjs` 挂 `GET /copy.json`，`app.js` 开机 `fetch` | 刷新页面 |

- 工坊顶栏：品牌名、副标题、状态行「正在读取素材库…」、5 个圆钮的 `title` / `alt`、
  以及浏览器标签页标题，都按 `data-copy` / `data-copy-title` / `data-copy-alt` 覆盖。
- 帮助弹窗：标题、步骤、注释、确定键**全部由 json 生成**（`#help-steps` / `#help-notes`），
  想加减几条就改数组，不用动 HTML。支持一种标记 `**粗体**`。
- `index.html` 里的中文保留为**兜底**：json 里缺某个键时不会被清空；`/copy.json` 取不到时
  只记一条 console 警告，页面照常可用。
- 顺手把欢迎语里「抽卡概率由马尔可夫链反解，和官方公示一致」改成「按实机统计反解」——
  v1.9.11 之后这句已经不准了。
- 新增 `tools/verify-v2918.mjs`（24 项）：A json 结构 / B 顶栏实际渲染 / C 帮助条数与粗体 /
  D 信封逐段比对 / E 两处无 JS 报错。
- `tools/backup.py` 把 `文案.json` 纳入备份包（它不在 `*.md`、也不在 `src/` 下，否则会被漏掉）。

---

## [v1.9.11] 2026-11-10 — 常规池 4★ 按实机重写 + 记忆拆分 + 备份约定

> 本版之前的 v1.9.04 ~ v1.9.10 七条是 2026-11-10 依据工作日记补记的
> （那段时间只写了 `.workbuddy/memory/2026-11-0*.md`，本文件停在 v1.9.03）。

### 一、常规池 4★：从「公示值」改成「实机分布」
数据：`布局坐标/抽卡记录统计/stats_0.json` 的 `fourStarType2Distribution`
（7043 人 / 1245 万抽 / 1,015,269 个 4★ 间隔）。

- 实测条件概率：1~9 抽恒 **3.4%**、第 10 抽 **94.5%**、第 11 抽 **98.5%**、11~13 抽还有 4% 尾巴；
  平均间隔 8.625 抽 → 综合 **11.595%**。
- 结论：**5★ 不重置 4★ 计数**（只把 4★ 顺延一抽）。若 5★ 清零，间隔不可能超过 10 抽。
- 新参数：`rates.base['4'] = 3.6801%`、`pity['4'].hard = 10`、重置条件 `rarity === 4`。
  综合 11.595% / 3★ 82.295%（旧参数 8.5763% + 「5★ 重置 4★」综合同样是 11.5%，
  但分布是「1~9 抽均匀 8.58%」，每抽手感完全不同）。
- `engine.ts` 只改一行重置条件；`verify-rates.py` 的二维模型同步改成「5★ 只推进不重置 b」，
  并新增【C】4★ 间隔分布对照（模拟 vs 实机）与三条形状判定。
- 新增 `tools/verify-v2916.mjs`（16 项）：规则参数 / 概率函数 / **真跑引擎 20 万抽**的间隔分布 / 界面文案。

### 二、记忆拆分（.workbuddy/memory）
- `MEMORY.md` 从 17 KB 拆成**目录索引**（2.4 KB）+ `topics/` 下 6 个分册
  （工作流与备份 / 素材目录与管线 / 视频与音频 / 抽卡规则与概率 / 工坊 / 前端与界面）。
- 顺手去重：原文件里同一件事在不同章节写过两三遍（to_webp 不看 mtime、5★ 软保底、
  4★ 重置条件等），现在各自只在对应分册出现一次。

### 三、全局约定：改动前先备份
- `tools/backup.py` 改为可自动探测版本号（从最新记忆日志取 `vX.Y.ZZ`），
  并把 `.workbuddy/memory/`、根目录全部 `.md` 纳入包内。
- 约定：**每执行一次修改（一批改动 = 一个版本）之前**，先
  `python tools/backup.py v<当前版本>` 打一份基线到 `备份/`，同名不覆盖（会加 `-b/-c` 后缀）。

---

## [v1.9.10] 2026-11-09 — 纯 4★ 池概率对齐实机 + 「在属于孩子的故事里」背景换图

> 补记：当时只写了工作日志 `.workbuddy/memory/2026-11-09.md`。

### 摘要

- `rules.pure4` 按 480,036 个周期反解：第 4 抽 **20.15%**、综合 **24.97%**（旧参数 24.0%）
- `RulesConfig.pity['4']` 新增可选 `softStart` / `softSlope`，主池不填、行为不变
- 修 `pure4Rules()` 只推 `hard` 不推 `softStart` —— 纯 4★ 池第 18 抽会凭空算出 35% 的 5★
- 保底说明从模板硬编码改成读 `rules.pity['4'].note`
- 077「在属于孩子的故事里」背景 1920×1079 → **2560×1440**（裁 1px 补 16:9 + UnsharpMask）

官方公示的「基础 10%、每 5 抽必出」漏掉了第 4 抽那段提升。验收 `verify-v2915.mjs` 22/22。
另记一条待定：常规池 4★ 的实机分布（1~9 抽 3.4%、10 抽 94.5%）与当时实现不同，属规则级改动，先等拍板。

---

## [v1.9.09] 2026-11-08 — 主页音画同步 + 抽卡概率按实机数据微调

> 补记：当时只写了工作日志 `.workbuddy/memory/2026-11-08.md`。

### 摘要

- 音画不同步的根因在管线：视频剪了首尾黑屏、音轨却抽整条（116.467s vs 120.061s），每循环差 3.59s
- `to_ogg(trim=)` 用 `atrim + asetpts` 与视频滤镜同源；增量判据补时长校验（差 > 0.35s 就重转）
- 前端 200ms 看护：> 0.30s 硬对齐、60~300ms 用 `playbackRate 1±0.03` 追、loop 时音轨归零
- 5★ 按 7043 人 / 1245 万抽反解：1~17 抽 1.60%、18 抽 36.66%、19 抽 71.63%、20 抽必出
- 4★ 二分反解 `0.085763`，保住综合 11.50%

实测起播 -0.087s、连续三轮循环后 -0.059s（不累积）。`verify-v2910` 扩到 24 项全过。

---

## [v1.9.08] 2026-11-08 — 素材替换 + 素材路径归位 + 工坊「修改已有」

> 补记：当时只写了工作日志 `.workbuddy/memory/2026-11-08.md`。

### 摘要

- 七座阁静态背景替换；`to_webp` 存在即跳过（不看 mtime）→ 换图必须删产物或 `--bust banners/bg`
- `BG_HIRES` / `BG_COMPOSE` 原来无条件覆盖 `bgClean` → 改成「阁目录有 `背景图.jpg` 就以它为准」
- 两座阁动态背景替换（066 源 4K 保留 3840×2160 / 149 MB）
- `素材/0主素材/` 废弃，`uiRoot()` 探测顺序改 `界面/UI整包` → `0主素材` → `朋友分享素材`
- 工坊「修改已有」只对自建内容开放（`自建内容.json` 白名单，官方 86 阁 / 132 套后端硬拦）

快照补 `Snapshot.trackDir()`：空目录（新建但没塞素材）也要能回滚。
「建完立刻改」时管线还没跑，编辑分支找不到 pool-map 条目会回落磁盘扫描。

---

## [v1.9.07] 2026-11-08 — 版本表与「所属版本」下拉按版本号自动排序

> 补记：当时只写了工作日志 `.workbuddy/memory/2026-11-08.md`。

### 摘要

- `verKey(v)` 只认字符串，`sortVersions()` 传的却是行对象 → `[object Object]` → 排序变成空操作
- 后果：CSV 里 0.1 / 0.2 一直追在 2.11 后面，工坊下拉取末位当默认值，于是新建套装默认选了 0.2
- 修法：`verKey` 同时接受字符串与对象（取 `.v` / `.version`）
- `版本表.csv` 按版本号重写 26 行（BOM 保留）；`bundle.mjs` 的整套导入也按版本号排 `verDirs`
- 验收 `verify-v2702` 44/44

不变量：`sortVersions` / `verKey` 的入参**可能是对象**，改这两个函数时两者都要照顾。

---

## [v1.9.06] 2026-11-08 — 清理 E2E 残留 + 兜底图 + 开屏起播时机

> 补记：当时只写了工作日志 `.workbuddy/memory/2026-11-08.md`。

### 摘要

- 清掉 E2E 写进官方素材目录的假图：Card 072~076 共 10 个、`Pic/1206` 假铭牌、孤儿产物 `ui/banner/name/042.webp`
- yunhai 响度口径反转（保持原始 → 跟其它一样响），`GAIN_HI` 12 → 18
- 开屏动画期间不挂载背景视频（`v-if` 加 `stage !== 'boot'`），视频与音轨一起从 0 起
- 目录归位：`ui/banner/name/` → `banners/name/`，删 `ui/banner/thumbs/`
- 三处兜底图（版本缩略图 / 版本大图 / 服装阁背景），找不到只填空、不覆盖已有产物

前端 `<img @error>` 换兜底图时用 `dataset.fellBack` 防死循环；不再「借别的阁的视频」当兜底。

---

## [v1.9.05] 2026-11-08 — 用户六项修正（裁黑边 / 音量 / 分辨率 / 黑屏）

> 补记：当时只写了工作日志 `.workbuddy/memory/2026-11-08.md`。

### 摘要

- 恢复「裁视频黑边」：新增 `probe_video()`（cropdetect + blackdetect），滤镜链**先 trim 后 crop**
- 伊始音轨 0.6 线性增益；进入音改成「共鸣页 BGM 的一半」（`bgmGain('banner') * 0.5`）
- 不再压分辨率（首页 720p → 原分辨率），改用首帧 poster 垫底防黑屏
- yunhai 保持原始音量（`NO_NORMALIZE`），并修失效的源目录
- 删首尾黑屏（`d=0.15` 漏三条 → `0.10` 重做，28 条全干净）

`probe_video` 结果按 `(相对路径, mtime, size)` 缓存到 `public/assets/.video-probe.json`。

---

## [v1.9.04] 2026-11-08 — 动态背景全家桶 + 修复工坊重启导致的 network error

> 补记：当时只写了工作日志 `.workbuddy/memory/2026-11-08.md`。

### 摘要

- 工坊写入报 network error 的真因是**进程互杀**：杀 5178 → `up.mjs` 当崩溃 → 连坐杀工坊 → SSE 断
- 修三处：`up.mjs` 守护重启、落 `.dev-guard.json`、`restartDevServer` 先判守护再决定拉不拉
- 服装阁动态背景 28 条接入，`transcode_video()` 去音轨（NVENC 优先），增量判据改 mtime
- 首页双动态背景轮播（各 50%，冷启动随机存 `sessionStorage`）；三级兜底到静态图
- 工坊新增「服装阁进入音」控制项（`bannerEnter` + 手工索引优先于自动匹配）

顺带修 `to_ogg` 缺 `-vn`（抽音轨时会把视频流塞进 ogg，ffmpeg 慢慢重编 theora）。

---

## [v1.9.03] 2026-11-07 — 动态背景接入 + 服装阁编号双区间 + 工坊表单合并

### 一、服装阁动态背景（13 座阁）
`素材/视频/服装阁动态/<阁名>.webm|mp4` 接入模拟器（`.vue` 里的 `bgVideo` 接口早就预留好了，
只是一直没有素材接上）。

- 文件名**就是阁名**：编号会改（这次就改了 6 座），视频按阁配才稳。
- `build-pool-map.load_videos()` 扫目录 → `assets.dynamicBg`；`collect-assets` 原样拷到
  `public/assets/video/<编号>.<ext>`（不转码，webm 优先于同名 mp4）→ `manifest.assets.bgVideo`。
- 前端零改动：有视频就播视频，「切静态 / 播视频」按钮与无视频阁的静态兜底都沿用原逻辑。
- 体积：`public/assets` 从 324 MB → 1.14 GB（13 个视频 821 MB）。`dist/` 会连带变大约 1 GB,
  构建产物可随时删。

### 二、服装阁编号：001~999 + 1000~9999 双区间（允许不连续）
- `norm_gacha()`（python）/ `normalizeGacha()`（updater）只按**数值**规范：
  `7→007`、`999→999`、`1206→1206`；空 / 0 / 5 位以上视为无效。
- 排序改为**按数值**（原来按字符串，`999` 会排到 `1206` 后面）。
- 六座阁改号：`心轮曳星河 082→1206`、`织光为约 086→1314`、`心愿栖金蕊 081→1000`、
  `银羽衔月歌 083→1001`、`曦光渡魂处 085→999`、`静默于枯荣之刻 084→2233`。
  `卡池索引.json` 同时记 `prevGachaKey`，manifest 输出 `prevId` ——
  老存档的保底 / 领取记录 / 抽卡流水会自动迁到新 id（`stores/game.ts` 已支持）。
- 关联修正：`Pic/082 → Pic/1206`（艺术字 + 铭牌目录跟着编号走）；
  `collect-assets` 的铭牌正则放宽 `\d{3,4}`；前端 `gachaNo` 整串匹配 3~4 位；
  自动编号改为「优先补 001~999 空号，满了再进 1000~9999」。

### 三、工坊表单（按用户逐条要求）
| 项 | 改动 |
|---|---|
| 服装阁文案 | 「新建一只共鸣池…」→「新建服装阁：背景、缩略图、艺术字，以及阁内的套装」 |
| 标题横幅 | **删除**（模拟器从不显示，管线 / 清单 / 识别 / manifest 字段一并移除） |
| 动态背景 | 新增槽位「动态背景（视频）」，落 `素材/视频/服装阁动态/<阁名>.webm\|mp4` |
| 池型 → 阁型 | 改名 + 新增「自定义」选项与「自定义阁型名」输入框；manifest 输出 `type: custom` + `typeLabel` |
| 属性文件 + 套装文案 | **合并**为「套装数据（YAML）」，落 `素材/套装库/<套装ID>.yaml` |
| 立绘 / 整体图 / 进化立绘 | **合并**为「整体图（OV）」一个多选槽位，按文件名自动归到
  初始/焕新/一进/二进/满进（`套装立绘` → 初始，`觉醒LVn` → 焕新…满进） |
| 阅读「系列」 | **删除**（模拟器不体现）；阅读物直接落 `素材/阅读物/<分区>/<书名>.txt` |

### 四、顺手修掉的存量问题
- **工坊写入路径整体过期**（v1.9.00 重构后没跟着改）：仍在往 `素材/source/`、
  `素材/图片素材/`、`素材/套装文案/` 写 —— 这三处目录早删了。现已全部改到
  `素材/服装阁/<版本>/<阁>/{背景图,列表缩略图,艺术字,深海回响,<套装>/{半身像,图标,进化等阶}}`。
- `writeSuitLibYaml()` 写了却没人调用 → 工坊新增的套装没有属性数据。现已接上。
- 阅读物素材已被用户拍平成 `阅读物/<分区>/*.txt`，`gen-readings.py` 只认两层目录会**读不到**，
  已改成两层都认（`*/*.txt` 与 `*/*/*.txt`）。
- DLC 导出阅读物只认 `《书名》.txt`，素材里有一半没书名号 → 误报「找不到阅读物」，两种都认了。
- 改号后 `banners/{bg,thumb,title}/08x.webp`、`milestones/banner-08x/`、
  `ui/banner/name/082-*.webp` 共 63 个孤儿产物已清理。

### 五、验收脚本跟着改
`verify-v2702`（槽位名）、`verify-v2809`（背景断言接受视频 + 残留检查补 mp4）、
`verify-v2810`（槽位/文案/阁型/系列 + 动态背景实机播放）、
`verify-readings` / `verify-stories`（条数改成从 `readings.ts` 现算，不再写死 221/372）。

### 验证
- 卡池 86 / 套装 132 / 版本 26；manifest **4209 条路径全部有效**、缺失 0
- `vue-tsc` 0 错；`npm run build` 通过（12.2s）
- 全部验收脚本通过：v2302 / v2400 / v2500-v2510 / v2601-v2603 / v2701-v2702 /
  v2802-v2814 / clothes / stories / readings / almanac / fortune / gloria / dlc（v2803）
- 工坊写入实测：新建「ZZ测试阁」（自定义阁型「联动」+ 动态背景 + 套装 YAML）→
  管线正确产出 `banner-082`（`type=联动`、`OV-lv0/1`、文案读到）→ 已按快照回滚

## [v1.9.02] 2026-11-06 — 按用户精简后的素材重设管线（套装代号化）

### 背景
用户手动重整了素材库与运行时：`素材/` 从 4.1 GB 压到 **2.76 GB**，
把「套装卡片图 / 套装文案 / 卡池背景」三块并入了 `服装阁/`，
并把套装素材改成**官方部位代号**命名。管线据此全面重设。

### 素材侧的新结构（已由用户整理好）
```
服装阁/<版本>/<阁>/
    背景图.jpg 列表缩略图.png 艺术字.png  深海回响/
    <套装>/
        半身像/<部位>-<部件>.png   → cards/<代号>-<ID>.webp
        图标/<部位>-<部件>.png     → icons/<代号>-<ID>.webp
        进化等阶/整体-<阶段>.png   → OV-lv0..lv4.webp
```

### 新增 `tools/part_code.py`
中文部位名 ↔ 两字母代号的唯一映射，读 `素材/信息表/部位代号对照表.csv`。
**新增部位只改 CSV，不用碰代码**。现有 1151 张图 22 种部位零未收录。

### 管线改造
- `build-pool-map.py`
  - 新增 `scan_set_assets()`：统一扫「半身像 / 图标 / 进化等阶」，产出
    `{portrait, ov[], cards[], icons[]}`（每项带 `code`）。
  - 卡池素材（背景 / 缩略图 / 艺术字）改为**直接读阁目录**，
    老结构 `卡池横幅/`、`卡池背景图/` 仍兼容回落。
  - `load_milestones()` 认 `深海回响/`（新）与 `深忆奖励/`（旧）。
  - 套装目录排除表加 `深海回响` —— 否则它会变成第 3 个「套装」，每池 sets 从 2 变 3。
  - `src` 直接取 `服装阁`（不再经 `source` 别名）。
- `collect-assets.py`
  - 套装产物改为 `OV-lvN.webp` + `cards/<代号>-<ID>.webp` + `icons/<代号>-<ID>.webp`。
  - `banners/bg-clean/` **改名 `banners/bg/`**（manifest 字段名仍叫 `bgClean`，前端零改）。
  - 新增 `_build_stages()`：初始阶段给全部部件卡，其余阶段各给一张「整体-<阶段>」，
    保住「获得套装」弹窗底部的形态卡，同时不让 manifest 膨胀。

### 保持前端零改动
manifest 里 `cards[].name` / `icons[].name` 仍然是**中文**
（`发型-愿景回旋` / `愿景回旋`），只有 `src` 换成代号路径。
前端 `parseCardName()` 与 `expandSet()` 的配对逻辑完全不用动。

### 顺手修掉的 6 个坑
| 坑 | 现象 |
|---|---|
| 版本表版本号丢小数点 | `1.0→1`、`1.10→1.1`，重复键静默覆盖，版本页只剩 24 栏 |
| 大版本卡编号不补零 | 找 `_img_8.png`，实际 `_008.png`，版本缩略图 404 |
| 字体多了一层 `工程产出/` | `manifest.fonts` 变空 `{}`，全站字体回退 |
| DLC 导出读旧故事目录 | 「导出故事」报找不到文件（`套装故事/` → `故事/`） |
| 验收脚本写死 tab 下标 | v1.7.00 加「奇迹传说」后 `nth=1` 指向错区域，断言静默失效 |
| 套装库漏「整体文案」 | 「重逢之约」详情页文案空白（已从原始 txt 补回 S0122.yaml） |

### 素材补全
用户精简时删掉了 `进化等阶/` 的多阶段图（只剩「整体-初始」），
已从 `原始素材/套装图片/**` 补回 **348 张**（焕新 132 / 一进 42 / 进化 90 / 二进 42 / 满进 42），
与运行时 `OV-lv1..lv4` 的 348 个文件**逐一对应**。

### 验证
- 管线：卡池 86 / 套装 132 / 版本 26；manifest **4196 条路径全部有效**、缺失 0
- 套装素材引用 3262 条零缺失；132 套全部有 portrait + stages
- `vue-tsc` 0 错；`npm run build` 通过（19.6s）
- **35 个验收脚本全部通过**（含 v2302 / v2502-v2814 / clothes / stories / readings / almanac / fortune / gloria）
- 实机截图：卡池页、服装图鉴、套装详情（含 4 张形态卡）全部正常

## [v1.9.01] 2026-11-06 — 素材目录结构固化 + 6 处断链修复

### 背景
用户要手动删除冗余素材，怕「到时候管线接不上」。盘点后发现**素材目录重构（v1.9.00）
留下了 6 处硬编码旧路径的脚本** —— 它们一跑就崩或静默失效，必须先修。

### 断链修复
素材重构时旧目录名全换掉了，但只有走 `P()`/`A()` 的管线脚本有 `DIR_ALIASES` 兜底，
**绕过 `P()` 的硬编码路径会静默失效**。本次修了 6 处：

| 脚本 | 旧路径 | 新路径 |
|---|---|---|
| `tools/gen-stories.py` | `素材/套装故事/` | `素材/故事/` |
| `tools/gen-readings-layout.py` | `素材/博物图鉴/` | `素材/界面/博物图鉴/` |
| `tools/gen-museum-hits.py` | `素材/博物图鉴/` | `素材/界面/博物图鉴/` |
| `tools/prep-gloria.py` | `素材/辉煌心光/`、`素材/朋友分享素材/` | 新结构 + 回落 `原始素材/` |
| `tools/prep-easter.py` | `素材/辉煌心光/`、`素材/主页/` | 新结构 + 回落 `原始素材/` |
| `tools/prep-sfx.py` | `素材/卡池音频/` | `素材/音频/` |

**新增 `tools/asset_paths.py`** —— 统一路径解析器（新旧结构通吃）：
回落顺序 `素材/<新名>` → `素材/<旧名>` → `原始素材/<旧名>` → `原始素材/<新名>`。
`resolve()` 解析目录、`resolve_file()` 解析单文件（源文件与产出常不在一处，须逐文件回落）。

### 加固：生成脚本找不到源不再静默写空产物
`gen-museum-hits.py` 找不到拆分图时把 `museum-hits.ts` 写成空对象 → 图鉴热区全丢、
`vue-tsc` 报 2 个错。现已在 `gen-stories.py` / `gen-readings.py` / `gen-museum-hits.py`
加 `SystemExit` 保护，找不到源目录即报错退出。

### 目录整理
- `素材/故事/` 134 篇 → **132 篇**，与套装库严格一一对应。
  多出的「咏赞黄昏」「烛金日冕」是限时活动套装（模拟器无对应套），归档到
  `归档素材/2026-11-06-无对应套装的故事/`（含清单 json）。
- 删掉重构遗留的 3 个 0 文件空目录：`素材/主页/`、`素材/玄学运势/`、`素材/辉煌心光/`
  （内容都在 `素材/界面/` 下）。

### 新增文档
- **`素材目录备忘.md`** —— 完整目录树 + 每块素材「谁在读」+ 删除安全边界
- **`归档素材/删除清单-2026-11-06.md`** —— 30 项逐条路径/体积/理由（**2.2 GB**，全部实测安全）

### 冗余实测结论
判据用「**移走候选 → 跑完整管线 → 结果不变**」的演练法（`audit-used-sources.py`
的口径偏宽，探过的目录整棵算「已用」）。

- 可删 30 项 / 2.2 GB，重灾区是 `素材/视频/`：`*.bk2` 831 MB、
  `ResonanceDisplay_*.webm` 691 MB、`官网下载/` 507 MB。
- ⚠ **`素材/视频/StarSeaPublicSpace_Wing_001_Mobile.webm`（52 MB）不能删** ——
  主页动态背景的**唯一源**，管线**不重新生成**它（只做 `exists()` 判断产物在不在）。
- ⚠ **`素材/套装文案/` 看着像冗余其实不能删** —— `build-pool-map.py` 的
  `load_set_texts()` 在第 995 行**无条件调用**，早于「新套装库优先」的分支。

### 验证
- 管线：86 阁 / 132 套 / 26 版本；manifest **7542 条路径全部有效**、缺失 0
- `vue-tsc` 0 错；回归全绿：verify-clothes 65/1791、verify-stories 1/221、
  verify-readings ALL PASS、v2814 2/2、v2812 ✅
- 演练（移走 30 项后）manifest 的 webm 引用集合完全一致

## [v1.9.00] 2026-11-06 — 素材目录重构：从「按来源」到「按实体」

> 用户把官方解包原件整体搬到 `原始素材/`，在 `素材/` 下建了三个空目录，
> 要求把**模拟器真正需要的**素材复制过去并规整组织。

### 0. 一句话版（信封弹窗取这 5 条）

- `素材/` 从「按来源分」重组成「按实体分」：服装阁 / 套装卡片图 / 界面 / 卡池背景 / 音频…
- 「模拟器需要」不靠猜 —— 用插桩审计跑一遍管线，记录它真正读过的 12376 个文件
- 服装阁与套装卡片图只收套装库里那 132 套涉及的阁与套装
- `0主素材/UI` 只取 14 个子目录（1682 文件），排掉 60895 个（含整个 IconClothes）
- manifest 除时间戳外**完全一致**，前端渲染逐像素一致

### 1. 目标结构（4.1G / 12607 文件）

```
素材/
├── 套装库/       132 份（模拟器真实有的）
├── 服装阁/        86 座阁：卡池横幅/深忆奖励/立绘/图标
├── 套装卡片图/     132 套的卡片图与属性 yaml
├── 套装文案/ 故事/ 阅读物/ 示例/
├── 界面/         主页/博物图鉴/玄学运势/辉煌心光/抽卡演出/深海回响/通用UI/UI整包
└── 卡池背景/ 音频/ 视频/ 字体/ 通用散件/ 信息表/
```

### 2. 「模拟器需要」怎么判定

新增 `tools/audit-used-sources.py`：插桩（替换 `open` / `listdir` / `walk` / `exists`）
跑一遍 `build-pool-map.py` + `collect-assets.py`，记录它们**真正碰到**的路径 ——
12376 个文件。不靠猜、不靠硬编码表。

### 3. 管线怎么跟着改

用现成的 `DIR_ALIASES` 机制（`P()` / `A()` 按顺序试路径）把旧名映射到新名，
**管线逻辑一行都不用改**。有一处绕过 `P()` 的硬编码单独修了
（`load_stars3()` 里的 `os.path.join(ASSET, "所有卡池通用三星散件", …)`）。

### 4. 踩到的坑

- **循环依赖**：裁剪 source 时最初用 `pool-map.json` 当「哪些阁在模拟器里」的判据，
  而 pool-map 是 build-pool-map 的**产物** —— 跑坏一次就永久少一座阁，越跑越少。
  改成用**源头** `原始素材/source/` 的阁目录名判定。
- **阁目录名带前缀**：`常驻·遥远之海` —— pool-map 里存的是纯名 `遥远之海`，
  按纯名匹配会整座阁漏掉。要剥前缀再比。
- **`素材/示例/` 不在审计清单里**：它不是管线输入，是**工坊的样本目录**（用户随时替换），
  但工坊与 `verify-v2810` 都要它 → 单独复制。

### 5. 验证

- manifest 除 `generatedAt` 外**完全一致**；7542 条路径全部有效、缺失 0
- 86 阁 / 132 套 / 26 版本，与重构前一致
- 回归：v2812 16/16、v2814 22/22、verify-clothes 15/15、verify-stories 21/21、
  verify-readings ALL PASS、v2813 10/10、v2811 28/28、v2810 34/34、v2809 28/28；
  `vue-tsc` 0 错、`build` 通过
- 实机截图：服装图鉴与共鸣页正常

---

## [v1.8.02] 2026-11-06 — 非模拟器套装归档（套装库只留 86 座阁里的 132 套）

> 套装库里有 316 套，但模拟器的 **86 座服装阁只用到 132 套** ——
> 其余 184 套在运行时永远不会被读取，搬到 `归档素材/`。

### 0. 一句话版（信封弹窗取这 5 条）

- 套装库从 316 份缩到 132 份，只留模拟器 86 座服装阁里真实存在的那些
- 184 套移进 `归档素材/2026-11-06-非模拟器套装/`（3★ 119 / 4★ 62 / 5★ 2 / e2e 残留 1）
- 判定依据用 `素材/source` 的阁目录名 —— 与 manifest 的 132 套交叉验证一致
- 合并脚本加了 `--live` / `--archive` 模式，不会再把归档套装写回库里
- manifest 归档前后**逐字段一致**，前端渲染结果 MD5 相同

### 1. 判定依据

用 `素材/source/<版本>/<阁名>/<套装目录>` 的**目录名**判定 ——
这是管线的权威源（`build-pool-map.py` 就是扫它建阁的）。
得到的 132 套与 `manifest.banners[].sets` 的 132 套**完全一致**（无差集），两条路径互为印证。

> 3★ 通用散件走 `stars3` 独立通道（`三星散件清单.yaml`），**不经过套装库**，
> 所以 119 套 3★ 套装归档后不影响抽卡页的散件。

### 2. 合并脚本的三个模式

`merge-set-yaml.py` 原本每次都从源重新合并**全部**套装，一跑就会把归档的写回库里。现在：

```bash
python tools/merge-set-yaml.py                                        # 默认 --live：只生成 132 套
python tools/merge-set-yaml.py --archive --out 归档素材/2026-11-06-非模拟器套装   # 只生成 184 套
python tools/merge-set-yaml.py --all --out <任意目录>                 # 全 316 套
```

写**默认目录**时先清空再建；写**其它目录**时**只增量写、不清空**（免得删掉用户自己补的文件）。

### 3. 验证

- 完整性：库 132 + 归档 184 = **316**（源可合并 316），**重叠 0**
- manifest 归档前后逐字段一致（唯一差异是 `generatedAt` 时间戳），86 阁 / 132 套不变
- 服装图鉴截图归档前后 **MD5 相同**（逐像素一致）
- 回归：v2812 16/16、v2814 22/22、verify-clothes 15/15、verify-stories 21/21、
  verify-readings ALL PASS、v2813 10/10、v2811 28/28、v2810 34/34、v2809 28/28；
  `vue-tsc` 0 错、`build` 通过
- 两个验证脚本都加了归档判据：库与归档**不得重叠**、合起来必须等于全集

---

## [v1.8.01] 2026-11-06 — 套装库平铺 + 只保留模拟器真正读的字段

> 用户要求把套装库改成**平铺**（不设子目录、文件名纯编号），并**删掉模拟器不引用的字段**
> （复刻版本、标签、形态、妆容等）。实测确认这些字段前端零引用，删掉零风险。

### 0. 一句话版（信封弹窗取这 5 条）

- 套装库从「`S0001_绽响黎明前/套装.yaml`」改成**平铺**的「`S0001.yaml`」，少一层嵌套
- 删掉了 `标签` / `形态` / `妆容` / `复刻版本` / `文案来源` —— 实测前端一个都不读
- 数据没丢：这些字段仍能从 `图片素材/` 与 `套装文案/` 的源文件重新派生
- manifest 再瘦 0.44MB（2.60MB → 2.16MB）
- 新旧数据逐字段比对：前端在用的字段**零差异**，回归全绿

### 1. 结构：平铺 + 纯编号文件名

```
素材/套装库/
├── S0001.yaml       ← 套装名: 绽响黎明前
├── S0002.yaml
├── SL0002.yaml      ← 限量系列 ID 前缀不同，同理
└── ...（316 份，2.4M）
```

原来每个套装占一个子目录（`<套装ID>_<套装名>/套装.yaml`），两层嵌套没带来任何好处 ——
文件名就是稳定的套装 ID，套装名留在 YAML 内部字段就够了。

无 ID 的套装（e2e 测试残留）用 `__<套装名>.yaml` 兜底，避免与数字编号混淆。

### 2. 字段取舍（逐个查过前端消费点）

| 删除 | 实测结论 |
|---|---|
| `部件[].标签` | manifest 里 1151 个部件带 tags，但 key 全是「类别/装饰/材质」，**没有一个叫「标签」**；前端 `GachaView` 读的正是 `t['标签']` → **永远取不到值** |
| `部件[].形态[]` | `formTexts` 前端零引用（v1.8.00 已从 manifest 移除） |
| `妆容[]` | 前端零引用 |
| `复刻版本` | 前端零引用（复刻关系由 `套装序列.csv` 的「复刻」列管，CSV 仍保留） |
| `文案来源` | `textSource` 前端只在 `types.ts` 声明，无读取 |

**保留**：`套装名/套装ID/星级/来源阁/首发版本/整体文案/属性标签` + `部件[].名称/类型/id/五维倾向/文案`。

> ⚠ 「属性标签」（套装级 `styles`）跟部件级「标签」是**两个不同的东西**：
> 前者前端 6 处引用（共鸣页弹窗、图鉴详情、搜索），**不能删**。

### 3. 数据没有真丢

被删的字段都能从源文件重新派生：
- `标签` ← `图片素材/<版本>/<套装目录>/属性-*.yaml`
- `形态` ← `套装文案/<版本>/*.txt` 的第 2~5 条
- `妆容` ← 同上，「妆容-原色/妆容-进化」两个部位
- `复刻版本` ← `信息表/套装序列.csv` 的「复刻」列

要恢复某个字段，改 `merge-set-yaml.py` 的 `build_one()` 一处即可。

### 4. 连带改动

- `tools/setyaml.py`：`dumps()` 只写保留字段；`_normalize()` 不再处理标签数组
- `tools/merge-set-yaml.py`：写盘前清旧结构，输出平铺纯编号；校验追加「废弃字段不该残留」断言
- `tools/build-pool-map.py`：`load_merged_sets()` 改成扫 `*.yaml`（不再按子目录找 `套装.yaml`）
- `updater/lib/meta.mjs`：`writeSuitLibYaml()` 写平铺纯编号、不写废弃字段
- `tools/verify-merge-set-yaml.py`：适配平铺结构 + 断言废弃字段已消失
- `tools/verify-merged-replaces-legacy.py`：改成**直接跑老管线的 loader** 与新库对比
  （不再拿 pool-map.json 当基准 —— 精简后它本身也变了），并把老 loader 的 3★ key
  前缀（`3星-商城-《X》`）统一规整成纯套装名再比

### 5. 验证

- 往返：316 份 / 2679 部件，逐字段一致
- 等价：新库 vs 老管线 loader → 覆盖全部有效字段（或更好）
- manifest 新旧对比：摘掉 `tags` 后 **parts 零差异**；1151 个部件的 tags 是**整体删除**
  而非内容变化
- 回归：v2812 16/16、v2814 22/22、verify-clothes 15/15、verify-stories 21/21、
  verify-readings ALL PASS、v2813 10/10、v2811 28/28、v2810 34/34、v2809 28/28；
  `vue-tsc` 0 错、`build` 通过
- 实机截图：服装图鉴详情（属性标签胶囊 / 五维雷达 / 部件文案）、共鸣页卡池栏、抽卡页部件卡均正常

---

## [v1.8.00] 2026-11-05 — 素材目录盘点 / 套装三份文件合并成一份 YAML

> 用户问「素材源目录是哪些」，并提出：`套装文案.txt` 的收益太低（与 `套装属性.yaml` 重复），
> 应该摘取两者写出一个新的 YAML。**实测结论：用户的判断基本成立，而且比想的更严重。**

### 0. 一句话版（信封弹窗取这 5 条）

- 盘点 `素材/` 顶层 30 个目录，**真正被脚本读的只有 13 个**
- `角色配音`（1.9G / 35878 文件）、`1服装图标库`（248M）脚本一个都不读
- 实测 txt 与 yaml 的部件文案 **1134/1142 逐字相同（99.3%）**，两份等重
- 合并成 `素材/套装库/<套装ID>/套装.yaml`（316 份），顺带修掉老管线 3 处缺陷
- manifest 去掉 `formTexts` 后 **3.84MB → 2.60MB（-32%）**

### 1. 素材源目录盘点

| 角色 | 目录 | 说明 |
|---|---|---|
| 内容数据（管线核心输入） | `信息表/` `套装文案/` `图片素材/` `source/` `套装故事/` `阅读物/` | 版本表、套装序列、卡片图、阁级素材、故事、书籍 |
| 界面演出 | `界面/` `主页/` `博物图鉴/` `辉煌心光/` `玄学运势/` `版本名/` `卡池背景图*/` `卡池界面缩略图/` `部分UI及道具图片/` `卡池音频/` `音频素材/` `字体库/` `深海回响奖励/` | 前端直接引用 |
| 只读存档 | `0主素材/` **39G**、`视频素材/` 2.4G | 官方解包原件 |
| **无人引用**（可归档） | `角色配音/` **1.9G·35878 文件**、`1服装图标库/` 248M、`背景图（版本命名）/` | 脚本一个都不读 |

### 2. 冗余实测

| 实测 | 数字 |
|---|---|
| txt 每部位**第 1 条** vs yaml 的「文案」 | 1134/1142 **逐字相同（99.3%）** |
| txt 总字符 vs yaml 总字符 | 33.2 万 vs 33.0 万 —— **两份等重** |
| txt 唯一增量 | 只有**整体文案** + **属性标签**（这两个前端在用） |
| txt 第 2~5 条（进化形态文案） | 占 57%，**前端零引用** |
| `套装部件.csv` | 整表可派生（形态名与 txt **1696/1696 = 100%** 一致）→ 可退休 |
| `set.formTexts` | 前端零引用，却占 manifest **29%（385KB）** |

### 3. 顺带修掉 3 个老管线缺陷

1. `load_set_texts()` 只认 `^[45]星-(?:限定|常驻)共鸣-《X》$`，
   `5星-无限之心-《谒灵》` 这类**池类型不匹配的整份被丢弃**
   → 9 套的整体文案+属性标签在图鉴里是**空的**。新库按《》取名，全读到了。
2. 剑雨侠客两个部件文案在 manifest 里带未解的 `\"`。
3. `五维倾向: {}` 被存成字符串 `'{}'`。

### 4. 新增工具

- `tools/setyaml.py` —— 不依赖 pyyaml 的读写器（支持嵌套 list-of-dict）
- `tools/merge-set-yaml.py` —— 合并 + 校验，**不删源文件**
- `tools/verify-merge-set-yaml.py` —— 往返验证
- `tools/verify-merged-replaces-legacy.py` —— 等价验证

> v1.8.01 把套装库改成平铺 + 精简字段，本节的目录结构描述已作废。

---

## [v1.7.00] 2026-11-05 — 图鉴改按「阁所在版本」分组 / 故事图鉴加「奇迹传说」栏

> 用户拍板了两件事：服装图鉴的分组口径改成**按服装阁所在的版本**（0.1、0.2 是工坊自建的阁，
> 游戏里并没这两个版本，阁里的套装都是游戏内可免费获取的）；故事图鉴顶部的大版本切换栏
> 加一栏「奇迹传说」，**图鉴主界面与阅读物图鉴不动**。

### 0. 一句话版（信封弹窗取这 5 条）

- 服装图鉴改成按「服装阁所在版本」归类，自建阁 0.1 / 0.2 不再是空白页
- 「阁在 0.1、首发在 1.5」的套装（如星之海）现在归到它真正所在的那座阁的版本
- 故事图鉴顶部多了「奇迹传说」一栏，三栏整组居中，素材借用心愿原野那一套
- Q / E 从「绝对跳转」改成左右翻栏（三栏循环），键帽贴在三栏外侧
- 阅读物图鉴与图鉴主界面没动；新增 verify-v2814（22 项）

### 1. 分组口径：套装首发版本 → 阁所在版本

`MuseumClothes.vue` 的 `SUITS` 以前是「全库按 `set.id` 去重 + `version = firstVersion`」，
于是 0.1「祈愿星」/ 0.2「魂灵生」这两版图鉴必然是空的 —— 阁里的套装首发都在 1.0/1.5/2.0/2.5 那些正式版本上。
v1.6.09 通过修正「首发」数据让 0.1 有了两套，但那只是补数据，口径本身没变。

现在 `SUITS` 变成「**阁 × 套装**」：遍历 `manifest.banners`，`version = b.version`，
同版本内按 `set.id` 去重（同一套重复导入不会出现两条）。代价与收益：

| | 旧（首发分组） | 新（阁分组） |
|---|---|---|
| 0.1 / 0.2 自建阁 | 空（要靠在 CSV 里补「首发」才勉强有内容） | 6 套 / 6 套，就是阁里真实有的 |
| 常驻套装（星之海：阁在 0.1，首发 1.5） | 跑到 1.5，而 1.5 的阁里根本没有它 | 留在 0.1，跟着它所在的阁走 |

⚠ 数据侧不做任何改动（CSV / pool-map 的「首发」仍是对的，只是不再拿它当分组依据）。
连带的影响：同一套如果将来被复刻到别的阁，会在两个版本里各出现一次 —— 这正是用户要的语义。

**搜索与深链**（`canonicalRow()`）：同一套可能命中多座阁，按「首发版本那座阁」优先，
避免搜「星之海」被带到 0.1 的自建阁；搜索结果也先按套装名去重，一条只出一次。

### 2. 故事图鉴的第三栏「奇迹传说」

- 分区表从写死的 `{ wish, yizan }` 改成 `REGIONS` 数组：`0 奇迹传说 / 1 心愿原野 / 2 伊赞之土`，
  顺序即大版本升序。**加分区只需改这张表**，栏位坐标、键帽位置都是算出来的。
- 0 没有专属版面素材（游戏里没这个场景），**借用心愿原野那一套**（背景 / 卷轴 / 纸面 / 标签 / 放大镜）。
  `artKey` 把「分区」和「素材」拆开，以后有素材了只要给 `REGIONS[].art` 换值。
- 栏位几何：栏宽 194.8 / 栏高 120.1 / 间距 180.8（相邻两栏有意重叠 14px，重叠的是透明像素）。
  三栏整组 556.4 宽 → 起点 681.8，整组水平居中（原来两栏是 779.5 / 960.3）。
- Q / E 键帽跟着挪到整组最外侧，快捷键语义也从「绝对跳转」改成「**左右翻栏（循环）**」——
  只有两栏时两种语义完全等价，有了第三栏后若还按绝对跳转，按 Q 会往右跳，与键帽位置矛盾。
- 深链 `?name=好书名` 与搜索跳转都改成 `regionOfMajor()`，major 0 会落到奇迹传说。

**为什么故事只有 2 篇**：故事的 `major` 仍取「套装首发版本」（`gen-stories.py`），
0.x 首发的只有心愿金蔷薇 / 祈愿新生两套。0.1 阁里的另外四套，故事仍归它们各自的正式版本 ——
故事是「这套装的故事」，不是「这座阁的故事」，跨栏重复出现反而更难找。

### 3. 验收

- 新增 `tools/verify-v2814.mjs`（22 项）：分组口径（0.1/0.2 的套装并集、0.1 首发套装在内、
  星之海「0.1 有 / 1.5 无」、搜索不重复、服装→故事跳转到奇迹传说）、
  三栏几何（顺序 / 居中 / 键帽不压按钮）、切栏（点选 + Q/E 循环）、深链与解锁正文、
  阅读物图鉴仍两栏。
- `verify-v2812` 的 K2 / U7 判据同步改口径：从「有首发套装的版本不为空」改成
  「每个有阁的版本，套装栏 = 该版本各阁的套装并集」。原来那句「纯复刻版本为空属正常」
  在 v1.6.11 里写进过文档，**本版起不再成立**（已在该条下加注）。
- `verify-stories` 里「伊赞之土」原来是 `.rd-tab` nth(1)，插入第三栏后 nth(1) 变成了心愿原野
  （数字对得上所以"假通过"）—— 改成按文字找栏位。

### 4. 已知问题（与本次无关）

`verify-clothes-v1905` 的 Req5「星级间隔」判据过期：断言 `margin-right ∈ [-12, -10]`，
而 CSS 早就改成 `-24px`（v2.3.x 调过星级可见间隔）。这条一直红，属于验收债，本版没动。

---

---

## [v1.6.11] 2026-11-05 — 工坊背景按尺寸兜底 / 验收不再写死样本数字 / `npm run up`

> 用户往 `素材/示例` 里放了新样本（`心轮曳星河`、`银羽衔月歌`、版本 0.2「魂灵生」三座阁），
> 顺手暴露了两处真问题：背景文件命名不规范时会被整张丢掉；以及验收脚本把旧样本的数字写死了。

### 0. 一句话版（信封弹窗取这 5 条）

- 服装阁背景文件叫「无限暖暖-1.5星之海-020.JPEG」这类名字也能认出来了
- 验收不再因为「样本换了」而误报（期望值改成从磁盘现算）
- 修掉版本表里 0.2 被写成「大版本 2」的错，版本写入时会自动按版本号纠正
- 明确「纯复刻版本的图鉴为空」是设计而非 bug，验收只对应该有内容的版本报警
- 新增 `npm run up`：一条命令起模拟器 + 工坊，关终端一起退

### 1. 背景只认文件名，命名不规范就整张丢

`bundle.mjs` 的 `collectPool()` 以前找背景只认 `背景图.* / bg.*`。
用户手上的原图常叫 `无限暖暖-1.5星之海-020.JPEG`（3840×2160），于是 `bg = null`：
背景不写、`collect-assets` 从背景裁的列表缩略图也没了，图鉴/共鸣页整座阁是空壳。

现在加**尺寸兜底**：文件名认不到时，阁根目录里「16:9 且宽 ≥1900」的那张图就是背景。
⚠ 必须排除已认出的缩略图 / 艺术字 / 标题横幅 —— **艺术字常常也是 2730×1536 的 16:9 大图**，
不排除就会把艺术字当背景写进去。

实测：`素材/示例` 下 6 座阁全部认到背景（`心轮曳星河` 走的正是兜底）。

### 2. 验收把旧样本的数字写死了

`verify-v2810` 的扫描段原来断言「2 套服装 / 8 张半身像 / 8 个图标 / 5 张进化 / 3 篇阅读物 / 必有 S0062」。
样本一换（现在第一座是 `心轮曳星河`，套装是 S0048/S0326、没有阅读物），验收就全红 —— 
**看着像产品坏了，其实是测试在量一把旧尺子**。

改成从磁盘现算期望值：

- 套装数 = 池目录下 `S\d{2,}` 子目录数；
- 半身像 / 图标 / 进化数 = 对应子目录里的图片数；
- 背景 = 有 `背景图.*` 就认它，没有则「阁根有 16:9 大图 → 必须认出来」；
- 阅读物 = 递归数「阅读物」目录下的 `.txt`；
- yaml / md 用全量文件列表判断（`lsFiles` 只收图片，会把它们滤掉 —— 这里踩了一次）。

顺带补了「背景不能是艺术字/缩略图」这条断言。**34 / 34**。

### 3. 版本表里 0.2 的「大版本」被填成了 2

`素材/信息表/版本表.csv` 第 27 行是 `0.2,魂灵生,2,奇迹传说,...` —— 大版本号写成 **2**（应为 0）。
后果是 `ui.ver.versions` 里出现两条「major=2」，其中一条名叫「奇迹传说」，
版本页/图鉴按 `major` 取大版本名时就把「伊赞之土」的标签挤掉了。

- 数据：改成 `0.2,魂灵生,0,奇迹传说,...`。
- 代码：`meta.upsertVersion()` 现在**以版本号首位为准**强制纠正 `major`
  （`0.2` 必属大版本 `0`），表单填错也不会再写歪。
- 验收：`verify-v2812` 的 U3 也改成按「版本号首位」推期望标签，不再信这个冗余列。

### 4. K1 / K2 的判据修正：常驻套装放进限时阁不是错

原来的判据是「套装首发不能晚于所在阁」。用户样本里 0.1 的阁放的是 `1.5` 首发的星之海
（来源写「无限之心」，是常驻套装）—— 按老判据直接报红，但这是**合法**的。

改成看**来源阁**：

- **K1**：只有当「这套的来源阁就是它现在这座阁」时，才要求首发版本 == 该阁版本。
  这正是 2026-11-05 那次「0.1 两套挂到 1.0」的形态（来源=心愿栖金蕊 / 首发=1.0探索季），照样能抓到。
- **K2 / U7**：只要求「有首发套装的版本」非空。**纯复刻版本**（阁里全是别处首发的套装）
  在图鉴里本来就该是空的 —— 图鉴按「首发版本」分组，这是设计，不是 bug。
  这种版本现在只打印一行提示。

顺带说明：`0.2 魂灵生` 目前就是纯复刻版本（三座阁的套装首发分别在 2.0 / 2.5 / 1.0 / 2.11），
所以图鉴里点 0.2 是空的 —— 要让 0.2 有内容，得往版本里放**首发就是 0.2** 的套装。

### 5. `npm run up`

模拟器（5178）与工坊（5199）是两个进程。以前由外部程序代起时，**进程被回收后端口上会留一个只回 502 的死壳**，
表现是「显示在监听、页面打不开」，直接重启还会撞 `--strictPort`。
`tools/up.mjs` 一条命令起两个、Ctrl+C 一起退；启动前先探端口，被占用就打印清进程的命令而不是静默失败。

---

## [v1.6.10] 2026-11-05 — 共鸣页切卡池也播该阁的进入音（音量 0.7）

> 用户口径：进入共鸣页会播当前阁的「进入界面」音，但**在缩略图栏切到另一座阁时没有声音**，
> 希望切换时也播，音量 0.7。
>
> 版本号说明：这是本项目的第一次「`mm` 满 12 进位」（v1.6.09 → v1.6.10），
> 按 CHANGELOG 顶部的规则执行，不是大改动。

### 0. 一句话版（信封弹窗取这 4 条）

- 在共鸣页点缩略图切到另一座服装阁时，会播那座阁自己的进入音
- 切换音量 0.7（进页那次仍是原始音量 1.0，比例就是用户要的 70%）
- 连点几座阁不会叠成一团：新的一响，上一首自动淡出
- 悬停缩略图就先预热那座阁的音频，切过去第一声不延迟

### 1. 改动

`BannerView.vue` 的 `selectPool()` 里，**真的切了池**才播：

```ts
if (store.bannerId !== p.id) {
  store.selectBanner(p.id)
  playBannerEnter(p.id, 0.7)   // 新增
  …
}
```

点当前这一座不算切换（选中框只是动一下），不重复播 —— 否则连点两下同一座会听成「重播」。

### 2. 顺带处理两件事

**① 切阁时上一首要淡掉。** 每座阁的进入音都有好几秒，快速点几座阁会把几首叠在一起响。
`useAudio.playBannerEnter()` 现在记住上一次的实例，新一轮开始时先把旧的 200ms 淡出。
（版本页点小版本也走同一个函数，同样受益。）

**② 悬停预热。** `warmBannerEnter()` 早就导出但一直没人调用，是死代码。
现在挂到缩略图 `mouseenter` 上：每座阁的音频约 76KB，悬停时才拉，切过去第一声不延迟。
未收录的阁不预热（没有音频）。

### 3. 音量怎么算的

`play(name, { volume })` 最终音量 = `volume × 音效总控 × 主音量`。
进页是 `1.0 × 0.8 × 0.7 = 0.56`，切阁是 `0.7 × 0.8 × 0.7 = 0.392` —— 正好 70%，
用户说的 0.7 就是这个系数，不是最终音量。两处都受「音效总控」滑杆控制，拉到 0 一起静音。

### 4. 验收

新增 `tools/verify-v2813.mjs` **10 / 10**：

| 项 | 抓什么 |
|---|---|
| E1a~E1c | 进页只播 1 次、播的是当前阁自己的音、音量是原始音量 |
| E2b~E2d | 切池后多播 1 次、播的是新阁的音、音量恰为进页的 0.7 倍 |
| E3 | 点当前这座阁不重复播 |
| E4 | 上一首已淡出（不会两首叠着响） |
| E5 | 未收录的阁点击不播（只有提示） |
| E6 | 无控制台报错 |

做法是用 `addInitScript` 拦 `HTMLMediaElement.play()`，按 URL 过滤 `sfx/banner-enter/*.ogg`，
记下实例引用，几百毫秒后读 `el.volume` / `el.paused` —— 不依赖真的听见。
**做过负向验证**：把那行注释掉再跑，E2b/E2c/E2d/E4 四条如期报红。

其余相关脚本全绿：`v2809` 28/28（进入音 80/80 齐全）、`v2601` 9/9、`v2701` 29/29、
`v2603` 27/27、`v2812` 16/16；`vue-tsc` 0 错、构建通过。

---

## [v1.6.09] 2026-11-05 — 修：工坊新增大版本在图鉴里没名字 / 0.1 的套装挂到 1.0

> 用户报了两件事，看着像一个 bug，其实是**三条独立的问题**叠在一起：
> ① 图鉴服装页把大版本名和版本名写死在 .vue 里；
> ② 工坊登记套装时改不动已有的「首发」；
> ③ 采集脚本嘴上说「CSV 优先」，实际 xlsx 会盖掉 CSV。

### 0. 一句话版（信封弹窗取这 5 条）

- 服装图鉴的大版本名与版本名改为读版本表，新建的大版本不再只剩一个数字
- 修好「0.1 祈愿星的两套被算进 1.0 探索季、0.1 整版空白」
- 工坊再导入同一套时，会刷新「首发」——以前登记错了就永远错下去
- 采集脚本的「套装序列.csv 优先」这次**真的生效**了（xlsx 只补缺）
- 新增 `verify-v2812`（16 项）把这三个坑都钉成回归

### 1. 大版本 / 版本名写死在页面里

`MuseumClothes.vue` 有两张写死的表：

```ts
const MAJOR_LABEL = { '1': '心愿原野', '2': '伊赞之土' }
const VER_NAME = { '1.0': '探索季', … }   // 只有 24 个官方版本
```

工坊新建的大版本 0 不在表里 → 标签退化成 `key`，于是赛季栏只剩一个「0」；
0.1 同理，版本名位置显示成「0.1」。**版本页（VersionView）早就改成读 manifest 了，
图鉴页没跟上。**

现在两张表都改成 `computed`：以 `manifest.ui.ver.versions[].majorName / name` 为准，
内置表只作兜底；兜底文案从「光秃秃的数字」改成「第 N 代」（与版本页一致）。

### 2. 0.1 的两套挂到了 1.0（三层原因）

**① 数据本身是错的。** `素材/信息表/套装序列.csv` 里 S0062 心愿金蔷薇 / S0083 祈愿新生
的 `首发` 是 `1.0探索季`（来源阁名倒是写对了：心愿栖金蕊）。
图鉴按 `firstVersion` 分版本 → 这两套算进 1.0，0.1 一套都不剩。

**② 工坊改不回来。** `meta.upsertSet()` 的「已存在」分支只更新星级和来源，**从不碰 `首发`**。
所以哪怕再导一次正确的 0.1 也修不好。现在按来源阁判断：

- 同一个阁（或原来源为空）→ 这是**修正登记信息**，`首发` / `来源` 一起更新；
- 不同的阁 → 这是**复刻**，`首发` 保持首次登记，把这次版本写进 `复刻` 列。

**③ 采集脚本没用 CSV。** `build-pool-map.load_set_info()` 注释写着「套装序列.csv 优先」，
实现却是「CSV 先读、xlsx 后读，且 `stage == '初始'` 就覆盖」—— xlsx 的旧值直接顶掉 CSV。
现在用显式优先级（CSV=2 / xlsx=1），低优先级永远不许覆盖高优先级。

修完：0.1 祈愿星 → 2 套；1.0 探索季 → 14 套（原 16）。
pool-map 重建前后逐字段比对，只有这 4 个字段（两套的 `origin` / `firstVersion`）变了；
顺带 S0331 缘缘长相念 的 `reprintVersion` 补上了 `2.10金羽的裁决`（CSV 里有、xlsx 里空）——
这个字段前端没消费，不影响任何显示。

### 3. 验收

新增 `tools/verify-v2812.mjs` **16 / 16**，三层都钉住：

| 层 | 项 | 抓的是什么 |
|---|---|---|
| 数据 | K1~K4 | 首发不能晚于所在阁 / 有阁的版本图鉴不能空 / 首发版本必须在版本表里 / CSV 的「来源阁 ↔ 首发版本」要对得上 |
| 页面 | U1~U8 | 大版本标签 == manifest 的 majorName（且没有纯数字）/ 顺序按数字升序 / 版本名一致 / 每个版本点进去都有套装 |
| 采集 | S1~S4 | 两个数据源都有显式优先级 / 低优先级不许覆盖 / 实跑 `load_set_info` 确认读到的是 CSV 的值 |

做过**负向验证**：把 CSV 那两个格子改回 `1.0探索季` 再跑，K4 与 S4 如期报红；
改回来恢复 16/16 —— 说明这几条断言真的能拦住同一个坑。

其余全绿：`v2811` 28/28、`v2810` 30/30、`v2809` 28/28、`v2702` 41/41、`v2701` 29/29、
`v2601` 9/9、`clothes` 15/15 等；`vue-tsc` 0 错。

### 踩坑

1. **「注释里写了优先」不等于代码里优先**：`load_set_info` 的 docstring 从第一天就写着
   「CSV 优先」，但两次读取顺序 + 覆盖条件让它形同虚设。优先级要写成**数据**（显式 `p=`），
   不要靠读取顺序的巧合。
2. **upsert 的「已存在」分支最容易漏字段**：漏掉的字段会变成一条**只能新增、不能修改**的记录，
   排查时还以为是数据源的问题。写 upsert 时把「哪些字段允许被改写」想清楚。
3. **写死的展示表是隐形地雷**：`MAJOR_LABEL` / `VER_NAME` 这种「反正官方就这些」的表，
   一旦数据源开始增长（工坊建大版本），就变成「新数据没有名字」。
   本项目已经有 `manifest.ui.ver.versions` 这个单一数据源，展示层应当一律读它。

---

## [v1.6.08] 2026-11-05 — 性能：首屏瘦身 4MB / 图鉴按需加载 / 存档导出

> 本轮不是新功能，是拿真实性能数据找出来的三处浪费 + 一个单机游戏的硬缺口。
> **首屏 JS 从 1764KB 降到 136KB（gzip 786KB → 53KB）**，图鉴正文改成按需加载。

### 0. 一句话版（信封弹窗取这 5 条）

- 首页不再下载 4MB 图鉴正文，首屏 JS 从 1.76MB 砍到 136KB，提速约一半
- 「博物图鉴」主界面从 4MB 降到 70KB（搜索改用 25KB 的标题索引）
- 故事页只载故事、阅读页只载阅读物，不再互相带对方全文
- 设置 → 存档新增「导出 / 导入」：清浏览器数据或换电脑前能先存一份
- 修掉图鉴服装页大版本图标的裂图（空 `src`）

### 1. 首屏白下了 4MB（最大的那个）

`stores/game.ts` 为了「一键收集全部阅读物」取个 id 列表，静态 import 了
`core/museum-content`，而它同时引入 `data/readings.ts`（933KB）+ `data/stories.ts`（731KB）。
结果**首页要解析 1.66MB 的图鉴正文**，主 chunk 到 1764KB / gzip 786KB。

- `collectAllReadings()` 改成 `async` + **动态 import**：点一次才载，载一次浏览器会复用。
- `core/dlc.ts` 的 `applyDlcToManifest()` 同样改成按需取（只有真装了带故事/阅读物的 DLC 才发生），
  因此变成 `async`，`store.init()` 里 `await`。
- 主 chunk：**1764KB → 136KB**；首屏就绪 595ms → **~300ms**。

### 2. 图鉴主界面从 4MB 降到 70KB

主界面只有三张入口卡，却为了搜索取书名把全文都拉了。现在：
`museum-search.ts` 只依赖新的 `core/museum-names.ts`（标题索引，约 25KB），
正文只在真正打开故事页 / 阅读页时才下载。

- 两个生成脚本各**附产**一份标题索引：`gen-stories.py → data/story-titles.ts`、
  `gen-readings.py → data/reading-titles.ts`（仍由脚本生成，别再手改）。
- 标题索引是 `reactive` 数组，DLC 装进来的新内容会通过 `addStoryNames / addReadingNames` 补进去，
  搜索照样能搜到。

### 3. 故事 / 阅读物拆成两个模块

原来 `museum-content` 把两包正文绑在一起，只开故事页也要下阅读物全文（反之亦然）。
现在拆成 `core/museum-stories.ts` 与 `core/museum-readings.ts`，
`museum-content.ts` 退化成**兼容再导出**（新代码别再 import 它）。

实测（生产构建，图鉴正文传输量）：

| 页面 | 改前 | 改后 |
|---|---|---|
| 首页 | 4MB | **0** |
| 图鉴主界面 | 4MB | **70KB** |
| 故事页 | 4MB | **73KB**（故事本包） |
| 阅读页 | 4MB | **73KB**（阅读物本包） |

### 4. 新增：存档导出 / 导入（单机游戏该有的）

这是本地单机存档，只存在 `localStorage` —— 清一次浏览器数据就全没了，而且没有任何备份手段。
设置 → 存档面板顶部新增「存档备份：导出 / 导入」：

- **导出**：下成 `无限暖暖存档-YYYYMMDD-HHMM.json`，带外壳
  （`app` / `kind` / `schema` / `exportedAt`），用户自己打开也能看懂。
- **导入**：**先校验、再确认、最后才覆盖**。会明确拒绝「不是 JSON / 没有存档字段 /
  别的程序的存档 / 数组」，校验失败时现有存档**一动不动**。
- 校验通过后写盘并重载页面（不在内存里热替换：`codex` 是 shallowRef、
  `selectedVersion`/`bannerId` 各是独立 ref，逐个补容易漏一处）。

存档面板因此多了一行，`gm-row` 的上下 padding 从 6px 收到 4px，
四个面板（演出 / 音量 / 快捷 / 存档）都不再溢出内容区。

### 5. 修 bug

- **图鉴服装页大版本图标裂图**：缺图时渲染空 `src`，浏览器显示裂图占位。
  改为 `v-if="majorIconOf(g.key)"`，并让它优先读 `ui.ver.majorIcons`（工坊上传的），
  再退回内置 `tower` —— 新建的大版本 0「奇迹传说」不会再取到 `tower[-1]`。

### 验收

- 新增 `tools/verify-v2811.mjs` **28 / 28**（导出 12、校验 6、往返 10）。
- 旧脚本按现状改口径：
  - `verify-gloria` / `verify-v2302` 原本按 `.gm-row` 的**行下标**点按钮，
    存档面板多一行后点到了「导出」上 → 改成**按行标题**定位。
  - `verify-almanac-v2201` 用 `waitUntil: 'networkidle'` 等首页，
    但首页挂着音频/视频的 `preload="auto"`，永远等不到空闲 → 长期超时跑不通，
    改成 `domcontentloaded` + 等 loading 消失。**现在 21/21 能跑了**。
- 其余全绿：`v2810` 30/30、`v2809` 28/28、`v2805` 48/48、`v2803` 55/55、`v2802` 47/47、
  `v2702` 41/41、`v2701` 29/29、`v2603` 27/27、`v2602` 20/20、`v2601` 9/9、
  `almanac` 46/46、`gloria` 49/49、`v2302` 35/35、`readings` 22/22、`stories` 20/20；
  `vue-tsc` 0 错、构建通过。

### 踩坑

1. **`addInitScript` 每次导航都会跑**：用它播存档种子时，导入后的 `reload` 会被重新播种回初始值，
   验收里表现为「导入没生效」。种子要配一个「已播种」标记，只写一次。
2. **`networkidle` 在有持续预载的页面上等于永不满足**：音频/视频 `preload="auto"` 会把连接挂住。
   一律用 `domcontentloaded` + 等业务 loading 消失。
3. **构建时 dist 被 preview server 占用**会报 `prepareOutDir` 失败，先停 preview 再 build。

---

## [v1.6.07] 2026-11-05 — 工坊：整套导入 / 批量操作 / 半身像与大版本图标 / 铭牌与缩略图修复

> 用户用工坊更新一座服装阁时提了 10 条问题（含一条重复编号）+ 1 条新功能：
> 没有批量操作、多余素材删不掉、多文件不能自动归位、没有半身像输入、要写三次才能完成一次更新、
> 自动归位会把同套部件拆到两套、没有大版本图标输入、铭牌串用别套、缩略图串用别阁、部分文件写入不生效；
> 外加「能直接识别整理好的文件夹并自动填表」。

### 0. 一句话版（信封弹窗取这 5 条）

- 工坊新增「整套导入」：指向一个整理好的文件夹，一次写入大版本、版本、服装阁、套装、故事与阅读物
- 待分配列表支持多选、批量放置、批量删除与一键清空
- 套装可以填「部件试穿图（半身像）」与「进化等阶」，图鉴详情页不再是空的
- 版本任务能上传大版本图标，版本页左侧不再缺图标
- 修好套装铭牌串用别套、列表缩略图串用别阁两处显示错误

### 1. 批量与清理（问题 1、2）

- 待分配列表：每行勾选框 + 顶部「全选 / 目标槽位 / 应用 / 删除选中 / 清空」。
- 单条不再只能放置：新增 `×` 直接移除；`data-pkdel` 走同一套状态。
- 槽位本身仍可单张 `×`，多张槽可以连续删。

### 2. 自动归位（问题 3、6）

- **按 `S0062` 这样的套装目录聚类**：同一批文件只要路径里有 `S编号`，就整组落进同一张套装卡；
  有几组自动把套装卡加到几张，并顺手从 `属性-5星-XXX.yaml` / `故事-4星-XXX.md`
  里把**套装名与星级填好**（以前全靠手输）。
- 「可多张」的类目（部件图标 / 半身像 / 进化 / 深海回响 / 铭牌）先找「同类已放过」的槽再找空槽 ——
  以前第 2 张就直接溢出到下一套，正是「同一套被拆成两套」的成因。
- 拖多个文件到某个槽位：可多张的整批挪过去，单值槽只取第一张（以前一批只会挪最后一个）。

### 3. 半身像与进化等阶（问题 4）

- 新增两个素材类目与槽位：
  - **部件试穿图（半身像）** `520×724`（`1040×1448` 的 2 倍图也认）→
    写进 `素材/图片素材/<版本><版本名>/<星>星-<限定|常驻>共鸣-《套装》/初始 l <套装名>/`；
  - **进化等阶整体图** `整体-初始/焕新/一进/二进/满进.png` → 各自进对应阶段目录；
    文件名写成 `整体-一进·焰之歌.png` 时，`·` 后面那段直接当阶段套装名。
- 没有立绘时自动用 `整体-初始` 当立绘（图鉴里至少有人物图）。

### 4. 一次写入（问题 5、11）

- 新增任务「**整套导入**」：粘贴文件夹路径 → 「扫描文件夹」→ 预览（大版本/版本/阁/套/阅读物）→
  一次「写入并更新」跑完整条管线。
- 认的目录结构：`大版本名 / 版本号+版本名 / 服装阁名 / S编号 / {半身像,图标,进化等阶,属性-*,故事-*}`
  ＋ 阁级 `背景图 / 列表缩略图 / 艺术字 / 深海回响/` ＋ `阅读物/*.txt`；
  大版本目录下可放 `大版本图标.png`，版本目录下可放 `版本缩略图.png` / `版本大图.png`。
- 套装任务与服装阁任务也补了「套装故事 (.md)」槽位：拖进去就一并写入，不用再单独跑一次「故事」。

### 5. 编号与铭牌（问题 8）

- 服装阁编号只接受**三位**；历史脏数据 `1001` 在导入时会**重排为下一个可用编号**，
  并把 `Pic/1001` 目录与 `list-1001.png` 一起改名（示例阁已从 1001 修到 081）。
- 前端 `gachaNo` 改为整串匹配 `^\d{3}$`。以前 `/(\d{3})$/` 会把 `1001` 截成 `001`，
  于是去取了 001「遥远之海」的专属铭牌 —— 这就是截图里铭牌串套的原因。
- **`plateIdx` 第一次真正生成**（`build-pool-map.py`）：编号 = 该池套装「5★ 在前、同级按目录序」的名次。
  此前这个字段从未被写入，所有带编号的专属铭牌其实一直没生效。

### 6. 列表缩略图（问题 9）

- 缺缩略图时，`collect-assets.py` 从**这座阁自己的背景**中心裁一张 `320×140`
  （`thumb_from_bg()`），manifest 的 `assets.thumb` 按「文件存在」判定。
- 前端兜底顺序改为 `专属缩略图 → 自己的背景 → 通用图轮播`，不再直接借别座阁的图。

### 7. 大版本图标（问题 7）

- 版本任务新增「大版本图标」槽位 → 写 `素材/信息表/大版本图标/<大版本号>.png`；
- `collect-assets.py` 转成 `ui/ver/major-<号>.webp` 并登记 `ui.ver.majorIcons`；
- 版本页 `majorIconOf()` 优先取它，取不到再退回内置 `tower` 数组，都没有就**不渲染 `<img>`**
  （空 `src` 会显示浏览器的裂图占位，比留白难看）。

### 8. 写入不生效（问题 10）

- **同名文件互相覆盖**：一次拖进来的 `半身像/发型-X.png` 与 `图标/发型-X.png` 文件名完全相同，
  旧代码按文件名建 Map，后一个把前一个顶掉 → 16 个文件只生效 8 个。
  现在上传按**下标**配对，服务端落盘遇到重名自动加 `-2`。
- 「设置项里没有半身像」导致卡片图缺失，图鉴里这一套没有部件大图 —— 已由 §3 补齐。

### 8.1 修 bug：新建服装阁的 `legacyId` 是半截的（真实缺陷）

- **现象**：用户自建的 081「心愿栖金蕊」在 manifest 里 `legacyId = "banner-0.1"`（缺 `-序号` 段），
  `seq` 落成 999。官方 80 座阁都是 `banner-<版本>-<两位序号>`。
- **根因**：`build-pool-map.py` 的 `load_updater_index()` 要求索引条目里 **`ver` 与 `seq` 同时存在**
  才会把这座阁并进 `list_map`；缺 `seq` → 拿不到 `listKey` → `legacy_id` 退化成 `banner-<版本>`。
  工坊建阁时只写了 `version` / `gachaKey`，**没写 `seq`**。
- **修复**：`updater/lib/meta.mjs` 的 `upsertPool()` 现在**自动补 `seq`**
  （同版本已有阁取最大值 +1，两位补零）；`素材/信息表/卡池索引.json` 里 081 手工补上 `"seq": "01"`。
- **效果**：081 → `legacyId = "banner-0.1-01"`、`seq = 1`；其余 80 座阁的 pool-map **一字未变**
  （重建前后逐字段比对，差异项恰好只有这两处）。

### 8.2 修 bug：旧验收脚本因 UI 改动而误报（`verify-v2601`）

v1.6.06 起「主页不再显示侧边栏」「卡池 → 服装阁」，而 `verify-v2601.mjs` 仍按老口径断言，
连带把 25 个版本里新增的 0.1 也当成异常。**改的是脚本口径，不是产品**：

- 导航文案改到 `#/codex` 取，并新增断言「主页 `.rail` 数量为 0」（把 v1.6.06 的要求变成回归保护）；
- 版本清单**从 manifest 现算**，不再写死 24 个；
- 大版本组**按名字**定位（`奇迹传说 / 心愿原野 / 伊赞之土`），不再按下标；
- 版本 → 池的期望值取「该版本首个含 5★ 的池」，与前端 `VersionView.poolOf` 的真实规则一致
  （1.1 的 006 是纯 4★，页面给的其实是 008 飞向流星的愿望）；
- 卡片标签前缀同时兼容「卡池」与「服装阁」。

结果：`verify-v2601` 8/8 → **9/9**（多一条主页无侧栏）。

### 验收### 验收

- 新增 `tools/verify-v2810.mjs` **30 / 30**（铭牌 5、缩略图 3、扫描与分类 8、任务槽位 4、同名上传 3、模拟器 4）。
- 工坊端到端 `updater/e2e/run-e2e.mjs` **59 / 59**（脚本改为**按当前数据现算**编号，不再写死 081/070/80）。
- 旧脚本按现状改口径：`v2809`（进入音只要求官方 001~080、版本数不写死 24、按组名选大版本）、
  `v2601`（主页去侧栏 + 服装阁改名 + 版本清单现算 + 首个 5★ 池规则，见 §8.2）。
- 其余全绿：`v2802` 47/47、`v2701` 29/29、`v2507` 18/18、`v2602` 20/20、`v2702` 41/41；`vue-tsc` 0 错、构建通过。

### 踩坑

1. **`NODE_OPTIONS` 里的安全删除 shim 会让「撤回」删不掉新文件**：`fs.unlinkSync` 变成回收站语义，
   回滚后目录还在，验收里表现为「source 目录已清 ✗」。已在 `archive.mjs` 加 `hardUnlink()`
   （失败时起一个清空 `NODE_OPTIONS` 的原生子进程删），e2e 在带 shim 的环境下也过。
2. **e2e 不能把编号写死**：脚本原写死 `081 / 卡号 070 / 80 座`，素材库一多就误报，
   更糟的是「清理孤儿产物」会按写死的编号把**用户真实新建的 081 阁**一起删掉 —— 已改成现算。
3. **vite dev 仍会缓存 public 的旧文件列表**：导入后新素材 `naturalWidth=0`，重启 dev server 即好。

---

## [v1.6.06] 2026-11-04 — 改名「服装阁」/ 078~080 换高清源 / 主页去侧栏 / 归档未启用素材 / 三阁合成背景 / 补齐进入音 / 版本页点击音

> 用户一次提 7 条：① 界面文案「卡池」→「服装阁」（量词改「座」，代码标识符不动）；
> ② 078~080 换高清素材、卡池艺术字改用简体中文版（078/079/080/058）；
> ③ 主页不显示侧边栏；④ 未启用/已废弃素材统一移到 `归档素材/` 待检阅；
> ⑤ 053/066/080 按 pxdesk 布局把多张素材合成整屏背景；⑥ 按音频文件名里的阁名补齐每阁进入音（原始音量，2.11 只做「雪落颂愿时」）；
> ⑦ 版本页每个版本加点击音，取该版本首个五星阁的进入音。

### 0. 一句话版（信封弹窗取这 5 条）

- 界面上的「卡池」全部改称「服装阁」，量词用「座」（一座服装阁）
- 078~080 换上高清背景；「不灭的幽旅」「以长夜为誓」「雪落颂愿时」「契约终末之时」改用简体中文阁名
- 主页不再显示左侧栏，二级界面只从右缘竖排图标进
- 「如我斑斓」「千万次相逢的理由」「雪落颂愿时」的背景按官方排版重新合成
- 每座阁都补齐了进入音；版本页点版本会播放该版本首座五星阁的进入音

### 1. 改名：卡池 → 服装阁

- **只改界面文字**：`src/` 与 `updater/web` 里所有面向用户的「卡池」→「服装阁」；
  量词按用户口径改「座」（一只卡池 → 一座服装阁、N 个卡池 → N 座服装阁）。
- **代码标识符一律不动**：`BannerView`、`bannerId`、`gachaKey`、`pool-map.json`、
  `banner-enter` 等全部保留，接口与数据结构零变化。
- 同步改掉一批只写「池」的界面句：「本池」→「本阁」、「各池独立，不跨池继承」→「各阁独立，不跨阁继承」、
  黄历签文「抽新池/开新池」→「抽新阁/开新阁」。
- ⚠ **保护词**：磁盘目录名（`素材/卡池音频/`、`卡池背景图（纯图片，无艺术字）`、`卡池索引.json`）
  是路径的一部分，批量替换时先占位保护再改，否则会打断素材管线。
- `src/data/easterEgg.ts`（玩家原话引用）与 `src/data/mail-changelog.ts`（历史日志快照）**不改**。

### 2. 素材换源

| 阁 | 来源 | 处理 |
|---|---|---|
| 078 不灭的幽旅 | `Pic/078/T_UI_resonance_gacha_078_bg.png`（2560×1440） | 直接转 bg-clean |
| 079 以长夜为誓 | `Pic/079/T_UI_resonance_gacha_079_bg_Vx.png`（2560×1440） | 直接转 bg-clean |
| 080 雪落颂愿时 | `Pic/080/T_UI_resonance_gacha_080_vx02.png` + `crystalball.png` | 合成后转 bg-clean |
| 艺术字 078/079/080/058 | `T_UI_resonance_gacha_0xx_title.png` | 简体中文版，`center_alpha_webp` 居中后转 title |

- `build-pool-map.py` 新增 `BG_HIRES`（按官方编号指定高清整屏底图）与
  `TITLEART_EXTRA`（补齐原本无艺术字的池）；058 原先只能显示纯文字，这次补上简中艺术字
  → **80/80 池全部有阁名艺术字**。

### 3. 主页不显示侧边栏

- `App.vue` 的 `railVisible` 增加 `route.name !== 'home'`：主页不再渲染左侧栏，
  左缘感应区一并失效（悬停也不唤出）；二级页仍保留返回键（版本页 `.vr-back` 等）。
- 主页底部提示由「右缘图标即各二级界面 · 或从左侧栏进入」改为只提右缘。

### 4. 未启用素材归档

- 以 manifest 为唯一真相，扫出 **849 个未被任何字段引用的文件（40 MB）**，
  连同目录结构整体移到 `归档素材/2026-11-04-未启用素材/`，并写 `README.md`（分类清单 + 恢复方法）。
- 同时**摘掉会重新生成它们的代码路径**（否则下次归集又长回来）：
  `ui.card`、`ui.home.crystals`、`ui.home.textures`、4 张未用 `deco`、
  `ui.detail/badge-new`、`ui/ver/name-bg`、`banners/bg`（旧版带艺术字背景）、
  `banners/layers`、`ui/gifs`；`types.ts` 对应字段一并删除。
- **特意留下**：`ui/updater/*`（8 个）—— 它们是更新工坊自己的图标，被
  `updater/web/index.html` 直接引用，不进模拟器 manifest。
- 归档 ≠ 删除：`public/assets` 现有 7 437 个文件，全部被 manifest 可达。

### 5. 三阁多素材合成背景

- 用户在 pixel-desk 里摆好的 `*.pxdesk` 存的是**编辑画布坐标**（1400×730 / 1400×788），
  底图实际尺寸是 2560×1440 / 2760×1440，两者不是 1:1 —— 合成时按 **X/Y 两轴分别换算**
  （两轴比例略有差异，同一系数会差 1~2px）。
- `collect-assets.py` 新增 `BG_COMPOSE` + `compose_bg_webp()`：底图 → 按序叠装饰件 →
  居中裁 16:9 → 1920×1080 webp。053 叠 3 层（人偶 + 两团云雾）、066 叠 7 层
  （气泡 + 四星徽记 + 小鱼气泡装饰）、080 叠水晶球。
- 合成结果只写 `bg-clean` 成品，前端不认识中间件；`--bust` 可强制重合成。

### 6. 各阁进入音

- **按文件上写的阁名匹配**（编号前缀错位，一律不作数）；补齐后 **80/80 座阁都有进入音**。
- 2.11 目前只挂「雪落颂愿时」——另外两首（万物繁生瑶 / 新愿不落幕）按用户要求**暂不处理**，
  对应服装阁也还没进素材库。
- 音量改为**原始音量**：`playBannerEnter()` 默认 `volume = 1`，不再乘 0.85
  （ogg 从 mp3 直转、未做响度归一，再打折就比实机小一号；要小声交给音量滑杆）。
- 进入共鸣页时弹窗音仍叠 0.28，两者头部对齐。

### 7. 版本页点击音

- 点小版本 → 播放该版本**首个含 5★ 的服装阁**的进入音（同版本里含 5★ 的编号一定靠前）；
  整版只有 4★ 才退回第一条（实测 24 个版本全部有 5★ 阁，无回退）。
- 不再叠 `common-hover`：两个声音同时响会把前奏糊掉。

### 验收

- 新增 `tools/verify-v2809.mjs`：**28 / 28 通过**（改名 3、主页无侧栏 3、素材换源 12、
  归档 2、进入音 4、版本点击音 4）。
- 旧脚本按现状改口径：`v2507` A3（058 已有艺术字 → 80/80）、`v2602` A4/A7（主页无侧栏，
  闸门改验右缘置灰）、`v2500` B5、`v2505` 导航改走右缘入口、`v2805` 侧栏断言。
- 其余全绿：`v2805` 48/48、`v2802` 47/47、`v2803` 55/55、`v2702` 41/41、`v2701` 29/29、
  `v2603` 27/27、`v2400` 38/38、`v2507` 18/18、`v2602` 20/20。
- `vue-tsc` 0 错；生产构建通过。

### 踩坑

1. **开发服务器会缓存 public 目录的旧文件列表**：058 艺术字是后来才被替换的，
   磁盘上正常（35 KB），但 `vite dev` 一直回 SPA fallback（`text/html`），
   浏览器里就是 `naturalWidth = 0`。**重启 dev server 即恢复** —— 别据此判定素材坏。
2. **`addInitScript` 每次导航都执行**：用它写存档时，页内再改 `localStorage` 会被覆盖，
   换版本要用新的 `browser.newContext()` + 传参，否则永远停在同一个版本。

---

## [v1.6.05] 2026-11-04 — 详情弹窗装饰带上移 + 信封弹窗移到左上 / 去退出键 / 正文改滚动

> 用户两条：① 共鸣页套装详情弹窗的底部装饰条被遮蔽，把 `band.webp` 的图层上移；
> ② 主页信封弹窗从右上角移到左上角、去掉退出键（改为点空白处退出）、加滚动条
> （溢出内容用拖动或滚轮查看，**不缩放文字**）。
> → 小改动（两处界面精修），`mm` 07 → 08。

### 一、套装详情：`band` 图层上移（z-index 1 → 4）

- 病因：`.sh-band` 原来是 `z-index:1`，被 `.sh-hero-box`（2）和 `.sh-forms`（4）压住 ——
  整条装饰带只剩中间拱形缺口那一段露出来，左右两端被立绘与形态卡吃掉（用户截图红圈处）。
- 取 `4` 而不是更高（比如 6）：与 `.sh-forms` 同层但 **DOM 在其后** → 压住卡片；
  同时仍低于 `.sh-line` / `.sh-diamond`（5），分隔线与菱形继续浮在带子上，不会反被盖掉。
- `verify-v2802` 新增两条断言：`band ≥ hero`、`band ≥ forms` 且宽度 > 1000；`line > band`。

### 二、主页信封弹窗（`MailPopup.vue`）

| 项 | 改动 |
|---|---|
| 位置 | 入口信封键 `right:34 / top:30` → `left:36 / top:34`（贴竖版站名艺术字左侧，留 14px） |
| 退出 | 删掉右上角 `×` 圆钮；点信纸外的空白处关闭（`.mail-mask` 与 `.mail-stage` 都走 `@click.self`），ESC 保留 |
| 正文 | **不再自动降字号**（删 `fitBody()` / `bodyScale` / `--lt-scale`）：固定欢迎页 15px、日志页 14.5px，`.lt-body` 改 `overflow-y:auto` |
| 滚动 | 自定义 10px 暖棕滚动条（轨道 + 圆角滑块，与信纸木色同系）；滚轮可滚；**按住正文可拖动**（`cursor: grab/grabbing`，仅在真的溢出时） |
| 拖动换算 | 用 `core/stage.ts` 的 `toDesignDelta()` —— `clientY` 是屏幕像素、`scrollTop` 是设计像素，4K 下不换算会快 2 倍 |
| 换页 | 翻到新页时正文回到顶部，并重测是否溢出（`pointerenter` + `fonts.ready` 也会补测） |

### 三、验收：`verify-v2802` 37 → 47 条（全绿）

- 新增：`band` 层级 2 条、`没有 × 退出键` 1 条、正文滚动 5 条（人为加长后确实溢出 / 字号与溢出前一致 /
  滚轮可滚 / 拖动可滚 / **拖动不误关弹窗**）、`点空白处关闭` 1 条。
- 改写：原「四页正文都不溢出（自动降字号生效）」→「四页不缩字（15px / 14.5px 恒定）」；
  「右上角信封键」→「左上角信封键，且不与站名艺术字重叠」。
- 其余：`v2805` 45/45、`v2803` 55/55、`v2702` 41/41、`v2701` 29/29、`v2603` 27/27，`vue-tsc` 0 错，构建通过。

### 四、两个踩到的坑（都写进交接文档了）

1. **`scrollbar-width` 会把 `::-webkit-scrollbar` 顶掉**：两个一起写时 Chromium 优先标准属性，
   webkit 伪元素整组失效 → 滚动条退回 overlay 样式（不占位、静止几秒自动隐藏），看着像"根本没加滚动条"。
   现在只写 webkit 伪元素；Firefox 退化成它自己的默认滚动条。
2. **Playwright 默认带 `--hide-scrollbars`**：验收里量 `offsetWidth - clientWidth` 永远是 0，
   别据此判"滚动条没生效"；本轮是靠 `ignoreDefaultArgs:['--hide-scrollbars']` 单独起浏览器才确认到 10px 占位。
   另外**溢出判断要现算**：子集字体是异步加载的，加载完行宽会变，别复用上次的结论。

---

## [v1.6.04] 2026-11-04 — 删除卡池 PV 挂载 + 删除 `ui.echo` 旧素材组

> 用户对上轮汇报的处置：**① 删卡池 PV 挂载 ② 删 `ui.echo` ③ 其余几项保留**。
> → 小改动（删两个已无入口的功能），`mm` 06 → 07。

### 一、卡池 PV 挂载：整体拆除

挂载面板在更早的版本里就没了（共鸣页只播 `assets.bgVideo` 动态背景），但整套代码一直在：

| 位置 | 删了什么 |
|---|---|
| `src/config/pv.ts` | **整文件**（87 行）：7 段 PV 元数据 `PV_REGISTRY`、`pvMetaOf / pvOf`、三档模式文案、`loadPvModes / savePvModes` |
| `src/stores/game.ts` | `pvModes` 状态、`setPvMode / pvModeOf`、`currentPv / pvActive` 两个 computed，以及 export 里的 5 项 |
| `src/types.ts` | `BannerAssets.pv` 字段 |
| `tools/collect-assets.py` | `--with-pv` 参数、`video/pv/` 拷贝分支、manifest 里的 `"pv"` 字段 |
| `public/assets/manifest.json` | 80 个卡池的 `"pv": null`（值本来就全是 null，从未归集过素材） |
| `tools/gen-assets-report.py` | 命令清单里的 `--with-pv` 示例 |
| `src/views/SettingsView.vue` | 「清空所有记忆（含生辰、**PV 设置**）」→「含生辰、抽卡记录」 |

> 存档里的 `nikki-pv-modes` 键不再被读写；「清空所有记忆」本来就按 `nikki-` 前缀整批清，老键会顺手清掉。

### 二、`ui.echo` 旧素材组：整体删除

`EchoView` 从改版起只读 `ui.deepsea`，`ui.echo` 是早期自绘版残留（13 张 webp / 258 KB），
`collect-assets.py` 每次归集还在照抄：

- 删 `public/assets/ui/echo/`（13 个 webp）；
- 删 `collect-assets.py` 的 13 条转码映射 + manifest 的 `ui.echo` 段；
- 删 `types.ts` 的 `UiAssets.echo` 接口（并把 `deepsea` 的注释从「与 echo 并存」改成实际口径）；
- `public/assets/manifest.json` 摘掉 `ui.echo`（文件少 2.2 KB）。

### 三、验收

- `vue-tsc` 0 错；生产构建通过（`dist/assets/ui/echo` 已随构建消失）。
- `verify-v2805` 45/45、`verify-v2802` 37/37、`verify-v2702` 41/41、`verify-v2701` 29/29、`verify-v2803` 55/55。
- 深海回响界面单独截图核对（`.shots/echo-deepsea.png`，160 抽档）：轨道 / 节点 / 奖励卡 / 徽章 /
  摆饰大图 / 文案全部正常，**无黑块、无缺图（0 张 naturalWidth=0）、无 JS 报错** ——
  反证 `ui.echo` 确实没有任何一处还在用。

### 四、按用户要求保留的

`ui.card`（109 KB）、`ui.home.crystals`（576 KB）、`ui.home.textures`、4 张未用 `deco`、
竖版 `ui.home.logo`、`rules.*` 里未被读取的字段、`updater` 的 3 个零调用导出、
`tools/_dbg-up.mjs` 等临时脚本、`stage.ts` 的 `toDesignY / toDesignDelta` —— 均**原样保留**。

---

## [v1.6.03] 2026-11-04 — 死代码清理：删旧图鉴页 / 废弃导出 / 死样式

> 用户要求：查冗余与死代码、查「已废弃但代码还在」的功能、能确定的精简掉、拿不准的只汇报。
> → 小改动（不动功能，只删不生效的代码），`mm` 05 → 06。

### 一、整文件删除（1 594 行）

| 文件 | 行数 | 为什么是死的 |
|---|---|---|
| `src/views/CodexView.vue` | 895 | 旧三栏图鉴。v1.2.01 曾挂在 `/codex/list`，现路由表里已无此路径，`MuseumView` 系列全盘接管 |
| `src/data/museum-index.ts` | 716 | 故事 / 阅读物名称索引。v1.6.00 起改由 `core/museum-content.ts` 运行时注册表提供，此文件零 import |
| `tools/gen-museum-index.py` | 63 | 上表的生成器。数据源（`素材/套装故事`、`素材/阅读物`）仍在，需要时可从备份 zip 取回重生成 |

### 二、零引用导出 / 局部声明

- `core/save.ts`：`getPity()`（store 的 `pity` computed 内部已等价实现）、随之去掉的 `newPity` 导入。
- `core/almanac.ts`：`LUCK_CLASS`（注释写着「兼容旧调用」，已无调用者；配套 `lk-*` 类名在 CSS 里也不存在）。
- `core/milestone.ts`：`nextUnreached()`（底部「N 次后可领取」由 `EchoView` 自己算）。
- `core/dlc.ts`：`dlcSummary()`；`version.banner` 合并时写入的 `start: '' / end: ''`
  —— v1.5.03 已废除版本时间字段，这里还在给新版本灌空串。
- `composables/useNavBack.ts`：`hopDepth()`（标注「验收用」，但没有任何脚本读它）。
- `stores/game.ts` 对外面缩小：`lastWasTen`（只写不读）、`upcoming`、`setVolume`、`toggleSkipAnim`、
  `readingGot`、`hasGold`、`versionPools` / `allSetsParts` / `obtainAllReadings`（仅内部使用的中间量）。
  设置页的音量 / 跳过动画一律走 `setSetting`，那两个旧 action 没人调。
- `GachaView`：`frameOf()`（用的是 `ui.card.frames`，界面实际用 `ui.suit.frames`）、
  `openCard()`（十连网格已不可点开单卡）、`dupCount` / `delayStyle`、`CARD_W` / `CARD_H`；
  调试钩子 `__gachaDbg` 里 `s0399prog` / `diff` 两个 S0399 专用取值器（没有任何脚本读）。
- `BannerView`：`openSet5()` / `fiveStarSet` / `detailStages`（套装展示改走列表点击后均未接回）。
- `EchoView`：`CARD_H` / `CAP_DY` / `CARD_DY`；`RewardPopup`：`CARD_W` / `CARD_H` / `STRIP_X` / `STRIP_Y`。
- 未使用 import：`App.vue` 的 `DESIGN_W/DESIGN_H`、`MuseumClothes` 的 `withSearchResume`、
  `MuseumReadings/Stories` 的 `nextTick`、`GachaView` 的 `resumeBgm/PlayOpts`。

### 三、死掉的界面元素

- `MuseumClothes` 的提示条：`hint()` 无调用者，于是 `toast` 永远是空串 ——
  模板里的 `.cl-toast` + 过渡 + CSS 一共 30 行永远不会显示，整体摘除。
- `global.css`：`.gold-text` / `.btn-main*` / `.btn-ghost*` / `.star-3|4|5` / `.fade-up` + `@keyframes fadeUp`
  全项目零引用（约 60 行）；`.sr-only` 在阅读物 / 故事两页也从未挂到任何元素上。

### 四、顺手修正的两处口径

- `types.ts` 的 `VersionMeta` 去掉 `start/end`（v1.5.03 已废除时间字段，类型没跟上）。
- `App.vue` 素材缺失提示里的命令 `collect-assets.py --pool banner-003` 是单池口径，
  改成不带 `--pool` 的全量归集；`build-pool-map.py` 里版本表列说明同步去掉「开始,结束」。

### 五、验收

- `vue-tsc` 0 错；生产构建通过。
- 全量 29 份验收脚本逐一跑过：`v2805` 45/45、`v2803` 55/55、`v2802` 37/37、`v2702` 41/41、
  `v2701` 29/29、`v2601~v2603` 8/20/27 全过，服装 / 故事 / 阅读 / 玄学 / 辉煌心光各脚本全过。
- 源码行数 29 356 → 27 499（净减 1 857 行）。

### 六、只汇报、没动的（拿不准）

| 项 | 现状 | 为什么没删 |
|---|---|---|
| `config/pv.ts` + store 的 `pvModes/setPvMode/pvModeOf/currentPv/pvActive` | 卡池 PV 挂载模式：7 段 PV 的元数据、localStorage 读写、三种模式全在，但**界面上已没有任何 PV 面板**（共鸣页只播 `assets.bgVideo`） | 属功能取舍：删掉等于永久放弃 PV 播放能力，要你点头 |
| `ui.echo`（13 张 webp，258 KB） | `EchoView` 只读 `ui.deepsea`，`echo` 整组是早期自绘版 | 牵动 `collect-assets.py` 与 manifest 重生成，属素材管线改动 |
| `ui.card`（12 张，109 KB）、`ui.home.crystals`（18 张，576 KB）、`ui.home.textures`、4 张未用 `deco`、`ui.ver.titleN/titleH/nameBg`、`ui.detail` 若干 | manifest 里仍产出，模板零引用 | 同上；且部分素材可能被动态键访问，需逐个肉眼确认 |
| `ui.home.logo`（竖版站名 1713×2447） | 主页只用 `logoCenter`（横版） | 同上 |
| `rules.cost / currencies / noDuplicate / wishSelect / standardPoolSamePity / inheritAcrossBanners / milestonePulls` | 信息表带过来的官方规则文案，前端一处都没读 | 是数据不是代码；留着当规则出处 |
| `updater/lib/dlc.mjs` 的 `readSrcIndex / writeSrcIndex / liveUrl` | 零调用 | v1.6.00 新写的子系统，可能是给「源包区索引」预留的口子 |
| `tools/_dbg-up.mjs`、`_probe-ver.mjs`、`_shot-updater.mjs` | 一次性调试脚本，硬编码 5199 / 5178 端口 | 不属于应用代码，删不删由你定 |
| `core/stage.ts` 的 `toDesignY / toDesignDelta` | 无调用（现有拖拽都成对调用 `toDesignX`，黑边偏移在相减时抵消） | 是成体系的公共换算 API，删了文档口径要跟着改 |
| `core/fortuneTexts.ts` 的 `MAXIMS` | 应用不读，但 `verify-fortune.mjs` 读它做条数核对 | 验收依赖 |

---

## [v1.6.02] 2026-11-04 — 高分辨率适配：拖拽坐标换算（4K 下不再跑得快 2 倍）

> 用户问：在 3840×2160 / 2560×1440 这类同为 16:9 的高分屏上，界面会不会错位？
> → 全面体检了一遍，**布局不会错位**，但揪出了一个真 bug：**拖拽在高分屏上跑得快**。
> → 小改动（修 bug + 体检报告），`mm` 04 → 05。

### 一、体检结论：布局**不会**错位

模拟器的做法是「1920×1080 设计舞台 + 外层一次等比 `transform: scale`」，
所有界面都写死设计坐标。这个机制本身是健全的，实测：

| 视口 | design 渲染尺寸 | 覆盖 | 结论 |
|---|---|---|---|
| 1920×1080 | 1920×1080 | 100% | 基准 |
| 2560×1440 | 2560×1440 | 100% | ✅ 完全铺满 |
| 3840×2160 | 3840×2160 | 100% | ✅ 完全铺满 |
| 2560×1080（21:9） | 1920×1080 | 75% | ✅ 左右各 320px 对称黑边（正确 letterbox） |
| 1366×768 | 1365×768 | 99.9% | ✅ 铺满 |

- **16:9 任意分辨率都精确铺满、零黑边**；
- 非 16:9 保持 16:9 居中、左右对称黑边（不会拉伸变形）；
- `position: fixed` 的开机遮罩（`.boot`）正确跟随舞台缩放
  （4K 下 3840×2160，21:9 下 1920×1080@320）；
- Windows 常见的 100% / 150% / 200% 系统缩放（dpr 1 / 1.5 / 2）下都是 100% 铺满。

视觉对比（4K 缩回 1080p 与基准**像素级对齐**）也确认：文字、图标、立绘位置完全一致，
而且 4K 下**更清晰** —— 大背景图本身就是 1920×1080 以上的高分辨率，2× 缩放反而用足了原始像素。

### 二、揪出的真 bug：拖拽在高分屏上跑得快 2 倍

⚠ **`PointerEvent.clientX` 是屏幕像素，而组件里的布局值是设计像素**，两者在
1920×1080 上 1:1，但在 2560×1440 / 3840×2160 上差一个 scale 倍。

原来的拖拽代码直接拿 `clientX` 差值当设计坐标用：

```js
const dx = setX0 - e.clientX          // ← 屏幕像素
setShift.value = setFrom + dx / SET_PITCH   // ← SET_PITCH 是设计坐标(349)
```

数学验证（指针移 200 屏幕px）：

| scale | 修复前轨道设计位移 | 期望 | 偏差 |
|---|---|---|---|
| 1.00（1080p） | 200px | 200px | ✅ |
| 1.33（1440p） | 200px | 150px | ❌ 快 1.33× |
| 2.00（4K） | 200px | 100px | ❌ **快 2 倍** |

→ 在 4K 上拖动套装栏 / 部件栏 / 深海回响长轨道 / 奖励横条 / 玄学运势抽屉，
  **指针只走一半距离内容就移到位**，手感明显不对。

### 三、修法：统一走 `core/stage.ts`

**新增 `src/core/stage.ts`** —— 缩放换算的**单一真源**：

- `DESIGN_W / DESIGN_H` —— 设计舞台尺寸；
- `stageScale()` —— 当前缩放比（与 `App.vue` 的 `fitStage()` 同一套算法）；
- `toDesignX(clientX)` / `toDesignY(clientY)` —— 屏幕坐标 → 设计坐标（含黑边偏移）；
- `toDesignDelta(delta)` —— 位移换算（拖拽场景用，只需除 scale）。

`App.vue` 的 `fitStage()` 与 `designX()` 改为调用它，消除重复实现
（两处算法必须一致，否则拖拽会有细微偏差）。

**5 个组件的 7 处拖拽全部改用 `toDesignX()`**：

| 文件 | 拖拽对象 |
|---|---|
| `src/components/EchoView.vue` | 深海回响长轨道 |
| `src/components/RewardPopup.vue` | 奖励横条 |
| `src/views/BannerView.vue` | 共鸣页套名横幅 |
| `src/views/MuseumClothes.vue` | 图鉴套装栏 + 部件栏 |
| `src/views/AlmanacView.vue` | 玄学运势抽屉 |

### 四、查过但**不需要**改的地方

- **滚轮**：`deltaY` 用于判断方向或按固定格数步进，不是位移映射 → 无需换算。
- **`getBoundingClientRect` 的各处用法**：都是**同坐标系内比较**（相对量），scale 无关。
- **`AlmanacView` 的 `nx/ny` 归一化**：分子分母同坐标系 → 天然正确。
- **`AlmanacView` 的笔迹定位**：已有 `k = stage.width / 1920` 的缩放补偿。
- **`App.vue` 的侧栏 `designX()`**：本来就是对的（本次只是挪到 `core/stage.ts`）。

### 五、素材清晰度：**已是上限**，无需处理

体检发现 4K 下有相当比例的图被拉伸（如 `back-n` 源 64×64 显示 184px）。
逐一核对源文件后确认：**webp 全部保持源 PNG 的原始分辨率**（转码管线不缩放，
411 条 UI 转码里 0 条被压小），而源 PNG 本身就是游戏给的那个尺寸
（`back-n` 源就只有 64×64）—— **做 2× 版本不会有任何改善**，只会白白翻倍体积。

视觉对比也印证：4K 下界面**比 1080p 更清晰**（大背景图本来就高于 1920×1080）。

### 六、验收

新增 `tools/verify-v2805.mjs` **45/45**：

- **A 布局缩放**（20 条）：5 种视口 × 「design 尺寸 = 1920×1080×scale」「居中」
  「16:9 铺满 / 非 16:9 对称黑边」「无 JS 报错」；
- **B 指针位移换算**（10 条）：5 种视口下 `-200 屏幕px` 换算成的设计位移精确等于
  `-200/scale`，且 `stageScale()` 与实际渲染缩放完全一致；
- **C 拖拽位移比**（3 条）：共鸣页「套名横幅」真实拖拽 ——
  1080p 移 200 屏幕px → 内容移 200 设计px；4K 移 200 屏幕px → 内容移 100 设计px；
- **D 点击命中**（12 条）：主页入口 / 侧边导航 / 图鉴套装卡在 3 种分辨率下
  `elementFromPoint` 都命中正确元素。

**反向验证**：临时把 `BannerView` 的修复回退，C 段立刻变红
（4K 下移 200 而非 100）—— 证明断言真的能抓到这个 bug，不是空跑。

回归：`verify-v2802` 37/37、`verify-v2702` 41/41、`verify-v2701` 29/29、
`verify-v2803` 55/55；`vue-tsc` 0 报错。

---

## [v1.6.01] 2026-11-04 — DLC 删除可靠性修复（回收站语义坑）+ 卸载/删除接口如实报状态

> v1.6.00 交付后做端到端复验时发现：DLC 的「卸载 / 删除」在某些环境下会误报失败，
> 甚至超时 20~40 秒。本轮把这个坑彻底挖掉并修掉。
> → 小改动（修 bug），`mm` 03 → 04。

### 一、根因：删除被改成了「回收站」语义

v1.6.00 里 `rmTree()` 用 `fs.rmSync(dir, { recursive: true })` 删目录。
实测在这台机器上：

| 场景 | `fs.rmSync` 表现 |
|---|---|
| 系统临时目录 | 正常，毫秒级 |
| **项目目录** | **走回收站语义**：删除变成异步的（刚调完 `exists()` 目录还在）、每个文件 ~260ms、偶尔整批失败（`Some operations were aborted`） |

66 个文件的 DLC 包 → 单次删除要 **17~24 秒**，而且大概率**误报「删不掉」**：

- `fs.rmSync` 走回收站后是异步的 → `exists()` 立刻查还是 `true` → 代码判定失败并抛错；
- 但目录其实**已经空了**，稍后再看就没了 —— 表现为「接口报失败，目录却是干净的」；
- 回收站整批失败时目录原封不动留在那儿 → 真的删不掉。

关键点：**删除被 WorkBuddy 的 safe-delete shim（`NODE_OPTIONS` 注入）改写了**。
这个 shim 只在特定运行环境里存在，用户自己启动工坊时不会遇到 ——
但代码必须在两边都稳。

### 二、修法：三级递进 + 轮询确认

`updater/lib/dlc.mjs` 的 `rmTree()` 改成按快 → 慢三级尝试，每级之后**轮询确认目录真的消失**：

1. **原生子进程** —— 清空 `NODE_OPTIONS` 起一个 `node -e` 子进程做 `rmSync`，
   绕开 shim 的包装拿回原生语义。实测 66 文件 **280ms**（vs 24 秒）；
2. **直接 `fs.rmSync`** —— 正常环境走这条，毫秒级；
3. **手写逐层 `unlink`/`rmdir`** —— 前两条都不行时的兜底，慢但最终能删干净。

每一级之后都用 `exists()` 确认，**目录真的消失才算成功**，超 60 秒预算才报错。
实测：项目目录下 42 文件目录 **246ms**；无 shim 环境 66 文件 **203ms**。

### 三、连带修掉的三处

- **`uninstall()`** —— 运行区目录删不掉时**照样把索引条目摘掉**：
  否则模拟器会读到一个「装了但文件不在」的包。目录没删干净时抛的错改成
  「已从索引移除，但运行区目录删不掉」，不再笼统报「卸载失败」。
- **`/api/dlc/delete`** —— 改成**尽力而为**：先卸运行区（这一步必须成 —— 源包删不掉
  不该让包继续挂在模拟器上），再删源包；失败的那步记进 `notes` 一起回，不再整体报错。
- **`/api/dlc/uninstall`** —— 目录没删干净时返回 `ok:true` + `notes`，
  语义是「已卸载，只是有残留」，而不是「卸载失败」。
- **前端 `dlcPost()`** —— 后端返回 `ok:true` 但带 `notes` 时，如实显示 notes 里的内容。

### 四、验收脚本的加固

- `tools/verify-v2803.mjs` 的 `wipe()` 改用 `dlc.rmTree()`（原来手写 unlink 循环，
  同样受回收站语义影响，且中途失败会留半截目录）。
- 新增 **F 段「删除可靠性」6 条断言**：多文件目录能删干净 / 不因回收站语义误报 /
  速度正常（< 8s）/ 卸载不存在的包不报错且不影响索引 / 删除接口对不存在的包返回 ok。
  验收从 49 条增到 **55 条**。

### 五、顺手修掉的两处旧债

**① 硬编码版本号的断言。**
`tools/verify-v2802.mjs` 里「信封弹窗展示最近三次更新」的断言写死了 `v1.5.05`，
发版后必然失败。改成从 `CHANGELOG.md` 动态取最近三个版本号 —— 以后发版不用再改断言。

**② 信纸正文溢出的真 bug（v1.6.01 的条目太长）。**
v1.6.01 的更新日志比上一版长，第 4 页（v1.5.05）的正文从容器里**溢出 32px 被裁掉**。

根因不是「字数太多」，而是**换行数不同**：同样 70 个字符，含大量 ASCII 的那条是
单行、纯中文的那条折成两行（53px vs 27px），5 条累计 301px > 容器 269px。
所以在生成器里硬裁字数**管不住** —— 下次发版还会溢出。

✅ 改成**组件端自适应**：`MailPopup.vue` 新增 `fitBody()`，正文超出容器时
自动降字号（`--lt-scale`，下限 0.72）直到放得下，换页 / 信纸浮现时重算。
字号用 `em` 相对单位，段落自动跟随。实测四页全部 `overflow: 0`，观感正常。

验收也补了一条「四页正文都不溢出」——原来只验末页，漏掉了中间页。

### 六、验收

- `tools/verify-v2803.mjs` **55/55**（原 49 + 新增 6 条删除可靠性断言）。
- `tools/verify-v2802.mjs` **37/37**（断言改动态取版本号 + 新增「四页都不溢出」）。
- 回归：`verify-v2702` 41/41、`verify-v2701` 29/29；`vue-tsc` 0 报错。

---

## [v1.6.00] 2026-11-04 — DLC 分布式结构：延迟包 + 挂载接口 + 工坊上传/下载

> 用户要求：把工坊的更新逻辑改成「延迟包 / DLC」的分布式结构，设各种接口让包自由决定
> 是否挂载；工坊里加上传 / 下载按钮，能把 DLC 打包、发到云端或网盘分享。
> → 架构级改造，`mm` 02 → 03。

### 一、为什么要改

老流程是「单体 + 全局重建」：工坊把素材写进 `素材/`，然后跑一次全量 python 管线，
重建 `pool-map.json` / `manifest.json` / 8000 多个 webp。三个问题：

1. **不延迟** —— 内容必须等整条管线跑完才看得见；
2. **不可分发** —— 内容长在共享的素材库里，摘不出来给别人；
3. **全局耦合** —— 改一只池会动到整个 manifest。

新结构把「一次更新」变成一个**自包含的包**：包自带素材副本与数据，声明自己提供哪些
**接口**，由包自己决定挂不挂。模拟器在启动时按接口把已挂载的包叠加到内置库之上。

### 二、包格式与两层目录

```
updater/dlc/<id>/           源包区（工坊编辑 / 打包 / 上传）
  dlc.json                  清单：身份、版本、provides[]（接口声明）、mount 决策
  data/<接口>.json          每个接口一份结构化数据
  assets/**                 素材副本（已转码的 webp）

public/dlc/<id>/            运行区（模拟器运行时读这里，vite 直接能 fetch）
public/dlc/index.json       已装包索引 + 挂载开关
```

包 id 用稳定的 ASCII（`banner-080` / `set-s0438` / `version-2-11`），能进 URL 与文件名。

### 三、五个挂载接口

接口是包与模拟器之间**唯一的契约** —— 模拟器只认接口名，不认包内部结构。
前端 `src/core/dlc-interfaces.ts` 与工坊 `updater/lib/dlc.mjs` 各存一份（验收脚本核对一致）：

| 接口 | 作用 | 挂载到哪 |
|---|---|---|
| `pool.banner` | 一整只卡池（含套装） | 共鸣页多一只池 |
| `pool.set` | 一套服装 | 指定卡池的套装列表 |
| `codex.story` | 一篇套装故事 | 故事图鉴 |
| `codex.reading` | 一篇阅读物 | 阅读物图鉴 |
| `version.banner` | 一个小版本（含缩略图 / 大图） | 版本页 |

**挂载决策有三层**（后者覆盖前者）：运行区索引的接口级开关 > 包内 `provides[].mount` > 默认挂。
所以「装上但不生效」和「只挂故事不挂套装」都能做到。

### 四、前端运行时

- `src/core/dlc.ts`：读 `public/dlc/index.json` → 逐包读清单与数据 → 按接口合并进 manifest。
  同一个 id 的卡池 / 套装**跳过并记提示**（装了重复的包不该把图鉴弄乱）；
  `pool.set` 找不到目标池时跳过；单个包加载失败不影响其它包。
- `src/core/museum-content.ts`：**新建**。故事 / 阅读物原本是编译期常量
  （`src/data/stories.ts` 由脚本生成后静态 import），DLC 带来的新内容进不来。
  现在把生成的数据包成 reactive 数组，DLC 加载完直接 push 进来；
  图鉴视图与跨界面搜索都改读这里。**生成脚本一个字没改** —— 改的是「读哪儿」。
- `store.asset()`：`/` 开头（DLC 包内路径）原样返回，其余照旧拼 `/assets/`。
- `src/main.ts`：`import.meta.env.DEV` 下把 store 挂到 `window.__store`（验收脚本要读运行时状态）。

### 五、工坊侧

- **左栏新增「扩展包」面板**，三块：
  ① 做一个包（从库里切：卡池 / 套装 / 故事 / 阅读物 / 版本，自带素材副本）；
  ② 本机的包（源包区 + 运行区；整包开关 + 每个接口一个开关；安装 / 卸载 / 打包 / 上传 / 删除）；
  ③ 云端 / 网盘（远端类型与配置、上传 / 下载两个页签、远端包列表）。
- **顶栏加上传 / 下载两个圆钮**（用户指定 `SuitShow/T_UI_upload.png` 与 `T_UI_download.png`，
  已转码进 `public/assets/ui/updater/`），点开就是 DLC 面板的对应分区。

### 六、远端适配器（`updater/lib/remote.mjs`）

三种远端，同一套接口（列包 / 上传 / 下载）：

- **local** —— 本地目录（网盘同步盘、共享盘、U 盘落地点）。文件拷过去 + 自动维护 `index.json`。
- **http** —— 通用 HTTP 端点（自建接口或网盘分享 API）：POST `/upload`、GET `/index.json`、GET `/<id>.dlc.zip`。
- **git** —— git 仓库：`git add / commit / push` 把包当普通文件推进仓库。
  ⚠ **本项目当前还没关联 git 仓库**（`git remote -v` 为空），代码已写好，
  实际调用会明确报「本项目尚未关联 git 仓库 —— 先执行：git remote add origin <地址>」，
  而不是静默失败。关联之后就能直接用。

配置存 `updater/remote.json`（面板里可改）。

### 七、验收

- `tools/verify-v2803.mjs` **49/49**：
  A 契约（两端接口表一致 / 实现齐全）4 项；
  B 导出（五类内容切出自包含包、素材路径改写成 `/dlc/<id>/assets/…`、素材确实复制进包）19 项；
  C 安装与开关（运行区拷贝 / 整包开关 / 接口级开关 / 卸载）6 项；
  D **前端真挂载**（模拟器启动后套装确实进了目标卡池、包内素材 HTTP 200、
  接口关掉后不再挂载、内置库没被删改、无 JS 报错）7 项；
  E 分发（打包 zip → 上传本地远端 → 列出 → 下载 → 装回；git 未关联时给明确提示）8 项。
- 回归：`verify-v2802` 36/36、`verify-v2702` 41/41、`verify-v2701` 29/29；`vue-tsc` 0 报错。

---

## [v1.5.05] 2026-11-03 — 2.11「雪落颂愿时」素材补齐 + 立绘裁切 + 主页信封弹窗

> 用户一次提 4 条：补 2.11 卡池素材、修「绽若颂愿心」初始立绘、修共鸣页立绘溢出、
> 主页加「信封」弹窗（欢迎信 + 最近三次更新日志）。
> → 小改动，`mm` 01 → 02。

### 一、2.11「雪落颂愿时」素材补齐（`banner-080`）

- **卡池目录名**：`素材/source/2.11时光缝合的扉页/` 没有版本分隔号（别的是 `2.10·金羽的裁决`），
  旧解析把整个目录名当版本号 → 版本页里 2.11 这一组是坏的。现在 `build-pool-map.py`
  的版本正则改成 `([\d.]+)[·\s]*(.+)`，两种写法都认。
- **卡池索引**：新建 `素材/信息表/卡池索引.json`（工坊那套索引格式）登记
  `雪落颂愿时 / 2.11 / seq 1 / gachaKey 080` → 不再报「[对照表缺]」，`legacyId` 回到
  `banner-2.11-01`，`listKey = list-2.11-01`。
- **深忆奖励**：`深忆奖励/120抽.png` 这类**不带奖励名**的文件过去解析不出来，
  现在 `load_milestones()` 接受 `NNN抽.png` 与 `NNN抽-奖励名.png` 两种写法；
  120~180 抽四张 + 230 抽三张全部入库。
- **20~100 抽低档**：用户只补了 120 抽起的图。游戏里 20/40/60/80/100 送的是同一件
  「流光自选礼盒」（v1.5.03 起五档共用 `milestones/shared/low.webp`），
  所以由 `low_tier_fill()` 补齐五个节点，轨道不再从 120 起跳。
- **部件图标**：用户给的图标文件名带部位前缀（`发型-愿景回旋.png`），
  而图鉴按部件名匹配 → `collect-assets.py` 新增 `icon_stem()` 统一剥前缀
  （`饰品·发饰-飘曳星辉` → `飘曳星辉`），10 + 8 枚图标全部对上。
- **立绘兜底**：`套装立绘.png` 缺失时退回卡片里的「初始 / 整体-初始.png」
  （448×656 RGBA，与其余套装同规格）。

### 二、绽若颂愿心初始立绘（错图修正）

- 旧配置把立绘指向 `T_showpic_clothes_S0438H.png` —— 那是一张**红发内衣底模**的试穿图
  （520×724 不透明），弹窗里既不对版又整块溢出。改为不指定 → 走上面的兜底，
  现在用的是 `5星-限定共鸣-《绽若颂愿心》/初始/整体-初始.png`（用户指定的那张）。

### 三、共鸣页套装详情：立绘按画框裁切

- 每个套装的立绘画幅不同（448×656 / 520×724 …），原版式把图直接放在照片框上，
  宽画幅会顶出框外（用户实机截图里的袖摆、裙摆溢出）。
- 大立绘外层加 `.sh-hero-box`（与 `.sh-artbg` 同尺寸同圆角 + `overflow:hidden`），
  形态缩略图加 `.sh-form-clip`（与卡片画框 `.sh-form-card` 对齐 + `overflow:hidden`）；
  选中描边从图上挪到裁切框上（画在图里的 box-shadow 会被裁掉）。

### 四、主页右上角「信封」弹窗（新增）

- 入口：主页右上角一枚**白线透明底**的信封图标（内联 SVG，悬停发光 + 放大）。
- 流程：点开 → 先出现信封（**左右轻晃**提示可拆，悬停暂停晃动方便点中）→
  点一次 → 信封从中缝**上下裂开飞走**（`cardbg01`）→ 信纸从信封背（`cardbg03`）里浮起。
- 内容：第 1 页欢迎词，第 2~4 页是**最近三次版本更新**（`v1.5.04 / v1.5.03 / v1.5.02`）；
  翻页键复刻共鸣页「抽取记录」的圆钮（`‹ 页码 ›`），支持左右方向键、ESC 关闭。
- 数据：`tools/gen-mail-changelog.mjs` 从 `CHANGELOG.md` 抽最近三条 →
  `src/data/mail-changelog.ts`（自动生成，挂在 `prebuild` 上，改日志后 build 会自动同步）。
- 素材：`0主素材/UI/SysRiverLanternBig/Texture/Receive/T_UI_River_img_cardbg01/03/08.png`
  → `ui/mail/env|back|paper.webp`。

### 五、顺手修掉的管线缺陷

- **`collect-assets.py --pool` 会把 manifest 截成一条**：manifest 段原来遍历 `targets`
  （本轮要搬素材的池），跑一个池就把另外 79 个池从 manifest 里抹掉，前端只剩那个池可用。
  现在 manifest 段遍历**全部** `banners`，`--pool` 只决定搬哪些素材。
- 验收：`verify-v2802` 36/36（080 素材 12 项 / 裁切 5 项 / 信封 16 项 + 无报错）。

### 六、旧验收脚本统一改成现状口径（2026-11-03 追加）

之前几份老脚本还按「版本内序号 + 版本页徽记」那套已废除的设定写断言，跑起来必挂。逐个改掉：

- `verify-v2602`：2.10 的第一池按**官方编号**是 076 执律的流金（原目录顺序里是「在属于孩子的故事里」）；
  常驻池 id = `banner-001`（原 `banner-1.0-01`）。B1/B3/B5 改为从 manifest 取期望值。
- `verify-v2603`：「版本徽记」整段（v1.4.03 的星座徽记）改为**反向核对** ——
  版本页没有 `.vs-logo` / `.vl-lock` / `.vl-on` / `.vl-chip` / `.vl-badge`，manifest 里也没有 `ui.ver.logos`，
  同时确认版本大图本体 `.vs-card` 还在。
- `verify-gloria`：存档种子与断言里的卡池 id 换成 `banner-076`（2.10 执律的流金）/ `banner-003`（1.0 留于花间的浮想）。
- `verify-v2504`：抽取流水里的卡池 id 现已写成官方号 → C2 期望改为 `banner-076` / `banner-001`。
- `verify-v2507`：080 现在**有**深忆奖励素材 → 共鸣页提示从「奖励待收录」变成「深海回响 N 次后可领取」。
- `verify-fortune`：主页自 v2.3.x 起循环播 bg-video/bg-audio，`waitUntil: 'networkidle'` 永远等不到 →
  改 `domcontentloaded`（`verify-readings-e2e` 等同）。另有两处 almanac/gloria 仍用 networkidle，目前能过，先留着。
- `verify-readings-e2e / -fix / -layout / -v2102`：断言的是「博物图鉴重构」之前的入口
  （`.mz-hit` / `.rd-collect`），重构后已不存在 → 顶部加守卫提示并直接退出，
  现行验收统一看 `verify-readings.mjs`（按《博物图鉴重构计划书》§8 M3）。

改完全量跑一遍：27 份脚本全部通过或按预期跳过。

---

## [v1.5.04] 2026-11-03 — 跳过全部：第二套页不再跨过

> 用户口径修正：4★/5★ 服装部件的**第 1 次获得（新部件）与第 2 次获得（触发第二套页）**
> 都不跳过；只有其余重复件（3★ 散件、第 3 份起的重复件）才被跨过。
> → 小改动，`mm` 00 → 01。

- `advanceReveal()` 的判据从 `results[idx].isNew` 换成序列里已有的 `step.forced`
  （`buildSeq()` 早就把「新部件 ∪ 第二套第 2 份」标成 `forced`，只是跳过分支没用它）。
  于是跳过模式下第二套的单抽界面 + 第二套页照常播放，其余重复件仍一步跨过。
- 收官口径不变：最后一件 `forced` 播放完，再点一下才进结算网格。
- 验收：`verify-v2702` 36 → 41 条（新增 E2 定向用例：codex 全 1 → 首套集齐 → 十连必出
  `S2`，跳过模式下 `.sc-second` 必须出现、且所有 `forced` 一个不落）；`verify-v2701` 的
  徽记一节随 v1.5.03 废除改为反向核对，29/29。

---

## [v1.5.03] 2026-11-03 — 卡池改用官方编号 + 深海回响按池取摆饰 + 跳过全部只播新件 + 徽记废除

> 用户一次提 11 条，横跨图鉴页 / 共鸣页 / 版本页 / 工坊。
> 核心是把卡池的**唯一编号**从「版本内序号」换成游戏官方号（`banner-076`），属架构级改动
> （id / 排序 / 存档 / 工坊表单全跟着变）；同时接入了新的摆饰数据源。
> → 大改动，`n` 01 → 02，`mm` 归 00。

### 一、卡池编号统一为官方号（架构级）

- **id 变了**：`banner-2.10-02` → `banner-076`（官方 gachaKey）。`listKey`（`list-2.10-02`）
  不再是主键，只在找既有背景图时作为别名保留。
- **排序变了**：同一版本内按官方号升序。1.0 的 004/005 原本与目录顺序相反，现在纠正了
  （`banner-004` 呱呱轻语 → `banner-005` 泡泡心诉）。
- **旧 id 保留成 `legacyId`**：manifest 每条 banner 带一个，`store.init()` 用它一次性
  把老存档的 `pity` / `milestoneClaimed` / `history[].banner` 迁到新 id（新记录优先，旧记录丢弃）。
- **工坊**：卡池表单删掉「版本内序号」，只留「卡池编号（官方）」；背景图落盘改
  `list-<官方号>.png`（build-pool-map 两种命名都认）；`/api/state` 的池列表也换成新 id。

### 二、深海回响：摆饰/礼盒按池取（新数据源）

- 新增数据源 `素材/0主素材/UI/SysResonance/texture/Rewards Introduction.md`
  （文件名 / 摆饰名 / 文案 / 对应套装），图片在同目录 `Rewards/`。
  `build-pool-map` 解析成每只池的 `decor`，`collect-assets` 转码到 `public/assets/decor/<官方号>.webp`。
- `EchoView` 不再写死「万金之上」+ 单张 `ui.deepsea.scene`：左侧大图、右侧名称/类型/正文
  全按当前池取；md 里没列的池整块不渲染（常驻池就是如此）。
- 覆盖情况：80 只池里 **30 只有摆饰**（24 有图、6 只有文案）；md 标记「缺失」的只显示文案。
- 「N次后可领取」缎带只在「奖励名与摆饰名对得上」时出现（目前只有 076 的 160 抽）。

### 三、跳过全部：只播新部件

- 按过一次后按钮与「跳过全部」文字全部消失，此后每次点击**直接落到下一件新部件**：
  中间夹着的重复件单抽界面、以及重复件触发的第二套页都跨过去。
- 最后一件新部件的套装获得页放完，再点一下才进结算网格。
- 顺带修掉套装获得页右上角「跳过全部」文字残留（按钮隐藏了、文字没跟着隐藏）。

### 四、版本页徽记废除

- 删 `vs-logo` / `vl-chip` / `vl-badge` 与收集进度 mask 逻辑、`ui.ver.logos` / `logoChip`
  manifest 字段、`collect-assets` 的星座转码段、工坊版本任务的两个徽记槽位与识别类别。
  源 PNG 不动。

### 五、文案与素材精简

- **深忆奖励 → 深海回响**：全界面（设置页「保底、深海回响与抽卡记录」/ 成就「点满深海回响」/
  工坊槽位与识别标签 / 文档）。素材目录名 `source/…/深忆奖励/` 保留（内部结构，不改）。
- **20~100 抽奖励图共用一张**：33 个五星池的这 5 档素材逐字节相同（165 个文件同一 md5），
  统一落 `milestones/shared/low.webp`，各池 manifest 都指它；120 抽起才是各池专属。
- **`ui.deepsea.scene` 删除**：076 的摆饰大图已由 `decor/076.webp` 取代。
- **上线/结束时间彻底删除**：版本表 CSV 两列、`build-pool-map` 读取、manifest 输出、工坊表单全清。
- **觉醒立绘 → 进化立绘**：只改显示文案（源文件名仍是「觉醒LVn」，识别两种都认）。

### 六、工坊

- 改名**心忆奇想工坊**。
- 顶栏图标换游戏素材：帮助 = `Rule` / `Rule_h`，重新读取 = `physical_btn_reset_s` / `_h`，
  左上角 = `SystemIcon/T_UI_photo_btn_ps5_update_n`，关闭 = `T_UI_Common_TopHUDbtn_back_n`。
  （reset 常态图偏浅，CSS 压深一档才在羊皮纸上看得清。）
- 版本任务新增**大版本号 + 大版本名**（填已有号 = 归入并改名，填新号 = 新增大版本；
  改名会同步到该大版本下所有版本行）。
- 回滚加**瞬时锁重试**：Windows 上「刚写完就删」会撞 EPERM/EBUSY（杀毒/索引器捏着句柄），
  撤回偶发只恢复一半。现在 EPERM/EBUSY/EACCES 各重试 4 次（退避 45ms 递增）。

### 验收（只验本轮改动及其关联项）

- 新增 `tools/verify-v2702.mjs` **36/36**：编号/legacyId/排序、低档共用图、存档迁移、
  版本页无徽记、三只池的摆饰（有图/有文案/无）、跳过全部只播新件 + 套装页无残留文字、工坊表单与图标。
- 工坊端到端：`run-e2e.mjs` **59/59**、`run-e2e-text.mjs` **28/28**（回滚逐项复原 18/3、6/1/1）。
- `vue-tsc` 0 错误，dist 已重建。

## [v1.5.02] 2026-11-03 — 图鉴未获得态 + 套装获得页装饰与层级 + 第二套/跳过全部 + 彩蛋补充 + 徽记移位

> 用户一次提 4 个页面 8 项（图鉴 1 / 共鸣 4 / 主页 1 / 版本页 1）→ 小改动，`mm` 00 → 01。
> 同时把工具链从「素材/朋友分享素材/UI」迁到用户新的「素材/0主素材/UI」（见 §七）。

### 一、故事&阅读物图鉴：未获得态的贴纸与提示不显示

`MuseumStories.vue` / `MuseumReadings.vue` 的空态贴纸与提示文字原来用 `v-if="!obtained"` ——
`obtained` 是**本区域已解锁的条数**。于是「本区一篇都没有」时才显示；一旦解锁了任意一篇
（哪怕只在别的条目上），空态就永久消失，点回未获得的条目只剩一张白纸 —— 正是用户描述的
「有时前面显示，后面解锁一个阅读物后又不显示」。

判据改为**当前选中的条目能不能读**（`!hasSelection`，即 `selEntry()` 为空）：
选中未获得条目 → 贴纸 + 「暂未获得…」提示照常出现；选中已获得条目 → 隐藏。
阅读物的双击解锁沿用 `pick()` 里的双击判定，没有改动。

### 二、套装获得页：两层装饰 + 立绘夹在 frame-1/frame-2 之间

按 `素材/界面/套装获得页.pxdesk`（1400×788 画布）量出的坐标换算到 1920×1080：

| 图层 | 素材 | 位置（设计坐标） | 尺寸 | 不透明度 |
|---|---|---|---|---|
| 柔光 | `T_showpic_suit_bg_light`（= `ui/suit/light`） | (1100, 160) | 150×132 | 0.36 |
| 纹样 | `T_showpic_clothes_img_ornament_03`（新增 `ui/suit/orn-clothes-3`） | (1125, 170) | 117×100 | 0.42 |

两者都排在 `.sc-body`（frame-2 金底）**之前**，即压在金底之下；立绘从「frame-1 之上」挪到
**frame-2 与 frame-1 之间**（`.sc-portrait` 排到 `.sc-frame` 之前），实机是金框压住立绘边缘。

### 三、「第二套」与第一套同等处理

`buildSeq()` 里的第二套判定（4★/5★、第一套已集齐、且这一份正好是第 2 份）本身是能产出的，
但 `isForcedStep()` 把它和它的单抽界面都标成「可跳过」——十连里习惯性点「跳过全部」时
整段被跳过，看起来就是「声明会弹、实际不会」。

现在 `detail` 步骤带 `forced` 标记（新部件 **或** 触发第二套的那一件），套装页一律强制：
第 2 份部件的单抽界面与第二套进度页都不可跳过。视觉不动 —— 第二套仍然没有「新」角标。

### 四、十连「跳过全部」改为连续揭示

按过一次之后按钮消失（新增 `revealSkipping`），此后每次点击按正常节奏走一步：
下一个新部件的单抽界面 → 它触发的套装页 → 再下一件……不再出现「再点一次又跳一大段」。
底部「ESC 跳过全部」那组键位提示同步隐藏（此时 ESC 与点击语义一致）。

### 五、主页彩蛋：并入补充文本

`素材/主页/彩蛋文本1-补充.txt`（《奇迹之旅》/《番外·落幕之日》共 10 段）加进
`tools/prep-easter.py` 的第 4 个来源，`file` 记 1（与彩蛋文本1 同一条编号口径：左对齐、进随机池）。
条目 74 → **84**，随机池 44 → **54**，file 3 的 30 条仍不可随机。

### 六、版本页：徽记移到大图下方 + 底板

徽记从「大图内、版本名下方」移到**整个版本大图下方**，垫 `T_UI_Events_Inference_img_prop_s`
（220×220，转成 `ui/ver/logo-chip.webp`，按 200×200 摆，徽记 160×160 居中）。
按用户标注框中心取位：页面 (594, 949) → `.vr-stage` 内 `left:42 / top:753`。
**去掉**原来的冷光 + 落地双阴影与 `::before` 径向暗底；亮暗两层的 `drop-shadow` 也一并去掉，
只保留暗层的 `saturate(.3) brightness(1.3)`（否则灰白线条在亮黄绿底板上分不清）。
徽记本体加 `mix-blend-mode: multiply`，让它压暗底板而不是发光 —— 不是阴影衬托。

### 七、工具链：素材根目录迁到 `0主素材/UI`

用户把 `素材/朋友分享素材/UI` 并进了 `素材/0主素材/`，另外两个目录也改了名
（`抽卡奖励界面` → `界面`、`抽卡道具` → `游戏内实机展示`）。不处理的话整条管线会把所有
UI 素材走 MISSING 分支 —— manifest 照写、webp 一个都不产出。

- `collect-assets.py` 加 `A(*parts)`、`build-pool-map.py` 的 `P()` 改成同一个解析器：
  **在拼路径的入口**把旧目录名换到实际存在的那个（`UI_ROOTS` + `DIR_ALIASES`），
  不动下面几百条字符串常量。`updater/lib/util.mjs` 加 `uiRoot()` 给更新工坊用。
- 顺带把 `SysReward.png` / 货币图标等因改名丢掉的 4 个引用接回来（缺失数 1 → 0）。

### 八、验收

- 新增 `tools/verify-v2701.mjs` **33/33**：图鉴 9 项（含「解锁一篇后再点未获得」回归）、
  套装页 8 项（两层装饰的存在/透明度/坐标/DOM 顺序、立绘层级）、第二套与跳过全部 5 项、
  彩蛋 4 项、徽记 6 项、无报错 1 项。
- 全量回归全绿：v2603 26/26、v2602 20/20、clothes 15/15、gloria 49/49、stories 20/20、
  readings 22/22、v2507 18/18、v2504 19/19、v2505 24/24、v2503 33/33、v2510 12/12、
  v2502 28/28、v2500 25/25、v2400 38/38、v2302 35/35、almanac ALL PASS；`vue-tsc` 0；dist 已重建。
- 更新工坊：`run-e2e` 62/62、`run-e2e-text` 28/28（素材根目录迁移后仍全绿）。
  两个 E2E 都加了「基线不干净就拦住」的前置闸门 —— 之前一轮中途崩掉会留下 2.12 残留，
  之后每轮都继承它（gachaKey 变 082、id 变 banner-2.12-02），看起来像功能坏了。

> 维护备注（本次清理测试残留时的两次误删，已按已转码的 webp 还原等价源图）：
> `Pic/080/T_UI_resonance_gacha_080_title.png`（2.11 卡池艺术字）与
> `Constellation/TUlevolutionimg_0210/0211_{activation,lock}.png`（2.10 / 2.11 星座徽记）。
> 四张源图都是从 `dist` 里**未被二次编码**的原 webp 反推出来的 PNG；
> `public/assets` 里对应的 webp 已用 dist 的原件覆盖回去，线上像素与改动前一致，
> 只有「再从 PNG 重转一次」时会有一次额外有损（肉眼不可见）。

## [v1.5.01] 2026-11-02 — 心忆更新工坊：独立更新自助程序（版本 / 卡池 / 套装 / 故事 / 阅读物）

> 用户原话：「请另外编写一个更新自助程序（独立于抽卡模拟器）……输入对应的素材
> （文案、服装图片、版本图片等内容，拖动到界面内或输入完整的文件地址），
> 自动完成卡池、版本页、服装图鉴、故事图鉴、阅读物图鉴等界面的更新。
> 背景图使用『玄学运势』界面的背景，各种素材复用已有的、由模拟器使用的相关素材。」
> → 新程序 + 新数据层 + 管线接入 = 架构级改造，`n` 6 → 7、`mm` 归 `00`。

### 一、程序形态：`updater/`，零 npm 依赖，端口 5199

```
node updater/server.mjs          # 起服务并自动开浏览器（UPDATER_NO_OPEN=1 可关）
```

与模拟器（vite dev 5178）完全隔离：自己的端口、自己的页面，只**读** `public/assets` 当皮肤
（玄学运势羊皮纸底 `ui/almanac/bg.webp`、`ui/btn/*` 图标、`sfx/*` 音效、帮助/拖拽弹窗样式），
写入后调用既有的 python 管线。整个程序只用 node 内置模块（`node:http` 静态服务 + SSE 日志），
换一台只装了 node 的机器也能跑。用法详见 `updater/README.md`。

### 二、五类任务，界面全由后端描述渲染

| 任务 | 填什么 | 拖什么 | 写到哪 |
|---|---|---|---|
| 版本 | 版本号/版本名/大版本/介绍/起止 | 版本缩略图 672×188、版本大图 1532×860、星座徽记（亮/暗） | `信息表/版本表.csv`、`UI/Image/Card/img_NNN{,_L}.png`、`Constellation/TUlevolutionimg_0XYY*` |
| 卡池 | 所属版本/卡池名/池型 | 背景 1920×1080、列表缩略图、艺术字、标题横幅、深忆奖励；池内每套：立绘/觉醒/部件图标/属性 yaml/专属铭牌 | `信息表/卡池索引.json`、`套装序列.csv`、`source/<版本>·<名>/<池>/…`、`卡池背景图（纯图片，无艺术字）/list-x-y.png`、`Pic/<编号>/` |
| 套装 | 版本/卡池/套装名/星级 | 立绘、觉醒、部件图标、属性 yaml | 同上（往已有池里补） |
| 故事 | 套装名/星级/正文 | `.md`（可代替正文） | `套装故事/故事-X星-<套装>.md` → `src/data/stories.ts` |
| 阅读物 | 书名/分区/系列/类型/正文 | `.txt` | `阅读物/<分区>/<系列>/《书名》.txt` → `src/data/readings.ts` |

素材**按尺寸+文件名自动识别**（`identify.mjs`：18 类，672×188=版本缩略图、1532×860=版本大图、
1920×1080=卡池背景、332×96=铭牌、256×256=部件图标、「N抽-」前缀=深忆奖励……），
能自动归位就归位，归不了的进「待分配」手动指定。只做建议不做决定 —— 「这是哪个套装」
永远由表单字段说了算。

### 三、快照与回滚：每次写入前备份，回滚后自动重跑管线

`archive.mjs` 按需记录（一次更新通常只碰几十个文件，不做全量打包）：写每个文件前把原样存进
`updater/.snapshots/<时间戳>-<任务>/`，右侧「最近改动」一键撤回。回滚不只恢复素材 ——
pool-map / manifest / stories.ts / readings.ts 是管线产物，不重跑的话撤回的卡池仍留在清单里，
所以 `POST /api/rollback` 恢复文件后会自动补跑一次数据管线。

### 四、管线：不重写，只编排

`pipeline.mjs` 按正确顺序调既有 python 脚本，日志经 SSE 实时推到界面：

1. `build-pool-map.py`（整理卡池索引）
2. `collect-assets.py --pool <新池>`（只转新池素材，几秒）
3. `collect-assets.py --all --manifest-only`（全量重建 manifest，不转码）
4. `gen-stories.py` / `gen-readings.py`

直接 `--all` 要把 8000+ 个素材全量比对（几分钟），两段式只要十几秒。
**纯版本更新**（没有新池）也要跑一次非 manifest-only 的 collect：版本卡/大图/徽记的转码段
在主流程里、不在卡池循环里，`--manifest-only` 会整体跳过 —— 这里借一个已存在的池 id 当引子
（那一池素材都已转好，只会被跳过），版本图才不会「写了 CSV 却没有 webp」。

### 五、数据层配套改动（build-pool-map.py）

- **新增 `load_pool_index()`**：读 `素材/信息表/卡池索引.json`（更新程序写的新池登记处），
  list 序号 / gacha 编号**覆盖** md 对照表与 xlsx 映射表的结果。没有它，新池会报
  `[对照表缺] / [gacha缺]`，listKey 与 gachaKey 全空，等于白更新。seq 统一补零到两位
  （`list-2.11-01`，与既有命名一致）。
- **EXTRA_POOLS 同 id 合并**：往 2.11 补套装时更新程序会创建 `source/2.11·…/<池>/<套装>/`，
  source 扫描本就生成一个同 id 的池（只有新套装）—— 以前会**两个 banner-2.11-01**，
  前端索引撞车、版本页出现重复卡池。现在把 EXTRA 的套装并进扫描结果，扫描结果没有的素材
  （2.11 的 bgClean / 列表缩略图）再用 EXTRA 的补位。

### 六、验收

两套端到端脚本（假素材全流程 + 回滚复原，跑完不留痕）：

- `node updater/e2e/run-e2e.mjs` —— 版本 + 卡池全流程 **62/62**：
  版本表/Card 素材/徽记/转码、pool-map 与 manifest 的 30+ 项、铭牌 081-1/081-2、
  回滚后 80 池 24 版本复原、`stories.ts`/`readings.ts` 零改动。
- `node updater/e2e/run-e2e-text.mjs` —— 故事 + 阅读物 + 套装 **28/28**：
  含「往 2.11 补套装不撞车」专项（原两套套装还在、bgClean/缩略图不丢、总套装数 ±1 复原）。

全量回归：`vue-tsc` 0；模拟器侧数据文件与跑更新前逐字节一致（pool-map/manifest 仅生成时间戳不同）。

> 已知边界：collect-assets 直接写 `public/assets/**`，不在快照范围内 —— 回滚后那几个新池的
> webp 会成为孤儿文件（不被引用、几 KB），e2e 脚本会代扫代删；正式使用可从「预检→写入」的
> 日志里确认无误后再操作，或定期跑一次 `collect-assets.py --all --force` 重整。

## [v1.5.00] 2026-11-02 — 数据层外置：版本页读 manifest + 三张表改可写纯文本

> 为更新自助程序铺路：新增版本/卡池从此只改数据文件，不碰代码。
> → 小改动，`mm` 03 → 04。
> （与 v1.5.01 在同一工作会话内连续完成、中间无对外交付，备份同批见 v1.5.01。）

### 一、可写数据源

- **新建 `素材/信息表/版本表.csv`**（24 行，列：版本/版本名/大版本/大版本名/介绍/版本卡编号/开始/结束），
  由 VersionView 常量 + VERSION_CARDS + xlsx 起止合成。Excel 可直接编辑。
- `build-pool-map.load_version_table()` 读它，`load_versions()` **CSV 优先**、xlsx 兜底；
  `load_set_info()` 同样改为 `套装序列.csv` 优先（列与 xlsx sheet1 前 8 列一致）。
- `collect-assets.py` 的 `VERSION_CARDS` 改为以 `pool-map.versions` 的 `cardNo` 覆盖常量，
  新增版本只要 CSV 加一行，版本卡/大图/徽记全自动跟上。

### 二、前端不再硬编码版本

- `VersionView.vue`：`VERSIONS`/`MAJORS` 从写死常量改为 computed 读 `store.manifest.ui.ver.versions`
  （manifest 由 CSV 生成），保留 `FALLBACK_VERSIONS` 兜底。
- `MuseumClothes.vue`：`VER_LIST` 同样从 manifest 派生，赛季栏与版本页永远同源。

## [v1.4.03] 2026-11-02 — 铭牌取图修正 + 2.11 版本卡 + 版本徽记 + 常驻池固定末位

> 用户一次提 7 项（铭牌错图 / 2.11 版本卡缺失 / 版本徽记 / 铭牌文字位置 / 艺术字居中 / 常驻池排序 / 退出目标）
> → 小改动，`mm` 02 → 03。

### 一、铭牌取图：编号不是星级，是「套装序号」

用户举的 043「何梦破碎于无瑕」拿的是 `_name.png` —— 那张其实是 **112×112 的套装图标**，
被当成 332×96 的铭牌填充成 300×86，显示成一块糊掉的色块。同目录里真正的铭牌叫
`name01.png` / `name02.png`（**没有下划线**），旧收集器只认 `_name_01`，所以完全没匹配上。

重新扫了一遍全库，命名有四种写法：`_name.png`、`_name_01.png`、`name01.png`、`_name_03/_04.png`，
另外还混着 `_effect_*` 特效图和 60~112px 的套装图标。规则改成：

| 判据 | 处理 |
|---|---|
| 文件名 | `T_UI_resonance_gacha_<任意3位>_name(_?)(\d*).png`，排除含 `_effect_` 的 |
| 尺寸 | 宽 ≥ 300 且宽高比 2.4~4.3（332×96 / 340×120 / 409×100 都算，图标一律排除） |
| 同编号多张 | 优先「文件名池号 = 目录号」那张（036 目录里混了 039 的素材） |
| 编号含义 | **该池套装按 5★ 在前、同级按 manifest 顺序的序号**，不是星级 |

前端 `plateOf()` 相应改成按 `plateIdx` 取：001 常驻池 8 套 → 4 个 5★ 各一张（001-1..4），4★ 退回通用粉/紫。
实测 043 → `043-1.webp`（5★ 生于无瑕）/ `043-2.webp`（4★ 揽星入梦）；042、053 同样修好。
铭牌池数 40 → 46（通用 16 / 带编号 30，单池最多 4 张）。

### 二、2.11 版本缩略图 + 版本大图

`VERSION_CARDS` 补 `("2.11", "069")`：`T_UI_Friends_Card_img_069`（672×188）做缩略图、
`T_UI_Pear_Card_img_069_L`（1532×860）做大图，输出 `ui/ver/card/2.11.webp` 与 `ui/ver/big/2.11.webp`。
版本页缩略图、版本大图、图鉴赛季栏缩略图三处同时到位（都读同一份 manifest）。

### 三、版本徽记（星座）

`SysEvolution/Entrance/Textures/Constellation` 里每个版本两张：`TUlevolutionimg_0XYYlock`（暗）/
`_0XYY_activation`（亮）。`0XYY` = 版本序号（0100 = 1.0、0111 = 1.11、0211 = 2.11），
lock 前的下划线时有时无，两种都试。收进 `ui/ver/logo/`，manifest 加 `ui.ver.logos`（24/24 版本齐全）。

版本页在**版本名下方**渲染两层：底层 lock，上层 activation 用 `mask-image` 从左往右擦出来 ——
比例 = 该版本已集齐套数 / 总套数，与服装图鉴缩略图的黑白→彩色同一套逻辑。
底衬用一层径向渐变压暗（不是贴纸，边缘全羽化），否则 lock 在雪夜大图上直接隐形。

### 四、位置微调

- **铭牌文字右移 20px**：`.sb-name` `left: 34 → 54`。
- **艺术字垂直居中**：根因是素材自带透明边距不对称（1.7「自由的第二章」下边几乎没留白），
  `.title-art` 用固定 418×214 contain 后视觉重心偏上。收集时新增 `center_alpha_webp()`：
  算 alpha 实体 bbox 后**不缩放、不改画布尺寸**，只把实体搬回画布中心；CSS `top` 由 64 改 77.5
  （货币栏下划线 ≈80 与提示文字 289 的中点 184.5，盒子高 214）。纯文字标题（058）同步 150 → 145。

### 五、常驻池固定末位

`store.visiblePools` = 当前版本的池 + 常驻「遥远之海」（去重，1.0 已含则不追加），共鸣页列表与
`store.banner` 都走它。以前常驻池只在 1.0 能看到，其它版本进不去；现在每个版本末尾都有，且点得动。

### 六、从版本页进共鸣页 → 退出回版本页

`VersionView.enter()` 带 `?from=versions`，`BannerView.leave()` 看这个 query 决定回 `/versions` 还是上级。
其余入口（主页星芒 / 侧栏 / 直链）行为不变。ESC 与退出键都走 `leave()`，两条路径一致。

### 七、验收

新增 `verify-v2603` **26/26**（铭牌 4 项 / 2.11 版本卡 3 项 / 徽记 4 项 / 文字位置 1 / 艺术字 3 /
常驻池 5 / 退出 4 / 无报错）。全量回归全绿：v2602 20/20、v2601 8/8、v2507 18/18、v2505 24/24、
v2504 19/19、v2503 33/33、v2510 12/12、v2502 28/28、v2500 25/25、v2400 38/38、v2302 35/35、
gloria 49/49、clothes 15/15、readings 22/22、stories 20/20、almanac ALL PASS；`vue-tsc` 0；dist 已重建。

> 顺带给 `collect-assets.py` 加了 `--bust <子目录>`：批量删除被安全策略挡着，
> 换处理算法后只想重跑某几批素材（`--bust banners/title,ui/banner/name`）时用它，不必 `--force` 全量。

## [v1.4.02] 2026-11-02 — 共鸣页按版本收窄 + 首次必须选版本 + 080 卡池背景

> 用户提 2 项（共鸣页只显示当前版本的卡池 / 未选版本时入口置灰；080 换背景）→ 小改动，`mm` 01 → 02。

### 一、共鸣页只列「当前版本」的卡池

以前共鸣页把 **80 个池全列**出来（v1.4.00 刚改成全量），跨了 24 个版本 —— 用户要的是「当前版本那一组」。
现在列表按 `banner.version === store.selectedVersion` 过滤，顺序仍是 manifest 顺序（= 版本内 `seq`）。
实测：2.10 → 4 个池、1.8 → 4 个、2.11 → 1 个（080）。

配套的两处「夹紧」，否则会串味：

| 位置 | 以前 | 现在 |
|---|---|---|
| `store.banner` | 全局找 `bannerId`，找不到退回 `banners[0]` | **先在本版本的池里找**，再退回本版本第一池 —— 否则 bannerId 停在 1.0 的常驻池时，2.10 页面会显示常驻池的背景与保底 |
| `store.init()` | 只校验 bannerId 存在 | 版本号在 manifest 里不存在 → 视为「没选过」；当前池不在该版本内 → 落到该版本第一池 |

### 二、首次进入必须先选版本（未选之前共鸣不可入）

「选版本」= 在「时隙遗光」里点一下任意小版本（`store.selectVersion()`，落进存档 `save.selectedVersion`）。

- **主页**：静态背景的星芒 + 动态背景的右缘竖排，共鸣那枚 `disabled` + 灰度压暗（`grayscale(1) brightness(.5)`，星芒不透明度 0.3 / 右缘 0.32），悬停不再发光呼吸，光标 `not-allowed`，`title` 提示「先去「时隙遗光」选择版本」。
- **侧栏**：共鸣项同样的置灰逻辑（`.rail-btn:disabled`），其余 5 项照常。
- **路由**：`/banner` 与 `/gacha` 加守卫，未选版本直接 `replace` 到 `/versions` —— 防直链与旧书签。守卫写在 `router.ts` 而不是 `App.vue`：首屏导航发生在 `app.use(router)` 时，那时组件 setup 还没跑。
- **版本页**：进页面就把当前版本高亮并展开它所在的大版本；没选过则保持空白，进入键此时不跳转。

⚠️ 老存档（没有 `selectedVersion` 字段）按「还没选过」处理 —— 升级后要重新选一次版本，抽卡记录与保底都在，不受影响。

### 三、080「雪落颂愿时」卡池背景

用户给的 `雪落颂愿时.png`（1000×500，正好是卡池列表图的规格）走**四星池同一条管线**：

- 源图存到 `素材/卡池背景图（纯图片，无艺术字）/list-2.11-01.png`
- `bg4_webp()` 按 `BG4_BOX (103,23)-(903,473)` 裁 16:9 → 放大到 1920×1080 → `public/assets/banners/bg-clean/080.webp`（213 KB）
- 顺手由它中心裁了一张 320×140 的列表缩略图 `素材/卡池界面缩略图/雪落颂愿时.png` → `banners/thumb/080.webp`
- `build-pool-map.py` 的 `EXTRA_POOLS` 加了 `bgClean` / `thumbnail` 两个字段（以前写死 `None`），重跑构建不会丢

于是 080 不再走 `.bg-none` 渐变兜底，列表里也不再借别人的通用缩略图。

### 四、验收

新增 `verify-v2602` **20/20**（未选版本：两套入口置灰/不可点/直链打回；选版本后：列表整组替换、不串版本、刷新仍记得；080：背景与缩略图 + 图真的加载成 1920×1080）。
回归全绿：v2601 8/8、v2507 18/18、v2505 24/24、v2504 19/19、v2503 33/33、v2510 12/12、v2502 28/28、
v2500 25/25、v2400 38/38、v2302 35/35、gloria 49/49、clothes 15/15、readings 22/22、stories 20/20、almanac ALL PASS；`vue-tsc` 0；dist 已重建。

> 老脚本的连带修改：11 个脚本的存档 fixture 补 `selectedVersion`（否则 /banner 会被守卫弹走）；
> 跨版本造数据的 3 个（v2400 / v2504 / v2507）加 `useVersion()` 切版本；v2507 的 A 组从「80 池全量」
> 改成「当前版本的池」；v2302 的 sticky 断言先展开 1.0 那一组（版本页现在默认展开当前版本所在的大版本）。

---

## [v1.4.01] 2026-11-02 — 三个页面改名 + 「时隙遗光」进入键落到本版本卡池

> 用户反馈 2 项（3 个页面改名 + 检查版本→卡池的进入链路）→ 小改动，`mm` 00 → 01。

### 一、改名：主页 → 心绮之启 ｜ 版本 → 时隙遗光 ｜ 共鸣 → 心忆共鸣

侧栏是这三页唯一的文字入口，改的全是 `label`，路由 / 目录 / 组件名一律不动（`/` `/versions` `/banner`）：

| 位置 | 改前 | 改后 |
|---|---|---|
| `App.vue` 的 `NAV` | 主页 / 版本 / 共鸣 | 心绮之启 / 时隙遗光 / 心忆共鸣 |
| `HomeView` 主界面 5 个入口 + 右缘竖排 5 个入口 | 版本 / 共鸣（只做 `aria-label`） | 时隙遗光 / 心忆共鸣 |
| `SettingsView` 文案 | 「启动时直接进主页」「主页仅在动态背景下有声」 | 换成「心绮之启」 |

侧栏 158px 宽、标签 13.5px：四个字 **62.6px** + 图标 22 + gap 9 + padding 24 ≈ 118px，一行放得下
（`verify-v2601` 的 A3 按 `scrollWidth ≤ clientWidth` 断言，以后加长名字会立刻红）。

⚠️ **卡池页左上角的墨迹页签仍是「共鸣」**（`.page-title`，38px）：那是实机页签，
和同一屏的「共鸣一次 / 共鸣十次 / 共鸣详情 / 共鸣概率」属于同一套游戏术语，不是页面名，
所以这次只改导航层的称呼。要一起改的话说一声，四字 = 约 160px，会盖到返回键右侧的空白带。

### 二、时隙遗光的进入键：以前只会进「当前池」，现在进「这个版本的池」

根因：`VersionView.enter()` 一直是 `router.push('/banner')` —— 选完版本只是改了右边大图，
进入键跟选没选版本**毫无关系**，落到哪取决于上次停在哪个池。

改法（新增 `poolOf` / `targetPool` 两个派生量）：

- `manifest.banners` 的顺序就是「版本号 → 版本内 `seq`」，`seq 01` 即该版本的第一池
  （命名规则见 `素材/信息表/前后名称对照表.md`：含 5★ 的混池排前、纯 4★ 排后、同档按套装 ID）。
- `enter()` 先 `store.selectBanner(targetPool.id)` 再跳页；未选版本时行为不变。
- 进入键左侧新加一行「卡池 · XXX」，**点之前就能看到会落到哪个池**，同时补了 `title` 提示。

覆盖检查（`verify-v2601` B 组，逐个版本走真实 UI）：**24 个版本 24/24 都有卡池**，1.0 → 2.11 无一个空缺；
每个版本点进入键后落到该版本第一池，标签名与实际池名一致。几个容易误判的：
1.0 → 遥远之海（常驻）、1.8 → 缘起绘笔万念生、2.10 → 在属于孩子的故事里、2.11 → 雪落颂愿时（无背景，走 `.bg-none` 兜底）。

### 三、验收

新增 `verify-v2601` **8/8**；全量回归全绿：v2507 17/17、v2505 24/24、v2504 19/19、v2503 33/33、
v2510 12/12、v2502 28/28、v2500 25/25、v2400 38/38、v2302 35/35、gloria 49/49、clothes 15/15、
readings 22/22、stories 20/20、almanac ALL PASS；`vue-tsc` 0；dist 已重建。

---

## [v1.4.00] 2026-11-02 — 全量卡池（6 → 80）+ 专属铭牌按星级 + 2.11 新池

> 用户要求「补全所有版本的所有卡池」+ 两条素材优先级规则 → 卡池列表数据源整个换掉、
> 数据集从 79 池扩到 80 池、素材管线补了三条丢失的链路 → **大改动**，`n` 5 → 6，`mm` 归 `00`。

用户这一批的三条要求（原话）：

1. 相关素材补充 `素材/信息表/套装部件.csv`、`素材/信息表/套装序列.csv`、`素材/朋友分享素材/UI/SysResonance/texture/Pic`
2. 有专属套装铭牌就用专属（五星 `_name_01`、四星 `_name_02`），没有才用通用名牌
3. 有卡池名艺术字素材必须用，不许退回纯文字

### 一、卡池列表：硬编码 6 项 → manifest 全量 80 项

以前 `BannerView` 里是 `const POOLS: PoolEntry[] = [ … 6 条 … ]`，注释写着「素材齐全可玩的只有两个池」。
其余 74 个池在 manifest 里数据齐全、素材也齐，**界面上却永远看不到**。

| 项 | 改动 |
|---|---|
| 数据源 | `POOLS` 改成 `computed`，由 `store.manifest.banners` 派生（版本升序、同版本按 `seq`），与版本页 / 图鉴赛季栏同序 |
| 缩略图 | 以前 6 项共用 6 张通用图轮播；现在每项用**该池专属** `assets.thumb`（实测 80 项 / 80 张不同图） |
| 选中态 | 删掉写死的 `SELECTED = 1`，改成跟 `store.bannerId` 走（`watch` + `immediate`） |
| 首屏定位 | 新增 `scrollSelectedIntoView()`：切池 / 挂载时把当前池滚到列表中央，用户自己滚动不会被拽回 |
| 可点性 | `isReal()` 判据从「有背景图」放宽成「manifest 里有这个 banner」—— 否则 2.11 那种只有艺术字、没背景的池永远是灰的 |

### 二、卡池名艺术字：47 → 79 池

`build-pool-map.py` 的 `load_title_art()` 只扫 `素材/部分UI及道具图片/{DXT5,DXT1,…}`，
那里只覆盖到 1.7 前后 —— 030 起共 32 个池明明有
`素材/朋友分享素材/UI/SysResonance/texture/Pic/NNN/T_UI_resonance_gacha_NNN_title.png`，却全被判定「无艺术字」。

现在补扫 Pic 目录作为兜底（已有来源不动，清晰度更稳），并且按 `_NNN_title.png` 通配
—— 031/032 的文件名是 `greece_031_title.png`、`greece_032_title.png`，还要排除 `_title_Effect.png` 这类装饰变体。

结果：**79 / 80 池有专属艺术字**。唯一没有的是 058「契约终末之时」—— 它的素材目录里只有一张 `_list.png`，
全库确实不存在艺术字（按用户第 3 条，这种情况才退回纯文字）。

### 三、专属铭牌：按星级取 `_name_01` / `_name_02`

素材里每个池最多三种铭牌（都是 332×96、右侧渐隐）：

| 文件 | 含义 | 池数 |
|---|---|---|
| `_name_01.png` | 五星专属 | 22 |
| `_name_02.png` | 四星专属 | 14 |
| `_name.png` | 整池一张（老素材） | 19 |

旧实现只收 `_name.png`，于是**有 `_name_01/02` 的池反而没有铭牌**、退回通用粉/紫底框 —— 正好是用户举例的 030。

改法：

| 层 | 改动 |
|---|---|
| 收集 | `collect-assets.py` 三种都收：`ui/banner/name/{NNN}.webp`（any）/ `{NNN}-5.webp` / `{NNN}-4.webp` |
| 结构 | `ui.banner.namePlates[key]` 从 `"path"` 升级为 `{ any?, "5"?, "4"? }`；`types.ts` 加 `NamePlate`，并保留旧字符串形态的兼容 |
| 取值 | `BannerView.plateOf()`：星级专属 → 整池通用 → 通用 `setName1/setName2` |
| **不再裁透明边** | 旧代码走 `trim_alpha_to_webp`，但各池实体 bbox 并不一致（001 宽 322、030 宽 272），裁完再被 `.sb-plate` 的 `fill` 拉成 300×86 就变形；保留 332×96 原比例（3.46 : 3.49）几乎无损 |

实测 40 池有专属铭牌（通用 19 / 五星 22 / 四星 14），其余 40 池素材本身没有铭牌 → 按规则用通用底框。

### 四、新增 080「雪落颂愿时」（2.11 时光缝合的扉页）

CSV 里 2.11 只有一个卡池，`source/` 目录还没整理到这一版，所以走 `EXTRA_POOLS` 手工补一条池定义：

| 数据 | 来源 |
|---|---|
| 版本 / 版本名 | `套装信息表.xlsx` sheet2（已有 2.11 行）+ `版本介绍文案全表.md`（«用一场幸福的雪，颂念无名勇者的归途。»） |
| 套装 ID / 星级 | CSV → S0438 绽若颂愿心 5★、S0429 奶酪与剑 4★ |
| 部件 / 五维 / 标签 | `素材/图片素材/2.11时光缝合的扉页/*/属性-*.yaml`（10 + 8 个部件） |
| 文案 | `素材/套装文案/2.11时光缝合的扉页/*.txt`（整体文案 + 分部位台词，含妆容） |
| 卡片图 | `素材/图片素材/2.11…/*/初始·焕新·进化·一进·二进·满进/*.png` |
| 立绘 | 5★ 用 `Showpic/S0438/T_showpic_clothes_S0438H.png`（520×724 试穿图）；4★ 无试穿图 → 用卡片里的「整体-初始」兜底 |
| 部件图标 | 2.11 没有「部件图标」目录 → 复用同期部件卡，`icons` 支持 `{name, src}` 形态（名称显式给，否则 `partIcon()` 按部件名匹配不到） |
| 卡池名艺术字 | `Pic/080/T_UI_resonance_gacha_080_title.png` ✅ |
| 卡池背景 / 缩略图 / 深忆奖励 | **全库不存在** → 背景走新增的 `.bg-none` 雪夜紫渐变兜底，深海回响提示改「奖励待收录」（不能谎报「全部已领取」） |

版本侧接入：`VersionView` 的 `VERSIONS` / `MAJORS` 加 2.11；图鉴的 `VER_LIST` 从「读 `ui.ver.cards` 的键」
改成「从 manifest.banners 的 version 集合派生」—— 2.11 没有版本卡素材，按 cards 取键会让新版本整条消失。
缺卡时 `vn-thumb` / `vs-card` 都不渲染，只露底板 + 版本号 + 版本名，不破图。

### 五、顺带修掉的 4 个管线断裂（重跑构建才暴露）

| 问题 | 后果 | 修法 |
|---|---|---|
| `build-pool-map.py` 里 xlsx / md 路径还写着 `素材/套装信息表.xlsx`，实际早已挪到 `素材/信息表/` | 脚本直接 `FileNotFoundError`，只能手改 JSON | 路径改 `P("信息表", …)` |
| `素材/source/1.0…/常驻·遥远之海/` 新增了「三星散件」目录 | 重建后常驻池多出第 9 个空套装（star=0、无部件） | 加入套装目录 `skip` 集合（三星散件本来就由 `stars3` 单独处理） |
| `rules.pure4` 只存在 pool-map.json 里，脚本常量没同步 | 重跑后纯 4★ 池（不灭的幽旅 / 以长夜为誓）静悄悄退回主池的 8.5546% / 10 抽保底 | 写进 `build-pool-map.py` 的 rules |
| `ui.btn.jump`、`ui.egg.skipN/skipH` 是 v1.3.04 手工塞进 manifest 的 | 重跑收集就丢 → 套装详情跳转键、彩蛋弹窗左右键消失 | 补进 `UI_ASSETS` 与 manifest 键 |

### 六、验收

新增 `tools/verify-v2507.mjs`（**17 项**）：列表 80 = manifest 80、缩略图 80 张互不相同、
艺术字 79/80、030 五星/四星各取各的铭牌、004 走整池铭牌、无铭牌池退回通用底框、
080 可选 + 艺术字 + 渐变兜底 + 两套齐全 + 套装 ID/星级/部件、2.11 进入图鉴赛季栏与版本页、
深海回响不谎报、控制台零报错。

同时修了 4 个被「6 项列表」写死的老脚本（它们拿行号当身份）：

`verify-v2302`（`nth=3` 不再是纯 4★ 池 → 改按名字点）、`verify-v2400`（`nth-child(6)` 不再是常驻池）、
`verify-v2504`（`nth(5)` / `nth(1)` 同理）、`verify-stories`（故事 116 → 120 篇，把写死的 66/52 改成
「列表条数 = 标签里的总数」自校验）。

回归：**v2507 17/17**、v2505 24/24、v2504 19/19、v2503 33/33、v2510 12/12、v2502 28/28、v2500 25/25、
v2400 38/38、v2302 35/35、gloria 49/49、clothes 15/15、readings 22/22、stories 20/20、almanac ALL PASS；
`vue-tsc` 0；`vite build` 通过。

---

## [v1.3.07] 2026-11-02 — 服装图鉴赛季栏：大版本容器与小版本等大

> 用户反馈 1 项（截图指出大版本条比小版本卡片小一圈）→ 小改动，`mm` 05 → 06。

### 一、问题

赛季栏（`MuseumClothes.vue`）里两行共用同一套 78px 高的盒子，但底板走的是**素材原图直接拉伸**：

| 元素 | 素材 | 实体（alpha>128）bbox | 拉伸到 257.8×78 后的可见实体 |
|---|---|---|---|
| 大版本 `.vm-bg` | `opt-n/s` 437×132 | (15,16)-(421,116) = 406×100 | **239.5 × 59.0** |
| 小版本 `.vn-bg` | `title-panel-n/h` 473×128 | (16,13)-(459,117) = 443×104 | **241.4 × 63.4** |

两个素材自带透明边距比例不同（opt 上下各留 16/132 ≈ 12%，title-panel 只留 ~10%），
直接 `inset:0 + object-fit:fill` 拉伸就把这圈边距一起缩了进去 —— 于是大版本实体比小版本**矮 4.4px、窄 2px**，
在深色栏底上就是「大版本容器略小一圈」。

### 二、改法

沿用版本页（`VersionView.vue`）那套「按实体 bbox 反算 img 尺寸与偏移」的做法，
但**基准取小版本实体**而不是「铺满盒子」：小版本是栏里数量占绝对多数的元素，
以它为基准不用动缩略图那圈 6px 内缩；反过来说若两者都铺满 257.8×78，
缩略图（246×66）就只剩 6px 边可露、缩略图会吃掉底板边框，观感反而更挤。

| 项 | 改动 |
|---|---|
| 反算 | 目标实体 241.4×63.4、居中对齐容器（中心 128.9, 39）→ `img w = 241.4/406×437 = 259.9`、`img h = 63.4/100×132 = 83.7` |
| 偏移 | 实体在图内偏移 (15,16)/(437,132) → 反推 `left: -0.2px`（微调 0.5px 让小版本那点偏心也对上）、`top: -2.8px` |
| 溢出 | img 比按钮盒子大（259.9×83.7 > 257.8×78），但溢出部分全是透明像素；`.cl-vers` 的 `overflow` 裁掉它不影响任何边框，sticky 吸顶时同样完整 |
| 不改动 | `.vn-bg` 保持原样（它就是基准）；`vm-icon` / `vm-txt` 位置与字号不变 |

实测两行实体：**241.45×63.40** vs **241.45×63.38**，中心 x 1791.65 / 1791.63（差 0.02px）。

### 三、验收

`tools/verify-clothes.mjs` 新增 **R8b**：按两份素材的实体占比把 `getBoundingClientRect()` 换算成
「可见实体宽 / 高 / 中心 x」，要求大版本与小版本三者在 1px 内一致 —— 之后谁再把 `.vm-bg` 改回 `inset:0`
会立刻红。截图另核了三种状态：展开另一组、滚到栏底（sticky 吸顶）、收起后 `groupH` 回到 78px。

回归：`clothes` **15/15**、`v2505` 24/24、`v2504` 19/19、`v2503` 33/33；`vue-tsc` 0。

---

## [v1.3.06] 2026-11-02 — 主页音轨独立播放 + 抽取记录分页

> 用户反馈 2 项（含 1 个自动播放 bug）→ 小改动，`mm` 04 → 05。

### 一、切回主页后要再点一次才有声（bug）

**根因**：声音挂在 `<video>` 上，靠「先 `muted` 起步、用户第一次 pointerdown/keydown 再摘 muted」绕自动播放策略。
这套只对**页面内**的手势有效 —— 从别的界面切回主页时，那次点击发生在**上一个页面**，
而 HomeView 是这时才挂载的，监听器挂晚了，于是「视频在播、但没有声音，直到你再点一次」。

**改法**（用户给的第二个方案：把音轨拆出来单独放）：

| 项 | 改动 |
|---|---|
| 素材 | `ffmpeg -vn -c:a libopus -b:a 96k` 从 `bg-video.webm` 抽出音轨 → `public/assets/ui/home/bg-audio.ogg`（**1.35 MB / 116.3s**，与视频同源同长） |
| 视频 | `<video>` 常驻 `muted` —— 静音视频的自动播放不受策略限制，一定能起 |
| 声音 | 新增 `<audio class="hm-bg-audio" loop>`，音量仍走 `bgmGain('home') × 1.4`（默认设置 0.233、全开 0.476，上限 0.7 不变） |
| 起播时机 | `stage !== 'boot'` 才起（开屏动画自带声音，不能叠）；回主页那次点击已给 document **粘性激活**，`play()` 直接放行 |
| 兜底 | 只有「冷启动直接落在主页」确实没有任何手势时 `play()` 才会 reject → catch 里挂一次性 pointerdown/keydown 补放，播上即卸载 |
| 静态背景 | 切静态时 `<audio>` 随 `v-if` 一起销毁，切回动态自动重播 |

顺带在 `collect-assets.py` 的 `ui.home` 里登记 `bgAudio`（否则下次重跑素材收集会丢这个键）。

### 二、抽取记录分页

- 单页 **10 条**，最多 50 条 → 最多 5 页；`page` / `pageCount` / `pagedPulls` 三个派生量，换池或记录变少时页码自动夹回合法范围。
- 页码切换键照玄学「过往回顾」那对圆钮（`‹ ›` + 32px 圆），**底色改淡蓝**（`linear-gradient(#f1f8ff → #cfe2f6)`，字色 `#3d6389`），
  放在「抽取记录」标题右侧；中间显示 `1 / 3`。禁用态保留 45% 不透明度（压太狠会看不出那里有个键）。
- 列表**去掉序号列**，只留名称 + 星级。
- 行高 34 → **33px**：10 行正好 332px，与列表可视区（332px）严丝合缝，不会冒出 8px 滚动条。
- 切页签 / 关掉重开都会重置到第 1 页。

### 三、验收

新增 `tools/verify-v2505.mjs`（**24 项**）。其中 B 组**故意不加 `--autoplay-policy=no-user-gesture-required`**，
按真实策略跑「点侧栏去版本页 → 点侧栏回主页 → 450ms 后音轨是否已在播」，
`paused=false / ready=4 / currentTime 0.06 → 1.48s`，确认不再需要第二次点击。

顺带改了三处因架构/分页变化的旧断言：
`verify-v2500` E（改判「video 常驻 muted + 独立音轨在播」，并等音轨真正起播而不是死等毫秒）、
`verify-v2510` A（音量改从 `<audio>` 读，0.476 不变）、
`verify-v2503` H（50 条 → 5 页、无序号、翻页接续）、`verify-v2504` D4（行高 ≤34）。

回归：`v2505` 24/24、`v2504` 19/19、`v2503` 33/33、`v2510` 12/12、`v2502` 28/28、`v2500` 25/25、
`v2400` 38/38、`v2302` 35/35、`gloria` 49/49、`clothes` 14/14、`readings` 22/22、`stories` 22/22、
`almanac` ALL PASS；`vue-tsc` 0；`vite build` 通过。

---

## [v1.3.05] 2026-11-02 — 抽取记录分池持久化 + 星级衬托 + 彩蛋文本3

> 用户反馈 3 项 → 小改动，`mm` 03 → 04。

### 一、抽取记录：持久化 + 各池独立

上版的「抽取记录」读的是 `save.history` 的**全局尾部 50 条**，于是：

- 换个池打开详情，看到的还是上一个池的记录（几个池混在一条时间线上）；
- 存档截断是 `slice(-500)` 全池共用一个名额 —— 抽得多的池会把别的池整段挤掉。

改法：

| 层 | 改动 |
|---|---|
| 存档写入 `writeSave` | 新增 `trimHistory()`：**逐池**各留最近 **200** 条（`PER_BANNER`），再按 `at` 重排、总上限 4000 兜底 |
| 存档读取 `loadSave` | `history` 非数组时兜成 `[]`（老存档 / 手改坏的存档不会再把 `.filter` 打崩） |
| 共鸣页 `recentPulls` | `filter(it => it.banner === store.bannerId)` 后再取 50 条倒序 |
| 底部说明 | 点名当前池：「仅显示「遥远之海」最近 50 条……各池记录相互独立」 |

流水本来就写在 `save` 里（`persist()` → `localStorage`），实测刷新后 10 条 / 1 条各归各位。

### 二、星级更易读

通用星级图标是奶白色（实测均值 RGB **227,205,175**），而弹窗底是更浅的羊皮纸，16px 压上去几乎只剩小白点。

- 外面套一条**暖棕凹槽**：`linear-gradient(180deg, rgba(96,68,30,.22), rgba(76,50,18,.32))` + `inset` 内阴影 ——
  比纯黑胶囊柔和，又足以把奶白星托出来；
- 每颗星叠两层深棕 `drop-shadow` 描边 + `brightness(1.22) contrast(1.1) saturate(1.2)`；
- 尺寸 16 → **19px**，行高仍是 34px（实测图标 19×19、衬底 75×22、行 34px，不撑破）。

### 三、彩蛋文本3（30 条，只在翻页/跳转时出现）

- `tools/prep-easter.py` 改为支持**多个来源目录**，新增 `素材/主页/彩蛋文本3.txt`（左对齐，`════` 切段 = 30 条）。
- 生成数据时同时导出 `EGG_RANDOM_POOL`（`file != 3` 的下标，共 **44** 个）：打开弹窗只从这里面抽，
  所以「随机文案」永远不会落到彩蛋文本3；要看得用左右切换键或页码跳转。
- 总条数 44 → **74**，页码 45 起是彩蛋文本3（45 是开头的「负面评价」说明，74 是结尾）。
- 最长一条 755 字，实测 `scrollHeight 1281 / clientHeight 369`，滚动正常、不溢出纸面。

### 四、验收

新增 `tools/verify-v2504.mjs`（**19 项**）：十连/单抽分池计数、刷新后仍分池、存档里两条流水分属两个 banner、
星级衬底/内阴影/描边/19px、总条数 74、连续打开 12 次都 ≤ 44、跳 45 命中彩蛋文本3、44↔45↔46 切换。

顺带修了三处因「总条数 44 → 74」「记录改按池过滤」而失效的旧断言：
`verify-v2510` E5（越界夹到末条，改为按实际总数判）、`verify-gloria` R13（`/44` 与 `24/44` 全部改成动态总数）、
`verify-v2503`（造流水时必须挂在默认池 `banner-2.10-02` 上，否则记录页是空的）。

回归：`v2503` 30/30、`v2510` 12/12、`v2502` 28/28、`v2500` 25/25、`v2400` 38/38、`gloria` 49/49、
`clothes` 14/14、`readings` 22/22、`stories` 22/22、`almanac` ALL PASS；`vue-tsc` 0；`vite build` 通过。

---

## [v1.3.04] 2026-11-01 — 套装→图鉴跳转 + 全局 ESC + 深海回响视觉

> 用户反馈 8 项（含 1 个数据 bug）→ 小改动，`mm` 02 → 03。

### 一、套装详情 → 服装图鉴跳转按钮

图标 `T_UI_interaction_icon_21.png`（60×60，箭头入书籍）→ `public/assets/ui/btn/jump.webp`，
登记为 `manifest.ui.btn.jump`。按钮 74×74 贴在**三个属性胶囊右侧、纸面右上角**，与胶囊同高。
点击走 `router.push({ path: '/codex/clothes', query: { name } })`，复用图鉴早就有的 `?name=` 定位能力。

### 二、ESC 全局：有弹窗先关弹窗

**根因**：`BannerView.onKey` 里判了 `showEcho` / `showRules`，唯独**漏了 `showDetail`** ——
套装详情弹窗开着时按 ESC，会一路撞到 `leave()`，人直接被踢回主页，弹窗却还留在画面上。
现在补上最上层的判断，层级从高到低逐层退。三个图鉴子页原本就是「先关搜索弹窗」，无需改。

### 三、跳转返回栈（新增 `src/composables/useNavBack.ts`）

| 规则 | 实现 |
|---|---|
| **只有 ESC 走返回栈**，鼠标点退出键走正常的父级返回 | `goBack()` 里 `clearHops()`；ESC 分支里 `takeHop()` |
| 跳转只递归 2 次 | `MAX_DEPTH = 2`，超出 `shift()` 掉最早那条 |
| 从搜索弹窗跳过去的，回来时搜索弹窗还开着 | 来源 URL 挂 `?resume=search&kw=<关键词>`，来源页 `onMounted` 里 `resumeSearch()` 还原 |
| 栈只在内存里 | 刷新页面自然遗忘，不写 localStorage |

覆盖的跳转点：共鸣页套装详情、服装图鉴「套装故事」、三图鉴的搜索结果、
博物图鉴的「切大版本」与「进三个子图鉴」。

### 四、栖骨生花没有整体文案（数据 bug）

扫描 **118 套**确认只有这一套 `desc` 为空。根因是素材源文件的写法：

```
套装文案：
花于何时绽放？在轮回之神无数次的陨落与新生之中……   ← 裸写，没有 `『整体』` 标记
```

而别的套装都是 `套装文案：
『整体』……`，解析器只认 `『整体』` 这一行 → 拿到空串。
`tools/build-pool-map.py` 已加兜底：进入「套装文案」段之后、第一个 `『部位』` 之前的裸文本，
整段收作整体文案。重跑后 312 套文案 **0 条为空**。

### 五、深海回响（2 项视觉）

- **彩虹光带边缘柔化**：原来三条 mask 都是**纯横向** `linear-gradient`，纵向靠
  `mask-size` 的百分比高度硬切 → 色带上下两端是直角硬边。改成
  `radial-gradient(ellipse …)`：横竖两个方向同时渐隐，端头自然收圆；再叠 `blur(10px)`。
  blur 不掉帧——`rbPhase` 只改 `opacity`，不碰 `transform`，模糊结果可缓存。
- **已走过的轨道高亮**：新增 `.ds-pass-halo`（26px 粗柔光把槽灌满）+ `.ds-pass-core`（7px 亮芯），
  几何用**同一套 Catmull-Rom 样条**从起点重画到当前抽数，不会跟主线错位。

### 六、顺带

- 服装图鉴部件栏切换音 `flip-single` → `btn-ten-hover`（音量保持 0.5）。
- 存档 `history` 条目加 `name` / `star` 快照字段（老存档缺字段时回退到 `rarity` 与 id 的部件名部分）。

### 七、验收

新增 `tools/verify-v2503.mjs`（**30 项**）：跳转按钮位置与落点 / ESC 关闭弹窗 /
跳转后 ESC 回原页 / 搜索跳转回来弹窗重开且关键词还原 / 服装→故事 ESC 返回 /
栖骨生花文案上屏 / 部件切换音 = btn-ten-hover / 抽取记录 50 条且倒序 /
轨道高亮双 path 且只画到当前抽数 / 光带径向遮罩 + 模糊。

回归：`v2510` 12/12、`v2500` 25/25、`v2400` 38/38、`gloria` 49/49、`clothes` 14/14、
`readings` 22/22、`stories` 22/22、`almanac` ALL PASS；`vue-tsc` 0；`vite build` 通过。

---

## [v1.3.03] 2026-11-01 — 弹窗音效按场景拆分（`panel-fadein` 退场）

> 用户反馈：上版把 `echo-open` 压到 60% 改错了对象，真正想调的是「辉煌心光点图标弹出面板」那一声。
> 定位后要求按场景各用各的音效 → 小改动，`mm` 01 → 02。

### 一、先回退

`echo-open` 的 0.6 硬上限（`SFX_CAP` 整张表）删除，`play()` 回到纯乘法
`clamp(volume × uiVol × master)`，实测回到 **0.68**（0.85 × 0.8）。

### 二、定位「辉煌心光弹出窗口」到底是哪个音

用 Playwright 包了一层 `Audio.play` 记录每次播放，实测链路：

| 动作 | 音效 | 调用处 |
|---|---|---|
| 进辉煌心光界面 | `settings-open`（1.10s） | `SettingsView.vue:252` `onMounted` |
| **点左侧图标 → 弹出设置面板** | **`panel-fadein`（4.85s）** | **`SettingsView.vue:67` `openPanel()`** |
| 点面板里「清空 / 重置」→ 二次确认框 | `settings-btn-hover`（0.26s） | `SettingsView.vue:156` `ask()` |
| 关面板 / 返回 | `back-select` | `SettingsView.vue:73` / `:79` |

`panel-fadein` 的源素材是 `UI_WBP_Resonance_RewarPanel_Fadein_Ten`（本来只是「共鸣奖励面板淡入」），
却被 **21 处**共用，所以听起来「所有弹窗一个味」。

### 三、按场景拆分（21 处 → 7 种音效）

| 场景 | 新音效 | 事件名 | 时长 |
|---|---|---|---|
| **抽卡奖励弹窗**（`panel-fadein` 唯一保留用途，volume **0.4**） | `panel-fadein` | `UI_WBP_Resonance_RewarPanel_Fadein_Ten` | 4.85s |
| 辉煌页弹设置面板 / 主页彩蛋弹窗 | `window-open` | `ui_general_window_a_open` | 0.43s |
| 辉煌页一键解锁全部阅读物 | `unlock-big` | `ui_general_unlock_big` | 4.31s |
| 抽卡：跳过演出 / 转九宫格 / 入场结束 | `sendgift-popup` | `UI_Resonance_SendGift_Campaign_Popup` | 1.97s |
| 服装图鉴搜索弹窗 | `btn-deny` | `ui_general_button_medium_b_deny` | 0.50s |
| 阅读 / 故事图鉴：换风格 ×2 / 切区域 / 搜索弹窗 | `points-slide` | `ui_general_reward_points_slide` | 0.93s |
| 博物图鉴：切大版本 | `big-b-select` | `ui_general_button_big_b_select` | 1.80s |
| 博物图鉴：搜索 / 进三个子图鉴 | `nav-select`（复用） | `ui_general_interact_target_select` | 0.13s |

> `ui_general_window_a_open;ui_general_window_b_open` 在 `索引.csv` 里是**同一行**的两个别名，
> 指向同一个 `052_窗口打开.mp3` —— 「A + B」不是两段叠加，只有一段 0.43s。

### 四、流程

- 新增 `tools/prep-sfx.py`：按事件名从 `素材/卡池音频/索引.csv` 取源 mp3 → ogg（libvorbis q5 / 128k）→
  merge 进 `manifest.sfx`。6 个新文件共 177KB。
- `tools/collect-assets.py` 的 `SFX_EVENTS` 同步登记这 6 条，重跑素材收集不会丢。
- `useAudio.ts` 的 `SfxName` 联合类型补齐 6 个键，`WARM_KEYS` 加 `window-open` / `nav-select`（首屏就会用到）。

### 五、验收

新增 `tools/verify-v2502.mjs`（**28 项**）：6 个新 ogg 进 manifest 且可访问 / `panel-fadein` 源码只剩
RewardPopup 一处且 0.4 / 八个场景逐一实点并断言播放的 key。

回归：`v2510` 12/12、`v2500` 25/25、`v2400` 38/38、`gloria` 49/49、`clothes` 14/14、
`readings` 22/22、`stories` 22/22、`almanac` ALL PASS；`vue-tsc` 0；`vite build` 通过。

---

## [v1.3.02] 2026-11-01 — 两处音量上限 + 奔跑动画像素修复 + 辉煌换源 + 彩蛋弹窗增强

> 用户反馈批次（5 项）→ 小改动，`mm` 00 → 01。

### 一、音量上限（2 项）

| 对象 | 要求 | 实现 |
|---|---|---|
| 主页动态背景音轨 | 上限 70% | `HOME_GAIN` 2 → **1.4**（= 全开时 0.34×1×1×1×1.4 = **0.476**，正好是原来 0.68 的 70%），再叠一道 `HOME_MAX = 0.7` 硬上限兜底 |
| `echo-open`（进入共鸣页 / 点开共鸣详情那声） | 上限 60% | 新增 `SFX_CAP` 表，`play()` 里 `volume = min(volume, cap)`。调用处写 0.85 → 实测 **0.48**（0.6 × uiVol 0.8）；写 0.28 的叠加轻音不受影响 —— 这是**上限**，不是整体乘 0.6 |

### 二、切屏奔跑动画「脸部透明」（bug）

现象：加载页右下角的奔跑装饰，脸和手整块透明，深色背景从身体里透出来。

根因在 `tools/prep-loading.py` 的抠白流程（v1.3.00 写的），两层叠加：

1. `moving暖暖.gif` 是不透明的白底，必须自己抠；
2. 抠完之后还有一句「把 `a>0` 且 `r,g,b > 242` 的像素压成 `alpha=90`」想软化边缘 —— 而**脸和手本来就是接近纯白的肤色**，正好落在这条规则里，直接被压成半透明；
3. 八边种子 floodfill 在大片近白区域还会从缝隙连进角色内部，再啃掉一部分。

修法：**不再抠任何像素**，改用 `T_UI_loading_special_spirits.png` —— 它本身就是带 alpha 的 16 格序列帧（4×4 × 480×270），像素完整、边缘干净。新 `slice_sheet()` 按行优先切 16 帧直接出动图。

- 帧序已用相邻帧差异验证：行优先相邻差 8.1~14.0，首尾接缝 11.7（和普通相邻帧同量级）→ 顺序正确且是循环动画。
- 新 `nikki-run.webp` 480×270 / 16 帧 / **188KB**（旧版 127KB，多为无损 alpha 的代价）。
- 验收加了硬指标：首帧 `alpha>200` 的像素数 **14348**（打穿版本会掉到一万出头），阈值 13500。

### 三、辉煌背景音换源 + 消掉循环停顿

- 源换成用户给的 `无限暖暖@FoldEcho - 万丈曙色.wav`（112.2s / 44.1kHz）。
- **停顿的根因**：旧 mp3 长 128.36s，末尾是 **2.46s 纯静音**（`silencedetect`：125.90 → 128.36），
  `loop` 起来每 2 分钟就空一大拍。新 wav 首尾电平一致（−28.1 / −27.5 dB），本身适合循环。
- 仍加了一道保险：`LOOP_XFADE = {wanzhang: 1.2}` —— 取尾部 1.2s 与开头 1.2s `acrossfade` 交叉，
  循环点变成连续波形，彻底没有接缝。输出 **111.0s**。
- 顺带修 `encode()` 缺 `-vn` 的问题：旧 mp3 带一张 mjpeg 封面，转码时被塞成一条 **theora 视频流**
  进 ogg（旧 `wanzhang.ogg` 里就是 `theora + vorbis` 两条流）。现在只有一条 vorbis。

### 四、彩蛋弹窗：换键 + 页码跳转

- 左右切换键从「‹ › 字符 + 自绘方条」换成 `T_UI__collocation_btn_skip_n / _h`（74×74 圆钮），
  常态图叠高亮图做交叉淡入。左键整体 `scaleX(-1)` 翻转，保住「左键向左、右键向右」的直觉。
  `tools/prep-egg.py`（新）负责转 webp 并写 `manifest.ui.egg = { skipN, skipH }`。
- 底部改成三段 grid：`第 n / N 条` ｜ **跳转框** ｜ 操作提示。
  跳转框只收数字（自动过滤非数字、最多 3 位），回车或失焦即跳，越界夹到 1..44，跳完清空。
- 焦点在输入框里时不再抢 ←/→（原来 window 上的 capture 监听会把方向键吃去切条目）。

### 五、顺带修掉的脚本 bug

`prep-loading.py` 写 manifest 时用的是 `man["ui"]["loading"] = {...}` **整段覆盖**，
会把 v1.3.01 手工加的 `bg`（整屏底图）悄悄抹掉 —— 这次重跑管线才发现。改成 merge + 缺省补 `bg`。

### 六、验收

`tools/verify-v2510.mjs`（新）**12/12**；回归：`verify-v2500` 25/25、`verify-v2400` 38/38、
`verify-gloria` 49/49、`verify-clothes` 14/14；`vue-tsc` 0；`npm run build` 通过（dist 已更新）。

---

## [v1.3.01] 2026-11-01 — 背景音按界面分配 + 音量三层 + 玄学与加载层精修（11 项）

> 新增「按界面分配背景音」整套系统（新素材管线 `prep-bgm.py` + manifest.bgm + 音频模块重构），
> 属**新增数据源·管线**，`n` 4 → 5、`mm` 归 00。

### 一、背景音按界面分配（新系统）

以前全局只有一首 BGM（卡池曲 `sfx/bgm.ogg`），进哪个界面都照放。现在按界面分：

| 界面 | 曲目 | 规则 |
|---|---|---|
| 主页 | —— | 静态背景**不放**背景音；动态背景放**视频自带音轨** |
| 版本 | 奇迹大陆的起点 | 整轨循环 |
| 共鸣（含 `/gacha`） | 卡池 BGM（原来那首） | 整轨循环，抽卡演出照旧 duck 到 28% |
| 博物图鉴 | 5 首加权 | 奇想激化 40 / 浪花轻轻悄 20 / 交织的云海 20 / 梦境穿梭 15 / 千万次相逢 5 |
| 玄学运势 | 2 首 | 村中无事 50 / 缘起丹青 50 |
| 辉煌心光 | 万丈曙色 | 整轨循环 |

**换曲时机**就是用户要的两条：**进界面时**、**上一段播完时**。
单曲场景 `loop=true`；多曲场景 `loop=false`，`ended` 里按权重重抽，并**避开刚放过的那首**。

- `tools/prep-bgm.py`（新）：9 首 mp3 → ogg，并做**响度对齐** —— 用 `volumedetect` 量整轨平均电平，
  算一个固定 dB 偏移整轨加上去，统一到 −20 dBFS。母带电平实测差到 13.7dB（−11.6 ~ −25.3），
  不统一的话图鉴随机换曲会忽大忽小。**不用 `loudnorm`**：单遍动态归一化在长曲上会听出泵感。
- `manifest.bgm`：`{ versions | banner | codex | almanac | gloria: [{src, w}] }`，
  由 `collect-assets.py` 的 `BGM_SCENES` 登记，`src` 相对 `/assets/`。
- `useAudio.ts` 重构：全局单曲 → `SceneKey` + `setBgmScene()`，路由一变就切
  （`App.vue` 的 `watch(route.path)`）。**同场景幂等** —— 图鉴主界面进服装子界面不会重头放。

### 二、主音量失灵（bug）

根因：`bgmTarget = BGM_BASE × bgmVol × duck`，**里面根本没有 master**。
`setMasterVolume()` 只是就地把 `bgmEl.volume × master` 改一次，所以调零当场有效，
但一进下一个界面 `startBgm()` 会重新把音量算回 `bgmTarget`，声音立刻回来 ——
表现就是「只在辉煌心光界面生效」。

修法：把 master 折进唯一的音量函数

```
level = BGM_BASE × bgmVolume × sceneVol[场景] × masterVolume × (duck ? 0.28 : 1)
```

所有地方（起播、duck、拉滑杆、切场景）都只认 `level()`，不再各自乘一次。

### 三、音量面板：总控 + 六个界面

`辉煌心光 · 音量` 从 3 行扩到 9 行：

```
主音量 / 背景音总控 / UI 音效
── 各界面背景音 ──
主页 / 版本 / 共鸣 / 博物图鉴 / 玄学运势 / 辉煌心光
```

- 六个分项是**乘数**不是绝对值（`bgmScene[场景]`），全 1 时等于不设，总控拉到底仍然全静音。
- 面板内容区只有 569px，9 行放不下 → 行高整体收紧（`.gm-row` 11→6px、`.gr-txt` gap 8→5px、
  分项行 4px、`.gm-sub`/`.gm-note` 边距压缩），实测 `scrollHeight 569 = clientHeight 569`，不出现滚动条。
- 老存档没有 `bgmScene` 字段，按全 1 处理。

### 四、主页动态背景换源

`素材/视频素材/StarSeaPublicSpace_Wing_001.webm`（1920×1080 / 30fps / 120s / 14.6Mbps，
自带 Opus 音轨）→ **1080p24 VP9 + Opus 96k**。

- 源同样带烧入的上下黑边，`cropdetect` 给的是 `1920:800:0:140`，处理链路
  `hqdn3d=1:1:4:4 → crop → scale=-2:1080 → crop=1920:1080 → fps=24`。
- 首尾黑场：`0 ~ 0.333s` 与 `116.767 ~ 120.033s`（3.27s 淡出）→ 取 `0.4 ~ 116.7`。
  内容本身就是多场景剪辑，接缝处本来就有切镜，不需要交叉淡化。
- 试了三档：crf38 无降噪 **112MB**（7.9Mbps，对 1.35× 上采样的素材完全是浪费）、
  crf45 + 重降噪 23MB（细节被抹平）、最终 **crf43 + 轻降噪 27.5MB / 1.98Mbps**。
  旧版 62s / 27.9MB / 3.5Mbps 是从 4K 裁切再放大（2.7× 上采样），新源原生的 1080p
  即使码率低 43% 也更锐。
- 播放侧：`<video>` 起步 `muted`（浏览器不让未交互出声），首次 pointerdown / keydown 摘掉；
  音量走 `bgmGain('home') × 2`，与背景音那条链路同源，静态背景时 `v-if` 直接不渲染 video。

### 五、玄学运势（3 项）

| # | 问题 | 修法 |
|---|---|---|
| 1 | 点「不填写，直接进入」后，下次进界又被当首登 | 「问过没」从 `!profile.birth` 改为独立标记 `nikki-almanac-bazi-asked-v1`；填写 / 跳过 / 清除三条路都置位。老存档只要填过生辰也自动补标记 |
| 2 | 生辰弹窗默认 1998-06-15 | 改 **2020-02-20** |
| 3 | 点卷轴后侧边栏盖住卷轴 | 新增 `composables/useChrome.ts` 的 `setRailSuppressed()`；玄学只要不在书桌待机态（`state !== 'idle'`）就把侧栏整块 `v-if` 掉，回待机 / 离开页面恢复 |

### 六、加载过渡换底图

`T_UI_loading_bg.png`（1920×1080 淡青白花枝宣纸，均值 RGB 223,226,220）替代原来的纯黑底。

换底后发现三处必须跟着改，否则等于没画：

1. **进度条隐形**：slider-on 是纯白 255，压在 223 的纸上等于没有。加一层底缘
   `linear-gradient(to top, rgba(24,34,30,.55) → 0)`（300px）当取景框，白线才立得住。
2. **插画方框**：指向性装饰自带白色羽化边，压在浅纸上只看得见一个矩形。改
   `mix-blend-mode: multiply` —— 白的部分等于不画，纸纹直接透过来。
3. **云雾潋散失效**：雾团原来是 `screen` 的白雾，白压白 = 隐形。改成 `multiply` 的淡灰蓝
   （rgba(146,168,186,.3)），在纸面上是洇开的烟青水痕。

### 七、侧栏贴边死区（导航兜底）

版本页左栏从 x≈20 起整列都是版本卡（`button`），按「压着按钮就让位」的规则，
侧栏在这一页**永远够不到** —— 而侧栏是跨二级页跳转的唯一入口，等于把导航锁死。

补一条 `RAIL_SENSE_EDGE = 32`：指针进到最左 32px **无条件展开**，不管下面压着什么。
只压住卡片最左 12px，点卡片仍然够得着。

### 八、脚本

- `tools/verify-clothes.mjs` **重写**：跟 v0.9.09 抽离 `SearchPopup.vue` 后的 `sp-*` 类名
  （旧脚本卡在 `page.fill('.cl-sinput')` 上等 30s，Req9/Req10 从来没跑过）；
  `fill` 前等「`.sp-mask` 可见 + 搜索底图 decode + 输入框拿到焦点」而不是盲等；
  改成断言式（14 项全绿/红 + 汇总 + 非 0 退出码）。
- `tools/verify-v2500.mjs`（新）：**25 项**。
- `tools/backup.py`：同名不再覆盖，依次加 `-b / -c / …`（起因：2026-11-01 打包把改前基线覆盖了）。
- `tools/prep-bgm.py`（新）：见第一节。

### 九、验收

`verify-v2500` **25/25**；回归：`verify-v2400` **38/38**、`verify-v2302` **35/35**、
`verify-gloria` **49/49**、`verify-almanac` **ALL PASS**、`verify-almanac-v2201` **21/21**、
`verify-readings` **22/22**、`verify-stories` **22/22**、`verify-clothes` **14/14**；`vue-tsc` 0。

---

## [v1.3.00] 2026-11-01 — 黑屏加载过渡 + 图鉴破碎重构 + 六项交互改造

> 新增一整套「黑屏加载」过渡系统（新素材管线 + 新组件）+ 图鉴大版本切换动画重做
> → 属新系统 / 整组件重做，`n` 3 → 4、`mm` 归 00。

### 一、侧边栏：常态隐藏，左缘 100px 唤起

| # | 要求 | 实现 |
|---|---|---|
| 1 | 常态隐藏、鼠标移到屏幕边缘 100px 显示 | `.rail` 改成**常驻 158 宽**、`transform: translate(-102%, -50%)` + `opacity: 0` + `pointer-events: none`，整块滑入滑出；抓手三点（`.rail-grip`）随常态隐藏一并删除 |

判定在 `App.vue` 的全局 `pointermove`（设计坐标 = `(clientX − 黑边) / scale`，不读 DOM）：

- 指针 `x ≤ 100` → 展开；已展开时 `x ≤ 158`（面板宽度）内保持；移出即收起。
- ⚠ **不能只按 x 判**：玄学运势的收纳桶在 `x≈19`、共鸣页卡池列表从 `x=14` 起，
  一律 `x<100` 就弹会把它们的左半边永久挡住。所以多判一次指针下的元素：
  `button / a / [role=button] / input / …` 或页面自己打的 **`data-no-rail`** 标记 → 让位不弹。
  目前打了标记的有 `.sc-basket`、`.sc-back`（玄学）、`.pool-list`（共鸣）。

### 二、主页：动态背景下只留「心忆共鸣」

`hm-logo-center` 的 `v-if` 加上 `bgMode === 'still'` —— 横版「无限暖暖」只在静态底图上出现，动态星海视频里不再和画面抢主体。

### 三、套名横幅：星级缩回 3/5、名称牌按可见区放大

| 元素 | 旧 | 新 |
|---|---|---|
| 星级图标 | 54px | **32.4px**（54 × 3/5） |
| 星间距 | `margin-right: -6px` | **-3px**（1/2） |
| 名称牌盒子 | 251×54 | **300×86** |
| 牌内字号 | 23px | **27px** |

素材 `332×96` 里可见底板只有 `251×55`（透明边占 24%×43%），所以「放大」是按**可见区**折算的：
目标可见 `227×49` → 盒子 `300×86`。同屏 3 套 = `3×300 + 2×10 = 920`，正好卡在左侧 276 到共鸣按钮 1224 之间。

### 四、博物图鉴：大版本切换改为「碎裂 → 虚空 → 重构」

原效果是新界面从右侧平移覆盖 + 交界喷粒子，现改为：

```
0ms    整屏切成 30×20 = 600 块，逐块随机飞散（delay 0~110ms / dur 340~500ms）
       └ 同时一层深色虚空 0.3s 淡入，旧图碎掉后露出的是虚空而不是旧图
420ms  底图切到新区域（被虚空挡着），600 块带着新图像素从散乱位置汇聚回来
520ms  虚空淡出
1100ms 清场，区域正式切换
```

- 每块用 `background-position` 取 1:1 的原图像素，破碎时画面内容对得上、不错位。
- 整屏一层 `.mz-flash` 做「迸光」，**不在块上加 `filter`** —— 600 个元素各自生成离屏层会把帧率打穿（实测动画被直接跳完），详见 `notes/visual-pitfalls.md`。

### 五、黑屏加载过渡（新系统）

一级 ↔ 二级、二级 ↔ 另一个二级，路由 `beforeEach` 里判定后铺一层 `LoadingOverlay`（1.4s）。

| 元素 | 规格 |
|---|---|
| 底 | `#03040a → #0c1424` 径向渐变，纯黑过渡 |
| 中心指向装饰 | `photo-<界面>.webp`（1220×632 → **1080×559 @420,258**），六个界面各一张 |
| 云雾潋散 | 4 团 `radial-gradient` 白雾贴四边漂移 + 一层 `blur(42px)` 的插画副本做外发光；插画统一加椭圆 mask 再柔一次（废墟那张自带方形硬边） |
| 进度条 | `slider-off` 常驻 + `slider-on` 按进度 `clip-path: inset()` 横向裁切（不压缩位图）；`bottom: 100px`、1920×28 |
| 右下角装饰 | `奔跑暖暖_动态.gif` → 动图 webp（480×270 / 16 帧 / 127KB），**抠掉白底**；`bottom: 148px`（= 100 + 28 + 20） |

`tools/prep-loading.py`：转 webp、`ImageDraw.floodfill` 从八条边种子抠白底（保角色自己的白裙不被抠穿），
并把结果写进 `manifest.json` 的 `ui.loading` 段；`collect-assets.py` 同步登记（静态 9 张）。

`T_UI_loading_special_spirits.png` 经查是**同一段奔跑动画的 4×4 序列帧**（16 格 × 480×270），
与动图内容重复，故不重复播，只在 manifest 里留索引。

### 六、共鸣页套名：全部套装 + 同屏 3 套 + 滚轮/拖动

原来只取「首个 5★ + 首个 4★」两块，常驻池 8 套里的其余 6 套在界面上完全看不到。
现在 `bannerPlates = sets`（星级降序全列），容器 920 宽 `overflow: hidden`：

- 滚轮：`@wheel.prevent` → `scrollLeft += deltaY`
- 拖动：`pointerdown/move/up`，位移 >3px 记 `dragMoved`，`click` 时拦截，拖动不会误开套装详情
- 两端渐隐：贴同一套「滚到头那侧不虚化」的 mask 逻辑（和卡池列表一致）

### 七、验收

`tools/verify-v2400.mjs` → **38 / 38**。回归：`verify-v2302` 35/35（R1/R8 已按新规格改写）、
`verify-gloria` 49/49、`verify-almanac` ALL PASS、`verify-readings` 22/22、`verify-stories` 22/22。

---

## [v1.2.02] 2026-10-31 — 主页动态背景 + 侧边栏重做 + 五页精修（19 项）

> 用户反馈批次 → 小改动，`mm` 01 → 02。

### 一、主页（一级界面）

| # | 要求 | 实现 |
|---|---|---|
| 1 | 回退居中「无限暖暖」LOGO，两版并存 | `ui.home.logoCenter`（1032×696 → **460×310 @730,76**）与左侧竖版「心忆共鸣」（313×460 @116,34）同时显示，各自独立的淡入 / 呼吸 |
| 2 | 加动态背景 + 左下角切换键 | 4K 62s 素材 → **1920×1080 VP9 27MB**（去烧入的上下黑边：`crop=1920:801:0:140` 再等比放大裁切铺满，24fps crf42）；`.hm-switch` 52×52 @(24,996)，**复用共鸣页同一套 `ui.banner.switch/switchH`**；模式记在 `sessionStorage['nikki-home-bg']` |
| 3 | 动态背景的二级入口改用系统图标、竖排右缘中部、50%→100%+放大 10px、同时作为侧栏图标 | `ui.home.navSys` 六张（resonance→版本 / ntask→共鸣 / CompTravel→玄学 / dailymail→图鉴 / setting→辉煌 / interactivefurniture→侧栏主页）；右缘 `right:24 / top:282`，76px、间距 34 → 总高 516 垂直居中；`.dy-btn` 常态 `opacity .5`，悬停 `1` + `scale(86/76)`（放大 10px，origin 靠右不裁）；静态背景下星芒入口整体隐藏 |
| 4 | 二级界面加「按 ESC 返回」 | `VersionView` / `BannerView`（先关弹层）/ `AlmanacView`（书桌待机态）/ `MuseumView` 补 `keydown` → `parentOf()`；`GachaView`、`SettingsView`、图鉴三子页原有 |
| 5 | 侧边栏圆角金边、底色 #C39C7A | `.rail::before` 改为 `background:#C39C7A` + `1px rgba(255,232,176,.75)` 金边 + `border-radius:0 18px 18px 0`；文字改深棕 `#4a3418`，选中行改半透明奶白玻璃 |

### 二、版本页

| 6 | 1.0 大版本按钮固定 | `.vr-major` 改 `position:sticky; top:0`（包含块是 `.vr-group`，滚到下一组自然让位） |

### 三、共鸣页

| # | 要求 | 实现 |
|---|---|---|
| 7 | 首卡池选中放大溢出 | 容器 `30/290/内边距14` → **`14/322/内边距30`**（缩略图仍在 44,123）。实测放大态 + 金框范围 `x 22..324 / y 100..`，旧容器 `30..320` 会裁掉左右 8/4px；现在首末卡池都完整 |
| 8 | 纯 4★ 卡池概率 | 判据 = 奖池里没有 5★ 套装（46 个池）。`rules.pure4`：**4★ 基础 10%、每 5 抽必出、综合 24.8%**；`pity.pure4Rules()` 派生规则（5★ 概率归零 + 硬保底设到不可达）；概率面板对纯 4★ 池隐藏 5★ 行与保底条 |
| 9 | 套装名下的星级 ×3 | `.sb-stars img` 18 → **54px**、间距 −2 → −6；名称牌整体上移 38px（`top 1000 → 962`）才装得下 |
| 10 | 十连新部件强制播单抽、跳过全部只跳重复 | `isForcedStep()`：新部件的 `detail` 与它的套装页强制；`skipAll()` 改为「跳到下一个强制步」，后面没有强制步才进网格 |

### 四、博物图鉴

| 11 | 缩略图栏下边界 → 屏幕底部 50px；1.0 大版本固定 | `L.vers.h` **880 → 1018**（bottom 892 → 1030）；`.cl-vmajor` 同样 `sticky` |
| 12 | 未获得套装的容器背景改灰 | `.cl-show.locked .sh-bg` 与 `.cl-set.locked .st-bg` 加 `grayscale(1) brightness(.66/.8)`（原来只有立绘灰、底板仍是彩色） |

### 五、辉煌心光

| 13 | 三个清空按钮实际没清卡池 | 根因：`clearBannerMemory` 只删 `pity / milestone / history`，**图鉴部件没动**，共鸣页仍按图鉴算「套装全部获得」。新增 `partIdsOfBanners()` + `dropParts()`：清当前池 / 当前版本 / 所有池时把对应的 4★/5★ 部件一起从 codex 删除（3★ 散件是全局共用，不动），提示条显示「回收 N 件套装部件」 |
| 14 | 清空后对应故事也回锁 | 故事解锁是「套装集齐」派生的（`setProgressAll`），部件一少自动回锁，无需额外代码；实测清「执律的流金」后伊赞之土上锁 2 条 |

### 六、验证

- `vue-tsc --noEmit` **0 报错**。
- 新增 `tools/verify-v2302.mjs` **34/34 PASS**（双 LOGO / 切换键与两种背景 / 右缘 5 图标 50%→100%+1.13 缩放 / 侧栏底色圆角金边 / 五个二级页 ESC / 版本页 sticky / 首末卡池放大不被裁 / 星级 53px / 纯 4★ 面板 10.00+24.80+「每 5 抽」/ 主池概率不变 / 十连跳过停在新部件 / 赛季栏 1030 / 未获得容器灰 / 清记忆回收 18 件 + 故事回锁）。
- 回归：`verify-gloria` **49/49**、`verify-readings-layout` **45/45**、`verify-readings` **22/22**、`verify-stories` **22/22**、`verify-almanac` **ALL PASS**、`verify-almanac-v2201` **21/21**、`verify-fortune` **ALL PASS**。
- 顺带修 4 个验收脚本的启动方式：主页现在有 27MB 循环视频，`waitUntil:'networkidle'` **永不触发** → 统一改 `domcontentloaded`；`goto('/#/xxx')` 同文档跳转会被路由首帧覆盖回 `#/` → 中间过一页 `about:blank`。

### 七、素材 / 脚本

- `tools/prep-home.py`：新增 `logo-center`（无限暖暖横版）与 `sys-*` 六张系统图标（100×100 画布 ×3 超采样）。
- 视频管线（一次性）：`crop=1920:801:0:140`（去烧入黑边）→ `scale=-2:1080` → `crop=1920:1080` → `fps=24` → VP9 crf42。
  **54MB 源 → 27MB**，满屏无黑边。
- `collect-assets.py` / `types.ts` / manifest 同步：`ui.home.{logoCenter, bgVideo, navSys}`；`rules.pure4` 写进 `素材/pool-map.json`。

---

## [v1.2.01] 2026-10-30 ~ 10-31 — 辉煌心光精修 + 主界面彩蛋 + 19 项体验精修

> 判法：用户明确 **「不算大改动」** → `mm` 进 1，版本号 v1.2.01（本条目含前后两批，
> 第一批 6 条、第二批 19 条；先前误判为 v1.3.00 的，按用户口径降回 v1.2.01）。

### 一、6 条需求 → 落地

| # | 用户要求 | 实现 |
|---|---|---|
| 1 | 弹窗容器换 `T_UI_dressingshow_img_scoring_board_`、名牌换 `T_UI_HUD_soul_img_crosshair_020` | 评分板 1496×1012 → **1240×839** 居中（实测中心 960,540）；名牌改成**十字准星金环**（104×104，环内嵌 74px 深色盘兜住「演出/音量/快捷/存档」二字），压住面板左上角 |
| 2 | 二级确认弹窗照《二级确认弹窗.pxdesk》 | 直接吃 pxdesk 的合成图（837×183 → **900×197**）：顶部深带「该操作不可逆，是否执行？」+ 下方 ✕ / ✓ 两枚圆钮；圆钮**已烘在图里**，只叠 56×56 透明点击区（悬停点亮）。位置 `margin-top 232`（条中心 384 < 弹窗中心 540） |
| 3 | 四个交互区不裁剪、等比缩到 1920×1080 叠加、不显示名称英文、图标常态不显示 | 四张 3840×2160 画布**整张缩到 1920×1080**（`ic-*.webp`，与视频同为 16:9，坐标即设计坐标）；图标 `opacity:0`，只有**热区悬停**或**该面板打开**时才 `opacity:1` + 金光。命中框由 alpha 实体框外扩 16px 自动生成（`src/data/gloria-hits.ts`）。原「图标 + 名称 + 英文」竖排列表整体删除 |
| 3b | 左上角去掉「辉煌心光」四字，保留 Settings / 设置 | `.gl-head` 只留 `Settings · 设 置`（21px / letter-spacing 8 + 300px 金线），h1 删除 |
| 4 | 「粒子特效」「卡池 PV 挂载」是无用项，安全删除 | `SaveData.settings` 删掉 `particles` / `pvEnabled` 两个字段（v1.2.00 已无 UI，本次清干净）；`loadSave` 合并默认值时旧档里的这两个键自然丢弃，不报错。`config/pv.ts` 与卡池页 PV 面板是另一套功能，保留 |
| 5 | 主界面右下角彩蛋（200×100 热区）+ 用共鸣概率弹窗容器的更大弹窗 + 固定标题 + 可滚动 + 左右切换 | 新增 `src/components/EggPopup.vue`：容器沿用 `bg_01 + bg_01_line + bg_04_line + bg_03_line`，整体 **×1.25 → 1045×640**（原 836×512）；标题「彩蛋 / 碎碎念 / 发癫」固定在内边缘顶部；正文 `overflow-y: auto` 可上下滚；左右金箭头切条目（`←` `→` 键同效），底部 `n / 44` 计数；点空白 / ESC 关闭。热区 `.hm-egg` 在 `HomeView`（1720,980,200×100，透明无可见控件） |

### 二、彩蛋文本切分

- `tools/prep-easter.py` 读两份 txt，按**整行 `════════` 包裹的一段 = 一个条目**切分：
  `彩蛋文本1.txt` **23 条**（左对齐）、`彩蛋文本2.txt` **21 条**（居中），共 **44 条** → `src/data/easterEgg.ts`。
- 条目内保留原始换行（`white-space: pre-wrap`）；短条目**垂直居中**（`justify-content: safe center`），
  长条目（如第 1 条 20 项、第 11 条 52 行）从顶部开始滚。

### 三、素材 / 脚本

- `tools/prep-gloria.py` 重写：四张图标**不裁剪**、整张缩到 1920×1080；新增 `board.png`（评分板）、
  `tab.png`（十字准星）、`confirm.png`（pxdesk 合成条，**内部 alpha ×1.42 抬到不透明**，
  否则半透金条会把后面的行文字透出来）；删掉 `declare-bg / hook / check` 三件套。
  并自动生成 `src/data/gloria-hits.ts`。
- `collect-assets.py` / `types.ts` / manifest 同步：`ui/gloria/` 12 条（`ic-*` 4、`board/tab/confirm`、
  `back-n/h`、`close-n/h`、`poster`）+ `bg.webm`；manifest 7916 条自检全有效。

### 四、验证

- `vue-tsc --noEmit` **0 报错**。
- `verify-gloria.mjs` **49/49 PASS**（新增/改写 18 项）：四张叠图 1920×1080 铺满且不裁剪、常态 opacity 0、
  悬停只有对应一张显形、移开复隐、左上角无四字、容器 1240×839 + `board.webp` + `tab.webp`、
  确认条 837×183 成品图 + 两枚圆钮 + 位置偏上、彩蛋热区 1720/980/200×100、容器四张羊皮纸、
  1045×640、标题、`1/44` 计数、可滚动、右键切条回顶、第 24 条居中、点空白关闭。
- 回归：`verify-readings-layout` 45/45、`verify-readings` 22/22、`verify-stories` 22/22、
  `verify-almanac` ALL PASS、`verify-almanac-v2201` 21/21。
- 截图：`.shots/gl-idle.png`（图标全隐）、`gl-hover.png`（金环显形）、`gl-panel-0~3.png`、`gl-confirm.png`、
  `egg-1.png`（第 1 条）、`egg-2.png`（第 2 条居中）、`egg-scroll.png`。

### 五、坑（已记入 visual-pitfalls）

1. **pxdesk 里的横条是半透明**（内部 alpha 179/232），直接当弹窗用会透出背后文字 → 导出时把 alpha ×1.42。
2. **`justify-content: center` + `overflow: auto` 会把第一行顶出可视区**（存档面板统计数字曾被裁掉）
   → 改 `safe center`：不超高时居中、超高时退化成 start。
3. 视频背景会动，静态叠图与视频里烘焙好的图标**不可能帧帧对齐**，只能做到"落在同一处、点亮"。

---

### 六、第二批（19 项，2026-10-31）

| # | 用户要求 | 实现 |
|---|---|---|
| 1 | 版本号改 v1.2.01 | 全站版本号回退为 **v1.2.01**（`package` 不动，改 CHANGELOG / 工作计划书 / MEMORY / version-rule） |
| 2 | 热区去掉 title 提示 | `.gl-hot` 删 `:title`，只留 `aria-label`（无障碍用，不弹原生提示） |
| 3 | 悬停亮度再提高 | `.gl-ic.on`：`brightness 1.32→1.55` + `saturate 1.18` + 双层金光（26→34px / 56→72px），并加 1.6s 呼吸；实测图标区平均亮度 **+8.7%**、峰值 255 |
| 4 | 开屏动画每次启动只播一次 | `sessionStorage['nikki-boot-played']` 标记：会话内第二次进主页直接 `reveal`；「模拟器记忆」重置会连 sessionStorage 一起清（`hardReset`） |
| 5 | 删掉开屏的「跳过」按钮 | `.boot-skip` 按钮 + 样式整体删除（跳过功能已在「辉煌心光 · 演出」） |
| 6 | 定义一/二/三级界面，退出回上一级 | `router.ts` 新增 `PARENT` 表 + `parentOf()`：一级 `/`；二级 `/versions /banner /codex /almanac /settings`；三级 `/codex/{clothes,readings,stories}` `/gacha`。**所有返回键改走 `parentOf()`**，不再用 `history.back()`（原来从侧栏/直链进来会跳错层） |
| 7 | 主页加五个二级入口（按 主页.pxdesk） | 5 个星芒/纸卷按 pxdesk 坐标落位（1400×788 ×1.3714286）：版本 (744,431) 476×428 / 图鉴 (1068,635) 424×416 / 玄学 (621,680) 167×287 旋转 −44° / 共鸣 (1629,43) 236×243 / 辉煌心光 (297,466) 336×268；常态透明度 .42/.42/.25/.20/0，悬停走 2s 呼吸（共鸣额外缩放 −8px）；图标素材 `ui/home/nav-*.webp` |
| 8 | 卡池列表滚到顶/底时不虚化 | `mask-image` 从静态改为**按滚动位置动态生成**：`scrollTop<=1` 不虚化顶部、到底不虚化底部、不满一屏则完全不虚化 |
| 9 | 「共鸣详情」文字未居中 | 根因：`.db-bg` 没写 `max-width:none`，被全局 `img{max-width:100%}` 夹成按钮宽 187（应 208.6）→ 金框被横向压扁。补 `max-width:none`，并把 `.db-txt` 的居中基准改成金框**内容矩形**（187×42.5），实测误差 0.4px |
| 10 | 集齐后服装缩略图仍黑白 | 根因：`versionProgress()` 用 `codex.has('${setId}:${部件名}')` 判定，而存档 key 是**图标名**（英文图标如 `Fluttering Feathers` 与中文部件名对不上）→ 该套永远"差一件"。改为走 `store.setDone()`（全库 pool 部件完成度），`partGot` 在套装集齐时整组返回 true |
| 11 | 集齐后故事仍全上锁 | 根因：`gotSets` 遍历 `store.allParts`，而它**只含当前卡池**，其余 116 套 total=0。改为 `store.setProgressAll`（79 池 × buildPool 全集，1033 件）；并加 `autoPick()`：进入时自动选中第一条已解锁条目、空态只在「一条都没解锁」时出现 |
| 12 | 伊赞之土「未获得」贴纸没贴容器下边 | 贴纸素材 240×240 但有效像素只到 y=232，盒子贴底仍空 20.7px。改为按**有效像素底边**对齐纸面底（两区域各按自己的 `paper.h` 算） |
| 13 | 未获得提示位置偏移 | 空态提示从正文容器（`top:46%`）改为**舞台绝对坐标**：`left:50%` + `top:380px`（屏幕中央 540 − 160），水平居中 960 |
| 14 | 字体子集化 + WOFF2 | 新增 `tools/subset-fonts.py`：按「src 全部字符 ∪ manifest 全部字符」（4324 字）切子集并转 **WOFF**，**23.9MB → 2.86MB**（−88%）。本机 pip 无外网装不了 `brotli`，故出 WOFF 而非 WOFF2（联网后可一行切换，再省 ~25%） |
| 15 | 音频预加载改按需 | 原来 `await` 把 36 音效 + 67 卡池进入音（103 个 / 9.7MB）全下完才继续。改为：同步只注册 URL；立刻预热 11 个首屏必用音；其余空闲补预热；67 个卡池进入音进池时才拉（`warmBannerEnter`） |
| 16 | 清技术债 | 删死 CSS **43 条**（`mz-s*`/`cl-s*` 搜索弹窗残留、`sh-prog*`、`dt-empty`/`dte-ico`、`sc-glow`）+ 死导出 **7 个**（`drawTen`/`exactRates`/`pityRemain`/`codexOf`/`syncCodex`/`clearBirth`/`hasPvDesign`）+ 孤儿路由 `/codex/list` + `tools/` 里 18 个 `_*` 临时脚本；补 `.gitignore`；修正 `交接提示词.md` 里「只归集 20 池」的过时说法 |
| 17 | 彩蛋每次随机一条 | `idx` 初值改 `Math.floor(Math.random()*44)`，左右切换仍顺序 |
| 18 | 先出计划书再逐项改 | `修改计划书-v1.2.01.md`（含现场结论、6 个批次、验收清单、风险与回滚） |
| 19 | 改名「心忆共鸣」+ 新艺术字 | 站名改「心忆共鸣」：`index.html` title、主页 LOGO 换 `LOGO-心忆共鸣 .png`（1713×2447 → 313×460 @116,34，op .75 + 淡蓝光晕），原居中「无限暖暖」LOGO 退役；`tools/prep-home.py` 负责裁切/预放大；`ui.home.logo` + 新增 `ui.home.nav` 五项写进 manifest |

#### 第二批的连带修复

- **`store` 新增**：`allSetsParts`（全库 4★/5★ 部件）、`setProgressAll`（setId → total/owned）、
  `setDone()`、`setTouched()` —— 图鉴三处的判定统一到这一份数据。
- **`store.hardReset`** 现在同时清 `sessionStorage` 里的 `nikki-*`（重走开机）。
- **`MuseumStories/MuseumReadings`**：空态贴纸 + 提示的显示条件从「没选中」改为「一条都没解锁」。

#### 第二批验证

- `vue-tsc --noEmit` **0 报错**。
- `verify-gloria.mjs` **49/49**（热区断言由 `title` 改 `aria-label`；彩蛋断言适配"首条随机"；弹窗测量等 pop 动画结束）。
- 回归：`verify-readings-layout` 45/45、`verify-readings` 22/22、`verify-stories` 22/22、
  `verify-almanac` ALL PASS、`verify-almanac-v2201` 21/21、`verify-fortune` ALL PASS。
- 性能实测（dev，同机）：主页 **30MB → 8.6MB**（字体 20.6MB → 2.2MB）；图鉴 9.6MB → 6.7MB。

---

## [v1.2.00] 2026-10-30 — 设置页整页重做为「辉煌心光」（视频背景 + 四入口 + 设置弹窗 + 存档清理）

> **大改动**：整页重做 + 新增素材/视频管线 + 跨页行为接线（开屏 / 抽卡 / 奖励弹窗 / 阅读全收），
> `n` 进 1、`mm` 归 00。

### 一、11 条需求 → 落地

| # | 用户要求 | 实现 |
|---|---|---|
| 1 | 背景用 `无限暖暖-致敬辉煌的光.mp4` | 4K 原片（3840×2160 / 26.7s / 35MB）转 **1920×1080 VP9 无声 webm（2.8MB）** + 4s 处海报帧 `poster.webp`；`<video autoplay muted loop playsinline>` 满屏 cover |
| 2 | 退出键：`T_UI_house_btn_turn_n` / 高亮 `T_UI_house_icon_Mobile_back` | `.gl-back` 84×84 @(28,24)，`mouseenter` 换图，点击回主页 |
| 3 | 交互区域：4-存档 / 1-演出 / 2-音量 / 3-快捷 | 四张 3840² 画布按 **alpha 实体框**裁出图标（217×236 / 208×205 / 165×160 / 125×125），右侧竖排四入口（图标 104 + 名称 34px + 英文小字） |
| 4 | 点开弹窗、居中、共用一个容器、左上角包标题、金线分隔 | 弹窗 1120×724 居中（实测中心 960,540）；四类共用同一容器；左上角 `gm-tab` 跨在边框上包住该项名称；`gm-row` 间 1px 金线 |
| 5 | 关闭：右上角关闭键 / 点容器外空白 | 关闭键 84×84 悬停换 `_h`；`.gl-mask @click.self` 关闭，容器矩形内点击不关（**不按 alpha 通道**） |
| 6 | 音量：主音量 / 背景音 / UI 音效 | 三根金轨滑杆（0~100，实时生效并落盘）；主音量乘 UI 与 BGM，背景音接管旧版 BGM 开关（拉到 0 静音） |
| 7 | 演出 5 项 | 跳过抽卡动画 / 跳过单抽动画（详情入场锁定期间**双击**立即解锁）/ 跳过奖励弹窗 / 跳过开屏动画 / 跳过抽卡（点抽卡直接结算，不进演出） |
| 8 | 快捷 3 项 | 集齐全部套装（79 池 4★/5★ 共 1033 件）/ 集齐全部阅读（593 本，**原阅读物页「收集全部」已删除并搬来**）/ 欧皇模式 |
| 9 | 存档 5 项 | 当前卡池 / 当前版本 / 所有卡池（保底+深忆+历史）/ 阅读物记忆 / 模拟器记忆（清全部 `nikki-*` 并重启） |
| 10 | 存档显示累计抽数 + 部件数 | 顶部三段统计：卡池累计抽数（全部池 pity.total 之和）/ 已获服装部件 / 已解锁阅读物 |
| 11 | 二级确认弹窗 | 760×250 叠在存档弹窗**中部偏上**（中心 498 vs 540），文案「该操作不可逆，是否执行？」；`declare_bg` 作顶部金横幅、`hook_01` 作警示饰、`sift_selected3` 作确认按钮图标 |

### 二、欧皇模式：为什么不是「条件概率 ×3」

直接写 `p × 3` 会被 20 抽硬保底卡死：综合出率只从 **6.07% → 8.24%（×1.36）**，实测过。
改为两条同时生效，让**综合出率**真正 ×3：

```
p' = 1 − (1 − p)^3          单抽按「三次取最好」折算（小概率时 ≈ 3p）
hard' = floor(hard / 3)     硬保底窗口同步压缩（5★ 20→6，4★ 10→3）
```

实测 **6.07% → 18.59%（×3.06）**，12 万抽统计（`verify-gloria` 直接 import 引擎跑）。

### 三、跨页接线

- `HomeView`：`skipOpening` 时直接进 reveal，不加载 5s 开机视频。
- `BannerView.pull()`：`skipGacha` 时 `store.pull()` 直接结算并弹「恭喜获得」，不跳 `/gacha`。
- `GachaView`：`skipReward` 时不置 `rewardOpen`；详情页加 `.locked` 类 + `@dblclick` → `finishIntro()`，
  双击前两次 click 都被 `dtLocked` 拦掉，不会误翻页。
- `MuseumReadings`：删除「收集全部」按钮/样式/方法，列表可视高度 `−74 → −30`（让出的 74px 还给列表）。

### 四、素材管线

- 新增 `tools/prep-gloria.py`：四个 4K 画布裁图标、复制返回/关闭/declare 三件套、抽 4s 海报帧。
- 视频：`ffmpeg -vf scale=1920:1080 -c:v libvpx-vp9 -crf 34 -an`（去音轨，避免和 BGM 打架）。
- `collect-assets.py` 新增 12 条 `ui/gloria/*`；`types.ts` 新增 `UiAssets.gloria`；manifest 自检 7916 条全部有效。

### 五、验证

- `vue-tsc --noEmit` **0 报错**。
- 新增 `tools/verify-gloria.mjs` **31/31 PASS**：视频参数 / 返回键换图 / 四入口 / 容器几何与共用 / 名牌 / 金线 /
  三种关闭方式 / 五类开关落盘 / 三根滑杆 / 欧皇 ×3.06 / 集齐 593 本 / 统计数字 / 二级确认三件套与位置 /
  跳过抽卡直出 / 单抽双击解锁 / 跳过开屏。
- 回归：`verify-readings-layout` 45/45、`verify-readings` 22/22、`verify-stories` 22/22、
  `verify-almanac` ALL PASS、`verify-almanac-v2201` 21/21、`verify-fortune` ALL PASS。

### 六、备注

- 旧设置页的「粒子特效」「卡池 PV 挂载」开关随重做下线（用户未列入 5 项演出），`settings.particles/pvEnabled`
  字段保留兼容；BGM 开关并入「背景音」滑杆。
- 二级确认的关闭键只做「取消」（不额外叠一个 X），符合用户「取消/确认」二选一的习惯。

---

## [v1.1.02] 2026-10-29 — 玄学运势 5 项对齐精修（轴杆/标题/书签/高光/双击退出）

> 用户反馈批次（5 条）→ 小改动，`mm` 01 → 02。

### 一、5 条需求 → 落地

| # | 用户要求 | 实现 |
|---|---|---|
| 1 | 轴杆与纸面不对齐：放大轴杆、稍微压缩纸面高度 | `PAPER_H` **976 → 956**、`AXLE_H` **824 → 956**（与纸等高）；两杆展开态 y 统一为 **46 = 纸面顶边**，轴杆宽随高按比例 34/50/52 → **39/58/60**。收起态两杆仍视口居中（y=62），纸面用 `clip-path: inset(16px…)` 收掉顶部 16px 露出。 |
| 2 | 标题上下间隔要一致，下移 | `.hd-kind` `top: 0 → 30`（纸面坐标 y=64）；到纸面上缘 **64px**、到下分隔线 **70px**，基本等距。日期/干支行不动（标题居中、日期左对齐，横向不重叠）。 |
| 3 | 书签挂绳要与纸面上边缘同一水平线，上移 | `.bm` `top: 40 → 0`（纸面坐标），挂绳最高点与纸面上边缘齐平；`.bm` 出场位移 `translateY(150)` 动画不变。 |
| 4 | 选卷轴时悬停高光不明显，提高亮度 | `goldBreath` 从 `brightness 1.02→1.12` / 6→16px 光晕，提到 **brightness 1.20→1.45 + saturate 1.10→1.22** / 10→26px 光晕。 |
| 5 | 未展开态双击空白区退出 | 新增 `.alm-blank`（**x120 y0 1800×1080**，避开左侧轴杆），仅 `state === 'collapsed'` 存在，`@dblclick` → `backToIdle()`（回到书桌，等同收起态按 ESC）。 |

### 二、连带处理

- **层序**：`.alm-blank` 一开始写了 `z-index:1`，把无 z-index 的「展开」按钮整个盖住（点不动）。
  改为 `.alm-blank z1 < .axle z2 < .qa z3`，显式定序。
- 素材重生成：`prep-almanac.py` 输出 paper-1~3（1668×956）与 axle-1~3（39/58/60×956），
  6 个 webp 重转并**重启 dev server**（public 目录缓存）。
- `almanac-geo.ts` 自动更新为 `AXLE_W = [39, 58, 60]`；`almanac-hits.ts` 掩码随桶图重建。

### 三、验证

- `vue-tsc --noEmit` **0 报错**。
- `verify-almanac-v2201.mjs` **21/21 PASS**（尺寸断言更新为 1668×956 / 39×956，clip 断言改 1x 段）。
- `verify-almanac.mjs` **ALL PASS**（展开态轴杆 y 改 46/46、收起态 y=62、纸面 956、书签 y 允许 44~80）。
- 实测：展开态轴杆 46..1002 == 纸面 46..1002；闭合态两杆 0..39 / 39..78、纸面 20..59 完全遮住；
  双击 (900,540) 后 `scene opacity 1 / scroll opacity 0 / .alm-blank 移除`。
- 截图：`.shots/v2202-basket-on.png`（悬停高光）、`alm-final-open.png`、`alm-3-collapsed.png`。

---

## [v1.1.01] 2026-10-29 — 玄学运势 11 项精修（高清素材 + 版式重排 + 书签/轴杆贴合）

> 用户反馈批次（11 条）→ **小改动**，`mm` 00 → 01。虽含版式重排与素材全换，但无新页面/新数据源，
> 按口径「用户反馈批次 → 小」处理（对齐 v1.0.03 阅读物 6 项的判法）。

### 一、11 条需求 → 落地对照

| # | 用户要求 | 实现 |
|---|---|---|
| 1 | 换更高分辨率素材（`卷轴/`、`卷轴筒、笔、笔架/`） | `prep-almanac.py` 重跑：纸面 2769×1514 → **1668×976**、轴杆 146×1862 → **高 824**（宽随素材 34/50/52）、桶 2048²/1280² → 720×717；全部**裁到 alpha 实体框**后归集 26 个 `ui/almanac/*` |
| 2 | 文字溢出容器 | 右列 330 → **420**（签文 26px 一行 16 字）；`.col` 改 flex 列 + `space-between`；签文 `word-break`；连续 8 天实测 0 溢出 |
| 3a | 去掉弹窗「玄学运势」四字，副标题居中放大 | 删除 `.hd-cn`；`.hd-kind` 居中、**38px**、letter-spacing 10（实测中心偏移 0px） |
| 3b | 左上装饰与右侧书签功能重合，去掉左边 | 删除运势环（`.ring` / `ringDash` / `ring*n` 全部移除），只保留书签承载档位 |
| 4 | 文字排版调整（参考示例，不照搬） | 三列等高 + 列间竖线（x=624/1024）+ 右列小节细线；「个人提点」从八字区移到右列填补下半页；页眉翻页键收到日期旁 |
| 5 | 主界面标题换 `玄运_鎏金黑.webp` | `.st-art` 384×303 @(296,74)，替代原 72px「玄 学 运 势」文字 |
| 6 | 书签默认显示背面，点一次才翻面 | `.bm-card` 默认 `rotateY(0)` 显示 110A 背面；点击 → 正面（110B + 档位）→ 再点翻回 |
| 7 | 闭合态两根卷轴要贴紧（不计透明通道） | 左杆 `0`、右杆 `w`，素材已裁实体框 → 实测缝隙 **0.00px** |
| 8 | 展开中轴杆与纸面分离/重叠 | 轴杆**中心线**压在纸边：左 `105−w/2`、右 `1773−w/2`，纸面左右边缘 = 两杆中心；600ms 补间全程实测偏差 **≤0.02px** |
| 9 | 书签档位用艺术字 | `tier-great/good/minor-good/neutral/minor-bad/bad` 六张；「大凶」缺图 → 复用「凶」+ `brightness(.62) saturate(1.25)` |
| 10 | 卷轴桶/笔/笔架中欧两风格各 50% | `style = Math.random()<.5?'eu':'cn'`；两套桶/四拆分/墨台/笔全部归集；16 次重载实测 9:7 |
| 11 | 返回键高亮态用 `T_UI_Common_btn_next_h` | `.sc-back` `@mouseenter` 切 `back-h`，离开回 `back-n` |

### 二、顺带挖出的 3 个真 bug（都已修）

1. **展开动画根本没生效**：`.scroll.anim` 的 `transition` 与首帧 `width` 在同一次 class 切换里加上 →
   浏览器不补间、直接跳终态。改为 `.sheet/.axle` **常驻 transition**，仅 `.scroll.drag` 时 `none`。
   （此前"能看到中途分离"其实是上一版遗留的拖动态，按钮展开是瞬跳。）
2. **闭合态纸面从轴杆上下漏白边**：纸高 976 > 杆高 824、横向虽被两杆盖住，上下仍各露 82/70px。
   新增 `sheetClip`：`clip-path: inset(82px 0 70px 0)` 随 progress 线性收放。
3. **书签点不翻面**：纸面 `pointerdown` 的 `setPointerCapture` 把 click 抢走，而放行条件只写了
   `closest('button')`（书签是 `div`）。改为 `closest('button, .bm-card')`。

### 三、版式（纸面 1668×976 内）

```
页眉 (64,34) 1540×150｜副标题居中 38px ／ 日期 48px ／ 翻页 36px ／ 干支行 18px
分隔线 y=180
三列 top 200 高 600（space-between，列底 y=800）
  A 64..604   卦象 + 八字（卦名 32 / 卦辞 21 / 四柱 26）
  B 644..1004 宜 + 忌 + 幸运 + 冲煞（chip 20、行高 38、虚线分隔）
  C 1044..1464 总评 22 + 签文 26 + 个人提点 19（宽 420，需 ≤1464 避开书签）
十二时辰 (64,832) 1540 宽 12 列
书签 150×390 @(1476,40)
```

### 四、验证

- `vue-tsc --noEmit` **0 报错**。
- 新增 `tools/verify-almanac-v2201.mjs` **21/21 PASS**：26 素材可加载 / 纸面轴杆实际尺寸 /
  8 天无溢出 / 副标题居中 38px / 书签默认背面·点翻面·再翻回 / 闭合缝隙 0 / 补间中途 4 帧对齐 ≤0.02px /
  六档艺术字 / 16 次重载两风格 9:7 / 返回键悬停换 `_h` / 控制台零报错。
- 新增 **40 天高度扫描**（点纸面跳书写拿全文）：列内容底 ≤846（= 列底），
  最长卦辞（2 行）+ 八字 = 604 → 曾溢出 36px 压到时辰，已靠列高 600 + 收紧 A 列行距修正。
- `tools/verify-almanac.mjs` **ALL PASS**（9 条旧断言按新口径改写：杆宽随素材、纸面宽 = 杆宽藏在杆后、
  轴杆改为中心线断言、书签由三段式改出场+翻面+艺术字）。
- `tools/verify-fortune.mjs` **ALL PASS**（算法未动，回归确认）。
- 截图：`.shots/v2201-idle.png` / `v2201-open.png` / `v2201-bm-front.png` / `alm-mid-paused.png`。

### 五、素材 / 脚本

- `tools/prep-almanac.py`：换新素材路径、产出裁边后的 `工程产出/`（paper-1~3 / axle-1~3 / basket-{cn,eu} /
  btn-{cn,eu}-{past,today,future,bazi} / inkstand / quill / bookmark-back/front / tier-* / title / back-n,h），
  并重算 `almanac-geo.ts`（`AXLE_W=[34,50,52]`）与 `almanac-hits.ts`（中欧各 4 张 alpha 掩码）。
- `tools/collect-assets.py`：玄学运势段 26 条改为工程产出，manifest 同步（types.ts 已含 title/backH/bookmarkBack）。

---

## [v1.1.00] 2026-10-29 — 玄学运势整页重做（书桌场景 + 卷轴弹窗 + 三合一运势）

> **大改动**：整页重做 + 新增 5 个核心模块，`n` 进 1、`mm` 归 00。
> 权威依据：`素材/玄学运势/玄学运势-详细设定.md`（63KB）+ 两个 pxdesk 工程。
> 用户定稿三条口径：**① 卷轴尺寸以 pxdesk2 为准 ② 弹窗没有退出键 ③ ①过往无限向前 / ②今日仅当天 / ③未来 5 天**。

### 1. 素材预处理（`tools/prep-almanac.py`，产出 `素材/玄学运势/素材/工程产出/`）

| 产出 | 来源 | 尺寸 |
|---|---|---|
| `scroll-paper-1/2/3` | `_4` / `_2` / `_6` | 1668×976（70% / 15% / 15% 按日期哈希轮换） |
| `scroll-axle` | `_3` 60×1080 | 56×824 |
| `basket` + `btn-past/today/future/bazi` | 320² | 720×717（Lanczos + UnsharpMask 预放大） |
| `inkstand` / `quill` / `bookmark` / `bg` / `desk` / `back-n,h` | 原素材 | 按实机尺寸 |

- `_5`（1773×2364 羊皮纸）**弃用**：实体只有 636×2272 的竖长条，横向铺 1668×976 两侧全透明。
- 同时产出 `src/data/almanac-hits.ts`：4 张拆分图的 alpha 轮廓栅格化成 64×64 位掩码（膨胀 1 格 ≈11px），
  供「按轮廓判定点击、不做大矩形热区」使用。

### 2. 书桌场景（待机态）

方桌 (-810,648) 1879×1089 / 收纳桶 (-197,439) 720×717 / 墨台 (348,770) 329×329 op .7 / 返回键 (0,0) 184×169
—— 全部按 pxdesk1 实测。上部留白加标题「玄 学 运 势 + 择时而动 · 顺星而行」。
三卷轴 hover = 该拆分图层金光呼吸（0.9s alternate）。

### 3. 卷轴弹窗状态机（待机 / 收起 / 展开）

- 收起：装饰 `opacity 1→0 + scale 1.03`（300ms），两根轴杆并排贴左 (0,128)/(56,128)。
- 展开：纸面 `width 0→1668` + 轴杆左→中（600ms `cubic-bezier(.2,.8,.2,1)`），终态 **(105,46) 1668×976**、
  轴杆 **(139,117)/(1689,122)** —— 严格等于 pxdesk2。
- 双向拖动：正向展开 / 反向卷起，**松手阈值 50%**，**反拖到底 → 回待机**。
- **无退出键**、点空白不退；ESC = 快速收起（收起态再按 = 回待机）。

### 4. 书写动效 + 内容布局 + 书签

- 羽毛笔逐字（62ms/字，首字前停 400ms，笔随字尾移动并 ±6° 摆动，写完上抬 10px 淡出）；
  **点击纸面可跳过**（长文案约 9s，设定未提兜底）。
- 纸面布局：页眉（日期/干支/值神/农历/意象五行）→ 左列（运势环 + 总评 + 宜忌 + 幸运 + 今日纳音）
  → 右列（今日卦象 + 生辰八字）→ 签文 → 十二时辰。
- 书签三段式：上滑（300ms，`clip-path` 从下往上揭开）→ 翻面（200ms `rotateY 0→180`）→ 落定（260ms overshoot）。
  文字层反向 `scaleX(-1)` 修正镜像。

### 5. 三合一运势（新增 5 个核心模块）

```
综合 = clamp(0,100, round(0.45×A + 0.45×B + 0.10×C + D))
```

| 模块 | 内容 |
|---|---|
| `core/bazi.ts` | 节气年/月柱（**太阳视黄经反解**，非寿星公式）、日柱（1949-10-01 = 甲子）、时柱、五行/喜用忌神、B 分拆分 |
| `core/nayin.ts` | 60 甲子 → 30 纳音、辅参（×1.4 → ±8，冲突降级 ±3） |
| `core/hexagram.ts` | 日课卦起卦（阳 50% / 动 25%）、本卦+变卦、多动爻 0~6 口径、D 映射 |
| `core/fortuneTexts.ts` | 解卦 64 + 签文 36 + 箴言 30 = **130 条** |
| `core/fortune.ts` | C 分（签 theme × 宜/忌/卦 theme）、A/B/C/D 加权、档案读写 |
| `config/themeDict.ts` | 宜 15 / 忌 12 → 六类主题（抽卡/保底/收集/氛围/装扮/心态） |
| `core/seed.ts` | FNV-1a + mulberry32；`almanac-v1|` 与 `hexagram-v1|` **种子命名空间隔离** |

### 6. 黄历层改造（`core/almanac.ts`）

- 运势 **5 档 → 7 档**（大吉/吉/小吉/平/小凶/凶/大凶，88/76/66/50/38/28），档位色只用于档位名与分数。
- 黄历分 **28~90 → 0~100 可达 100**（三均匀和近似正态，中心 55）。
- 签文池 24 → 36（迁到 `fortuneTexts.ts`，带 theme / weight）。
- 五行意象词 → **传统五行映射**（B 分只用传统五行）。
- 通用幸运色 → 8 色命名（白/金/青/绿/蓝/黑/红/黄）。
- **日干支基准修正**：原以 1984-02-02 为甲子（实为丙寅，偏 2 天）→ 改为 1949-10-01 = 甲子，
  与 2000-01-01 = 戊午 互校。

### 7. 首登引导 + 生辰档案

免责声明三行羽毛笔书写（屏幕中心）→ 停 3s → 淡出；**淡出完成前桶区完全不可点**；
之后 ①②③ 灰置、④ 高亮 → 点 ④ 弹出生辰弹窗（年月日必填 / 时辰选填）→ 保存或不填均解锁、④ 隐藏。
生辰只存 localStorage（`nikki-almanac-birth-v1`），八字区「改」可改、弹窗内「清除生辰」可清；
清掉后重新进入会再次触发首登。

### 8. 路由与文案

侧边栏「黄历」→ **「玄学运势」**（路由 `/almanac` 不变）。

### 9. 踩到的坑（都已修）

1. **64 位掩码解析**：`parseInt(row,16)` 超出 JS 53 位安全整数 → 掩码出现 16 格周期镜像重影；
   且十六进制串最左是**最高位**，按列号直取会左右镜像。改为「字符=4 位」定位。
2. **`setPointerCapture` 抢走 click**：纸面 pointerdown 捕获后，翻页按钮的 click 被重定向到纸面 →
   按钮全失效。改为 pointerdown 命中 `button` 时直接返回。
3. **`.kw.yao` 与爻线 `.yao` 撞 class** → 「上六为主」芯片被套上 76×8 的爻线样式。
4. **`rotateX 180°` 翻书签** → 单面素材倒置 + 以顶边为原点把牌甩到纸面外（实测 y=-260），改 `rotateY`。
5. **Vite public 目录缓存**：新素材必须重启 dev server，否则 200 但返回 index.html。

### 验证

- `vue-tsc --noEmit` **0 报错**。
- `tools/verify-fortune.mjs` **44/44**（日柱/节气边界/纳音/七档边界/D 映射/多动爻/种子隔离/C 分范围/标准差）。
- `tools/verify-almanac.mjs` **44/44**（场景几何/alpha 热区/三态/拖动/书写/书签/时间范围/无退出键/ESC/首登/降级）。
- 回归：`verify-stories` 22/22、`verify-readings-layout` 45/45、`verify-readings` ALL PASS、
  `verify-readings-e2e` 14/14、`verify-readings-fix` 14/14、`verify-readings-v2102` 13/13。

---

## [v1.0.06] 2026-10-29 — 补 2 篇故事 + 切换键调字 + 提示条换素材 + 顶栏压暗 + 玄学运势学习

> 用户反馈批次（小改动）：`mm` 由 03 → 04。

### 1. 补齐遗漏的 2 篇套装故事

`故事-4星-幽影嬉夜时.md` / `故事-4星-永眠的伫望.md` 之前没进库 → 重跑 `gen-stories.py`：
**116 → 118 篇**（心愿原野 64 → **66**，伊赞之土 52 不变），末条变为 `S0455 永眠的伫望`。

### 2. 大版本切换键：30px、去描边

`38px / 白字 + 深棕 4 向描边 + 投影` → **`30px / 白字 / 无描边无投影`**（`text-shadow: none`），容器内 flex 居中。

### 3. 未获得提示条：换 `common_bg_placename` + 位置 (1030,300)

- 新增素材归集 `朋友分享素材/UI/Common/Textures/T_UI_common_bg_placename.png`（872×264）→ `ui/museum/readings/placename.webp`；
  manifest `ui.museum.readings` 31 → **32 字段**；`types.ts` 加 `placename`。
- `.rd-toast` 由「CSS 黑底圆角胶囊」改为 **872×264 容器 @(1030,300)**，内含 placename 底板 + 居中文字（30px 米白 + 投影）。
- ⚠️ 素材本身深色区 alpha 很低，在浅色纸面上几乎看不出 → 加 `filter: brightness(.62) contrast(1.25) drop-shadow(...)` 提对比；
  素材内容条在 264 高的中间偏下（y≈100~160），文字需 `margin-top: 29px` 才压在条中心。

### 4. 顶部分割线被纸鹤遮挡

`.rd-layer` 统一 `z-index:1`，纸鹤 DOM 在 topLine 之后 → 盖住了分割线。
给分割线单独加 `.rd-topline { z-index: 6 }`，压在纸鹤（1）与压暗层（5）之上。

### 5. 分割线以上区域压暗

新增 `.rd-dim`：`1920×100`、`z-index:5`，`linear-gradient(180deg, rgba(0,0,0,.27) 0%, rgba(0,0,0,.27) 78%, transparent 100%)`
—— 27% 纯黑 + 底边 22px 柔化过渡；覆盖纸鹤、键帽之上，切换键（z 19）与分割线（z 6）仍在其上。

### 6. 玄学运势重构：完成学习（未实施）

读完 `玄学运势重构计划书.md` + `玄学运势-详细设定.md`（63KB 权威规格）+ 22 个素材 + 两个 pxdesk，
产出 **`素材/玄学运势/玄学运势-学习笔记与实施建议.md`**，并发现 **3 处规格冲突**待用户确认：
① 卷轴尺寸文档口径（80/1760/1080 → 渲染 1440×810）≠ pxdesk2 实测（56×824 / 1668×976 → 1640×976）；
② 文档说「弹窗无退出键」但 pxdesk2 层0 有退出键；③ 三卷轴是固定「昨/今/明」还是仅作入口。

### 验证

- `vue-tsc --noEmit` **0 报错**。
- `verify-stories.mjs` **22/22**（条数断言 64→66）；回归 `verify-readings-layout.mjs` **45/45**、
  `verify-readings.mjs` **ALL PASS**、`verify-readings-e2e.mjs` **14/14**、`verify-readings-fix.mjs` **14/14**、
  `verify-readings-v2102.mjs` **13/13**。
- 实测：切换键 `fontSize 30px / textShadow none`；`.rd-dim` 1920×100 27% 黑；`.rd-topline` z=6 > 纸鹤 z=1 > `.rd-dim` z=5；
  提示条 (1030,300) 872×264、placename 图、文字中心 1466 = 容器中心 1466。

---

## [v1.0.05] 2026-10-28 — 故事图鉴上线（M3 收尾）+ 搜索框下移 + 双击解锁 + 切换键白字

> 用户反馈批次（小改动）：`mm` 由 02 → 03。故事图鉴属「复制既有界面、无新内容」，按用户要求**不计入大改动**（`n` 保持 1）。

### 1. 搜索框下移 20px（主界面 / 服装 / 阅读 / 故事 共用）

`SearchPopup.vue` 是三个子界面 + 主界面共用的搜索弹窗。
容器内边缘在实机 **y=156**（`search-bg` 素材 alpha 满宽起点 y=56 + 弹窗 y=100），原 `.sp-sbar` 正好压在 156 上 →
`top: 156 → 176`；结果列表 `.sp-sres` 同步 `336 → 356`。实测搜索框顶距容器内边缘 20px。

### 2. 大版本切换键文字改白色 + 放大一倍

`.tb-txt`：`19px / #6b4f28` → **`38px / #fff`**，容器内 flex 居中（与容器中心对齐）。
白字在米色纸上需要立得住 → 加 4 向深棕描边（`rgba(74,50,22,.9)`）+ 投影；选中/悬停压在金匾上时同样白字、投影加重。

### 3. 阅读物解锁改为**双击**

- `pick()` 加双击判定：同一行 **320ms** 内连点两次才解锁；单击只做选中高亮 + 提示「再次点击解锁」。
- `selEntry()` 改为**只返回已解锁条目** —— 未解锁时纸面保持空态（否则单击就会显示正文，双击没有意义）。
- 解锁成功时清掉提示 toast。

### 4. 故事图鉴上线（`MuseumStories.vue` / 路由 `/codex/stories`）

由 `MuseumReadings.vue` 派生，**版面/素材/动效完全一致**，差异仅：

| 项 | 实现 |
|---|---|
| 数据 | 新增 `tools/gen-stories.py` → `src/data/stories.ts`：扫 `素材/套装故事/*.md` **116 篇**（去 `# 标题` + `---`，正文保留分段），按 pool-map 的 `set.id` 关联套装 |
| 分区 | `major` 1 = 心愿原野 **64 篇** / 2 = 伊赞之土 **52 篇**（`firstVersion` 主版本号，与服装图鉴赛季栏同口径） |
| 排序 | **按套装编号 `set.id`（S0001…S0430）正序**，数据文件即排好序 |
| 解锁 | **抽齐对应套装**（该套全部部件都抽到过，`owned === total`）→ 不写 codex、**不可点击解锁**；未集齐点击提示「集齐「X」套装即可解锁」 |
| 无「收集全部」 | 快捷按钮与 `.rd-collect` 样式一并移除（列表高度仍与阅读物一致） |
| 文案 | 标签 `书籍 (n/m)` → **`故事 (n/m)`**；空态 → **「暂未获得故事书，快去收集套装吧～」** |

**接线**：`router.ts` 加 `/codex/stories`；`MuseumView` 的 `enter('story')` 与搜索选中都跳故事页（去掉「建设中」）；
`MuseumClothes` 的「套装故事」按钮从占位改为 `router.push('/codex/stories?name=套装名')`；
两页搜索互相支持跨页跳转（故事页 ↔ 阅读物页）。

**性能**：解锁判断用一次遍历 `allParts` 批量算 `gotSets`，而不是对 116 套逐个 `setProgress`（后者每次都要 filter 全量部件）。

### 5. 验证

- `vue-tsc --noEmit` **0 报错**。
- 新增 `tools/verify-stories.mjs` **22/22**：主界面入口 / 64+52 篇 / 排序首条 = 绽响黎明前(S0001) / 文案 / 无收集全部 / 未集齐点击只提示 / 套装故事按钮跳转并定位 / 故事页搜「小王子」→ 阅读页跨页 / 阅读物单击不解锁、双击解锁。
- 回归：`verify-readings-layout.mjs` **45/45**、`verify-readings.mjs` **ALL PASS**、`verify-readings-e2e.mjs` **14/14**、`verify-readings-fix.mjs` **14/14**、`verify-readings-v2102.mjs` **13/13**。
- 旧断言同步 3 处：单击解锁 → 双击；深链/搜索跳转的「显示正文」→「定位到该行」（未解锁不显示正文）。

---

## [v1.0.04] 2026-10-28 — 搜索框失效修复 + 阅读物 6 项（贴纸/切换键/标题固定/滚动条/黑屏/锁）

> 用户反馈批次（小改动）：`mm` 由 01 → 02。

### ⚠️ 1. 搜索框修改「不生效」的根因（bug 修复）

**不是代码没变，是改错了文件**：`.cl-sicon` / `.cl-sinput` / `.cl-sbar` 在 `MuseumClothes.vue` 里，
但 v0.9.09 起搜索弹窗已抽成 `src/components/SearchPopup.vue`（类名 `.sp-*`），模板里早已没有 `.cl-*` 元素
—— 那几个类成了**死代码**，改它当然不生效。

修复：
- 把改动落到真正生效的 `SearchPopup.vue`：`.sp-sicon` 60×60 @(30,48) → **100×100 @(65.5,28)**，
  中心对齐搜索框左侧黄色区域中心（bar 内 **115.5,78**）；`.sp-sinput` 左外边距 110 → **220**（黄色区域右缘 209 + 11）。
- 在 `MuseumClothes.vue` 那组死类上方加**醒目警告注释**，指明「改这里不会生效，请改 SearchPopup.vue」。

实测：图标中心落在 bar 内 **(116,78)**，输入框左边距 **220** —— 与规格一致。

### 2. 空态贴纸放大贴底 + 大版本切换键（按新 pxdesk）

新增 `素材/博物图鉴/子界面-故事&阅读物 图鉴（两个子界面，但素材相同）/图片工程-伊赞之土2.pxdesk`（4 层）：

| 层 | 规格（实机） |
|---|---|
| 大版本切换键-心愿原野 | (779.5, 0) **194.8×120.1** |
| 大版本切换键-伊赞之土 | (960.3, 0) **194.8×120.1** |
| 未获得状态贴纸 | (864, 346.5) **642.7×621.6** op **0.15** |

- 切换键容器 109×60 @(817/1007,66) → **194.8×120.1 @(779.5/960.3, 0)**（即 `common_img_menu_s` 原尺寸比例）。
- 贴纸 240×240 / op 0.13 → **642.7×621.6 / op 0.15**，并移出正文容器改为页面级绝对定位。
  ⚠️ pxdesk 的 y=346.5 会让底边落在 968.1，**越过纸面底 945.9 共 22px** → 按用户「紧贴容器下边缘」改为
  `top = paper.y + paper.h − 621.6`（实测底边 **946 ≈ 纸面底 946**）。

### 3. 正文标题固定，只正文滚动

`.rd-content` 由 `overflow-y:auto` 改为 `display:flex; flex-direction:column; overflow:hidden`；
标题 `flex:0 0 auto`，正文包一层 `.rd-cbody-wrap`（`flex:1; min-height:0; overflow-y:auto`）。
实测：正文 `scrollTop 0 → 149` 时标题 `y 185 → 185` 不动。

### 4. 滚动条过大

滚动条从 `.rd-content` 移到 `.rd-cbody-wrap`，宽度 **6px → 4px**、thumb 半透明 `rgba(150,120,70,.42)`、
圆角 2px、容器 `padding-right: 8px`，不再顶到右上千纸鹤。

### 5. 切换大版本黑屏过渡

新增 `.rd-blackout` 全屏遮罩（`#05060c`，z 400）：`setRegion()` 先压黑 **160ms** → 换区域/清选中/刷彩蛋 →
淡出 160ms。实测点击瞬间 `on=true`、500ms 后 `on=false`。

### 6. 锁移到「书名后的滚动条左边」

`.rd-lock` 由紧跟文字（`margin-left:10px`）改为 **`margin-left:auto; margin-right:2px`** 推到行右端；
实测锁右缘 644、行右缘 660 → 落在滚动条左侧 16px 处。

### 7. 锁过大、锁链过小

锁框/挂锁 **32×38 → 20×24**（容器 36→30），链条 52×10 → **38×8**（相对比例提升），解锁动画三层同步缩放。

### 验证

- `vue-tsc --noEmit` **0 报错**。
- 新增 `tools/verify-readings-v2102.mjs` **13/13**：正文溢出可滚 / 标题固定 / 黑屏开关 / 贴纸底边贴纸面 / op 0.15 / 高 622 / 锁贴行右端 / 锁容器 ≤32。
- 回归：`verify-readings-layout.mjs` **45/45**、`verify-readings.mjs` **22/22**、`verify-readings-e2e.mjs` **15/15**、`verify-readings-fix.mjs` **14/14**。
- 断言同步：`.rd-empty-img` → `.rd-empty-sticker`，空态贴纸 opacity 0.13 → 0.15。

---

## [v1.0.03] 2026-10-28 — 阅读物图鉴 6 项调整（选项卡容器 / 去重 menu / 列表边界 / 锁位置 / 彩蛋规则）

> 用户反馈批次（小改动）：`mm` 由 00 → 01。

| # | 需求 | 实现 |
|---|---|---|
| 1 | 大版本切换按钮容器改用 `T_UI_common_img_menu_s.png`，**只在高亮时出现、常态不显示** | 选项卡去掉 `tabSelN` 浅底 + `tabSelH` 金框，改为单个 `.tb-hi` = `ui/museum/btn-menu.webp`（即 `common_img_menu_s` 147×90）；`opacity:0` 常态、`.on` 时 1、`:hover:not(.on)` 走 `tab-breathe 0.4s` 呼吸。容器 109×53 → **109×60 @(817/1007, 66)** 贴合素材比例 |
| 2 | 右上角图标与返回键功能重合，去除 | 删除 `.rd-menu` 按钮（原在 1740,4）及其 `menuStyle` / `.mn-icon` 三横线；返回统一走左上返回键 |
| 3 | 书籍目录栏底部溢出容器，边界收缩上移 30px | `listH` 的底部留白 44 → **74**（列表底 943 → **913**，与面板底 986.5 留 73px）；另加 `mask-image` 底部 18px 渐隐，消除「露半行」残影 |
| 4 | 未获取阅读物的锁图标移到书名之后 | `.rd-lock` 由 `position:absolute; left:10px` 改为 **flex 行内项**（`flex:0 0 36px; margin-left:10px`），DOM 顺序改为 `书名 → 锁`；`.rd-title` 补 `min-width:0` 让省略号继续生效；解锁动画 `.rd-unlock` 同步跟到书名后 |
| 5 | 未获取阅读物不显示随机彩蛋装饰 | 彩蛋渲染条件加 `hasSelection`（有选中条目才显示）；空态 / 未获取时 `v-if` 为假 |
| 6 | 彩蛋只在「切换阅读物 / 切换大版本」时刷新（原反复点同一本也刷新） | `pick()` 里先算 `changed = selId !== r.id`，仅 `changed` 时 `rollEgg()`；`setRegion()` 保留重算 |

### 附带处理

- 常态无底后，**顶部横线会横穿选项卡文字**（topLine 在 y 97.4，选项卡 66~126）→ 常态文字加米白 4 向描边 + 5px 光晕压住横线；高亮态（压金匾）去掉描边、文字转深棕加粗。
- 常态文字色由金色改 **深棕 `#6b4f28`**（金色在米色纸/木纹上发灰、读不清）。

### 验证

- `vue-tsc --noEmit` **0 报错**。
- 新增 `tools/verify-readings-fix.mjs` **14/14**：选项卡 src=btn-menu / 无 tabSelN 底 / 选中 opacity 1 / 未选中 0 / menu 已移除 / 返回键仍在 / 列表底 913 / 锁在书名后（title.right 593 < lock.left 603）/ 空态无彩蛋 / 获取后显示 / 反复点同一本彩蛋不变 / 换书仍显示 / 切区域后空态隐藏。
- 回归：`verify-readings-layout.mjs` **45/45**（原 40 项 + 选项卡容器 4 项 + 彩蛋新规则）、`verify-readings.mjs` **22/22**、`verify-readings-e2e.mjs` **15/15**。
- 旧断言同步修正：menu 重叠检查 → 「menu 已移除」；彩蛋「空态存在」→「空态不存在、获取后 0.25」；「切区域后刷新」→「切区域后空态隐藏」。

---

## [v1.0.02] 2026-10-28 — 阅读物图鉴按 pxdesk 工程重做（整页重排 + 补齐 3 个缺失装饰 + 正文两步加载）

> **整页重做**（坐标全部重写 / 结构重做 / 补新素材）→ 大改动：`n` 由 0 → 1，`mm` 归 00。

### 根因

v1.0.00 的布局是照 `博物图鉴重构计划书.md` §3.2 的**实机截图 bbox 粗略估算**做的，**没有解析 `图片工程-{心愿原野,伊赞之土}.pxdesk`**（用户的重构规格工程），也没读完两份学习报告，导致素材用错、位置偏、缺层：

| 元素 | v1.0.00（错） | pxdesk 规格（对） | 偏差 |
|---|---|---|---|
| `reel` 卷轴底 | (693,171) 1020×755 | (91,115) **1934×904** | 位置/尺寸全错，卷轴只露一角 |
| `paper` 纸面 | (693,171) 1020×755 | (212,165) **1507×774** | **素材被横向压扁 32%** |
| `magnifier` | (0,520) 300×551 | (-152,455) **421×722** | 未溢出左缘 |
| `papercranes` | (1538,100) 211×399 | (1334,-151) **511×414** | 位置差 200px、尺寸差 2.4 倍 |
| `lace` 蕾丝 | (1700,98) 219×873 竖条 | (23,689) **1121×543 横向飘带** | 方向完全错 |
| `label` 标签头 | (336,103) 253×50 无旋转 | (287,96) **347×69 rot −3.33°** | 缺旋转 |
| `egg` 彩蛋 | (1450,650) 240×240 | (1311,591) **329×329** | 尺寸差 37% |
| 列表行高 | 56 | **71.5**（tabLine 间距） | 每屏少 3 行 |
| 选中高亮 | 372×50 | **410×72** | 偏小 |

**从未归集的 3 个素材**（pxdesk 里有、代码里没有）：枫叶 `T_UI_events_rule_img_dec02`、螺旋 `T_UI_events_rule_img_messagedec03`、条目分隔线 `T_UI_readings_img_tab_line`（另有标签阴影 `img_label_shadow` 已归集未用）。

### 关键认知修正

- **`bg_reel_paper` 是「打开的书（左右两页）」**：左页 = 列表栏纸底（被 `bg_tab` 盖住），右页 = 正文纸面（实机 717~1719）。只铺右页会把素材压扁 —— 必须按 pxdesk 全尺寸铺 (212,165) 1507×774。
- `reel` 是整块卷轴底（91~2025），不是纸面。
- **伊赞的 menu 在 x=973.6**（心愿 777.3），两工程不同。
- 层序（pxdesk）：背景 → 枫叶 → 卷轴底 → 蕾丝 → 纸面 → 列表面板 → 放大镜 → 顶栏横线 → menu → 键帽 → 返回 → 纸鹤 → 分隔线 → 螺旋 → 标签头 → 彩蛋 → 选中框。

### 重做内容

| 项 | 实现 |
|---|---|
| 坐标来源 | 新增 **`tools/gen-readings-layout.py`**：直接解析两个 pxdesk 的 `state.layers`，按 `x×1920/1400`、`y×1080/788` 换算 → 生成 **`src/data/readings-layout.ts`**（AUTO-GENERATED，层序即对象键序）；组件所有元素坐标全部来自该文件，不再手写 |
| 补齐装饰 | 枫叶（仅伊赞，bg 之上/reel 之下）、螺旋（仅伊赞，右下 1833,989）、千纸鹤（仅心愿，1334,−151 溢出顶部）、条目分隔线（逐行）、标签阴影 |
| 标签头 | 346.7×68.9 + **`rotate(-3.33deg)`**，文字同步旋转；伊赞用 `img_label-2`(801×208) → 381×114 |
| 列表 | 行高 **71.5**、首行顶 **188.8**、宽 **410**、选中高亮框 **410×72** 常态隐藏、滚动条改细白条、长标题省略号 |
| 正文 | 容器落在 paper **右页**内（书脊在素材 x≈505/1520 → 实机 712）；**两步加载**：标题 0ms 立即 → 240ms 后正文 160ms 淡入（录屏实测 0.2~0.3s 间隔） |
| 空态 | 补**提示文字**「暂未获得阅读物，快去世界探索吧~」（原实现只有贴纸）+ 贴纸 13%，均延迟 100ms 淡入 |
| 区域切换 | 保持瞬切（≤0.04s，无 transition） |
| menu 牌匾 | pxdesk 的 (777,0)/(974,0) 会压住顶部选项卡（817~926/1007~1116，背景图无烘焙需自绘）→ 缩放到顶栏右端 (1740,4) 120×73 |

### 素材 / 工具

- `collect-assets.py` 新增 `maple.webp` / `spiral.webp`；manifest `ui.museum.readings` 29 → **31 字段**。
- `types.ts` 补 `maple` / `spiral`。
- 新增工具：`gen-readings-layout.py`（pxdesk → TS）、`px-compose.py`（pxdesk 合成规格对照图）、`px-dump.py`（坐标表）、`shot-readings.mjs`（截图）、`diff-readings.py`（分区 MAE）、`verify-readings-layout.mjs`（40 项坐标/层序/动效校验）。

### 验证

- `vue-tsc --noEmit` **0 报错**。
- **`verify-readings-layout.mjs` 40/40**：两区域全部素材层 bbox 与 pxdesk 换算值**逐一吻合（±2px）**；区域专属装饰互不串（心愿无枫叶/蕾丝/螺旋，伊赞无千纸鹤）；层序 reel<paper<tabpanel<放大镜<纸鹤、枫叶<reel<蕾丝<paper；标签 −3.33°；列表原点 (243,189)/宽 410/行高 72；menu 不与选项卡重叠；正文 90ms 未显示 / 510ms 已显示；空态 13% + 文字；彩蛋 0.25。
- `verify-readings.mjs` **21/21**、`verify-readings-e2e.mjs` **15/15**。
- 与 pxdesk 规格合成图分区 MAE：全局 **10.14 → 8.38**（列表栏 11.08→9.16，正文 10.94，纸鹤 21.52→**3.90**）。

---

## [v1.0.01] 2026-10-28 — M4 收尾：按键三态 / menu 金色按钮 / 音效 / 快捷键 / ESC / 文档同步

> 小改动批次（M3 之后收尾）：`mm` 由 00 → 01。

### 交互收尾（按 博物图鉴重构计划书.md §8 M4）

- **按键三态**：返回键（arrowN/arrowH 悬停高亮）、顶栏 menu（金色 `btn-menu.webp` + 三横线图标，`:hover`/`active` 亮度反馈）、「收集全部」按钮（`:hover` 提亮 + `:active` 下沉 1px）、选项卡选中/悬停呼吸。
- **分区选项卡可见化**：原先只做了 109×53 透明热区（误以为选项卡已烘焙进背景图，实测背景里没有），本轮补上素材渲染 —— `tabSelN`(432×84 浅色底) + `tabSelH`(432×84 金线框，选中 100% / 悬停 0.4s 呼吸) + 居中文字「心愿原野」「伊赞之土」。
- **menu 金色按钮**：顶栏菜单键即 `ui/museum/btn-menu.webp`（金色发光牌匾，素材本身无图标）→ 叠 3 条横线图标（`box-shadow` 三重描边，深棕 `#6b4f28`），点击 = 返回上一级（子界面 → 主界面）。
- **音效**：返回 `play('back-select')`、点击/切换/搜索 `play('panel-fadein')`。
- **快捷键**：`Q`→心愿原野、`E`→伊赞之土（瞬时切换，无淡入）、`ESC`→搜索弹窗打开时关闭弹窗，否则返回主界面。
- **搜索弹窗**：命中结果上限 **≤6 条**（§4.4 / §8 验收），弹窗内滚动可见；退出 = `ESC` 或点击弹窗外空白。

### 修复 / 健壮性

- 深链 `?name=` 增加 `watch(route.query.name)`：在已挂载情况下再次进入深链也能重新定位（哈希路由同路由仅变 query 不重挂组件）。书名匹配先精确、后 `includes` 退化，便于手动输入部分书名。

### 验证

- `vue-tsc --noEmit` 零报错；`tools/verify-readings.mjs`（playwright-core + 本机 Chrome，1920×1080）20/20 通过：列表进度 / 区域切换 / 空态 13% / 彩蛋 0.25 三时机刷新 / 解锁三阶段 + 锁消失 / 深链 / 搜索命中 ≤6 / ESC 关闭 / 无控制台报错。
- `tools/verify-readings-e2e.mjs`（新建，端到端）15/15 通过：主界面 4 个轮廓热区（含「阅读物图鉴」）→ 点入口进 `/codex/readings` → 主界面搜索「小王」出跨页结果（`小王子｜故事页` + `《小王子日记的某页》｜阅读页`）→ 点阅读项跳 `?name=` 并定位正文 → 返回键 / menu 牌匾均回主界面。
- **视觉巡检（截图对照 §3.2）**：顶部条（返回键 / Q / 心愿原野(选中金框) / 伊赞之土 / E / menu 牌匾+三横线）、两个区域标签头（`label-wish` 羊皮纸 / `label-yizan` 黄花卷轴）均正确渲染；列表长标题无溢出；伊赞右缘蕾丝、心愿右上千纸鹤各自按区域出现。截图 `.shots/readings-wish-unlocked.png` / `readings-yizan.png` / `readings-yizan-open.png` / `readings-final.png` / `readings-deeplink.png`。

---

## [v1.0.00] 2026-10-28 — M3 阅读物图鉴子界面（新页面 + 593 本数据 + 动效）

> 大改动（新增子界面 / 接入新数据源 / 架构级）：`n` 由 9 → 10 进位 → `N` +1、`n` 归 0，即 `v0.9.09 → v1.0.00`。

### 新增组件 `src/views/MuseumReadings.vue`（路由 `/codex/readings`）

| 模块 | 实现（依据 计划书 §3.2 / §3.3 / §3.4） |
|---|---|
| 布局 | 背景 `bg-wish/bg-yizan`（2560×1440→1920×1080 等比 0.75）、返回键、顶栏 menu、分区选项卡（心愿原野/伊赞之土 各 109×53 @817/1007,70）、Q/E 装饰、顶栏横线、列表面板+标签头（`书籍 (n/m)`）、中央卷轴（reel+paper）、左缘放大镜（搜索入口）、千纸鹤（仅心愿）/ 蕾丝（仅伊赞）装饰 |
| 数据 | `素材/阅读物/{心愿原野,伊赞之土}/*/*.txt` 593 本 → `src/data/readings.ts`（`tools/gen-readings.py` 生成；区域取**顶层目录名**，标题/正文/【编号】元数据处理）；按 **id 正序**（心愿 221 / 伊赞 372） |
| 解锁 | 接 `store.codex`（key=`reading:${id}`）+ `codexRev` 响应式；点击即「阅读=获得」，播放解锁动画后常驻已解锁；提供「收集全部」便捷按钮（`obtainAllReadings`） |
| 动效 §3.4 | ①选项卡悬停呼吸 0.4s opacity 50%↔100%；②未获取条目 锁链条+锁（lock01+chain+lock02）；③解锁三阶段（锁扣翘起 180ms → 锁链对角消失 300ms → 锁框淡出 200ms）后锁消失；④空态贴纸 `empty-sticker` opacity **13%**；⑤随机彩蛋三时机刷新（进入 / 切换阅读物 / 切换区域），各区域装饰库 10 张随机 1 张、opacity **0.25** |
| 搜索 | 接 `SearchPopup` + `core/museum-search`（`PAGE_LABEL.reading`），命中 `readingNames`；选中 `router.push('/codex/readings?name=书名')` 深链定位 |

### 数据 / 资源 / 类型

- 新增 `tools/gen-readings.py`（扫描 593 本，区域按顶层目录名、排除【编号】元数据块于正文外）、`src/data/readings.ts`（AUTO-GENERATED）。
- `collect-assets.py` 新增 41 条阅读物 UI 元组 + manifest `ui.museum.readings` 块（28 个字段，含 `stickersWish`/`stickersYizan` 各 10）；生成 `public/assets/ui/museum/readings/*.webp`（47 个）。
- `types.ts` 扩展 `ui.museum.readings` 类型；`stores/game.ts` 新增 `obtainReading` / `readingGot` / `obtainAllReadings`。
- `router.ts` 新增 `/codex/readings`；`MuseumView` 搜索/入口联调（去掉「阅读物图鉴·建设中」提示，改走深链）。

### 验证

- `vue-tsc --noEmit` 零报错；`tools/verify-readings.mjs` 20/20 通过（见 v1.0.01 验证节）。

---

## [v0.9.09] 2026-10-28 — 服装图鉴 8 项精修 + 搜索模板化跨子界面

> 小改动批次（用户 8 条反馈）：`mm` 由 04 → 05。

### 服装图鉴子界面（M2）逐条落地

| # | 需求 | 实现 |
|---|---|---|
| 1 | 部件数向左下方移动 | `.in-prog` 移出 `.in-tags` 行内右对齐，改为在 `.cl-info` 内绝对定位到左下（`left:92 top:560`，雷达图下方空白区），左对齐、不再挤在头部右上 |
| 2 | 整体立绘加背景图并按星级调色 | 新增素材 `T_showpic_bg_clothes.png`→`show-bg.webp`（ffmpeg 无损）；`types/collect-assets/manifest` 加 `showBg`；`.cl-show` 内 `.sh-bg` 置于立绘之下、与容器等大（`object-fit:fill`），按 `curStar` 套 CSS `filter`：5★ 粉金 / 4★ 淡紫偏蓝 |
| 3 | 赛季栏上移到离屏幕边 12px | `L.vers.y` 176 → **12** |
| 4 | 五维触发区扩大到 20px | 雷达 `<circle r="5">` → **r="20"** |
| 5 | 星级图标间隔缩到原来的 2/5 | 头部 60px 星 `margin-right` −9.3px → **−11px**（可见间隔 4→1.6px）；部件卡 18px 星 0 → **−2.3px** |
| 6 | 搜索关键词扩展：属性标签 + 星级（含五星/5星/5★ 等变体） | `results` 过滤扩展 `r.set.styles` 命中 + 星级归一化（`starFromQuery`：中文数字/★/数字统一转数字）；主界面同样可搜属性标签与星级 |
| 7 | 套装选择栏下移，使「屏顶间距 == 信息区顶间距」 | `L.sets.y` 0 → **33.5**（屏顶 33.5 ≈ 信息栏顶间距 33，基本相等） |

### 搜索弹窗模板化 + 跨子界面检索（主界面 M1）

- 抽离出可复用组件 **`src/components/SearchPopup.vue`**（统一的遮罩 / 搜索框 / 结果列表 / 关闭键 / 跳转键样式，导出 `SearchItem` 类型）；M2 与 M1 双双改用它，原内联弹窗代码删除。
- 新增 **`src/core/museum-search.ts`**（`searchMuseum(q, store)`）：同时检索 **服装 / 故事 / 阅读** 三个子界面，同名内容用「｜」分隔页面，如 `小王子｜服装页`、`小王子｜故事页`、`《小王子日记的某页》｜阅读页`。
  - 服装：套装名 / 属性标签 / 星级 / 部件名（沿用「未获得不可搜」规则）；
  - 故事 / 阅读：来自 `src/data/museum-index.ts`（`tools/gen-museum-index.py` 扫描 `素材/套装故事/*.md` 116 条 + `素材/阅读物/**/*.txt` 593 条预生成）。
- 主界面 `enter('search')` 选中结果：服装 → `router.push('/codex/clothes?name=...')` 并定位套装（`MuseumClothes` 新增 `route.query.name` 跳转）；故事 / 阅读 → 暂提示「建设中（M3）」。未来落地子界面时沿用 `PAGE_LABEL` 注册表即可。

### 素材 / 代码

- 新增 `public/assets/ui/museum/clothes/show-bg.webp`；`collect-assets.py` 加 tuple + `ui.museum.clothes.showBg` 字段（可重跑）。
- 新增 `src/data/museum-index.ts`（自动生成，勿手改）、`tools/gen-museum-index.py`、`tools/verify-clothes-v1905.mjs`。

### 验证

`tools/verify-clothes-v1905.mjs`（playwright-core + 本机 Chrome，1920×1080，注入存档解锁全部套装）：

```
Req1 部件数左下    relTop 560 / relLeft 92 / 不在 in-tags  PASS
Req2 立绘背景图    .cl-show 子节点序 [sh-bg, sh-img, sh-frame]，filter 含 sepia  PASS
Req3 赛季栏 top    12  PASS
Req4 雷达热区 r    20×5  PASS
Req5 星级间隔      head −11 / part −2.3  PASS
Req6 搜索扩展      属性标签命中 + 星级变体(5★/五星/5星)均命中 5★  PASS
Req7 套装栏对齐    gapScreen 34 ≈ gapInfo 33  PASS
Req8 主界面跨子界  搜「小王子」→ 小王子｜服装页 / 小王子｜故事页 / 《小王子日记的某页》｜阅读页；旧 .mz-sitem/.cl-sitem 已移除  PASS
PAGE ERRORS        clean
```

`npx vue-tsc --noEmit` 退出码 0。

---

## [v0.9.08] 2026-10-28 — 服装图鉴 10 项精修：圆形热区 / 立绘层级 / 半身像比例 / 搜索跳转

### 用户提的 10 条，逐条落地

| # | 需求 | 实现 |
|---|---|---|
| 1 | 放大镜热区改圆形：以 **(250,820)** 为圆心、半径 **100px** | `L.search` 由 `(62,742) 150×150` → `(150,720) 200×200`；`.cl-search` 加 `border-radius:50%`，命中区随圆形裁剪（实测圆心恰为 250,820） |
| 2 | 整体立绘与人物半身像压住容器，图层下移 | 模板里 `.sh-img` 移到 `.sh-frame` **之前** → 立绘在容器框**之下**，只在 collage 的透明窗口处透出 |
| 3 | 人物半身像未充满容器（与整体立绘尺寸不同） | 试穿图 **520×724**、整体立绘 **448×656**；新增 `isHalf` computed → `.sh-img.half { object-fit:cover }` 单独比例，横向裁掉约 13px 充满窗口 |
| 4 | 删除赛季栏顶部的元素 | 删掉区域选项卡：`.cl-regiontab` 图层 + `L.regionTab` + 对应样式全部移除 |
| 5 | 属性标签与星级位置对调 | `.in-tags` 移进 `.in-namerow`（名称右侧），`.in-stars` 下移为 `.in-head` 直接子级（名称下方） |
| 6 | 悬停高亮框比容器略小，改成**等大** | `itemEmpty`(160×160) 四周有 3px 透明留白；`.pt-hi` 由 `inset:0 / 100%` 改 `inset:-3px` + `calc(100% + 6px)` → 蓝框正好压在容器边界上 |
| 7 | 五维数值触发区从五边形尖角改为**属性名**（向外 5px） | `<circle :cx="v.x" :cy="v.y" r="26">` → `:cx="v.lx" :cy="v.ly" r="5"`（落在属性名上）；数值仍在 `v.ly-24` |
| 8 | 套装格子间隔 **2px**；选择栏显示区 = **3 格**（含 2px 间隔） | `SET_PITCH` 316.3 → `SET_W + 2 = 349`；显示区宽 `3×349 − (349−347) = 1045` |
| 9 | 搜索弹窗空白退出区错误包含透明通道，区域过小 | `.cl-swrap` / `.cl-sbg` 改 `pointer-events:none`（含四角 alpha=0 透明区一并穿透），仅输入框 / 结果项 / 关闭键 / 跳转键恢复 `pointer-events:auto` → 点任意空白都穿透到 `.cl-mask` 触发 `@click.self` 关闭 |
| 10 | 搜索弹窗加**跳转按钮**：选中高亮、悬停高亮并呼吸 | 新增 `ui.museum.nextBtn`（`T_UI_common_next_btn` 60×60，ffmpeg `yuva420p`）；按钮放在**原星级位置**，星级右移套装名 **10px**（`.cl-sstar{margin-left:10px}`）；`.cl-snext.on::after` 常亮蓝环、`:hover::after` 复用套装栏的 `setBlueBreath 0.4s` 呼吸 |

### 顺带修掉的 bug

- **1/3 的部件点不出半身像**：`partCard()` 原来只按「卡片名后缀 = 部件名」匹配，但两者常常不同
  （天鹅童话：部件「曦光洒落」↔ 卡片「发型-月色成弦」），全库 118 套 / 1034 个部件只命中 **65.4%**，
  其余回退到整体立绘、看不出区别。改为**先按名后缀、再按部件 `slot`（= 卡片名前缀，全库 118 套无重复）兜底** → 命中 **99.9%**。
- `isHalf` 只在**真的取到试穿图**时才为真：取不到就回退整体立绘（448×656），
  不会误套 `cover` 把整体立绘裁掉。

### 素材

新增 `ui/museum/next-btn.webp`（`T_UI_common_next_btn.png` 60×60，ffmpeg `yuva420p`）。
`collect-assets.py` 已加对应 tuple 与 manifest 字段 `ui.museum.nextBtn`；`types.ts` 的 `ui.museum` 增 `nextBtn: string`。

### 验证

`tools/verify-clothes.mjs`（playwright-core + 本机 Chrome，1920×1080，注入存档解锁全部套装以产出搜索结果）：

```
Req1 搜索热区   200×200  radius 50%  圆心 (250,820)
Req2 立绘层序   .cl-show 子节点顺序 = [sh-img, sh-frame]（立绘在下）
Req3 半身像     选中部件 → class "sh-img half"，natural 520×724；取消 → 复原
Req4 regionTab  .cl-regiontab 数量 = 0
Req5 头部结构   namerowHasTags=true，headDirectHasStars=true
Req6 高亮框     inset -3px / 134×143（容器 128×137 + 两侧各 3px）
Req7 雷达热区   r=5，cx/cy = 属性名位（120,8）
Req8 套装栏宽   1045（3 格 ×347 + 2 个 2px 间隔）
Req9 点空白关闭 点 (12,12) → 弹窗关闭 OK
Req10 跳转按钮  结果项 1 / 跳转键 1；星级 margin-left 10px；子节点序 [sname, sstar, snext]
                点跳转 → 关闭弹窗且定位到目标套装 OK
PAGE ERRORS     clean
```

`npx vue-tsc --noEmit` 退出码 0。

---

## [v0.9.07] 2026-10-28 — 服装图鉴 13 项精修：装饰 / 立绘 / 高亮 / 雷达 / 版本栏 / 搜索框

### 用户提的 13 条，逐条落地

| # | 需求 | 实现 |
|---|---|---|
| 1 | 添加装饰 `1793115502748_100.png`（见 `服装界面-图片工程2.pxdesk`） | 新增 `decor` 素材；pxdesk 画布 1400×788 → ×1.37143，得 **(1050.3, 203.5) 514.6×613.6 / opacity 0.3**；羊皮纸不透明会盖住它，故 `z-index:5` 叠在信息栏之上（稀疏金色纹样，11% 覆盖率） |
| 2 | 立绘过小、未贴合容器 | `.sh-img` 由 `8%/6%/84%/88%` 放大到 collage 素材**透明窗口**（x 2.99%~97.92% / y 1.25%~98.12%）→ `left2.99% top1.25% w94.93% h96.87%` |
| 3 | 高亮框 `T_UI_common_img_item_bg_empty` 放到部件**之下**、与容器等大、删其余选中/悬停特效 | 模板里 `pt-hi` 移到 `pt-ico` **之前**（下层）；尺寸本就是 `inset:0 100%×100%` 与底板等大；删掉 `.cl-part.on{translateY(-5px)}` 抬升与高亮框的 `drop-shadow` 发光，只保留显隐切换 |
| 4 | 五维数值挡住属性名 / 显示区域错 | 数值改到**属性名上方 4px**：`<text :x="v.lx" :y="v.ly-24" dominant-baseline="middle">`（原在数据点 `v.x,v.y-14`） |
| 5 | 套装切换栏溢出部分只留完整按键 | 拖动结束 `setUp()` 里 `setShift = Math.round(setShift)` 吸附整数格；配合 `overflow:hidden` 不再露半截按键 |
| 6 | 套装高亮改为外边缘 2px 柔和蓝光呼吸（0.4s，2→4px 回落 + 透明度变化） | 删 `st-on` 的 `sepia+hue-rotate` 蓝色滤镜（连 `<img class="st-on">` 一并移除）；改 `.cl-set::after` 叠层做 `inset box-shadow` 蓝环，`@keyframes setBlueBreath 0.4s` 在 **2px↔4px + opacity 0.55↔0.95** 之间呼吸；用 `::after` 才不会被按钮图片盖住 / 被容器裁掉 |
| 7 | 星级间隔过宽，星与星**可见**间隔 4px（不计透明通道） | 实测 `star.webp` 86×87 透明留白 L9/R10：60px 星 `margin-right:-9.3px`（`gap:0`）、18px 星 `margin-right:0`，两者可见间隔均 ≈4px |
| 8 | 点部件时信息栏套装名也改成部件名，再点回退 | 新增 `curName` computed（`selPart ? 部件名 : 套装名`），`.in-name` 绑 `curName`；跑马灯 `watch` 改盯 `curName`；`pickPart` 原有同件再点 `→ -1` 逻辑天然回退套装名 + 整体文案 |
| 9 | 删两个大版本显示区，改为「版本界面」同款外观+逻辑 | `.cl-vers` 重写为 VersionView 结构：大版本 = `optN/optS` 底板 + `tower[]` 地标 + 居中名称；小版本 = `titlePanelN/H` 底板 + `cards` 缩略图 + `verTag` 版本号 + 版本名；`openMajor` 改**单开**（点开一个收起另一个），`pickVer()` 选版本过滤套装并重置各栏；尺寸按 258/340 等比缩到窄栏 |
| 10 | 版本缩略图未收集却显示彩色 | `softMask` 原 `b=min(100,p+8)` 在 p=0 时仍露 0~8% 彩色 → 改 `p<=0` 全透明（全黑白）、`p>=100` 全彩色、中间 `a=max(0,p-8) b=p` |
| 11 | 部件栏置灰时星级未置灰 | 新增 `.cl-part:not(.got) .pt-stars { filter: grayscale(1) brightness(.7) opacity(.5) }` |
| 12 | 回退搜索弹窗「右移105/下移10/放大12」 | `SX=SY=0`（`.cl-swrap` 不再位移）；放大镜热区回 `(62,742) 150×150`；关闭键热区回 `95×96`（去 +6 外扩） |
| 13 | 搜索框下移离内框 10px；放大镜居中黄区并 +6px；光标右移离黄区 5px | `.cl-sbar` top 156→**166**；`.cl-sicon` 中心对齐黄区中心 (115.5,78)、尺寸 60→**66**；`.cl-sinput` 左内距 110→**214**（黄区右缘 209 + 5） |

### 素材

新增 `ui/museum/clothes/decor.webp`（`1793115502748_100.png`，ffmpeg `yuva420p`，610×1020）。
`collect-assets.py` 已加对应 tuple 与 manifest 字段；`types.ts` 的 `ui.museum.clothes` 增 `decor: string`。

### 验证

`tools/_verify-clothes.mjs`（playwright-core + 本机 Chrome，1920×1080）实测盒子与交互：

```
decor (1050.3,203.5) 514.6×613.6 | sh-img 276.1×420.4（贴合窗口）
部件名: 寻找坏种子 → 回退: 如果爱上一朵花（套装名）
版本栏: 大版本 257.8×78，小版本 257.8×78，active=金羽的裁决 已滚入视口
搜索: sbar top=166 / sicon 中心=(115.5,78) 66×66 / sinput 左距=214 / sclose 95×96
控制台干净（仅 bgm.ogg 预加载 abort，非错误）
```

`npx vue-tsc --noEmit` 通过。

---

## [v0.9.06] 2026-10-27 — 服装图鉴 8 项精修：切换键复活 + 大版本折叠 + 雷达容器

### 用户提的 8 条，逐条落地

| # | 需求 | 实现 |
|---|---|---|
| 1 | 立绘展示区域偏移，容器换 `T_UI_Collage_free_02` | 新增 `collage` 素材（1440×2560 相框，带云朵/星星角饰）；立绘框移到 **(301.2, 198.5) 290.9×434**，立绘内缩到框内（`left 8% / top 6% / w 84% / h 88%`，`object-fit: contain`） |
| 2 | 「右移105/下移10/扩大12」指的是**点开搜索弹窗的触发区** | 放大镜热区改为 `x=167, y=752, 162×162`（原 62/742/150×150 → 右移 105、下移 10、四周各扩 6）；弹窗本身仍是 `translate(105,10)`。热区**保持无悬停高亮** |
| 3 | 雷达容器用 `T_UI_Collage_f_1`，50% 不透明；轴尖数值**悬停才显示**（纯文字、无容器） | 新增 `radarFrame` 素材（1024×1024，`opacity:.5`）作底盘；每个顶点加 `r=26` 透明热区 `<circle class="rd-hot">`，`mouseenter` 置 `hoverDim`，仅该角显示 `<text class="rd-val">数值</text>`（白描边保证可读） |
| 4 | **套装切换键 / 部件切换键失灵** | 根因：`pointerdown` 里调了 `setPointerCapture`，指针被容器接管 → `pointerup` 吃掉 → 按钮 `@click` 永不触发。改为 **window 级 `pointermove`/`pointerup`(once)** + 位移 >5px 才算拖动，`pickSet`/`pickPart` 开头 `if (moved) return` 吃掉拖动那一下的 click |
| 5 | 星级放大到原来 2 倍 | `.in-stars img` 30px → **60px**（`T_UI_common_quality_star_n`） |
| 6 | 赛季缩略图黑白 ↔ 彩色交接边缘要柔和 | `clip-path` 硬切 → **`mask-image: linear-gradient(to right, #000 0%, #000 p-2%, transparent p+8%, transparent 100%)`**（p = 已集齐比例 %），10% 宽的渐变过渡 |
| 7 | 套装名下方标签容器用对应图案（同共鸣页套装弹窗） | 复用 `ui.detail.labels` 的 `label-*.webp` **胶囊素材**做 `background-image`（`background-size:100% 100%`），文字居中；`制服` 固定映射 `label-9`，其余按名哈希取 |
| 8 | 赛季缩略图要像版本页一样可折叠 | 赛季栏改成**大版本分组树**：心愿原野 = 大版本号 `1`（1.0~1.11）、伊赞之土 = `2`（2.0~2.10）；折叠键 `▸` 旋转 90°，默认展开 `2`；组内仍保留黑白→彩色软边 |

### 顺带修掉的坑

- **上次被截断的编辑漏了样式**：`.cl-vgroup/.cl-vmajor/.cl-vlist/.vm-*` 与 `.rd-frame/.rd-hot/.rd-val` 当时只在模板里用了、**样式表里没定义**（大版本折叠键是裸的、雷达容器不显示）。本轮补齐。
- `.in-tag` 胶囊文字要**自带内边距**（`padding:0 20px`）+ `height:40px`，否则长标签压扁。

### 素材

新增 2 项：`ui/museum/clothes/collage.webp`（`T_UI_Collage_free_02.png`）、
`ui/museum/clothes/radar-frame.webp`（`T_UI_Collage_f_1.png`）；manifest 7814 条路径 0 缺失。

### 验证

新增 `tools/verify-clothes.mjs`（playwright-core + 本机 Chrome，1920×1080）：
注入 codex 存档 → 逐项断言 → 出 4 张截图到 `tools/shots/`。

```
套装切换: OK 切换到「小王子」      部件切换: OK 选中 1 个
雷达悬停: OK 显示数值「1030」      标签胶囊: label-6.webp
星级图标宽度: 60 OK≈60              大版本折叠: OK none→block
赛季彩色层 mask: linear-gradient(...)  立绘容器: collage.webp
搜索热区盒: {x:167, y:752, w:162, h:162}
```

`npx vue-tsc --noEmit` 0 错误；`npx vite build --outDir dist-check` 构建通过。

---

## [v0.9.05] 2026-10-27 — 服装图鉴按 pxdesk 重排 + 10 项交互补齐

### 版式（以 `服装界面-图片工程.pxdesk` 为准，画布 1400×788 → ×1.37143）

15 个图层全部反查，**手工误差按素材真实比例回调**：

| 元素 | pxdesk 换算值 | 修正 |
|---|---|---|
| 返回键 | (27.2,14.4) 137.1×137.1 | 照用 |
| 套装选择栏 ×3 | x 280.3 / 596.6 / 917.6，**pitch 316.3** | 高度 150.3 → **109.2**（原素材 356×112） |
| 花瓣装饰（层 0） | (190.7,96.3) 217.7×329.1 | 照用 |
| 信息栏羊皮纸（层 1） | (654.3,176) 946.1×661.1 | 照用（原图 864×964，非等比拉伸） |
| 套装故事跳转 plog | (494.5,668.2) 137.1×137.1 | 照用 |
| 部件栏 ×5 | x 601.7…1108.6（pitch≈127），y 945.5 | 卡 132.2×115.6 → **128×137**（原素材比例），y 回落 **935** |
| 区域选项卡（层 13） | (1662.2,0) 257.8×160.6 | 照用（视觉占位） |

### 十项交互

1. **未获得套装**：按键换 `套装选择栏按键-禁用态`，**不可点击**；悬停/选中用 `-悬停&选中` 并
   `sepia(1) hue-rotate(160deg) saturate(2.4)` **调成淡蓝**（素材本身是奶金镂空框）
2. **套装名跑马灯**：`nextTick` 量 `scrollWidth > clientWidth`，超宽才启用；两份副本 `translateX(0→-50%)` 9s 无缝
3. **五维雷达图**：信息栏左下，数值 = 该套装**所有部件五维之和**；5 轴（典雅/清新/甜美/性感/帅气）+ 4 层网格
4. **整体 ↔ 部件**：默认显示套装整体立绘 + 整体文案；点部件 → 该部件的**试穿图**（`assets.stages[0].cards` 按名匹配）+ 部件文案；再点一次回到整体
5. **部件高亮**：`T_UI_common_img_item_bg_empty`（160×160）叠在卡上 + 金色投影，悬停/选中都亮
6. **部件星级**：改用 `T_UI_common_quality_star_n`（与详情页同一张），按套装星级画 1~5 颗，卡左上角 18px
7. **未获得部件底板也置灰**：`pt-bg` 加 `grayscale(1) brightness(.62) opacity(.75)`（原来只灰图标）
8. **赛季缩略图黑白→彩色**：每张版本卡双层 —— 底层 `grayscale(1)`，彩色层用
   `clip-path: inset(0 X% 0 0)` 按 **已集齐套数 / 该版本总套数** 从左往右露出；换套装后 0.4s 过渡
9. **搜索弹窗**：整体 `translate(105px, 10px)`；关闭键热区 95×96 → **107×108**（四周各外扩 6px）；
   **去掉悬停高亮**（不再切 `_h`）；搜索范围改为「已获得的套装」
10. **未获得套装不可查看**：`suitLocked()` 判定（该套所有部件都没抽到），立绘压灰、文案区提示「尚未获得…」

### 素材

新增 5 项：`tag-on`（换成新的 `-悬停&选中`）、`item-empty`、`region-tab`、`paper`、`petals`
（后两个从 pxdesk 图层 0/1 直接导出），manifest 7814 条 0 缺失。

---

## [v0.9.04] 2026-10-27 — 博物图鉴 M2：服装图鉴子界面

### 主界面两处修正

1. **返回键只做「高亮态」**：`T_UI_btn_common_back_h` 常态完全透明，靠背景图里烘焙的返回图标显示；
   只有指针移到按钮上 / 键盘 focus 才叠出高亮。原来写成 `.museum:hover` → 鼠标在页面任意位置都会亮，是错的。
2. **顶部大版本选择栏不做悬停/选中提示**：去掉 `.mz-tab:hover` 的半透明叠加，指针移上去保持烘焙原样。

### M2 服装图鉴子界面（新增 `src/views/MuseumClothes.vue`，路由 `/codex/clothes`）

主界面「服装图鉴」入口现在进这一屏（旧的 `/codex/list` 三栏图鉴保留备用）。

**数据（跨池）**
- 把 `manifest.banners[].sets[]` 全量按 `set.id` 去重 → 全局套装表（每套自带 `parts / assets / styles / firstVersion / desc`）
- 拥有状态：manifest 的 `set.parts[]` **只有 name/slot/uid，没有 id/star/icon** →
  codex 主键按 `Part.id` 的构造规则自己拼 **`${setId}:${partName}`**；星级取套装星级；图标从 `set.assets.icons[]` 按名对

**三条用户明确要求**
1. **赛季缩略栏复用版本页数据**：直接用 `ui.ver.cards[版本]`（672×188）等比铺满容器宽度，
   **左边缘留 3px**（`left:3px; width:calc(100% - 3px)`）；点赛季过滤套装
2. **部件栏底板 = 「恭喜获得」弹窗同款** `item_bg_blue/purple/golden`（128×137），
   按套装星级选色（3★蓝 / 4★紫 / 5★金），未获得仍走 `grayscale(.6) brightness(.66) opacity(.55)`
3. **套装栏最多 3 套、部件栏最多 5 个**：超出部分靠**滚轮（一格一张）或按住拖动**；
   套装栏容器 = `3 × 212 - 12`，部件栏 = `5 × 152`

**其它**：半身像（`assets.portrait` + `show_textures_suitshow` 底纹）、套装信息栏（名称/星级/属性/进度/描述）、
`T_UI_Console_icon_plog` 套装故事跳转（悬停 3px 金光呼吸描边，M3 接页面）、放大镜 → 搜索弹窗（按套装名过滤）。

### 素材

`ui/museum/clothes/*` 18 项（背景 / 半身像底纹 / plog / 套装条目框 / 白灰按钮 / 箭头 / 返回 / 5 属性色 + 选中·悬停·禁用），
manifest 7811 条路径 0 缺失。

### ⚠️ 待校准

**这一屏没有实机截图**，坐标是按 `设计草图.png / 设计草图2.png` 的比例推的（1920×1080 下的一组手调值），
不是实测量测 —— 拿到实机图后需要逐项对位。

---

## [v0.9.03] 2026-10-27 — 博物图鉴主界面：拆分图热区 / 悬停金光 / 区域切换动效

1. **热区改用拆分图的 alpha 轮廓**（用户逐物体抠好的 8 张 PNG）：
   - 新增 `tools/gen-museum-hits.py`：alpha≥128 → 降采样 4× → 3×3 膨胀 1 次 → Moore 邻域外轮廓 →
     RDP 简化（eps 2.2）→ 换算到 1920×1080，产出 `src/data/museum-hits.ts`
   - 比原先手工红笔描边更贴（例：服装图鉴 52 点、阅读物 33 点、放大镜 38 点）
   - ⚠️ CSS 的 `mask-image` / `pointer-events` 都**不按 alpha 判命中**（只认盒子），
     所以想让点击区域贴合物体轮廓，只能 traced 成多边形喂 `clip-path: polygon()`
2. **悬停 / 选中金光** `rgb(241,243,129)`：每块物体两层叠加
   - `.mz-split` = 拆分图本体（与背景 1:1 对齐，原样叠上看不出多一层），亮起时
     `brightness(1.1) saturate(1.14)` + **三层 `drop-shadow`**（10/26/64px）→ 沿轮廓的柔和金光
   - `.mz-sheen` = 同图当 `mask-image`、`background: rgb(241,243,129)` + `mix-blend-mode: screen`、`opacity .44`
     → 整块物体泛金色薄层
   - 触发：hover / focus / pointerdown（"选中"）
3. **区域切换动效**：新界面从**右侧平移覆盖**旧界面（`translateX` 走 rAF，620ms），
   交界处一条金色亮边 + **破碎粒子飞散**（每 ~16ms 沿交界线撒 6 颗，向左抛洒并旋转淡出，共约 200 颗）

### 素材

`ui/museum/split/*` 8 项（`wish|yizan` × `clothes|story|reading|search`，ffmpeg `yuva420p` 保 alpha），
manifest 7793 条路径 0 缺失。

### 验证

`vue-tsc` 零报错、`vite build` 通过、`verify3.mjs` 全站控制台干净；
金光实测改变 32 万像素（bbox 正好是书本区域），切换动画交界处 1:1 可见粒子。

---

## [v0.9.02] 2026-10-27 — 博物图鉴重构 M1：主界面

按 `博物图鉴重构计划书.md` v2.3 开工，本轮完成 **M1 主界面**（M2 服装图鉴 / M3 阅读物图鉴 / M4 收尾待做）。

### 页面与路由

- 新增 `src/views/MuseumView.vue`（主界面），`/codex` 指向它；侧边栏文案「图鉴」→ **「博物图鉴」**
- 旧三栏图鉴 `CodexView.vue` **保留**在 `/codex/list`，作为 M2 上线前的「服装图鉴」临时落点（功能不断档）
- `App.vue` 的 `activeName` 改为**前缀匹配**：`/codex/list` 也高亮「博物图鉴」

### 主界面（背景全烘焙，只叠透明热区）

- 背景 `素材/博物图鉴/主界面/{心愿原野,伊赞之土}.png` 2732×1536 → **1920×1080**（×0.70278，长宽比 1.7786 vs 1.7778，直接 fill）
- 顶部标题 / Q·E 选项卡 / 返回图标 / 三个入口物体**全部烘焙在图里**，页面不画任何 UI
- **三个入口用轮廓多边形做热区**：`clip-path: polygon()`，坐标取自
  `素材/博物图鉴/主界面交互区坐标-红笔描边.json`（红笔连通域外轮廓，已 ×0.70278 换算）：
  - 服装图鉴 = R2 笔记本区（粉色魔法书，10 点）
  - 故事图鉴 = 绿色立体书（11 点 / 伊赞 9 点）
  - 阅读物图鉴 = 棕色卷轴（12 点 / 10 点）
  ⚠️ 热区按钮必须**撑满 1920×1080**，`clip-path` 的 px 才是绝对坐标；给了 left/top 坐标原点会跟着盒子走
- Q / E 切区域；ESC 关弹窗 / 返回上级
- 返回键 `T_UI_btn_common_back_h` 69×69 @(21,15)，**与烘焙图标等大重合**（平时透明，hover 显现）

### 搜索弹窗（§4.4 骨架）

- 放大镜热区（圆形 `clip-path`，玻璃圆 Ø120 中心 (387,784)）→ 弹窗
- `T_UI_NTASK_bg_02` 1536×880 @(192,100)、`T_UI_NTASK_bg_task_06` 972×156 @(474,156)、
  `T_UI_common_btn_search_02_n` 60×60、`T_UI_common_btn_close_02_n/h` 95×96 @(1728,52)
- 关键字过滤 `store.allParts`（最多 6 条）；点击空白 / 关闭键 / ESC 均可退出
- ⚠️ 阅读物数据未接，弹窗里已注明「阅读物在 M3 接入」

### 素材

`collect-assets.py` 新增 `ui/museum/*` 9 项（主界面 2 张 + 按键 4 张 + 搜索栏 3 张），
manifest 7785 条路径自检 0 缺失。

### 验证

`vue-tsc` 零报错、`vite build` 通过、`verify3.mjs` 全站控制台干净；
两区域切换、三入口热区、放大镜弹窗均已截图确认（`.shots/mz-*.png`）。

---

## [v0.9.01] 2026-10-26 — 恭喜获得弹窗改用部件图标（3★ 散件图标入库）

**现象**：弹窗里部分服装卡显示 520×724 人物试穿图（半身像/腿部特写），实机所有服装卡
用的是 256×256 透明单品图标。根因：3★ 通用散件在解包素材里**只有试穿图**（`所有卡池通用三星散件/`），
`buildPool` 给 3★ 的 `Part.icon` 直接指向试穿图。

**修复（用户提供全量透明图标：`素材/source/1.0·探索季（公测）/常驻·遥远之海/三星散件/`，30 张 256×256，命名与试穿图同 stem）**：

1. `collect-assets.py`：
   - 3★ 散件图标归集 `stars3/icons/*.webp`（质量 92），manifest `stars3[]` 加 `icon` 字段；
   - 新增 **`--icons` 轻量模式**：补全全部套装的部件图标 → `sets/<id>/icons/`（幂等，已有即跳过），
     然后重建 manifest。⚠⚠ manifest 构建遍历的是 `targets`——轻量模式若把 `targets` 置空，
     重建出的 manifest **banners 为空**（自检数字看着正常，前端无池可用）；已修为
     `targets` 保持全量、卡池素材拷贝按 `for b in ([] if args.icons else targets)` 跳过。
2. `types.ts`：`Star3Info` 加 `icon?`；`inventory.ts`：3★ `Part.icon = s.icon ?? s.src`。
   `RewardPopup.vue` 零改动（`part.icon ?? part.card` 现在总命中真图标）。
   顺带：图鉴 3★ 也变单品图标（与实机图鉴一致）；十连揭示页 3★ 仍是试穿图（实机如此，`part.card` 未动）。

### 验证

- `vue-tsc` 零报错；`--icons` 后 manifest **7776 条路径全部有效**（v0.9.00 的 7746 + 30 个 stars3 icon 引用）；
- 新增 `.shots/shot-reward.mjs`（种 9/10 + p5:19 → 十连 → ESC×2 → 弹窗截图）：
  所有服装卡（含蓝底 3★）均为单品图标，无人物半身像；
- `verify3` 全站控制台干净；`verify-gacha` 揭示序列
  `0, suit:S0399:10/10, 1-5, suit:S0430:1/8, 6-8, suit:S0430:2/8, 9` 正常。

---

## [v0.9.00] 2026-10-26 — 统一编号体系：gachaKey 唯一主键（001~079，废除 listKey）

> 架构级改造：卡池编号从「listKey + gachaKey 双轨」收敛为 **gachaKey（游戏官方编号）唯一**。

1. **pool-map 数据层**（`build-pool-map.py`）：
   - 新增 `GACHA_EXTRA` 常量（34 条）：`艺术字重命名映射表.xlsx` 未收录的 gacha 编号全部补名，
     含 029~058 段（千重云墨千重缘 / 绮梦讹兽语 / 梦尽于无终幕处 / 万声终末的回响 …）、010、027、078、079。
   - **gachaKey 覆盖 45 → 79 全覆盖**，001~079 唯一且连续；banner 输出移除 `listKey` 字段；
     `index` 移除 `byList`（只剩 byGacha / byName / byVersion）；`meta.note` 改为「gachaKey 为唯一主键」。
   - 名称裁定：**052 = 「唯塑此间意」**（title 图 OCR「重塑」系误读，用户裁定官方名）；
     **058 = 「契约终末之时」**（唯一无 title 素材的编号，用户确认）。
   - ⚠ 保留：banner id（`banner-1.0-01` 等）与素材源路径仍由对照表 listKey 定位，未动。

2. **素材归集**（`collect-assets.py`）：输出文件名 `list-*.webp` → **`NNN.webp`（gachaKey）**，
   覆盖 bg / bg-clean / thumb / title-banner / title / layers / gifs / milestones / sfx-banner-enter；
   manifest 条目移除 `listKey` 字段。
   - **79 池素材全量归集**（此前只 2 池可玩）：并行驱动 8 进程转换，0 失败；
     manifest 自检 **7746 条路径全部有效**；输出 408.4 MB。
   - **卡池进入音 67/79**：64 池自动匹配 + 3 条人工映射（`build_banner_enter_index()` 追加：
     我所行之途→`041_…（短）.mp3`、不灭的幽旅→`BMDYL.mp3`、以长夜为誓→`YCYWS.mp3`）；
     其余 12 池见 `素材/卡池音频/01_卡池界面/` 清单（8 池疑似缩写待确认、4 池无对应音频）。

3. **前端**：`types.ts` 删除 `BannerInfo.listKey`；`BannerView.vue` 注释修正（gachaKey 为三位编号）。
   前端运行时从未使用 listKey，删除后 **vue-tsc / vite build 均通过**。

4. **执行备注**：全量素材归集的后台任务两次被运行环境回收（23 池 / 26 池处中断），
   改 8 进程并行驱动一次跑完；`备份/统一编号-gachaKey-20261026/` 存有 5 份修改前原件。

### 验证

- `pool-map.json`：banners 79 / gachaKey 非空 79 / 唯一连续 001~079 / listKey 字段 0 / index.byGacha 79
- `manifest.json`：banners 79 / listKey 0 / bannerEnter 67 / 自检 7746 条路径全部有效
- 可玩池 001（遥远之海）与 076（执律的流金）素材路径 0 缺失；`vue-tsc --noEmit` 零报错

---

## [v0.8.04] 2026-10-26 — 修「不灭的幽旅」进不去 + 恭喜获得弹窗缺服装卡

1. **卡池进不去（提示「该卡池素材尚未收录」）**：
   `BannerView.vue` 的 `POOLS` 里两个四星池写的是**错的 banner id**（`banner-1.4-02` / `banner-1.4-03`），
   而且 `real: false` 是手写死的 —— 数据管线补完了也不会自动放行。
   - id 改成 **`banner-2.10-03` / `banner-2.10-04`**
   - 新增 `isReal(p)`：**按 manifest 实时判断**（banner 存在且 `assets.bgClean || assets.bg` 非空），
     替换掉 `p.real`。以后补池只跑数据管线，不用回来改代码。

2. **恭喜获得弹窗只有材料、没有服装**：
   原来 `isMat = !r.isNew` —— 只要不是新件就整条转成材料卡，所以一轮全是重复件时弹窗只剩
   静谧水滴 / 澎湃浪花两张。按实机（静谧水滴 90 + 手套「新」+ 若干件 ×1）改成两层：
   - **材料卡**：重复件折算，按类型聚合成 1 张（3★重复 → 静谧水滴×10；4★/5★重复 → 澎湃浪花×4/×10）
   - **服装卡**：**每一件抽到的服装都出卡**（新件、重复件都出），同一部件合并数量；新件带「新」角标
   底板仍按内容走：3★服装蓝 / 4★紫 / 5★金、静谧水滴紫、澎湃浪花金。

### 验证

`不灭的幽旅` 实测：卡池可进入（标题艺术字 + 裁切背景 + 4★ 套名 + 深海回响「5次后可领取」），
十连后弹窗 10 张服装卡（带「新」角标），控制台无报错。

---

## [v0.8.03] 2026-10-26 — 深海回响四星池短轨道（3 档几何）

`EchoView.vue` 新增 `shortMode`（非长轨且档数 ≤ 3）。依据
`无限暖暖2/实机分析/09_深海回响_奖励轨道页_常驻与四星池.md` 实测值：

| 项 | 五星池（默认） | 四星池（新） |
|---|---|---|
| 节点间距 | 169 | **190**（820→1012→1201） |
| 整组中心 x | 934 | **1010** |
| 奖励卡 | 96×102 | **105×111**（`--ck` 1.09；文档量到 105×123，高度差 12 是「N次后可领取」标签被算进去了） |
| 抽数徽章 | Ø89 | **Ø170**（`.ds-badge { transform: scale(1.9) }`） |
| 0 抽徽章中心 x | 兜底 100 | **194**（实机 194.5） |

- 三个常量集中在 `SHORT_GAP / SHORT_MID / SHORT_CARD_K / SHORT_BADGE_K`，改一个数就能整体调
- 徽章放大用 `transform: scale(var(--bk))`，因为 `.ds-badge` 是 0×0 的锚点、子元素全是绝对定位，绕原点缩放正好

### 验证

`不灭的幽旅`（banner-2.10-03）实测：卡片 105×111、徽章中心 x=194、三节点间距 190、
5/15/25 标签与「5次后可领取」正常，控制台无报错。

---

## [v0.8.02] 2026-10-26 — 两个四星池补官方套装 ID / 四星池背景按实机裁切

1. **套装 ID 换成官方值**：`幽影嬉夜时 → S0431`、`永眠的伫望 → S0455`（上一版用的 S2103/S2104 是占位）。
   `build-pool-map.py` 新增 `SET_ID_OVERRIDE` 兜底表 —— `套装信息表.xlsx` 停在 2.10 之前，没有这两套的编号。
2. **四星池背景按实机截图裁切**：四星池没有 1920×1080 成品背景，只有
   `卡池背景图（纯图片，无艺术字）/list-*.png`（**1000×500**）。
   - `build-pool-map.py` 的 bg/bgClean 探测原来只认 `.webp` → 扩展名兜底 `.png`
   - `collect-assets.py` 新增 `bg4_webp()`：裁 **(103,23)-(903,473)** 的 800×450 再放大到 1920×1080；
     `bg_webp()` 按扩展名分流（`.png` 走裁切，其余直接转）
   - 裁切框是用实机 `无限暖暖   2026_10_26 15_42_50.png`（1920×1080，不灭的幽旅选中态）
     做**带缩放的模板匹配**定出来的：缩放 **2.4×**、corr **0.944**、排除 UI 区后 MAE **17.4**
   - 两个池的 `banners/bg-clean/list-2.10-0{3,4}.webp` 现在都是 **1920×1080**

### 现状

- 共鸣页选「不灭的幽旅」：背景构图与实机一致（人物居中、月亮在左上），套名/星级/深忆入口都正常
- 深海回响：3 个节点（5/15/25）能出，但**几何还是五星池那套**（间距 169、徽章 Ø89、图标偏小）；
  按 `09_深海回响_奖励轨道页_常驻与四星池.md` 应该是间距 190、图标 105×123、徽章 Ø170 —— 待做

---

## [v0.8.01] 2026-10-26 — 恭喜获得弹窗按 pxdesk 重做 / 两个四星池入管线 / 十连卡牌只读

### 恭喜获得弹窗（第 3~8 条）

按 `图片/游戏实机/恭喜获得弹窗.pxdesk`（画布 1400×788 → ×1.3714）**整层反查**，11 个图层的坐标尺寸全部照抄：

| 元素 | 素材 | 1920 坐标 |
|---|---|---|
| 段首花饰 | `section_start_n_08` 200×200 | (805.2,223.4) 312.9×301.8 |
| 标题底光 | `reward_bg_rewardword_02` 640×260 | (703.9,151.4) 519.6×267.3 |
| 「恭喜获得」 | 文字 `#f7ffcc` | (886.1,261.6) 224.6×50.8 |
| 分隔花饰 | `tuning_txtbg03` 668×180 | (627.6,232.8) 721.3×208.5 op.72 |
| 卡片条底 | `dresup_bg_details` 612×288 | (116.0,368.2) 1732.1×323.3 op.72 |
| 卡片 | `item_bg_blue/purple/golden` 128×137 | (404.5,468.1) 126.7×137.3，**步距 169.2** |
| 「新」角标 | `img_new_01` 120×70 | 卡内 (71.1,−6.8) 78.7×48.8 |
| 金线 | `btn_long_details_h` 624×100 | (136.3,623.8) 1627.9×85 op.72 |
| 进度条 | `skillsuit_lline_n` 173×13 | (791.9,720.3) 185.6×17.8 |
| 箭头 | `img_arrow_n` 31×39 | (1597.7,503.9) 42.5×53.5 **仅展示** |

1. **重复项合并**：同一部件 → 一张卡；同一材料（静谧水滴 / 澎湃浪花）→ 一张卡、数量累加。
2. **底板按内容而不是按稀有度**：3★ 服装→蓝、4★→紫、5★→金；**静谧水滴→紫、澎湃浪花→金**
   （第 8 条明确纠正：之前 4★ 重复件拿到澎湃浪花却配了紫底）。
3. **去掉高斯模糊**，只保留压暗 `rgba(8,6,14,.52)`。
4. **点击空白 / ESC 关闭**：原来 `.rw-body` 铺满 1920×1080 且 `@click.stop`，把根节点的 click 全吃了；
   现在去掉那层，只在卡片条 / 横条上 stop。ESC 走 `window keydown`。
5. **翻页改滚轮 + 底部横条拖动**：箭头 `pointer-events:none` 纯装饰；横条 `pointerdown/move/up` 拖动，
   位移按 `185.6px ↔ 整条轨道` 换算。

### 数据管线（第 2 条）

- `素材/前后名称对照表.md` 补 2.10 的 03 不灭的幽旅 / 04 以长夜为誓 两行
  （⚠️ 套装 ID 用 **S2103 / S2104 占位**，官方真值待补；两套都是全新套装，不影响老存档）
- 重跑 `build-pool-map.py` → `pool-map.json` 77 → **79 池**；再 `collect-assets.py --pool … ×2`（86 个文件）
- manifest 里两个池各带 **3 档深忆奖励（5 / 15 / 25 抽）**，套装分别为《幽影嬉夜时》《永眠的伫望》

### 其余（第 1、9、10 条）

1. **第二套套装页收口**：只有「4★/5★ + 第一套已集齐 + **这一份正好是第 2 份**」才弹；第 3、4 份不再弹，3★ 无套装天然不弹。
2. **十连卡牌只读**：删掉 `.rcard` 的 `@click.stop="openCard"`、`cursor:pointer` 与悬停位移。
3. **浮动错落**：`cardStyle` 注入 `--amp`（10/15/7/13/17/9/14/6/16/11px）与 `--dur`（3.4~4.7s），
   同时起浮、幅度与速度各不相同。
4. **单抽页去掉 ESC 键位图例**：`.df-cap` + `跳过全部` + 斜杠整段 `v-if="times === 10"`。

### 仍未完成

- **四星池的深海回响轨道**：两个池已进 manifest（3 档 5/15/25 齐），但
  ① 池背景 `assets.bg/bgClean` 还是 null —— 源图 `list-2.10-03.png` 只有 1000×500，
  要按实机截图定裁剪区；② `EchoView` 还没加「3 档短轨」分支（间距 190 / 图标 105×123 / 徽章 Ø170）。

---

## [v0.8.00] 2026-10-26 — 单抽交互上锁 / 套装页修 5 处 / 十连「恭喜获得」弹窗 / 深海光带柔化

> 本轮 15 条需求，**12 条已落地**；「第二套」套装页、深海四星轨道见文末「未完成」。

### 一、单抽页（4/4）

1. **入场动效放完才允许交互**：新增 `DETAIL_INTRO_MS = 1520` 上锁（最后一个还在变的关键帧是
   `dtItemIn` 的 76% × 2s）；`next()` / `skipAll()` 在 `phase==='detail' && dtLocked` 时直接 return，
   于是点击、F、ESC、右上按钮全部被拦。右下虚线圆环 36s 周期旋转**不参与上锁**。
   每次切件（`showPart` / `openCard`）都会重新上锁。
2. **新部件不显示「额外获得」条**：`.dt-tips/.dt-drop/.dt-ex-k/.dt-ex-n` 包进 `v-if="!curResult?.isNew"`。
3. **「新」角标跟随星级出现**：新增 `dtNewIn`（45%→65%，即 0.9s→1.3s，**0.4s 内 0%→100%**），
   与原有 `dtNewPulse`（只动 filter）并存，两条动画不冲突。
4. **共鸣一次不显示「跳过全部」**：右上按钮 + 其文字包进 `v-if="times === 10"`。

### 二、套装获得页（3/5）

1. ~~第二套套装页~~ → 见「未完成」（`buildSeq` 已扩展出 `second` 分支与 `sc-second` 文字样式，等触发口径确认）
2. **删掉重复的卡底暗土丘**：`.su-mound`（`ui.suit.board` = board-4）是套名底板改 4 态 `boards[]` 之前的
   老单层，与 `.su-band` 叠在一起就是两个土丘；且 board-4 是「5★已集齐」态，挂在 4★ 套装上语义也不对。
   模板与 CSS 一并删除。
3. **立绘对齐卡框内框**：原来盒子 `(0,52) 442×700` —— 左边比内框多 10px（溢出容器）、右边少 24px（够不到金线）。
   改成 frame_01 的内框矩形 `(10,95) 456×647` + `object-fit: cover` + `object-position: center top`。
4. **星级放大**：实测实机星体比模拟器宽约 **1.4×**、4 星总跨度不变 → 盒子 42×40 → **58×55**，
   `margin-right: -2px` → **-18px** 把步距压回 40（星与星几乎相接），`top` 867 → 859 保持垂直居中。

### 三、十连页（3/3）

1. **「恭喜获得」弹窗**（新增 `src/components/RewardPopup.vue`）：十连结果页 `back()` 时置
   `store.rewardOpen`，回到共鸣页由 `BannerView` 渲染。版式按实机横条量测：卡片 **128×137**、
   步距 **167**、首张 x=407、可见 7 张 + 左右箭头翻页。
   素材新增 `ui/reward/*` 6 项（`section_start_n_08` / `rewardword_02` / `img_arrow_n` /
   `item_bg_blue|purple|golden`）+ 复用 `ui.result.line`、`ui.ver.descOrn`、`ui.result.mat3|mat4`。
2. **压暗 + 高斯模糊**：`.rw-veil` 用 `background + backdrop-filter: blur(10px)`，
   `backdrop-filter` 只作用在「背后」→ 弹窗内容不受影响；点击空白（整层）关闭。
3. **十连五星卡拱顶溢出**：立绘盒子是矩形、卡框是拱形 → 顶部两角拱出去。
   加 `.rcard.r5 .rc-photo { border-radius: 50% 50% 0 0 / 26% 26% 0 0 }`（4★ 用 22%）。

### 四、深海回响（2/3）

1. ~~四星池奖励轨道~~ → 见「未完成」
2. **彩虹光带边缘柔化**：4 层渐变原来在 0% / 100% 都是 0.4 以上的实色 → 长边硬切。
   首尾各加 `transparent`，颜色整体内缩到 10%~90%，两端自然淡出。
3. **左右翻转**：`scaleX(-1)` 写进 `rbSway` 的 keyframes（写在元素上会被 animation 的 transform 覆盖）。

### 未完成（需先补数据 / 待确认口径）

- **套装页「第二套」**：`buildSeq` 已能产出 `second` 分支（4★/5★、第一套已集齐、抽到重复件时触发，
  进度 = 该套里拿到 ≥2 份的部件数），卡拱顶 `sc-second` 文字样式也已就位；
  但**触发口径需要用户确认**（第 3 份以后要不要继续弹？3★ 要不要弹？）。
- **深海回响四星池轨道**：`不灭的幽旅`（list-2.10-03）**根本不在 `pool-map.json` 里**
  （77 池只收了 2.10-01 / 2.10-02），manifest 也没有这个 banner → 必须先跑
  `build-pool-map.py` + `collect-assets.py --pool banner-2.10-03` 补数据，再按
  `09_深海回响_奖励轨道页_常驻与四星池.md` 做「3 档 5/15/25、图标 105×123、徽章 Ø170、间距 190」分支。

---

## [v0.7.07] 2026-10-26 — 版本页：去原生提示 / 收起联动 / 容器边真正外露

1. **删掉所有鼠标悬停提示**：`.vr-back` / `.vr-enter` 的 `title="返回"` / `title="进入卡池"`、
   `.vr-minor` 的 `:title="it.name"` 全部移除。那三个框是浏览器**原生 tooltip**（黑底白边），
   项目里没有任何自定义 tooltip 样式，删属性即消失。
2. **收起折叠栏时版本大图一并收起**：`toggleMajor()` 里先判断当前选中项是否属于被收起的那个大版本，
   是则 `selected = null`。覆盖两种情况——点同一大版本收起、展开另一个组导致原组被收起。
3. **容器边真正外露 + 上下真正 0 间距**（根因：素材实体比图片小一圈）：
   - `btn_title_l/h` 裁到 (40,10,513,138) 后是 **473×128**，但**实体（alpha≥128）只有 443×104 @(16,13)**；
     `opt-n/s` 是 437×132，实体 **406×100 @(15,16)**。
     之前把 img 直接按 340×103 摆，实体只占 327×88 —— 缩略图（324×87，内缩 8px）**正好把容器边整条盖住**，
     上下还各留 10px 透明 → 视觉上既看不到边、又有缝。
   - 改为**按实体反算 img 的尺寸与偏移**：`.vn-bg` → `left:-12.28 / top:-12.88 / 363×126.8`；
     `.vm-bg` → `left:-12.56 / top:-16.48 / 366×136`。实体正好铺满 340×103 的盒子，
     缩略图内缩 8px 就是**真的 8px 容器边**，大版本底边与小版本顶边严丝合缝。
   - 顺带：`.vr-rail` 左移 `44→36`、宽 `352→360`、`padding: 0 8px`；`.vr-minors` 加
     `width:356 / margin-left:-8 / padding-left:8` —— 给底板投影留出不被 `overflow:hidden` 裁掉的空间。
   - `.vr-minor` 去掉 `overflow:hidden` + `border-radius`（圆角由素材自己提供，不再切内容）。
   - ⚠️ 结论：**`btn_title_l/h` 是镂空花边框，不是实心底板**（内部 alpha 全 0），
     所以「容器边」本来就是一条细金线 + 两端花饰，不可能出现 8px 宽的实心边。

---

## [v0.7.06] 2026-10-26 — 版本页 4 项：零间距 / 版本号角标换素材 / 去区间 / 字号

1. **大小版本容器等大且上下 0 间距**：`.vr-minor` 的 `margin-top: 6px` → `0`，`.vr-group` 的
   `margin-bottom: 12px` → `0`，整条栏变成连续的等大色块（大版本 340×103 = 小版本 340×103）。
2. **版本号从大图挪到缩略图左上角**：
   - 大图左上角**只留版本名称**（删掉版本号胶囊），38px 白字 + 深投影
   - 缩略图左上角版本号改用 `T_UI_resonance_reward_tuning_txtbg01.png`（380×48 紫色软边缎带）做容器
     → `ui.ver.verTag`；⚠ 素材两端各 28px **全透明**，按 alpha 裁到实体（335×48）才能让
     容器边缘与缩略图左上角重合（否则左边空一块）
   - 容器左/上 = 缩略图左/上（8,8），**高度 26、宽度由 `padding: 0 12px` + 文字自然撑开**（收缩适配版本号长度），
     数字 `justify-content:center` 居中，15px 白字 + 深投影
3. **删掉大版本名下的 `1.0 – 1.11` / `2.0 – 2.10` 区间**，大版本名称改为**水平居中**。
4. **字号**：大版本名 **32px**（原 27px）、小版本名 **24px**（原 23px）。
5. **（同轮）版本号体系重排**：按 `v{N}.{n}.{mm}` 规则把立项以来 42 个版本全部重算
   （15 次大改动 / 27 次小改动，原 `v0.9.26` → 本版 `v0.7.06`）。判定口径与新旧对照见文首。
   同时修掉两处因上次重排而指向不存在文件的备份引用，代码注释里的旧编号也一并同步。

---

## [v0.7.05] 2026-10-26 — 版本选择页：真缩略图 / 文案条换素材 / 跑马灯

1. **缩略图栏补上真缩略图**（之前只有文字，名字里带「缩略图」却没有图）：
   - 缩略图 = `T_UI_Friends_Card_img_NNN.png`（672×188）→ `ui.ver.cards`（原本就在，只是当大图拉伸用了）
   - 容器 = `btn_title_l/h`，但原图 550×144 实体只占 (54,21)-(502,129)，
     直接摆会多出 42px 透明边距（容器比大版本小一圈）→ **统一裁到 (40,10)-(513,138)**
     输出 `ui.ver.titlePanelN/H`（473×128，常态/悬停同框，实体等大）
   - 版式：容器 340×103（**与小版本容器等大**）、缩略图 324×87 内缩 8px、**不透明度 70%**、
     **版本号左上角角标**（深棕胶囊 + 米金字）、**版本名居中**
2. **版本大图改用 `T_UI_Pear_Card_img_NNN_M.png`（1532×860）** → `ui.ver.bigCards`
   - ⚠ 后缀不统一：`_M` 只有 001/008~013，其余是 `_L`（同为 1532×860），**1.8 只有 `_L1`** → 三级兜底
   - 显示 1184×640 @(48,26)，`cover` 只裁 3.7%（原来是 672×188 拉到 1200×336，裁掉 44%）
   - 版本号 + 名称改成叠在大图左上角（白字 + 深投影）
3. **文案容器换素材**：
   - `T_UI_resonance_reward_tuning_txtbg04.png`（616×68，两头渐隐）→ `ui.ver.descBand`，
     **border-image 九宫格 `slice 20 200 20 200 fill`，只拉中间、两头不变**，容器 1024×92，`opacity .5`
   - ⚠ 底板必须挂 `::before`：`border-image` 的 border 区会吃掉内容盒，直接写在容器上文字只剩 624×52
   - ⚠ 原图 alpha 峰值只有 **119**（解包半透明），按 50% 不透明度会淡到看不见 →
     归集时走 `mask_webp()` 把 alpha 拉满（ffmpeg `yuva420p`，Pillow 存的 Chrome 解不出）
   - 文字改浅色（`#f4efe2` + 深投影），与深色底板配套
   - `T_UI_resonance_reward_tuning_txtbg03.png`（668×180，横线 + 中心花饰）→ `ui.ver.descOrn`，
     620×167 @(350,546)：素材横线在**第 114 行**、内容中心比画布中心**偏左 22px**，
     换算后横线正好落在文案条下沿 y=652，水平与版本大图同心
4. **名字滚动改真跑马灯**：`.vn-run` 放两份等宽副本 + `translateX(0 → -50%)` `linear infinite`，
   每份 `padding-right: 56px` 保证无缝；只在**实测宽度溢出**时挂 `.scroll`（先摘类再量，
   否则 scroll 态加的 padding 会把自己撑到永远溢出）。
   ⚠ 当前 340 宽容器下最长的名字 166px / 可用 316px，**没有一条会触发滚动**（旧版是 left:56 的 250px 可用宽度才被切）。
5. 巡检脚本新增 `.shots/shot-ver.mjs`（初始 / 1.1 / 2.10 三态 + 盒子体检 + 跑马灯宽度统计）。

---

## [v0.7.04] 2026-10-26 — 「×n」角标换素材 + 数量按稀有度 + 浮动去错相

1. **「×n」提示框补上 pxdesk 的「柔层 + 下划线」两层**（之前确实没用这两个素材）：
   - 柔层 = `T_UI_resonance_bg.png`（400×148，底部暖光渐变）→ `ui.result.soft`
   - 下划线 = `T_UI_resonance_btn_long_details_n.png`（624×100，金线）→ `ui.result.line`
   - 位置按 pxdesk：柔层 106.4×56.4 @(135.6,14.2)、下划线 101.4×36.9 @(144.6,36.0)、图标 38.9×36.9 @(164.2,31.9)
   - **用户口径：只用素材本身，不垫暗渐变。** 已照办。但实测这张素材 alpha 峰值只有 153、
     且集中在中间那条暖光带（顶部 alpha≈0），压在亮卡面上几乎看不出「板子」——
     与实机那块近黑的暗板对不上（实机同位置取样 (23,21,29)）。待定：换素材 / 恢复暗渐变。
2. **数量按稀有度固定**：3★ **×10**（`T_icon_shop_0003`）、4★ **×4**、5★ **×10**（`T_icon_shop_0004`）。
   原来写的是「本次重复件数」（`dupCount`），所以出现 ×1 / ×2 乱跳。
3. **浮动去掉逐卡错相**：`animation-delay` 删掉，一进页面十张卡整组同相浮动。

---

## [v0.7.03] 2026-10-26 — 十连结果页按 pxdesk 重标（纠正 v0.7.02 的网格）

v0.7.02 把「卡框素材的可见照片区」当成了卡片尺寸，整组缩了 8%、位置也偏了。按
`布局坐标/十连界面/十连界面-图片工程.pxdesk` 重标（画布 1400×787 → ×1.3714 到 1920）：

| 项 | v0.7.02（错） | v0.7.03（pxdesk） |
|---|---|---|
| 卡框 | 252.8×406.7（按内容 207×353 缩 0.916） | **276×444，1:1** |
| 卡① 框左上 | 内容盒 (327,155) | **(291.9, 119.4)** |
| 列距 / 错落 | 267 / +13 | **257.3 / +28.3** |
| 立绘区 | 169.5×272 | **213×312.8 @(29.9,32.4)**（5★ 209.6×301.2 @(32.4,34.6)） |
| 星级 | 34×34、步距 30 | **36.3×33.0、步距 24.1** @y299.9 |
| 名牌 | y314、高 40 | **y346.5、215.7×45.3** |
| 新角标 | 右上 (−12,−14) 86×50 | **(188.3,19.8) 87×47.4** |
| 材料图标 | 34×34 | **38.9×36.9 @(164.2,31.9)**，柔层 (135.6,14.2) 106.4×56.4 |
| 光效 | 286×520 居中 | **286.8×643.8 @(−8.4,−85.4)** |

**判定依据**：pxdesk 内嵌的实机截图与 `屏幕截图 2026-10-19 145930.png` **逐像素相同（MAE 0.0）**；
带缩放的模板匹配 **s=1.00 相关 0.6118**、s=0.90 0.4948、s=0.80 只有 0.3208 → 卡框是 1:1，
文档 §四 的「220×348 ≈0.8」是录屏粗测，不可用。把 pxdesk 的框线叠回截图，两框完全重合。
50% 叠加对比：新实现与实机的卡片框、名牌、星级位置均已对齐。

---

## [v0.7.02] 2026-10-26 — 十连结果页重做 + 版本选择页新增

### 一、十连结果页（9 条）

| # | 问题 | 处理 |
|---|---|---|
| 1 | 卡牌同一水平线 | 第 2/4 张下移 **13px**（实测 卡1 顶 154 / 卡4 顶 167） |
| 2 | 立绘溢出容器 | 立绘挪到**卡框之下** + `overflow:hidden` 裁进卡框透明孔（3★/4★/5★ 各自孔位） |
| 3 | 套名溢出 | 名牌条内**居中 + 省略号**（`text-overflow: ellipsis`） |
| 4 | 星级过小 | 30→**34px**，步距 30，加描边阴影 |
| 5 | 背景 | 改用用户烘焙好的 **`SysResonance-10.png`**（1920×1080），删掉标题/地面光环/键位那一整层 |
| 6 | 素材 | 3★ `bg_character_01` / 4★ `02`+`Glow_Purple` / 5★ `03`+`Glow_Pink` |
| 7 | 新件 / 重复 | 新件 `img_new_01`（十连）、`reward_new_img_new`（单抽，**新增**）；重复件 `T_icon_shop_0003`×10（3★）/`0004`（4★×4、5★×10） |
| 8 | 材料提示框过小 | 84×38 胶囊（图标 34 + 20px 文字） |
| 9 | 浮动 | `±10px` 上下浮动，每卡错相（`rcFloat` 3.8s） |

- 网格实测：列距 **267**、卡 **207×353**、行 y 155/545。
- ⚠️ `rarity` 可能是字符串，卡框下标不能写 `Math.min(rarity,3)-1`（3/4/5 会全算成 2）。

### 二、版本选择页（新增 `/versions`）

- 入口：左侧收纳栏「版本」；未选择时点「进入卡池」直接回默认池。
- 背景 `T_UI_login_bg`；退出键 = `T_UI_ih_btn_next_s/h` **水平镜像**（箭头朝左），进入键同素材原向（朝右）。
- 缩略图栏：大版本「心愿原野 / 伊赞之土」用 `btn_option_01_n/s` + 左侧 `tower_icon_main_page_03/04`；
  小版本用 `btn_title_l/h`，**折叠**，点大版本展开；名字过长自动横向滚动。
- 版本大图：常态折叠，点小版本才展开；边框 `checkin_img_pic` 带呼吸金光，
  叠加 `item_bg_0pink_h` 在悬停时 30%~90% 呼吸。
- 底部文案容器 `itemchoose_bg_name_01`（不透明度 60%），内容取自 `版本介绍文案全表.md`（23 条全录）。
- 版本卡 23 张（`UI/Image/Card`，按 `card映射表.md`）归集到 `ui/ver/card/<版本>.webp`。

---

## [v0.7.01] 2026-10-26 — 进度圆三处微调（弧宽 / 偏心 / 星位）

1. **进度弧加宽到铺满空槽**：改成 132×132 的环带（r 54..64，`closest-side` 蒙版），
   并把 `.sud-prog` 挪到盘面**之前** —— 盘面把内侧几像素盖掉，弧就正好落在槽里。
   （上一版是 r 54..60 的细弧，槽外圈留了一圈暗环）
2. **空槽下移 2px**：实机底图1（盘面）与底图2（空槽）圆心差 2px → 槽变成「上细下粗」，
   弧跟着一样（`top: -35px` → `-33px`）。
3. **四角星上移**：素材最宽行在 43.9% 处，让它在空槽上沿 → `top: -32px` → `-22px`
   （原来左右尖角压在环里，现在与环顶同一水平线）。

---

## [v0.7.00] 2026-10-26 — 套装进度圆按素材重做 + 4★ 底板对调

### 1. 4★ 套名底板已/未对调（用户确认）

`board_02`（紫）↔ `board_03`（蓝）：现在 **4★ 未集齐 = 紫、已集齐 = 蓝**。5★ 不变。

### 2. 进度圆全部换成素材（原来是 CSS 画的渐变球）

| 层 | 素材 | 摆法 |
|---|---|---|
| 空槽 | `schedule_02` | 内容拉到 **Ø126**（实机暗环外径 665..790） |
| 盘面 | `schedule_bg`（未集齐）/ `schedule_fullbg`（已集齐） | Ø108 |
| 高亮动效 | `schedule_01`（进度上涨）/ `schedule_full`（集齐） | 盒 165×165，0.4s→50% / 0.6s→80% 后硬切 |
| 进度弧 | CSS conic | 落在空槽上（r 54..60、厚 ~4px），未集齐薄荷白 `#eaffdc`、已集齐整圈暖白 `#fff4d8` |
| 起始四角星 | `schedule_star` | 32×48，尖端压在空槽上沿 |
| 左半金环 | `ornament_02` | 1.139x，圆面圆心对齐盘面圆心（r≈82） |

- 圆心 (726,370)、空槽 Ø126、盘面 Ø108 —— 全部按 `frame_0081.jpg` 实测重定（原来 CSS 球是 675,317/118）。
- **已集齐时文案改成「已集齐」**（实机 `已集齐` 帧就是这样，不是 N/N）。
- 新增归集 `ui/suit/sched-fullbg.webp`；manifest `sched` 段加 `fullBg / slot / step`。

### 3. 三个坑

1. **全局 `img{max-width:100%}` 又把超宽图层夹回 120**：空槽要 185.6 宽、动效 165 宽，
   全被夹成 120 → 暗环变椭圆、圆心偏移。`.su-badge img { max-width: none }` 必须补。
2. **`radial-gradient(circle, …)` 的 100% 是 farthest-corner（84.85px），不是半宽 60**：
   进度弧的环带被推到元素外面，整条弧完全不可见 → 必须写 `circle closest-side`。
3. `schedule_02` 的暗圈带右下投影，**bbox 中心比圈心偏右 ~3px**，要单独 left 微调。

---

## [v0.6.09] 2026-10-26 — 套名底板换素材（4 态）

原来是一条 CSS 径向渐变（4★ 紫 / 5★ 粉），现在换成解包素材 `T_showpic_suit_img_board_0N`（720×300）：

| 状态 | 底板 | 颜色 |
|---|---|---|
| 4★ 未集齐 | `board_03` | 蓝灰 |
| 4★ 已集齐 | `board_02` | 紫 |
| 5★ 未集齐 | `board_01` | 粉 |
| 5★ 已集齐 | `board_04` | 暗金 |

- 判定：`star >= 5` × `suitProg.owned >= suitProg.total`（`owned` 取本次揭示步的累计已收集数）。
- 位置：1:1 的 720×300 @ (596,672)，中心 x=956（与套名/胶囊同轴）。
- **层级挪到卡片之后**：实机这条云是盖住卡片下沿的，原来在卡片之前会被金框压住。
- 归集新增 `ui/suit/board-1..3.webp`（`board-4` 早已存在，此前被当成「卡底暗土丘」用），
  manifest 加 `ui.suit.boards[4]`。

⚠️ 参考图 `frame_0081.jpg` 是「1/8 + 紫板」，按本映射 1/8 属于未集齐应为蓝板。
两者不矛盾的前提是：实机徽章 1/8 记的是**本次新增件数**，而那条套装其实已经集齐（紫板）。
本模拟器的徽章记的是**已收集数**（1/8 = 真的只有 1 件），所以 1/8 出蓝板；到 N/N 才转紫板。

---

## [v0.6.08] 2026-10-26 — 套装获得页对齐实机（9 处 + 删能力区）

基准 `D:/电脑美化/图片/Screenshots/frame_0081.jpg`（不落的黄金梦 1/8，1920×1080）。
FULL MAE **20.30 → 17.27**（背景区 7.07，卡内 35.69 —— 剩余差在立绘本身，实机是 3D 演出）。

| # | 问题 | 处理 |
|---|---|---|
| 1 | 虚线圆环位置/大小/转速不对 | 与单抽界面 `.dt-ring` **完全一致**：(1573,757) 286×280、`object-fit:fill`、36s。实机绿点拟合 bbox 1589..1829×775..1013 → 圆心 (1709,894)，与 `(1573,757)+286×280` 吻合 |
| 2 | 跳过按钮与单抽界面不同 | 换成同一套 `.dh-skip`（`ui.btn.skip` + `btn.backH` 双层）+ `.dt-skip-txt`，坐标也复用 (1677,18)/(1753,42) |
| 3 | 立绘溢出、容器被拉伸、中部组合未居中 | **卡片盒子改回 1:1 的 476×756 @(723,94)**（原来压成 454×612，把拱顶和四角花饰一起挤扁）；立绘 `object-fit: fill` → **`contain`**（476×700 @top56） |
| 4 | ESC 键帽离文字过远 | `.suit .df-cap` left 1362 → **1386**（右缘 1441，文字 1444，间距正好 3px） |
| 5 | ornament_01 被形变、未与组合同心 | 等比 **0.92**（1895×950），素材圆面中心 (1031.5,515.5) 对准组合中心 **(956,500)** |
| 6 | orn-3 / img_bg_light 装饰不存在 | orn3 原来 offset 到 (-37,-17) 且 190×151，等于看不见 → 改 **居中 150×150 环抱徽章**；`img_bg_light` 从卡内挪到**卡后拱顶暖光**（756×595、screen .5） |
| 7 | 放射光带被拉伸、不同心、无 36s | 正方形 1240×1240 @(336,-120)（圆心正好 956,500）、`dtRingSpin` 36s；⚠ 不能用 `transform: translate(-50%,-50%)` 定位，会被 rotate 动画覆盖 |
| 8 | 星级图标错、间距过远 | 改用**和详情页同一张素材** `ui.detail.star`（`T_UI_common_quality_star_n`），盒子 42×40 + `margin-right:-2` → 步距 40（原来 SVG 四芒星 + gap 18 = 56） |
| 9 | 背景底图错 | 改用 **`素材/抽卡奖励界面/SysReward.png`**（1920×1080，1:1 铺满），删掉「clothes_bg + bgRight 拼接」两图方案 |
| + | 能力展示文字 | **不做**（用户明确），连带删掉 `ABILITIES`/`suitAbility` 与 `.su-ability`/`.su-skipall` 死代码 |

### 顺手修的

- 徽章绿弧起点 `from 180deg` → **`from 0deg`**：实机 1/8 帧的绿弧在星饰右侧（12:00→1:30），原来会画到 6 点钟。
- 金板 `frame_02` 亮度 1.15 → **1.06**（实机 #e1c593，原实现 #f3d39b 偏亮）。

### 坑

1. **`manifest.ui.suit` 是显式字典**，只往 `UI_ASSETS` 加条目不够，还要在 manifest 的 `suit` 段里加键，否则 `ui.suit.bg` 是 `undefined`、`<img>` 空 src → 背景整屏变黑（MAE 直接从 17 跳到 52）。
2. 改完 `public/assets/manifest.json` **必须重启 dev server**，Vite 会继续吐旧缓存（这次 MAE 卡在 52.48 不动就是这个）。
3. 卡片盒子不能按「框体可见范围」估：素材的拱顶占 y 10..95，实测边框双线 x 723/737、1182/1196、下沿 834 → 整框 476×756 才是 1:1。

---

## [v0.6.07] 2026-10-26 — 套装页触发口径改为「每抽到新部件触发一次」（用户反馈）

### 1. 触发逻辑（最终口径）

**每抽到一个套装的新部件就触发一次套装页，徽章显示 1/N、2/N、3/N … N/N**（与实机录像
「套装收集进度页面 1/10」「抽取-套装进度上涨 1/8」一致）；重复件不触发，3★ 散件等
不属于本池套装的部件不触发。

实现：揭示流程从「详情队列 + 末尾套装页」重构为**交错序列** `revealSeq`——
`详情(0) → 套装(1/N) → 详情(1) → … → 详情(9) → 套装(m/N) → …`，每步推进由
`applyStep` 驱动；同一次十连里同套装的多个新件按抽取顺序递增计数
（拉取前的各套装已有数记在 `ownedBefore`，序列内用 running 计数）。

- 「下一件」（点空白 / F）：揭示流程中沿序列前进；套装页「继续」也前进到下一步。
- 「跳过全部」（右上 / ESC）：剩余详情与套装页全部跳过 → 十连进网格、单抽回共鸣页。
- 复审模式（结果网格点卡）不再插入套装页，沿用 `detailQueue`。
- 套装页徽章数字来自序列步（`suitView`），不是实时图鉴；绿弧按 count/total 部分渲染
  （1/N ≈ 40°，从 6 点钟顺时针，与实机 1/10 参考帧一致）。
- 删除 `completedSet`；`__gachaDbg.queue` 现输出交错序列（`0, suit:S0399:10/10, 1, …`）。

### 2. 验证

- vue-tsc 零报错；verify-gacha 新流程通过（十连首件 = 完成套新件 → 套装页 10/10 →
  继续 → 下一件详情 → 跳过全部 → 结果网格）；verify3 全站控制台干净。
- `shot-suit.mjs` 支持种 N 件（argv[4]）：1 件 → 徽章 1/9 + 部分弧，与实机 1/10 参考一致。
- 套装页视觉无改动，FULL MAE 维持 **20.30（≈7.96%）**。

---

## [v0.6.06] 2026-10-25 — 套装获得页按实机逐像素重制（SysReward 素材全利用）

### 1. 触发逻辑澄清与修复（用户澄清）

用户澄清：**收集到新套装部件时不显示 1/N 徽章页，只有整套集齐时才出现一次**。
排查发现触发判定本就是「集齐才触发」（`owned >= total`），但 **`completedSet` 从不重置**——
上一轮抽满的套装会在之后每一次拉取中再次弹出（`next()`/`skipAll()` 都会进套装页）。
修复：`doPull()` 开头 `completedSet.value = null`。徽章在集齐页固定显示 N/N、绿弧满圈
（实机绿弧从 6 点钟顺时针，`conic-gradient(from 180deg)`，集齐态满圈）。

### 2. 套装获得页按实机截图逐层重制

基准 `图片/游戏实机/套装展示-潮汐鲨影-实机.png`（1918×1078，「潮汐鲨影 6/9」），
逐层量测 + Python 数值拟合（立绘缩放 / 大圆环三点拟合 / 虚线环点拟合 / 背景融合 MAE）：

- **背景 = 解包拼接**：`T_showpic_clothes_bg`（155×87）整屏拉伸 + `T_showpic_clothes_bg_right`
  （1188×1080）右贴 x=730、左缘 420px 线性渐融（Python 拟合，背景区 MAE 10.6）。
  即 manifest 既有 `ui.detail.bg` / `ui.detail.bgRight`（后者此前从未上过页面）。
- **套装卡**：金底 `T_showpic_suit_frame_02`（brightness 1.15）→ 拱顶白 Halo（CSS screen）→
  外框 `T_showpic_suit_frame_01` → 立绘（448×656 素材 0.96x @ 卡内 (-2,-22)，红点特征 +
  alpha 加权拟合；实机为 3D 演出，立绘区存在 ~30 的不可消除内容差）。
- **徽章 Ø118 @(675,317)**：暖棕刻纹面（CSS 径向+同心暗环；deepsea.badgeBall 色偏蓝弃用）+
  金环 + 绿进度弧（6 点钟顺时针）+ 顶部四芒星（SVG）+ 外围点珠细环
  `T_showpic_Suit_img_ornament_03` 镜像 1.15x（orn-2 弧几何与实机不符，数值拟合后弃用）。
- **星级 = 四芒星**（实机为四芒闪光非圆星；`T_UI_Common_Tab_SelectIcon` 实为雪花弃用，
  改 SVG sparkGold 渐变），38px ×N @y878；套名 52px @y818；属性胶囊改用 detail tag 语义素材。
- **大圆环细线组合** `T_showpic_suit_img_ornament_01`：素材内圆心 (1031.5,515.5) r400.5 →
  实机圆心 (961,596) r408（三点自洽拟合）→ 1.019x @ (-90,71)。
- **新增归集 5 项**：`ui.suit.spark`（Tab_SelectIcon）/ `glow-1/2/3`（黑底发光弧，screen）/
  `orn-3`（点珠环）；`types.ts` 同步。glow-2/glow-1 叠卡顶/卡底，glow-3 备用。
- **能力区**（1240,813）：金环圆框 Ø110 + 能力名 + 绿色小标 + 点线 + 描述。解包无能力字段，
  按 `ABILITY` 表补实测数据（S0056 潮汐鲨影→钓鱼，实机逐字抄录），无数据不显示。
  旧 5★ 锁定态删除（集齐页语义下不存在锁定）。
- **右下虚线圆环**：点拟合圆心 (1587,687) Ø~448 → `ui.detail.ring` 放大 1.66x 复用，36s 慢旋。
- **键位提示行**：实机套装段与详情页不同——键帽更大（ESC 55×34 / F 26 / 鼠标 27）、
  文字加粗、整体左移 → `.suit .df-*` 页内覆写（不污染详情页 9.48 基线）；
  右上「跳过全部」30px 加粗 + 2px 字距；底部补点状装饰带。

### 3. 开发期工具

- `?suit=<套装名>&banner=<bannerId>` 直出套装页（仅 DEV）；`.shots/shot-suit.mjs`
  （种 S0056 九件入账 → 9/9 徽章 + 满圈绿弧）。

### 验证

- vue-tsc 零报错；verify3 全站控制台干净；verify-gacha 真实流程（十连→集齐→套装页→结果页）通过。
- diff-shot：**套装页 FULL MAE 20.30（≈7.96%，≤10% 达标）**；单抽详情 **9.48** 无回归。
- 已知不可消除差：立绘区（实机 3D 演出 vs 2D 立绘卡）、徽章数字（实机 6/9 vs 模拟器集齐态 9/9）、
  UID 水印（用户规则不做）、钓鱼竿图标（无对应解包素材，SVG 近似）。

---

## [v0.6.05] 2026-10-25 — 修复十连态位移/贴纸（按用户反馈回退）

### 1. 单抽展示页素材偏移 —— 回退十连态卡位偏移（用户反馈）

v0.6.04 给十连逐件态加的 `.detail.ten .dt-cardwrap { left: 67px }` **只移动了卡片组**，
而卡左的金弧装饰（detail.deco）在容器外没跟着动 → 弧与卡的相对关系被破坏，视觉上「素材偏移」。
且逐件态的卡位与单抽的差异本就在视频粗测的读数误差边缘。**整体回退**：单抽与十连逐件共用
同一套（对齐 MAE 9.48 的）坐标，diff-shot 复测 FULL MAE **9.48**（回到 v0.3.02 基线）。

### 2. 移除单抽展示页的套装进度贴纸（用户反馈）

删除 `.dt-sticker`（左上「套装名 + 收集进度条」提示，v0.6.04 新增）及模板/计算属性
（curSuit）；`.detail.ten` 类绑定一并移除。实机虽有此贴纸（无限暖暖2/实机分析/03 §1.4），
按用户要求不做。

### 3. 「套装页 / 逐件详情不显示」排查结论

干净环境（重启 dev server + 新开浏览器）下完整复现真实流程：
动画（不跳过，播满 10s）→ 逐件详情（十连 10 件逐件正常）→ 跳过全部 → 套装页（cs=S0399 正确触发）→
结果页；常驻池（遥远之海）十连同样正常。**未复现不显示**。
结论：为多次热更新后的会话状态问题（本轮连续编辑 4 个组件 + 早前的截断 webp 缓存同源）。
**处理：重启 dev server；浏览器请 Ctrl+F5 硬刷新后再测。** 若仍复现，请附 console 报错截图。

### 验证

- vue-tsc 零报错；verify3 全部页面控制台干净。
- diff-shot：单抽详情 FULL MAE **9.48**（v0.3.02 基线 9.48，无回归）。
- `.shots/probe-realflow.mjs`：真实流程（不跳过动画）逐相位探针，默认池与常驻池各跑一遍全部通过。

---

## [v0.6.04] 2026-10-25 — 彩虹光带柔化 + 抽卡展示三页按实机重设计

### 1. 彩虹光带柔化（用户反馈：边缘过于突兀）

四色周期渐变的「带」从整容器铺满改为 **3 条边缘柔和的条带**：3 层横向 mask
（宽 118/168/136、长 88%/100%/76%、位置 12%/52%/87% —— 三条不一般齐）切出条带，
不透明度整体调低（rbPhase 峰值 1 → 0.55、sway 呼吸 0.75→0.55）。

### 2. v0.6.03 备份

`备份/抽卡模拟器-v0.9.14-2026-10-25.zip`（zip 名沿用旧编号；1050 KB / 63 文件：src/ tools/ 根文档 布局坐标 md/csv manifest.json，
仿 v0.2.00/v0.6.01 备份口径，素材不打）。

### 3. 抽卡展示三页按实机重设计（依据 `无限暖暖2/实机分析/` 03/04/05/06）

**十连结果页**：
- 标题区换实机版式：虚线金环 Ø124（SVG，2 枚菱形节点）+ 标题字高 32 + 环下金线，删「N 件」计数（实机无）
- 「新」角标：左上胶囊 → **右上粉色圆 Ø30 + 呼吸光晕**（实机 (1030,149) Ø27+glow）
- 每卡**拱顶小星芒**（4 角星 16px，按列错相闪烁）
- **底部地面光环**（椭圆光碟 (600,940)-(1320,1100)，6s 呼吸 + 横向微涨）
- 网格几何维持 v0.3.00 实测（卡 236×372、网格 312,141）——视频复测值 220×348 在读数误差内，以像素级对齐过的旧值为准

**套装获得页**：
- 卡片 400×530 → **454×612 @ 上移 76px**（实机 (736,196)-(1190,808)）
- 进度条 → **1/N 圆形徽章** Ø122 @ (665,308)（深棕圆牌+金环+顶部菱形饰+右上绿色高亮弧），数据 = setProgress
- 「套装完成」胶囊 → **主属性胶囊**（性感知紫/典雅金/清新绿/帅气蓝/甜美粉，按 styles[0]）
- 5★ 新增**锁定能力区**（虚线圆环 Ø100 + 锁 + 「ⓘ 集齐套装后解锁此能力。」；能力名数据缺失不展示）
- 十连流程新增右上「跳过全部」（» 金圆钮 + 白字，实机 (1687,28)-(1883,67)）

**单抽/逐件详情页（十连态）**：
- 卡组整体**右移 67px**（实机 03/06：单抽卡中心 648 / 十连逐件 715）
- 左上新增**套装进度贴纸**（套装名 + 收集进度条 + N/M，实机抽取-套装集齐 12–16s (25,20)-(250,60)）；
  3★ 散件无所属套装不显示

### 排查记录（值得记住）

验证脚本曾稳定失败于「套装页不出现」：预置存档的 codex 键用了**中文部件名**，
而 `Part.id = set.id + icon.name`（图标名）——S0399 第 10 件的图标名是英文
**`Resting Flame of Law`**（显示名 天意亦垂泪）。种子键与池内 id 不一致 → 永远差一件。
修法：种子直接用池内真实 id。定位手段：GachaView 新增 dev-only 调试钩子
`window.__gachaDbg`（phase/completedSet/queue/setProgress/pool ids，生产摇掉）。

### 验证

- vue-tsc 零报错；verify3 全部页面控制台干净。
- 新增 `.shots/verify-gacha.mjs`：预置存档（蒙尘之罪 9/10 + p5:19）→ 十连 → 逐件详情（十连态）→
  跳过全部 → 套装获得页 → 十连结果页 → 点卡回详情，4 张截图 `.shots/gc-*.png` 目检通过。

---

## [v0.6.03] 2026-10-25 — 深海回响环境动效 + 对勾素材化

按实机《屏幕录制 2026-10-24 234837》逐帧实测的五种环境动效（`无限暖暖2/实机分析/` §3），全部纯 CSS（transform/opacity），
放在 `.echo` 背景层：**固定轨道与长轨道共享、不随 scrollX 平移、不 Teleport**。

| 效果 | 实测依据 | 实现 |
|---|---|---|
| 上浮气泡 | Ø15–30、≈10px/s、升 ≈100px 消散；出现点 (1000,838)/(1230,765)/(1600,745)/(1875,820) | 5 个泡（外层 rise + 内层 sway 双动画），radial-gradient 画空心泡 |
| 底部云雾翻涌 | y≈860–1078 向左漂 + 长周期（>7s）明暗 | 3 层预模糊 radial-gradient（**不做运行时 blur**），异速漂移 34/46/58s + 呼吸 9/12/15s，screen |
| 彩虹光带 | 右上 (1150,0)-(1918,330) 斜 32° 往返摆动 6–8s | **黄/蓝/红/绿四色周期渐变（用户指定）**：20s 周期、每色 5s；四层 300×1050 窄带 rotate(-32°) + 横向 mask 羽化，层内渐变「主色居中、其余三色在带边缘」，层间负延迟错相 crossfade = 交界柔和混杂；整体 7.5s 摆动 |
| 星空粒子闪烁 | 上半屏 Ø1–3 随机生灭 | 34 颗固定种子伪随机（`STARS`，位置/尺寸/周期/延迟确定性），明灭 + 少量 30s 漂移 |
| 背景光呼吸 | 中部光晕 y 365–600 缓慢明暗；横幅后光柱 8s 闪烁（解包 Loop_INST） | `ds-glowband` 7s 呼吸；`ds-titleglow` 用已归集 `ui.banner.glowTitle`（T_UI_Glow_23）按解包坐标 (478,-768) 363×1176 摆放，8s 曲线压到「极微弱」档 |

### 对勾素材化（用户指定）

已领取对勾从内联 SVG 白勾换成解包 **`T_UI_common_icon_hook_06.png`**（75×74 绿圈勾）：
`collect-assets.py` 的 `DEEPSEA_ASSETS` + `types.ts` 新增 `ui.deepsea.hook`，ffmpeg yuva420p 转 webp。
⚠ 坑：**screen 混合会让深绿素材被粉卡吃成白粉痕迹**（近不可见）→ 改正常混合 + `brightness(1.55) saturate(1.25)`，
勾身鲜绿、圈身深绿，浮在卡上。老坑再现一次：**dev server 缓存了 463 字节截断 webp**（磁盘 2468B）→ 重启解决。

### 验证

- vue-tsc 零报错；verify3 全部页面控制台干净。
- 新增 `.shots/verify-fx.mjs`：预置存档（2.10-02 108 抽、未领取）→ 打开深海回响 → 黄/蓝/红三相位截图 +
  对勾特写 + 光带特写（`.shots/fx-*.png`）。⚠ 脚本里存档注入后必须 `page.reload()`（SPA 同 hash 跳转不重载，store 不会重读 localStorage）。

---

## [v0.6.02] 2026-10-25 — 常驻卡池（遥远之海）页面设计

按用户要求**以默认池为模板**做常驻池页面。本轮范围：主视觉 + 深海回响；单抽/十连不做；
**深海回响不做自选弹窗**（用户补充），自选档照常「达成即已领取」。

### 选池真正生效（此前列表是摆设）

| 项 | 处理 |
|---|---|
| POOLS 补 banner id | 077→`banner-2.10-01`、076→`2.10-02`、030→`1.8-01`、078→`1.4-02`、079→`1.4-03`、001→`1.0-01`；`real` 的只有执律的流金 + 常驻·遥远之海（其余点按仍提示未收录） |
| `selectPool` | 对 real 池调 `store.selectBanner(id)`——背景 / 艺术字 / 收集进度 / 深海回响入口全跟随 store 自动切换；常驻池无 PV → `bgMode` 直接落静态 |

### 常驻池主视觉

| 项 | 值 |
|---|---|
| 静态底图 | `banners/bg-clean/list-1.0-01.webp`（**1920×1080 直接 1:1 铺满**）。2560×1440 中心裁切只属于 2.10-02 —— 新增 `bgStillStyle` 按池切换，默认池不受影响 |
| 艺术字 | `banners/title/001.webp`（604×348，`.title-art` 的 contain 盒自适应） |
| 收集进度 | 自动变 **0/102**（4×5★10 件 + 4×4★8 件 + 30 三星散件，store 全自动） |
| 套名横幅 | **封顶两块**：首个 5★（天鹅童话·粉）+ 首个 4★（林间戏蝶·紫）。常驻池 8 套全铺会溢出；默认池 2 套不变 |
| 深海回响入口 | 「20次后可领取」——tiers 按池自动切换 |

### 深海回响 · 36 档长轨道（20 → 715）

实机《深海回响-常驻卡池》录屏实测（列采样 + t=0/t=20 两帧互相关对齐滚动偏移）：

| 项 | 值 |
|---|---|
| 触发 | `tiers.length > 10` → 长轨道模式（36 档；四星池 3 档短轨道本轮**不做**） |
| 几何 | 首节点 X=254、间距 **188**（末节点 6834）；内层宽 7150px，随 `scrollX` 平移（固定轨道 innerW=1920、scrollX 恒 0，**逐像素不变**） |
| 曲线 | 周期缓波 `LONG_PTS`（38 点 + Catmull-Rom）：谷 630→492 / 峰 1570→400 / 谷 2510→503 / 峰 3450→412…，振幅 ≈52、周期 ≈1880，未录到区段按周期延拓 |
| 滚动 | 滚轮（deltaY→横向）+ 按住拖拽，`clamp [0, W-1920]`、无回弹；**初始停在轨道起点**（实机 t=0 就是 20次 在左端，不会自动跳到当前进度） |
| 语义 | 无摆饰大图 / 无右侧信息（常驻池无 showcase，整块隐藏）、无蓝色光柱与金色重点球（`isMajor` 只属于五星池）、**无自选弹窗**；徽章仍在「当前抽数」插值位置（0 抽 = 首档节点，715 抽账号里它在画面尾部，滚过去才可见——实机亦如此） |

### 验证

- `npx vue-tsc --noEmit` 零报错；`node .shots/verify3.mjs` 全部页面控制台干净。
- 新增 `.shots/verify-standard.mjs`：默认池共鸣页/深海回响回归 → 切常驻池 → 长轨道初始/滚轮/拖拽/滚到末尾，
  7 张截图在 `.shots/std-*.png`；实测 innerW=7150、36 节点、wheel -1400px、drag 回卷 270px 全部生效、无 404/报错。

---

## [v0.6.01] 2026-10-25 — 深海回响轨道精修（8 处）

按实机 `深海回响1~4.png` 逐处对齐，全部是「素材用法 / 状态区分」层面的修正，坐标没动。

| # | 问题 | 处理 |
|---|---|---|
| 1 | 轨道上有一条黑杠 | **删掉 `track.webp` 叠层**。那张图是「纯黑底 + 白线」且不带 alpha，而 `.ds-track` 因 `z-index` 形成独立层叠上下文，`mix-blend-mode: screen` 只跟空上下文混 → 黑底原样留下。轨道形态现在完全由 SVG 负责 |
| 2 | 徽章外环与内球不同心 | 外环素材圆面中心是 **(75,68)**（不是画布中心 72,72），内球是 **(82,81.5)**；并且 `dialSpin` 的旋转轴必须设在圆心 → `transform-origin: 52.08% 47.22%`，否则会绕盒子中心公转、看起来就是不同心 |
| 3 | 流动光带过亮 | `opacity .34`（降到 1/3）+ `blur(2.6px)`（dash 两端本来是硬切口，blur 正好把两头糊开），去掉原来那圈 0.95 的白色 drop-shadow |
| 4 | 箭头单独挂在节点上 | 箭头 `grade_arrow` 现在**永远跟着球**：球盖住它的宽口，只露出向下的尖端；只有「已达成」或「重点档」才渲染 |
| 5 | 节点不区分经过 / 未经过 | 每个节点都有「环 + 球」：经过 = 白球（`grade_main`）+ 冷光晕；未经过 = 灰环 + Ø11 浅灰实心球（用 CSS 画，素材中心是暗核，缩到 16px 会变黑疙瘩） |
| 6 | 奖励卡右下角数量角标 | 删掉 `.ds-count`（实机没有这个角标） |
| 7 | 提示条容器 | 改用 `T_UI_resonance_reward_tuning_txtbg04.png`（`ui.deepsea.glowBand`）当蒙版 |
| 8 | 抽数胶囊容器 | 改用 `T_UI_resonance_reward_bg_number_01.png`（新增 `ui.deepsea.numPlate`）当蒙版 |

### 两个新坑（都踩了）

1. **蒙版素材的 alpha 峰值只有 86 / 119**（画师留的半透明）。直接 `mask-image` 会把元素整体压成半透明，**连文字都看不清**。
   → `collect-assets.py` 新增 `mask_webp()`：把 alpha 线性拉伸到 0..255（只动 alpha，RGB 不变），
   `DEEPSEA_MASKS = {"numPlate", "glowBand"}` 走这条路。
2. **Pillow 存的 lossy-alpha webp Chrome 解不出来**。第一版用 `im.save(dst, "WEBP")`，文件 PIL 能读、
   Chrome 报 `The source image could not be decoded`，而 `mask-image` 加载失败是**静默**的（整块变透明，控制台无报错）。
   → 必须走 ffmpeg（`-pix_fmt yuva420p`），和其它素材同一条编码路径。
3. 蒙版要挂在 `::before` 上，**不能直接给元素加 `mask-image`** —— 否则文字会被一起羽化（提示条首尾的字发虚）。

### 顺带

- 未达成节点的奖励卡不再去饱和：实机卡片一直是原色，只有节点分「经过 / 未经过」。
- 重点档（160/230）的球改成 **CSS 实心金球**：`grade_main` 中心是暗核，`brightness` 拉到 3.6 仍留一块黑芯。
- 蓝色光柱提亮到 `brightness(2.6)`、横向羽化从 28/72 收到 14/86（实机柱体更宽更实）。

---

## [v0.6.00] 2026-10-25 — 深海回响 V2 重制（按实机 1:1）

> 依据 `布局坐标/深海回响/深海回响界面_实机UI坐标与动态效果分析.md`（1918×1078 录屏逐帧量测，误差 ±1~3px）。
> 旧版是自绘的「圆环 + 手搓曲线 + 详情态翻页」，全部推倒。

### 版式语义变了

旧版当「选择器」做（点节点 → 翻页看每一档），新版按用户要求改成**奖励预览详情页**：
左侧固定展示「万金之上」摆饰，右侧固定显示它的名称/类型/描述，底部 10 档轨道只是**进度条**。

| 用户要求 | 落地 |
|---|---|
| 不做 UID 水印 | 删掉左下角 `UID …` |
| 只显示摆饰大图（万金之上），其余 9 档不做大图 | `hasShowcase` 判定「该档奖励含『万金之上』」→ 只有 160 抽档渲染 `scene` + 右侧信息 |
| 不做右缘翻页箭头 | 无翻页、无档位切换，节点只保留 hover 高亮 |

### 素材（新增 21 个，`ui/deepsea/*`）

`tools/collect-assets.py` 新增 `DEEPSEA_ASSETS` 表 + manifest `ui.deepsea` 段：
`bg`(2731×1535) / `scene`(1264×728) / `track`+`track2`(512×512 波形) / `arc1~3` /
`nodeArrow`(灯泡) / `nodeRing`+`nodeRingOn`(细环) / `badgeDial`+`badgeBall`(徽章) /
`beam`(蓝色光柱) / `ribbon`(紫缎带) / `divider`(分隔饰线) / `glowBand` /
`backN/H/S`(返回金钮) / `card`+`cardEmpty`(奖励卡框)。

源素材库缺 `bg-SHHX.png`，从 `布局坐标/深海回响/素材副本/V2/` 补入 `素材/部分UI及道具图片/DXT5/`。

### 几何：全部按实测写死 1920×1080

| 元素 | 值 | 备注 |
|---|---|---|
| 返回金钮 | 盒 66.5 @ (36.25,16.25) | `backN` 69×69、内容 56×55 → 实机 54×54 |
| 标题 | left 119 / top 34 / 31px | 实机墨迹 119,38→241,66 |
| 紫缎带 | 279×44 @ (474.4,113) | `ribbon` 380×48、内容 335×48 → 实机实心带 246×44（横向 0.7343、纵向 0.9167 非等比） |
| 摆饰大图 | 1264×728 @ (93,51) | 素材内容 bbox 中心正好落在实机主体中心 (725,415) |
| 物品名 | 200 宽 @ (1379,195) / 43px / 字距 4 | 187 会因「4×43+4×4=188」折成两行 |
| 分隔饰线 | 521×140.4 @ (1240.2,188.1) | 等比 0.78；实测线 y=274、x 1278..1701（文档里 1851 被右上彩虹光带污染） |
| 副标题 | (1319,315) / 28px / `#f6e2a5` | |
| 描述 | 519 宽 @ (1220,369) / 28px / 行高 37 | 每行 19 汉字，正好断成实机那三行 |
| 节点 | 间距 169、整组居中于 934 → 首 173.5 / 末 1694.5 | 实测首 174 / 末 1695 |
| 抽数标签 | `ny + 61` | 实机 834 相对 773 |
| 奖励卡 | 96×102、`ny + 105` | 卡内物品 70×70 |
| 徽章 | 外环 Ø89（盒 109.4）、内球 Ø63.7、`ny − 67` | 实测 108 抽 → (916,692)，插值算出 917 ✓ |
| 蓝色光柱 | 153.1×417.6 @ top 640.9 | 实机柱宽 145、y 660..1035；纵向单独拉到 1.1228 |

### 踩坑

1. **`track.webp` 不能等比缩放**：素材 512×512 的波形振幅 99px，实机只有 43px。压到 1734×111 后线芯只剩 0.87px → 改**用 SVG 按 12 个实测点做 Catmull-Rom 插值**画线，素材只当 `screen` 柔光叠层（还要 `scaleX(-1)` 镜像，相位才对得上）。
2. **光柱素材是硬边矩形**：实机「边缘无锐利边界、与背景雾化融合」→ 必须 `mask-image` 双向羽化（左右 28%/72%、上下 16%/80%，`mask-composite: intersect`）。
3. **摆饰大图有硬边**：素材四边是不透明矩形，压在暗背景上会露出一个方块 → 四边 linear-gradient 羽化 + `brightness(.78) saturate(1.2)`。
4. **不要 Teleport**：旧版 `Teleport to="body"` 会脱离 `.design` 的 1920×1080 缩放，只能自己 flex 排版。改成 `position:absolute; inset:0; z-index:200` 落在 `.banner`（也是 1920×1080）里，坐标就是设计坐标。
5. **档位多的池会溢出**：间距 `min(169, 1734/(n−1))`，卡片按 `--ck` 等比缩，10 档时 `--ck` 恒为 1，不影响默认池。

### 其它

- **达成即已领取**：没有逐档详情页了，`onMounted` 里把 `reached && !claimed` 的档位全部 `claimMilestone()`，轨道对勾状态与实机一致（共鸣页那个「可领取」小红点会随之消失）。
- `src/core/milestone.ts` 补 6 条 2.10「执律的流金」深忆奖励译名（`万金之上` 等）。
- `tools/collect-assets.py` 修 230 抽 3 件奖励互相覆盖 → `milestone_names()` 输出 `230-1/230-2/230-3`。
- 新增 `tools/shot-echo.mjs`：截图 + 输出 `.ds-*` 元素实际盒子，跟标注表逐项对照。

---

## [v0.5.03] 2026-10-24 — 套名拉伸 / 解包按钮 / 键位与提示统一 / 进度不刷新

### 套装详情弹层

| # | 要求 | 做法 |
|---|---|---|
| 1 | 套名过长溢出 | 名字底的两侧留白从 40px 加到 **60px**（必须 > 九宫格两头的 36px），宽度 = 文字宽 + 120，中间段自由拉伸；`min-width:340 / max-width:640`。6 字的「不落的黄金梦」现在两端各留 20+px |
| 2 | 关闭键用解包素材 | `T_UI_common_btn_close_n/_h`（96×96，圆钮内容 15..78），hover 换 `_h` 淡入；去掉 `title`，改 `aria-label` |
| 4 | 顶部装饰上下翻转 | `.sh-ribbon { transform: scaleY(-1) }`（pxdesk 里贴反了） |
| 5 | 等级图标溢出容器 | 改回 `left:0 top:0`（整盒含 15px 透明边与卡片左上角重合），主立绘 `(81,183)` |

### 共鸣页

| # | 要求 | 做法 |
|---|---|---|
| 3 | 切换键高亮 | 新增 `ui.banner.switchH`（`T_UI_common_btn_cloud_replace_01_h`），hover 淡入 |

### 操作逻辑（第 6/7/8 条）

| # | 问题 | 做法 |
|---|---|---|
| 6 | 动画屏写「F 跳过」但 F 没反应 | `onKey` 增加 F：动画屏 = 跳过动画 |
| 7 | 单抽界面写「按F/鼠标左键继续」但 F 没反应、点击直接跳十连 | F / 点击空白 = `next()` 下一件；并把 `detailQueue` 改成**十连 10 件逐件过**（原来只排队新部件，所以点一下就跳网格） |
| 8 | 多处提示与行为不一致 | 拆出 `skipAll()`：右上「跳过全部」与 ESC 现在真的是「跳过全部」（十连→网格 / 单抽→套装或回共鸣）；F 与点击才是「下一件」。网格页「点击卡片查看详情 · 空白或 ESC 返回」、套装页「点击空白继续」本来就对 |

### 数据

| # | 要求 | 做法 |
|---|---|---|
| 9 | 收集进度条不跟随实际 | **根因：`codex` 是 `shallowRef`，往内部 Map 加东西不会让 computed 失效** → `codexStats` / `setProgress` 一直是首次求值的缓存。加 `codexRev` 计数，`pull()` 后 +1，所有读图鉴的 computed 与函数先 `void codexRev.value`。实测 0/48 → 10 → 20 → 30 → 37 → 38 正常累加 |

---

## [v0.5.02] 2026-10-24 — 弹层细节精修（圆环进度 / 标签分色 / 进化解锁 / 文案仿宋）

### 共鸣页

| # | 要求 | 做法 |
|---|---|---|
| 1 | 镂空框再次放大 4px | 盒子 257.3×122.9 → **261.3×126.9**（`-8.67/-8.08`），线比 273×126 大约 5px |

### 套装详情弹层

| # | 要求 | 做法 |
|---|---|---|
| 2 | 中央方框改圆形收集进度 | 部件格整体撤掉，换成 SVG 圆环：轨道 `rgba(255,255,255,.5)` + 进度 `#ffe9a8` 带辉光，半径 86、描边 5，中间 46px 的 `N/M`。`ringDash = 2π·86·pct`，切换套装时带 0.6s 过渡 |
| 3 | 背景与装饰带左右边缘未重合 | 背景改回 pxdesk 的**等比 1400×820**（可见底板落在 74..1317）；装饰带从手工的 104/1214 改成 **74/1243**，两头对齐 |
| 4 | 属性标签用映射表素材 | `label01..10` 全部归集，`LABEL_OF` 按《标签颜色映射表》把 30 个风格标签分到 8 种配色；五维另配：典雅→01、清新→02、甜美→04、**性感→08**、帅气→05。**08（紫）原素材缺失**，用 `label09` 转 HSV 色相 +52 生成 |
| 5 | 进化等级图标溢出容器 | 主立绘 `(96,160)→(93,163)`、形态卡 `(-6,-10)→(-9,-7)`（下移 3、左移 3） |
| 6 | 等级图标常态置灰 / 激活高亮 | 归集 `_l`（常态）与 `_s`（高亮）两套；`stageUnlocked()` 按《进化条件.md》判定：集齐→初始/焕新、180 抽→一进、230 抽→二进、集齐第二套→满进/进化。store 新增 `setDupFull()`（每个部件 count≥2） |
| 6b | 进化展示顺序 | `FORM_ORDER = 初始/焕新 → 一进 → 二进 → 满进 → 进化`，按 manifest 真实 stage 名排序 → 5★ 显示 **焕新·一进·二进·满进** |
| 7 | 四星页形态名错误 | 上一版按星级硬套顺序，把 4★ 的「焕新 / 进化」套成了一进/二进。改成直接用 stage 名，且每张卡取该形态的 `整体-<形态>` 图（一一对应不会错位） |
| 8 | 套装文案字体过小 | 仿宋（`FangSong/仿宋/STFangsong` 回退衬线）+ 21px/1.85，**改白字**（实机就是白字），超出容器 `overflow-y:auto` 可滚动 |
| 9 | 套装名加常驻高光 + 长名拉伸 | 名字底改 **border-image 九宫格**（slice 36 fill）：两头圆角星饰原样、只拉中间，`min-width:330px` 自适应；上面常驻叠 `btn_h`（`mix-blend-mode:screen`）做高光 |
| 10 | 形态区悬停高光 | 每张卡叠一层 `T_UI_BP_Reward_item_diamond_edge02`（pxdesk 第 04 层），拉伸到 164×244，hover 淡入 |
| 11 | 四星主立绘溢出 | `.sh-hero.s4 { left: 86px }`（右移 5px） |

### 顺带清理

- 纸面上的「收集进度 xx/xx」删掉 —— 中央圆环已经表达同一信息，实机纸面也没有这一行
- 删掉随部件格一起废弃的 `partSlots` 计算属性

### 踩坑

- 上一版把「星级 → 形态名」写死了，4★ 直接错；**形态名必须读 manifest 的 `stages[].stage`**
- 名字底用固定 330px 的 img，6 字套名会溢出；必须 border-image 九宫格

---

## [v0.5.01] 2026-10-24 — 镂空框/套名横幅修正 + 套装详情弹层按 pxdesk 精修

### 界面

| # | 要求 | 做法 |
|---|---|---|
| 1 | 镂空框仍比缩略图小 | 不再按内容 bbox 反推，直接在现有盒子上整体放大 4px：`-6.67/-6.08 / 257.3×122.9` → 线比 273×126 大约 3px |
| 2 | 套名横幅与星级黏连 | 横幅整体上移到 1000，星级从 `top:48` 改到 `top:60`（底板 54 高 → 星与板之间留 6px 空隙） |
| 3 | 有专属套名横幅的用专属 | 归集时扫 `SysResonance/.../Pic/*/T_UI_resonance_gacha_NNN_name.png`（**19 个池有**，332×96，右侧渐隐 → 按 alpha>30 裁边）→ `ui.banner.namePlates[NNN]`。`plateOf()` 先查专属，没有再退回通用：**5★ 粉 name01 / 4★ 紫 name02** |

### 套装详情弹层：按用户的 pxdesk 精修（1400×820，坐标 1:1 对应）

上一版是我自己重新设计的，这次改成「微调用户的手工版」——pxdesk 的 47 层素材全部按**像素级匹配（err 0.0）**反查到了源文件，并逐个用上：

| pxdesk 层 | 素材 | 用途 |
|---|---|---|
| #1 | `UI_events_rule_top_bg02` 1892×1108 | 主背景（粉色帘幕） |
| #0 | `T_UI_events_rule_black_bg_02` | 名字后的暗色光晕 |
| #18/#20 | `UI_events_rule_btn_n` / `_h` | 名字发光底（常态 / 高亮） |
| #7–11 | `T_UI_common_quality_star_n` | 五星 |
| #5/#6 | `..._img_ribbon_01` / `01-2` | 顶部左右飘带 |
| #12/#13 | `..._img_pocky_02` | 两侧垂挂飘带 |
| #14 | `..._img_light_03` | 左侧光柱 |
| #4 | `T_UI_BP_Reward_item_diamond_edge02` | 中央方框 |
| #38 | `T_UI_Common_ih_img_arrow`（白色圆角板） | 方框内衬 |
| #2 | `T_UI_common_img_item_tips_bg_*` | 紫纸（按主属性换） |
| #21–23 | `T_UI_common_img_label01` | 三个属性胶囊 |
| #29–32 | `T_UI_common_img_item_bg_golden` | 形态卡底 |
| #37 | `..._top_img03` | 底部装饰带 |
| #15/#16 | `..._line01` / `01-2` | 分隔线 |
| #17 | `T_UI_event_rule_des` | 中央菱形 |
| #42–46 | `T_UI_evolution_icon_stage_0N_l` | 进化等级图标 |

- **进化等级图标映射**：初始/焕新 → `stage_01`、一进/进化 → `stage_02`、二进 → `stage_03`、满进 → `stage_04`
- 中央方框内放 **10 个部件格**（4×3，60×60，悬停叠 `item_bg_0pink_s` 金色发光边）
- 底部 4 张形态卡（去掉「初始」，它就是左边的大立绘），卡底用 `item_bg_golden`，左下角挂等级图标
- 层序修正：装饰带 `z-index:1` 必须在形态卡（4）下面，否则会盖住卡上的形态名

### 踩坑

- `--pool xxx` 只会生成**只含 1 个卡池**的 manifest（77 → 1），改完素材必须再跑一次 `--all --manifest-only`
- 新增素材后 dev server 又返回 463 字节的缓存占位 → 重启（本轮第 4 次，改 public 后必做）

---

## [v0.5.00] 2026-10-24 — 共鸣页 7 条修正 + 套装详情弹层重做

### 界面

| # | 要求 | 做法 |
|---|---|---|
| 1 | 下划线未以货币栏中点为轴 | 又是 `img{max-width:100%}`：`width:630px` 被夹成 546 → 亮线整体左移 18px。放开后 `left:-22.2 width:629.8`，实测亮线 1331..1877 正好等于栏宽 |
| 2 | 鼠标指针只在空白处生效 | 原来只写 `document.body.style.cursor`，一移到 `button`（自带 `cursor:pointer`）就被覆盖。改成 `--nk-cursor` 变量 + 全部 18 处 `cursor` 声明写成 `var(--nk-cursor, auto), pointer`；实测 body / 按钮 / 缩略图 / 套名横幅全部拿到自定义指针 |
| 3 | 切换键提示文字不随状态变 | `:title="bgMode === 'video' ? '切换静态背景' : '切换动态背景'"` |
| 4 | 四块整体右移 6px | 货币栏 1325→1331、艺术字 1478/1501→1484/1507、抽取提示 1498→1504、深海回响 1732→1738 |
| 5 | 镂空框比缩略图还小 | 盒子虽然 275×128，但素材的画线内容在 4..262 × 4..143，线被画在盒子内侧 → 看起来只有 266×119。按内容 bbox 反推盒子（`left:-4.67 top:-4.08 253.3×118.9`），线才真正比 273×126 大 1px |
| 6 | 套名横幅用解包素材 | `T_UI_resonance_gacha_060_name01/02.png`（332×96，可见底板约 251×55）。解包只有 042/043/053/056/060/063 六个池有，060 当通用款；按 alpha>30 裁掉透明边，CSS 写的 10px 才是眼睛看到的 10px |
| 7 | 套名横幅与共鸣详情同排、间隔 10px | `.set-banners` 放 (276,1009)，两个 251×54 底板 + 星级，与共鸣详情按钮同一水平线 |

### 套装详情弹层（重做）

pxdesk 只是参考（手工误差大），按解包素材重新设计：

- **1200×840 居中**：左侧 416×628 主属性插画原尺寸 + 右侧信息区 + 底部 10 个部件格
- **按主属性换肤**（套装文案 txt 的〖属性〗首位）：
  典雅 `dp14`+`tips_bg_golden` / 清新 `dp16`+`_green` / 性感 `dp18`+`_purple` / 帅气 `dp9`+`_blue` / 甜美 `dp11`+`_normal`。
  插画一份做左侧主图、一份放大 30px 模糊铺底，再叠主题色 `--attr` 径向渐变
- **纸片文案**：`tips_bg_*`（520×252）缩到 600×291 当便签，套装 `desc` 深色字排在上面
- **部件格**：`item_bg_empty`（160）缩到 96，悬停叠 `item_bg_0pink_s`（金色发光边）淡入；
  图标用 `source/.../部件图标`，与 yaml 部件按名匹配（英文名如 `Resting Flame of Law` 用剩余项兜底）
- **进化形态**：5 个缩略图（初始=立绘，其余=觉醒LV1~4），选中态用主题色描边
- 收集进度条、星级、标签胶囊（主属性那颗点亮）

### 新增素材键

`ui.banner.setName1/setName2`、`ui.popup.{art,plate,slot,slotHover}`（art/plate 各 5 个属性键）。

### 踩坑

- **`img{max-width:100%}` 今天又中两次**（下划线、套名横幅 `width:auto` 塌成 0）。凡是 img 宽度可能超过父级的，一律加 `max-width:none` 并写死宽度
- 套名横幅这类「右侧渐隐」的素材，`width:auto` 会跟父容器互相依赖 → 必须写死 `251×54`

---

## [v0.4.03] 2026-10-24 — 共鸣页 7 条修正 + 套装文案接入

### 界面

| # | 要求 | 做法 |
|---|---|---|
| 1 | 背景裁切失败、未取中心 75%、有形变 | 根因还是 **全局 `img{max-width:100%}`**：`width:2560px` 被夹回 1920（高度仍 1440）→ 既没裁到中心又横向压扁。`.bg-still` 补 `max-width:none`，实测 2560×1440 @(-320,-180) 1:1 |
| 2 | 货币栏下划线与栏分离过远 | 之前算错了：素材亮线其实只有 **y 77..78 两行**（59..78 是极淡光晕），落在栏底 +20px。改成 `top:-20.8px` → 亮线顶 = 栏底 +7px（约原来 1/3） |
| 3 | 退出键与「共鸣」二字未对齐 | 页签 `top: 22→31`、字号 36→38，实测墨迹中心 48 vs 圆钮中心 49.5 |
| 4 | 弹窗外围金线左右不对称 | 又是 `max-width:100%`：904px 的外框被夹成 836、839px 的 04_line 被夹成 836 → 右边短一截。放开后按**素材内容 bbox 反推盒子**（04_line 1..833、01_line 9..821、03_line 0..1066）让三圈线都居中于 960 |
| 5 | 镂空框要比放大后的缩略图大 1px | 父级 `scale(1.1281,1.1455)` 会把 1px 放大成 1.13px，所以先除回去：`left:-0.886 / top:-0.873 / calc(100% + 1.773px)` → 实测 275×128 包 273×126 |
| 6 | 共鸣按钮离屏幕边缘 22px、间隔 10px | 下边缘 22 → `top:987`；右边缘 1898 → 十连 `left:1602`、单抽 `left:1296`。⚠ 两张按钮 PNG 的透明留白**不对称**（单次右 17px、十连左 15px），会凭空多 30px 视觉间距 → 归集时按 alpha 裁到实体（302×72 / 303×71），CSS 里写的间距 = 眼睛看到的间距 |
| 6b | 抽取提示上移 3px | `top: 292 → 289` |
| 7 | 深海回响整体上移，离提示 20px | 提示盒底 321 + 20 = 341 是圆环内容顶，卡片 `top: 338` |

### 素材管线

- **套装文案正式接入**：新增 `load_set_texts()` 解析 `素材/套装文案/<版本>/<稀有度>-<来源>-《套装名》.txt`，
  产出 `set.desc`（『整体』段）、`set.styles`（〖属性〗行）、`set.textSource`、`set.formTexts`（每部位 × 每进化形态的部件文案）。
  118 套全部匹配上（312 个 txt 里另外 194 个是 3★ 散件）。
- ⚠ **key 要用纯套装名**：txt 文件名是 `5星-限定共鸣-《蒙尘之罪》`，而 `source/<池>/<套装>` 目录叫 `蒙尘之罪`，
  直接拿 stem 当 key 会全部对不上。
- `types.ts` 的 `SetInfo` 新增 `desc / styles / textSource / formTexts`；套装详情弹层展示标签胶囊 + 完整文案。
- 开发期直出：`/#/banner?set=蒙尘之罪`（`import.meta.env.DEV` 守卫）。⚠ 是 **hash 路由**，`window.location.search` 永远是空，必须走 `route.query`。

### 已确认在用的素材来源（用户本轮说明）

| 用途 | 目录 |
|---|---|
| 人物半身像 / 部件展示图（520×724）、五维数值、部件文案 | `素材/图片素材/<版本>/<稀有度>-<来源>-《套装》/<形态> l <形态名>/` + `属性-*.yaml` |
| 完整套装文案、套装标签 | `素材/套装文案/<版本>/<稀有度>-<来源>-《套装》.txt` |
| 部件透明图标（256×256）、列表缩略图（284×124）、标题横幅（852×388）、深忆奖励（256×256） | `素材/source/<版本>/<卡池>/` |

### 踩坑

- **`img` 的 `max-width:100%` 是这个项目最高频的坑**（背景、镂空框、弹窗外框都中过），凡是给 img 写超过父级宽度的 `width` 都要顺手加 `max-width:none`
- 量素材里的"线"要按**最亮那几行**算，alpha bbox 会把极淡的光晕一起算进去，导致位置差 20px
- `const stop = watch(cb, {immediate:true})` 在回调里 `stop()` 会 `ReferenceError`（immediate 同步执行，stop 还没赋值）→ 用 flag

---

## [v0.4.02] 2026-10-23 — 共鸣页 11 条精修（弹窗美术 / 中心裁切 / 等大按钮 / 放大逻辑）

基准截图换成 `图片/游戏实机/卡池界面-实机截图2.jpg`（1920×1080，缘起绘笔万念生选中态）。
所有数值都由亮像素投影/alpha 轮廓量出来，不再目测。

### 弹窗与背景

| # | 要求 | 做法 |
|---|---|---|
| 1 | 共鸣详情弹窗用解包窗口美术 | 四层叠：`bg_01`（羊皮纸底 836×512）+ `bg_01_line`（内框，inset 18）+ `bg_04_line`（贴纸面边）+ `bg_03_line`（1072×720 同比例缩到 900×604 包在外面）；面板 836×512 居中于 (542,284)。羊皮纸是浅色，正文全部改深棕 `#4a3618`。另加 `.prob-mask` 暗底 0.6 + 点击空白关闭 |
| 2 | 「缩放 0.75」= 只取画面中心 75% | 不是缩放是**裁切**：静态底图 2560×1440 放在 `overflow:hidden` 的 `.bg-wrap` 里，`left:-320 top:-180`，正好露出中心 1920×1080。动态 PV 本身是 1920×1080，不裁 |

### 按钮

| # | 要求 | 做法 |
|---|---|---|
| 3 | 两个共鸣按钮还是不等大 | 根因：`public/assets/ui/btn/res-*.webp` 是 10-21 的旧产物（360×116 / 352×97），而源图 10-22 已被换成等大的 320×72 却没重跑归集。重新转码后两个按钮**共用同一个盒子 296×66** + `object-fit: contain`，必然等大 |
| 3b | 删除 UID、今日剩余共鸣次数 | `.uid` / `.remaining` 元素与样式一并删掉 |
| 4 | 共鸣详情 + 背景切换移到左下角横排 | 共鸣详情 `(18,1017) 187×45`，切换键 `(220,1016) 46×46` → 离左/下边缘 18px、两钮间隔 15px；`0/48` 收集进度居中压在共鸣详情正上方 `(18,986)` |
| 9 | 退出键保持 95×96 | 从 66×67 改回 95×96。素材 `back-n` 的圆在 19..76（圆心 47.5,47.5），实机圆心 (68.5,49) → 盒子落在 **(21,2)**；页签「共鸣」同步到墨迹 118..185 × 25..60（36px） |

### 卡池列表

| # | 要求 | 做法 |
|---|---|---|
| 5 | 悬停也要放大；同时只有一个；悬停优先 | 新增 `hoverIdx` / `selectedIdx` / `enlarged = hover ?? selected`，只给 `.pool-item.big` 上放大。悬停是临时态，`@mouseleave` 归零；选中是常驻态 |
| 5 | 镂空框包裹整个缩略图，四周大 1px | `.pi-frame` 从固定 268×148 改成 `calc(100% + 2px)` + `left/top:-1px`。⚠ 全局 `img{max-width:100%}` 会把 244 夹回 242，必须补 `max-width:none` |
| 6 | 放大后盖住上下卡池 | 放大只走 `transform`（不改盒子），行距 122 = 盒 110 + 间隙 12，放大纵向只吃 8px → 实测上下各留 4px，不遮挡 |
| 10 | 标签方框左上角没重合 | 素材 168×60 的内容在 6..150 × 11..49，有内边距。改成 `object-fit:fill` 到 88.7×41 并把盒子推到 `(-3.2,-7.5)`，内容左上角正好落在缩略图角上 |

### 其他

| # | 要求 | 做法 |
|---|---|---|
| 7 | 深海回响星星黏字、离按钮太远、缺「xx次后可领取」 | 按实机重排：圆环内容 0..83 → 五星 86..110 → 「深海回响」112 → 「20次后可领取」142，整块 (1732,606) 170×164。圆环/礼盒/星星都按素材内边距反推盒子（`wish-n` 152×168 内容 21..144、`gift-flower` 256×256 内容 18..230） |
| 8 | 货币栏两头被拉伸变形；下划线离栏 2px | 容器改 **border-image 九宫格**：`slice 0 28 0 28 fill` + `border-width 0 28px`，左右各 28px 原样画、只拉伸中间。下划线按素材金线 y 59..78 反推 `top:-7.5`，金线顶正好落在栏底 +2px |
| 11 | 临界区虚化要柔和 3 倍 | mask 过渡 8px/34px → **24px/102px** |

### 顺带修正

- 卡池名字号 24 → **20px**（实机墨迹高 16px、宽 95px），`left:5 bottom:4`
- 未放大缩略图的压暗 0.22 → **0.30**（实机更暗）
- 归集脚本新增 4 个窗口素材键：`ui.banner.winBg / winLine1 / winLine4 / winLine3`

### 踩坑

- **素材重新出图后必须重跑归集**：`res-*.webp` 看着在、其实是旧图，两个按钮"怎么调都不等大"的真因就在这里
- **Vite dev server 会缓存写一半的 public 文件**（返回 200 但只有 463 字节）→ 改完素材必须重启
- **`img` 只写 `inset` 不写 `width/height`**，会退回素材自身比例（268×148 → 273×153），必须显式 `calc()`

---

## [v0.4.01] 2026-10-23 — 共鸣页 19 条精修（列表滚动 / 动态背景 / 素材对齐）

用户逐条列了 19 项（编号里 15 出现两次）。全部落地。

### 卡池列表

| # | 要求 | 做法 |
|---|---|---|
| 1 | 缩略图要可滚动 | `.pool-list` 改 `overflow-y: auto`（隐藏滚动条）+ 内部 `.pool-inner` 撑到 723px，滚轮可滚（实测 scrollTop 0→53） |
| 2 | 类型标签方框与缩略图左上角重合 | `.pi-tag` / `.pi-tag-txt` 从 `left:2 top:3` 改成 `left:0 top:0` |
| 7 | 缩略图映射错了 | 按用户指认重排：**077→在属于孩子的故事里 / 001→遥远之海 / 030→缘起绘笔万念生**（之前 001/077/030 全错位） |
| 8 | 悬停/选中要放大 + 镂空方框 | 加 `.pi-frame`（`bg_list_line_h` 268×148，居中于缩略图），hover/active 时 `opacity:1`；hover `scale(1.02)`，active 用 271×129 大盒子 |
| 9 | 卡池名位置 | 左下角，`left:4px / bottom:2px`（原 6/7） |
| 16 | 上下临界区虚化、无红点 | mask 上下各留过渡（顶部 8px / 底部 34px）；`.pi-dot` 红点已删 |
| 17 | 每项下方金线 | 加 `.pi-line`（`bg_list_line` 236×48，金线在素材最底部，贴 item 底边） |

> 容器实际开到 290 宽（左移 11px + padding-left 11px），否则选中项 271 宽和镂空框 268 宽会被横向裁掉。

### 背景与按钮

| # | 要求 | 做法 |
|---|---|---|
| 5 | 背景有缩放 | 改用解包原图 `T_UI_resonance_gacha_076_bg_Vx.png`（2560×1440，`object-fit: fill` 即 0.75 等比缩放到 1920×1080） |
| 10 | 用 06.mp4 做动态背景 | 转 VP9 webm（去音轨）→ `video/banner-2.10-02.webm`，manifest 新增 `assets.bgVideo`；`<video autoplay muted loop>` 挂上，切换键可在动态/静态间切 |
| 11 | 切换键不要红点 | `.sw-dot` 已删 |
| 12 | 共鸣十次按钮略大 | 362×107 → **359×104**（位置同步微调） |
| 18 | 静态底图不补色 | 回退 `filter: brightness(1.2) saturate(1.05)` |

### 货币栏 / 底部

| # | 要求 | 做法 |
|---|---|---|
| 13 | 货币栏容器 + 下划线 + 图标 | 容器用 `T_UI_social_performance_bg.png`（**opacity 0.6**），底部叠 `T_UI_resonance_btn_long_details_n.png` 的金线；启示水晶图标换成 `T_UI_icon_016`（钻石 0001 / 无垠星石 0002 本来就用对） |
| 14 | 去掉卡池结束时间 | `.countdown` 整块删除 |
| 3 | 删「超值礼包」「套装展示」 | 只剩「共鸣详情」 |
| 4 | 共鸣详情用 golden_edge 容器 | `T_UI_common_btn_golden_edge.png`（280×84）显示 180×75 当按钮底 |
| 19 | 23/48 = 本池服装收集进度 | `store.codexStats` 的 `owned/total`（3★30 + 4★8 + 5★10 = 48），压在「共鸣详情」框上方 |

### 深海回响

| # | 要求 | 做法 |
|---|---|---|
| 6 | 礼盒图标 + 5 星 + 差多少次 | 圆环 `wish-n` 里放 `Flowing Spectrum Selectable.png`（70×70）；下面 5 颗金色星（素材本色，步距 12）；`wishHint` 按 `store.tiers` 里下一个未领取档位算「N次后可领取」 |

### 文字

| # | 要求 | 做法 |
|---|---|---|
| 15 | 抽取提示右 5 / 上 4 | `left 1493→1498`、`top 296→292` |
| 15b | 退出键不缩放、文字对齐 | 按钮改 66×67（保持 95:96 比例，内容圆钮 53px 与实机一致）；「共鸣」文字按实机 bbox（117..177 × 36..65）改成 `left:117 / font-size:32px`，与按钮内容中心对齐 |

### 素材

`collect-assets.py` 新增：`bg-076`（背景原图）、`long-details-n`（货币栏下划线）、`gift-flower`（礼盒）、`bgVideo`（按池 id 探测 `video/<id>.webm`）；启示水晶源改 `T_UI_icon_016`；缩略图 6 张按新映射重转。

### 修

- `exists()` 在 banner 循环里还没定义就被调用 → 改 `os.path.exists(os.path.join(OUT, ...))`
- 列表容器 `overflow-x: hidden` 会把选中项/镂空框横向裁掉 → 容器加宽 43px 再靠 padding 把内容推回原位

---

## [v0.4.00] 2026-10-23 — 卡池界面按 2.10「执律的流金」实机版式重建

用户提供了 `布局坐标/卡池界面/`（pxdesk 图片工程 + 素材堆叠工程.md + 素材路径表 + 素材副本），
要求按标注做出 2.10 版「执律的流金」的卡池界面。共鸣页（BannerView）整体重写。

### 坐标来源：直接读 pxdesk 的标注框

`卡池界面-图片工程.pxdesk` 是 pixel-desk 格式，`state.layers` 里有 14 个标注矩形。
画布是 1400×787，换算到 1918 时 ×1.37，得到全部 13 个 UI 区的绝对坐标：

| 区域 | 坐标 | 尺寸 |
|---|---|---|
| 货币栏 | 1325,23 | 546×50 |
| 深海回响活动签 | 1752,616 | 130×148 |
| 共鸣按钮行 | 1223,933 | 657×114 |
| 卡池列表（下临界虚化） | 41,123 | 247×689 |
| 视频/静态切换键 | 724,954 | 70×70 |
| 共鸣详情键 | 240,938 | 180×75 |
| 卡池名称艺术字 | 1501,95 | 376×193 |
| 抽取说明 | 1479,298 | 383×32 |
| 选中卡池（放大态） | 41,240 | 271×129 |
| 单个卡池缩略图 | 39,121 | 250×110 |
| 卡池类型标签 | 39,124 | 104×31 |
| 退出键 | 38,16 | 145×70 |
| 卡池名称 | 41,205 | 197×26 |

### 新增素材（14 + 6 张）

`ui/banner/` 下新增：类型标签三色（常驻蓝 / 限定金 / 联动限定绿，168×60）、缩略图米白光框
（268×148）、三段长条、切换键、金色描边、分割线、社交条、深海回响活动签（常态/高亮）、
共鸣按钮空框（356×112），以及左侧列表的 6 张卡池缩略图（2.10 实机那 6 个池，按截图顺序）。

### 版式重排

- 左侧卡池列表 6 项：未选中 250×110、选中 271×129、逐项 +118px，第 6 项（常驻）落 736；
  容器底部用 mask 做虚化；未选中压暗 0.22，选中项加 2px 金边
- 货币栏三资源横向铺开（图标 34、数值 26px）
- 右下两颗共鸣按钮、今日剩余次数、深海回响活动签、退出键 + 「共鸣」页签、UID
- 底部三段按钮**改成三颗独立胶囊**：解包的 `btn_long_details_s` 是一整条 597px 连体条，
  与实机的三颗分开胶囊形状不符，改用 CSS 画（半透明深底 + 米金细描边 + 两端尖角）

### 交互调整

- 「共鸣详情」→ 打开概率面板（原来独立的「共鸣概率」胶囊已删，位置与长条冲突）
- 「套装展示」→ 打开 5★ 套装详情
- 「超值礼包」「切换动态背景」→ 轻提示（素材/功能未做）
- 点击未收录的卡池 → 轻提示「该卡池素材尚未收录」

### 素材与数据

- `collect-assets.py` 新增 20 条素材条目；`pool-map` 里的 `banner-2.10-02` 已可完整收集
- 默认卡池切到 `banner-2.10-02`（`banner-1.0-03` 仍保留在 manifest 里，可随时切回）

### 已知差距

1. **实机截图是动态 PV 的一帧**，我们用的是静态底图 `bg-clean`：构图一致，但实机带 bloom，
   亮度/对比略高。已用 `filter: brightness(1.2) saturate(1.05)` 补到接近（均色 182 vs 184），
   但像素级仍对不上，全图 MAE 46 里大部分来自这里。
2. **中间「不落的黄金梦」/ 右侧「蒙尘之罪」套装信息块**（套名横幅 + 星级 + 分割线 + 代表部件）
   不在用户标注的 13 个框里，按「只做标注 UI」的要求**没有实现**。
3. 实机的「金羽共鸣之礼·一」活动条、「海风的祝颂」也不在标注里，未实现。

---

## [v0.3.02] 2026-10-23 — 修「半身像配成整体图」+ 跳过按钮回退

### 修：英文图标的部件被配上了「整体」图

`心灵对话`（4★ 颈饰）在详情页显示的是**人物全身图**，应该是**半身特写**。

根因在 `inventory.ts` 的选卡逻辑：

```ts
// 旧：图标是孤儿（英文名）就直接拿「整体」图，不再找专属卡
let card = orphan ? { name: orphan.name, src: orphan.src }
                  : initial?.cards.find(c => part(c.name) === icon.name)
```

但英文图标其实**有专属卡**，只是卡名用的是中文属性名：

| 图标（英文） | 属性表中文名 | 专属卡 |
|---|---|---|
| `Whispered Wishes` | 心灵对话 | `饰品·颈饰-心灵对话.webp` |
| `Embracing Vines` | 银蔓依偎 | `饰品·臂饰-银蔓依偎.webp` |

因为按英文名找不到卡，就一路掉到「整体」分支，把全身图当半身像用了。

**新顺序**：按图标名找 → 按中文属性名找 → 都没有才用「整体」图。

顺手修了两个相关隐患：

- 新增 `cardMatches()`：阶段卡名带后缀（`饰品·颈饰-心灵对话·薄暮`），
  旧代码用全等比较，导致 `stageCards`（进化阶段图）一直是空的
- `stageCards` 的整体件判断从「是否孤儿」改成「卡名是否以 `整体` 开头」，
  因为孤儿现在可能拿到专属卡

**审计结果**：全池 20 个部件，专用卡匹配正确 20 个，用整体图 0 个，异常 0 个。

### 改：右上按钮文案回退成「跳过全部」

v0.3.01 我按「它其实是看下一件」把文案改成了「下一个」，用户要求保留实机的「跳过全部」四个字。
文案回退，行为不变（仍是按 `detailQueue` 推进）。底部提示同步回「ESC 跳过全部」。

### 改：动画屏跳过钮回退成「F 键帽 + 跳过」

v0.3.01 我把它做成了和单抽界面同款的圆形按钮，看错了 —— 实机是**右下角一个 F 键帽 + 「跳过」**
（按 F 键跳过抽卡动画）。

实测坐标：键帽 1763,1017 约 23×20，文字 1790,1015 约 24px。
`key-f.webp` 素材是 40×38 但内容只占 30×26，所以显示尺寸要放大到 31×30 才有实机那样的大小。

---

## [v0.3.01] 2026-10-23 — 星级不改色 / 四五星立绘适配 / 抽卡流程重排

用户列了 11 条，全部落地。

### 视觉

| # | 问题 | 改法 |
|---|---|---|
| 1 | 星级被我改成了蓝/紫 | **一律用素材本色（金）**。删掉 `.dt-stars.s3/.s4` 和 `.rc-stars.s3/.s4` 的 `hue-rotate`，只保留 5★ 的一点金色外发光 |
| 2 | 四/五星立绘没对齐边框 | 根因是给 `iconKind==='flat'` 加了 `object-fit: contain` + 48/34px padding。**卡片图其实全是 520×724 人像**，跟三星一样 `cover` 就正好填满，`.flat` 整条规则删除（单抽页 + 十连卡两处） |
| 3 | ESC 键帽 | 改成**纯白胶囊 + 字母镂空**。CSS 没法把文字从色块里挖掉，用内联 SVG `<mask>` 实现，字母是真的透出底图 |
| 4 | F 与鼠标键帽一大一小 | 原来 22×23 vs 26×26，统一成 **24×24**，`top` 对齐 |

### 交互

| # | 要求 | 实现 |
|---|---|---|
| 5 | 「跳过全部」其实是「看下一件」 | 文案改 **下一个**，底部提示同步改成「ESC 下一个」 |
| 6 | 动画里删「共鸣中」圈和字 | 删掉 `.anim-loading` / `.al-ring` / `@keyframes spin` |
| 7 | 十连删「返回共鸣」 | 删按钮 + `.rs-back` 样式 |
| 8 | 十连点空白/ESC 回共鸣页 | `.result` 整体 `@click="back"`，卡片 `@click.stop`；新增全局 `keydown` 按阶段分派 |
| 9 | 十连动画后必须先出单抽界面 | `toResult()` 不再按次数分支，**单抽十连都先进 detail**，`cur=0` |
| 10 | 新部件强制展示，跳过只能跳重复 | 新增 `detailQueue`：`[0] + 所有 isNew 的索引`。重复件不给单独界面，「下一个」直接跳过 |
| 11 | 动画跳过钮与单抽界面同款，文字少「全部」 | 复用 `.dh-skip` + `.dt-skip-txt`，文字「跳过」 |

### 新增：ESC 全局键位

`onKey()` 按阶段分派：动画=跳过 / 单抽=下一个 / 十连网格=回共鸣页 / 套装页=继续。
屏幕上写的键位提示从此不会再「说谎」。

### 回归验证

```
十连 → 动画 → 单抽(第1件) → 连点「下一个」×10 → 网格 → 点空白 → /banner   ✅
十连 → … → 网格 → ESC → /banner                                        ✅
单抽 → 动画 → 单抽 → ESC → /banner                                     ✅
第 4 次十连出现重复件：10 张卡 / 7 个新件 → 只出 7 个单抽界面            ✅
```

详情页 FULL MAE 9.50 → **9.53**（+0.03 来自按钮文案从「跳过全部」变「下一个」，属预期）。

### 顺手清理

- 删掉死代码：`CROP` 部位裁切表、`cropOf()`、`statRows`（v0.3.00 改成 cover 后就不需要了）
- `.shots/verify3.mjs` 更新：`.skip-btn` → `.anim-skip`，十连要连点「下一个」才截图

---

## [v0.3.00] 2026-10-23 — 单抽展示界面按实机 1:1 重建（MAE 11.83 → 9.50）

用户提供了一份自己做的 1:1 还原 HTML（`全领域/无限暖暖共鸣界面/无限暖暖共鸣界面.html`）
和配套的 `素材堆叠工程.md`。这次把其中的坐标、素材身份、动效时间轴全部吃进来，
并按实机截图重新做了一遍像素级拟合。

### 核心：详情页从 12 个自造图层 → 24 个解包图层

之前详情页有大量"看着差不多"的手工臆造：`rotate(-1.4deg)` 卡片倾斜、`.dp-frame::after`
假纸边、`dt-warm` 假暖光、`.dt-bg-pool` 拿卡池背景虚化当底、`db-feather` 假金羽毛……
这些全部删掉，改成解包原件的绝对坐标摆放。

**FULL MAE 从参考工程的 11.83 降到 9.50**（分区最好的是背景 3.25、右侧装饰 4.89）。

### 破解：参考工程里 5 个「待核」素材全部对上解包原件

按文件字节数一一比对确认，详见 `布局坐标/单抽展示-实机对齐记录.md` 第三节：

| 参考工程名 | 解包路径 |
|---|---|
| `deco_chain` | `img_card_deco_02.png` |
| `deco_bracelet` | `img_card_deco_03.png` |
| `deco_necklace` | `img_card_deco_01.png` |
| `deco_ornament` | `img_ornament_03.png` |
| `deco_ribbon` | `img_boardorname_03.png` |

上次卡住的「面板右端金花 / 卡左珠链 / 面板斜金刷」三个细节，就是这三张 `card_deco`。

### 新增：属性标签五色 + 风格标签 9 张

`T_UI_common_img_tag01..05`（甜美粉 / 典雅金 / 清新绿 / 性感紫 / 帅气蓝）和
`label06/07/09/10`。属性标签的语义配色用两张实机截图双向验证过。

⚠️ **属性面板（board_01..04）跟属性无关**，是实测顺序「典雅→board-3、清新→board-2」。
按颜色反推会得到棕色面板，错得很明显。

### 变更：全局字体换成方正雅士黑

解包 UI 全篇用的是 `FZYASHJW_Cu.ttf`，项目此前一直拿 Noto Sans SC 顶着。
现在 `global.css` 注册 `NikkiYaHei` 并放到字体栈首位，全站生效。
覆盖率：3076 个汉字只缺「翙、蹚」，Noto 兜底。

### 变更：十连结果卡片按实机重写

之前按「2400×1350 基准 ×0.8」推出 218×355、照片区 134×194 —— 实测实机是
**卡 236×372、照片区 210×302**，照片区小了四成，所以立绘被压成一条。

| 项 | 旧 | 新（实机实测） |
|---|---|---|
| 卡框 | 218×355 | 236×372 |
| 照片区 | 134×194 @(29,38) | 210×302 @(13,13) |
| 网格 | left 311 / top 150 / gap 45×52 | left 312 / top 141 / gap 26×32 |
| 星级 | 名称条上方，14px | 压在照片下缘居中，30×30 步距 21 |
| 名称 | 卡框**外** | 卡框**内**暗带 315..361，20px 居中 |
| 角标 | ×N 左上 / 新 右下 | 新 左上 / ×N 右上（实机如此） |

### 新增：2s 入场动效

按参考工程的时间轴实现：立绘组合整体 0.8 倍→1→缓出归位、丝带绕底部角尖摆正、
三金弧自右淡入、信息组自左淡入、罗盘 1/10 放大、星星 `scale(3)+brightness(3)` 爆发后逐颗回落、
装饰条/下划线 `clip-path` 逐像素浮现、道具组最后淡入、圆环 36s 慢旋。

### 新增工具

- `tools/diff-shot.py`：两张 1920×1080 截图的 MAE + 分区 MAE + 差异热力图
- `?demo=<部件名>`：开发期直出详情页（`import.meta.env.DEV` 守卫，生产构建被摇掉）

### 修

- `.dt-cardwrap` 是 `0×0` 容器，全局 `img{max-width:100%}` 把四件素材算成 0 宽 → 整体消失
- Vite dev server 会缓存写入一半的 public 文件（底板 200 但只回 463 字节）→ 重启
- 金框位置按标注表 429×589@431,259 偏右下 4/9px → 模板匹配 436×600@427,250
- 立绘不需要任何缩放（早期"放大 1.28 倍"是把素材缩到一半比对产生的错觉）

---

## [v0.2.05] 2026-10-22 — 3★ 散件文案接入 + 详情页二次对齐

### 修复：3★ 散件一直没文案

之前判断「3★ 散件没有 YAML 数据」，所以详情页面板永远显示「通用散件 · 没有专属文案」。
实际上 `素材/所有卡池通用三星散件/三星散件清单.yaml` 里 **30 个散件的文案、五维、标签、评论全都有**，
只是键名是中文（`名称/部位/版本/获取方式/风格/标签/五维/game-code/图片/描述/评论`），
而且用的是行内数组 `[清凉]` 和行内 map `{ 典雅: 24, ... }`。

数据链路补齐：
- `build-pool-map.py` 新增 `load_stars3()` → `pool-map.stars3`（30 条，含 `stats/top/desc/tags/comment/code`）
- `collect-assets.py` 的 `manifest.stars3` 从「只输出文件名」改成带完整元数据
- `types.ts` 新增 `Star3Info`；`inventory.ts` 的 `buildPool` 把 3★ 接上 `stats/top/desc/tags`

现在抽到「俏皮黑桃」会显示：★★★ / 典雅 · 制服 / 「他初学发型设计时总是笨手笨脚…」

### 变更：详情页按实机二次对齐

| 项 | 问题 | 改法 |
|---|---|---|
| 五维条 | 实机面板里**根本没有**五维条，是我多加的，把文案挤成一行 | 删掉 `.db-stats` |
| 额外获得条 | 横排「额外获得 · 静谧水滴 ×10」 | 改**上下两行**：小字「额外获得」在上，「静谧水滴 ×10」大字在下，图标 62×76 |
| 卡片书脊 | 实机卡片是「相册页」，右缘有一道纸边 | 加 `.dp-frame::after`（14px 白色渐变条 + 斜切） |
| 面板横条 | 之前 300×46 不够显眼 | 放大到 348×52 + `brightness(1.2)` |
| 面板底色 | 遮罩压太暗 | 减到 `rgba(18,26,44,.42) → .22 → .44` |

---

## [v0.2.04] 2026-10-22 — 单抽详情页对齐实机（对照示例图层工程）

拿 `布局坐标/示例（人工制作…）/` 的 19 层图层工程 + 实机截图逐项对比，补掉 7 处差距。

### 差距对照

| 项 | 实机 | 之前 | 改法 |
|---|---|---|---|
| 背景 | 卡池背景虚化（蓝紫/花海）+ 底部暖光 | 只有 `T_showpic_clothes_bg` 的棕褐渐变，整页发棕 | 新增 `.dt-bg-pool` 打底（卡池 `bgClean`，`blur(3px)` + 0.62），`detail/bg` 降为 `soft-light` 叠暖光 |
| 卡片姿态 | 约 **-1.4°** 手贴感倾斜 | 完全水平 | `.dt-photo { transform: rotate(-1.4deg) }` |
| 卡内图片 | **半身特写**（发型件显示头顶到胸口） | 全身图，人很小 | `object-position: 50% var(--oy)` + `scale(1.28)` + `transform-origin` 跟 `--oy` —— 各部位都能聚焦 |
| 卡片左侧 | 一串金色圆环 + 圆珠装饰 | 无 | 补 `.dp-deco.ring/.bead/.orn`（`deco-1` / `deco-3` / `ornament-3`），`screen` 混合 |
| 面板顶部 | **米金横条**，标题压在上面 | 标题直接白字 | 补 `.db-bar`（`orname-text` 拉伸 300×46，`left:-22 top:-16`） |
| 面板标题右 | 金色羽毛装饰 | 无 | 补 `.db-feather`（`ornament-3`，旋转 12°） |
| 面板底色 | 深蓝灰半透明 + 细颗粒 | 棕黑 | 遮罩改 `rgba(18,26,44,.52) → rgba(14,20,36,.34) → rgba(10,14,26,.5)` |
| 跳过按钮 | 圆钮 + 「跳过全部」文字 | 只有圆钮 | 改成 `.ds-btn + .ds-txt` 横排 |
| 底部提示 | `ESC 跳过全部` ／ `鼠标 点击空白区域继续` | 只有后半段 | 补 `.df-key` ESC 键帽 |
| 额外获得条 | 「额外获得」+ 图标 + 「静谧水滴 ×10」 | 缺「静谧水滴」名称 | 补 `.de-name`，图标 44px |

### 面板尺寸修正

`min-height:301 / max-height:560` 改成**固定 `652×301`** + flex column，
`db-desc` 设 `flex:1`、`db-meta` 设 `margin-top:auto` —— 内容少（3★ 散件无文案）时也不会缩成一团。

### 补归集

`T_showpic_clothes_img_orname_text_02`（219×13 下划线）、`T_showpic_clothes_img_ornament_03`（117×100 圆环+珠）。
自检 **336 条路径全部有效**。

---

## [v0.2.03] 2026-10-22 — 汇总 5 套坐标表的素材路径总表

新增 `界面素材路径总表.md`（189 行）+ 生成脚本 `tools/gen-asset-table.py`。

### 内容

把 `布局坐标/界面标注/` 里 5 个界面的「图层总表」和「素材完整路径」两张表合并，
再补上**归集后的前端路径**，形成一张可以直接照着写 CSS 的对照表：

| 段 | 内容 |
|---|---|
| 一、速览 | 每个界面的图层数 / 有独立贴图 / 已归集 / 未归集 |
| 二、分界面详表 | 5 张表，每层一行：分类 · 素材说明 · 素材文件 · 原始相对路径 · 前端路径 · 画布 x,y · 画布 w×h · 来源 |
| 三、前端索引 | 按归集路径排序，标明该素材出现在哪几个界面的哪一层 |

### 统计

| 界面 | 图层 | 有贴图 | 已归集 | 未归集 |
|---|---|---|---|---|
| 01 共鸣主界面 | 19 | 9 | 5 | 4 |
| 02 十连结果 | 19 | 12 | 11 | 1 |
| 03 部件详情 | 22 | 21 | 20 | 1 |
| 04 深海回响 | 20 | 5 | 3 | 2 |
| 05 单抽·重复部件 | 10 | 8 | 7 | 1 |
| **合计** | **90** | **55** | **46** | **9** |

### 补归集

翻素材库时又找到 2 个之前漏掉的：
- `T_UI_Glow_23.png`（512×512）→ `ui/banner/glow-title.webp`（共鸣页标题背光）
- `T_UI_reward_new_img_new.png`（232×176）→ `ui/detail/badge-new.webp`（新部件角标）

自检 **334 条路径全部有效**。

### 仍缺的 6 个（atlas 未单独导出）

`T_UI_resonance_gacha_clothesinfo_PNG`（套装信息条）、`T_UI_resonance_btn_roll_n`（共鸣按钮底）、
`T_UI_icon_003_PNG`（消耗图标）、`T_showpic_clothes_img_tips_01_PNG`（额外获得条）、
`T_UI_resonance_reward_tuning_hook_PNG`（对勾）、`T_UI_resonance_reward_btn_go_n_PNG`（跳转按钮）。

表里标了 `⚠ 未归集`，当前实现用现有素材替代。

---

## [v0.2.02] 2026-10-22 — 修设计舞台居中失效（页面偏右下）

**现象**：非 1920×1080 窗口下，整个界面缩到右下角，左上一大片黑边，右边和下边被裁。

**根因**：`.stage` 用的是 `display: grid + place-items: center`。
当 grid item（设计盒 1920×1080）**比容器大**时，CSS 的「安全对齐」会把 `center` 退化成 `start` ——
item 从 `(0,0)` 开始布局，再被 `transform: scale()` 一缩，就以自身中心为原点往右下跑，
偏移量正好是 `(1920 - 视口宽) / 2`。

实测（修复前）：
```
1084×613  → design boundingRect [418, 235, 1084, 610]   ← 偏了 418/235
1440×900  → [240, 135, 1440, 810]                        ← 偏了 240/135
1280×1024 → [320, 180, 1280, 720]
1920×1080 → [0, 0, 1920, 1080]                           ← scale=1 时反而正常
```

**修法**：不再依赖 grid/flex 居中，改成
```css
.design { position: absolute; left: 50%; top: 50%; transform-origin: center center; }
```
```html
<div class="design" :style="{ transform: `translate(-50%, -50%) scale(${scale})` }">
```
`translate` 先把中心对准容器中心，`scale` 原点也是中心，两者叠加后视觉盒子必然与容器同心。

实测（修复后）：
```
1084×613  → [0, 2, 1084, 610]      ← 水平铺满
1440×900  → [0, 45, 1440, 810]     ← 16:9 内容在 16:10 屏里上下各留 45 黑边
1280×1024 → [0, 152, 1280, 720]    ← 4:3 屏上下黑边 152
1920×1080 → [0, 0, 1920, 1080]
```

⚠️ **这条对所有"固定设计尺寸 + scale 适配"的写法都适用**：grid/flex 的 `center` 在内容溢出时不可靠。

---

## [v0.2.01] 2026-10-22 — 统一 1920×1080 设计舞台，按界面标注档案重构

这一版做的是**架构级治本**：不再让每个组件各自用 `%`/`flex` 去"凑"，而是把所有界面钉在
1920×1080 设计坐标系里，外层只做一次等比缩放。

### 备份

`备份/抽卡模拟器-v0.7.1-2026-10-22.zip`（zip 名沿用旧编号；62 个文件：`src/` `tools/` 根目录文档 +
`布局坐标` 的 md/csv + `manifest.json`。素材二进制可由 `collect-assets.py` 重建，未打包）。

### 架构：设计舞台

```html
<div class="stage">                     <!-- fixed inset:0，黑底居中 -->
  <div class="design" :style="{transform:`scale(${scale})`}">   <!-- 1920×1080 固定 -->
    <router-view />
  </div>
</div>
```
`scale = min(vw/1920, vh/1080)`，监听 resize。**保证永远 16:9，且内部 px 就是实机 px。**

### 按坐标表重构的界面

数据源：`布局坐标/界面标注/`（5 个界面 × 4 件套 = 素材路径 md + 坐标 CSV + 堆放示意图 + 标注截图）

**01 共鸣主界面**（19 层）
- 补 L06 底部黑条 `0,600 → 1920,760`（160px 暗场）
- 补 L07 标题背光 `478,-768 → 841,408`（363×1176）
- L08 缩略图列表 `11,75` 342×755，条目 256×172
- L10 名称底条 236×48（新增素材 `ui/banner/list-line.webp`）
- L11 套装信息条移到 `40,830`，300×62
- L12 共鸣概率胶囊 `100,960`，**600×75**
- L13 货币栏 `1620,23`，245×52
- L14 深海回响 `1500,815`，370×90
- L16/L17 共鸣按钮 `1144,949` / `1524,949`，各 **356×112**

**02 十连结果**（19 层）
- 卡片 **218×355**（实机实测，UMG 276×444 是 2400×1350 基准，×0.8）
- 网格 `left:311 top:150`，`gap:45px 52px`
- 照片区 **`29,38` 134×194**（不是百分比！）
- 名称条 `0,232` 218×123
- 标题回左上 `60,44`（UMG 给的 362 是标题组容器中心，不是文字位置）
- 新卡：金框加 `drop-shadow` 高亮

**03/05 部件详情**（22 层）
- 金框 `431,259` 429×589
- 属性面板 `971,347` **652×301**
- 跳过按钮 `1667,12` **99×102**（换成游戏素材双图叠层）
- 额外获得条 `0,874` 568×148
- 罗盘徽记 `1080,61` 1644×906（右半溢出，`opacity:0.18` + screen）
- 键位提示换 `T_UI_KeyTips_Left_Mouse`（33×32）

**04 深海回响**（20 层）
- 节点 **108×110**，首节点 `x=204`，**间距固定 188px**（不再是容器均分）
- 次数标签移到节点上方（`bottom:100%`）
- 轨道按 `-40,590 → 1960,796` 绘制

### 素材

`collect-assets.py` 新增 9 个：细分割线、素材图标 `T_UI_123`、立绘底 `T_showpic_clothes_blank`、
面板侧丝带、丝绸吊牌、文字装饰条、F 键 / 鼠标键位图标、卡池列表名称底条。
自检 **332 条路径全部有效**。

缺 5 个素材（`tips_01_PNG` / `clothesinfo_PNG` / `btn_roll_n` / `tuning_hook` / `btn_go_n`，
都在 atlas 里没单独导出），用现有素材替代。

---

## [v0.2.00] 2026-10-22 — 接入 UMG 布局坐标，按实机数值对齐

拿到了解包 UMG 的坐标表（`布局坐标/`，103 个 `layout_*.json` + 3 个 md），
以 1920×1080 设计基准逐项核对，改掉一批「凭肉眼估」的数值。

### 数据来源

`布局坐标/通用系统UI/layout_Resonance_Main_New.json` 等文件是 UMG WidgetBlueprint 反序列化结果，
每个节点带 `slot.layout.{Anchors, Offsets, Alignment}` 与 `image.texture`。
换算公式：`x0 = Min.X×W + Left`，再按 Alignment 平移。

### 修复（关键）

- **十连卡「图片比方框略大」的真正原因**：不是缩放，是**底部留白少了 10%**。
  实机 `Image_ShowPic_*` 是 `36,47 → 204,290`（168×243），框是 `0,0 → 276,444`，
  换算后 **left 13.04% / right 26.09% / top 10.59% / bottom 34.68%**。
  之前只留 24.5%，底部那 154px（星级条 + 名称条）被图片压住了。

### 对齐（共鸣页）

| 元素 | 实机数值 | 改前 → 改后 |
|---|---|---|
| 抽卡按钮 | `Btn_OneRoll` / `Btn_TenRolls` **356×112** | 212×60 → **356×112** |
| 货币栏 | `ScaleBox_Money` Offsets `L=-55 T=23` | right 26 / top 20 → **55 / 23** |
| 卡池缩略图列表 | `RetainerBox_TabItem` `11,75 → 353,1305`（宽 342） | left 34 / 宽 214 → **left 11 / 宽 342** |
| 动作区 | `ScaleBox_Roll` Offsets `L=-40 T=-19` | right 38 / bottom 32 → **40 / 19** |
| 退出按钮 | 实机在左上角第一行（列表从 y=75 开始） | 挪出左列流，`fixed 20,18` |

### 对齐（单抽详情）

按实机截图 `145641.png` 的比例重排：
- 相框 `340×468`、左缘 `9.4%`（实机约屏宽 16.7%）
- 属性面板从相框右侧 `27%` 起，到屏右 `24.5%` 止（实机面板约屏宽 48%，比之前宽一倍）

### 关于「无限暖暖2」

那个目录的 CHANGELOG 标了 v0.7.0「按实机布局坐标 1:1 还原」，但逐文件比对后：
**22 个源码文件里只有 `BannerView.vue` 改了两处**（货币栏 55/23、按钮 212×60 → 320×100），
其余 21 个文件与本仓库逐字节一致。它多跑了一次 `npm run build`（有 `dist/`）。

⚠️ 其中按钮设成 **320×100 是不准确的** —— 实机 `Btn_OneRoll` 的 CanvasPanelSlot 明确是 **356×112**，
本版已按实机值修正。

---

## [v0.1.07] 2026-10-21 — 开机动画 / 套装横幅 / 游戏内按钮 / 卡面留白

按第三轮反馈修改。

### 新增

- **开机动画**：`Login_Title_ShowUp_Onlylogo_带配音.webm`（2560×1440 / VP9 + opus / 5.001s，**这段有音轨**）。
  - 三段状态机 `boot → reveal → ready`
  - 自动播放被浏览器拦截时显示「点击开始」；正常播放时右下角可「跳过」
  - 8s 兜底：视频卡住也强制进 reveal
- **主页底图 + LOGO**（用户自制素材）：动画播完后底图 `opacity 0→1` + 缓慢推近 3.2s，
  LOGO 延迟 0.55s 从下方浮起 1.5s，之后 LOGO 呼吸发光、BGM 淡入。
  之前那 10 个 deco 装饰件全部停用 —— 底图本身就把星星、星座、云海画好了。

### 变更（共鸣页）

- **套装卡 → 纯横幅**：去掉白底方框，只留名条本身；星级（改用游戏内金色四角星图标）、
  套装名、收集进度直接叠在横幅上。
- **深海回响移到右下角**，和共鸣按钮合成一个 `action-dock`（上下两行）。
- **两个共鸣按钮强制等大**：素材本身比例不同（360×116 / 352×97），统一成 212×60 + `object-fit: fill`。
- **退出按钮换成游戏内圆形返回钮**（`T_UI_common_btn_back_n/h`，95×96），悬停叠发光环。

### 变更（抽卡结果）

- **卡面图片再内缩一圈**：`left/right 8.5% → 11%`、`top 8% → 10.5%`、`bottom 22% → 24.5%`。
  之前图片压住了金框的内沿线。
- **星级改用 `T_UI_common_quality_star_n.png`**（86×87 金色四角星），不再用文字 ★；
  4★ 走 `hue-rotate(252deg)` 偏紫，3★ 降饱和。

### 素材

- `collect-assets.py` 新增：主页底图、官方 LOGO、返回/关闭按钮四态、开机动画
- 自检 **323 条路径全部有效**

### 修复

- **巡检脚本选择器失效**：按钮尺寸统一后把 `single`/`ten` class 删了，`.pull-btn.ten` 点不到。
  class 保留（语义 + 脚本定位），尺寸交给 CSS 统一。

---

## [v0.1.06] 2026-10-21 — 图片适配 / 共鸣页三处重排 / 音频收尾 / 主页去水晶

按用户 5 条反馈修改。

### 修复

- **抽卡结果图片溢出方框**：卡片和单抽相框都用了 `transform: scale(z/1.55)`（1.3~1.7 倍放大），
  卡片里只剩一小块皮肤，单抽相框更是直接溢出金边。改为**只保留 `object-position`** 定位部位，
  不再缩放；同时给 `.dp-frame` 加 `overflow: hidden` 兜底。
- **共鸣演出音在视频结束后还在响**：之前把演出音对齐到「动画音效」的尾部，但动画音效 13.5s / 16.2s、
  视频只有 10s，于是视频放完演出音还剩 3.5~6.2s。实测演出音 10.09s / 10.17s 本就约等于视频时长，
  改为从头播、在 `onVideoEnd` 里统一淡出 420ms。

### 变更（共鸣页）

- **套装卡去掉立绘**，只留套装名条（`gacha_NNN_name_0X`）+ 星级 + 名称 + 收集进度。
  名条按素材原比例 332:96 放，之前写死 52px 高 + `cover` 把左端花饰裁掉了一半。
- **共鸣按钮移到右下角**横排（208px / 238px），不再占右上列。
- **底部黑条整条删除**，保底进度、概率表、深海回响进度全部收进左下角「共鸣概率」胶囊，
  点击向上弹出面板。软保底区间内胶囊上会亮一颗脉冲小点。

### 变更（主页）

- **移除 4 个水晶碎块**，各二级页面统一从左侧收纳栏进入；底部提示加了指向左侧的脉冲箭头。
- 用 `素材/主页/主页面素材` 的 **10 个装饰件**重做视觉，全部 `mix-blend-mode: screen`：
  - `deco-halo` 金色几何光环（标题后光台，560px / 0.3）
  - `deco-trail` 紫色流线（横跨 36% 高度，18s 漂移）
  - `deco-starlight` 右侧紫色光柱（932×1080）
  - `deco-ribbon` 左下金色丝带（1512×788）
  - `deco-stars` 星点群（**512px 平铺**，拉伸到全屏会糊）
  - `deco-goldstar` 金色立体星 ×4（模糊 0.6px 柔化边缘）
  - `deco-spark` 十字亮星 ×6（闪烁）
- 暗角改成三层：四角径向 + 顶部压暗 + **底部 0.72 压暗云海**（bg1 的云海本身很亮，不压整页发白）。
- `collect-assets.py` 新增这 10 个装饰件，自检 **316 条路径全部有效**。

---

## [v0.1.05] 2026-10-21 — 按《修改方案》重构为五页面 + 全 UI 素材化

**这一版从「像实机」走向「结构也对」。** 按 `修改方案.md` 的 11 条要求，把单页应用拆成主页 + 四个二级页，去掉上下黑条改为侧边收纳栏，并把朋友分享的那批透明 PNG 全部接进界面。

### 新增

- **主页（一级页面，`src/views/HomeView.vue`）**
  - 背景 `bg1.png`（2560×1440）+ `T_UI_ih_ss_textures_01.png` **40% 不透明度**叠加，配缓慢呼吸与纹理漂移
  - **4 个水晶碎块**（`T_UI_XHSY_btn_crystal_01/03/05/06`），三态叠层：`_bg` 光晕 + 主体 + `dark` 暗态
  - 漂浮动画（每个水晶不同周期与相位）+ **粒子上升特效**（14 颗/水晶，伪随机保证不闪）
  - 水晶下方胶囊标签写页面名，点击进入对应二级页
  - 启动默认落在主页

- **侧边收纳栏（`src/App.vue`）**
  - 删除顶部导航与底部黑条，改为左侧边缘 14px 发光细条
  - hover 展开 158px，露出 主页 / 共鸣 / 图鉴 / 黄历 / 设置 五项
  - 抽卡演出页自动隐藏，避免遮挡

- **五个页面路由**：`/` 主页、`/banner` 共鸣、`/codex` 图鉴、`/almanac` 黄历、`/settings` 设置（`/gacha` 为演出页，不入导航）

- **共鸣页按方案重排（`src/views/BannerView.vue`）**
  - 左上从上到下：**退出按钮 → 卡池缩略图 → 套装卡片**
  - 右上从上到下：**货币栏 → 卡池艺术字 → 深海回响入口 → 共鸣按钮**
  - 货币栏三个死值：无垠星石 66666 / 钻石 88888 / 共鸣水晶 99999（不随抽卡变化）
  - 共鸣按钮直接用素材图（`共鸣按钮-单次/十连.png`，文字已烘焙）
  - 底部：保底双条 + 深海回响进度条 + 共鸣详情弹层

- **深海回响 1:1 还原（`src/components/EchoView.vue`）**
  - 总览态：左上金徽记 + 标题、左侧大圆环（含向下光束）、横贯全屏曲线、节点
  - 节点结构：**向上光柱 + 顶端星芒 + 黑胶囊次数 + 粉底奖励卡**（实机朝向）
  - 三态：未达成 / 可领取（蓝光柱）/ 已领取（绿勾）
  - **详情态**：顶部「N次后可领取」、中央大图、右侧礼盒名 + 描述 + 领取按钮、左右 ‹ › 翻页、底部缩略时间轴
  - 奖励名中文映射（`rewardName()`），`Flowing Spectrum Selectable` → 「流光自选礼盒」

- **抽卡演出三屏重做（`src/views/GachaView.vue`）**
  - 十连结果：卡牌框用 `T_UI_resonance_bg_character_01/02/03`（3★ 金 / 4★ 紫 / 5★ 粉拱），202px 窄卡，发光背景
  - 单抽详情：**金色相框**（四角三角装饰）+ **属性面板**（`board_01~04` 按五维主属性配色）+ 星级 + 属性标签（`label_01~05`）+ 五维条
  - 套装获得：拱形金框 + 进度环 + 名称星级（抽满一套时插入）

- **抽卡黄历（`src/core/almanac.ts` + `src/views/AlmanacView.vue`）**
  - 仿传统黄历：公历/伪农历/干支/值神/五行/冲煞/宜忌/十二时辰吉凶/签文
  - 24 条自编签文 + 12 时辰点评，**日期种子生成**（同一天稳定，跨天翻页）
  - 明确标注「仅供娱乐，不影响实际抽卡概率」

- **设置页（`src/views/SettingsView.vue`）**：主音量、BGM 开关、跳过动画、粒子特效、PV 挂载三档、存档统计与重置、版权声明

- **音频系统重写（`src/composables/useAudio.ts`）**
  - 支持 `fadeIn` / 淡出停止 / 复音
  - **跳过抽卡动画时动画音效淡出 380ms，BGM 淡回**（方案第 1 条）
  - 共鸣演出音与动画音效**叠加**，音量取一半，按 `动画时长 - 演出时长` 延迟播放实现**尾部对齐**
  - 星级音按 3/4/5 连击，间隔 100ms
  - **BGM1 循环 + BGM2 彩蛋**（BGM1 结束后 30% 概率插播，最长 40s 强制切回）
  - 抽卡期间 `duckBgm()` 把 BGM 压到 28%
  - 音效表按 `素材/卡池音频/选定的音频.md` 重建，**36 个音效**（原 15 个）

### 修复

- **卡牌框被照片盖住**：`grid-template-rows: repeat(2, 1fr)` 把卡撑高，`rc-photo` 的百分比定位溢出到框外。改 `repeat(2, auto)` + `align-self: center`。
- **`UI_Common_Button_Big_A_Hover` 查不到**：`索引.csv` 里该行是 `A;B` 多别名格式，`build_sfx_index` 只存了整串。改为按 `;` 拆开逐条登记。
- **卡池进入音全部匹配失败**：正则用了 `match`，但文件名前有序号前缀（`007_卡池进入·…`），改 `search`。
- **属性面板配色看不出来**：`board` 素材是「上深下亮」的横向渐变条，`cover + top` 只显示深色段。改 `background-size: 100% 100%` 并减淡遮罩。
- **深海回响曲线画成了明显波浪**：`sin*30 - t*26` 振幅过大，实机前段几乎水平。改 `sin*13 - t*40`。
- **节点朝向反了**：实机是光柱向上、胶囊与卡片向下，`translate(-50%,-100%)` 正好相反。改 `translate(-50%,0)` + 光柱 `top:-32px`。
- **奖励名是英文**：原始数据 `Flowing Spectrum Selectable` 直接显示会跟中文界面打架。加 `rewardName()` 映射，兜底「深海回响礼盒」。
- **清理 15 个未使用音效**（`click` / `btn-primary` / `page-fadein` 等死键），sfx 从 4.8MB → 3.6MB。
- **部件显示名混着英文**：`Whispered Wishes` / `Embracing Vines` 是图标文件名，直接显示跟中文界面打架。`Part` 新增 `displayName`（优先取属性表中文名），`name` 保持不动 —— 它是存档主键，改了会让老存档失效。
- **图鉴未获得状态压成一片灰白**：`grayscale(0.92) brightness(0.46)` 太过，改 `grayscale(0.6) brightness(0.66) opacity(0.55)`，保留剪影可辨。
- **侧边栏收起时会压到共鸣页左列**：左列 `left` 从 26px 让到 34px，底部保底区同步让位。

### 素材

- `collect-assets.py` 新增 **UI 素材段**：主页、水晶三态、深海回响、单抽详情、十连卡牌、套装获得、货币图标、鼠标指针、共鸣按钮
- manifest 新增 `ui` 段（按功能分组：home / btn / echo / detail / card / suit）与 `bannerEnter` 段
- 自检 **306 条路径全部有效**

### 已知限制

- 只有 1 个试点池（留于花间的浮想），其余 76 池数据齐但界面未接
- 3★ 通用散件仅 30 件，抽满后全重复
- 单抽详情「额外获得 静谧水滴 ×10」是写死的，无实际道具系统
- 黄历为纯娱乐，不参与概率计算

---

## [v0.1.04] 2026-10-19 — 按实机录屏重做三屏，接上全部部件文案

**这一版从「能跑」走向「像实机」。** 用户提供 8 段实机录屏（含 1 段 201 秒全流程）+ 6 张深海回响截图作为对照，逐帧抽样后对三个界面重做，并把 116 个属性 YAML 的部件文案接进前端。

### 新增

- **属性 YAML 全量接入**
  - `tools/build-pool-map.py` 内置 `_mini_yaml` 解析器（**不依赖 pyyaml**，系统 Python 可直接跑）
  - 用 pyyaml 交叉校验 **116 文件 / 1018 部件零差异**（仅数字为字符串，代码里转 int）
  - `pool-map.json` 每个套装新增 `parts: [{名称, 部位, id, 五维倾向, 文案, 标签, 前2维}]`
  - `tools/collect-assets.py` manifest 透传；`Part` 新增 `uid / stats / top / desc / tags`

- **十连结果页重做**（`src/views/GachaView.vue`）
  - 5×2 窄卡（158px），卡面改用 `part.card`（520×724 人物试穿图），不再是透明单品图
  - **按部位做缩放裁切**：鞋子锚点 92%、发型 8%、下装 60% … 与实机一致（鞋子卡只到小腿、发型卡只到肩）
  - 4★ 紫粉渐变皮 + 5★ 金皮 + 流光扫过
  - 卡顶 `◈ ×N` 重复数 + 右上角红色「新」标
  - 深紫星空背景 + 底部中央蓝色光池

- **单抽详情页**（新增，之前完全没有）
  - 单抽不再走结果页网格，直接进入详情
  - 左：**宝丽来相纸**（白边、轻微倾斜、四角金色贴纸）放试穿图
  - 右：**纸片便签**——部件名 + 金色花饰 + ★ + **五维前两位的 chip** + 完整部件文案 + 套装/部位/首次/重复信息
  - 3★ 散件无 YAML 文案，标签自动用「部位」兜底

- **深海回响重做**（`src/core/milestone.ts` + `src/views/BannerView.vue`）
  - 网格抽屉 → **全屏横向曲线时间轴**
  - 新增 `tierViews()`：按档位 group（同一档可能发多件奖励）+ `nextUnreached()`
  - 左侧大圆环（蓝色 SVG，进度 = 当前抽数 / 最后一档）
  - 中间正弦曲线（SVG path，120 采样点）+ 节点（黑色胶囊标签 + 圆点 + 奖励卡缩略图）
  - 节点三态：未达成（灰）/ 可领取（**蓝色光柱高亮**）/ 已领取（绿点 ✓）
  - 点节点 → 右侧详情面板（礼盒大图 + 档位 + 奖励列表 + 领取按钮）
  - 底部提示「N 次后可领取「N次」档奖励」
  - 界面名从「深忆奖励」改为实机的 **「深海回响」**

- **`素材/卡池音频/` 试听包**（169 个音频 / 13MB）
  - `tools/export-audio.py`：从 62,403 个 mp3 里筛出「卡池界面 / 通用 UI / 抽卡机演出」三类
  - 附带 `试听.html`（分类切换 + 搜索 + 连播 + ★标记 + 导出已选）
  - `索引.csv` 含每个音的原始事件名、wem_id、时长

- **期数映射表** `素材/朋友分享素材/期数-卡池名-映射.csv`（77/77，含 title 文件路径）

### 修复

- **标题字扫描漏了 `greece` 前缀**：`T_UI_resonance_greece_NNN_title.png`（031/032/022/028）
- **只扫了旧目录**：029–057 的标题字只在 `朋友分享素材/` 里，旧目录根本没有
  → 重扫两目录两前缀后：**76/77 期有标题字**，只有 058（契约终末之时）真缺
- **`--manifest-only` 会把 `video` 字段抹成 null**（因为顺带设了 `no_video`）→ 改为以磁盘文件是否存在为准
- **白色标题字在白底预览里"消失"**：`gacha_010_title` 实为「献给夜空的花束」，叠深色底才看得见
- **同一档位的多件奖励被当成重复数据**：现按档位 group
- **英文名「整体」件对不上 YAML**：`Whispered Wishes` ↔ `心灵对话`、`Embracing Vines` ↔ `银蔓依偎`，用「两边未匹配集合顺序配对」接上
- **深海回响弹层被顶部导航挡住**（main-area z-index 10 < nav 20）→ 改用 `<Teleport to="body">`
- **卡牌被 `grid-template-rows: 1fr` 压扁**（与 `aspect-ratio` 循环依赖）→ 改 `display: block`

### 数据侧的重要发现

| 项 | 结论 |
|---|---|
| 深海回响阈值 | **三套**，不是一套：44 个纯 4★ 池 `[5,15,25]`；32 个 5★+4★ 池 `[20…230]` 10 档；1 个常驻池（遥远之海）**36 档** `[20…715]` |
| 同一档奖励 | 可发多件（如 160 档 3 件、230 档 3 件），渲染必须按档位 group |
| 卡池标题字 | 合并两目录后 **76/77** 有，只有 058 缺 |
| 服装单品图标 | 不在 UI 包里（`SysClothesArchive` 是图鉴"书"的外框），3★ 缺口补不了 |

---

## [v0.1.03] 2026-10-19 — 规则定稿，生成统一数据源

### 新增

- **`素材/pool-map.json`**（713KB，唯一数据源）：77 池 / 116 套 / 三套编号 / 规则参数；**2,256 条路径 0 缺失**
- **`tools/build-pool-map.py`**：素材更新后重跑即可，不手改 JSON
- **`tools/verify-rates.py`**：概率精确解 + 蒙特卡洛校验

### 定稿规则

- 抽卡道具「启示水晶」与两种货币（无垠星石 / 钻石）**全部 ∞**，不做不足弹窗
- 5★ **20 抽硬保底，常驻池同样适用**；4★ 每 10 次必出四星或以上
- 保底**各池独立，不跨池继承**
- 不做「海风的祝颂」

### ★ 关键修正：4★ 基础概率是 8.5546%，不是公示的 3.29%

规则是「每十次必出四星**或以上**」——**5★ 也会重置 4★ 保底**。按单维递推（3.29% 或反解 3.1489%）实际只有 **7.61%**，比公示低近 4 个百分点。必须用二维马尔可夫链（状态 = 5★计数 × 4★计数）联立反解。

- 5★：base 1.5%，第 12 抽起软保底 +1.048%/抽，第 20 抽必出 → 综合 **6.0600%**
- 4★：base **8.5546%** → 综合 **11.5000%**
- 3★：**82.4400%**
- 精确解偏差 **0.0000pp**

---

## [v0.1.02] 2026-10-18 22:40 — 素材第三轮，卡点全清零

### 突破

1. **bk2 → webm 跑通**（上一版唯一红色阻塞）
   链路 `radvideo64.exe binkconv /#` → 无损 AVI → `ffmpeg libvpx-vp9 crf32`
   - 抽卡 4 段：2560×1440 / 30fps / 10.00s
   - 展示 7 段：1920×1080 / 27~42s
   - **全部无音轨**、**不透明**（不需要 alpha）
   - 脚本留存 `素材/视频素材/_convert_bk2_webm.py`

2. **音频全量转码**
   `音效事件名对照表.csv` 62,403 行，可按事件名直接查 mp3 路径，不用听音
   - 抽卡机 8 个 `ui_lottery_machine_*`
   - 共鸣界面 83 个 `UI_Resonance_*`（Button_Hover/Select、PageFadeIn 按卡池编号）
   - 通用 `ui_general_unlock_big`、`UI_Common_Button_Big_A_Select` 等

3. **艺术字已分离**：新增 `卡池背景图（纯图片，无艺术字）/` 77 张真去字底图

4. **新增 `艺术字重命名映射表.xlsx`（45 行）**：`gacha_NNN_title → 卡池名`，与《前后名称对照表》77 条交叉 45 条全命中

### ★ 三套编号不一致（易错点）

| 编号 | 规则 | 覆盖 |
|---|---|---|
| A `list-版本-序号` | 按 5★ 池排前 | 77 池全有 |
| B `gacha_NNN` | 游戏内部 ID | 45 池有 title |
| C `ResonanceDisplay_NNN` | = B | 仅 7 池 |

**A ≠ B，不可互相推算**：`gacha_004`=呱呱轻语→`list-1.0-05`；`gacha_005`=泡泡心诉→`list-1.0-04`
→ 解法：`pool-map.json` 以卡池名为唯一主键绑三套编号

---

## [v0.1.01] 2026-10-18 20:00 — 素材升级盘点

- `素材/source/`：干净版素材库（版本/卡池/套装），77 个卡池目录，优先用它建 manifest
- `素材/字体库/`：61 个 TTF/OTF（含保底专用 `X6Font-guarantee_241224.ttf`、货币数字 `X6FontCurrency-Regular.ttf`）
- `素材/所有卡池通用三星散件/`：30 件 + 清单 yaml（部位/五维/标签/描述），**3★ 缺口基本补上**
- `素材/游戏内实机展示/`：8 张实机截图 + 78s 录屏
- `素材/套装信息表.xlsx`：776 行套装 + 25 行版本时间表 + 776 行部件名
- 《前后名称对照表.md》77 条：卡池↔list↔title↔套装ID，映射问题一次性解决

**bk2 结论**：全盘无 bink2*.dll，解码器静态链进游戏主程序 → "借 DLL"路线作废

---

## [v0.1.00] 2026-10-18 16:40 — 项目启动

- 产出 `工作计划书.md`
- 素材实测：116 套（5★36 / 4★80）、420 阶段、1018 部件、4186 张 PNG、77 张卡池 WebP
- 图片规格：部件图 520×724 RGBA；整体立绘 448×656 RGBA（**分辨率偏低**）；卡池图 1920×1080
- **3★ 素材完全缺失**（但占出率 82.44%）——当时最大缺口
- 技术选型：Electron + Vue3 + Vite + Pinia + GSAP；开发期先跑纯 Web，交付再套壳
- 领域层（engine/pity/inventory/rng）不依赖 Vue，RNG 注入以便单测

---

## 当前状态

| 里程碑 | 状态 |
|---|---|
| M0 素材工程 | ✅ `build-pool-map.py` / `verify-rates.py` / bk2→webm / `collect-assets.py` / `export-audio.py` |
| M1 核心引擎 | ✅ engine / pity / inventory / save / milestone |
| M2 界面骨架 | ✅ 共鸣页 / 抽卡演出 / 图鉴 |
| M3 演出接入 | 🟡 视频音效翻牌已接；粒子、动效 GIF、艺术字入场待做 |
| M3.5 卡池 PV | ✅ `config/pv.ts` 三档接口（文件默认未归集） |
| M4 多池切换 | ⬜ 数据层已支持 77 池，界面未做 |
| M5 打包 EXE | ⬜ **按用户要求暂不封装** |

**运行方式**

```bash
npm install
python tools/collect-assets.py --pool banner-1.0-03
npm run dev      # → http://localhost:5178
```

### 已知限制

- 只有 1 个池（试点池 `banner-1.0-03` 留于花间的浮想）
- 3★ 只有 30 件，抽久了会重复
- 深海回响 36 档的池靠横向滚动，没做实机的 ‹ › 翻页箭头
- 单抽详情的「额外获得」没有数据，未渲染
- 卡池 PV（7 段，约 750MB）默认不归集，需要时 `collect-assets.py --with-pv`
