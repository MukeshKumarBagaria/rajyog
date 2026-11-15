'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { clearUnlocked, markUnlocked } from '@/lib/auth/lock';
import { requireUser } from '@/lib/auth/session';
import { publicEnv, isSupabaseConfigured } from '@/lib/env';
import { safeNextPath } from '@/lib/utils/redirect';
import { emailSchema, firstError, loginSchema, passwordSchema, pinSchema, fieldErrors } from '@/lib/validation/schemas';
import type { FormState } from './types';

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isSupabaseConfigured()) return { error: 'Supabase is not configured yet. See README → Setup.' };

  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    next: formData.get('next') ?? undefined,
  });
  if (!parsed.success) return { error: firstError(parsed.error), fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    const msg = error?.message?.toLowerCase() ?? '';
    if (msg.includes('banned')) return { error: 'This account has been deactivated. Contact the owner.' };
    if (msg.includes('rate')) return { error: 'Too many attempts. Please wait a minute and try again.' };
    return { error: 'Incorrect email or password.' };
  }

  const { data: profile } = await supabase.from('profiles').select('is_active').eq('id', data.user.id).maybeSingle();
  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    return { error: 'This account has been deactivated. Contact the owner.' };
  }

  // A fresh password sign-in also satisfies the optional PIN lock.
  await markUnlocked(data.user.id);
  redirect(safeNextPath(parsed.data.next));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearUnlocked();
  redirect('/login');
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/reset-password`,
  });
  // Same response whether or not the account exists (no account enumeration).
  return { ok: true, message: 'If an account exists for this email, a reset link is on its way.' };
}

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const parsed = passwordSchema.safeParse({ password: formData.get('password'), confirm: formData.get('confirm') });
  if (!parsed.success) return { error: firstError(parsed.error), fieldErrors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message.includes('different') ? 'Choose a password different from the current one.' : 'Could not update password. Please try again.' };

  if (formData.get('redirect') === '1') redirect('/');
  return { ok: true, message: 'Password updated.' };
}

export async function unlockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = pinSchema.safeParse({ pin: formData.get('pin') });
  if (!parsed.success) return { error: firstError(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('verify_app_pin', { p_pin: parsed.data.pin });
  if (error) return { error: 'Could not verify PIN. Please try again.' };

  const result = (data ?? {}) as { ok?: boolean; reason?: string; remaining_attempts?: number; locked_until?: string };
  if (result.ok) {
    await markUnlocked(user.id);
    redirect(safeNextPath(formData.get('next') as string | null));
  }
  if (result.reason === 'no_pin') {
    await markUnlocked(user.id);
    redirect('/');
  }
  if (result.reason === 'locked') {
    const until = result.locked_until ? new Date(result.locked_until) : null;
    const mins = until ? Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60000)) : 5;
    return { error: `Too many incorrect attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}, or sign in with your password.` };
  }
  return {
    error: `Incorrect PIN.${result.remaining_attempts ? ` ${result.remaining_attempts} attempt${result.remaining_attempts === 1 ? '' : 's'} left before a temporary lock.` : ''}`,
  };
}

/** Called by the inactivity timer. */
export async function lockAction(): Promise<void> {
  await clearUnlocked();
}
