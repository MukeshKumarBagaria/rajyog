-- ════════════════════════════════════════════════════════════════════════════
-- Rajyog · database tests: multi-user isolation, RLS, business functions.
-- Run with: npm run test:db   (spins up a throwaway local Postgres)
-- Every failed assertion aborts the run with a non-zero exit code.
-- ════════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP 1
\set QUIET 1

-- ─── Fixtures (as superuser) ────────────────────────────────────────────────
insert into auth.users (id, email, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'a@example.test', '{"full_name":"Aspirant A"}'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'b@example.test', '{"full_name":"Aspirant B"}'),
  ('cccccccc-0000-0000-0000-000000000003', 'owner@example.test', '{"full_name":"Owner"}');
insert into public.app_admins (user_id) values ('cccccccc-0000-0000-0000-000000000003');

insert into public.lectures (id, chapter_id, title, youtube_video_id, duration_seconds, sort_order)
select '11111111-0000-0000-0000-000000000001', c.id, 'Introduction', 'dQw4w9WgXcQ', 1000, 1
from public.chapters c join public.subjects s on s.id = c.subject_id
where s.slug = 'rajasthan-history' and c.sort_order = 1;

insert into public.lectures (id, chapter_id, title, youtube_video_id, duration_seconds, sort_order)
select '11111111-0000-0000-0000-000000000002', c.id, 'Archaeological Sites', 'aBcDeFgHiJk', null, 2
from public.chapters c join public.subjects s on s.id = c.subject_id
where s.slug = 'rajasthan-history' and c.sort_order = 1;

insert into public.lectures (id, chapter_id, title, youtube_video_id, duration_seconds, sort_order)
select v.id::uuid, c.id, v.title, 'zZz_123-abc', 1000, v.ord
from (values ('11111111-0000-0000-0000-000000000003', 'Overstated duration', 3), ('11111111-0000-0000-0000-000000000004', 'Bogus player duration', 4)) v(id, title, ord)
cross join lateral (select c.id from public.chapters c join public.subjects s on s.id = c.subject_id
                    where s.slug = 'rajasthan-history' and c.sort_order = 1) c;

do $$ begin
  assert (select count(*) from public.profiles) = 3, 'profiles auto-created by trigger';
  assert (select count(*) from public.user_settings) = 3, 'settings auto-created by trigger';
  assert (select full_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001') = 'Aspirant A', 'profile name from metadata';
end $$;

-- ─── Anonymous users get nothing ────────────────────────────────────────────
begin;
set local role anon;
do $$ begin
  begin
    perform 1 from public.subjects limit 1;
    raise exception 'anon could read subjects';
  exception when insufficient_privilege then null;
  end;
end $$;
rollback;

-- ─── User A ─────────────────────────────────────────────────────────────────
begin;
set local role authenticated;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true); end $$;

