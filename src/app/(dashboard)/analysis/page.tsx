import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, ChartLine, ExternalLink, Gauge, History, Plus, Scale, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { getViewer } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { getCourseOverview } from '@/services/course.service';
import { getAnalysis } from '@/services/analytics.service';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Alert, Badge, EmptyState, PageHeader, ProgressBar, ProgressRing } from '@/components/ui/feedback';
import { ButtonLink } from '@/components/ui/button';
import { LastFiveChart, TrendChart } from '@/components/analysis/charts';
import { WhatIfCalculator } from '@/components/analysis/what-if';
import { QuerySelect } from '@/components/analysis/benchmark-select';
import { READINESS_CONFIG } from '@/lib/analytics/readiness';
import { categoryLabel } from '@/constants/app';
import { formatMarks } from '@/lib/utils/format';
import { formatDateKey } from '@/lib/utils/dates';
import { cn } from '@/lib/utils/cn';
import type { ExamStage } from '@/types/database';

export const metadata: Metadata = { title: 'Analysis' };

type Search = { stage?: string; cutoff?: string; pattern?: string };

export default async function AnalysisPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const stage: ExamStage = sp.stage === 'MAINS' ? 'MAINS' : 'PRELIMS';
  const viewer = await getViewer();
  const supabase = await getSupabase();
  const overview = await getCourseOverview(supabase);
  const a = await getAnalysis(supabase, viewer, stage, { cutoffId: sp.cutoff, pattern: sp.pattern, syllabusPercent: overview.percent });
  const stageLabel = stage === 'PRELIMS' ? 'Prelims' : 'Mains';
  const p = a.performance;
  const benchPct = a.benchmark?.percent ?? null;

  // Subjects are sorted best → worst; strong/weak never overlap.
  const split = Math.min(3, Math.floor(a.subjects.length / 2));
  const strong = a.subjects.slice(0, split);
  const weak = a.subjects.slice(a.subjects.length - split).reverse();

  return (
    <>
      <PageHeader
        eyebrow="Analysis"
        title="RAS readiness"
        description="Built only from your own mock tests. Course completion and study hours are tracked separately."
        actions={
          <>
            <ButtonLink href="/analysis/mocks" variant="outline" size="sm">
              <History className="h-4 w-4" /> Mock history
            </ButtonLink>
            <ButtonLink href={`/analysis/mocks/new?stage=${stage}`} size="sm">
              <Plus className="h-4 w-4" /> Add mock
            </ButtonLink>
          </>
        }
      />

      <div className="mb-5 inline-flex rounded-full bg-surface p-1 ring-1 ring-line" role="tablist" aria-label="Exam stage">
        {(['PRELIMS', 'MAINS'] as const).map((s) => (
          <Link
            key={s}
            href={`/analysis?stage=${s}`}
            role="tab"
            aria-selected={stage === s}
            className={cn(
              'rounded-full px-5 py-1.5 text-[13px] font-semibold transition-colors',
              stage === s ? 'bg-primary-strong text-primary-foreground' : 'text-ink-secondary hover:text-ink',
            )}
          >
            RAS {s === 'PRELIMS' ? 'Prelims' : 'Mains'}
          </Link>
        ))}
      </div>

      {a.mocks.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ChartLine className="h-5 w-5" />}
            title={`No ${stageLabel} mocks yet`}
            description={`Record your ${stageLabel} mock tests to unlock performance trends, subject analysis and your readiness score (after ${READINESS_CONFIG.minMocks} comparable mocks).`}
            action={
              <ButtonLink href={`/analysis/mocks/new?stage=${stage}`}>
                <Plus className="h-4 w-4" /> Add {stageLabel} mock
              </ButtonLink>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {a.patterns.length > 1 ? (
            <Alert tone="neutral">
              You have mocks for {a.patterns.length} exam-pattern versions. Only “{a.pattern}” mocks are compared below.
            </Alert>
          ) : null}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            {/* Readiness */}
            <Card>
              <CardHeader icon={<Gauge className="h-4 w-4" />} title="Readiness score" description={`Comparable ${stageLabel} mocks: ${a.comparableCount}`} />
              <CardContent>
                {a.readiness.status === 'ok' ? (
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="flex flex-col items-center gap-2">
                      <ProgressRing value={a.readiness.score} size={140} stroke={12} tone={a.readiness.tone === 'neutral' ? 'primary' : a.readiness.tone} label="Readiness score">
                        <span className="tabular text-4xl font-bold text-ink">{a.readiness.score}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">of 100</span>
                      </ProgressRing>
                      <Badge tone={a.readiness.tone === 'neutral' ? 'primary' : a.readiness.tone}>{a.readiness.band}</Badge>
                    </div>
                    <ul className="flex-1 space-y-3">
                      {a.readiness.components.map((c) => (
                        <li key={c.key}>
                          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                            <span className="font-semibold text-ink">
                              {c.label} <span className="font-normal text-ink-faint">· {Math.round(c.weight * 100)}%</span>
                            </span>
                            <span className="tabular font-semibold text-ink">{c.value === null ? 'n/a' : Math.round(c.value)}</span>
                          </div>
                          <ProgressBar value={c.value ?? 0} size="sm" tone={c.value === null ? 'neutral' : 'primary'} />
                          <p className="mt-1 text-[11px] text-ink-secondary">{c.detail}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : a.readiness.status === 'insufficient_data' ? (
                  <div className="rounded-2xl bg-surface-muted p-5">
                    <p className="text-sm font-semibold text-ink">Your readiness score will appear after you complete enough mock tests.</p>
                    <p className="mt-1 text-xs text-ink-secondary">
                      {a.readiness.sampleSize} of {a.readiness.required} comparable {stageLabel} mocks recorded. We never show a score from too little data.
                    </p>
                    <ProgressBar value={(a.readiness.sampleSize / a.readiness.required) * 100} className="mt-3" />
                  </div>
                ) : (
                  <div className="rounded-2xl bg-surface-muted p-5">
                    <p className="text-sm font-semibold text-ink">No benchmark available for your category ({categoryLabel(a.category)}).</p>
                    <p className="mt-1 text-xs text-ink-secondary">
                      Official cutoffs are added by the content owner with their source. Meanwhile, set a personal {stageLabel} target in{' '}
                      <Link href="/settings" className="font-semibold text-primary-strong hover:underline">
                        Settings
                      </Link>
                      .
                    </p>
                  </div>
                )}
                <p className="mt-4 text-[11px] leading-4 text-ink-faint">
                  Transparent heuristic: {Object.entries(READINESS_CONFIG.weights).map(([k, w]) => `${k} ${Math.round(w * 100)}%`).join(' · ')}. It reflects mock
                  performance only and is not a probability of selection.
                </p>
              </CardContent>
            </Card>

            {/* Benchmark + range */}
            <Card>
              <CardHeader icon={<Target className="h-4 w-4" />} title="Benchmark & score range" description={`Category: ${categoryLabel(a.category)}`} />
              <CardContent className="space-y-4">
                {a.candidateCutoffs.length > 0 ? (
                  <QuerySelect
                    name="cutoff"
                    label="Compare against"
                    value={a.benchmark?.kind === 'cutoff' ? a.benchmark.cutoff.id : ''}
                    options={a.candidateCutoffs.map((c) => ({
                      value: c.id,
                      label: `RAS ${c.exam_year} · ${c.cutoff_type} · ${formatMarks(Number(c.cutoff_marks))}/${formatMarks(Number(c.total_marks))}`,
                    }))}
                  />
                ) : null}
                {a.patterns.length > 1 ? (
                  <QuerySelect name="pattern" label="Exam pattern" value={a.pattern} options={a.patterns.map((v) => ({ value: v, label: v }))} />
                ) : null}

                {a.benchmark ? (
                  <div className="rounded-2xl bg-surface-muted p-4">
                    <p className="text-xs text-ink-secondary">{a.benchmark.label}</p>
                    <p className="tabular text-2xl font-bold text-ink">{formatMarks(a.benchmark.percent, 1)}%</p>
                    {a.benchmark.kind === 'cutoff' ? (
                      <a
                        href={a.benchmark.cutoff.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary-strong hover:underline"
                      >
                        Official source <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-ink-secondary">Personal benchmark — not an official cutoff.</p>
                    )}
                  </div>
                ) : null}

                {a.range ? (
                  <div>
                    <p className="text-xs font-semibold text-ink">Estimated mock-score range</p>
                    <p className="tabular mt-1 text-2xl font-bold text-ink">
                      {formatMarks(a.range.low, 0)}–{formatMarks(a.range.high, 0)}
                      <span className="text-sm font-semibold text-ink-faint"> / {formatMarks(a.range.examTotal, 0)}</span>
                    </p>
                    <RangeBar low={a.range.lowPercent} high={a.range.highPercent} mean={a.range.meanPercent} benchmark={benchPct} />
                    <p className="mt-2 text-[11px] text-ink-faint">
                      Mean ± 1 std-dev of your last {a.range.sampleSize} comparable mocks. A mock-performance estimate, not an official prediction. Rank estimation
                      needs real candidate-distribution data and is intentionally not shown.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Mocks" value={String(p.count)} />
            <StatTile label="Average" value={`${formatMarks(p.averagePercent, 1)}%`} />
            <StatTile label="Best" value={`${formatMarks(p.bestPercent, 1)}%`} hint={p.best?.name} />
            <StatTile label="Latest" value={`${formatMarks(p.latestPercent, 1)}%`} hint={p.latest ? formatDateKey(p.latest.date, 'd MMM') : undefined} />
            <StatTile label="Accuracy" value={p.accuracy === null ? '—' : `${formatMarks(p.accuracy, 1)}%`} hint={p.accuracy === null ? 'Add counts' : 'correct ÷ attempted'} />
            <StatTile
              label="Improvement"
              value={p.improvement === null ? '—' : `${p.improvement >= 0 ? '+' : ''}${formatMarks(p.improvement, 1)}`}
              hint="pts, recent vs earlier"
              tone={p.improvement === null ? undefined : p.improvement >= 0 ? 'up' : 'down'}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <Card>
              <CardHeader icon={<Activity className="h-4 w-4" />} title="Performance trend" description="Score % across comparable mocks" />
              <CardContent>
                {p.trend.length >= 2 ? <TrendChart points={p.trend} benchmark={benchPct} /> : <p className="py-10 text-center text-[13px] text-ink-secondary">Add at least two mocks to see a trend.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader title="Last five mocks" description={benchPct ? 'Green = at or above benchmark' : undefined} />
              <CardContent>
                <LastFiveChart points={p.lastFive} benchmark={benchPct} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader icon={<Scale className="h-4 w-4" />} title={stage === 'MAINS' ? 'Paper-wise performance' : 'Subject-wise performance'} description="Average across all comparable mocks" />
              <CardContent>
                {a.subjects.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-ink-secondary">Add subject-wise marks to your mocks to see strengths and weaknesses.</p>
                ) : (
                  <>
                    <ul className="space-y-3">
                      {a.subjects.map((s) => (
                        <li key={s.key}>
                          <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                            <span className="truncate font-semibold text-ink">{s.label}</span>
                            <span className="tabular shrink-0 text-ink-secondary">
                              {formatMarks(s.percent, 1)}% · {s.count} mock{s.count === 1 ? '' : 's'}
                            </span>
                          </div>
                          <ProgressBar value={s.percent} size="sm" tone={benchPct && s.percent >= benchPct ? 'success' : s.percent < (benchPct ?? 50) * 0.8 ? 'danger' : 'primary'} />
                        </li>
                      ))}
                    </ul>
                    {a.subjects.length >= 2 ? (
                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl bg-success-light p-3">
                          <p className="inline-flex items-center gap-1 text-xs font-semibold text-success-ink">
                            <TrendingUp className="h-3.5 w-3.5" /> Strong
                          </p>
                          <p className="mt-1 text-[13px] text-ink">{strong.map((s) => s.label).join(', ')}</p>
                        </div>
                        <div className="rounded-2xl bg-danger-light p-3">
                          <p className="inline-flex items-center gap-1 text-xs font-semibold text-danger-ink">
                            <TrendingDown className="h-3.5 w-3.5" /> Needs work
                          </p>
                          <p className="mt-1 text-[13px] text-ink">{weak.map((s) => s.label).join(', ')}</p>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            {p.latest ? (
              <WhatIfCalculator
                baseline={{ name: p.latest.name, obtained: p.latest.obtained, total: p.latest.total }}
                subjects={a.subjects.map((s) => ({ key: s.key, label: s.label, total: s.total, obtained: s.obtained, count: s.count }))}
                benchmark={
                  a.benchmark?.kind === 'cutoff'
                    ? { cutoffMarks: Number(a.benchmark.cutoff.cutoff_marks), totalMarks: Number(a.benchmark.cutoff.total_marks), label: a.benchmark.label }
                    : a.benchmark
                      ? { cutoffMarks: a.benchmark.percent, totalMarks: 100, label: a.benchmark.label }
                      : null
                }
              />
            ) : null}
          </div>

          <Card>
            <CardHeader title="Historical cutoffs" description={`Official RAS ${stageLabel} cutoffs for ${categoryLabel(a.category)} — never mixed across categories, stages or patterns`} />
            <CardContent>
              {a.categoryCutoffs.length === 0 ? (
                <p className="py-4 text-[13px] text-ink-secondary">No verified cutoffs recorded for your category yet.</p>
              ) : (
                <div className="-mx-5 overflow-x-auto px-5">
                  <table className="w-full min-w-[560px] text-left text-[13px]">
                    <thead>
                      <tr className="border-b border-line text-xs text-ink-secondary">
                        <th className="py-2 pr-3 font-semibold">Year</th>
                        <th className="py-2 pr-3 font-semibold">Type</th>
                        <th className="py-2 pr-3 font-semibold">Cutoff</th>
                        <th className="py-2 pr-3 font-semibold">%</th>
                        <th className="py-2 pr-3 font-semibold">Pattern</th>
                        <th className="py-2 pr-3 font-semibold">Your latest vs cutoff</th>
                        <th className="py-2 font-semibold">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.categoryCutoffs.map((c) => {
                        const pct = (Number(c.cutoff_marks) / Number(c.total_marks)) * 100;
                        const comparable = c.exam_pattern_version === a.pattern;
                        const diff = p.latest && comparable ? (p.latestPercent / 100) * Number(c.total_marks) - Number(c.cutoff_marks) : null;
                        return (
                          <tr key={c.id} className={cn('border-b border-line last:border-0', !comparable && 'text-ink-faint')}>
                            <td className="tabular py-2.5 pr-3 font-semibold">{c.exam_year}</td>
                            <td className="py-2.5 pr-3">{c.cutoff_type}</td>
                            <td className="tabular py-2.5 pr-3">
                              {formatMarks(Number(c.cutoff_marks))}/{formatMarks(Number(c.total_marks))}
                            </td>
                            <td className="tabular py-2.5 pr-3">{formatMarks(pct, 1)}%</td>
                            <td className="py-2.5 pr-3">{c.exam_pattern_version}</td>
                            <td className={cn('tabular py-2.5 pr-3 font-semibold', diff === null ? '' : diff >= 0 ? 'text-success-ink' : 'text-danger-ink')}>
                              {diff === null ? (comparable ? '—' : 'different pattern') : `${diff >= 0 ? '+' : ''}${formatMarks(diff, 1)}`}
                            </td>
                            <td className="py-2.5">
                              <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-strong hover:underline">
                                Link <ExternalLink className="h-3 w-3" />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

function StatTile({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'up' | 'down' }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-secondary">{label}</p>
      <p className={cn('tabular mt-1 text-xl font-bold', tone === 'up' ? 'text-success-ink' : tone === 'down' ? 'text-danger-ink' : 'text-ink')}>{value}</p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-ink-faint">{hint}</p> : null}
    </Card>
  );
}

function RangeBar({ low, high, mean, benchmark }: { low: number; high: number; mean: number; benchmark: number | null }) {
  return (
    <div className="relative mt-3 h-3 rounded-full bg-primary-light/70" role="img" aria-label={`Estimated range ${low}% to ${high}%${benchmark ? `, benchmark ${benchmark.toFixed(1)}%` : ''}`}>
      <span className="absolute inset-y-0 rounded-full bg-primary/60" style={{ left: `${low}%`, width: `${Math.max(1, high - low)}%` }} />
      <span className="absolute -top-0.5 h-4 w-1 rounded-full bg-primary-strong" style={{ left: `calc(${mean}% - 2px)` }} />
      {benchmark ? <span className="absolute -top-1 h-5 w-0.5 bg-warning" style={{ left: `${benchmark}%` }} title={`Benchmark ${benchmark.toFixed(1)}%`} /> : null}
    </div>
  );
}
