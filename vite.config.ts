import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Despesas de Viagem',
        short_name: 'Despesas',
        description: 'Divida despesas e acompanhe saldos em viagens.',
        display: 'standalone',
        background_color: '#0a0a0a',
        theme_color: '#155dfc',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico,png}'],
        // The Firebase SDK chunk is lazy-loaded only when cloud sync is configured;
        // skip precaching it so offline install stays lightweight without Firebase.
        globIgnores: ['**/CloudApp-*.js'],
      },
    }),
  ],
})
