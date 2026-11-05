import { defineMiddleware } from 'astro:middleware';
import * as auth from './server/auth/auth-core.js';
import { isInstalled, moduleForPath } from './server/modules/registry.js';
import { PANEL_NAME } from './server/core/panel';
import { allowedMethods } from './server/core/api-methods';

const OPEN_ACCESS = { id: 'open', email: '', name: PANEL_NAME, picture: '', role: 'admin', status: 'active', tabs: [] as string[] };

const json = (status: number, error: string) =>
  new Response(JSON.stringify({ error }), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

async function guard(ctx: Parameters<Parameters<typeof defineMiddleware>[0]>[0]): Promise<Response | null> {
  const enabled = auth.isEnabled();
  const user = enabled ? auth.userFromCookie(ctx.request.headers.get('cookie')) : null;
  ctx.locals.authEnabled = enabled;
  ctx.locals.user = enabled ? user : OPEN_ACCESS;

  if (!['GET', 'HEAD', 'OPTIONS'].includes(ctx.request.method)) {
    const origin = ctx.request.headers.get('origin');
    if (origin) {
      let same = false;
      try { same = new URL(origin).host === ctx.request.headers.get('host'); } catch {}
      if (!same) return json(403, 'Origine refusée');
    }
  }
  if (!enabled) return null;

  const url = ctx.url;
  const api = url.pathname.startsWith('/api/');

  const verdict = auth.decide(url.pathname, user);
  if (verdict === 'allow') {
    // Lecture des fichiers partageable ; toute écriture sur le disque reste aux admins.
    if (url.pathname.startsWith('/api/files/') && !['GET', 'HEAD'].includes(ctx.request.method) && user?.role !== 'admin') {
      return json(403, 'Modification des fichiers réservée aux administrateurs');
    }
    if (user) {
      const token = auth.tokenFromCookie(ctx.request.headers.get('cookie'));
      if (token) {
        const days = auth.getSettings().sessionDays;
        ctx.cookies.set(auth.COOKIE, token, {
          httpOnly: true, sameSite: 'lax', path: '/', maxAge: days * 86_400,
          secure: ctx.request.headers.get('x-forwarded-proto') === 'https' || new URL(ctx.request.url).protocol === 'https:',
        });
      }
    }
    return null;
  }
  if (verdict === 'login') {
    return api ? json(401, 'Connexion requise') : ctx.redirect(`/connexion?suite=${encodeURIComponent(url.pathname + url.search)}`);
  }
  if (verdict === 'pending') return api ? json(403, 'Compte en attente d’approbation') : ctx.redirect('/connexion?etat=attente');
  if (api) return json(403, 'Accès refusé à cet onglet');
  if (url.pathname === '/') {
    const first = auth.firstAllowedPage(user);
    return ctx.redirect(first && first !== '/' ? first : '/connexion?etat=aucun');
  }
  return ctx.redirect(`/connexion?etat=refuse&onglet=${encodeURIComponent(url.pathname)}`);
}

// Les artefacts de Claude (iframe srcdoc sandboxée) héritent de cette politique et chargent des bibliothèques depuis des CDN.
const csp = (pathname: string) => [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${pathname.startsWith('/claude') ? ' https:' : ''}`,
  "style-src 'self' 'unsafe-inline'",
  'img-src * data: blob:',
  'media-src * data: blob:',
  "font-src 'self' data:",
  "connect-src 'self' ws: wss:",
  "frame-src 'self' blob:",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const COMPRESSIBLE = /^(text\/html|application\/json|image\/svg\+xml|text\/plain)/;

export const onRequest = defineMiddleware(async (ctx, next) => {
  const refused = await guard(ctx);
  if (refused) return refused;
  const { pathname } = ctx.url;
  const mod = moduleForPath(ctx.routePattern) ?? moduleForPath(pathname);
  if (mod && !isInstalled(mod.id)) {
    if (pathname.startsWith('/api/')) return json(404, `Module non installé : ${mod.name}`);
    const res = await next('/404');
    return new Response(res.body, { status: 404, headers: res.headers });
  }
  if (pathname.startsWith('/api/')) {
    const allow = await allowedMethods(pathname);
    if (allow.length && !allow.includes(ctx.request.method)) {
      const r = json(405, 'Méthode non autorisée');
      r.headers.set('allow', allow.join(', '));
      return r;
    }
  }
  const res = await next();
  if (res.status === 404 && pathname.startsWith('/api/') && (res.headers.get('content-type') ?? '').startsWith('text/html')) {
    return json(404, 'Route inconnue');
  }
  const type = res.headers.get('content-type') ?? '';
  res.headers.set('x-content-type-options', 'nosniff');
  res.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
  if (type.startsWith('text/html')) res.headers.set('content-security-policy', csp(pathname));
  if (
    !res.body
    || !COMPRESSIBLE.test(type)
    || res.headers.has('content-encoding')
    || !/\bgzip\b/.test(ctx.request.headers.get('accept-encoding') ?? '')
  ) return res;

  const headers = new Headers(res.headers);
  headers.set('content-encoding', 'gzip');
  headers.delete('content-length');
  headers.append('vary', 'Accept-Encoding');
  return new Response(res.body.pipeThrough(new CompressionStream('gzip')), {
    status: res.status, statusText: res.statusText, headers,
  });
});
