'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form-controls';
import { Alert } from '@/components/ui/feedback';
import { saveMockAction } from '@/actions/mocks';
import { mockTestSchema, type MockTestInput, type MockTestValues } from '@/lib/validation/schemas';
import { computeScore } from '@/lib/analytics/mock-scoring';
import { DIFFICULTIES, MAINS_PAPERS } from '@/constants/app';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';
import type { SubjectOption } from '@/services/subject.service';

export function MockForm({ subjects, initial, today }: { subjects: SubjectOption[]; initial?: MockTestInput; today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const form = useForm<MockTestInput, unknown, MockTestValues>({
    resolver: zodResolver(mockTestSchema),
    defaultValues: initial ?? {
      test_name: '',
      exam_stage: 'PRELIMS',
      test_date: today,
      provider: '',
      total_marks: 200,
      obtained_marks: '' as unknown as number,
      total_questions: 150,
      correct_answers: '',
      incorrect_answers: '',
      unattempted: '',
      marks_per_correct: '',
      negative_marks: '',
      exam_pattern_version: 'current',
      difficulty: '',
      remarks: '',
      subjects: [],
    },
  });
  const { register, control, handleSubmit, setValue, formState } = form;
  const errors = formState.errors;
  const { fields, append, remove } = useFieldArray({ control, name: 'subjects' });

  const [stage, totalQ, correct, incorrect, mpc, neg] = useWatch({
    control,
    name: ['exam_stage', 'total_questions', 'correct_answers', 'incorrect_answers', 'marks_per_correct', 'negative_marks'],
  });
  const num = (v: unknown) => (v === '' || v === null || v === undefined ? null : Number(v));
  const c = num(correct);
  const w = num(incorrect);
  const m = num(mpc);
  const n = num(neg);
  const calculated = c !== null && w !== null && m !== null ? computeScore(c, w, { marksPerCorrect: m, negativeMarks: n ?? 0 }) : null;
  const tq = num(totalQ);
  const derivedUnattempted = tq !== null && c !== null && w !== null ? tq - c - w : null;

  const onSubmit = (values: MockTestValues) =>
    start(async () => {
      const res = await saveMockAction({ ...values, id: initial?.id } as MockTestInput);
      if (!res.ok) {
        toast.error('Could not save mock', res.error);
        return;
      }
      toast.success(initial?.id ? 'Mock updated' : 'Mock saved', 'Your analysis has been refreshed.');
      router.push(`/analysis?stage=${values.exam_stage}`);
      router.refresh();
    });

  const err = (path: string) => {
    const parts = path.split('.');
    let cur: unknown = errors;
    for (const p of parts) cur = (cur as Record<string, unknown> | undefined)?.[p];
    return (cur as { message?: string } | undefined)?.message;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <Card>
        <CardHeader title="Test details" />
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Mock test name" htmlFor="test_name" error={err('test_name')} className="sm:col-span-2">
            <Input id="test_name" placeholder="e.g. Full-length Mock 7" {...register('test_name')} aria-invalid={Boolean(err('test_name'))} />
          </Field>
          <Field label="Exam stage" htmlFor="exam_stage" hint="Prelims and Mains are analysed separately.">
            <Select id="exam_stage" {...register('exam_stage')}>
              <option value="PRELIMS">RAS Prelims</option>
              <option value="MAINS">RAS Mains</option>
            </Select>
          </Field>
          <Field label="Test date" htmlFor="test_date" error={err('test_date')}>
            <Input id="test_date" type="date" max={today} {...register('test_date')} />
          </Field>
          <Field label="Test provider" htmlFor="provider" hint="Optional">
            <Input id="provider" placeholder="e.g. Coaching / self-made" {...register('provider')} />
          </Field>
          <Field label="Difficulty" htmlFor="difficulty" hint="Optional">
            <Select id="difficulty" {...register('difficulty')}>
              <option value="">Not specified</option>
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Exam pattern version"
            htmlFor="exam_pattern_version"
            hint="Only mocks of the same pattern are compared. Keep “current” unless RPSC changes the scheme."
            className="sm:col-span-2"
          >
            <Input id="exam_pattern_version" {...register('exam_pattern_version')} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Score" description={stage === 'PRELIMS' ? 'Enter counts and the marking scheme to calculate the score with negative marking.' : 'Enter total and obtained marks. Add paper-wise marks below.'} />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Total marks" htmlFor="total_marks" error={err('total_marks')}>
              <Input id="total_marks" type="number" step="0.01" inputMode="decimal" {...register('total_marks')} />
            </Field>
            <Field label="Obtained marks" htmlFor="obtained_marks" error={err('obtained_marks')}>
              <Input id="obtained_marks" type="number" step="0.01" inputMode="decimal" {...register('obtained_marks')} aria-invalid={Boolean(err('obtained_marks'))} />
            </Field>
          </div>

          {stage === 'PRELIMS' ? (
            <div className="rounded-2xl bg-surface-muted p-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <Field label="Questions" htmlFor="total_questions">
                  <Input id="total_questions" type="number" inputMode="numeric" {...register('total_questions')} />
                </Field>
                <Field label="Correct" htmlFor="correct_answers">
                  <Input id="correct_answers" type="number" inputMode="numeric" {...register('correct_answers')} />
                </Field>
                <Field label="Incorrect" htmlFor="incorrect_answers">
                  <Input id="incorrect_answers" type="number" inputMode="numeric" {...register('incorrect_answers')} />
                </Field>
                <Field label="Unattempted" htmlFor="unattempted" error={err('unattempted')}>
                  <Input id="unattempted" type="number" inputMode="numeric" {...register('unattempted')} />
                </Field>
                <Field label="Marks per correct" htmlFor="marks_per_correct">
                  <Input id="marks_per_correct" type="number" step="0.001" inputMode="decimal" placeholder="e.g. 1.333" {...register('marks_per_correct')} />
                </Field>
                <Field label="Negative per wrong" htmlFor="negative_marks">
                  <Input id="negative_marks" type="number" step="0.001" inputMode="decimal" placeholder="e.g. 0.444" {...register('negative_marks')} />
                </Field>
                <div className="flex flex-col justify-end gap-2 sm:col-span-2">
                  {derivedUnattempted !== null && derivedUnattempted >= 0 ? (
                    <Button type="button" size="sm" variant="ghost" className="justify-start" onClick={() => setValue('unattempted', derivedUnattempted, { shouldValidate: true })}>
                      Set unattempted to {derivedUnattempted}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={calculated === null}
                    onClick={() => calculated !== null && setValue('obtained_marks', calculated, { shouldValidate: true })}
                  >
                    <Calculator className="h-4 w-4" />
                    {calculated === null ? 'Fill counts + scheme to calculate' : `Use calculated score: ${calculated}`}
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-xs text-ink-secondary">
                Score = (Correct × marks per correct) − (Incorrect × negative marks). The scheme is stored with each mock, so it can change over time.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={stage === 'MAINS' ? 'Paper / section-wise marks' : 'Subject-wise marks'}
          description="Optional, but it powers weak/strong subject analysis and the what-if calculator."
          action={
            stage === 'MAINS' ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => MAINS_PAPERS.forEach((label) => append({ subject_id: '', label, total_marks: 200, obtained_marks: '' as unknown as number }))}
              >
                Add 4 papers
              </Button>
            ) : null
          }
        />
        <CardContent className="space-y-3">
          {fields.map((f, i) => (
            <div key={f.id} className="grid grid-cols-2 items-end gap-3 rounded-2xl border border-line p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_110px_auto]">
              <Field label="Subject" htmlFor={`s-${i}-subject`} className="col-span-2 sm:col-span-1">
                <Select id={`s-${i}-subject`} {...register(`subjects.${i}.subject_id`)}>
                  <option value="">Custom paper/section…</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Or name" htmlFor={`s-${i}-label`} error={err(`subjects.${i}.label`)} className="col-span-2 sm:col-span-1">
                <Input id={`s-${i}-label`} placeholder="e.g. Paper I" {...register(`subjects.${i}.label`)} />
              </Field>
              <Field label="Total" htmlFor={`s-${i}-total`} error={err(`subjects.${i}.total_marks`)}>
                <Input id={`s-${i}-total`} type="number" step="0.01" {...register(`subjects.${i}.total_marks`)} />
              </Field>
              <Field label="Obtained" htmlFor={`s-${i}-obtained`} error={err(`subjects.${i}.obtained_marks`)}>
                <Input id={`s-${i}-obtained`} type="number" step="0.01" {...register(`subjects.${i}.obtained_marks`)} />
              </Field>
              <Button type="button" size="icon" variant="ghost" onClick={() => remove(i)} aria-label={`Remove row ${i + 1}`} className="col-span-2 justify-self-end sm:col-span-1">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ subject_id: '', label: '', total_marks: '' as unknown as number, obtained_marks: '' as unknown as number })}
          >
            <Plus className="h-4 w-4" /> Add {stage === 'MAINS' ? 'paper / section' : 'subject'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Personal remarks" description="What went well, what to fix before the next mock." />
        <CardContent>
          <Textarea id="remarks" rows={3} aria-label="Personal remarks" {...register('remarks')} />
        </CardContent>
      </Card>

      {Object.keys(errors).length > 0 ? <Alert tone="danger">Please fix the highlighted fields.</Alert> : null}

      <div className={cn('sticky bottom-20 z-10 flex justify-end gap-2 rounded-2xl border border-line bg-surface/95 p-3 shadow-[var(--shadow-lift)] backdrop-blur md:bottom-4')}>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          {initial?.id ? 'Save changes' : 'Save mock'}
        </Button>
      </div>
    </form>
  );
}
