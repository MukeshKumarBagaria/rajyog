'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field, Input } from '@/components/ui/form-controls';
import { setDailyGoalAction } from '@/actions/study';
import { toast } from '@/stores/toast-store';

export function GoalEditor({ today, currentMinutes }: { today: string; currentMinutes: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState(String(Math.floor(currentMinutes / 60)));
  const [minutes, setMinutes] = useState(String(currentMinutes % 60));
  const [pending, start] = useTransition();

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" /> Edit goal
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Today’s study goal" description="Applies to today only. Change your default goal in Settings.">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const total = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
            start(async () => {
              const res = await setDailyGoalAction(today, total);
              if (!res.ok) return void toast.error(res.error);
              toast.success('Goal updated');
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Hours" htmlFor="goal-h">
              <Input id="goal-h" type="number" min={0} max={24} value={hours} onChange={(e) => setHours(e.target.value)} />
            </Field>
            <Field label="Minutes" htmlFor="goal-m">
              <Input id="goal-m" type="number" min={0} max={59} step={5} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              Save goal
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
