import { createHash, randomBytes } from 'node:crypto';

/** SHA-256 hex — used to store opaque tokens (refresh, reset, invite) at rest. */
export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** High-entropy opaque token returned to the client (raw), stored hashed. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}
