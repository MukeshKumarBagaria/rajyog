-- ════════════════════════════════════════════════════════════════════════════
-- Rajyog · 0002 · Database functions
--
-- Every function pins search_path = '' and fully qualifies objects.
-- SECURITY DEFINER is used only where a function must touch data the caller
-- cannot reach directly (admin check, profile bootstrap, PIN hashes, filling a
-- missing lecture duration). Everything else runs as SECURITY INVOKER so RLS
-- still applies.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Roles ──────────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()));
$$;

-- ─── New user bootstrap ─────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''))
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for users that existed before this migration.
insert into public.profiles (id) select u.id from auth.users u on conflict (id) do nothing;
insert into public.user_settings (user_id) select u.id from auth.users u on conflict (user_id) do nothing;

-- ─── Interval utilities ─────────────────────────────────────────────────────

-- Merges [[start, end], …] JSON intervals: clamps to [0, p_max], drops empty
-- ranges, sorts and unions overlapping or touching (≤ p_gap seconds apart)
-- ranges. Returns the merged array and the total covered seconds.
create or replace function public.merge_segments(p_segments jsonb, p_max numeric, p_gap numeric default 1)
returns table (segments jsonb, covered_seconds numeric)
language sql
immutable
set search_path = ''
as $$
  with raw as (
    select (x ->> 0)::numeric as s, (x ->> 1)::numeric as e
    from jsonb_array_elements(coalesce(p_segments, '[]'::jsonb)) as x
    where jsonb_typeof(x) = 'array'
      and jsonb_array_length(x) = 2
      and jsonb_typeof(x -> 0) = 'number'
      and jsonb_typeof(x -> 1) = 'number'
  ),
  clamped as (
    select greatest(0, s) as s, least(coalesce(p_max, e), e) as e
    from raw
  ),
  valid as (
    select s, e from clamped where e > s
  ),
  ordered as (
    select s, e,
           max(e) over (order by s, e rows between unbounded preceding and 1 preceding) as prev_max
    from valid
  ),
  grouped as (
    select s, e,
           sum(case when prev_max is null or s > prev_max + p_gap then 1 else 0 end)
             over (order by s, e rows unbounded preceding) as grp
    from ordered
  ),
  merged as (
    select min(s) as s, max(e) as e from grouped group by grp
  )
  select
    coalesce(jsonb_agg(jsonb_build_array(round(m.s, 1), round(m.e, 1)) order by m.s), '[]'::jsonb),
    coalesce(sum(m.e - m.s), 0)
  from merged m;
$$;

