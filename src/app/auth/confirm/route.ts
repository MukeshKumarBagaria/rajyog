import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { markUnlocked } from '@/lib/auth/lock';
import { safeNextPath } from '@/lib/utils/redirect';

/**
 * Handles links from Supabase auth emails (invite, password recovery, email
 * change). Supports both the token-hash template and the PKCE `code` flow.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'), type === 'recovery' || type === 'invite' ? '/reset-password' : '/');

  const supabase = await createClient();
  let userId: string | null = null;

  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) userId = data.user?.id ?? null;
  } else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) userId = data.user?.id ?? null;
  }

  if (!userId) {
    return NextResponse.redirect(new URL('/login?error=link', origin));
  }

  await markUnlocked(userId);
  return NextResponse.redirect(new URL(next, origin));
}
