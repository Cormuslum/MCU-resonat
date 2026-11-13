import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import './styles/global.css'
import { useGameStore } from './stores/game'

const app = createApp(App)
app.use(createPinia())
app.use(router)

/**
 * 关掉浏览器原生 tooltip（悬停一会儿弹出来的那张深灰黑框）。
 *
 * 全站 30 多处 `title="…"` 基本都是给鼠标看的说明（「故事图鉴」这种导航键、
 * 「上一页」「切换动态背景」这种小按钮）。原生 tooltip 是方角深灰黑框，
 * 跟羊皮纸 + 暖金这套美术不搭，还会盖住底下的画。
 *
 * 做法：**在它弹出来之前把 title 摘掉**，内容挪进 `data-title`
 * （将来真要做自绘提示，读 data-title 就行，信息没丢）。
 *   · mouseover 用捕获阶段 —— 元素一进鼠标就摘，浏览器来不及显示；
 *   · focusin 同理，键盘 Tab 聚焦也不会弹；
 *   · Vue 的 `:title` 在数据变化后会写回来，所以每次移入都查一遍，不做一次性清理。
 */
function muteNativeTooltips() {
  const strip = (target: EventTarget | null) => {
    const el = target instanceof Element ? target.closest('[title]') : null
    if (!el) return
    const text = el.getAttribute('title')
    if (text === null) return
    el.setAttribute('data-title', text)
    el.removeAttribute('title')
  }
  document.addEventListener('mouseover', (e) => strip(e.target), true)
  document.addEventListener('focusin', (e) => strip(e.target), true)
}

muteNativeTooltips()
app.mount('#app')

/**
 * 调试钩子：把 store 挂到 window.__store。
 *
 * 验收脚本（tools/verify-*.mjs）要读运行时状态 —— DLC 挂载后 manifest 里
 * 到底多没多东西、光靠截图看不出来，得能直接查数据。
 * 生产构建里这行留着也无害（只是个引用），但用 `import.meta.env.DEV` 收一下更干净。
 */
if (import.meta.env.DEV) {
  ;(window as unknown as { __store?: unknown }).__store = useGameStore()
}
