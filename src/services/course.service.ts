import 'server-only';

import type { ServerSupabase } from '@/lib/supabase/server';
import type { ChapterRow, LectureRow, LectureStatus, SubjectRow } from '@/types/database';

export type SubjectWithProgress = SubjectRow & {
  totalLectures: number;
  completedLectures: number;
  inProgressLectures: number;
  totalChapters: number;
  completedChapters: number;
  percent: number;
};

export type CourseOverview = {
  subjects: SubjectWithProgress[];
  totalLectures: number;
  completedLectures: number;
  totalChapters: number;
  completedChapters: number;
  /** Equal-weight lecture completion, 0–100. Never derived from watch time. */
  percent: number;
};

const pct = (done: number, total: number) => (total > 0 ? (done / total) * 100 : 0);

export async function getCourseOverview(supabase: ServerSupabase): Promise<CourseOverview> {
  const [subjectsRes, summaryRes] = await Promise.all([
    supabase.from('subjects').select('*').eq('is_active', true).order('sort_order').order('name'),
    supabase.rpc('course_progress_summary'),
  ]);
  if (subjectsRes.error) throw subjectsRes.error;

  const summary = new Map((summaryRes.data ?? []).map((r) => [r.subject_id, r]));
  const subjects = (subjectsRes.data ?? []).map((s): SubjectWithProgress => {
    const r = summary.get(s.id);
    const totalLectures = r?.total_lectures ?? 0;
    const completedLectures = r?.completed_lectures ?? 0;
    return {
      ...s,
      totalLectures,
      completedLectures,
      inProgressLectures: r?.in_progress_lectures ?? 0,
      totalChapters: r?.total_chapters ?? 0,
      completedChapters: r?.completed_chapters ?? 0,
      percent: pct(completedLectures, totalLectures),
    };
  });

  const totalLectures = subjects.reduce((a, s) => a + s.totalLectures, 0);
  const completedLectures = subjects.reduce((a, s) => a + s.completedLectures, 0);
  return {
    subjects,
    totalLectures,
    completedLectures,
    totalChapters: subjects.reduce((a, s) => a + s.totalChapters, 0),
    completedChapters: subjects.reduce((a, s) => a + s.completedChapters, 0),
    percent: pct(completedLectures, totalLectures),
  };
}

export type ChapterWithProgress = ChapterRow & {
  totalLectures: number;
  completedLectures: number;
  inProgressLectures: number;
  totalSeconds: number;
  percent: number;
};

