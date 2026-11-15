import 'server-only';

import type { ServerSupabase } from '@/lib/supabase/server';

export type TaskItem = {
  id: string;
  title: string;
  due_date: string;
  is_completed: boolean;
  subject_id: string | null;
  subjectName: string | null;
  overdue: boolean;
};

/** Today's tasks plus unfinished overdue ones. */
export async function getTodayTasks(supabase: ServerSupabase, today: string): Promise<TaskItem[]> {
  const [dueToday, overdue] = await Promise.all([
    supabase.from('daily_tasks').select('id, title, due_date, is_completed, subject_id, subjects(name)').eq('due_date', today).order('created_at'),
    supabase
      .from('daily_tasks')
      .select('id, title, due_date, is_completed, subject_id, subjects(name)')
      .lt('due_date', today)
      .eq('is_completed', false)
      .order('due_date')
      .limit(20),
  ]);
  const map = (t: NonNullable<typeof dueToday.data>[number], isOverdue: boolean): TaskItem => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date,
    is_completed: t.is_completed,
    subject_id: t.subject_id,
    subjectName: t.subjects?.name ?? null,
    overdue: isOverdue,
  });
  return [...(overdue.data ?? []).map((t) => map(t, true)), ...(dueToday.data ?? []).map((t) => map(t, false))];
}
