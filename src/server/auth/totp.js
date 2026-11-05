// Double authentification TOTP (RFC 6238 : SHA-1, 6 chiffres, 30 s), compatible avec les applis courantes.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function newSecret() {
  let bits = '';
  for (const b of randomBytes(20)) bits += b.toString(2).padStart(8, '0');
  return bits.match(/.{5}/g).map((c) => B32[parseInt(c, 2)]).join('');
}

function decode(secret) {
  let bits = '';
  for (const c of secret) bits += B32.indexOf(c).toString(2).padStart(5, '0');
  return Buffer.from(bits.match(/.{8}/g).map((b) => parseInt(b, 2)));
}

export function codeAt(secret, step) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(step));
  const h = createHmac('sha1', decode(secret)).update(msg).digest();
  const o = h[19] & 15;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

/** Renvoie le pas accepté (±30 s de dérive), ou null. Un pas déjà utilisé (lastStep) est refusé : pas de rejeu. */
export function verifyCode(secret, code, lastStep = -1, now = Date.now()) {
  const given = Buffer.from(String(code ?? '').replace(/\s/g, ''));
  if (given.length !== 6) return null;
  const current = Math.floor(now / 30_000);
  for (const step of [current - 1, current, current + 1]) {
    if (step > lastStep && timingSafeEqual(given, Buffer.from(codeAt(secret, step)))) return step;
  }
  return null;
}

export const otpauthUri = (secret, account, issuer) =>
  `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
