import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, endOfMonth, format, getDay, parseISO, startOfMonth } from 'date-fns';
import { dateKeyRange } from '@/lib/utils/dates';
import { intensityLevel, type DailyTotal } from '@/lib/analytics/study-stats';
import { formatDuration } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

const LEVEL_CLASS = ['bg-heat-0', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'] as const;

/** Minimal month heatmap; intensity is relative to the daily goal. */
export function StudyCalendar({
  month,
  today,
  totals,
  targetSeconds,
}: {
  month: string; // yyyy-MM
  today: string;
  totals: DailyTotal[];
  targetSeconds: number;
}) {
  const first = startOfMonth(parseISO(`${month}-01`));
  const days = dateKeyRange(format(first, 'yyyy-MM-dd'), format(endOfMonth(first), 'yyyy-MM-dd'));
  const byDay = new Map(totals.map((t) => [t.local_date, t.total_seconds]));
  const lead = (getDay(first) + 6) % 7; // Monday-first grid
  const prev = format(addMonths(first, -1), 'yyyy-MM');
  const next = format(addMonths(first, 1), 'yyyy-MM');
  const canNext = `${next}-01` <= today;
  const studied = days.filter((d) => (byDay.get(d) ?? 0) > 0).length;
  const monthTotal = days.reduce((a, d) => a + (byDay.get(d) ?? 0), 0);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">{format(first, 'MMMM yyyy')}</p>
          <p className="text-xs text-ink-secondary">
            {studied} study days · {formatDuration(monthTotal)}
          </p>
        </div>
        <div className="flex gap-1">
          <Link href={`/focus?month=${prev}`} scroll={false} className="rounded-lg p-1.5 text-ink-secondary hover:bg-primary-light hover:text-primary-strong" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          {canNext ? (
            <Link href={`/focus?month=${next}`} scroll={false} className="rounded-lg p-1.5 text-ink-secondary hover:bg-primary-light hover:text-primary-strong" aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="p-1.5 text-ink-faint/40" aria-hidden="true">
              <ChevronRight className="h-4 w-4" />
            </span>
          )}
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5 text-center" role="grid" aria-label={`Study activity for ${format(first, 'MMMM yyyy')}`}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <span key={i} className="pb-1 text-[10px] font-semibold text-ink-faint" aria-hidden="true">
            {d}
          </span>
        ))}
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`lead-${i}`} aria-hidden="true" />
        ))}
        {days.map((d) => {
          const secs = byDay.get(d) ?? 0;
          const level = d > today ? 0 : intensityLevel(secs, targetSeconds);
          return (
            <span
              key={d}
              role="gridcell"
              title={`${format(parseISO(d), 'd MMM')}: ${secs ? formatDuration(secs) : 'no study'}`}
              aria-label={`${format(parseISO(d), 'd MMMM')}: ${secs ? formatDuration(secs) : 'no study'}`}
              className={cn(
                'tabular flex aspect-square items-center justify-center rounded-lg text-[11px] font-medium',
                LEVEL_CLASS[level],
                level >= 3 ? 'text-white' : 'text-ink-secondary',
                d === today && 'ring-2 ring-primary ring-offset-1 ring-offset-surface',
                d > today && 'opacity-40',
              )}
            >
              {Number(d.slice(8))}
            </span>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-ink-faint" aria-hidden="true">
        Less
        {LEVEL_CLASS.map((c) => (
          <span key={c} className={cn('h-3 w-3 rounded', c)} />
        ))}
        More
      </div>
    </div>
  );
}
