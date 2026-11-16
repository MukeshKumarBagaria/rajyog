#!/usr/bin/env node
/**
 * Checks that a Supabase project is ready for Rajyog, using only the public
 * publishable key from .env.local (nothing is written):
 *
 *   npm run check:supabase
 *
 * • every table / function exists (and is closed to logged-out visitors)
 * • public sign-ups are disabled
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local first.');
  process.exit(1);
}

const tables = [
  'subjects', 'chapters', 'lectures', 'motivational_quotes', 'historical_cutoffs', 'app_admins', 'profiles',
  'user_settings', 'user_pins', 'lecture_progress', 'study_sessions', 'daily_goals', 'daily_tasks', 'mock_tests',
  'mock_subject_scores', 'bookmarks', 'personal_notes', 'study_daily_totals',
];
// Called with correctly named dummy arguments so Supabase can resolve each
// signature. Logged-out visitors have no EXECUTE right, so nothing ever runs.
const ZERO = '00000000-0000-0000-0000-000000000000';
const now = new Date().toISOString();
const functions = {
  is_admin: {},
  course_progress_summary: {},
  record_lecture_progress: { p_lecture_id: ZERO, p_segments: [], p_position: 0 },
  save_focus_session: { p_id: ZERO, p_session_type: 'MANUAL', p_start: now, p_end: now, p_duration: 60 },
  save_mock_test: { p_mock: {} },
  verify_app_pin: { p_pin: '000000' },
};
const headers = { apikey: key, 'Content-Type': 'application/json' };

let problems = 0;
const report = (ok, label, detail = '') => {
  if (!ok) problems++;
  console.log(`${ok ? '✔' : '✘'} ${label}${detail ? ` — ${detail}` : ''}`);
};

for (const t of tables) {
  const res = await fetch(`${url}/rest/v1/${t}?select=*&limit=1`, { headers });
  const body = await res.json().catch(() => ({}));
  if (body.code === 'PGRST205') report(false, `table ${t}`, 'missing — run supabase/setup.sql');
  else if (body.code === '42501') report(true, `table ${t}`, 'exists, closed to logged-out visitors');
  else if (res.ok) report(false, `table ${t}`, 'readable by logged-out visitors — re-run the RLS migration');
  else report(false, `table ${t}`, `unexpected response ${res.status} ${body.code ?? ''}`);
}
for (const [f, args] of Object.entries(functions)) {
  const res = await fetch(`${url}/rest/v1/rpc/${f}`, { method: 'POST', headers, body: JSON.stringify(args) });
  const body = await res.json().catch(() => ({}));
  if (body.code === 'PGRST202') report(false, `function ${f}`, 'missing — run supabase/setup.sql');
  else if (body.code === '42501') report(true, `function ${f}`, 'exists, closed to logged-out visitors');
  else report(false, `function ${f}`, `callable by logged-out visitors (${res.status})`);
}

const settings = await fetch(`${url}/auth/v1/settings`, { headers }).then((r) => r.json()).catch(() => null);
if (!settings) report(false, 'auth settings', 'could not read');
else {
  report(settings.external?.email === true, 'email sign-in enabled');
  report(settings.disable_signup === true, 'public sign-ups disabled', settings.disable_signup ? '' : 'Dashboard → Authentication → Sign In / Providers → turn OFF "Allow new users to sign up"');
}

console.log(problems ? `\n${problems} problem(s) found.` : '\nSupabase project is ready for Rajyog.');
process.exit(problems ? 1 : 0);
