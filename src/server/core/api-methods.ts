const ENDPOINTS = import.meta.glob<Record<string, unknown>>([
  '/src/pages/api/**/*.{ts,js}', '/modules/*/pages/api/**/*.{ts,js}', '!**/_*', '!**/_*/**',
]);

const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

export function routeRegex(file: string): RegExp {
  const url = file.replace(/^\/(?:src|modules\/[^/]+)\/pages/, '').replace(/\.(ts|js)$/, '').replace(/\/index$/, '');
  const re = url.split('/').map((seg) =>
    /^\[\.\.\..+\]$/.test(seg) ? '.+' : /^\[.+\]$/.test(seg) ? '[^/]+' : seg.replace(/[.*+?^${}()|\\]/g, '\\$&')).join('/');
  return new RegExp(`^${re}/?$`);
}

export async function allowedMethods(pathname: string): Promise<string[]> {
  const allowed = new Set<string>();
  for (const [file, load] of Object.entries(ENDPOINTS)) {
    if (!routeRegex(file).test(pathname)) continue;
    const mod = await load();
    if (mod.ALL) return METHODS;
    for (const m of METHODS) if (mod[m]) allowed.add(m);
    if (allowed.has('GET')) allowed.add('HEAD');
  }
  return [...allowed];
}
