import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { progressPayloadSchema } from '@/lib/validation/schemas';

/**
 * Lecture progress heartbeat (fetch keepalive or navigator.sendBeacon).
 * Authenticated by the session cookie; all writes go through
 * record_lecture_progress() under the caller's RLS.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = progressPayloadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid payload' }, { status: 422 });
  const p = parsed.data;

  const { data, error } = await supabase.rpc('record_lecture_progress', {
    p_lecture_id: p.lectureId,
    p_segments: p.segments,
    p_position: Math.floor(p.position),
    p_session_id: p.sessionId ?? null,
    p_active_seconds: p.activeSeconds,
    p_seq: p.seq,
    p_player_duration: p.duration ? Math.round(p.duration) : null,
  });

  if (error) {
    const status = error.code === 'P0002' ? 404 : error.code === '22023' ? 422 : 500;
    return NextResponse.json({ error: status === 500 ? 'Could not save progress' : error.message }, { status });
  }

  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
}
