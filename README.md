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

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com). Then apply the
database schema — either with the Supabase CLI:

```bash
npx supabase link --project-ref <your-project-ref>
```

```bash
npx supabase db push
```

…or by running each file in `supabase/migrations/` **in filename order** in the
dashboard SQL editor. Finally run `supabase/seed.sql` (14 RAS subjects with
syllabus chapters + motivational messages).

### 2. Configure Supabase Auth

* **Authentication → Providers → Email**: turn **off** "Allow new users to sign up".
* **Authentication → URL configuration**: set the Site URL to your app URL and add
  `<site-url>/auth/confirm` to the redirect URLs.
* **Authentication → Email templates**: use the links documented in
  [`docs/authentication.md`](docs/authentication.md) (branded HTML in `supabase/templates/`).

### 3. Environment variables

```bash
cp .env.example .env.local
```

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API | public; RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API | **server only** — used for creating/deactivating accounts |
| `NEXT_PUBLIC_SITE_URL` | your app URL | used in auth email links |
| `APP_LOCK_SECRET` | any long random string | signs the PIN-unlock cookie |

### 4. Install, create the owner account, run

```bash
npm install
```

```bash
npm run create-user -- --email you@example.com --name "Your Name" --password "a-strong-password" --admin
```

```bash
npm run dev
```

Open http://localhost:3000 and sign in.

### 5. Add your content

* **Admin → Lectures → Bulk import** — paste one lecture per line:
  `Title | YouTube URL or ID | 45:30` (duration optional; it is detected on first play).
* **Admin → Cutoffs** — enter only officially published RPSC cutoffs, with the source link.
  No cutoffs are seeded on purpose.
* **Admin → Users** — invite other aspirants; each gets fully private progress.

---

## Deploying to Vercel

1. Import the repository in Vercel (framework: Next.js).
2. Add the five environment variables above (Production + Preview).
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

---

## How the spec's rules are enforced

| Rule | Where |
|---|---|
| Users can never access another user's records | RLS policies (`supabase/migrations/…0003_rls.sql`), tested in `supabase/tests/10_rls_isolation.sql` |
| No self-promotion to admin; protected columns | `app_admins` has no write policies; column-level grants on `profiles` / `user_settings` |
| Service-role key never in the browser | `src/lib/supabase/admin.ts` (`server-only`) |
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
