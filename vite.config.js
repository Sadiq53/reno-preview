import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/proxy-target': {
        target: 'https://reno-v1.webflow.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-target/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Remove security headers that prevent framing
            delete proxyRes.headers['x-frame-options'];
            delete proxyRes.headers['content-security-policy'];
            delete proxyRes.headers['frame-options'];
          });
        }
      }
    }
  }
})
