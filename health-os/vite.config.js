import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': 'http://localhost:8787' } },
  build: { rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'charts', test: /recharts|d3-|victory/ }] } } } },
  test: { environment: 'node' },
})
