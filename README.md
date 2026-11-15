<div align="center">
  <h1>
    <img src="https://pic1.imgdb.cn/i/034wuvZrI1jKApocsc9KEi.png" width="200" alt="心忆共鸣 Logo">
    <br/>
    ✨ 心忆共鸣
    <br/><br/>
    <sup>《无限暖暖》共鸣模拟器 · 心忆奇想工坊</sup>
    <br/>

  </h1>

  <p>
    <img alt="Platform" src="https://img.shields.io/badge/platform-Web%20%2F%20Electron-blue?style=flat-square" />
    <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-orange?style=flat-square" />
    <img alt="Release" src="https://img.shields.io/github/v/release/Cormuslum/MCU-resonat?style=flat-square" />
  </p>

  <p>
    <b>
      <a href="#-下载与安装">⬇️ 下载与安装</a> •
      <a href="#-开发者须知">🚀 开发者须知</a> •
      <a href="心忆奇想工坊/工具/updater/README.md">🛠️ 工坊说明</a>
    </b>
  </p>
</div>

## 🎯 项目简介

心忆共鸣（Memoria Cordis Una Resonat）

▸ 复刻游戏抽卡：单抽 / 十连、概率与保底、深海回响

▸ 套装图鉴、故事图鉴、阅读物图鉴全量浏览

▸ 玄学运势等彩蛋内容

▸ 配套「心忆奇想工坊」：拖图、填表就能更新内容，零依赖 Node 服务 + 自带 Python 管线

素材版权归叠纸游戏所有，本项目仅用于个人学习，非商业、非盈利。

## 🖼️ 界面预览

<div align="center">
  <img src="https://pic1.imgdb.cn/i/034wuvYhjs8Ko5QWYCsibz.jpg" alt="共鸣抽卡界面" width="90%" />
  <br/>
  <sub>共鸣抽卡 · 服装阁 · 图鉴 · 运势</sub>
  <br/><br/>
  <img src="https://pic1.imgdb.cn/i/034wuvYhLSN9FphI90HuRZ.png" alt="心忆奇想工坊" width="90%" />
  <br/>
  <sub>心忆奇想工坊 · 更新自助程序</sub>
</div>

## ⬇️ 下载与安装

免安装：解压即玩。

### 下载索引

