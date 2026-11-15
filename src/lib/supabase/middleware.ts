import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { isSupabaseConfigured, publicEnv } from '@/lib/env';

/** Routes reachable without a session. */
const PUBLIC_PATHS = new Set(['/login', '/forgot-password', '/offline']);
const PUBLIC_PREFIXES = ['/auth/'];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * Refreshes the Supabase session cookie on every request and performs the
 * optimistic auth redirect. Real authorisation happens in the data layer
 * (server components / actions) and in Postgres RLS.
 */
export async function updateSession(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Forward the current path so server layouts can build `?next=` redirects.
  const forward = () => {
    const headers = new Headers(request.headers);
    headers.set('x-pathname', `${pathname}${search}`);
    return NextResponse.next({ request: { headers } });
  };

  let response = forward();

  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = forward();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not run code between createServerClient and getClaims().
  const { data } = await supabase.auth.getClaims();
  const isAuthed = Boolean(data?.claims?.sub);

  if (!isAuthed && !isPublic(pathname) && !pathname.startsWith('/api/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (pathname !== '/') url.searchParams.set('next', `${pathname}${search}`);
    return redirectWithCookies(url, response);
  }

  if (isAuthed && (pathname === '/login' || pathname === '/forgot-password')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return redirectWithCookies(url, response);
  }

  return response;
}

function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
