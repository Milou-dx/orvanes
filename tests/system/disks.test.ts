import { describe, expect, it } from 'vitest';
import { diskLabel, parseMounts } from '../../src/server/system/system.js';

const MOUNTS = [
  'udev /dev devtmpfs rw 0 0',
  '/dev/sdb1 / ext4 rw 0 0',
  '/dev/loop0 /snap/core24/1 squashfs ro 0 0',
  '/dev/sdb16 /boot ext4 rw 0 0',
  '/dev/sdb15 /boot/efi vfat rw 0 0',
  '/dev/sda1 /srv/stockage ext4 rw 0 0',
  '/dev/sda1 /srv/stockage/jeux ext4 rw 0 0',
  '/dev/sdc1 /media/mon\\040disque ext4 rw 0 0',
  'tmpfs /run tmpfs rw 0 0',
].join('\n');

describe('systèmes de fichiers listés', () => {
  it('garde les périphériques bloc, sans amorçage, snap ni doublon', () => {
    expect(parseMounts(MOUNTS)).toEqual(['/', '/media/mon disque', '/srv/stockage']);
  });

  it('libellé générique', () => {
    expect(diskLabel('/')).toBe('Disque système');
    expect(diskLabel('/srv/stockage')).toBe('/srv/stockage');
  });
});
