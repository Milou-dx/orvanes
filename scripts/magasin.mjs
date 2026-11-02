#!/usr/bin/env node
import { listSources, publish, publishConfig } from '../src/server/modules/store-publish.js';

const [cmd, ...args] = process.argv.slice(2);
const cfg = publishConfig();
if (!cfg.enabled) {
  console.error('Publication non configurée : définir ORVANE_MAGASIN_SOURCES et ORVANE_MAGASIN_PUBLIC (dossiers existants) et une clé privée lisible.');
  process.exit(1);
}
const sources = listSources(cfg);
if (cmd === 'liste') {
  for (const s of sources) console.log(`${s.id.padEnd(20)} ${s.version.padEnd(9)} publié : ${s.published ?? '—'}${s.errors.length ? `  (invalide : ${s.errors.join(' ; ')})` : ''}`);
} else if (cmd === 'publier') {
  const ids = args.includes('--tous') ? sources.map((s) => s.id) : args;
  if (!ids.length) { console.error('Indiquez une intégration, ou --tous.'); process.exit(1); }
  let failed = 0;
  for (const id of ids) {
    try {
      const r = await publish(id, cfg);
      console.log(`${r.id} ${r.version} : ${r.changed ? 'publié' : 'déjà publié, inchangé'} (${r.sha256.slice(0, 12)})`);
    } catch (e) { failed++; console.error(`${id} : ${e.message}`); }
  }
  process.exit(failed ? 1 : 0);
} else {
  console.error('Usage : npm run magasin -- liste | publier <id>… | publier --tous');
  process.exit(1);
}
