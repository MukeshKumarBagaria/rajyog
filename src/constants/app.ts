export const APP_NAME = 'Rajyog';
export const APP_TAGLINE = 'Your calm space for RAS preparation';

export const EXAM_STAGES = [
  { value: 'PRELIMS', label: 'RAS Prelims' },
  { value: 'MAINS', label: 'RAS Mains' },
] as const;

/**
 * Candidate categories. RAS cutoffs are published per category (and gender),
 * so mocks are compared only against cutoffs of the user's own category.
 */
export const EXAM_CATEGORIES = [
  { value: 'GEN', label: 'General' },
  { value: 'GEN-F', label: 'General (Female)' },
  { value: 'EWS', label: 'EWS' },
  { value: 'EWS-F', label: 'EWS (Female)' },
  { value: 'OBC', label: 'OBC (Non-creamy layer)' },
  { value: 'OBC-F', label: 'OBC (Female)' },
  { value: 'MBC', label: 'MBC' },
  { value: 'MBC-F', label: 'MBC (Female)' },
  { value: 'SC', label: 'SC' },
  { value: 'SC-F', label: 'SC (Female)' },
  { value: 'ST', label: 'ST' },
  { value: 'ST-F', label: 'ST (Female)' },
  { value: 'OTHER', label: 'Other' },
] as const;

export function categoryLabel(value: string | null | undefined): string {
  return EXAM_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? '—';
}

export const STUDY_TYPES = [
  'Reading',
  'Notes making',
  'Revision',
  'MCQ practice',
  'Answer writing',
  'Current affairs',
  'Mock analysis',
  'Other',
] as const;

export const TIMER_PRESETS = [25, 45, 50] as const;

export const DIFFICULTIES = [
  { value: 'EASY', label: 'Easy' },
  { value: 'MODERATE', label: 'Moderate' },
  { value: 'HARD', label: 'Hard' },
] as const;

export const QUOTE_CATEGORIES = ['history', 'culture', 'courage', 'discipline', 'consistency', 'exam', 'folk-wisdom'] as const;

export const QUOTE_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'raj', label: 'Rajasthani' },
] as const;

/** Suggested RAS Mains paper labels for paper-wise mock entry. */
export const MAINS_PAPERS = [
  'Paper I — History, Economics & Sociology',
  'Paper II — General Science, Reasoning & Geography',
  'Paper III — Polity, Ethics & Current Affairs',
  'Paper IV — General Hindi & English',
] as const;

export const UNLOCK_COOKIE = 'rj_unlock';

/** Video heartbeat cadence (seconds). */
export const PROGRESS_FLUSH_SECONDS = 15;
