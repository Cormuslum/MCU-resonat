/**
 * 图鉴内容注册表（兼容层）：新代码不要再 import 这里 —— 它会把两包正文同时拉进来。
 * 故事用 `museum-stories`，阅读物用 `museum-readings`，搜索用 `museum-names`。
 */
export { stories, addStories, type StoryEntry } from './museum-stories'
export { readings, addReadings, type ReadingEntry } from './museum-readings'
