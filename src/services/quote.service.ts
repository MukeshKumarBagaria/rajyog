import 'server-only';

import type { ServerSupabase } from '@/lib/supabase/server';
import { pickQuoteForDay } from '@/lib/quotes';

export async function getQuoteOfTheDay(supabase: ServerSupabase, dateKey: string, pref: 'en' | 'hi' | 'both') {
  const { data } = await supabase
    .from('motivational_quotes')
    .select('id, quote, language, attribution, category, display_date')
    .eq('is_active', true)
    .limit(1000);
  return pickQuoteForDay(data ?? [], dateKey, pref);
}
