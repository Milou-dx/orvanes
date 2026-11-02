
let lastNavType = 'push';
let navigating = false;
let navTimer = 0;
export const isNavigating = () => navigating;

document.addEventListener('astro:before-preparation', (e) => {
  lastNavType = e.navigationType;
  if (e.navigationType === 'replace') return;
  navigating = true;
  clearTimeout(navTimer);
  navTimer = window.setTimeout(() => { navigating = false; }, 10_000);
});
const buildOf = (d: Document) => d.querySelector<HTMLMetaElement>('meta[name="orvane-build"]')?.content;
document.addEventListener('astro:before-preparation', (e) => {
  const load = e.loader;
  e.loader = async () => {
    await load();
    if (buildOf(e.newDocument) !== buildOf(document)) e.preventDefault();
  };
});
document.addEventListener('astro:page-load', () => {
  navigating = false;
  if (lastNavType === 'replace') setTimeout(() => document.querySelectorAll('.astro-route-announcer').forEach((el) => el.remove()));
});
document.addEventListener('astro:before-swap', (e) => {
  e.viewTransition.skipTransition();
  e.viewTransition.ready.catch(() => {});
});

const bar = document.createElement('div');
bar.className = 'navprogress';
bar.setAttribute('aria-hidden', 'true');
document.documentElement.append(bar);
let shown = 0;
document.addEventListener('astro:before-preparation', (e) => {
  if (e.navigationType === 'replace') return;
  clearTimeout(shown);
  shown = window.setTimeout(() => bar.classList.add('navprogress--on'), 80);
});
const done = () => {
  clearTimeout(shown);
  if (!bar.classList.contains('navprogress--on')) return;
  bar.classList.add('navprogress--done');
  window.setTimeout(() => bar.classList.remove('navprogress--on', 'navprogress--done'), 250);
};
document.addEventListener('astro:after-swap', done);
window.addEventListener('pageshow', done);
