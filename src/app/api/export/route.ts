import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Exports ALL of the signed-in user's private data as JSON. Every query runs
 * under the user's RLS, so nobody can ever export another user's records.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tables = [
    'profiles',
    'user_settings',
    'lecture_progress',
    'study_sessions',
    'daily_goals',
    'daily_tasks',
    'mock_tests',
    'mock_subject_scores',
    'bookmarks',
    'personal_notes',
  ] as const;

  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), user_id: userId };
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(50000);
    if (error) return NextResponse.json({ error: `Could not export ${t}` }, { status: 500 });
    out[t] = data;
  }

  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="rajyog-export-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
