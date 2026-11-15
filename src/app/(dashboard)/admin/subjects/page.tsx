import type { Metadata } from 'next';
import Link from 'next/link';
import { Pencil, Plus } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/feedback';
import { FormDialog } from '@/components/admin/form-dialog';
import { SubjectFields } from '@/components/admin/fields';
import { ActiveToggle, DeleteContentButton } from '@/components/admin/row-actions';
import { saveSubjectAction } from '@/actions/admin';

export const metadata: Metadata = { title: 'Subjects' };

export default async function AdminSubjectsPage() {
  const supabase = await getSupabase();
  const [{ data: subjects }, { data: chapters }] = await Promise.all([
    supabase.from('subjects').select('*').order('sort_order').order('name'),
    supabase.from('chapters').select('subject_id'),
  ]);
  const chapterCount = new Map<string, number>();
  (chapters ?? []).forEach((c) => chapterCount.set(c.subject_id, (chapterCount.get(c.subject_id) ?? 0) + 1));

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <FormDialog title="New subject" action={saveSubjectAction} triggerLabel={<><Plus className="h-4 w-4" /> New subject</>} successMessage="Subject saved">
          <SubjectFields />
        </FormDialog>
      </div>
      <Card className="divide-y divide-line">
        {(subjects ?? []).map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="tabular w-8 text-xs font-semibold text-ink-faint">{s.sort_order}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">
                {s.name} {!s.is_active ? <Badge tone="warning">Hidden</Badge> : null}
              </p>
              <p className="text-xs text-ink-secondary">
                /{s.slug} · {s.syllabus_stage === 'BOTH' ? 'Prelims & Mains' : s.syllabus_stage.toLowerCase()} ·{' '}
                <Link href={`/admin/chapters?subject=${s.id}`} className="text-primary-strong hover:underline">
                  {chapterCount.get(s.id) ?? 0} chapters
                </Link>
              </p>
            </div>
            <ActiveToggle table="subjects" id={s.id} active={s.is_active} />
            <FormDialog
              title="Edit subject"
              action={saveSubjectAction}
              triggerLabel={<Pencil className="h-4 w-4" />}
              triggerProps={{ variant: 'ghost', size: 'icon-sm', 'aria-label': `Edit ${s.name}` }}
              successMessage="Subject updated"
            >
              <SubjectFields subject={s} />
            </FormDialog>
            <DeleteContentButton table="subjects" id={s.id} label={s.name} warning="Deleting a subject also deletes all its chapters, lectures and every user's progress on them. Prefer deactivating." />
          </div>
        ))}
      </Card>
    </div>
  );
}
