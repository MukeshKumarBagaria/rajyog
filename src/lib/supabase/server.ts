import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { publicEnv } from '@/lib/env';

/**
 * Server Supabase client bound to the current request's auth cookies.
 * Uses the anon key: every query runs as the signed-in user under RLS.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: cookies are read-only there. The
          // proxy refreshes sessions, so this can be safely ignored.
        }
      },
    },
  });
}

/** One client per request, shared by every server component in the tree. */
export const getSupabase = cache(createClient);

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;
