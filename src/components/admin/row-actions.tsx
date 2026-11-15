'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { deleteContentAction, moveLectureAction, setActiveAction, setUserActiveAction } from '@/actions/admin';
import { toast } from '@/stores/toast-store';
import { cn } from '@/lib/utils/cn';

type Table = 'subjects' | 'chapters' | 'lectures' | 'motivational_quotes';

export function ActiveToggle({ table, id, active }: { table: Table; id: string; active: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState(active);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={value ? 'Active — click to deactivate' : 'Inactive — click to activate'}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setValue(!value);
          const res = await setActiveAction(table, id, !value);
          if (!res.ok) {
            setValue(value);
            toast.error(res.error);
          } else router.refresh();
        })
      }
      className={cn('relative h-5 w-9 shrink-0 rounded-full transition-colors', value ? 'bg-success' : 'bg-line-strong', pending && 'opacity-60')}
    >
      <span className={cn('absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', value && 'translate-x-4')} />
    </button>
  );
}

export function DeleteContentButton({
  table,
  id,
  label,
  warning,
}: {
  table: Table | 'historical_cutoffs';
  id: string;
  label: string;
  warning?: string;
}) {
  return (
    <ConfirmButton
      variant="ghost"
      size="icon-sm"
      aria-label={`Delete ${label}`}
      title={`Delete “${label}”?`}
      description={warning ?? 'This cannot be undone. Consider deactivating instead.'}
      successMessage="Deleted"
      action={deleteContentAction.bind(null, table, id)}
    >
      <Trash2 className="h-4 w-4" />
    </ConfirmButton>
  );
}

export function MoveButtons({ id, first, last }: { id: string; first: boolean; last: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const move = (dir: -1 | 1) =>
    start(async () => {
      const res = await moveLectureAction(id, dir);
      if (!res.ok) toast.error(res.error);
      else router.refresh();
    });
  return (
    <span className="flex">
      <Button variant="ghost" size="icon-sm" disabled={first || pending} onClick={() => move(-1)} aria-label="Move up">
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" disabled={last || pending} onClick={() => move(1)} aria-label="Move down">
        <ArrowDown className="h-4 w-4" />
      </Button>
    </span>
  );
}

export function UserActiveButton({ userId, active, isSelf }: { userId: string; active: boolean; isSelf: boolean }) {
  if (isSelf) return <span className="text-xs text-ink-faint">You</span>;
  return (
    <ConfirmButton
      variant={active ? 'outline' : 'secondary'}
      size="sm"
      title={active ? 'Deactivate this account?' : 'Reactivate this account?'}
      description={
        active
          ? 'They will be signed out and unable to sign in. Their private data is kept and can be restored by reactivating.'
          : 'They will be able to sign in again with their existing credentials.'
      }
      confirmLabel={active ? 'Deactivate' : 'Reactivate'}
      successMessage={active ? 'Account deactivated' : 'Account reactivated'}
      action={setUserActiveAction.bind(null, userId, !active)}
    >
      {active ? 'Deactivate' : 'Reactivate'}
    </ConfirmButton>
  );
}
