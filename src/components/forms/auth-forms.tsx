'use client';

import Link from 'next/link';
import { useActionState, useRef, useState } from 'react';
import { Eye, EyeOff, LockKeyhole } from 'lucide-react';
import {
  requestPasswordResetAction,
  signInAction,
  unlockAction,
  updatePasswordAction,
} from '@/actions/auth';
import { initialFormState } from '@/actions/types';
import { Field, Input } from '@/components/ui/form-controls';
import { SubmitButton } from '@/components/ui/submit-button';
import { Alert } from '@/components/ui/feedback';

function PasswordInput({ id, name, autoComplete, invalid }: { id: string; name: string; autoComplete: string; invalid?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        aria-invalid={invalid || undefined}
        className="pr-11"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink-faint transition-colors hover:text-ink"
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, initialFormState);
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="next" value={next ?? ''} />
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required autoFocus />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password?.[0]}>
        <PasswordInput id="password" name="password" autoComplete="current-password" invalid={Boolean(state.fieldErrors?.password)} />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-xs font-semibold text-primary-strong underline-offset-4 hover:underline">
          Forgot password?
        </Link>
      </div>
      {state.error && !state.fieldErrors ? <Alert tone="danger">{state.error}</Alert> : null}
      <SubmitButton className="w-full" size="lg" pendingText="Signing in…">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordResetAction, initialFormState);
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </Field>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.ok ? <Alert tone="success">{state.message}</Alert> : null}
      <SubmitButton className="w-full" size="lg" pendingText="Sending…">
        Send reset link
      </SubmitButton>
      <p className="text-center text-xs text-ink-secondary">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-primary-strong hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePasswordAction, initialFormState);
  return (
    <form action={action} className="mt-6 space-y-4" noValidate>
      <input type="hidden" name="redirect" value="1" />
      <Field label="New password" htmlFor="password" error={state.fieldErrors?.password?.[0]}>
        <PasswordInput id="password" name="password" autoComplete="new-password" />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={state.fieldErrors?.confirm?.[0]}>
        <PasswordInput id="confirm" name="confirm" autoComplete="new-password" />
      </Field>
      {state.error && !state.fieldErrors ? <Alert tone="danger">{state.error}</Alert> : null}
      <SubmitButton className="w-full" size="lg" pendingText="Saving…">
        Save password
      </SubmitButton>
    </form>
  );
}

export function UnlockForm({ next }: { next?: string }) {
  const [state, action] = useActionState(unlockAction, initialFormState);
  const [pin, setPin] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action} className="mt-6 space-y-4">
      <input type="hidden" name="next" value={next ?? ''} />
      <label htmlFor="pin" className="sr-only">
        6-digit PIN
      </label>
      <div className="relative mx-auto max-w-[240px]">
        <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="\d{6}"
          maxLength={6}
          autoFocus
          value={pin}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 6);
            setPin(v);
            if (v.length === 6) requestAnimationFrame(() => formRef.current?.requestSubmit());
          }}
          className="h-12 pl-9 text-center text-xl tracking-[0.5em]"
          aria-invalid={Boolean(state.error) || undefined}
        />
      </div>
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      <SubmitButton className="w-full" size="lg" pendingText="Unlocking…" disabled={pin.length !== 6}>
        Unlock
      </SubmitButton>
    </form>
  );
}
