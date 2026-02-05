import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const supabaseUrl = env.VITE_SUPABASE_URL;

  return {
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Auto-apply updates without manual refresh
      injectRegister: false, // Disable auto-registration, we'll handle it manually
      includeAssets: ['favicon.ico', 'main.png', 'robots.txt', 'pdf.worker.min.mjs'],
      manifest: {
        name: 'Followers of 14 - Islamic Poetry & Recitation Platform',
        short_name: 'Followers of 14',
        description: 'Followers of 14 - Read Islamic poetry, Naat, Manqabat, Noha, Dua, Marsiya with complete text, audio, and video. Free access to the best Islamic spiritual content.',
        theme_color: '#1a5c4d',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/main.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/main.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['education', 'books', 'lifestyle'],
        screenshots: [],
        shortcuts: [],
        share_target: {
          action: '/',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        }
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Exclude version.json from precaching - it should always be fetched fresh
        globIgnores: ['**/version.json'],
        runtimeCaching: [
          {
            // Cache audio proxy for teleprompter - check cache first, then network
            urlPattern: /\/api\/r2-audio-proxy/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'audio-chunks-v1',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200, 206],
              },
            },
          },
          {
            // API routes must never be cached - ensures upload/stream responses are fresh
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'api-no-cache',
            }
          },
          {
            // Always fetch version.json fresh (no cache)
            urlPattern: /\/version\.json/i,
            handler: 'NetworkOnly',
            options: {
              cacheName: 'version-check',
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: false,
        type: 'module'
      }
    }),
    {
      name: 'html-env-transform',
      transformIndexHtml(html) {
        if (supabaseUrl) {
          return html.replace(
            'https://ysacmemkrnmczmtkfqad.supabase.co',
            supabaseUrl
          );
        }
        return html;
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 8000,
    host: true,
    open: true,
    cors: true,
    strictPort: false,
    fs: {
      strict: false
    },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
  },
  preview: {
    port: 4173,
    host: true,
    cors: true,
    strictPort: false
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast'
          ],
          'supabase-vendor': ['@supabase/supabase-js'],
          'utils-vendor': ['date-fns', 'zod', 'clsx', 'tailwind-merge']
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || [];
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff2?|eot|ttf|otf/i.test(ext || '')) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[ext]/[name]-[hash][extname]`;
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    target: 'esnext',
    cssCodeSplit: true,
    reportCompressedSize: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      'date-fns',
      'zod',
      'clsx',
      'tailwind-merge',
      'lucide-react'
    ],
    exclude: [],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  esbuild: {
    target: 'esnext',
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  define: {
    'process.env': {}
  },
  envPrefix: 'VITE_',
  css: {
    devSourcemap: false,
    postcss: './postcss.config.js'
  }
  };
});
