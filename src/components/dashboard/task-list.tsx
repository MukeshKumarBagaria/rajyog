'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { CalendarClock, ListChecks, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/form-controls';
import { Badge } from '@/components/ui/feedback';
import { createTaskAction, deleteTaskAction, rescheduleTaskAction, toggleTaskAction } from '@/actions/tasks';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';
import type { TaskItem } from '@/services/task.service';
import type { SubjectOption } from '@/services/subject.service';

type Op = { type: 'toggle'; id: string; completed: boolean } | { type: 'delete'; id: string };

const SUGGESTIONS = ['Watch two lectures', 'Revise one chapter', 'Solve 30 MCQs', 'Read today’s current affairs', 'Complete one mock test'];

export function TaskList({ tasks, subjects, today }: { tasks: TaskItem[]; subjects: SubjectOption[]; today: string }) {
  const [pending, start] = useTransition();
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [optimistic, apply] = useOptimistic(tasks, (state: TaskItem[], op: Op) =>
    op.type === 'delete' ? state.filter((t) => t.id !== op.id) : state.map((t) => (t.id === op.id ? { ...t, is_completed: op.completed } : t)),
  );

  const done = optimistic.filter((t) => t.is_completed).length;

  const add = (value: string) => {
    const v = value.trim();
    if (!v) return;
    start(async () => {
      const res = await createTaskAction({ title: v, subject_id: subjectId || null, due_date: today });
      if (!res.ok) toast.error(res.error);
      else {
        setTitle('');
      }
    });
  };

  return (
    <Card>
      <CardHeader
        icon={<ListChecks className="h-4 w-4" />}
        title="Today’s tasks"
        description={optimistic.length ? `${done} of ${optimistic.length} done` : 'Plan a few concrete wins for today'}
      />
      <CardContent className="space-y-4">
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            add(title);
          }}
        >
          <label htmlFor="task-title" className="sr-only">
            New task
          </label>
          <Input
            id="task-title"
            placeholder="Add a task for today…"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            className="sm:flex-1"
          />
          <label htmlFor="task-subject" className="sr-only">
            Subject (optional)
          </label>
          <Select id="task-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="sm:w-48">
            <option value="">Any subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Button type="submit" loading={pending && Boolean(title)} disabled={!title.trim()} className="h-11">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </form>

        {optimistic.length === 0 ? (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="rounded-full border border-dashed border-line-strong px-3 py-1 text-xs font-medium text-ink-secondary transition-colors hover:border-primary hover:text-primary-strong"
              >
                + {s}
              </button>
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {optimistic.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <input
                  id={`task-${t.id}`}
                  type="checkbox"
                  checked={t.is_completed}
                  onChange={(e) => {
                    const completed = e.target.checked;
                    start(async () => {
                      apply({ type: 'toggle', id: t.id, completed });
                      const res = await toggleTaskAction(t.id, completed);
                      if (!res.ok) toast.error(res.error);
                    });
                  }}
                  className="h-[18px] w-[18px] shrink-0 cursor-pointer accent-[var(--primary-strong)]"
                />
                <label htmlFor={`task-${t.id}`} className={cn('min-w-0 flex-1 cursor-pointer text-sm', t.is_completed ? 'text-ink-faint line-through' : 'text-ink')}>
                  {t.title}
                  <span className="ml-2 inline-flex flex-wrap gap-1 align-middle">
                    {t.subjectName ? <Badge>{t.subjectName}</Badge> : null}
                    {t.overdue ? <Badge tone="warning">Overdue</Badge> : null}
                  </span>
                </label>
                {t.overdue ? (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Move “${t.title}” to today`}
                    title="Move to today"
                    onClick={() =>
                      start(async () => {
                        const res = await rescheduleTaskAction(t.id, today);
                        if (!res.ok) toast.error(res.error);
                      })
                    }
                  >
                    <CalendarClock className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={`Delete “${t.title}”`}
                  onClick={() =>
                    start(async () => {
                      apply({ type: 'delete', id: t.id });
                      const res = await deleteTaskAction(t.id);
                      if (!res.ok) toast.error(res.error);
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
