const ID_RE = /^[A-Za-z0-9_-]{11}$/;
const DRIVE_ID_RE = /^[A-Za-z0-9_-]{20,100}$/;

export type VideoProvider = 'youtube' | 'drive';
export type VideoRef = { provider: VideoProvider; id: string };

export function isValidVideoId(id: string | null | undefined): boolean {
  return typeof id === 'string' && ID_RE.test(id);
}

export function isValidDriveFileId(id: string | null | undefined): boolean {
  return typeof id === 'string' && DRIVE_ID_RE.test(id);
}

/** Validates a stored (provider, id) pair. */
export function isValidVideoRef(provider: string | null | undefined, id: string | null | undefined): boolean {
  return provider === 'drive' ? isValidDriveFileId(id) : isValidVideoId(id);
}

function toUrl(value: string): URL | null {
  try {
    return new URL(value.startsWith('http') ? value : `https://${value}`);
  } catch {
    return null;
  }
}

/**
 * Extracts a YouTube video ID from a raw ID or any common YouTube URL form
 * (watch, youtu.be, embed, shorts, live, nocookie). Returns null if invalid.
 */
export function parseVideoId(input: string): string | null {
  const value = input.trim();
  if (isValidVideoId(value)) return value;

  const url = toUrl(value);
  if (!url) return null;

  const host = url.hostname.replace(/^www\.|^m\.|^music\./, '');
  let candidate: string | null = null;

  if (host === 'youtu.be') {
    candidate = url.pathname.split('/')[1] ?? null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') candidate = url.searchParams.get('v');
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      candidate = m?.[1] ?? null;
    }
  }

  return candidate && isValidVideoId(candidate) ? candidate : null;
}

/**
 * Extracts a Google Drive file ID from a share link
 * (drive.google.com/file/d/ID/view, open?id=ID, uc?id=ID, drive.usercontent…).
 * A bare ID is accepted only when it cannot be a YouTube ID (Drive IDs are longer).
 */
export function parseDriveFileId(input: string): string | null {
  const value = input.trim();
  if (isValidDriveFileId(value)) return value;

  const url = toUrl(value);
  if (!url) return null;
  const host = url.hostname.replace(/^www\./, '');
  if (host !== 'drive.google.com' && host !== 'docs.google.com' && host !== 'drive.usercontent.google.com') return null;

  const m = url.pathname.match(/\/file\/d\/([^/?#]+)/);
  const candidate = m?.[1] ?? url.searchParams.get('id');
  return candidate && isValidDriveFileId(candidate) ? candidate : null;
}

/** Parses a YouTube or Google Drive link / ID into a provider + ID. */
export function parseVideoRef(input: string): VideoRef | null {
  const yt = parseVideoId(input);
  if (yt) return { provider: 'youtube', id: yt };
  const drive = parseDriveFileId(input);
  if (drive) return { provider: 'drive', id: drive };
  return null;
}

/** A link an admin can paste back into the form to identify the video. */
export function videoRefToInput(provider: VideoProvider, id: string): string {
  return provider === 'drive' ? `https://drive.google.com/file/d/${id}/view` : id;
}

/** "45:30", "1:02:03", "2700" (seconds) → seconds; null if blank/invalid. */
export function parseDurationInput(input: string | null | undefined): number | null {
  const v = (input ?? '').trim();
  if (!v) return null;
  if (/^\d+$/.test(v)) return Number(v) || null;
  const parts = v.split(':').map((p) => p.trim());
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d{1,2}$/.test(p) && !/^\d+$/.test(p))) return null;
  const nums = parts.map(Number);
  const seconds = nums.length === 3 ? nums[0] * 3600 + nums[1] * 60 + nums[2] : nums[0] * 60 + nums[1];
  return seconds > 0 && seconds <= 86400 ? seconds : null;
}

export type BulkLectureLine = { title: string; videoId: string; provider: VideoProvider; durationSeconds: number | null; line: number };
export type BulkParseResult = { items: BulkLectureLine[]; errors: { line: number; message: string }[] };

/**
 * Bulk lecture import: one lecture per line, `Title | URL-or-ID | duration?`.
 * The URL may be a YouTube link/ID or a Google Drive share link.
 * Blank lines and lines starting with # are ignored.
 */
export function parseBulkLectures(text: string): BulkParseResult {
  const items: BulkLectureLine[] = [];
  const errors: { line: number; message: string }[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    const value = raw.trim();
    if (!value || value.startsWith('#')) return;
    const [title, ref, dur] = value.split('|').map((p) => p.trim());
    if (!title) return errors.push({ line, message: 'Missing title' });
    if (!ref) return errors.push({ line, message: 'Missing YouTube or Google Drive link' });
    const parsed = parseVideoRef(ref);
    if (!parsed) return errors.push({ line, message: `Not a valid YouTube or Google Drive video: ${ref}` });
    const durationSeconds = dur ? parseDurationInput(dur) : null;
    if (dur && durationSeconds === null) return errors.push({ line, message: `Invalid duration: ${dur}` });
    items.push({ title: title.slice(0, 200), videoId: parsed.id, provider: parsed.provider, durationSeconds, line });
  });
  return { items, errors };
}

export function thumbnailUrl(videoId: string, quality: 'mq' | 'hq' = 'mq', provider: VideoProvider = 'youtube'): string {
  if (provider === 'drive') return `https://drive.google.com/thumbnail?id=${encodeURIComponent(videoId)}&sz=w${quality === 'hq' ? 640 : 320}`;
  return `https://i.ytimg.com/vi/${videoId}/${quality}default.jpg`;
}

/**
 * Range-capable download URL of a publicly shared Drive file. Server-side only:
 * Drive refuses these requests from browsers, so the player goes through
 * driveStreamUrl() (our /api/video/drive proxy) instead.
 */
export function driveDownloadUrl(fileId: string): string {
  return `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;
}

/** Same-origin stream of a Drive lecture for the in-app <video> player. */
export function driveStreamUrl(fileId: string): string {
  return `/api/video/drive/${encodeURIComponent(fileId)}`;
}

/** Google Drive's own embedded player — the fallback when the browser can't decode the file. */
export function drivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}
