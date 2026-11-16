# Rajyog

**A calm, private, distraction-free preparation space for the Rajasthan
Administrative Services (RAS) examination.**

Every time you open Rajyog it answers three questions:

1. How much of my syllabus have I completed?
2. How consistently am I studying?
3. How close am I to being RAS examination-ready?

Built with Next.js 16 (App Router, TypeScript), Tailwind CSS v4 and Supabase
(PostgreSQL + Auth + Storage). Multi-user from day one: the course catalogue is
shared, every aspirant's progress is private and enforced by Row Level Security.

---

## Features

| Area | What you get |
|---|---|
| **Home** | Daily motivation (Hindi, Rajasthani-inspired and English originals), course completion ring with subject bars, today's verified study vs goal, weekly hours, streak, RAS readiness snapshot, continue-learning with exact resume, today's tasks (with overdue carry-over). |
| **Courses** | Subject → Chapter → Lecture catalogue, completion per subject/chapter, last-watched markers, chapter notes. |
| **Lecture player** | Embedded YouTube (no-cookie host), resume position, ±10 s, playback speed, coverage map of what you actually watched, previous/next (across chapters), bookmarks, personal notes. Completion requires **90 % unique coverage** — seeking to the end never completes a lecture. |
| **Automatic study tracking** | Counts only real, visible, advancing playback. Pauses, buffering, hidden tabs, seeks and sleeping devices never count. Offline-safe outbox; replays never double count. |
| **Focus** | Pomodoro presets (25/45/50/custom) and stopwatch, subject + study type, survives refresh/navigation, chime + optional notification, daily goal ring (editable per day), streak (configurable minimum), weekly chart, monthly heatmap calendar, recent sessions. |
| **Analysis** | Mock-test history (add/edit/delete), negative-marking calculator, subject- or paper-wise marks, separate Prelims/Mains analysis, readiness score with transparent component breakdown, benchmark vs official cutoffs (your category only), estimated score range, trend & last-five charts, strong/weak subjects, what-if calculator, historical cutoff table with sources. |
| **Privacy & security** | No public sign-up, owner-provisioned accounts, RLS on every table, optional 6-digit PIN lock with rate limiting and auto-lock, JSON export of your own data. |
| **Content admin** (owner) | Subjects, chapters, lectures (single or bulk playlist import, reorder, activate), motivational messages, official cutoffs with source links, user accounts (invite / temporary password / deactivate). |
| **PWA** | Installable, offline page, static-asset caching (private data is never cached). Light and dark themes. |

Rajyog deliberately has no feeds, leaderboards, chat, ads or gamification.

---

## Quick start

### 1. Create a Supabase project and apply the schema