do $$
declare r jsonb;
begin
  assert (select count(*) from public.subjects) = 14, 'A sees 14 shared subjects';
  assert not public.is_admin(), 'A is not admin';

  -- first 100 s watched
  r := public.record_lecture_progress('11111111-0000-0000-0000-000000000001', '[[0,100]]', 100);
  assert (r ->> 'watched_seconds')::int = 100, 'watched 100 s';
  assert (r ->> 'status') = 'IN_PROGRESS', 'in progress';

  -- seeking to the end must NOT complete the lecture
  r := public.record_lecture_progress('11111111-0000-0000-0000-000000000001', '[[900,1000]]', 1000);
  assert (r ->> 'watched_seconds')::int = 200, 'seek-to-end adds only the real 100 s';
  assert (r ->> 'status') = 'IN_PROGRESS', 'seek does not complete';

  -- replaying the same interval never double counts
  r := public.record_lecture_progress('11111111-0000-0000-0000-000000000001', '[[0,100],[50,120]]', 120);
  assert (r ->> 'watched_seconds')::int = 220, 'overlaps merged: got ' || (r ->> 'watched_seconds');

  -- junk / out-of-range segments are clamped or ignored
  r := public.record_lecture_progress('11111111-0000-0000-0000-000000000001', '[[-50,10],[5000,6000],["x",1],[30,20]]', 10);
  assert (r ->> 'watched_seconds')::int = 220, 'invalid segments ignored';

  -- 90 % unique coverage completes
  r := public.record_lecture_progress('11111111-0000-0000-0000-000000000001', '[[120,900]]', 900);
  assert (r ->> 'status') = 'COMPLETED', 'completed at >= 90 %';
  assert (select completed_at from public.lecture_progress where lecture_id = '11111111-0000-0000-0000-000000000001') is not null, 'completed_at set';

  -- unknown duration is filled from the player once
  r := public.record_lecture_progress('11111111-0000-0000-0000-000000000002', '[[0,30]]', 30, null, 0, 0, 600);
  assert (r ->> 'duration_seconds')::int = 600, 'duration filled from player';
  assert (select duration_seconds from public.lectures where id = '11111111-0000-0000-0000-000000000002') = 600, 'lecture duration persisted';

  -- a wrong stored duration is corrected by the player's real duration (within 0.5–1.5×)
  r := public.record_lecture_progress('11111111-0000-0000-0000-000000000003', '[[0,720]]', 720, null, 0, 0, 800);
  assert (r ->> 'status') = 'COMPLETED', 'completion uses real player duration (720/800 = 90 %)';
  r := public.record_lecture_progress('11111111-0000-0000-0000-000000000004', '[[0,20]]', 20, null, 0, 0, 20);
  assert (r ->> 'status') = 'IN_PROGRESS', 'absurd player duration outside the band is ignored';
  assert (r ->> 'duration_seconds')::int = 1000, 'stored duration kept';

  -- video study heartbeat with idempotent sequence numbers
  perform public.record_lecture_progress('11111111-0000-0000-0000-000000000001', '[]', 900,
    '22222222-0000-0000-0000-000000000001', 15, 1);
  perform public.record_lecture_progress('11111111-0000-0000-0000-000000000001', '[]', 900,
    '22222222-0000-0000-0000-000000000001', 15, 1);  -- duplicate beacon
  assert (select duration_seconds from public.study_sessions where id = '22222222-0000-0000-0000-000000000001') = 15,
    'duplicate heartbeat ignored';

  -- manual focus session, saved twice (retry) → counted once
  perform public.save_focus_session('33333333-0000-0000-0000-000000000001', 'POMODORO',
    now() - interval '30 minutes', now() - interval '5 minutes', 1500, null, 'Revision');
  perform public.save_focus_session('33333333-0000-0000-0000-000000000001', 'POMODORO',
    now() - interval '30 minutes', now() - interval '5 minutes', 1500, null, 'Revision');
  assert (select count(*) from public.study_sessions where session_type = 'POMODORO') = 1, 'focus save idempotent';

  -- duration longer than the wall-clock window is rejected
  begin
    perform public.save_focus_session(gen_random_uuid(), 'MANUAL', now() - interval '10 minutes', now(), 3600);
    raise exception 'impossible duration accepted';
  exception when invalid_parameter_value then null;
  end;

  -- mock test with subject-wise marks (atomic)
  perform public.save_mock_test(
    '{"test_name":"Mock 1","exam_stage":"PRELIMS","test_date":"2026-11-01","total_marks":200,"obtained_marks":121.33,
      "total_questions":150,"correct_answers":100,"incorrect_answers":20,"unattempted":30,"marks_per_correct":1.333,"negative_marks":0.444}',
    jsonb_build_array(jsonb_build_object('subject_id', (select id from public.subjects where slug = 'rajasthan-history'),
                                         'total_marks', 30, 'obtained_marks', 22)));
  assert (select count(*) from public.mock_tests) = 1, 'A has one mock';
  assert (select count(*) from public.mock_subject_scores) = 1, 'A has one subject score';

  -- inconsistent question counts are rejected
  begin
    perform public.save_mock_test('{"test_name":"Bad","exam_stage":"PRELIMS","test_date":"2026-11-02","total_marks":200,
      "obtained_marks":10,"total_questions":150,"correct_answers":100,"incorrect_answers":20,"unattempted":1}', '[]');
    raise exception 'inconsistent counts accepted';
  exception when check_violation then null;
  end;

  insert into public.daily_tasks (title, due_date) values ('Revise Polity', current_date);
  insert into public.bookmarks (lecture_id) values ('11111111-0000-0000-0000-000000000001');
  insert into public.personal_notes (lecture_id, content) values ('11111111-0000-0000-0000-000000000001', 'Kalibangan — Ghaggar');

  -- PIN: hashed, rate-limited, never readable
  perform public.set_app_pin('482913');
  assert (select pin_lock_enabled from public.user_settings) , 'pin enabled';
  assert (public.verify_app_pin('482913') ->> 'ok')::boolean, 'correct pin accepted';
  for i in 1..5 loop perform public.verify_app_pin('000000'); end loop;
  assert (public.verify_app_pin('482913') ->> 'reason') = 'locked', 'locked after 5 failures';
  begin
    perform 1 from public.user_pins;
    raise exception 'pin hashes readable';
  exception when insufficient_privilege then null;
  end;

  -- protected columns
  begin
    update public.profiles set is_active = false;
    raise exception 'user changed is_active';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.user_settings set pin_lock_enabled = false;
    raise exception 'user bypassed pin functions';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.app_admins (user_id) values ('aaaaaaaa-0000-0000-0000-000000000001');
    raise exception 'user self-promoted to admin';
  exception when insufficient_privilege then null;
  end;

  -- content is read-only for non-admins
  begin
    insert into public.subjects (name, slug) values ('Hacked', 'hacked');
    raise exception 'non-admin created a subject';
  exception when insufficient_privilege then null;
  end;
  update public.lectures set title = 'pwned';
  assert (select count(*) from public.lectures where title = 'pwned') = 0, 'non-admin cannot edit lectures';

  -- invalid timezone rejected
  begin
    update public.profiles set timezone = 'Mars/Olympus';
    raise exception 'invalid timezone accepted';
  exception when invalid_parameter_value then null;
  end;
