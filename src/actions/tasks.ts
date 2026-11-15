'use server';

import { revalidatePath } from 'next/cache';
import { actionContext, errorMessage } from '@/lib/auth/action-context';
import { firstError, taskSchema, uuid } from '@/lib/validation/schemas';
import type { ActionResult } from './types';

export async function createTaskAction(input: { title: string; subject_id?: string | null; due_date: string }): Promise<ActionResult> {
  const parsed = taskSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, userId } = await actionContext();
    const { error } = await supabase.from('daily_tasks').insert({ ...parsed.data, subject_id: parsed.data.subject_id || null, user_id: userId });
    if (error) throw error;
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function toggleTaskAction(taskId: string, completed: boolean): Promise<ActionResult> {
  try {
    const id = uuid.parse(taskId);
    const { supabase } = await actionContext();
    const { error } = await supabase
      .from('daily_tasks')
      .update({ is_completed: completed, completed_at: completed ? new Date().toISOString() : null })
      .eq('id', id);
    if (error) throw error;
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteTaskAction(taskId: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(taskId);
    const { supabase } = await actionContext();
    const { error } = await supabase.from('daily_tasks').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

/** Moves an overdue task to today. */
export async function rescheduleTaskAction(taskId: string, dueDate: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(taskId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) throw new Error('Invalid date');
    const { supabase } = await actionContext();
    const { error } = await supabase.from('daily_tasks').update({ due_date: dueDate }).eq('id', id);
    if (error) throw error;
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
