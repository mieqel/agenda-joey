import { createHash, timingSafeEqual } from 'node:crypto';

const digest = (s: string) => createHash('sha256').update(s).digest();

/** Klopt de pincode voor deze gebruiker? Joey gebruikt OWNER_PIN als die is ingesteld. */
export function checkPin(pin: string, isOwner: boolean) {
  const expected = (isOwner && process.env.OWNER_PIN) || process.env.APP_PIN;
  if (!expected) throw new Error('APP_PIN is niet ingesteld');
  return timingSafeEqual(digest(pin), digest(expected));
}
