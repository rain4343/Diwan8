import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Windows 7 / Chrome 60+ compatibility:
// Tailwind v4 emits oklch() and color-mix() which Chrome ≤110 doesn't support.
// lightningcss with these targets automatically converts them to rgb() fallbacks.
const browsersTargets = {
  chrome: 60 << 16,   // Chrome 60+ (Win7 max is Chrome 109)
  firefox: 78 << 16,  // Firefox 78 ESR+
  edge: 79 << 16,     // EdgeHTML → Chromium 79+
};

const rawPort = process.env.PORT;
const isBuild = process.env.NODE_ENV === 'production' || process.argv.includes('build');

// Port 5000 is mapped to external port 80 in the Replit preview pane
const port = rawPort ? Number(rawPort) : 5000;

if (!isBuild && rawPort && (Number.isNaN(port) || port <= 0)) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base: basePath,
  css: {
    transformer: 'lightningcss',
    lightningcss: {
      targets: browsersTargets,
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
