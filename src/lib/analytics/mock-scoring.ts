/**
 * Mock-test scoring helpers. Marking schemes are NEVER hardcoded: every mock
 * carries its own marks-per-correct and negative-marks values because RPSC
 * (and test providers) can change them.
 *
 *   Score = (Correct × Marks per correct) − (Incorrect × Negative marks)
 */

export type MarkingScheme = {
  marksPerCorrect: number;
  negativeMarks: number;
};

export function computeScore(correct: number, incorrect: number, scheme: MarkingScheme): number {
  const raw = correct * scheme.marksPerCorrect - incorrect * scheme.negativeMarks;
  return Math.round(raw * 100) / 100;
}

/** Accuracy = correct / attempted (0–100), or null if nothing attempted. */
export function accuracyPercent(correct: number | null | undefined, incorrect: number | null | undefined): number | null {
  if (correct == null || incorrect == null) return null;
  const attempted = correct + incorrect;
  if (attempted <= 0) return null;
  return (correct / attempted) * 100;
}

export function scorePercent(obtained: number, total: number): number {
  if (!total) return 0;
  return (obtained / total) * 100;
}

/** Validates question counts; returns an error message or null. */
export function validateCounts(input: {
  totalQuestions?: number | null;
  correct?: number | null;
  incorrect?: number | null;
  unattempted?: number | null;
}): string | null {
  const { totalQuestions, correct, incorrect, unattempted } = input;
  if (totalQuestions == null || correct == null || incorrect == null || unattempted == null) return null;
  if (correct + incorrect + unattempted !== totalQuestions) {
    return `Correct + incorrect + unattempted must equal ${totalQuestions} questions.`;
  }
  return null;
}
