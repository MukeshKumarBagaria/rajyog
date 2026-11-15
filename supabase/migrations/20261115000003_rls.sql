-- ════════════════════════════════════════════════════════════════════════════
-- Rajyog · 0003 · Row Level Security & privileges
--
-- • RLS is enabled on EVERY table in the public schema.
-- • Shared content: authenticated users read active rows; only admins write.
-- • Private data: a user can only ever see / change rows where user_id = auth.uid().
-- • anon (logged-out) has no table access at all.
-- • Column privileges stop users from changing protected columns
--   (profiles.is_active, user_settings.pin_lock_enabled).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Privileges ─────────────────────────────────────────────────────────────

revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon, public;
revoke all on all sequences in schema public from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;

-- Internal tables: never directly reachable.
revoke all on public.user_pins from authenticated;
revoke insert, update, delete on public.app_admins from authenticated;

-- Protected profile columns.
revoke update on public.profiles from authenticated;
grant update (full_name, avatar_url, exam_category, target_exam_year, timezone, daily_target_minutes, language)
  on public.profiles to authenticated;

-- Protected settings columns (pin_lock_enabled is managed by PIN functions).
revoke update on public.user_settings from authenticated;
grant update (theme, preferred_language, notification_enabled, auto_lock_minutes, streak_min_minutes,
              prelims_target_percent, mains_target_percent)
  on public.user_settings to authenticated;

-- Views are read-only.
revoke insert, update, delete on public.study_daily_totals from authenticated;

-- Internal helpers are not part of the public API.
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.study_sessions_set_local_date() from authenticated;
revoke execute on function public.validate_profile_timezone() from authenticated;
revoke execute on function public.set_updated_at() from authenticated;

-- ─── Enable RLS everywhere ──────────────────────────────────────────────────

alter table public.app_admins           enable row level security;
alter table public.subjects             enable row level security;
alter table public.chapters             enable row level security;
alter table public.lectures             enable row level security;
alter table public.motivational_quotes  enable row level security;
alter table public.historical_cutoffs   enable row level security;
alter table public.profiles             enable row level security;
alter table public.user_settings        enable row level security;
alter table public.user_pins            enable row level security;
alter table public.lecture_progress     enable row level security;
alter table public.study_sessions       enable row level security;
alter table public.daily_goals          enable row level security;
alter table public.daily_tasks          enable row level security;
alter table public.mock_tests           enable row level security;
alter table public.mock_subject_scores  enable row level security;
alter table public.bookmarks            enable row level security;
alter table public.personal_notes       enable row level security;

-- user_pins: intentionally NO policies (SECURITY DEFINER functions only).

-- ─── Administration ─────────────────────────────────────────────────────────

create policy "Admins can see their own membership"
  on public.app_admins for select to authenticated
  using (user_id = (select auth.uid()));

-- ─── Shared content ─────────────────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array['subjects', 'chapters', 'lectures', 'motivational_quotes']
  loop
    execute format($f$
      create policy "Authenticated users read active %1$s"
        on public.%1$I for select to authenticated
        using (is_active or (select public.is_admin()));
      create policy "Admins insert %1$s"
        on public.%1$I for insert to authenticated
        with check ((select public.is_admin()));
      create policy "Admins update %1$s"
        on public.%1$I for update to authenticated
        using ((select public.is_admin())) with check ((select public.is_admin()));
      create policy "Admins delete %1$s"
        on public.%1$I for delete to authenticated
        using ((select public.is_admin()));
    $f$, t);
  end loop;
end;
$$;

create policy "Authenticated users read cutoffs"
  on public.historical_cutoffs for select to authenticated using (true);
create policy "Admins insert cutoffs"
  on public.historical_cutoffs for insert to authenticated with check ((select public.is_admin()));
create policy "Admins update cutoffs"
  on public.historical_cutoffs for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "Admins delete cutoffs"
  on public.historical_cutoffs for delete to authenticated using ((select public.is_admin()));

-- ─── Profiles ───────────────────────────────────────────────────────────────
-- Admins may list profiles (names only) for account management; they can NOT
-- read anyone's preparation data.

create policy "Users read own profile; admins read all"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create policy "Users insert own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy "Users update own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ─── Private, user-owned tables ─────────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array[
    'user_settings', 'lecture_progress', 'study_sessions', 'daily_goals',
    'daily_tasks', 'mock_tests', 'bookmarks', 'personal_notes'
  ]
  loop
    execute format($f$
      create policy "Users read own %1$s"
        on public.%1$I for select to authenticated
        using ((select auth.uid()) = user_id);
      create policy "Users insert own %1$s"
        on public.%1$I for insert to authenticated
        with check ((select auth.uid()) = user_id);
      create policy "Users update own %1$s"
        on public.%1$I for update to authenticated
        using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
      create policy "Users delete own %1$s"
        on public.%1$I for delete to authenticated
        using ((select auth.uid()) = user_id);
    $f$, t);
  end loop;
end;
$$;

-- Subject-wise mock marks must also belong to one of the user's own mocks.
create policy "Users read own mock_subject_scores"
  on public.mock_subject_scores for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Users insert own mock_subject_scores"
  on public.mock_subject_scores for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.mock_tests m where m.id = mock_test_id and m.user_id = (select auth.uid()))
  );
create policy "Users update own mock_subject_scores"
  on public.mock_subject_scores for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.mock_tests m where m.id = mock_test_id and m.user_id = (select auth.uid()))
  );
create policy "Users delete own mock_subject_scores"
  on public.mock_subject_scores for delete to authenticated
  using ((select auth.uid()) = user_id);