Create a project at [supabase.com](https://supabase.com), open **SQL Editor**,
paste the whole of [`supabase/setup.sql`](supabase/setup.sql) and click **Run**.
It contains every migration plus the seed (14 RAS subjects with syllabus
chapters + motivational messages) and runs as one transaction — if anything
fails, nothing is applied.

Using the Supabase CLI instead? `npx supabase link --project-ref <ref>`, then
`npx supabase db push`, then run `supabase/seed.sql`.

### 2. Configure Supabase Auth

* **Authentication → Sign In / Providers**: keep **Email** enabled and turn **off**
  "Allow new users to sign up" (Rajyog has no public registration).
* **Authentication → URL Configuration**: set the Site URL to your app URL and add
  `<site-url>/auth/confirm` to the redirect URLs.
* **Authentication → Emails**: use the links documented in
  [`docs/authentication.md`](docs/authentication.md) (branded HTML in `supabase/templates/`).

### 3. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API Keys | public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings → API Keys (`sb_publishable_…`) | public; RLS protects data. Legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` also works |
| `SUPABASE_SECRET_KEY` | Project Settings → API Keys (`sb_secret_…`) | **server only** — creating/deactivating accounts from Admin → Users and the `create-user` script. Legacy `SUPABASE_SERVICE_ROLE_KEY` also works |
| `NEXT_PUBLIC_SITE_URL` | your app URL | used in auth email links |
| `APP_LOCK_SECRET` | any long random string | signs the PIN-unlock cookie |

Then verify the project (read-only, uses only the publishable key):

```bash
npm install
```

```bash
npm run check:supabase
```

### 4. Create your owner account and run

**Option A — dashboard (no secret key needed):** Authentication → Users →
**Add user → Create new user** (tick *Auto Confirm User*). Then in the SQL
Editor make yourself the content administrator:

```sql
insert into public.app_admins (user_id) select id from auth.users where email = 'you@example.com';
update public.profiles set full_name = 'Your Name' where id = (select id from auth.users where email = 'you@example.com');
```

**Option B — command line** (needs `SUPABASE_SECRET_KEY` in `.env.local`):

```bash
npm run create-user -- --email you@example.com --name "Your Name" --password "a-strong-password" --admin
```

Start the app and sign in at http://localhost:3000:

```bash
npm run dev
```

### 5. Add your content

* **Admin → Lectures → Bulk import** — paste one lecture per line:
  `Title | YouTube URL or ID | 45:30` (duration optional; it is detected on first play).
* **Admin → Cutoffs** — enter only officially published RPSC cutoffs, with the source link.
  No cutoffs are seeded on purpose.
* **Admin → Users** — invite other aspirants; each gets fully private progress.

---

## Deploying to Vercel

1. Import the repository in Vercel (framework: Next.js).
2. Add the five environment variables above (Production + Preview). `SUPABASE_SECRET_KEY` must **not** be prefixed with `NEXT_PUBLIC_`.
3. Set `NEXT_PUBLIC_SITE_URL` and the Supabase Site URL to the Vercel domain.
4. Deploy. The app needs no other services.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm test` | Unit tests (Vitest) — tracker, segment merging, readiness, scoring, streaks, timezones, YouTube parsing, unlock tokens |
| `npm run test:db` | Applies all migrations + seed to a throwaway local PostgreSQL and runs the RLS / isolation / business-rule tests (needs PostgreSQL server binaries, or set `DATABASE_URL` to an empty database) |
| `npm run check` | typecheck + lint + unit tests |
| `npm run create-user` | Provision an account from the command line |
| `npm run check:supabase` | Read-only check that your Supabase project has every table/function, locked down, and sign-ups disabled |
| `npm run db:setup-sql` | Regenerate `supabase/setup.sql` after changing migrations or the seed (`test:db` fails if it is stale) |

---

## How the spec's rules are enforced

| Rule | Where |
|---|---|
| Users can never access another user's records | RLS policies (`supabase/migrations/…0003_rls.sql`), tested in `supabase/tests/10_rls_isolation.sql` |
| No self-promotion to admin; protected columns | `app_admins` has no write policies; column-level grants on `profiles` / `user_settings` |
| Secret key never in the browser | `src/lib/supabase/admin.ts` (`server-only`) |
| Seeking cannot complete a lecture; no duplicate counting | `PlaybackTracker` + `record_lecture_progress()` interval merging and `seq` idempotency |
| Study time ≠ video duration; hidden tab / buffering excluded | [`docs/video-tracking.md`](docs/video-tracking.md) |
| No manual + video double counting | Video study time pauses while the focus timer runs |
| Correct local day for late-night sessions | `study_sessions.local_date` trigger using `profiles.timezone` |
| Readiness only from enough comparable mocks; never a selection probability | [`docs/readiness.md`](docs/readiness.md) |
| No invented cutoffs or misattributed quotes | Cutoffs are admin-entered with mandatory source URLs; seed quotes are original "Rajyog" messages |
| Course completion, study time and readiness stay independent | Separate tables, services and UI cards |

---

## Documentation

* [Architecture](docs/architecture.md)
* [Database](docs/database.md)
* [Authentication & accounts](docs/authentication.md)
* [Video tracking](docs/video-tracking.md)
* [Readiness model](docs/readiness.md)
* [Design system](docs/design-system.md)

## Project structure

```text
src/app            routes (auth group, dashboard group incl. admin, API routes)
src/actions        server actions
src/components     ui kit + feature components
src/hooks          lecture tracking hook
src/lib            analytics, tracking, supabase clients, auth, validation, utils
src/services       server-side data access
src/stores         zustand stores
supabase/          migrations, seed, tests, CLI config, email templates
docs/              technical documentation
```
