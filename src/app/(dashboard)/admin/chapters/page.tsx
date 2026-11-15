import type { Metadata } from 'next';
import { Pencil, Plus } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState } from '@/components/ui/feedback';
import { FormDialog } from '@/components/admin/form-dialog';
import { ChapterFields } from '@/components/admin/fields';
import { ActiveToggle, DeleteContentButton } from '@/components/admin/row-actions';
import { QuerySelect } from '@/components/analysis/benchmark-select';
import { saveChapterAction } from '@/actions/admin';
import { uuid } from '@/lib/validation/schemas';

export const metadata: Metadata = { title: 'Chapters' };

export default async function AdminChaptersPage({ searchParams }: { searchParams: Promise<{ subject?: string }> }) {
  const { subject } = await searchParams;
  const supabase = await getSupabase();
  const { data: subjects } = await supabase.from('subjects').select('id, name').order('sort_order').order('name');
  const subjectId = subject && uuid.safeParse(subject).success ? subject : subjects?.[0]?.id;

  const [{ data: chapters }, { data: lectures }] = subjectId
    ? await Promise.all([
        supabase.from('chapters').select('*').eq('subject_id', subjectId).order('sort_order').order('title'),
        supabase.from('lectures').select('chapter_id, chapters!inner(subject_id)').eq('chapters.subject_id', subjectId),
      ])
    : [{ data: [] }, { data: [] }];
  const lectureCount = new Map<string, number>();
  (lectures ?? []).forEach((l) => lectureCount.set(l.chapter_id, (lectureCount.get(l.chapter_id) ?? 0) + 1));
  const nextSort = (chapters ?? []).reduce((m, c) => Math.max(m, c.sort_order), 0) + 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full max-w-xs">
          <QuerySelect name="subject" label="Subject" value={subjectId ?? ''} options={(subjects ?? []).map((s) => ({ value: s.id, label: s.name }))} />
        </div>
        {subjectId ? (
          <FormDialog title="New chapter" action={saveChapterAction} triggerLabel={<><Plus className="h-4 w-4" /> New chapter</>} successMessage="Chapter saved">
            <ChapterFields subjects={subjects ?? []} subjectId={subjectId} nextSort={nextSort} />
          </FormDialog>
        ) : null}
      </div>
      {!chapters?.length ? (
        <Card>
          <EmptyState title="No chapters in this subject" description="Create the first chapter to start adding lectures." />
        </Card>
      ) : (
        <Card className="divide-y divide-line">
          {chapters.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="tabular w-8 text-xs font-semibold text-ink-faint">{c.sort_order}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">
                  {c.title} {!c.is_active ? <Badge tone="warning">Hidden</Badge> : null}
                </p>
                <p className="text-xs text-ink-secondary">{lectureCount.get(c.id) ?? 0} lectures</p>
              </div>
              <ActiveToggle table="chapters" id={c.id} active={c.is_active} />
              <FormDialog
                title="Edit chapter"
                action={saveChapterAction}
                triggerLabel={<Pencil className="h-4 w-4" />}
                triggerProps={{ variant: 'ghost', size: 'icon-sm', 'aria-label': `Edit ${c.title}` }}
                successMessage="Chapter updated"
              >
                <ChapterFields chapter={c} subjects={subjects ?? []} />
              </FormDialog>
              <DeleteContentButton table="chapters" id={c.id} label={c.title} warning="Deleting a chapter also deletes its lectures and all users' progress on them. Prefer deactivating." />
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
