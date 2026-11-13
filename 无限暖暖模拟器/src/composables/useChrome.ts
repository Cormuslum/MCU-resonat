import { ref } from 'vue'

/**
 * 全局「暂时别露侧边栏」开关（v2.4.01）。
 *
 * 侧边栏常态隐藏、指针进左缘 100px 才滑出，但有些页面此刻正有东西压在左边 ——
 * 典型是玄学运势：点开卷轴后卷轴没展开时，两根轴杆就立在屏幕左侧，
 * 侧栏一滑出来正好盖住它（用户截图里那根被挡掉一半的金杆）。
 *
 * 所以给页面一个反向开关：自己处在「不该弹侧栏」的状态时把它置 true，
 * App.vue 的 `railVisible` 会立刻变 false（`v-if` 直接卸载，连带收起展开态）。
 */
const suppressed = ref(false)

export function setRailSuppressed(on: boolean) {
  suppressed.value = on
}

export function useRailSuppressed() {
  return suppressed
}
