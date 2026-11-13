import { createRouter, createWebHashHistory } from 'vue-router'
import { useGameStore } from '@/stores/game'

/**
 * 页面层级：
 *   一级  /            主页（启动默认）
 *   二级  /banner      共鸣页
 *         /versions    版本选择页
 *         /codex       图鉴页
 *         /settings    设置页
 *         /almanac     抽卡黄历
 *   演出  /gacha       抽卡演出（由共鸣页跳入，不属于侧边导航）
 */
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

/**
 * 共鸣 / 抽卡演出：**必须先选过版本**（v1.4.02）。
 *
 * 共鸣页只列「当前版本」的服装阁，没有当前版本就没东西可列；而且用户要求
 * 「首次进入必须在版本页选一次」——入口已经置灰，这里再拦一道防直链 / 旧书签。
 * 守卫写在 router 上（不是 App.vue 里）：首次导航发生在 `app.use(router)` 时，
 * 那时 App.vue 的 setup 还没跑，写在组件里拦不到首屏直链。
 */
const NEEDS_VERSION = new Set(['banner', 'gacha'])

router.beforeEach((to) => {
  if (!NEEDS_VERSION.has(String(to.name ?? ''))) return true
  return useGameStore().selectedVersion ? true : { path: '/versions', replace: true }
})

/**
 * 页面层级（用户 v1.2.01 定义）
 *
 *   一级：/                 主页
 *   二级：/versions /banner /codex /almanac /settings
 *   三级：/codex/clothes /codex/readings /codex/stories /gacha
 *
 * 「退出/返回」一律走 `parentOf()`：三级回它的二级，二级回主页。
 * 不再用 `history.back()` —— 从主页点星芒进来时 history 里有上一页，
 * 但从侧栏/直链进来时上一页可能是三级页，back 会跳错层。
 */
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
