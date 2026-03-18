import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env['BASE_PATH'] ?? '/appka2/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-recharts': ['recharts'],
          'vendor-zustand': ['zustand'],
          'vendor-zod': ['zod'],
        },
      },
    },
  },
})
