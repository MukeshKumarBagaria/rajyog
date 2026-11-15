import 'server-only';

import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/server';
import type { ProfileRow, UserSettingsRow } from '@/types/database';
import { DEFAULT_TIMEZONE, safeTimezone } from '@/lib/utils/dates';

export type AuthUser = { id: string; email: string | null };

/** Verified user from the session JWT (signature-checked by Supabase). */
export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  return { id: sub, email: (data.claims.email as string | undefined) ?? null };
});

export async function requireUser(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) redirect('/login');
  return user;
}

export type Viewer = AuthUser & {
  profile: ProfileRow;
  settings: UserSettingsRow;
  isAdmin: boolean;
  timezone: string;
  avatarSrc: string | null;
  displayName: string;
};

function defaultProfile(id: string): ProfileRow {
  const now = new Date().toISOString();
  return {
    id,
    full_name: null,
    avatar_url: null,
    exam_category: 'GEN',
    target_exam_year: null,
    timezone: DEFAULT_TIMEZONE,
    daily_target_minutes: 240,
    language: 'en',
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

function defaultSettings(userId: string): UserSettingsRow {
  const now = new Date().toISOString();
  return {
    id: '',
    user_id: userId,
    theme: 'light',
    preferred_language: 'both',
    notification_enabled: false,
    pin_lock_enabled: false,
    auto_lock_minutes: 10,
    streak_min_minutes: 30,
    prelims_target_percent: null,
    mains_target_percent: null,
    created_at: now,
    updated_at: now,
  };
}

/** The signed-in user with profile, settings and role — once per request. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const user = await requireUser();
  const supabase = await getSupabase();

  const [profileRes, settingsRes, adminRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('user_settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.rpc('is_admin'),
  ]);

  const profile = profileRes.data ?? defaultProfile(user.id);
  const settings = settingsRes.data ?? defaultSettings(user.id);

  let avatarSrc: string | null = null;
  if (profile.avatar_url) {
    if (/^https:\/\//.test(profile.avatar_url)) avatarSrc = profile.avatar_url;
    else {
      const { data } = await supabase.storage.from('avatars').createSignedUrl(profile.avatar_url, 60 * 60);
      avatarSrc = data?.signedUrl ?? null;
    }
  }

  return {
    ...user,
    profile,
    settings,
    isAdmin: adminRes.data === true,
    timezone: safeTimezone(profile.timezone),
    avatarSrc,
    displayName: profile.full_name?.trim() || user.email?.split('@')[0] || 'Aspirant',
  };
});

export async function requireAdmin(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer.isAdmin) redirect('/');
  return viewer;
}
