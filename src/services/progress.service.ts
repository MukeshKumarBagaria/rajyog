import 'server-only';

import type { ServerSupabase } from '@/lib/supabase/server';

export type ContinueItem = {
  lectureId: string;
  lectureTitle: string;
  chapterId: string;
  chapterTitle: string;
  subjectId: string;
  subjectName: string;
  youtubeVideoId: string;
  durationSeconds: number | null;
  positionSeconds: number;
  percent: number;
  status: string;
  lastWatchedAt: string | null;
};

/** Most recently watched lectures (unfinished first). */
export async function getContinueLearning(supabase: ServerSupabase, limit = 4): Promise<ContinueItem[]> {
  const { data } = await supabase
    .from('lecture_progress')
    .select(
      'lecture_id, last_position_seconds, completion_percentage, status, last_watched_at, lectures!inner(id, title, youtube_video_id, duration_seconds, is_active, chapters!inner(id, title, is_active, subjects!inner(id, name, is_active)))',
    )
    .not('last_watched_at', 'is', null)
    .order('last_watched_at', { ascending: false })
    .limit(12);

  const items = (data ?? [])
    .filter((p) => p.lectures.is_active && p.lectures.chapters.is_active && p.lectures.chapters.subjects.is_active)
    .map(
      (p): ContinueItem => ({
        lectureId: p.lecture_id,
        lectureTitle: p.lectures.title,
        chapterId: p.lectures.chapters.id,
        chapterTitle: p.lectures.chapters.title,
        subjectId: p.lectures.chapters.subjects.id,
        subjectName: p.lectures.chapters.subjects.name,
        youtubeVideoId: p.lectures.youtube_video_id,
        durationSeconds: p.lectures.duration_seconds,
        positionSeconds: p.last_position_seconds,
        percent: Number(p.completion_percentage),
        status: p.status,
        lastWatchedAt: p.last_watched_at,
      }),
    );

  // Unfinished lectures first, keeping recency order within each group.
  return [...items.filter((i) => i.status !== 'COMPLETED'), ...items.filter((i) => i.status === 'COMPLETED')].slice(0, limit);
}
