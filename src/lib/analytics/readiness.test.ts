import { describe, expect, it } from 'vitest';
import {
  balanceScore,
  computeReadiness,
  consistencyScore,
  estimateScoreRange,
  performanceScore,
  summarizePerformance,
  whatIf,
  type MockInput,
} from './readiness';
import { accuracyPercent, computeScore, validateCounts } from './mock-scoring';

const mock = (i: number, obtained: number, extra: Partial<MockInput> = {}): MockInput => ({
  id: `m${i}`,
  name: `Mock ${i}`,
  date: `2026-10-${String(i).padStart(2, '0')}`,
  total: 200,
  obtained,
  ...extra,
});

describe('mock scoring', () => {
  it('applies negative marking from the scheme (never hardcoded)', () => {
    expect(computeScore(100, 30, { marksPerCorrect: 2, negativeMarks: 2 / 3 })).toBe(180);
    expect(computeScore(100, 30, { marksPerCorrect: 1, negativeMarks: 0 })).toBe(100);
  });
  it('accuracy and count validation', () => {
    expect(accuracyPercent(80, 20)).toBe(80);
    expect(accuracyPercent(0, 0)).toBeNull();
    expect(validateCounts({ totalQuestions: 150, correct: 100, incorrect: 20, unattempted: 30 })).toBeNull();
    expect(validateCounts({ totalQuestions: 150, correct: 100, incorrect: 20, unattempted: 31 })).toMatch(/150/);
  });
});

describe('readiness', () => {
  it('requires the minimum number of comparable mocks — never fabricates a score', () => {
    const r = computeReadiness({ mocks: [mock(1, 120), mock(2, 130)], benchmarkPercent: 60, syllabusCompletion: 50 });
    expect(r).toEqual({ status: 'insufficient_data', sampleSize: 2, required: 5 });
  });

  it('requires a benchmark', () => {
    const mocks = [1, 2, 3, 4, 5].map((i) => mock(i, 120));
    expect(computeReadiness({ mocks, benchmarkPercent: null, syllabusCompletion: 50 }).status).toBe('no_benchmark');
  });

  it('scores bounded 0–100 with documented weights', () => {
    const mocks = [1, 2, 3, 4, 5].map((i) => mock(i, 130, { correct: 90, incorrect: 10 }));
    const r = computeReadiness({ mocks, benchmarkPercent: 65, syllabusCompletion: 100 });
    expect(r.status).toBe('ok');
    if (r.status !== 'ok') return;
    // perf: ratio 1.0 → 75; consistency 100; coverage 100; accuracy 90
    expect(r.score).toBe(Math.round(0.45 * 75 + 0.25 * 100 + 0.2 * 100 + 0.1 * 90));
    expect(r.band).toBe('Strong preparation');
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it('redistributes weight when accuracy is unavailable (e.g. Mains)', () => {
    const mocks = [1, 2, 3, 4, 5].map((i) => mock(i, 100));
    const r = computeReadiness({ mocks, benchmarkPercent: 50, syllabusCompletion: 0 });
    if (r.status !== 'ok') throw new Error('expected ok');
    const expected = (0.45 * 75 + 0.25 * 100 + 0.2 * 0) / 0.9;
    expect(r.score).toBe(Math.round(expected));
    expect(r.components.find((c) => c.key === 'accuracy')?.value).toBeNull();
  });

  it('performance curve and consistency are clamped', () => {
    expect(performanceScore(10, 60)).toBe(0);
    expect(performanceScore(60, 60)).toBe(75);
    expect(performanceScore(90, 60)).toBe(100);
    expect(consistencyScore([10, 90, 10, 90])).toBe(0);
    expect(consistencyScore([60, 60])).toBe(100);
    expect(balanceScore([50])).toBeNull();
    expect(balanceScore([50, 50])).toBe(100);
  });

  it('weights recent mocks more heavily', () => {
    const improving = [1, 2, 3, 4, 5].map((i) => mock(i, 80 + i * 10));
    const r = computeReadiness({ mocks: improving, benchmarkPercent: 60, syllabusCompletion: 50 });
    if (r.status !== 'ok') throw new Error('expected ok');
    expect(r.recentAveragePercent).toBeGreaterThan(55); // plain mean is 55
  });
});

describe('score range, summary and what-if', () => {
  const mocks = [mock(1, 100), mock(2, 120), mock(3, 140)];

  it('estimates a mean ± sd range scaled to the exam total', () => {
    const r = estimateScoreRange(mocks, 200)!;
    expect(r.mean).toBe(120);
    expect(r.low).toBeLessThan(120);
    expect(r.high).toBeGreaterThan(120);
  });

  it('summarises performance', () => {
    const s = summarizePerformance(mocks);
    expect(s.latestPercent).toBe(70);
    expect(s.bestPercent).toBe(70);
    expect(s.averagePercent).toBe(60);
    expect(s.improvement).toBe(10); // latest 70 vs the one before (60)
    expect(s.trend.map((t) => t.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('what-if is clamped to available marks and reports cutoff buffer', () => {
    const w = whatIf({ baseline: { obtained: 120, total: 200 }, extraMarks: 10, benchmark: { cutoffMarks: 125, totalMarks: 200 } });
    expect(w.projected).toBe(130);
    expect(w.buffer).toEqual({ before: -5, after: 5 });
    expect(whatIf({ baseline: { obtained: 195, total: 200 }, extraMarks: 50 }).projected).toBe(200);
    expect(whatIf({ baseline: { obtained: 100, total: 200 }, extraMarks: 10, subjectHeadroom: 4 }).appliedMarks).toBe(4);
  });
});
