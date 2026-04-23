import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
    {
      // @tensorflow-models/body-segmentation has a static top-level import of
      // SelfieSegmentation from @mediapipe/selfie_segmentation even when the
      // tfjs runtime is selected. That file uses global assignment rather than
      // ESM named exports, so the browser throws a SyntaxError. This plugin
      // intercepts the import and provides a harmless stub — the tfjs runtime
      // path never actually instantiates SelfieSegmentation.
      name: 'mediapipe-stub',
      resolveId(id) {
        if (id === '@mediapipe/selfie_segmentation') return '\0mediapipe-stub'
      },
      load(id) {
        if (id === '\0mediapipe-stub') {
          return 'export const SelfieSegmentation = function() {}'
        }
      },
    },
  ],
  optimizeDeps: {
    exclude: [
      '@mediapipe/selfie_segmentation',
      '@tensorflow-models/body-segmentation',
    ],
  },
})
