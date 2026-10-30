import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export function sha256(v: string) {
  return createHash('sha256').update(v).digest('hex');
}

export function hmacSha256(key: string, v: string) {
  return createHmac('sha256', key).update(v).digest('hex');
}

export function tokenHex(bytes = 8) {
  return randomBytes(bytes).toString('hex').toUpperCase();
}

export function uuid() {
  return randomUUID();
}

export function tokenUrl(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export function maskEmail(email: string) {
  const key = process.env.PROMO_HASH_SECRET || '';
  const v = email.trim().toLowerCase();
  return key ? hmacSha256(key, v) : sha256(v);
}
