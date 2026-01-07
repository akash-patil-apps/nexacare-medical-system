import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../dist/client',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('Proxy error:', err.message);
            if (res && !res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'text/plain',
              });
              res.end('Proxy error: Backend server may not be running');
            }
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`[Proxy] ${req.method} ${req.url} -> http://localhost:3000${req.url}`);
          });
        },
      },
      '/api-docs': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('Proxy error for /api-docs:', err.message);
            if (res && !res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'text/plain',
              });
              res.end('Proxy error: Backend server may not be running');
            }
          });
        },
      },
      '/api/docs': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.log('Proxy error for /api/docs:', err.message);
            if (res && !res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'text/plain',
              });
              res.end('Proxy error: Backend server may not be running');
            }
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['@vitejs/plugin-react']
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  },
  // Suppress Chrome DevTools JSON parsing errors
  json: {
    namedExports: true,
    stringify: false,
  },
});