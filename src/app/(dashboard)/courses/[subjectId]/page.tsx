import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronRight, Layers } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/server';
import { getSubjectDetail } from '@/services/course.service';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, PageHeader, ProgressBar, ProgressRing } from '@/components/ui/feedback';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { SubjectIcon } from '@/components/courses/subject-icon';
import { formatDuration, pluralize } from '@/lib/utils/format';
import { uuid } from '@/lib/validation/schemas';

type Props = { params: Promise<{ subjectId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subjectId } = await params;
  if (!uuid.safeParse(subjectId).success) return { title: 'Subject' };
  const supabase = await getSupabase();
  const { data } = await supabase.from('subjects').select('name').eq('id', subjectId).maybeSingle();
  return { title: data?.name ?? 'Subject' };
}

export default async function SubjectPage({ params }: Props) {
  const { subjectId } = await params;
  if (!uuid.safeParse(subjectId).success) notFound();
  const supabase = await getSupabase();
  const detail = await getSubjectDetail(supabase, subjectId);
  if (!detail) notFound();

  const { subject, chapters } = detail;

  return (
    <>
      <Breadcrumbs items={[{ href: '/courses', label: 'Courses' }, { label: subject.name }]} />
      <PageHeader title={subject.name} description={subject.description ?? undefined} />

      <Card className="mb-6 flex flex-col items-center gap-5 p-5 sm:flex-row sm:p-6">
        <ProgressRing value={detail.percent} size={96} stroke={8} label={`${subject.name} completion`}>
          <SubjectIcon slug={subject.slug} className="mb-0.5 h-4 w-4 text-primary-strong" />
          <span className="tabular text-xl font-bold text-ink">{Math.round(detail.percent)}%</span>
        </ProgressRing>
        <dl className="grid flex-1 grid-cols-3 gap-4 text-center sm:text-left">
          <div>
            <dt className="text-xs text-ink-secondary">Chapters</dt>
            <dd className="tabular text-lg font-bold text-ink">{chapters.length}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-secondary">Lectures</dt>
            <dd className="tabular text-lg font-bold text-ink">{detail.totalLectures}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-secondary">Completed</dt>
            <dd className="tabular text-lg font-bold text-ink">{detail.completedLectures}</dd>
          </div>
        </dl>
      </Card>

      {chapters.length === 0 ? (
        <Card>
          <EmptyState icon={<Layers className="h-5 w-5" />} title="No chapters yet" description="Chapters for this subject will appear here once they are published." />
        </Card>
      ) : (
        <Card className="divide-y divide-line overflow-hidden">
          {chapters.map((c, i) => (
            <Link
              key={c.id}
              href={`/courses/${subject.id}/${c.id}`}
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted"
            >
              <span className="tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-sm font-bold text-primary-strong">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-sm font-semibold text-ink">{c.title}</h2>
                  {c.totalLectures > 0 && c.completedLectures === c.totalLectures ? <Badge tone="success">Done</Badge> : null}
                  {c.inProgressLectures > 0 && c.completedLectures < c.totalLectures ? <Badge tone="primary">In progress</Badge> : null}
                </div>
                <p className="mt-0.5 text-xs text-ink-secondary">
                  {c.totalLectures > 0
                    ? `${c.completedLectures}/${pluralize(c.totalLectures, 'lecture')}${c.totalSeconds ? ` · ${formatDuration(c.totalSeconds)}` : ''}`
                    : 'No lectures yet'}
                </p>
                {c.totalLectures > 0 ? <ProgressBar value={c.percent} size="sm" className="mt-2 max-w-xs" tone={c.percent >= 100 ? 'success' : 'primary'} /> : null}
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          ))}
        </Card>
      )}
    </>
  );
}
