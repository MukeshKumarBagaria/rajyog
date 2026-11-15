-- ════════════════════════════════════════════════════════════════════════════
-- Rajyog · 0001 · Core schema
--
-- Shared content (subjects, chapters, lectures, quotes, cutoffs) is readable by
-- every authenticated user and writable only by content administrators.
-- Private preparation data (progress, sessions, mocks, notes …) always carries a
-- user_id and is isolated per user through RLS (see 0003_rls).
--
-- All timestamps are stored in UTC (timestamptz). Calendar-day attribution for
-- study statistics uses each user's configured timezone (profiles.timezone).
-- ════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ─── Generic helpers ────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─── Administration ─────────────────────────────────────────────────────────
-- Membership is managed only with the service role (SQL editor / server-side
-- provisioning). There are deliberately no INSERT/UPDATE policies for users, so
-- nobody can promote themselves to administrator.

create table public.app_admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ═══ SHARED CONTENT ═════════════════════════════════════════════════════════

create table public.subjects (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (char_length(name) between 1 and 120),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description    text check (char_length(description) <= 2000),
  syllabus_stage text not null default 'BOTH' check (syllabus_stage in ('PRELIMS', 'MAINS', 'BOTH')),
  sort_order     integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index subjects_sort_idx on public.subjects (sort_order, name);

create table public.chapters (
  id          uuid primary key default gen_random_uuid(),
  subject_id  uuid not null references public.subjects (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 2000),
  -- Reserved for weighted course completion (v1 uses equal lecture weights).
  weight      numeric(6, 2) not null default 1 check (weight > 0),
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index chapters_subject_idx on public.chapters (subject_id, sort_order);

create table public.lectures (
  id                   uuid primary key default gen_random_uuid(),
  chapter_id           uuid not null references public.chapters (id) on delete cascade,
  title                text not null check (char_length(title) between 1 and 200),
  description          text check (char_length(description) <= 4000),
  -- Only the 11-character YouTube video ID is stored — never iframe HTML.
  youtube_video_id     text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  duration_seconds     integer check (duration_seconds is null or duration_seconds between 1 and 86400),
  sort_order           integer not null default 0,
  -- Fraction of unique coverage required for completion (0.9 = 90 %).
  completion_threshold numeric(4, 3) not null default 0.9 check (completion_threshold between 0.5 and 1),
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index lectures_chapter_idx on public.lectures (chapter_id, sort_order);

create table public.motivational_quotes (
  id           uuid primary key default gen_random_uuid(),
  quote        text not null check (char_length(quote) between 1 and 600),
  language     text not null default 'en' check (language in ('en', 'hi', 'raj')),
  attribution  text check (char_length(attribution) <= 160),
  category     text not null default 'consistency'
               check (category in ('history', 'culture', 'courage', 'discipline', 'consistency', 'exam', 'folk-wisdom')),
  is_active    boolean not null default true,
  display_date date,
  created_at   timestamptz not null default now()
);
create index motivational_quotes_display_date_idx on public.motivational_quotes (display_date) where display_date is not null;

create table public.historical_cutoffs (
  id                   uuid primary key default gen_random_uuid(),
  exam_year            integer not null check (exam_year between 1990 and 2100),
  exam_stage           text not null check (exam_stage in ('PRELIMS', 'MAINS')),
  category             text not null check (char_length(category) between 1 and 40),
  cutoff_marks         numeric(7, 2) not null check (cutoff_marks >= 0),
  -- Maximum marks of the examination the cutoff refers to; used to normalise
  -- mocks with a different total into a comparable percentage.
  total_marks          numeric(7, 2) not null check (total_marks > 0),
  cutoff_type          text not null default 'Non-TSP' check (char_length(cutoff_type) between 1 and 40),
  exam_pattern_version text not null default 'current' check (char_length(exam_pattern_version) between 1 and 40),
  source_url           text not null check (source_url ~* '^https://'),
  verified_at          timestamptz,
  notes                text check (char_length(notes) <= 1000),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (cutoff_marks <= total_marks),
  unique (exam_year, exam_stage, category, cutoff_type, exam_pattern_version)
);
create index historical_cutoffs_lookup_idx on public.historical_cutoffs (exam_stage, category, exam_year desc);

-- ═══ USER-SPECIFIC DATA ═════════════════════════════════════════════════════

create table public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  full_name            text check (char_length(full_name) <= 120),
  avatar_url           text check (char_length(avatar_url) <= 500),
  exam_category        text not null default 'GEN' check (char_length(exam_category) between 1 and 40),
  target_exam_year     integer check (target_exam_year between 2000 and 2100),
  timezone             text not null default 'Asia/Kolkata',
  daily_target_minutes integer not null default 240 check (daily_target_minutes between 10 and 1440),
  language             text not null default 'en' check (language in ('en', 'hi')),
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create or replace function public.validate_profile_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.validate_profile_timezone();

create table public.user_settings (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  theme                  text not null default 'light' check (theme in ('light', 'dark', 'system')),
  preferred_language     text not null default 'both' check (preferred_language in ('en', 'hi', 'both')),
  notification_enabled   boolean not null default false,
  -- Managed exclusively by set_app_pin()/disable_app_pin() (column privileges).
  pin_lock_enabled       boolean not null default false,
  auto_lock_minutes      integer not null default 10 check (auto_lock_minutes between 1 and 240),
  -- Minimum verified study per local day for the day to extend the streak.
  streak_min_minutes     integer not null default 30 check (streak_min_minutes between 5 and 600),
  -- Optional personal benchmarks (in %) used only when no official cutoff
  -- has been recorded for the user's category.
  prelims_target_percent numeric(5, 2) check (prelims_target_percent between 1 and 100),
  mains_target_percent   numeric(5, 2) check (mains_target_percent between 1 and 100),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- PIN hashes live in their own table which has RLS enabled and *no* policies:
-- it is only reachable through SECURITY DEFINER functions, so hashes are never
-- readable from the client.
create table public.user_pins (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  pin_hash        text not null,
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  updated_at      timestamptz not null default now()
);

create table public.lecture_progress (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lecture_id            uuid not null references public.lectures (id) on delete cascade,
  -- Cumulative UNIQUE watched content (merged intervals), not playback time.
  watched_seconds       integer not null default 0 check (watched_seconds >= 0),
  last_position_seconds integer not null default 0 check (last_position_seconds >= 0),
  -- Merged, sorted [[start, end], …] intervals in content seconds.
  watched_segments      jsonb not null default '[]'::jsonb check (jsonb_typeof(watched_segments) = 'array'),
  completion_percentage numeric(5, 2) not null default 0 check (completion_percentage between 0 and 100),
  status                text not null default 'NOT_STARTED' check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  completed_at          timestamptz,
  last_watched_at       timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (user_id, lecture_id)
);
create index lecture_progress_lecture_idx on public.lecture_progress (lecture_id);
create index lecture_progress_recent_idx on public.lecture_progress (user_id, last_watched_at desc nulls last);

create table public.study_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id       uuid references public.subjects (id) on delete set null,
  lecture_id       uuid references public.lectures (id) on delete set null,
  session_type     text not null check (session_type in ('VIDEO', 'MANUAL', 'POMODORO')),
  study_type       text check (char_length(study_type) <= 40),
  start_time       timestamptz not null,
  end_time         timestamptz,
  -- Verified ACTIVE study seconds (excludes pauses, buffering, hidden tabs).
  duration_seconds integer not null default 0 check (duration_seconds between 0 and 86400),
  source           text not null default 'app' check (source in ('youtube', 'timer', 'app')),
  -- Local calendar day (user's timezone) the session belongs to; set by trigger.
  local_date       date not null,
  -- Highest heartbeat sequence applied (idempotency for video heartbeats).
  last_seq         integer not null default 0,
  notes            text check (char_length(notes) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_time is null or end_time >= start_time),
  -- Active time can never exceed wall-clock time (small tolerance for clock jitter).
  check (end_time is null or duration_seconds <= extract(epoch from (end_time - start_time)) + 10)
);
create index study_sessions_user_date_idx on public.study_sessions (user_id, local_date desc);
create index study_sessions_subject_idx on public.study_sessions (subject_id);
create index study_sessions_lecture_idx on public.study_sessions (lecture_id);

create or replace function public.study_sessions_set_local_date()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_tz text;
begin
  select p.timezone into v_tz from public.profiles p where p.id = new.user_id;
  new.local_date := (new.start_time at time zone coalesce(v_tz, 'Asia/Kolkata'))::date;
  return new;
end;
$$;

create trigger study_sessions_local_date
  before insert or update of start_time on public.study_sessions
  for each row execute function public.study_sessions_set_local_date();

create table public.daily_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  goal_date      date not null,
  target_minutes integer not null check (target_minutes between 10 and 1440),
  completed      boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (user_id, goal_date)
);

create table public.daily_tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  subject_id   uuid references public.subjects (id) on delete set null,
  title        text not null check (char_length(title) between 1 and 200),
  due_date     date not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index daily_tasks_user_due_idx on public.daily_tasks (user_id, due_date);
create index daily_tasks_subject_idx on public.daily_tasks (subject_id);

create table public.mock_tests (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null default auth.uid() references auth.users (id) on delete cascade,
  test_name            text not null check (char_length(test_name) between 1 and 160),
  exam_stage           text not null check (exam_stage in ('PRELIMS', 'MAINS')),
  test_date            date not null,
  provider             text check (char_length(provider) <= 120),
  total_marks          numeric(7, 2) not null check (total_marks > 0),
  -- May be negative for prelims because of negative marking.
  obtained_marks       numeric(7, 2) not null,
  total_questions      integer check (total_questions between 1 and 1000),
  correct_answers      integer check (correct_answers >= 0),
  incorrect_answers    integer check (incorrect_answers >= 0),
  unattempted          integer check (unattempted >= 0),
  marks_per_correct    numeric(6, 3) check (marks_per_correct > 0),
  negative_marks       numeric(6, 3) check (negative_marks >= 0),
  exam_pattern_version text not null default 'current' check (char_length(exam_pattern_version) between 1 and 40),
  difficulty           text check (difficulty in ('EASY', 'MODERATE', 'HARD')),
  remarks              text check (char_length(remarks) <= 2000),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (obtained_marks <= total_marks),
  check (obtained_marks >= -total_marks),
  check (
    total_questions is null or correct_answers is null or incorrect_answers is null or unattempted is null
    or correct_answers + incorrect_answers + unattempted = total_questions
  )
);
create index mock_tests_user_stage_idx on public.mock_tests (user_id, exam_stage, test_date desc);

create table public.mock_subject_scores (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  mock_test_id   uuid not null references public.mock_tests (id) on delete cascade,
  subject_id     uuid references public.subjects (id) on delete set null,
  -- Free label for Mains papers / sections that are not catalogue subjects.
  label          text check (char_length(label) <= 120),
  total_marks    numeric(7, 2) not null check (total_marks > 0),
  obtained_marks numeric(7, 2) not null,
  created_at     timestamptz not null default now(),
  check (obtained_marks <= total_marks),
  check (obtained_marks >= -total_marks),
  check (subject_id is not null or label is not null)
);
create index mock_subject_scores_mock_idx on public.mock_subject_scores (mock_test_id);
create index mock_subject_scores_user_idx on public.mock_subject_scores (user_id);
create index mock_subject_scores_subject_idx on public.mock_subject_scores (subject_id);

create table public.bookmarks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lecture_id uuid not null references public.lectures (id) on delete cascade,
  note       text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, lecture_id)
);
create index bookmarks_lecture_idx on public.bookmarks (lecture_id);

create table public.personal_notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lecture_id uuid references public.lectures (id) on delete cascade,
  chapter_id uuid references public.chapters (id) on delete cascade,
  title      text check (char_length(title) <= 160),
  content    text not null check (char_length(content) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index personal_notes_user_idx on public.personal_notes (user_id, updated_at desc);
create index personal_notes_lecture_idx on public.personal_notes (lecture_id);
create index personal_notes_chapter_idx on public.personal_notes (chapter_id);

-- ─── updated_at triggers ────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'subjects', 'chapters', 'lectures', 'historical_cutoffs', 'profiles', 'user_settings',
    'lecture_progress', 'study_sessions', 'daily_goals', 'daily_tasks', 'mock_tests', 'personal_notes'
  ]
  loop
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- ─── Aggregations ───────────────────────────────────────────────────────────
-- security_invoker = true ⇒ the view is evaluated with the caller's RLS, so a
-- user only ever aggregates their own sessions.

create view public.study_daily_totals
with (security_invoker = true) as
select
  s.user_id,
  s.local_date,
  coalesce(sum(s.duration_seconds), 0)::integer                                          as total_seconds,
  coalesce(sum(s.duration_seconds) filter (where s.session_type = 'VIDEO'), 0)::integer  as video_seconds,
  coalesce(sum(s.duration_seconds) filter (where s.session_type <> 'VIDEO'), 0)::integer as manual_seconds,
  count(*)::integer                                                                      as session_count
from public.study_sessions s
group by s.user_id, s.local_date;
