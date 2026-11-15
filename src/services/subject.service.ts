import 'server-only';

import type { ServerSupabase } from '@/lib/supabase/server';

/** Lightweight subject list for selects. */
export async function getSubjectOptions(supabase: ServerSupabase) {
  const { data } = await supabase.from('subjects').select('id, name, syllabus_stage').eq('is_active', true).order('sort_order').order('name');
  return data ?? [];
}
export type SubjectOption = Awaited<ReturnType<typeof getSubjectOptions>>[number];
