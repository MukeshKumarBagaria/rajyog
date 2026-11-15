import { NotesPanel } from './notes-panel';
import type { PersonalNoteRow } from '@/types/database';

export function ChapterNotes({ chapterId, notes }: { chapterId: string; notes: PersonalNoteRow[] }) {
  return <NotesPanel notes={notes} target={{ chapterId }} title="Chapter notes" description="Summaries and revision points — private to you." />;
}
