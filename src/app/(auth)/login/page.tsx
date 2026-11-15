import type { Metadata } from 'next';
import { LoginForm } from '@/components/forms/auth-forms';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/feedback';
import { isSupabaseConfigured } from '@/lib/env';

export const metadata: Metadata = { title: 'Sign in' };

const errors: Record<string, string> = {
  link: 'That link is invalid or has expired. Request a new one.',
  inactive: 'This account has been deactivated. Contact the owner.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <Card className="p-6 sm:p-8">
      <h1 className="text-xl font-bold tracking-tight text-ink">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-secondary">Sign in to continue your preparation.</p>
      {error && errors[error] ? (
        <Alert tone="danger" className="mt-5">
          {errors[error]}
        </Alert>
      ) : null}
      {!configured ? (
        <Alert tone="warning" className="mt-5">
          Supabase is not configured. Copy <code>.env.example</code> to <code>.env.local</code> and add your project URL and anon key.
        </Alert>
      ) : null}
      <LoginForm next={next} />
    </Card>
  );
}
