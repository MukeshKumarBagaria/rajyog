'use server';

import { revalidatePath } from 'next/cache';
import { adminActionContext, errorMessage } from '@/lib/auth/action-context';
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin';
import { publicEnv } from '@/lib/env';
import {
  chapterSchema,
  createUserSchema,
  cutoffSchema,
  fieldErrors,
  firstError,
  lectureSchema,
  quoteSchema,
  slugify,
  subjectSchema,
  uuid,
} from '@/lib/validation/schemas';
import { parseBulkLectures, parseDurationInput, parseVideoId } from '@/lib/youtube/video-id';
import type { ActionResult } from './types';

/*
 * Every action re-verifies the caller is an administrator (is_admin()), and
 * the database enforces the same rule again through RLS. User provisioning
 * additionally uses the service-role key, which never leaves the server.
 */

type ContentTable = 'subjects' | 'chapters' | 'lectures' | 'motivational_quotes';
const CONTENT_TABLES: ContentTable[] = ['subjects', 'chapters', 'lectures', 'motivational_quotes'];

const bool = (v: FormDataEntryValue | null) => v === 'on' || v === 'true' || v === '1';
const str = (v: FormDataEntryValue | null) => (typeof v === 'string' ? v : undefined);

function refresh() {
  revalidatePath('/admin', 'layout');
  revalidatePath('/courses', 'layout');
  revalidatePath('/');
}

function dbError(e: unknown): string {
  const msg = errorMessage(e);
  if (msg.includes('duplicate key') && msg.includes('slug')) return 'A subject with this slug already exists.';
  if (msg.includes('duplicate key')) return 'A record with these details already exists.';
  return msg;
}

/* ── Generic ───────────────────────────────────────────────────────────── */

export async function setActiveAction(table: ContentTable, id: string, active: boolean): Promise<ActionResult> {
  try {
    if (!CONTENT_TABLES.includes(table)) throw new Error('Unknown table');
    const { supabase } = await adminActionContext();
    const { error } = await supabase.from(table).update({ is_active: active }).eq('id', uuid.parse(id));
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: dbError(e) };
  }
}

export async function deleteContentAction(table: ContentTable | 'historical_cutoffs', id: string): Promise<ActionResult> {
  try {
    if (![...CONTENT_TABLES, 'historical_cutoffs'].includes(table)) throw new Error('Unknown table');
    const { supabase } = await adminActionContext();
    const { error } = await supabase.from(table).delete().eq('id', uuid.parse(id));
    if (error) throw error;
    refresh();
    revalidatePath('/analysis', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: dbError(e) };
  }
}

/* ── Subjects ──────────────────────────────────────────────────────────── */

