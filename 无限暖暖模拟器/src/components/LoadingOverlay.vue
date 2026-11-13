<script setup lang="ts">
/**
 * 黑屏加载过渡（v1.3.00）
 *
 * 触发场景（App.vue 统一判定）：
 *   主页 → 二级 / 二级 → 主页 / 二级 → 另一个二级
 *
 * 版式（全部 1920×1080 设计像素，禁用百分比布局）：
 *   · 底：`T_UI_loading_bg.png`（1920×1080 淡青白花枝宣纸，v2.4.01 取代纯黑）
 *     + 底缘一道暗色渐变做「取景框」，否则纯白进度条压在浅底上会看不见
 *   · 中心：该界面专属的指向性装饰 `photo-<key>.webp`（1220×632 → 960×497）
 *     四周叠 3 团缓慢漂移的雾 → 「云雾潋散」
 *   · 底部：进度条 `slider-off` 常驻 + `slider-on` 按进度横向 clip
 *     素材 1920×28，距屏幕下边缘 100px（top = 952）
 *   · 右下角：奔跑暖暖动图 + 精灵群，底边距进度条 20px（bottom = 148）
 *
 * 进度只用于「遮挡页面切换的空档」，与真实加载进度无关，
 * 因此用固定节拍（900ms 走满 → 停 120ms → 360ms 淡出）。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import type { LoadPhotoKey } from '@/types'

const props = defineProps<{ photo: LoadPhotoKey }>()
const emit = defineEmits<{ done: [] }>()

const store = useGameStore()
const L = computed(() => store.manifest?.ui?.loading)

function src(p: string | null | undefined, fallback: string) {
  return store.asset(p || fallback)
}

const bgSrc = computed(() => src(L.value?.bg, 'ui/loading/bg.webp'))
const photoSrc = computed(() => src(L.value?.photo?.[props.photo], `ui/loading/photo-${props.photo}.webp`))
const sliderOff = computed(() => src(L.value?.sliderOff, 'ui/loading/slider-off.webp'))
const sliderOn = computed(() => src(L.value?.sliderOn, 'ui/loading/slider-on.webp'))
const spirits = computed(() => src(L.value?.spirits, 'ui/loading/spirits.webp'))
const runner = computed(() => src(L.value?.runner, 'ui/loading/nikki-run.webp'))

/**
 * 右下角装饰动画用 `奔跑暖暖_动态.gif`（已抠白转成动图 webp）。
 *
 * 另一个素材 `T_UI_loading_special_spirits.png` 是同一段奔跑动画的 4×4 序列帧
 * （1920×1080 切成 16 格，每格 480×270），内容和这张动图完全重复，所以不重复播；
 * 它在 manifest 里保留为 `ui.loading.spirits`，将来要做帧动画时可直接用。
 */

/** 0 → 100，由 CSS transition 补间（clip-path 裁切，不压缩素材） */
const progress = ref(0)
const leaving = ref(false)

let t1 = 0
let t2 = 0

onMounted(() => {
  // 两帧后再推 100：首帧就带上目标值浏览器不会补间
  requestAnimationFrame(() => requestAnimationFrame(() => (progress.value = 100)))
  t1 = window.setTimeout(() => (leaving.value = true), 1020)
  t2 = window.setTimeout(() => emit('done'), 1400)
})

onBeforeUnmount(() => {
  window.clearTimeout(t1)
  window.clearTimeout(t2)
})
</script>

<template>
  <div class="ld" :class="{ out: leaving }" aria-hidden="true">
    <!-- 整屏底图（浅色宣纸）+ 底缘暗化 -->
    <img class="ld-bg" :src="bgSrc" alt="" draggable="false" />
    <i class="ld-foot"></i>

    <!-- 中心指向性装饰 + 边缘云雾 -->
    <div class="ld-scene">
      <img class="ld-photo-glow" :src="photoSrc" alt="" draggable="false" />
      <img class="ld-photo" :src="photoSrc" alt="" draggable="false" />
      <i class="ld-mist mist-a"></i>
      <i class="ld-mist mist-b"></i>
      <i class="ld-mist mist-c"></i>
      <i class="ld-mist mist-d"></i>
    </div>

    <!-- 右下角装饰动画：奔跑的暖暖（底边在进度条上方 20px） -->
    <div class="ld-deco">
      <i class="ld-deco-glow"></i>
      <img class="ld-runner" :src="runner" alt="" draggable="false" />
    </div>

    <!-- 进度条：距屏幕下边缘 100px -->
    <div class="ld-bar">
      <img class="lb-off" :src="sliderOff" alt="" draggable="false" />
      <img
        class="lb-on"
        :src="sliderOn"
        alt=""
        draggable="false"
        :style="{ clipPath: `inset(0 ${100 - progress}% 0 0)` }"
      />
    </div>
  </div>
