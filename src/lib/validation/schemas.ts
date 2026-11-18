import { z } from 'zod';

const trimmed = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : null));

export const uuid = z.string().uuid();

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
  next: z.string().optional(),
});

export const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

export const passwordSchema = z
  .object({
    password: z.string().min(8, 'Use at least 8 characters').max(72, 'Use at most 72 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export const pinSchema = z.object({ pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits') });

export const pinSetupSchema = z
  .object({
    pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits'),
    confirm: z.string(),
  })
  .refine((v) => v.pin === v.confirm, { path: ['confirm'], message: 'PINs do not match' });

export const profileSchema = z.object({
  full_name: trimmed(120).min(1, 'Enter your name'),
  exam_category: trimmed(40).min(1),
  target_exam_year: z.coerce
    .number()
    .int()
    .min(2020)
    .max(2100)
    .optional()
    .or(z.literal('').transform(() => undefined)),
  timezone: trimmed(64).min(1),
  daily_target_minutes: z.coerce.number().int().min(10, 'At least 10 minutes').max(1440),
  language: z.enum(['en', 'hi']),
});

export const preferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  preferred_language: z.enum(['en', 'hi', 'both']),
  notification_enabled: z.boolean(),
  auto_lock_minutes: z.coerce.number().int().min(1).max(240),
  streak_min_minutes: z.coerce.number().int().min(5).max(600),
  prelims_target_percent: z.coerce.number().min(1).max(100).nullable(),
  mains_target_percent: z.coerce.number().min(1).max(100).nullable(),
});

