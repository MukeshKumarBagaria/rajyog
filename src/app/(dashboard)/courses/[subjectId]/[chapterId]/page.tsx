import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Bookmark, Clock3, ListVideo } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/server';
import { getChapterDetail } from '@/services/course.service';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, PageHeader, ProgressBar } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { LectureStatusIcon, STATUS_LABEL } from '@/components/courses/status-icon';
import { ChapterNotes } from '@/components/library/chapter-notes';
import { formatDuration, pluralize } from '@/lib/utils/format';
import { uuid } from '@/lib/validation/schemas';
import { cn } from '@/lib/utils/cn';

type Props = { params: Promise<{ subjectId: string; chapterId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chapterId } = await params;
  if (!uuid.safeParse(chapterId).success) return { title: 'Chapter' };
  const supabase = await getSupabase();
  const { data } = await supabase.from('chapters').select('title').eq('id', chapterId).maybeSingle();
  return { title: data?.title ?? 'Chapter' };
}

export default async function ChapterPage({ params }: Props) {
  const { subjectId, chapterId } = await params;
  if (!uuid.safeParse(subjectId).success || !uuid.safeParse(chapterId).success) notFound();
  const supabase = await getSupabase();
  const detail = await getChapterDetail(supabase, subjectId, chapterId);
  if (!detail) notFound();

  const { chapter, subject, lectures } = detail;
  const { data: notes } = await supabase.from('personal_notes').select('*').eq('chapter_id', chapterId).order('updated_at', { ascending: false });
  const resume = lectures.find((l) => l.id === detail.lastWatchedId && l.status !== 'COMPLETED') ?? lectures.find((l) => l.status !== 'COMPLETED');

  return (
    <>
      <Breadcrumbs items={[{ href: '/courses', label: 'Courses' }, { href: `/courses/${subject.id}`, label: subject.name }, { label: chapter.title }]} />
      <PageHeader
        title={chapter.title}
        description={chapter.description ?? `${pluralize(lectures.length, 'lecture')}${detail.totalSeconds ? ` · ${formatDuration(detail.totalSeconds)}` : ''}`}
        actions={
          resume ? (
            <ButtonLink href={`/lecture/${resume.id}`}>{resume.status === 'IN_PROGRESS' ? 'Resume' : detail.completed > 0 ? 'Continue' : 'Start chapter'}</ButtonLink>
          ) : null
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="lectures-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="lectures-heading" className="text-sm font-semibold text-ink">
              Lectures
            </h2>
            <span className="tabular text-xs font-semibold text-ink-secondary">
              {detail.completed}/{lectures.length} · {Math.round(detail.percent)}%
            </span>
          </div>
          <ProgressBar value={detail.percent} className="mb-4" tone={detail.percent >= 100 ? 'success' : 'primary'} label="Chapter completion" />

          {lectures.length === 0 ? (
            <Card>
              <EmptyState icon={<ListVideo className="h-5 w-5" />} title="No lectures yet" description="Lectures for this chapter will appear here once they are added." />
            </Card>
          ) : (
            <Card className="divide-y divide-line overflow-hidden">
              {lectures.map((l, i) => (
                <Link
                  key={l.id}
                  href={`/lecture/${l.id}`}
                  className={cn('flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-muted', l.id === detail.lastWatchedId && 'bg-primary-light/40')}
                >
                  <LectureStatusIcon status={l.status} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink">
                      <span className="tabular mr-1.5 text-ink-faint">{i + 1}.</span>
                      {l.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-secondary">
                      {l.duration_seconds ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                          {formatDuration(l.duration_seconds)}
                        </span>
                      ) : null}
                      <span>{STATUS_LABEL[l.status]}</span>
                      {l.status === 'IN_PROGRESS' ? <span className="tabular">{Math.round(l.completionPercentage)}% watched</span> : null}
                      {l.id === detail.lastWatchedId ? <Badge tone="primary">Last watched</Badge> : null}
                      {l.bookmarked ? <Bookmark className="h-3.5 w-3.5 fill-primary text-primary" aria-label="Bookmarked" /> : null}
                    </div>
                  </div>
                </Link>
              ))}
            </Card>
          )}
        </section>

        <aside>
          <ChapterNotes chapterId={chapter.id} notes={notes ?? []} />
        </aside>
      </div>
    </>
  );
}
