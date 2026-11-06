export const stringPaths = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((p) => typeof p === 'string') : [];

/** Applique `operation` à chaque chemin ; un échec n'arrête pas les suivants. */
export async function forEachPath(paths: string[], operation: (path: string) => Promise<unknown>, reason: (e: any) => string) {
  const done: string[] = [];
  const errors: string[] = [];
  for (const p of paths) {
    try {
      await operation(p);
      done.push(p);
    } catch (e: any) {
      errors.push(`${p.split('/').pop() || p} : ${reason(e)}`);
    }
  }
  return { done, errors, status: errors.length && !done.length ? 400 : 200 };
}
