'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { actionContext, errorMessage } from '@/lib/auth/action-context';
import { firstError, focusSessionSchema, uuid } from '@/lib/validation/schemas';
import type { ActionResult } from './types';

export async function saveFocusSessionAction(input: z.input<typeof focusSessionSchema>): Promise<ActionResult> {
  const parsed = focusSessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const s = parsed.data;
  try {
    const { supabase } = await actionContext();
    const { error } = await supabase.rpc('save_focus_session', {
      p_id: s.id,
      p_session_type: s.session_type,
      p_start: s.start,
      p_end: s.end,
      p_duration: s.duration_seconds,
      p_subject_id: s.subject_id,
      p_study_type: s.study_type,
      p_notes: s.notes ?? null,
    });
    if (error) {
      if (error.code === '22023') return { ok: false, error: 'This session could not be verified (time range invalid or too old).' };
      throw error;
    }
    revalidatePath('/focus');
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function setDailyGoalAction(dateKey: string, minutes: number): Promise<ActionResult> {
  const parsed = z
    .object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), minutes: z.number().int().min(10).max(1440) })
    .safeParse({ date: dateKey, minutes });
  if (!parsed.success) return { ok: false, error: 'Choose a goal between 10 minutes and 24 hours.' };
  try {
    const { supabase } = await actionContext();
    const { error } = await supabase.rpc('set_daily_goal', { p_date: parsed.data.date, p_target_minutes: parsed.data.minutes });
    if (error) throw error;
    revalidatePath('/focus');
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Removes a mistaken manual/pomodoro session (video sessions are system-recorded). */
export async function deleteSessionAction(sessionId: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(sessionId);
    const { supabase } = await actionContext();
    const { error } = await supabase.from('study_sessions').delete().eq('id', id).neq('session_type', 'VIDEO');
    if (error) throw error;
    revalidatePath('/focus');
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
