import type { Metadata } from 'next';
import Link from 'next/link';
import { Bookmark, NotebookPen } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getSupabase } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { EmptyState, PageHeader } from '@/components/ui/feedback';
import { LectureStatusIcon } from '@/components/courses/status-icon';
import type { LectureStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Bookmarks & notes' };

export default async function LibraryPage() {
  const supabase = await getSupabase();
  const [{ data: bookmarks }, { data: notes }] = await Promise.all([
    supabase
      .from('bookmarks')
      .select('id, created_at, lecture_id, lectures!inner(id, title, is_active, chapters!inner(id, title, subject_id, subjects!inner(name)))')
      .order('created_at', { ascending: false }),
    supabase
      .from('personal_notes')
      .select('id, title, content, updated_at, lecture_id, chapter_id, lectures(id, title), chapters(id, title, subject_id)')
      .order('updated_at', { ascending: false })
      .limit(200),
  ]);

  const lectureIds = (bookmarks ?? []).map((b) => b.lecture_id);
  const { data: progress } = lectureIds.length
    ? await supabase.from('lecture_progress').select('lecture_id, status').in('lecture_id', lectureIds)
    : { data: [] as { lecture_id: string; status: LectureStatus }[] };
  const statusOf = new Map((progress ?? []).map((p) => [p.lecture_id, p.status]));

  return (
    <>
      <PageHeader eyebrow="Library" title="Bookmarks & notes" description="Everything you saved for revision. Private to you." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<Bookmark className="h-4 w-4" />} title="Bookmarked lectures" description={`${bookmarks?.length ?? 0} saved`} />
          <CardContent>
            {!bookmarks?.length ? (
              <EmptyState title="No bookmarks yet" description="Tap Bookmark on any lecture to keep it here for revision." />
            ) : (
              <ul className="divide-y divide-line">
                {bookmarks
                  .filter((b) => b.lectures.is_active)
                  .map((b) => (
                    <li key={b.id}>
                      <Link href={`/lecture/${b.lecture_id}`} className="flex items-center gap-3 py-3 hover:opacity-90">
                        <LectureStatusIcon status={statusOf.get(b.lecture_id) ?? 'NOT_STARTED'} className="shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">{b.lectures.title}</span>
                          <span className="block truncate text-xs text-ink-secondary">
                            {b.lectures.chapters.subjects.name} · {b.lectures.chapters.title}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader icon={<NotebookPen className="h-4 w-4" />} title="Notes" description={`${notes?.length ?? 0} notes`} />
          <CardContent>
            {!notes?.length ? (
              <EmptyState title="No notes yet" description="Add notes from any lecture or chapter page." />
            ) : (
              <ul className="space-y-3">
                {notes.map((n) => {
                  const href = n.lectures ? `/lecture/${n.lectures.id}` : n.chapters ? `/courses/${n.chapters.subject_id}/${n.chapters.id}` : null;
                  const context = n.lectures?.title ?? n.chapters?.title ?? 'General note';
                  return (
                    <li key={n.id} className="rounded-xl border border-line bg-surface-muted/60 p-3">
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                        {href ? (
                          <Link href={href} className="truncate font-semibold text-primary-strong hover:underline">
                            {context}
                          </Link>
                        ) : (
                          <span className="font-semibold text-ink-secondary">{context}</span>
                        )}
                        <span className="shrink-0 text-ink-faint">{formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}</span>
                      </div>
                      {n.title ? <p className="text-sm font-semibold text-ink">{n.title}</p> : null}
                      <p className="line-clamp-4 whitespace-pre-wrap text-[13px] leading-5 text-ink">{n.content}</p>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
