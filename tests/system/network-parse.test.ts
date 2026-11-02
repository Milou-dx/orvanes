import { describe, expect, it } from 'vitest';
import { parseEstablished, parseRoutes } from '../../src/server/network/network.js';

describe('parseEstablished', () => {
  it('lit protocole, adresses et processus (absent sans droits)', () => {
    const out = [
      'tcp 0      0               10.0.0.61:50824          192.200.0.111:443',
      'tcp 0      0          100.64.0.1:4321          100.64.0.1:37122 users:(("node",pid=466657,fd=29))',
      '[::1]:5432',
      '',
    ].join('\n');
    expect(parseEstablished(out)).toEqual([
      { protocol: 'tcp', local: '10.0.0.61:50824', peer: '192.200.0.111:443', process: null, pid: null },
      { protocol: 'tcp', local: '100.64.0.1:4321', peer: '100.64.0.1:37122', process: 'node', pid: 466657 },
    ]);
  });
});

describe('parseRoutes', () => {
  it('extrait destination, passerelle, interface et lien coupé', () => {
    const out = 'default via 10.0.0.1 dev enp0s6 proto dhcp src 10.0.0.61 metric 100 \n172.17.0.0/16 dev docker0 proto kernel scope link src 172.17.0.1 linkdown\n';
    expect(parseRoutes(out)).toEqual([
      { dest: 'default', via: '10.0.0.1', dev: 'enp0s6', down: false },
      { dest: '172.17.0.0/16', via: null, dev: 'docker0', down: true },
    ]);
  });
});
