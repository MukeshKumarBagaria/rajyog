# Authentication & accounts

Rajyog uses **Supabase Auth** (email + password) through `@supabase/ssr`
cookies. There is **no public registration**.

## Account provisioning

| Method | When | How |
|---|---|---|
| CLI script | First (owner) account | `npm run create-user -- --email you@example.com --name "Your Name" --password "…" --admin` (reads `.env.local`; uses `SUPABASE_SECRET_KEY` locally) |
| Admin → Users | Every other aspirant | *Email invitation* (they choose their own password) or *temporary password* you share privately |

Both paths run on the server only. The secret key (`sb_secret_…`, or the legacy
service-role key) is never sent to the browser (`src/lib/supabase/admin.ts`
imports `server-only`). The browser and server otherwise use only the
publishable key, so every query runs under RLS.

Admin rights are stored in `app_admins`, which users cannot write to; RLS on
content tables calls `is_admin()`. Every admin server action re-checks it too.

Deactivating a user (Admin → Users) bans them in Supabase Auth and sets
`profiles.is_active = false`; their private data is kept and reactivation
restores access.

## Supabase dashboard settings

1. **Authentication → Providers → Email**: enable email provider, **disable "Allow new users to sign up"**.
2. **Authentication → URL configuration**: Site URL = your domain (e.g. `https://rajyog.vercel.app`);
   add `https://<domain>/auth/confirm` to Redirect URLs.
3. **Authentication → Email templates** (so links work with server-side auth):
   * Invite user: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/reset-password`
   * Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

   Ready-made branded templates are in `supabase/templates/`.

## Flows

* **Login** → `signInAction` → session cookie; deactivated profiles are signed
  out immediately. A password login also satisfies the PIN lock.
* **Forgot password** → `resetPasswordForEmail` (same response whether or not
  the email exists) → email link → `/auth/confirm` → `/reset-password`.
* **Invite** → email link → `/auth/confirm` → `/reset-password` to set a password.
* **Route protection** → `src/proxy.ts` redirects anonymous users; the
  dashboard layout and every service/action verify the session again; RLS is
  the final authority.

## Optional PIN lock

A 6-digit convenience lock **on top of** password authentication.

* PIN hashes are bcrypt (`pgcrypto`) in `user_pins`, a table with RLS and no
  policies — only `SECURITY DEFINER` functions can touch it.
* `verify_app_pin` is rate limited: after every 5 consecutive failures the PIN
  is locked for 5 minutes × (failures ÷ 5).
* A successful PIN (or password) sets an httpOnly, HMAC-signed session cookie
  (`rj_unlock`, signed with `APP_LOCK_SECRET`). The dashboard layout requires a
  valid cookie when the lock is enabled.
* The browser auto-locks after the configured idle minutes. Playing a lecture or
  running the focus timer counts as activity.
* Forgot the PIN? Sign out and sign in with your password.
