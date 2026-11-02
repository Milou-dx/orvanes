// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import modules from './src/integrations/modules.mjs';
import { loadEnv } from './src/server/core/env.js';

loadEnv(new URL('./.env', import.meta.url));

const HOST = process.env.PANEL_HOST || '127.0.0.1';
const PORT = Number(process.env.PANEL_PORT || 4321);

const allowedDomains = [
  ...String(process.env.PANEL_PUBLIC_URL ?? '').split(',').map((s) => s.trim()).filter(Boolean).map((raw) => {
    const u = new URL(raw);
    return { hostname: u.hostname, protocol: u.protocol.replace(':', ''), ...(u.port ? { port: u.port } : {}) };
  }),
  { hostname: HOST, protocol: 'http', port: String(PORT) },
];

export default defineConfig({
  output: 'server',
  security: { allowedDomains },
  outDir: process.env.ORVANE_OUT_DIR ?? './dist',
  adapter: node({ mode: 'standalone' }),
  integrations: [modules()],
  server: { host: HOST, port: PORT },
  devToolbar: { enabled: false },
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  compressHTML: true,
  vite: { define: { 'import.meta.env.BUILD_ID': JSON.stringify(Date.now().toString(36)) } },
});
