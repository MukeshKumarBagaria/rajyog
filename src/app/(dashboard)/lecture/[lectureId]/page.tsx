import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/server';
import { getLectureDetail } from '@/services/course.service';
import { LecturePlayer } from '@/components/player/lecture-player';
import { BookmarkButton } from '@/components/player/bookmark-button';
import { NotesPanel } from '@/components/library/notes-panel';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { Card, CardHeader } from '@/components/ui/card';
import { ProgressBar } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { LectureStatusIcon } from '@/components/courses/status-icon';
import { parseSegments } from '@/lib/tracking/segments';
import { formatDuration } from '@/lib/utils/format';
import { isValidVideoId } from '@/lib/youtube/video-id';
import { uuid } from '@/lib/validation/schemas';
import { cn } from '@/lib/utils/cn';

type Props = { params: Promise<{ lectureId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lectureId } = await params;
  if (!uuid.safeParse(lectureId).success) return { title: 'Lecture' };
  const supabase = await getSupabase();
  const { data } = await supabase.from('lectures').select('title').eq('id', lectureId).maybeSingle();
  return { title: data?.title ?? 'Lecture' };
}

export default async function LecturePage({ params }: Props) {
  const { lectureId } = await params;
  if (!uuid.safeParse(lectureId).success) notFound();
  const supabase = await getSupabase();
  const d = await getLectureDetail(supabase, lectureId);
  if (!d || !isValidVideoId(d.lecture.youtube_video_id)) notFound();

  const { lecture, chapter, subject, progress } = d;
  const chapterHref = `/courses/${subject.id}/${chapter.id}`;

  return (
    <>
      <Breadcrumbs
        items={[
          { href: '/courses', label: 'Courses' },
          { href: `/courses/${subject.id}`, label: subject.name },
          { href: chapterHref, label: chapter.title },
        ]}
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink sm:text-2xl">{lecture.title}</h1>
          {lecture.duration_seconds ? <p className="mt-1 text-sm text-ink-secondary">{formatDuration(lecture.duration_seconds)}</p> : null}
        </div>
        <BookmarkButton lectureId={lecture.id} initial={Boolean(d.bookmark)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <LecturePlayer
            lectureId={lecture.id}
            videoId={lecture.youtube_video_id}
            title={lecture.title}
            durationSeconds={lecture.duration_seconds}
            threshold={Number(lecture.completion_threshold)}
            initialSegments={parseSegments(progress?.watched_segments)}
            initialPosition={progress?.last_position_seconds ?? 0}
            initialStatus={progress?.status ?? 'NOT_STARTED'}
            initialPercent={Number(progress?.completion_percentage ?? 0)}
            next={d.next ? { id: d.next.id, title: d.next.title, chapterTitle: d.nextChapterTitle } : null}
          />

          {lecture.description ? (
            <Card className="p-5">
              <h2 className="mb-2 text-sm font-semibold text-ink">About this lecture</h2>
              <p className="whitespace-pre-line text-[13px] leading-6 text-ink-secondary">{lecture.description}</p>
            </Card>
          ) : null}

          <div className="flex items-center justify-between gap-3">
            {d.previous ? (
              <ButtonLink href={`/lecture/${d.previous.id}`} variant="outline" size="sm" className="max-w-[48%]">
                <ChevronLeft className="h-4 w-4 shrink-0" /> <span className="truncate">Previous</span>
              </ButtonLink>
            ) : (
              <span />
            )}
            {d.next ? (
              <ButtonLink href={`/lecture/${d.next.id}`} variant="outline" size="sm" className="max-w-[48%]">
                <span className="truncate">Next lecture</span> <ChevronRight className="h-4 w-4 shrink-0" />
              </ButtonLink>
            ) : null}
          </div>

          <NotesPanel notes={d.notes} target={{ lectureId: lecture.id }} title="Lecture notes" />
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader
              title={chapter.title}
              description={`${d.chapterCompleted}/${d.siblings.length} lectures completed`}
              action={
                <Link href={chapterHref} className="text-xs font-semibold text-primary-strong hover:underline">
                  View
                </Link>
              }
            />
            <div className="px-5 pb-3 pt-3">
              <ProgressBar value={d.chapterPercent} tone={d.chapterPercent >= 100 ? 'success' : 'primary'} label="Chapter progress" />
            </div>
            <ol className="max-h-[420px] overflow-y-auto px-2 pb-3">
              {d.siblings.map((l, i) => (
                <li key={l.id}>
                  <Link
                    href={`/lecture/${l.id}`}
                    aria-current={l.id === lecture.id ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] transition-colors',
                      l.id === lecture.id ? 'bg-primary-light font-semibold text-primary-strong' : 'text-ink hover:bg-surface-muted',
                    )}
                  >
                    <LectureStatusIcon status={l.status} className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">
                      <span className="tabular mr-1 text-ink-faint">{i + 1}.</span>
                      {l.title}
                    </span>
                    {l.duration_seconds ? <span className="tabular shrink-0 text-[11px] text-ink-faint">{formatDuration(l.duration_seconds)}</span> : null}
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
