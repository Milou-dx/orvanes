function searchTarget() { return document.querySelector<HTMLInputElement>('[data-search-target]'); }
export function pushSearch(v: string) {
  const t = searchTarget();
  if (!t || t.value === v) return;
  t.value = v;
  t.dispatchEvent(new Event('input', { bubbles: true }));
}

export function focusSearch(): boolean {
  const box = searchTarget();
  if (!box || box.type === 'hidden' || box.offsetParent === null) return false;
  box.focus();
  box.select();
  return true;
}

document.addEventListener('astro:page-load', () => {
  const v = new URL(location.href).searchParams.get('q');
  if (v) setTimeout(() => pushSearch(v), 0);
});
