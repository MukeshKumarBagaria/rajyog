'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { actionContext, errorMessage } from '@/lib/auth/action-context';
import { getLockSecret, markUnlocked } from '@/lib/auth/lock';
import { fieldErrors, firstError, pinSetupSchema, preferencesSchema, profileSchema } from '@/lib/validation/schemas';
import type { ActionResult } from './types';

export async function updateProfileAction(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  try {
    const { supabase, userId } = await actionContext();
    const v = parsed.data;
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: v.full_name,
        exam_category: v.exam_category,
        target_exam_year: v.target_exam_year ?? null,
        timezone: v.timezone,
        daily_target_minutes: v.daily_target_minutes,
        language: v.language,
      })
      .eq('id', userId);
    if (error) throw error.code === '22023' ? new Error('Please choose a valid timezone.') : error;
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function updatePreferencesAction(input: z.input<typeof preferencesSchema>): Promise<ActionResult> {
  const parsed = preferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  try {
    const { supabase, userId } = await actionContext();
    const { error } = await supabase.from('user_settings').update(parsed.data).eq('user_id', userId);
    if (error) throw error;
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function setPinAction(pin: string, confirm: string): Promise<ActionResult> {
  const parsed = pinSetupSchema.safeParse({ pin, confirm });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  if (!getLockSecret()) return { ok: false, error: 'PIN lock needs APP_LOCK_SECRET (or SUPABASE_SECRET_KEY) configured on the server.' };
  try {
    const { supabase, userId } = await actionContext();
    const { error } = await supabase.rpc('set_app_pin', { p_pin: parsed.data.pin });
    if (error) throw error;
    await markUnlocked(userId); // don't lock the person who just set it
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function disablePinAction(): Promise<ActionResult> {
  try {
    const { supabase } = await actionContext();
    const { error } = await supabase.rpc('disable_app_pin');
    if (error) throw error;
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Stores the storage path of an uploaded avatar (must live in the user's own folder). */
export async function updateAvatarAction(path: string | null): Promise<ActionResult> {
  try {
    const { supabase, userId } = await actionContext();
    if (path !== null && !new RegExp(`^${userId}/[\\w.-]{1,100}$`).test(path)) throw new Error('Invalid avatar path');

    const { data: current } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single();
    const { error } = await supabase.from('profiles').update({ avatar_url: path }).eq('id', userId);
    if (error) throw error;
    if (current?.avatar_url && current.avatar_url !== path && current.avatar_url.startsWith(`${userId}/`)) {
      await supabase.storage.from('avatars').remove([current.avatar_url]);
    }
    revalidatePath('/', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
