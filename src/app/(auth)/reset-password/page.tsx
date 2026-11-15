import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/forms/auth-forms';
import { Card } from '@/components/ui/card';
import { requireUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Set a new password' };

export default async function ResetPasswordPage() {
  const user = await requireUser();
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-bold tracking-tight text-ink">Set a new password</h1>
      <p className="mt-1 text-sm text-ink-secondary">
        For <span className="font-semibold text-ink">{user.email}</span>. Use at least 8 characters.
      </p>
      <ResetPasswordForm />
    </Card>
  );
}
