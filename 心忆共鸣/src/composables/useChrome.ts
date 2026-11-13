import { ref } from 'vue'

/**
 * 全局「暂时别露侧边栏」开关：置 true 时 App.vue 的 `railVisible` 立刻变 false（`v-if` 直接卸载）。
 */
const suppressed = ref(false)

export function setRailSuppressed(on: boolean) {
  suppressed.value = on
}

export function useRailSuppressed() {
  return suppressed
}
