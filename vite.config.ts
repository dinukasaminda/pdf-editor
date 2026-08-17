import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return

          if (id.includes('pdfjs-dist')) return 'pdfjs'
          if (id.includes('pdf-lib')) return 'pdf-lib'
          if (id.includes('firebase')) return 'firebase'
          if (
            id.includes('react-rnd') ||
            id.includes('re-resizable') ||
            id.includes('react-draggable')
          ) {
            return 'dnd'
          }
          if (id.includes('react-dom') || id.includes('/react/')) return 'react'
        },
      },
    },
  },
})
