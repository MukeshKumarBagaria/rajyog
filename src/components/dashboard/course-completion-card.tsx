import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { ProgressBar, ProgressRing } from '@/components/ui/feedback';
import type { CourseOverview } from '@/services/course.service';

export function CourseCompletionCard({ overview }: { overview: CourseOverview }) {
  const subjects = overview.subjects
    .filter((s) => s.totalLectures > 0)
    .sort((a, b) => b.completedLectures + b.inProgressLectures - (a.completedLectures + a.inProgressLectures) || b.percent - a.percent)
    .slice(0, 5);

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={<BookOpen className="h-4 w-4" />}
        title="Course completion"
        description="Completed lectures across your syllabus"
        action={
          <Link href="/courses" className="text-xs font-semibold text-primary-strong hover:underline">
            All subjects
          </Link>
        }
      />
      <CardContent className="flex flex-1 flex-col gap-5">
        <div className="flex items-center gap-5">
          <ProgressRing value={overview.percent} size={108} stroke={10} label="Syllabus completion">
            <span className="tabular text-2xl font-bold text-ink">{Math.round(overview.percent)}%</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">done</span>
          </ProgressRing>
          <dl className="grid flex-1 grid-cols-1 gap-3">
            <div>
              <dt className="text-xs text-ink-secondary">Lectures</dt>
              <dd className="tabular text-lg font-bold text-ink">
                {overview.completedLectures}
                <span className="text-sm font-semibold text-ink-faint"> / {overview.totalLectures}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-secondary">Chapters</dt>
              <dd className="tabular text-lg font-bold text-ink">
                {overview.completedChapters}
                <span className="text-sm font-semibold text-ink-faint"> / {overview.totalChapters}</span>
              </dd>
            </div>
          </dl>
        </div>
        {subjects.length ? (
          <ul className="space-y-3">
            {subjects.map((s) => (
              <li key={s.id}>
                <Link href={`/courses/${s.id}`} className="block rounded-lg focus-visible:outline-offset-4">
                  <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate font-semibold text-ink">{s.name}</span>
                    <span className="tabular shrink-0 text-ink-secondary">
                      {s.completedLectures}/{s.totalLectures}
                    </span>
                  </div>
                  <ProgressBar value={s.percent} size="sm" tone={s.percent >= 100 ? 'success' : 'primary'} label={`${s.name} completion`} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-secondary">Lectures will appear here once they are added to the catalogue.</p>
        )}
      </CardContent>
    </Card>
  );
}
