import { TZDate } from '@date-fns/tz';
import { addDays, differenceInCalendarDays, format, parseISO, startOfMonth, startOfWeek, subDays } from 'date-fns';

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/** A plain calendar date string 'yyyy-MM-dd' in the given timezone. */
export function localDateKey(date: Date | string | number, timezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  return format(new TZDate(d, safeTimezone(timezone)), 'yyyy-MM-dd');
}

export function todayKey(timezone: string = DEFAULT_TIMEZONE, now: Date = new Date()): string {
  return localDateKey(now, timezone);
}

/** Parses 'yyyy-MM-dd' as a timezone-free calendar date (local midnight). */
export function parseDateKey(key: string): Date {
  return parseISO(key);
}

export function shiftDateKey(key: string, days: number): string {
  return format(addDays(parseDateKey(key), days), 'yyyy-MM-dd');
}

export function dateKeyRange(fromKey: string, toKey: string): string[] {
  const from = parseDateKey(fromKey);
  const n = differenceInCalendarDays(parseDateKey(toKey), from);
  return Array.from({ length: Math.max(0, n + 1) }, (_, i) => format(addDays(from, i), 'yyyy-MM-dd'));
}

/** Monday-based week start for a date key. */
export function weekStartKey(key: string): string {
  return format(startOfWeek(parseDateKey(key), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export function monthStartKey(key: string): string {
  return format(startOfMonth(parseDateKey(key)), 'yyyy-MM-dd');
}

export function daysAgoKey(key: string, days: number): string {
  return format(subDays(parseDateKey(key), days), 'yyyy-MM-dd');
}

export function formatDateKey(key: string, pattern = 'd MMM yyyy'): string {
  return format(parseDateKey(key), pattern);
}

export function formatInTimezone(date: Date | string, pattern: string, timezone: string = DEFAULT_TIMEZONE): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return format(new TZDate(d, safeTimezone(timezone)), pattern);
}

export function safeTimezone(tz: string | null | undefined): string {
  if (!tz) return DEFAULT_TIMEZONE;
  try {
    Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

/** Part of the day for greetings, in the user's timezone. */
export function greetingFor(timezone: string, now: Date = new Date()): string {
  const hour = new TZDate(now, safeTimezone(timezone)).getHours();
  if (hour < 5) return 'Burning the midnight oil';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}
