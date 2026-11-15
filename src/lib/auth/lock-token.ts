/**
 * Signed "unlocked" token for the optional PIN lock (HMAC-SHA256, Web Crypto,
 * works in Node and edge runtimes). Format: `<userId>.<issuedAtMs>.<sig>`.
 * The token proves that this browser session passed PIN (or password)
 * verification for this user. It is stored as an httpOnly session cookie.
 */

const encoder = new TextEncoder();
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(data)));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signUnlockToken(userId: string, secret: string, issuedAt: number = Date.now()): Promise<string> {
  const payload = `${userId}.${issuedAt}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function verifyUnlockToken(
  token: string | undefined | null,
  userId: string,
  secret: string,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tokenUser, issuedRaw, sig] = parts;
  const issuedAt = Number(issuedRaw);
  if (tokenUser !== userId || !Number.isFinite(issuedAt)) return false;
  if (issuedAt > now + 60_000 || now - issuedAt > MAX_AGE_MS) return false;
  const expected = await hmac(secret, `${tokenUser}.${issuedRaw}`);
  return timingSafeEqual(sig, expected);
}
