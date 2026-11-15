import { describe, expect, it } from 'vitest';
import { computeStreak, intensityLevel, summarizeStudy, type DailyTotal } from './study-stats';
import { localDateKey } from '@/lib/utils/dates';

const day = (d: string, minutes: number): DailyTotal => ({
  local_date: d,
  total_seconds: minutes * 60,
  video_seconds: minutes * 30,
  manual_seconds: minutes * 30,
});

describe('streak', () => {
  it('counts consecutive qualifying days ending today', () => {
    const t = [day('2026-11-13', 40), day('2026-11-14', 31), day('2026-11-15', 60)];
    expect(computeStreak(t, '2026-11-15', 1800)).toEqual({ current: 3, longest: 3, todayQualified: true });
  });

  it('today not yet qualified does not break the streak', () => {
    const t = [day('2026-11-13', 40), day('2026-11-14', 40), day('2026-11-15', 10)];
    expect(computeStreak(t, '2026-11-15', 1800).current).toBe(2);
  });

  it('a missed day resets; longest is remembered', () => {
    const t = [day('2026-11-01', 60), day('2026-11-02', 60), day('2026-11-03', 60), day('2026-11-05', 60)];
    expect(computeStreak(t, '2026-11-05', 1800)).toEqual({ current: 1, longest: 3, todayQualified: true });
  });

  it('days below the minimum never extend the streak', () => {
    expect(computeStreak([day('2026-11-15', 29)], '2026-11-15', 1800).current).toBe(0);
  });
});

describe('summaries and timezones', () => {
  it('week/month/today totals', () => {
    const t = [day('2026-11-09', 60), day('2026-11-15', 120), day('2026-10-31', 600)];
    const s = summarizeStudy(t, '2026-11-15'); // Sunday; week starts Monday 9th
    expect(s.today.total_seconds).toBe(7200);
    expect(s.weekSeconds).toBe(3600 + 7200);
    expect(s.monthSeconds).toBe(3600 + 7200);
    expect(s.last7).toHaveLength(7);
  });

  it('attributes 23:30 local time to the correct local day', () => {
    // 18:00 UTC = 23:30 IST on the 14th; 19:00 UTC = 00:30 IST on the 15th
    expect(localDateKey('2026-11-14T18:00:00Z', 'Asia/Kolkata')).toBe('2026-11-14');
    expect(localDateKey('2026-11-14T19:00:00Z', 'Asia/Kolkata')).toBe('2026-11-15');
    expect(localDateKey('2026-11-15T04:00:00Z', 'America/Los_Angeles')).toBe('2026-11-14');
  });

  it('heatmap intensity', () => {
    expect(intensityLevel(0, 14400)).toBe(0);
    expect(intensityLevel(14400, 14400)).toBe(4);
    expect(intensityLevel(7200, 14400)).toBe(2);
  });
});
