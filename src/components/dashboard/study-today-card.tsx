import Link from 'next/link';
import { Flame, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProgressRing } from '@/components/ui/feedback';
import { formatDuration, toHours } from '@/lib/utils/format';
import type { StudyOverview } from '@/services/study.service';

export function StudyTodayCard({ study }: { study: StudyOverview }) {
  const today = study.summary.today;
  const done = study.goalPercent >= 100;
  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={<Timer className="h-4 w-4" />}
        title="Today’s study"
        description="Lectures + focus timer, verified"
        action={
          <Link href="/focus" className="text-xs font-semibold text-primary-strong hover:underline">
            Open Focus
          </Link>
        }
      />
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex items-center gap-5">
          <ProgressRing value={study.goalPercent} size={108} stroke={10} tone={done ? 'success' : 'primary'} label="Daily goal progress">
            <span className="tabular text-xl font-bold text-ink">{formatDuration(today.total_seconds, { compact: true })}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">of {formatDuration(study.targetMinutes * 60)}</span>
          </ProgressRing>
          <div className="space-y-2 text-[13px]">
            <p className="text-ink-secondary">
              <span className="font-semibold text-ink">{formatDuration(today.video_seconds)}</span> lectures
            </p>
            <p className="text-ink-secondary">
              <span className="font-semibold text-ink">{formatDuration(today.manual_seconds)}</span> focus timer
            </p>
            <p className={done ? 'font-semibold text-success-ink' : 'text-ink-secondary'}>
              {done ? 'Daily goal reached 🎉' : `${formatDuration(Math.max(0, study.targetMinutes * 60 - today.total_seconds))} to go`}
            </p>
          </div>
        </div>
        <dl className="mt-auto grid grid-cols-3 gap-3 rounded-2xl bg-surface-muted p-3 text-center">
          <div>
            <dt className="text-[11px] text-ink-secondary">This week</dt>
            <dd className="tabular text-base font-bold text-ink">{toHours(study.summary.weekSeconds)}h</dd>
          </div>
          <div>
            <dt className="text-[11px] text-ink-secondary">7-day avg</dt>
            <dd className="tabular text-base font-bold text-ink">{formatDuration(study.summary.average7Seconds, { compact: true })}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-ink-secondary">Streak</dt>
            <dd className="tabular inline-flex items-center gap-1 text-base font-bold text-ink">
              <Flame className={study.streak.current > 0 ? 'h-4 w-4 text-warning' : 'h-4 w-4 text-ink-faint'} aria-hidden="true" />
              {study.streak.current}d
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