</template>

<style scoped>
.ld {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 1080px;
  z-index: 120;
  overflow: hidden;
  /* 底图未到位时的兜底色：取底图的主色，避免闪一下白/黑 */
  background: #dfe2dc;
  opacity: 1;
  transition: opacity 0.36s ease;
}
.ld.out {
  opacity: 0;
  pointer-events: none;
}

/* ============ 整屏底图 ============ */
.ld-bg {
  position: absolute;
  left: 0;
  top: 0;
  width: 1920px;
  height: 1080px;
  max-width: none;
  object-fit: cover;
  pointer-events: none;
}
/*
 * 底缘暗化：底图是 223,226,220 的浅色宣纸，而进度条「已加载」是纯白（255,255,255），
 * 直接压上去等于隐形；off 态那条 125,151,136 的灰绿也只有 98 的对比。
 * 所以从底边往上铺一层暗色渐变当「取景框」，白线才立得住，
 * 同时把右下角奔跑装饰也托起来 —— 视觉上像画框，不算破坏原图。
 */
.ld-foot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 300px;
  pointer-events: none;
  background: linear-gradient(
    to top,
    rgba(24, 34, 30, 0.55) 0%,
    rgba(24, 34, 30, 0.34) 42%,
    rgba(24, 34, 30, 0) 100%
  );
}

/* ============ 中心指向性装饰 ============ */
/*
 * 素材 1220×632（水彩羽化边），显示 960×497：占屏约一半，
 * 既不压住底部进度条，也给四周留出雾的扩散空间。
 */
