/** A watched content interval in seconds: [start, end). */
export type Segment = [number, number];

/**
 * Sorts, clamps and unions intervals. Ranges closer than `gap` seconds are
 * joined (sampling granularity), so repeated playback never double-counts.
 * Mirrors public.merge_segments() in the database.
 */
export function mergeSegments(segments: readonly Segment[], max?: number | null, gap = 1): Segment[] {
  const valid = segments
    .filter((s): s is Segment => Array.isArray(s) && s.length === 2 && Number.isFinite(s[0]) && Number.isFinite(s[1]))
    .map(([s, e]): Segment => [Math.max(0, s), max ? Math.min(max, e) : e])
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const out: Segment[] = [];
  for (const [s, e] of valid) {
    const last = out[out.length - 1];
    if (last && s <= last[1] + gap) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out.map(([s, e]) => [round1(s), round1(e)]);
}

export function coveredSeconds(segments: readonly Segment[]): number {
  return mergeSegments(segments).reduce((sum, [s, e]) => sum + (e - s), 0);
}

export function coveragePercent(segments: readonly Segment[], duration: number | null | undefined): number {
  if (!duration || duration <= 0) return 0;
  return Math.min(100, (coveredSeconds(mergeSegments(segments, duration)) / duration) * 100);
}

/** Safely reads a JSON value from the database into segments. */
export function parseSegments(value: unknown): Segment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is [number, number] => Array.isArray(v) && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number')
    .map(([s, e]) => [s, e]);
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}
