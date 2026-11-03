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

const REBUILD = 'Le panel se reconstruit et redémarre (environ une minute).';
const ASK = {
  install: { title: (n: string) => `Installer « ${n} » ?`, label: 'Installer', text: (n: string) => `Le panel télécharge « ${n} » depuis le Magasin, le vérifie, puis exécute son script d’installation sur ce serveur. ${REBUILD}` },
  update: { title: (n: string) => `Mettre à jour « ${n} » ?`, label: 'Mettre à jour', text: (n: string, v?: string) => `« ${n} » passe en version ${v ?? 'récente'} ; le panel garde ses réglages et données. ${REBUILD}` },
  uninstall: { title: (n: string) => `Désinstaller « ${n} » ?`, label: 'Désinstaller', text: (n: string) => `Les onglets de « ${n} » disparaîtront et le panel supprime ses fichiers sans retour possible. ${REBUILD}` },
  publish: { title: (n: string) => `Publier « ${n} » sur le Magasin ?`, label: 'Publier', text: (n: string) => `Le panel signe la version de « ${n} » présente dans les sources et la propose aux autres panels.` },
};

// Après une installation, le panel redémarre : on attend qu'il réponde (et ne se reconstruise plus) avant de recharger.
async function reloadWhenReady() {
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const r = await fetch('/modules', { cache: 'no-store' });
      if (r.ok && !(await r.text()).includes('id="mod-rebuild"')) break;
    } catch { /* le panel redémarre */ }
  }
  location.reload();
}

document.addEventListener('astro:page-load', () => {
  if (document.getElementById('mod-rebuild')) void reloadWhenReady();
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
      const busy = document.getElementById('mod-busy');
      if (busy) {
        busy.textContent = action === 'publish' ? `Publication de « ${name} » en cours…` : `${ask.label} « ${name} » : en cours, environ une minute. Ne fermez pas la page.`;
        busy.hidden = false;
      }
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
        if (action === 'publish') { setTimeout(() => location.reload(), 900); return; }
        if (busy) busy.textContent = 'Le panel redémarre. La page se rechargera dès qu’il répond…';
        void reloadWhenReady();
      } catch (e) {
        if (busy) busy.hidden = true;
        toast((e as Error).message, 'error');
        btn.disabled = false;
        btn.removeAttribute('aria-busy');
      }
    });
  }
});
