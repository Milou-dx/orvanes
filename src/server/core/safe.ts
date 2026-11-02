export function safe<T>(fn: () => T | Promise<T>, fallback: T): Promise<T> {
  return Promise.resolve()
    .then(fn)
    .then((v) => (v === undefined || v === null ? fallback : v))
    .catch(() => fallback);
}
