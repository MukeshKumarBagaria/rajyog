'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { publicEnv } from '@/lib/env';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Browser Supabase client (anon key + user session cookie; RLS applies). */
export function createClient() {
  browserClient ??= createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey);
  return browserClient;
}
