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
 * 关掉浏览器原生 tooltip：弹出前把 `title` 摘掉、内容挪进 `data-title`；
 * mouseover 用捕获阶段，`focusin` 同理，Vue 的 `:title` 每次移入都要重摘。
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
 * 调试钩子：把 store 挂到 `window.__store`，验收脚本（`tools/verify-*.mjs`）读运行时状态用。
 */
if (import.meta.env.DEV) {
  ;(window as unknown as { __store?: unknown }).__store = useGameStore()
}
