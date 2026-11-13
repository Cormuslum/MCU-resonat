import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // 文案的唯一真源在工坊侧（心忆奇想工坊/工具/文案.json），跨目录引用避免两份副本
      '@copy': fileURLToPath(new URL('../心忆奇想工坊/工具/文案.json', import.meta.url)),
    },
  },
  server: {
    port: 5178,
    open: false,
    // 素材在 public/assets，体积较大，放宽 watch 忽略
    watch: { ignored: ['**/public/assets/**', '**/素材/**', '**/node_modules/**'] },
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
})
