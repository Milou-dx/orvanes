import { confirmDialog, openModal, toast } from '../ui/dialog';
import { registerCommands } from '../ui/commands';
import { openMenu } from '../ui/menu';

interface User {
  id: string; email: string; name: string; role: 'admin' | 'user'; status: 'active' | 'pending' | 'blocked';
  tabs: string[]; hasPassword: boolean; sessions: number; linuxUser: string | null; linuxSuggestion: string;
}
interface Tab { id: string; label: string; sensitive: boolean }
interface Data { users: User[]; tabs: Tab[]; enabled: boolean; google: boolean }

async function post(body: object): Promise<any> {
  const r = await fetch('/api/admin/auth', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? 'L’opération a échoué. Consultez le journal du panel.');
  return data;
}

const reload = (ms = 500) => setTimeout(() => location.reload(), ms);

function field(label: string, input: HTMLElement): HTMLElement {
  const wrap = document.createElement('label');
  wrap.className = 'acform__field';
  const span = document.createElement('span');
  span.textContent = label;
  wrap.append(span, input);
  return wrap;
}

function box(): HTMLElement {
  const el = document.createElement('div');
  el.className = 'acform';
  el.setAttribute('data-busy', '');
  return el;
}

function select(options: [string, string][], value: string): HTMLSelectElement {
  const sel = document.createElement('select');
  for (const [v, label] of options) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = label;
    o.selected = v === value;
    sel.append(o);
  }
  return sel;
}

function tabPicker(tabs: Tab[], selected: string[]): { el: HTMLElement; value: () => string[] } {
  const el = document.createElement('div');
  el.className = 'actabs';
  const boxes: HTMLInputElement[] = [];
  for (const t of tabs) {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = t.id;
    cb.checked = selected.includes(t.id);
    boxes.push(cb);
    const name = document.createElement('span');
    name.textContent = t.label;
    label.append(cb, name);
    if (t.sensitive) {
      const small = document.createElement('small');
      small.textContent = 'sensible';
      label.append(small);
    }
    el.append(label);
  }
  return { el, value: () => boxes.filter((b) => b.checked).map((b) => b.value) };
}

function quickSelect(picker: { el: HTMLElement }): HTMLElement {
  const row = document.createElement('div');
  row.className = 'acquick';
  const mk = (label: string, fn: (cb: HTMLInputElement) => boolean) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mini';
    b.textContent = label;
    b.addEventListener('click', () => picker.el.querySelectorAll<HTMLInputElement>('input').forEach((cb) => (cb.checked = fn(cb))));
    return b;
  };
  row.append(mk('Tout cocher', () => true), mk('Aucun', () => false), mk('Sans les onglets sensibles', (cb) => cb.checked && !cb.closest('label')?.querySelector('small')));
  return row;
}

async function showPassword(title: string, password: string) {
  const el = box();
  const p = document.createElement('p');
  p.textContent = 'Notez ce mot de passe maintenant : il ne sera plus jamais affiché.';
  const code = document.createElement('div');
  code.className = 'acpass';
  code.textContent = password;
  el.append(p, code);
  await openModal({ title, body: el, confirmLabel: 'Copier et fermer', cancelLabel: null, onConfirm: async () => { await navigator.clipboard?.writeText(password).catch(() => {}); } });
}

