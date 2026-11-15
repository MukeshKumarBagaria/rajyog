# Database

All schema changes live in `supabase/migrations` (apply in filename order).
UUID primary keys everywhere; all timestamps are `timestamptz` (UTC).

| Migration | Contents |
|---|---|
| `…0001_core_schema.sql` | tables, constraints, indexes, `updated_at` triggers, `local_date` trigger, `study_daily_totals` view |
| `…0002_functions.sql` | admin check, new-user bootstrap, progress merging, focus sessions, goals, course summary, mocks, PIN |
| `…0003_rls.sql` | privileges, column grants, RLS policies on every table |
| `…0004_storage.sql` | private `avatars` bucket with per-user folder policies |

## Tables

**Shared content** (read: any signed-in user, active rows only · write: admins)

| Table | Notes |
|---|---|
| `subjects` | `syllabus_stage` PRELIMS / MAINS / BOTH, `sort_order`, `is_active` |
| `chapters` | belongs to a subject; `weight` reserved for weighted completion |
| `lectures` | stores only the 11-char `youtube_video_id` (validated by regex), optional `duration_seconds`, `completion_threshold` (default 0.9) |
| `motivational_quotes` | `language` en / hi / raj, `category`, optional `display_date` |
| `historical_cutoffs` | year, stage, category, `cutoff_type`, `exam_pattern_version`, `cutoff_marks` **and** `total_marks`, mandatory https `source_url` |
| `app_admins` | administrator membership — writable only with the service role |

**Private** (every row has `user_id`; RLS: owner only)

| Table | Notes |
|---|---|
| `profiles` | id = auth user id; category, target year, timezone, daily target. `is_active` is not user-writable (column grants). |
| `user_settings` | theme, quote language, notifications, auto-lock, streak minimum, personal targets. `pin_lock_enabled` only changes through PIN functions. |
| `user_pins` | bcrypt PIN hash + rate-limit counters. RLS on, **no policies** → only reachable through `SECURITY DEFINER` functions. |
| `lecture_progress` | unique `(user_id, lecture_id)`; merged `watched_segments`, unique `watched_seconds`, `last_position_seconds`, status |
| `study_sessions` | VIDEO / MANUAL / POMODORO; verified `duration_seconds`; `local_date` set by trigger; `last_seq` for heartbeat idempotency; check: active time ≤ wall-clock time |
| `daily_goals` | unique `(user_id, goal_date)`; target snapshotted per day; `completed` maintained by trigger |
| `daily_tasks`, `bookmarks`, `personal_notes` | simple personal records |
| `mock_tests` | own marking scheme per mock (`marks_per_correct`, `negative_marks`), counts must add up, `exam_pattern_version` |
| `mock_subject_scores` | subject **or** free label (Mains papers); RLS also checks the parent mock belongs to the user |

## Key functions

| Function | Security | Purpose |
|---|---|---|
| `record_lecture_progress(...)` | invoker | Merge watched intervals, recompute completion, store resume point, add verified VIDEO seconds (deduplicated by `p_seq`, capped by wall clock). Row-locked so concurrent tabs never lose intervals. |
| `merge_segments(jsonb, max, gap)` | immutable | Clamp, sort and union `[start,end]` intervals. |
| `fill_missing_lecture_duration` | definer | Fills a blank lecture duration from the player once; never overwrites. |
| `save_focus_session(...)` | invoker | Validates time window and duration; idempotent by client UUID. |
| `sync_daily_goal` / `set_daily_goal` | invoker | Keeps `daily_goals.completed` in sync with sessions. |
| `course_progress_summary()` | invoker | Per-subject lecture/chapter completion for the caller. |
| `save_mock_test(jsonb, jsonb)` | invoker | Atomic insert/update of a mock and its subject scores. |
| `set_app_pin` / `verify_app_pin` / `disable_app_pin` | definer | bcrypt hashing; 5 failures → lock for 5 min × (failures ÷ 5). |
| `is_admin()` | definer | Membership check used by RLS policies. |
| `handle_new_user()` | definer | Creates `profiles` + `user_settings` for every new auth user. |

## Testing

`npm run test:db` spins up a throwaway local PostgreSQL, installs a minimal
Supabase stub (roles, `auth.users`, `auth.uid()`), applies every migration and
the seed, then runs `supabase/tests/10_rls_isolation.sql`, which asserts among
other things:

* anonymous users can read nothing; two users see the same catalogue but none of
  each other's progress, sessions, mocks, goals, tasks, notes or bookmarks;
* seeking to the end never completes a lecture; replayed heartbeats never double
  count; inflated heartbeats are capped by wall-clock time;
* users cannot promote themselves, edit content, flip `is_active` or bypass the
  PIN functions; PIN hashes are unreadable and verification is rate limited;
* late-night sessions are attributed to the correct local day;
* deleting an account cascades cleanly.
