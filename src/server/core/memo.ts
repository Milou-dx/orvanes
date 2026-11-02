import { stat, readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

interface Entry<T> {
  value: T;
  at: number;
  stamp: string | null;
  inflight: Promise<T> | null;
}

const store = new Map<string, Entry<unknown>>();

interface MemoOptions {
  ttlMs: number;
  stamp?: () => Promise<string | null>;
  persist?: boolean;
  swr?: boolean;
}

const DISK_DIR = path.resolve('.cache/memo');

async function readDisk<T>(key: string): Promise<Entry<T> | null> {
  try {
    const raw = await readFile(path.join(DISK_DIR, `${key}.json`), 'utf8');
    const d = JSON.parse(raw);
    return { value: d.value as T, at: d.at ?? 0, stamp: d.stamp ?? null, inflight: null };
  } catch {
    return null;
  }
}

async function writeDisk(key: string, value: unknown, stamp: string | null): Promise<void> {
  try {
    await mkdir(DISK_DIR, { recursive: true });
    await writeFile(
      path.join(DISK_DIR, `${key}.json`),
      JSON.stringify({ value, at: Date.now(), stamp }),
    );
  } catch {
  }
}

export async function memo<T>(
  key: string,
  fn: () => Promise<T>,
  opts: MemoOptions,
): Promise<T> {
  let hit = store.get(key) as Entry<T> | undefined;

  if (!hit && opts.persist) {
    const fromDisk = await readDisk<T>(key);
    if (fromDisk) { store.set(key, fromDisk); hit = fromDisk; }
  }

  if (hit?.inflight) return opts.swr && hit.at > 0 ? hit.value : hit.inflight;

  const stamp = opts.stamp ? await opts.stamp().catch(() => null) : null;
  const fresh = hit
    && (opts.persist && stamp !== null
        ? hit.stamp === stamp
        : Date.now() - hit.at < opts.ttlMs && (stamp === null || hit.stamp === stamp));
  if (fresh) return hit!.value;

  const inflight = fn()
    .then((value) => {
      store.set(key, { value, at: Date.now(), stamp, inflight: null });
      if (opts.persist) void writeDisk(key, value, stamp);
      return value;
    })
    .catch((err) => {
      const prev = store.get(key) as Entry<T> | undefined;
      if (prev) { prev.inflight = null; return prev.value; }
      store.delete(key);
      throw err;
    });

  store.set(key, {
    value: hit?.value as T,
    at: hit?.at ?? 0,
    stamp: hit?.stamp ?? null,
    inflight,
  });
  if (opts.swr && hit && hit.at > 0) {
    inflight.catch(() => {});
    return hit.value;
  }
  return inflight;
}

export function dirStamp(path: string): () => Promise<string | null> {
  return async () => {
    try {
      const s = await stat(path);
      return `${s.mtimeMs}`;
    } catch {
      return null;
    }
  };
}
