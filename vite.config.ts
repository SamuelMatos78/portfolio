import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(() => {
  // npm run dev passes the actual free port selected for its arena backend.
  const target = `http://127.0.0.1:${process.env.ARENA_PORT ?? 4173}`
  // Preserve the browser Host so the backend can verify same-origin POSTs.
  const proxy = Object.fromEntries(
    ['/arena', '/api/game', '/api/event'].map(path => [path, { target, changeOrigin: false }]),
  )
  return {
    plugins: [react()],
    server: { proxy },
    preview: { proxy },
  }
})
