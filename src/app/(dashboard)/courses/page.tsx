import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, ChevronRight } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/server';
import { getViewer } from '@/lib/auth/session';
import { getCourseOverview } from '@/services/course.service';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, PageHeader, ProgressBar, ProgressRing } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { SubjectIcon } from '@/components/courses/subject-icon';
import { cn } from '@/lib/utils/cn';
import { pluralize } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Courses' };

const FILTERS = [
  { value: 'all', label: 'All subjects' },
  { value: 'PRELIMS', label: 'Prelims' },
  { value: 'MAINS', label: 'Mains' },
] as const;

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage = 'all' } = await searchParams;
  const viewer = await getViewer();
  const supabase = await getSupabase();
  const overview = await getCourseOverview(supabase);

  const subjects = overview.subjects.filter((s) => stage === 'all' || s.syllabus_stage === 'BOTH' || s.syllabus_stage === stage);

  return (
    <>
      <PageHeader
        eyebrow="Courses"
        title="Your syllabus"
        description={`${overview.completedLectures} of ${pluralize(overview.totalLectures, 'lecture')} completed across ${pluralize(overview.subjects.length, 'subject')}.`}
        actions={
          viewer.isAdmin ? (
            <ButtonLink href="/admin/lectures" variant="outline" size="sm">
              Manage content
            </ButtonLink>
          ) : null
        }
      />

      <Card className="mb-6 flex flex-col items-center gap-5 p-5 sm:flex-row sm:p-6">
        <ProgressRing value={overview.percent} size={104} stroke={9} label="Overall syllabus completion">
          <span className="tabular text-2xl font-bold text-ink">{Math.round(overview.percent)}%</span>
        </ProgressRing>
        <div className="grid flex-1 grid-cols-2 gap-4 text-center sm:grid-cols-4 sm:text-left">
          <MiniStat label="Lectures done" value={`${overview.completedLectures}/${overview.totalLectures}`} />
          <MiniStat label="Chapters done" value={`${overview.completedChapters}/${overview.totalChapters}`} />
          <MiniStat label="Subjects started" value={`${overview.subjects.filter((s) => s.completedLectures + s.inProgressLectures > 0).length}/${overview.subjects.length}`} />
          <MiniStat label="Subjects complete" value={`${overview.subjects.filter((s) => s.totalLectures > 0 && s.percent >= 100).length}`} />
        </div>
      </Card>

      <div className="scrollbar-none mb-5 flex gap-2 overflow-x-auto" role="tablist" aria-label="Filter subjects by stage">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === 'all' ? '/courses' : `/courses?stage=${f.value}`}
            role="tab"
            aria-selected={stage === f.value}
            className={cn(
              'shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors',
              stage === f.value ? 'bg-primary-strong text-primary-foreground' : 'bg-surface text-ink-secondary ring-1 ring-line hover:text-ink',
            )}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {subjects.length === 0 ? (
        <Card>
          <EmptyState icon={<BookOpen className="h-5 w-5" />} title="No subjects yet" description="The content owner hasn't published subjects for this stage." />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((s) => (
            <li key={s.id}>
              <Link
                href={`/courses/${s.id}`}
                className="group flex h-full flex-col rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-[var(--shadow-soft)] transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-lift)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary-strong">
                    <SubjectIcon slug={s.slug} />
                  </span>
                  {s.totalLectures > 0 && s.percent >= 100 ? (
                    <Badge tone="success">Completed</Badge>
                  ) : s.syllabus_stage !== 'BOTH' ? (
                    <Badge>{s.syllabus_stage === 'PRELIMS' ? 'Prelims' : 'Mains'}</Badge>
                  ) : null}
                </div>
                <h2 className="mt-4 text-[15px] font-semibold text-ink">{s.name}</h2>
                {s.description ? <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-ink-secondary">{s.description}</p> : null}
                <div className="mt-auto pt-5">
                  <div className="mb-2 flex items-baseline justify-between text-xs">
                    <span className="text-ink-secondary">
                      {s.totalLectures > 0 ? `${s.completedLectures}/${s.totalLectures} lectures · ${pluralize(s.totalChapters, 'chapter')}` : 'Lectures coming soon'}
                    </span>
                    <span className="tabular font-semibold text-ink">{Math.round(s.percent)}%</span>
                  </div>
                  <ProgressBar value={s.percent} tone={s.percent >= 100 ? 'success' : 'primary'} label={`${s.name} completion`} />
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary-strong opacity-80 transition-opacity group-hover:opacity-100">
                  Open subject <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="tabular text-lg font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-secondary">{label}</p>
    </div>
  );
}
