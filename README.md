# 心忆共鸣 · 《无限暖暖》共鸣抽卡模拟器

个人学习用的《无限暖暖》抽卡模拟器，外加一套自用的素材工坊。
**非商业用途**，素材版权归网易 / 《无限暖暖》官方所有。

![License](https://img.shields.io/badge/license-GPL--3.0-blue.svg)

## 它是什么

- **心忆共鸣** —— Vue 3 + TypeScript + Vite 写的抽卡页面，还原共鸣、服装阁、图鉴、玄学运势等界面。
- **心忆奇想工坊** —— 零依赖的 Node 服务（+ Electron 外壳），用来改版本表 / 服装阁 / 套装 / 故事 / 阅读物，并把素材转码进模拟器。

两者共用同一份素材管线：工坊写数据 → Python 脚本转码 → 模拟器读 `public/assets` 里的产物。

## 目录

```
心忆共鸣/                模拟器本体：src 源码、public 成品素材、Electron 主进程、构建配置
心忆奇想工坊/            工坊本体：工具（工坊服务 + Python 管线）、Electron 主进程、构建配置
素材/                    素材源库（视频 / 界面 / 服装阁 / 信息表），管线输入，不入库
.github/workflows/       CI：类型检查 + 前端构建
```

## 开发

```bash
npm install          # 装依赖（根目录，npm workspaces）
npm run up           # 同时起模拟器(5178) 与工坊(5199)
```

单独起某一个：

```bash
npm run dev              # 只起模拟器
npm run build            # 构建前端到 心忆共鸣/dist
npm run typecheck        # vue-tsc 类型检查
```

工坊服务是零依赖的，不装任何 npm 包也能跑：

```bash
node 心忆奇想工坊/工具/updater/server.mjs
```

## 打包

```bash
npm run pack:sim       # 模拟器 → release/_build/simulator
npm run pack:updater   # 工坊   → release/_build/updater
```

发行版目录 `release/无限暖暖发行版/` 由组装脚本摆好（自带 Python 运行时与编辑数据）。

## 数据从哪来

| 位置 | 是什么 | 进仓库吗 |
|---|---|---|
| `素材/` | 素材源库（约 56GB） | 否 |
| `心忆共鸣/public/assets/` | 管线产物（约 341MB） | 只进 4 个运行时 JSON |
| `心忆奇想工坊/工具/data/` | 发行版的可编辑数据 | 是 |

素材体积远超 GitHub 单文件限制，所以源库与产物都只留本地；仓库只保留运行时必需的
`manifest.json` / `stories.json` / `readings.json` / `mail-changelog.json`，
克隆后模拟器就能直接跑起来。

## 文档

- [`心忆奇想工坊/工具/updater/README.md`](心忆奇想工坊/工具/updater/README.md) —— 工坊怎么用

界面规格笔记、实机反推的布局坐标表、逐版本改动记录等开发期文档只保留在本地，
不随仓库分发。

## 许可

[GPL-3.0](LICENSE)。代码可自由使用与再分发；游戏素材不随本仓库分发。
