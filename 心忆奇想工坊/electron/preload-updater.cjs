/**
 * 心忆奇想工坊 · 窗口 preload（v2.9.39）
 *
 * 唯一目的：把「拖进来的那个文件在磁盘上的真实路径」交给页面。
 *
 * 浏览器沙箱不给 `File.path`（Electron 32 起连非标准属性也删了），但主进程侧的
 * `webUtils.getPathForFile(file)` 可以拿到 —— 文件夹也照样给。
 * 有了它，「整套导入」拖文件夹就不用再把整棵目录树复制进 `.inbox` 中转区，
 * 直接把路径填进「文件夹路径」框，走与「粘贴路径」完全同一条扫描链路。
 *
 * 只暴露这一个同步方法，不开 node、不开 ipc —— 页面拿不到任何别的能力。
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
