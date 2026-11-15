import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getViewer } from '@/lib/auth/session';
import { isUnlocked } from '@/lib/auth/lock';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Header } from '@/components/layout/header';
import { IdleLock } from '@/components/layout/idle-lock';
import { ThemeSync } from '@/components/layout/theme-sync';
import { FocusPill } from '@/components/layout/focus-pill';
import { OfflineBanner } from '@/components/layout/offline-banner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();

  const path = (await headers()).get('x-pathname') ?? '/';

  if (!viewer.profile.is_active) redirect('/auth/signout?reason=inactive');

  if (viewer.settings.pin_lock_enabled && !(await isUnlocked(viewer.id))) {
    redirect(`/unlock?next=${encodeURIComponent(path)}`);
  }

  // Checked here (outside the streaming boundary) so non-admins get a real HTTP
  // redirect. The admin layout, every admin action and RLS check again.
  if ((path === '/admin' || path.startsWith('/admin/') || path.startsWith('/admin?')) && !viewer.isAdmin) redirect('/');

  return (
    <div className="min-h-dvh md:pl-[240px]">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-surface px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <ThemeSync theme={viewer.settings.theme} />
      {viewer.settings.pin_lock_enabled ? <IdleLock minutes={viewer.settings.auto_lock_minutes} /> : null}
      <Sidebar isAdmin={viewer.isAdmin} />
      <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-3 sm:px-6 md:pb-14 lg:px-10">
        <Header
          timezone={viewer.timezone}
          name={viewer.displayName}
          email={viewer.email}
          avatarSrc={viewer.avatarSrc}
          isAdmin={viewer.isAdmin}
        />
        <OfflineBanner />
        <main id="main">{children}</main>
      </div>
      <FocusPill />
      <BottomNav />
    </div>
  );
}
