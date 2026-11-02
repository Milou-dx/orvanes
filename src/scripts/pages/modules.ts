import { openModal, toast } from '../ui/dialog';

function body(text: string, withData: boolean): { el: HTMLElement; purge: () => boolean } {
  const el = document.createElement('div');
  const p = document.createElement('p');
  p.textContent = text;
  el.append(p);
  const box = document.createElement('input');
  if (withData) {
    const label = document.createElement('label');
    label.className = 'mod__purge';
    box.type = 'checkbox';
    label.append(box, ' Supprimer aussi les données');
    el.append(label);
  }
  return { el, purge: () => withData && box.checked };
}

const REBUILD = 'Le panel se reconstruira ensuite et redémarrera (environ une minute).';
const ASK = {
  install: { title: (n: string) => `Installer « ${n} » ?`, label: 'Installer', text: (n: string) => `« ${n} » va être téléchargé depuis le Magasin, vérifié, puis son script d’installation s’exécutera sur ce serveur. ${REBUILD}` },
  update: { title: (n: string) => `Mettre à jour « ${n} » ?`, label: 'Mettre à jour', text: (n: string, v?: string) => `« ${n} » passe en version ${v ?? 'récente'} ; ses réglages et données sont gardés. ${REBUILD}` },
  uninstall: { title: (n: string) => `Désinstaller « ${n} » ?`, label: 'Désinstaller', text: (n: string) => `Les onglets de « ${n} » disparaîtront et ses fichiers seront retirés du panel. ${REBUILD}` },
  publish: { title: (n: string) => `Publier « ${n} » sur le Magasin ?`, label: 'Publier', text: (n: string) => `La version de « ${n} » présente dans les sources sera signée et proposée à tous les panels.` },
};

document.addEventListener('astro:page-load', () => {
  for (const btn of document.querySelectorAll<HTMLButtonElement>('.mod [data-action]')) {
    btn.addEventListener('click', async () => {
      const { action, id, name, version } = btn.dataset as { action: keyof typeof ASK; id: string; name: string; version?: string };
      const ask = ASK[action];
      const dlg = body(ask.text(name, version), action === 'uninstall' && btn.dataset.hasData !== undefined);
      const ok = await openModal({ title: ask.title(name), body: dlg.el, confirmLabel: ask.label, danger: action === 'uninstall' });
      if (!ok) return;
      const out = btn.closest('.mod')!.querySelector<HTMLElement>('.mod__out')!;
      out.hidden = true;
      btn.disabled = true;
      btn.setAttribute('aria-busy', 'true');
      try {
        const r = await fetch('/api/modules', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action, id, purge: dlg.purge() }),
        });
        const res = await r.json().catch(() => ({}));
        if (!r.ok) {
          if (res.output) {
            out.textContent = res.output;
            out.hidden = false;
            out.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          }
          throw new Error(res.error ?? 'Le panel ne répond pas. Réessayez.');
        }
        toast(res.output?.split('\n')[0] ?? `${name} : fait.`, 'success');
        setTimeout(() => location.reload(), 900);
      } catch (e) {
        toast((e as Error).message, 'error');
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
    });
  }
});
