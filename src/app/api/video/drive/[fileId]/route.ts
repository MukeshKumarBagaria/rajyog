import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { driveDownloadUrl, isValidDriveFileId } from '@/lib/youtube/video-id';

/**
 * Streams a Google Drive lecture video to the in-app <video> player.
 *
 * Google Drive refuses to serve file bytes to browsers directly (hot-linking
 * from another site fails), but it serves byte ranges to servers. This route
 * forwards the player's Range requests to Drive and streams the bytes back.
 *
 *  • Only signed-in users, and only Drive files that belong to a lecture —
 *    it is not an open proxy.
 *  • Each response is capped to CHUNK_BYTES; the browser simply requests the
 *    next range. That keeps every request short (serverless-friendly) and
 *    makes seeking cheap.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHUNK_BYTES = 8 * 1024 * 1024;
const ALLOW_TTL_MS = 10 * 60 * 1000;
const allowed = new Map<string, number>(); // fileId → expiry (per server instance)

function parseRange(header: string | null): { start: number; end: number | null } | null {
  if (!header) return { start: 0, end: null };
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (!m[1] && !m[2])) return null;
  if (!m[1]) return null; // suffix ranges ("bytes=-500") are not used by media players
  const start = Number(m[1]);
  const end = m[2] ? Number(m[2]) : null;
  if (!Number.isSafeInteger(start) || (end !== null && (!Number.isSafeInteger(end) || end < start))) return null;
  return { start, end };
}

async function isLectureFile(fileId: string): Promise<'ok' | 'unauthorized' | 'not-found'> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) return 'unauthorized';

  const exp = allowed.get(fileId);
  if (exp && exp > Date.now()) return 'ok';

  // RLS: only content visible to this user is returned.
  const { data } = await supabase
    .from('lectures')
    .select('id')
    .eq('video_provider', 'drive')
    .eq('youtube_video_id', fileId)
    .limit(1)
    .maybeSingle();
  if (!data) return 'not-found';
  allowed.set(fileId, Date.now() + ALLOW_TTL_MS);
  return 'ok';
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ fileId: string }> }) {
  const { fileId } = await params;
  if (!isValidDriveFileId(fileId)) return NextResponse.json({ error: 'Invalid file' }, { status: 400 });

  const access = await isLectureFile(fileId);
  if (access === 'unauthorized') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (access === 'not-found') return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const range = parseRange(request.headers.get('range'));
  if (!range) return new NextResponse(null, { status: 416 });
  const end = Math.min(range.end ?? Number.MAX_SAFE_INTEGER, range.start + CHUNK_BYTES - 1);

  let upstream: Response;
  try {
    upstream = await fetch(driveDownloadUrl(fileId), {
      headers: { Range: `bytes=${range.start}-${end}` },
      redirect: 'follow',
      cache: 'no-store',
      signal: request.signal,
    });
  } catch {
    return NextResponse.json({ error: 'Google Drive is unreachable' }, { status: 502 });
  }

  if (upstream.status === 416) {
    return new NextResponse(null, { status: 416, headers: { 'Content-Range': upstream.headers.get('content-range') ?? 'bytes */0' } });
  }
  const contentRange = upstream.headers.get('content-range');
  const upstreamType = upstream.headers.get('content-type') ?? '';
  // Anything but a byte range (an HTML notice, quota page, permission error) is not playable.
  if (upstream.status !== 206 || !contentRange || upstreamType.startsWith('text/')) {
    await upstream.body?.cancel().catch(() => undefined);
    const status = upstream.status === 404 || upstream.status === 403 ? upstream.status : 502;
    return NextResponse.json({ error: 'Google Drive did not return the video. Is the file shared as “Anyone with the link”?' }, { status });
  }

  const headers = new Headers({
    // Drive labels these files application/octet-stream; browsers sniff the real container.
    'Content-Type': upstreamType.startsWith('video/') ? upstreamType : 'video/x-matroska',
    'Content-Range': contentRange,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=3600',
  });
  const length = upstream.headers.get('content-length');
  if (length) headers.set('Content-Length', length);

  return new NextResponse(upstream.body, { status: 206, headers });
}
