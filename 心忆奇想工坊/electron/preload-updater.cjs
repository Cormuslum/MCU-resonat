/**
 * 心忆奇想工坊 · 窗口 preload：把拖入文件在磁盘上的真实路径交给页面。
 * 只暴露 `getPathForFile` 一个同步方法，不开 node、不开 ipc。
 */
const { contextBridge, webUtils } = require('electron')

contextBridge.exposeInMainWorld('nikki', {
  /**
   * @param {File} file 来自 drop / input[type=file] 的 File 对象
   * @returns {string} 绝对路径；拿不到（合成 File、跨进程对象）返回空串
   */
  getPathForFile(file) {
    try {
      return webUtils.getPathForFile(file) || ''
    } catch {
      return ''
    }
  },
})