end $$;
commit;

-- Simulate 60 s of wall-clock time passing for the video session, then a new heartbeat.
update public.study_sessions set start_time = start_time - interval '60 seconds'
 where id = '22222222-0000-0000-0000-000000000001';

begin;
set local role authenticated;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001","role":"authenticated"}', true); end $$;
do $$ begin
  perform public.record_lecture_progress('11111111-0000-0000-0000-000000000001', '[]', 900,
    '22222222-0000-0000-0000-000000000001', 15, 2);
  assert (select duration_seconds from public.study_sessions where id = '22222222-0000-0000-0000-000000000001') = 30,
    'second heartbeat applied';
  -- a heartbeat claiming more active time than wall-clock time allows is capped
  perform public.record_lecture_progress('11111111-0000-0000-0000-000000000001', '[]', 900,
    '22222222-0000-0000-0000-000000000001', 600, 3);
  assert (select duration_seconds from public.study_sessions where id = '22222222-0000-0000-0000-000000000001') <= 85,
    'inflated heartbeat capped by wall-clock';
  assert (select count(*) from public.daily_goals) >= 1, 'daily goal synced from sessions';
  assert (select target_minutes from public.daily_goals limit 1) = 240, 'goal target snapshot from profile';
  assert (select completed_lectures from public.course_progress_summary()
           where subject_id = (select id from public.subjects where slug = 'rajasthan-history')) = 2, 'A completed 2 lectures';
end $$;
commit;

-- ─── User B: sees shared content, none of A's private data ─────────────────
begin;
set local role authenticated;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true); end $$;
do $$
declare n int;
begin
  assert (select count(*) from public.subjects) = 14, 'B sees the same subjects';
  assert (select count(*) from public.lectures) = 4, 'B sees the same lectures';
  assert (select count(*) from public.profiles) = 1, 'B sees only own profile';
  assert (select count(*) from public.lecture_progress) = 0, 'B sees no lecture progress';
  assert (select count(*) from public.study_sessions) = 0, 'B sees no study sessions';
  assert (select count(*) from public.study_daily_totals) = 0, 'B aggregates nothing';
  assert (select count(*) from public.mock_tests) = 0, 'B sees no mocks';
  assert (select count(*) from public.mock_subject_scores) = 0, 'B sees no subject scores';
  assert (select count(*) from public.daily_goals) = 0, 'B has separate goals';
  assert (select count(*) from public.daily_tasks) = 0, 'B sees no tasks';
  assert (select count(*) from public.bookmarks) = 0, 'B sees no bookmarks';
  assert (select count(*) from public.personal_notes) = 0, 'B sees no notes';
  assert not (select pin_lock_enabled from public.user_settings), 'B pin independent';
  assert (select completed_lectures from public.course_progress_summary()
           where subject_id = (select id from public.subjects where slug = 'rajasthan-history')) = 0, 'B progress independent';

  update public.mock_tests set obtained_marks = 0;
  get diagnostics n = row_count;
  assert n = 0, 'B cannot update A''s mock';
  delete from public.lecture_progress;
  get diagnostics n = row_count;
  assert n = 0, 'B cannot delete A''s progress';

  begin
    insert into public.daily_tasks (user_id, title, due_date)
    values ('aaaaaaaa-0000-0000-0000-000000000001', 'injected', current_date);
    raise exception 'B wrote into A''s tasks';
  exception when insufficient_privilege then null;
  end;

