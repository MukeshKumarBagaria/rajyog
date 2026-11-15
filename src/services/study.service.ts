import 'server-only';

import type { ServerSupabase } from '@/lib/supabase/server';
import { computeStreak, summarizeStudy, type DailyTotal } from '@/lib/analytics/study-stats';
import { daysAgoKey, todayKey } from '@/lib/utils/dates';
import type { Viewer } from '@/lib/auth/session';

export async function getDailyTotals(supabase: ServerSupabase, fromKey: string, toKey: string): Promise<DailyTotal[]> {
  const { data, error } = await supabase
    .from('study_daily_totals')
    .select('local_date, total_seconds, video_seconds, manual_seconds')
    .gte('local_date', fromKey)
    .lte('local_date', toKey)
    .order('local_date');
  if (error) throw error;
  return data ?? [];
}

export type StudyOverview = Awaited<ReturnType<typeof getStudyOverview>>;

/** Everything the Home + Focus screens need about study time, in the user's timezone. */
export async function getStudyOverview(supabase: ServerSupabase, viewer: Viewer) {
  const today = todayKey(viewer.timezone);
  const [totals, goalRes] = await Promise.all([
    getDailyTotals(supabase, daysAgoKey(today, 400), today),
    supabase.from('daily_goals').select('target_minutes, completed').eq('goal_date', today).maybeSingle(),
  ]);

  const targetMinutes = goalRes.data?.target_minutes ?? viewer.profile.daily_target_minutes;
  const minSeconds = viewer.settings.streak_min_minutes * 60;
  const summary = summarizeStudy(totals, today);
  const streak = computeStreak(totals, today, minSeconds);

  return {
    today,
    totals,
    summary,
    streak,
    targetMinutes,
    goalPercent: Math.min(100, (summary.today.total_seconds / (targetMinutes * 60)) * 100),
    streakMinMinutes: viewer.settings.streak_min_minutes,
  };
}

export async function getRecentSessions(supabase: ServerSupabase, limit = 10) {
  const { data } = await supabase
    .from('study_sessions')
    .select('id, session_type, study_type, start_time, end_time, duration_seconds, local_date, subjects(name), lectures(title)')
    .gt('duration_seconds', 0)
    .order('start_time', { ascending: false })
    .limit(limit);
  return data ?? [];
}
