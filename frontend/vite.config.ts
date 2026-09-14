import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // sockjs-client (used by @stomp/stompjs's SockJS fallback) references
  // Node's `global`, which Vite doesn't polyfill in the browser by default.
  define: {
    global: 'globalThis',
  },
})
