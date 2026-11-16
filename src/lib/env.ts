/**
 * Environment access. Public values are inlined at build time by Next.js, so
 * they must be referenced with their full literal names.
 *
 * Supabase key names: new projects use a *publishable* key (`sb_publishable_…`)
 * and a *secret* key (`sb_secret_…`). The legacy `anon` / `service_role` JWT
 * names are still accepted so older projects keep working.
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
};

export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabasePublishableKey);
}

/** Server-only Supabase secret key (never exposed to the browser). */
export function supabaseSecretKey(): string | undefined {
  return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || undefined;
}