- 方式一：[Releases](https://github.com/Cormuslum/MCU-resonat/releases/latest)
- 方式二：[百度盘](https://pan.baidu.com/s/1ucVsxfQ4dOaO40V9_VdWqQ?pwd=1206)
- 方式三：[夸克盘](https://pan.quark.cn/s/149de62b27da)
- 方式四：[123盘](https://1831221460.share.123pan.cn/123pan/TMDqjv-61xFA?pwd=1206#)

| 文件 | 体积 | 说明 |
|---|---|---|
| `心忆共鸣-vX.Y.ZZ.zip` | 约 520 MB | **必需**：抽卡模拟器本体 |
| `心忆奇想工坊-vX.Y.ZZ.zip` | 约 250 MB | **非必需**：素材工坊（自己加阁、加套装用） |
| `心忆共鸣-vX.Y.ZZ-动态背景包.zip` | 约 900 MB | 可选：服装阁动态背景 |
| `心忆共鸣-vX.Y.ZZ-主页轮播包.zip` | 约 490 MB | 可选：主页轮播的多余背景 |

两个视频包（动态背景、主页轮播）只影响背景是否有动态效果，不影响正常游玩。

### 安装步骤

1. 将所需包解压到**同一个目录**（**别放 `C:\Program Files`**，写存档可能被 UAC 拦住），得到 `心忆共鸣\`、`心忆奇想工坊\`、`动态背景视频包\`、`主页轮播背景视频包\` 这样的平级文件夹；
2. **文件夹必须保持同级**——工坊按相对位置找模拟器的数据；
3. 进入 `心忆共鸣\` 双击 `启动游戏.bat`（或 `无限暖暖模拟器.exe`）；工坊同理，双击 `启动工坊.bat`。

游戏窗口在 16:9 显示器上会自动全屏，按 `F11` 可切回窗口模式。

### 可选视频安装步骤

1. 把视频包解压到与 `心忆共鸣\` **同一层**（和 `心忆奇想工坊\` 并列）；
2. 双击视频包里的 `双击自动安装.bat`，它会自动合并进 `心忆共鸣\public\`；
3. 重新打开模拟器即可。

也可以手动把视频包里的 `public` 拖进 `心忆共鸣` 文件夹，Windows 问「是否合并」时选「是」。

### 存档位置

`心忆共鸣\userdata\`。整包拷走时存档跟着走；升级新版时把旧的 `userdata` 覆盖回新目录即可继续。

### 常见问题速览

- **首次运行弹「Windows 已保护你的电脑」**：exe 未签名，点「更多信息」→「仍要运行」。
- **杀软报毒**：免安装 Electron 程序的常见误报，加白名单即可。
- **解压后文件名乱码**：用 7-Zip 或 Bandizip 重新解压（Windows 自带解压对中文名支持不稳）。
- **双击后白屏**：多半是解压层级错了，确认 `无限暖暖模拟器.exe` 与 `dist\`、`public\` 在同一个文件夹里。
- **视频包提示找不到心忆共鸣文件夹**：视频包要和 `心忆共鸣\` 放在同一层，别放进去或放到上一层。

## 🚀 开发者须知

### 💻 本地运行

需要 Node.js 20+。仓库用 npm workspaces，依赖装在根目录。

```bash
# 安装依赖
npm install

# 同时起模拟器（5178）与更新工坊（5199）
npm run up
```

只起其中一个、或做检查：

```bash
npm run dev          # 只起模拟器（vite dev server，5178）
npm run build        # 构建前端到 心忆共鸣/dist
npm run typecheck    # vue-tsc 类型检查
```

工坊服务零依赖，不装任何 npm 包也能单独跑：

```bash
node 心忆奇想工坊/工具/updater/server.mjs
```

### 📦 打包

```bash
npm run build            # 前端 → 心忆共鸣/dist
npm run pack:sim         # 模拟器 → release/_build/simulator
npm run pack:updater     # 工坊   → release/_build/updater
node 心忆奇想工坊/工具/tools/pack-release.mjs   # 组装成 release/无限暖暖发行版
python 心忆奇想工坊/工具/tools/pack-zip.py vX.Y.ZZ --split          # 只打两个主包 → release/_dist
python 心忆奇想工坊/工具/tools/pack-zip.py vX.Y.ZZ --only clothes   # 视频包按需（clothes / home）
```

`--split` 打出的两个包顶层直接是 `心忆共鸣/` 与 `心忆奇想工坊/`，并自动带上 `启动游戏.bat` / `启动工坊.bat`
与工坊的 `教学文件`；不加 `--split` 会把全套都打出来（两个主包 + `心忆共鸣-{ver}-win64` 合包 + 两个视频包）。

> **别重跑 `pack-release.mjs`**：它会先清空 `release/无限暖暖发行版/`，连 `心忆共鸣/userdata/` 里的存档一起删。只改前端/素材时按 md5 逐文件同步，或直接用 `pack-zip.py` 重打包。

产物自带 Python 与 ffmpeg 运行时，双击 `心忆奇想工坊.exe` 即可打开工坊；
模拟器是纯静态目录，用浏览器或它的 Electron 外壳打开都行。

## 🛠️ 技术栈

Vue 3 · TypeScript · Vite · Pinia · Vue Router · Electron · Python（Pillow / ffmpeg）

模拟器是纯前端（没有后端、没有数据库，存档走 localStorage）；工坊是零依赖 Node 服务，
跑素材管线时才调用随包携带的 Python。

## 🙏 致谢

界面美术、素材与文案均来自《无限暖暖》游戏本体（[叠纸官方](https://infinitynikki.nuanpaper.com)）；抽卡概率来自官方公示与[暖暖共鸣录](https://gongeo.us/zh)的整理。

## 📄 开源协议

本项目采用 [GPL-3.0](LICENSE) 开源。代码可自由使用与再分发；游戏素材（图片、音频、字体等）
版权归叠纸游戏所有，本项目不主动分发。
