<script lang="ts">
/** 搜索结果条目（跨子界面通用：title 已含「｜」页面后缀） */
export interface SearchItem {
  id: string
  title: string
  star?: number
  icon?: string
}
</script>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useGameStore } from '@/stores/game'

const props = defineProps<{
  open: boolean
  query: string
  results: SearchItem[]
  placeholder?: string
}>()
const emit = defineEmits<{
  'update:query': [string]
  select: [SearchItem]
  close: []
}>()

const store = useGameStore()
const mui = computed(() => store.manifest?.ui?.museum)
function asset(p: string | null | undefined) {
  return store.asset(p)
}

const inputEl = ref<HTMLInputElement | null>(null)
const selId = ref('')

watch(
  () => props.open,
  (v) => {
    if (v) {
      selId.value = ''
      nextTick(() => inputEl.value?.focus())
    }
  },
)

function onInput(e: Event) {
  emit('update:query', (e.target as HTMLInputElement).value)
}
function pick(r: SearchItem) {
  selId.value = r.id
  emit('select', r)
}
function close() {
  emit('close')
}
</script>

<template>
  <div v-if="open && mui" class="sp-mask" @click.self="close">
    <img class="sp-sbg" :src="asset(mui.searchBg)" alt="" draggable="false" />
    <div class="sp-sbar">
      <img class="sp-sbarimg" :src="asset(mui.searchBar)" alt="" draggable="false" />
      <img class="sp-sicon" :src="asset(mui.searchIcon)" alt="" draggable="false" />
      <input
        ref="inputEl"
        :value="query"
        @input="onInput"
        class="sp-sinput"
        type="text"
        :placeholder="placeholder || '输入名称…'"
        @keydown.esc.stop="close"
      />
    </div>
    <ul class="sp-sres">
      <li
        v-for="r in results"
        :key="r.id"
        class="sp-sitem"
        :class="{ on: selId === r.id }"
        @click="pick(r)"
      >
        <img v-if="r.icon" class="sp-sico" :src="asset(r.icon)" alt="" draggable="false" />
        <span class="sp-sname">{{ r.title }}</span>
        <span v-if="r.star" class="sp-sstar">{{ r.star }}★</span>
        <button class="sp-snext" :class="{ on: selId === r.id }" type="button" @click.stop="pick(r)">
          <img :src="asset(mui.nextBtn)" alt="跳转" draggable="false" />
        </button>
      </li>
      <li v-if="query.trim() && !results.length" class="sp-sempty">没有匹配的结果</li>
      <li v-if="!query.trim()" class="sp-sempty">搜索范围：已获得的内容</li>
    </ul>
    <button class="sp-sclose" @click="close">
      <img :src="asset(mui.btnCloseN)" alt="关闭" draggable="false" />
    </button>
  </div>
</template>

<style scoped>
.sp-mask {
  position: absolute;
  inset: 0;
  z-index: 50;
  background: rgba(16, 10, 6, 0.5);
}
.sp-sbg {
  position: absolute;
  left: 192px;
  top: 100px;
  width: 1536px;
  height: 880px;
  object-fit: fill;
  max-width: none;
  pointer-events: none;
}
.sp-sbar {
  position: absolute;
  left: 474px;
  /* 容器内边缘在实机 y=156（search-bg 素材 alpha 满宽起点 y=56 + 弹窗 y=100）→ 再留 20px */
  top: 176px;
  width: 972px;
  height: 156px;
  display: flex;
  align-items: center;
}
.sp-sbarimg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  max-width: none;
  pointer-events: none;
}
.sp-sicon {
  position: absolute;
  /* 中心对齐搜索框左侧黄色区域中心（bar 内 115.5,78），素材 60 → 放大到 100 */
  left: 65.5px;
  top: 28px;
  width: 100px;
  height: 100px;
  object-fit: contain;
  max-width: none;
  opacity: 0.9;
  pointer-events: none;
}
.sp-sinput {
  position: relative;
  width: 100%;
  /* 光标起点右移：黄色区域右缘 209 + 11 */
  margin: 0 30px 0 220px;
  padding: 0;
  border: 0;
  background: transparent;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 30px;
  color: #4a3618;
  outline: none;
  pointer-events: auto;
}
.sp-sinput::placeholder {
  color: rgba(74, 54, 24, 0.45);
}
.sp-sres {
  position: absolute;
  left: 474px;
  top: 356px;
  width: 972px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sp-sitem {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 74px;
  border-bottom: 1px solid rgba(120, 90, 50, 0.22);
  cursor: var(--nk-cursor, auto), pointer;
  pointer-events: auto;
}
.sp-sico {
  width: 56px;
  height: 56px;
  object-fit: contain;
  max-width: none;
}
.sp-sname {
  flex: 1;
  font-family: 'NikkiYaHei', 'NikkiBody', sans-serif;
  font-size: 26px;
  color: #4a3618;
}
.sp-sstar {
  font-size: 22px;
  color: #a8762c;
  margin-left: 10px;
}
.sp-sempty {
  height: 74px;
  line-height: 74px;
  font-size: 24px;
  color: rgba(74, 54, 24, 0.55);
}
.sp-sclose {
  position: absolute;
  left: 1728px;
  top: 52px;
  width: 95px;
  height: 96px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  pointer-events: auto;
}
.sp-sclose img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-width: none;
}
/* 跳转按钮：复用套装栏蓝呼吸框（选中/悬停） */
.sp-snext {
  position: relative;
  width: 56px;
  height: 56px;
  margin-left: 18px;
  padding: 0;
  border: 0;
  background: none;
  cursor: var(--nk-cursor, auto), pointer;
  pointer-events: auto;
}
.sp-snext img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  max-width: none;
}
.sp-snext::after {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: 50%;
  pointer-events: none;
  opacity: 0;
}
.sp-snext.on::after {
  opacity: 0.9;
  box-shadow: inset 0 0 0 3px rgba(178, 222, 255, 1), inset 0 0 12px rgba(178, 222, 255, 0.7);
}
.sp-snext:hover::after {
  animation: spBlueBreath 0.4s ease-in-out infinite;
}
@keyframes spBlueBreath {
  0%,
  100% {
    opacity: 0.55;
    box-shadow: inset 0 0 0 2px rgba(150, 205, 255, 0.9), inset 0 0 8px rgba(150, 205, 255, 0.5);
  }
  50% {
    opacity: 0.95;
    box-shadow: inset 0 0 0 4px rgba(178, 222, 255, 1), inset 0 0 15px rgba(178, 222, 255, 0.75);
  }
}
</style>
