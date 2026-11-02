import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateManifest } from '../server/modules/registry.js';

const PAGE = /\.(astro|ts|js)$/;
const CORE_PAGE = /\.(astro|ts|js|md|mdx|html)$/;

function files(dir, ext = PAGE) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith('_')) return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? files(p, ext) : ext.test(e.name) ? [p] : [];
  });
}

export function patternFor(rel, ext = PAGE) {
  const parts = rel.split(sep).join('/').replace(ext, '').split('/');
  if (parts.at(-1) === 'index') parts.pop();
  return `/${parts.join('/')}`;
}

const routeKey = (pattern) => pattern.replace(/\[\.\.\.[^\]]+\]/g, '[...]').replace(/\[[^\]]+\]/g, '[]');

export function collectRoutes(root) {
  const modulesDir = join(root, 'modules');
  if (!existsSync(modulesDir)) return [];
  const seen = new Map();
  const core = join(root, 'src', 'pages');
  if (existsSync(core)) for (const file of files(core, CORE_PAGE)) seen.set(routeKey(patternFor(relative(core, file), CORE_PAGE)), 'le cœur (src/pages)');
  const routes = [];
  for (const dir of readdirSync(modulesDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort()) {
    const base = join(modulesDir, dir);
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(join(base, 'module.json'), 'utf8'));
    } catch (e) {
      throw new Error(`Module « ${dir} » : module.json absent ou illisible (${e.message}).`);
    }
    const errors = validateManifest(manifest, dir);
    if (errors.length) throw new Error(`Module « ${dir} » : manifeste invalide :\n  - ${errors.join('\n  - ')}`);
    const pages = join(base, 'pages');
    if (!existsSync(pages)) continue;
    for (const file of files(pages)) {
      const pattern = patternFor(relative(pages, file));
      const key = routeKey(pattern);
      const owner = seen.get(key);
      if (owner) throw new Error(`Route ${pattern} déclarée par ${owner.startsWith('le cœur') ? owner : `le module « ${owner} »`} et le module « ${dir} ».`);
      seen.set(key, dir);
      routes.push({ pattern, entrypoint: file });
    }
  }
  return routes;
}

export default function modules() {
  return {
    name: 'orvane-modules',
    hooks: {
      'astro:config:setup': ({ config, injectRoute, logger }) => {
        const routes = collectRoutes(fileURLToPath(config.root));
        for (const { pattern, entrypoint } of routes) injectRoute({ pattern, entrypoint, prerender: false });
        if (routes.length) logger.info(`${routes.length} route(s) de modules injectée(s).`);
      },
    },
  };
}
