import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/forms/auth-forms';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Reset password' };

export default function ForgotPasswordPage() {
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-bold tracking-tight text-ink">Forgot your password?</h1>
      <p className="mt-1 text-sm text-ink-secondary">Enter your email and we’ll send you a secure reset link.</p>
      <ForgotPasswordForm />
    </Card>
  );
}
