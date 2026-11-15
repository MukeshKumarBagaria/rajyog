'use server';

import { revalidatePath } from 'next/cache';
import { actionContext, errorMessage } from '@/lib/auth/action-context';
import { firstError, noteSchema, uuid } from '@/lib/validation/schemas';
import type { ActionResult } from './types';

export async function toggleBookmarkAction(lectureId: string): Promise<ActionResult<{ bookmarked: boolean }>> {
  try {
    const id = uuid.parse(lectureId);
    const { supabase, userId } = await actionContext();
    const { data: existing } = await supabase.from('bookmarks').select('id').eq('lecture_id', id).maybeSingle();
    if (existing) {
      const { error } = await supabase.from('bookmarks').delete().eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from('bookmarks').insert({ lecture_id: id, user_id: userId });
      if (error) throw error;
    }
    revalidatePath('/library');
    return { ok: true, data: { bookmarked: !existing } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function saveNoteAction(input: {
  id?: string;
  lecture_id?: string | null;
  chapter_id?: string | null;
  title?: string;
  content: string;
}): Promise<ActionResult<{ id: string }>> {
  const parsed = noteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  try {
    const { supabase, userId } = await actionContext();
    const { id, ...values } = parsed.data;
    if (id) {
      const { error } = await supabase
        .from('personal_notes')
        .update({ title: values.title, content: values.content })
        .eq('id', id);
      if (error) throw error;
      revalidatePath('/library');
      return { ok: true, data: { id } };
    }
    const { data, error } = await supabase
      .from('personal_notes')
      .insert({
        user_id: userId,
        lecture_id: values.lecture_id ?? null,
        chapter_id: values.chapter_id ?? null,
        title: values.title,
        content: values.content,
      })
      .select('id')
      .single();
    if (error) throw error;
    revalidatePath('/library');
    return { ok: true, data: { id: data.id } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteNoteAction(noteId: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(noteId);
    const { supabase } = await actionContext();
    const { error } = await supabase.from('personal_notes').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/library');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
