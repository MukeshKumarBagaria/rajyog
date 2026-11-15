import { accuracyPercent, scorePercent } from './mock-scoring';

/**
 * ─── RAS readiness model (v1) ───────────────────────────────────────────────
 *
 * A transparent, configurable heuristic — NOT a scientifically validated
 * selection probability, and it must never be presented as one.
 *
 * Components (each normalised to 0–100):
 *  • Performance  45 % — recency-weighted average of the last N comparable mocks
 *                         relative to the selected cutoff benchmark.
 *  • Consistency  25 % — penalises volatility (std-dev of those mock %).
 *  • Coverage     20 % — syllabus completion blended with subject-wise balance
 *                         from mock subject scores.
 *  • Accuracy     10 % — correct ÷ attempted across recent mocks (Prelims).
 *
 * If a component has no data (e.g. accuracy for Mains) its weight is
 * redistributed proportionally among the others. A score is produced only
 * after `minMocks` comparable mocks exist and a benchmark is available.
 */
export const READINESS_CONFIG = {
  minMocks: 5,
  recentWindow: 5,
  weights: { performance: 0.45, consistency: 0.25, coverage: 0.2, accuracy: 0.1 },
  /** Performance mapping: ratio of recent % to benchmark % → score. */
  performanceCurve: [
    { ratio: 0.6, score: 0 },
    { ratio: 1.0, score: 75 },
    { ratio: 1.15, score: 100 },
  ],
  /** Consistency: 100 − sdPenalty × std-dev (percentage points). */
  sdPenalty: 5,
  bands: [
    { min: 80, label: 'Strong preparation', tone: 'success' },
    { min: 60, label: 'Competitive', tone: 'primary' },
    { min: 40, label: 'Approaching target', tone: 'warning' },
    { min: 0, label: 'Below target', tone: 'danger' },
  ],
} as const;

export type ReadinessTone = 'success' | 'primary' | 'warning' | 'danger' | 'neutral';

export type SubjectScoreInput = {
  key: string; // subject id or paper label
  label: string;
  total: number;
  obtained: number;
};

export type MockInput = {
  id: string;
  name: string;
  date: string; // yyyy-MM-dd
  total: number;
  obtained: number;
  correct?: number | null;
  incorrect?: number | null;
  subjects?: SubjectScoreInput[];
};

export type ReadinessComponent = {
  key: keyof typeof READINESS_CONFIG.weights;
  label: string;
  weight: number;
  value: number | null;
  detail: string;
};

export type ReadinessResult =
  | { status: 'insufficient_data'; sampleSize: number; required: number }
  | { status: 'no_benchmark'; sampleSize: number }
  | {
      status: 'ok';
      score: number;
      band: string;
      tone: ReadinessTone;
      sampleSize: number;
      components: ReadinessComponent[];
      recentAveragePercent: number;
      benchmarkPercent: number;
    };

const round = (n: number, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
export const clamp100 = (n: number) => Math.min(100, Math.max(0, n));

export function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2)));
}