async function editFlow(data: Data, id: string) {
  const u = data.users.find((x) => x.id === id);
  if (!u) return;
  const el = box();
  const name = document.createElement('input');
  name.type = 'text';
  name.value = u.name;
  const role = select([['user', 'Utilisateur'], ['admin', 'Administrateur (tous les onglets)']], u.role);
  const status = select([['active', 'Actif'], ['pending', 'En attente'], ['blocked', 'Bloqué']], u.status === 'pending' ? 'active' : u.status);
  const picker = tabPicker(data.tabs, u.tabs);
  const tabsField = field('Onglets visibles', picker.el);
  const sync = () => { tabsField.hidden = role.value === 'admin'; };
  role.addEventListener('change', sync);
  sync();
  const row = document.createElement('div');
  row.className = 'acform__row';
  row.append(field('Rôle', role), field('Statut', status));
  el.append(field('Nom', name), row, tabsField, quickSelect(picker));
  if (u.email) {
    const e = document.createElement('p');
    e.className = 't-meta text-secondary';
    e.textContent = u.email;
    el.prepend(e);
  }

  await openModal({
    title: u.status === 'pending' ? `Approuver ${u.name}` : `Modifier ${u.name}`,
    body: el,
    confirmLabel: u.status === 'pending' ? 'Approuver' : 'Enregistrer',
    wide: true,
    onConfirm: async () => {
      const wasAdmin = u.role === 'admin' && u.status === 'active';
      if (wasAdmin && (role.value !== 'admin' || status.value !== 'active')) {
        if (!(await confirmDialog({ title: `Retirer les droits d’administrateur à ${u.name} ?`, message: status.value !== 'active' ? 'Le compte sera aussi désactivé et ses sessions fermées.' : 'Ce compte ne verra plus que les onglets que vous lui attribuez.', confirmLabel: 'Retirer', danger: true }))) return false;
      } else if (u.role !== 'admin' && role.value === 'admin') {
        if (!(await confirmDialog({ title: `Faire de ${u.name} un administrateur ?`, message: 'Ce compte verra tous les onglets (terminal, fichiers, Docker…) et pourra gérer les accès.', confirmLabel: 'Promouvoir', danger: true }))) return false;
      } else if (u.status !== 'blocked' && status.value === 'blocked') {
        if (!(await confirmDialog({ title: `Bloquer ${u.name} ?`, message: 'Ses sessions ouvertes seront fermées et cette personne ne pourra plus entrer.', confirmLabel: 'Bloquer', danger: true }))) return false;
      }
      try {
        await post({ action: 'saveUser', id, name: name.value, role: role.value, status: status.value, tabs: picker.value() });
        toast('Enregistré.', 'success');
        reload();
      } catch (e) {
        toast((e as Error).message, 'error');
        return false;
      }
    },
  });
}

async function createFlow(data: Data) {
  const el = box();
  const email = document.createElement('input');
  email.type = 'text';
  email.placeholder = 'camille  ou  camille@exemple.fr';
  email.autocomplete = 'off';
  email.addEventListener('input', () => email.removeAttribute('aria-invalid'));
  const name = document.createElement('input');
  name.type = 'text';
  const password = document.createElement('input');
  password.type = 'text';
  password.placeholder = 'Laisser vide pour en générer un';
  password.autocomplete = 'off';
  const role = select([['user', 'Utilisateur'], ['admin', 'Administrateur']], 'user');
  const picker = tabPicker(data.tabs, []);
  const tabsField = field('Onglets visibles', picker.el);
  role.addEventListener('change', () => { tabsField.hidden = role.value === 'admin'; });
  const r1 = document.createElement('div');
  r1.className = 'acform__row';
  r1.append(field('Identifiant', email), field('Nom affiché', name));
  const r2 = document.createElement('div');
  r2.className = 'acform__row';
  r2.append(field('Rôle', role), field('Mot de passe', password));
  el.append(r1, r2, tabsField, quickSelect(picker));
  if (data.google) {
    const hint = document.createElement('p');
    hint.className = 't-meta text-secondary';
    hint.textContent = 'Connexion avec Google : mettez l’adresse Gmail comme identifiant, la personne sera reconnue à sa première connexion.';
    el.append(hint);
  }

  await openModal({
    title: 'Nouvel utilisateur',
    body: el,
    confirmLabel: 'Créer',
    wide: true,
    onConfirm: async () => {
      if (!email.value.trim()) {
        email.setAttribute('aria-invalid', 'true');
        email.focus();
        toast('Donnez un identifiant ou une adresse e-mail.', 'error');
        return false;
      }
      if (role.value === 'admin' && !(await confirmDialog({ title: 'Créer un administrateur ?', message: 'Ce compte verra tous les onglets, terminal et fichiers compris, et pourra gérer les accès.', confirmLabel: 'Créer', danger: true }))) return false;
      try {
        const r = await post({ action: 'createLocal', email: email.value, name: name.value, role: role.value, password: password.value, tabs: picker.value() });
        toast('Utilisateur créé.', 'success');
        await showPassword(`Mot de passe de ${r.user.name}`, r.password);
        reload(0);
      } catch (e) {
        toast((e as Error).message, 'error');
        return false;
      }
    },
  });
}

async function passwordFlow(id: string, name: string) {
  const el = box();
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Laisser vide pour en générer un';
  input.autocomplete = 'off';
  const p = document.createElement('p');
  p.textContent = 'Les sessions ouvertes de ce compte seront fermées.';
  el.append(p, field('Nouveau mot de passe', input));
  await openModal({
    title: `Mot de passe de ${name}`,
    body: el,
    confirmLabel: 'Définir',
    onConfirm: async () => {
      try {
        const r = await post({ action: 'setPassword', id, password: input.value });
        await showPassword(`Mot de passe de ${name}`, r.password);
        reload(0);
      } catch (e) {
        toast((e as Error).message, 'error');
        return false;
      }
    },
  });
}

