import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { browserArenaPlugin } from './war-integration/browser-plugin.ts'

export default defineConfig({
  plugins: [browserArenaPlugin(), react()],
  build: {
    rollupOptions: {
      input: { main: resolve('index.html'), arena: resolve('arena/index.html') },
    },
  },
})
