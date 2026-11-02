
/**
 * @param {{ id: string, hook: { request?: (req: any, res: any) => boolean } }[]} hooks
 * @param {(id: string) => boolean} isInstalled
 * @returns {boolean} vrai si un hook a pris la requête en charge
 */
export function handleHookRequest(hooks, isInstalled, req, res) {
  for (const { id, hook } of hooks) {
    if (typeof hook.request !== 'function' || !isInstalled(id)) continue;
    try {
      if (hook.request(req, res)) return true;
    } catch (err) {
      console.error(`Module ${id} : request() en échec :`, err);
      if (!res.headersSent) { res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Erreur du module.'); }
      return true;
    }
  }
  return false;
}

/** @param {{ moduleForPath: (p: string) => { id: string } | null, isInstalled: (id: string) => boolean }} modules */
export function closeUnclaimedUpgrade(modules) {
  return (req, socket) => {
    const { pathname } = new URL(req.url ?? '', 'http://localhost');
    if (pathname === '/api/shell/ws') return;
    const mod = modules.moduleForPath(pathname);
    if (!mod || !modules.isInstalled(mod.id)) socket.destroy();
  };
}
