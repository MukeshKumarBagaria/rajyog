import { dateKeyRange, daysAgoKey, monthStartKey, weekStartKey } from '@/lib/utils/dates';

export type DailyTotal = {
  local_date: string;
  total_seconds: number;
  video_seconds: number;
  manual_seconds: number;
};

/**
 * Study streak: consecutive local days meeting the minimum verified study.
 * Today not yet meeting the minimum does not break the streak — it simply
 * hasn't been extended yet (the day isn't over).
 */
export function computeStreak(totals: DailyTotal[], today: string, minSeconds: number) {
  const qualified = new Set(totals.filter((t) => t.total_seconds >= minSeconds).map((t) => t.local_date));
  const todayQualified = qualified.has(today);

  let current = 0;
  let cursor = todayQualified ? today : daysAgoKey(today, 1);
  while (qualified.has(cursor)) {
    current++;
    cursor = daysAgoKey(cursor, 1);
  }

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of [...qualified].sort()) {
    run = prev !== null && daysAgoKey(day, 1) === prev ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }

  return { current, longest: Math.max(longest, current), todayQualified };
}

export function summarizeStudy(totals: DailyTotal[], today: string) {
  const byDay = new Map(totals.map((t) => [t.local_date, t]));
  const empty = (d: string): DailyTotal => ({ local_date: d, total_seconds: 0, video_seconds: 0, manual_seconds: 0 });
  const sum = (from: string, to: string) =>
    dateKeyRange(from, to).reduce((acc, d) => acc + (byDay.get(d)?.total_seconds ?? 0), 0);

  const todayRow = byDay.get(today) ?? empty(today);
  const last7 = dateKeyRange(daysAgoKey(today, 6), today).map((d) => byDay.get(d) ?? empty(d));
  const last30Total = sum(daysAgoKey(today, 29), today);

  return {
    today: todayRow,
    weekSeconds: sum(weekStartKey(today), today),
    monthSeconds: sum(monthStartKey(today), today),
    last7,
    average7Seconds: Math.round(last7.reduce((a, d) => a + d.total_seconds, 0) / 7),
    average30Seconds: Math.round(last30Total / 30),
    allTimeSeconds: totals.reduce((a, t) => a + t.total_seconds, 0),
  };
}

/** 0–4 intensity bucket for the calendar heatmap, relative to the daily goal. */
export function intensityLevel(seconds: number, targetSeconds: number): 0 | 1 | 2 | 3 | 4 {
  if (seconds <= 0) return 0;
  const r = seconds / Math.max(1, targetSeconds);
  if (r < 0.25) return 1;
  if (r < 0.6) return 2;
  if (r < 1) return 3;
  return 4;
}
