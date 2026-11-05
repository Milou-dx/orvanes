/**
 * Formulaire « Envoyer un commentaire », sur le modèle des widgets de Linear et Vercel :
 * type (bug, idée, autre), rappel de ce qui est visé, champ large, Ctrl/⌘+Entrée pour envoyer.
 */
import { confirmDialog, openModal, toast } from '../ui/dialog';
import { esc, iconSVG } from '../ui/html';

const KINDS = [['bug', 'Un bug', 'warning'], ['idee', 'Une idée', 'spark'], ['autre', 'Autre', 'message']] as const;
const MAX = 2000;

// Ce que l'utilisateur avait surligné, lu au pointerdown : le clic qui ouvre le formulaire efface la sélection.
let picked = '';
document.addEventListener('pointerdown', (e) => {
  if ((e.target as Element | null)?.closest?.('[data-account-menu], [data-feedback]')) picked = String(window.getSelection() ?? '').trim().slice(0, 500);
}, true);

export async function openFeedback(kind: (typeof KINDS)[number][0] = 'idee') {
  const selection = picked;
  picked = '';
  const title = document.title;
  const body = document.createElement('div');
  body.className = 'fb';
  body.innerHTML = `
    <div class="fb__kinds" role="radiogroup" aria-label="Type de commentaire">
      ${KINDS.map(([v, label, icon]) => `<button type="button" role="radio" class="fb__kind" data-kind="${v}" aria-checked="${v === kind}">${iconSVG(icon, 16)}${label}</button>`).join('')}
    </div>
    <p class="fb__ctx">${iconSVG('link', 14)}<span>${selection ? `« ${esc(selection.slice(0, 140))} » · ` : ''}${esc(title)}</span></p>
    <textarea class="fb__text" rows="6" maxlength="${MAX}" aria-label="Votre commentaire" placeholder="Qu’est-ce qui s’est passé, ou qu’aimeriez-vous voir ?"></textarea>
    <p class="fb__foot"><span class="fb__count">0 / ${MAX}</span><span><kbd>Ctrl</kbd> <kbd>Entrée</kbd> pour envoyer</span></p>`;
  const text = body.querySelector<HTMLTextAreaElement>('.fb__text')!;
  const count = body.querySelector<HTMLElement>('.fb__count')!;
  const kinds = [...body.querySelectorAll<HTMLButtonElement>('.fb__kind')];
  const choose = (b: HTMLButtonElement) => { kinds.forEach((k) => k.setAttribute('aria-checked', String(k === b))); kind = b.dataset.kind as typeof kind; };
  kinds.forEach((b) => b.addEventListener('click', () => { choose(b); text.focus(); }));
  text.addEventListener('input', () => { count.textContent = `${text.value.length} / ${MAX}`; text.removeAttribute('aria-invalid'); });
  text.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); body.closest('.dlg')?.querySelector<HTMLButtonElement>('.dlg__ok')?.click(); }
  });

  let sent = false;
  let report: string | null = null;
  await openModal({
    title: 'Envoyer un commentaire', body, confirmLabel: 'Envoyer',
    onConfirm: async () => {
      if (!text.value.trim()) { text.setAttribute('aria-invalid', 'true'); text.focus(); return false; }
      const r = await fetch('/api/feedback', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind, text: text.value, page: location.pathname, title, selection }),
      }).catch(() => null);
      if (!r?.ok) { toast('Envoi impossible, réessayez.', 'error'); return false; }
      sent = true;
      report = (await r.json().catch(() => null))?.report ?? null;
    },
  });
  if (sent) toast('Merci ! Votre commentaire a bien été envoyé.', 'success');
  if (report && await confirmDialog({ title: 'Prévenir aussi les auteurs d’Orvane ?', message: 'Ce signalement reste sur votre serveur. Vous pouvez l’envoyer sur GitHub : relisez-le avant de le publier, il sera public.', confirmLabel: 'Ouvrir GitHub' })) {
    window.open(report, '_blank', 'noopener');
  }
}

document.addEventListener('click', (e) => {
  const b = (e.target as Element | null)?.closest<HTMLElement>('[data-feedback]');
  if (b) void openFeedback((b.dataset.feedback || 'idee') as (typeof KINDS)[number][0]);
});
