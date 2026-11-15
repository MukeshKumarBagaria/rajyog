'use server';

import { revalidatePath } from 'next/cache';
import { actionContext, errorMessage } from '@/lib/auth/action-context';
import { fieldErrors, firstError, mockTestSchema, uuid, type MockTestInput } from '@/lib/validation/schemas';
import type { ActionResult } from './types';

export async function saveMockAction(input: MockTestInput): Promise<ActionResult<{ id: string }>> {
  const parsed = mockTestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), fieldErrors: fieldErrors(parsed.error) };
  const { subjects, ...mock } = parsed.data;

  try {
    const { supabase } = await actionContext();
    const { data, error } = await supabase.rpc('save_mock_test', {
      p_mock: {
        ...mock,
        id: mock.id || null,
        provider: mock.provider || null,
        difficulty: mock.difficulty || null,
        remarks: mock.remarks || null,
        exam_pattern_version: mock.exam_pattern_version || 'current',
      },
      p_subject_scores: subjects.map((s) => ({
        subject_id: s.subject_id || null,
        label: s.subject_id ? null : s.label || null,
        total_marks: s.total_marks,
        obtained_marks: s.obtained_marks,
      })),
    });
    if (error) {
      if (error.code === '23514') return { ok: false, error: 'Some values are inconsistent (check marks and question counts).' };
      throw error;
    }
    revalidatePath('/analysis', 'layout');
    revalidatePath('/');
    return { ok: true, data: { id: data as string } };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export async function deleteMockAction(mockId: string): Promise<ActionResult> {
  try {
    const id = uuid.parse(mockId);
    const { supabase } = await actionContext();
    const { error } = await supabase.from('mock_tests').delete().eq('id', id);
    if (error) throw error;
    revalidatePath('/analysis', 'layout');
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
