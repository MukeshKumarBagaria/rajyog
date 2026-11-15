const ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function isValidVideoId(id: string | null | undefined): boolean {
  return typeof id === 'string' && ID_RE.test(id);
}

/**
 * Extracts a YouTube video ID from a raw ID or any common YouTube URL form
 * (watch, youtu.be, embed, shorts, live, nocookie). Returns null if invalid.
 */
export function parseVideoId(input: string): string | null {
  const value = input.trim();
  if (isValidVideoId(value)) return value;

  let url: URL;
  try {
    url = new URL(value.startsWith('http') ? value : `https://${value}`);
  } catch {
    return null;
  }

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

export type BulkLectureLine = { title: string; videoId: string; durationSeconds: number | null; line: number };
export type BulkParseResult = { items: BulkLectureLine[]; errors: { line: number; message: string }[] };

/**
 * Bulk lecture import: one lecture per line, `Title | URL-or-ID | duration?`.
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
    if (!ref) return errors.push({ line, message: 'Missing YouTube URL or ID' });
    const videoId = parseVideoId(ref);
    if (!videoId) return errors.push({ line, message: `Not a valid YouTube video: ${ref}` });
    const durationSeconds = dur ? parseDurationInput(dur) : null;
    if (dur && durationSeconds === null) return errors.push({ line, message: `Invalid duration: ${dur}` });
    items.push({ title: title.slice(0, 200), videoId, durationSeconds, line });
  });
  return { items, errors };
}

export function thumbnailUrl(videoId: string, quality: 'mq' | 'hq' = 'mq'): string {
  return `https://i.ytimg.com/vi/${videoId}/${quality}default.jpg`;
}
