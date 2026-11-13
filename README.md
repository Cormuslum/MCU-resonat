<div align="center">
  <h1>
    <img src="https://pic1.imgdb.cn/i/034wuvZrI1jKApocsc9KEi.png" width="200" alt="心忆共鸣 Logo">
    <br/>
    ✨ 心忆共鸣
    <br/><br/>
    <sup>《无限暖暖》共鸣抽卡模拟器 · 心忆奇想素材工坊</sup>
    <br/>

  </h1>

  <p>
    <img alt="Platform" src="https://img.shields.io/badge/platform-Web%20%2F%20Electron-blue?style=flat-square" />
    <img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-orange?style=flat-square" />
  </p>

  <p>
    <b>
      <a href="#-快速开始">🚀 快速开始</a> •
      <a href="心忆奇想工坊/工具/updater/README.md">🛠️ 工坊说明</a>
    </b>
  </p>
</div>

## 🎯 项目简介

心忆共鸣（Xinyi Resonance）

▸ 复刻共鸣抽卡：单抽 / 十连、概率与保底、星芒兑换、深海回响里程碑

▸ 服装阁、版本页、套装图鉴、故事图鉴、阅读物图鉴全量浏览

▸ 玄学运势、邮件、彩蛋这些整活小玩意一并还原

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

## 🚀 快速开始

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

### 📦 打包发行版

```bash
npm run pack:sim       # 模拟器 → release/_build/simulator
npm run pack:updater   # 工坊   → release/_build/updater
node 心忆奇想工坊/工具/tools/pack-release.mjs   # 组装成 release/无限暖暖发行版
```

发行版自带 Python 与 ffmpeg 运行时，双击 `心忆奇想工坊.exe` 即可打开工坊；
模拟器是纯静态目录，用浏览器或它的 Electron 外壳打开都行。

## 🛠️ 技术栈

Vue 3 · TypeScript · Vite · Pinia · Vue Router · Electron · Python（Pillow / ffmpeg）

模拟器是纯前端（没有后端、没有数据库，存档走 localStorage）；工坊是零依赖 Node 服务，
跑素材管线时才调用随包携带的 Python。

## 🗂️ 仓库结构

```
心忆共鸣/                模拟器：src 源码、public 成品素材、Electron 主进程、构建配置
心忆奇想工坊/            工坊：工具（更新服务 + Python 管线）、Electron 主进程、构建配置
素材/                    素材源库（服装阁 / 界面 / 信息表 / 故事 / 阅读物），管线输入，不入库
.github/workflows/       CI：类型检查 + 前端构建
```

## 📦 数据与素材说明

| 位置 | 是什么 | 进仓库吗 |
|---|---|---|
| `素材/` | 素材源库（约 56GB） | 否 |
| `心忆共鸣/public/assets/` | 管线产物（约 341MB） | 只进 4 个运行时 JSON |
| `心忆奇想工坊/工具/data/` | 发行版的可编辑数据 | 是 |

素材体积远超 GitHub 单文件限制，所以源库与产物都只留本地；仓库只保留运行必需的
`manifest.json` / `stories.json` / `readings.json` / `mail-changelog.json`，
克隆后直接能跑起来。

扩展包（DLC）的 zip 不放在主分支，统一提交到仓库的 `dlc` 分支，工坊里默认已配好地址。

## 📚 文档

- [`心忆奇想工坊/工具/updater/README.md`](心忆奇想工坊/工具/updater/README.md) —— 工坊怎么用、素材放哪、怎么回滚

界面规格笔记、实机反推的布局坐标表、逐版本改动记录属于开发期文档，只保留在本地，不随仓库分发。

## 🙏 致谢

界面与文案参考《无限暖暖》游戏本体；抽卡概率、服装阁结构等信息来自官方公示与玩家整理。

## 📄 开源协议

本项目采用 [GPL-3.0](LICENSE) 开源。代码可自由使用与再分发；游戏素材（图片、音频、字体等）
版权归叠纸游戏所有，不随本仓库分发。
