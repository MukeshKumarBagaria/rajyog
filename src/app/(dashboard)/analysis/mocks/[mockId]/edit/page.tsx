import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getViewer } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { getSubjectOptions } from '@/services/subject.service';
import { MockForm } from '@/components/analysis/mock-form';
import { PageHeader } from '@/components/ui/feedback';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { todayKey } from '@/lib/utils/dates';
import { uuid } from '@/lib/validation/schemas';
import type { MockTestInput } from '@/lib/validation/schemas';

export const metadata: Metadata = { title: 'Edit mock' };

export default async function EditMockPage({ params }: { params: Promise<{ mockId: string }> }) {
  const { mockId } = await params;
  if (!uuid.safeParse(mockId).success) notFound();
  const viewer = await getViewer();
  const supabase = await getSupabase();
  const [{ data: mock }, subjects] = await Promise.all([
    supabase.from('mock_tests').select('*, mock_subject_scores(subject_id, label, total_marks, obtained_marks)').eq('id', mockId).maybeSingle(),
    getSubjectOptions(supabase),
  ]);
  if (!mock) notFound();

  const s = (v: number | null) => (v === null ? '' : v);
  const initial: MockTestInput = {
    id: mock.id,
    test_name: mock.test_name,
    exam_stage: mock.exam_stage,
    test_date: mock.test_date,
    provider: mock.provider ?? '',
    total_marks: Number(mock.total_marks),
    obtained_marks: Number(mock.obtained_marks),
    total_questions: s(mock.total_questions),
    correct_answers: s(mock.correct_answers),
    incorrect_answers: s(mock.incorrect_answers),
    unattempted: s(mock.unattempted),
    marks_per_correct: s(mock.marks_per_correct === null ? null : Number(mock.marks_per_correct)),
    negative_marks: s(mock.negative_marks === null ? null : Number(mock.negative_marks)),
    exam_pattern_version: mock.exam_pattern_version,
    difficulty: mock.difficulty ?? '',
    remarks: mock.remarks ?? '',
    subjects: mock.mock_subject_scores.map((x) => ({
      subject_id: x.subject_id ?? '',
      label: x.label ?? '',
      total_marks: Number(x.total_marks),
      obtained_marks: Number(x.obtained_marks),
    })),
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ href: '/analysis', label: 'Analysis' }, { href: '/analysis/mocks', label: 'Mock history' }, { label: 'Edit' }]} />
      <PageHeader title="Edit mock test" description={mock.test_name} />
      <MockForm subjects={subjects} initial={initial} today={todayKey(viewer.timezone)} />
    </div>
  );
}