end $$;
commit;

-- B knows A's mock id (out-of-band) and still cannot read, attach to or edit it
do $$
declare v_mock uuid := (select id from public.mock_tests limit 1);
begin
  perform set_config('rajyog.a_mock', v_mock::text, false);
end $$;

begin;
set local role authenticated;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"bbbbbbbb-0000-0000-0000-000000000002","role":"authenticated"}', true); end $$;
do $$ begin
  begin
    insert into public.mock_subject_scores (mock_test_id, label, total_marks, obtained_marks)
    values (current_setting('rajyog.a_mock')::uuid, 'x', 10, 1);
    raise exception 'B attached a score to A''s mock';
  exception when insufficient_privilege then null;
  end;
  assert (select count(*) from public.mock_tests where id = current_setting('rajyog.a_mock')::uuid) = 0, 'B cannot read A''s mock by id';
  begin
    perform public.save_mock_test(jsonb_build_object('id', current_setting('rajyog.a_mock'),
      'test_name','x','exam_stage','PRELIMS','test_date','2026-11-01','total_marks',200,'obtained_marks',1), '[]');
    raise exception 'B edited A''s mock through the RPC';
  exception when no_data_found then null;
  end;
end $$;
commit;

-- ─── Admin ──────────────────────────────────────────────────────────────────
begin;
set local role authenticated;
do $$ begin perform set_config('request.jwt.claims', '{"sub":"cccccccc-0000-0000-0000-000000000003","role":"authenticated"}', true); end $$;
do $$ begin
  assert public.is_admin(), 'owner is admin';
  insert into public.subjects (name, slug, sort_order) values ('Hindi Grammar', 'hindi-grammar', 15);
  update public.lectures set title = 'Introduction to Rajasthan History' where id = '11111111-0000-0000-0000-000000000001';
  assert (select title from public.lectures where id = '11111111-0000-0000-0000-000000000001') = 'Introduction to Rajasthan History', 'admin edits lecture';
  insert into public.historical_cutoffs (exam_year, exam_stage, category, cutoff_marks, total_marks, source_url)
  values (2099, 'PRELIMS', 'TEST', 100, 200, 'https://example.test/cutoff');
  assert (select count(*) from public.profiles) = 3, 'admin can list profiles';
  assert (select count(*) from public.lecture_progress) = 0, 'admin cannot read users'' progress';
  assert (select count(*) from public.mock_tests) = 0, 'admin cannot read users'' mocks';
end $$;
rollback;

-- ─── Timezone-aware day attribution ─────────────────────────────────────────
do $$ begin
  insert into public.study_sessions (user_id, session_type, start_time, end_time, duration_seconds)
  values ('bbbbbbbb-0000-0000-0000-000000000002', 'MANUAL', '2026-11-14 19:00:00+00', '2026-11-14 19:40:00+00', 2400);
  assert (select local_date from public.study_sessions where user_id = 'bbbbbbbb-0000-0000-0000-000000000002')
         = date '2026-11-15', '00:30 IST belongs to the next local day';
end $$;

-- ─── Account deletion cascades cleanly ──────────────────────────────────────
do $$ begin
  delete from auth.users where id = 'aaaaaaaa-0000-0000-0000-000000000001';
  assert (select count(*) from public.study_sessions where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0;
  assert (select count(*) from public.daily_goals where user_id = 'aaaaaaaa-0000-0000-0000-000000000001') = 0;
end $$;

\echo '✔ All database tests passed'
