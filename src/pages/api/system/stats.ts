import type { APIRoute } from 'astro';
import * as sys from '../../../server/system/system.js';
import { safe } from '../../../server/core/safe';

export const prerender = false;

export const GET: APIRoute = async () => {
  const [cpuPercent, perCore, mem, disks, diskIo, net, load] = await Promise.all([
    safe(() => sys.getCpuPercent(), null),
    safe(() => sys.getCpuPerCorePercent(), [] as (number | null)[]),
    safe(() => sys.getMemory(), null),
    safe(() => sys.getDisks(), [] as any[]),
    safe(() => sys.getDiskIoRates(), { readBytesPerSec: 0, writeBytesPerSec: 0 }),
    safe(() => sys.getNetTraffic(), { totals: {}, rates: {} } as any),
    safe(() => sys.getLoadAverage(), null),
  ]);

  const rates = (net?.rates ?? {}) as Record<string, { rxBytesPerSec: number; txBytesPerSec: number }>;
  const netTotal = Object.values(rates).reduce(
    (acc, r) => ({ rx: acc.rx + r.rxBytesPerSec, tx: acc.tx + r.txBytesPerSec }),
    { rx: 0, tx: 0 },
  );

  const body = {
    at: Date.now(),
    cpu: { percent: cpuPercent, perCore },
    memory: mem,
    disks,
    diskIo,
    network: { rxBytesPerSec: netTotal.rx, txBytesPerSec: netTotal.tx },
    load,
  };

  return new Response(JSON.stringify(body), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
