import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Declare process to avoid TS2580 error in this config file
declare const process: any;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'robots.txt'],
        manifest: {
          name: 'CaLearner: Daily AI Lessons',
          short_name: 'CaLearner',
          description: 'A daily learning application that delivers AI-generated bite-sized lessons.',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          orientation: 'portrait',
          icons: [
            {
              src: 'icon.svg',
              sizes: 'any',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    build: {
      rollupOptions: {
        // Externalize dependencies that are provided by the environment importmap
        // to prevent "Duplicate React" errors and reduce bundle size.
        external: ['react', 'react-dom', '@google/genai', 'lucide-react', 'recharts']
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY)
    }
  };
});