export const taskSchema = z.object({
  title: trimmed(200).min(1, 'Describe the task'),
  subject_id: uuid.nullable().optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const noteSchema = z.object({
  id: uuid.optional(),
  lecture_id: uuid.nullable().optional(),
  chapter_id: uuid.nullable().optional(),
  title: optionalText(160),
  content: trimmed(10000).min(1, 'Write something first'),
});

export const focusSessionSchema = z.object({
  id: uuid,
  session_type: z.enum(['MANUAL', 'POMODORO']),
  subject_id: uuid.nullable(),
  study_type: trimmed(40).nullable(),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
  duration_seconds: z.number().int().min(60, 'Sessions shorter than a minute are not saved').max(43200),
  notes: trimmed(500).nullable().optional(),
});

/** Payload accepted by /api/progress (also used by sendBeacon). */
export const progressPayloadSchema = z.object({
  lectureId: uuid,
  segments: z.array(z.tuple([z.number().min(0).max(86400), z.number().min(0).max(86400)])).max(500),
  position: z.number().min(0).max(86400),
  sessionId: uuid.nullable().optional(),
  activeSeconds: z.number().int().min(0).max(3600).default(0),
  seq: z.number().int().min(0).max(1_000_000).default(0),
  duration: z.number().int().min(0).max(86400).nullable().optional(),
});
export type ProgressPayload = z.infer<typeof progressPayloadSchema>;

const num = z.coerce.number();
const optionalInt = z
  .union([z.literal(''), z.null(), z.undefined(), z.coerce.number().int().min(0).max(1000)])
  .transform((v) => (v === '' || v === undefined || v === null ? null : v));
const optionalNum = z
  .union([z.literal(''), z.null(), z.undefined(), z.coerce.number().min(0).max(100)])
  .transform((v) => (v === '' || v === undefined || v === null ? null : v));

export const mockSubjectScoreSchema = z
  .object({
    subject_id: z.string().optional().nullable(),
    label: z.string().trim().max(120).optional().nullable(),
    total_marks: num.positive('Total must be > 0').max(10000),
    obtained_marks: num.min(-10000).max(10000),
  })
  .refine((v) => (v.subject_id && v.subject_id.length > 0) || (v.label && v.label.length > 0), {
    message: 'Choose a subject or enter a paper/section name',
    path: ['label'],
  })
  .refine((v) => v.obtained_marks <= v.total_marks, { message: 'Cannot exceed total', path: ['obtained_marks'] });

export const mockTestSchema = z
  .object({
    id: z.string().optional(),
    test_name: trimmed(160).min(1, 'Name this mock'),
    exam_stage: z.enum(['PRELIMS', 'MAINS']),
    test_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date'),
    provider: trimmed(120).optional(),
    total_marks: num.positive('Total marks must be greater than 0').max(10000),
    obtained_marks: num.min(-10000).max(10000),
    total_questions: optionalInt,
    correct_answers: optionalInt,
    incorrect_answers: optionalInt,
    unattempted: optionalInt,
    marks_per_correct: optionalNum,
    negative_marks: optionalNum,
    exam_pattern_version: trimmed(40).optional(),
    difficulty: z.enum(['EASY', 'MODERATE', 'HARD']).optional().or(z.literal('')),
    remarks: trimmed(2000).optional(),
    subjects: z.array(mockSubjectScoreSchema).max(40).default([]),
  })
  .refine((v) => v.obtained_marks <= v.total_marks, { path: ['obtained_marks'], message: 'Cannot exceed total marks' })
  .refine((v) => v.obtained_marks >= -v.total_marks, { path: ['obtained_marks'], message: 'Too low' })
  .refine(
    (v) =>
      v.total_questions == null ||
      v.correct_answers == null ||
      v.incorrect_answers == null ||
      v.unattempted == null ||
      v.correct_answers + v.incorrect_answers + v.unattempted === v.total_questions,
    { path: ['unattempted'], message: 'Correct + incorrect + unattempted must equal total questions' },
  );
export type MockTestInput = z.input<typeof mockTestSchema>;
export type MockTestValues = z.output<typeof mockTestSchema>;

/* ── Admin content ─────────────────────────────────────────────────────── */

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const subjectSchema = z.object({
  id: uuid.optional(),
  name: trimmed(120).min(1, 'Enter a name'),
  slug: trimmed(120)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Lowercase letters, numbers and hyphens only')
    .optional()
    .or(z.literal('')),
  description: optionalText(2000),
  syllabus_stage: z.enum(['PRELIMS', 'MAINS', 'BOTH']),
  sort_order: z.coerce.number().int().min(0).max(10000),
  is_active: z.boolean(),
});

export const chapterSchema = z.object({
  id: uuid.optional(),
  subject_id: uuid,
  title: trimmed(200).min(1, 'Enter a title'),
  description: optionalText(2000),
  sort_order: z.coerce.number().int().min(0).max(10000),
  is_active: z.boolean(),
});

export const lectureSchema = z.object({
  id: uuid.optional(),
  chapter_id: uuid,
  title: trimmed(200).min(1, 'Enter a title'),
  description: optionalText(4000),
  video: trimmed(300).min(1, 'Paste a YouTube or Google Drive link'),
  duration: trimmed(12).optional(),
  sort_order: z.coerce.number().int().min(0).max(10000),
  completion_threshold: z.coerce.number().min(50).max(100),
  is_active: z.boolean(),
});

export const quoteSchema = z.object({
  id: uuid.optional(),
  quote: trimmed(600).min(1, 'Enter the message'),
  language: z.enum(['en', 'hi', 'raj']),
  attribution: optionalText(160),
  category: z.enum(['history', 'culture', 'courage', 'discipline', 'consistency', 'exam', 'folk-wisdom']),
  is_active: z.boolean(),
  display_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal(''))
    .transform((v) => v || null),
});

export const cutoffSchema = z
  .object({
    id: uuid.optional(),
    exam_year: z.coerce.number().int().min(1990).max(2100),
    exam_stage: z.enum(['PRELIMS', 'MAINS']),
    category: trimmed(40).min(1),
    cutoff_marks: z.coerce.number().min(0).max(10000),
    total_marks: z.coerce.number().positive().max(10000),
    cutoff_type: trimmed(40).min(1),
    exam_pattern_version: trimmed(40).min(1),
    source_url: z.string().trim().url('Enter the official source URL').refine((u) => u.startsWith('https://'), 'Use an https:// link'),
    verified_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .or(z.literal(''))
      .transform((v) => v || null),
    notes: optionalText(1000),
  })
  .refine((v) => v.cutoff_marks <= v.total_marks, { path: ['cutoff_marks'], message: 'Cannot exceed total marks' });

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  full_name: trimmed(120).min(1, 'Enter a name'),
  mode: z.enum(['invite', 'password']),
  password: z.string().max(72).optional(),
  exam_category: trimmed(40).optional(),
  make_admin: z.boolean().optional(),
});

/** Flattens zod errors into { field: [messages] }. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Invalid input';
}
