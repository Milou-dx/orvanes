import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { allowError } from './firewall-check';

const run = promisify(execFile);
const IPT = '/usr/sbin/iptables';

interface Rule {
  num: number;
  spec: string;
  target: string;
  protocol: string | null;
  port: string | null;
  source: string | null;
  packets: number | null;
  bytes: number | null;
  protectedReason: string | null;
}

function protectionFor(spec: string, target: string): string | null {
  if (/-j\s+ts-input/.test(spec)) {
    return 'Chaîne Tailscale — c’est par elle que vous atteignez ce panel.';
  }
  if (/--state\s+RELATED,ESTABLISHED/i.test(spec) || /ctstate\s+RELATED,ESTABLISHED/i.test(spec)) {
    return 'Connexions déjà établies — la supprimer coupe toutes les sessions en cours.';
  }
  if (/--dport\s+22(\s|$)/.test(spec)) {
    return 'SSH — la supprimer te coupe l’accès à la machine.';
  }
  if (/-i\s+lo(\s|$)/.test(spec)) {
    return 'Boucle locale — de nombreux services en dépendent.';
  }
  if (target === 'REJECT' || target === 'DROP') {
    return 'Refus final — la supprimer ouvrirait tous les ports non filtrés.';
  }
  return null;
}

function parseSpec(spec: string) {
  const target = spec.match(/-j\s+(\S+)/)?.[1] ?? '';
  const protocol = spec.match(/-p\s+(\S+)/)?.[1] ?? null;
  const port = spec.match(/--dport\s+(\S+)/)?.[1] ?? null;
  const source = spec.match(/-s\s+(\S+)/)?.[1] ?? null;
  return { target, protocol, port, source };
}

export async function list(): Promise<Rule[]> {
  const [{ stdout: sOut }, { stdout: vOut }] = await Promise.all([
    run('sudo', ['-n', IPT, '-S', 'INPUT'], { timeout: 5000 }),
    run('sudo', ['-n', IPT, '-L', 'INPUT', '-n', '-v', '--line-numbers'], { timeout: 5000 }),
  ]);

  const counters = new Map<number, { packets: number; bytes: number }>();
  for (const line of vOut.split('\n')) {
    const m = line.match(/^\s*(\d+)\s+(\d+[KMG]?)\s+(\d+[KMG]?)\s/);
    if (!m) continue;
    const scale = (v: string) => {
      const mult = { K: 1e3, M: 1e6, G: 1e9 }[v.at(-1) as 'K' | 'M' | 'G'];
      return mult ? Math.round(parseFloat(v) * mult) : Number(v);
    };
    counters.set(Number(m[1]), { packets: scale(m[2]), bytes: scale(m[3]) });
  }

  const rules: Rule[] = [];
  let num = 0;
  for (const line of sOut.split('\n')) {
    if (!line.startsWith('-A INPUT')) continue;
    num += 1;
    const { target, protocol, port, source } = parseSpec(line);
    const c = counters.get(num);
    rules.push({
      num,
      spec: line,
      target,
      protocol,
      port,
      source,
      packets: c?.packets ?? null,
      bytes: c?.bytes ?? null,
      protectedReason: protectionFor(line, target),
    });
  }
  return rules;
}

export function denyPosition(rules: Rule[]): number | null {
  return rules.find((r) => (r.target === 'REJECT' || r.target === 'DROP') && !r.port && !r.source)?.num ?? null;
}

interface AddInput {
  protocol: 'tcp' | 'udp';
  port: string;
  source?: string | null;
  comment?: string | null;
}

export async function addAllow(input: AddInput): Promise<{ position: number }> {
  const { protocol, port } = input;
  const source = input.source?.trim() || null;

  const invalid = allowError(protocol, port, source);
  if (invalid) throw new Error(invalid);

  const rules = await list();
  if (rules.some((r) => r.target === 'ACCEPT' && r.protocol === protocol && r.port === port && (r.source ?? null) === source)) {
    throw new Error('Une règle identique existe déjà.');
  }

  const position = denyPosition(rules) ?? rules.length + 1;

  const args = ['-n', IPT, '-I', 'INPUT', String(position)];
  if (source) args.push('-s', source);
  args.push('-p', protocol, '-m', protocol, '--dport', port);
  args.push('-m', 'comment', '--comment', (input.comment || 'ajoutée depuis le panel').slice(0, 60));
  args.push('-j', 'ACCEPT');

  await run('sudo', args, { timeout: 8000 });
  return { position };
}

export async function remove(num: number): Promise<void> {
  if (!Number.isInteger(num) || num < 1) throw new Error('Numéro de règle invalide');
  const rules = await list();
  const rule = rules.find((r) => r.num === num);
  if (!rule) throw new Error('Règle introuvable — la liste a peut-être changé, recharge la page.');
  if (rule.protectedReason) throw new Error(rule.protectedReason);

  await run('sudo', ['-n', IPT, '-D', 'INPUT', String(num)], { timeout: 8000 });
}

export async function persist(): Promise<void> {
  await run('sudo', ['-n', '/usr/sbin/netfilter-persistent', 'save'], { timeout: 15000 });
}

export async function isDirty(): Promise<boolean> {
  try {
    const [{ stdout: live }, { stdout: saved }] = await Promise.all([
      run('sudo', ['-n', IPT + '-save'], { timeout: 5000 }),
      run('sudo', ['-n', '/bin/cat', '/etc/iptables/rules.v4'], { timeout: 5000 }),
    ]);
    const norm = (s: string) =>
      s
        .split('\n')
        .filter((l) => l.startsWith('-A') || l.startsWith(':') || l.startsWith('*'))
        .map((l) => l.replace(/\s*\[\d+:\d+\]\s*$/, ''))
        .join('\n');
    return norm(live) !== norm(saved);
  } catch {
    return false;
  }
}
