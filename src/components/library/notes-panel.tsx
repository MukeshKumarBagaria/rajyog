'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { NotebookPen, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/form-controls';
import { deleteNoteAction, saveNoteAction } from '@/actions/library';
import { toast } from '@/stores/toast-store';
import type { PersonalNoteRow } from '@/types/database';

type Target = { lectureId?: string; chapterId?: string };

export function NotesPanel({
  notes,
  target,
  title = 'My notes',
  description = 'Private to you.',
}: {
  notes: PersonalNoteRow[];
  target: Target;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null);
  const [pending, start] = useTransition();

  const save = (content: string, id?: string) =>
    start(async () => {
      const res = await saveNoteAction({
        id,
        lecture_id: target.lectureId ?? null,
        chapter_id: target.chapterId ?? null,
        content,
      });
      if (!res.ok) return void toast.error(res.error);
      setDraft('');
      setEditing(null);
      toast.success(id ? 'Note updated' : 'Note saved');
      router.refresh();
    });

  const remove = (id: string) =>
    start(async () => {
      const res = await deleteNoteAction(id);
      if (!res.ok) return void toast.error(res.error);
      toast.success('Note deleted');
      router.refresh();
    });

  return (
    <Card>
      <CardHeader icon={<NotebookPen className="h-4 w-4" />} title={title} description={description} />
      <CardContent className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) save(draft.trim());
          }}
          className="space-y-2"
        >
          <label htmlFor={`note-${target.lectureId ?? target.chapterId}`} className="sr-only">
            New note
          </label>
          <Textarea
            id={`note-${target.lectureId ?? target.chapterId}`}
            rows={3}
            placeholder="Key points, facts to revise, doubts…"
            value={draft}
            maxLength={10000}
            onChange={(e) => setDraft(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" loading={pending && !editing} disabled={!draft.trim()}>
              Save note
            </Button>
          </div>
        </form>

        {notes.length > 0 ? (
          <ul className="space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-line bg-surface-muted/60 p-3">
                {editing?.id === n.id ? (
                  <div className="space-y-2">
                    <Textarea
                      rows={4}
                      value={editing.content}
                      onChange={(e) => setEditing({ id: n.id, content: e.target.value })}
                      aria-label="Edit note"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" loading={pending} disabled={!editing.content.trim()} onClick={() => save(editing.content.trim(), n.id)}>
                        Update
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {n.title ? <p className="mb-1 text-sm font-semibold text-ink">{n.title}</p> : null}
                    <p className="whitespace-pre-wrap text-[13px] leading-5 text-ink">{n.content}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[11px] text-ink-faint">{formatDistanceToNow(new Date(n.updated_at), { addSuffix: true })}</span>
                      <span className="flex gap-1">
                        <Button size="icon-sm" variant="ghost" onClick={() => setEditing({ id: n.id, content: n.content })} aria-label="Edit note">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => remove(n.id)} aria-label="Delete note" disabled={pending}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </span>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
