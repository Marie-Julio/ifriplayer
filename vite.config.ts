import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],build: {
    lib: {
      entry: path.resolve(__dirname, 'src/components/MultiVideoPlayer/MultiVideoPlayer.tsx'),
      name: 'MultiVideoPlayer',
      fileName: (format) => `multi-video-player.${format}.js`
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
})