.ld-scene {
  --ld-photo-mask: radial-gradient(
    ellipse 78% 82% at 50% 50%,
    #000 56%,
    rgba(0, 0, 0, 0.72) 78%,
    rgba(0, 0, 0, 0) 100%
  );
  position: absolute;
  left: 420px;
  top: 258px;
  width: 1080px;
  height: 559px;
}
.ld-photo {
  position: absolute;
  inset: 0;
  width: 1080px;
  height: 559px;
  max-width: none;
  object-fit: contain;
  opacity: 0;
  transform: scale(1.05);
  /*
   * v2.4.01：底图换成浅色宣纸后，插画自带的白色羽化边会和纸面糊成一片、
   * 只看得见一个方框。`multiply` 让「白」等于「不画」，纸面纹理直接透过来，
   * 方形硬边自然消失 —— 这是水彩压在纸上最省事也最像的做法。
   */
  mix-blend-mode: multiply;
  filter: saturate(1.06) contrast(1.04);
  /* 各张插画的羽化边不一致（废墟那张带方形硬边），统一再柔一次 */
  mask-image: var(--ld-photo-mask);
  -webkit-mask-image: var(--ld-photo-mask);
  animation: ldPhotoIn 1s cubic-bezier(0.22, 1, 0.36, 1) 0.04s forwards,
    ldPhotoBreath 6.4s 1.1s ease-in-out infinite;
}
/* 「云雾潋散」的底子：同一张装饰糊一层厚雾，撑出插画外沿那圈柔光 */
.ld-photo-glow {
  position: absolute;
  inset: 0;
  width: 1080px;
  height: 559px;
  max-width: none;
  object-fit: contain;
  opacity: 0;
  /* 这层是「晕开的水彩」：同样走 multiply，在纸面上是一圈淡淡的洇色而不是白雾 */
  mix-blend-mode: multiply;
  filter: blur(42px) saturate(1.1);
  transform: scale(1.06);
  mask-image: var(--ld-photo-mask);
  -webkit-mask-image: var(--ld-photo-mask);
  animation: ldGlowIn 1.4s ease 0.1s forwards, ldGlowBreath 8s 1.5s ease-in-out infinite;
}
@keyframes ldGlowIn {
  to {
    opacity: 0.28;
  }
}
@keyframes ldGlowBreath {
  0%,
  100% {
    opacity: 0.42;
    transform: scale(1.05);
  }
  50% {
    opacity: 0.62;
    transform: scale(1.11);
  }
}
@keyframes ldPhotoIn {
  to {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes ldPhotoBreath {
  0%,
  100% {
    transform: scale(1);
    filter: brightness(1.06) saturate(1.04);
  }
  50% {
    transform: scale(1.018);
    filter: brightness(1.12) saturate(1.06);
  }
}

/* 云雾潋散：四团白雾贴着装饰四边缓慢漂移、呼吸，边缘自然化开 */
.ld-mist {
  position: absolute;
  border-radius: 50%;
  /*
   * 黑底时代这层是 `screen` 的白雾；换成浅色宣纸后 screen 等于没画（白压白）。
   * 现在改成 `multiply` 的淡灰蓝 —— 在纸面上就是洇开的烟青色水痕，
   * 「云雾潋散」这个感觉还在，只是从「发光」换成了「洇色」。
   */
  mix-blend-mode: multiply;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(
    closest-side ellipse,
    rgba(146, 168, 186, 0.3) 0%,
    rgba(158, 180, 198, 0.16) 44%,
    rgba(170, 190, 205, 0) 100%
  );
  animation: ldMist 9s ease-in-out infinite;
}
.mist-a {
  left: -140px;
  top: -90px;
  width: 760px;
  height: 380px;
  animation-delay: 0.1s;
}
.mist-b {
  right: -150px;
  bottom: -80px;
  width: 820px;
  height: 400px;
  animation-delay: 1.6s;
  background: radial-gradient(
    closest-side ellipse,
    rgba(240, 228, 255, 0.58) 0%,
    rgba(214, 214, 250, 0.3) 46%,
    rgba(200, 200, 245, 0) 100%
  );
}
.mist-c {
  left: 34%;
  bottom: -120px;
  width: 700px;
  height: 330px;
  animation-delay: 3.1s;
}
.mist-d {
  right: 4%;
  top: -120px;
  width: 620px;
  height: 300px;
  animation-delay: 4.4s;
}
@keyframes ldMist {
  0% {
    opacity: 0.4;
    transform: translate3d(0, 0, 0) scale(1);
  }
  35% {
    opacity: 0.85;
    transform: translate3d(26px, -14px, 0) scale(1.12);
  }
  70% {
    opacity: 0.55;
    transform: translate3d(-18px, 10px, 0) scale(1.05);
  }
  100% {
    opacity: 0.42;
    transform: translate3d(0, 0, 0) scale(1);
  }
}

/* ============ 右下角装饰动画 ============ */
/*
 * 进度条 top = 1080 − 100 − 28 = 952；容器底边 20px 上方 = 932
 * → bottom: 1080 − 932 = 148。
 */
.ld-deco {
  position: absolute;
  right: 40px;
  bottom: 148px;
  width: 420px;
  height: 236px;
  pointer-events: none;
}
/* 暖暖脚下的柔光，让动图不至于「浮」在黑底上 */
.ld-deco-glow {
  position: absolute;
  left: 52px;
  bottom: -30px;
  width: 320px;
  height: 116px;
  border-radius: 50%;
  background: radial-gradient(
    closest-side ellipse,
    rgba(255, 190, 214, 0.3) 0%,
    rgba(214, 200, 255, 0.16) 46%,
    rgba(180, 190, 255, 0) 100%
  );
  filter: blur(14px);
  opacity: 0;
  animation: ldFadeIn 1.2s ease 0.5s forwards;
}
/* 奔跑的暖暖：480×270 原图（已抠掉白底）→ 320×180，贴在右下角 */
.ld-runner {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 400px;
  height: 225px;
  max-width: none;
  object-fit: contain;
  opacity: 0;
  filter: brightness(1.12) saturate(1.08) drop-shadow(0 10px 26px rgba(0, 0, 0, 0.5));
  animation: ldFadeIn 0.9s ease 0.45s forwards, ldHop 1.05s 1.4s ease-in-out infinite;
}
@keyframes ldFadeIn {
  to {
    opacity: 1;
  }
}
@keyframes ldHop {
  0%,
  100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-5px) rotate(-0.8deg);
  }
}

/* ============ 进度条 ============ */
.ld-bar {
  position: absolute;
  left: 0;
  bottom: 100px;
  width: 1920px;
  height: 28px;
}
.lb-off,
.lb-on {
  position: absolute;
  inset: 0;
  width: 1920px;
  height: 28px;
  max-width: none;
  object-fit: fill;
}
.lb-off {
  opacity: 1;
  filter: brightness(2.1) saturate(0.55);
}
/* 已加载段：只做横向裁切，位图不被拉伸 */
.lb-on {
  filter: brightness(1.45) drop-shadow(0 0 12px rgba(220, 240, 255, 0.9));
  transition: clip-path 0.9s cubic-bezier(0.16, 0.84, 0.3, 1);
}
</style>
