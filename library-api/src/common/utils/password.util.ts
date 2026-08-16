import { randomBytes } from 'crypto';

const CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const REQUIRED_SPECIAL = '!@#$%&*';

/**
 * Generates a cryptographically-random password that satisfies common
 * password policies:
 *  - at least one uppercase, lowercase, digit and special character
 *  - default length of 12 (rejects visually-confusing chars like 0/O/1/l)
 * Used when auto-creating a student login at admission time.
 */
export function generateRandomPassword(length = 12): string {
  const pool = CHARACTERS + REQUIRED_SPECIAL;
  const rand = (max: number) => randomBytes(1).readUInt8(0) % max;

  const chars: string[] = [];
  // Guarantee one of each required character class.
  chars.push('ABCDEFGHJKLMNPQRSTUVWXYZ'[rand(24)]);
  chars.push('abcdefghijkmnopqrstuvwxyz'[rand(24)]);
  chars.push('23456789'[rand(8)]);
  chars.push(REQUIRED_SPECIAL[rand(REQUIRED_SPECIAL.length)]);

  while (chars.length < length) {
    chars.push(pool[rand(pool.length)]);
  }

  // Shuffle so the required characters aren't always in the first 4 slots.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}
