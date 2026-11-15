'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Alert } from '@/components/ui/feedback';
import { toast } from '@/stores/toast-store';
import type { ActionResult } from '@/actions/types';

type Result = ActionResult | ActionResult<{ message: string }>;

/** Trigger button + modal form that submits FormData to a server action. */
export function FormDialog({
  title,
  description,
  action,
  children,
  submitLabel = 'Save',
  successMessage = 'Saved',
  triggerLabel,
  triggerProps,
}: {
  title: string;
  description?: ReactNode;
  action: (fd: FormData) => Promise<Result>;
  children: ReactNode;
  submitLabel?: string;
  successMessage?: string;
  triggerLabel: ReactNode;
  triggerProps?: ButtonProps;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <>
      <Button size="sm" {...triggerProps} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setError(null);
        }}
        title={title}
        description={description}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const res = await action(fd);
              if (!res.ok) {
                setError(res.error);
                return;
              }
              setError(null);
              setOpen(false);
              const msg = res.data && typeof res.data === 'object' && 'message' in res.data ? (res.data as { message: string }).message : undefined;
              toast.success(successMessage, msg);
              router.refresh();
            });
          }}
        >
          {children}
          {error ? <Alert tone="danger">{error}</Alert> : null}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={pending}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
