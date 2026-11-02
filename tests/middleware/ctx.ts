export function ctxFor(raw: string, routePattern: string, headers: Record<string, string> = {}) {
  const request = new Request(`http://panel.test${raw}`, { headers: { host: 'panel.test', ...headers } });
  const url = new URL(request.url);
  let p = url.pathname;
  for (let d = decodeURI(p); d !== p; d = decodeURI(p)) p = d;
  url.pathname = p.replace(/\/{2,}/g, '/');
  return {
    request, url, routePattern, locals: {} as Record<string, unknown>,
    cookies: { set() {} },
    redirect: (path: string, status = 302) => new Response(null, { status, headers: { location: path } }),
  };
}

export const next = async (path?: string) =>
  new Response('page', { status: path === '/404' ? 404 : 200, headers: { 'content-type': 'text/html' } });
