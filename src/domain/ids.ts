import { randomBytes } from "node:crypto";

// Crockford base32, as used by ULID: time-sortable ids without a dependency.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function ulid(now: number = Date.now()): string {
  let time = "";
  let t = now;
  for (let i = 0; i < 10; i++) {
    time = ALPHABET[t % 32] + time;
    t = Math.floor(t / 32);
  }
  const bytes = randomBytes(16);
  let rand = "";
  for (let i = 0; i < 16; i++) rand += ALPHABET[bytes[i]! % 32];
  return time + rand;
}

export const newId = (prefix: "ev" | "cl" | "prop", now?: number) => `${prefix}_${ulid(now)}`;
