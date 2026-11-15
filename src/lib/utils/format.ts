/** "3h 20m", "45m", "40s". */
export function formatDuration(totalSeconds: number, opts: { compact?: boolean } = {}): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0 && m === 0) return s === 0 ? '0m' : `${s}s`;
  if (h === 0) return `${m}m`;
  if (opts.compact || m === 0) return m === 0 ? `${h}h` : `${h}h ${m}m`;
  return `${h}h ${m}m`;
}

/** "1:05:22" / "25:00". */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h > 0 ? 2 : 1, '0');
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm.padStart(2, '0')}:${ss}` : `${mm.padStart(2, '0')}:${ss}`;
}

/** Hours with one decimal: 3.5 */
export function toHours(totalSeconds: number, digits = 1): number {
  const f = 10 ** digits;
  return Math.round((totalSeconds / 3600) * f) / f;
}

export function formatPercent(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}%`;
}

export function formatMarks(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Number(value.toFixed(digits)).toString();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function initials(name: string | null | undefined, fallback = 'R'): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return fallback;
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
