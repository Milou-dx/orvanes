import { showError } from '../ui/dialog';

const IGNORED = /ResizeObserver loop/;

function report(reason: unknown) {
  if (reason instanceof DOMException && reason.name === 'AbortError') return;
  const message = reason instanceof Error ? reason.message : String(reason ?? '');
  if (message && !IGNORED.test(message)) showError(message);
}

window.addEventListener('error', (e) => report(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => report(e.reason));

// Actions seulement : une lecture en échec (actualisation périodique, redémarrage du panel) ne doit pas ouvrir de fenêtre.
const nativeFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
  const isAction = method !== 'GET' && method !== 'HEAD';
  let res: Response;
  try {
    res = await nativeFetch(input, init);
  } catch (e) {
    if (isAction && !(e instanceof DOMException && e.name === 'AbortError')) showError('Le panel ne répond pas. Vérifiez la connexion, puis réessayez.');
    throw e;
  }
  if (isAction && res.status >= 500) {
    const data = await res.clone().json().catch(() => null);
    showError(data?.error ?? `Le serveur a répondu par une erreur (${res.status}).`);
  }
  return res;
};