async function linuxFlow(data: Data, id: string) {
  const u = data.users.find((x) => x.id === id);
  if (!u) return;
  const el = box();
  const p = document.createElement('p');
  p.className = 't-meta text-secondary';
  p.textContent = u.linuxUser
    ? `Claude de ${u.name} tourne sous le compte Linux « ${u.linuxUser} », enfermé dans /home/${u.linuxUser}.`
    : `Sans compte Linux, Claude ne fait que consulter. Lié à un compte, il écrit dans /home/<compte> (projets, commandes, npm, git) et rien ailleurs.`;
  const actions: [string, string][] = [['create', 'Créer un nouveau compte'], ['link', 'Lier un compte existant']];
  if (u.linuxUser) actions.push(['unlink', 'Délier (le compte et ses fichiers restent)']);
  const how = select(actions, u.linuxUser ? 'link' : 'create');
  const name = document.createElement('input');
  name.type = 'text';
  name.autocomplete = 'off';
  name.spellcheck = false;
  name.value = u.linuxUser ?? u.linuxSuggestion;
  name.placeholder = 'camille';
  name.pattern = '[a-z][a-z0-9_-]{0,31}';
  const nameField = field('Nom du compte Linux', name);
  how.addEventListener('change', () => { nameField.hidden = how.value === 'unlink'; });
  el.append(p, field('Action', how), nameField);
  await openModal({
    title: `Compte Linux de ${u.name}`,
    body: el,
    confirmLabel: u.linuxUser ? 'Changer' : 'Enregistrer',
    onConfirm: async () => {
      try {
        if (how.value === 'unlink') await post({ action: 'unlinkLinux', id });
        else await post({ action: 'linkLinux', id, linuxUser: name.value.trim(), create: how.value === 'create' });
        toast(how.value === 'unlink' ? 'Compte Linux délié.' : 'Compte Linux enregistré.', 'success');
        reload();
      } catch (e) {
        toast((e as Error).message, 'error');
        return false;
      }
    },
  });
}

async function simple(action: string, id: string, ok: string) {
  try {
    await post({ action, id });
    toast(ok, 'success');
    reload();
  } catch (e) {
    toast((e as Error).message, 'error');
  }
}

