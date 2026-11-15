import 'server-only';

import type { ServerSupabase } from '@/lib/supabase/server';
import type { CutoffRow, ExamStage, MockTestRow } from '@/types/database';
import type { Viewer } from '@/lib/auth/session';
import {
  aggregateSubjects,
  computeReadiness,
  estimateScoreRange,
  summarizePerformance,
  type MockInput,
  type ReadinessResult,
} from '@/lib/analytics/readiness';

export type MockWithScores = MockTestRow & {
  mock_subject_scores: {
    id: string;
    subject_id: string | null;
    label: string | null;
    total_marks: number;
    obtained_marks: number;
    subjects: { name: string } | null;
  }[];
};

export async function getMocks(supabase: ServerSupabase, stage?: ExamStage): Promise<MockWithScores[]> {
  let q = supabase
    .from('mock_tests')
    .select('*, mock_subject_scores(id, subject_id, label, total_marks, obtained_marks, subjects(name))')
    .order('test_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (stage) q = q.eq('exam_stage', stage);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MockWithScores[];
}

export function toMockInput(m: MockWithScores): MockInput {
  return {
    id: m.id,
    name: m.test_name,
    date: m.test_date,
    total: Number(m.total_marks),
    obtained: Number(m.obtained_marks),
    correct: m.correct_answers,
    incorrect: m.incorrect_answers,
    subjects: m.mock_subject_scores.map((s) => ({
      key: s.subject_id ?? `label:${(s.label ?? '').toLowerCase()}`,
      label: s.subjects?.name ?? s.label ?? 'Section',
      total: Number(s.total_marks),
      obtained: Number(s.obtained_marks),
    })),
  };
}

export async function getCutoffs(supabase: ServerSupabase, stage: ExamStage): Promise<CutoffRow[]> {
  const { data } = await supabase
    .from('historical_cutoffs')
    .select('*')
    .eq('exam_stage', stage)
    .order('exam_year', { ascending: false })
    .order('cutoff_type');
  return data ?? [];
}

export type Benchmark =
  | { kind: 'cutoff'; cutoff: CutoffRow; percent: number; label: string }
  | { kind: 'personal'; percent: number; label: string }
  | null;

export type AnalysisData = Awaited<ReturnType<typeof getAnalysis>>;

/**
 * Builds the analysis for one exam stage. Only the current user's mocks
 * (RLS), only one stage, one exam-pattern version and the user's own
 * category are ever compared with each other.
 */
export async function getAnalysis(
  supabase: ServerSupabase,
  viewer: Viewer,
  stage: ExamStage,
  opts: { cutoffId?: string; pattern?: string; syllabusPercent: number },
) {
  const [mocks, allCutoffs] = await Promise.all([getMocks(supabase, stage), getCutoffs(supabase, stage)]);

  const patterns = [...new Set(mocks.map((m) => m.exam_pattern_version))];
  const pattern = opts.pattern && patterns.includes(opts.pattern) ? opts.pattern : (mocks[0]?.exam_pattern_version ?? 'current');

  const comparable = mocks.filter((m) => m.exam_pattern_version === pattern);
  const inputs = comparable.map(toMockInput);

  const category = viewer.profile.exam_category;
  const categoryCutoffs = allCutoffs.filter((c) => c.category === category);
  const candidateCutoffs = categoryCutoffs.filter((c) => c.exam_pattern_version === pattern);

  let benchmark: Benchmark = null;
  const chosen = candidateCutoffs.find((c) => c.id === opts.cutoffId) ?? candidateCutoffs[0];
  if (chosen) {
    benchmark = {
      kind: 'cutoff',
      cutoff: chosen,
      percent: (Number(chosen.cutoff_marks) / Number(chosen.total_marks)) * 100,
      label: `RAS ${chosen.exam_year} ${chosen.cutoff_type} cutoff`,
    };
  } else {
    const personal = stage === 'PRELIMS' ? viewer.settings.prelims_target_percent : viewer.settings.mains_target_percent;
    if (personal) benchmark = { kind: 'personal', percent: Number(personal), label: 'Your personal target' };
  }

  const readiness: ReadinessResult = computeReadiness({
    mocks: inputs,
    benchmarkPercent: benchmark?.percent ?? null,
    syllabusCompletion: opts.syllabusPercent,
  });

  const examTotal = benchmark?.kind === 'cutoff' ? Number(benchmark.cutoff.total_marks) : (inputs[0]?.total ?? 0);
  const range = examTotal > 0 ? estimateScoreRange(inputs, examTotal) : null;
  const performance = summarizePerformance(inputs);
  const subjects = aggregateSubjects(inputs);

  return {
    stage,
    pattern,
    patterns,
    mocks,
    comparableCount: comparable.length,
    inputs,
    benchmark,
    candidateCutoffs,
    categoryCutoffs,
    readiness,
    range,
    performance,
    subjects,
    category,
  };
}

/** Compact readiness for the Home screen (latest stage the user practised). */
export async function getReadinessSnapshot(supabase: ServerSupabase, viewer: Viewer, syllabusPercent: number) {
  const { data: latest } = await supabase
    .from('mock_tests')
    .select('exam_stage')
    .order('test_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const stage: ExamStage = latest?.exam_stage ?? 'PRELIMS';
  return getAnalysis(supabase, viewer, stage, { syllabusPercent });
}
