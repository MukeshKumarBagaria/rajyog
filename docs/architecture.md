# Architecture

Rajyog is a Next.js 16 (App Router) application backed entirely by Supabase
(PostgreSQL, Auth, Storage). There is no separate API server.

```text
Browser ──► Next.js (Vercel)
              │  proxy.ts ─ refreshes the Supabase session cookie, optimistic auth redirect
              │  Server Components ─ read data as the signed-in user (anon key + cookie)
              │  Server Actions ─ validated (zod) mutations
              │  Route handlers ─ /api/progress (video heartbeats), /api/export, /auth/*
              ▼
           Supabase
              │  Auth ─ email + password, invitations, password recovery
              │  PostgREST ─ every query runs as the user → Row Level Security applies
              │  Postgres functions ─ progress merging, focus sessions, mocks, PIN, goals
              ▼
           PostgreSQL (RLS on every table)
```

## Principles

| Principle | How it is implemented |
|---|---|
| Shared content, private progress | Content tables are readable by every authenticated user and writable only by admins; every personal table carries `user_id` and RLS restricts it to `auth.uid()`. |
| Security in the database | The browser and server both use the **publishable key**. Authorisation is enforced by RLS and `SECURITY INVOKER` functions, never by front-end filtering. The secret key is used only in `src/lib/supabase/admin.ts` (marked `server-only`) for account provisioning. |
| Three independent metrics | *Course completion* = completed lectures ÷ lectures. *Study time* = verified active seconds. *Readiness* = mock-test model. None is derived from another. |
| Timezone-correct days | `study_sessions.local_date` is computed in the database from the user's `profiles.timezone`, so a session at 11:30 PM always lands on the right day. |
| Server first | Pages are Server Components that fetch with the request's Supabase client. Client components are used only for the player, timer, charts and forms. |

## Directory map

```text
src/
  app/
    (auth)/            login, forgot-password, reset-password, unlock
    (dashboard)/       authenticated shell: home, courses, lecture, focus,
                       analysis, library, settings, admin/*
    api/progress       video heartbeat endpoint (fetch keepalive + sendBeacon)
    api/export         JSON export of the user's own data
    auth/confirm       email-link handler (invite / recovery)
  actions/             server actions (auth, tasks, study, mocks, library, settings, admin)
  components/          ui kit + feature components
  hooks/               use-lecture-tracking (YouTube player + tracker)
  lib/
    analytics/         pure, unit-tested business logic (readiness, scoring, streaks, stats)
    tracking/          PlaybackTracker, segment merging, durable progress outbox
    supabase/          browser / server / admin clients + proxy session refresh
    auth/              session DAL, PIN-unlock cookie, action context
    validation/        zod schemas shared by forms and actions
  services/            server-side data access (one file per domain)
  stores/              zustand stores (focus timer, toasts)
supabase/
  migrations/          schema → functions → RLS → storage
  seed.sql             subjects, chapters, motivational messages
  tests/               database isolation tests (run on a throwaway Postgres)
```

## Request lifecycle

1. `src/proxy.ts` refreshes the session cookie (`@supabase/ssr`) and redirects
   anonymous visitors to `/login?next=…`. It also forwards `x-pathname`.
2. `(dashboard)/layout.tsx` loads the viewer (profile, settings, admin flag) once
   per request (`React.cache`), signs out deactivated accounts, enforces the PIN
   lock and gives non-admins a real redirect away from `/admin`.
3. Pages call services with the per-request client; RLS scopes every row.
4. Mutations go through server actions that validate with zod, call Supabase as
   the user, then `revalidatePath`.

## Caching

The app intentionally uses request-time rendering (no Cache Components):
virtually every screen is personal. Private data is never cached publicly; the
service worker only caches hashed static assets and an offline page.

## Offline behaviour

* Lecture heartbeats are written to a localStorage outbox **before** sending and
  removed only after the server confirms, so progress survives network drops,
  tab closes and refreshes (see `video-tracking.md`).
* The focus timer is persisted in localStorage and derives elapsed time from
  timestamps, so it survives refreshes and navigation.
