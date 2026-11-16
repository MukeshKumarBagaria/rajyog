import 'server-only';

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { publicEnv, supabaseSecretKey } from '@/lib/env';

/**
 * Secret-key client. BYPASSES RLS — use only in protected server code after
 * verifying the caller is an administrator. Never import from client code
 * (the `server-only` import makes that a build error).
 */
export function createAdminClient() {
  const secretKey = supabaseSecretKey();
  if (!secretKey) {
    throw new Error('SUPABASE_SECRET_KEY is not configured on the server.');
  }
  return createClient<Database>(publicEnv.supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function hasServiceRole(): boolean {
  return Boolean(supabaseSecretKey());
}
