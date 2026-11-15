import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { UnlockForm } from '@/components/forms/auth-forms';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import { getViewer } from '@/lib/auth/session';
import { isUnlocked } from '@/lib/auth/lock';
import { signOutAction } from '@/actions/auth';
import { safeNextPath } from '@/lib/utils/redirect';

export const metadata: Metadata = { title: 'Unlock' };

export default async function UnlockPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const viewer = await getViewer();
  if (!viewer.settings.pin_lock_enabled || (await isUnlocked(viewer.id))) redirect(safeNextPath(next));

  return (
    <Card className="p-6 text-center sm:p-8">
      <div className="flex justify-center">
        <Avatar name={viewer.displayName} src={viewer.avatarSrc} size={64} />
      </div>
      <h1 className="mt-4 text-xl font-bold tracking-tight text-ink">Welcome back, {viewer.displayName.split(' ')[0]}</h1>
      <p className="mt-1 text-sm text-ink-secondary">Enter your 6-digit PIN to unlock Rajyog.</p>
      <UnlockForm next={next} />
      <form action={signOutAction} className="mt-4">
        <button type="submit" className="text-xs font-semibold text-ink-secondary underline-offset-4 hover:text-primary-strong hover:underline">
          Forgot PIN? Sign out and use your password
        </button>
      </form>
    </Card>
  );
}