/** Newest first, chronological sort helper. */
export function sortByDateDesc<T extends { date: string }>(mocks: T[]): T[] {
  return [...mocks].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** Recency weights N, N-1, …, 1 (newest weighs most). */
export function recencyWeightedMean(newestFirst: number[]): number {
  if (!newestFirst.length) return 0;
  const n = newestFirst.length;
  let sum = 0;
  let w = 0;
  newestFirst.forEach((v, i) => {
    sum += v * (n - i);
    w += n - i;
  });
  return sum / w;
}

export function performanceScore(recentPercent: number, benchmarkPercent: number): number {
  if (benchmarkPercent <= 0) return 0;
  const ratio = recentPercent / benchmarkPercent;
  const curve = READINESS_CONFIG.performanceCurve;
  if (ratio <= curve[0].ratio) return curve[0].score;
  for (let i = 1; i < curve.length; i++) {
    const a = curve[i - 1];
    const b = curve[i];
    if (ratio <= b.ratio) return a.score + ((ratio - a.ratio) / (b.ratio - a.ratio)) * (b.score - a.score);
  }
  return curve[curve.length - 1].score;
}

export function consistencyScore(percents: number[]): number {
  return clamp100(100 - stdDev(percents) * READINESS_CONFIG.sdPenalty);
}

/** 100 × (1 − coefficient of variation) across subject percentages; null if < 2 subjects. */
export function balanceScore(subjectPercents: number[]): number | null {
  if (subjectPercents.length < 2) return null;
  const m = mean(subjectPercents);
  if (m <= 0) return 0;
  return clamp100(100 * (1 - Math.min(1, stdDev(subjectPercents) / m)));
}

export function aggregateSubjects(mocks: MockInput[]): { key: string; label: string; percent: number; total: number; obtained: number; count: number }[] {
  const map = new Map<string, { key: string; label: string; total: number; obtained: number; count: number }>();
  for (const m of mocks) {
    for (const s of m.subjects ?? []) {
      if (!(s.total > 0)) continue;
      const cur = map.get(s.key) ?? { key: s.key, label: s.label, total: 0, obtained: 0, count: 0 };
      cur.total += s.total;
      cur.obtained += s.obtained;
      cur.count += 1;
      map.set(s.key, cur);
    }
  }
  return [...map.values()]
    .map((s) => ({ ...s, percent: scorePercent(s.obtained, s.total) }))
    .sort((a, b) => b.percent - a.percent);
}

export function bandFor(score: number): { label: string; tone: ReadinessTone } {
  const band = READINESS_CONFIG.bands.find((b) => score >= b.min) ?? READINESS_CONFIG.bands[READINESS_CONFIG.bands.length - 1];
  return { label: band.label, tone: band.tone };
}

export function computeReadiness(input: {
  mocks: MockInput[];
  benchmarkPercent: number | null;
  /** Course completion 0–100 (lecture based). */
  syllabusCompletion: number;
}): ReadinessResult {
  const { minMocks, recentWindow, weights } = READINESS_CONFIG;
  const sorted = sortByDateDesc(input.mocks);
  const sampleSize = sorted.length;

  if (sampleSize < minMocks) return { status: 'insufficient_data', sampleSize, required: minMocks };
  if (!input.benchmarkPercent || input.benchmarkPercent <= 0) return { status: 'no_benchmark', sampleSize };

  const recent = sorted.slice(0, recentWindow);
  const percents = recent.map((m) => scorePercent(m.obtained, m.total));
  const recentAvg = recencyWeightedMean(percents);

  const perf = performanceScore(recentAvg, input.benchmarkPercent);
  const cons = consistencyScore(percents);

  const subjects = aggregateSubjects(recent);
  const balance = balanceScore(subjects.map((s) => s.percent));
  const syllabus = clamp100(input.syllabusCompletion);
  const coverage = balance === null ? syllabus : 0.5 * syllabus + 0.5 * balance;

  let correct = 0;
  let incorrect = 0;
  let hasAccuracy = false;
  for (const m of recent) {
    if (m.correct != null && m.incorrect != null) {
      correct += m.correct;
      incorrect += m.incorrect;
      hasAccuracy = true;
    }
  }
  const accuracy = hasAccuracy ? accuracyPercent(correct, incorrect) : null;

  const components: ReadinessComponent[] = [
    {
      key: 'performance',
      label: 'Recent performance',
      weight: weights.performance,
      value: round(perf),
      detail: `Recent average ${round(recentAvg)}% vs benchmark ${round(input.benchmarkPercent)}%`,
    },
    {
      key: 'consistency',
      label: 'Consistency',
      weight: weights.consistency,
      value: round(cons),
      detail: `Score spread ±${round(stdDev(percents))} percentage points across the last ${recent.length} mocks`,
    },
    {
      key: 'coverage',
      label: 'Coverage & balance',
      weight: weights.coverage,
      value: round(coverage),
      detail:
        balance === null
          ? `Syllabus completion ${round(syllabus)}% (add subject-wise marks to include balance)`
          : `Syllabus ${round(syllabus)}% · subject balance ${round(balance)}%`,
    },
    {
      key: 'accuracy',
      label: 'Accuracy',
      weight: weights.accuracy,
      value: accuracy === null ? null : round(accuracy),
      detail: accuracy === null ? 'Not available (enter correct/incorrect counts)' : `${correct} correct of ${correct + incorrect} attempted`,
    },
  ];

  const usable = components.filter((c) => c.value !== null);
  const totalWeight = usable.reduce((a, c) => a + c.weight, 0);
  const score = round(usable.reduce((a, c) => a + c.weight * (c.value as number), 0) / totalWeight, 0);
  const band = bandFor(score);

  return {
    status: 'ok',
    score,
    band: band.label,
    tone: band.tone,
    sampleSize,
    components,
    recentAveragePercent: round(recentAvg),
    benchmarkPercent: round(input.benchmarkPercent),
  };
}

/**
 * Estimated score range from recent comparable mocks: mean ± 1 std-dev,
 * expressed in the marks of `examTotal`. A mock-performance estimate only.
 */
export function estimateScoreRange(mocks: MockInput[], examTotal: number, window = READINESS_CONFIG.recentWindow) {
  const recent = sortByDateDesc(mocks).slice(0, window);
  if (recent.length === 0) return null;
  const percents = recent.map((m) => scorePercent(m.obtained, m.total));
  const m = mean(percents);
  const sd = stdDev(percents);
  const low = clamp100(m - sd);
  const high = clamp100(m + sd);
  return {
    lowPercent: round(low),
    highPercent: round(high),
    meanPercent: round(m),
    low: round((low / 100) * examTotal),
    high: round((high / 100) * examTotal),
    mean: round((m / 100) * examTotal),
    examTotal,
    sampleSize: recent.length,
  };
}

export type PerformanceSummary = {
  count: number;
  averagePercent: number;
  bestPercent: number;
  latestPercent: number;
  latest: MockInput | null;
  best: MockInput | null;
  accuracy: number | null;
  /** Avg of last 3 minus avg of the 3 before (percentage points); null if < 2 mocks. */
  improvement: number | null;
  lastFive: { id: string; name: string; date: string; percent: number }[];
  trend: { id: string; name: string; date: string; percent: number; obtained: number; total: number }[];
};

export function summarizePerformance(mocks: MockInput[]): PerformanceSummary {
  const newest = sortByDateDesc(mocks);
  const pct = (m: MockInput) => round(scorePercent(m.obtained, m.total));
  const percents = newest.map(pct);

  let correct = 0;
  let incorrect = 0;
  let has = false;
  newest.forEach((m) => {
    if (m.correct != null && m.incorrect != null) {
      correct += m.correct;
      incorrect += m.incorrect;
      has = true;
    }
  });

  let improvement: number | null = null;
  if (newest.length >= 2) {
    const k = Math.min(3, Math.floor(newest.length / 2));
    improvement = round(mean(percents.slice(0, k)) - mean(percents.slice(k, k * 2)));
  }

  const bestIdx = percents.length ? percents.indexOf(Math.max(...percents)) : -1;

  return {
    count: newest.length,
    averagePercent: round(mean(percents)),
    bestPercent: bestIdx >= 0 ? percents[bestIdx] : 0,
    latestPercent: percents[0] ?? 0,
    latest: newest[0] ?? null,
    best: bestIdx >= 0 ? newest[bestIdx] : null,
    accuracy: has ? round(accuracyPercent(correct, incorrect) ?? 0) : null,
    improvement,
    lastFive: newest.slice(0, 5).map((m) => ({ id: m.id, name: m.name, date: m.date, percent: pct(m) })).reverse(),
    trend: [...newest].reverse().map((m) => ({ id: m.id, name: m.name, date: m.date, percent: pct(m), obtained: m.obtained, total: m.total })),
  };
}

/**
 * What-if scenario: add `extraMarks` to a subject in a baseline mock and
 * project the new score and cutoff buffer. Purely hypothetical.
 */
export function whatIf(input: {
  baseline: { obtained: number; total: number };
  extraMarks: number;
  subjectHeadroom?: number; // max marks still available in that subject
  benchmark?: { cutoffMarks: number; totalMarks: number } | null;
}) {
  const headroom = input.subjectHeadroom ?? input.baseline.total - input.baseline.obtained;
  const applied = Math.max(-input.baseline.obtained, Math.min(input.extraMarks, headroom));
  const projected = Math.min(input.baseline.total, input.baseline.obtained + applied);
  const projectedPercent = scorePercent(projected, input.baseline.total);
  const basePercent = scorePercent(input.baseline.obtained, input.baseline.total);

  let buffer: { before: number; after: number } | null = null;
  if (input.benchmark && input.benchmark.totalMarks > 0) {
    const scale = input.benchmark.totalMarks / 100;
    buffer = {
      before: round(basePercent * scale - input.benchmark.cutoffMarks),
      after: round(projectedPercent * scale - input.benchmark.cutoffMarks),
    };
  }

  return {
    appliedMarks: round(applied, 2),
    projected: round(projected, 2),
    projectedPercent: round(projectedPercent),
    basePercent: round(basePercent),
    buffer,
  };
}