export async function getSubjectDetail(supabase: ServerSupabase, subjectId: string) {
  const { data: subject } = await supabase.from('subjects').select('*').eq('id', subjectId).eq('is_active', true).maybeSingle();
  if (!subject) return null;

  const { data: chapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .order('sort_order')
    .order('title');

  const chapterIds = (chapters ?? []).map((c) => c.id);
  const { data: lectures } = chapterIds.length
    ? await supabase.from('lectures').select('id, chapter_id, duration_seconds').in('chapter_id', chapterIds).eq('is_active', true)
    : { data: [] as Pick<LectureRow, 'id' | 'chapter_id' | 'duration_seconds'>[] };

  const lectureIds = (lectures ?? []).map((l) => l.id);
  const { data: progress } = lectureIds.length
    ? await supabase.from('lecture_progress').select('lecture_id, status').in('lecture_id', lectureIds)
    : { data: [] as { lecture_id: string; status: LectureStatus }[] };
  const statusOf = new Map((progress ?? []).map((p) => [p.lecture_id, p.status]));

  const chaptersWithProgress: ChapterWithProgress[] = (chapters ?? []).map((c) => {
    const ls = (lectures ?? []).filter((l) => l.chapter_id === c.id);
    const completed = ls.filter((l) => statusOf.get(l.id) === 'COMPLETED').length;
    return {
      ...c,
      totalLectures: ls.length,
      completedLectures: completed,
      inProgressLectures: ls.filter((l) => statusOf.get(l.id) === 'IN_PROGRESS').length,
      totalSeconds: ls.reduce((a, l) => a + (l.duration_seconds ?? 0), 0),
      percent: pct(completed, ls.length),
    };
  });

  const totalLectures = chaptersWithProgress.reduce((a, c) => a + c.totalLectures, 0);
  const completedLectures = chaptersWithProgress.reduce((a, c) => a + c.completedLectures, 0);

  return {
    subject,
    chapters: chaptersWithProgress,
    totalLectures,
    completedLectures,
    completedChapters: chaptersWithProgress.filter((c) => c.totalLectures > 0 && c.completedLectures === c.totalLectures).length,
    percent: pct(completedLectures, totalLectures),
  };
}

export type LectureListItem = Pick<LectureRow, 'id' | 'title' | 'description' | 'duration_seconds' | 'youtube_video_id' | 'video_provider' | 'sort_order'> & {
  status: LectureStatus;
  completionPercentage: number;
  lastWatchedAt: string | null;
  bookmarked: boolean;
};

export async function getChapterDetail(supabase: ServerSupabase, subjectId: string, chapterId: string) {
  const { data: chapter } = await supabase
    .from('chapters')
    .select('*, subjects!inner(id, name, is_active)')
    .eq('id', chapterId)
    .eq('subject_id', subjectId)
    .eq('is_active', true)
    .maybeSingle();
  if (!chapter || !chapter.subjects.is_active) return null;

  const lectures = await getChapterLectures(supabase, chapterId);
  const completed = lectures.filter((l) => l.status === 'COMPLETED').length;
  const lastWatched = lectures
    .filter((l) => l.lastWatchedAt)
    .sort((a, b) => (a.lastWatchedAt! < b.lastWatchedAt! ? 1 : -1))[0];

  return {
    chapter,
    subject: chapter.subjects,
    lectures,
    completed,
    percent: pct(completed, lectures.length),
    totalSeconds: lectures.reduce((a, l) => a + (l.duration_seconds ?? 0), 0),
    lastWatchedId: lastWatched?.id ?? null,
  };
}

async function getChapterLectures(supabase: ServerSupabase, chapterId: string): Promise<LectureListItem[]> {
  const { data: lectures } = await supabase
    .from('lectures')
    .select('id, title, description, duration_seconds, youtube_video_id, video_provider, sort_order')
    .eq('chapter_id', chapterId)
    .eq('is_active', true)
    .order('sort_order')
    .order('title');

  const ids = (lectures ?? []).map((l) => l.id);
  if (!ids.length) return [];

  const [progressRes, bookmarksRes] = await Promise.all([
    supabase.from('lecture_progress').select('lecture_id, status, completion_percentage, last_watched_at').in('lecture_id', ids),
    supabase.from('bookmarks').select('lecture_id').in('lecture_id', ids),
  ]);
  const progress = new Map((progressRes.data ?? []).map((p) => [p.lecture_id, p]));
  const bookmarked = new Set((bookmarksRes.data ?? []).map((b) => b.lecture_id));

  return (lectures ?? []).map((l) => {
    const p = progress.get(l.id);
    return {
      ...l,
      status: p?.status ?? 'NOT_STARTED',
      completionPercentage: Number(p?.completion_percentage ?? 0),
      lastWatchedAt: p?.last_watched_at ?? null,
      bookmarked: bookmarked.has(l.id),
    };
  });
}

export async function getLectureDetail(supabase: ServerSupabase, lectureId: string) {
  const { data: lecture } = await supabase
    .from('lectures')
    .select('*, chapters!inner(id, title, is_active, subject_id, subjects!inner(id, name, is_active))')
    .eq('id', lectureId)
    .eq('is_active', true)
    .maybeSingle();
  if (!lecture || !lecture.chapters.is_active || !lecture.chapters.subjects.is_active) return null;

  const chapter = lecture.chapters;
  const [siblings, progressRes, bookmarkRes, notesRes] = await Promise.all([
    getChapterLectures(supabase, chapter.id),
    supabase.from('lecture_progress').select('*').eq('lecture_id', lectureId).maybeSingle(),
    supabase.from('bookmarks').select('id, note').eq('lecture_id', lectureId).maybeSingle(),
    supabase.from('personal_notes').select('*').eq('lecture_id', lectureId).order('updated_at', { ascending: false }),
  ]);

  const idx = siblings.findIndex((l) => l.id === lectureId);
  const completed = siblings.filter((l) => l.status === 'COMPLETED').length;

  // Neighbouring lectures across chapter boundaries keep "next" useful at chapter ends.
  let next = idx >= 0 ? siblings[idx + 1] ?? null : null;
  let nextChapterTitle: string | null = null;
  if (!next) {
    const { data: nextChapters } = await supabase
      .from('chapters')
      .select('id, title, sort_order')
      .eq('subject_id', chapter.subject_id)
      .eq('is_active', true)
      .order('sort_order')
      .order('title');
    const cIdx = (nextChapters ?? []).findIndex((c) => c.id === chapter.id);
    for (const c of (nextChapters ?? []).slice(cIdx + 1)) {
      const { data: first } = await supabase
        .from('lectures')
        .select('id, title, description, duration_seconds, youtube_video_id, video_provider, sort_order')
        .eq('chapter_id', c.id)
        .eq('is_active', true)
        .order('sort_order')
        .order('title')
        .limit(1)
        .maybeSingle();
      if (first) {
        next = { ...first, status: 'NOT_STARTED', completionPercentage: 0, lastWatchedAt: null, bookmarked: false };
        nextChapterTitle = c.title;
        break;
      }
    }
  }

  return {
    lecture,
    chapter: { id: chapter.id, title: chapter.title, subjectId: chapter.subject_id },
    subject: { id: chapter.subjects.id, name: chapter.subjects.name },
    siblings,
    previous: idx > 0 ? siblings[idx - 1] : null,
    next,
    nextChapterTitle,
    chapterPercent: pct(completed, siblings.length),
    chapterCompleted: completed,
    progress: progressRes.data,
    bookmark: bookmarkRes.data,
    notes: notesRes.data ?? [],
  };
}