document.addEventListener('astro:page-load', () => {
  const raw = document.getElementById('acces-data')?.textContent;
  if (!raw) return;
  const data: Data = JSON.parse(raw);

  document.getElementById('acces-new')?.addEventListener('click', () => void createFlow(data));
  const each = (sel: string, fn: (el: HTMLElement) => void) => document.querySelectorAll<HTMLElement>(sel).forEach(fn);
  each('[data-edit]', (b) => b.addEventListener('click', () => void editFlow(data, b.dataset.edit!)));
  const revoke = async (id: string, name: string) => {
    if (await confirmDialog({ title: `Déconnecter ${name} ?`, message: 'Ses sessions ouvertes seront fermées ; elle ou il pourra se reconnecter.', confirmLabel: 'Déconnecter' })) {
      await simple('revoke', id, 'Sessions fermées.');
    }
  };
  const remove = async (id: string, name: string, admin: boolean) => {
    if (await confirmDialog({ title: admin ? `Supprimer l’administrateur ${name} ?` : `Supprimer ${name} ?`, message: `${admin ? 'Ce compte a accès à tout le panel. ' : ''}Le compte et ses sessions sont supprimés. Un compte Google pourra refaire une demande d’accès.`, confirmLabel: 'Supprimer', danger: true })) {
      await simple('delete', id, 'Compte supprimé.');
    }
  };
  each('[data-more]', (b) => b.addEventListener('click', () => {
    const { more: id = '', name = '' } = b.dataset;
    openMenu({
      anchor: b,
      label: `Actions pour ${name}`,
      items: [
        { label: 'Mot de passe', icon: 'key', run: () => void passwordFlow(id, name) },
        ...(b.dataset.linux !== undefined ? [{ label: 'Compte Linux', icon: 'terminal' as const, run: () => void linuxFlow(data, id) }] : []),
        ...(Number(b.dataset.sessions) > 0 ? [{ label: 'Déconnecter', icon: 'logout' as const, run: () => void revoke(id, name) }] : []),
        'sep' as const,
        { label: 'Supprimer', icon: 'trash' as const, danger: true, run: () => void remove(id, name, b.dataset.admin !== undefined) },
      ],
    });
  }));
  each('[data-block]', (b) =>
    b.addEventListener('click', async () => {
      if (await confirmDialog({ title: `Refuser ${b.dataset.name} ?`, message: 'Le compte sera bloqué : cette personne ne pourra pas entrer.', confirmLabel: 'Refuser', danger: true })) {
        try {
          await post({ action: 'saveUser', id: b.dataset.block, status: 'blocked' });
          toast('Demande refusée.', 'success');
          reload();
        } catch (e) {
          toast((e as Error).message, 'error');
        }
      }
    }),
  );

  document.querySelectorAll<HTMLInputElement>('input[data-mx-user]').forEach((cb) =>
    cb.addEventListener('change', async () => {
      const u = data.users.find((x) => x.id === cb.dataset.mxUser);
      const tab = data.tabs.find((t) => t.id === cb.dataset.mxTab);
      if (!u || !tab) return;
      const want = cb.checked;
      if (want && tab.sensitive && !(await confirmDialog({ title: `Donner « ${tab.label} » à ${u.name} ?`, message: 'Cet onglet est sensible : il donne la main sur la machine.', confirmLabel: 'Accorder', danger: true }))) {
        cb.checked = false;
        return;
      }
      const next = want ? [...new Set([...u.tabs, tab.id])] : u.tabs.filter((t) => t !== tab.id);
      const col = document.querySelectorAll<HTMLInputElement>(`input[data-mx-user="${CSS.escape(u.id)}"]`);
      col.forEach((c) => (c.disabled = true));
      try {
        await post({ action: 'saveUser', id: u.id, tabs: next });
        u.tabs = next;
        const n = document.querySelector(`[data-mx-count="${CSS.escape(u.id)}"]`);
        if (n) n.textContent = `${next.length}/${data.tabs.length}`;
        toast(want ? `${tab.label} accordé à ${u.name}.` : `${tab.label} retiré à ${u.name}.`, 'success');
      } catch (e) {
        cb.checked = !want;
        toast((e as Error).message, 'error');
      } finally {
        col.forEach((c) => (c.disabled = false));
      }
    }),
  );

  registerCommands([
    { id: 'acces.new', title: 'Accès : nouvel utilisateur', group: 'Accès', run: () => void createFlow(data) },
    { id: 'acces.users', title: 'Accès : utilisateurs', group: 'Accès', run: () => { location.href = '/acces?vue=utilisateurs'; } },
    { id: 'acces.rights', title: 'Accès : droits par onglet', group: 'Accès', run: () => { location.href = '/acces?vue=droits'; } },
    { id: 'acces.google', title: 'Accès : connexion Google', group: 'Accès', run: () => { location.href = '/acces?vue=google'; } },
    { id: 'acces.security', title: 'Accès : sécurité', group: 'Accès', run: () => { location.href = '/acces?vue=securite'; } },
  ]);

  const msg = document.getElementById('google-msg');
  const say = (text: string, bad = false) => {
    if (!msg) return;
    msg.hidden = false;
    msg.textContent = text;
    msg.style.color = bad ? 'var(--danger)' : 'var(--text-secondary)';
  };
  document.getElementById('google-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await post({
        action: 'saveGoogle',
        clientId: (document.getElementById('g-id') as HTMLInputElement).value,
        clientSecret: (document.getElementById('g-secret') as HTMLInputElement).value,
      });
      toast('Identifiants enregistrés.', 'success');
      reload();
    } catch (err) {
      say((err as Error).message, true);
    }
  });
  document.getElementById('google-test')?.addEventListener('click', async () => {
    say('Test en cours…');
    try {
      say((await post({ action: 'testGoogle' })).message);
    } catch (err) {
      say((err as Error).message, true);
    }
  });

  const toggle = document.getElementById('acces-enable') as HTMLButtonElement | null;
  toggle?.setAttribute('aria-checked', String(data.enabled));
  toggle?.addEventListener('click', async () => {
    const next = toggle.getAttribute('aria-checked') !== 'true';
    const ok = await confirmDialog(
      next
        ? { title: 'Activer la protection ?', message: 'Dès maintenant, le panel demande une connexion. Vous allez être déconnecté et devrez vous reconnecter avec le compte de secours (identifiant et mot de passe) ou Google.\n\nSi vous êtes enfermé dehors : supprimez le fichier data/auth.json en SSH.', confirmLabel: 'Activer' }
        : { title: 'Désactiver la protection ?', message: 'Le panel redeviendra ouvert à toute personne qui l’atteint, sans connexion.', confirmLabel: 'Désactiver', danger: true },
    );
    if (!ok) return;
    toggle.disabled = true;
    try {
      await post({ action: 'setEnabled', enabled: next });
      toast(next ? 'Protection activée.' : 'Protection désactivée.', 'success');
      setTimeout(() => (location.href = next ? '/connexion' : '/acces?vue=securite'), 600);
    } catch (e) {
      toast((e as Error).message, 'error');
      toggle.disabled = false;
    }
  });
});
