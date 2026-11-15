import type { Metadata } from 'next';
import { Flame, Target, TrendingUp } from 'lucide-react';
import { getViewer } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { getDailyTotals, getRecentSessions, getStudyOverview } from '@/services/study.service';
import { getSubjectOptions } from '@/services/subject.service';
import { FocusTimer } from '@/components/focus/focus-timer';
import { GoalEditor } from '@/components/focus/goal-editor';
import { WeeklyChart } from '@/components/focus/weekly-chart';
import { StudyCalendar } from '@/components/focus/study-calendar';
import { RecentSessions } from '@/components/focus/recent-sessions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PageHeader, ProgressBar } from '@/components/ui/feedback';
import { formatDuration, toHours } from '@/lib/utils/format';
import { monthStartKey } from '@/lib/utils/dates';
import { endOfMonth, format, parseISO } from 'date-fns';

export const metadata: Metadata = { title: 'Focus' };

export default async function FocusPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: monthParam } = await searchParams;
  const viewer = await getViewer();
  const supabase = await getSupabase();
  const [study, subjects, sessions] = await Promise.all([getStudyOverview(supabase, viewer), getSubjectOptions(supabase), getRecentSessions(supabase, 12)]);

  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) && `${monthParam}-01` <= study.today ? monthParam : study.today.slice(0, 7);
  const monthStart = monthStartKey(`${month}-01`);
  const monthEnd = format(endOfMonth(parseISO(monthStart)), 'yyyy-MM-dd');
  const monthTotals = monthStart >= study.totals[0]?.local_date ? study.totals : await getDailyTotals(supabase, monthStart, monthEnd);

  const s = study.summary;
  const targetSeconds = study.targetMinutes * 60;

  return (
    <>
      <PageHeader eyebrow="Focus" title="Deep work, measured honestly" description="Lecture time is tracked automatically. Use the timer for books, notes and practice." />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <FocusTimer subjects={subjects} notificationsEnabled={viewer.settings.notification_enabled} />

        <div className="space-y-5">
          <Card>
            <CardHeader icon={<Target className="h-4 w-4" />} title="Daily goal" action={<GoalEditor today={study.today} currentMinutes={study.targetMinutes} />} />
            <CardContent>
              <p className="tabular text-3xl font-bold tracking-tight text-ink">
                {formatDuration(s.today.total_seconds)}
                <span className="text-base font-semibold text-ink-faint"> / {formatDuration(targetSeconds)}</span>
              </p>
              <ProgressBar value={study.goalPercent} className="mt-3" tone={study.goalPercent >= 100 ? 'success' : 'primary'} label="Daily goal" />
              <dl className="mt-4 grid grid-cols-2 gap-3 text-[13px]">
                <div className="rounded-xl bg-surface-muted p-3">
                  <dt className="text-xs text-ink-secondary">Lectures</dt>
                  <dd className="tabular font-bold text-ink">{formatDuration(s.today.video_seconds)}</dd>
                </div>
                <div className="rounded-xl bg-surface-muted p-3">
                  <dt className="text-xs text-ink-secondary">Focus timer</dt>
                  <dd className="tabular font-bold text-ink">{formatDuration(s.today.manual_seconds)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader icon={<Flame className="h-4 w-4" />} title="Study streak" description={`Days with at least ${study.streakMinMinutes} min of verified study`} />
            <CardContent className="flex items-end justify-between">
              <div>
                <p className="tabular text-3xl font-bold text-ink">
                  {study.streak.current}
                  <span className="text-base font-semibold text-ink-faint"> day{study.streak.current === 1 ? '' : 's'}</span>
                </p>
                <p className="mt-1 text-xs text-ink-secondary">
                  {study.streak.todayQualified ? 'Today counts ✓' : `Study ${study.streakMinMinutes} min today to keep it going`}
                </p>
              </div>
              <p className="text-right text-xs text-ink-secondary">
                Longest
                <span className="tabular block text-lg font-bold text-ink">{study.streak.longest}d</span>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'This week', value: `${toHours(s.weekSeconds)}h` },
          { label: 'This month', value: `${toHours(s.monthSeconds)}h` },
          { label: '7-day average', value: formatDuration(s.average7Seconds, { compact: true }) },
          { label: '30-day average', value: formatDuration(s.average30Seconds, { compact: true }) },
        ].map((x) => (
          <Card key={x.label} className="p-4">
            <p className="text-xs text-ink-secondary">{x.label}</p>
            <p className="tabular mt-1 text-xl font-bold text-ink">{x.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader icon={<TrendingUp className="h-4 w-4" />} title="Last 7 days" description="Lectures and focus-timer minutes · dashed line = daily goal" />
          <CardContent>
            <WeeklyChart days={s.last7} targetMinutes={study.targetMinutes} />
            <div className="mt-2 flex justify-center gap-4 text-xs text-ink-secondary">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-primary" aria-hidden="true" /> Lectures
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-sm bg-secondary" aria-hidden="true" /> Focus timer
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <StudyCalendar month={month} today={study.today} totals={monthTotals} targetSeconds={targetSeconds} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHeader title="Recent sessions" description="Every minute here is verified active study" />
        <CardContent>
          <RecentSessions sessions={sessions} timezone={viewer.timezone} />
        </CardContent>
      </Card>
    </>
  );
}
