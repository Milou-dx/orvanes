async function post(url: string, body: object): Promise<any> {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error ?? 'La connexion a échoué. Réessayez, ou consultez le journal du panel.');
  return data;
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

function magnetic(el: HTMLElement) {
  el.addEventListener('pointerenter', () => el.classList.add('is-pulling'));
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const pull = (v: number, size: number) => Math.max(-8, Math.min(8, v * 0.22)) * (size > 80 ? 0.6 : 1);
    el.style.setProperty('--mx', `${pull(e.clientX - (r.left + r.width / 2), r.width)}px`);
    el.style.setProperty('--my', `${pull(e.clientY - (r.top + r.height / 2), r.width)}px`);
  });
  el.addEventListener('pointerleave', () => {
    el.classList.remove('is-pulling');
    el.style.setProperty('--mx', '0px');
    el.style.setProperty('--my', '0px');
  });
}

function directional(el: HTMLElement) {
  const at = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--dx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--dy', `${((e.clientY - r.top) / r.height) * 100}%`);
  };
  el.addEventListener('pointerenter', at);
  el.addEventListener('pointerleave', at);
}

function effects() {
  if (!matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return;
  document.querySelectorAll<HTMLElement>('.magnetic').forEach(magnetic);
  document.querySelectorAll<HTMLElement>('.go').forEach(directional);
}

function init() {
  effects();
  const suite = byId<HTMLInputElement>('suite')?.value ?? '';
  const form = byId<HTMLFormElement>('login-form');
  const error = byId('login-error');
  const submit = byId<HTMLButtonElement>('login-btn');
  const fields = [...document.querySelectorAll<HTMLElement>('#login-form .field')];
  const setInvalid = (bad: boolean) =>
    fields.forEach((f) => {
      f.classList.toggle('is-error', bad);
      f.querySelector('input')?.setAttribute('aria-invalid', String(bad));
    });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form || !submit || !error) return;
    const data = new FormData(form);
    const empty = [...form.querySelectorAll<HTMLInputElement>('input[required]')].find((i) => !i.value.trim());
    if (empty) {
      error.textContent = empty.name === 'password' ? 'Saisissez votre mot de passe.' : 'Saisissez votre identifiant.';
      setInvalid(false);
      empty.setAttribute('aria-invalid', 'true');
      empty.closest('.field')?.classList.add('is-error');
      empty.focus();
      return;
    }
    submit.disabled = true;
    submit.classList.add('is-loading');
    error.textContent = '';
    setInvalid(false);
    try {
      const r = await post('/api/auth/login', { identifier: data.get('identifier'), password: data.get('password'), suite });
      location.href = r.state === 'pending' ? '/connexion?etat=attente' : r.next;
    } catch (err) {
      error.textContent = (err as Error).message;
      submit.disabled = false;
      submit.classList.remove('is-loading');
      fields.forEach((f) => void f.offsetWidth);
      setInvalid(true);
    }
  });
  fields.forEach((f) => f.querySelector('input')?.addEventListener('input', () => setInvalid(false)));

  document.querySelectorAll<HTMLElement>('[data-logout]').forEach((b) =>
    b.addEventListener('click', async () => {
      await post('/api/auth/logout', {}).catch(() => {});
      location.href = '/connexion';
    }),
  );
}

init();
