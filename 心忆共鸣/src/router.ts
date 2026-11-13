import { createRouter, createWebHashHistory } from 'vue-router'
import { useGameStore } from '@/stores/game'

/** 页面层级：一级 `/` 主页；二级 `/banner` `/versions` `/codex` `/settings` `/almanac`； 演出 `/gacha`（由共鸣页跳入，不属于侧边导航） */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'home', component: () => import('@/views/HomeView.vue') },
    { path: '/versions', name: 'versions', component: () => import('@/views/VersionView.vue') },
    { path: '/banner', name: 'banner', component: () => import('@/views/BannerView.vue') },
    { path: '/gacha', name: 'gacha', component: () => import('@/views/GachaView.vue') },
    { path: '/codex', name: 'codex', component: () => import('@/views/MuseumView.vue') },
    { path: '/codex/clothes', name: 'codex-clothes', component: () => import('@/views/MuseumClothes.vue') },
    { path: '/codex/readings', name: 'codex-readings', component: () => import('@/views/MuseumReadings.vue') },
    { path: '/codex/stories', name: 'codex-stories', component: () => import('@/views/MuseumStories.vue') },
    { path: '/settings', name: 'settings', component: () => import('@/views/SettingsView.vue') },
    { path: '/almanac', name: 'almanac', component: () => import('@/views/AlmanacView.vue') },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

/** 共鸣 / 抽卡演出必须先选过版本（守卫写在 router 上，首屏直链才拦得到） */
const NEEDS_VERSION = new Set(['banner', 'gacha'])

router.beforeEach((to) => {
  if (!NEEDS_VERSION.has(String(to.name ?? ''))) return true
  return useGameStore().selectedVersion ? true : { path: '/versions', replace: true }
})

/** 页面层级与父级：二级 `/versions` `/banner` `/codex` `/almanac` `/settings`， 三级 `/codex/clothes` `/codex/readings` `/codex/stories` `/gacha`；「退出/返回」一律走 `parentOf()` */
export const PARENT: Record<string, string> = {
  '/versions': '/',
  '/banner': '/',
  '/codex': '/',
  '/almanac': '/',
  '/settings': '/',
  '/codex/clothes': '/codex',
  '/codex/readings': '/codex',
  '/codex/stories': '/codex',
  '/gacha': '/banner',
}

export function parentOf(path: string): string {
  return PARENT[path] ?? '/'
}

export default router
