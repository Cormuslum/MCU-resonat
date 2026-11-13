/**
 * 图鉴内容注册表（**兼容层**）。
 *
 * v1.6.07 起故事与阅读物拆成两个模块：
 *   `./museum-stories`  731KB 正文
 *   `./museum-readings` 933KB 正文
 * 原来绑在一个文件里，只开故事页也要把阅读物全文一起下载。
 *
 * ⚠ **新代码别再 import 这里** —— 它会把两包正文同时拉进来。
 *   故事用 `museum-stories`，阅读物用 `museum-readings`，
 *   搜索用 `museum-names`（只有标题，约 25KB）。
 */
export { stories, addStories, type StoryEntry } from './museum-stories'
export { readings, addReadings, type ReadingEntry } from './museum-readings'
