export type QuoteLike = {
  id: string;
  quote: string;
  language: string;
  attribution: string | null;
  category: string;
  display_date: string | null;
};

/** Deterministic string hash (FNV-1a). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * One message per local calendar day: a quote scheduled for that date wins;
 * otherwise a stable pick from the active pool filtered by language preference.
 */
export function pickQuoteForDay<T extends QuoteLike>(quotes: T[], dateKey: string, pref: 'en' | 'hi' | 'both' = 'both'): T | null {
  if (!quotes.length) return null;
  const scheduled = quotes.find((q) => q.display_date === dateKey);
  if (scheduled) return scheduled;

  const unscheduled = quotes.filter((q) => !q.display_date);
  const pool = unscheduled.filter((q) => pref === 'both' || (pref === 'en' ? q.language === 'en' : q.language !== 'en'));
  const list = (pool.length ? pool : unscheduled.length ? unscheduled : quotes).slice().sort((a, b) => a.id.localeCompare(b.id));
  return list[hashString(dateKey) % list.length];
}