-- Lets any authenticated viewer fill in a lecture duration that the
-- administrator left blank (reported by the YouTube player). Never overwrites
-- an existing value.
create or replace function public.fill_missing_lecture_duration(p_lecture_id uuid, p_duration integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_duration integer;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  update public.lectures
     set duration_seconds = p_duration
   where id = p_lecture_id
     and duration_seconds is null
     and is_active
     and p_duration between 1 and 86400;

  select l.duration_seconds into v_duration from public.lectures l where l.id = p_lecture_id;
  return v_duration;
end;
$$;

-- ─── Lecture progress + video study heartbeat ───────────────────────────────
--
-- Called every ~15 s while a lecture plays, on pause and on page exit
-- (sendBeacon). One call atomically:
--   1. merges the newly watched content intervals into the stored coverage,
--   2. recomputes unique watched seconds / completion / status,
--   3. stores the resume position, and
--   4. adds verified active seconds to the VIDEO study session for this visit.
--
-- Idempotency: p_seq must increase per session; replays (retries, duplicate
-- beacons) are ignored for study time. Interval merging is naturally
-- idempotent, so replayed coverage never double-counts.
create or replace function public.record_lecture_progress(
  p_lecture_id      uuid,
  p_segments        jsonb,
  p_position        integer,
  p_session_id      uuid default null,
  p_active_seconds  integer default 0,
  p_seq             integer default 0,
  p_player_duration integer default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid        uuid := (select auth.uid());
  v_lecture    record;
  v_duration   integer;
  v_existing   jsonb;
  v_merged     jsonb;
  v_covered    numeric;
  v_pct        numeric;
  v_status     text;
  v_prev       text;
  v_completed  timestamptz;
  v_delta      integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  if p_segments is not null and (jsonb_typeof(p_segments) <> 'array' or jsonb_array_length(p_segments) > 500) then
    raise exception 'Invalid segments payload' using errcode = '22023';
  end if;

  select l.id, l.duration_seconds, l.completion_threshold, c.subject_id
    into v_lecture
    from public.lectures l
    join public.chapters c on c.id = l.chapter_id
   where l.id = p_lecture_id and l.is_active;

  if not found then
    raise exception 'Lecture not found' using errcode = 'P0002';
  end if;

  v_duration := v_lecture.duration_seconds;
  if v_duration is null and p_player_duration between 1 and 86400 then
    v_duration := public.fill_missing_lecture_duration(p_lecture_id, p_player_duration);
  elsif v_duration is not null and p_player_duration is not null
        and p_player_duration between ceil(v_duration * 0.5) and floor(v_duration * 1.5) then
    -- The player knows the real video length. Trusting it within a sane band
    -- means a mistyped admin duration can never make completion impossible,
    -- while an absurd client value (outside the band) is ignored.
    v_duration := p_player_duration;
  end if;

  -- Make sure the row exists, then lock it: concurrent heartbeats from two tabs
  -- are serialised, so no watched interval is ever lost.
  insert into public.lecture_progress (user_id, lecture_id)
  values (v_uid, p_lecture_id)
  on conflict (user_id, lecture_id) do nothing;

  select lp.watched_segments, lp.status, lp.completed_at
    into v_existing, v_prev, v_completed
    from public.lecture_progress lp
   where lp.user_id = v_uid and lp.lecture_id = p_lecture_id
   for update;

  select m.segments, m.covered_seconds
    into v_merged, v_covered
    from public.merge_segments(coalesce(v_existing, '[]'::jsonb) || coalesce(p_segments, '[]'::jsonb), v_duration) m;

  if v_duration is null or v_duration = 0 then
    v_pct := 0;
  else
    v_pct := least(100, round(v_covered / v_duration * 100, 2));
  end if;

  if v_prev = 'COMPLETED' or (v_duration is not null and v_pct >= v_lecture.completion_threshold * 100) then
    v_status := 'COMPLETED';
    v_completed := coalesce(v_completed, now());
  elsif v_covered > 0 then
    v_status := 'IN_PROGRESS';
  else
    v_status := 'NOT_STARTED';
  end if;

  update public.lecture_progress
     set watched_seconds       = floor(v_covered)::integer,
         last_position_seconds = greatest(0, least(coalesce(p_position, 0), coalesce(v_duration, 86400))),
         watched_segments      = v_merged,
         completion_percentage = v_pct,
         status                = v_status,
         completed_at          = v_completed,
         last_watched_at       = now()
   where user_id = v_uid and lecture_id = p_lecture_id;

  -- Verified active study time for this viewing session.
  if p_session_id is not null and coalesce(p_active_seconds, 0) > 0 then
    v_delta := least(p_active_seconds, 600);

    insert into public.study_sessions as s (
      id, user_id, subject_id, lecture_id, session_type, source,
      start_time, end_time, duration_seconds, last_seq
    ) values (
      p_session_id, v_uid, v_lecture.subject_id, p_lecture_id, 'VIDEO', 'youtube',
      now() - make_interval(secs => v_delta), now(), v_delta, coalesce(p_seq, 0)
    )
    on conflict (id) do update
       set duration_seconds = s.duration_seconds + least(
             excluded.duration_seconds,
             greatest(0, floor(extract(epoch from (now() - s.start_time)))::integer - s.duration_seconds + 5)
           ),
           end_time = now(),
           last_seq = excluded.last_seq
     where s.user_id = v_uid
       and s.lecture_id = p_lecture_id
       and s.last_seq < excluded.last_seq;
  end if;

  return jsonb_build_object(
    'watched_seconds', floor(v_covered)::integer,
    'completion_percentage', v_pct,
    'status', v_status,
    'duration_seconds', v_duration,
    'segments', v_merged
  );
end;
$$;

-- ─── Manual / Pomodoro focus sessions ───────────────────────────────────────

create or replace function public.save_focus_session(
  p_id           uuid,
  p_session_type text,
  p_start        timestamptz,
  p_end          timestamptz,
  p_duration     integer,
  p_subject_id   uuid default null,
  p_study_type   text default null,
  p_notes        text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_session_type not in ('MANUAL', 'POMODORO') then
    raise exception 'Invalid session type' using errcode = '22023';
  end if;
  if p_end <= p_start or p_end > now() + interval '2 minutes' or p_start < now() - interval '3 days' then
    raise exception 'Invalid session time range' using errcode = '22023';
  end if;
  if p_duration < 60 or p_duration > extract(epoch from (p_end - p_start)) + 5 or p_duration > 43200 then
    raise exception 'Invalid session duration' using errcode = '22023';
  end if;

  insert into public.study_sessions (
    id, user_id, subject_id, session_type, study_type, source,
    start_time, end_time, duration_seconds, notes
  ) values (
    p_id, v_uid, p_subject_id, p_session_type, nullif(trim(p_study_type), ''), 'timer',
    p_start, p_end, p_duration, nullif(trim(p_notes), '')
  )
  on conflict (id) do nothing;  -- idempotent: a retried save never double-counts

  return p_id;
end;
$$;

-- ─── Daily goals ────────────────────────────────────────────────────────────

-- Recomputes a day's goal row from the sessions of that local day. The target
-- is snapshotted from the profile the first time the row is created so that
-- changing the default target later never rewrites history.
create or replace function public.sync_daily_goal(p_user_id uuid, p_date date, p_allow_insert boolean default true)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_total   integer;
  v_default integer;
begin
  select coalesce(sum(s.duration_seconds), 0) into v_total
    from public.study_sessions s
   where s.user_id = p_user_id and s.local_date = p_date;

  if not p_allow_insert then
    -- Deletions only refresh an existing row (also keeps account deletion,
    -- which cascades through study_sessions, from re-creating goal rows).
    update public.daily_goals g
       set completed = v_total >= g.target_minutes * 60
     where g.user_id = p_user_id and g.goal_date = p_date;
    return;
  end if;

  select p.daily_target_minutes into v_default from public.profiles p where p.id = p_user_id;

  insert into public.daily_goals as g (user_id, goal_date, target_minutes, completed)
  values (p_user_id, p_date, coalesce(v_default, 240), v_total >= coalesce(v_default, 240) * 60)
  on conflict (user_id, goal_date) do update
     set completed = v_total >= g.target_minutes * 60;
end;
$$;

create or replace function public.study_sessions_sync_goal()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sync_daily_goal(old.user_id, old.local_date, false);
    return old;
  end if;
  perform public.sync_daily_goal(new.user_id, new.local_date, true);
  return new;
end;
$$;

create trigger study_sessions_goal_sync
  after insert or update of duration_seconds or delete on public.study_sessions
  for each row execute function public.study_sessions_sync_goal();

create or replace function public.set_daily_goal(p_date date, p_target_minutes integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_target_minutes not between 10 and 1440 then
    raise exception 'Target must be between 10 and 1440 minutes' using errcode = '22023';
  end if;

  insert into public.daily_goals as g (user_id, goal_date, target_minutes)
  values (v_uid, p_date, p_target_minutes)
  on conflict (user_id, goal_date) do update set target_minutes = excluded.target_minutes;

  perform public.sync_daily_goal(v_uid, p_date);
end;
$$;

-- ─── Course progress summary ────────────────────────────────────────────────
-- Equal lecture weights (v1). Only active subjects/chapters/lectures count.

create or replace function public.course_progress_summary()
returns table (
  subject_id          uuid,
  total_lectures      integer,
  completed_lectures  integer,
  in_progress_lectures integer,
  total_chapters      integer,
  completed_chapters  integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with lec as (
    select c.subject_id, c.id as chapter_id, l.id as lecture_id,
           coalesce(lp.status, 'NOT_STARTED') as status
      from public.subjects s
      join public.chapters c on c.subject_id = s.id and c.is_active
      join public.lectures l on l.chapter_id = c.id and l.is_active
      left join public.lecture_progress lp
             on lp.lecture_id = l.id and lp.user_id = (select auth.uid())
     where s.is_active
  ),
  chap as (
    select subject_id, chapter_id, bool_and(status = 'COMPLETED') as done
      from lec group by subject_id, chapter_id
  )
  select s.id,
         coalesce((select count(*) from lec where lec.subject_id = s.id), 0)::integer,
         coalesce((select count(*) from lec where lec.subject_id = s.id and status = 'COMPLETED'), 0)::integer,
         coalesce((select count(*) from lec where lec.subject_id = s.id and status = 'IN_PROGRESS'), 0)::integer,
         coalesce((select count(*) from chap where chap.subject_id = s.id), 0)::integer,
         coalesce((select count(*) from chap where chap.subject_id = s.id and done), 0)::integer
    from public.subjects s
   where s.is_active
   order by s.sort_order, s.name;
$$;

-- ─── Mock tests (atomic save with subject-wise marks) ───────────────────────

create or replace function public.save_mock_test(p_mock jsonb, p_subject_scores jsonb default '[]'::jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_id  uuid := nullif(p_mock ->> 'id', '')::uuid;
  v_row jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_subject_scores, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_subject_scores, '[]'::jsonb)) > 40 then
    raise exception 'Invalid subject scores' using errcode = '22023';
  end if;

  if v_id is null then
    insert into public.mock_tests (
      user_id, test_name, exam_stage, test_date, provider, total_marks, obtained_marks,
      total_questions, correct_answers, incorrect_answers, unattempted,
      marks_per_correct, negative_marks, exam_pattern_version, difficulty, remarks
    ) values (
      v_uid,
      p_mock ->> 'test_name',
      p_mock ->> 'exam_stage',
      (p_mock ->> 'test_date')::date,
      nullif(p_mock ->> 'provider', ''),
      (p_mock ->> 'total_marks')::numeric,
      (p_mock ->> 'obtained_marks')::numeric,
      nullif(p_mock ->> 'total_questions', '')::integer,
      nullif(p_mock ->> 'correct_answers', '')::integer,
      nullif(p_mock ->> 'incorrect_answers', '')::integer,
      nullif(p_mock ->> 'unattempted', '')::integer,
      nullif(p_mock ->> 'marks_per_correct', '')::numeric,
      nullif(p_mock ->> 'negative_marks', '')::numeric,
      coalesce(nullif(p_mock ->> 'exam_pattern_version', ''), 'current'),
      nullif(p_mock ->> 'difficulty', ''),
      nullif(p_mock ->> 'remarks', '')
    )
    returning id into v_id;
  else
    update public.mock_tests set
      test_name            = p_mock ->> 'test_name',
      exam_stage           = p_mock ->> 'exam_stage',
      test_date            = (p_mock ->> 'test_date')::date,
      provider             = nullif(p_mock ->> 'provider', ''),
      total_marks          = (p_mock ->> 'total_marks')::numeric,
      obtained_marks       = (p_mock ->> 'obtained_marks')::numeric,
      total_questions      = nullif(p_mock ->> 'total_questions', '')::integer,
      correct_answers      = nullif(p_mock ->> 'correct_answers', '')::integer,
      incorrect_answers    = nullif(p_mock ->> 'incorrect_answers', '')::integer,
      unattempted          = nullif(p_mock ->> 'unattempted', '')::integer,
      marks_per_correct    = nullif(p_mock ->> 'marks_per_correct', '')::numeric,
      negative_marks       = nullif(p_mock ->> 'negative_marks', '')::numeric,
      exam_pattern_version = coalesce(nullif(p_mock ->> 'exam_pattern_version', ''), 'current'),
      difficulty           = nullif(p_mock ->> 'difficulty', ''),
      remarks              = nullif(p_mock ->> 'remarks', '')
    where id = v_id and user_id = v_uid;

    if not found then
      raise exception 'Mock test not found' using errcode = 'P0002';
    end if;

    delete from public.mock_subject_scores where mock_test_id = v_id and user_id = v_uid;
  end if;

  for v_row in select * from jsonb_array_elements(coalesce(p_subject_scores, '[]'::jsonb))
  loop
    insert into public.mock_subject_scores (user_id, mock_test_id, subject_id, label, total_marks, obtained_marks)
    values (
      v_uid, v_id,
      nullif(v_row ->> 'subject_id', '')::uuid,
      nullif(trim(coalesce(v_row ->> 'label', '')), ''),
      (v_row ->> 'total_marks')::numeric,
      (v_row ->> 'obtained_marks')::numeric
    );
  end loop;

  return v_id;
end;
$$;

-- ─── Optional application PIN ───────────────────────────────────────────────
-- PINs are bcrypt-hashed (pgcrypto). Verification is rate limited: after every
-- 5 consecutive failures the PIN is locked for 5 minutes × (failures / 5).

create or replace function public.set_app_pin(p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{6}$' then
    raise exception 'PIN must be exactly 6 digits' using errcode = '22023';
  end if;

  insert into public.user_pins (user_id, pin_hash, failed_attempts, locked_until, updated_at)
  values (v_uid, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)), 0, null, now())
  on conflict (user_id) do update
     set pin_hash = excluded.pin_hash, failed_attempts = 0, locked_until = null, updated_at = now();

  update public.user_settings set pin_lock_enabled = true where user_id = v_uid;
end;
$$;

create or replace function public.disable_app_pin()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  delete from public.user_pins where user_id = v_uid;
  update public.user_settings set pin_lock_enabled = false where user_id = v_uid;
end;
$$;

create or replace function public.verify_app_pin(p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_pin  public.user_pins%rowtype;
  v_fail integer;
  v_lock timestamptz;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_pin from public.user_pins where user_id = v_uid for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'no_pin');
  end if;

  if v_pin.locked_until is not null and v_pin.locked_until > now() then
    return jsonb_build_object('ok', false, 'reason', 'locked', 'locked_until', v_pin.locked_until);
  end if;

  if p_pin ~ '^[0-9]{6}$' and extensions.crypt(p_pin, v_pin.pin_hash) = v_pin.pin_hash then
    update public.user_pins set failed_attempts = 0, locked_until = null, updated_at = now() where user_id = v_uid;
    return jsonb_build_object('ok', true);
  end if;

  v_fail := v_pin.failed_attempts + 1;
  v_lock := case when v_fail % 5 = 0 then now() + make_interval(mins => 5 * (v_fail / 5)) else null end;

  update public.user_pins
     set failed_attempts = v_fail, locked_until = v_lock, updated_at = now()
   where user_id = v_uid;

  return jsonb_build_object(
    'ok', false,
    'reason', case when v_lock is not null then 'locked' else 'invalid' end,
    'remaining_attempts', 5 - (v_fail % 5),
    'locked_until', v_lock
  );
end;
$$;
