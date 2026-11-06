import type { APIRoute } from 'astro';
import { installFromStore, storeState, uninstallFromStore, updateFromStore } from '../../server/modules/store-ops.js';
import { publish, publishConfig } from '../../server/modules/store-publish.js';
import { forgetCatalog } from '../../server/modules/store.js';
import { jsonNoStore as json } from '../../server/core/http';

export const prerender = false;

const forbidden = (locals: App.Locals) => locals.user?.role !== 'admin';
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

export const GET: APIRoute = async ({ locals }) => {
  if (forbidden(locals)) return json({ error: 'Réservé aux administrateurs.' }, 403);
  return json(await storeState());
};

export const POST: APIRoute = async ({ request, locals }) => {
  if (forbidden(locals)) return json({ error: 'Réservé aux administrateurs.' }, 403);
  let b: { action?: unknown; id?: unknown; purge?: unknown };
  try {
    b = (await request.json()) ?? {};
  } catch {
    return json({ error: 'Corps de requête invalide : JSON attendu.' }, 400);
  }
  if (typeof b.id !== 'string' || !ID.test(b.id)) return json({ error: 'Intégration inconnue.' }, 404);
  const id = b.id;
  try {
    let res: { ok: boolean; output?: string };
    switch (b.action) {
      case 'install': res = await installFromStore(id); break;
      case 'update': res = await updateFromStore(id); break;
      case 'uninstall': res = await uninstallFromStore(id, { purge: b.purge === true }); break;
      case 'publish': {
        if (!publishConfig().enabled) return json({ error: 'Publication non configurée sur ce serveur.' }, 403);
        const r = await publish(id);
        forgetCatalog();
        res = { ok: true, output: r.changed ? `${r.id} ${r.version} publié sur le Magasin.` : `${r.id} ${r.version} : déjà publié, inchangé.` };
        break;
      }
      default: return json({ error: 'Action inconnue.' }, 400);
    }
    return json(res.ok ? res : { ...res, error: res.output || 'L’opération a échoué : consultez le journal du panel.' }, res.ok ? 200 : 422);
  } catch (e) {
    return json({ ok: false, error: (e as Error).message ?? 'Le Magasin ne répond pas.' }, 502);
  }
};
