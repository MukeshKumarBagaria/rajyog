import 'server-only';

import { cookies } from 'next/headers';
import { signUnlockToken, verifyUnlockToken } from './lock-token';
import { UNLOCK_COOKIE } from '@/constants/app';
import { supabaseSecretKey } from '@/lib/env';

/** Secret for signing the unlock cookie. PIN lock is unavailable without one. */
export function getLockSecret(): string | null {
  return process.env.APP_LOCK_SECRET || supabaseSecretKey() || null;
}

export async function isUnlocked(userId: string): Promise<boolean> {
  const secret = getLockSecret();
  if (!secret) return true; // feature not configured → never lock users out
  const store = await cookies();
  return verifyUnlockToken(store.get(UNLOCK_COOKIE)?.value, userId, secret);
}

/** Marks this browser session as unlocked (session cookie: relocks on browser restart). */
export async function markUnlocked(userId: string): Promise<void> {
  const secret = getLockSecret();
  if (!secret) return;
  const store = await cookies();
  store.set(UNLOCK_COOKIE, await signUnlockToken(userId, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
}

export async function clearUnlocked(): Promise<void> {
  const store = await cookies();
  store.delete(UNLOCK_COOKIE);
}
