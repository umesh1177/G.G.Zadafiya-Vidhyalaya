import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function ggzvPwaPlugin() {
  let outDir = 'dist';

  const applyPwaHeaders = (req, res) => {
    const reqUrl = (req.url || '').split('?')[0];
    if (reqUrl === '/manifest.webmanifest') {
      res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    } else if (reqUrl === '/sw.js') {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Service-Worker-Allowed', '/');
    }
  };

  return {
    name: 'ggzv-pwa-plugin',
    configResolved(config) {
      outDir = config.build?.outDir || 'dist';
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        applyPwaHeaders(req, res);
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        applyPwaHeaders(req, res);
        next();
      });
    },
    closeBundle() {
      const resolvedOut = path.resolve(process.cwd(), outDir);
      const swPath = path.join(resolvedOut, 'sw.js');
      const assetsDir = path.join(resolvedOut, 'assets');
      if (!fs.existsSync(swPath)) return;

      let precacheAssets = [];
      if (fs.existsSync(assetsDir)) {
        const walk = (dir, prefix = '/assets') => {
          const entries = fs.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              walk(path.join(dir, entry.name), `${prefix}/${entry.name}`);
            } else if (!entry.name.endsWith('.map')) {
              precacheAssets.push(`${prefix}/${entry.name}`);
            }
          }
        };
        walk(assetsDir);
      }

      const buildTag = `v2-${Date.now().toString(36)}`;
      let swContent = fs.readFileSync(swPath, 'utf8');
      swContent = swContent
        .replace("const CACHE_NAME = 'ggzv-portal-v2';", `const CACHE_NAME = 'ggzv-portal-${buildTag}';`)
        .replace('/*__PRECACHE_ASSETS__*/[]', JSON.stringify(precacheAssets, null, 2));
      fs.writeFileSync(swPath, swContent, 'utf8');
    },
  };
}

export default defineConfig({
  plugins: [react(), ggzvPwaPlugin()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/syllabus': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
    open: false,
  },
});
