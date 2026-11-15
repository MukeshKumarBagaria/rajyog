import type { Metadata } from 'next';
import { ExternalLink, Pencil, Plus } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { Alert, EmptyState } from '@/components/ui/feedback';
import { FormDialog } from '@/components/admin/form-dialog';
import { CutoffFields } from '@/components/admin/fields';
import { DeleteContentButton } from '@/components/admin/row-actions';
import { saveCutoffAction } from '@/actions/admin';
import { categoryLabel } from '@/constants/app';
import { formatMarks } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Cutoffs' };

export default async function AdminCutoffsPage() {
  const supabase = await getSupabase();
  const { data: cutoffs } = await supabase
    .from('historical_cutoffs')
    .select('*')
    .order('exam_year', { ascending: false })
    .order('exam_stage')
    .order('category');

  return (
    <div className="space-y-4">
      <Alert tone="warning">
        Enter only officially published RPSC figures, each with its source link. Readiness never mixes categories, stages, cutoff types or exam patterns.
      </Alert>
      <div className="flex justify-end">
        <FormDialog title="New cutoff" action={saveCutoffAction} triggerLabel={<><Plus className="h-4 w-4" /> Cutoff</>} successMessage="Cutoff saved">
          <CutoffFields />
        </FormDialog>
      </div>
      {!cutoffs?.length ? (
        <Card>
          <EmptyState title="No cutoffs recorded" description="Add official cutoffs so aspirants can compare their mock performance." />
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-xs text-ink-secondary">
                {['Year', 'Stage', 'Category', 'Type', 'Cutoff', 'Pattern', 'Verified', 'Source', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cutoffs.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0">
                  <td className="tabular px-4 py-2.5 font-semibold text-ink">{c.exam_year}</td>
                  <td className="px-4 py-2.5">{c.exam_stage === 'PRELIMS' ? 'Prelims' : 'Mains'}</td>
                  <td className="px-4 py-2.5">{categoryLabel(c.category)}</td>
                  <td className="px-4 py-2.5">{c.cutoff_type}</td>
                  <td className="tabular px-4 py-2.5">
                    {formatMarks(Number(c.cutoff_marks))}/{formatMarks(Number(c.total_marks))}
                  </td>
                  <td className="px-4 py-2.5">{c.exam_pattern_version}</td>
                  <td className="px-4 py-2.5">{c.verified_at ? c.verified_at.slice(0, 10) : '—'}</td>
                  <td className="px-4 py-2.5">
                    <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-strong hover:underline">
                      Open <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="flex justify-end gap-1">
                      <FormDialog
                        title="Edit cutoff"
                        action={saveCutoffAction}
                        triggerLabel={<Pencil className="h-4 w-4" />}
                        triggerProps={{ variant: 'ghost', size: 'icon-sm', 'aria-label': 'Edit cutoff' }}
                        successMessage="Cutoff updated"
                      >
                        <CutoffFields cutoff={c} />
                      </FormDialog>
                      <DeleteContentButton table="historical_cutoffs" id={c.id} label={`${c.exam_year} ${c.exam_stage} ${c.category} cutoff`} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
