/**
 * Supabase database types for Rajyog.
 *
 * Hand-maintained to mirror supabase/migrations. If you have the Supabase CLI
 * you can regenerate an equivalent file with:
 *   supabase gen types typescript --linked > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel<FK extends string, Col extends string, Ref extends string> = {
  foreignKeyName: FK;
  columns: [Col];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ['id'];
};

/** Insert = every column optional except the listed required ones. */
type TableDef<Row, Required extends keyof Row, Rels extends unknown[] = []> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: Rels;
};

export type ExamStage = 'PRELIMS' | 'MAINS';
export type SyllabusStage = 'PRELIMS' | 'MAINS' | 'BOTH';
export type LectureStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type SessionType = 'VIDEO' | 'MANUAL' | 'POMODORO';
export type Difficulty = 'EASY' | 'MODERATE' | 'HARD';
export type QuoteLanguage = 'en' | 'hi' | 'raj';
export type QuoteCategory = 'history' | 'culture' | 'courage' | 'discipline' | 'consistency' | 'exam' | 'folk-wisdom';
export type ThemePreference = 'light' | 'dark' | 'system';

export type SubjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  syllabus_stage: SyllabusStage;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ChapterRow = {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  weight: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LectureRow = {
  id: string;
  chapter_id: string;
  title: string;
  description: string | null;
  youtube_video_id: string;
  duration_seconds: number | null;
  sort_order: number;
  completion_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type QuoteRow = {
  id: string;
  quote: string;
  language: QuoteLanguage;
  attribution: string | null;
  category: QuoteCategory;
  is_active: boolean;
  display_date: string | null;
  created_at: string;
};

export type CutoffRow = {
  id: string;
  exam_year: number;
  exam_stage: ExamStage;
  category: string;
  cutoff_marks: number;
  total_marks: number;
  cutoff_type: string;
  exam_pattern_version: string;
  source_url: string;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  exam_category: string;
  target_exam_year: number | null;
  timezone: string;
  daily_target_minutes: number;
  language: 'en' | 'hi';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type UserSettingsRow = {
  id: string;
  user_id: string;
  theme: ThemePreference;
  preferred_language: 'en' | 'hi' | 'both';
  notification_enabled: boolean;
  pin_lock_enabled: boolean;
  auto_lock_minutes: number;
  streak_min_minutes: number;
  prelims_target_percent: number | null;
  mains_target_percent: number | null;
  created_at: string;
  updated_at: string;
};

export type LectureProgressRow = {
  id: string;
  user_id: string;
  lecture_id: string;
  watched_seconds: number;
  last_position_seconds: number;
  watched_segments: Json;
  completion_percentage: number;
  status: LectureStatus;
  completed_at: string | null;
  last_watched_at: string | null;
  created_at: string;
  updated_at: string;
};

export type StudySessionRow = {
  id: string;
  user_id: string;
  subject_id: string | null;
  lecture_id: string | null;
  session_type: SessionType;
  study_type: string | null;
  start_time: string;
  end_time: string | null;
  duration_seconds: number;
  source: 'youtube' | 'timer' | 'app';
  local_date: string;
  last_seq: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DailyGoalRow = {
  id: string;
  user_id: string;
  goal_date: string;
  target_minutes: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type DailyTaskRow = {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  due_date: string;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MockTestRow = {
  id: string;
  user_id: string;
  test_name: string;
  exam_stage: ExamStage;
  test_date: string;
  provider: string | null;
  total_marks: number;
  obtained_marks: number;
  total_questions: number | null;
  correct_answers: number | null;
  incorrect_answers: number | null;
  unattempted: number | null;
  marks_per_correct: number | null;
  negative_marks: number | null;
  exam_pattern_version: string;
  difficulty: Difficulty | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

export type MockSubjectScoreRow = {
  id: string;
  user_id: string;
  mock_test_id: string;
  subject_id: string | null;
  label: string | null;
  total_marks: number;
  obtained_marks: number;
  created_at: string;
};

export type BookmarkRow = {
  id: string;
  user_id: string;
  lecture_id: string;
  note: string | null;
  created_at: string;
};

export type PersonalNoteRow = {
  id: string;
  user_id: string;
  lecture_id: string | null;
  chapter_id: string | null;
  title: string | null;
  content: string;
  created_at: string;
  updated_at: string;
};

export type StudyDailyTotalRow = {
  user_id: string;
  local_date: string;
  total_seconds: number;
  video_seconds: number;
  manual_seconds: number;
  session_count: number;
};

export type CourseProgressSummaryRow = {
  subject_id: string;
  total_lectures: number;
  completed_lectures: number;
  in_progress_lectures: number;
  total_chapters: number;
  completed_chapters: number;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: '12' };
  public: {
    Tables: {
      app_admins: TableDef<{ user_id: string; created_at: string }, 'user_id'>;
      subjects: TableDef<SubjectRow, 'name' | 'slug'>;
      chapters: TableDef<
        ChapterRow,
        'subject_id' | 'title',
        [Rel<'chapters_subject_id_fkey', 'subject_id', 'subjects'>]
      >;
      lectures: TableDef<
        LectureRow,
        'chapter_id' | 'title' | 'youtube_video_id',
        [Rel<'lectures_chapter_id_fkey', 'chapter_id', 'chapters'>]
      >;
      motivational_quotes: TableDef<QuoteRow, 'quote'>;
      historical_cutoffs: TableDef<
        CutoffRow,
        'exam_year' | 'exam_stage' | 'category' | 'cutoff_marks' | 'total_marks' | 'source_url'
      >;
      profiles: TableDef<ProfileRow, 'id'>;
      user_settings: TableDef<UserSettingsRow, never>;
      lecture_progress: TableDef<
        LectureProgressRow,
        'lecture_id',
        [Rel<'lecture_progress_lecture_id_fkey', 'lecture_id', 'lectures'>]
      >;
      study_sessions: TableDef<
        StudySessionRow,
        'session_type' | 'start_time',
        [
          Rel<'study_sessions_subject_id_fkey', 'subject_id', 'subjects'>,
          Rel<'study_sessions_lecture_id_fkey', 'lecture_id', 'lectures'>,
        ]
      >;
      daily_goals: TableDef<DailyGoalRow, 'goal_date' | 'target_minutes'>;
      daily_tasks: TableDef<
        DailyTaskRow,
        'title' | 'due_date',
        [Rel<'daily_tasks_subject_id_fkey', 'subject_id', 'subjects'>]
      >;
      mock_tests: TableDef<MockTestRow, 'test_name' | 'exam_stage' | 'test_date' | 'total_marks' | 'obtained_marks'>;
      mock_subject_scores: TableDef<
        MockSubjectScoreRow,
        'mock_test_id' | 'total_marks' | 'obtained_marks',
        [
          Rel<'mock_subject_scores_mock_test_id_fkey', 'mock_test_id', 'mock_tests'>,
          Rel<'mock_subject_scores_subject_id_fkey', 'subject_id', 'subjects'>,
        ]
      >;
      bookmarks: TableDef<BookmarkRow, 'lecture_id', [Rel<'bookmarks_lecture_id_fkey', 'lecture_id', 'lectures'>]>;
      personal_notes: TableDef<
        PersonalNoteRow,
        'content',
        [
          Rel<'personal_notes_lecture_id_fkey', 'lecture_id', 'lectures'>,
          Rel<'personal_notes_chapter_id_fkey', 'chapter_id', 'chapters'>,
        ]
      >;
    };
    Views: {
      study_daily_totals: { Row: StudyDailyTotalRow; Relationships: [] };
    };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      record_lecture_progress: {
        Args: {
          p_lecture_id: string;
          p_segments: Json;
          p_position: number;
          p_session_id?: string | null;
          p_active_seconds?: number;
          p_seq?: number;
          p_player_duration?: number | null;
        };
        Returns: Json;
      };
      save_focus_session: {
        Args: {
          p_id: string;
          p_session_type: string;
          p_start: string;
          p_end: string;
          p_duration: number;
          p_subject_id?: string | null;
          p_study_type?: string | null;
          p_notes?: string | null;
        };
        Returns: string;
      };
      set_daily_goal: { Args: { p_date: string; p_target_minutes: number }; Returns: undefined };
      course_progress_summary: { Args: Record<PropertyKey, never>; Returns: CourseProgressSummaryRow[] };
      save_mock_test: { Args: { p_mock: Json; p_subject_scores?: Json }; Returns: string };
      set_app_pin: { Args: { p_pin: string }; Returns: undefined };
      disable_app_pin: { Args: Record<PropertyKey, never>; Returns: undefined };
      verify_app_pin: { Args: { p_pin: string }; Returns: Json };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
