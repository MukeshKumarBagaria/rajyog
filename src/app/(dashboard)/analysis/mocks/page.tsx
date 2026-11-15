import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/server';
import { getMocks } from '@/services/analytics.service';
import { Card } from '@/components/ui/card';
import { Badge, EmptyState, PageHeader } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { deleteMockAction } from '@/actions/mocks';
import { accuracyPercent, scorePercent } from '@/lib/analytics/mock-scoring';
import { formatMarks } from '@/lib/utils/format';
import { formatDateKey } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';
import type { ExamStage } from '@/types/database';

export const metadata: Metadata = { title: 'Mock history' };

export default async function MocksPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage: stageParam } = await searchParams;
  const stage: ExamStage | undefined = stageParam === 'PRELIMS' || stageParam === 'MAINS' ? stageParam : undefined;
  const supabase = await getSupabase();
  const mocks = await getMocks(supabase, stage);

  return (
    <>
      <Breadcrumbs items={[{ href: '/analysis', label: 'Analysis' }, { label: 'Mock history' }]} />
      <PageHeader
        title="Mock history"
        description="Every mock you record stays private to you."
        actions={
          <ButtonLink href={`/analysis/mocks/new${stage ? `?stage=${stage}` : ''}`} size="sm">
            <Plus className="h-4 w-4" /> Add mock
          </ButtonLink>
        }
      />
      <div className="mb-4 flex gap-2">
        {[
          { v: undefined, l: 'All' },
          { v: 'PRELIMS', l: 'Prelims' },
          { v: 'MAINS', l: 'Mains' },
        ].map((f) => (
          <Link
            key={f.l}
            href={f.v ? `/analysis/mocks?stage=${f.v}` : '/analysis/mocks'}
            className={cn(
              'rounded-full px-4 py-1.5 text-[13px] font-semibold',
              stage === f.v ? 'bg-primary-strong text-primary-foreground' : 'bg-surface text-ink-secondary ring-1 ring-line hover:text-ink',
            )}
          >
            {f.l}
          </Link>
        ))}
      </div>

      {mocks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ClipboardList className="h-5 w-5" />}
            title="No mocks recorded"
            description="Add your mock-test results to see trends and your readiness."
            action={<ButtonLink href="/analysis/mocks/new">Add mock</ButtonLink>}
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {mocks.map((m) => {
            const pct = scorePercent(Number(m.obtained_marks), Number(m.total_marks));
            const acc = accuracyPercent(m.correct_answers, m.incorrect_answers);
            return (
              <li key={m.id}>
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{m.test_name}</p>
                        <Badge tone="primary">{m.exam_stage === 'PRELIMS' ? 'Prelims' : 'Mains'}</Badge>
                        {m.difficulty ? <Badge>{m.difficulty.toLowerCase()}</Badge> : null}
                        {m.exam_pattern_version !== 'current' ? <Badge tone="warning">{m.exam_pattern_version}</Badge> : null}
                      </div>
                      <p className="mt-1 text-xs text-ink-secondary">
                        {formatDateKey(m.test_date)}
                        {m.provider ? ` · ${m.provider}` : ''}
                        {acc !== null ? ` · ${formatMarks(acc, 1)}% accuracy` : ''}
                        {m.mock_subject_scores.length ? ` · ${m.mock_subject_scores.length} sections` : ''}
                      </p>
                      {m.remarks ? <p className="mt-2 line-clamp-2 text-[13px] text-ink-secondary">“{m.remarks}”</p> : null}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="tabular text-xl font-bold text-ink">
                          {formatMarks(Number(m.obtained_marks))}
                          <span className="text-sm font-semibold text-ink-faint">/{formatMarks(Number(m.total_marks))}</span>
                        </p>
                        <p className="tabular text-xs text-ink-secondary">{formatMarks(pct, 1)}%</p>
                      </div>
                      <div className="flex gap-1">
                        <ButtonLink href={`/analysis/mocks/${m.id}/edit`} variant="ghost" size="icon-sm" aria-label={`Edit ${m.test_name}`}>
                          <Pencil className="h-4 w-4" />
                        </ButtonLink>
                        <ConfirmButton
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete ${m.test_name}`}
                          title="Delete this mock?"
                          description="Its subject-wise marks will be deleted too. This cannot be undone."
                          successMessage="Mock deleted"
                          action={deleteMockAction.bind(null, m.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </ConfirmButton>
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
