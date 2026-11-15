'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { Button, type ButtonProps } from './button';
import { Dialog } from './dialog';
import { toast } from '@/stores/toast-store';
import type { ActionResult } from '@/actions/types';

/** Button that asks for confirmation, then runs a server action. */
export function ConfirmButton({
  action,
  title,
  description,
  confirmLabel = 'Delete',
  successMessage,
  children,
  ...buttonProps
}: Omit<ButtonProps, 'onClick' | 'action'> & {
  action: () => Promise<ActionResult>;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button {...buttonProps} onClick={() => setOpen(true)}>
        {children}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await action();
                if (res.ok) {
                  if (successMessage) toast.success(successMessage);
                  setOpen(false);
                } else toast.error(res.error ?? 'Something went wrong');
              })
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
