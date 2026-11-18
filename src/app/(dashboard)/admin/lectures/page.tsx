import type { Metadata } from 'next';
import { Pencil, Plus } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { FormDialog } from '@/components/admin/form-dialog';
import { LectureFields } from '@/components/admin/fields';
import { ActiveToggle, DeleteContentButton, MoveButtons } from '@/components/admin/row-actions';
import { BulkImport } from '@/components/admin/bulk-import';
import { QuerySelect } from '@/components/analysis/benchmark-select';
import { saveLectureAction } from '@/actions/admin';
import { formatDuration } from '@/lib/utils/format';
import { VideoThumb } from '@/components/ui/video-thumb';
import { uuid } from '@/lib/validation/schemas';

export const metadata: Metadata = { title: 'Lectures' };

export default async function AdminLecturesPage({ searchParams }: { searchParams: Promise<{ subject?: string; chapter?: string }> }) {
  const sp = await searchParams;
  const supabase = await getSupabase();
  const [{ data: subjects }, { data: allChapters }] = await Promise.all([
    supabase.from('subjects').select('id, name').order('sort_order').order('name'),
    supabase.from('chapters').select('id, title, subject_id, sort_order').order('sort_order').order('title'),
  ]);

  const subjectId = sp.subject && uuid.safeParse(sp.subject).success ? sp.subject : subjects?.[0]?.id;
  const chapters = (allChapters ?? []).filter((c) => c.subject_id === subjectId);
  const chapterId = sp.chapter && chapters.some((c) => c.id === sp.chapter) ? sp.chapter : chapters[0]?.id;
  const chapter = chapters.find((c) => c.id === chapterId);

  const { data: lectures } = chapterId
    ? await supabase.from('lectures').select('*').eq('chapter_id', chapterId).order('sort_order').order('title')
    : { data: [] };
  const subjectName = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const chapterOptions = (allChapters ?? []).map((c) => ({ id: c.id, title: c.title, subjectName: subjectName.get(c.subject_id) ?? '' }));
  const nextSort = (lectures ?? []).reduce((m, l) => Math.max(m, l.sort_order), 0) + 1;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <QuerySelect name="subject" label="Subject" value={subjectId ?? ''} options={(subjects ?? []).map((s) => ({ value: s.id, label: s.name }))} />
        <QuerySelect name="chapter" label="Chapter" value={chapterId ?? ''} options={chapters.map((c) => ({ value: c.id, label: c.title }))} />
        {chapter ? (
          <div className="flex gap-2">
            <BulkImport chapterId={chapter.id} chapterTitle={chapter.title} />
            <FormDialog title="New lecture" action={saveLectureAction} triggerLabel={<><Plus className="h-4 w-4" /> Lecture</>} successMessage="Lecture saved">
              <LectureFields chapters={chapterOptions} chapterId={chapter.id} nextSort={nextSort} />
            </FormDialog>
          </div>
        ) : null}
      </div>

      {!chapter ? (
        <Card>
          <EmptyState title="Create a chapter first" description="Lectures belong to chapters. Add chapters on the Chapters tab." />
        </Card>
      ) : !lectures?.length ? (
        <Card>
          <EmptyState title="No lectures in this chapter" description="Add a lecture, or paste a list of YouTube links with bulk import." />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {lectures.map((l, i) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <MoveButtons id={l.id} first={i === 0} last={i === lectures.length - 1} />
              <VideoThumb videoId={l.youtube_video_id} provider={l.video_provider} showPlay={false} className="hidden w-24 shrink-0 rounded-lg sm:block" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  {l.title} {!l.is_active ? <Badge tone="warning">Hidden</Badge> : null}
                </p>
                <p className="text-xs text-ink-secondary">
                  {l.video_provider === 'drive' ? 'Google Drive' : l.youtube_video_id} · {l.duration_seconds ? formatDuration(l.duration_seconds) : 'duration auto-detected on first play'} · completes at{' '}
                  {Math.round(Number(l.completion_threshold) * 100)}%
                </p>
              </div>
              <ActiveToggle table="lectures" id={l.id} active={l.is_active} />
              <FormDialog
                title="Edit lecture"
                action={saveLectureAction}
                triggerLabel={<Pencil className="h-4 w-4" />}
                triggerProps={{ variant: 'ghost', size: 'icon-sm', 'aria-label': `Edit ${l.title}` }}
                successMessage="Lecture updated"
              >
                <LectureFields lecture={l} chapters={chapterOptions} />
              </FormDialog>
              <DeleteContentButton table="lectures" id={l.id} label={l.title} warning="This also deletes every user's progress, bookmarks and notes for this lecture. Prefer deactivating." />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
