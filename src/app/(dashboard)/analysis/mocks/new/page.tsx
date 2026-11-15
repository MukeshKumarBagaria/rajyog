import type { Metadata } from 'next';
import { getViewer } from '@/lib/auth/session';
import { getSupabase } from '@/lib/supabase/server';
import { getSubjectOptions } from '@/services/subject.service';
import { MockForm } from '@/components/analysis/mock-form';
import { PageHeader } from '@/components/ui/feedback';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { todayKey } from '@/lib/utils/dates';

export const metadata: Metadata = { title: 'Add mock' };

export default async function NewMockPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  const { stage } = await searchParams;
  const viewer = await getViewer();
  const supabase = await getSupabase();
  const subjects = await getSubjectOptions(supabase);
  const today = todayKey(viewer.timezone);
  const isMains = stage === 'MAINS';

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ href: '/analysis', label: 'Analysis' }, { href: '/analysis/mocks', label: 'Mock history' }, { label: 'Add' }]} />
      <PageHeader title="Add a mock test" description="Record the result honestly — your analysis is only as good as your data." />
      <MockForm
        subjects={subjects}
        today={today}
        initial={
          isMains
            ? {
                test_name: '',
                exam_stage: 'MAINS',
                test_date: today,
                provider: '',
                total_marks: 800,
                obtained_marks: '' as unknown as number,
                total_questions: '',
                correct_answers: '',
                incorrect_answers: '',
                unattempted: '',
                marks_per_correct: '',
                negative_marks: '',
                exam_pattern_version: 'current',
                difficulty: '',
                remarks: '',
                subjects: [],
              }
            : undefined
        }
      />
    </div>
  );
}