export async function saveSubjectAction(formData: FormData): Promise<ActionResult> {
  const parsed = subjectSchema.safeParse({
    id: str(formData.get('id')) || undefined,
    name: formData.get('name'),
    slug: str(formData.get('slug')),
    description: str(formData.get('description')),
    syllabus_stage: formData.get('syllabus_stage'),
    sort_order: formData.get('sort_order') || 0,
    is_active: bool(formData.get('is_active')),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  try {
    const { supabase } = await adminActionContext();
    const { id, ...v } = parsed.data;
    const values = { ...v, slug: v.slug || slugify(v.name) };
    const { error } = id ? await supabase.from('subjects').update(values).eq('id', id) : await supabase.from('subjects').insert(values);
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: dbError(e) };
  }
}

/* ── Chapters ──────────────────────────────────────────────────────────── */

export async function saveChapterAction(formData: FormData): Promise<ActionResult> {
  const parsed = chapterSchema.safeParse({
    id: str(formData.get('id')) || undefined,
    subject_id: formData.get('subject_id'),
    title: formData.get('title'),
    description: str(formData.get('description')),
    sort_order: formData.get('sort_order') || 0,
    is_active: bool(formData.get('is_active')),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  try {
    const { supabase } = await adminActionContext();
    const { id, ...values } = parsed.data;
    const { error } = id ? await supabase.from('chapters').update(values).eq('id', id) : await supabase.from('chapters').insert(values);
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: dbError(e) };
  }
}

/* ── Lectures ──────────────────────────────────────────────────────────── */

export async function saveLectureAction(formData: FormData): Promise<ActionResult> {
  const parsed = lectureSchema.safeParse({
    id: str(formData.get('id')) || undefined,
    chapter_id: formData.get('chapter_id'),
    title: formData.get('title'),
    description: str(formData.get('description')),
    video: formData.get('video'),
    duration: str(formData.get('duration')),
    sort_order: formData.get('sort_order') || 0,
    completion_threshold: formData.get('completion_threshold') || 90,
    is_active: bool(formData.get('is_active')),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: fieldErrors(parsed.error) };

  const videoId = parseVideoId(parsed.data.video);
  if (!videoId) return { ok: false, error: 'That is not a valid YouTube URL or 11-character video ID.', fieldErrors: { video: ['Invalid YouTube video'] } };
  const duration = parsed.data.duration ? parseDurationInput(parsed.data.duration) : null;
  if (parsed.data.duration && duration === null) return { ok: false, error: 'Use a duration like 45:30 or 1:02:03.', fieldErrors: { duration: ['Invalid duration'] } };

  try {
    const { supabase } = await adminActionContext();
    const { id, video: _video, duration: _d, completion_threshold, ...rest } = parsed.data;
    const values = {
      ...rest,
      youtube_video_id: videoId,
      duration_seconds: duration,
      completion_threshold: completion_threshold / 100,
    };
    const { error } = id ? await supabase.from('lectures').update(values).eq('id', id) : await supabase.from('lectures').insert(values);
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: dbError(e) };
  }
}

export async function bulkImportLecturesAction(chapterId: string, text: string): Promise<ActionResult<{ imported: number; errors: { line: number; message: string }[] }>> {
  try {
    const chapter = uuid.parse(chapterId);
    const { items, errors } = parseBulkLectures(text);
    if (!items.length) return { ok: false, error: errors.length ? `Nothing imported. Line ${errors[0].line}: ${errors[0].message}` : 'Paste at least one line.' };
    if (items.length > 200) return { ok: false, error: 'Import at most 200 lectures at a time.' };

    const { supabase } = await adminActionContext();
    const { data: last } = await supabase.from('lectures').select('sort_order').eq('chapter_id', chapter).order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const base = (last?.sort_order ?? 0) + 1;

    const { error } = await supabase.from('lectures').insert(
      items.map((it, i) => ({
        chapter_id: chapter,
        title: it.title,
        youtube_video_id: it.videoId,
        duration_seconds: it.durationSeconds,
        sort_order: base + i,
      })),
    );
    if (error) throw error;
    refresh();
    return { ok: true, data: { imported: items.length, errors } };
  } catch (e) {
    return { ok: false, error: dbError(e) };
  }
}

/** Swaps sort order with the neighbouring lecture (direction -1 = up, 1 = down). */
export async function moveLectureAction(lectureId: string, direction: -1 | 1): Promise<ActionResult> {
  try {
    const id = uuid.parse(lectureId);
    const { supabase } = await adminActionContext();
    const { data: lecture } = await supabase.from('lectures').select('id, chapter_id, sort_order').eq('id', id).single();
    if (!lecture) throw new Error('Lecture not found');
    const { data: siblings } = await supabase
      .from('lectures')
      .select('id, sort_order')
      .eq('chapter_id', lecture.chapter_id)
      .order('sort_order')
      .order('title');
    const list = siblings ?? [];
    const idx = list.findIndex((l) => l.id === id);
    const swap = list[idx + direction];
    if (!swap) return { ok: true };
    // Normalise ordering to the current index, then swap the two.
    const reordered = list.map((l, i) => ({ id: l.id, sort_order: i + 1 }));
    reordered[idx].sort_order = idx + direction + 1;
    reordered[idx + direction].sort_order = idx + 1;
    for (const r of reordered) {
      const { error } = await supabase.from('lectures').update({ sort_order: r.sort_order }).eq('id', r.id);
      if (error) throw error;
    }
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: dbError(e) };
  }
}

/* ── Quotes ────────────────────────────────────────────────────────────── */

export async function saveQuoteAction(formData: FormData): Promise<ActionResult> {
  const parsed = quoteSchema.safeParse({
    id: str(formData.get('id')) || undefined,
    quote: formData.get('quote'),
    language: formData.get('language'),
    attribution: str(formData.get('attribution')),
    category: formData.get('category'),
    is_active: bool(formData.get('is_active')),
    display_date: str(formData.get('display_date')) ?? '',
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  try {
    const { supabase } = await adminActionContext();
    const { id, ...values } = parsed.data;
    const { error } = id
      ? await supabase.from('motivational_quotes').update(values).eq('id', id)
      : await supabase.from('motivational_quotes').insert(values);
    if (error) throw error;
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: dbError(e) };
  }
}

/* ── Cutoffs ───────────────────────────────────────────────────────────── */

export async function saveCutoffAction(formData: FormData): Promise<ActionResult> {
  const parsed = cutoffSchema.safeParse({
    id: str(formData.get('id')) || undefined,
    exam_year: formData.get('exam_year'),
    exam_stage: formData.get('exam_stage'),
    category: formData.get('category'),
    cutoff_marks: formData.get('cutoff_marks'),
    total_marks: formData.get('total_marks'),
    cutoff_type: formData.get('cutoff_type'),
    exam_pattern_version: formData.get('exam_pattern_version') || 'current',
    source_url: formData.get('source_url'),
    verified_at: str(formData.get('verified_at')) ?? '',
    notes: str(formData.get('notes')),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  try {
    const { supabase } = await adminActionContext();
    const { id, verified_at, ...rest } = parsed.data;
    const values = { ...rest, verified_at: verified_at ? new Date(`${verified_at}T00:00:00Z`).toISOString() : null };
    const { error } = id ? await supabase.from('historical_cutoffs').update(values).eq('id', id) : await supabase.from('historical_cutoffs').insert(values);
    if (error) throw error;
    refresh();
    revalidatePath('/analysis', 'layout');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: dbError(e) };
  }
}

/* ── Users (service role, server only) ─────────────────────────────────── */

export async function createUserAction(formData: FormData): Promise<ActionResult<{ message: string }>> {
  const parsed = createUserSchema.safeParse({
    email: formData.get('email'),
    full_name: formData.get('full_name'),
    mode: formData.get('mode'),
    password: str(formData.get('password')),
    exam_category: str(formData.get('exam_category')),
    make_admin: bool(formData.get('make_admin')),
  });
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;
  if (v.mode === 'password' && (!v.password || v.password.length < 8)) {
    return { ok: false, error: 'Temporary password must be at least 8 characters.', fieldErrors: { password: ['At least 8 characters'] } };
  }

  try {
    await adminActionContext();
    if (!hasServiceRole()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server.');
    const admin = createAdminClient();

    let userId: string;
    if (v.mode === 'invite') {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(v.email, {
        data: { full_name: v.full_name },
        redirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/reset-password`,
      });
      if (error) throw error;
      userId = data.user.id;
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email: v.email,
        password: v.password,
        email_confirm: true,
        user_metadata: { full_name: v.full_name },
      });
      if (error) throw error;
      userId = data.user.id;
    }

    await admin.from('profiles').upsert({ id: userId, full_name: v.full_name, exam_category: v.exam_category || 'GEN' });
    if (v.make_admin) await admin.from('app_admins').upsert({ user_id: userId });

    revalidatePath('/admin/users');
    return {
      ok: true,
      data: {
        message:
          v.mode === 'invite'
            ? `Invitation sent to ${v.email}.`
            : `Account created. Share the temporary password with ${v.full_name} privately and ask them to change it in Settings.`,
      },
    };
  } catch (e) {
    const msg = errorMessage(e);
    return { ok: false, error: msg.includes('already') ? 'An account with this email already exists.' : msg };
  }
}

export async function setUserActiveAction(userId: string, active: boolean): Promise<ActionResult> {
  try {
    const id = uuid.parse(userId);
    const ctx = await adminActionContext();
    if (id === ctx.userId) throw new Error('You cannot deactivate your own account.');
    if (!hasServiceRole()) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server.');
    const admin = createAdminClient();
    const { error: banError } = await admin.auth.admin.updateUserById(id, { ban_duration: active ? 'none' : '876000h' });
    if (banError) throw banError;
    const { error } = await admin.from('profiles').update({ is_active: active }).eq('id', id);
    if (error) throw error;
    revalidatePath('/admin/users');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
