import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { clearUnlocked } from '@/lib/auth/lock';

/** Server-side sign-out used when an account is found to be inactive. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await clearUnlocked();
  const reason = request.nextUrl.searchParams.get('reason') === 'inactive' ? '?error=inactive' : '';
  return NextResponse.redirect(new URL(`/login${reason}`, request.nextUrl.origin));
}
