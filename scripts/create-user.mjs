#!/usr/bin/env node
/**
 * Bootstrap / provision an account from the command line (no public sign-up).
 *
 *   node --env-file=.env.local scripts/create-user.mjs \
 *     --email you@example.com --name "Your Name" --password "a-strong-password" [--admin]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or the legacy
 * SUPABASE_SERVICE_ROLE_KEY) in the
 * environment. Use --admin for the owner account (content administration).
 */
import { createClient } from '@supabase/supabase-js';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith('--') ? all[i + 1] : true]);
    return acc;
  }, []),
);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (try: node --env-file=.env.local scripts/create-user.mjs …)');
  process.exit(1);
}
if (!args.email || !args.password || String(args.password).length < 8) {
  console.error('Usage: --email <email> --password <min 8 chars> [--name "Full Name"] [--admin]');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const { data, error } = await supabase.auth.admin.createUser({
  email: String(args.email).toLowerCase(),
  password: String(args.password),
  email_confirm: true,
  user_metadata: { full_name: args.name ? String(args.name) : undefined },
});
if (error) {
  console.error('Could not create user:', error.message);
  process.exit(1);
}
const id = data.user.id;
if (args.name) await supabase.from('profiles').update({ full_name: String(args.name) }).eq('id', id);
if (args.admin) {
  const { error: adminError } = await supabase.from('app_admins').upsert({ user_id: id });
  if (adminError) {
    console.error('User created but could not grant admin:', adminError.message);
    process.exit(1);
  }
}
console.log(`✔ Created ${args.email} (${id})${args.admin ? ' as administrator' : ''}`);
