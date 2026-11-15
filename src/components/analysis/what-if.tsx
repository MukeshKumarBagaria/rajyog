'use client';

import { useMemo, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, Select } from '@/components/ui/form-controls';
import { whatIf } from '@/lib/analytics/readiness';
import { formatMarks } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

type SubjectAgg = { key: string; label: string; total: number; obtained: number; count: number };

export function WhatIfCalculator({
  baseline,
  subjects,
  benchmark,
}: {
  baseline: { name: string; obtained: number; total: number };
  subjects: SubjectAgg[];
  benchmark: { cutoffMarks: number; totalMarks: number; label: string } | null;
}) {
  const [subjectKey, setSubjectKey] = useState(subjects[0]?.key ?? 'overall');
  const [extra, setExtra] = useState(10);

  const subject = subjects.find((s) => s.key === subjectKey);
  // Headroom: average unclaimed marks per mock in that subject (if known).
  const headroom = subject ? Math.max(0, (subject.total - subject.obtained) / Math.max(1, subject.count)) : undefined;

  const result = useMemo(
    () =>
      whatIf({
        baseline: { obtained: baseline.obtained, total: baseline.total },
        extraMarks: extra,
        subjectHeadroom: headroom,
        benchmark: benchmark ? { cutoffMarks: benchmark.cutoffMarks, totalMarks: benchmark.totalMarks } : null,
      }),
    [baseline, extra, headroom, benchmark],
  );

  return (
    <Card>
      <CardHeader icon={<FlaskConical className="h-4 w-4" />} title="What-if calculator" description={`Hypothetical scenario on your latest mock (${baseline.name})`} />
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="If I improve" htmlFor="whatif-subject">
            <Select id="whatif-subject" value={subjectKey} onChange={(e) => setSubjectKey(e.target.value)}>
              {subjects.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
              <option value="overall">Overall score</option>
            </Select>
          </Field>
          <Field label={`By ${extra} marks`} htmlFor="whatif-marks">
            <input
              id="whatif-marks"
              type="range"
              min={1}
              max={40}
              value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
              className="mt-3 w-full accent-[var(--primary-strong)]"
            />
          </Field>
        </div>
        {headroom !== undefined && result.appliedMarks < extra ? (
          <p className="text-xs text-warning-ink">Limited to {formatMarks(result.appliedMarks)} marks — the most still available in this subject.</p>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-surface-muted p-4">
            <p className="text-xs text-ink-secondary">Projected mock score</p>
            <p className="tabular mt-1 text-2xl font-bold text-ink">
              {formatMarks(result.projected)}
              <span className="text-sm font-semibold text-ink-faint"> / {formatMarks(baseline.total)}</span>
            </p>
            <p className="text-xs text-ink-secondary">
              {result.basePercent}% → <span className="font-semibold text-ink">{result.projectedPercent}%</span>
            </p>
          </div>
          <div className="rounded-2xl bg-surface-muted p-4">
            <p className="text-xs text-ink-secondary">Cutoff buffer</p>
            {result.buffer ? (
              <>
                <p className={cn('tabular mt-1 text-2xl font-bold', result.buffer.after >= 0 ? 'text-success-ink' : 'text-danger-ink')}>
                  {result.buffer.after >= 0 ? '+' : ''}
                  {formatMarks(result.buffer.after, 1)}
                </p>
                <p className="text-xs text-ink-secondary">
                  was {result.buffer.before >= 0 ? '+' : ''}
                  {formatMarks(result.buffer.before, 1)} vs {benchmark?.label}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-ink-secondary">Add an official cutoff to compare.</p>
            )}
          </div>
        </div>
        <p className="text-[11px] text-ink-faint">Hypothetical scenario for planning only — it is not a prediction of your exam result.</p>
      </CardContent>
    </Card>
  );
}
