import { promptDialog, toast } from '../ui/dialog';

async function call(body: object) {
  const r = await fetch('/api/auth/totp', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? 'Opération impossible.');
  return data;
}

async function run(b: HTMLElement) {
  try {
    if (b.dataset.totp === 'on') {
      const { secret } = await call({ action: 'start' });
      const code = await promptDialog({ title: 'Activer la double authentification', message: `Ajoutez cette clé à votre application d'authentification, puis saisissez le code affiché : ${secret}`, confirmLabel: 'Activer' });
      if (!code) return;
      await call({ action: 'confirm', code });
      toast('Double authentification activée.', 'success');
    } else {
      const code = await promptDialog({ title: 'Désactiver la double authentification', message: 'Saisissez le code de votre application pour confirmer.', confirmLabel: 'Désactiver' });
      if (!code) return;
      await call({ action: 'disable', code });
      toast('Double authentification désactivée.', 'success');
    }
    location.reload();
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

document.addEventListener('click', (e) => {
  const b = (e.target as Element | null)?.closest<HTMLElement>('[data-totp]');
  if (b) void run(b);
});
