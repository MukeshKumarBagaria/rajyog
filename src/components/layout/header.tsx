import Link from 'next/link';
import { Settings } from 'lucide-react';
import { LogoMark } from '@/components/ui/logo';
import { formatInTimezone } from '@/lib/utils/dates';
import { UserMenu } from './user-menu';

export function Header({
  timezone,
  name,
  email,
  avatarSrc,
  isAdmin,
}: {
  timezone: string;
  name: string;
  email: string | null;
  avatarSrc: string | null;
  isAdmin: boolean;
}) {
  const now = new Date();
  return (
    <header className="mb-6 flex items-center justify-between gap-3 pt-2">
      <div className="flex items-center gap-3">
        <Link href="/" className="md:hidden" aria-label="Rajyog home">
          <LogoMark size={34} />
        </Link>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{formatInTimezone(now, 'EEEE', timezone)}</p>
          <p className="text-sm font-semibold text-ink">{formatInTimezone(now, 'd MMMM yyyy', timezone)}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <Link
          href="/settings"
          className="rounded-xl p-2.5 text-ink-secondary transition-colors hover:bg-primary-light hover:text-primary-strong"
          aria-label="Settings"
        >
          <Settings className="h-5 w-5" />
        </Link>
        <UserMenu name={name} email={email} avatarSrc={avatarSrc} isAdmin={isAdmin} />
      </div>
    </header>
  );
}
