import 'server-only';

import { createClient } from '@/lib/supabase/server';

/** Authenticated Supabase client for server actions (RLS enforced). */
export async function actionContext() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) throw new Error('Your session has expired. Please sign in again.');
  return { supabase, userId };
}

export async function adminActionContext() {
  const ctx = await actionContext();
  const { data: isAdmin } = await ctx.supabase.rpc('is_admin');
  if (isAdmin !== true) throw new Error('Only the content administrator can do this.');
  return ctx;
}

export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e instanceof Error && e.message) return e.message;
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return fallback;
}
