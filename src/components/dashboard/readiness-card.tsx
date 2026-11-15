import Link from 'next/link';
import { Gauge } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge, ProgressRing } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { formatMarks } from '@/lib/utils/format';
import type { AnalysisData } from '@/services/analytics.service';

export function ReadinessCard({ analysis }: { analysis: AnalysisData }) {
  const { readiness, performance, benchmark, stage } = analysis;
  const stageLabel = stage === 'PRELIMS' ? 'Prelims' : 'Mains';
  const benchmarkMarks =
    benchmark?.kind === 'cutoff' && performance.latest
      ? (performance.latestPercent / 100) * Number(benchmark.cutoff.total_marks) - Number(benchmark.cutoff.cutoff_marks)
      : null;

  return (
    <Card className="flex flex-col">
      <CardHeader
        icon={<Gauge className="h-4 w-4" />}
        title={`RAS ${stageLabel} readiness`}
        description="From your mock tests — not a selection guarantee"
        action={
          <Link href={`/analysis?stage=${stage}`} className="text-xs font-semibold text-primary-strong hover:underline">
            Details
          </Link>
        }
      />
      <CardContent className="flex flex-1 flex-col gap-4">
        {readiness.status === 'ok' ? (
          <div className="flex items-center gap-5">
            <ProgressRing value={readiness.score} size={108} stroke={10} tone={readiness.tone === 'neutral' ? 'primary' : readiness.tone} label="Readiness score">
              <span className="tabular text-2xl font-bold text-ink">{readiness.score}</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">/ 100</span>
            </ProgressRing>
            <div className="space-y-1.5">
              <Badge tone={readiness.tone === 'neutral' ? 'primary' : readiness.tone}>{readiness.band}</Badge>
              <p className="text-xs text-ink-secondary">Based on {readiness.sampleSize} comparable mocks</p>
              <p className="text-xs text-ink-secondary">vs {benchmark?.label}</p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-surface-muted p-4">
            <p className="text-sm font-semibold text-ink">
              {readiness.status === 'insufficient_data'
                ? 'Your readiness score will appear after you complete enough mock tests.'
                : 'Add a benchmark to see your readiness.'}
            </p>
            <p className="mt-1 text-xs text-ink-secondary">
              {readiness.status === 'insufficient_data'
                ? `${readiness.sampleSize} of ${readiness.required} comparable ${stageLabel} mocks recorded.`
                : 'No official cutoff is recorded for your category yet. Set a personal target in Settings.'}
            </p>
          </div>
        )}

        <dl className="mt-auto grid grid-cols-3 gap-3 rounded-2xl bg-surface-muted p-3 text-center">
          <div>
            <dt className="text-[11px] text-ink-secondary">Latest</dt>
            <dd className="tabular text-base font-bold text-ink">{performance.count ? `${formatMarks(performance.latestPercent, 1)}%` : '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-ink-secondary">Average</dt>
            <dd className="tabular text-base font-bold text-ink">{performance.count ? `${formatMarks(performance.averagePercent, 1)}%` : '—'}</dd>
          </div>
          <div>
            <dt className="text-[11px] text-ink-secondary">vs cutoff</dt>
            <dd className={`tabular text-base font-bold ${benchmarkMarks == null ? 'text-ink' : benchmarkMarks >= 0 ? 'text-success-ink' : 'text-danger-ink'}`}>
              {benchmarkMarks == null ? '—' : `${benchmarkMarks >= 0 ? '+' : ''}${formatMarks(benchmarkMarks, 1)}`}
            </dd>
          </div>
        </dl>
        {performance.count === 0 ? (
          <ButtonLink href="/analysis/mocks/new" variant="secondary" size="sm" className="w-full">
            Add your first mock test
          </ButtonLink>
        ) : null}
      </CardContent>
    </Card>
  );
}
