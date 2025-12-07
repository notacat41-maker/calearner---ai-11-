import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

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
    resolve: {
      alias: {
        // Force resolution of these folders to the project root
        '@': path.resolve(__dirname, './'),
        'components': path.resolve(__dirname, './components'),
        'services': path.resolve(__dirname, './services')
      }
    },
    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_API_KEY || env.API_KEY)
    }
  };
});
